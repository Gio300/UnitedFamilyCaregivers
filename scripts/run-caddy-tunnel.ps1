# Start Caddy for Cloudflare Tunnel (port 8080)
# Tunnel config: service: http://localhost:8080
# Caddy proxies /api/* to AI Gateway (7501)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ufcRoot = Split-Path -Parent $scriptDir
$parentRoot = Split-Path -Parent $ufcRoot
$caddyExe = Get-Command caddy -ErrorAction SilentlyContinue
if (-not $caddyExe) {
    $try1 = Join-Path $ufcRoot "caddy-bin\caddy.exe"
    $try2 = Join-Path $parentRoot "caddy-bin\caddy.exe"
    if (Test-Path $try1) { $caddyExe = $try1 }
    elseif (Test-Path $try2) { $caddyExe = $try2 }
}
$config = Join-Path $ufcRoot "caddy\Caddyfile.tunnel"

$exe = if ($caddyExe -is [System.Management.Automation.CommandInfo]) { $caddyExe.Source } else { $caddyExe }
if (-not $exe) {
    Write-Host "Caddy not found. Install: choco install caddy, or download from https://github.com/caddyserver/caddy/releases" -ForegroundColor Red
    exit 1
}

Write-Host "Starting Caddy on port 8080 (Cloudflare Tunnel)..." -ForegroundColor Cyan
Write-Host "Ensure AI Gateway is running on 7501" -ForegroundColor Gray
& $exe run --config $config
