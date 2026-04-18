# CrowByte — Known Bugs, Root Causes, and Fixes

## Deployment Issues

### [FIXED] Wrong build folder deployed
**Symptom**: Site shows SubscriptionGate, auth doesn't work, console logs `IS_ELECTRON = "electron"`
**Cause**: Deployed `dist/` (electron build) instead of `dist/web/` (web build)
**Fix**: Always use `npm run deploy:web`. Script now enforces this.
**Prevention**: Never manually rsync to VPS. Use the deploy script only.

### [FIXED] Blank page during rsync
**Symptom**: Site goes blank for ~3 seconds during deploy
**Cause**: `rsync --delete` to live web root deletes old files while serving new ones — nginx 404s mid-deploy
**Fix**: Deploy script now rsync → staging dir → atomic mv to live root
**Prevention**: Deploy script handles this. No manual rsync.

### [FIXED] `supabaseKey is required` crash
**Symptom**: Complete blank page, console shows `supabaseKey is required`
**Cause**: `sentinel-central.ts` called `createClient(url, VITE_SUPABASE_SERVICE_KEY)` at module init. Service key is stripped to `undefined` in web builds.
**Fix**: `sentinel-central.ts` now falls back to anon key: `VITE_SUPABASE_SERVICE_KEY || VITE_SUPABASE_ANON_KEY`
**Prevention**: Any service using service key MUST have anon key fallback. See ARCHITECTURE.md.

---

## Navigation Issues

### [FIXED] "Launch App" button doesn't navigate to auth
**Symptom**: Clicking "Launch App" in navbar loads blank or landing page instead of auth
**Cause**: `href="/auth"` or `window.location.href = "/auth"` bypasses HashRouter. Browser loads `/auth` as real path, nginx returns `index.html`, HashRouter sees no hash → renders LandingPage.
**Fix**: Changed `href="/#/auth"` in `Navbar.tsx`; `window.location.hash = "#/auth"` in `LaunchAppButton.tsx`
**Rule**: ALL navigation to app routes MUST use `href="/#/route"` or `window.location.hash = "#/route"`

### [FIXED] Pricing "Get Started Free" doesn't navigate
**Symptom**: Pricing plan CTA buttons don't go to auth/payments
**Cause**: `href: "/auth"` and `href: "/payments"` in plan data used with `window.location.href = plan.href`
**Fix**: Changed to `href: "/#/auth"` and `href: "/#/payments"` in `Pricing.tsx`

---

## OAuth Issues

### [FIXED] GitHub OAuth callback broken
**Symptom**: After GitHub login, redirected to blank page or back to landing page
**Cause**: Multiple issues:
1. `handleOAuthCallback()` in `Auth.tsx` tried to parse `window.location.hash` for tokens. But with HashRouter, when Supabase redirects to `origin/auth#access_token=...`, the hash `#access_token=...` is treated as a route → Auth component never rendered.
2. `redirectTo` was `origin/auth` — same problem as above.
**Fix**:
1. Removed manual hash parsing from `Auth.tsx` — replaced with no-op comment
2. Changed `redirectTo` to `origin/` (root) so `?code=xxx` lands in real query string
3. Added `useEffect` in `App.tsx` to detect `?code=` and call `supabase.auth.exchangeCodeForSession` before router renders
**Rule**: OAuth `redirectTo` for web must ALWAYS be `${window.location.origin}/` (root, no hash, no path)

---

## Electron-Specific Issues

### AgentActivityWidget crash on web
**Symptom**: Widget using Electron IPC crashed when rendered in web build
**Fix**: Added `if (IS_WEB) return null;` at top of widget
**Pattern**: Any widget/component using `window.electronAPI` must check `IS_WEB` or `IS_ELECTRON`

---

## Performance / UX

### Browser cache stale assets after deploy
**Symptom**: User sees old UI after deploy
**How it works**: `index.html` is served with `no-cache` (always fresh). JS/CSS bundles have content-hash in filename → new deploy = new filename → cache miss.
**If still cached**: User should hard-refresh (`Ctrl+Shift+R`). This is expected behavior for ~5min after deploy until DNS/CDN propagates.

---

## Things Claude Must Remember

1. **HashRouter**: Every internal link must use `/#/` prefix or `window.location.hash`
2. **IS_WEB / IS_ELECTRON**: Import from `@/lib/platform`, use for feature flags
3. **Service key**: Never at module init in web — always fallback to anon key
4. **Deploy**: `npm run deploy:web` — never raw rsync, never from `dist/` directly
5. **OAuth redirectTo**: Web = `origin/` (root), Electron = `https://crowbyte.io/auth`
6. **Build modes**: `--mode production` loads `.env.production` which strips service key
