#!/bin/bash
###############################################################################
# CrowByte OS — Ubuntu 24.04 LTS → Security Appliance Transformer
#
# Transforms a bare Ubuntu 24.04 Server into CrowByte OS:
#   - Minimal Xorg (no DE bloat)
#   - CrowByte Terminal as the desktop shell (Electron kiosk)
#   - Full offensive security toolkit
#   - XRDP + noVNC remote access
#   - Docker Engine for containerized workloads
#   - Claude Code CLI for AI operations
#
# Usage:
#   curl -fsSL https://crowbyte.io/os-setup.sh | sudo bash
#   # OR
#   sudo ./crowbyte-os-setup.sh
#
# Requirements: Ubuntu 24.04 LTS (Server), root access, 4GB+ RAM
###############################################################################

set -euo pipefail

# ─── Config ──────────────────────────────────────────────────────────────────

VERSION="2.0.0"
PRODUCT="CrowByte OS"
CROWBYTE_USER="crowbyte"
CROWBYTE_HOME="/home/${CROWBYTE_USER}"
CROWBYTE_APP="/opt/crowbyte"
CROWBYTE_CONFIG="/etc/crowbyte"
NODE_VERSION="20"
GO_VERSION="1.23.6"
DOCKER_IMAGE="hlsitech/crowbyte:latest"

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
  cat << 'EOF'
   ██████╗██████╗  ██████╗ ██╗    ██╗██████╗ ██╗   ██╗████████╗███████╗
  ██╔════╝██╔══██╗██╔═══██╗██║    ██║██╔══██╗╚██╗ ██╔╝╚══██╔══╝██╔════╝
  ██║     ██████╔╝██║   ██║██║ █╗ ██║██████╔╝ ╚████╔╝    ██║   █████╗
  ██║     ██╔══██╗██║   ██║██║███╗██║██╔══██╗  ╚██╔╝     ██║   ██╔══╝
  ╚██████╗██║  ██║╚██████╔╝╚███╔███╔╝██████╔╝   ██║      ██║   ███████╗
   ╚═════╝╚═╝  ╚═╝ ╚═════╝  ╚══╝╚══╝ ╚═════╝    ╚═╝      ╚═╝   ╚══════╝
EOF
  echo -e "  ${WHITE}OS Installer v${VERSION} — Offensive Security Appliance${NC}"
  echo -e "  ${WHITE}HLSITech — crowbyte.io${NC}"
  echo -e "${NC}"
}

log()  { echo -e "${GREEN}[+]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[-]${NC} $1"; }
info() { echo -e "${CYAN}[*]${NC} $1"; }
step() { echo -e "\n${WHITE}════════════════════════════════════════════════════════${NC}"; echo -e "${WHITE}  $1${NC}"; echo -e "${WHITE}════════════════════════════════════════════════════════${NC}\n"; }

check_ubuntu() {
  if ! grep -q "Ubuntu 24" /etc/os-release 2>/dev/null; then
    err "This script requires Ubuntu 24.04 LTS"
    err "Detected: $(cat /etc/os-release | grep PRETTY_NAME | cut -d= -f2)"
    exit 1
  fi
  if [ "$EUID" -ne 0 ]; then
    err "Must run as root (sudo)"
    exit 1
  fi
  log "Ubuntu 24.04 LTS detected"
}

# ─── Phase 1: System Base ───────────────────────────────────────────────────

install_system_base() {
  step "Phase 1/7 — System Base"

  info "Updating system packages..."
  apt-get update -qq
  DEBIAN_FRONTEND=noninteractive apt-get upgrade -y -qq

  info "Installing base packages..."
  DEBIAN_FRONTEND=noninteractive apt-get install -y -qq \
    build-essential software-properties-common apt-transport-https \
    ca-certificates gnupg lsb-release \
    curl wget git unzip zip jq htop tmux vim nano \
    net-tools iproute2 dnsutils whois traceroute mtr-tiny \
    procps lsof strace ltrace sysstat iotop \
    openssh-server ufw fail2ban \
    python3 python3-pip python3-venv python3-dev \
    libffi-dev libssl-dev libxml2-dev libxslt1-dev

  log "System base installed"
}

# ─── Phase 2: Display Server (Minimal Xorg) ─────────────────────────────────

