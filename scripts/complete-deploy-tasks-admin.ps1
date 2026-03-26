# Run elevated: npm install + verify gateway, optional supabase db push.
# Usage: Right-click PowerShell -> Run as administrator, then:
#   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force
#   & "<repo>\UnitedFamilyCaregivers\scripts\complete-deploy-tasks-admin.ps1"

#Requires -RunAsAdministrator

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
$gateway = Join-Path $root "ai-gateway"

$machinePath = [System.Environment]::GetEnvironmentVariable("Path", "Machine")
$userPath = [System.Environment]::GetEnvironmentVariable("Path", "User")
# Docker Desktop ships helpers here; without them, `docker compose build` can fail on image pull.
$dockerBin = "C:\Program Files\Docker\Docker\resources\bin"
if (Test-Path $dockerBin) {
    $env:Path = "$dockerBin;$machinePath;$userPath"
} else {
    $env:Path = "$machinePath;$userPath"
}

Write-Host "=== AI Gateway ===" -ForegroundColor Cyan
Set-Location $gateway
Write-Host "npm install..."
npm install
Write-Host "node --check server.js..."
node --check server.js
Write-Host "Gateway deps OK." -ForegroundColor Green

Write-Host ""
Write-Host "=== Supabase migrations ===" -ForegroundColor Cyan
Set-Location $root
if (Get-Command supabase -ErrorAction SilentlyContinue) {
    supabase db push 2>&1 | Out-Host
    if ($LASTEXITCODE -eq 0) {
        Write-Host "supabase db push finished." -ForegroundColor Green
    } else {
        Write-Host "supabase db push failed (often: not linked or no token). Run: supabase login" -ForegroundColor Yellow
        Write-Host "Then: supabase link --project-ref <ref from dashboard URL>" -ForegroundColor Yellow
        Write-Host "Or set SUPABASE_ACCESS_TOKEN, or apply SQL from supabase\migrations in Dashboard." -ForegroundColor Yellow
    }
} else {
    Write-Host "supabase CLI not on PATH. Install: https://supabase.com/docs/guides/cli" -ForegroundColor Yellow
    Write-Host "Or apply SQL in Dashboard from supabase\migrations\" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== Docker ai-gateway (optional) ===" -ForegroundColor Cyan
$compose = Join-Path $root "docker\docker-compose.yml"
if ((Get-Command docker -ErrorAction SilentlyContinue) -and (Test-Path $compose)) {
    Set-Location (Join-Path $root "docker")
    docker compose build ai-gateway
    docker compose up -d ai-gateway
    Write-Host "docker-ai-gateway recreated." -ForegroundColor Green
} elseif (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "docker not on PATH; skip compose." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== Next steps ===" -ForegroundColor Cyan
Write-Host "If not using Docker: restart ai-gateway (npm start in ai-gateway)." -ForegroundColor White
Write-Host "Supabase: run 'supabase login' once, then 'supabase link --project-ref <ref>', then 'supabase db push'." -ForegroundColor White
Write-Host "Or set SUPABASE_ACCESS_TOKEN and use: supabase link --project-ref <ref>" -ForegroundColor White
Write-Host "Done." -ForegroundColor Green
