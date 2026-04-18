# CrowByte — Pages and Features

All pages live in `apps/desktop/src/pages/`.
Route prefix: `/#/` (HashRouter).

---

## Public Routes (no auth)

| Page | Route | File | Description |
|------|-------|------|-------------|
| Landing | `/` | `Index.tsx` | Marketing landing page |
| Landing v2 | `/landing` | `LandingPage.tsx` | Alt landing |
| Auth | `/auth/signin` `/auth/signup` | `Auth.tsx` | Login / signup |
| Password Reset | `/passwordreset` | `PasswordReset.tsx` | Reset flow |
| OAuth Consent | `/oauth/consent` | `OAuthConsent.tsx` | OAuth approval page |
| Welcome | `/welcome` | `Welcome.tsx` | Post-signup welcome |
| Checkout | `/payments` | `Checkout.tsx` | Subscription purchase |
| Beta Signup | `/beta` | `BetaSignup.tsx` | Beta waitlist |
| Privacy Policy | `/privacy` | `PrivacyPolicy.tsx` | Legal |
| Terms of Service | `/terms` | `TermsOfService.tsx` | Legal |
| Refund Policy | `/refund` | `RefundPolicy.tsx` | Legal |
| Contact | `/contact` | `Contact.tsx` | Contact form |
| Downloads | `/downloads` | `Downloads.tsx` | Download installer |
| Web Docs | `/docs` | `web-docs/` | Public documentation |

---

## App Routes (protected — require auth)

### Core

| Page | Route | File | Description |
|------|-------|------|-------------|
| Dashboard | `/dashboard` | `Dashboard.tsx` | Home — metrics, quick actions, system status |
| Analytics | `/analytics` | `Analytics.tsx` | Usage analytics and charts |
| Settings | `/settings/*` | `settings/` | Multi-tab settings (general, API keys, integrations, billing, etc.) |
| Logs | `/logs` | `Logs.tsx` | App + system logs viewer |
| Documentation | `/documentation/*` | `Documentation.tsx` | In-app docs (own sidebar, no main nav) |
| Support | `/support` | `Support.tsx` | Support chat + ticket system |

### AI & Chat

| Page | Route | File | Description |
|------|-------|------|-------------|
| Chat | `/chat` | `Chat.tsx` | Full-screen AI chat — Claude (Electron) or OpenClaw (web). Has split-screen mode |
| AI Agent | `/ai-agent` | `AIAgent.tsx` | Tavily-powered search agent |
| Agent Builder | `/agent-builder` | `AgentBuilder.tsx` | Create custom AI agents |
| Agent Teams | `/agent-teams` | `AgentTeams.tsx` | Multi-agent team configuration |
| Agent Testing | `/agent-testing` | `AgentTesting.tsx` | Test and evaluate agents |
| LLM | `/llm` | `LLM.tsx` | LLM configuration and testing |
| Memory | `/memory` | `Memory.tsx` | AI memory / knowledge graph |

### Security Operations (Hunt)

| Page | Route | File | Description |
|------|-------|------|-------------|
| CVE | `/cve` | `CVE.tsx` | CVE database — NVD + Shodan enriched. Search, filter by severity, save to DB |
| Red Team | `/red-team` | `RedTeam.tsx` | Operation tracking, findings management, phase-based workflow |
| Cyber Ops | `/cyber-ops` | `CyberOps.tsx` | 95+ integrated security tools, one-click execution |
| Network Scanner | `/network-scanner` | `NetworkScanner.tsx` | nmap GUI — 10 scan profiles, parsed results, port visualization |
| Terminal | `/terminal` | `Terminal.tsx` | Full xterm.js terminal with tmux, node-pty backend |
| Mission Planner | `/missions` | `MissionPlanner.tsx` | Phase-based operation planning (recon → exploit → report) |
| Knowledge Base | `/knowledge` | `Knowledge.tsx` | Research notes with cloud sync and file attachments |
| Bookmarks | `/bookmarks` | `Bookmarks.tsx` | URL bookmarks with categories |
| Findings | `/findings` | `Findings.tsx` | Security findings tracker — severity, status, CVSS |
| Reports | `/reports` | `Reports.tsx` | Generated security reports (HackerOne/Bugcrowd format) |
| Threat Intelligence | `/threat-intelligence` | `ThreatIntelligence.tsx` | IOC feeds, enrichment, 262K+ stored IOCs |
| Tools | `/tools` | `Tools.tsx` | Tool browser and launcher |
| Detection Lab | `/detection-lab` | `DetectionLab.tsx` | Custom detection rules and testing |

