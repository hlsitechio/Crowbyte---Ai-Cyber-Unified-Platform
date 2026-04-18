# CrowByte — All Files By VPS

---

## VPS 1 — CrowByte Production (147.93.44.58)

### Web App (Live)
```
/opt/crowbyte/web/                         ← LIVE web root (nginx serves this)
  index.html                               ← SPA entry point
  assets/                                  ← Vite chunks (hashed filenames)
  fonts/                                   ← 19 self-hosted WOFF2 files
  version.json                             ← Current build version
  robots.txt, sitemap.xml, site.webmanifest
  install.sh, install.ps1                  ← Fleet agent install scripts
  update.sh, update.ps1                    ← Fleet agent update scripts
  og-image.png, crowbyte-logo.png, etc.    ← Static assets

/opt/crowbyte/staging/                     ← Staging deploy (staging.crowbyte.io)
/opt/crowbyte/web_prev_TIMESTAMP/          ← Previous release (rollback target, 3 kept)
```

### API Server
```
/opt/crowbyte/server/
  src/index.ts                             ← Express API source (TypeScript)
  dist/index.js                            ← Compiled API (what PM2 runs)
  dist/index.js.map                        ← Source map
  package.json
  tsconfig.json
  .env                                     ← API secrets (Supabase service key, etc.)
  .env.example
  deploy.sh                                ← Server deploy script
  nginx-crowbyte.conf                      ← nginx config backup
  crowbyte-server.service                  ← Systemd unit (unused — PM2 used instead)
```

### Background Agents
```
/opt/crowbyte/agents/
  runner.ts                                ← Agent runner entry point
  agents/
    cve-agent.ts                           ← Syncs CVEs from NVD → Supabase
    threat-agent.ts                        ← Syncs threat IOCs from 22 feeds
    digest-agent.ts                        ← Builds daily security digest
    news-agent.ts                          ← Fetches cyber news feeds
  fleet-agent/
    crowbyte-agent.py                      ← Python fleet monitoring agent (deploy to endpoints)
    install.sh                             ← Fleet agent installer
  lib/
    supabase-admin.ts                      ← Admin Supabase client
    tier-limits.ts                         ← Subscription tier enforcement
    env.ts                                 ← Env var helpers
  dist/runner.js                           ← Compiled runner
  .env                                     ← Agent secrets
  package.json, tsconfig.json
```

### Services (PM2-managed, auto-start)
```
/opt/crowbyte/services/
  mailer.mjs                               ← Email via Resend API (port 3002)
  mailer.mjs.bak                           ← Backup
  download-gate.mjs                        ← Download page gate (port 3001)
  oauth-proxy.js                           ← GitHub OAuth proxy (port 19858)
  terminal/
    server.js                              ← Terminal WebSocket server (port 18822)
    package.json, package-lock.json
  desktop/
    start.sh                               ← noVNC desktop launcher (port 6080)
    upload-server.js                       ← File upload handler (port 6090)
```

### CrowByte CLI (npm package)
```
/opt/crowbyte/cli/
  src/index.ts                             ← CLI source
  dist/index.js, dist/index.d.ts           ← Compiled CLI
  bin/run.js, bin/dev.js                   ← Executable entry points
  scripts/
    install.sh                             ← CLI install script
    uninstall.sh
    openclaw-setup.sh                      ← OpenClaw configuration helper
    byterover-legacy-plugin.sh
  package.json, tsconfig.json
  CLAUDE.md, README.md, CHANGELOG.md
```

### Memory Engine
```
/opt/crowbyte/memory-engine/
  engine.py                                ← SQLite + FTS5 memory engine
  bridge.py                                ← MCP bridge (exposes to Claude)
  observations.py                          ← Observation management
  semantic.py                              ← Semantic search
  memory.db                                ← Live SQLite database
  memory-dev-backup.db                     ← Dev backup
```

