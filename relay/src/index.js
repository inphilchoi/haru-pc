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

const ROOM_RE = /^[a-f0-9]{32}$/;
const SID_RE = /^[A-Za-z0-9_-]{8,64}$/;
const MAX_FRAME = 900 * 1024;      // Cloudflare WebSocket messages are limited to 1 MiB
const MAX_PHONES = 4;              // phones per room at the same time

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
  }

  async fetch(request) {
    const url = new URL(request.url);
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
      if (pc && sid) this.sendTo(pc, { t: "close", sid });
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
