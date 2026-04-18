# CrowByte — Infrastructure

## Quick Reference

| Machine | IP | OS | Purpose | Password |
|---------|----|----|---------|---------|
| CrowByte Prod VPS | 147.93.44.58 | Ubuntu | crowbyte.io web + API | REDACTED_VPS_PASS |
| OpenClaw VPS | 187.124.85.249 | Ubuntu 24.04 | AI agent swarm + d3bugr | REDACTED_VPS_PASS |
| Windows Build VPS | 147.93.180.110 | Windows Server 2022 | Electron installer build | Wintersun6?6 |
| Local Kali | 100.107.82.73 (Tailscale) | Kali Linux 2025 | Dev machine | winter (sudo) |

---

## VPS 1 — CrowByte Production (crowbyte.io)

**IP**: 147.93.44.58
**Tailscale IP**: 100.124.103.3
**Provider**: Hostinger KVM 8 — srv1522459
**Tailnet**: hlarosesurprenant@gmail.com
**Specs**: 8 vCPU / 31GB RAM / 400GB SSD
**Expires**: 2026-04-23

### SSH
```bash
# Preferred (via Tailscale — always works, no firewall):
ssh root@crowbyte-vps

# Fallback (direct):
ssh -i ~/.ssh/id_ed25519 root@147.93.44.58
```
Password: `REDACTED_VPS_PASS`

### Web Root
`/opt/crowbyte/web/` — nginx serves static SPA

### PM2 Services

| Name | Port | What |
|------|------|------|
| `crowbyte-api` | 3000 | Express API (TypeScript) |
| `crowbyte-terminal` | 18822 | Terminal WebSocket (node-pty) |
| `crowbyte-desktop` | 6080 | noVNC virtual desktop |
| `crowbyte-upload` | 6090 | File upload handler |

All PM2 services auto-start on boot via `pm2 startup`.

### Other Ports

| Port | What |
|------|------|
| 80 / 443 | nginx (crowbyte.io, staging.crowbyte.io, status.crowbyte.io) |
| 3001 | download-gate.mjs |
| 3002 | mailer.mjs (Resend email) |
| 19858 | oauth-proxy.js |
| 5999 | Xvnc |
| 3389 | xRDP |

### nginx Virtual Hosts

| Host | Config file | What |
|------|------------|------|
| crowbyte.io | `/etc/nginx/sites-enabled/crowbyte` | Main SPA + API proxy |
| staging.crowbyte.io | `/etc/nginx/sites-enabled/staging-crowbyte` | Staging deploy |
| status.crowbyte.io | `/etc/nginx/sites-enabled/status-crowbyte` | Status page |

### Security Hardening (active)

- **Cloudflare**: DNS proxy + cache rules + DNSSEC (pending) + SSL/TLS strict
  - Zone ID: `dfe9faea205208b8eecaa40e32c74625`
  - CF Cache Purge Token: `REDACTED_CF_TOKEN`
- **iptables**: `CROWBYTE-CF` chain — only Cloudflare IP ranges accepted on 80/443. Tailscale + localhost also allowed.
- **fail2ban**: 4 active jails
  - `crowbyte-auth`: 10 failures → 7d ban
  - `crowbyte-bots`: 2 hits in 1h → 30d ban
  - `crowbyte-canary`: 1 hit → 30d ban
  - `nginx-4xx`: 20 in 60s → 24h ban
- **Canary endpoints**: `/.env`, `/.git/config`, `/admin`, `*.php` return convincing fake content and log to `/var/log/nginx/canary.log`
- **CSP**: strict — no `unsafe-eval`, `frame-ancestors 'self'`, no external font CDN
- **Security headers**: HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy

### API Server (`/opt/crowbyte/server/`)

Built from `crowbyte/apps/desktop/` (server part). Express + TypeScript.

Key endpoints:
- `POST /api/errors` — network error ingestion (rate-limited: 20/min/IP, sanitized, no auth needed)
- `GET /api/errors` — list errors (auth required)
- `GET /api/errors/summary` — stats (auth required)
- `DELETE /api/errors` — clear errors (auth required)
- `POST /api/mcp/proxy` — MCP proxy

---

## VPS 2 — OpenClaw Agent Swarm

**IP**: 187.124.85.249
**Hostname**: srv1459982.hstgr.cloud
**Provider**: Hostinger KVM 8
**OS**: Ubuntu 24.04 LTS
**Specs**: 8 vCPU / 32GB RAM / 400GB SSD

### SSH
```bash
ssh root@187.124.85.249
# Password: REDACTED_VPS_PASS
```

### Services

