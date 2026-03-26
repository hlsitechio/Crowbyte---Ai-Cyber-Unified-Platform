# CrowByte Terminal v2.0.0

AI-powered offensive security terminal. Recon. Exploit. Report. One terminal.

## What's New

### 7 New Security Modules

- **Findings Engine** — Unified security findings from all tools (nuclei, burp, manual) with AI triage
- **AI Triage Engine** — Auto-classify findings by severity, exploitability, and business impact
- **Report Generator** — Generate pentest reports in HackerOne/Bugcrowd/custom formats
- **Detection Lab** — Natural language to detection rules (SIGMA, KQL, SPL, YARA, Snort, Suricata)
- **Mission Pipeline** — Automated pentest pipeline: recon to report with phase tracking
- **Alert Center** — SIEM bridge with 8 source normalizers, correlation engine, investigation timelines
- **Cloud Security** — CSPM with 15 CIS rules, reachability analysis, SBOM parser, compliance reports

### Improvements

- Deep link protocol handler (`crowbyte://`) for desktop app launching
- Smart "Open CrowByte" modal on landing page (Desktop / Web / Download)
- Fixed navigation routing (no more boot loops)
- Accessibility fixes (click targets, aria-labels)
- 12 new Supabase tables for persistent storage

### Tech Stack

- Electron 39 + React 18 + TypeScript + Vite 7
- shadcn/ui + Tailwind CSS + Framer Motion
- Supabase (PostgreSQL) backend
- 142 MCP tools via d3bugr
- 9 AI agent nodes on VPS

## Downloads

| Platform | File | Size |
|----------|------|------|
| Windows x64 | `CrowByte-Setup-2.0.0.exe` | ~85 MB |
| Linux x64 (AppImage) | `CrowByte-2.0.0.AppImage` | ~90 MB |
| Linux x64 (Ubuntu/Debian) | `crowbyt_2.0.0_amd64.deb` | ~85 MB |

## Install

### Windows
Download and run the `.exe` installer. Creates desktop shortcut and registers `crowbyte://` protocol.

### Linux (AppImage)
```bash
chmod +x CrowByte-2.0.0.AppImage
./CrowByte-2.0.0.AppImage
```

### Linux (Ubuntu/Debian)
```bash
sudo dpkg -i crowbyt_2.0.0_amd64.deb
```
