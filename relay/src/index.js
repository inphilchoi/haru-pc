// Haru relay (Cloudflare Worker + Durable Object).
//
// Lets the Haru app reach Haru PC from anywhere without Tailscale or opening router ports:
// Haru PC keeps one outbound WebSocket to its room here, the phone connects to the same room,
// and the relay passes frames between them.
//
// Privacy: every frame is end-to-end encrypted by the phone and the PC with a key that only
// exists in the pairing QR code. The relay sees room ids, sizes and timing — never content —
// and stores only a SHA-256 hash of each room's access token. No logs of frames.
//
// Wire format (JSON text frames):
//   relay → pc     {t:"open", sid} | {t:"close", sid} | {t:"msg", sid, d}
//   pc → relay     {t:"msg", sid, d} | {t:"close", sid}
//   relay → phone  {t:"msg", d} | {t:"pc", online:boolean}
//   phone → relay  {t:"msg", d}
// d = base64url(nonce ‖ ChaCha20-Poly1305 ciphertext), opaque to the relay.
//
// Muse (optional, opt-in): POST /m/<room>/<museToken> carries a JSON-RPC (MCP) request from an AI agent in
// someone else's cloud (Meta Muse) to the PC. That traffic is NOT end-to-end encrypted — the agent can't hold
// our key — so it uses its own frame type and its own token; the phone path is untouched.
//   relay → pc     {t:"mcp", id, th, body}          th = hash of the token that was presented
//   pc → relay     {t:"mcp", id, status, body}      body = JSON text or null (notification)
//   pc → relay     {t:"muse_set", h}                h = sha256 hex of "muse:<room>:<token>", or null = off
// Only that hash is stored; request/response bodies are never stored or logged.

const ROOM_RE = /^[a-f0-9]{32}$/;
const SID_RE = /^[A-Za-z0-9_-]{8,64}$/;
const MAX_FRAME = 900 * 1024;      // Cloudflare WebSocket messages are limited to 1 MiB
const MAX_PHONES = 4;              // phones per room at the same time
const MUSE_PATH_RE = /^\/m\/([a-f0-9]{32})\/([A-Za-z0-9_-]{32,64})$/;
const MUSE_MAX_BODY = 64 * 1024;   // request size from Muse
const MUSE_TIMEOUT_MS = 30_000;    // how long to wait for the PC's answer
const MUSE_MAX_PENDING = 4;        // requests in flight per room
const MUSE_RATE = 60;              // requests per minute per room
const HASH_RE = /^[a-f0-9]{64}$/;

async function sha256Hex(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/" || url.pathname === "/health") {
      return new Response("Haru relay: end-to-end encrypted, stores nothing.\n", { headers: { "content-type": "text/plain; charset=utf-8" } });
    }
    const mm = url.pathname.match(MUSE_PATH_RE);
    if (mm) {
      if (request.method !== "POST") return new Response("POST only", { status: 405, headers: { allow: "POST" } });
      return env.ROOMS.get(env.ROOMS.idFromName(mm[1])).fetch(request);
    }
    const m = url.pathname.match(/^\/r\/([a-f0-9]{32})$/);
    if (!m) return new Response("not found", { status: 404 });
    if (request.headers.get("Upgrade") !== "websocket") return new Response("expected websocket", { status: 426 });
    const id = env.ROOMS.idFromName(m[1]);
    return env.ROOMS.get(id).fetch(request);
  },
};

export class Room {
  constructor(state) {
    this.state = state;
    this.pending = new Map(); // MCP request id → resolve (in memory: a request in flight keeps this object alive)
    this.museWindow = { start: 0, n: 0 };
  }

  /** POST /m/<room>/<token>: pass one MCP JSON-RPC message to the PC and return its answer. */
  async muse(request) {
    const [, room, token] = new URL(request.url).pathname.match(MUSE_PATH_RE);
    const json = (status, obj) => new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json" } });
    const saved = await this.state.storage.get("museHash");
    const th = await sha256Hex(`muse:${room}:${token}`);
    // Same answer for "off", "wrong token" and "unknown room": nothing to learn from probing.
    if (!saved || saved !== th) return new Response("not found", { status: 404 });

    const now = Date.now();
    if (now - this.museWindow.start > 60_000) this.museWindow = { start: now, n: 0 };
    if (++this.museWindow.n > MUSE_RATE) return json(429, { jsonrpc: "2.0", id: null, error: { code: -32000, message: "rate limited" } });
    if (this.pending.size >= MUSE_MAX_PENDING) return json(429, { jsonrpc: "2.0", id: null, error: { code: -32000, message: "busy" } });

    const len = Number(request.headers.get("content-length") ?? 0);
    if (len > MUSE_MAX_BODY) return new Response("too large", { status: 413 });
    const body = await request.text();
    if (body.length > MUSE_MAX_BODY) return new Response("too large", { status: 413 });

    const pc = this.pc();
    if (!pc) return json(503, { jsonrpc: "2.0", id: null, error: { code: -32000, message: "Haru PC is offline" } });

    const id = crypto.randomUUID().replace(/-/g, "");
    let timer;
    const answer = new Promise((resolve) => {
      this.pending.set(id, resolve);
      timer = setTimeout(() => resolve(null), MUSE_TIMEOUT_MS);
    });
    this.sendTo(pc, { t: "mcp", id, th, body });
    const r = await answer;
    clearTimeout(timer);
    this.pending.delete(id);
    if (!r) return json(504, { jsonrpc: "2.0", id: null, error: { code: -32000, message: "Haru PC did not answer in time" } });
    if (r.body == null) return new Response(null, { status: 202 });
    return new Response(r.body, { status: r.status, headers: { "content-type": "application/json" } });
  }

