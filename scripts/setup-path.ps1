# Add tools to PATH for this session
# Run: . .\scripts\setup-path.ps1
$paths = @(
    "C:\Program Files\Git\bin",
    "C:\Program Files\nodejs",
    "C:\Users\Flying Phoenix PCs\AppData\Local\Programs\Ollama",
    "C:\Program Files (x86)\cloudflared"
)
foreach ($p in $paths) {
    if (Test-Path $p) {
        $env:Path = "$p;" + $env:Path
        Write-Host "Added to PATH: $p" -ForegroundColor Green
    }
}
Write-Host "`nVerifying: node $(node -v), npm $(npm -v), git $(git --version)" -ForegroundColor Cyan
