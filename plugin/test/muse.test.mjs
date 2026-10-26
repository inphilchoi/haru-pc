// node --test plugin/test
// Muse connection: the read-only MCP server, the PC side of the relay frames, and the relay's HTTPS endpoint
// (the real Room class with a fake Durable Object state).
import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { EventEmitter } from "node:events";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import WebSocket from "ws";
import { handleMcp, answerFrame, museHash, safeInside, museUrl, museSentence, MAX_READ } from "../muse-mcp.js";
import { startRelayBridge } from "../relay-bridge.js";
import worker, { Room } from "../../relay/src/index.js";

const room = "b".repeat(32);
const token = crypto.randomBytes(32).toString("base64url");
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(check, ms = 3000) {
  const end = Date.now() + ms;
  while (Date.now() < end) { if (check()) return; await wait(10); }
  assert.fail("timed out waiting");
}

function shareDir() {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), "muse-test-"));
  const share = path.join(base, "HaruShare");
  fs.mkdirSync(share);
  fs.writeFileSync(path.join(share, "note.txt"), "안녕 hello");
  fs.mkdirSync(path.join(share, "sub"));
  fs.writeFileSync(path.join(share, "sub", "a.md"), "# a");
  fs.writeFileSync(path.join(base, "secret.txt"), "TOP SECRET");
  return { base, share };
}
const rpc = (method, params, id = 1) => JSON.stringify({ jsonrpc: "2.0", id, method, params });
const call = (share, name, args) => JSON.parse(handleMcp(rpc("tools/call", { name, arguments: args }), { shareDir: share }));
const textOf = (r) => r.result.content[0].text;

test("initialize / tools/list / notifications / ping", () => {
  const { share } = shareDir();
  const init = JSON.parse(handleMcp(rpc("initialize", { protocolVersion: "2025-06-18" }), { shareDir: share }));
  assert.equal(init.result.protocolVersion, "2025-06-18");
  assert.ok(init.result.capabilities.tools);
  assert.equal(handleMcp(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }), { shareDir: share }), null);
  const list = JSON.parse(handleMcp(rpc("tools/list"), { shareDir: share }));
  assert.deepEqual(list.result.tools.map((t) => t.name), ["get_time", "list_shared_files", "read_shared_file"]);
  assert.deepEqual(JSON.parse(handleMcp(rpc("ping"), { shareDir: share })).result, {});
  assert.equal(JSON.parse(handleMcp(rpc("nope"), { shareDir: share })).error.code, -32601);
  assert.equal(JSON.parse(handleMcp("{bad", { shareDir: share })).error.code, -32700);
  assert.equal(call(share, "rm_rf", {}).error.code, -32602);
  const batch = JSON.parse(handleMcp(`[${rpc("ping", undefined, 1)},${rpc("tools/list", undefined, 2)}]`, { shareDir: share }));
  assert.equal(batch.length, 2);
});

test("get_time uses the clock", () => {
  const { share } = shareDir();
  const r = JSON.parse(handleMcp(rpc("tools/call", { name: "get_time" }), { shareDir: share, now: () => new Date("2026-10-26T12:00:00Z") }));
  assert.match(textOf(r), /^2026-10-26T12:00:00\.000Z/);
});

