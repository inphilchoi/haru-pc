# Haru PC installer for Windows 10/11 (native, no WSL needed).
#   irm https://raw.githubusercontent.com/inphilchoi/haru-pc/main/install.ps1 | iex
#
# Same steps as install.sh: pinned OpenClaw, Haru PC plugin/skills/persona, safe settings,
# model choice, background start (scheduled task), security audit, pairing QR.
# Nothing is sent to CreativeLab. Sign-ins and keys are entered by you on the provider's own page.
$ErrorActionPreference = 'Stop'

$OpenClawVersion = if ($env:HARU_PC_OPENCLAW_VERSION) { $env:HARU_PC_OPENCLAW_VERSION } else { '2026.9.6' }
$Ref     = if ($env:HARU_PC_REF) { $env:HARU_PC_REF } else { 'main' }
$Repo    = 'https://github.com/inphilchoi/haru-pc'
$HaruHome = if ($env:HARU_PC_HOME) { $env:HARU_PC_HOME } else { Join-Path $HOME '.haru-pc' }
$Profile_ = 'haru'
$BinDir  = Join-Path $HaruHome 'bin'

function Say($m)  { Write-Host "하루 PC " -ForegroundColor Magenta -NoNewline; Write-Host $m }
function Oc { & openclaw --profile $Profile_ @args; if ($LASTEXITCODE -ne 0) { throw "openclaw $args failed" } }

# 1. OpenClaw (pinned) via the official installer
$have = (Get-Command openclaw -ErrorAction SilentlyContinue) -and ((& openclaw --version 2>$null) -match [regex]::Escape($OpenClawVersion))
if (-not $have) {
  Say "Installing OpenClaw $OpenClawVersion (and Node.js if needed)…"
  $env:OPENCLAW_NO_PROMPT = '1'; $env:OPENCLAW_NO_ONBOARD = '1'; $env:OPENCLAW_VERSION = $OpenClawVersion
  Invoke-Expression (Invoke-RestMethod 'https://openclaw.ai/install.ps1')
  $env:Path = [Environment]::GetEnvironmentVariable('Path', 'User') + ';' + [Environment]::GetEnvironmentVariable('Path', 'Machine')
}
if (-not (Get-Command openclaw -ErrorAction SilentlyContinue)) { throw "OpenClaw didn't install. See $Repo#troubleshooting" }

# 2. Haru PC files
Say "Installing Haru PC to $HaruHome…"
New-Item -ItemType Directory -Force -Path $HaruHome, (Join-Path $HaruHome 'workspace'), $BinDir | Out-Null
$tmp = Join-Path ([IO.Path]::GetTempPath()) ("haru-pc-" + [guid]::NewGuid())
New-Item -ItemType Directory -Path $tmp | Out-Null
$zip = Join-Path $tmp 'haru-pc.zip'
Invoke-WebRequest "$Repo/archive/$Ref.zip" -OutFile $zip -UseBasicParsing
Expand-Archive $zip -DestinationPath $tmp
$src = Get-ChildItem $tmp -Directory | Select-Object -First 1
$app = Join-Path $HaruHome 'app'
if (Test-Path $app) { Remove-Item $app -Recurse -Force }
Copy-Item $src.FullName $app -Recurse
foreach ($f in 'SOUL.md', 'IDENTITY.md') {
  $dst = Join-Path $HaruHome "workspace\$f"
  if (-not (Test-Path $dst)) { Copy-Item (Join-Path $app "persona\$f") $dst }
}
Copy-Item (Join-Path $app 'bin\haru-pc.ps1') (Join-Path $BinDir 'haru-pc.ps1') -Force
Set-Content (Join-Path $BinDir 'haru-pc.cmd') "@powershell -NoProfile -ExecutionPolicy Bypass -File `"%~dp0haru-pc.ps1`" %*" -Encoding ASCII
$userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
if ($userPath -notlike "*$BinDir*") { [Environment]::SetEnvironmentVariable('Path', "$userPath;$BinDir", 'User'); $env:Path += ";$BinDir" }
Remove-Item $tmp -Recurse -Force

# 3. safe settings
Say "Applying safe settings…"
Oc config set gateway.mode local | Out-Null
Oc config set gateway.bind lan | Out-Null            # your Wi-Fi only; never the public internet
Oc config set gateway.tls.enabled true | Out-Null    # encrypted connection
Oc config set agents.defaults.workspace (Join-Path $HaruHome 'workspace') | Out-Null
try { Oc plugins enable bonjour | Out-Null } catch {}  # same-Wi-Fi discovery (Windows needs it on explicitly)
# The plugin's own libraries (ws for the relay, qrcode for the pairing code) - exact versions from package-lock.json
Push-Location (Join-Path $app 'plugin')
try { & npm install --omit=dev --omit=peer --legacy-peer-deps --no-save --no-audit --no-fund --loglevel=error | Out-Null; if ($LASTEXITCODE -ne 0) { throw "npm install failed" } }
catch { throw "Couldn't install Haru PC's libraries (npm). Check your internet connection and run the installer again." }
finally { Pop-Location }
Oc plugins install --force --accept-capabilities (Join-Path $app 'plugin') | Out-Null   # reviewed source, published in this repo
# Commands are approved by the Haru PC plugin (one card on the phone, works with Claude logins too).
# Only switch OpenClaw's own asking off once the plugin is really installed.
if ((& openclaw --profile $Profile_ plugins list 2>$null) -match 'haru-pc') { Oc config set tools.exec.mode full | Out-Null }
else { Oc config set tools.exec.mode ask | Out-Null; Write-Warning "Haru PC safety plugin is not active - commands use OpenClaw's own approval. Run the installer again to fix." }

# 4. AI model
$model = (& openclaw --profile $Profile_ config get agents.defaults.model.primary 2>$null) -replace '[\s"{}]', ''
if (-not $model) { & (Join-Path $BinDir 'haru-pc.ps1') model choose }

# 5. background start, audit, pairing
Say "Starting Haru PC in the background…"
try { Oc gateway install | Out-Null } catch { Oc onboard --non-interactive --accept-risk --install-daemon --skip-health --workspace (Join-Path $HaruHome 'workspace') | Out-Null }
try { Oc gateway restart | Out-Null } catch {}
& openclaw --profile $Profile_ security audit
Say 'Done. Open the Haru app on your phone, say "내 PC 연결해 줘" (Connect my PC), and scan this code:'
& (Join-Path $BinDir 'haru-pc.ps1') pair
