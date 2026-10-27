import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { isReadOnlyCommand, isSkillLookupCode, languageContext, koreanFailure, expandPathText } from "../readonly.js";

const home = path.resolve("/home/u");
const folders = [path.join(home, "Desktop"), path.join(home, "Documents")];
const inside = (p) => folders.some((f) => { const r = path.relative(f, p); return r === "" || (!r.startsWith("..") && !path.isAbsolute(r)); });
const env = { USERPROFILE: home };
const ro = (command, base = path.join(home, "Documents")) => isReadOnlyCommand({ command }, { base, inside, env, home });

test("skill lookups in code mode need no card, other code does", () => {
  assert.ok(isSkillLookupCode({ code: 'return await skills.read("files")' }));
  assert.ok(isSkillLookupCode({ code: 'await skills.list()\nreturn await skills.read("office")' }));
  assert.equal(isSkillLookupCode({ code: "const a = 1" }), false);
  assert.equal(isSkillLookupCode({ code: 'return await skills.read("files"); await tools.write({})' }), false);
  assert.equal(isSkillLookupCode({ code: "skills.read(x)" }), false);
  assert.equal(isSkillLookupCode({ code: 'skills.read("a")\nfs.rmSync("/")' }), false);
  assert.equal(isSkillLookupCode({}), false);
});

test("tool catalog lookups in code mode need no card, using a found tool does", () => {
  assert.ok(isSkillLookupCode({ code: 'catalog.search("terminal")' }));
  assert.ok(isSkillLookupCode({ code: 'return await catalog.search("disk space C드라이브")' }));
  assert.ok(isSkillLookupCode({ code: "return catalog.all()" }));
  assert.equal(isSkillLookupCode({ code: '(await catalog.search("shell"))[0]({ command: "del x" })' }), false);
  assert.equal(isSkillLookupCode({ code: 'catalog.search("a"); exec({ command: "rm -rf /" })' }), false);
  assert.equal(isSkillLookupCode({ code: "catalog.search(q)" }), false);
});

test("info commands", () => {
  assert.ok(ro("Get-PSDrive C"));
  assert.ok(ro("Get-PSDrive -Name C"));
  assert.ok(ro("df -h"));
  assert.ok(ro("hostname"));
  assert.equal(ro("hostname newname"), false);
  assert.equal(ro("Get-PSDrive C/Windows"), false);
});

test("listing and reading stay inside the allowed folders", () => {
  assert.ok(ro("dir"));
  assert.ok(ro("dir %USERPROFILE%/Desktop"));
  assert.ok(ro('Get-ChildItem -Path "$env:USERPROFILE/Desktop" -Recurse'));
  assert.ok(ro("ls ~/Documents/sub"));
  assert.ok(ro("type notes.txt"));
  assert.equal(ro("dir /"), false);
  assert.equal(ro("cat ~/.ssh/id_rsa"), false);
  assert.equal(ro("cat ../../etc/passwd"), false);
  assert.equal(ro("ls ~/Desktop/../.ssh"), false);
  assert.equal(ro("dir $env:UNKNOWN"), false);
  assert.equal(ro("ls", path.join(home, "Elsewhere")), false);
});

test("anything that changes things is not look-only", () => {
  for (const c of ["rm -rf ~/Documents", "del file.txt", "Remove-Item x", "mkdir x", "copy a b", "curl http://x", "powershell -c dir", "Set-Content a b", "cat"]) {
    assert.equal(ro(c), false, c);
  }
});

test("expandPathText", () => {
  assert.equal(expandPathText("~/a", env, "/h"), "/h/a");
  assert.equal(expandPathText("$env:NOPE", env, home), null);
  assert.equal(expandPathText("%NOPE%", env, home), null);
  assert.equal(expandPathText("`x", env, home), null);
});

test("Korean job gets a Korean note; English job does not", () => {
  assert.match(languageContext("C 드라이브 남은 용량 알려줘"), /Korean/);
  assert.equal(languageContext("free disk space?"), undefined);
  assert.equal(languageContext(undefined), undefined);
});

test("raw English failures become short Korean", () => {
  assert.match(koreanFailure("All models failed (2): a: 429 quota"), /한도/);
  assert.match(koreanFailure("Plugin approval unavailable (no approval route)"), /승인 카드/);
  assert.match(koreanFailure("All models failed (2): timeout"), /답하지 못했어요/);
  assert.equal(koreanFailure("something else"), "something else");
});
