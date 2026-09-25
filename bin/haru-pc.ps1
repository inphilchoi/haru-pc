# haru-pc for Windows — same commands as bin/haru-pc (see `haru-pc help`).
# Sign-ins and keys are entered by YOU on the provider's page or prompt; this script never asks for passwords.
param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Args_)
$ErrorActionPreference = 'Stop'
$HaruHome = if ($env:HARU_PC_HOME) { $env:HARU_PC_HOME } else { Join-Path $HOME '.haru-pc' }
$Profile_ = if ($env:HARU_PC_PROFILE) { $env:HARU_PC_PROFILE } else { 'haru' }
$Ws = Join-Path $HaruHome 'workspace'
function Oc { & openclaw --profile $Profile_ @args }
function Say($m) { Write-Host "하루 PC " -ForegroundColor Magenta -NoNewline; Write-Host $m }

$cmd = if ($Args_.Count -gt 0) { $Args_[0] } else { 'help' }
$a1 = if ($Args_.Count -gt 1) { $Args_[1] } else { '' }
$a2 = if ($Args_.Count -gt 2) { $Args_[2] } else { '' }

switch ($cmd) {
  # One code for everything: setup code + the encrypted relay (works away from home too). Plain `openclaw qr` only works on the same Wi-Fi.
  'pair'    { $env:HARU_PC_HOME = $HaruHome; $env:HARU_PC_PROFILE = $Profile_; & node (Join-Path $HaruHome 'app\plugin\pair.mjs') @($Args_ | Select-Object -Skip 1) }
  'approve' { Oc devices approve --latest }
  'unpair'  { Oc devices list; $id = Read-Host 'Device id to remove'; Oc devices remove $id }
  'status'  { Oc gateway status; Oc devices list }
  'logs'    { Oc logs }
  'model' {
    switch ($a1) {
      ''       { Oc config get agents.defaults.model }
      'choose' {
        Write-Host "1) ChatGPT  2) Claude  3) GitHub Copilot  4) API key  5) Local model (free, 16 GB RAM+)"
        switch (Read-Host 'Choose 1-5') {
          '1' { & $PSCommandPath model login chatgpt }
          '2' { & $PSCommandPath model login claude }
          '3' { & $PSCommandPath model login copilot }
          '4' { $p = Read-Host 'Provider (openai, anthropic, gemini, mistral, deepseek…)'; & $PSCommandPath model key $p }
          '5' { & $PSCommandPath model local }
          default { Say 'Skipped. Run: haru-pc model choose' }
        }
      }
      'login' {
        switch ($a2) {
          'chatgpt' { Say "OpenAI's sign-in page will open. Enter your ID and password there, not here."; Oc models auth login --provider openai }
          'claude'  {
            if (-not (Get-Command claude -ErrorAction SilentlyContinue)) { Say "First sign in to Claude's official app: claude auth login"; exit 1 }
            & claude auth status | Out-Null; if ($LASTEXITCODE -ne 0) { Say "First sign in to Claude's official app: claude auth login"; exit 1 }
            Oc onboard --non-interactive --accept-risk --skip-health --no-install-daemon --auth-choice anthropic-cli --workspace $Ws
            Say "Claude connected. Your Claude plan's limits apply. Please check Anthropic's current terms for using your plan with other tools."
          }
          'copilot' { Oc models auth login-github-copilot }
          default   { Say 'Use: haru-pc model login chatgpt|claude|copilot'; exit 2 }
        }
      }
      'key'   { if (-not $a2) { Say 'Use: haru-pc model key <provider>'; exit 2 }; Say "Paste your $a2 API key when asked."; Oc onboard --auth-choice "$a2-api-key" --skip-health --no-install-daemon --workspace $Ws }
      'local' {
        Oc plugins install '@openclaw/llama-cpp-provider' --accept-capabilities | Out-Null
        Oc onboard --auth-choice llama-cpp --skip-health --no-install-daemon --workspace $Ws
        Oc config set plugins.entries.haru-pc.config.readOnly true | Out-Null
        Say 'Small local models are easier to trick, so read-only mode is on. Turn it off with: haru-pc readonly off'
      }
      default { Say 'Use: haru-pc model [choose|login|key|local]'; exit 2 }
    }
  }
  'allow' {
    if (-not (Test-Path $a1 -PathType Container)) { Say "Folder not found: $a1"; exit 2 }
    $f = (Resolve-Path $a1).Path
    $cur = @()
    try { $cur = (& openclaw --profile $Profile_ config get plugins.entries.haru-pc.config.allowedFolders 2>$null | ConvertFrom-Json) } catch {}
    if (-not $cur -or $cur.Count -eq 0) { $cur = @('Documents', 'Downloads', 'Desktop' | ForEach-Object { Join-Path $HOME $_ }) + $Ws }
    if ($cur -notcontains $f) { $cur += $f }
    Oc config set plugins.entries.haru-pc.config.allowedFolders ($cur | ConvertTo-Json -Compress) --json | Out-Null
    Say "Haru PC may now work in: $f"
  }
  'readonly' { $v = if ($a1 -eq 'on') { 'true' } elseif ($a1 -eq 'off') { 'false' } else { Say 'Use: haru-pc readonly on|off'; exit 2 }; Oc config set plugins.entries.haru-pc.config.readOnly $v --json | Out-Null; Say "Read-only: $a1" }
  'skills' {
    if ($a1 -in 'enable', 'disable') { Oc config set "skills.entries.$a2.enabled" ($(if ($a1 -eq 'enable') { 'true' } else { 'false' })) --json | Out-Null; Say "${a2}: ${a1}d" }
    else { Oc skills list }
  }
  'remote' {
    if ($a1 -eq 'on') {
      if (-not (Get-Command tailscale -ErrorAction SilentlyContinue)) { Say 'Install Tailscale first: https://tailscale.com/download'; exit 1 }
      Oc config set gateway.tailscale.mode serve | Out-Null; Oc gateway restart | Out-Null; Say 'Reachable inside your tailnet only. Pair again with: haru-pc pair --remote'
    } elseif ($a1 -eq 'off') { Oc config set gateway.tailscale.mode off | Out-Null; Oc gateway restart | Out-Null; Say 'Remote access off.' }
    else { Say 'Use: haru-pc remote on|off'; exit 2 }
  }
  'update'    { Invoke-Expression (Invoke-RestMethod 'https://raw.githubusercontent.com/inphilchoi/haru-pc/main/install.ps1') }
  'uninstall' { try { Oc gateway uninstall } catch {}; Remove-Item (Join-Path $HaruHome 'app') -Recurse -Force -ErrorAction SilentlyContinue; Say "Removed. Settings remain in $HaruHome and ~\.openclaw-$Profile_." }
  default {
    Write-Host @'
Haru PC — ask Haru on your phone, your computer does the work.
  haru-pc pair | approve | unpair | status | logs
  haru-pc model [choose | login chatgpt|claude|copilot | key <provider> | local]
  haru-pc allow <folder> | readonly on|off | skills [enable|disable <name>]
  haru-pc remote on|off | update | uninstall
'@
  }
}
