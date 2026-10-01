// Haru PC plugin for OpenClaw.
//
// Haru PC's safety rule: nothing changes on the computer until the person approves it
// on their phone. This plugin asks — one card per change — for every tool that can change
// something, shell commands included, for every AI runtime (local model, API key, and
// Claude/Codex logins alike). It keeps changes inside the folders the person allowed,
// approves only one plain command at a time, and blocks changes entirely in read-only mode.
//
// Why the plugin and not OpenClaw's own exec approval: with a Claude login (claude-cli
// runtime) OpenClaw's native-tool approval is sent as if the phone itself asked, so it is
// never shown on the phone and every command failed. The installer therefore sets
// tools.exec.mode = full and leaves the asking to this plugin.
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { startRelayBridge } from "./relay-bridge.js";
import { CHAIN_BLOCK_REASON, SETTINGS_BLOCK_REASON, isChainedCommand, touchesSafetySettings } from "./safety.js";
import { TITLE_MAX, clip, describe, describeCommand } from "./cards.js";
import { INSTALL_HINT, TOOL_NAME as OPENCODE_TOOL, findOpencode, runOpencode } from "./opencode.js";

// Tools that only look at things. Everything else needs a phone approval.
const READ_ONLY_TOOLS = new Set([
  "read", "ls", "glob", "grep", "find", "search",
  "image", "pdf", "session_status", "current",
  "docs_search", "memory_search", "active_memory_search",
  "agents_list", "conversations_list", "get_goal", "ask_user",
  // OpenClaw's own bookkeeping (finding tools, yielding a turn) — changes nothing on the computer
  "tool_search", "tool_describe", "sessions_yield", "sessions_list", "sessions_history",
  // Claude/Codex runtime's own planning list — stays inside the AI
  "todo_write",
]);
// Shell commands (OpenClaw's exec, Claude's Bash)
const EXEC_TOOLS = new Set(["exec", "bash", "shell"]);
// Background processes the AI started: looking is fine, stopping or typing into them is a change
const PROCESS_READ_ACTIONS = new Set(["list", "poll", "log", "status"]);


function defaultFolders() {
  const home = os.homedir();
  return ["Documents", "Downloads", "Desktop"].map((d) => path.join(home, d))
    .concat(path.join(home, ".haru-pc", "workspace"));
}

function expandHome(p) {
  return p.startsWith("~") ? path.join(os.homedir(), p.slice(1)) : p;
}

/** Paths a tool call will touch: host-derived hints first, then common parameter names.
 *  Relative paths are resolved the way OpenClaw's tools do: from the run's folder (workspace). */
function targetPaths(event, base) {
  const out = new Set(event.derivedPaths ?? []);
  const p = event.params ?? {};
  for (const key of ["path", "file_path", "filePath", "target", "destination", "dest", "to", "from", "source", "cwd", "workdir", "directory", "dir", "folder"]) {
    if (typeof p[key] === "string" && p[key]) out.add(p[key]);
  }
  for (const key of ["paths", "files"]) {
    if (Array.isArray(p[key])) for (const v of p[key]) if (typeof v === "string") out.add(v);
  }
  return [...out].map((v) => path.resolve(base, expandHome(v)));
}

function inside(child, parent) {
  const rel = path.relative(parent, child);
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}

