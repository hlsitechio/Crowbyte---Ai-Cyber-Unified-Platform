#!/bin/bash
###############################################################################
# CrowByte Server — Deployment Script
#
# Deploys the web server on Ubuntu 24.04 VPS
# Run as root: bash deploy.sh
###############################################################################

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m'

log() { echo -e "${CYAN}[*]${NC} $1"; }
ok()  { echo -e "${GREEN}[+]${NC} $1"; }
err() { echo -e "${RED}[-]${NC} $1"; }

INSTALL_DIR="/opt/crowbyte/server"
DESKTOP_DIR="/opt/crowbyte/desktop"
CONFIG_DIR="/etc/crowbyte"
SSL_DIR="/etc/crowbyte/ssl"

# Must be root
[[ $EUID -ne 0 ]] && { err "Run as root"; exit 1; }

echo "=========================================="
echo "  CrowByte Server — Deployment"
echo "  $(date)"
echo "=========================================="
echo ""

# ─── Phase 1: System deps ──────────────────────────────────────────────────

log "Phase 1: System dependencies"

apt-get update -qq
apt-get install -y -qq nginx certbot python3-certbot-nginx \
    build-essential python3 python3-pip \
    nmap curl git procps iproute2 dnsutils whois net-tools \
    ca-certificates gnupg lsb-release 2>/dev/null

# Node.js 20 (if not already installed)
if ! command -v node &>/dev/null || [[ $(node -v | cut -d. -f1 | tr -d v) -lt 20 ]]; then
    log "Installing Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi

ok "System deps ready — Node $(node -v)"

# ─── Phase 2: Go + Security tools ──────────────────────────────────────────

log "Phase 2: Security tools"

if ! command -v go &>/dev/null; then
    ARCH=$(dpkg --print-architecture)
    curl -sL "https://go.dev/dl/go1.23.6.linux-${ARCH}.tar.gz" | tar xz -C /usr/local
    export PATH="/usr/local/go/bin:/root/go/bin:$PATH"
    echo 'export PATH="/usr/local/go/bin:/root/go/bin:$PATH"' >> /etc/profile.d/golang.sh
fi

# Install ProjectDiscovery + security tools
for tool in \
    "github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest" \
    "github.com/projectdiscovery/httpx/cmd/httpx@latest" \
    "github.com/projectdiscovery/subfinder/v2/cmd/subfinder@latest" \
    "github.com/projectdiscovery/katana/cmd/katana@latest" \
    "github.com/projectdiscovery/dnsx/cmd/dnsx@latest" \
    "github.com/projectdiscovery/naabu/v2/cmd/naabu@latest" \
    "github.com/ffuf/ffuf/v2@latest" \
    "github.com/hahwul/dalfox/v2@latest" \
    "github.com/lc/gau/v2/cmd/gau@latest" \
    "github.com/tomnomnom/waybackurls@latest"; do
    bin=$(basename "${tool%%@*}" | sed 's|.*/||')
    if ! command -v "$bin" &>/dev/null; then
        log "Installing $bin..."
        go install "$tool" 2>/dev/null || true
    fi
done

# Python tools
pip3 install --break-system-packages sqlmap 2>/dev/null || true

# SecLists
if [[ ! -d /usr/share/seclists ]]; then
    log "Downloading SecLists..."
    git clone --depth 1 https://github.com/danielmiessler/SecLists.git /usr/share/seclists 2>/dev/null || true
fi

ok "Security tools installed"

# ─── Phase 3: Docker ───────────────────────────────────────────────────────

log "Phase 3: Docker"

if ! command -v docker &>/dev/null; then
    curl -fsSL https://get.docker.com | sh
fi
systemctl enable --now docker
ok "Docker $(docker --version | awk '{print $3}' | tr -d ',')"

# ─── Phase 4: CrowByte user ───────────────────────────────────────────────

log "Phase 4: User setup"

if ! id crowbyte &>/dev/null; then
    useradd -m -s /bin/bash -G docker,sudo crowbyte
    echo "crowbyte:crowbyte" | chpasswd
fi
usermod -aG docker crowbyte 2>/dev/null || true

ok "User 'crowbyte' ready"

# ─── Phase 5: Deploy CrowByte Server ──────────────────────────────────────