### Security Operations (Defend / SOC)

| Page | Route | File | Description |
|------|-------|------|-------------|
| Security Monitor | `/security-monitor` | `SecurityMonitor.tsx` | AI-powered anomaly detection, alert monitoring |
| Alert Center | `/alert-center` | `AlertCenter.tsx` | Ingested security alerts — triage, correlate, escalate |
| Sentinel | `/sentinel` | `Sentinel.tsx` | CrowByte Sentinel central — heartbeat monitoring, org health |
| Defender | `/defender` | `Defender.tsx` | Defense posture dashboard |
| ISM | `/ism` `/ism/cases` `/ism/compliance` | `ISM.tsx` | Information Security Management — cases, compliance tracking |
| Cloud Security | `/cloud-security` | `CloudSecurity.tsx` | Cloud posture and configuration checks |
| Connectors | `/connectors` | `Connectors.tsx` | Intel feed and data source connectors |

### Fleet & Infrastructure

| Page | Route | File | Description |
|------|-------|------|-------------|
| Fleet | `/fleet` | `Fleet.tsx` | Endpoint registry — agents, VPS, devices. Health status, OS, last seen |
| MCP | `/mcp` | `MCP.tsx` | MCP server management — connect, configure, test |

---

## Key Components

| Component | File | Purpose |
|-----------|------|---------|
| AppSidebar | `components/AppSidebar.tsx` | Main navigation sidebar — collapsible, grouped by category |
| TitleBar | `components/TitleBar.tsx` | Custom Electron frameless title bar (Windows) |
| ChatInterface | `components/ChatInterface.tsx` | Reusable chat UI used by Chat page |
| ConversationsSidebar | `components/ConversationsSidebar.tsx` | Chat history sidebar |
| SplitScreenLayout | `components/SplitScreenLayout.tsx` | Split-screen context for dual-pane views |
| BrowserPanel | `components/BrowserPanel.tsx` | Embedded browser (webview) panel |
| GlobalContextMenu | `components/GlobalContextMenu.tsx` | Right-click context menu |
| CommandCenterHeader | `components/CommandCenterHeader.tsx` | Top header bar with context info |
| ProtectedRoute | `components/ProtectedRoute.tsx` | Auth guard for protected routes |
| SplashScreen | `components/SplashScreen.tsx` | Loading screen on app start |
| FeedPanel | `components/FeedPanel.tsx` | RSS/news feed panel |
| TabController | `components/TabController.tsx` | Multi-tab UI controller |
| InlineAIMenu | `components/ai/InlineAIMenu.tsx` | Per-row AI action buttons |
| SectionAIBar | `components/ai/SectionAIBar.tsx` | Section-level AI action bar |
| QAAgent | `components/QAAgent.tsx` | QA testing agent UI |

---

## Settings Pages

Located in `src/pages/settings/`:

- `GeneralSettings.tsx` — theme, language, display
- `APISettings.tsx` — API keys management (NVIDIA, NVD, Tavily, Venice, etc.)
- `IntegrationsSettings.tsx` — Integrations config (Netlify, Make, Resend, Supabase MCP)
- `BillingSettings.tsx` — Subscription management (Paddle + PayPal)
- `SecuritySettings.tsx` — Auth settings, 2FA
- `NotificationSettings.tsx` — Notification preferences
- `AppearanceSettings.tsx` — Themes, fonts, layout
- `TerminalSettings.tsx` — Terminal font, size, shell
- `MCPSettings.tsx` — MCP server management

---

## Platform Guards

Always import before using Electron-only features:

```ts
import { IS_ELECTRON, IS_WEB } from "@/lib/platform";

// Electron-only component:
if (IS_WEB) return null;

// Service key fallback (service key stripped in web builds):
const key = import.meta.env.VITE_SUPABASE_SERVICE_KEY
  || import.meta.env.VITE_SUPABASE_ANON_KEY;
```