install_display_server() {
  step "Phase 2/7 — Display Server (Minimal Xorg)"

  info "Installing Xorg + minimal window manager..."
  DEBIAN_FRONTEND=noninteractive apt-get install -y -qq \
    xorg xserver-xorg-core xinit x11-xserver-utils x11-utils \
    xauth dbus-x11 xdg-utils \
    openbox obconf \
    libgtk-3-0 libnotify4 libnss3 libxss1 libxtst6 \
    libatspi2.0-0 libdrm2 libgbm1 libasound2t64 libcups2 \
    libxcomposite1 libxdamage1 libxrandr2 libpango-1.0-0 \
    libcairo2 fonts-liberation2 fonts-noto-color-emoji \
    compton feh

  log "Display server installed (Xorg + Openbox)"
}

# ─── Phase 3: Remote Access (XRDP + noVNC) ──────────────────────────────────

install_remote_access() {
  step "Phase 3/7 — Remote Access (XRDP + VNC + noVNC)"

  info "Installing XRDP..."
  DEBIAN_FRONTEND=noninteractive apt-get install -y -qq \
    xrdp x11vnc novnc websockify

  # Configure XRDP
  info "Configuring XRDP..."
  systemctl enable xrdp
  sed -i 's/^port=3389/port=3389/' /etc/xrdp/xrdp.ini

  # Allow XRDP through firewall
  ufw allow 3389/tcp comment "XRDP"
  ufw allow 6080/tcp comment "noVNC"
  ufw allow 22/tcp comment "SSH"

  # Create noVNC systemd service
  cat > /etc/systemd/system/crowbyte-novnc.service << 'EOF'
[Unit]
Description=CrowByte noVNC WebSocket Proxy
After=network.target x11vnc.service

[Service]
Type=simple
User=root
ExecStart=/usr/bin/websockify --web /usr/share/novnc 6080 localhost:5900
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

  # Create x11vnc systemd service
  cat > /etc/systemd/system/crowbyte-vnc.service << 'EOF'
[Unit]
Description=CrowByte VNC Server
After=display-manager.service

[Service]
Type=simple
User=root
Environment=DISPLAY=:0
ExecStart=/usr/bin/x11vnc -display :0 -forever -shared -rfbport 5900 -noxrecord -noxfixes -noxdamage -nopw
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

  systemctl daemon-reload
  systemctl enable crowbyte-vnc crowbyte-novnc

  log "Remote access configured (XRDP :3389, noVNC :6080)"
}

# ─── Phase 4: Node.js + Electron + CrowByte App ─────────────────────────────

install_crowbyte_app() {
  step "Phase 4/7 — CrowByte Terminal Application"

  # Install Node.js 20
  info "Installing Node.js ${NODE_VERSION}..."
  curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
  apt-get install -y -qq nodejs

  # Create app directory
  mkdir -p "${CROWBYTE_APP}" "${CROWBYTE_CONFIG}"

  # Clone and build CrowByte
  info "Cloning CrowByte Terminal..."
  if [ -d "${CROWBYTE_APP}/src" ]; then
    cd "${CROWBYTE_APP}/src" && git pull
  else
    git clone https://github.com/hlsitechio/crowbyte.git "${CROWBYTE_APP}/src"
  fi

  info "Installing dependencies..."
  cd "${CROWBYTE_APP}/src/apps/desktop"
  npm install --legacy-peer-deps 2>/dev/null || npm install

  info "Building CrowByte..."
  npx vite build

  # Create launcher script
  cat > /usr/local/bin/crowbyte << 'LAUNCHER'
#!/bin/bash
###############################################################################
# CrowByte Terminal — Native Launcher
###############################################################################

export DISPLAY="${DISPLAY:-:0}"
export ELECTRON_DISABLE_SECURITY_WARNINGS=true
export ELECTRON_NO_ATTACH_CONSOLE=true
export NODE_ENV=production

# Source env if exists
[ -f /etc/crowbyte/crowbyte.env ] && source /etc/crowbyte/crowbyte.env

APP_DIR="/opt/crowbyte/src/apps/desktop"

case "${1:-launch}" in
  launch|start)
    cd "$APP_DIR"
    exec npx electron electron/main.cjs \
      --no-sandbox \
      --disable-gpu-sandbox \
      --enable-features=UseOzonePlatform \
      --ozone-platform=x11 \
      "$@"
    ;;
  kiosk)
    cd "$APP_DIR"
    exec npx electron electron/main.cjs \
      --no-sandbox \
      --disable-gpu-sandbox \
      --kiosk \
      --enable-features=UseOzonePlatform \
      --ozone-platform=x11
    ;;
  update)
    echo "[*] Updating CrowByte..."
    cd /opt/crowbyte/src
    git pull
    cd apps/desktop
    npm install --legacy-peer-deps 2>/dev/null || npm install
    npx vite build
    echo "[+] CrowByte updated. Restart to apply."
    ;;
  config)
    ${EDITOR:-nano} /etc/crowbyte/crowbyte.env
    ;;
  status)
    echo "[*] CrowByte OS Status"
    echo "  App:    $(pgrep -f 'electron.*main.cjs' >/dev/null && echo 'RUNNING' || echo 'STOPPED')"
    echo "  XRDP:   $(systemctl is-active xrdp)"
    echo "  VNC:    $(systemctl is-active crowbyte-vnc)"
    echo "  noVNC:  $(systemctl is-active crowbyte-novnc)"
    echo "  Docker: $(systemctl is-active docker 2>/dev/null || echo 'not installed')"
    ;;
  version)
    echo "CrowByte OS v2.0.0 — HLSITech"
    ;;
  *)
    echo "Usage: crowbyte {launch|kiosk|update|config|status|version}"
    ;;
