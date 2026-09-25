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
export const DEFAULT_RELAY_URL = "wss://haru-relay.creativelab.workers.dev";

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

/**
 * Keep this computer reachable through the relay until `signal` aborts.
 * gatewayUrl: this gateway on loopback (ws:// or wss:// with its self-signed certificate).
 */
export function startRelayBridge({ gatewayUrl, signal, log = () => {} }) {
  const cfg = loadRelayConfig();
  if (cfg.enabled === false) { log("relay off"); return () => {}; }
  const sessions = new Map(); // sid → local gateway socket
  let relay = null;
  let stopped = false;
  let backoff = 1000;

  const toRelay = (obj) => { if (relay?.readyState === WebSocket.OPEN) relay.send(JSON.stringify(obj)); };

  function openLocal(sid) {
    sessions.get(sid)?.terminate();
    const local = new WebSocket(gatewayUrl, { rejectUnauthorized: false, perMessageDeflate: false });
    const queue = [];
    local.on("open", () => { for (const q of queue.splice(0)) local.send(q); });
    local.on("message", (data, isBinary) => {
      if (isBinary) return; // gateway protocol is JSON text
      toRelay({ t: "msg", sid, d: seal(cfg.key, data.toString("utf8"), cfg.room, sid, "c2p") });
    });
    local.on("close", () => { if (sessions.get(sid) === local) { sessions.delete(sid); toRelay({ t: "close", sid }); } });
    local.on("error", (e) => log(`local socket error: ${e.message}`));
    local.queued = queue;
    sessions.set(sid, local);
    return local;
  }

  function connect() {
    if (stopped) return;
    const url = `${cfg.url.replace(/\/$/, "")}/r/${cfg.room}?role=pc`;
    relay = new WebSocket(url, { headers: { "X-Haru-Relay-Token": cfg.token } });
    relay.on("open", () => { backoff = 1000; log("relay connected"); });
    relay.on("message", (raw) => {
      let f; try { f = JSON.parse(raw.toString("utf8")); } catch { return; }
      if (f.t === "open") openLocal(f.sid);
      else if (f.t === "close") { sessions.get(f.sid)?.close(); sessions.delete(f.sid); }
      else if (f.t === "msg") {
        let text;
        try { text = open(cfg.key, f.d, cfg.room, f.sid, "p2c"); } catch { log("dropped a frame that failed decryption"); return; }
        const local = sessions.get(f.sid) ?? openLocal(f.sid);
        if (local.readyState === WebSocket.OPEN) local.send(text); else local.queued.push(text);
      }
    });
    relay.on("close", () => {
      for (const s of sessions.values()) s.terminate();
      sessions.clear();
      if (!stopped) { setTimeout(connect, backoff); backoff = Math.min(backoff * 2, 60_000); }
    });
    relay.on("error", (e) => log(`relay error: ${e.message}`));
  }

  const stop = () => { stopped = true; relay?.close(); for (const s of sessions.values()) s.terminate(); sessions.clear(); };
  signal?.addEventListener("abort", stop, { once: true });
  connect();
  return stop;
}
