/**
 * CrowByte Credits Service — Client-side credit management
 * Handles balance fetching, pack purchasing, and credit-aware AI chat.
 */

import { supabase } from '@/integrations/supabase/client';

const API_BASE = import.meta.env.VITE_APP_URL || 'https://crowbyte.io';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface CreditBalance {
  balance: number;           // wallet_balance (THE number)
  wallet_balance?: number;   // explicit wallet field
  monthly_allowance: number;
  monthly_used: number;
  monthly_granted?: number;
  pack_balance: number;
  tier: string;
  last_reset: string;
}

export interface CreditPack {
  id: string;
  name: string;
  credits: number;
  price_usd: number;
  stripe_price_id: string;
  active: boolean;
  sort_order: number;
}

export interface CreditTransaction {
  id: string;
  user_id: string;
  amount: number;
  type: 'usage' | 'purchase' | 'monthly_grant' | 'refund' | 'bonus' | 'admin';
  model?: string;
  credits_cost?: number;
  description?: string;
  balance_after: number;
  created_at: string;
}

export interface ModelCreditCost {
  credits: number;
  tier: 'free' | 'mid' | 'premium';
  label: string;
}

// ─── Model Credit Costs (mirrored from server) ─────────────────────────────

export const MODEL_CREDIT_COSTS: Record<string, ModelCreditCost> = {
  'nvidia/nemotron-3-super-120b-a12b:free': { credits: 1, tier: 'free',    label: '1 credit' },
  'qwen/qwen3-coder:free':                { credits: 1,  tier: 'free',    label: '1 credit' },
  'google/gemma-3-27b-it:free':            { credits: 1,  tier: 'free',    label: '1 credit' },
  'qwen/qwen3-coder':                     { credits: 5,  tier: 'mid',     label: '5 credits' },
  'qwen/qwen3.5-coder':                   { credits: 5,  tier: 'mid',     label: '5 credits' },
  'google/gemini-2.5-pro-preview':         { credits: 20, tier: 'premium', label: '20 credits' },
  'google/gemini-2.5-flash-preview:thinking': { credits: 8, tier: 'mid',  label: '8 credits' },
};

export function getModelCreditCost(modelId: string): ModelCreditCost {
  return MODEL_CREDIT_COSTS[modelId] || { credits: 5, tier: 'mid', label: '5 credits' };
}

// ─── Auth Helper ────────────────────────────────────────────────────────────

async function getAuthToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data?.session?.access_token || null;
}

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };
}

// ─── API Calls ──────────────────────────────────────────────────────────────

/** Get current credit balance */
export async function getBalance(): Promise<CreditBalance | null> {
  try {
    const headers = await authHeaders();
    const res = await fetch(`${API_BASE}/api/credits/balance`, { headers });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/** Get available credit packs */
export async function getPacks(): Promise<CreditPack[]> {
  try {
    const res = await fetch(`${API_BASE}/api/credits/packs`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.packs || [];
  } catch {
    return [];
  }
}

/** Purchase a credit pack — returns Stripe checkout URL */
export async function purchasePack(packId: string): Promise<string | null> {
  try {
    const { data: { session: _s } } = await supabase.auth.getSession();
    const user = _s?.user ?? null;
    if (!user) return null;

    const headers = await authHeaders();
    const res = await fetch(`${API_BASE}/api/credits/purchase`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        packId,
        userId: user.id,
        userEmail: user.email,
      }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data.url || null;
  } catch {
    return null;
  }
}

/** Get transaction history */
export async function getHistory(): Promise<CreditTransaction[]> {
  try {
    const headers = await authHeaders();
    const res = await fetch(`${API_BASE}/api/credits/history`, { headers });
    if (!res.ok) return [];
    const data = await res.json();
    return data.transactions || [];
  } catch {
    return [];
  }
}

/**
 * Send AI chat message via credit-aware proxy.
 * Returns a ReadableStream for SSE consumption.
 */
export async function sendCreditChat(
  messages: Array<{ role: string; content: string }>,
  model: string,
  signal?: AbortSignal,
  tools?: any[],
): Promise<Response> {
  const headers = await authHeaders();

  const body: Record<string, any> = { messages, model };
  if (tools && tools.length > 0) body.tools = tools;

  const res = await fetch(`${API_BASE}/api/credits/chat`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal,
  });

  return res;
}

// ─── Event emitter for balance updates ──────────────────────────────────────

type BalanceListener = (balance: CreditBalance) => void;
const listeners: BalanceListener[] = [];

export function onBalanceChange(fn: BalanceListener): () => void {
  listeners.push(fn);
  return () => {
    const idx = listeners.indexOf(fn);
    if (idx >= 0) listeners.splice(idx, 1);
  };
}

export function emitBalanceChange(balance: CreditBalance) {
  for (const fn of listeners) fn(balance);
}

/** Refresh and broadcast balance */
export async function refreshBalance(): Promise<CreditBalance | null> {
  const balance = await getBalance();
  if (balance) emitBalanceChange(balance);
  return balance;
}
