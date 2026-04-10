<h1 align="center">
  <br />
  <strong>CrowByte</strong>
  <br />
  <sub>The Unified AI Platform for Security Teams</sub>
</h1>

<p align="center">
  <a href="https://crowbyte.io"><img src="https://img.shields.io/badge/crowbyte.io-Launch_App-f97316?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTEyIDIyYzUuNTIzIDAgMTAtNC40NzcgMTAtMTBTMTcuNTIzIDIgMTIgMiAyIDYuNDc3IDIgMTJzNC40NzcgMTAgMTAgMTB6Ii8+PHBhdGggZD0iTTIgMTJoMjAiLz48cGF0aCBkPSJNMTIgMmExNS4zIDE1LjMgMCAwIDEgNCAxMCAxNS4zIDE1LjMgMCAwIDEtNCAxMCAxNS4zIDE1LjMgMCAwIDEtNC0xMCAxNS4zIDE1LjMgMCAwIDEgNC0xMHoiLz48L3N2Zz4=" alt="Launch App" /></a>
  <a href="https://github.com/hlsitechio/crowbyte/releases/latest"><img src="https://img.shields.io/badge/Desktop-v2.1.0-3b82f6?style=for-the-badge&logo=electron&logoColor=white" alt="Desktop" /></a>
  <a href="https://github.com/hlsitechio/crowbyte/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-Proprietary-ef4444?style=for-the-badge" alt="License" /></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React_18-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Electron_39-47848F?style=flat-square&logo=electron&logoColor=white" alt="Electron" />
  <img src="https://img.shields.io/badge/Supabase-3FCF8E?style=flat-square&logo=supabase&logoColor=white" alt="Supabase" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white" alt="Tailwind" />
  <img src="https://img.shields.io/badge/Vite_7-646CFF?style=flat-square&logo=vite&logoColor=white" alt="Vite" />
</p>

<p align="center">
  <img src="https://crowbyte.io/og-image.png?v=3" alt="CrowByte — The Unified AI Platform for Security Teams" width="800" />
</p>

---