esac
LAUNCHER
  chmod +x /usr/local/bin/crowbyte

  # Create default config
  cat > "${CROWBYTE_CONFIG}/crowbyte.env" << 'ENVEOF'
# CrowByte OS — Configuration
# Edit with: crowbyte config

# ─── Database ───────────────────────────────────────
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=

# ─── VPS Agent Swarm ────────────────────────────────
VITE_OPENCLAW_HOST=
VITE_VPS_IP=

# ─── External APIs ─────────────────────────────────
VITE_SHODAN_API_KEY=
VITE_NVD_API_KEY=
VITE_TAVILY_API_KEY=

# ─── Display ───────────────────────────────────────
RESOLUTION=1920x1080
ENVEOF

  log "CrowByte Terminal installed to ${CROWBYTE_APP}"
}

# ─── Phase 5: Security Toolkit ──────────────────────────────────────────────

install_security_tools() {
  step "Phase 5/7 — Offensive Security Toolkit"

  # ── Network scanners ──
  info "Installing network tools..."
  apt-get install -y -qq nmap masscan netcat-openbsd socat

  # ── Web tools ──
  info "Installing web tools..."
  apt-get install -y -qq nikto dirb wfuzz

  # ── Python tools ──
  info "Installing Python security tools..."
  pip3 install --break-system-packages \
    sqlmap \
    wfuzz \
    requests \
    beautifulsoup4 \
    paramiko \
    pwntools 2>/dev/null || true

  # ── Go tools (ProjectDiscovery + more) ──
  info "Installing Go ${GO_VERSION}..."
  ARCH=$(dpkg --print-architecture)
  curl -sL "https://go.dev/dl/go${GO_VERSION}.linux-${ARCH}.tar.gz" | tar xz -C /usr/local
  export PATH="/usr/local/go/bin:/root/go/bin:${PATH}"

  info "Installing Go security tools..."
  # ProjectDiscovery suite
  go install github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest 2>/dev/null || true
  go install github.com/projectdiscovery/httpx/cmd/httpx@latest 2>/dev/null || true
  go install github.com/projectdiscovery/subfinder/v2/cmd/subfinder@latest 2>/dev/null || true
  go install github.com/projectdiscovery/katana/cmd/katana@latest 2>/dev/null || true
  go install github.com/projectdiscovery/naabu/v2/cmd/naabu@latest 2>/dev/null || true
  go install github.com/projectdiscovery/dnsx/cmd/dnsx@latest 2>/dev/null || true
  go install github.com/projectdiscovery/uncover/cmd/uncover@latest 2>/dev/null || true

  # Fuzzing + discovery
  go install github.com/ffuf/ffuf/v2@latest 2>/dev/null || true
  go install github.com/tomnomnom/waybackurls@latest 2>/dev/null || true
  go install github.com/tomnomnom/gf@latest 2>/dev/null || true
  go install github.com/tomnomnom/assetfinder@latest 2>/dev/null || true
  go install github.com/lc/gau/v2/cmd/gau@latest 2>/dev/null || true

  # XSS + web vuln
  go install github.com/hahwul/dalfox/v2@latest 2>/dev/null || true
  go install github.com/epi052/feroxbuster@latest 2>/dev/null || true

  # Symlink Go binaries to PATH
  ln -sf /root/go/bin/* /usr/local/bin/ 2>/dev/null || true

  # ── SecLists ──
  info "Installing SecLists wordlists..."
  if [ ! -d /usr/share/seclists ]; then
    git clone --depth 1 https://github.com/danielmiessler/SecLists.git /usr/share/seclists
  fi

  # ── Nuclei templates ──
  info "Updating Nuclei templates..."
  nuclei -update-templates 2>/dev/null || true

  log "Security toolkit installed ($(ls /usr/local/bin/ | wc -l) tools)"
}

# ─── Phase 6: Docker Engine ─────────────────────────────────────────────────

install_docker() {
  step "Phase 6/7 — Docker Engine"

  if command -v docker &>/dev/null; then
    log "Docker already installed: $(docker --version)"
    return
  fi

  info "Installing Docker..."
  curl -fsSL https://get.docker.com | sh

  # Add crowbyte user to docker group
  usermod -aG docker "${CROWBYTE_USER}" 2>/dev/null || true

  # Install Docker Compose plugin
  apt-get install -y -qq docker-compose-plugin

  systemctl enable docker
  systemctl start docker

  # Pre-pull CrowByte image
  info "Pulling CrowByte Docker image..."
  docker pull "${DOCKER_IMAGE}" 2>/dev/null || warn "Docker pull failed — image not yet published"

  log "Docker installed: $(docker --version)"
}

# ─── Phase 7: CrowByte Session + Auto-Login ─────────────────────────────────

configure_desktop_session() {
  step "Phase 7/7 — CrowByte Desktop Session"

  # Create crowbyte user if needed
  if ! id "${CROWBYTE_USER}" &>/dev/null; then
    info "Creating crowbyte system user..."
    useradd -m -s /bin/bash -G sudo,docker "${CROWBYTE_USER}"
    echo "${CROWBYTE_USER}:crowbyte" | chpasswd
    warn "Default password set to 'crowbyte' — CHANGE THIS!"
  fi

  # ── Custom Xsession: CrowByte as the desktop ──
  mkdir -p /usr/share/xsessions

  cat > /usr/share/xsessions/crowbyte.desktop << 'EOF'
[Desktop Entry]
Name=CrowByte OS
Comment=Offensive Security Command Center
Exec=/usr/local/bin/crowbyte-session
Type=Application
DesktopNames=CrowByte
EOF

  # Session startup script
  cat > /usr/local/bin/crowbyte-session << 'SESSION'
#!/bin/bash
###############################################################################
# CrowByte OS — Desktop Session
# Launched by display manager as the "window manager"
###############################################################################

export DISPLAY="${DISPLAY:-:0}"

# Source config
[ -f /etc/crowbyte/crowbyte.env ] && source /etc/crowbyte/crowbyte.env

# Set wallpaper (solid dark)
xsetroot -solid "#09090b"

# Disable screen blanking
xset s off -dpms

# Start Openbox as a lightweight container for Electron
openbox --config-file /etc/crowbyte/openbox-rc.xml &
sleep 1

# Launch CrowByte in kiosk mode
exec /usr/local/bin/crowbyte kiosk
SESSION
  chmod +x /usr/local/bin/crowbyte-session

  # Minimal Openbox config (no decorations, no menus)
  mkdir -p "${CROWBYTE_CONFIG}"
  cat > "${CROWBYTE_CONFIG}/openbox-rc.xml" << 'OBXML'
<?xml version="1.0" encoding="UTF-8"?>
<openbox_config xmlns="http://openbox.org/3.4/rc">
  <resistance><strength>10</strength><screen_edge_strength>20</screen_edge_strength></resistance>
  <focus><focusNew>yes</focusNew><followMouse>no</followMouse></focus>
  <placement><policy>Smart</policy></placement>
  <theme>
    <name>Clearlooks</name>
    <titleLayout></titleLayout>
    <keepBorder>no</keepBorder>
    <animateIconify>no</animateIconify>
  </theme>
  <desktops><number>1</number></desktops>
  <applications>
    <!-- CrowByte fullscreen, no decorations -->
    <application class="*">
      <decor>no</decor>
      <maximized>yes</maximized>
      <focus>yes</focus>
    </application>
  </applications>
</openbox_config>
OBXML

  # ── Auto-login via getty (no display manager needed) ──
  info "Configuring auto-login..."
  mkdir -p /etc/systemd/system/getty@tty1.service.d
  cat > /etc/systemd/system/getty@tty1.service.d/autologin.conf << EOF
[Service]
ExecStart=
ExecStart=-/sbin/agetty --autologin ${CROWBYTE_USER} --noclear %I \$TERM
EOF

  # Auto-start X + CrowByte on login
  cat > "${CROWBYTE_HOME}/.bash_profile" << 'PROFILE'
# CrowByte OS — Auto-start desktop session
if [ -z "$DISPLAY" ] && [ "$(tty)" = "/dev/tty1" ]; then
  exec startx /usr/local/bin/crowbyte-session -- :0 vt1 2>/dev/null
fi
PROFILE
  chown "${CROWBYTE_USER}:${CROWBYTE_USER}" "${CROWBYTE_HOME}/.bash_profile"

  # XRDP session config — use CrowByte session
  cat > "${CROWBYTE_HOME}/.xsessionrc" << 'XSESSION'
export DISPLAY=:0
export XDG_SESSION_TYPE=x11
XSESSION
  cat > "${CROWBYTE_HOME}/.xsession" << 'XSESSION'
exec /usr/local/bin/crowbyte-session
XSESSION
  chown "${CROWBYTE_USER}:${CROWBYTE_USER}" "${CROWBYTE_HOME}/.xsessionrc" "${CROWBYTE_HOME}/.xsession"

  log "CrowByte desktop session configured"
  log "Auto-login enabled on tty1"
}

# ─── Hardening ───────────────────────────────────────────────────────────────

harden_system() {
  info "Applying security hardening..."

  # Enable firewall
  ufw --force enable

  # SSH hardening
  sed -i 's/#PermitRootLogin.*/PermitRootLogin prohibit-password/' /etc/ssh/sshd_config
  sed -i 's/#PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config

  # Enable fail2ban
  systemctl enable fail2ban
  systemctl start fail2ban

  # Kernel hardening
  cat >> /etc/sysctl.d/99-crowbyte.conf << 'SYSCTL'
# CrowByte OS — Kernel Hardening
net.ipv4.tcp_syncookies = 1
net.ipv4.conf.all.rp_filter = 1
net.ipv4.conf.default.rp_filter = 1
net.ipv4.conf.all.accept_redirects = 0
net.ipv6.conf.all.accept_redirects = 0
net.ipv4.conf.all.send_redirects = 0
net.ipv4.icmp_echo_ignore_broadcasts = 1
kernel.randomize_va_space = 2
SYSCTL
  sysctl -p /etc/sysctl.d/99-crowbyte.conf 2>/dev/null

  log "System hardened (UFW + fail2ban + kernel params)"
}

