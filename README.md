<p align="center">
  <img src="docs/assets/banner.png" alt="CrowByte Terminal" width="800" />
</p>

<h1 align="center">CrowByte Terminal</h1>

<p align="center">
  <strong>Offensive Security Command Center</strong><br>
  Penetration testing, bug bounty hunting, and red team operations — unified.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/HLSITech-CrowByte-0a0a0a?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiMxMGI5ODEiIHN0cm9rZS13aWR0aD0iMiI+PHBhdGggZD0iTTEyIDJhMTAgMTAgMCAxIDAgMTAgMTBBMTAgMTAgMCAwIDAgMTIgMloiLz48L3N2Zz4=&logoColor=10b981" alt="HLSITech" />
  <img src="https://img.shields.io/badge/Version-2.0.0-10b981?style=for-the-badge" alt="Version" />
  <img src="https://img.shields.io/badge/License-Proprietary-ef4444?style=for-the-badge" alt="License" />
  <img src="https://img.shields.io/badge/Platform-Linux%20%7C%20Windows%20%7C%20macOS-3b82f6?style=for-the-badge" alt="Platform" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/TypeScript-5.8-3178C6?style=flat-square&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Vite-7-646CFF?style=flat-square&logo=vite&logoColor=white" />
  <img src="https://img.shields.io/badge/Electron-39-47848F?style=flat-square&logo=electron&logoColor=white" />
  <img src="https://img.shields.io/badge/Tailwind-3-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white" />
  <img src="https://img.shields.io/badge/Supabase-PostgreSQL-3FCF8E?style=flat-square&logo=supabase&logoColor=white" />
</p>

---

## What is CrowByte?

CrowByte Terminal is a unified command center for penetration testing, bug bounty hunting, and red team operations. It consolidates security tooling, AI-assisted analysis, fleet management, and intelligence gathering into a single interface.

- **Web-based or Desktop** -- Access from any browser via CrowByte OS, or run natively as an Electron desktop application.
- **Built-in AI Agents** -- Dual-provider AI chat powered by Claude Code CLI and the OpenClaw agent swarm (DeepSeek, Qwen, Mistral, Kimi, GLM on NVIDIA inference).
- **Integrated Security Toolkit** -- GUI wrappers for nuclei, nmap, sqlmap, ffuf, and dozens more tools. No context switching.
- **Fleet Management** -- Monitor endpoints and VPS infrastructure in real time with live hardware metrics, Docker container management, and agent deployment.
- **CVE Database** -- NVD and Shodan-enriched vulnerability tracking with severity grouping, exploit status, and product correlation.
- **Mission Planner** -- Phase-based operation planning with objective tracking and automated reporting.
- **Knowledge Base** -- Searchable research database with categories, tagging, and priority levels.
- **Real-time Hardware Monitoring** -- CPU, RAM, disk, network, GPU, and Docker metrics streamed over WebSocket.

<p align="center">
  <img src="docs/assets/screenshot-dashboard.png" alt="Dashboard" width="800" />
</p>

---

## Deployment Options

### 1. CrowByte OS (Recommended)

Native Ubuntu 24.04 server appliance. Full web UI accessible from any browser.

- Hardware monitoring (CPU, RAM, disk, network, GPU, Docker, services)
- Docker and security tools pre-installed
- systemd service with nginx reverse proxy and SSL
- 7-phase automated installer

```bash
# One-line install
curl -sL https://raw.githubusercontent.com/hlsitechio/crowbyte/main/crowbyte-os-setup.sh | sudo bash

# Or clone and run locally
git clone https://github.com/hlsitechio/crowbyte.git
cd crowbyte
sudo bash crowbyte-os-setup.sh
```

### 2. Docker

Containerized deployment with multi-architecture support (amd64 + arm64).

```bash
# Quick start
docker run -d -p 6080:6080 --shm-size=2g hlsitech/crowbyte:latest

# With docker-compose
docker-compose up -d
```

### 3. Desktop (Electron)

Native desktop application for Kali Linux, Ubuntu, Windows, and macOS.

```bash
cd apps/desktop
npm install
npx vite build
npx electron .
```

Direct terminal access via node-pty. Full Electron IPC bridge for spawning Claude Code CLI and security tools as child processes.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, TypeScript 5.8, Vite 7, Tailwind CSS 3, shadcn/ui (Radix), Framer Motion, Lucide icons |
| **Server** | Express, WebSocket, node-pty, systeminformation, dockerode |
| **Desktop** | Electron 39 with custom title bar, WebContentsView browser panel, IPC bridge |
| **Database** | Supabase (PostgreSQL, RLS, Auth, Realtime, Storage, Edge Functions) |
| **AI** | Claude Code CLI (Opus/Sonnet/Haiku), OpenClaw gateway (NVIDIA Cloud inference) |
| **Visualization** | ReactFlow (network topology), Recharts (analytics), xterm.js (terminal) |
| **Security** | E2E AES-256-GCM encryption, ECDH P-256 key exchange, TLS 1.3 WebSocket relay |
| **Infrastructure** | Docker, systemd, nginx, websockify, Traefik |

---

## Pages and Features

