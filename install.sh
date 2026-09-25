#!/usr/bin/env bash
# Haru PC installer for macOS and Linux.
#   curl -fsSL https://raw.githubusercontent.com/inphilchoi/haru-pc/main/install.sh | bash
#
# What it does (nothing is sent to CreativeLab):
#   1. installs Node.js if needed and a tested, pinned OpenClaw version (official OpenClaw installer)
#   2. copies Haru PC (plugin, skills, persona) to ~/.haru-pc and adds the `haru-pc` command
#   3. applies safe settings: shell commands need approval, encrypted connections (TLS),
#      reachable only on your local network, local-network discovery on
#   4. lets you choose an AI model (sign in, API key, or local model)
#   5. starts Haru PC in the background and shows a pairing QR code for the Haru app
set -euo pipefail

OPENCLAW_VERSION="${HARU_PC_OPENCLAW_VERSION:-2026.9.6}"   # tested version; `haru-pc update` moves to the next tested one
HARU_PC_REF="${HARU_PC_REF:-main}"
HARU_PC_REPO="https://github.com/inphilchoi/haru-pc"
HARU_HOME="${HARU_PC_HOME:-$HOME/.haru-pc}"
PROFILE="haru"          # keeps Haru PC separate from any other OpenClaw setup (~/.openclaw-haru)
BIN_DIR="$HOME/.local/bin"

say()  { printf '\033[1;35m하루 PC\033[0m %s\n' "$*"; }
fail() { printf '\033[1;31m오류\033[0m %s\n' "$*" >&2; exit 1; }

# ---- 0. platform ---------------------------------------------------------------------------
case "$(uname -s)" in
  Darwin) OS=mac ;;
  Linux)  OS=linux ;;
  *) fail "This script is for macOS and Linux. On Windows, use install.ps1." ;;
esac
command -v curl >/dev/null || fail "curl is required."
if [ "$OS" = linux ] && ! command -v systemctl >/dev/null; then
  say "systemd not found: Haru PC will install, but won't start automatically in the background."
fi

# ---- 1. OpenClaw (pinned) ------------------------------------------------------------------
if command -v openclaw >/dev/null && openclaw --version 2>/dev/null | grep -q "$OPENCLAW_VERSION"; then
  say "OpenClaw $OPENCLAW_VERSION already installed."
else
  say "Installing OpenClaw $OPENCLAW_VERSION (and Node.js if needed)…"
  curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh \
    | OPENCLAW_NO_PROMPT=1 bash -s -- --version "$OPENCLAW_VERSION" --no-onboard
fi
export PATH="$PATH:$HOME/.local/bin:$HOME/.npm-global/bin:/opt/homebrew/bin:/usr/local/bin"
command -v openclaw >/dev/null || fail "OpenClaw didn't install. See $HARU_PC_REPO#troubleshooting"
oc() { openclaw --profile "$PROFILE" "$@"; }

# ---- 2. Haru PC files ----------------------------------------------------------------------
say "Installing Haru PC to $HARU_HOME…"
mkdir -p "$HARU_HOME" "$HARU_HOME/workspace" "$BIN_DIR"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
curl -fsSL "$HARU_PC_REPO/archive/$HARU_PC_REF.tar.gz" | tar xz -C "$tmp" --strip-components 1
rm -rf "$HARU_HOME/app"
cp -R "$tmp" "$HARU_HOME/app"
# Persona files are only written the first time, so your edits are kept.
for f in SOUL.md IDENTITY.md; do
  [ -f "$HARU_HOME/workspace/$f" ] || cp "$HARU_HOME/app/persona/$f" "$HARU_HOME/workspace/$f"
done
install -m 0755 "$HARU_HOME/app/bin/haru-pc" "$BIN_DIR/haru-pc"

# ---- 3. safe settings ----------------------------------------------------------------------
say "Applying safe settings…"
oc config set gateway.mode local >/dev/null
oc config set gateway.bind lan >/dev/null              # your Wi-Fi only; never the public internet
oc config set gateway.tls.enabled true >/dev/null      # encrypted connection (self-signed, pinned by the app)
oc config set tools.exec.mode ask >/dev/null           # every shell command is approved on the phone
oc config set agents.defaults.workspace "$HARU_HOME/workspace" >/dev/null
oc plugins enable bonjour >/dev/null 2>&1 || true      # lets the Haru app find this computer on the same Wi-Fi
oc plugins install --force "$HARU_HOME/app/plugin" >/dev/null   # Haru PC safety plugin + skills (reviewed source)

# ---- 4. AI model -----------------------------------------------------------------------------
if [ -z "$(oc config get agents.defaults.model.primary 2>/dev/null | tr -d '"{} \n')" ]; then
  "$BIN_DIR/haru-pc" model choose </dev/tty || say "You can choose a model later with: haru-pc model"
fi

# ---- 5. background service, audit, pairing ---------------------------------------------------
say "Starting Haru PC in the background…"
oc gateway install >/dev/null 2>&1 || oc onboard --non-interactive --accept-risk --install-daemon --skip-health --workspace "$HARU_HOME/workspace" >/dev/null
oc gateway restart >/dev/null 2>&1 || true
oc security audit || say "The security audit reported something above. Please read it."

case ":$PATH:" in *":$BIN_DIR:"*) ;; *) say "Add $BIN_DIR to your PATH to use the haru-pc command." ;; esac
say "Done. Open the Haru app on your phone, say \"내 PC 연결해 줘\" (Connect my PC), and scan this code:"
"$BIN_DIR/haru-pc" pair
