# CrowByte — VPS Quick Reference

## VPS 1 — CrowByte Production (crowbyte.io)

- **IP**: 147.93.44.58
- **Provider**: Hostinger KVM 8 — srv1522459
- **OS**: Ubuntu
- **Specs**: 8 vCPU / 31GB RAM / 400GB SSD
- **SSH**: `sshpass -p 'REDACTED_VPS_PASS' ssh root@147.93.44.58`
- **Expires**: 2026-04-23

### PM2 Services

| Name | Port | What |
|------|------|------|
| `crowbyte-api` | 3000 | Express API |
| `crowbyte-terminal` | 18822 | Terminal WebSocket |
| `crowbyte-desktop` | 6080 | noVNC virtual desktop |
| `crowbyte-upload` | 6090 | File upload handler |

### Other Ports

| Port | What |
|------|------|
| 80/443 | nginx |
| 3001 | download-gate.mjs |
| 3002 | mailer.mjs (Resend email) |
| 19858 | oauth-proxy.js |
| 5999 | Xvnc |
| 3389 | xRDP |

### Deploy Web

```bash
cd /mnt/bounty/Claude/crowbyte/apps/desktop
npm run deploy:web
```

Web root: `/opt/crowbyte/web/`
Previous release: `/opt/crowbyte/web_prev_TIMESTAMP/`
Manual rollback: `mv /opt/crowbyte/web /opt/crowbyte/web_broken && mv /opt/crowbyte/web_prev_XXXXXX /opt/crowbyte/web`

---

## VPS 2 — OpenClaw Agent Swarm

- **IP**: 187.124.85.249
- **Hostname**: srv1459982.hstgr.cloud
- **Provider**: Hostinger KVM 8
- **OS**: Ubuntu 24.04 LTS
- **Specs**: 8 vCPU / 32GB RAM / 400GB SSD
- **SSH**: `sshpass -p 'REDACTED_VPS_PASS' ssh root@187.124.85.249`
- **Gateway password**: `iloveWintersun6?6`

### Services

| Port | What |
|------|------|
| 18789 | OpenClaw gateway |
| 19990 | nvidia-proxy (model prefix fix for NVIDIA API) |
| 3000 | d3bugr Docker (80+ security tools) |
| 80/443 | Traefik reverse proxy |

### Run Agent from Kali

```bash
ssh root@187.124.85.249 "export OPENCLAW_GATEWAY_PASSWORD='iloveWintersun6?6' && openclaw agent --agent recon --local -m 'task'"
```

### Dashboard

`https://srv1459982.hstgr.cloud/cc/?token=REDACTED_OPENCLAW_TOKEN`

---

## VPS 3 — Windows Build Server

- **IP**: 147.93.180.110
- **Provider**: Contabo — vmi3225967.contaboserver.net
- **OS**: Windows Server
- **SSH**: `sshpass -p 'Wintersun6?6' ssh -o IdentitiesOnly=yes -o PubkeyAuthentication=no -o PreferredAuthentications=password Administrator@147.93.180.110`
- **Password**: `Wintersun6?6`
- **RDP**: `147.93.180.110:3389`
- **VNC**: 164.5.255.184:63096 (pw: `Cr0wByte8`)
- **Source**: `C:\Users\Administrator\docs\crowbyte\apps\desktop\`

### Build Electron Installer

```bash
# SSH in, then on Windows:
cd C:\Users\Administrator\docs\crowbyte\apps\desktop
npx electron-builder --win --x64 --dir --config.npmRebuild=false
# Output: release\win-unpacked\CrowByte.exe
```

---

## Local Kali

- **Tailscale**: 100.107.82.73
- **Sudo**: `winter`

---

## Quick Reference Table

| Machine | IP | Password | Purpose |
|---------|-----|----------|---------|
| CrowByte Prod | 147.93.44.58 | `REDACTED_VPS_PASS` | crowbyte.io web + API |
| OpenClaw | 187.124.85.249 | `REDACTED_VPS_PASS` | AI agent swarm, d3bugr |
| Windows Build | 147.93.180.110 | `Wintersun6?6` | electron-builder .exe |
| Local Kali | 100.107.82.73 | `winter` (sudo) | Dev machine |
