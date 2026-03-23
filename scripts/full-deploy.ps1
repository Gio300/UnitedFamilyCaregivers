# Full deploy: sync secrets to GitHub, then commit and push
# Requires: gh CLI + Git in PATH, gh auth login
# One-time: Add SUPABASE_DATABASE_URL to repo Settings > Secrets > Actions
$ErrorActionPreference = "Stop"
$env:Path = "C:\Program Files\Git\bin;" + $env:Path
$scriptDir = Split-Path $PSScriptRoot -Parent

Push-Location $scriptDir
try {
    Write-Host "Step 1: Syncing secrets to GitHub..." -ForegroundColor Cyan
    & "$PSScriptRoot\sync-secrets-to-github.ps1"
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

    Write-Host "`nStep 2: Checking for changes to push..." -ForegroundColor Cyan
    git add -A
    $status = git status --porcelain
    if ([string]::IsNullOrWhiteSpace($status)) {
        Write-Host "No local changes. Secrets synced; deploy workflow was triggered." -ForegroundColor Green
        exit 0
    }

    Write-Host "Changes detected:"
    git status -s
    $msg = "UFCi: deploy updates"
    git commit -m $msg
    git push
    Write-Host "`nPushed. Deploy and migrations will run on GitHub." -ForegroundColor Green
} finally { Pop-Location }
