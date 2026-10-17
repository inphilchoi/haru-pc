#!/usr/bin/env node
// `haru-pc pair`: one QR code with everything the Haru app needs —
//   - the OpenClaw setup code (this computer's local address + a 10-minute, one-use bootstrap token)
//   - the relay room, access token and end-to-end key (to reach this computer from anywhere)
// Code format: "haru1." + base64url(JSON {v:1, s:<setupCode>, r:{u, room, t, k}})
import { execFileSync, spawn, spawnSync } from "node:child_process";
import { mkdirSync, rmSync, chmodSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import QRCode from "qrcode";
import { loadRelayConfig } from "./relay-bridge.js";

const profile = process.env.HARU_PC_PROFILE || "haru";
const extra = process.argv.slice(2).filter((a) => a !== "--show-code" && a !== "--terminal" && /^--[a-z][a-z-]*$/.test(a)); // plain flags only (cmd.exe runs these on Windows)
// On Windows `openclaw` is an npm shim (openclaw.cmd); Node only runs .cmd files through a shell.
// Run cmd.exe ourselves instead of `shell: true` (Node warns DEP0190 when args are passed with shell: true).
const win = process.platform === "win32";
const args = ["--profile", profile, "qr", "--json", ...extra];
const out = win
  ? execFileSync(process.env.ComSpec || "cmd.exe", ["/d", "/s", "/c", "openclaw.cmd", ...args], { encoding: "utf8" })
  : execFileSync("openclaw", args, { encoding: "utf8" });
const qr = JSON.parse(out.slice(out.indexOf("{")));
const relay = loadRelayConfig();
const payload = { v: 1, s: qr.setupCode };
if (relay.enabled !== false) payload.r = { u: relay.url, room: relay.room, t: relay.token, k: relay.key };
const code = "haru1." + Buffer.from(JSON.stringify(payload)).toString("base64url");

// The code carries the relay key, so the QR is shown in a small picture window (a big console QR got cut off on
// real PCs). The PNG is private (mode 600) and is removed after 10 minutes - the same time the setup code expires -
// by a tiny detached helper, because this process exits right away. The next `pair` overwrites it anyway.
const wantTerminal = process.argv.includes("--terminal");
const png = join(process.env.HARU_PC_HOME || join(homedir(), ".haru-pc"), "pair-qr.png");

function hasDesktop() {
  if (process.env.SSH_CONNECTION || process.env.SSH_TTY) return false;
  if (win || process.platform === "darwin") return true;
  return !!(process.env.DISPLAY || process.env.WAYLAND_DISPLAY) && spawnSync("sh", ["-c", "command -v xdg-open"]).status === 0;
}
function openImage(file) {
  // Windows: `start "" file` (the empty title must be its own argument).
  const [cmd, a] = win ? [process.env.ComSpec || "cmd.exe", ["/d", "/c", "start", "", file]] : [process.platform === "darwin" ? "open" : "xdg-open", [file]];
  return spawnSync(cmd, a, { stdio: "ignore", timeout: 10000, windowsHide: true }).status === 0;
}

let opened = false;
if (!wantTerminal) {
  try {
    mkdirSync(join(png, ".."), { recursive: true });
    await QRCode.toFile(png, code, { type: "png", width: 420, margin: 2, errorCorrectionLevel: "M" });
    try { chmodSync(png, 0o600); } catch {}
    if (hasDesktop()) opened = openImage(png);
    if (opened) {
      spawn(process.execPath, ["-e", `setTimeout(()=>{try{require("fs").rmSync(${JSON.stringify(png)},{force:true})}catch{}},600000)`], { detached: true, stdio: "ignore", windowsHide: true }).unref();
    } else rmSync(png, { force: true });
  } catch { opened = false; }
}
if (opened) {
  console.log("QR 창을 열었어요. 폰 하루 앱에서 '내 PC 연결해 줘' 하고 찍으세요. (10분 안, 한 번만 쓸 수 있어요)");
  console.log("If the window is hidden, look for it on the taskbar. Can't see it? Run: haru-pc pair --terminal");
} else {
  console.log(await QRCode.toString(code, { type: "terminal", small: true, errorCorrectionLevel: "M" }));
  console.log("Scan this with the Haru app (\"내 PC 연결해 줘\"). Valid for 10 minutes, one use.");
  if (!wantTerminal) console.log("(Couldn't open a picture window here, so the code is shown in the console. If it is cut off, make the window bigger or smaller text.)");
}
console.log(`Local address: ${qr.gatewayUrl}${payload.r ? " · Away from home: through the encrypted Haru relay" : ""}`);
if (process.argv.includes("--show-code")) console.log(`\nCode:\n${code}`);
