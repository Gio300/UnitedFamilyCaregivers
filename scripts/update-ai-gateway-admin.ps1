# Update AI Gateway dependencies and verify server.js (run from Admin PowerShell when needed).
# Right-click PowerShell -> Run as administrator, then:
#   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force
#   & "<repo>\UnitedFamilyCaregivers\scripts\update-ai-gateway-admin.ps1"
#
# Admin is only required if normal shells hit permission errors; npm install usually works without elevation.

#Requires -RunAsAdministrator

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
$gateway = Join-Path $root "ai-gateway"

# Ensure Node/npm from standard installs are on PATH in elevated sessions
$machinePath = [System.Environment]::GetEnvironmentVariable("Path", "Machine")
$userPath = [System.Environment]::GetEnvironmentVariable("Path", "User")
$env:Path = "$machinePath;$userPath"

Write-Host "AI Gateway path: $gateway" -ForegroundColor Cyan
Set-Location $gateway

Write-Host "npm install..." -ForegroundColor Yellow
npm install

Write-Host "Syntax check server.js..." -ForegroundColor Yellow
node --check server.js
Write-Host "OK." -ForegroundColor Green

Write-Host ""
Write-Host "Restart the gateway process so Caddy/proxy hits the new code:" -ForegroundColor Cyan
Write-Host "  cd `"$gateway`""
Write-Host "  npm start"
Write-Host "(Or restart your PM2 / Windows Service / Docker container that runs server.js.)"
