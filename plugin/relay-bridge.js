// Haru PC side of the relay: lets the Haru app reach this computer from anywhere
// (no Tailscale, no router settings). Haru PC keeps ONE outbound WebSocket to the relay;
// for each phone that shows up, it opens a local connection to this gateway and passes
// frames both ways. Frames are end-to-end encrypted with the key from the pairing QR,
// so the relay only ever carries ciphertext.
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import WebSocket from "ws";

export const RELAY_FILE = path.join(process.env.HARU_PC_HOME || path.join(os.homedir(), ".haru-pc"), "relay.json");
export const DEFAULT_RELAY_URL = "wss://haru-relay.creativelab-choi.workers.dev";

const b64u = (buf) => Buffer.from(buf).toString("base64url");
const unb64u = (s) => Buffer.from(s, "base64url");

/** Room id, access token and E2E key for this computer. Created once, kept private (0600). */
export function loadRelayConfig() {
  try {
    const cfg = JSON.parse(fs.readFileSync(RELAY_FILE, "utf8"));
    if (cfg.room && cfg.token && cfg.key) return { url: DEFAULT_RELAY_URL, ...cfg };
  } catch {}
  const cfg = {
    url: process.env.HARU_RELAY_URL || DEFAULT_RELAY_URL,
    room: crypto.randomBytes(16).toString("hex"),
    token: b64u(crypto.randomBytes(32)),
    key: b64u(crypto.randomBytes(32)),
    enabled: true,
  };
  fs.mkdirSync(path.dirname(RELAY_FILE), { recursive: true });
  fs.writeFileSync(RELAY_FILE, JSON.stringify(cfg, null, 2), { mode: 0o600 });
  return cfg;
}

// ChaCha20-Poly1305, 12-byte random nonce, AAD binds room + phone session + direction.
// Same format in the Haru app (Swift CryptoKit ChaChaPoly / Kotlin BouncyCastle).
export function seal(keyB64, text, room, sid, dir) {
  const nonce = crypto.randomBytes(12);
  const c = crypto.createCipheriv("chacha20-poly1305", unb64u(keyB64), nonce, { authTagLength: 16 });
  c.setAAD(Buffer.from(`haru1|${room}|${sid}|${dir}`));
  const ct = Buffer.concat([c.update(Buffer.from(text, "utf8")), c.final()]);
  return b64u(Buffer.concat([nonce, ct, c.getAuthTag()]));
}

export function open(keyB64, d, room, sid, dir) {
  const buf = unb64u(d);
  if (buf.length < 12 + 16) throw new Error("short frame");
  const nonce = buf.subarray(0, 12);
  const tag = buf.subarray(buf.length - 16);
  const ct = buf.subarray(12, buf.length - 16);
  const dc = crypto.createDecipheriv("chacha20-poly1305", unb64u(keyB64), nonce, { authTagLength: 16 });
  dc.setAAD(Buffer.from(`haru1|${room}|${sid}|${dir}`));
  dc.setAuthTag(tag);
  return Buffer.concat([dc.update(ct), dc.final()]).toString("utf8");
}

// How long the PC keeps a task's connection open after the phone goes away (app closed,
// phone locked, signal lost). OpenClaw only asks for approvals while the connection that
// started the task is alive, so without this, closing the app mid-task made every later
// approval fail. Longer than the 10-minute approval timeout.
export const LINGER_MS = 15 * 60_000;
const HELD_MAX = 50; // frames kept for a phone that is away (answers and approval cards only)

const DONE_STATES = new Set(["final", "error", "aborted"]);

function parse(text) { try { return JSON.parse(text); } catch { return null; } }

/** What the phone should still see when it comes back: finished answers and approval cards. */
export function keepForReturn(frame) {
  if (frame?.type !== "event") return false;
  if (frame.event === "chat") return DONE_STATES.has(frame.payload?.state);
  return /^(exec|plugin)\.approval\.(requested|resolved)$/.test(frame.event ?? "");
}

/**
 * One phone session's local gateway connection, with the bookkeeping needed to keep it
 * alive while a task is still running after the phone left.
 */
class LocalSession {
  constructor(ws) {
    this.ws = ws;
    this.queue = [];      // phone → gateway frames waiting for the socket to open
    this.runs = new Set(); // runIds of chat.send tasks not finished yet
    this.sends = new Set(); // chat.send request ids waiting for their response
    this.away = false;    // phone left; kept open only for the running task
    this.held = [];       // frames for the phone while it is away
    this.timer = null;
  }

  /** phone → gateway: count tasks started */
  fromPhone(text) {
    const f = parse(text);
    if (f?.type === "req" && f.method === "chat.send" && f.id) this.sends.add(f.id);
  }

  /** gateway → phone: count tasks finished. Returns the parsed frame. */
  fromGateway(text) {
    const f = parse(text);
    if (f?.type === "res" && this.sends.delete(f.id) && f.ok) this.runs.add(f.payload?.runId ?? `send:${f.id}`);
    else if (f?.type === "event" && f.event === "chat" && DONE_STATES.has(f.payload?.state)) {
      // chat events can be for other phones' tasks too — only ours count (unknown runId: oldest)
      if (!this.runs.delete(f.payload?.runId)) {
        const anon = [...this.runs].find((r) => r.startsWith("send:"));
        if (anon) this.runs.delete(anon);
      }
    }
    return f;
  }

  get busy() { return this.runs.size > 0 || this.sends.size > 0; }

