# Start Cloudflare quick tunnel to AI Gateway (7501) and display the URL
# Run this, then set NEXT_PUBLIC_API_BASE in GitHub Secrets to the displayed URL
# Keep this window open - closing it stops the tunnel

$env:Path += ";C:\Program Files (x86)\cloudflared"
$env:Path += ";C:\Program Files\cloudflared"

Write-Host "Starting Cloudflare tunnel to http://localhost:7501..." -ForegroundColor Cyan
Write-Host "Ensure AI Gateway is running: cd ai-gateway && npm start" -ForegroundColor Gray
Write-Host ""
Write-Host "Once the URL appears below, add it to GitHub:" -ForegroundColor Yellow
Write-Host "  Repo > Settings > Secrets and variables > Actions > NEXT_PUBLIC_API_BASE" -ForegroundColor Gray
Write-Host "  Then push a commit to trigger rebuild." -ForegroundColor Gray
Write-Host ""

& cloudflared tunnel --url http://localhost:7501
