# Sync .env.local to GitHub Secrets and trigger redeploy
# Requires: gh CLI + Git in PATH, gh auth login
$ErrorActionPreference = "Stop"
$env:Path = "C:\Program Files\Git\bin;" + $env:Path
$scriptDir = Split-Path $PSScriptRoot -Parent
$envLocal = Join-Path $scriptDir ".env.local"

if (-not (Test-Path $envLocal)) {
    Write-Error ".env.local not found at $envLocal"
}

function Get-EnvValue($path, $key) {
    $line = Get-Content $path | Where-Object { $_ -match "^$key=" } | Select-Object -First 1
    if ($line) {
        $v = ($line -split "=", 2)[1]
        if ($v) { return $v.Trim().Trim('"').Trim("'") }
    }
    return $null
}

$url = Get-EnvValue $envLocal "NEXT_PUBLIC_SUPABASE_URL"
$key = Get-EnvValue $envLocal "NEXT_PUBLIC_SUPABASE_ANON_KEY"

if (-not $url -or -not $key) {
    Write-Error "NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY missing in .env.local"
}

Push-Location $scriptDir
try {
    gh secret set NEXT_PUBLIC_SUPABASE_URL --body $url
    gh secret set NEXT_PUBLIC_SUPABASE_ANON_KEY --body $key
    $livekit = Get-EnvValue $envLocal "NEXT_PUBLIC_LIVEKIT_URL"
    if ($livekit) { gh secret set NEXT_PUBLIC_LIVEKIT_URL --body $livekit }
    $apiBase = Get-EnvValue $envLocal "NEXT_PUBLIC_API_BASE"
    if ($apiBase) { gh secret set NEXT_PUBLIC_API_BASE --body $apiBase }
    $livekitKey = Get-EnvValue $envLocal "LIVEKIT_API_KEY"
    if ($livekitKey) { gh secret set LIVEKIT_API_KEY --body $livekitKey }
    $livekitSecret = Get-EnvValue $envLocal "LIVEKIT_API_SECRET"
    if ($livekitSecret) { gh secret set LIVEKIT_API_SECRET --body $livekitSecret }
    Write-Host "Secrets synced. Triggering redeploy..."
    gh workflow run deploy.yml
} finally { Pop-Location }
