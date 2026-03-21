# UFC API - Restart cloudflared tunnel (RUN AS ADMINISTRATOR)
# Use when api.unitedfamilycaregivers.com times out or cloudflared needs a clean restart.
# Right-click PowerShell > Run as administrator, then: .\restart-tunnel-admin.ps1

$ErrorActionPreference = "Stop"
$configPath = "$env:USERPROFILE\.cloudflared\config.yml"

# Ensure cloudflared is in PATH (common install locations)
$env:Path = "$env:Path;C:\Program Files\cloudflared;C:\Program Files (x86)\cloudflared;$env:LOCALAPPDATA\cloudflared"

Write-Host "=== UFC Tunnel Restart (Admin) ===" -ForegroundColor Cyan

# 1. Stop all cloudflared (requires admin to stop elevated processes)
Write-Host "Stopping cloudflared..." -ForegroundColor Yellow
Get-Process -Name "cloudflared" -ErrorAction SilentlyContinue | ForEach-Object {
    $pid = $_.Id
    try {
        Stop-Process -Id $pid -Force -ErrorAction Stop
        Write-Host "  Stopped PID $pid" -ForegroundColor Gray
    } catch {
        Write-Host "  Could not stop PID $pid (run as Administrator)" -ForegroundColor Yellow
    }
}
Start-Sleep -Seconds 2

# 2. Verify AI Gateway
try {
    $t = Invoke-WebRequest -Uri "http://localhost:7501/api/health" -UseBasicParsing -TimeoutSec 3
    if ($t.Content -match "ufc-ai-gateway") {
        Write-Host "[OK] AI Gateway running on 7501" -ForegroundColor Green
    }
} catch {
    Write-Host "[WARN] AI Gateway not responding. Start it first: cd ai-gateway; node server.js" -ForegroundColor Yellow
}

# 3. Start cloudflared with explicit config
Write-Host "Starting cloudflared tunnel..." -ForegroundColor Yellow
if (-not (Test-Path $configPath)) {
    Write-Host "[FAIL] Config not found: $configPath" -ForegroundColor Red
    exit 1
}

$cloudflaredExe = (Get-Command cloudflared -ErrorAction SilentlyContinue).Source
if (-not $cloudflaredExe) {
    foreach ($p in @("C:\Program Files\cloudflared\cloudflared.exe", "C:\Program Files (x86)\cloudflared\cloudflared.exe")) {
        if (Test-Path $p) { $cloudflaredExe = $p; break }
    }
}
if (-not $cloudflaredExe) {
    Write-Host "[FAIL] cloudflared not found. Install from https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/" -ForegroundColor Red
    exit 1
}

Start-Process -FilePath $cloudflaredExe -ArgumentList "tunnel", "--config", $configPath, "run" -WindowStyle Normal
Start-Sleep -Seconds 5

$cf = Get-Process -Name "cloudflared" -ErrorAction SilentlyContinue
if ($cf) {
    Write-Host "[OK] cloudflared started (PID $($cf.Id))" -ForegroundColor Green
} else {
    Write-Host "[FAIL] cloudflared did not start" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "API: https://api.unitedfamilycaregivers.com/api/health" -ForegroundColor Cyan
Write-Host "If still timing out, see CLOUDFLARE_IPV4_FIX.md" -ForegroundColor Gray
