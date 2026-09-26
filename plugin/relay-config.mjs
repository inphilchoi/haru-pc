#!/usr/bin/env node
// `haru-pc relay …` — choose how the Haru app reaches this computer.
//
//   on            Haru relay (default): works anywhere, end-to-end encrypted, nothing to set up
//   off           Self-hosted / direct only: the phone connects straight to this computer
//                 (same Wi-Fi, or away from home through your own Tailscale: `haru-pc remote on`)
//   url <wss://…> Your own relay (deploy relay/ from this repo to your Cloudflare account)
//   url default   Back to the Haru relay
//   status        Show the current choice
//
// The choice lives in ~/.haru-pc/relay.json (mode 0600). Restart Haru PC and pair the phone
// again after changing it — the pairing code carries the relay details.
import fs from "node:fs";
import { DEFAULT_RELAY_URL, RELAY_FILE, loadRelayConfig } from "./relay-bridge.js";

const [cmd = "status", arg] = process.argv.slice(2);
const cfg = loadRelayConfig();

function save(next) {
  fs.writeFileSync(RELAY_FILE, JSON.stringify(next, null, 2), { mode: 0o600 });
}

function describe(c) {
  if (c.enabled === false) return "direct (self-hosted): the phone connects straight to this computer — same Wi-Fi, or your own Tailscale";
  return c.url === DEFAULT_RELAY_URL
    ? `Haru relay: ${c.url} (end-to-end encrypted, works anywhere)`
    : `your own relay: ${c.url} (end-to-end encrypted)`;
}

switch (cmd) {
  case "on":
    save({ ...cfg, enabled: true });
    console.log("Relay on — " + describe({ ...cfg, enabled: true }));
    break;
  case "off":
    save({ ...cfg, enabled: false });
    console.log("Relay off — " + describe({ ...cfg, enabled: false }));
    break;
  case "url": {
    const url = arg === "default" ? DEFAULT_RELAY_URL : arg;
    if (!url || !/^wss:\/\/[^/\s]+/.test(url)) {
      console.error("Use: haru-pc relay url wss://your-relay.example.workers.dev   (or: default)");
      process.exit(2);
    }
    save({ ...cfg, url: url.replace(/\/$/, ""), enabled: true });
    console.log("Relay set — " + describe({ ...cfg, url: url.replace(/\/$/, ""), enabled: true }));
    break;
  }
  case "status":
    console.log(describe(cfg));
    process.exit(0);
  default:
    console.error("Use: haru-pc relay on | off | url <wss://…|default> | status");
    process.exit(2);
}
console.log("Restart Haru PC and pair the phone again: haru-pc pair");
