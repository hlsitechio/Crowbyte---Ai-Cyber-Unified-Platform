# CrowByte Updater for Windows
# Usage: iex (irm https://crowbyte.io/update.ps1)

$ErrorActionPreference = "Stop"
$manifest = "https://crowbyte.io/version.json"
$installer = "$env:TEMP\CrowByte-Setup.exe"
$exe = "$env:LOCALAPPDATA\Programs\crowbyte\CrowByte.exe"

Write-Host ""
Write-Host "  CrowByte Updater" -ForegroundColor Cyan
Write-Host "  ================" -ForegroundColor Cyan
Write-Host ""

# Fetch version manifest
try {
    $meta = Invoke-RestMethod -Uri $manifest -UseBasicParsing
    $version = $meta.version
    $url = $meta.windows
    Write-Host "  [i] Latest version: $version" -ForegroundColor White
} catch {
    Write-Host "  [!] Could not fetch version manifest. Using fallback." -ForegroundColor Yellow
    $version = "2.2.0"
    $url = "https://gvskdopsigtflbbylyto.supabase.co/storage/v1/object/public/releases/CrowByte-Setup-2.2.0.exe"
}

# Kill running instance
$proc = Get-Process -Name "CrowByte" -ErrorAction SilentlyContinue
if ($proc) {
    Write-Host "  [~] Closing CrowByte..." -ForegroundColor Yellow
    $proc | Stop-Process -Force
    Start-Sleep -Seconds 2
}

# Download
Write-Host "  [~] Downloading update..." -ForegroundColor White
try {
    $wc = New-Object System.Net.WebClient
    $wc.DownloadFile($url, $installer)
} catch {
    Write-Host "  [!] Download failed: $_" -ForegroundColor Red
    exit 1
}

# Install silently
Write-Host "  [~] Applying update..." -ForegroundColor White
Start-Process -FilePath $installer -ArgumentList "/S" -Wait
Remove-Item $installer -Force -ErrorAction SilentlyContinue

# Relaunch
if (Test-Path $exe) {
    Write-Host "  [+] Update complete! CrowByte $version installed." -ForegroundColor Green
    Start-Process $exe
} else {
    Write-Host "  [!] Update failed — $exe not found." -ForegroundColor Red
    exit 1
}
Write-Host ""
