# CrowByte — Architecture Reference

## Build System

Single codebase → two apps:

```
apps/desktop/
├── src/              ← React + TypeScript (shared)
├── electron/         ← Electron main process (Electron only)
├── public/           ← Static assets (fonts, icons, favicons)
├── dist/             ← Electron build output
└── dist/web/         ← Web build output
```

### Platform Guards

Always use — never check userAgent manually:

```ts
import { IS_ELECTRON, IS_WEB } from "@/lib/platform";
// Inlined at build time — unused branch tree-shaken by Vite
```

---

## Routing (CRITICAL)

Uses **HashRouter** — all routes are `/#/route`, not `/route`.

### Rules

| Action | WRONG | CORRECT |
|--------|-------|---------|
| Link to auth | `href="/auth"` | `href="/#/auth"` |
| JS navigate | `window.location.href = "/auth"` | `window.location.hash = "#/auth"` |
| Router link | `<Link to="/auth">` | `<Link to="/auth">` (works inside Router) |
| OAuth redirectTo | `origin/auth` | `origin/` (root) |

### Why HashRouter?

- Electron loads `file://` — real path routing breaks
- nginx serves `index.html` for all paths — but hash is client-side only
- `/#/route` never hits the server → no 404 on refresh

### Route Structure

```
/              ← LandingPage (no AuthProvider)
/beta          ← BetaSignup (no AuthProvider)
/privacy       ← PrivacyPolicy
/terms         ← TermsOfService
/contact       ← Contact
/payments      ← Checkout
/docs          ← WebDocs

/auth/signin   ← Auth (no ProtectedRoute)
/auth/signup   ← Auth
/passwordreset ← PasswordReset
/oauth/consent ← OAuthConsent

/documentation/* ← Documentation (ProtectedRoute, own sidebar)

/* (all others) ← ProtectedRoute → AppLayout → specific page
```

---

## OAuth / GitHub Login Flow

1. User clicks "Sign in with GitHub" → `supabase.auth.signInWithOAuth({ redirectTo: origin + '/' })`
2. GitHub redirects to `https://crowbyte.io/?code=xxxx`
3. App.tsx `useEffect` detects `?code=` → calls `supabase.auth.exchangeCodeForSession(code)`
4. Session established → navigate to `/#/dashboard`

**Key**: `redirectTo` must be `window.location.origin + '/'` — never include hash or path.

---

## Electron Architecture

### Main Process (`electron/main.cjs`)

- Creates `BrowserWindow` with `show: false` → shows on `ready-to-show` (prevents blank screen flash)
- Sets strict CSP for renderer via `webRequest.onHeadersReceived`
- Manages PTY processes (node-pty) via IPC
- Handles `claude -p` spawning for Chat page
- Manages browser panel via `BrowserManager`
- HTTP proxy for CORS bypass (file:// origin)

### Window Types

| Function | Size | When |
|----------|------|------|
| `createOnboardingWindow()` | 660×500 | First run — no `onboardingComplete` flag |
| `createWindow()` | 1400×900 | Main app |
| OAuth popup | 500×700 | GitHub OAuth flow |

### IPC Channels

Key channels (renderer → main):
- `pty:create` / `pty:write` / `pty:resize` / `pty:close` — terminal
- `claude:start` / `claude:write` / `claude:stop` — Claude CLI chat
- `browser:navigate` / `browser:js` — embedded browser control
- `http:fetch` — CORS bypass proxy
- `onboarding:complete` / `onboarding:skip` — onboarding flow
- `safeStorage:encrypt` / `safeStorage:decrypt` — credential storage

### Preload (`electron/preload.js`)

Exposes `window.electronAPI` to renderer. All IPC goes through contextBridge — nodeIntegration is always false.

---

## Data Flow

### AI Chat (Electron)
```
Chat.tsx
  → window.electronAPI.claude.start(message, model, conversationHistory)
  → electron/main.cjs spawns: claude -p --output-format stream-json
  → streams JSON events back via IPC
  → Chat.tsx renders chunks in real-time
```

### AI Chat (Web)
```
Chat.tsx (IS_WEB)
  → web-ai-chat.ts
  → openClaw.streamChat(messages, model)
  → HTTPS → srv1459982.hstgr.cloud:18789
  → nvidia-proxy:19990
  → NVIDIA Cloud API
  → streams back
```

### Terminal (Electron)
```
Terminal.tsx
  → window.electronAPI.pty.create(shell, cwd, env)
  → electron/main.cjs → node-pty spawns shell
  → bidirectional IPC stream
  → xterm.js renders output
```

---

## CSP Strategy

### Web (nginx)
Strict — no `unsafe-eval`. Managed in `/etc/nginx/snippets/security-headers.conf`.

Key directives:
- `script-src 'self'` (no eval, no external)
- `style-src 'self' 'unsafe-inline'` (inline for theme flash prevention)
- `font-src 'self'` (self-hosted fonts, no CDN)
- `frame-ancestors 'self'` (no clickjacking)

### Electron (main.cjs)
Dev: permissive (localhost + all AI APIs).
Production: `script-src 'self'`, allows required API connections.

---

## Module Structure

```
src/
├── pages/           ← Route components (50+ pages)
├── components/      ← Shared UI components
│   ├── ui/          ← shadcn/ui primitives
│   ├── ai/          ← InlineAIMenu, SectionAIBar
│   ├── chat/        ← Chat-specific components
│   ├── dashboard/   ← Dashboard widgets
│   ├── fleet/       ← Fleet components
│   ├── landing/     ← Landing page sections
│   └── network/     ← Network scanner components
├── services/        ← All business logic + API calls (80+ files)
│   └── threat-intel/← Threat intel collectors
├── contexts/        ← React contexts (AuthContext, LogsContext)
├── hooks/           ← Custom React hooks
├── lib/             ← Utilities
│   ├── platform.ts  ← IS_ELECTRON / IS_WEB
│   └── utils.ts     ← cn() and other utils
├── integrations/
│   └── supabase/    ← Generated types + client
├── config/
│   └── mcp-servers.ts ← MCP server registry
├── App.tsx          ← Router + route definitions
├── main.tsx         ← Entry point + GlitchTip error routing
├── index.css        ← Global styles + @import fonts.css
└── fonts.css        ← Self-hosted @font-face declarations
```

---

## Error Tracking

Production console behavior (set in `index.html` inline script + `main.tsx`):

- `console.clear()` + branded DevTools message fires from inline `<script>` in `index.html` (before bundle loads)
- In production build: `console.error` and `console.warn` → GlitchTip via `navigator.sendBeacon`
- `console.log`, `console.debug`, `console.info` → silenced in production
- Global `window.onerror` + `unhandledrejection` → GlitchTip

---

## Key Patterns

### Supabase query pattern
```ts
const { data, error } = await supabase
  .from('table_name')
  .select('*')
  .eq('user_id', user.id)
  .order('created_at', { ascending: false });
```

### Service key fallback (required for any service with web support)
```ts
const supabaseKey = import.meta.env.VITE_SUPABASE_SERVICE_KEY
  || import.meta.env.VITE_SUPABASE_ANON_KEY;
```

### Electron-only feature guard
```tsx
import { IS_WEB } from '@/lib/platform';
if (IS_WEB) return null; // or return <WebFallback />;
```