### Downloads (installer distribution)
```
/opt/crowbyte/downloads/
  CrowByte-Setup-2.2.0.exe                 ← Windows NSIS installer (current)
  CrowByte-2.2.0-x64.msi                   ← Windows MSI installer (current)
  CrowByte-2.2.0.AppImage                  ← Linux AppImage (current)
  crowbyte_2.2.0_amd64.deb                 ← Linux deb (current)
  CrowByte-2.1.0-arm64.dmg                 ← macOS DMG (prev)
  CrowByte-2.1.0-amd64.deb                 ← Linux deb (prev)
  archive/                                 ← Previous version installers
  latest/
    manifest.json                          ← Auto-update manifest
  crowbyte-build-complete.tar.gz           ← Full build archive
```

### Backups
```
/opt/crowbyte/backups/
  SURVIVAL-GUIDE.md                        ← Emergency recovery instructions
  crowbyte-nginx.bak                       ← nginx config backup
  2.1.88/
    MANIFEST.md
    extract-claude-code.mjs
```

### nginx Configuration
```
/etc/nginx/sites-enabled/
  crowbyte                                 ← Main site (crowbyte.io)
  status-crowbyte                          ← Status page (status.crowbyte.io)
  staging-crowbyte                         ← Staging (staging.crowbyte.io)
/etc/nginx/snippets/
  security-headers.conf                    ← CSP, HSTS, X-Frame, all security headers
  canary-endpoints.conf                    ← /.env /.git /admin *.php honeypots
  fastcgi-php.conf                         ← PHP FastCGI (default)
  snakeoil.conf                            ← Default SSL cert
/etc/nginx/nginx.conf                      ← Main nginx config (log_format canary defined here)
```

### Security
```
/etc/fail2ban/jail.d/
  crowbyte.conf                            ← 4 custom jails (auth/bots/canary/4xx)
  defaults-debian.conf                     ← Default Debian jails
/etc/fail2ban/filter.d/
  crowbyte-auth.conf                       ← Auth failure filter
  crowbyte-bots.conf                       ← Bot pattern filter
  crowbyte-canary.conf                     ← Canary hit filter
/etc/iptables/
  rules.v4                                 ← IPv4 rules — CROWBYTE-CF chain (CF IPs only on 80/443)
  rules.v6                                 ← IPv6 rules — CROWBYTE-CF6 chain
```

### Custom Binaries
```
/usr/local/bin/
  canary-watch                             ← Canary log watcher script
  crowbyte-session                         ← Session management helper
  sqlmap                                   ← sqlmap (security tool)
  zellij                                   ← Terminal multiplexer
```

---

## VPS 2 — OpenClaw Agent Swarm (187.124.85.249)

### Systemd Services (active)

```
/etc/systemd/system/
  openclaw-gateway.service                 ← OpenClaw gateway (port 18789)
  nvidia-proxy.service                     ← NVIDIA API prefix proxy (port 19990)
  openclaw-bridge.service                  ← OpenClaw ↔ MCP bridge
  openclaw-dashboard.service               ← Agent dashboard
  openclaw-dashboard.timer
  openclaw-mcp.service                     ← MCP server for OpenClaw
  swarm-daemon.service                     ← Agent swarm daemon
  command-center.service                   ← Command center UI
  command-center-mission-worker.service    ← Mission worker
  command-center-mission-worker.timer

  ── Security Intel Services ──
  crowbyte-central.service                 ← Sentinel central (port 7890, deepseek-v3)
  crowbyte-sentinel.service                ← Sentinel agent
  crowbyte-sentinel.timer
  crowbyte-feeds.service                   ← Threat feed collector
  crowbyte-alerter.service                 ← Alert engine
  crowbyte-alerter.timer
  crowbyte-classifier.service              ← Alert classifier
  crowbyte-classifier.timer
  crowbyte-reporter.service                ← Report generator
  crowbyte-reporter.timer

  ── Scheduled Intel Digests ──
  morning-cyber-briefing.service + .timer  ← Daily morning brief
  midday-threat-update.service + .timer    ← Midday threat update
  evening-security-digest.service + .timer ← Evening digest
  cyber-tech-news.service + .timer         ← Tech news aggregator
  intel-delivery-router.service + .timer   ← Intel routing
  cve-ingest.service + .timer              ← CVE ingestion from NVD
  openclaw-campaign-correlator.service + .timer
  openclaw-digest.service + .timer
  openclaw-fts-index.service + .timer
  openclaw-health.service + .timer
  openclaw-incident.service + .timer
  openclaw-sysmap.service + .timer
  openclaw-world-watch.service + .timer
  downdetector-ai.service + .timer
  post-automation-schedule.service + .timer
  tech-radar.service

  ── Desktop/VNC (for CrowByte desktop mode) ──
  crowbyte-desktop.service                 ← noVNC desktop
  crowbyte-vnc.service                     ← VNC server
  crowbyte-xvfb.service                    ← Xvfb virtual display
  crowbyte-ws-relay.service                ← WebSocket relay
  chrome-relay.service                     ← Chrome CDP relay
  crowbyte-onboarding.service              ← Onboarding flow service

  ── GitHub Actions Runner ──
  actions.runner.hlsitechio-crowbyte.crowbyte-vps.service
  paperclip.service
```

