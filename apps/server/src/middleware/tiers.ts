/**
 * Tier System — Rate limiting & feature gating per user tier
 *
 * Tiers: free | pro | enterprise
 * Auth: Supabase JWT (from web client) validated here
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// ─── Tier Config ─────────────────────────────────────

export interface TierLimits {
  messagesPerDay: number;
  models: string[];
  maxTokens: number;
  agents: number;
  knowledgeEntries: number;
  apiAccess: boolean;
}

export const TIER_LIMITS: Record<string, TierLimits> = {
  free: {
    messagesPerDay: 50,
    models: [
      'deepseek-ai/deepseek-v3.2',
      'z-ai/glm5',
      'moonshotai/kimi-k2-instruct',
    ],
    maxTokens: 2048,
    agents: 0,
    knowledgeEntries: 50,
    apiAccess: false,
  },
  pro: {
    messagesPerDay: -1, // unlimited
    models: [
      'deepseek-ai/deepseek-v3.2',
      'z-ai/glm5',
      'moonshotai/kimi-k2-instruct',
      'moonshotai/kimi-k2.5',
      'qwen/qwen3-coder-480b-a35b-instruct',
      'qwen/qwen3.5-397b-a17b',
      'mistralai/mistral-large-3-675b-instruct-2512',
    ],
    maxTokens: 8192,
    agents: 3,
    knowledgeEntries: -1,
    apiAccess: false,
  },
  enterprise: {
    messagesPerDay: -1,
    models: [
      'deepseek-ai/deepseek-v3.2',
      'z-ai/glm5',
      'moonshotai/kimi-k2-instruct',
      'moonshotai/kimi-k2.5',
      'qwen/qwen3-coder-480b-a35b-instruct',
      'qwen/qwen3.5-397b-a17b',
      'mistralai/mistral-large-3-675b-instruct-2512',
    ],
    maxTokens: 16384,
    agents: -1,
    knowledgeEntries: -1,
    apiAccess: true,
  },
};

// ─── Supabase JWT Validation ─────────────────────────

const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET || '';
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://gvskdopsigtflbbylyto.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

export interface SupabaseUser {
  sub: string;  // user_id
  email?: string;
  role?: string;
  tier?: string;
}

/**
 * Validate Supabase JWT and extract user info.
 * Falls back to fetching user from Supabase if JWT secret not configured.
 */
export async function validateSupabaseToken(token: string): Promise<SupabaseUser | null> {
  // Try JWT verification first (faster, no network call)
  if (SUPABASE_JWT_SECRET) {
    try {
      const decoded = jwt.verify(token, SUPABASE_JWT_SECRET) as any;
      return { sub: decoded.sub, email: decoded.email, role: decoded.role };
    } catch {
      return null;
    }
  }

  // Fallback: validate via Supabase API
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || '',
      },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const user = await res.json() as Record<string, any>;
    return { sub: user.id, email: user.email, role: user.role };
  } catch {
    return null;
  }
}

/**
 * Get user's tier from Supabase profiles table.
 */
export async function getUserTier(userId: string): Promise<string> {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=tier`,
      {
        headers: {
          apikey: SUPABASE_SERVICE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
        signal: AbortSignal.timeout(3000),
      }
    );
    if (!res.ok) return 'free';
    const data = await res.json() as Array<{ tier?: string }>;
    return data?.[0]?.tier || 'free';
  } catch {
    return 'free';
  }
}

/**
 * Get user's message count for today.
 */
export async function getTodayUsage(userId: string): Promise<number> {
  const today = new Date().toISOString().split('T')[0];
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/ai_usage?user_id=eq.${userId}&date=eq.${today}&select=message_count`,
      {
        headers: {
          apikey: SUPABASE_SERVICE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
        signal: AbortSignal.timeout(3000),
      }
    );
    if (!res.ok) return 0;
    const data = await res.json() as Array<{ message_count?: number }>;
    return data?.[0]?.message_count || 0;
  } catch {
    return 0;
  }
}

