#!/bin/bash
###############################################################################
# CrowByte Terminal — Linux Installer
#
# Supports: Debian/Ubuntu (.deb), RHEL/Fedora (.rpm), AppImage (universal)
#
# Usage:
#   curl -fsSL https://crowbyte.io/install.sh | bash
#   # OR
#   ./install.sh [--docker|--appimage|--deb]
###############################################################################

set -euo pipefail

# ─── Config ──────────────────────────────────────────────────────────────────

VERSION="2.0.0"
PRODUCT="CrowByte Terminal"
COMPANY="HLSITech"
INSTALL_DIR="/opt/crowbyte"
BIN_LINK="/usr/local/bin/crowbyte"
DESKTOP_FILE="/usr/share/applications/crowbyte.desktop"
DOCKER_IMAGE="hlsitech/crowbyte:latest"
DOWNLOAD_BASE="https://releases.crowbyte.io/v${VERSION}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m'

# ─── Helpers ─────────────────────────────────────────────────────────────────

banner() {
  echo -e "${CYAN}"
  echo "  ╔══════════════════════════════════════════╗"
  echo "  ║     CrowByte Terminal Installer v${VERSION}   ║"
  echo "  ║          HLSITech — crowbyte.io          ║"
  echo "  ╚══════════════════════════════════════════╝"
  echo -e "${NC}"
}

log()  { echo -e "${GREEN}[+]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[-]${NC} $1"; }
info() { echo -e "${CYAN}[i]${NC} $1"; }

check_root() {
  if [ "$EUID" -ne 0 ]; then
    err "This installer must be run as root (sudo)."
    echo "  Usage: sudo ./install.sh"
    exit 1
  fi
}

detect_os() {
  if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS_ID="${ID}"
    OS_VERSION="${VERSION_ID}"
    OS_NAME="${PRETTY_NAME}"
  elif [ -f /etc/debian_version ]; then
    OS_ID="debian"
    OS_VERSION=$(cat /etc/debian_version)
    OS_NAME="Debian ${OS_VERSION}"
  else
    OS_ID="unknown"
    OS_VERSION="unknown"
    OS_NAME="Unknown Linux"
  fi
  ARCH=$(uname -m)
  log "Detected: ${OS_NAME} (${ARCH})"
}

detect_package_manager() {
  if command -v apt-get &>/dev/null; then
    PKG_MANAGER="apt"
  elif command -v dnf &>/dev/null; then
    PKG_MANAGER="dnf"
  elif command -v yum &>/dev/null; then
    PKG_MANAGER="yum"
  elif command -v pacman &>/dev/null; then
    PKG_MANAGER="pacman"
  else
    PKG_MANAGER="none"
  fi
}

# ─── Installation Methods ────────────────────────────────────────────────────

install_docker() {
  log "Installing via Docker..."

  if ! command -v docker &>/dev/null; then
    warn "Docker not found. Installing Docker..."
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
    log "Docker installed"
  fi

  info "Pulling ${DOCKER_IMAGE}..."
  docker pull "${DOCKER_IMAGE}"

  # Create env file if it doesn't exist
  if [ ! -f "${INSTALL_DIR}/.env" ]; then
    mkdir -p "${INSTALL_DIR}"
    cat > "${INSTALL_DIR}/.env" << 'ENVEOF'
# CrowByte Terminal — Environment Configuration
# Edit this file, then restart: docker compose up -d

# ─── Database (Required) ─────────────────────────────────
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=

# ─── VPS Agent Swarm (Optional) ──────────────────────────
VITE_OPENCLAW_HOST=
VITE_VPS_IP=
VITE_OPENCLAW_GATEWAY_PASSWORD=

# ─── VNC Access ──────────────────────────────────────────
VNC_PASSWORD=
NOVNC_PORT=6080

# ─── External APIs (Optional) ───────────────────────────
VITE_SHODAN_API_KEY=
VITE_NVD_API_KEY=
VITE_TAVILY_API_KEY=
ENVEOF
    log "Created ${INSTALL_DIR}/.env — edit with your config"
  fi

  # Create docker-compose in install dir
  cat > "${INSTALL_DIR}/docker-compose.yml" << 'DCEOF'
version: '3.8'
services:
  crowbyte:
    image: hlsitech/crowbyte:latest
    container_name: crowbyte
    restart: unless-stopped
    ports:
      - "${NOVNC_PORT:-6080}:6080"
    env_file: .env
    volumes:
      - crowbyte-data:/root/.config/crowbyte
      - crowbyte-scans:/root/scans
    shm_size: '2gb'
    deploy:
      resources:
        limits:
          cpus: '4'
          memory: 4G
volumes:
  crowbyte-data:
  crowbyte-scans:
DCEOF

  # Create launcher script
  cat > "${BIN_LINK}" << 'BINEOF'
#!/bin/bash
cd /opt/crowbyte
case "${1:-start}" in
  start)   docker compose up -d && echo "[+] CrowByte running at http://localhost:${NOVNC_PORT:-6080}" ;;
  stop)    docker compose down ;;
  restart) docker compose restart ;;
  logs)    docker compose logs -f ;;
  update)  docker compose pull && docker compose up -d ;;
  config)  ${EDITOR:-nano} .env ;;
  status)  docker compose ps ;;
  shell)   docker exec -it crowbyte /bin/bash ;;
  *)       echo "Usage: crowbyte {start|stop|restart|logs|update|config|status|shell}" ;;