| Port | What |
|------|------|
| 18789 | OpenClaw gateway (agent swarm) |
| 19990 | nvidia-proxy.service — fixes NVIDIA API model prefix stripping |
| 3000 | d3bugr Docker (142 security tools, browser automation) |
| 80 / 443 | Traefik reverse proxy |

### OpenClaw

Gateway password: `iloveWintersun6?6`
Dashboard: `https://srv1459982.hstgr.cloud/cc/?token=REDACTED_OPENCLAW_TOKEN`

Available agents: `recon`, `hunter`, `intel`, `analyst`, `commander`, `sentinel`, `gpt`, `obsidian`

```bash
# Task an agent from Kali:
ssh root@187.124.85.249 "export OPENCLAW_GATEWAY_PASSWORD='iloveWintersun6?6' && openclaw agent --agent recon --local -m 'full recon on target.com'"
```

### NVIDIA Proxy (port 19990)

`nvidia-proxy.service` runs as a systemd service. It re-adds the `provider/` prefix to model IDs before forwarding to NVIDIA Cloud API. Required because OpenClaw strips the prefix internally.

All AI providers in OpenClaw's config point to `http://127.0.0.1:19990/v1` — NOT directly to NVIDIA.

### Cron Jobs

```
*/30 * * * *  /usr/local/bin/ti-collector sync  # Sync 22 threat intel feeds to Supabase
```

---

## VPS 3 — Windows Build Server

**IP**: 147.93.180.110
**Provider**: Contabo — Instance ID: 203225967 (WinCrowbyte)
**OS**: Windows Server 2022 (10.0.20348)
**Specs**: 8 vCPU / 8GB RAM / 75GB NVMe
**Contabo Client ID**: INT-14853092

### Access
```bash
# SSH (from Kali):
sshpass -p 'Wintersun6?6' ssh -o IdentitiesOnly=yes -o PubkeyAuthentication=no -o PreferredAuthentications=password -o StrictHostKeyChecking=no Administrator@147.93.180.110

# RDP: 147.93.180.110:3389
# VNC: 164.5.255.184:63096 (pw: Cr0wByte8)
```

### Build Electron Installer

```bash
# 1. Push source + changes
sshpass -p 'Wintersun6?6' scp -o ... /path/to/file Administrator@147.93.180.110:'C:\Users\Administrator\docs\crowbyte\apps\desktop\...'

# 2. SSH in and build
sshpass -p 'Wintersun6?6' ssh ... Administrator@147.93.180.110 "cd C:\\Users\\Administrator\\docs\\crowbyte\\apps\\desktop && npm run build:vite && npx electron-builder --win 2>&1"

# Output: release\CrowByte-Setup-2.2.0.exe (~153MB NSIS), release\CrowByte-2.2.0-x64.msi (~163MB)
```

### Fast Hotfix Deploy (skip full installer build)

```bash
# Rebuild vite only (13s), then xcopy dist into release:
npm run build:vite
xcopy dist release\win-unpacked\resources\app\dist\ /E /I /Y
# Then run: release\win-unpacked\electron.exe (210MB unpacked)
```

### WSL Status

- WSL 2.6.3.0 installed, kernel 6.6.87.2-1
- Ubuntu distro installed but WSL1 mode (Docker won't work)
- **Pending**: Contabo support ticket to enable nested virtualization → then `wsl --set-version Ubuntu 2` → Docker works
- Docker Desktop installed but requires WSL2 backend

### Contabo CLI (cntb)

Installed at `/usr/local/bin/cntb` (on Kali).
Credentials stored in `~/.cntb.yml`.

```bash
cntb get instances    # List all VPS
```

---

## Supabase

**Project ref**: `gvskdopsigtflbbylyto`
**URL**: `https://gvskdopsigtflbbylyto.supabase.co`
**Dashboard**: `https://supabase.com/dashboard/project/gvskdopsigtflbbylyto`
**PAT**: `REDACTED_SUPABASE_PAT`

Run SQL directly:
```bash
curl -X POST "https://api.supabase.com/v1/projects/gvskdopsigtflbbylyto/database/query" \
  -H "Authorization: Bearer REDACTED_SUPABASE_PAT" \
  -H "Content-Type: application/json" \
  -d '{"query":"SELECT NOW()"}'
```

---

## Cloudflare

**Zone ID**: `dfe9faea205208b8eecaa40e32c74625`
**Account ID**: `d5316fff65fcd647c17513c5735810e6`
**API Token (Cache Purge)**: `REDACTED_CF_TOKEN`

Active settings: DNSSEC (pending), SSL/TLS Full Strict, HSTS, Polish (WebP), Brotli, HTTP/2, HTTP/3, Auto HTTPS Rewrites.

Cache rules (free plan — no regex):
- Bypass: `*.html`, `/api/*`
- Cache 30d: `/assets/*`, `/fonts/*`
