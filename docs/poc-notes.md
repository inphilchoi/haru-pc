# Haru PC PoC notes (2026-09-25)

OpenClaw 2026.9.6 · gateway protocol v4 · macOS 27 (M1, 16 GB)

## Confirmed
- `client.id = "gateway-client"`, `mode = "ui"`, role `operator`, scopes `operator.read/write/approvals` is accepted.
- Setup code from `openclaw qr --json` → bootstrap token → `hello-ok` returns `auth.deviceToken`; loopback pairing is auto-approved.
- `chat.send` → streamed `chat`/`agent` events → final answer.
- **Local model (llama.cpp, Qwen3.5 4B Q4_K_M, ~14 tok/s on M1):** exec tool asks → `exec.approval.requested` reaches the phone → `exec.approval.resolve {decision: "allow-once"}` → command runs → answer. Full loop works.
- Shell pipelines are always refused ("approval cannot safely bind shell pipelines"). Skills must use single commands.
- **Claude via existing Claude Code login** (`--auth-choice anthropic-cli`, model `anthropic/claude-opus-5`): answers work, no password needed.

## Resolved (2026-09-25)
- **Claude login (claude-cli) approvals.** OpenClaw sends its native-tool approval (`claude-cli native tool: Write`)
  as the *phone's own* request (requester = the phone connection), so it is never delivered back to the phone:
  `plugin.approval.request` answers at once with `decision: null` ("no approval route") and the tool is denied
  ("approval was not granted"). Fix: the Haru PC plugin asks for **every** change itself — shell commands included
  (`하루 PC · 명령 실행`, the exact command on the card) — and the installer sets `tools.exec.mode full` only after
  the plugin is installed, so OpenClaw's second, undeliverable approval never happens. One card per change for every
  runtime; verified with Claude (write + `date`) and the local model (`date`). The plugin keeps the old exec
  safety rules: one plain command at a time (no pipes, `;`, `&&`, redirects, `$(…)`), no settings commands.
- **App closed mid-task.** OpenClaw only asks for approvals while the connection that started the task is alive.
  The relay bridge now keeps that connection for up to 15 minutes after the phone leaves and replays waiting
  approval cards and answers when it returns. Apps connect through the relay first, even on the same Wi-Fi.

## Still open
- Heartbeat runs have no approval surface — they cannot change anything (safe, by design for now).
