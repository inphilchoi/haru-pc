#!/usr/bin/env node
// 폰 하루 흉내: 하루 PC(OpenClaw 게이트웨이)에 operator 로 붙어 일을 보내고, 승인 요청·결과를 받는다.
// 폰(Swift/Kotlin) 클라이언트로 옮기기 전에 프로토콜 v4 흐름을 확인하는 용도.
//
//   node tools/phone-sim.mjs --url ws://127.0.0.1:18789 --setup <설정 코드>   # 처음 (QR 속 코드)
//   node tools/phone-sim.mjs --url ws://127.0.0.1:18789 --say "바탕화면 파일 목록 알려 줘"
//   --approve  : 승인 요청이 오면 자동으로 allow-once (없으면 터미널에서 y/n)
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import readline from "node:readline/promises";

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, all) => {
  if (a.startsWith("--")) acc.push([a.slice(2), all[i + 1] && !all[i + 1].startsWith("--") ? all[i + 1] : true]);
  return acc;
}, []));
const STATE = path.join(os.homedir(), ".haru-pc-poc", "phone-sim.json");
const state = fs.existsSync(STATE) ? JSON.parse(fs.readFileSync(STATE, "utf8")) : {};
const save = () => { fs.mkdirSync(path.dirname(STATE), { recursive: true }); fs.writeFileSync(STATE, JSON.stringify(state, null, 2), { mode: 0o600 }); };

const b64url = (buf) => Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

// 기기 신분: Ed25519 키 한 쌍 (폰에선 Keychain/Keystore). deviceId = 공개키 원문의 SHA-256 hex
if (!state.privateKeyPem) {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
  state.privateKeyPem = privateKey.export({ type: "pkcs8", format: "pem" });
  state.publicKeyRaw = b64url(publicKey.export({ type: "spki", format: "der" }).subarray(-32));
  save();
}
const rawPub = Buffer.from(state.publicKeyRaw.replace(/-/g, "+").replace(/_/g, "/"), "base64");
const deviceId = crypto.createHash("sha256").update(rawPub).digest("hex");
const privateKey = crypto.createPrivateKey(state.privateKeyPem);

