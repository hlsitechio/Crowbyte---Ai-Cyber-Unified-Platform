# CrowByte Architecture Reference

## Build Targets

CrowByte is a single codebase that produces two different apps:

| Target | Command | Output | Runtime |
|--------|---------|--------|---------|
| Electron | `npm run build:vite` | `dist/` | Desktop app (Windows/Mac/Linux) |
| Web | `npm run build:web:production` | `dist/web/` | crowbyte.io SaaS |

The build target is set via `VITE_BUILD_TARGET=electron|web`.

### Platform Guards

Always use these constants — never check `window.navigator.userAgent` manually:

```ts
import { IS_ELECTRON, IS_WEB } from "@/lib/platform";

// IS_ELECTRON → true in Electron build, false in web
// IS_WEB      → true in web build, false in Electron
```

These are **inlined at build time** (dead code elimination removes the unused branch).

### Electron-Only Patterns

Some features must be guarded:

```tsx
// Widget that uses Electron IPC:
if (IS_WEB) return null;

// Service key usage (service key stripped in web):
const key = import.meta.env.VITE_SUPABASE_SERVICE_KEY
  || import.meta.env.VITE_SUPABASE_ANON_KEY;
```

---

## Routing — HashRouter (CRITICAL)

The app uses **HashRouter** (`react-router-dom`). All routes are at `/#/path`, not `/path`.

### Why this matters

| Intent | WRONG | CORRECT |
|--------|-------|---------|
| Navigate to auth | `window.location.href = "/auth"` | `window.location.hash = "#/auth"` |
| Navigate to dashboard | `window.location.href = "/dashboard"` | `window.location.hash = "#/dashboard"` |
| Link href | `href="/auth"` | `href="/#/auth"` |
| Link href payments | `href="/payments"` | `href="/#/payments"` |

**`window.location.href = "/auth"` loads `/auth` as a real path.** nginx serves `index.html`. But HashRouter sees no hash, so renders root route (`/`) = LandingPage. Auth page never renders.

### Route Structure (App.tsx)

```
/              → LandingPage (no AuthProvider)
/beta          → BetaSignup (no AuthProvider)
/privacy       → PrivacyPolicy (no AuthProvider)
/terms         → TermsOfService (no AuthProvider)
/contact       → Contact (no AuthProvider)
/payments      → Checkout (no AuthProvider)
/docs          → WebDocs (no AuthProvider)

/* (everything else) → AuthProvider wraps:
  /auth          → Auth (login/signup)
  /dashboard     → Dashboard (ProtectedRoute)
  /settings/*    → Settings (ProtectedRoute)
  /chat          → Chat (ProtectedRoute)
  ... (all app pages)
```

**Important**: `/` (root) does NOT have AuthProvider. OAuth callbacks land on `/` — handled by the `useEffect` in App.tsx that detects `?code=` and calls `supabase.auth.exchangeCodeForSession`.

---

## OAuth / GitHub Login

### How it works (web)

1. User clicks GitHub → `supabase.auth.signInWithOAuth({ redirectTo: origin + "/" })`
2. GitHub redirects back to `crowbyte.io/?code=xxx` (PKCE flow)
3. App.tsx `useEffect` detects `?code=` in `window.location.search`
4. Calls `supabase.auth.exchangeCodeForSession(window.location.href)`
5. On success: cleans URL, sets `window.location.hash = "#/dashboard"`
6. AuthProvider's `onAuthStateChange(SIGNED_IN)` fires, session is set

### Supabase redirectTo rules

- Web: `${window.location.origin}/` (root — NOT `/auth`, because `?code=` must be in real query string, not inside hash fragment)
- Electron: `https://crowbyte.io/auth` (handles separately via `openOAuthPopup`)

### Why NOT `origin + "/auth"` for web

