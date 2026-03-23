<p align="center">
  <img src="docs/assets/banner.png" alt="CrowByte Terminal" width="800" />
</p>

<h1 align="center">CrowByte Terminal</h1>

<p align="center">
  <strong>Enterprise-grade cybersecurity operations platform</strong><br>
  AI-powered threat intelligence, fleet management, and offensive security — unified.
</p>

<p align="center">
  <a href="https://crowbyt.io"><img src="https://img.shields.io/badge/Website-crowbyt.io-0a0a0a?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiMxMGI5ODEiIHN0cm9rZS13aWR0aD0iMiI+PHBhdGggZD0iTTEyIDJhMTAgMTAgMCAxIDAgMTAgMTBBMTAgMTAgMCAwIDAgMTIgMloiLz48L3N2Zz4=&logoColor=10b981" alt="Website" /></a>
  <a href="https://discord.gg/crowbyt"><img src="https://img.shields.io/badge/Discord-Community-5865F2?style=for-the-badge&logo=discord&logoColor=white" alt="Discord" /></a>
  <img src="https://img.shields.io/badge/Version-2.0.0-10b981?style=for-the-badge" alt="Version" />
  <img src="https://img.shields.io/badge/License-Proprietary-ef4444?style=for-the-badge" alt="License" />
  <img src="https://img.shields.io/badge/Platform-Linux%20%7C%20Windows%20%7C%20macOS-3b82f6?style=for-the-badge" alt="Platform" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Electron-39-47848F?style=flat-square&logo=electron&logoColor=white" />
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/TypeScript-5.8-3178C6?style=flat-square&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Vite-7-646CFF?style=flat-square&logo=vite&logoColor=white" />
  <img src="https://img.shields.io/badge/Supabase-PostgreSQL-3FCF8E?style=flat-square&logo=supabase&logoColor=white" />
  <img src="https://img.shields.io/badge/Tailwind-3-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white" />
</p>

---

## Overview

CrowByte Terminal is a cross-platform desktop application built for security teams, penetration testers, and SOC analysts. It combines AI-assisted operations, real-time fleet monitoring, network topology mapping, and offensive security tooling into a single unified interface.

<p align="center">
  <img src="docs/assets/screenshot-dashboard.png" alt="Dashboard" width="800" />
</p>

## Features

### Core Platform

| Feature | Description |
|---------|-------------|
| **AI Operations Center** | Dual-provider AI chat — Claude Code CLI + OpenClaw agent swarm (DeepSeek, Qwen, Mistral, Kimi, GLM) |
| **Fleet Management** | Real-time endpoint monitoring, health checks, remote desktop (VNC/WSS), agent deployment |
| **Network Map** | Interactive ReactFlow topology — drag-and-drop infrastructure visualization with nmap integration |
| **CVE Intelligence** | NVD + Shodan-enriched vulnerability database with severity tracking and exploit status |
| **Connectors** | 19 pre-built integrations — Microsoft Sentinel, CrowdStrike, Elastic, Wazuh, AWS, Azure, and more |
| **Red Team Ops** | Operation planning, findings tracking, and automated reporting |
| **Terminal** | Embedded xterm.js terminal with tmux session support |

### Security Tooling

| Tool | Capability |
|------|-----------|
| **Network Scanner** | nmap GUI with 9 scan profiles — Quick, Stealth, Vuln, OS detect, Full port |
| **Cyber Ops** | Tactical toolkit — recon, exploitation, OSINT, payload generation |
| **Mission Planner** | Phase-based operation planning with objective tracking |
| **Knowledge Base** | Searchable research database with categories and tagging |
| **Threat Intelligence** | CVE correlation, exploit tracking, product vulnerability mapping |

### Infrastructure

| Component | Details |
|-----------|---------|
| **Remote Desktop** | Built-in VNC viewer over encrypted WebSocket (noVNC + websockify TLS) |
| **Agent Swarm** | 9 AI agents on VPS — recon, hunter, intel, analyst, commander, sentinel |
| **MCP Servers** | Model Context Protocol integration — d3bugr (142 tools), Shodan, filesystem |
| **Session Recording** | Full audit trail with consent tracking and E2E encryption metadata |

## Architecture

```
crowbyte/
  apps/
    desktop/                 # Electron 39 desktop application
      src/
        pages/               # 20+ application pages
        components/          # UI components (shadcn/ui + custom)
        services/            # Backend service layer
        contexts/            # React context providers
        hooks/               # Custom React hooks
        connectors/          # Security platform integrations
      electron/              # Main process + preload
  backend/                   # API services
  infrastructure/            # VPS setup scripts, remote control
  supabase/                  # Database migrations + edge functions
  mcp-servers/               # AI tool servers (NVD, CIRCL, Resend)
  packages/                  # Shared libraries
  tools/                     # CLI utilities (cve-db, kb)
  docs/                      # Documentation + assets
  scripts/                   # Build, deploy, automation
```

