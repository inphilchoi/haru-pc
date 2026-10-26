#!/usr/bin/env node
// `haru-pc muse …` — let Meta Muse (or another chat agent that can call a web address) use Haru PC's
// read-only tools, through the Haru relay.
//
//   (none) | on   turn it on and print ONE sentence to paste into Muse's chat (also copied to the clipboard)
//   rotate        new secret address (the old one stops working at once), print the new sentence
//   off           turn it off (the address stops working at once)
//   status        on or off (never prints the address)
//
// State lives in ~/.haru-pc/muse.json (mode 0600). Haru PC picks changes up within a couple of seconds.
// The address is a secret: anyone who has it can read the files in the HaruShare folder.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import { loadRelayConfig } from "./relay-bridge.js";
import { SHARE_DIR, loadMuse, museSentence, museUrl, newMuseToken, saveMuse } from "./muse-mcp.js";

function copy(text) {
  const tries = process.platform === "darwin" ? [["pbcopy"]]
    : process.platform === "win32" ? [["powershell.exe", "-NoProfile", "-Command", "Set-Clipboard -Value $env:HARU_CLIP"]] // env var keeps Korean text intact (clip.exe would garble it)
    : [["wl-copy"], ["xclip", "-selection", "clipboard"], ["xsel", "--clipboard", "--input"]];
  for (const [cmd, ...a] of tries) {
    if (spawnSync(cmd, a, { input: text, env: { ...process.env, HARU_CLIP: text }, stdio: ["pipe", "ignore", "ignore"], timeout: 5000, windowsHide: true }).status === 0) return true;
  }
  return false;
}

function show(token, cfg) {
  fs.mkdirSync(SHARE_DIR, { recursive: true });
  const sentence = museSentence(museUrl(cfg, token));
  console.log("Muse 채팅창에 아래 한 문장을 붙여 넣으세요. / Paste this one sentence into Muse's chat:\n");
  console.log(sentence + "\n");
  console.log(copy(sentence) ? "(클립보드에 복사했어요 / copied to the clipboard)" : "(클립보드를 쓸 수 없어요 — 위 문장을 직접 복사하세요 / copy the sentence above yourself)");
  console.log(`Muse가 볼 수 있는 것은 ${SHARE_DIR} 폴더의 파일뿐이고, 읽기만 가능해요. / Muse can only read files in ${SHARE_DIR}.`);
  console.log("주소가 새어 나갔다면: haru-pc muse rotate   끄려면: haru-pc muse off");
}

const [cmd = "on"] = process.argv.slice(2);
const cfg = loadRelayConfig();
const cur = loadMuse();
switch (cmd) {
  case "on":
  case "rotate": {
    if (cfg.enabled === false) {
      console.error("Muse 연결은 하루 중계가 필요해요. 먼저 켜세요: haru-pc relay on / Muse needs the Haru relay: haru-pc relay on");
      process.exit(1);
    }
    const token = cmd === "on" && cur.enabled ? cur.token : newMuseToken();
    if (!(cmd === "on" && cur.enabled)) saveMuse({ enabled: true, token, since: new Date().toISOString() });
    show(token, cfg);
    break;
  }
  case "off":
    saveMuse({ enabled: false });
    console.log("Muse 연결을 껐어요. 주소는 바로 쓸 수 없게 됩니다. / Muse access is off; the address stops working.");
    break;
  case "status":
    console.log(cur.enabled ? `Muse 연결: 켜짐 (폴더 ${SHARE_DIR}, 읽기 전용)` : "Muse 연결: 꺼짐 — 켜려면: haru-pc muse");
    break;
  default:
    console.error("Use: haru-pc muse [on] | rotate | off | status");
    process.exit(2);
}
