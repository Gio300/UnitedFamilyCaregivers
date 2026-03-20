# Start AI stack: Ollama + pull models, AI Gateway, optional Cloudflare tunnel
# Run from UnitedFamilyCaregivers or project root. Use admin/elevated if needed.

$ErrorActionPreference = "Stop"
$root = if (Test-Path "ai-gateway") { Get-Location } else { Split-Path (Split-Path $PSScriptRoot -Parent) -Parent }
$root = Resolve-Path $root
Set-Location $root

Write-Host "=== UFCi AI Stack ===" -ForegroundColor Cyan

# 1. Ollama - ensure running and pull models
$ollamaPath = "C:\Users\$env:USERNAME\AppData\Local\Programs\Ollama\ollama.exe"
if (-not (Test-Path $ollamaPath)) {
    $ollamaPath = "ollama"
}
Write-Host "Pulling Ollama models (llama3.2:3b, llama3.3)..." -ForegroundColor Yellow
& $ollamaPath pull llama3.2:3b 2>$null
& $ollamaPath pull llama3.3 2>$null
Write-Host "Ollama models ready." -ForegroundColor Green

# 2. AI Gateway
Write-Host "Starting AI Gateway on port 7501..." -ForegroundColor Yellow
$gatewayDir = Join-Path $root "UnitedFamilyCaregivers\ai-gateway"
if (-not (Test-Path $gatewayDir)) { $gatewayDir = Join-Path $root "ai-gateway" }
if (Test-Path $gatewayDir) {
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$gatewayDir'; `$env:PORT='7501'; node server.js"
    Write-Host "AI Gateway started in new window." -ForegroundColor Green
} else {
    Write-Host "AI Gateway not found at $gatewayDir" -ForegroundColor Red
}

# 3. Cloudflare tunnel (optional - uncomment if configured)
# Write-Host "Starting Cloudflare tunnel..." -ForegroundColor Yellow
# $cfPath = "C:\Program Files (x86)\cloudflared\cloudflared.exe"
# if (Test-Path $cfPath) {
#     Start-Process $cfPath -ArgumentList "tunnel", "run", "ufc-api" -WindowStyle Normal
#     Write-Host "Cloudflare tunnel started." -ForegroundColor Green
# } else {
#     Write-Host "cloudflared not found. Run: cloudflared tunnel --url http://localhost:7501" -ForegroundColor Yellow
# }

Write-Host "`nDone. Set NEXT_PUBLIC_API_BASE to your Cloudflare tunnel URL or http://localhost:7501 for local." -ForegroundColor Cyan
