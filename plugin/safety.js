// Rules the AI cannot talk its way around (kept free of OpenClaw imports so they can be tested alone).

export const SETTINGS_BLOCK_REASON = "Only the person can change Haru PC's safety settings, on the computer itself — ask them to run it there. (하루 PC 안전 설정은 사람이 PC 에서 직접 바꿔야 해요)";

/** Commands that would change Haru PC / OpenClaw settings: allowed folders, read-only, approvals, config. */
export function touchesSafetySettings(params) {
  const cmd = commandText(params);
  if (!cmd) return false;
  return /(^|[\s;&|/"'`(])(haru-pc(\.ps1)?|openclaw)(\s|$)/i.test(cmd) ||
    /\.haru-pc\b|\.openclaw[\w-]*/i.test(cmd);
}

export const CHAIN_BLOCK_REASON = "One simple command at a time — no pipes (|), ;, &&, redirects (> <) or $(…). Use the write/edit tools to save files. (명령은 한 번에 하나만 — 파일 저장은 write 도구로)";

/** The shell command a tool call will run, if any. */
export function commandText(params) {
  const p = params ?? {};
  return [p.command, p.cmd, p.rawCommand, Array.isArray(p.argv) ? p.argv.join(" ") : null]
    .filter((v) => typeof v === "string").join(" ").trim();
}

/**
 * Pipes, chaining, redirects and substitutions hide what really runs behind the part a person
 * reads on the approval card, so Haru PC only approves one plain command at a time.
 * (Quoted text is ignored: `echo "a | b"` is still one command.)
 */
export function isChainedCommand(params) {
  const cmd = commandText(params);
  if (!cmd) return false;
  if (/`|\$\(/.test(cmd)) return true; // substitution runs even inside double quotes
  const unquoted = cmd.replace(/'[^']*'/g, "''").replace(/"(?:[^"\\]|\\.)*"/g, '""');
  return /[|;&<>\n]/.test(unquoted);
}