Supabase PKCE appends `?code=xxx` to the redirectTo URL. If redirectTo is `origin/#/auth`, the resulting URL is `origin/#/auth?code=xxx`. The `?code=xxx` is inside the URL fragment — `window.location.search` is empty, Supabase client can't find it, exchange never happens.

---

## Supabase Keys

| Variable | Available in | Notes |
|----------|-------------|-------|
| `VITE_SUPABASE_URL` | Both | Safe |
| `VITE_SUPABASE_ANON_KEY` | Both | Safe for browser |
| `VITE_SUPABASE_SERVICE_KEY` | Electron only | **Stripped in web build** (security) |

The service key is stripped via `vite.config.ts`:
```ts
"import.meta.env.VITE_SUPABASE_SERVICE_KEY": "undefined"
```

Any service using service key must have anon key fallback (see DEPLOY.md).

---

## AI Integration

### OpenClaw (primary — NVIDIA proxy)

Used in `section-agent.ts` and any AI feature that needs a real model:

```ts
import openClaw from './openclaw';
for await (const chunk of openClaw.streamChat(messages, 'deepseek-ai/deepseek-v3.2', 0.4, signal)) {
  full += chunk;
  onChunk(chunk);
}
```

OpenClaw service: `src/services/openclaw.ts`
NVIDIA proxy on VPS: port 19990 (strips provider prefix from model IDs)
Model: `deepseek-ai/deepseek-v3.2` (default), `qwen3-coder-480b` for code

### Inline AI (InlineAIMenu + SectionAIBar)

Section agents = AI that analyzes specific page data (Findings, CVE, etc.)
- Component: `src/components/InlineAIMenu.tsx`, `src/components/SectionAIBar.tsx`
- Backend: `src/services/section-agent.ts`
- Routing: OpenClaw → NVIDIA proxy → deepseek-v3.2

---

## Key Services

| Service | File | What it does |
|---------|------|-------------|
| `openclaw.ts` | `src/services/openclaw.ts` | VPS AI agent (NVIDIA models) |
| `section-agent.ts` | `src/services/section-agent.ts` | Inline AI for page sections |
| `credentialStorage.ts` | `src/services/credentialStorage.ts` | Encrypted "Remember Me" |
| `deviceFingerprint.ts` | `src/services/deviceFingerprint.ts` | Device ID for auth |
| `sentinel-central.ts` | `src/services/sentinel-central.ts` | Security monitoring (uses anon key fallback) |
| `license-guard.ts` | `src/services/license-guard.ts` | Electron license verification |
| `subscription.ts` | `src/services/subscription.ts` | Billing / plan checks |

---

## Supabase Tables

| Table | CLI | Contents |
|-------|-----|----------|
| `cves` | `cve-db` | CVE database |
| `knowledge_base` | `kb` | Research notes |
| `bookmarks` | UI | Saved URLs |
| `red_team_ops` | UI | Op tracking |
| `custom_agents` | UI | Agent configs |
| `endpoints` | UI | Fleet devices |
| `threat_iocs` | `ti-collector` | 262K+ IOCs |
| `api_keys` | supabase client | API key storage |
| `user_settings` | supabase client | Per-user prefs |

---

## Source Layout

```
src/
├── App.tsx              ← Router, license gate, OAuth handler
├── pages/               ← Full pages (one per route)
│   ├── LandingPage.tsx  ← Public marketing site
│   ├── Auth.tsx         ← Login / signup
│   ├── Dashboard.tsx
│   ├── settings/        ← All /settings/* pages
│   └── ...
├── components/
│   ├── landing/         ← Landing page sections (Hero, Pricing, Navbar...)
│   ├── ui/              ← shadcn/ui components
│   └── ...
├── services/            ← Business logic / API clients
├── contexts/
│   ├── auth/            ← AuthProvider, useAuth
│   └── ...
└── lib/
    ├── supabase.ts      ← Supabase client (anon key)
    ├── platform.ts      ← IS_ELECTRON / IS_WEB constants
    └── admin.ts         ← isAdmin() check
```
