# CrowByte Installer for Windows
# Usage: iex (irm crowbyte.io/install.ps1)

# Allow .ps1 wrappers (node, npm, git) to run in this process without affecting system policy
Set-ExecutionPolicy Bypass -Scope Process -Force

$ErrorActionPreference = "Stop"
$manifest = "https://crowbyte.io/version.json"
$installer = "$env:TEMP\CrowByte-Setup.exe"
$exe = "$env:LOCALAPPDATA\Programs\crowbyte\CrowByte.exe"

function Write-Header {
    Write-Host ""
    Write-Host "  CrowByte Installer" -ForegroundColor Cyan
    Write-Host "  ==================" -ForegroundColor Cyan
    Write-Host ""
}

function Write-Step { param($msg) Write-Host "  [~] $msg" -ForegroundColor White }
function Write-OK   { param($msg) Write-Host "  [+] $msg" -ForegroundColor Green }
function Write-Warn { param($msg) Write-Host "  [!] $msg" -ForegroundColor Yellow }
function Write-Info { param($msg) Write-Host "  [i] $msg" -ForegroundColor DarkCyan }
function Write-Fail { param($msg) Write-Host "  [x] $msg" -ForegroundColor Red }

function Ask-YesNo {
    param($question)
    # When stdin is redirected (piped from bash/iex) there's no console to read from — default yes
    if ([Console]::IsInputRedirected) {
        Write-Host "      $question [Y/n] Y (auto)" -ForegroundColor DarkGray
        return $true
    }
    $answer = Read-Host "      $question [Y/n]"
    return ($answer -eq "" -or $answer -match "^[Yy]")
}

function Check-Dependencies {
    Write-Host ""
    Write-Host "  Scanning your system..." -ForegroundColor DarkGray
    Write-Host ""

    # PowerShell version
    $psVer = $PSVersionTable.PSVersion.Major
    if ($psVer -ge 5) {
        Write-OK "PowerShell $($PSVersionTable.PSVersion) — OK"
    } else {
        Write-Warn "PowerShell $($PSVersionTable.PSVersion) — version 5.1+ required for TLS 1.2 and script execution"
        Write-Info "Update via Windows Update before continuing."
    }

    # Node.js — node.exe doesn't have the .ps1 wrapper issue, but be explicit
    $nodeVer = $null
    try { $nodeVer = (& node.exe --version 2>$null) } catch {}
    if (-not $nodeVer) {
        try { $nodeVer = (cmd /c "node --version" 2>$null) } catch {}
    }
    if ($nodeVer) {
        Write-OK "Node.js $nodeVer — OK"
    } else {
        Write-Warn "Node.js not found — required to run CrowByte CLI tools and npx commands"
        if (Ask-YesNo "Install Node.js LTS now?") {
            Write-Step "Installing Node.js via winget..."
            try {
                & winget install --id OpenJS.NodeJS.LTS --silent --accept-package-agreements --accept-source-agreements
                Write-OK "Node.js installed"
            } catch {
                Write-Fail "winget failed — download manually: https://nodejs.org"
            }
        } else {
            Write-Info "Skipping — some CrowByte CLI features will not be available"
        }
    }

    # npm — try npm.cmd first (avoids .ps1 execution policy issues), then fallback
    $npmVer = $null
    try { $npmVer = (& npm.cmd --version 2>$null) } catch {}
    if (-not $npmVer) {
        try { $npmVer = (cmd /c "npm --version" 2>$null) } catch {}
    }
    if ($npmVer) {
        Write-OK "npm $npmVer — OK"
    } else {
        Write-Warn "npm not found — bundled with Node.js, needed for npx crowbyte commands"
        Write-Info "Restart this terminal after installing Node.js to pick up npm"
    }

    # Git (optional)
    $gitVer = $null
    try { $gitVer = (& git.exe --version 2>$null) } catch {}
    if (-not $gitVer) {
        try { $gitVer = (cmd /c "git --version" 2>$null) } catch {}
    }
    if ($gitVer) {
        Write-OK "$gitVer — OK"
    } else {
        Write-Warn "Git not found — recommended for CrowByte project source linking and integrations"
        if (Ask-YesNo "Install Git now?") {
            Write-Step "Installing Git via winget..."
            try {
                & winget install --id Git.Git --silent --accept-package-agreements --accept-source-agreements
                Write-OK "Git installed"
            } catch {
                Write-Fail "winget failed — download manually: https://git-scm.com"
            }
        } else {
            Write-Info "Skipping — install later from https://git-scm.com"
        }
    }

    # Visual C++ Redistributable
    $vcRedist = Get-ItemProperty "HKLM:\SOFTWARE\Microsoft\VisualStudio\14.0\VC\Runtimes\x64" -ErrorAction SilentlyContinue
    if ($null -eq $vcRedist) {
        $vcRedist = Get-ItemProperty "HKLM:\SOFTWARE\WOW6432Node\Microsoft\VisualStudio\14.0\VC\Runtimes\x64" -ErrorAction SilentlyContinue
    }
    if ($vcRedist) {
        Write-OK "Visual C++ Redistributable — OK"
    } else {
        Write-Warn "Visual C++ Redistributable not found — required by the Electron runtime inside CrowByte"
        Write-Info "The installer will try to include it; if the app fails to start, get it from Microsoft"
    }

    Write-Host ""
    Write-Host "  ------------------------------------------------" -ForegroundColor DarkGray
    Write-Host ""
}