log "Phase 5: Deploy CrowByte Server"

mkdir -p "$INSTALL_DIR" "$DESKTOP_DIR" "$CONFIG_DIR" "$SSL_DIR"

# Copy server files
if [[ -d "$(dirname "$0")/src" ]]; then
    cp -r "$(dirname "$0")"/* "$INSTALL_DIR/"
else
    err "Server source not found — run from apps/server/ directory"
    exit 1
fi

# Copy desktop dist if available
if [[ -d "$(dirname "$0")/../desktop/dist" ]]; then
    cp -r "$(dirname "$0")/../desktop/dist" "$DESKTOP_DIR/"
    ok "Desktop dist copied"
fi

# Install server deps
cd "$INSTALL_DIR"
npm install --production 2>/dev/null
npm run build 2>/dev/null || npx tsc 2>/dev/null

ok "Server built"

# ─── Phase 6: SSL ─────────────────────────────────────────────────────────

log "Phase 6: SSL certificates"

if [[ ! -f "$SSL_DIR/cert.pem" ]]; then
    openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
        -keyout "$SSL_DIR/key.pem" \
        -out "$SSL_DIR/cert.pem" \
        -subj "/C=US/ST=Cyber/L=Cloud/O=CrowByte/CN=$(hostname)" 2>/dev/null
    ok "Self-signed cert generated"
else
    ok "SSL cert exists"
fi

# ─── Phase 7: Config ──────────────────────────────────────────────────────

log "Phase 7: Configuration"

if [[ ! -f "$CONFIG_DIR/crowbyte.env" ]]; then
    JWT_SECRET=$(openssl rand -hex 32)
    cat > "$CONFIG_DIR/crowbyte.env" <<EOF
# CrowByte Server Configuration
NODE_ENV=production
PORT=3000

# Auth
CROWBYTE_USER=admin
CROWBYTE_PASS=\$(openssl rand -base64 16)
JWT_SECRET=$JWT_SECRET

# SSL (nginx handles this, but server can too)
# SSL_CERT=/etc/crowbyte/ssl/cert.pem
# SSL_KEY=/etc/crowbyte/ssl/key.pem

# Supabase (optional — cloud sync)
# SUPABASE_URL=
# SUPABASE_ANON_KEY=

# VPS Agent Swarm (optional)
# OPENCLAW_GATEWAY=
# OPENCLAW_PASSWORD=
EOF
    ok "Config written to $CONFIG_DIR/crowbyte.env"
else
    ok "Config exists"
fi

# Fix ownership
chown -R crowbyte:crowbyte "$INSTALL_DIR" "$DESKTOP_DIR" "$CONFIG_DIR"

# ─── Phase 8: Systemd + Nginx ─────────────────────────────────────────────

log "Phase 8: Services"

# Systemd service
cp "$INSTALL_DIR/crowbyte-server.service" /etc/systemd/system/
systemctl daemon-reload
systemctl enable crowbyte-server

# Nginx
cp "$INSTALL_DIR/nginx-crowbyte.conf" /etc/nginx/sites-available/crowbyte
ln -sf /etc/nginx/sites-available/crowbyte /etc/nginx/sites-enabled/crowbyte
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx

# Start CrowByte
systemctl start crowbyte-server

ok "Services started"

# ─── Phase 9: Firewall ────────────────────────────────────────────────────

log "Phase 9: Firewall"

ufw allow 22/tcp   2>/dev/null || true
ufw allow 80/tcp   2>/dev/null || true
ufw allow 443/tcp  2>/dev/null || true
ufw --force enable 2>/dev/null || true

ok "Firewall configured (22, 80, 443)"

# ─── Done ──────────────────────────────────────────────────────────────────

IP=$(hostname -I | awk '{print $1}')
echo ""
echo "=========================================="
echo "  CrowByte Server is LIVE"
echo "=========================================="
echo ""
echo "  URL:   https://$IP"
echo "  Login: Check $CONFIG_DIR/crowbyte.env"
echo ""
echo "  Commands:"
echo "    systemctl status crowbyte-server"
echo "    journalctl -u crowbyte-server -f"
echo "    crowbyte status"
echo ""
echo "=========================================="
