# CrowByte — Tech Stack

## Core Framework

| Layer | Technology | Version |
|-------|-----------|---------|
| Desktop runtime | Electron | 39.2.4 |
| Frontend framework | React | 18.3.1 |
| Language | TypeScript | 5.8.3 |
| Build tool | Vite | 8.0.2 |
| SWC compiler | @vitejs/plugin-react-swc | 4.3.0 |
| Router | react-router-dom (HashRouter) | 6.30.1 |

---

## UI Layer

| Library | Version | Purpose |
|---------|---------|---------|
| Radix UI (shadcn/ui) | Various ^1.x | All primitive components |
| Tailwind CSS | 3.4.19 | Styling (pinned to v3 — NOT v4) |
| tailwindcss-animate | 1.0.7 | Animations |
| Framer Motion | 12.23.24 | Page transitions, animations |
| Lucide React | 0.462.0 | Icons |
| @iconscout/react-unicons | 2.2.5 | Additional icons |
| class-variance-authority | 0.7.1 | Component variants |
| clsx + tailwind-merge | 2.1.1 / 2.6.0 | Class merging |
| cmdk | 1.1.1 | Command palette |
| sonner | 1.7.4 | Toast notifications |
| next-themes | 0.3.0 | Theme switching |
| vaul | 0.9.9 | Drawer component |
| embla-carousel-react | 8.6.0 | Carousel |
| input-otp | 1.4.2 | OTP input |

**Themes**: Slate (default), Nord, Dracula — stored in localStorage as `crowbyte_theme`

---

## Terminal

| Library | Version | Purpose |
|---------|---------|---------|
| @xterm/xterm | 5.5.0 | Terminal emulator |
| @xterm/addon-fit | 0.10.0 | Fit to container |
| @xterm/addon-search | 0.15.0 | Search in terminal |
| @xterm/addon-serialize | 0.13.0 | Serialize terminal state |
| @xterm/addon-web-links | 0.11.0 | Clickable links |
| node-pty | 1.1.0 | PTY process (Electron main) — asarUnpack |

---

## Data & State

| Library | Version | Purpose |
|---------|---------|---------|
| @supabase/supabase-js | 2.81.0 | Database + Auth + Storage |
| @tanstack/react-query | 5.83.0 | Server state management |
| react-hook-form | 7.61.1 | Form state |
| @hookform/resolvers | 3.10.0 | Zod schema validation |
| zod | 3.25.76 | Schema validation |
| date-fns | 3.6.0 | Date formatting |
| uuid | 13.0.0 | UUID generation |

---

## Visualization

| Library | Version | Purpose |
|---------|---------|---------|
| Recharts | 2.15.4 | Charts and graphs |
| @xyflow/react | 12.10.1 | Node-based flow diagrams (Agent Builder) |
| @dnd-kit/core + sortable | 6.3.1 / 10.0.0 | Drag and drop |
| react-resizable-panels | 2.1.9 | Resizable split panes |

---

## Content Rendering

| Library | Version | Purpose |
|---------|---------|---------|
| react-markdown | 10.1.0 | Markdown rendering |
| remark-gfm | 4.0.1 | GitHub-flavored markdown |
| react-syntax-highlighter | 16.1.1 | Code syntax highlighting |

---

## MCP (Model Context Protocol)

| Library | Version | Purpose |
|---------|---------|---------|
| @modelcontextprotocol/sdk | 1.22.0 | MCP client implementation |
| @modelcontextprotocol/server-filesystem | 2025.8.21 | Filesystem MCP server |
| @modelcontextprotocol/server-memory | 2025.9.25 | Memory MCP server |
| mcp-remote | 0.1.30 | Remote MCP connections |

---

## Payments & Billing

| Library | Version | Purpose |
|---------|---------|---------|
| @paddle/paddle-js | 1.6.2 | Paddle billing (primary) |
| @paypal/react-paypal-js | 9.1.0 | PayPal (Supabase edge functions) |

---

## Error Tracking

| Library | Version | Purpose |
|---------|---------|---------|
| @sentry/browser | 10.46.0 | Browser error tracking |
| @sentry/electron | 7.10.0 | Electron error tracking |
| GlitchTip | Cloud | Error dashboard (Sentry-compatible) |

**DSN**: Set via `VITE_GLITCHTIP_DSN` env var. In production, console.error/warn are rerouted to GlitchTip via `navigator.sendBeacon`.

---

## Dev Tooling

| Tool | Version | Purpose |
|------|---------|---------|
| ESLint | 9.32.0 | Linting |
| Prettier | 3.6.2 | Code formatting |
| Vitest | 4.1.2 | Unit tests |
| Playwright | 1.58.2 | E2E tests |
| concurrently | 9.2.1 | Run dev + electron in parallel |
| cross-env | 10.1.0 | Cross-platform env vars |

---

## Build System

- **Monorepo root**: `crowbyte/` (npm workspaces)
- **App**: `crowbyte/apps/desktop/`
- **Electron builder**: 26.0.12 (NSIS + MSI for Windows, AppImage + deb for Linux, DMG for Mac)
- **ASAR**: enabled — node-pty, ttf2woff2, @sentry/electron unpacked
- **Source maps**: disabled in production (no source exposure)
- **Chunk splitting**: react-vendor, ui-vendor, chart-vendor, form-vendor, dnd-vendor, supabase-vendor

---

## Fonts (Self-Hosted)

All fonts are self-hosted in `public/fonts/` — no Google Fonts CDN at runtime.

| Font | Files | Use |
|------|-------|-----|
| Inter | 7 WOFF2 files | UI text |
| JetBrains Mono | 6 WOFF2 files | Code, terminal |
| Saira | 3 WOFF2 files | Headers |
| Saira Stencil One | 3 WOFF2 files | Logo/branding |

CSS: `src/fonts.css` imported in `src/index.css`.

---

## Environment Variables

```bash
# Supabase
VITE_SUPABASE_URL=https://gvskdopsigtflbbylyto.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_SUPABASE_SERVICE_KEY=eyJ...   # Electron only — STRIPPED in web builds
VITE_SUPABASE_PROJECT_REF=gvskdopsigtflbbylyto

# AI
VITE_NVIDIA_API_KEY=REDACTED_NVIDIA_KEY
VITE_OPENCLAW_HOST=srv1459982.hstgr.cloud
VITE_OPENCLAW_GATEWAY_TOKEN=REDACTED_OPENCLAW_TOKEN
VITE_OPENCLAW_SSH_PASSWORD=REDACTED_VPS_PASS

# Error tracking
VITE_GLITCHTIP_DSN=https://...@app.glitchtip.com/...

# Integrations
VITE_NVD_API_KEY=...
VITE_TAVILY_API_KEY=...
VITE_NETLIFY_AUTH_TOKEN=...
VITE_RESEND_API_KEY=...
VITE_MAKE_MCP_URL=...

# Build
VITE_BUILD_TARGET=electron|web    # set by build scripts
```
