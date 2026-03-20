# Start AI stack: Ollama + pull models, AI Gateway, optional Caddy + Cloudflare tunnel
# Run from UnitedFamilyCaregivers or project root. Use admin/elevated if needed.

$ErrorActionPreference = "Stop"
$root = if (Test-Path "ai-gateway") { Get-Location } else { Split-Path (Split-Path $PSScriptRoot -Parent) -Parent }
$root = Resolve-Path $root
Set-Location $root

Write-Host "=== UFCi AI Stack ===" -ForegroundColor Cyan

# 1. Ollama - ensure running and pull models
$ollamaPath = "C:\Users\$env:USERNAME\AppData\Local\Programs\Ollama\ollama.exe"
if (-not (Test-Path $ollamaPath)) { $ollamaPath = "ollama" }
Write-Host "Pulling Ollama models (llama3.2:3b, llama3.3)..." -ForegroundColor Yellow
& $ollamaPath pull llama3.2:3b 2>$null
& $ollamaPath pull llama3.3 2>$null
Write-Host "Ollama models ready." -ForegroundColor Green

# 2. AI Gateway (port 7501)
Write-Host "Starting AI Gateway on port 7501..." -ForegroundColor Yellow
$gatewayDir = Join-Path $root "UnitedFamilyCaregivers\ai-gateway"
if (-not (Test-Path $gatewayDir)) { $gatewayDir = Join-Path $root "ai-gateway" }
if (Test-Path $gatewayDir) {
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$gatewayDir'; `$env:PORT='7501'; node server.js"
    Write-Host "AI Gateway started in new window." -ForegroundColor Green
} else {
    Write-Host "AI Gateway not found at $gatewayDir" -ForegroundColor Red
}

# 3. Caddy (port 8080) - for Cloudflare tunnel with api.kloudykare.com
Write-Host "`nTo expose AI via Cloudflare:" -ForegroundColor Cyan
Write-Host "  Option A (quick): cloudflared tunnel --url http://localhost:7501" -ForegroundColor Gray
Write-Host "  Option B (api.kloudykare.com): Run Caddy first, then: cloudflared tunnel run ufc-api" -ForegroundColor Gray
Write-Host "    Caddy: .\scripts\run-caddy-tunnel.ps1" -ForegroundColor Gray
Write-Host "`nSet NEXT_PUBLIC_API_BASE to:" -ForegroundColor Cyan
Write-Host "  - Local: http://localhost:7501" -ForegroundColor Gray
Write-Host "  - Deployed: https://api.kloudykare.com or your trycloudflare.com URL" -ForegroundColor Gray