  hold(text, frame) {
    if (!keepForReturn(frame)) return;
    // a resolved approval replaces its request card
    if (/\.resolved$/.test(frame.event)) {
      const id = frame.payload?.id;
      this.held = this.held.filter((h) => !(h.frame.event?.endsWith(".requested") && (h.frame.payload?.id ?? h.frame.payload?.approvalId) === id));
    }
    this.held.push({ text, frame });
    if (this.held.length > HELD_MAX) this.held.shift();
  }

  close() { clearTimeout(this.timer); try { this.ws.terminate(); } catch {} }
}

/**
 * Keep this computer reachable through the relay until `signal` aborts.
 * gatewayUrl: this gateway on loopback (ws:// or wss:// with its self-signed certificate).
 */
export function startRelayBridge({ gatewayUrl, signal, log = () => {}, lingerMs = LINGER_MS, loadConfig = loadRelayConfig, connectRelay }) {
  const cfg = loadConfig();
  if (cfg.enabled === false) { log("relay off"); return () => {}; }
  const sessions = new Map(); // sid → LocalSession the phone is using
  const lingering = new Map(); // sid → sessions kept open after the phone left, until their task ends
  let relay = null;
  let stopped = false;
  let backoff = 1000;

  const toRelay = (obj) => { if (relay?.readyState === WebSocket.OPEN) relay.send(JSON.stringify(obj)); };
  const toPhone = (sid, text) => toRelay({ t: "msg", sid, d: seal(cfg.key, text, cfg.room, sid, "c2p") });

  function dropLingering(sid, s) {
    s.close();
    const list = (lingering.get(sid) ?? []).filter((x) => x !== s);
    if (list.length) lingering.set(sid, list); else lingering.delete(sid);
  }

  /** The phone left (or was replaced). Keep the connection only while its task still runs. */
  function park(sid, s) {
    if (sessions.get(sid) === s) sessions.delete(sid);
    if (!s.busy || s.ws.readyState > WebSocket.OPEN) { s.close(); return; }
    s.away = true;
    lingering.set(sid, [...(lingering.get(sid) ?? []), s]);
    s.timer = setTimeout(() => dropLingering(sid, s), lingerMs);
    log(`phone away — keeping its running task (up to ${Math.round(lingerMs / 60_000)} min)`);
  }

  /** The phone is back and signed in again: give it what happened while it was away. */
  function replayHeld(sid) {
    for (const s of lingering.get(sid) ?? []) {
      for (const h of s.held.splice(0)) toPhone(sid, h.text);
    }
  }

  function openLocal(sid) {
    const prev = sessions.get(sid);
    if (prev) park(sid, prev);
    const ws = new WebSocket(gatewayUrl, { rejectUnauthorized: false, perMessageDeflate: false });
    const s = new LocalSession(ws);
    let connectId = null;
    ws.on("open", () => { for (const q of s.queue.splice(0)) ws.send(q); });
    ws.on("message", (data, isBinary) => {
      if (isBinary) return; // gateway protocol is JSON text
      const text = data.toString("utf8");
      const f = s.fromGateway(text);
      if (s.away) {
        // phone is gone: keep answers and approval cards for when it returns
        // (the gateway sends answers and approval cards to every connected phone, so when this
        // phone is already back on a new connection it gets them there — holding would repeat them)
        if (!sessions.has(sid)) s.hold(text, f);
        if (!s.busy) setTimeout(() => dropLingering(sid, s), 3_000); // task done — let the last frames out, then close
        return;
      }
      if (f?.type === "res" && connectId && f.id === connectId) {
        connectId = null;
        toPhone(sid, text);
        if (f.ok) replayHeld(sid);
        return;
      }
      toPhone(sid, text);
    });
    ws.on("close", () => {
      if (sessions.get(sid) === s) { sessions.delete(sid); toRelay({ t: "close", sid }); }
      else if (s.away) dropLingering(sid, s);
    });
    ws.on("error", (e) => log(`local socket error: ${e.message}`));
    s.watchConnect = (text) => { const f = parse(text); if (f?.type === "req" && f.method === "connect") connectId = f.id; };
    sessions.set(sid, s);
    return s;
  }

  function connect() {
    if (stopped) return;
    const url = `${cfg.url.replace(/\/$/, "")}/r/${cfg.room}?role=pc`;
    relay = connectRelay ? connectRelay(url, cfg) : new WebSocket(url, { headers: { "X-Haru-Relay-Token": cfg.token } });
    relay.on("open", () => { backoff = 1000; log("relay connected"); });
    relay.on("message", (raw) => {
      const f = parse(raw.toString("utf8"));
      if (!f) return;
      if (f.t === "open") openLocal(f.sid);
      else if (f.t === "close") { const s = sessions.get(f.sid); if (s) park(f.sid, s); }
      else if (f.t === "msg") {
        let text;
        try { text = open(cfg.key, f.d, cfg.room, f.sid, "p2c"); } catch { log("dropped a frame that failed decryption"); return; }
        const s = sessions.get(f.sid) ?? openLocal(f.sid);
        s.fromPhone(text);
        s.watchConnect(text);
        if (s.ws.readyState === WebSocket.OPEN) s.ws.send(text); else s.queue.push(text);
      }
    });
    relay.on("close", () => {
      // relay dropped: phones are gone for now, but running tasks keep going
      for (const [sid, s] of [...sessions]) park(sid, s);
      if (!stopped) { setTimeout(connect, backoff); backoff = Math.min(backoff * 2, 60_000); }
    });
    relay.on("error", (e) => log(`relay error: ${e.message}`));
  }

  const stop = () => {
    stopped = true;
    relay?.close();
    for (const s of sessions.values()) s.close();
    for (const list of lingering.values()) list.forEach((s) => s.close());
    sessions.clear();
    lingering.clear();
  };
  signal?.addEventListener("abort", stop, { once: true });
  connect();
  return stop;
}