> **Web app is live** — start free at [crowbyte.io](https://crowbyte.io). No credit card required.
> Desktop releases (.deb, .AppImage, .exe, .msi, .dmg) available in [Releases](https://github.com/hlsitechio/crowbyte/releases).

---

## What is CrowByte?

CrowByte is an **AI-powered offensive security platform** that replaces the 20+ browser tabs, terminal windows, and note apps in a pentester's workflow with one unified command center.

- **53 pages** of integrated security tooling
- **75 services** powering recon, exploitation, reporting, and monitoring
- **9 autonomous AI agents** for parallel task execution
- **7 LLM providers** with 12+ models
- **82+ database tables** for persistent operations data
- **MCP server** exposing security tools to any AI assistant

Built for penetration testers, bug bounty hunters, red team operators, and security engineers.

---

## Platform Overview

### AI Agent Swarm

Deploy specialized AI agents that operate in parallel across your engagement:

| Agent | Role |
|-------|------|
| **Commander** | Orchestrates multi-agent operations and task routing |
| **Recon** | Subdomain enumeration, port scanning, service fingerprinting |
| **Hunter** | Vulnerability discovery and exploit chain identification |
| **Intel** | OSINT gathering, threat intelligence correlation |
| **Analyst** | Data analysis, pattern recognition, anomaly detection |
| **Sentinel** | Continuous monitoring, alert triage, change detection |
| **GPT** | General-purpose research and code analysis |
| **Obsidian** | Knowledge management and documentation |
| **Main** | Direct task execution and shell operations |

Agents run on dedicated infrastructure with GPU acceleration via NVIDIA NIM. Each agent reads from a shared skill library and can execute CrowByte CLI tools autonomously.

### AI Models

| Provider | Models | Access |
|----------|--------|--------|
| **OpenClaw Gateway** | DeepSeek V3.2, Qwen3 Coder 480B, Qwen 3.5 397B, Mistral Large 675B, Kimi K2, GLM5 | Web + Desktop |
| **Anthropic** | Claude Opus 4.6, Sonnet 4.6, Haiku 4.5 | Desktop |
| **NVIDIA NIM** | Any NIM-hosted model | Via gateway |
| **Self-hosted** | Ollama / vLLM | Desktop |
| **Custom** | Any OpenAI-compatible endpoint | Desktop |

### Mission Pipeline

Phase-based operation planning from scope definition through exploitation to final deliverable:

```
Scope Import > Recon > Enumeration > Vulnerability Analysis > Exploitation > Post-Exploitation > Reporting
```

Track objectives, task dependencies, and status transitions across the full engagement lifecycle. Link findings to missions, auto-populate reports from discovered vulnerabilities.

### CVE Intelligence

Real-time vulnerability database powered by NVD + Shodan CVEDB + CISA KEV:

- CVSS scoring with vector breakdown
- Exploit availability tracking (PoC, weaponized, in-the-wild)
- Product correlation and CWE mapping
- Bookmark and annotate CVEs per engagement
- CLI access: `cb tool cve_lookup --action lookup --query CVE-2024-3400`

### Integrated Terminal

Full xterm.js terminal with tmux session management:

- Multiple tabs and split panes
- Shell presets for common tool chains
- Output capture for automatic report evidence
- Powered by node-pty with full PTY support

### Fleet Management

Monitor endpoints, VPS nodes, and containers:

- Real-time CPU, RAM, disk, network metrics
- Process inspection and remote command execution
- Agent deployment and health monitoring
- Encrypted remote desktop (ECDH + AES-256-GCM)

### Report Generator

Professional pentest and bug bounty reports:

- **HackerOne** format with severity, impact, and reproduction steps
- **Bugcrowd** VRT-aligned templates
- **Custom** markdown and HTML exports
- Auto-populated from findings with evidence attachments
- CLI access: `cb tool hunt --action report --format hackerone`

### Detection Rule Lab

Author, test, and manage detection rules:

- **SIGMA** — SIEM correlation rules
- **KQL** — Azure Sentinel / Elastic queries
- **YARA** — Malware analysis signatures
- **Snort / Suricata** — Network detection rules

### Incident & Security Management (ISM)

Enterprise security operations:

- Case management with SLA tracking
- Compliance mapping (CIS, SOC2, PCI-DSS, HIPAA, NIST)
- Alert correlation and triage workflows
- Cloud security posture (AWS, GCP, Azure)

### Knowledge Base

Searchable research database:

- Techniques, tool notes, methodology references
- Tag, categorize, and attach files
- Full-text search across all entries
- CLI access: `kb save "title" "content"` / `kb search "query"`

---

## CrowByte CLI

The CLI (`cb`) exposes CrowByte's security tools for direct execution from any terminal or AI agent.

### Installation

```bash
npm install -g crowbyte-cli
```

### Security Tools

```bash
# Reconnaissance (subfinder + httpx + nmap + nuclei)
cb tool recon --target example.com --mode full

# Vulnerability scanning (nuclei + sqlmap + ffuf + dalfox)
cb tool vuln_scan --target "https://example.com/page?id=1" --scan_type sqli --parameter id

# Shodan intelligence
cb tool shodan_lookup --action ip --query 1.2.3.4

# CVE database (NVD + Shodan CVEDB + CISA KEV)
cb tool cve_lookup --action lookup --query CVE-2024-3400

# Bug bounty hunt session
cb tool hunt --action start --hunt_name "GitHub H1" --program hackerone/github
cb tool hunt --action finding --finding '{"title":"SSRF","type":"ssrf","severity":"high","url":"..."}'
cb tool hunt --action report --format hackerone
```

All tools support `--format json` for machine-readable output.

### MCP Server

CrowByte exposes an MCP (Model Context Protocol) server with 7 tools, making its capabilities available to any MCP-compatible AI assistant:

```bash
cb mcp --transport stdio
```

| Tool | Description |
|------|-------------|
| `cb-query` | Query the CrowByte context tree |
| `cb-curate` | Write to the CrowByte knowledge graph |
| `cb-recon` | Reconnaissance automation |
| `cb-vuln-scan` | Vulnerability scanning |
| `cb-shodan` | Shodan intelligence |
| `cb-hunt` | Bug bounty session management |
| `cb-cve` | CVE database queries |

Add to any MCP client config:

```json
{
  "mcpServers": {
    "crowbyte": {
      "command": "cb",
      "args": ["mcp", "--transport", "stdio"]
    }
  }
}
```

---

## Architecture

```
crowbyte/
  apps/desktop/               # Electron + React app
    src/
      pages/                   # 53 app pages
      components/              # shadcn/ui component library
      services/                # 75 backend services
      contexts/                # React contexts (auth, logs)
      hooks/                   # Custom React hooks
      lib/                     # Supabase client, utilities
    electron/                  # Main process (IPC, node-pty, tray)
    public/                    # Static assets
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, TypeScript, Vite 7 |
| **Desktop** | Electron 39 |
| **UI** | Radix UI (shadcn/ui), Tailwind CSS v3, Framer Motion |
| **Terminal** | xterm.js + node-pty |
| **Backend** | Supabase (PostgreSQL + RLS + Auth + Storage + Edge Functions) |
| **AI (Local)** | Claude Code CLI via Electron IPC |
| **AI (Remote)** | OpenClaw gateway (NVIDIA Cloud) |
| **Charts** | Recharts |
| **Markdown** | ReactMarkdown + remark-gfm |

### Data Layer

82+ Supabase tables with Row Level Security. Key tables:

| Table | Purpose |
|-------|---------|
| `cves` | CVE tracking with CVSS, CWE, exploit status |
| `knowledge_base` | Research entries with tags and file attachments |
| `red_team_ops` | Operations and findings |
| `custom_agents` | AI agent configurations |
| `endpoints` | Fleet device registry |
| `bookmarks` | URL bookmarks with categories |
| `cases` | ISM case management |
| `compliance_frameworks` | Security compliance tracking |

---

## Web vs Desktop

| Feature | Web (Free) | Desktop |
|---------|:----------:|:-------:|
| AI Chat (7+ models) | &#10003; | &#10003; |
| CVE Intelligence | &#10003; | &#10003; |
| Mission Pipeline | &#10003; | &#10003; |
| Report Generator | &#10003; | &#10003; |
| Knowledge Base | &#10003; | &#10003; |
| Detection Rule Lab | &#10003; | &#10003; |
| Cloud Security | &#10003; | &#10003; |
| ISM / Case Management | &#10003; | &#10003; |
| Integrated Terminal | — | &#10003; |
| Fleet Management | — | &#10003; |
| Network Scanner (Nmap GUI) | — | &#10003; |
| Red Team Operations | — | &#10003; |
| Security Monitor | — | &#10003; |
| CyberOps Toolkit | — | &#10003; |
| Agent Builder | — | &#10003; |
| Claude Code Integration | — | &#10003; |

---

## Desktop Downloads

| Platform | Format | Link |
|----------|--------|------|
| **Linux** | `.deb` `.AppImage` | [Releases](https://github.com/hlsitechio/crowbyte/releases) |
| **Windows** | `.exe` `.msi` | [Releases](https://github.com/hlsitechio/crowbyte/releases) |
| **macOS** | `.dmg` | [Releases](https://github.com/hlsitechio/crowbyte/releases) |

---

## Security

- **E2E Encrypted Remote Desktop** — ECDH key exchange + AES-256-GCM
- **Credential Encryption** — AES-256-GCM with PBKDF2 device-derived keys; double-encrypted via OS safeStorage on Electron
- **Conversation Encryption** — Optional AES-256-GCM with HMAC-SHA256 integrity
- **Activity Logging** — Categorized audit trail (auth, API, security, network, AI, terminal) exportable as CSV/JSON
- **No Telemetry** — Zero usage data collection. All logs stay on your device.
- **Supabase + RLS** — PostgreSQL with Row Level Security. Self-hostable for full data sovereignty.

### Vulnerability Disclosure

Report security issues responsibly: [security@crowbyte.io](mailto:security@crowbyte.io)

Do **not** open public GitHub issues for vulnerabilities. See [SECURITY.md](SECURITY.md).

---

## Roadmap

- [x] Multi-model AI agent swarm (9 agents)
- [x] CrowByte CLI with security tools
- [x] MCP server for AI assistant integration
- [x] Detection Rule Lab (SIGMA, KQL, YARA, Snort)
- [x] ISM case management and compliance
- [x] Cloud security dashboard (AWS/GCP/Azure)
- [x] Desktop releases (Linux, Windows, macOS)
- [ ] Stripe checkout for Pro subscriptions
- [ ] Real-time SIEM connectors (Splunk, Elastic)
- [ ] SBOM generation and dependency scanning
- [ ] Plugin marketplace for community extensions
- [ ] Collaborative real-time editing for teams
- [ ] Mobile companion app (iOS / Android)
- [ ] Public API for CI/CD integration

---

## Pricing

| Tier | Price | Includes |
|------|-------|----------|
| **Free** | $0 | 3 AI models, 50 messages/day, web access, CVE database, knowledge base |
| **Pro** | $19/mo | All models, unlimited messages, custom agents, desktop access |
| **Enterprise** | Contact us | Unlimited agents, API access, fleet management, dedicated SLA |

Start free at [crowbyte.io](https://crowbyte.io).

---

## License

CrowByte is **proprietary software** owned by HLSITech Inc. Source code is publicly visible for transparency; all rights reserved. See [LICENSE](LICENSE).

| Document | Link |
|----------|------|
| EULA | [legal/EULA.md](legal/EULA.md) |
| Terms of Service | [legal/TERMS_OF_SERVICE.md](legal/TERMS_OF_SERVICE.md) |
| Privacy Policy | [legal/PRIVACY_POLICY.md](legal/PRIVACY_POLICY.md) |
| Acceptable Use | [legal/ACCEPTABLE_USE_POLICY.md](legal/ACCEPTABLE_USE_POLICY.md) |

---

<p align="center">
  <a href="https://crowbyte.io">Website</a> &bull;
  <a href="mailto:support@crowbyte.io">Support</a> &bull;
  <a href="mailto:security@crowbyte.io">Security</a>
</p>