# ─── MOTD ────────────────────────────────────────────────────────────────────

install_motd() {
  cat > /etc/motd << 'MOTD'

  ╔══════════════════════════════════════════════════════════╗
  ║              CrowByte OS v2.0.0                         ║
  ║         Offensive Security Appliance                    ║
  ║              HLSITech — crowbyte.io                     ║
  ╠══════════════════════════════════════════════════════════╣
  ║                                                         ║
  ║  Desktop:  crowbyte launch     (or auto on tty1)        ║
  ║  Kiosk:    crowbyte kiosk      (fullscreen mode)        ║
  ║  Status:   crowbyte status                              ║
  ║  Config:   crowbyte config                              ║
  ║  Update:   crowbyte update                              ║
  ║                                                         ║
  ║  RDP:      Connect to port 3389                         ║
  ║  Browser:  http://<ip>:6080                             ║
  ║  SSH:      ssh crowbyte@<ip>                            ║
  ║                                                         ║
  ╚══════════════════════════════════════════════════════════╝

MOTD
}

# ─── Main ────────────────────────────────────────────────────────────────────

main() {
  banner
  check_ubuntu

  START_TIME=$(date +%s)

  install_system_base
  install_display_server
  install_remote_access
  install_crowbyte_app
  install_security_tools
  install_docker
  configure_desktop_session
  harden_system
  install_motd

  END_TIME=$(date +%s)
  ELAPSED=$(( END_TIME - START_TIME ))

  echo ""
  echo -e "${GREEN}══════════════════════════════════════════════════════════${NC}"
  echo -e "${GREEN}  CrowByte OS installed successfully!${NC}"
  echo -e "${GREEN}  Installation time: ${ELAPSED}s${NC}"
  echo -e "${GREEN}══════════════════════════════════════════════════════════${NC}"
  echo ""
  echo "  Access methods:"
  echo "    RDP:     Connect to port 3389 (any RDP client)"
  echo "    Browser: http://$(hostname -I | awk '{print $1}'):6080"
  echo "    SSH:     ssh crowbyte@$(hostname -I | awk '{print $1}')"
  echo ""
  echo "  Commands:"
  echo "    crowbyte launch   — Start desktop"
  echo "    crowbyte kiosk    — Fullscreen mode"
  echo "    crowbyte status   — Show service status"
  echo "    crowbyte config   — Edit configuration"
  echo "    crowbyte update   — Pull latest version"
  echo ""
  echo -e "  ${YELLOW}[!] Default password: crowbyte — CHANGE IT!${NC}"
  echo -e "  ${YELLOW}[!] Run: passwd crowbyte${NC}"
  echo ""
  echo -e "  ${CYAN}Reboot to start CrowByte OS: sudo reboot${NC}"
  echo ""
}

main "$@"
