# Changelog

All notable changes to CrowByte Terminal are documented in this file.

---

## [2.0.0] - 2026-03-23

### Added

- **CrowByte Server** (`apps/server/`) -- Web server for headless VPS deployment
  - Express + WebSocket server serving the React SPA on port 6080
  - Hardware monitoring API via systeminformation (CPU, RAM, disk, network, GPU, Docker, services)
  - Security tool execution API with 24 whitelisted tools (nmap, nuclei, sqlmap, ffuf, etc.)
  - Docker container management API via dockerode (list, start, stop, restart, logs, stats)
  - WebSocket terminal powered by node-pty for interactive shell sessions
  - WebSocket real-time metrics stream for live hardware monitoring
  - JWT authentication with bcrypt password hashing
  - Rate limiting on authentication endpoints (express-rate-limit)
  - Helmet security headers
  - CORS configuration
  - REST routes: `/api/auth`, `/api/system`, `/api/docker`, `/api/tools`
  - nginx reverse proxy configuration with SSL (`apps/server/nginx-crowbyte.conf`)
  - systemd service unit (`apps/server/crowbyte-server.service`)
  - Deployment script (`apps/server/deploy.sh`)
  - Environment example file (`apps/server/.env.example`)

- **CrowByte OS Installer** (`crowbyte-os-setup.sh`) -- 7-phase Ubuntu 24.04 setup
  - Phase 1: System preparation and dependency installation
  - Phase 2: Node.js and build toolchain
  - Phase 3: Security tools (nmap, nuclei, sqlmap, ffuf, subfinder, httpx, etc.)
  - Phase 4: Docker Engine installation
  - Phase 5: CrowByte Server build and deployment
  - Phase 6: nginx reverse proxy with Let's Encrypt SSL
  - Phase 7: systemd service registration and startup

- **Fleet Management** -- Host Server card with live hardware metrics
  - Real-time CPU, RAM, disk, and network usage from server API
  - WebSocket-driven metric updates
  - Docker container status overview

- **Setup Wizard** (`src/pages/SetupWizard.tsx`) -- 5-step onboarding flow
  - EULA acceptance
  - License key activation
  - Database connection (Supabase)
  - VPS agent configuration
  - Workspace initialization

- **CI/CD Pipeline** (`.github/workflows/`)
  - `docker.yml` -- GitHub Actions for Docker multi-architecture builds (amd64 + arm64), push to Docker Hub
  - `release.yml` -- Electron desktop app packaging and GitHub Releases

- **Windows Docker Support**
  - `Dockerfile.windows` -- Windows container image
  - `docker/entrypoint.ps1` -- PowerShell entrypoint for Windows containers

- **Legal Documents** (`legal/`)
  - End User License Agreement (`EULA.md`)
  - Terms of Service (`TERMS_OF_SERVICE.md`)
  - Privacy Policy (`PRIVACY_POLICY.md`)
  - Acceptable Use Policy (`ACCEPTABLE_USE_POLICY.md`)

- **New Pages**
  - Connectors page -- 19 pre-built security platform integrations
  - MCP page -- Model Context Protocol server management
  - Memory page -- AI memory and context management
  - LLM page -- Language model configuration and testing
  - Analytics page -- Usage statistics and tool metrics
  - Auth page -- Authentication flow
  - Agent Testing page -- Agent validation and testing

- **Docker Compose** (`docker-compose.yml`) -- Multi-service orchestration

- **Install Script** (`install.sh`) -- Alternative installation method

### Changed

- **Dockerfile** -- Fixed inline comments breaking build, corrected package names, added multi-architecture Go tool support for nuclei/subfinder/httpx
- **Fleet.tsx** -- Added Host Server card with real-time hardware metrics fetched from the CrowByte Server API
- **main.cjs** (Electron main process) -- Production mode now loads `dist/index.html` instead of attempting to connect to the Vite dev server
- **Project structure** -- Reorganized into monorepo with `apps/desktop/` and `apps/server/`

### Security

- Purged all hardcoded secrets from the repository
- Git history rewritten to a clean initial commit
- Backend folder excluded from GitHub via `.gitignore`
- Tool execution whitelist on server prevents arbitrary command injection (only 24 approved binaries)
- Rate limiting on authentication endpoints prevents brute force attacks
- JWT tokens with configurable expiration for server API access
- Helmet middleware enforces secure HTTP headers on all server responses

---

## [1.0.0] - 2025-11-29

### Added

- Initial release of CrowByte Terminal as an Electron desktop application
- Dashboard with metrics and quick actions
- Dual-provider AI Chat (Claude Code CLI + OpenClaw agent swarm)
- Embedded xterm.js terminal with tmux support
- Red Team operations tracking with findings
- Cyber Ops tactical toolkit
- Network Scanner with nmap GUI (9 scan profiles)
- Security Monitor with AI-powered alerting
- Fleet Management for endpoint monitoring
- CVE Database with NVD and Shodan enrichment
- Threat Intelligence correlation
- Mission Planner with phase-based operation planning
- Knowledge Base with categories and tagging
- Bookmarks with categories and favicons
- Agent Builder for custom AI agents
- AI Agent with Tavily-powered search
- Documentation page with dedicated sidebar
- Settings and preferences
- Supabase backend (PostgreSQL with RLS)
- E2E AES-256-GCM encryption for remote sessions
- OpenClaw VPS agent swarm integration (9 agents)
- MCP server integration (d3bugr, Shodan, filesystem)
- CLI tools: `cve-db` and `kb`
