// Work that only LOOKS at the computer needs no second card: the person already approved the job
// on the phone, and nothing changes. Everything here is deliberately narrow — anything not
// recognised falls back to the normal approval card. (No OpenClaw imports, so it can be tested alone.)
import os from "node:os";
import path from "node:path";
import { commandText } from "./safety.js";

/** OpenClaw "code mode" runs even skill reading and tool lookup as `exec` with a `code` string.
 *  Only plain `skills.list()` / `skills.read("name")` / `catalog.search("words")` / `catalog.all()`
 *  statements count (they only return names and text; calling a found tool is its own gated call)
 *  — any other code needs the card. */
const SKILL_STMT = /^(?:return\s+)?(?:await\s+)?(?:skills\.(?:list\(\s*\)|read\(\s*(["'])[\w.-]{1,64}\1\s*\))|catalog\.(?:all\(\s*\)|search\(\s*(["'])[\w .,:/가-힣-]{1,80}\2\s*\)))\s*;?$/;
export function isSkillLookupCode(params) {
  const code = typeof params?.code === "string" ? params.code.trim() : "";
  if (!code || code.length > 600) return false;
  const stmts = code.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  return stmts.length > 0 && stmts.length <= 5 && stmts.every((s) => SKILL_STMT.test(s));
}

const norm = (s) => s.toLowerCase().replace(/\.exe$/, "");
// Show-me-info commands (no file arguments)
const INFO_FLAGS_ONLY = new Set(["hostname", "whoami", "uname", "df", "free", "uptime", "pwd", "ver", "systeminfo", "get-location"]);
const INFO_CMDLETS = new Set(["get-psdrive", "get-volume", "get-disk", "get-ciminstance", "get-computerinfo", "get-date"]);
// Listing / reading files: every path must be inside the allowed folders
const FILE_READERS = new Set(["dir", "ls", "get-childitem", "gci", "type", "cat", "get-content", "gc", "tree", "get-item", "gi"]);
const LISTERS = new Set(["dir", "ls", "get-childitem", "gci", "tree"]);
const PATH_VALUE_FLAGS = new Set(["-path", "-literalpath"]);

export function tokenize(cmd) {
  const out = [];
  const re = /"([^"]*)"|'([^']*)'|(\S+)/g;
  let m;
  while ((m = re.exec(cmd))) out.push(m[1] ?? m[2] ?? m[3]);
  return out;
}

/** %VAR%, $env:VAR, $HOME, ~ → real text; null when something stays unresolved. */
export function expandPathText(s, env = process.env, home = os.homedir()) {
  let t = s.replace(/%([A-Za-z_]\w*)%/g, (_, k) => env[k] ?? env[k.toUpperCase()] ?? "\0");
  t = t.replace(/\$env:([A-Za-z_]\w*)/gi, (_, k) => env[k] ?? env[k.toUpperCase()] ?? "\0");
  t = t.replace(/\$HOME\b/g, home);
  if (t.startsWith("~")) t = home + t.slice(1);
  return /[\0$%`]/.test(t) ? null : t;
}

/**
 * Is this one plain command read-only AND confined to the allowed folders?
 * (Chained commands must already have been refused by the caller.)
 * `inside(p)` says whether a resolved path is in an allowed folder.
 */
export function isReadOnlyCommand(params, { base, inside, env, home }) {
  const toks = tokenize(commandText(params));
  if (!toks.length) return false;
  const cmd = norm(toks[0]);
  const args = toks.slice(1);
  if (INFO_FLAGS_ONLY.has(cmd)) return args.every((a) => /^-{1,2}[A-Za-z][\w-]*$/.test(a));
  if (INFO_CMDLETS.has(cmd)) return args.every((a) => /^[-\w:.*]+$/.test(a));
  if (!FILE_READERS.has(cmd)) return false;
  const paths = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (PATH_VALUE_FLAGS.has(a.toLowerCase())) { if (i + 1 >= args.length) return false; paths.push(args[++i]); continue; }
    if (/^-{1,2}[A-Za-z][\w-]*$/.test(a) || /^\/[A-Za-z]$/.test(a)) continue; // a plain flag
    paths.push(a);
  }
  if (!paths.length) return LISTERS.has(cmd) && inside(path.resolve(base)); // a bare `cat` waits on stdin
  for (const p of paths) {
    const x = expandPathText(p, env, home);
    if (x === null || x === "") return false;
    if (!inside(path.resolve(base, x))) return false;
  }
  return true;
}

// ---- Korean: PC answers and error text -------------------------------------------------------

export const HANGUL = /[ㄱ-ㆎ가-힣]/;
export const KOREAN_NOTE = "The person writes in Korean. Always answer in Korean (한국어), plain and short, unless they ask for another language. 사용자가 한국어로 말하면 한국어로만 답하세요.";

/** Extra system text for a Korean request; undefined otherwise. */
export function languageContext(userText) {
  return HANGUL.test(String(userText ?? "")) ? KOREAN_NOTE : undefined;
}

/** Short Korean message for raw English failure text; the original text when nothing matches. */
export function koreanFailure(text) {
  const t = String(text ?? "");
  if (/no approval route|approval unavailable|approval.*unavailable/i.test(t)) {
    return "PC가 승인 카드를 보낼 곳을 찾지 못했어요. 하루 앱을 켜 둔 채로 다시 맡겨 주세요.";
  }
  if (/\b429\b|rate.?limit|quota|resource.?exhausted|too many requests/i.test(t)) {
    return "AI 사용 한도에 걸렸어요. 잠시 뒤에 다시 맡겨 주세요.";
  }
  if (/all models failed/i.test(t)) return "PC의 AI가 지금 답하지 못했어요. 잠시 뒤에 다시 맡겨 주세요.";
  return t;
}