// 설정 코드 = base64url(JSON {url, bootstrapToken, expiresAtMs}), 또는 하루 코드 "haru1." + base64url({v, s:설정코드, r:중계})
if (typeof args.setup === "string") {
  let code = args.setup;
  if (code.startsWith("haru1.")) {
    const h = JSON.parse(Buffer.from(code.slice(6), "base64url").toString("utf8"));
    state.relay = h.r ?? null; code = h.s; delete state.relaySid;
  }
  const setup = JSON.parse(Buffer.from(code.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"));
  state.url = setup.url; state.bootstrapToken = setup.bootstrapToken; save();
  console.log("설정 코드 읽음:", setup.url, "만료", new Date(setup.expiresAtMs).toLocaleString());
}
const url = typeof args.url === "string" ? args.url : state.url;
if (!url && !args.relay) { console.error("--url 또는 --setup 이 필요해요"); process.exit(1); }

const client = { id: "gateway-client", displayName: "하루 (phone-sim)", version: "0.1.0", platform: "ios", deviceFamily: "iphone", mode: "ui", timeZone: "Asia/Seoul" };
const role = "operator";
const scopes = ["operator.read", "operator.write", "operator.approvals"];

// --relay: reach the PC through the encrypted Haru relay instead of the local address
// (what the Haru app does away from home). Relay details come from the "haru1." pairing code.
let ws;
if (args.relay) {
  const r = state.relay;
  if (!r) { console.error("relay 정보가 없어요 — haru1. 코드로 --setup 해 주세요"); process.exit(1); }
  const sid = state.relaySid ??= crypto.randomBytes(12).toString("base64url"); save();
  const key = Buffer.from(r.k, "base64url");
  const aad = (dir) => Buffer.from(`haru1|${r.room}|${sid}|${dir}`);
  const sealF = (text) => {
    const nonce = crypto.randomBytes(12);
    const c = crypto.createCipheriv("chacha20-poly1305", key, nonce, { authTagLength: 16 });
    c.setAAD(aad("p2c"));
    const ct = Buffer.concat([c.update(Buffer.from(text)), c.final()]);
    return Buffer.concat([nonce, ct, c.getAuthTag()]).toString("base64url");
  };
  const openF = (d) => {
    const b = Buffer.from(d, "base64url");
    const dc = crypto.createDecipheriv("chacha20-poly1305", key, b.subarray(0, 12), { authTagLength: 16 });
    dc.setAAD(aad("c2p")); dc.setAuthTag(b.subarray(b.length - 16));
    return Buffer.concat([dc.update(b.subarray(12, b.length - 16)), dc.final()]).toString("utf8");
  };
  const raw = new WebSocket(`${r.u.replace(/\/$/, "")}/r/${r.room}?role=phone&sid=${sid}&token=${encodeURIComponent(r.t)}`);
  // Present the relay like a normal gateway socket to the rest of this script.
  const listeners = { message: [], close: [], error: [] };
  ws = {
    send: (text) => raw.send(JSON.stringify({ t: "msg", d: sealF(text) })),
    addEventListener: (type, fn) => listeners[type]?.push(fn),
  };
  raw.addEventListener("message", (ev) => {
    const f = JSON.parse(ev.data);
    if (f.t === "pc") { console.log(f.online ? "(중계) PC 온라인" : "(중계) PC 오프라인"); return; }
    if (f.t === "msg") { try { const data = openF(f.d); listeners.message.forEach((fn) => fn({ data })); } catch { console.error("(중계) 복호화 실패한 조각 버림"); } }
  });
  raw.addEventListener("close", (e) => listeners.close.forEach((fn) => fn(e)));
  raw.addEventListener("error", (e) => listeners.error.forEach((fn) => fn(e)));
} else {
  ws = new WebSocket(url);
}
let seq = 0;
const pending = new Map();
const request = (method, params) => new Promise((resolve, reject) => {
  const id = `r${++seq}`;
  pending.set(id, { resolve, reject });
  ws.send(JSON.stringify({ type: "req", id, method, params }));
});

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

ws.addEventListener("message", async (ev) => {
  const f = JSON.parse(ev.data);
  if (f.type === "res") {
    const p = pending.get(f.id); pending.delete(f.id);
    if (!p) return;
    f.ok ? p.resolve(f.payload) : p.reject(Object.assign(new Error(f.error?.message || "error"), { detail: f.error }));
    return;
  }
  if (f.type !== "event") return;
  if (f.event === "connect.challenge") return onChallenge(f.payload);
  if (f.event === "tick") return;
  if (f.event === "plugin.approval.requested" || f.event === "exec.approval.requested") return onApproval(f.event, f.payload);
  if (f.event === "chat" || f.event === "agent") {
    const p = f.payload || {};
    const text = p.message?.content?.map?.((c) => c.text).filter(Boolean).join("") ?? p.text ?? p.delta;
    if (p.state === "final" || p.final) console.log(`\n[하루 PC 답] ${text ?? JSON.stringify(p).slice(0, 400)}`);
    else if (args.verbose) console.log(`[${f.event}]`, JSON.stringify(p).slice(0, 200));
    return;
  }
  if (args.verbose) console.log(`[event ${f.event}]`, JSON.stringify(f.payload).slice(0, 200));
});

async function onChallenge({ nonce, ts }) {
  const token = state.deviceToken ? null : state.bootstrapToken ?? null;
  const payload = ["v3", deviceId, client.id, client.mode, role, scopes.join(","), String(ts), state.deviceToken ?? token ?? "", nonce, client.platform, client.deviceFamily].join("|");
  const signature = b64url(crypto.sign(null, Buffer.from(payload, "utf8"), privateKey));
  const auth = state.deviceToken ? { deviceToken: state.deviceToken } : state.bootstrapToken ? { bootstrapToken: state.bootstrapToken } : typeof args.token === "string" ? { token: args.token } : undefined;
  try {
    const hello = await request("connect", {
      minProtocol: 4, maxProtocol: 4, client, role, scopes,
      caps: ["tool-events", "plugin-approvals", "exec-approvals"],
      device: { id: deviceId, publicKey: state.publicKeyRaw, signature, signedAt: ts, nonce },
      auth, locale: "ko-KR", userAgent: "haru-phone-sim/0.1.0",
    });
    console.log(`연결됨: 서버 ${hello.server?.version}, 권한 ${hello.auth?.role} [${(hello.auth?.scopes || []).join(", ")}]`);
    if (hello.auth?.deviceToken) { state.deviceToken = hello.auth.deviceToken; delete state.bootstrapToken; save(); console.log("기기 토큰 저장 (다음부터 이걸로 연결)"); }
    if (typeof args.say === "string") await sendTask(args.say);
  } catch (e) {
    if (e.detail?.retryable) {
      // 게이트웨이가 막 켜지는 중 — 잠깐 기다렸다가 다시 붙는다 (폰 앱도 같은 동작)
      const wait = e.detail.retryAfterMs ?? 1000;
      console.log(`게이트웨이 준비 중… ${wait}ms 뒤 다시 연결`);
      setTimeout(() => { process.argv.includes("--no-retry") || import("node:child_process").then(({ spawnSync }) => { spawnSync(process.execPath, process.argv.slice(1), { stdio: "inherit" }); process.exit(0); }); }, wait);
      return;
    }
    console.error("연결 실패:", e.message, JSON.stringify(e.detail || {}));
    if (/pair|pending|approv/i.test(e.message)) console.error("→ PC 에서 이 폰 연결을 승인해 주세요: openclaw devices list / devices approve <id>");
    process.exit(2);
  }
}

async function sendTask(text) {
  console.log(`\n[폰 → PC] ${text}`);
  const res = await request("chat.send", { sessionKey: "haru-phone", message: text, idempotencyKey: crypto.randomUUID() });
  if (args.verbose) console.log("chat.send 응답:", JSON.stringify(res).slice(0, 300));
}

async function onApproval(kind, p) {
  const id = p.id ?? p.approvalId;
  console.log(`\n[승인 카드] ${p.title ?? p.command ?? kind}\n  ${p.description ?? JSON.stringify(p).slice(0, 300)}`);
  let yes = args.approve === true;
  if (!yes) yes = (await rl.question("  한 번 허용할까요? (y/n) ")).trim().toLowerCase().startsWith("y");
  const method = kind.startsWith("plugin") ? "plugin.approval.resolve" : "exec.approval.resolve";
  await request(method, { id, decision: yes ? "allow-once" : "deny" }).catch((e) => console.error("승인 응답 실패:", e.message));
  console.log(`  → ${yes ? "허용" : "거부"}`);
}

ws.addEventListener("close", (e) => { console.log(`연결 끊김 (${e.code} ${e.reason || ""})`); process.exit(0); });
ws.addEventListener("error", (e) => { console.error("소켓 오류:", e.message || e.type); });
