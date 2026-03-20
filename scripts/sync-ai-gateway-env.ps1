# Sync Supabase vars from .env.local to ai-gateway/.env so AI Gateway uses UFC project
# Run from UnitedFamilyCaregivers directory.

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
$envLocal = Join-Path $root ".env.local"
$gatewayEnv = Join-Path $root "ai-gateway\.env"
$gatewayExample = Join-Path $root "ai-gateway\.env.example"

if (-not (Test-Path $envLocal)) {
    Write-Host ".env.local not found. Create it from .env.local.example" -ForegroundColor Yellow
    exit 1
}

$supabaseUrl = $null
$supabaseKey = $null
foreach ($line in (Get-Content $envLocal)) {
    if ($line -match '^NEXT_PUBLIC_SUPABASE_URL=(.+)$') { $supabaseUrl = $matches[1].Trim() }
    if ($line -match '^NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)$') { $supabaseKey = $matches[1].Trim() }
}

$lines = if (Test-Path $gatewayEnv) { Get-Content $gatewayEnv } else { Get-Content $gatewayExample }
$out = @()
$hasUrl = $false
$hasKey = $false
foreach ($line in $lines) {
    if ($line -match '^SUPABASE_URL=') {
        if ($supabaseUrl -and $supabaseUrl -notmatch 'your-project') {
            $out += "SUPABASE_URL=$supabaseUrl"
            $hasUrl = $true
        } else { $out += $line }
    } elseif ($line -match '^SUPABASE_ANON_KEY=') {
        if ($supabaseKey -and $supabaseKey -notmatch 'your-anon') {
            $out += "SUPABASE_ANON_KEY=$supabaseKey"
            $hasKey = $true
        } else { $out += $line }
    } else { $out += $line }
}
Set-Content $gatewayEnv $out
if ($hasUrl) { Write-Host "Synced SUPABASE_URL" -ForegroundColor Green }
if ($hasKey) { Write-Host "Synced SUPABASE_ANON_KEY" -ForegroundColor Green }
Write-Host "ai-gateway/.env updated. Restart AI Gateway if running." -ForegroundColor Cyan
