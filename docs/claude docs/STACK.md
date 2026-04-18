# CrowByte — Full Stack Reference

## At a Glance

| Layer | What | Where |
|-------|------|-------|
| Frontend / Desktop app | React + TypeScript + Vite (Electron + Web) | `apps/desktop/` |
| Background agents | Node.js (CVE, threat, digest, news) | `apps/agents/` (deployed to VPS) |
| API server | Express + TypeScript | `apps/server/` (deployed to VPS) |
| Database | Supabase (PostgreSQL) | Cloud — project: `gvskdopsigtflbbylyto` |
| Email | Resend via mailer microservice (port 3002) | VPS `services/mailer.mjs` |
| Auth | Supabase Auth + GitHub OAuth | Supabase project |
| Web hosting | nginx (static SPA) | Ubuntu VPS 147.93.44.58 |
| AI inference | NVIDIA API via OpenClaw proxy | VPS port 19990 |
| Error tracking | GlitchTip | Cloud — `app.glitchtip.com` |
| Billing | Paddle (planned) / PayPal (edge functions) | Supabase edge functions |

---

## Supabase

**Project**: `gvskdopsigtflbbylyto`
**URL**: `https://gvskdopsigtflbbylyto.supabase.co`
**Dashboard**: `https://supabase.com/dashboard/project/gvskdopsigtflbbylyto`

### Keys

| Key | Variable | Used in |
|-----|----------|---------|
| Anon (public) | `VITE_SUPABASE_ANON_KEY` | Browser — both Electron and web |
| Service role | `VITE_SUPABASE_SERVICE_KEY` | Electron only — STRIPPED in web builds |

### Tables

| Table | Purpose | Access |
|-------|---------|--------|
| `profiles` | User profiles (name, avatar, role) | Auth RLS |
| `user_settings` | Per-user preferences, API keys, theme | Auth RLS |
| `api_keys` | Stored API keys per user | Auth RLS |
| `cves` | CVE database (NVD + enriched) | Public read |
| `knowledge_base` | User research notes | Auth RLS |
| `bookmarks` | Saved URLs | Auth RLS |
| `red_team_ops` | Red team operation tracking | Auth RLS |
| `custom_agents` | AI agent configurations | Auth RLS |
| `endpoints` | Fleet device registry | Auth RLS |
| `findings` | Security findings from scans | Auth RLS |
| `reports` | Generated security reports | Auth RLS |
| `alert_center` | Ingested security alerts | Auth RLS |
| `missions` | Mission planner entries | Auth RLS |
| `intel_connectors` | Intel feed configurations | Auth RLS |
| `threat_iocs` | 262K+ IOCs from 22 feeds | Admin write |
| `threat_feeds` | Feed registry + health status | Admin write |

### Edge Functions

| Function | URL | Purpose |
|----------|-----|---------|
| `password-reset` | `/functions/v1/password-reset` | Sends branded reset email via Resend |
| `contact-form` | `/functions/v1/contact-form` | Contact page form handler |
| `paypal-create-order` | `/functions/v1/paypal-create-order` | PayPal billing |
| `paypal-capture-order` | `/functions/v1/paypal-capture-order` | PayPal billing |

Source: `supabase/functions/`

### Migrations

All schema migrations in `supabase/migrations/` — filename = date + feature.
Run migrations: `supabase db push` (requires Supabase CLI + project linked).

### Auth Providers Enabled

- Email/password
- GitHub OAuth (`read:user user:email` scopes)

---

## Ubuntu VPS — CrowByte Production (147.93.44.58)

**Provider**: Hostinger KVM 8
**Specs**: 8 vCPU / 31GB RAM / 400GB SSD
**OS**: Ubuntu
**SSH**: `sshpass -p 'REDACTED_VPS_PASS' ssh root@147.93.44.58`
**Expires**: 2026-04-23 (renew on Hostinger)

### What's Running

| PM2 Name | Port | Path | What it is |
|----------|------|------|-----------|
| `crowbyte-api` | 3000 | `/opt/crowbyte/server/dist/index.js` | Express API (routes, proxy, auth endpoints) |
| `crowbyte-terminal` | 18822 | `/opt/crowbyte/services/terminal/server.js` | Terminal WebSocket server (xterm.js backend) |
| `crowbyte-desktop` | 6080 + 6090 | `/opt/crowbyte/services/desktop/` | noVNC desktop (virtual desktop streaming + upload) |
| `crowbyte-upload` | 6090 | auto | File upload handler for desktop service |

### Always-Running Processes (non-PM2)

| Process | Port | What |
|---------|------|------|
| nginx | 80, 443 | Reverse proxy, SSL, static web serving |
| mailer.mjs | 3002 | Email microservice (Resend, password reset, contact) |
| download-gate.mjs | 3001 | Paid download auth gate |
| oauth-proxy.js | 19858 | CrowByte Engine OAuth token exchange |
| Xvnc | 5999 | Virtual display for desktop streaming |
| xrdp | 3389 | RDP access |
| monarx-agent | 65529 | Hostinger security agent |

### Directory Structure on VPS

