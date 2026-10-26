// Haru PC ↔ Meta Muse (and other chat agents that can call an HTTPS MCP URL).
//
// Muse runs in Meta's cloud and can't reach this computer, so the relay (relay/src/index.js, POST /m/<room>/<token>)
// hands us each MCP JSON-RPC message over the PC's existing outbound socket, and we answer here.
// Read-only on purpose: the tools can only look at ONE dedicated folder (~/HaruShare). Anything that would
// change the computer is left out — a "do a job" tool would need a phone approval card first (not built yet).
//
// Muse traffic is not end-to-end encrypted (Muse can't hold our key); the token in the URL is the only secret,
// so it can be turned off (`haru-pc muse off`) or replaced (`haru-pc muse rotate`) at any time.
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export const MUSE_FILE = path.join(process.env.HARU_PC_HOME || path.join(os.homedir(), ".haru-pc"), "muse.json");
export const SHARE_DIR = process.env.HARU_SHARE_DIR || path.join(os.homedir(), "HaruShare"); // %USERPROFILE%\HaruShare on Windows
export const MAX_READ = 64 * 1024;   // text returned by read_shared_file
const MAX_LIST = 200;
const PROTOCOL = "2025-03-26";

/** What the relay stores for this token (it never sees the token itself after the first request). */
export function museHash(room, token) {
  return crypto.createHash("sha256").update(`muse:${room}:${token}`).digest("hex");
}

export function loadMuse(file = MUSE_FILE) {
  try {
    const m = JSON.parse(fs.readFileSync(file, "utf8"));
    if (m.enabled && typeof m.token === "string" && m.token.length >= 32) return m;
  } catch {}
  return { enabled: false };
}

export function saveMuse(m, file = MUSE_FILE) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(m, null, 2), { mode: 0o600 });
}

export const newMuseToken = () => crypto.randomBytes(32).toString("base64url");

export function museUrl(cfg, token) {
  return `${cfg.url.replace(/^wss:/, "https:").replace(/^ws:/, "http:").replace(/\/$/, "")}/m/${cfg.room}/${token}`;
}

/** The one sentence the user pastes into Muse. */
export function museSentence(url) {
  return `아래 주소는 내 컴퓨터(하루 PC)에 연결된 도구 서버(MCP, JSON-RPC over HTTPS POST)야. 먼저 이 주소로 tools/list 를 호출해서 쓸 수 있는 도구를 확인하고, 내가 부탁하면 그 도구(현재 시간, 내 HaruShare 폴더의 파일 목록·읽기)를 tools/call 로 직접 호출해서 도와줘. 이 주소는 비밀이니까 다른 곳에 공유하거나 기억해 두지 마: ${url}`;
}

const TOOLS = [
  {
    name: "get_time",
    description: "Current date and time on the user's computer.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "list_shared_files",
    description: "List the files the user shared with you in the HaruShare folder on their computer. Optional subfolder path.",
    inputSchema: { type: "object", properties: { path: { type: "string", description: "subfolder inside HaruShare (default: top level)" } }, additionalProperties: false },
  },
  {
    name: "read_shared_file",
    description: "Read a text file from the user's HaruShare folder (first 64 KB).",
    inputSchema: { type: "object", properties: { path: { type: "string", description: "file path inside HaruShare" } }, required: ["path"], additionalProperties: false },
  },
];

/**
 * Resolve a user-supplied relative path inside the share folder. Returns the real path, or throws.
 * Rejects absolute paths, "..", NUL, and symlinks that lead outside the folder.
 */
export function safeInside(root, rel = "") {
  if (typeof rel !== "string" || rel.includes("\0") || path.isAbsolute(rel) || /^[a-zA-Z]:/.test(rel)) throw new Error("path not allowed");
  const base = fs.realpathSync(root);
  const real = fs.realpathSync(path.resolve(base, rel));
  if (real !== base && !real.startsWith(base + path.sep)) throw new Error("path not allowed");
  return real;
}

function text(t, isError = false) {
  return { content: [{ type: "text", text: t }], ...(isError ? { isError: true } : {}) };
}

