#!/usr/bin/env bash
# CrowByte Installer / Updater for Linux
# Usage: curl -fsSL https://crowbyte.io/install.sh | bash

set -e

MANIFEST="https://crowbyte.io/version.json"

step()  { echo "  [~] $*"; }
ok()    { echo "  [+] $*"; }
warn()  { echo "  [!] $*"; }
info()  { echo "  [i] $*"; }
fail()  { echo "  [x] $*"; exit 1; }

ask_yes_no() {
  # Returns 0 (yes) or 1 (no)
  # Can't use read -p when piped from curl, so use /dev/tty
  printf "      %s [Y/n] " "$1"
  read -r answer </dev/tty
  case "$answer" in
    [Nn]*) return 1 ;;
    *) return 0 ;;
  esac
}

echo ""
echo "  CrowByte Installer"
echo "  =================="
echo ""

# ── Dependency scan ──────────────────────────────────────────────────────────

echo "  Scanning your system..."
echo ""

# curl or wget
if command -v curl &>/dev/null; then
  ok "curl $(curl --version | head -1 | awk '{print $2}') — OK"
  FETCH_CMD="curl"
elif command -v wget &>/dev/null; then
  ok "wget detected — OK"
  FETCH_CMD="wget"
else
  fail "Neither curl nor wget found — required to download CrowByte"
fi

# Node.js
if command -v node &>/dev/null; then
  ok "Node.js $(node --version) — OK"
else
  warn "Node.js not found — required to run CrowByte CLI tools and npx commands"
  if ask_yes_no "Install Node.js LTS now?"; then
    step "Installing Node.js via NodeSource..."
    if command -v apt-get &>/dev/null; then
      curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash - >/dev/null 2>&1
      sudo apt-get install -y nodejs >/dev/null 2>&1
      ok "Node.js installed"
    elif command -v dnf &>/dev/null; then
      curl -fsSL https://rpm.nodesource.com/setup_lts.x | sudo bash - >/dev/null 2>&1
      sudo dnf install -y nodejs >/dev/null 2>&1
      ok "Node.js installed"
    else
      warn "Could not auto-install — download manually: https://nodejs.org"
    fi
  else
    info "Skipping — some CrowByte CLI features will not be available"
  fi
fi

# npm
if command -v npm &>/dev/null; then
  ok "npm $(npm --version) — OK"
else
  warn "npm not found — bundled with Node.js, needed for npx crowbyte commands"
  info "Restart your terminal after installing Node.js to pick up npm"
fi

# git (optional)
if command -v git &>/dev/null; then
  ok "$(git --version) — OK"
else
  warn "git not found — recommended for CrowByte project integrations and source linking"
  if ask_yes_no "Install git now?"; then
    if command -v apt-get &>/dev/null; then
      sudo apt-get install -y git >/dev/null 2>&1 && ok "git installed"
    elif command -v dnf &>/dev/null; then
      sudo dnf install -y git >/dev/null 2>&1 && ok "git installed"
    elif command -v pacman &>/dev/null; then
      sudo pacman -S --noconfirm git >/dev/null 2>&1 && ok "git installed"
    else
      warn "Could not auto-install — run: sudo apt install git"
    fi
  else
    info "Skipping — install later with: sudo apt install git"
  fi
fi

# dpkg / rpm detection (for installer type)
if command -v dpkg &>/dev/null; then
  ok "dpkg detected — will use .deb package"
  PKG_TYPE="deb"
elif command -v rpm &>/dev/null; then
  ok "rpm detected — will use AppImage (no .rpm yet)"
  PKG_TYPE="appimage"
else
  info "No dpkg/rpm found — will use AppImage"
  PKG_TYPE="appimage"
fi

echo ""
echo "  ------------------------------------------------"
echo ""

# ── Fetch manifest ───────────────────────────────────────────────────────────

step "Fetching latest version info..."
if [ "$FETCH_CMD" = "curl" ]; then
  META=$(curl -fsSL "$MANIFEST" 2>/dev/null)
else
  META=$(wget -qO- "$MANIFEST" 2>/dev/null)
fi

VERSION=$(echo "$META" | grep -o '"version":"[^"]*"' | cut -d'"' -f4)
if [ -z "$VERSION" ]; then
  fail "Could not fetch version manifest — check your internet connection"
fi

ok "Latest version: $VERSION"

# ── Confirm ──────────────────────────────────────────────────────────────────

echo ""
if ! ask_yes_no "Proceed with download and installation of CrowByte $VERSION?"; then
  warn "Installation cancelled."
  echo ""
  exit 0
fi
echo ""

# ── Kill running instance ────────────────────────────────────────────────────

if pgrep -f "crowbyte\|CrowByte" &>/dev/null; then
  step "Stopping running CrowByte instance..."
  pkill -f "crowbyte\|CrowByte" 2>/dev/null && sleep 1 || true
fi

# ── Install ──────────────────────────────────────────────────────────────────

if [ "$PKG_TYPE" = "deb" ]; then
  URL=$(echo "$META" | grep -o '"linux_deb":"[^"]*"' | cut -d'"' -f4)
  TMPFILE="/tmp/crowbyte_${VERSION}_amd64.deb"

  step "Downloading crowbyte_${VERSION}_amd64.deb..."
  info "Source: $URL"
  echo ""

  if [ "$FETCH_CMD" = "curl" ]; then
    curl -fL --progress-bar "$URL" -o "$TMPFILE"
  else
    wget --show-progress -q "$URL" -O "$TMPFILE"
  fi

  echo ""

  if [ ! -f "$TMPFILE" ] || [ ! -s "$TMPFILE" ]; then
    fail "Downloaded file is empty or missing"
  fi

  SIZE=$(du -sh "$TMPFILE" | cut -f1)
  info "Package size: $SIZE"

  echo ""
  step "Installing .deb package..."
  info "You may be prompted for your sudo password."
  echo ""

  sudo dpkg -i "$TMPFILE" 2>/dev/null || sudo apt-get install -f -y
  rm -f "$TMPFILE"

  ok "CrowByte $VERSION installed!"
  step "Launching..."
  crowbyte &>/dev/null & disown

else
  URL=$(echo "$META" | grep -o '"linux_appimage":"[^"]*"' | cut -d'"' -f4)
  DEST="$HOME/.local/bin/crowbyte"
  mkdir -p "$HOME/.local/bin"

  step "Downloading CrowByte-$VERSION.AppImage..."
  info "Source: $URL"
  echo ""

  if [ "$FETCH_CMD" = "curl" ]; then
    curl -fL --progress-bar "$URL" -o "$DEST"
  else
    wget --show-progress -q "$URL" -O "$DEST"
  fi

  echo ""

  if [ ! -f "$DEST" ] || [ ! -s "$DEST" ]; then
    fail "Downloaded AppImage is empty or missing"
  fi

  chmod +x "$DEST"
  SIZE=$(du -sh "$DEST" | cut -f1)
  info "AppImage size: $SIZE"

  ok "CrowByte $VERSION installed to $DEST"
  step "Launching..."
  "$DEST" &>/dev/null & disown
fi

echo ""
ok "Done! Sign in at crowbyte.io to access your workspace."
echo ""
