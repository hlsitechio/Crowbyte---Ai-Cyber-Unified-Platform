#!/usr/bin/env bash
# CrowByte Installer for macOS / Linux
# Usage: curl -fsSL https://crowbyte.io/install.sh | bash

set -e

MANIFEST="https://crowbyte.io/version.json"
OS=$(uname -s)

echo ""
echo "  CrowByte Installer"
echo "  =================="
echo ""

# Fetch version manifest
if command -v curl &>/dev/null; then
  META=$(curl -fsSL "$MANIFEST" 2>/dev/null)
elif command -v wget &>/dev/null; then
  META=$(wget -qO- "$MANIFEST" 2>/dev/null)
else
  echo "  [!] curl or wget required"
  exit 1
fi

# Parse JSON with python3 (handles formatted JSON)
if command -v python3 &>/dev/null; then
  VERSION=$(echo "$META" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['version'])" 2>/dev/null)
  URL_DEB=$(echo "$META" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('downloads',{}).get('linux_deb',''))" 2>/dev/null)
  URL_APPIMAGE=$(echo "$META" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('linux_appimage','') or d.get('linux',''))" 2>/dev/null)
  URL_MAC=$(echo "$META" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('mac','') or '')" 2>/dev/null)
else
  # Fallback: grep with flexible spacing
  VERSION=$(echo "$META" | grep -oP '"version"\s*:\s*"\K[^"]+' 2>/dev/null || echo "$META" | sed -n 's/.*"version" *: *"\([^"]*\)".*/\1/p')
  URL_DEB=$(echo "$META" | grep -oP '"linux_deb"\s*:\s*"\K[^"]+' 2>/dev/null)
  URL_APPIMAGE=$(echo "$META" | grep -oP '"linux_appimage"\s*:\s*"\K[^"]+' 2>/dev/null)
  URL_MAC=$(echo "$META" | grep -oP '"mac"\s*:\s*"\K[^"]+' 2>/dev/null)
fi

if [ -z "$VERSION" ]; then
  echo "  [!] Could not parse version manifest"
  exit 1
fi

echo "  [i] Latest version: $VERSION"

# ── macOS ─────────────────────────────────────────────────────────────────────
if [ "$OS" = "Darwin" ]; then
  if [ -z "$URL_MAC" ] || [ "$URL_MAC" = "None" ] || [ "$URL_MAC" = "null" ]; then
    echo "  [!] macOS build not yet available"
    exit 1
  fi
  TMPFILE="/tmp/CrowByte-${VERSION}.dmg"
  echo "  [~] Downloading macOS installer..."
  curl -fsSL "$URL_MAC" -o "$TMPFILE"
  MOUNTPOINT=$(hdiutil attach "$TMPFILE" -nobrowse -quiet | awk 'END {print $NF}')
  cp -R "${MOUNTPOINT}/CrowByte.app" /Applications/
  hdiutil detach "$MOUNTPOINT" -quiet
  rm -f "$TMPFILE"
  echo "  [+] CrowByte $VERSION installed!"
  open /Applications/CrowByte.app

# ── Linux ─────────────────────────────────────────────────────────────────────
elif [ "$OS" = "Linux" ]; then
  if command -v dpkg &>/dev/null && [ -n "$URL_DEB" ] && [ "$URL_DEB" != "None" ]; then
    TMPFILE="/tmp/crowbyte_${VERSION}_amd64.deb"
    echo "  [~] Downloading .deb package..."
    curl -fsSL "$URL_DEB" -o "$TMPFILE"
    echo "  [~] Installing..."
    sudo dpkg -i "$TMPFILE" 2>/dev/null || sudo apt-get install -f -y
    rm -f "$TMPFILE"
    echo "  [+] CrowByte $VERSION installed!"
    crowbyte &>/dev/null & disown
  else
    DEST="$HOME/.local/bin/crowbyte"
    echo "  [~] Downloading AppImage..."
    mkdir -p "$HOME/.local/bin"
    curl -fsSL "$URL_APPIMAGE" -o "$DEST"
    chmod +x "$DEST"
    echo "  [+] CrowByte $VERSION installed at $DEST"
    "$DEST" &>/dev/null & disown
  fi

else
  echo "  [!] Unsupported OS: $OS"
  echo "      Windows: iex (irm https://crowbyte.io)"
  exit 1
fi

echo ""
