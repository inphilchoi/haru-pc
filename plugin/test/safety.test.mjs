import { test } from "node:test";
import assert from "node:assert/strict";
import { touchesSafetySettings } from "../safety.js";

test("the AI cannot run Haru PC / OpenClaw settings commands", () => {
  for (const command of [
    "haru-pc allow /tmp",
    "haru-pc readonly off",
    "/usr/local/bin/haru-pc allow ~",
    "openclaw config set tools.exec.mode off",
    "cd ~ && haru-pc allow /",
    "powershell -File haru-pc.ps1 allow C:\\",
    "cat ~/.openclaw-haru/openclaw.json",
    "nano ~/.haru-pc/relay.json",
  ]) assert.equal(touchesSafetySettings({ command }), true, command);
  assert.equal(touchesSafetySettings({ argv: ["haru-pc", "allow", "/tmp"] }), true);
});

test("ordinary commands are not caught", () => {
  for (const command of ["ls -A ~/Desktop", "date", "wc -l ~/Documents/haru-pc-notes.txt", "open https://openclaw.ai", "echo harupc"]) {
    assert.equal(touchesSafetySettings({ command }), false, command);
  }
  assert.equal(touchesSafetySettings({}), false);
});
