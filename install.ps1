# Haru PC installer for Windows 10/11 (native, no WSL needed).
#   irm https://raw.githubusercontent.com/inphilchoi/haru-pc/main/install.ps1 | iex
#
# Same steps as install.sh: pinned OpenClaw, Haru PC plugin/skills/persona, safe settings,
# model choice, background start (scheduled task), security audit, pairing QR.
# Nothing is sent to CreativeLab. Sign-ins and keys are entered by you on the provider's own page.
# Runs inside the user's own session (irm | iex): remember their setting and put it back at the end.
# Restricted PCs refuse to run scripts (irm | iex then fails): allow them for this window only, nothing is changed permanently.
try { Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force } catch {}
$OldEap = $ErrorActionPreference
$ErrorActionPreference = 'Stop'

$OpenClawVersion = if ($env:HARU_PC_OPENCLAW_VERSION) { $env:HARU_PC_OPENCLAW_VERSION } else { '2026.9.6' }
$Ref     = if ($env:HARU_PC_REF) { $env:HARU_PC_REF } else { 'main' }
$Repo    = 'https://github.com/inphilchoi/haru-pc'
$HaruHome = if ($env:HARU_PC_HOME) { $env:HARU_PC_HOME } else { Join-Path $HOME '.haru-pc' }
$Profile_ = 'haru'
$BinDir  = Join-Path $HaruHome 'bin'

function Say($m)  { Write-Host "하루 PC " -ForegroundColor Magenta -NoNewline; Write-Host $m }
function Oc { & openclaw --profile $Profile_ @args; if ($LASTEXITCODE -ne 0) { throw "openclaw $args failed" } }
# Read-only openclaw calls that may legitimately fail (unset config key, not installed yet).
# Windows PowerShell 5.1 turns a native command's stderr into a terminating error when
# $ErrorActionPreference is 'Stop', even with 2>$null - so relax it just for these calls.
function OcRead { $eap = $ErrorActionPreference; $ErrorActionPreference = 'Continue'
  try { (& openclaw @args 2>$null) -join "`n" } catch { '' } finally { $ErrorActionPreference = $eap } }

# 1. OpenClaw (pinned) via the official installer
$have = (Get-Command openclaw -ErrorAction SilentlyContinue) -and ((OcRead --version) -match [regex]::Escape($OpenClawVersion))
if (-not $have) {
  Say "Installing OpenClaw $OpenClawVersion (and Node.js if needed)..."
  Say "If Node.js is older than 24.16, the installer upgrades it with winget - Windows may show an administrator (UAC) prompt. Choose Yes."
  $env:OPENCLAW_NO_PROMPT = '1'
  try {
    # The official installer has a param() block, so it must run as a script block with arguments
    # (Invoke-Expression runs param() as a plain statement and fails on NodeVersion validation).
    $official = [scriptblock]::Create((Invoke-RestMethod 'https://openclaw.ai/install.ps1'))
    & $official -Tag $OpenClawVersion -NoOnboard
  } catch {
    Write-Host ""
    Write-Warning "OpenClaw install failed: $($_.Exception.Message)"
    Write-Host "  1) Check your internet connection."
    Write-Host "  2) Check Node.js: run  node --version  (needs 24.16 or newer, or 26.1 or newer)."
    Write-Host "     If it is older, install the LTS from https://nodejs.org (or: winget install OpenJS.NodeJS.LTS), then open a NEW PowerShell window."
    Write-Host "  3) Run the Haru PC installer again."
    Write-Host "  More: $Repo#troubleshooting"
  }
  $env:Path = [Environment]::GetEnvironmentVariable('Path', 'User') + ';' + [Environment]::GetEnvironmentVariable('Path', 'Machine')
}
if (-not (Get-Command openclaw -ErrorAction SilentlyContinue)) { $ErrorActionPreference = $OldEap; throw "OpenClaw did not install. Fix the problem above (usually Node.js 24.16+), then run the installer again. See $Repo#troubleshooting" }

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
if ((OcRead --profile $Profile_ plugins list) -match 'haru-pc') { Oc config set tools.exec.mode full | Out-Null }
else { Oc config set tools.exec.mode ask | Out-Null; Write-Warning "Haru PC safety plugin is not active - commands use OpenClaw's own approval. Run the installer again to fix." }