## Tech Stack

<table>
<tr>
<td><strong>Frontend</strong></td>
<td>React 18, TypeScript 5.8, Vite 7, Tailwind CSS 3, Framer Motion, Radix UI (shadcn/ui)</td>
</tr>
<tr>
<td><strong>Desktop</strong></td>
<td>Electron 39 with custom title bar, WebContentsView browser panel, IPC bridge</td>
</tr>
<tr>
<td><strong>Visualization</strong></td>
<td>ReactFlow (network topology), Recharts (analytics), xterm.js (terminal)</td>
</tr>
<tr>
<td><strong>Backend</strong></td>
<td>Supabase (PostgreSQL, RLS, Auth, Realtime, Storage, Edge Functions)</td>
</tr>
<tr>
<td><strong>AI</strong></td>
<td>Claude Code CLI (Opus/Sonnet/Haiku), OpenClaw gateway (NVIDIA Cloud models)</td>
</tr>
<tr>
<td><strong>Security</strong></td>
<td>E2E AES-256-GCM encryption, ECDH P-256 key exchange, TLS WebSocket relay</td>
</tr>
<tr>
<td><strong>Infrastructure</strong></td>
<td>Docker, systemd services, websockify, x11vnc, Xvfb, Traefik</td>
</tr>
</table>

## Quick Start

### Prerequisites

- Node.js 20+ or Bun 1.0+
- Electron 39+
- Supabase project (for backend services)

### Installation

```bash
# Clone the repository
git clone https://github.com/hlsitechio/crowbyte.git
cd crowbyte

# Install dependencies
bun install

# Configure environment
cp apps/desktop/.env.example apps/desktop/.env
# Edit .env with your Supabase keys

# Start development
cd apps/desktop
npx vite --port 8081        # Start Vite dev server
npx electron .              # Launch Electron app
```

### Build

```bash
# Production build
cd apps/desktop
npx vite build

# Package for distribution
npx electron-builder --linux --win --mac
```

## Database

CrowByte uses Supabase (PostgreSQL) with Row Level Security. Migrations are in `supabase/migrations/`:

| Migration | Tables |
|-----------|--------|
| `multi_tenant_platform` | Organizations, memberships, API keys, audit logs |
| `connectors_agents` | Security connectors, deployment agents, sync logs |
| `remote_sessions` | VNC sessions, action audit trail, file transfers |

```bash
# Apply migrations
supabase db push
```

## Connectors

Pre-built integrations with credential setup guides:

| Connector | Auth Type | Status |
|-----------|----------|--------|
| Microsoft Sentinel | OAuth2 (Azure AD) | Production |
| CrowdStrike Falcon | OAuth2 Client Credentials | Production |
| Microsoft Defender | OAuth2 (Azure AD) | Production |
| Microsoft Entra ID | OAuth2 (Azure AD) | Production |
| Splunk Enterprise | Bearer Token | Production |
| Elastic Security | API Key | Production |
| Wazuh | JWT (Username/Password) | Production |
| Palo Alto Cortex XDR | API Key + ID | Production |
| SentinelOne | API Token | Production |
| Qualys VMDR | Basic Auth | Production |
| AWS | IAM Access Key | Production |
| Azure | Service Principal | Production |
| Kubernetes | ServiceAccount Token | Production |
| Docker | TLS Client Certs | Production |
| Linux Server | SSH Key | Production |
| Windows Endpoints | WinRM | Production |
| Windows Server | WinRM + Kerberos | Production |
| Network Devices | Multi-vendor REST API | Production |
| VirusTotal | API Key | Production |

## Security

- All remote desktop sessions are encrypted (TLS 1.3 + optional E2E AES-256-GCM)
- Zero-knowledge relay — server never sees plaintext screen data
- Perfect forward secrecy with per-session ECDH key exchange
- Full session audit trail with granular action logging
- Row Level Security on all database tables
- CSP headers enforced in Electron renderer

## Contributing

This is a private repository. Internal contributions only.

1. Create a feature branch from `main`
2. Follow the existing code style (TypeScript strict, shadcn/ui components)
3. Ensure `npx tsc --noEmit` passes with zero errors
4. Submit a pull request with clear description

## License

Proprietary Software - HLSITech Inc. All rights reserved.

Unauthorized copying, modification, distribution, or use of this software is strictly prohibited.

---

<p align="center">
  <sub>Built with precision by <a href="https://hlsitech.io">HLSITech</a></sub>
</p>
