# CrowByte — Deployment Guide

## Web Deploy (crowbyte.io)

### One command
```bash
cd /mnt/bounty/Claude/crowbyte/apps/desktop
npm run deploy:web
```

### Deploy modes

| Command | When |
|---------|------|
| `npm run deploy:web` | Normal — type-check + build + deploy + health check |
| `npm run deploy:web:fast` | Skip type-check — faster CI-style |
| `npm run deploy:web:hotfix` | Deploy existing `dist/web/` without rebuilding |

### What it does (5 steps)
1. TypeScript check — catch crashes before going live
2. Production build → `dist/web/`
3. Verify: `index.html` exists, 3+ JS bundles present
4. Atomic swap: rsync → `/opt/crowbyte/staging_incoming/` → single `mv` to live (zero downtime)
5. Health check: curl `https://crowbyte.io/` → HTTP 200 + "CrowByte". Auto-rollback on fail.

### Manual rollback
```bash
ssh -i ~/.ssh/id_ed25519 root@147.93.44.58 \
  "mv /opt/crowbyte/web /opt/crowbyte/web_broken && mv /opt/crowbyte/web_prev_TIMESTAMP /opt/crowbyte/web"
```

### Critical rules
- NEVER deploy `dist/` — only `dist/web/`. Wrong folder = `IS_ELECTRON=true` baked in → site crashes.
- NEVER raw rsync directly to `/opt/crowbyte/web/` — atomic swap only.
- Always use `npm run deploy:web` — the script enforces all of this.

---

## Electron Build (Windows)

### Prerequisites
Changes must be on the Windows Build VPS at:
`C:\Users\Administrator\docs\crowbyte\apps\desktop\`

### Push changes from Kali
```bash
sshpass -p 'Wintersun6?6' scp \
  -o IdentitiesOnly=yes -o PubkeyAuthentication=no \
  -o PreferredAuthentications=password -o StrictHostKeyChecking=no \
  /mnt/bounty/Claude/crowbyte/apps/desktop/PATH/TO/FILE \
  Administrator@147.93.180.110:'C:\Users\Administrator\docs\crowbyte\apps\desktop\PATH\TO\FILE'
```

### Full build (installer)
```bash
sshpass -p 'Wintersun6?6' ssh -o IdentitiesOnly=yes \
  -o PubkeyAuthentication=no -o PreferredAuthentications=password \
  -o StrictHostKeyChecking=no Administrator@147.93.180.110 \
  "cd C:\\Users\\Administrator\\docs\\crowbyte\\apps\\desktop && npm run build:vite && npx electron-builder --win 2>&1"
```

Output files:
- `release/CrowByte-Setup-2.2.0.exe` — NSIS installer (~153MB, signed)
- `release/CrowByte-2.2.0-x64.msi` — MSI installer (~163MB, signed)

### Fast hotfix (no installer, just update unpacked exe)
```bash
# On Windows VPS:
npm run build:vite  # ~12s
xcopy dist release\win-unpacked\resources\app\dist\ /E /I /Y
# Run: release\win-unpacked\electron.exe
```

---

## Electron Build (Linux/Mac)

Not yet built regularly — build commands exist in package.json:
```bash
npm run build:electron-pkg:linux   # AppImage + deb
npm run build:electron-pkg:mac     # DMG
```

---

## Env Files

| File | Build | Contents |
|------|-------|----------|
| `.env` | Local dev | All keys including service key |
| `.env.production` | Web production | Supabase URL + anon key + `VITE_BUILD_TARGET=web` |
| `.env.staging` | Staging | Staging Supabase project |

---

## Supabase Edge Functions Deploy

```bash
cd /mnt/bounty/Claude/crowbyte
supabase functions deploy --project-ref gvskdopsigtflbbylyto
```

---

## Server Deploy (API — VPS 1)

```bash
# SSH into prod VPS
ssh -i ~/.ssh/id_ed25519 root@147.93.44.58

# In /opt/crowbyte/server/
npm run build
pm2 restart crowbyte-api
```

---

## Build Targets Summary

| Command | VITE_BUILD_TARGET | Output | Runtime |
|---------|------------------|--------|---------|
| `npm run build:vite` | `electron` | `dist/` | Electron desktop |
| `npm run build:web:production` | `web` | `dist/web/` | crowbyte.io SaaS |
| `npm run build:web:staging` | `web` (staging mode) | `dist/web/` | staging.crowbyte.io |

**Key differences between targets:**
- Web: service key stripped, `IS_ELECTRON=false`, MCP/IPC disabled, OpenClaw used for AI
- Electron: full access, `IS_ELECTRON=true`, Claude CLI available, node-pty for terminal

---

## Cloudflare Cache Purge (after web deploy)

```bash
curl -X POST "https://api.cloudflare.com/client/v4/zones/dfe9faea205208b8eecaa40e32c74625/purge_cache" \
  -H "Authorization: Bearer REDACTED_CF_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"purge_everything":true}'
```
