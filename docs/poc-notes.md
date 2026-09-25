# Haru PC PoC notes (2026-09-25)

OpenClaw 2026.9.6 · gateway protocol v4 · macOS 27 (M1, 16 GB)

## Confirmed
- `client.id = "gateway-client"`, `mode = "ui"`, role `operator`, scopes `operator.read/write/approvals` is accepted.
- Setup code from `openclaw qr --json` → bootstrap token → `hello-ok` returns `auth.deviceToken`; loopback pairing is auto-approved.
- `chat.send` → streamed `chat`/`agent` events → final answer.
- **Local model (llama.cpp, Qwen3.5 4B Q4_K_M, ~14 tok/s on M1):** exec tool asks → `exec.approval.requested` reaches the phone → `exec.approval.resolve {decision: "allow-once"}` → command runs → answer. Full loop works.
- Shell pipelines are always refused ("approval cannot safely bind shell pipelines"). Skills must use single commands.
- **Claude via existing Claude Code login** (`--auth-choice anthropic-cli`, model `anthropic/claude-opus-5`): answers work, no password needed.

## Open issue
- With the `claude-cli` backend, Claude Code's native tools (Bash, ToolSearch…) are denied with
  "OpenClaw approval was not granted for native tool use" and **no `plugin.approval.request` reaches the gateway**
  (nothing in the gateway log). Expected per `src/agents/cli-runner/cli-native-tool-approval.ts`: a
  `plugin.approval.request` to operator clients. Needs investigation (gateway-tool auth from the CLI runner?)
  before the Claude subscription path can do real work. Until then: local model or API-key providers
  (embedded runtime) use OpenClaw's own tools, where approvals work.
