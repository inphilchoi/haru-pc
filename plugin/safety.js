// Rules the AI cannot talk its way around (kept free of OpenClaw imports so they can be tested alone).

export const SETTINGS_BLOCK_REASON = "Only the person can change Haru PC's safety settings, on the computer itself — ask them to run it there. (하루 PC 안전 설정은 사람이 PC 에서 직접 바꿔야 해요)";

/** Commands that would change Haru PC / OpenClaw settings: allowed folders, read-only, approvals, config. */
export function touchesSafetySettings(params) {
  const p = params ?? {};
  const cmd = [p.command, p.cmd, p.rawCommand, Array.isArray(p.argv) ? p.argv.join(" ") : null]
    .filter((v) => typeof v === "string").join(" ");
  if (!cmd) return false;
  return /(^|[\s;&|/"'`(])(haru-pc(\.ps1)?|openclaw)(\s|$)/i.test(cmd) ||
    /\.haru-pc\b|\.openclaw[\w-]*/i.test(cmd);
}
