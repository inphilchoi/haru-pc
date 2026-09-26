# Run your own relay / 내 중계 직접 운영하기

Haru PC gives you two ways for the Haru app to reach your computer. You choose during install, and can switch anytime.

| | Haru relay (default) | Direct / self-hosted |
|---|---|---|
| Set up | nothing | same Wi-Fi: nothing · away from home: your own Tailscale **or** your own relay |
| Works away from home | yes | with Tailscale or your own relay |
| Who runs the server | CreativeLab (Cloudflare Workers) | you (or no server at all) |
| What the server sees | encrypted data only; stores a hash of your access token | — |
| App closed mid-task | approval cards wait up to 15 minutes | keep the app open until the task finishes |
| Switch | `haru-pc relay on` | `haru-pc relay off` |

## Option A — no relay at all
```bash
haru-pc relay off        # phone connects straight to this computer on the same Wi-Fi
haru-pc remote on        # optional: away from home through your own Tailscale (tailnet only)
haru-pc pair             # pair again — the new code has no relay in it
```

## Option B — your own relay (Cloudflare, free plan is enough)
The relay is the small Cloudflare Worker in [`relay/`](../relay). It only forwards end-to-end encrypted frames; the key exists only in the pairing QR code on your phone and your PC.

```bash
git clone https://github.com/inphilchoi/haru-pc && cd haru-pc/relay
npx wrangler login                       # your own Cloudflare account
npx wrangler deploy                      # prints https://haru-relay.<you>.workers.dev
haru-pc relay url wss://haru-relay.<you>.workers.dev
haru-pc pair                             # pair again — the code now points at your relay
```
Back to the Haru relay: `haru-pc relay url default`.

---

## 한국어 요약
- **하루 중계(기본):** 설정할 것 없음, 어디서든 연결, 종단간 암호화(중계는 내용을 못 보고 접속 토큰 해시만 저장). 앱을 닫아도 승인 카드가 15분까지 기다려요.
- **설치형(직접 연결):** 저희 중계를 쓰지 않아요. `haru-pc relay off` → 같은 Wi-Fi 에서 직접 연결. 밖에서는 내 Tailscale(`haru-pc remote on`) 또는 **내가 운영하는 중계**(위 B: 내 Cloudflare 계정에 `relay/` 를 배포한 뒤 `haru-pc relay url wss://…`). 직접 연결에서는 일이 끝날 때까지 앱을 열어 두세요.
- 바꾼 뒤에는 `haru-pc pair` 로 폰을 다시 연결해요.
