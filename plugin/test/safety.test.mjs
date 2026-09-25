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

test("only one plain command at a time", async () => {
  const { isChainedCommand } = await import("../safety.js");
  for (const command of [
    "ls | wc -l", "cd ~ && rm -rf x", "date; whoami", "echo hi > ~/Desktop/a.txt", "cat < /etc/passwd",
    "echo $(whoami)", "echo `id`", "sleep 5 &", "echo \"$(rm -rf ~)\"", "ls\nrm -rf ~",
  ]) assert.equal(isChainedCommand({ command }), true, command);
  for (const command of ["ls -A ~/Desktop", "date", "echo 'a | b'", 'echo "x > y"', "find ~/Downloads -name '*.pdf'"]) {
    assert.equal(isChainedCommand({ command }), false, command);
  }
});