```
/opt/crowbyte/
├── web/                ← Live website (SPA) — nginx serves from here
├── web_prev_TIMESTAMP/ ← Previous release (auto-rollback target)
├── releases/           ← Deploy history (last 3 kept)
├── staging_incoming/   ← Temp rsync target (never served directly)
├── server/             ← Express API (PM2: crowbyte-api)
│   └── dist/index.js
├── agents/             ← Background agents (CVE sync, threat intel)
├── services/
│   ├── desktop/        ← noVNC desktop streaming
│   ├── terminal/       ← WebSocket terminal
│   ├── mailer.mjs      ← Email service
│   ├── download-gate.mjs ← Download auth
│   └── oauth-proxy.js  ← Engine OAuth proxy
├── cli/                ← CrowByte CLI tools
├── downloads/          ← Installer binaries (.exe, .msi, .dmg)
├── memory-engine/      ← Memory engine service
└── backups/            ← Database backups
```

### nginx Sites

| Site | Config | Purpose |
|------|--------|---------|
| `crowbyte` | `/etc/nginx/sites-enabled/crowbyte` | Main site (crowbyte.io, SSL) |
| `staging-crowbyte` | `/etc/nginx/sites-enabled/staging-crowbyte` | Staging site |

### Key nginx Routes (crowbyte.io)

| Path | Proxies to | What |
|------|-----------|------|
| `/api/` | `http://127.0.0.1:3000` | Express API |
| `/api/auth/` | `http://127.0.0.1:3000` | Auth endpoints |
| `/api/password-reset` | `http://127.0.0.1:3002` | Password reset via mailer |
| `/api/oauth/token` | `http://127.0.0.1:19858` | OAuth token exchange |
| `/ws` | `http://127.0.0.1:3000` | WebSocket |
| `/terminal/ws` | `http://127.0.0.1:18822` | Terminal WebSocket |
| `/desktop/` | `http://127.0.0.1:6080` | noVNC desktop |
| `/downloads/` | auth-gated | Installer downloads |
| `/` (everything else) | `/opt/crowbyte/web/` | SPA (index.html) |

### Deploy to this VPS

```bash
cd /mnt/bounty/Claude/crowbyte/apps/desktop
npm run deploy:web          # builds + atomic deploy + health check
```

See `docs/claude docs/DEPLOY.md` for full details.

---

## Ubuntu VPS — OpenClaw Agent Swarm (187.124.85.249)

**Provider**: Hostinger KVM 8
**Hostname**: srv1459982.hstgr.cloud
**SSH**: `sshpass -p 'REDACTED_VPS_PASS' ssh root@187.124.85.249`
**Gateway password**: `iloveWintersun6?6`

### Services on OpenClaw VPS

| Service | Port | What |
|---------|------|------|
| OpenClaw gateway | 18789 | Agent swarm HTTP gateway |
| nvidia-proxy | 19990 | NVIDIA API proxy (re-adds provider prefix to model IDs) |
| d3bugr Docker | 3000 | 80+ security tools (nmap, nuclei, sqlmap, browser CDP) |
| Traefik | 80/443 | SSL reverse proxy |

### AI Models Available (NVIDIA via proxy)

| Model | ID | Best for |
|-------|----|---------|
| DeepSeek V3.2 | `deepseek-ai/deepseek-v3.2` | **Default** — analysis, reports |
| Qwen3 Coder 480B | `qwen/qwen3-coder-480b-a35b-instruct` | Code, exploits |
| Qwen 3.5 397B | `qwen/qwen3.5-397b-a17b` | Complex reasoning |
| Mistral Large 675B | `mistralai/mistral-large-3-675b-instruct-2512` | Balanced |
| Kimi K2 | `moonshotai/kimi-k2-instruct` | Long context |
| Devstral 123B | `mistralai/devstral-2-123b-instruct-2512` | Code/security |
| GLM5 | `z-ai/glm5` | Fast, lightweight |

### OpenClaw Agents

`commander`, `recon`, `hunter`, `intel`, `analyst`, `sentinel`, `gpt`, `obsidian`, `main`

Run an agent from Kali:
```bash
ssh root@187.124.85.249 "export OPENCLAW_GATEWAY_PASSWORD='iloveWintersun6?6' && openclaw agent --agent recon --local -m 'full recon on target.com'"
```

---

## Windows VPS — Build Server (147.93.180.110)

**Provider**: Contabo
**SSH**: `sshpass -p 'Wintersun6?6' ssh -o PubkeyAuthentication=no -o PreferredAuthentications=password Administrator@147.93.180.110`
**RDP**: `147.93.180.110:3389` (VNC pw: `Cr0wByte8`)
**Purpose**: Build CrowByte.exe / .msi installer (electron-builder requires native Windows)

### Build Process

```bash
# SSH in:
sshpass -p 'Wintersun6?6' ssh -o PubkeyAuthentication=no -o PreferredAuthentications=password Administrator@147.93.180.110

# On Windows:
cd C:\Users\Administrator\docs\crowbyte\apps\desktop
npx electron-builder --win --x64 --dir --config.npmRebuild=false

# Output: release\win-unpacked\CrowByte.exe
# Then upload to /opt/crowbyte/downloads/ on prod VPS
```

