#!/bin/bash
# CrowByte Fleet Agent Installer
# Usage: curl -sSL https://<server>/agent/install.sh | sudo CROWBYTE_SERVER=https://... CROWBYTE_API_KEY=<key> bash
set -e

AGENT_VERSION="1.0.0"
INSTALL_DIR="/opt/crowbyte"
CONFIG_DIR="/etc/crowbyte"
SERVICE_NAME="crowbyte-agent"
AGENT_SCRIPT="$INSTALL_DIR/crowbyte-agent.py"
CONFIG_FILE="$CONFIG_DIR/agent.conf"

# ─── Colors ───────────────────────────────────────────────────────────────────

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log()  { echo -e "${CYAN}[*]${NC} $1"; }
ok()   { echo -e "${GREEN}[+]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
fail() { echo -e "${RED}[-]${NC} $1"; exit 1; }

# ─── Root Check ───────────────────────────────────────────────────────────────

if [ "$(id -u)" -ne 0 ]; then
    fail "Must run as root (use sudo)"
fi

# ─── Banner ───────────────────────────────────────────────────────────────────

echo ""
echo -e "${CYAN}  ╔══════════════════════════════════════╗${NC}"
echo -e "${CYAN}  ║    CrowByte Fleet Agent v${AGENT_VERSION}      ║${NC}"
echo -e "${CYAN}  ╠══════════════════════════════════════╣${NC}"
echo -e "${CYAN}  ║  Lightweight System Monitor Daemon   ║${NC}"
echo -e "${CYAN}  ╚══════════════════════════════════════╝${NC}"
echo ""

# ─── Python 3 Check ──────────────────────────────────────────────────────────

if ! command -v python3 &>/dev/null; then
    log "Python 3 not found. Installing..."
    if command -v apt-get &>/dev/null; then
        apt-get update -qq && apt-get install -y -qq python3 >/dev/null 2>&1
    elif command -v yum &>/dev/null; then
        yum install -y -q python3 >/dev/null 2>&1
    elif command -v pacman &>/dev/null; then
        pacman -Sy --noconfirm python >/dev/null 2>&1
    else
        fail "Cannot install Python 3. Install it manually and re-run."
    fi
    ok "Python 3 installed"
fi

PYTHON=$(command -v python3)
ok "Python 3 found: $PYTHON"

# ─── Server URL ───────────────────────────────────────────────────────────────

SERVER_URL="${CROWBYTE_SERVER:-}"
if [ -z "$SERVER_URL" ]; then
    read -rp "CrowByte Server URL (e.g., https://147.93.44.58): " SERVER_URL
fi

if [ -z "$SERVER_URL" ]; then
    fail "Server URL is required"
fi

# Strip trailing slash
SERVER_URL="${SERVER_URL%/}"

# ─── API Key ──────────────────────────────────────────────────────────────────

API_KEY="${CROWBYTE_API_KEY:-}"
if [ -z "$API_KEY" ]; then
    read -rp "Fleet API Key: " API_KEY
fi

if [ -z "$API_KEY" ]; then
    fail "API Key is required"
fi

# ─── Download Agent ───────────────────────────────────────────────────────────

log "Creating directories..."
mkdir -p "$INSTALL_DIR" "$CONFIG_DIR"

log "Downloading agent from $SERVER_URL/agent/crowbyte-agent.py..."
if command -v curl &>/dev/null; then
    curl -sSLk "$SERVER_URL/agent/crowbyte-agent.py" -o "$AGENT_SCRIPT"
elif command -v wget &>/dev/null; then
    wget -q --no-check-certificate "$SERVER_URL/agent/crowbyte-agent.py" -O "$AGENT_SCRIPT"
else
    fail "Neither curl nor wget found. Install one and re-run."
fi

chmod +x "$AGENT_SCRIPT"
ok "Agent downloaded: $AGENT_SCRIPT"

# ─── Config File ──────────────────────────────────────────────────────────────

log "Writing config to $CONFIG_FILE..."
cat > "$CONFIG_FILE" <<EOF
{
    "server_url": "$SERVER_URL",
    "api_key": "$API_KEY",
    "interval": 30
}
EOF
chmod 600 "$CONFIG_FILE"
ok "Config written (mode 600)"

# ─── Test Agent ───────────────────────────────────────────────────────────────

log "Testing agent metrics collection..."
$PYTHON "$AGENT_SCRIPT" --test
echo ""

# ─── Systemd Service ─────────────────────────────────────────────────────────

log "Creating systemd service..."
cat > "/etc/systemd/system/${SERVICE_NAME}.service" <<EOF
[Unit]
Description=CrowByte Fleet Agent
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
ExecStart=$PYTHON $AGENT_SCRIPT
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=crowbyte-agent

# Security hardening
NoNewPrivileges=yes
ProtectSystem=strict
ProtectHome=read-only
ReadOnlyPaths=/
ReadWritePaths=/tmp
PrivateTmp=yes

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable "$SERVICE_NAME"
systemctl start "$SERVICE_NAME"

ok "Service installed and started"

# ─── Verify ───────────────────────────────────────────────────────────────────

sleep 2
if systemctl is-active --quiet "$SERVICE_NAME"; then
    ok "Agent is running!"
    echo ""
    echo -e "${GREEN}  ╔══════════════════════════════════════╗${NC}"
    echo -e "${GREEN}  ║       Installation Complete!         ║${NC}"
    echo -e "${GREEN}  ╠══════════════════════════════════════╣${NC}"
    echo -e "${GREEN}  ║  Agent: $AGENT_SCRIPT${NC}"
    echo -e "${GREEN}  ║  Config: $CONFIG_FILE${NC}"
    echo -e "${GREEN}  ║  Service: $SERVICE_NAME${NC}"
    echo -e "${GREEN}  ╠══════════════════════════════════════╣${NC}"
    echo -e "${GREEN}  ║  Status:  systemctl status $SERVICE_NAME${NC}"
    echo -e "${GREEN}  ║  Logs:    journalctl -u $SERVICE_NAME -f${NC}"
    echo -e "${GREEN}  ║  Stop:    systemctl stop $SERVICE_NAME${NC}"
    echo -e "${GREEN}  ║  Remove:  systemctl disable $SERVICE_NAME${NC}"
    echo -e "${GREEN}  ╚══════════════════════════════════════╝${NC}"
    echo ""
else
    warn "Service may have failed to start. Check: journalctl -u $SERVICE_NAME -n 20"
fi
