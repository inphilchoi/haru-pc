import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { SAFE_CONFIG, TOOL_NOTE, buildRun, changedFiles, findOpencode, report, snapshot, stripAnsi } from "../opencode.js";
import { describe } from "../cards.js";

test("opencode is boxed in: no shell, no web, nothing outside the folder, no .git/.env", () => {
  const p = SAFE_CONFIG.permission;
  for (const k of ["webfetch", "websearch", "external_directory", "task", "skill", "question", "doom_loop"]) {
    assert.equal(p[k], "deny", k);
  }
  // shell: "ask" is auto-rejected by `opencode run` — only true while we never pass --auto
  assert.equal(p.bash, "ask");
  assert.ok(!buildRun({ folder: "/x", task: "t" }, {}).args.includes("--auto"));
  assert.equal(p.edit["*"], "allow");
  for (const k of ["*.env", "*.env.*", ".git/*", "*/.git/*"]) assert.equal(p.edit[k], "deny", k);
  assert.equal(SAFE_CONFIG.share, "disabled");
});

test("the boxed-in settings go inline, so a project's own opencode.json can't loosen them", () => {
  const { args, env } = buildRun({ folder: "/x/app", task: "fix the login bug" }, { PATH: "/bin" });
  assert.deepEqual(args, ["run", "--dir", "/x/app", "--title", "Haru PC", TOOL_NOTE + "fix the login bug"]);
  assert.deepEqual(JSON.parse(env.OPENCODE_CONFIG_CONTENT), JSON.parse(JSON.stringify(SAFE_CONFIG)));
  assert.equal(env.PATH, "/bin");
  const withModel = buildRun({ folder: "/x", task: "t", model: "opencode/space-bunny-free" }, {});
  assert.deepEqual(withModel.args.slice(-3), ["--model", "opencode/space-bunny-free", TOOL_NOTE + "t"]);
});

test("the task is one argument, never parsed by a shell", () => {
  const task = "고쳐 줘; rm -rf ~ && $(whoami) | cat";
  assert.equal(buildRun({ folder: "/x", task }, {}).args.at(-1), TOOL_NOTE + task);
});

test("finds opencode on PATH or in ~/.opencode/bin", () => {
  const home = path.join(os.homedir(), ".opencode", "bin", "opencode");
  assert.equal(findOpencode({ PATH: "/a:/b" }, (p) => p === "/b/opencode"), "/b/opencode");
  assert.equal(findOpencode({ PATH: "" }, (p) => p === home), process.platform === "win32" ? null : home);
  assert.equal(findOpencode({ PATH: "/a" }, () => false), null);
});

test("reports new and edited files, skipping .git and node_modules", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "haru-oc-"));
  fs.writeFileSync(path.join(dir, "a.py"), "x");
  fs.writeFileSync(path.join(dir, "same.txt"), "y");
  fs.mkdirSync(path.join(dir, ".git"));
  fs.mkdirSync(path.join(dir, "node_modules"));
  const before = snapshot(dir);
  fs.writeFileSync(path.join(dir, "a.py"), "xx");
  fs.writeFileSync(path.join(dir, "b.py"), "new");
  fs.writeFileSync(path.join(dir, ".git", "HEAD"), "ref");
  fs.writeFileSync(path.join(dir, "node_modules", "m.js"), "m");
  assert.deepEqual(changedFiles(before, snapshot(dir)), [
    { path: "a.py", kind: "edited" },
    { path: "b.py", kind: "new" },
  ]);
  fs.rmSync(dir, { recursive: true, force: true });
});

test("the chat gets opencode's answer (no colour codes) and the changed files", () => {
  const out = report("\x1b[0m> build · space-bunny-free\x1b[0m\nFixed calc.py:1", [{ path: "calc.py", kind: "edited" }, { path: "t.py", kind: "new" }]);
  assert.match(out, /Fixed calc\.py:1/);
  assert.match(out, /Changed files \(2\): calc\.py, t\.py \(new\)/);
  assert.doesNotMatch(out, /\x1b/);
  assert.match(report("", [], { timedOut: true }), /stopped/);
  assert.match(report("x", []), /No files were changed/);
  assert.equal(stripAnsi("\x1b[91m\x1b[1mError\x1b[0m"), "Error");
});

test("the phone card shows the folder, the task and the limits", () => {
  const card = describe("code_with_opencode", { folder: "~/Documents/app", task: "로그인 버그 고쳐 줘" }, ["/Users/me/Documents/app"]);
  assert.match(card, /폴더 \/ Folder: \/Users\/me\/Documents\/app/);
  assert.match(card, /할 일 \/ Task: 로그인 버그 고쳐 줘/);
  assert.match(card, /명령 실행·인터넷·폴더 밖/);
  assert.ok(card.length <= 480);
});
