###############################################################################
# CrowByte Terminal — Windows Docker Entrypoint
#
# Starts: TightVNC → Electron → websockify/noVNC
# Access via browser at http://localhost:6080
###############################################################################

$VNC_PORT = if ($env:VNC_PORT) { $env:VNC_PORT } else { "5900" }
$NOVNC_PORT = if ($env:NOVNC_PORT) { $env:NOVNC_PORT } else { "6080" }
$VNC_PASSWORD = if ($env:VNC_PASSWORD) { $env:VNC_PASSWORD } else { "crowbyte" }

Write-Host "=========================================="
Write-Host "  CrowByte Terminal v2.0.0 (Windows)"
Write-Host "  HLSITech — Offensive Security Platform"
Write-Host "=========================================="
Write-Host "[*] noVNC:   http://0.0.0.0:$NOVNC_PORT"
Write-Host "[*] VNC:     localhost:$VNC_PORT"
Write-Host ""

# ─── Configure TightVNC ────────────────────────────────────────────────────

Write-Host "[*] Configuring TightVNC..."
$regPath = "HKLM:\SOFTWARE\TightVNC\Server"
if (Test-Path $regPath) {
    Set-ItemProperty -Path $regPath -Name "RfbPort" -Value ([int]$VNC_PORT)
    Set-ItemProperty -Path $regPath -Name "Password" -Value ([byte[]](0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00))
}

# Start TightVNC service
Write-Host "[*] Starting TightVNC..."
Start-Service -Name "tvnserver" -ErrorAction SilentlyContinue
if (-not $?) {
    & "C:\Program Files\TightVNC\tvnserver.exe" -start
}
Start-Sleep -Seconds 2

# ─── Start Electron ────────────────────────────────────────────────────────

Write-Host "[*] Starting CrowByte Terminal..."
$env:ELECTRON_DISABLE_SECURITY_WARNINGS = "true"
$env:ELECTRON_NO_ATTACH_CONSOLE = "true"

$electronProc = Start-Process -FilePath "npx" -ArgumentList "electron", "electron/main.cjs", "--no-sandbox", "--disable-gpu" `
    -WorkingDirectory "C:\app" -PassThru -NoNewWindow

Start-Sleep -Seconds 5

# ─── Start noVNC (websockify) ──────────────────────────────────────────────

Write-Host "[*] Starting noVNC on port $NOVNC_PORT..."
$noVncProc = Start-Process -FilePath "python" -ArgumentList "-m", "websockify", "--web", "C:\noVNC", $NOVNC_PORT, "localhost:$VNC_PORT" `
    -PassThru -NoNewWindow

Write-Host ""
Write-Host "=========================================="
Write-Host "[+] CrowByte Terminal is READY"
Write-Host "[+] Open: http://localhost:$NOVNC_PORT"
Write-Host "=========================================="
Write-Host ""

# Keep container alive — wait for any process to exit
while ($true) {
    if ($electronProc.HasExited -or $noVncProc.HasExited) {
        Write-Host "[-] A process exited. Shutting down..."
        break
    }
    Start-Sleep -Seconds 5
}
