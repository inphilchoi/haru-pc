// node --test plugin/test
// A fake gateway (real WebSocket server on loopback) and a fake relay (in memory) around the real bridge.
import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { EventEmitter } from "node:events";
import WebSocket, { WebSocketServer } from "ws";
import { startRelayBridge, seal, open, keepForReturn } from "../relay-bridge.js";

const cfg = { url: "wss://relay.test", room: "a".repeat(32), token: "t".repeat(43), key: crypto.randomBytes(32).toString("base64url"), enabled: true };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(check, ms = 3000) {
  const end = Date.now() + ms;
  while (Date.now() < end) { if (check()) return; await wait(10); }
  assert.fail("timed out waiting");
}

/** Gateway that records its connections and lets the test push frames to them. */
async function fakeGateway() {
  const wss = new WebSocketServer({ port: 0, host: "127.0.0.1" });
  await new Promise((r) => wss.on("listening", r));
  const conns = [];
  wss.on("connection", (ws) => {
    const c = { ws, got: [], closed: false };
    ws.on("message", (d) => {
      const f = JSON.parse(d.toString());
      c.got.push(f);
      if (f.method === "connect") ws.send(JSON.stringify({ type: "res", id: f.id, ok: true, payload: { type: "hello-ok" } }));
      if (f.method === "chat.send") ws.send(JSON.stringify({ type: "res", id: f.id, ok: true, payload: { runId: f.params.idempotencyKey, status: "started" } }));
    });
    ws.on("close", () => { c.closed = true; });
    conns.push(c);
  });
  return { url: `ws://127.0.0.1:${wss.address().port}`, conns, close: () => wss.close() };
}

/** Relay stand-in: the test plays the phone side through it. */
function fakeRelay() {
  const relay = new EventEmitter();
  relay.readyState = WebSocket.OPEN;
  relay.toPhone = [];
  relay.send = (raw) => relay.toPhone.push(JSON.parse(raw));
  relay.close = () => {};
  queueMicrotask(() => relay.emit("open"));
  const phone = {
    open: (sid) => relay.emit("message", Buffer.from(JSON.stringify({ t: "open", sid }))),
    leave: (sid) => relay.emit("message", Buffer.from(JSON.stringify({ t: "close", sid }))),
    send: (sid, frame) => relay.emit("message", Buffer.from(JSON.stringify({ t: "msg", sid, d: seal(cfg.key, JSON.stringify(frame), cfg.room, sid, "p2c") }))),
    /** frames the phone received (decrypted) */
    received: (sid) => relay.toPhone.filter((f) => f.t === "msg" && f.sid === sid).map((f) => JSON.parse(open(cfg.key, f.d, cfg.room, sid, "c2p"))),
  };
  return { relay, phone };
}

function start(gw, relay, extra = {}) {
  return startRelayBridge({ gatewayUrl: gw.url, loadConfig: () => cfg, connectRelay: () => relay, ...extra });
}

const approvalEvent = (id) => ({ type: "event", event: "plugin.approval.requested", payload: { id, request: { title: "하루 PC · write" } } });
const chatDone = (runId) => ({ type: "event", event: "chat", payload: { runId, state: "final", message: { content: [{ type: "text", text: "완료" }] } } });

