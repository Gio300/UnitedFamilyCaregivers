# UFC API Stack - Start AI Gateway + Cloudflare Tunnel
# Run this before using the UFC app chat. Keep this window open.

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent

Write-Host "=== UFC API Stack ===" -ForegroundColor Cyan
Write-Host ""

# 1. AI Gateway (port 7501)
$gatewayProc = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.MainModule.FileName -like "*ai-gateway*" -or (Get-NetTCPConnection -OwningProcess $_.Id -ErrorAction SilentlyContinue | Where-Object LocalPort -eq 7501) }
try {
    $test = Invoke-WebRequest -Uri "http://localhost:7501/api/health" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
    if ($test.Content -match "ufc-ai-gateway") {
        Write-Host "[OK] AI Gateway already running on port 7501" -ForegroundColor Green
    }
} catch {
    Write-Host "[START] Starting AI Gateway..." -ForegroundColor Yellow
    Start-Process -FilePath "node" -ArgumentList "server.js" -WorkingDirectory (Join-Path $root "ai-gateway") -WindowStyle Hidden
    Start-Sleep -Seconds 3
    try {
        $t = Invoke-WebRequest -Uri "http://localhost:7501/api/health" -UseBasicParsing -TimeoutSec 5
        Write-Host "[OK] AI Gateway started" -ForegroundColor Green
    } catch {
        Write-Host "[FAIL] AI Gateway failed to start. Run manually: cd ai-gateway; npm run dev" -ForegroundColor Red
    }
}

# 2. Cloudflare Tunnel
$cloudflared = Get-Process -Name "cloudflared" -ErrorAction SilentlyContinue
if ($cloudflared) {
    Write-Host "[OK] cloudflared already running" -ForegroundColor Green
} else {
    Write-Host "[START] Starting cloudflared tunnel..." -ForegroundColor Yellow
    $configPath = "$env:USERPROFILE\.cloudflared\config.yml"
    if (Test-Path $configPath) {
        Start-Process -FilePath "cloudflared" -ArgumentList "tunnel", "--config", $configPath, "run" -WindowStyle Hidden
    } else {
        Start-Process -FilePath "cloudflared" -ArgumentList "tunnel", "run", "ufc-api-config" -WindowStyle Hidden
    }
    Start-Sleep -Seconds 5
    $cf = Get-Process -Name "cloudflared" -ErrorAction SilentlyContinue
    if ($cf) {
        Write-Host "[OK] cloudflared started" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] cloudflared failed to start. Run manually: cloudflared tunnel run ufc-api-config" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "API ready at: https://api.unitedfamilycaregivers.com" -ForegroundColor Cyan
Write-Host "Test: https://api.unitedfamilycaregivers.com/api/health" -ForegroundColor Gray
Write-Host ""