---

## VPS 3 — Windows Build Server (147.93.180.110)

### Source Code
```
C:\Users\Administrator\docs\crowbyte\
  apps\desktop\                            ← Main Electron app source
    src\                                   ← React + TypeScript
    electron\
      main.cjs                             ← Electron main process (EDITED — show:false + ready-to-show)
      preload.js                           ← IPC bridge
      launch.cjs                           ← Dev launcher
      proxy-server.cjs                     ← HTTP proxy
    public\                                ← Static assets
    dist\                                  ← Vite build output (Electron)
    dist\web\                              ← Vite build output (Web — not used here)
    release\
      CrowByte-Setup-2.2.0.exe             ← NSIS installer (~153MB, signed)
      CrowByte-2.2.0-x64.msi              ← MSI installer (~163MB, signed)
      win-unpacked\                        ← Unpacked app (~210MB)
        electron.exe                       ← App executable
        resources\app.asar                 ← Compiled React app
        resources\app.asar.unpacked\       ← node-pty, ttf2woff2 (native modules)
    package.json                           ← Build config with exclusion list
    vite.config.ts
    tailwind.config.ts
    tsconfig.json
    .env                                   ← Secrets (do not commit)
```

### WSL
```
WSL version: 2.6.3.0
Kernel: 6.6.87.2-1
Installed distros:
  Ubuntu (WSL1 — stopped)                  ← Can't run Docker until Contabo enables nested virt
```

### Docker Desktop
```
Version: 29.4.0
Status: BROKEN — WSL2 backend not available (nested virt disabled)
Pending: Contabo support ticket to enable nested virtualization → wsl --set-version Ubuntu 2
```

---

## Local Kali (100.107.82.73)

### Bounty Drive
```
/mnt/bounty/Claude/crowbyte/               ← Source code (git repo)
  apps/desktop/                            ← Main app source
  docs/new_docs/                           ← This documentation
  docs/claude docs/                        ← Previous docs (still valid)

/mnt/bounty/Claude/.claude/               ← Claude Code config
/mnt/bounty/Claude/MEMORY.md              ← Long-term knowledge
```

### Custom Binaries (/usr/local/bin/)
```
cntb                                       ← Contabo CLI v1.6
cve-db                                     ← CVE database CLI tool
ti-collector                               ← Threat intel collector CLI
ti-lookup                                  ← Real-time threat intel lookup
kb                                         ← Knowledge base CLI
browser-ctl                                ← Embedded browser control (port 19191)
```

### MCP Servers (connected to Claude)
```
d3bugr        → Railway hosted — 142 security tools
shodan        → Direct Shodan API
filesystem    → /home/rainkode file operations
memory-engine → SQLite + FTS persistent memory (port 37777 viewer)
fetch         → HTTP requests
youtube-transcript → Video transcripts
netlify       → Deploy management
```