# ── Main ──────────────────────────────────────────────────────────────────────

Write-Header

# Fetch version manifest
Write-Step "Fetching latest version info..."
try {
    $meta = Invoke-RestMethod -Uri $manifest -UseBasicParsing
    $version = $meta.version
    $url = $meta.windows
    Write-OK "Latest version: $version"
} catch {
    Write-Warn "Could not reach update server — using bundled fallback"
    $version = "2.2.0"
    $url = "https://gvskdopsigtflbbylyto.supabase.co/storage/v1/object/public/releases/CrowByte-Setup-2.2.0.exe"
}

# Already installed check
if (Test-Path $exe) {
    $installed = (Get-Item $exe).VersionInfo.FileVersion
    if ($installed -and $installed -eq $version) {
        Write-OK "CrowByte $version is already installed and up to date"
        Start-Process $exe
        exit 0
    }
    Write-Step "Upgrading from $installed to $version..."
    Get-Process -Name "CrowByte" -ErrorAction SilentlyContinue | Stop-Process -Force
    Start-Sleep -Seconds 2
} else {
    Write-Step "Installing CrowByte $version..."
}

# Dependency scan
Check-Dependencies

# Confirm
if (-not (Ask-YesNo "Proceed with download and installation of CrowByte $version?")) {
    Write-Warn "Installation cancelled."
    Write-Host ""
    exit 0
}

# Download with progress
Write-Host ""
Write-Step "Downloading CrowByte-Setup-$version.exe..."
Write-Info "Source: $url"
Write-Host ""

try {
    $wc = New-Object System.Net.WebClient
    $wc.Headers.Add("User-Agent", "CrowByte-Installer/1.0")

    $lastPct = -1
    $progressHandler = Register-ObjectEvent -InputObject $wc -EventName DownloadProgressChanged -Action {
        $pct = $EventArgs.ProgressPercentage
        if ($pct -ne $script:lastPct -and $pct % 10 -eq 0) {
            $filled = [math]::Floor($pct / 5)
            $bar    = ("#" * $filled) + ("-" * (20 - $filled))
            $mb     = [math]::Round($EventArgs.BytesReceived / 1MB, 1)
            $total  = [math]::Round($EventArgs.TotalBytesToReceive / 1MB, 1)
            Write-Host "`r  [$bar] $pct%  ${mb}MB / ${total}MB  " -NoNewline -ForegroundColor Cyan
            $script:lastPct = $pct
        }
    }

    $task = $wc.DownloadFileTaskAsync([Uri]$url, $installer)
    $task.Wait()

    Unregister-Event -SourceIdentifier $progressHandler.Name -ErrorAction SilentlyContinue
    Remove-Job -Name $progressHandler.Name -ErrorAction SilentlyContinue

    Write-Host ""
    Write-OK "Download complete"
} catch {
    Write-Host ""
    Write-Fail "Download failed: $_"
    Write-Info "Download manually: https://crowbyte.io/downloads/CrowByte-Setup-$version.exe"
    exit 1
}

# Sanity check
if (-not (Test-Path $installer) -or (Get-Item $installer).Length -lt 1MB) {
    Write-Fail "Downloaded file appears corrupted or empty"
    exit 1
}

$sizeMB = [math]::Round((Get-Item $installer).Length / 1MB, 1)
Write-Info "Installer: ${sizeMB}MB"

# Launch installer (NO /S flag — full wizard shown to user)
Write-Host ""
Write-Step "Launching setup wizard..."
Write-Info "Follow the on-screen steps to complete installation."
Write-Host ""

Start-Process -FilePath $installer -Wait
Remove-Item $installer -Force -ErrorAction SilentlyContinue

# Launch
if (Test-Path $exe) {
    Write-OK "CrowByte $version installed!"
    Write-Step "Launching..."
    Start-Process $exe
} else {
    Write-Warn "Executable not found at expected path — check your Start Menu for the CrowByte shortcut"
}

Write-Host ""
Write-OK "Done! Sign in at crowbyte.io to access your workspace."
Write-Host ""
