# Load SUPABASE_DATABASE_URL from .env.local and run supabase db push.
# Run from repo: .\UnitedFamilyCaregivers\scripts\db-push-from-env.ps1

$ErrorActionPreference = "Stop"
$ufc = Split-Path $PSScriptRoot -Parent
Set-Location $ufc
$envPath = Join-Path $ufc ".env.local"
if (-not (Test-Path $envPath)) {
  Write-Error ".env.local not found in $ufc. Add SUPABASE_DATABASE_URL=... or set `$env:SUPABASE_DATABASE_URL."
}
Get-Content $envPath | ForEach-Object {
  if ($_ -match '^\s*SUPABASE_DATABASE_URL\s*=\s*(.+)\s*$') {
    $env:SUPABASE_DATABASE_URL = $matches[1].Trim().Trim('"').Trim("'")
  }
}
if (-not $env:SUPABASE_DATABASE_URL) {
  Write-Error "SUPABASE_DATABASE_URL missing in .env.local"
}
$supa = Join-Path $env:LOCALAPPDATA "Supabase\supabase.exe"
if (-not (Test-Path $supa)) { $supa = "supabase" }
& $supa db push --db-url $env:SUPABASE_DATABASE_URL --yes
