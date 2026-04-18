/**
 * Subscription Activation Service
 *
 * Handles creating/updating subscription rows in Supabase.
 * Used by Checkout (web) after payment — desktop reads via license-guard.
 *
 * Flow:
 *   Web Checkout → user confirms → activateSubscription() → Supabase row
 *   Desktop → license-guard.ts → reads same row → unlocks app
 */

import { supabase } from "@/integrations/supabase/client";

// ─── Types ──────────────────────────────────────────────────────────────────

export type ActivateTier = "pro" | "team" | "enterprise";
export type ActivateStatus = "active" | "pending" | "past_due" | "cancelled";

export interface ActivationResult {
  success: boolean;
  tier?: string;
  status?: string;
  expiresAt?: string;
  error?: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getExpiryDate(period: "monthly" | "annual"): string {
  const d = new Date();
  if (period === "annual") {
    d.setFullYear(d.getFullYear() + 1);
  } else {
    d.setMonth(d.getMonth() + 1);
  }
  return d.toISOString();
}

// ─── Activate Subscription ──────────────────────────────────────────────────

/**
 * Create or update a subscription for the current user.
 * Called after payment confirmation on web — writes to Supabase so desktop can read it.
 */
export async function activateSubscription(opts: {
  tier: ActivateTier;
  period: "monthly" | "annual";
  orderId: string;
  status?: ActivateStatus;
}): Promise<ActivationResult> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Not authenticated. Please sign in first." };
  }

  const expiresAt = getExpiryDate(opts.period);

  // Try RPC first (SECURITY DEFINER — handles upsert reliably)
  const { data: rpcData, error: rpcErr } = await supabase.rpc(
    'activate_my_subscription' as any,
    {
      p_tier: opts.tier,
      p_expires_at: expiresAt,
    } as any
  );

  if (!rpcErr && rpcData) {
    const rows = rpcData as any[];
    const sub = rows?.[0] || rpcData;
    console.log(`[+] Subscription activated via RPC: ${sub.tier} until ${sub.expires_at}`);
    return {
      success: true,
      tier: sub.tier,
      status: sub.status,
      expiresAt: sub.expires_at,
    };
  }

  // Fallback: direct table operations
  const now = new Date().toISOString();
  const status = opts.status || "active";

  const { data: existing } = await supabase
    .from("user_subscriptions" as any)
    .select("id")
    .eq("user_id", user.id)
    .single();

  let result;

  if (existing) {
    const { data, error } = await supabase
      .from("user_subscriptions" as any)
      .update({
        tier: opts.tier,
        status,
        expires_at: expiresAt,
        updated_at: now,
      } as any)
      .eq("user_id", user.id)
      .select()
      .single();
    result = { data, error };
  } else {
    const { data, error } = await supabase
      .from("user_subscriptions" as any)
      .insert({
        user_id: user.id,
        tier: opts.tier,
        status,
        started_at: now,
        expires_at: expiresAt,
        created_at: now,
        updated_at: now,
      } as any)
      .select()
      .single();
    result = { data, error };
  }

  if (result.error) {
    console.error("[subscription-activate] Error:", result.error.message);
    return { success: false, error: result.error.message };
  }

  const sub = result.data as any;
  console.log(`[+] Subscription activated: ${sub.tier} until ${sub.expires_at}`);

  return {
    success: true,
    tier: sub.tier,
    status: sub.status,
    expiresAt: sub.expires_at,
  };
}

/**
 * Quick check: does current user have ANY subscription row?
 */
export async function hasSubscription(): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from("user_subscriptions" as any)
    .select("id, status")
    .eq("user_id", user.id)
    .single();

  return !!data;
}

/**
 * Get current subscription details for display.
 */
export async function getSubscriptionStatus(): Promise<{
  tier: string;
  status: string;
  expiresAt: string | null;
} | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("user_subscriptions" as any)
    .select("tier, status, expires_at")
    .eq("user_id", user.id)
    .single();

  if (error || !data) return null;
  const s = data as any;
  return {
    tier: s.tier,
    status: s.status,
    expiresAt: s.expires_at,
  };
}
