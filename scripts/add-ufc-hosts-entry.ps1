# Add api.unitedfamilycaregivers.com to hosts file (bypass NAT hairpin when testing from same PC)
# RUN AS ADMINISTRATOR: Right-click PowerShell > Run as administrator, then:
#   Set-Location "C:\path\to\UnitedFamilyCaregivers\scripts"; .\add-ufc-hosts-entry.ps1

$hostsPath = "C:\Windows\System32\drivers\etc\hosts"
$entry = "127.0.0.1    api.unitedfamilycaregivers.com"

$content = Get-Content $hostsPath -Raw
if ($content -match "api\.unitedfamilycaregivers\.com") {
    Write-Host "[OK] Entry already exists in hosts file" -ForegroundColor Green
    exit 0
}

try {
    Add-Content -Path $hostsPath -Value "`n$entry" -Force
    Write-Host "[OK] Added: $entry" -ForegroundColor Green
    Write-Host "api.unitedfamilycaregivers.com will now resolve to 127.0.0.1 on this PC" -ForegroundColor Gray
} catch {
    Write-Host "[FAIL] Run this script as Administrator" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Yellow
    exit 1
}