# 3b. How the phone reaches this computer: Haru relay (default) or direct/self-hosted
#   $env:HARU_PC_CONNECTION = 'relay' | 'direct' to skip the question
$connection = $env:HARU_PC_CONNECTION
if (-not $connection) {
  Say 'How should the Haru app reach this computer?'
  Write-Host '  1) Haru relay (recommended) - works anywhere, end-to-end encrypted, nothing to set up'
  Write-Host '  2) Direct only (self-hosted) - no relay; same Wi-Fi, or your own Tailscale away from home'
  try { $pick = Read-Host 'Choose 1 or 2 [1]' } catch { $pick = '1' }
  $connection = if ($pick -eq '2') { 'direct' } else { 'relay' }
}
$env:HARU_PC_HOME = $HaruHome
$relayScript = Join-Path $app 'plugin\relay-config.mjs'
if ($connection -eq 'direct') { & node $relayScript off | Out-Null } else { & node $relayScript on | Out-Null }
Say ("Connection: " + (& node $relayScript status) + "  - change anytime: haru-pc relay on|off")

# 4. AI model
$model = (OcRead --profile $Profile_ config get agents.defaults.model.primary) -replace '[\s"{}]', ''
# No free cloud model any more (OpenCode Zen's free tier ended 10/2026): if nothing ends up chosen,
# leave it unset and say so - pairing still works, Haru just can't answer until a model is set.
if (-not $model) {
  try { & (Join-Path $BinDir 'haru-pc.ps1') model choose } catch {}
  $model = (OcRead --profile $Profile_ config get agents.defaults.model.primary) -replace '[\s"{}]', ''
  if (-not $model -or $model -match 'unset') {
    Write-Warning "No AI model is set yet, so Haru can't answer. Run: haru-pc model choose   (free option: a Gemini key from aistudio.google.com/apikey)"
  }
}

# 4b. Windows only: the gateway's TLS certificate is made with openssl.exe, and OpenClaw only looks in
#     trusted folders. Without it the gateway crashes in a loop ("openssl not found in trusted system directories").
$sslDirs = @((Join-Path $env:SystemRoot 'System32'), 'C:\Program Files\OpenSSL-Win64\bin', 'C:\Program Files\OpenSSL\bin')
if (-not ($sslDirs | Where-Object { Test-Path (Join-Path $_ 'openssl.exe') })) {
  Say 'Installing OpenSSL (needed for the encrypted connection). Windows will show an administrator (UAC) prompt - choose Yes.'
  $sslOk = $false
  try {
    $eap = $ErrorActionPreference; $ErrorActionPreference = 'Continue'
    & winget install --id ShiningLight.OpenSSL.Light -e --source winget --silent --accept-package-agreements --accept-source-agreements
    $ErrorActionPreference = $eap
    $sslOk = [bool]($sslDirs | Where-Object { Test-Path (Join-Path $_ 'openssl.exe') })
  } catch { $ErrorActionPreference = $eap }
  if (-not $sslOk) {
    Write-Warning "OpenSSL did not install. Install 'Win64 OpenSSL Light' by hand from https://slproweb.com/products/Win32OpenSSL.html (default folder), then run the installer again."
    Write-Host "  More: $Repo#troubleshooting"
  }
}

# 5. background start, audit, pairing
Say "Starting Haru PC in the background…"
try { Oc gateway install | Out-Null } catch { Oc onboard --non-interactive --accept-risk --install-daemon --skip-health --workspace (Join-Path $HaruHome 'workspace') | Out-Null }
# `gateway install` registers the scheduled task but may leave it stopped ("Ready"), and then
# `gateway restart` waits minutes for a gateway that never comes up - start the task directly.
$gwTask = Get-ScheduledTask -TaskName "OpenClaw Gateway ($Profile_)" -ErrorAction SilentlyContinue
if ($gwTask -and $gwTask.State -ne 'Running') { Start-ScheduledTask -TaskName $gwTask.TaskName }
else {
  # Already running (reinstall): restart so the new plugin loads, but never wait more than 90 s.
  $job = Start-Job { & openclaw --profile $using:Profile_ gateway restart 2>&1 | Out-Null }
  if (-not (Wait-Job $job -Timeout 90)) { Stop-Job $job; Write-Warning "Gateway restart is slow - it keeps starting in the background." }
  Remove-Job $job -Force
}
& openclaw --profile $Profile_ security audit
Say 'Done. Open the Haru app on your phone, say "내 PC 연결해 줘" (Connect my PC), and scan this code:'
& (Join-Path $BinDir 'haru-pc.ps1') pair
$ErrorActionPreference = $OldEap
