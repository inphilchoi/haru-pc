import { test } from "node:test";
import assert from "node:assert/strict";
import { describe as card, describeCommand } from "../cards.js";

test("write card is plain words with a content preview, not JSON", () => {
  const d = card("write", { path: "~/Documents/메모.txt", content: "안녕\n" }, ["/Users/me/Documents/메모.txt"]);
  assert.equal(d, '파일 쓰기 / Write file\n대상 / Target: /Users/me/Documents/메모.txt\n내용 / Content: 3자 — "안녕"');
  assert.ok(!d.includes("{"));
});

test("command card shows the exact command and folder", () => {
  assert.equal(describeCommand({ command: "date", workdir: "~/Documents" }), "명령 / Command: date\n위치 / Folder: ~/Documents");
});

test("cards stay under the gateway's 512-character limit", () => {
  const d = card("write", { path: "/x", content: "가".repeat(5000), note: "n".repeat(900) }, Array(20).fill("/very/long/path/" + "p".repeat(40)));
  assert.ok(d.length <= 480, String(d.length));
});
