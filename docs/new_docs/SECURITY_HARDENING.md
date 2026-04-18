# CrowByte — Security Hardening Log

All hardening applied to `crowbyte.io` production (VPS 147.93.44.58) and web build.

---

## Web App (Frontend)

### CSP (Content Security Policy)
- Removed `unsafe-eval` from `script-src`
- Added `frame-ancestors 'self'` (clickjacking protection)
- Removed `https://fonts.googleapis.com` from all sources
- `font-src 'self'` only — Google Fonts CDN eliminated
- Config: `/etc/nginx/snippets/security-headers.conf`

### Fonts — Self-Hosted
Google Fonts CDN dependency eliminated. All fonts (Inter, JetBrains Mono, Saira, Saira Stencil One) downloaded as WOFF2 and served from `public/fonts/` with proper unicode-range subsets.
- 19 WOFF2 files total
- `@font-face` declarations in `src/fonts.css`
- Zero external font requests

### Console Hardening
- Production: `console.error/warn` → GlitchTip via `sendBeacon`
- Production: `console.log/debug/info` → silenced
- DevTools branding message fires from `index.html` inline `<script>` (before any bundle loads)

### Error Reporting
All unhandled errors and promise rejections → GlitchTip via `navigator.sendBeacon` (non-blocking, fire-and-forget).

---

## API Server

### `/api/errors` Endpoint Hardening
- Rate limit: 20 requests/min per IP (express-rate-limit)
- POST response: only returns `{ status: 'accepted' }` — no data reflection
- Input sanitization: whitelist-only fields accepted (strips any accidental auth tokens, cookies, etc.)
- GET, DELETE, summary endpoints: locked behind `authMiddleware`

---

## nginx / Server

### Cloudflare IP Lockdown (iptables)
Only Cloudflare IP ranges are allowed through on ports 80/443. Everything else is dropped.

```
CROWBYTE-CF chain (IPv4): 15 CF ranges + 100.0.0.0/8 (Tailscale) + 127.0.0.0/8
CROWBYTE-CF6 chain (IPv6): 7 CF ranges + ::1
```

Persisted via `/etc/iptables/rules.v4` and `rules.v6`.

### fail2ban Jails

| Jail | Trigger | Ban time |
|------|---------|---------|
| `crowbyte-auth` | 10 failed auth attempts in 60s | 7 days |
| `crowbyte-bots` | 2 hits on bot patterns in 1h | 30 days |
| `crowbyte-canary` | 1 hit on canary endpoint | 30 days |
| `nginx-4xx` | 20 × 4xx errors in 60s | 24 hours |

Config: `/etc/fail2ban/jail.d/crowbyte.conf`

### Canary Endpoints (Honeypots)
Endpoints that no legitimate user would ever request. Any hit → immediate fail2ban ban.

| Endpoint | Response | Purpose |
|----------|----------|---------|
| `/.env` | 200 — fake env vars with `CANARY_TOKEN_HIT_ALERT=true` | Catches env file scrapers |
| `/.git/config` | 200 — fake git config | Catches git repo scrapers |
| `/admin` | 200 — fake login HTML form | Catches admin panel scrapers |
| `*.php` | 404 | Catches WordPress/PHP scanners |

All canary hits logged to `/var/log/nginx/canary.log` with IP, timestamp, path, UA.
Config: `/etc/nginx/snippets/canary-endpoints.conf`

### Security Headers

| Header | Value |
|--------|-------|
| `X-Frame-Options` | DENY |
| `X-Content-Type-Options` | nosniff |
| `X-XSS-Protection` | 1; mode=block |
| `Strict-Transport-Security` | max-age=31536000; includeSubDomains |
| `Referrer-Policy` | strict-origin-when-cross-origin |
| `Permissions-Policy` | camera=(), microphone=(), geolocation=() |
| `Content-Security-Policy` | (see CSP section above) |

---

## Cloudflare Settings

| Setting | Value |
|---------|-------|
| DNS | Proxied (orange cloud) |
| SSL/TLS | Full Strict |
| HSTS | Enabled, max-age 1 year, includeSubDomains |
| Auto HTTPS Rewrites | On |
| DNSSEC | Enabled (status: pending) |
| HTTP/2 | On |
| HTTP/3 / QUIC | On |
| Polish (WebP) | Lossless |
| Brotli | On |
| Bot Fight Mode | On |
| Hotlink Protection | N/A (returned error on free plan) |

Cache Rules (free plan — no regex):
- Bypass cache: HTML files, `/api/*`
- Cache 30 days: `/assets/*`, `/fonts/*`

---

## Reverted / Attempted

### Object.freeze(Object.prototype) — REVERTED
Attempted as prototype pollution defense. Crashed the app — Radix UI and Framer Motion extend `Object.prototype` at runtime. Reverted immediately. Not viable for this stack.

---

## Pending / TODO

- [ ] Cloudflare WAF custom rule — auto-ban IPs hitting canary/bot paths at edge level (before nginx)
- [ ] Cloudflare Access on `staging.crowbyte.io` — require email/SSO to access staging
- [ ] Rotate exposed keys: Venice API key, Ollama API key, GlitchTip API token, Discord webhook
- [ ] CSRF protection review on API endpoints
- [ ] Subresource Integrity (SRI) for any remaining CDN resources
