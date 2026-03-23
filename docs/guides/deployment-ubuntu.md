# CrowByte Terminal -- Ubuntu 24.04 VPS Deployment Guide

Deploy CrowByte Terminal as a web-accessible security command center on an Ubuntu 24.04 VPS. This guide covers the full server deployment where CrowByte runs as a Node.js web server behind nginx, serving the React SPA alongside REST APIs and WebSocket endpoints for terminal access, real-time metrics, and security tool execution.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Architecture](#architecture)
3. [Installation](#installation)
   - [Automated (Recommended)](#automated-installer)
   - [Manual Step-by-Step](#manual-installation)
4. [Server Components](#server-components)
5. [Configuration](#configuration)
6. [Services Management](#services-management)
7. [Firewall](#firewall)
8. [First Run](#first-run)
9. [SSL / TLS](#ssl--tls)
10. [Security Hardening](#security-hardening)
11. [Maintenance](#maintenance)
12. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Hardware

| Spec | Minimum | Recommended (Hostinger KVM 8) |
|------|---------|-------------------------------|
| CPU | 4 cores | 8 vCPU |
| RAM | 8 GB | 32 GB |
| Disk | 100 GB SSD | 400 GB NVMe |
| Network | 1 Gbps | 1 Gbps |

### Software

- **OS**: Ubuntu 24.04 LTS (Server) -- fresh install preferred
- **Access**: Root SSH access
- **Network**: Public IP address, ports 22/80/443 reachable

### Tested VPS Providers

- Hostinger KVM 8 (8 CPU / 32 GB RAM / 400 GB NVMe) -- validated
- Any KVM-based VPS with Ubuntu 24.04 should work (avoid OpenVZ/LXC -- Docker requires KVM)

---

## Architecture

```
                    Internet
                       |
                       v
              +--------+--------+
              |   nginx (443)   |  <-- SSL termination, rate limiting
              |   reverse proxy |
              +--------+--------+
                       |
                       v
              +--------+--------+
              |  Node.js Server |  <-- Port 3000 (localhost only)
              |  CrowByte v1.0  |
              +--------+--------+
              |                 |
    +---------+---------+  +----+----+
    | HTTP API Routes   |  | WebSocket|
    |                   |  |          |
    | /api/auth/*       |  | /ws      |
    |   JWT login/refresh  | ?type=terminal  (node-pty shell)
    |                   |  | ?type=metrics   (live CPU/RAM/net)
    | /api/system/*     |  | ?type=exec      (tool output stream)
    |   CPU, RAM, disk, |  +----------+
    |   network, GPU,   |
    |   docker, services|
    |                   |
    | /api/tools/*      |
    |   execute (24     |
    |   whitelisted     |
    |   binaries), scan |
    |   presets, status  |
    |                   |
    | /api/docker/*     |
    |   containers,     |
    |   images, stats,  |
    |   start/stop/rm   |
    |                   |
    | /api/health       |
    |   uptime, version |
    +---------+---------+
              |
              v
    +---------+---------+
    |  Static Files     |
    |  React SPA (dist/)|  <-- Vite production build
    |  SPA fallback     |
    +-------------------+
```

### Request Flow

1. Browser connects to `https://<VPS-IP>` on port 443
2. nginx terminates SSL and proxies to Node.js on `localhost:3000`
3. Static assets served directly from `dist/` with long cache headers
4. API calls routed to Express route handlers
5. WebSocket upgrades proxied with `Connection: upgrade` headers
6. SPA fallback: all non-API, non-asset routes serve `index.html`

---

## Installation

### Automated Installer

The `crowbyte-os-setup.sh` script transforms a bare Ubuntu 24.04 server into a full CrowByte OS appliance in 7 phases. For a web-only server deployment (no desktop/Xorg), use the `deploy.sh` script from `apps/server/` instead.

#### Full CrowByte OS (Desktop + Web + Tools)

```bash
ssh root@<VPS-IP>

# Download and run the installer
curl -fsSL https://raw.githubusercontent.com/hlsitechio/crowbyte/main/crowbyte-os-setup.sh -o crowbyte-os-setup.sh
chmod +x crowbyte-os-setup.sh
sudo ./crowbyte-os-setup.sh
```

The installer runs 7 phases:

| Phase | What It Does | Time (est.) |
|-------|-------------|-------------|
| 1/7 | System base -- build-essential, Python 3, networking tools, SSH, UFW, fail2ban | 2 min |
| 2/7 | Display server -- Minimal Xorg, Openbox (for local/RDP access) | 2 min |
| 3/7 | Remote access -- XRDP, x11vnc, noVNC | 1 min |
| 4/7 | CrowByte app -- Node.js 20, clone repo, `npm install`, `npx vite build` | 5 min |
| 5/7 | Security toolkit -- Go 1.23, nuclei, httpx, subfinder, ffuf, nmap, sqlmap, SecLists | 10 min |
| 6/7 | Docker Engine + Docker Compose plugin | 2 min |
| 7/7 | Desktop session -- Openbox kiosk, auto-login, XRDP config | 1 min |

Total install time: approximately 20-25 minutes on a fast connection.

#### Web Server Only (No Desktop)

For headless VPS deployments where you only need the web interface:

```bash
ssh root@<VPS-IP>

# Clone the repo
git clone https://github.com/hlsitechio/crowbyte.git /opt/crowbyte/src
cd /opt/crowbyte/src/apps/server

# Run the server deployment script
sudo bash deploy.sh
```

The `deploy.sh` script runs 9 phases:

1. System dependencies (Node.js 20, nginx, certbot, build tools)
2. Go + Security tools (nuclei, httpx, subfinder, ffuf, sqlmap, etc.)
3. Docker Engine
4. CrowByte user creation
5. Server build (copy files, `npm install`, `tsc` compile)
6. SSL certificate generation (self-signed, replace with Let's Encrypt)
7. Configuration (`/etc/crowbyte/crowbyte.env`)
8. Systemd service + nginx reverse proxy
9. Firewall (UFW: 22, 80, 443)

---

### Manual Installation

If you prefer to understand and control each step:

#### Step 1: System Base

```bash
apt-get update && apt-get upgrade -y

apt-get install -y \
    build-essential software-properties-common apt-transport-https \
    ca-certificates gnupg lsb-release \
    curl wget git unzip zip jq htop tmux vim \
    net-tools iproute2 dnsutils whois traceroute \
    procps lsof openssh-server ufw fail2ban \
    python3 python3-pip python3-venv python3-dev \
    libffi-dev libssl-dev nginx certbot python3-certbot-nginx
```

#### Step 2: Node.js 20

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Verify
node -v   # v20.x.x
npm -v    # 10.x.x
```

#### Step 3: Go 1.23 + Security Tools

```bash
# Install Go
ARCH=$(dpkg --print-architecture)
curl -sL "https://go.dev/dl/go1.23.6.linux-${ARCH}.tar.gz" | tar xz -C /usr/local
echo 'export PATH="/usr/local/go/bin:/root/go/bin:$PATH"' >> /etc/profile.d/golang.sh
source /etc/profile.d/golang.sh

# ProjectDiscovery suite
go install github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest
go install github.com/projectdiscovery/httpx/cmd/httpx@latest
go install github.com/projectdiscovery/subfinder/v2/cmd/subfinder@latest
go install github.com/projectdiscovery/katana/cmd/katana@latest
go install github.com/projectdiscovery/naabu/v2/cmd/naabu@latest
go install github.com/projectdiscovery/dnsx/cmd/dnsx@latest

# Fuzzing + discovery
go install github.com/ffuf/ffuf/v2@latest
go install github.com/tomnomnom/waybackurls@latest
go install github.com/lc/gau/v2/cmd/gau@latest
go install github.com/hahwul/dalfox/v2@latest

# Symlink Go binaries
ln -sf /root/go/bin/* /usr/local/bin/

# Python tools
pip3 install --break-system-packages sqlmap

# Nmap
apt-get install -y nmap masscan

# SecLists wordlists
git clone --depth 1 https://github.com/danielmiessler/SecLists.git /usr/share/seclists

# Update nuclei templates
nuclei -update-templates
```

#### Step 4: Docker Engine

```bash
curl -fsSL https://get.docker.com | sh
apt-get install -y docker-compose-plugin
systemctl enable --now docker
```

#### Step 5: Clone and Build CrowByte

```bash
# Create directories
mkdir -p /opt/crowbyte /etc/crowbyte /etc/crowbyte/ssl

# Clone repository
git clone https://github.com/hlsitechio/crowbyte.git /opt/crowbyte/src

# Build the React SPA (desktop frontend)
cd /opt/crowbyte/src/apps/desktop
npm install --legacy-peer-deps
npx vite build
# Output: /opt/crowbyte/src/apps/desktop/dist/

# Build the server
cd /opt/crowbyte/src/apps/server
npm install
npx tsc
# Output: /opt/crowbyte/src/apps/server/dist/
```

#### Step 6: Create System User

```bash
useradd -m -s /bin/bash -G docker,sudo crowbyte
echo "crowbyte:$(openssl rand -base64 16)" | chpasswd
```

#### Step 7: Configuration

```bash
# Generate JWT secret
JWT_SECRET=$(openssl rand -hex 32)

cat > /etc/crowbyte/crowbyte.env << EOF
# CrowByte Server Configuration
NODE_ENV=production
PORT=3000

# Auth (CHANGE THESE)
CROWBYTE_USER=admin
CROWBYTE_PASS=$(openssl rand -base64 16)
JWT_SECRET=${JWT_SECRET}
EOF

# Set ownership
chown -R crowbyte:crowbyte /opt/crowbyte /etc/crowbyte
```

#### Step 8: SSL Certificate

```bash
# Self-signed (for testing)
openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
    -keyout /etc/crowbyte/ssl/key.pem \
    -out /etc/crowbyte/ssl/cert.pem \
    -subj "/C=US/ST=Cyber/L=Cloud/O=CrowByte/CN=$(hostname)"

# Production: use Let's Encrypt (see SSL section below)
```

#### Step 9: Systemd Service

```bash
cat > /etc/systemd/system/crowbyte-server.service << 'EOF'
[Unit]
Description=CrowByte Terminal Server
After=network.target docker.service
Wants=docker.service

[Service]
Type=simple
User=crowbyte
Group=crowbyte
WorkingDirectory=/opt/crowbyte/src/apps/server
Environment=NODE_ENV=production
Environment=PORT=3000
EnvironmentFile=-/etc/crowbyte/crowbyte.env
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
SyslogIdentifier=crowbyte-server

# Security
PrivateTmp=true
LimitNOFILE=65535
LimitNPROC=4096

# Docker socket access
SupplementaryGroups=docker

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable crowbyte-server
```

#### Step 10: nginx Reverse Proxy

```bash
cat > /etc/nginx/sites-available/crowbyte << 'NGINX'
# Rate limiting zones
limit_req_zone $binary_remote_addr zone=crowbyte_api:10m rate=30r/s;
limit_req_zone $binary_remote_addr zone=crowbyte_auth:10m rate=5r/m;

upstream crowbyte {
    server 127.0.0.1:3000;
    keepalive 64;
}

# HTTP -> HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name _;
    return 301 https://$host$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name _;

    ssl_certificate /etc/crowbyte/ssl/cert.pem;
    ssl_certificate_key /etc/crowbyte/ssl/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml image/svg+xml;
    gzip_min_length 256;

    # Static assets (long cache)
    location /assets/ {
        proxy_pass http://crowbyte;
        proxy_cache_valid 200 30d;
        add_header Cache-Control "public, max-age=2592000, immutable";
    }

    # Auth endpoints (strict rate limit: 5 req/min)
    location /api/auth/ {
        limit_req zone=crowbyte_auth burst=3 nodelay;
        proxy_pass http://crowbyte;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # API endpoints (30 req/s with burst)
    location /api/ {
        limit_req zone=crowbyte_api burst=50 nodelay;
        proxy_pass http://crowbyte;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
    }

    # WebSocket (terminal + metrics + exec stream)
    location /ws {
        proxy_pass http://crowbyte;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }

    # SPA fallback
    location / {
        proxy_pass http://crowbyte;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Block dotfiles and backup files
    location ~ /\. { deny all; }
    location ~ ~$ { deny all; }
}
NGINX

# Enable the site
ln -sf /etc/nginx/sites-available/crowbyte /etc/nginx/sites-enabled/crowbyte
rm -f /etc/nginx/sites-enabled/default

# Test and reload
nginx -t && systemctl restart nginx
```

#### Step 11: Firewall

```bash
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP (redirects to 443)
ufw allow 443/tcp   # HTTPS
ufw --force enable
```

#### Step 12: Start Services

```bash
systemctl start crowbyte-server
systemctl start nginx

# Verify
systemctl status crowbyte-server
systemctl status nginx
```

---

## Server Components

### Directory Structure

```
/opt/crowbyte/src/apps/server/
  src/
    index.ts              # Main entry -- Express app, HTTP/HTTPS server, WebSocket routing
    middleware/
      auth.ts             # JWT middleware -- token generation, verification, public path bypass
    routes/
      auth.ts             # POST /api/auth/login, /refresh, GET /me -- bcrypt + JWT + rate limiting
      system.ts           # GET /api/system/{overview,cpu,memory,disk,network,processes,gpu,docker,services}
      tools.ts            # POST /api/tools/execute, /scan -- whitelisted binary execution
      docker.ts           # GET/POST/DELETE /api/docker/{containers,images} -- full Docker lifecycle
    ws/
      terminal.ts         # WebSocket terminal -- node-pty shell sessions (xterm-256color)
      metrics.ts          # WebSocket metrics -- 2-second interval CPU/RAM/net/disk/load streaming
    utils/
      proc.ts             # Direct /proc filesystem readers (no shelling out for core metrics)
  dist/                   # Compiled JavaScript output (tsc)
  .env.example            # Configuration template
  crowbyte-server.service # systemd unit file
  nginx-crowbyte.conf     # nginx reverse proxy config
  deploy.sh               # Automated deployment script
  package.json            # Dependencies: express, ws, node-pty, helmet, bcrypt, jsonwebtoken, etc.
  tsconfig.json           # TypeScript configuration
```

### API Routes

#### Authentication (`/api/auth/`)

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/auth/login` | POST | No | Login with username/password, returns JWT + refresh token |
| `/api/auth/refresh` | POST | No | Exchange refresh token for new JWT |
| `/api/auth/me` | GET | Yes | Return current authenticated user info |

Login is rate-limited to 10 attempts per 15 minutes per IP. Tokens expire in 24 hours; refresh tokens expire in 7 days.

#### System Metrics (`/api/system/`)

All system routes are publicly accessible (read-only metrics, safe behind nginx).

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/system/overview` | GET | OS info, hostname, kernel, uptime, load average |
| `/api/system/cpu` | GET | CPU model, cores, speed, usage %, temperature |
| `/api/system/memory` | GET | Total/used/free/available RAM, swap, formatted |
| `/api/system/disk` | GET | Filesystem mounts, sizes, I/O stats |
| `/api/system/network` | GET | Interfaces (IP, MAC, speed, RX/TX bytes) |
| `/api/system/processes` | GET | Top 25 by CPU, top 25 by memory |
| `/api/system/gpu` | GET | NVIDIA (via nvidia-smi) or generic GPU info |
| `/api/system/docker` | GET | Running/stopped containers, images, Docker version |
| `/api/system/services` | GET | Status of common services (docker, nginx, sshd, etc.) |

Metrics are read directly from `/proc/stat`, `/proc/meminfo`, `/proc/net/dev`, `/proc/diskstats`, `/proc/loadavg`, and `/proc/uptime` for minimal overhead. `systeminformation` is used as a fallback for structured data (OS info, GPU, processes).

#### Security Tools (`/api/tools/`)

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/tools/available` | GET | No | List all whitelisted tools with path and version |
| `/api/tools/execute` | POST | Yes | Execute a whitelisted binary with args |
| `/api/tools/execute?stream=true` | POST | Yes | Start execution, return ID for WebSocket streaming |
| `/api/tools/scan` | POST | Yes | Run a scan preset against a target |
| `/api/tools/execution/:id` | GET | Yes | Poll execution status and output |

**Whitelisted binaries** (24 tools):

```
nmap, nuclei, httpx, subfinder, ffuf, sqlmap, nikto,
masscan, katana, dnsx, naabu, waybackurls, dalfox,
gau, whois, dig, curl, ping, traceroute, gobuster,
feroxbuster, wfuzz, arjun, amass
```

**Scan presets**:

| Preset | Tool | Description |
|--------|------|-------------|
| `port-scan` | nmap | Top 1000 ports with service/version detection |
| `vuln-scan` | nuclei | Critical/high/medium severity scan |
| `web-scan` | nikto | Web server vulnerability scan |
| `subdomain-enum` | subfinder | Passive subdomain enumeration |
| `dir-brute` | ffuf | Directory brute-force with common wordlist |

Arguments are sanitized: shell metacharacters (`; & | \` $ () {}`) are rejected in non-flag arguments. Maximum execution timeout is 10 minutes.

#### Docker Management (`/api/docker/`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/docker/containers` | GET | List all containers (state, ports, mounts) |
| `/api/docker/containers` | POST | Create a container (image, ports, volumes, env) |
| `/api/docker/containers/:id/start` | POST | Start a container |
| `/api/docker/containers/:id/stop` | POST | Stop a container |
| `/api/docker/containers/:id` | DELETE | Remove a container (?force=true) |
| `/api/docker/containers/:id/logs` | GET | Get container logs (?tail=100) |
| `/api/docker/containers/:id/stats` | GET | CPU/memory/network/block I/O stats snapshot |
| `/api/docker/images` | GET | List images |
| `/api/docker/images/pull` | POST | Pull an image from registry |

Docker operations use the `/var/run/docker.sock` Unix socket via the `dockerode` library. The middleware checks socket availability before each request.

#### Health Check

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/health` | GET | No | Server uptime, version, connected clients count |

### WebSocket Endpoints

All WebSocket connections require JWT authentication via the `?token=` query parameter.

```
wss://<host>/ws?type=<type>&token=<jwt>[&additional_params]
```

| Type | Purpose | Params |
|------|---------|--------|
| `terminal` | Interactive shell (node-pty) | `sessionId`, `cols`, `rows` |
| `metrics` | Real-time system metrics (2s interval) | `cpu`, `memory`, `network`, `disk`, `load` (all default true) |
| `exec` | Stream output from a running tool execution | `executionId` |

**Terminal WebSocket messages**:

```json
// Client -> Server
{"type": "input", "data": "ls -la\n"}
{"type": "resize", "cols": 120, "rows": 40}

// Server -> Client
{"type": "session", "sessionId": "...", "shell": "/bin/bash", "pid": 1234}
{"type": "output", "data": "..."}
{"type": "exit", "exitCode": 0}
```

**Metrics WebSocket messages**:

```json
// Server -> Client (every 2 seconds)
{
  "type": "metrics",
  "timestamp": 1711234567890,
  "cpu": {"total": 23.5, "perCore": [20.1, 26.9], "user": 15.2, "system": 8.3},
  "memory": {"totalBytes": 34359738368, "usedBytes": 12884901888, "usedPercent": 37.5},
  "network": [{"iface": "eth0", "rxBytesPerSec": 125000, "txBytesPerSec": 50000}],
  "load": {"load1": 0.75, "load5": 0.60, "load15": 0.45}
}

// Client -> Server (update subscription)
{"type": "subscribe", "cpu": true, "memory": true, "network": false}
```

---

## Configuration

### Server Environment (`/etc/crowbyte/crowbyte.env`)

```bash
# Server
PORT=3000                    # Internal port (nginx proxies to this)
NODE_ENV=production

# Authentication
CROWBYTE_USER=admin          # Login username
CROWBYTE_PASS=<password>     # Login password (plaintext, hashed at startup)
# CROWBYTE_PASS_HASH=<hash>  # Or provide pre-hashed bcrypt password
JWT_SECRET=<hex-string>      # 64-byte hex (auto-generated if omitted)

# CORS (default: allow all origins)
# CORS_ORIGIN=https://yourdomain.com

# SSL (optional -- nginx handles SSL, but server can terminate directly)
# SSL_CERT=/etc/crowbyte/ssl/cert.pem
# SSL_KEY=/etc/crowbyte/ssl/key.pem
```

### SSL Certificates (`/etc/crowbyte/ssl/`)

| File | Purpose |
|------|---------|
| `cert.pem` | SSL certificate (or fullchain) |
| `key.pem` | Private key |

### nginx Configuration (`/etc/nginx/sites-available/crowbyte`)

The nginx config provides:

- HTTP to HTTPS redirect on port 80
- SSL termination on port 443
- Rate limiting: 30 req/s for API, 5 req/min for auth
- WebSocket proxy with 24-hour timeout
- Security headers (HSTS, X-Frame-Options, etc.)
- Gzip compression
- Long cache headers for static assets

### systemd Service (`/etc/systemd/system/crowbyte-server.service`)

The service file configures:

- Runs as the `crowbyte` user (not root)
- Loads environment from `/etc/crowbyte/crowbyte.env`
- Auto-restarts on failure (5-second delay)
- Docker group membership for socket access
- File descriptor limit: 65535
- Process limit: 4096
- Private `/tmp` for security

---

## Services Management

```bash
# CrowByte server
systemctl start crowbyte-server
systemctl stop crowbyte-server
systemctl restart crowbyte-server
systemctl status crowbyte-server

# View logs
journalctl -u crowbyte-server -f          # Follow live
journalctl -u crowbyte-server --since "1h ago"

# nginx
systemctl restart nginx
nginx -t                                   # Test config before restart

# Docker
systemctl status docker

# All CrowByte services at a glance
systemctl status crowbyte-server nginx docker
```

---

## Firewall

The deployment opens three ports via UFW:

| Port | Protocol | Service |
|------|----------|---------|
| 22 | TCP | SSH |
| 80 | TCP | HTTP (redirects to 443) |
| 443 | TCP | HTTPS (CrowByte UI + API + WebSocket) |

```bash
# Check status
ufw status verbose

# Add additional rules if needed
ufw allow 3389/tcp   # RDP (only for CrowByte OS desktop mode)
ufw allow 6080/tcp   # noVNC (only for CrowByte OS desktop mode)
```

---

## First Run

1. **Open the UI**: Navigate to `https://<VPS-IP>` in your browser.

   - Accept the self-signed certificate warning (or use Let's Encrypt -- see below).

2. **Setup Wizard**: On first load, the app presents a setup wizard:
   - **EULA**: Accept the End User License Agreement
   - **License**: Enter license key (or skip for community mode)
   - **Database**: Configure Supabase connection (URL + anon key) for cloud sync
   - **VPS**: Configure OpenClaw VPS agent swarm connection (optional)
   - **Workspace**: Set workspace name and preferences

3. **Login**: Sign in with the credentials from `/etc/crowbyte/crowbyte.env`:
   - Default username: `admin`
   - Default password: whatever was generated during install (check the env file)

4. **Dashboard**: After login, the dashboard displays live server metrics:
   - CPU usage (per-core breakdown)
   - Memory usage (RAM + swap)
   - Disk usage (all mounted filesystems)
   - Network throughput
   - Docker container status
   - Service health

---

## SSL / TLS

### Self-Signed (Default)

The installer generates a self-signed certificate valid for 10 years. This is suitable for testing but will trigger browser warnings.

### Let's Encrypt (Production)

For a domain-based setup with trusted certificates:

```bash
# Point your domain's DNS A record to your VPS IP first

# Install certbot (already included in deploy.sh)
apt-get install -y certbot python3-certbot-nginx

# Obtain certificate
certbot --nginx -d yourdomain.com

# Auto-renewal is configured by certbot automatically
# Verify:
systemctl list-timers | grep certbot
```

Certbot will automatically update the nginx config to use the Let's Encrypt certificate.

### Manual Certificate

If you have certificates from another CA:

```bash
cp /path/to/fullchain.pem /etc/crowbyte/ssl/cert.pem
cp /path/to/privkey.pem /etc/crowbyte/ssl/key.pem
chmod 600 /etc/crowbyte/ssl/key.pem
systemctl restart nginx
```

---

## Security Hardening

### Passwords

```bash
# Change the admin password
nano /etc/crowbyte/crowbyte.env   # Edit CROWBYTE_PASS
systemctl restart crowbyte-server

# Or use a pre-hashed password
HASH=$(python3 -c "import bcrypt; print(bcrypt.hashpw(b'your-password', bcrypt.gensalt(12)).decode())")
# Set CROWBYTE_PASS_HASH=$HASH in crowbyte.env
```

### JWT Secret

If `JWT_SECRET` is not set in the env file, the server generates a random 64-byte hex secret at startup. This means all tokens are invalidated on server restart. For persistent sessions, set a fixed secret:

```bash
echo "JWT_SECRET=$(openssl rand -hex 64)" >> /etc/crowbyte/crowbyte.env
systemctl restart crowbyte-server
```

### SSH Hardening

The `crowbyte-os-setup.sh` installer applies:

```bash
# /etc/ssh/sshd_config
PermitRootLogin prohibit-password   # Key-only root access
PasswordAuthentication no            # Disable password auth
```

### fail2ban

Enabled by default. Protects SSH against brute-force attacks.

```bash
# Check status
fail2ban-client status
fail2ban-client status sshd
```

### Kernel Hardening

Applied by the installer at `/etc/sysctl.d/99-crowbyte.conf`:

```
net.ipv4.tcp_syncookies = 1
net.ipv4.conf.all.rp_filter = 1
net.ipv4.conf.default.rp_filter = 1
net.ipv4.conf.all.accept_redirects = 0
net.ipv6.conf.all.accept_redirects = 0
net.ipv4.conf.all.send_redirects = 0
net.ipv4.icmp_echo_ignore_broadcasts = 1
kernel.randomize_va_space = 2
```

### Tool Execution Security

- Only 24 binaries are whitelisted for execution via the API
- Shell metacharacters are blocked in command arguments
- Maximum execution timeout: 10 minutes
- Rate limiting on API endpoints: 30 req/s (50 burst)
- Auth endpoints: 5 req/min (3 burst)
- Executions auto-expire from memory after 5 minutes

---

## Maintenance

### Update CrowByte

```bash
cd /opt/crowbyte/src
git pull

# Rebuild frontend
cd apps/desktop
npm install --legacy-peer-deps
npx vite build

# Rebuild server
cd ../server
npm install
npx tsc

# Restart
systemctl restart crowbyte-server
```

### Update Security Tools

```bash
# Go tools
go install github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest
go install github.com/projectdiscovery/httpx/cmd/httpx@latest
# ... repeat for other tools

# Nuclei templates
nuclei -update-templates

# Python tools
pip3 install --upgrade --break-system-packages sqlmap
```

### Backups

Key files to back up:

```
/etc/crowbyte/crowbyte.env     # Server configuration
/etc/crowbyte/ssl/             # SSL certificates
/etc/nginx/sites-available/    # nginx config
```

### Monitoring

```bash
# Server health
curl -sk https://localhost/api/health | jq .

# Check processes
journalctl -u crowbyte-server --since "10 min ago" --no-pager

# Resource usage
htop
df -h
docker stats --no-stream
```

---

## Troubleshooting

### Server fails to start

```bash
# Check logs
journalctl -u crowbyte-server -n 50 --no-pager

# Common issues:
# - Port 3000 already in use
lsof -i :3000

# - Missing node_modules
cd /opt/crowbyte/src/apps/server && npm install

# - TypeScript not compiled
cd /opt/crowbyte/src/apps/server && npx tsc

# - Permission denied on Docker socket
usermod -aG docker crowbyte
systemctl restart crowbyte-server
```

### Frontend shows "Frontend not built"

```bash
cd /opt/crowbyte/src/apps/desktop
npx vite build
systemctl restart crowbyte-server
```

### nginx returns 502 Bad Gateway

```bash
# Check if CrowByte server is running
systemctl status crowbyte-server

# Check if it is listening on port 3000
ss -tlnp | grep 3000

# Check nginx config
nginx -t
```

### WebSocket connections fail

```bash
# Verify nginx WebSocket proxy config
grep -A 10 "location /ws" /etc/nginx/sites-available/crowbyte

# Check for firewall blocking
ufw status

# Test directly (bypass nginx)
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" http://localhost:3000/ws
```

### Tools not found in `/api/tools/available`

```bash
# Check if Go binaries are in PATH
which nuclei httpx subfinder ffuf

# If not found, re-symlink
ln -sf /root/go/bin/* /usr/local/bin/

# Verify tool is in the whitelist (see ALLOWED_TOOLS in routes/tools.ts)
```

### Docker socket permission denied

```bash
ls -la /var/run/docker.sock
# Should be: srw-rw---- root docker

# Add crowbyte to docker group
usermod -aG docker crowbyte
systemctl restart crowbyte-server
```
