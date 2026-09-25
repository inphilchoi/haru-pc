// Approval card text: what the person sees on the phone before anything runs.
import { commandText } from "./safety.js";

export const TITLE_MAX = 80;   // plugin approval title limit
export const DESC_MAX = 480;   // stay under the 512-character description limit

export const clip = (s, n) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

/** Command card: the exact command first (that is what the person approves), then where. */
export function describeCommand(params) {
  const p = params ?? {};
  const where = p.workdir ?? p.cwd;
  return clip([`명령 / Command: ${commandText(p)}`, where ? `위치 / Folder: ${where}` : null].filter(Boolean).join("\n"), DESC_MAX);
}

const ACTION_NAMES = {
  write: "파일 쓰기 / Write file", edit: "파일 고치기 / Edit file", apply_patch: "파일 고치기 / Edit files",
  move: "옮기기 / Move", rename: "이름 바꾸기 / Rename", copy: "복사 / Copy", mkdir: "폴더 만들기 / New folder",
  browser: "브라우저 / Browser", web_fetch: "웹 페이지 열기 / Open web page", message: "메시지 보내기 / Send message",
  send_file: "폰으로 보내기 / Send to phone", process: "실행 중인 작업 / Running task",
};

/** Short, human card text: what will happen, to which files — plain lines, not JSON. */
export function describe(tool, params, paths) {
  const p = params ?? {};
  const lines = [ACTION_NAMES[tool] ?? `${tool}`];
  if (paths.length) lines.push(`대상 / Target: ${paths.slice(0, 5).join(", ")}${paths.length > 5 ? ` (+${paths.length - 5})` : ""}`);
  for (const k of ["content", "contents", "text", "data", "body"]) {
    if (typeof p[k] === "string") lines.push(`내용 / Content: ${p[k].length}자 — "${clip(p[k].replace(/\s+/g, " ").trim(), 60)}"`);
  }
  for (const [k, v] of Object.entries(p)) {
    if (["content", "contents", "text", "data", "body", "path", "file_path", "filePath"].includes(k)) continue;
    if (v === undefined || v === null || v === "") continue;
    const shown = typeof v === "string" ? v : JSON.stringify(v);
    lines.push(`${k}: ${clip(shown, 120)}`);
  }
  return clip(lines.join("\n"), DESC_MAX);
}