/**
 * Increment user's message count for today.
 */
export async function incrementUsage(userId: string, model: string): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  try {
    // Upsert: create or increment
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/ai_usage`,
      {
        method: 'POST',
        headers: {
          apikey: SUPABASE_SERVICE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates',
        },
        body: JSON.stringify({
          user_id: userId,
          date: today,
          message_count: 1,
          models_used: [model],
        }),
        signal: AbortSignal.timeout(3000),
      }
    );

    if (res.ok) {
      // Now increment the count (upsert set it to 1, we need to add)
      await fetch(
        `${SUPABASE_URL}/rest/v1/rpc/exec_sql`,
        {
          method: 'POST',
          headers: {
            apikey: SUPABASE_SERVICE_KEY,
            Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sql: `INSERT INTO ai_usage (user_id, date, message_count, models_used)
                  VALUES ('${userId}', '${today}', 1, '["${model}"]'::jsonb)
                  ON CONFLICT (user_id, date)
                  DO UPDATE SET
                    message_count = ai_usage.message_count + 1,
                    models_used = ai_usage.models_used || '["${model}"]'::jsonb,
                    updated_at = now()`,
          }),
          signal: AbortSignal.timeout(3000),
        }
      );
    }
  } catch {
    // Usage tracking failure should never block the request
  }
}

// ─── Middleware ───────────────────────────────────────

/**
 * Middleware: Require Supabase auth and attach user + tier to request.
 */
export function requireSupabaseAuth(req: Request, res: Response, next: NextFunction): void {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    res.status(401).json({ error: 'Authentication required. Please sign in.' });
    return;
  }

  validateSupabaseToken(token)
    .then(async (user) => {
      if (!user) {
        res.status(401).json({ error: 'Invalid or expired session. Please sign in again.' });
        return;
      }

      // Attach user info to request
      (req as any).supabaseUser = user;

      // Get tier
      const tier = await getUserTier(user.sub);
      (req as any).userTier = tier;
      (req as any).tierLimits = TIER_LIMITS[tier] || TIER_LIMITS.free;

      next();
    })
    .catch(() => {
      res.status(500).json({ error: 'Auth service error' });
    });
}

/**
 * Middleware: Check rate limit for AI chat based on tier.
 */
export function checkAiRateLimit(req: Request, res: Response, next: NextFunction): void {
  const user = (req as any).supabaseUser as SupabaseUser;
  const limits = (req as any).tierLimits as TierLimits;
  const tier = (req as any).userTier as string;

  if (!user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  // Unlimited tiers skip rate check
  if (limits.messagesPerDay === -1) {
    next();
    return;
  }

  getTodayUsage(user.sub)
    .then((count) => {
      if (count >= limits.messagesPerDay) {
        res.status(429).json({
          error: 'Daily message limit reached',
          message: `Free tier allows ${limits.messagesPerDay} messages per day. Upgrade to Pro for unlimited.`,
          tier,
          used: count,
          limit: limits.messagesPerDay,
          upgradeUrl: '/settings?tab=billing',
        });
        return;
      }
      next();
    })
    .catch(() => {
      // On error, allow the request (fail open for now)
      next();
    });
}

/**
 * Middleware: Check if requested model is allowed for user's tier.
 */
export function checkModelAccess(req: Request, res: Response, next: NextFunction): void {
  const limits = (req as any).tierLimits as TierLimits;
  const tier = (req as any).userTier as string;
  const model = req.body?.model;

  if (!model) {
    next();
    return;
  }

  if (!limits.models.includes(model)) {
    res.status(403).json({
      error: 'Model not available on your plan',
      message: `${model} requires Pro or Enterprise tier. Upgrade to access all models.`,
      tier,
      allowedModels: limits.models,
      upgradeUrl: '/settings?tab=billing',
    });
    return;
  }

  next();
}
