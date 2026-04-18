# CrowByte — Documentation Index

**Last updated**: 2026-04-17
**Version**: 2.2.0

---

## Files

| File | What's in it |
|------|-------------|
| [OVERVIEW.md](./OVERVIEW.md) | What is CrowByte, products, pricing, distribution, company |
| [TECH_STACK.md](./TECH_STACK.md) | All libraries and versions — frontend, terminal, AI, payments, dev tools |
| [INFRASTRUCTURE.md](./INFRASTRUCTURE.md) | All VPS details, SSH/RDP, ports, services, credentials, Cloudflare, Supabase |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Build targets, HashRouter rules, Electron IPC, data flow, module structure |
| [PAGES_AND_FEATURES.md](./PAGES_AND_FEATURES.md) | All 50+ pages, routes, components, what each does |
| [AI_SYSTEMS.md](./AI_SYSTEMS.md) | OpenClaw, Claude Provider, Section Agent, all AI models and routing |
| [DATABASE.md](./DATABASE.md) | Supabase tables, edge functions, auth, CLI tools, migration workflow |
| [DEPLOY.md](./DEPLOY.md) | How to deploy web + Electron, fast hotfix, rollback, env files |
| [SECURITY_HARDENING.md](./SECURITY_HARDENING.md) | All hardening applied — CSP, iptables, fail2ban, canary endpoints, CF settings |
| [BUGS_AND_FIXES.md](./BUGS_AND_FIXES.md) | All known bugs, root causes, fixes — read before debugging |

---

## Quick Reference

### Deploy web
```bash
cd /mnt/bounty/Claude/crowbyte/apps/desktop
npm run deploy:web
```

### SSH into prod VPS
```bash
ssh -i ~/.ssh/id_ed25519 root@147.93.44.58
```

### SSH into Windows build VPS
```bash
sshpass -p 'Wintersun6?6' ssh -o IdentitiesOnly=yes -o PubkeyAuthentication=no -o PreferredAuthentications=password -o StrictHostKeyChecking=no Administrator@147.93.180.110
```

### Purge Cloudflare cache
```bash
curl -X POST "https://api.cloudflare.com/client/v4/zones/dfe9faea205208b8eecaa40e32c74625/purge_cache" \
  -H "Authorization: Bearer REDACTED_CF_TOKEN" \
  -H "Content-Type: application/json" -d '{"purge_everything":true}'
```

### Check prod services
```bash
ssh -i ~/.ssh/id_ed25519 root@147.93.44.58 "pm2 list"
```

---

## #1 Rule

**Use `npm run deploy:web` — never manually rsync to the VPS.**
**All routes use `/#/route` (HashRouter) — never `/route`.**
