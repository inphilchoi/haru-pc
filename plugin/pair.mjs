#!/usr/bin/env node
// `haru-pc pair`: one QR code with everything the Haru app needs —
//   - the OpenClaw setup code (this computer's local address + a 10-minute, one-use bootstrap token)
//   - the relay room, access token and end-to-end key (to reach this computer from anywhere)
// Code format: "haru1." + base64url(JSON {v:1, s:<setupCode>, r:{u, room, t, k}})
import { execFileSync } from "node:child_process";
import QRCode from "qrcode";
import { loadRelayConfig } from "./relay-bridge.js";

const profile = process.env.HARU_PC_PROFILE || "haru";
const extra = process.argv.slice(2).filter((a) => a !== "--show-code");
const out = execFileSync("openclaw", ["--profile", profile, "qr", "--json", ...extra], { encoding: "utf8" });
const qr = JSON.parse(out.slice(out.indexOf("{")));
const relay = loadRelayConfig();
const payload = { v: 1, s: qr.setupCode };
if (relay.enabled !== false) payload.r = { u: relay.url, room: relay.room, t: relay.token, k: relay.key };
const code = "haru1." + Buffer.from(JSON.stringify(payload)).toString("base64url");

console.log(await QRCode.toString(code, { type: "terminal", small: true, errorCorrectionLevel: "M" }));
console.log("Scan this with the Haru app (\"내 PC 연결해 줘\"). Valid for 10 minutes, one use.");
console.log(`Local address: ${qr.gatewayUrl}${payload.r ? " · Away from home: through the encrypted Haru relay" : ""}`);
if (process.argv.includes("--show-code")) console.log(`\nCode:\n${code}`);
