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
        Write-Host @'
Which AI should Haru PC use?
  1) ChatGPT (OpenAI)      - sign in with your plan, or an API key
  2) Claude (Anthropic)    - sign in with your plan, or an API key
  3) Gemini (Google)       - API key (free key at aistudio.google.com/apikey)
  4) Grok (xAI)            - sign in with SuperGrok / X Premium, or an API key
  5) Meta (Llama / Muse)   - API key
  6) Free cloud model      - OpenCode Zen "Space Bunny", no sign-up, limited time  (Enter)
  7) GitHub Copilot        - sign in
  8) Other API key         - Mistral, DeepSeek, OpenRouter...
  9) Local model           - free, private, slower (16 GB RAM or more recommended)
Sign-ins happen on each company's own page. Haru PC never asks for your password.
'@
        $n = ''; try { $n = Read-Host 'Choose 1-9 [6]' } catch {}
        if (-not $n) { $n = '6' }
        function How($prov) {
          $h = ''; try { $h = Read-Host '  1) Sign in with your account   2) API key   [1]' } catch {}
          if ($h -eq '2') { & $PSCommandPath model key $prov } else { & $PSCommandPath model login $prov }
        }
        switch ($n) {
          '1' { How 'chatgpt' }
          '2' { How 'claude' }
          '3' { & $PSCommandPath model key gemini }
          '4' { How 'grok' }
          '5' { & $PSCommandPath model key meta }
          '6' { & $PSCommandPath model free }
          '7' { & $PSCommandPath model login copilot }
          '8' { $p = Read-Host 'Provider (mistral, deepseek, openrouter...)'; & $PSCommandPath model key $p }
          '9' { & $PSCommandPath model local }
          default { Say 'Not a choice - starting with the free model. Change any time: haru-pc model choose'; & $PSCommandPath model free }
        }
      }
      'login' {
        # A sign-in keeps an existing main model, so clear it first (and put it back if the sign-in fails).
        $prev = ''; try { $prev = ((Oc config get agents.defaults.model.primary 2>$null) -join '') -replace '[\s"{}]', '' } catch {}
        if ($prev -match 'unset') { $prev = '' }
        function Clear-Main { try { Oc config unset agents.defaults.model.primary | Out-Null } catch {} }
        function Check-Main {
          $now = ''; try { $now = ((Oc config get agents.defaults.model.primary 2>$null) -join '') -replace '[\s"{}]', '' } catch {}
          if ($now -and $now -notmatch 'unset') { Say "Now using: $now" }
          else { if ($prev) { Oc config set agents.defaults.model.primary $prev | Out-Null }; Say "Sign-in didn't finish. Still using: $prev"; exit 1 }
        }
        switch ($a2) {
          { $_ -in 'chatgpt','openai' } { Say "OpenAI's sign-in page will open. Enter your ID and password there, not here."; Clear-Main; try { Oc models auth login --provider openai } catch {}; Check-Main }
          { $_ -in 'claude','anthropic' } {
            if (-not (Get-Command claude -ErrorAction SilentlyContinue)) { Say "First sign in to Claude's official app: claude auth login"; exit 1 }
            & claude auth status | Out-Null; if ($LASTEXITCODE -ne 0) { Say "First sign in to Claude's official app: claude auth login"; exit 1 }
            Oc onboard --non-interactive --accept-risk --skip-health --no-install-daemon --auth-choice anthropic-cli --workspace $Ws
            Say "Claude connected. Your Claude plan's limits apply. Please check Anthropic's current terms for using your plan with other tools."
            Check-Main
          }
          { $_ -in 'grok','xai' } { Say "xAI's sign-in page will open (SuperGrok or X Premium). Enter your details there, not here."; Clear-Main; try { Oc models auth login --provider xai --method oauth } catch {}; Check-Main }
          'copilot' { Clear-Main; try { Oc models auth login-github-copilot } catch {}; Check-Main }
          { $_ -in 'gemini','google' } { Say 'Google no longer offers account sign-in for tools like this (ended June 18, 2026). Get a free key at https://aistudio.google.com/apikey, then run: haru-pc model key gemini'; exit 2 }
          { $_ -in 'meta','llama' } { Say 'Meta offers API keys only. Run: haru-pc model key meta'; exit 2 }
          default   { Say 'Use: haru-pc model login chatgpt|claude|grok|copilot'; exit 2 }
        }
      }
      'key' {
        if (-not $a2) { Say 'Use: haru-pc model key <provider>'; exit 2 }
        $choice = switch ($a2) { { $_ -in 'chatgpt','openai' } { 'openai-api-key' } { $_ -in 'claude','anthropic' } { 'apiKey' } { $_ -in 'gemini','google' } { 'gemini-api-key' } { $_ -in 'grok','xai' } { 'xai-api-key' } { $_ -in 'meta','llama' } { 'meta-api-key' } default { "$a2-api-key" } }
        Say "Paste your $a2 API key when asked. It's stored in this computer's secure storage."
        $prev = ''; try { $prev = ((Oc config get agents.defaults.model.primary 2>$null) -join '') -replace '[\s"{}]', '' } catch {}
        if ($prev -match 'unset') { $prev = '' }
        try { Oc config unset agents.defaults.model.primary | Out-Null } catch {}
        try { Oc onboard --auth-choice $choice --skip-health --no-install-daemon --workspace $Ws } catch {}
        $now = ''; try { $now = ((Oc config get agents.defaults.model.primary 2>$null) -join '') -replace '[\s"{}]', '' } catch {}
        if ($now -and $now -notmatch 'unset') { Say "Now using: $now" } else { if ($prev) { Oc config set agents.defaults.model.primary $prev | Out-Null }; Say "Key setup didn't finish. Still using: $prev"; exit 1 }
      }
      'free' {
        # Same as bin/haru-pc: no account needed ("public" key); the current model becomes the backup.
        $free = 'opencode/space-bunny-free'
        $prev = ''
        try { $prev = ((Oc config get agents.defaults.model.primary 2>$null) -join '') -replace '[\s"{}]', '' } catch {}
        Oc onboard --non-interactive --accept-risk --skip-health --no-install-daemon --auth-choice opencode-zen --opencode-zen-api-key public --workspace $Ws | Out-Null
        Oc config set agents.defaults.model.primary $free | Out-Null
        if ($prev -and $prev -ne $free -and $prev -notmatch 'unset') {
          Oc config set agents.defaults.model.fallbacks ('["' + $prev + '"]') --json | Out-Null
          Say "Free model on. When the free period ends, Haru PC goes back to: $prev"
        } else { Say 'Free model on. It is free for a limited time - when it ends, choose another AI with: haru-pc model choose' }
        Say "Your messages to Haru PC go through OpenCode's servers (they say: not stored, not used for training)."
      }
      'check' {
        $primary = ((Oc config get agents.defaults.model.primary 2>$null) -join '') -replace '[\s"{}]', ''
        $fb = @(); try { $fb = @(((Oc config get agents.defaults.model.fallbacks 2>$null) -join '') | ConvertFrom-Json) } catch {}
        Say "Main model: $primary   Backups: $($fb -join ', ')"
        foreach ($m in @($primary) + $fb) {
          if (-not $m) { continue }
          $out = (Oc infer model run --local --model $m --prompt 'Reply with OK' 2>$null) -join ' '
          if ($out -match 'ok') { Say "  OK  $m answers" } else { Say "  X   $m does not answer" }
        }
      }
      'local' {
        Oc plugins install '@openclaw/llama-cpp-provider' --accept-capabilities | Out-Null
        Oc onboard --auth-choice llama-cpp --skip-health --no-install-daemon --workspace $Ws
        Oc config set plugins.entries.haru-pc.config.readOnly true | Out-Null
        Say 'Small local models are easier to trick, so read-only mode is on. Turn it off with: haru-pc readonly off'
      }
      default { Say 'Use: haru-pc model [choose|login|key|local|free|check]'; exit 2 }
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
  'relay' {
    # How the phone reaches this computer: Haru relay (default) or self-hosted/direct.
    $env:HARU_PC_HOME = $HaruHome
    $script = Join-Path $HaruHome 'app\plugin\relay-config.mjs'
    if (-not $a1 -or $a1 -eq 'status') { & node $script status }
    else { & node $script @($Args_ | Select-Object -Skip 1); if ($LASTEXITCODE -eq 0) { try { Oc gateway restart | Out-Null } catch {} } }
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
  haru-pc model [choose | login chatgpt|claude|grok|copilot | key <provider> | local | free | check]
  haru-pc allow <folder> | readonly on|off | skills [enable|disable <name>]
  haru-pc relay on|off|status|url <wss://…> | remote on|off | update | uninstall
'@
  }
}
