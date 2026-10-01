# Coding jobs with opencode

Haru PC can hand a coding job to [opencode](https://opencode.ai), an open-source coding agent, when it is installed on the same computer. Ask from your phone, for example:

> On my PC, fix the login bug in ~/Documents/my-app

## How it works

1. Haru PC shows an approval card on your phone: **the folder**, **the task**, and the limits below.
2. After you approve, Haru PC runs `opencode run` in that folder.
3. When opencode is done, Haru PC sends you its answer and **the list of files that changed** (new or edited).

One approval covers one job. Haru PC's other rules still apply: the folder must be one you allowed (`haru-pc allow <folder>`), and nothing runs in read-only mode.

## What opencode may and may not do

For a job started by Haru PC, opencode runs with these settings. They are passed inline, so a project's own `opencode.json` cannot loosen them.

| | |
|---|---|
| Read, search and edit files inside the folder | Allowed |
| Shell commands | Refused (asked, and `opencode run` turns every ask down) |
| Internet (web fetch, web search) | Blocked |
| Anything outside the folder | Blocked |
| `.git` folder, `.env` files | Can't be changed |
| Sharing the session as a link | Off |

Haru PC also tells opencode up front that commands aren't available, so it uses the file tools instead of stopping.

## Install

On the computer itself:

```bash
curl -fsSL https://opencode.ai/install | bash     # macOS / Linux
npm install -g opencode-ai                        # Windows (or any computer with Node.js)
```

Then choose a model in opencode (`opencode`, then `/connect`), or leave it to Haru PC's setting:

```bash
# optional: the model Haru PC asks opencode to use for coding jobs
openclaw --profile haru config set plugins.entries.haru-pc.config.opencodeModel "opencode/space-bunny-free"
```

## Free models

OpenCode Zen offers several free models for a limited time. Measured on 2026-10-01 with Haru PC's settings above (4 small tasks — a code fix checked by tests, arithmetic, extracting fields as JSON, a one-sentence Korean summary — two runs each):

| Model | Score | Typical time | Data policy (OpenCode docs) | Usable outside opencode |
|---|---|---|---|---|
| Space Bunny | 8/8 ¹ | ~6 s | Not stored, not used for training | **Yes** — also `haru-pc model free` |
| LongCat 2.5 Preview | 8/8 | ~10 s | Not stored, not used for training | No |
| MiMo-V2.6-Flash | 8/8 | ~8 s | May be used to improve the model | No |
| Nemotron 3 Ultra (NVIDIA) | 8/8 | ~15 s | Logged to improve NVIDIA products | No |
| Muse Spark 1.3 (Meta) | 8/8 | ~9 s | Used to train future Meta models | No |
| Nemotron 3.5 Lightning (NVIDIA) | 7/8 | ~48 s | Logged to improve NVIDIA products | No |
| Big Pickle | 6/8 | ~7 s | May be used to improve the model | No |

¹ Code task 0/2 at first — it stopped after a refused `ls`. Once Haru PC told opencode up front that commands aren't available, it passed 4 of 4 code runs; the other three tasks were 2/2 each.

A small test, not a benchmark — times depend on load. Free models come and go: check the current list and terms on [OpenCode Zen](https://opencode.ai/docs/zen/). "Usable outside opencode" means the model answered a direct API call; OpenCode answers the others with "free tier can only be used from within OpenCode", so for Haru PC's own chat (`haru-pc model free`) only Space Bunny works.