---

## Hostinger — Domain & DNS

**Control Panel**: Hostinger hPanel
**Domain**: crowbyte.io → A record → 147.93.44.58
**DNS**: Managed via Hostinger hPanel
**API Key**: `JjdDMxZDIPfXgUwcgvJYZzoxvrIuI1lENrF9qA5I2da7ab58`

### DNS Records

| Type | Name | Value |
|------|------|-------|
| A | @ | 147.93.44.58 |
| A | www | 147.93.44.58 |
| CNAME | staging | crowbyte.io |
| (others) | — | — |

---

## Codebase Layout (`apps/desktop/`)

```
src/
├── App.tsx                    ← Router, license gate, OAuth handler
├── pages/                     ← One file per route
│   ├── LandingPage.tsx        ← Public marketing (assembled from components/landing/)
│   ├── Auth.tsx               ← Login / signup / OAuth
│   ├── Dashboard.tsx
│   ├── Chat.tsx               ← Claude chat (Electron: real Claude, Web: OpenClaw)
│   ├── CVE.tsx, Findings.tsx, RedTeam.tsx, etc.
│   └── settings/              ← /settings/* sub-pages
├── components/
│   ├── landing/               ← Hero, Navbar, Pricing, Features, etc.
│   ├── ui/                    ← shadcn/ui primitives
│   ├── InlineAIMenu.tsx       ← Per-row AI actions
│   └── SectionAIBar.tsx       ← Page-level AI bar
├── services/
│   ├── openclaw.ts            ← NVIDIA AI via VPS proxy (primary AI)
│   ├── section-agent.ts       ← Inline AI for page sections
│   ├── claude-provider.ts     ← Real Claude via Electron IPC (Chat page)
│   ├── sentinel-central.ts    ← Security monitoring
│   ├── license-guard.ts       ← Electron license check
│   └── ...
├── contexts/
│   ├── auth/                  ← AuthProvider, useAuth, onAuthStateChange
│   └── ...
└── lib/
    ├── supabase.ts            ← Supabase anon client
    ├── platform.ts            ← IS_ELECTRON / IS_WEB
    └── admin.ts               ← isAdmin()
```

### Other Apps

| App | Path | Status | Notes |
|-----|------|--------|-------|
| `apps/desktop` | `/mnt/bounty/Claude/crowbyte/apps/desktop` | **Active** | Main app (Electron + web SPA) |
| `apps/server` | `/mnt/bounty/Claude/crowbyte/apps/server` | **Active** | Express API on prod VPS |
| `apps/agents` | `/mnt/bounty/Claude/crowbyte/agents` | **Active** | Background agents (CVE sync, threat) |
| `apps/website` | `/mnt/bounty/Claude/crowbyte/apps/website` | **Deprecated** | Old separate website — replaced by landing in desktop |
| `sentinel/` | `/mnt/bounty/Claude/crowbyte/sentinel` | Unknown | Go binary — check if still used |

### Supporting Folders

| Folder | What |
|--------|------|
| `supabase/` | Migrations + edge functions |
| `packages/types,ui,utils` | Shared packages (monorepo) |
| `mcp-servers/nvd,resend` | Custom MCP servers |
| `tools/browser-ctl,ti-collector,ti-lookup` | CLI tools |
| `social/branding` | Logos, brand assets |
| `automation/discord,make,newsletter` | Marketing automation |
| `docs/claude docs/` | **Claude-specific docs (read these)** |
| `docs/research/` | Competitor analysis, market research |
| `docs/archive/` | Old planning docs |

---

## Environment Variables Quick Reference

```bash
# Supabase
VITE_SUPABASE_URL=https://gvskdopsigtflbbylyto.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ...
VITE_SUPABASE_SERVICE_KEY=<service role — Electron .env only>

# App
VITE_BUILD_TARGET=web|electron
VITE_APP_URL=https://crowbyte.io
VITE_GLITCHTIP_DSN=https://16ea5a1e0b304fc086a19d080d003897@app.glitchtip.com/21559

# OpenClaw / NVIDIA
VITE_OPENCLAW_HOST=srv1459982.hstgr.cloud
VITE_NVIDIA_API_KEY=REDACTED_NVIDIA_KEY
VITE_OPENCLAW_GATEWAY_TOKEN=REDACTED_OPENCLAW_TOKEN
VITE_OPENCLAW_SSH_PASSWORD=REDACTED_VPS_PASS
```

Files:
- `.env` — local dev (all keys including service key)
- `.env.production` — web production (no service key, `VITE_BUILD_TARGET=web`)
- `.env.staging` — staging build

---

## Monitoring & Logs

| What | Where |
|------|-------|
| Error tracking | GlitchTip: `https://app.glitchtip.com` (project 21559) |
| PM2 API logs | VPS: `~/.pm2/logs/crowbyte-api-out.log` |
| PM2 API errors | VPS: `~/.pm2/logs/crowbyte-api-error.log` |
| nginx access | VPS: `/var/log/nginx/access.log` |
| nginx errors | VPS: `/var/log/nginx/error.log` |
| In-app logs | Settings > Logs page (via LogsProvider) |
