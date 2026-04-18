# CrowByte — Known Bugs, Root Causes, Fixes

Read this before debugging. Most issues have been hit before.

---

## Deployment Issues

### [FIXED] Wrong build folder deployed
**Symptom**: Site shows SubscriptionGate, auth doesn't work, `IS_ELECTRON = "electron"` in console
**Cause**: Deployed `dist/` (electron build) instead of `dist/web/` (web build)
**Fix**: Always `npm run deploy:web`. Script enforces this.

### [FIXED] Blank page during rsync
**Symptom**: Site goes blank for ~3s during deploy
**Cause**: `rsync --delete` to live web root while nginx is serving — 404s mid-deploy
**Fix**: Deploy script: rsync → staging → atomic `mv` to live

### [FIXED] `supabaseKey is required` blank page
**Symptom**: Complete blank page on load
**Cause**: `sentinel-central.ts` called `createClient(url, SERVICE_KEY)` at module init. Service key is `undefined` in web builds.
**Fix**: `SERVICE_KEY || ANON_KEY` fallback pattern. **Always required** for any service with web support.

### [FIXED] Site cached old broken bundle after deploy
**Symptom**: Site still showed old broken version after new deploy
**Cause**: Cloudflare was serving cached `index.html` pointing to old bundle hash
**Fix**: Purge CF cache after each deploy. Token: `REDACTED_CF_TOKEN`

---

## Navigation Issues

### [FIXED] "Launch App" button loads landing page instead of auth
**Cause**: `href="/auth"` bypasses HashRouter. Browser loads `/auth`, nginx returns `index.html`, HashRouter sees no hash → renders LandingPage.
**Fix**: `href="/#/auth"` in Navbar, `window.location.hash = "#/auth"` in LaunchAppButton.
**Rule**: ALL navigation to app routes MUST use `href="/#/route"` or `window.location.hash = "#/route"`.

### [FIXED] OAuth callback lands on blank page
**Cause**: `redirectTo: origin/auth` → GitHub redirects to `/auth#access_token=...` → HashRouter treats `#access_token=...` as a route → Auth never renders
**Fix**: `redirectTo: origin/` (root). App.tsx useEffect detects `?code=` → `exchangeCodeForSession`.

---

## Electron Issues

### [FIXED] Blank white screen on Windows startup
**Symptom**: App shows white screen before React hydrates
**Cause**: `BrowserWindow` created with `show: true` (default) — window visible before content loads
**Fix**: Added `show: false` to both `createWindow()` and `createOnboardingWindow()`. Added `mainWindow.once('ready-to-show', () => mainWindow.show())`.

### [FIXED] AgentActivityWidget crash on web
**Cause**: Widget used `window.electronAPI` without checking if in web build
**Fix**: `if (IS_WEB) return null;` at top of component.
**Pattern**: Any component using `window.electronAPI` must check `IS_WEB`.

---

## Console / DevTools Issues

### [FIXED] DevTools branding message not visible
**Cause 1**: `console.log = () => {}` ran before the styled log calls, silencing them
**Cause 2**: DevTools "Preserve log" was enabled — `console.clear()` had no effect
**Fix**: Moved console message to `index.html` inline `<script>` — fires before any bundle or extension. Always executes first.
**Note**: "Preserve log" in DevTools is a user setting — `console.clear()` won't work if enabled. Expected behavior.

---

## Security Issues

### [FIXED] Object.freeze(Object.prototype) crashed app
**Attempted**: Prototype pollution defense via `Object.freeze(Object.prototype)` in `main.tsx`
**Cause**: Radix UI and Framer Motion extend `Object.prototype` at runtime. Freeze prevents this → crash.
**Fix**: Reverted immediately. Not compatible with this UI stack.

### [FIXED] CF cache purge token auth error (401)
**Cause**: Token `crowbyte2` initially didn't have Cache Purge permission
**Fix**: User added Cache Purge to token permissions in CF panel.

### [FIXED] CF Cache Rules `matches` operator error
**Cause**: `matches` (regex) operator not available on Cloudflare free plan
**Fix**: Replaced with `starts_with` and `ends_with` operators.

### [FIXED] nginx `log_format` in wrong context
**Cause**: `log_format canary ...` was in a snippet file included inside `server {}` block. Must be in `http {}` block.
**Fix**: Moved to `/etc/nginx/nginx.conf` http block.

### [FIXED] Escaped `\!` in mcp.ts
**Cause**: Previous `sed` command escaped `!` as `\!` in source file
**Fix**: Python replace `\!` → `!`

---

## TypeScript / Build Issues

### [FIXED] `sanitizeNetworkEntry` return type mismatch
**Symptom**: TypeScript error — sanitized object type doesn't match `NetworkEntry`
**Fix**: Cast with `as unknown as NetworkEntry`

### Common pattern — Service key in web build
Any file that does `import.meta.env.VITE_SUPABASE_SERVICE_KEY` at module init in web builds gets `undefined`. If passed to `createClient()`, throws `supabaseKey is required`.
**Pattern**: Always `SERVICE_KEY || ANON_KEY`.

---

## Installer Issues

### [FIXED] 213MB Windows installer too large
**Cause**: `"node_modules/**/*"` in electron-builder `files` packed all devDependencies
**Fix**: Added exclusions to `package.json` build config:
- `!node_modules/vite/**/*`, `!node_modules/eslint/**/*`, `!node_modules/typescript/**/*`
- `!node_modules/tailwindcss/**/*`, `!node_modules/@playwright/**/*`, `!node_modules/vitest/**/*`
- `!node_modules/**/*.map`, `!node_modules/**/test/**/*`, `!node_modules/**/docs/**/*`
**Result**: 213MB → 153MB (~28% reduction). Remaining ~100MB is Electron/Chromium (unavoidable).
