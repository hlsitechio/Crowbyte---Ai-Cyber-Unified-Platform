<h1 align="center">CrowByte</h1>

<p align="center">
  <strong>AI-powered cybersecurity platform for offensive security.</strong><br />
  <sub>Recon. Exploit. Report. One platform.</sub>
</p>

<p align="center">
  <a href="https://crowbyte.io"><img src="https://img.shields.io/badge/Web_App-crowbyte.io-3b82f6?style=flat-square&logo=globe&logoColor=white" alt="Web App" /></a>
  <a href="https://github.com/hlsitechio/crowbyte/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/hlsitechio/crowbyte/ci.yml?branch=main&style=flat-square&label=CI" alt="CI" /></a>
  <a href="https://github.com/hlsitechio/crowbyte/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-Proprietary-ef4444?style=flat-square" alt="License" /></a>
  <img src="https://img.shields.io/badge/Platform-Web-3b82f6?style=flat-square" alt="Platform" />
</p>

---

> **Web Beta is live!** Sign up free at [crowbyte.io](https://crowbyte.io).
> Desktop apps (Linux, Windows, macOS) are in **closed beta** — request access from Settings > Billing.

---

## What is CrowByte?

CrowByte is an **AI-powered cybersecurity platform** for penetration testers, bug bounty hunters, and red team operators. It replaces the workflow of juggling 20+ browser tabs, terminal windows, and note apps with a unified command center powered by AI.

**Currently available as a web app** at [crowbyte.io](https://crowbyte.io). Desktop apps are in closed beta with invite-only access.

---

## Core Features

### AI Agent Swarm
Deploy up to 9 specialized AI agents. Agents handle reconnaissance, vulnerability analysis, exploit research, and report generation in parallel. Supports multiple LLM providers — bring your own API keys or use the built-in gateway.

### Mission Pipeline
Phase-based operation planning from scope import through exploitation to final report. Define objectives, track task dependencies, and manage status transitions across the entire engagement lifecycle.

### CVE Intelligence
Real-time vulnerability database with CVSS scoring, exploit status tracking, product correlation, and cross-referencing with Shodan. Search, filter, and bookmark CVEs relevant to your active engagements.

### Integrated Terminal *(Desktop beta only)*
Full xterm.js terminal with tmux session management, powered by node-pty. Run Nmap, Nuclei, SQLMap, FFUF, or any CLI tool without leaving the platform. Multiple tabs, split panes, and shell presets.

### Fleet Management *(Desktop beta only)*
Monitor endpoints, VPS nodes, and containers from a single dashboard. Real-time hardware metrics (CPU, RAM, disk, network), process inspection, and remote agent deployment. Built-in remote desktop with encrypted communication.

### Report Generator
Generate professional pentest and bug bounty reports. Templates for HackerOne, Bugcrowd, and custom formats. Pull findings into structured reports with severity, evidence, and reproduction steps. Export as Markdown, HTML, or platform-specific JSON.

### Detection Rule Lab
Author, test, and manage detection rules across formats:
- **SIGMA** rules for SIEM correlation
- **KQL** queries for Azure Sentinel / Elastic
- **YARA** rules for malware analysis
- **Snort / Suricata** signatures for network detection

### Alert Center
Centralized alert management with support for multiple source types. Ingest, triage, and correlate alerts with your findings. Connector framework for Splunk, Elasticsearch, and webhook sources.

### Knowledge Base
Searchable research database for techniques, tool notes, methodology references, and engagement intelligence. Tag, categorize, and attach files. Full-text search across all entries.

### Cloud Security Dashboard
Track cloud security posture across AWS, GCP, and Azure. Manage cloud account inventory, resource tracking, and security findings. Compliance mapping against CIS, SOC2, PCI-DSS, HIPAA, and NIST frameworks.

---

## Web vs Desktop

| Feature | Web (Free) | Desktop (Beta) |
|---------|:----------:|:--------------:|
| AI Chat | ✅ | ✅ |
| CVE Intelligence | ✅ | ✅ |
| Mission Pipeline | ✅ | ✅ |
| Report Generator | ✅ | ✅ |
| Knowledge Base | ✅ | ✅ |
| Detection Rule Lab | ✅ | ✅ |
| Cloud Security Dashboard | ✅ | ✅ |
| Integrated Terminal | — | ✅ |
| Fleet Management | — | ✅ |
| Network Scanner | — | ✅ |
| Red Team Ops | — | ✅ |
| Security Monitor | — | ✅ |
| CyberOps Toolkit | — | ✅ |

Desktop beta access is invite-only. Request access from **Settings > Billing** inside the web app.

---

## AI Infrastructure

CrowByte ships with a multi-model AI gateway. Pro users get access to all models. Enterprise users can route operations through their own infrastructure.

| Provider | Models | Availability |
|----------|--------|:------------:|
| **OpenClaw Gateway** | DeepSeek V3.2, Qwen3 Coder 480B, Qwen 3.5 397B, Mistral Large 675B, Kimi K2, GLM5 | Web + Desktop |
| **Anthropic** | Claude Opus 4.6, Sonnet 4.6, Haiku 4.5 | Desktop beta only |
| **NVIDIA NIM** | Any NIM-hosted model | Via OpenClaw gateway |
| **Self-hosted** | Ollama / vLLM | Desktop only |
| **Custom** | Any OpenAI-compatible endpoint | Desktop only |

The web app uses the OpenClaw gateway. Claude and self-hosted models require the desktop app (Electron IPC).

---

## Pricing

| Tier | Price | Includes |
|------|-------|----------|
| **Free** | $0 | 3 AI models, 50 messages/day, web access, CVE database, knowledge base |
| **Pro Beta** | $19/mo | All 7 AI models, unlimited messages, 3 custom agents, desktop beta access |
| **Enterprise** | Coming Soon | Unlimited agents, API access, fleet management, dedicated SLA |

Visit [crowbyte.io](https://crowbyte.io) to get started.

---

## Security

- **Encrypted Communication** — Remote desktop uses ECDH key exchange with AES-256-GCM for end-to-end encrypted screen sharing and input control.
- **Credential Encryption** — Login credentials are encrypted with AES-256-GCM using device-derived keys (PBKDF2). On Electron, credentials are double-encrypted with the OS-level safeStorage API.
- **Conversation Encryption** — Optional AES-256-GCM encryption for stored conversations with HMAC-SHA256 integrity verification.
- **Activity Logging** — Actions across auth, API, security, network, AI, and terminal are logged with timestamps, severity levels, and categorized tags. Filterable by level and tag. Exportable as CSV or JSON.
- **No Telemetry** — CrowByte does not collect usage data, analytics, or tracking information. All activity logs stay on your device.
- **Supabase Backend** — All data is stored in Supabase (PostgreSQL with Row Level Security). Self-hostable for full data sovereignty.

### Vulnerability Disclosure

If you discover a security vulnerability, report it responsibly.

**Email**: [security@crowbyte.io](mailto:security@crowbyte.io)

Do **not** open a public GitHub issue for security vulnerabilities.

See [SECURITY.md](SECURITY.md) for our full disclosure policy and response SLA.

---

## Roadmap

- [ ] Stripe checkout for Pro Beta subscriptions
- [ ] Persistent audit logging with cloud sync
- [ ] Real-time SIEM connectors (Splunk, Elastic)
- [ ] Automated terminal output capture for report evidence
- [ ] Cloud security scanning (AWS/GCP/Azure API integration)
- [ ] SBOM generation
- [ ] Plugin marketplace for community extensions
- [ ] Collaborative real-time editing for team engagements
- [ ] Mobile companion app (iOS / Android)
- [ ] API access for CI/CD pipeline integration

---

## License

CrowByte is **proprietary software** owned by HLSITech Inc. The source code is publicly visible for transparency, but all rights are reserved. See [LICENSE](LICENSE) for full terms.

| Document | Link |
|----------|------|
| End User License Agreement | [EULA](legal/EULA.md) |
| Terms of Service | [legal/TERMS_OF_SERVICE.md](legal/TERMS_OF_SERVICE.md) |
| Privacy Policy | [legal/PRIVACY_POLICY.md](legal/PRIVACY_POLICY.md) |
| Acceptable Use Policy | [legal/ACCEPTABLE_USE_POLICY.md](legal/ACCEPTABLE_USE_POLICY.md) |

---

## Contact

| Channel | Address |
|---------|---------|
| Website | [crowbyte.io](https://crowbyte.io) |
| Support | [support@crowbyte.io](mailto:support@crowbyte.io) |
| Security | [security@crowbyte.io](mailto:security@crowbyte.io) |

---
