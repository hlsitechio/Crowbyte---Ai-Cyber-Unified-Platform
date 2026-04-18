# CrowByte — Database Reference

## Supabase Project

**Ref**: `gvskdopsigtflbbylyto`
**URL**: `https://gvskdopsigtflbbylyto.supabase.co`
**Region**: us-east-1

---

## Auth

Providers enabled:
- Email/password (with email verification)
- GitHub OAuth (`read:user user:email` scopes)

OAuth `redirectTo` for web MUST be `${window.location.origin}/` (root, no path, no hash). The App.tsx `useEffect` detects `?code=` param and calls `supabase.auth.exchangeCodeForSession`.

---

## Tables

### User Data

| Table | RLS | Description |
|-------|-----|-------------|
| `profiles` | Auth owner | User profiles — name, avatar, role, bio |
| `user_settings` | Auth owner | Per-user preferences, API keys, theme |
| `api_keys` | Auth owner | Stored third-party API keys (encrypted) |

### Security Operations

| Table | RLS | Description |
|-------|-----|-------------|
| `cves` | Public read | CVE database — NVD + Shodan enriched. Fields: id, cvss, severity, description, affected_products, published_date |
| `knowledge_base` | Auth owner | Research notes with categories, tags, file attachments |
| `bookmarks` | Auth owner | URL bookmarks with categories, tags, favicon |
| `red_team_ops` | Auth owner | Red team operations — phase, status, findings, scope |
| `findings` | Auth owner | Security findings — severity, CVSS, status, evidence |
| `reports` | Auth owner | Generated reports — format (HackerOne/Bugcrowd/Custom), status |
| `missions` | Auth owner | Mission planner entries — phases, tasks, objectives |
| `custom_agents` | Auth owner | AI agent configurations — system prompt, model, tools |

### Fleet & Monitoring

| Table | RLS | Description |
|-------|-----|-------------|
| `endpoints` | Auth owner | Device registry — hostname, OS, IP, status, last_seen |
| `alert_center` | Auth owner | Security alerts — source, severity, triage_status |
| `intel_connectors` | Auth owner | Intel feed configurations |

### Threat Intelligence

| Table | Access | Description |
|-------|--------|-------------|
| `threat_iocs` | Admin write, auth read | 262K+ IOCs from 22 feeds — type (ip/domain/hash/url), value, feed_name, first_seen, last_seen, threat_type |
| `threat_feeds` | Admin write | Feed registry — name, url, format, last_sync, health_status |
| `threat_stats` | Admin write | Daily aggregates by feed and IOC type |
| `shodan_cache` | Auto | 24h TTL cache for Shodan/API lookups |

### Sentinel (SOC)

| Table | Access | Description |
|-------|--------|-------------|
| `org_context` | Service role | Organization context for Sentinel |
| `heartbeat_log` | Service role | Agent heartbeat log |
| `audit_log` | Service role | Security audit events |
| `escalations` | Service role | Alert escalation tracking |
| `blocked_ips` | Service role | IP blocklist (auto-populated by Sentinel) |

All Sentinel tables have Realtime enabled.

Test org: `token=crowbyte-test-token-local`, `tier=pro`

---

## Edge Functions

Source: `supabase/functions/`

| Function | Endpoint | Purpose |
|----------|----------|---------|
| `password-reset` | `/functions/v1/password-reset` | Sends branded reset email via Resend API |
| `contact-form` | `/functions/v1/contact-form` | Contact page form handler — sends to support@crowbyte.io |
| `paypal-create-order` | `/functions/v1/paypal-create-order` | Creates PayPal order for subscription |
| `paypal-capture-order` | `/functions/v1/paypal-capture-order` | Captures PayPal payment + activates subscription |

Deploy edge functions:
```bash
supabase functions deploy --project-ref gvskdopsigtflbbylyto
```

---

## CLI Tools (installed at /usr/local/bin/)

```bash
# CVE database
cve-db lookup CVE-2024-XXXX      # NVD + Shodan parallel lookup, auto-save to DB
cve-db search "apache"            # Search stored CVEs
cve-db stats                      # Severity breakdown

# Threat intelligence
ti-collector sync                 # Sync all 22 feeds → Supabase (runs every 30 min via cron)
ti-collector check 1.2.3.4        # Check IOC against stored database
ti-collector stats                # Feed health + IOC counts

# Knowledge base
kb save "title" --content "text" --category "recon"
kb search "XSS"
```

---

## Migrations

Location: `supabase/migrations/`
Filename format: `YYYYMMDDHHMMSS_feature_name.sql`

Apply migrations:
```bash
supabase db push --project-ref gvskdopsigtflbbylyto
```

---

## Service Key Usage Warning

The service role key (`VITE_SUPABASE_SERVICE_KEY`) is:
- Available in Electron builds
- **STRIPPED** in web builds (Vite replaces with `undefined`)
- Any service using it MUST fall back to anon key:

```ts
const key = import.meta.env.VITE_SUPABASE_SERVICE_KEY
  || import.meta.env.VITE_SUPABASE_ANON_KEY;
```

Never call `createClient(url, SERVICE_KEY)` at module init in files that get imported by web builds.

---

## Supabase API Keys

| Key | Env var | Used in |
|-----|---------|---------|
| Anon (public) | `VITE_SUPABASE_ANON_KEY` | Both Electron and web builds |
| Service role | `VITE_SUPABASE_SERVICE_KEY` | Electron only — bypasses RLS |
| PAT | `REDACTED_SUPABASE_PAT` | CLI/server operations |