export default definePluginEntry({
  id: "haru-pc",
  name: "Haru PC",
  description: "Phone approval for every change, allowed folders only, and Haru's default skills.",
  register(api) {
    const cfg = api.pluginConfig ?? {};
    // Haru's own workspace (notes, drafts) is always allowed, wherever the installer put it
    const workspace = api.config?.agents?.defaults?.workspace;
    const folders = (Array.isArray(cfg.allowedFolders) && cfg.allowedFolders.length ? cfg.allowedFolders : defaultFolders())
      .concat(typeof workspace === "string" && workspace ? [workspace] : [])
      .map((f) => path.resolve(expandHome(String(f))));
    const readOnly = cfg.readOnly === true;

    api.on("before_tool_call", (event, ctx) => {
      const tool = String(event.toolName ?? "");
      if (READ_ONLY_TOOLS.has(tool)) return;
      // Tool Search's tool_call only forwards to the real tool, and that final call comes back
      // through this hook with its own name and parameters — that is the card the phone sees.
      if (tool === "tool_call") return;
      if (tool === "process" && PROCESS_READ_ACTIONS.has(String(event.params?.action ?? ""))) return;

      if (readOnly) {
        return { block: true, blockReason: "Haru PC is in read-only mode, so it can look but not change anything. (하루 PC 가 읽기 전용이라 바꿀 수 없어요)" };
      }

      const base = ctx?.cwd ?? ctx?.workspaceDir ?? workspace ?? process.cwd();
      const paths = targetPaths(event, path.resolve(expandHome(String(base))));
      const outside = paths.filter((p) => !folders.some((f) => inside(p, f)));
      if (outside.length) {
        return {
          block: true,
          blockReason: `Outside the allowed folders: ${outside.slice(0, 3).join(", ")}. Allow a folder with \`haru-pc allow <folder>\`. (허용한 폴더 밖이라 막았어요)`,
        };
      }

      if (EXEC_TOOLS.has(tool)) {
        // The AI must never widen its own limits (seen in testing: after a block it tried
        // `haru-pc allow …`). Safety settings are changed only by the person, on the computer.
        if (touchesSafetySettings(event.params)) return { block: true, blockReason: SETTINGS_BLOCK_REASON };
        if (isChainedCommand(event.params)) return { block: true, blockReason: CHAIN_BLOCK_REASON };
      }

      if (tool === OPENCODE_TOOL && !paths.length) {
        return { block: true, blockReason: "Say which allowed folder the code is in. (코드가 있는 폴더를 알려 주세요)" };
      }

      return {
        requireApproval: {
          title: clip(EXEC_TOOLS.has(tool) ? "하루 PC · 명령 실행" : tool === OPENCODE_TOOL ? "하루 PC · 코딩 맡기기 (opencode)" : `하루 PC · ${tool}`, TITLE_MAX),
          description: EXEC_TOOLS.has(tool) ? describeCommand(event.params) : describe(tool, event.params, paths),
          severity: "warning",
          allowedDecisions: ["allow-once", "deny"], // no "always allow" — every change is approved on the phone
          timeoutMs: 10 * 60_000,
        },
      };
    }, { priority: 100 });

    // Coding jobs go to opencode, boxed into one allowed folder (see opencode.js).
    // The phone approval above is the gate: one card per job, showing the folder and the task.
    api.registerTool({
      name: OPENCODE_TOOL,
      description:
        "Hand a coding job (fix a bug, add a small feature, explain or tidy code) in ONE project folder to opencode, " +
        "an open-source coding agent on this computer, and get back its answer and the list of changed files. " +
        "opencode can only read and edit files inside that folder — no shell, no web, no .git or .env files. " +
        "Use it for code; use the normal tools for everything else. The person approves each job on the phone.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          folder: { type: "string", description: "The project folder (absolute path, inside the allowed folders)." },
          task: { type: "string", description: "What to do, in the person's own words plus any detail you know." },
        },
        required: ["folder", "task"],
      },
      async execute(_id, params, signal) {
        // Absolute paths only: the approval hook resolves relative paths from the run's folder,
        // so a relative path here could point somewhere other than what the phone card showed.
        const raw = expandHome(String(params?.folder ?? ""));
        if (!path.isAbsolute(raw)) return { content: [{ type: "text", text: "Give the folder as a full path, e.g. ~/Documents/my-app." }] };
        const folder = path.resolve(raw);
        const task = String(params?.task ?? "").trim();
        if (!task) return { content: [{ type: "text", text: "No task given." }] };
        if (!fs.existsSync(folder) || !fs.statSync(folder).isDirectory()) {
          return { content: [{ type: "text", text: `Folder not found: ${folder}` }] };
        }
        const bin = findOpencode();
        if (!bin) return { content: [{ type: "text", text: INSTALL_HINT }] };
        const model = typeof cfg.opencodeModel === "string" && cfg.opencodeModel ? cfg.opencodeModel : undefined;
        const text = await runOpencode({ bin, folder, task, model, signal });
        return { content: [{ type: "text", text }] };
      },
    });

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