| Page | Description |
|------|-------------|
| **Dashboard** | Home screen with metrics, quick actions, and system overview |
| **Chat** | Dual-provider AI chat -- Claude Code CLI and OpenClaw agent swarm |
| **Terminal** | Embedded xterm.js terminal with tmux session support and node-pty |
| **Red Team** | Operation planning, findings tracking, and automated reporting |
| **Cyber Ops** | Tactical security toolkit -- recon, exploitation, OSINT, payload generation |
| **Network Scanner** | nmap GUI with 9 scan profiles -- Quick, Stealth, Vuln, OS detect, Full port |
| **Security Monitor** | AI-powered security monitoring and alerting |
| **Fleet Management** | Endpoint monitoring, host server metrics, Docker container management, agent deployment |
| **CVE Database** | NVD + Shodan-enriched vulnerability database with severity tracking and exploit status |
| **Threat Intelligence** | CVE correlation, exploit tracking, product vulnerability mapping |
| **Mission Planner** | Phase-based operation planning with objective tracking |
| **Knowledge Base** | Searchable research database with categories and tagging |
| **Bookmarks** | URL bookmarks with categories, tags, and favicons |
| **Agent Builder** | Custom AI agent creation with configurable capabilities |
| **AI Agent** | Tavily-powered autonomous search and analysis agent |
| **Analytics** | Usage statistics and tool metrics |
| **Connectors** | 19 pre-built integrations -- Sentinel, CrowdStrike, Elastic, Wazuh, AWS, Azure, and more |
| **MCP** | Model Context Protocol server management |
| **Settings** | Preferences, profile, workspace configuration |
| **Setup Wizard** | 5-step onboarding -- EULA, License, Database, VPS, Workspace |
| **Documentation** | In-app documentation with dedicated sidebar |
| **Logs** | Application and audit logging |
| **LLM** | Language model configuration and testing |
| **Memory** | AI memory and context management |

---

## Architecture

```
crowbyte/
  apps/
    desktop/                 # Electron 39 desktop application
      src/
        pages/               # 29 application pages
        components/          # UI components (shadcn/ui + custom)
        services/            # Backend service layer
        contexts/            # React context providers
        hooks/               # Custom React hooks
        connectors/          # Security platform integrations
      electron/              # Main process + preload
    server/                  # CrowByte Server (Express + WebSocket)
      src/
        routes/              # REST API (auth, system, docker, tools)
        ws/                  # WebSocket handlers (terminal, metrics)
        middleware/           # JWT auth middleware
      deploy.sh              # Server deployment script
      nginx-crowbyte.conf    # nginx reverse proxy config
      crowbyte-server.service # systemd unit file
  docker/                    # Docker entrypoints (Linux + Windows)
  legal/                     # EULA, Terms of Service, Privacy Policy, Acceptable Use Policy
  supabase/                  # Database migrations + edge functions
  mcp-servers/               # AI tool servers (NVD, CIRCL, Resend)
  tools/                     # CLI utilities (cve-db, kb)
  infrastructure/            # VPS setup scripts, remote control
  scripts/                   # Build, deploy, automation
  docs/                      # Documentation + assets
```

---

## Quick Start

### Ubuntu Server (CrowByte OS)

```bash
curl -sL https://raw.githubusercontent.com/hlsitechio/crowbyte/main/crowbyte-os-setup.sh | sudo bash
```

### Docker

```bash
docker run -d -p 6080:6080 --shm-size=2g hlsitech/crowbyte:latest
```

### From Source

```bash
git clone https://github.com/hlsitechio/crowbyte.git
cd crowbyte

# Install dependencies
bun install

# Desktop app
cd apps/desktop
cp .env.example .env    # Configure Supabase keys
npx vite build
npx electron .

# Server (headless)
cd apps/server
cp .env.example .env    # Configure JWT secret, credentials
npm start
```

### Package for Distribution

```bash
cd apps/desktop
npx electron-builder --linux --win --mac
```

---

## Database

CrowByte uses Supabase (PostgreSQL) with Row Level Security. Key tables:

| Table | Purpose |
|-------|---------|
| `cves` | CVE tracking -- severity, CVSS, description, products, CWE, exploit status |
| `knowledge_base` | Research entries with categories, priority, tags, file attachments |
| `bookmarks` | Saved URLs with categories, tags, favicons |
| `custom_agents` | Agent Builder configurations -- model, instructions, capabilities |
| `red_team_ops` | Operations and findings -- target, type, status, findings array |
| `endpoints` | Fleet device registry |
| `user_settings` | Preferences, workspace name, profile picture |
| `analytics` | Tool usage statistics |

```bash
supabase db push
```

---

## Security

- E2E AES-256-GCM encryption for remote sessions
- ECDH P-256 key exchange with perfect forward secrecy
- TLS 1.3 for all WebSocket connections
- Row Level Security on all database tables
- Content Security Policy enforced in Electron renderer
- JWT authentication with rate limiting on server endpoints
- Tool execution whitelist prevents arbitrary command injection
- No plaintext credential storage
- Full audit trail for remote access sessions

See [SECURITY.md](SECURITY.md) for vulnerability reporting.

---

## License

Proprietary Software -- HLSITech Inc. All rights reserved.

Unauthorized copying, modification, distribution, or use of this software is strictly prohibited. See [LICENSE](LICENSE) for details.

Legal documents are available in the [legal/](legal/) directory:
- [EULA](legal/EULA.md)
- [Terms of Service](legal/TERMS_OF_SERVICE.md)
- [Privacy Policy](legal/PRIVACY_POLICY.md)
- [Acceptable Use Policy](legal/ACCEPTABLE_USE_POLICY.md)

---

<p align="center">
  <sub>Built by <a href="https://hlsitech.io">HLSITech</a></sub>
</p>