esac
BINEOF
  chmod +x "${BIN_LINK}"

  log "Docker installation complete!"
  echo ""
  info "Quick start:"
  echo "  1. Edit config:  crowbyte config"
  echo "  2. Start:        crowbyte start"
  echo "  3. Open:         http://localhost:6080"
  echo ""
  info "Commands: crowbyte {start|stop|restart|logs|update|config|status|shell}"
}

install_appimage() {
  log "Installing AppImage..."

  APPIMAGE_URL="${DOWNLOAD_BASE}/CrowByte-${VERSION}-${ARCH}.AppImage"
  APPIMAGE_PATH="${INSTALL_DIR}/crowbyte.AppImage"

  mkdir -p "${INSTALL_DIR}"

  info "Downloading from ${APPIMAGE_URL}..."
  curl -fSL -o "${APPIMAGE_PATH}" "${APPIMAGE_URL}" || {
    err "Download failed. Check your internet connection or try --docker instead."
    exit 1
  }

  chmod +x "${APPIMAGE_PATH}"

  # Symlink to PATH
  ln -sf "${APPIMAGE_PATH}" "${BIN_LINK}"

  # Desktop entry
  cat > "${DESKTOP_FILE}" << DESKTOPEOF
[Desktop Entry]
Name=CrowByte Terminal
Comment=Offensive Security Command Center
Exec=${APPIMAGE_PATH} %u
Icon=crowbyte
Terminal=false
Type=Application
Categories=Security;System;Development;
Keywords=security;pentest;hacking;vulnerability;
StartupWMClass=CrowByte
DESKTOPEOF

  log "AppImage installed to ${APPIMAGE_PATH}"
  info "Launch: crowbyte"
}

install_deb() {
  log "Installing .deb package..."

  DEB_URL="${DOWNLOAD_BASE}/crowbyte_${VERSION}_amd64.deb"
  DEB_PATH="/tmp/crowbyte_${VERSION}_amd64.deb"

  info "Downloading from ${DEB_URL}..."
  curl -fSL -o "${DEB_PATH}" "${DEB_URL}" || {
    err "Download failed."
    exit 1
  }

  apt-get install -y "${DEB_PATH}"
  rm -f "${DEB_PATH}"

  log ".deb package installed"
  info "Launch: crowbyte"
}

install_deps() {
  log "Installing system dependencies..."

  case "${PKG_MANAGER}" in
    apt)
      apt-get update
      apt-get install -y --no-install-recommends \
        nmap curl git ca-certificates \
        libgtk-3-0 libnss3 libxss1 libgbm1 libasound2
      ;;
    dnf|yum)
      ${PKG_MANAGER} install -y \
        nmap curl git ca-certificates \
        gtk3 nss libXScrnSaver libgbm alsa-lib
      ;;
    pacman)
      pacman -Sy --noconfirm \
        nmap curl git \
        gtk3 nss libxss
      ;;
    *)
      warn "Unknown package manager — install nmap, curl, git manually"
      ;;
  esac
}

# ─── EULA ────────────────────────────────────────────────────────────────────

show_eula() {
  echo ""
  echo -e "${WHITE}╔══════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${WHITE}║              END USER LICENSE AGREEMENT                     ║${NC}"
  echo -e "${WHITE}╚══════════════════════════════════════════════════════════════╝${NC}"
  echo ""
  echo -e "${YELLOW}DUAL-USE SOFTWARE WARNING${NC}"
  echo ""
  echo "CrowByte Terminal contains offensive security tools that can"
  echo "damage target systems. You MUST obtain explicit, written"
  echo "authorization from system owners before any testing."
  echo ""
  echo "By installing, you agree to:"
  echo "  - The End User License Agreement (EULA)"
  echo "  - The Acceptable Use Policy (AUP)"
  echo "  - The Privacy Policy"
  echo ""
  echo "Full legal documents: https://crowbyte.io/legal"
  echo ""

  if [ -t 0 ]; then
    # Interactive terminal — ask for acceptance
    read -p "Do you accept the EULA and AUP? (yes/no): " ACCEPT
    if [ "${ACCEPT,,}" != "yes" ]; then
      err "You must accept the EULA to install CrowByte."
      exit 1
    fi
    log "EULA accepted"
  else
    # Non-interactive (piped install) — assume acceptance
    warn "Non-interactive install — EULA acceptance assumed."
    warn "By proceeding, you accept the EULA, AUP, and Privacy Policy."
  fi
}

# ─── Main ────────────────────────────────────────────────────────────────────

main() {
  banner
  check_root
  detect_os
  detect_package_manager

  # Parse args
  METHOD="${1:-auto}"

  show_eula

  case "${METHOD}" in
    --docker)
      install_docker
      ;;
    --appimage)
      install_deps
      install_appimage
      ;;
    --deb)
      install_deb
      ;;
    auto|*)
      # Auto-detect best method
      if command -v docker &>/dev/null; then
        info "Docker detected — using Docker installation (recommended)"
        install_docker
      elif [ "${PKG_MANAGER}" = "apt" ]; then
        info "Debian/Ubuntu detected — using .deb package"
        install_deps
        install_deb
      else
        info "Using AppImage (universal)"
        install_deps
        install_appimage
      fi
      ;;
  esac

  echo ""
  echo -e "${GREEN}══════════════════════════════════════════${NC}"
  echo -e "${GREEN}  CrowByte Terminal installed!${NC}"
  echo -e "${GREEN}══════════════════════════════════════════${NC}"
  echo ""
  echo "  Documentation: https://crowbyte.io/docs"
  echo "  Support:       support@crowbyte.io"
  echo "  Security:      security@crowbyte.io"
  echo ""
}

main "$@"
