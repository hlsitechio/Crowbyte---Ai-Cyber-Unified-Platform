# CrowByte — Product Overview

**Version**: 2.2.0
**Status**: Active development — Beta
**Website**: https://crowbyte.io

---

## What is CrowByte?

CrowByte is an AI-powered offensive security platform built as an Electron desktop app (+ web SaaS) for bug bounty hunters, penetration testers, and red team operators. It unifies AI chat, vulnerability intelligence, terminal, fleet management, threat intel, and security tooling into one command center.

**Tagline**: "Stop juggling terminals. One AI-powered command center."

---

## Two Products, One Codebase

| Mode | Target User | Core Value |
|------|------------|-----------|
| **Hunt** | Bug bounty hunters, pentesters | AI-assisted recon, CVE lookup, red team ops, cyber toolkit |
| **Defend** | SOC analysts, blue team | Sentinel monitoring, alert triage, ISM, threat intel feeds |

Both modes built from `apps/desktop/` — feature flags and routing control what's visible.

---

## Pricing Tiers

| Tier | Price | Features |
|------|-------|---------|
| Free | $0 | AI chat (3 models), CVE database, Knowledge Base, Bookmarks, Mission Planner |
| Pro | $19/mo | All AI providers (Claude, DeepSeek, Qwen, Mistral), Red Team, Cyber Ops, Network Scanner, Agent Builder, Fleet, Security Monitor |
| Elite | $49/mo | Pro + priority AI access, dedicated support, early access, higher rate limits |

Billing: Paddle (primary) + PayPal (Supabase edge functions fallback)

---

## Distribution

| Platform | Format | Status |
|----------|--------|--------|
| Windows | NSIS installer (.exe) + MSI | Active — built on Windows Build VPS |
| macOS | DMG | Planned |
| Linux | AppImage + .deb | Planned |
| Web (SaaS) | crowbyte.io | Active — deployed to Ubuntu VPS |

---

## Key Numbers

- **Pages**: 50+ React pages
- **Services**: 80+ TypeScript service files
- **AI Models**: 7 via OpenClaw (NVIDIA Cloud), Claude 3 via CLI
- **IOCs in threat DB**: 262K+ from 22 feeds
- **Electron version**: 39.2.4
- **Node requirement**: ^20.19.0 || >=22.12.0

---

## Company

**HLSITech**
Contact: contact@hlsitech.com
Support: support@crowbyte.io
GitHub: https://github.com/hlsitechio/crowbyte
npm: `crowbyte` (HLSITech org token available)
