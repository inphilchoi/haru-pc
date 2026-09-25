// Haru PC plugin for OpenClaw.
//
// Haru PC's safety rule: nothing changes on the computer until the person approves it
// on their phone. OpenClaw already asks for shell commands (tools.exec.mode = "ask");
// this plugin asks for every other tool that can change something, keeps changes inside
// the folders the person allowed, and blocks changes entirely in read-only mode.
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import os from "node:os";
import path from "node:path";
import { startRelayBridge } from "./relay-bridge.js";

// Tools that only look at things. Everything else needs a phone approval.
const READ_ONLY_TOOLS = new Set([
  "read", "ls", "glob", "grep", "find", "search",
  "image", "pdf", "session_status", "current",
  "docs_search", "memory_search", "active_memory_search",
  "agents_list", "conversations_list", "get_goal", "ask_user",
]);
// Shell commands already go through OpenClaw's own exec approval (one card, not two).
const EXEC_TOOLS = new Set(["exec", "process"]);

const TITLE_MAX = 80;   // plugin approval title limit
const DESC_MAX = 480;   // stay under the 512-character description limit

function defaultFolders() {
  const home = os.homedir();
  return ["Documents", "Downloads", "Desktop"].map((d) => path.join(home, d))
    .concat(path.join(home, ".haru-pc", "workspace"));
}

function expandHome(p) {
  return p.startsWith("~") ? path.join(os.homedir(), p.slice(1)) : p;
}

/** Paths a tool call will touch: host-derived hints first, then common parameter names. */
function targetPaths(event) {
  const out = new Set(event.derivedPaths ?? []);
  const p = event.params ?? {};
  for (const key of ["path", "file_path", "filePath", "target", "destination", "dest", "to", "from", "source", "cwd", "directory", "dir"]) {
    if (typeof p[key] === "string" && p[key]) out.add(p[key]);
  }
  for (const key of ["paths", "files"]) {
    if (Array.isArray(p[key])) for (const v of p[key]) if (typeof v === "string") out.add(v);
  }
  return [...out].map((v) => path.resolve(expandHome(v)));
}

function inside(child, parent) {
  const rel = path.relative(parent, child);
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}

const clip = (s, n) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

/** Short, human card text: what will happen, to which files. */
function describe(event, paths) {
  const lines = [];
  if (paths.length) lines.push(`대상 / Target: ${paths.slice(0, 5).join(", ")}${paths.length > 5 ? ` (+${paths.length - 5})` : ""}`);
  const p = { ...(event.params ?? {}) };
  for (const k of ["content", "contents", "text", "data", "body"]) {
    if (typeof p[k] === "string") p[k] = `(${p[k].length} chars)`;
  }
  lines.push(clip(JSON.stringify(p), 300));
  return clip(lines.join("\n"), DESC_MAX);
}

export default definePluginEntry({
  id: "haru-pc",
  name: "Haru PC",
  description: "Phone approval for every change, allowed folders only, and Haru's default skills.",
  register(api) {
    const cfg = api.pluginConfig ?? {};
    const folders = (Array.isArray(cfg.allowedFolders) && cfg.allowedFolders.length ? cfg.allowedFolders : defaultFolders())
      .map((f) => path.resolve(expandHome(String(f))));
    const readOnly = cfg.readOnly === true;

    api.on("before_tool_call", (event) => {
      const tool = String(event.toolName ?? "");
      if (READ_ONLY_TOOLS.has(tool)) return;

      if (readOnly) {
        return { block: true, blockReason: "Haru PC is in read-only mode, so it can look but not change anything. (하루 PC 가 읽기 전용이라 바꿀 수 없어요)" };
      }

      const paths = targetPaths(event);
      const outside = paths.filter((p) => !folders.some((f) => inside(p, f)));
      if (outside.length) {
        return {
          block: true,
          blockReason: `Outside the allowed folders: ${outside.slice(0, 3).join(", ")}. Allow a folder with \`haru-pc allow <folder>\`. (허용한 폴더 밖이라 막았어요)`,
        };
      }

      if (EXEC_TOOLS.has(tool)) return; // OpenClaw's exec approval shows the exact command on the phone

      return {
        requireApproval: {
          title: clip(`하루 PC · ${tool}`, TITLE_MAX),
          description: describe(event, paths),
          severity: "warning",
          allowedDecisions: ["allow-once", "deny"], // no "always allow" — every change is approved on the phone
          timeoutMs: 10 * 60_000,
        },
      };
    }, { priority: 100 });

    // Reach this computer from anywhere through the end-to-end encrypted Haru relay
    // (see relay-bridge.js). Started with the gateway, stopped when it drains.
    let stopRelay = null;
    api.on("gateway_start", (_event, ctx) => {
      if (ctx?.abortSignal?.aborted || stopRelay) return;
      const gw = api.config?.gateway ?? {};
      const port = gw.port ?? 18789;
      const scheme = gw.tls?.enabled ? "wss" : "ws";
      stopRelay = startRelayBridge({
        gatewayUrl: `${scheme}://127.0.0.1:${port}`,
        signal: ctx?.abortSignal,
        log: (m) => api.logger?.info?.(`[haru-relay] ${m}`),
      });
    });
    api.on("gateway_stop", () => { stopRelay?.(); stopRelay = null; });
  },
});