test("list and read stay inside the share folder", () => {
  const { share } = shareDir();
  assert.match(textOf(call(share, "list_shared_files", {})), /note\.txt \(\d+ bytes\)[\s\S]*sub\//);
  assert.match(textOf(call(share, "list_shared_files", { path: "sub" })), /a\.md/);
  assert.equal(textOf(call(share, "read_shared_file", { path: "note.txt" })), "안녕 hello");
  assert.equal(textOf(call(share, "read_shared_file", { path: "sub/a.md" })), "# a");
});

test("path escapes are refused (.., absolute, drive letters, NUL, symlinks)", () => {
  const { base, share } = shareDir();
  fs.symlinkSync(path.join(base, "secret.txt"), path.join(share, "link.txt"));
  fs.symlinkSync(base, path.join(share, "linkdir"));
  for (const p of ["../secret.txt", "sub/../../secret.txt", path.join(base, "secret.txt"), "C:\\Windows\\win.ini", "note.txt\0.png", "link.txt", "linkdir/secret.txt", "/etc/passwd"]) {
    const r = call(share, "read_shared_file", { path: p });
    assert.equal(r.result.isError, true, p);
    assert.doesNotMatch(textOf(r), /SECRET/, p);
    assert.doesNotMatch(textOf(r), new RegExp(base.replace(/[\\/]/g, ".")), "no absolute paths in errors");
  }
  assert.equal(call(share, "list_shared_files", { path: ".." }).result.isError, true);
  assert.throws(() => safeInside(share, "../x"));
});

test("read is capped at 64 KB and binary files are refused", () => {
  const { share } = shareDir();
  fs.writeFileSync(path.join(share, "big.txt"), "x".repeat(MAX_READ + 1000));
  fs.writeFileSync(path.join(share, "pic.bin"), Buffer.from([1, 2, 0, 3]));
  const big = textOf(call(share, "read_shared_file", { path: "big.txt" }));
  assert.ok(big.length < MAX_READ + 100);
  assert.match(big, /cut at 65536 bytes/);
  assert.equal(call(share, "read_shared_file", { path: "pic.bin" }).result.isError, true);
});

test("answerFrame: only the current token works; off and rotate cut access at once", () => {
  const { share } = shareDir();
  let state = { enabled: true, token };
  const f = { t: "mcp", id: "i1", th: museHash(room, token), body: rpc("tools/list") };
  const opts = { load: () => state, shareDir: share };
  assert.equal(answerFrame(f, room, opts).status, 200);
  assert.equal(answerFrame({ ...f, th: museHash(room, "other" + token) }, room, opts).status, 404);
  assert.equal(answerFrame({ ...f, body: 5 }, room, opts).status, 400);
  state = { enabled: true, token: crypto.randomBytes(32).toString("base64url") }; // rotate
  assert.equal(answerFrame(f, room, opts).status, 404);
  state = { enabled: false };
  assert.equal(answerFrame({ ...f, th: museHash(room, state.token) }, room, opts).status, 404);
});

test("pasted sentence has the URL, asks for tools/list and says to keep it secret", () => {
  const url = museUrl({ url: "wss://haru-relay.example.workers.dev/", room }, token);
  assert.equal(url, `https://haru-relay.example.workers.dev/m/${room}/${token}`);
  const s = museSentence(url);
  assert.ok(s.includes(url) && s.includes("tools/list") && s.includes("공유"));
  assert.equal(s.split("\n").length, 1);
});

test("bridge: tells the relay the token hash, answers mcp frames, keeps bodies out of the log", async () => {
  const { share } = shareDir();
  const relay = new EventEmitter();
  relay.readyState = WebSocket.OPEN;
  relay.sent = [];
  relay.send = (raw) => relay.sent.push(JSON.parse(raw));
  relay.close = () => {};
  queueMicrotask(() => relay.emit("open"));
  const cfg = { url: "wss://relay.test", room, token: "t".repeat(43), key: crypto.randomBytes(32).toString("base64url"), enabled: true };
  let muse = { enabled: true, token };
  const logs = [];
  const museFile = path.join(os.tmpdir(), `muse-none-${process.pid}.json`);
  const stop = startRelayBridge({ gatewayUrl: "ws://127.0.0.1:1", loadConfig: () => cfg, connectRelay: () => relay, loadMuseConfig: () => muse, museFile, museOpts: { shareDir: share }, log: (m) => logs.push(m) });

  await until(() => relay.sent.some((f) => f.t === "muse_set"));
  assert.equal(relay.sent.find((f) => f.t === "muse_set").h, museHash(room, token));

  relay.emit("message", Buffer.from(JSON.stringify({ t: "mcp", id: "r1", th: museHash(room, token), body: rpc("tools/call", { name: "read_shared_file", arguments: { path: "note.txt" } }) })));
  const reply = relay.sent.find((f) => f.t === "mcp" && f.id === "r1");
  assert.equal(reply.status, 200);
  assert.match(JSON.parse(reply.body).result.content[0].text, /hello/);
  assert.ok(!logs.some((l) => l.includes("hello")));

  muse = { enabled: false };
  relay.emit("message", Buffer.from(JSON.stringify({ t: "mcp", id: "r2", th: museHash(room, token), body: rpc("tools/list") })));
  assert.equal(relay.sent.find((f) => f.id === "r2").status, 404);
  stop();
});

// ---- relay side: the real Room with a fake Durable Object state ----
function fakeRoom({ pcOnline = true } = {}) {
  const store = new Map();
  const pcWs = { readyState: 1, sent: [], send(raw) { this.sent.push(JSON.parse(raw)); } };
  const state = {
    storage: { get: async (k) => store.get(k), put: async (k, v) => store.set(k, v), delete: async (k) => store.delete(k) },
    getWebSockets: (tag) => (tag === "pc" && pcOnline ? [pcWs] : []),
    getTags: () => ["pc"],
  };
  return { r: new Room(state), store, pcWs };
}
const post = (token_, body, extra = {}) => new Request(`https://relay.test/m/${room}/${token_}`, { method: "POST", body, ...extra });

test("relay: unknown/off/wrong token -> 404; right token -> forwarded to the PC and answered", async () => {
  const { r, pcWs } = fakeRoom();
  assert.equal((await r.fetch(post(token, "{}"))).status, 404, "off by default");
  await r.webSocketMessage(pcWs, JSON.stringify({ t: "muse_set", h: museHash(room, token) }));
  assert.equal((await r.fetch(post("z".repeat(43), "{}"))).status, 404);

  const pending = r.fetch(post(token, rpc("tools/list")));
  await until(() => pcWs.sent.length === 1);
  const frame = pcWs.sent[0];
  assert.equal(frame.t, "mcp");
  assert.equal(frame.th, museHash(room, token));
  assert.equal(JSON.parse(frame.body).method, "tools/list");
  await r.webSocketMessage(pcWs, JSON.stringify({ t: "mcp", id: frame.id, status: 200, body: '{"jsonrpc":"2.0","id":1,"result":{}}' }));
  const res = await pending;
  assert.equal(res.status, 200);
  assert.equal((await res.json()).id, 1);

  // notification: PC has nothing to say -> 202
  const n = r.fetch(post(token, '{"jsonrpc":"2.0","method":"notifications/initialized"}'));
  await until(() => pcWs.sent.length === 2);
  await r.webSocketMessage(pcWs, JSON.stringify({ t: "mcp", id: pcWs.sent[1].id, status: 200, body: null }));
  assert.equal((await n).status, 202);
});

test("relay: revoke (muse_set null), PC offline, size limit, rate limit, GET refused", async () => {
  const { r, pcWs, store } = fakeRoom();
  await r.webSocketMessage(pcWs, JSON.stringify({ t: "muse_set", h: museHash(room, token) }));
  assert.equal((await r.fetch(post(token, "x".repeat(70 * 1024)))).status, 413);

  for (let i = 0; i < 60; i++) { r.fetch(post(token, "{}")); } // within the rate; they wait for the PC (4 in flight max)
  await wait(20);
  const limited = await r.fetch(post(token, "{}"));
  assert.equal(limited.status, 429);
  for (const f of pcWs.sent) await r.webSocketMessage(pcWs, JSON.stringify({ t: "mcp", id: f.id, status: 200, body: "{}" })); // release the waiting requests (their timers)

  const fresh = fakeRoom({ pcOnline: false });
  await fresh.r.webSocketMessage(fresh.pcWs, JSON.stringify({ t: "muse_set", h: museHash(room, token) }));
  assert.equal((await fresh.r.fetch(post(token, "{}"))).status, 503);

  await r.webSocketMessage(pcWs, JSON.stringify({ t: "muse_set", h: null }));
  assert.equal(store.has("museHash"), false);
  assert.equal((await r.fetch(post(token, "{}"))).status, 404);

  // a bad hash value is ignored, not stored
  await r.webSocketMessage(pcWs, JSON.stringify({ t: "muse_set", h: "nothex" }));
  assert.equal(store.has("museHash"), false);
});

test("relay: stores only a hash; worker routes /m/ to the room and refuses GET", async () => {
  const { r, pcWs, store } = fakeRoom();
  await r.webSocketMessage(pcWs, JSON.stringify({ t: "muse_set", h: museHash(room, token) }));
  assert.ok(![...store.values()].some((v) => String(v).includes(token)));
  const env = { ROOMS: { idFromName: (n) => n, get: () => r } };
  const get = await worker.fetch(new Request(`https://relay.test/m/${room}/${token}`), env);
  assert.equal(get.status, 405);
  assert.equal((await worker.fetch(new Request(`https://relay.test/m/${room}/short`, { method: "POST", body: "{}" }), env)).status, 404);
});
