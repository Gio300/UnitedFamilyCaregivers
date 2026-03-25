# Bypass NAT hairpin / NAT loopback for api.unitedfamilycaregivers.com on Windows.
# Many routers cannot route "public IP -> port forward -> same LAN" for clients on the LAN.
# This forces the hostname to resolve to your Caddy host so GitHub Pages + local browser can reach the API.
#
# RUN AS ADMINISTRATOR:
#   cd UnitedFamilyCaregivers\scripts
#   .\add-ufc-hosts-entry.ps1
#
# Browser on a different PC on Wi‑Fi (Caddy on 192.168.0.67): use default.
# Browser on the same machine as Caddy only: .\add-ufc-hosts-entry.ps1 -UseLoopback
# Custom LAN IP: .\add-ufc-hosts-entry.ps1 -LocalApiHostIp 192.168.1.50

param(
  [string] $LocalApiHostIp = "192.168.0.67",
  [switch] $UseLoopback
)

$hostsPath = "C:\Windows\System32\drivers\etc\hosts"
$targetIp = if ($UseLoopback) { "127.0.0.1" } else { $LocalApiHostIp }
$entry = "$targetIp    api.unitedfamilycaregivers.com"

if (-not (Test-Path $hostsPath)) {
  Write-Host "[FAIL] hosts file not found: $hostsPath" -ForegroundColor Red
  exit 1
}

try {
  $rawLines = @(Get-Content -Path $hostsPath -ErrorAction Stop)
  $keptLines = @()
  foreach ($line in $rawLines) {
    $trim = $line.TrimStart()
    if ($trim.StartsWith("#")) {
      $keptLines += $line
      continue
    }
    if ($line -match '(?i)\bapi\.unitedfamilycaregivers\.com\b') {
      Write-Host "[INFO] Removing stale line: $($line.Trim())" -ForegroundColor DarkYellow
      continue
    }
    $keptLines += $line
  }

  $final = @($keptLines)
  if ($final.Count -eq 0 -or ($final[-1] -ne "" -and $final[-1].Trim() -ne "")) {
    $final += ""
  }
  $final += $entry

  Set-Content -Path $hostsPath -Value $final -Encoding ascii
  Write-Host "[OK] api.unitedfamilycaregivers.com -> $targetIp (this PC only)" -ForegroundColor Green
  Write-Host "     Test: https://api.unitedfamilycaregivers.com/api/health" -ForegroundColor Gray
}
catch {
  Write-Host "[FAIL] Run PowerShell as Administrator (hosts is protected)." -ForegroundColor Red
  Write-Host $_.Exception.Message -ForegroundColor Yellow
  exit 1
}
