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

- **Your phone talks straight to your own computer** over an encrypted connection. On the same Wi-Fi, they find each other automatically. Away from home, you can connect through your own [Tailscale](https://tailscale.com) network. Nothing passes through a server run by us.
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
  - **Cloud model:** sign in with a ChatGPT, Claude, or GitHub Copilot subscription you already have, or use an API key (for example Gemini). This gives the best quality.
  - **Local model** that runs on your computer (llama.cpp or [Ollama](https://ollama.com)). It's free and fully private but slower. With 16 GB of RAM, a model of about 9B parameters is the practical limit. For safety, small local models get read-only skills unless you change it.

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

Prefer to read the script first? Download [`install.sh`](install.sh) or [`install.ps1`](install.ps1), check them, then run them. Installer packages for each platform are also available on the [Releases](https://github.com/inphilchoi/haru-pc/releases) page.

---

## Connect your phone

1. Open **Haru** on your phone and say **"Connect my PC"** (or tap ⚙ → **Haru PC**).
2. Scan the QR code shown by the installer. The code is valid for 10 minutes and works once. To show a new one, run:
   ```bash
   haru-pc pair
   ```
3. Your computer asks **"Connect this phone?"** Confirm it, and check that the security code matches on both screens. Done.

**Using it away from home:** install [Tailscale](https://tailscale.com) on both the phone and the computer, sign in to the same tailnet, and run `haru-pc remote on`. This makes Haru PC reachable only inside your own tailnet (Tailscale Serve). Haru PC never opens a port to the public internet.

---

## Choose your AI model

Pick one when you install, and change it any time.

**Sign in with an AI subscription you already have.** Haru PC never asks for your password. You sign in on the provider's own page, and Haru PC only receives the permission it needs.

| Provider | How to connect |
|---|---|
| **ChatGPT** (OpenAI) | `haru-pc model login chatgpt`, then sign in on OpenAI's page. Your ChatGPT plan's limits apply |
| **Claude** (Anthropic) | Sign in once with Anthropic's official Claude CLI (`claude auth login`), then run `haru-pc model login claude`. Your Claude plan's limits apply. Please check Anthropic's current terms for using your plan with other tools |
| **GitHub Copilot** | `haru-pc model login copilot`, then enter the code shown on GitHub's page |

**Or use an API key** (Anthropic, OpenAI, Google Gemini, Mistral, DeepSeek, and others):

```bash
haru-pc model key openai      # paste your key when asked
haru-pc model key gemini
```

Google Gemini connects with an API key only. You can get a free key from Google AI Studio.

**Or run a local model** on your computer. It's free and private:

```bash
haru-pc model local           # recommends a model that fits your computer
```

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
| The phone can't find the PC | Check that both are on the same Wi-Fi, or both are signed in to Tailscale. Then run `haru-pc status` |
| Pairing QR expired | Run `haru-pc pair` again |
| Tasks are slow | A local model on a small machine is slow. Sign in to a subscription with `haru-pc model login chatgpt` or `haru-pc model login claude` |
| An approval card never appeared | Approvals reach your phone while the Haru app is open. If a request isn't answered within 10 minutes, Haru PC declines it and nothing runs. Open Haru and ask again |
| Something went wrong | Run `haru-pc logs` and attach the output to an issue |

---

## Privacy

Haru PC has no account and no server of ours. Your tasks, files, memory, and keys stay on your devices. If you choose a cloud AI model, the text of your task goes to that provider under their terms. With a local model, nothing leaves your computer.

---

## Credits and license

Haru PC is made by **CreativeLab**. Contact: creativelab.choi@gmail.com

It runs on **OpenClaw** by the OpenClaw Foundation and contributors, used under the MIT License (the OpenClaw license and copyright notice are included in this repository). Haru PC is an independent, unofficial distribution and isn't affiliated with or endorsed by the OpenClaw Foundation. "OpenClaw" is used here only to describe what Haru PC runs on.

Haru PC is released under the [MIT License](LICENSE).
