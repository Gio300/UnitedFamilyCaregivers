# Install Supabase CLI on Windows (official tarball; npm global is not supported).
# Run in PowerShell. No admin required. Adds %LOCALAPPDATA%\Supabase to User PATH.

$ErrorActionPreference = "Stop"
$tag = (Invoke-RestMethod -Uri "https://api.github.com/repos/supabase/cli/releases/latest" -Headers @{ "User-Agent" = "UFC-Install" }).tag_name
$dest = Join-Path $env:LOCALAPPDATA "Supabase"
$tar = Join-Path $env:TEMP "supabase_windows_amd64.tar.gz"
$url = "https://github.com/supabase/cli/releases/download/$tag/supabase_windows_amd64.tar.gz"

New-Item -ItemType Directory -Force -Path $dest | Out-Null
Write-Host "Downloading $url"
Invoke-WebRequest -Uri $url -OutFile $tar -UseBasicParsing
tar -xzf $tar -C $dest

$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($userPath -notlike "*$dest*") {
  [Environment]::SetEnvironmentVariable("Path", "$userPath;$dest", "User")
  Write-Host "Added to User PATH: $dest"
}

$env:Path = "$dest;" + $env:Path
& "$dest\supabase.exe" --version
Write-Host "Open a new terminal for PATH to apply everywhere."