function callTool(name, args, { shareDir, now }) {
  args = args && typeof args === "object" ? args : {};
  if (name === "get_time") {
    const d = now();
    return text(`${d.toISOString()} (local: ${d.toString()})`);
  }
  if (name !== "list_shared_files" && name !== "read_shared_file") return null;
  try { fs.mkdirSync(shareDir, { recursive: true }); } catch {}
  try {
    if (name === "list_shared_files") {
      const dir = safeInside(shareDir, args.path ?? "");
      const rows = fs.readdirSync(dir, { withFileTypes: true }).filter((e) => !e.name.startsWith(".")).slice(0, MAX_LIST).map((e) => {
        const st = e.isFile() ? fs.statSync(path.join(dir, e.name)) : null;
        return e.isDirectory() ? `${e.name}/` : `${e.name} (${st ? st.size : "?"} bytes)`;
      });
      return text(rows.length ? rows.join("\n") : "(empty — the user has not put any files in HaruShare yet)");
    }
    const file = safeInside(shareDir, args.path);
    const st = fs.statSync(file);
    if (!st.isFile()) return text("not a file", true);
    const fd = fs.openSync(file, "r");
    try {
      const buf = Buffer.alloc(Math.min(st.size, MAX_READ));
      fs.readSync(fd, buf, 0, buf.length, 0);
      if (buf.includes(0)) return text("binary file — only text files can be read", true);
      return text(buf.toString("utf8") + (st.size > MAX_READ ? `\n\n[cut at ${MAX_READ} bytes of ${st.size}]` : ""));
    } finally { fs.closeSync(fd); }
  } catch (e) {
    // do not echo OS error text (it can contain absolute paths)
    return text(e.message === "path not allowed" ? "path not allowed" : "not found or not readable", true);
  }
}

const ok = (id, result) => ({ jsonrpc: "2.0", id, result });
const err = (id, code, message) => ({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });

/** One JSON-RPC message → response object, or null for notifications. */
function handleOne(msg, ctx) {
  if (!msg || typeof msg !== "object" || msg.jsonrpc !== "2.0" || typeof msg.method !== "string") return err(msg?.id, -32600, "invalid request");
  const hasId = msg.id !== undefined && msg.id !== null;
  switch (msg.method) {
    case "initialize":
      return ok(msg.id, {
        protocolVersion: typeof msg.params?.protocolVersion === "string" ? msg.params.protocolVersion : PROTOCOL,
        capabilities: { tools: {} },
        serverInfo: { name: "haru-pc", version: "1" },
        instructions: "Read-only access to the user's HaruShare folder. Do not share this connection's URL with anyone.",
      });
    case "ping": return hasId ? ok(msg.id, {}) : null;
    case "tools/list": return ok(msg.id, { tools: TOOLS });
    case "tools/call": {
      const r = callTool(msg.params?.name, msg.params?.arguments, ctx);
      return r ? ok(msg.id, r) : err(msg.id, -32602, "unknown tool");
    }
    default:
      return hasId ? err(msg.id, -32601, "method not found") : null; // notifications/* need no answer
  }
}

/**
 * Handle the body of one relay request. Returns the JSON text to send back, or null when there is nothing to
 * answer (notifications only).
 */
export function handleMcp(body, { shareDir = SHARE_DIR, now = () => new Date() } = {}) {
  let msg;
  try { msg = JSON.parse(body); } catch { return JSON.stringify(err(null, -32700, "parse error")); }
  const ctx = { shareDir, now };
  if (Array.isArray(msg)) {
    const out = msg.slice(0, 20).map((m) => handleOne(m, ctx)).filter(Boolean);
    return out.length ? JSON.stringify(out) : null;
  }
  const r = handleOne(msg, ctx);
  return r ? JSON.stringify(r) : null;
}

/**
 * Relay frame {t:"mcp", id, th, body} → frame to send back. The token hash must match what is enabled right now,
 * so `muse off` / `muse rotate` take effect immediately even if the relay still has the old hash.
 */
export function answerFrame(f, room, { load = loadMuse, ...opts } = {}) {
  const m = load();
  if (!m.enabled || f.th !== museHash(room, m.token)) return { t: "mcp", id: f.id, status: 404, body: "not found" };
  if (typeof f.body !== "string") return { t: "mcp", id: f.id, status: 400, body: JSON.stringify(err(null, -32600, "invalid request")) };
  return { t: "mcp", id: f.id, status: 200, body: handleMcp(f.body, opts) };
}
