// "Code with opencode": Haru PC hands a coding job in one allowed folder to opencode
// (https://opencode.ai) and reports back what changed. Kept free of OpenClaw imports so it can be tested alone.
//
// One phone approval covers one job, so opencode itself is boxed in for that run (checked on 2026-10-01):
// it may read and edit files inside the folder only — no shell, no web, nothing outside the folder,
// no .git or .env files. Our settings are passed inline (OPENCODE_CONFIG_CONTENT), and they win over
// an opencode.json shipped inside the project, so a downloaded repo cannot re-open the shell.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

export const TOOL_NAME = "code_with_opencode";

export const SAFE_CONFIG = Object.freeze({
  $schema: "https://opencode.ai/config.json",
  share: "disabled",       // never upload the conversation as a link
  autoupdate: false,
  permission: {
    edit: { "*": "allow", "*.env": "deny", "*.env.*": "deny", ".git/*": "deny", "*/.git/*": "deny" },
    read: "allow", glob: "allow", grep: "allow", list: "allow", lsp: "allow", todowrite: "allow",
    bash: "deny", webfetch: "deny", websearch: "deny", external_directory: "deny",
    task: "deny", skill: "deny", question: "deny", doom_loop: "deny",
  },
});

export const INSTALL_HINT =
  "opencode isn't installed on this computer. Ask the person to install it on the computer itself: " +
  "`curl -fsSL https://opencode.ai/install | bash` (Windows: `npm install -g opencode-ai`). " +
  "(이 PC 에 opencode 가 없어요 — PC 에서 직접 설치해 주세요)";

/** Where the opencode command lives, or null. */
export function findOpencode(env = process.env, exists = fs.existsSync) {
  const exe = process.platform === "win32" ? ["opencode.cmd", "opencode.exe", "opencode"] : ["opencode"];
  const dirs = (env.PATH ?? "").split(path.delimiter).filter(Boolean)
    .concat(path.join(os.homedir(), ".opencode", "bin"));
  for (const d of dirs) for (const e of exe) {
    const p = path.join(d, e);
    if (exists(p)) return p;
  }
  return null;
}

/** Command line and environment for one boxed-in run. */
export function buildRun({ folder, task, model }, env = process.env) {
  const args = ["run", "--dir", folder, "--title", "Haru PC"];
  if (model) args.push("--model", model);
  args.push(task);
  return { args, env: { ...env, OPENCODE_CONFIG_CONTENT: JSON.stringify(SAFE_CONFIG) } };
}

// Big generated folders are skipped when looking for what changed
const SKIP_DIRS = new Set([".git", "node_modules", "build", "dist", ".dart_tool", "Pods", ".gradle", ".next", "__pycache__", ".venv", "venv", "target"]);
const MAX_FILES = 20_000;

/** path → "mtime:size" for the files in a folder (relative paths). */
export function snapshot(folder) {
  const out = new Map();
  const walk = (dir) => {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (out.size >= MAX_FILES) return;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) { if (!SKIP_DIRS.has(e.name)) walk(p); continue; }
      if (!e.isFile()) continue;
      try { const s = fs.statSync(p); out.set(path.relative(folder, p), `${s.mtimeMs}:${s.size}`); } catch {}
    }
  };
  walk(folder);
  return out;
}

/** Files that are new or different after the run. */
export function changedFiles(before, after) {
  const changed = [];
  for (const [p, sig] of after) {
    if (!before.has(p)) changed.push({ path: p, kind: "new" });
    else if (before.get(p) !== sig) changed.push({ path: p, kind: "edited" });
  }
  return changed.sort((a, b) => a.path.localeCompare(b.path));
}

export const stripAnsi = (s) => s.replace(/\x1b\[[0-9;?]*[ -/]*[@-~]/g, "");

/** What goes back to the chat: opencode's answer (tail) and the changed files. */
export function report(output, changed, { code, timedOut } = {}) {
  const text = stripAnsi(output).replace(/\n{3,}/g, "\n\n").trim();
  const answer = text.length > 3000 ? "…" + text.slice(-3000) : text;
  const lines = [];
  if (timedOut) lines.push("opencode took too long and was stopped. (시간이 너무 걸려 멈췄어요)");
  else if (code) lines.push(`opencode ended with an error (exit ${code}).`);
  lines.push(answer || "(opencode gave no answer)");
  lines.push(changed.length
    ? `Changed files (${changed.length}): ` + changed.slice(0, 30).map((c) => `${c.path}${c.kind === "new" ? " (new)" : ""}`).join(", ") + (changed.length > 30 ? ` (+${changed.length - 30})` : "")
    : "No files were changed.");
  return lines.join("\n\n");
}

/** Run opencode once in `folder`; resolves with the text for the chat. */
export function runOpencode({ bin, folder, task, model, timeoutMs = 15 * 60_000, signal }) {
  const before = snapshot(folder);
  const { args, env } = buildRun({ folder, task, model });
  return new Promise((resolve) => {
    let output = "";
    let timedOut = false;
    const child = spawn(bin, args, { cwd: folder, env, stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
    const keep = (d) => { output += d; if (output.length > 200_000) output = output.slice(-100_000); };
    child.stdout.on("data", keep);
    child.stderr.on("data", keep);
    const stop = () => child.kill("SIGTERM");
    const timer = setTimeout(() => { timedOut = true; stop(); }, timeoutMs);
    signal?.addEventListener?.("abort", stop, { once: true });
    let finished = false;
    const done = (code) => {
      if (finished) return; // "error" can be followed by "close"
      finished = true;
      clearTimeout(timer);
      signal?.removeEventListener?.("abort", stop);
      resolve(report(output, changedFiles(before, snapshot(folder)), { code, timedOut }));
    };
    child.on("error", (e) => { output += `\n${e.message}`; done(1); });
    child.on("close", (code) => done(code ?? 0));
  });
}
