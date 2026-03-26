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
$env:Path = "$machinePath;$userPath"

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
    supabase db push
    Write-Host "supabase db push finished." -ForegroundColor Green
} else {
    Write-Host "supabase CLI not on PATH. Install: https://supabase.com/docs/guides/cli" -ForegroundColor Yellow
    Write-Host "Or apply SQL in Dashboard from supabase\migrations\" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== Next step ===" -ForegroundColor Cyan
Write-Host "Restart the process that runs ai-gateway (npm start in ai-gateway, or your service)." -ForegroundColor White
Write-Host "Done." -ForegroundColor Green