  async fetch(request) {
    const url = new URL(request.url);
    if (MUSE_PATH_RE.test(url.pathname)) return this.muse(request);
    const room = url.pathname.split("/").pop();
    const role = url.searchParams.get("role");
    const sid = url.searchParams.get("sid") ?? "";
    const token = request.headers.get("X-Haru-Relay-Token") ?? url.searchParams.get("token") ?? "";
    if (!ROOM_RE.test(room) || (role !== "pc" && role !== "phone") || token.length < 32) {
      return new Response("bad request", { status: 400 });
    }
    if (role === "phone" && !SID_RE.test(sid)) return new Response("bad sid", { status: 400 });

    // Access token: the PC registers it the first time (trust on first use); afterwards both sides must match.
    const tokenHash = await sha256Hex(`${room}:${token}`);
    const saved = await this.state.storage.get("tokenHash");
    if (!saved) {
      if (role !== "pc") return new Response("room not ready — start Haru PC first", { status: 404 });
      await this.state.storage.put("tokenHash", tokenHash);
    } else if (saved !== tokenHash) {
      return new Response("forbidden", { status: 403 });
    }

    if (role === "phone" && this.state.getWebSockets("phone").length >= MAX_PHONES) {
      return new Response("too many phones", { status: 429 });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    if (role === "pc") {
      // One PC per room: a new connection replaces the old one.
      for (const old of this.state.getWebSockets("pc")) try { old.close(4000, "replaced"); } catch {}
      this.state.acceptWebSocket(server, ["pc"]);
      this.broadcastPhones({ t: "pc", online: true });
      // Re-announce phones that are already waiting.
      for (const ws of this.state.getWebSockets("phone")) {
        const s = this.tagSid(ws);
        if (s) this.sendTo(server, { t: "open", sid: s });
      }
    } else {
      for (const old of this.state.getWebSockets(`sid:${sid}`)) try { old.close(4000, "replaced"); } catch {}
      this.state.acceptWebSocket(server, ["phone", `sid:${sid}`]);
      const pc = this.pc();
      this.sendTo(server, { t: "pc", online: Boolean(pc) });
      if (pc) this.sendTo(pc, { t: "open", sid });
    }
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws, message) {
    if (typeof message !== "string" || message.length > MAX_FRAME) return;
    let f;
    try { f = JSON.parse(message); } catch { return; }
    const tags = this.state.getTags(ws);
    if (tags.includes("pc")) {
      if (f.t === "muse_set") {
        if (f.h === null) await this.state.storage.delete("museHash");
        else if (typeof f.h === "string" && HASH_RE.test(f.h)) await this.state.storage.put("museHash", f.h);
        return;
      }
      if (f.t === "mcp") {
        const resolve = this.pending.get(f.id);
        if (resolve && (f.body == null || (typeof f.body === "string" && f.body.length <= MAX_FRAME))) {
          resolve({ status: Number.isInteger(f.status) && f.status >= 200 && f.status < 600 ? f.status : 200, body: f.body ?? null });
        }
        return;
      }
      if (!SID_RE.test(f.sid ?? "")) return;
      const phones = this.state.getWebSockets(`sid:${f.sid}`);
      if (f.t === "msg" && typeof f.d === "string") phones.forEach((p) => this.sendTo(p, { t: "msg", d: f.d }));
      if (f.t === "close") phones.forEach((p) => { try { p.close(4001, "closed by pc"); } catch {} });
    } else if (f.t === "msg" && typeof f.d === "string") {
      const pc = this.pc();
      const sid = this.tagSid(ws);
      if (pc && sid) this.sendTo(pc, { t: "msg", sid, d: f.d });
      else this.sendTo(ws, { t: "pc", online: false });
    }
  }

  async webSocketClose(ws) {
    this.gone(ws);
  }

  async webSocketError(ws) {
    this.gone(ws);
  }

  gone(ws) {
    const tags = this.state.getTags(ws);
    if (tags.includes("pc")) {
      if (!this.state.getWebSockets("pc").some((o) => o !== ws)) this.broadcastPhones({ t: "pc", online: false });
    } else {
      const pc = this.pc();
      const sid = this.tagSid(ws);
      // A phone that reconnected replaces its old socket; that old socket closing late must not
      // close the new session on the PC.
      const replaced = sid && this.state.getWebSockets(`sid:${sid}`).some((o) => o !== ws && o.readyState === 1);
      if (pc && sid && !replaced) this.sendTo(pc, { t: "close", sid });
    }
  }

  pc() {
    return this.state.getWebSockets("pc").find((w) => w.readyState === 1);
  }

  tagSid(ws) {
    const t = this.state.getTags(ws).find((x) => x.startsWith("sid:"));
    return t ? t.slice(4) : null;
  }

  broadcastPhones(obj) {
    for (const p of this.state.getWebSockets("phone")) this.sendTo(p, obj);
  }

  sendTo(ws, obj) {
    try { ws.send(JSON.stringify(obj)); } catch {}
  }
}
