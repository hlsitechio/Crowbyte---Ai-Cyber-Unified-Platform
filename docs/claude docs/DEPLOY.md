# CrowByte Web Deployment Guide

## TL;DR — Deploy the site

```bash
cd /mnt/bounty/Claude/crowbyte/apps/desktop
npm run deploy:web
```

That's it. One command. It builds, syncs, atomically swaps, health-checks, and rolls back automatically if anything breaks.

---

## Deploy Modes

| Command | When to use |
|---------|-------------|
| `npm run deploy:web` | Normal deploy — full type-check + build + deploy + health check |
| `npm run deploy:web:fast` | Skip type-check (CI-style, build is still fresh) |
| `npm run deploy:web:hotfix` | Deploy existing `dist/web/` without rebuilding (emergency) |

---

## What the Script Does (5 steps)

1. **TypeScript check** — catches module-level crashes before they go live (e.g. `supabaseKey is required`)
2. **Production build** — `VITE_BUILD_TARGET=web --mode production` → outputs to `dist/web/`
3. **Build verification** — checks `index.html` exists, ≥3 JS bundles present
4. **Atomic swap** — rsync to `/opt/crowbyte/staging_incoming/`, then single `mv` to live (zero downtime)
5. **Health check** — curls `https://crowbyte.io/` and verifies HTTP 200 + "CrowByte" in body. **Auto-rollback** if fails.

---

## Critical Rules — Read Before Every Deploy

### NEVER deploy from `dist/` — always `dist/web/`

| Build command | Output dir | Target |
|---------------|-----------|--------|
| `npm run build` or `npx vite build` | `dist/` | Electron app ONLY |
| `npm run build:web:production` | `dist/web/` | Web / crowbyte.io |

Deploying the electron build to web means `IS_ELECTRON = true` is hardcoded — the app will skip auth, show SubscriptionGate, and crash. **The deploy script handles this automatically — never use raw rsync.**

### Always use `npm run deploy:web`
- NEVER manually rsync `dist/` to the VPS
- NEVER `rsync --delete` directly to `/opt/crowbyte/web/` (breaks live site during sync)
- The script handles everything safely

---

## VPS Details

- **Host**: `147.93.44.58` (srv1522459, Hostinger KVM 8)
- **SSH**: `sshpass -p 'REDACTED_VPS_PASS' ssh root@147.93.44.58`
- **Web root**: `/opt/crowbyte/web/`
- **Releases**: `/opt/crowbyte/releases/` (last 3 kept for rollback)
- **Previous release**: `/opt/crowbyte/web_prev_TIMESTAMP/`

## Manual Rollback (if needed)

```bash
sshpass -p 'REDACTED_VPS_PASS' ssh root@147.93.44.58 \
  "ls /opt/crowbyte/web_prev_* | sort -r | head -1"
# Look at the output, e.g. /opt/crowbyte/web_prev_20260413-143022
# Then rollback:
sshpass -p 'REDACTED_VPS_PASS' ssh root@147.93.44.58 \
  "mv /opt/crowbyte/web /opt/crowbyte/web_broken && mv /opt/crowbyte/web_prev_20260413-143022 /opt/crowbyte/web"
```

---

## Env Files

| File | Purpose | What's in it |
|------|---------|--------------|
| `.env.production` | Web production build | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_BUILD_TARGET=web` |
| `.env` | Local dev defaults | All keys including service key |
| `.env.staging` | Staging builds | Staging Supabase project |

**`VITE_SUPABASE_SERVICE_KEY` is stripped in web builds** (security). Any module using it at init time MUST have a fallback:
```ts
// WRONG — crashes in web:
const supabase = createClient(url, import.meta.env.VITE_SUPABASE_SERVICE_KEY);

// CORRECT — falls back to anon key:
const key = import.meta.env.VITE_SUPABASE_SERVICE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(url, key);
```

---

## Electron Build (separate process)

```bash
# 1. Build Vite bundle for Electron
npm run build:vite   # outputs to dist/

# 2. Build installer on Windows VPS
sshpass -p 'Wintersun6?6' ssh -o PubkeyAuthentication=no -o PreferredAuthentications=password Administrator@147.93.180.110
# On Windows:
cd C:\Users\Administrator\docs\crowbyte\apps\desktop
npx electron-builder --win --x64 --dir --config.npmRebuild=false
```

Electron artifacts go to `/opt/crowbyte/downloads/` on the web VPS for the Download settings page.

---

## Nginx Config Location

`/etc/nginx/sites-enabled/crowbyte.io` (on VPS 147.93.44.58)

Key directives:
- `root /opt/crowbyte/web;` — web root
- `try_files $uri $uri/ /index.html;` — SPA fallback (all routes → index.html)
- `index.html` served with `no-cache, no-store` — users always get latest HTML
- Static assets (`*.js`, `*.css`) cached 30 days with `immutable` (hash-based names change on rebuild)

---

## Post-Deploy Verification Checklist

After deploying, verify manually:
- [ ] `https://crowbyte.io/` loads landing page
- [ ] "Launch App" button → navigates to `/#/auth`
- [ ] "Get Started Free" pricing button → navigates to `/#/auth`
- [ ] GitHub OAuth → completes login → redirects to `/#/dashboard`
- [ ] No console errors (open browser DevTools)
