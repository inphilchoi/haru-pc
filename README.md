# Haru PC

**English** · [한국어](README.ko.md) · [日本語](README.ja.md) · [简体中文](README.zh-Hans.md) · [繁體中文](README.zh-Hant.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Español](README.es.md) · [Português](README.pt-BR.md)

**Ask Haru on your phone. Your computer does the work.**

Haru PC is the desktop companion for **Haru – AI Assistant** (iPhone and Android). You give Haru a task on your phone, for example "tidy up my Reports folder on my PC" or "find last month's invoice and send it to me". Haru PC receives the task on your own computer, does it, and sends the result back to your phone.

Haru PC runs on [OpenClaw](https://github.com/openclaw/openclaw), the open-source personal AI assistant (MIT License). The installer sets up a tested version of OpenClaw and adds the Haru PC plugin on top: Haru's assistant persona, a phone-approval safety layer, and a set of ready-made skills. Haru PC is an unofficial distribution and isn't affiliated with the OpenClaw project.

> **Status:** early preview. Expect rough edges, and please report issues.

---

## How it works

```
 Haru app (phone)                          Haru PC (your computer)
 ─────────────────                         ───────────────────────
 "Tidy my Reports folder on my PC"
   → Card: "Send this to your PC?" [Run]
   ── direct connection, no cloud relay ──▶ receives the task
                                              plans the steps
   ◀── "About to move 12 files. OK?" ──────  asks before anything risky
   [Approve]  ─────────────────────────────▶ does the work
   ◀── "Done: 12 moved, 3 duplicates" ─────  sends the result
```

- **Your phone talks straight to your own computer** over an end-to-end encrypted connection. On the same Wi-Fi they connect directly; away from home they go through the Haru relay, which only passes along encrypted data it can't read and stores nothing but a hash of your connection token. No router settings or VPN needed.
- **Nothing runs without your OK.** Every action that changes files, runs commands, sends messages, or uses the browser is shown on your phone as a card first. It runs only after you tap **Approve**.
- **Your data stays yours.** Conversations, memory, and credentials are stored on your computer and your phone only.

---

## What Haru PC can do

| Ask on your phone | Haru PC does |
|---|---|
| "Tidy my Downloads folder" | Sorts files into folders by type and date, reports duplicates |
| "Find the contract PDF from last week and send it to me" | Searches your files and sends the file to your phone |
| "Turn this meeting note into a Word document" | Creates a `.docx` in your Documents folder |
| "Summarise the spreadsheet on my desktop" | Reads the file and replies with a short summary |
| "Check the price of this item on these three sites" | Opens a browser, compares, and replies. Browser skill is off until you turn it on, and it never pays |
| "Every Monday at 9, list this week's files I changed" | Sets up a routine that runs on your computer |

Skills can be added and switched on or off. See [Skills](#skills).

---

## Requirements

- **The Haru app** on your phone (iPhone and Android, coming soon to the App Store and Google Play)
- **A computer that stays on** while you want Haru PC to take tasks:
  - **macOS** 13 or later (Apple silicon or Intel)
  - **Windows** 10/11, 64-bit. Runs natively, so WSL isn't required
  - **Linux** with `systemd`: Ubuntu 22.04+, Debian 12+, Fedora, and similar. A Raspberry Pi 4/5 (64-bit, 2 GB+) works too, if you use a cloud model
  - **Node.js 24** or later. The installer installs it for you if it's missing
- **An AI model**, which you choose:
  - **Cloud model:** sign in with a ChatGPT or Grok plan or GitHub Copilot you already have, or use an API key (ChatGPT, Claude, Gemini, Grok, Meta and others). This gives the best quality.
  - **Local model** that runs on your computer (llama.cpp or [Ollama](https://ollama.com)). It's free and fully private but slower. With 16 GB of RAM, a model of about 9B parameters is the practical limit. For safety, small local models get read-only skills unless you change it.
  - **Free option:** a free Gemini API key from [aistudio.google.com/apikey](https://aistudio.google.com/apikey) (the default when you press Enter), or a local model with Ollama. The free cloud model (OpenCode Zen) ended in October 2026. See [Choose your AI model](#choose-your-ai-model).

### Recommended setup

A **Mac mini** (or any always-on computer) is the most comfortable home for Haru PC: it uses little power, runs without a screen, and with 16 GB of RAM or more it can also run a free local model. Pair it once with the Haru app on your phone and leave it on.

---

## Install

### macOS and Linux

```bash
curl -fsSL https://raw.githubusercontent.com/inphilchoi/haru-pc/main/install.sh | bash
```

### Windows (PowerShell)

```powershell
irm https://raw.githubusercontent.com/inphilchoi/haru-pc/main/install.ps1 | iex
```

The installer:
1. installs Node.js if needed, then a tested, pinned version of OpenClaw,
2. adds the Haru PC plugin and its default skills,
3. applies safe settings: command approval required, encrypted connections (TLS), and local-network discovery on,
4. registers Haru PC to start in the background (launchd on macOS, a scheduled task on Windows, a `systemd --user` service on Linux),
5. helps you choose an AI model, then shows a pairing QR code.

On Windows, if Node.js is older than 24.16, the installer upgrades it to the current LTS with winget, and Windows may show an administrator (UAC) confirmation window. Choose **Yes**.

Prefer to read the script first? Download [`install.sh`](install.sh) or [`install.ps1`](install.ps1), check them, then run them. More: [inphilchoi.github.io/haru](https://inphilchoi.github.io/haru/)

---

## Connect your phone

1. Open **Haru** on your phone and say **"Connect my PC"** (or tap ⚙ → **Haru PC**).
2. Scan the QR code shown by the installer. The code is valid for 10 minutes and works once. To show a new one, run:
   ```bash
   haru-pc pair
   ```
3. When the app shows **"Connected"**, you're done — at home or away.

**Using it away from home:** nothing to set up. The pairing code already includes the encrypted Haru relay, so the app reaches Haru PC from anywhere. Haru PC never opens a port to the public internet. (If you'd rather use your own [Tailscale](https://tailscale.com) network, `haru-pc remote on` still works.)

**Prefer not to use our relay?** Choose **Direct (self-hosted)** during install, or run `haru-pc relay off`. The phone then connects straight to your computer on the same Wi-Fi; away from home use your own Tailscale (`haru-pc remote on`) or run your own relay (`haru-pc relay url wss://…`). See [docs/self-host-relay.md](docs/self-host-relay.md).

---

## Connect Meta Muse (optional)

Let a chat AI such as Meta Muse read a **shared folder** on your computer.

```bash
haru-pc muse
```

Paste the **one sentence** it prints (it is also copied to your clipboard) into Muse's chat. It contains a secret address only you know — don't send it to anyone.

When Muse asks whether it may share information with the relay address, choose **Allow** (it may ask on each tool call).

- Muse can only **read** the file list and text files (up to 64 KB) in `~/HaruShare` (`%USERPROFILE%\HaruShare` on Windows), and ask the current time. There is no tool that changes your computer or looks at other folders.
- Unlike the phone connection, this link is **not** end-to-end encrypted (Muse can't hold our key), so only put files in the shared folder that you are fine showing to Muse.
- If the address leaks: `haru-pc muse rotate` (new address, the old one stops at once). Turn it off with `haru-pc muse off`; check with `haru-pc muse status`.
- Needs the Haru relay to be on (`haru-pc relay on`).

---

## Choose your AI model

Pick one when you install, and change it any time.

**Sign in with an AI subscription you already have.** Haru PC never asks for your password. You sign in on the provider's own page, and Haru PC only receives the permission it needs.

| Provider | How to connect |
|---|---|
| **ChatGPT** (OpenAI) | `haru-pc model login chatgpt`, then sign in on OpenAI's page. Your ChatGPT plan's limits apply |
| **Claude** (Anthropic) | API key: `haru-pc model key claude`. Anthropic's terms (Feb 2026) don't allow Claude Free/Pro/Max sign-ins in other tools, so Haru PC recommends a key |
| **Grok** (xAI) | `haru-pc model login grok`, then sign in on xAI's page (SuperGrok or X Premium). Or an API key: `haru-pc model key grok` |
| **GitHub Copilot** | `haru-pc model login copilot`, then enter the code shown on GitHub's page |

**Or use an API key** (Anthropic, OpenAI, Google Gemini, Mistral, DeepSeek, and others):

```bash
haru-pc model key openai      # paste your key when asked
haru-pc model key gemini
```

Google Gemini connects with an API key only. You can get a free key from Google AI Studio.

Meta (Llama, Muse) also connects with an API key only: `haru-pc model key meta`.

**Or run a local model** on your computer. It's free and private:

```bash
haru-pc model local           # recommends a model that fits your computer
```

**There is no free cloud model without a key any more.** OpenCode Zen's free "Space Bunny" ended in October 2026 (it now answers HTTP 403 `FreeTierError`), and `haru-pc model free` only points here. Two free ways remain:

- **Gemini with a free API key (the default — just press Enter in the installer).** Get a key at [aistudio.google.com/apikey](https://aistudio.google.com/apikey), then run `haru-pc model key gemini` and paste it. Your messages go to Google under Google's terms.
- **A local model with Ollama** — free and private, but it needs a good GPU or 16 GB+ of RAM. Install [Ollama](https://ollama.com), then run `haru-pc model local`. Haru PC downloads `qwen3:8b` if it is missing (use another with `HARU_PC_LOCAL_MODEL=<name>`) and turns read-only mode on. Without Ollama it falls back to llama.cpp.

Check the result with `haru-pc model`. If the installer finishes with no model set, it warns you and still shows the pairing code — run `haru-pc model choose` afterwards.

```bash
haru-pc model                 # show the current model
```

Sign-ins and keys are kept in your operating system's secure storage (Keychain, Windows Credential Manager, or libsecret on Linux). They're never sent to your phone or to us.

### In mainland China

OpenAI, Anthropic and Google don't offer their models in mainland China. Choose a provider available there instead — for example DeepSeek, Qwen (Alibaba), Kimi (Moonshot), Doubao (Volcano Engine), ERNIE (Baidu Qianfan), MiniMax or Zhipu GLM — with `haru-pc model key <provider>`, or use a local model with `haru-pc model local`, which works without internet access.

---

## Skills

Skills are small, readable instruction packs that teach Haru PC a job. They live in `~/.haru-pc/skills/` and follow the OpenClaw skill format.

```bash
haru-pc skills                # list installed skills
haru-pc skills enable office  # switch a skill on
haru-pc skills disable browser
```

Default skills:

| Skill | What it does |
|---|---|
| `files` | Find, move, rename, and tidy files. Reports duplicates |
| `send-to-phone` | Send a file or a summary back to your Haru app |
| `office` | Create and read Word, Excel, PowerPoint, and PDF documents |
| `browser` | Look things up and compare pages. **Off by default.** Never pays, never logs in without asking |
| `routines` | Run a task on a schedule ("every Monday at 9") |

**Coding jobs:** if [opencode](https://opencode.ai) (an open-source coding agent) is installed on the computer, Haru PC can hand it a coding job in one allowed folder — "fix the login bug in ~/Documents/my-app". You approve each job on the phone; opencode can only read and edit files inside that folder (no commands, no internet, no `.git` or `.env` files), and Haru PC tells you which files changed. Install opencode on the computer with `curl -fsSL https://opencode.ai/install | bash`. Details: [docs/opencode.md](docs/opencode.md).

Haru PC comes with its own reviewed skills and never installs skills from public marketplaces by itself. Installing anything new needs your approval on the phone.

You can also write your own skill. See [docs/skills.md](docs/skills.md).

---

## Safety

Haru PC can act on your computer, so it's designed to be careful:

- **Phone approval for every action** that changes something: writing or moving files, running commands, using the browser, sending files. You see exactly what will run, and you choose **Allow once** or **Deny**. There's no "always allow".
- **Messages are untrusted input.** Text inside files, web pages, or emails can't give Haru PC new instructions. They're treated as data, which protects against prompt injection.
- **Folder allowlist.** By default Haru PC works only in `Documents`, `Downloads`, and `Desktop`. Change this with `haru-pc allow <folder>`.
- **No payments, no transfers.** Haru PC never buys, pays, or moves money.
- **Pairing required.** Only phones you paired can send tasks. Unpair any time with `haru-pc unpair`.
- **Local network or your tailnet only.** Haru PC is never exposed to the public internet.
- **Pinned and audited.** The installer uses a tested OpenClaw version and runs OpenClaw's security audit at the end. `haru-pc update` moves to the next tested version.

If you find a security problem, please email **creativelab.choi@gmail.com** instead of opening a public issue.

---

## Update and uninstall

```bash
haru-pc update       # update Haru PC and its skills
haru-pc uninstall    # stop the background service and remove Haru PC
```

Your settings stay in `~/.haru-pc` until you delete that folder.

---

## Troubleshooting

| Problem | Try |
|---|---|
| The phone can't find the PC | Make sure the computer is on and connected to the internet, then run `haru-pc status`. If it still fails, show a new code with `haru-pc pair` and scan it again |
| Pairing QR expired | Run `haru-pc pair` again |
| Tasks are slow | A local model on a small machine is slow. Sign in to a subscription with `haru-pc model login chatgpt` or `haru-pc model login claude` |
| An approval card never appeared | You can close Haru after handing off a task: Haru PC keeps working for up to 15 minutes, and waiting approval cards appear when you open Haru again. If a request isn't answered within 10 minutes, Haru PC declines it and nothing runs. Open Haru and ask again |
| `Cannot add attribute … NodeVersion` / OpenClaw installation failed | Update to the latest Haru PC installer (run the Windows command above again). If it still stops, check `node --version`: it must be 24.16 or newer (or 26.1 or newer). Install the Node.js LTS from nodejs.org, open a new PowerShell window, and run the installer again |
| An administrator confirmation window appears on Windows | Expected when the installer upgrades Node.js, and again when it installs OpenSSL. Choose **Yes** |
| Windows: the gateway keeps restarting / `openssl not found in trusted system directories` | The encrypted connection needs OpenSSL. The installer installs it with `winget` (a UAC prompt appears: choose **Yes**). If that failed, install "Win64 OpenSSL Light" from [slproweb.com](https://slproweb.com/products/Win32OpenSSL.html) into its default folder and run the installer again |
| The model answers `403` / `FreeTierError: OpenCode's free tier can only be used from within OpenCode` | The old free cloud model has ended. Switch with `haru-pc model key gemini` (free key) or `haru-pc model local` (Ollama) |
| The QR is cut off or too big / can't scan | `haru-pc pair` now opens the QR in a small picture window (on the taskbar if hidden). No desktop? It prints in the console instead; `haru-pc pair --terminal` forces that. The picture file is deleted after 10 minutes |
| Windows: "running scripts is disabled" / execution policy | The installer now allows scripts for its own window only. If you still see it, run `Set-ExecutionPolicy -Scope Process Bypass -Force` in that PowerShell window, then the install command again |
| Windows: OpenSSL install fails (`0x8a15005e`, "found in multiple sources") | Run `winget install --id ShiningLight.OpenSSL.Light -e --source winget`, then the installer again |
| Gemini: a long setup wizard opens, or `429` / quota 0 | `haru-pc model key gemini` now only asks for the key (no wizard) and uses `google/gemini-3.8-flash`, which works with free keys. The `gemini-3.1-pro` models need a paid key. Change later with `openclaw --profile haru models set <model>` |
| I need a new pairing QR | Run `haru-pc pair`. Each code is valid for 10 minutes and works once |
| Is Haru PC running? | Run `openclaw --profile haru gateway status` (or `haru-pc status`). It should say the gateway is running and listening |
| Something went wrong | Run `haru-pc logs` and attach the output to an issue |

---

## Privacy

Haru PC has no account and no server of ours. Your tasks, files, memory, and keys stay on your devices. If you choose a cloud AI model, the text of your task goes to that provider under their terms. With a local model, nothing leaves your computer.

---

## Credits and license

Haru PC is made by **CreativeLab**. Contact: creativelab.choi@gmail.com

It runs on **OpenClaw** by the OpenClaw Foundation and contributors, used under the MIT License (the OpenClaw license and copyright notice are included in this repository). Haru PC is an independent, unofficial distribution and isn't affiliated with or endorsed by the OpenClaw Foundation. "OpenClaw" is used here only to describe what Haru PC runs on.

Haru PC is released under the [MIT License](LICENSE).
