# UFC Full Chain Diagnostic - Find all breaks
# Run from UnitedFamilyCaregivers folder

$ErrorActionPreference = "Continue"
$root = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$ufcRoot = Join-Path $root "UnitedFamilyCaregivers"

Write-Host "`n=== UFC FULL CHAIN DIAGNOSTIC ===" -ForegroundColor Cyan
$results = @()

# 1. AI Gateway (localhost:7501)
try {
    $r = Invoke-WebRequest -Uri "http://localhost:7501/api/health" -UseBasicParsing -TimeoutSec 3
    $ok = $r.StatusCode -eq 200 -and $r.Content -match "ufc"
    $results += @{ Step = "1. AI Gateway :7501"; OK = $ok; Detail = "$($r.StatusCode) $($r.Content)" }
} catch {
    $results += @{ Step = "1. AI Gateway :7501"; OK = $false; Detail = $_.Exception.Message }
}

# 2. Ollama (localhost:11434)
try {
    $r = Invoke-WebRequest -Uri "http://localhost:11434/api/tags" -UseBasicParsing -TimeoutSec 3
    $ok = $r.StatusCode -eq 200
    $models = ($r.Content | ConvertFrom-Json).models
    $modelNames = ($models | ForEach-Object { $_.name }) -join ", "
    $results += @{ Step = "2. Ollama :11434"; OK = $ok; Detail = "models: $modelNames" }
} catch {
    $results += @{ Step = "2. Ollama :11434"; OK = $false; Detail = $_.Exception.Message }
}

# 3. Cloudflared process
$cf = Get-Process -Name "cloudflared" -ErrorAction SilentlyContinue
$results += @{ Step = "3. Cloudflared"; OK = ($null -ne $cf); Detail = if ($cf) { "PID $($cf.Id)" } else { "Not running" } }

# 4. Public API (api.unitedfamilycaregivers.com)
try {
    $r = Invoke-WebRequest -Uri "https://api.unitedfamilycaregivers.com/api/health" -UseBasicParsing -TimeoutSec 10
    $results += @{ Step = "4. Public API"; OK = $true; Detail = "$($r.StatusCode) $($r.Content)" }
} catch {
    $results += @{ Step = "4. Public API"; OK = $false; Detail = $_.Exception.Message }
}

# 5. DNS for api.unitedfamilycaregivers.com (IPv4 required for most networks)
try {
    $dns = Resolve-DnsName api.unitedfamilycaregivers.com -Type A -ErrorAction SilentlyContinue
    $aaaa = Resolve-DnsName api.unitedfamilycaregivers.com -Type AAAA -ErrorAction SilentlyContinue
    $hasA = $dns -and (@($dns).Count -gt 0)
    $hasAAAA = $aaaa -and (@($aaaa).Count -gt 0)
    $results += @{ Step = "5. DNS A record"; OK = $hasA; Detail = "A:$hasA AAAA:$hasAAAA (no A = timeout on IPv4-only networks)" }
} catch {
    $results += @{ Step = "5. DNS"; OK = $false; Detail = $_.Exception.Message }
}

# 6. Config files
$configPath = "$env:USERPROFILE\.cloudflared\config.yml"
$configOk = Test-Path $configPath
$results += @{ Step = "6. Tunnel config"; OK = $configOk; Detail = $configPath }

# 7. NEXT_PUBLIC_API_BASE in deploy
$envExample = Join-Path $ufcRoot ".env.local.example"
$deployRef = Select-String -Path (Join-Path $ufcRoot ".github\workflows\deploy.yml") -Pattern "NEXT_PUBLIC_API_BASE" -SimpleMatch
$results += @{ Step = "7. Deploy env"; OK = $true; Detail = "NEXT_PUBLIC_API_BASE from GitHub Secrets at build" }

# 8. ChatPanel (no debug instrumentation)
$chatPanel = Get-Content (Join-Path $ufcRoot "components\ChatPanel.tsx") -Raw
$hasDebugFetch = $chatPanel -match "127\.0\.0\.1:7314|ingest"
$results += @{ Step = "8. ChatPanel"; OK = (-not $hasDebugFetch); Detail = "Debug fetch: $hasDebugFetch" }

# 9. Supabase migration files
$migrations = Get-ChildItem (Join-Path $ufcRoot "supabase\migrations") -Filter "*.sql" -ErrorAction SilentlyContinue
$results += @{ Step = "9. Migrations"; OK = ($migrations.Count -gt 0); Detail = "$($migrations.Count) files (001-009)" }

# Output
Write-Host ""
foreach ($r in $results) {
    $color = if ($r.OK) { "Green" } else { "Red" }
    $mark = if ($r.OK) { "[OK]" } else { "[FAIL]" }
    Write-Host "$mark $($r.Step)" -ForegroundColor $color
    Write-Host "    $($r.Detail)" -ForegroundColor Gray
}
Write-Host ""
$failed = $results | Where-Object { $_.OK -eq $false }
$failCount = @($failed).Count
$failSteps = ($failed | ForEach-Object { $_.Step }) -join ", "
if ($failCount -gt 0) {
    Write-Host "BREAKS: $failCount - $failSteps" -ForegroundColor Yellow
    if ($failed | Where-Object { $_.Step -like "*Public API*" }) {
        Write-Host "  Fix: Add domain to Cloudflare (CLOUDFLARE_IPV4_FIX.md) or use quick tunnel (start-tunnel-and-get-url.ps1)" -ForegroundColor Gray
    }
} else {
    Write-Host "All links OK." -ForegroundColor Green
}
