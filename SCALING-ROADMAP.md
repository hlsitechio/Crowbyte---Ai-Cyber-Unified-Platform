# CrowByte Scaling Roadmap

## Current State (Stage 2 — PM2 Cluster)
- VPS: 147.93.44.58 — 8 cores / 31GB RAM
- PM2 cluster: 4 workers on port 3000
- Single OpenRouter free API key
- Capacity: ~50 concurrent users

## Stage 3: Multi-Provider AI ($0-20/mo) — NEXT
- [ ] Add Groq API key (free tier: 30 req/min, 300+ tok/sec)
- [ ] Add Together.ai API key (free $5 credit)
- [ ] Add Fireworks.ai API key (free tier)
- [ ] Implement provider failover in /api/credits/chat
  - Round-robin or fastest-first
  - 429 rate limit → fall back to next provider
  - Model mapping per provider (Qwen on OpenRouter, Llama on Groq, etc.)
- [ ] Per-user rate limiting middleware (beyond credit system)

## Stage 4: Server Hardening ($0)
- [ ] Request queue with concurrency limit per worker
- [ ] SSE connection pooling / timeout cleanup
- [ ] Health check endpoint for monitoring
- [ ] PM2 log rotation (pm2 install pm2-logrotate)
- [ ] Graceful shutdown handling

## Stage 5: Horizontal Scale ($20-50/mo)
- [ ] Second VPS for API (separate from static site)
- [ ] nginx upstream load balancing between VPS nodes
- [ ] Shared session state (Redis or Supabase)
- [ ] CDN for static assets (Cloudflare free tier)
- [ ] Database connection pooling (Supabase pgbouncer)

## Stage 6: Cloud Native ($50-200/mo)
- [ ] Cloudflare Workers for API edge (rewrite from Express)
- [ ] OR Modal for GPU inference (run own models)
- [ ] OR Railway/Fly.io for auto-scaling containers
- [ ] R2/S3 for file storage
- [ ] Global CDN for all static content

## Stage 7: Enterprise ($200+/mo)
- [ ] Multi-region deployment
- [ ] Dedicated GPU instances for priority AI
- [ ] Custom model fine-tuning (security-focused)
- [ ] SOC2 compliance infrastructure
- [ ] Dedicated support infrastructure

## Decision Points
- 50 users → Stage 3 (multi-provider, free)
- 200 users → Stage 5 (second VPS)
- 1000 users → Stage 6 (cloud native)
- 5000 users → Stage 7 (enterprise)

## Notes
- Lovable.dev uses Modal for serverless GPU inference
- Cloudflare Workers: $5/mo for 10M req/month
- Current VPS is at ~5% utilization — lots of headroom
- PM2 cluster gives 4x throughput with zero code changes
