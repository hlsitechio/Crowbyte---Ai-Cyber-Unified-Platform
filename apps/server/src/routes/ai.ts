/**
 * AI Routes — Chat, models, usage, tier info
 *
 * POST /api/ai/chat     — Proxied AI chat with tier enforcement
 * GET  /api/ai/models   — Available models (filtered by tier)
 * GET  /api/ai/usage    — User's usage stats
 * GET  /api/ai/tier     — User's tier info and limits
 */

import { Router, Request, Response } from 'express';
import {
  requireSupabaseAuth,
  checkAiRateLimit,
  checkModelAccess,
  incrementUsage,
  getTodayUsage,
  getUserTier,
  TIER_LIMITS,
  type SupabaseUser,
  type TierLimits,
} from '../middleware/tiers.js';

const router = Router();

const NVIDIA_PROXY_URL = process.env.OPENCLAW_VPS_URL || 'https://srv1459982.hstgr.cloud';
const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY || '';

// ─── All Models ──────────────────────────────────────

const ALL_MODELS = [
  { id: 'deepseek-ai/deepseek-v3.2', name: 'DeepSeek V3.2', tier: 'free', desc: 'Fast reasoning, 128K context' },
  { id: 'z-ai/glm5', name: 'GLM5', tier: 'free', desc: 'General purpose, multilingual' },
  { id: 'moonshotai/kimi-k2-instruct', name: 'Kimi K2', tier: 'free', desc: 'Long context, strong coding' },
  { id: 'moonshotai/kimi-k2.5', name: 'Kimi K2.5', tier: 'pro', desc: 'Enhanced reasoning + vision' },
  { id: 'qwen/qwen3-coder-480b-a35b-instruct', name: 'Qwen3 Coder 480B', tier: 'pro', desc: 'Best for code generation' },
  { id: 'qwen/qwen3.5-397b-a17b', name: 'Qwen 3.5 397B', tier: 'pro', desc: 'Frontier MoE model' },
  { id: 'mistralai/mistral-large-3-675b-instruct-2512', name: 'Mistral Large 675B', tier: 'pro', desc: 'Largest open-weight model' },
];

// ─── GET /models ─────────────────────────────────────

router.get('/models', async (req: Request, res: Response): Promise<void> => {
  // Try to get user tier for filtering, but don't require auth
  const token = req.headers.authorization?.replace('Bearer ', '');
  let tier = 'free';

  if (token) {
    try {
      const { validateSupabaseToken } = await import('../middleware/tiers.js');
      const user = await validateSupabaseToken(token);
      if (user) tier = await getUserTier(user.sub);
    } catch {}
  }

  const tierConfig = TIER_LIMITS[tier] || TIER_LIMITS.free;
  const models = ALL_MODELS.map(m => ({
    ...m,
    available: tierConfig.models.includes(m.id),
    locked: !tierConfig.models.includes(m.id),
  }));

  res.json({ models, tier });
});

// ─── GET /usage ──────────────────────────────────────

router.get('/usage', requireSupabaseAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).supabaseUser as SupabaseUser;
  const tier = (req as any).userTier as string;
  const limits = (req as any).tierLimits as TierLimits;
  const todayCount = await getTodayUsage(user.sub);

  res.json({
    tier,
    current: todayCount,
    limit: limits.messagesPerDay === -1 ? null : limits.messagesPerDay,
    remaining: limits.messagesPerDay === -1 ? null : Math.max(0, limits.messagesPerDay - todayCount),
  });
});

// ─── GET /tier ───────────────────────────────────────

router.get('/tier', requireSupabaseAuth, async (req: Request, res: Response): Promise<void> => {
  const tier = (req as any).userTier as string;
  const limits = (req as any).tierLimits as TierLimits;

  res.json({
    tier,
    limits: {
      messagesPerDay: limits.messagesPerDay,
      models: limits.models.length,
      maxTokens: limits.maxTokens,
      agents: limits.agents,
      knowledgeEntries: limits.knowledgeEntries,
      apiAccess: limits.apiAccess,
    },
    allTiers: {
      free: { price: 0, messagesPerDay: TIER_LIMITS.free.messagesPerDay, models: TIER_LIMITS.free.models.length },
      pro: { price: 19, messagesPerDay: -1, models: TIER_LIMITS.pro.models.length },
      enterprise: { price: 99, messagesPerDay: -1, models: TIER_LIMITS.enterprise.models.length },
    },
  });
});

// ─── POST /chat ──────────────────────────────────────

router.post('/chat',
  requireSupabaseAuth,
  checkAiRateLimit,
  checkModelAccess,
  async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).supabaseUser as SupabaseUser;
    const limits = (req as any).tierLimits as TierLimits;
    const { messages, model } = req.body;

    if (!messages || !Array.isArray(messages)) {
      res.status(400).json({ error: 'messages array required' });
      return;
    }

    const targetModel = model || 'deepseek-ai/deepseek-v3.2';
    const maxTokens = Math.min(req.body.max_tokens || 4096, limits.maxTokens);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      };
      if (NVIDIA_API_KEY) headers['Authorization'] = `Bearer ${NVIDIA_API_KEY}`;

      const upstream = await fetch(`${NVIDIA_PROXY_URL}/nvidia/v1/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: targetModel,
          messages,
          stream: true,
          max_tokens: maxTokens,
          temperature: req.body.temperature ?? 0.7,
        }),
        signal: AbortSignal.timeout(120000),
      });

      if (!upstream.ok) {
        const errText = await upstream.text().catch(() => 'Unknown error');
        res.status(upstream.status).json({ error: errText });
        return;
      }

      // Track usage (fire-and-forget)
      incrementUsage(user.sub, targetModel).catch(() => {});

      // Stream SSE through to client
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      if (upstream.body) {
        const reader = (upstream.body as any).getReader();
        const decoder = new TextDecoder();

        const pump = async () => {
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              res.write(decoder.decode(value, { stream: true }));
            }
          } catch { /* client disconnect */ }
          res.end();
        };

        pump();

        req.on('close', () => {
          reader.cancel().catch(() => {});
        });
      } else {
        res.end();
      }
    } catch (err) {
      const msg = (err as Error).message || 'Proxy error';
      if (!res.headersSent) {
        res.status(502).json({ error: `AI proxy error: ${msg}` });
      } else {
        res.end();
      }
    }
  }
);

export default router;