test("phone leaves mid-task: connection kept, approval card delivered when it comes back", async () => {
  const gw = await fakeGateway();
  const { relay, phone } = fakeRelay();
  const stop = start(gw, relay);
  const sid = "phoneSID01";

  phone.open(sid);
  phone.send(sid, { type: "req", id: "h1", method: "connect", params: {} });
  phone.send(sid, { type: "req", id: "h2", method: "chat.send", params: { sessionKey: "haru-x-1", message: "파일 써 줘", idempotencyKey: "run-1" } });
  await until(() => gw.conns[0]?.got.length === 2);
  await until(() => phone.received(sid).some((f) => f.id === "h2"));

  phone.leave(sid); // app closed
  await wait(50);
  assert.equal(gw.conns[0].closed, false, "task's connection must stay open");

  gw.conns[0].ws.send(JSON.stringify(approvalEvent("plugin:1"))); // asked while the phone is away
  await wait(50);
  const before = phone.received(sid).length;

  phone.open(sid); // app opened again — new connection, fresh sign-in
  phone.send(sid, { type: "req", id: "h1", method: "connect", params: {} });
  await until(() => phone.received(sid).some((f) => f.event === "plugin.approval.requested"));
  const after = phone.received(sid).slice(before);
  assert.equal(after[0].id, "h1", "sign-in answer comes first");
  assert.equal(after[1].payload.id, "plugin:1");

  // task finishes → the kept connection closes
  gw.conns[0].ws.send(JSON.stringify(chatDone("run-1")));
  await until(() => gw.conns[0].closed, 5000);
  stop(); gw.close();
});

test("phone leaves with nothing running: connection closed right away", async () => {
  const gw = await fakeGateway();
  const { relay, phone } = fakeRelay();
  const stop = start(gw, relay);
  const sid = "phoneSID02";
  phone.open(sid);
  phone.send(sid, { type: "req", id: "h1", method: "connect", params: {} });
  await until(() => gw.conns[0]?.got.length === 1);
  phone.leave(sid);
  await until(() => gw.conns[0].closed);
  stop(); gw.close();
});

test("a resolved approval is not replayed; kept connection gives up after the linger time", async () => {
  const gw = await fakeGateway();
  const { relay, phone } = fakeRelay();
  const stop = start(gw, relay, { lingerMs: 300 });
  const sid = "phoneSID03";
  phone.open(sid);
  phone.send(sid, { type: "req", id: "h1", method: "connect", params: {} });
  phone.send(sid, { type: "req", id: "h2", method: "chat.send", params: { idempotencyKey: "run-3" } });
  await until(() => phone.received(sid).some((f) => f.id === "h2"));
  phone.leave(sid);
  await wait(30);
  gw.conns[0].ws.send(JSON.stringify(approvalEvent("plugin:3")));
  gw.conns[0].ws.send(JSON.stringify({ type: "event", event: "plugin.approval.resolved", payload: { id: "plugin:3", decision: "deny" } }));
  await wait(50);
  phone.open(sid);
  phone.send(sid, { type: "req", id: "h1", method: "connect", params: {} });
  await until(() => phone.received(sid).filter((f) => f.id === "h1").length === 2);
  await wait(50);
  assert.equal(phone.received(sid).filter((f) => f.event === "plugin.approval.requested").length, 0);
  await until(() => gw.conns[0].closed, 2000); // linger ran out
  stop(); gw.close();
});

test("another phone's finished task does not end this phone's task", async () => {
  const gw = await fakeGateway();
  const { relay, phone } = fakeRelay();
  const stop = start(gw, relay);
  const sid = "phoneSID04";
  phone.open(sid);
  phone.send(sid, { type: "req", id: "h1", method: "connect", params: {} });
  phone.send(sid, { type: "req", id: "h2", method: "chat.send", params: { idempotencyKey: "run-mine" } });
  await until(() => phone.received(sid).some((f) => f.id === "h2"));
  phone.leave(sid);
  await wait(30);
  gw.conns[0].ws.send(JSON.stringify(chatDone("run-someone-else")));
  await wait(3300);
  assert.equal(gw.conns[0].closed, false);
  stop(); gw.close();
});

test("keepForReturn keeps only answers and approval cards", () => {
  assert.equal(keepForReturn(chatDone("r")), true);
  assert.equal(keepForReturn({ type: "event", event: "chat", payload: { state: "delta" } }), false);
  assert.equal(keepForReturn(approvalEvent("p")), true);
  assert.equal(keepForReturn({ type: "event", event: "tick" }), false);
  assert.equal(keepForReturn({ type: "res", id: "h1" }), false);
});
