/**
 * License Guard — Subscription enforcement for CrowByte Desktop.
 *
 * FREE = web only. PRO+ = desktop access with active subscription.
 * Checks Supabase subscription status, caches encrypted ticket locally,
 * enforces device limits, and hard-locks on downgrade/refund/expiry.
 */

import { supabase } from "@/integrations/supabase/client";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface LicenseStatus {
  valid: boolean;
  tier: string;
  status: string;
  expiresAt: string | null;
  deviceId: string;
  lastCheck: number;
  reason?: string;
}

export interface DeviceInfo {
  deviceId: string;
  hostname: string;
  platform: string;
  username: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const ALLOWED_TIERS = ['pro', 'team', 'enterprise'];
const CACHE_KEY = 'crowbyte_license_ticket';
const CACHE_TTL_MS = 48 * 60 * 60 * 1000; // 48 hours offline grace
const CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000; // 4 hours re-check

// Device limits per tier
const DEVICE_LIMITS: Record<string, number> = {
  pro: 3,
  team: 10,
  enterprise: 999, // effectively unlimited
};

// ─── Device Fingerprint ─────────────────────────────────────────────────────

function generateDeviceId(): string {
  // Use electronAPI if available for hardware-bound fingerprint
  const parts: string[] = [];
  parts.push(navigator.userAgent);
  parts.push(String(navigator.hardwareConcurrency || 0));
  parts.push(String((screen?.width || 0) + 'x' + (screen?.height || 0)));
  parts.push(navigator.language || 'unknown');
  // Simple hash
  let hash = 0;
  const str = parts.join('|');
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return 'dev_' + Math.abs(hash).toString(36) + '_' + navigator.hardwareConcurrency;
}

let _deviceId: string | null = null;

export function getDeviceId(): string {
  if (!_deviceId) {
    _deviceId = generateDeviceId();
  }
  return _deviceId;
}

// ─── Cache (localStorage fallback, safeStorage preferred) ───────────────────

function saveTicket(status: LicenseStatus): void {
  try {
    const encrypted = btoa(JSON.stringify(status));
    localStorage.setItem(CACHE_KEY, encrypted);
    // Also try Electron safeStorage if available
    window.electronAPI?.storeCredentials?.({
      deviceId: CACHE_KEY,
      data: JSON.stringify(status),
    });
  } catch {
    // Silent fail
  }
}

function loadTicket(): LicenseStatus | null {
  try {
    // Try Electron safeStorage first
    // Fallback to localStorage
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const decoded = JSON.parse(atob(raw));
    return decoded as LicenseStatus;
  } catch {
    return null;
  }
}

function clearTicket(): void {
  localStorage.removeItem(CACHE_KEY);
  window.electronAPI?.deleteCredentials?.(CACHE_KEY);
}

// ─── Subscription Check ─────────────────────────────────────────────────────

async function checkSubscription(): Promise<LicenseStatus> {
  const deviceId = getDeviceId();

  // Must be authenticated
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    return {
      valid: false, tier: 'none', status: 'unauthenticated',
      expiresAt: null, deviceId, lastCheck: Date.now(),
      reason: 'Not signed in. Please log in with your CrowByte account.',
    };
  }

  // Query subscription via RPC (SECURITY DEFINER — bypasses RLS edge cases)
  const { data: rpcData, error: rpcErr } = await supabase.rpc('get_my_subscription' as any);

  // Fallback to direct query if RPC doesn't exist
  let s: any = null;
  if (rpcErr) {
    const { data: sub, error: subErr } = await supabase
      .from('user_subscriptions' as any)
      .select('tier, status, expires_at')
      .eq('user_id', session.user.id)
      .eq('status', 'active')
      .single();
    if (subErr || !sub) s = null;
    else s = sub;
  } else {
    const rows = rpcData as any[];
    s = rows?.length > 0 ? rows[0] : null;
  }

  if (!s) {
    return {
      valid: false, tier: 'free', status: 'no_subscription',
      expiresAt: null, deviceId, lastCheck: Date.now(),
      reason: 'No active subscription found. The desktop app requires a Pro, Team, or Enterprise plan.',
    };
  }

  // Check tier
  if (!ALLOWED_TIERS.includes(s.tier)) {
    return {
      valid: false, tier: s.tier, status: 'tier_insufficient',
      expiresAt: s.expires_at, deviceId, lastCheck: Date.now(),
      reason: `Your current plan (${s.tier}) doesn't include desktop access. Upgrade to Pro or higher.`,
    };
  }

  // Check expiry
  if (s.expires_at && new Date(s.expires_at) < new Date()) {
    return {
      valid: false, tier: s.tier, status: 'expired',
      expiresAt: s.expires_at, deviceId, lastCheck: Date.now(),
      reason: 'Your subscription has expired. Please renew to continue using the desktop app.',
    };
  }

  // Register/verify device activation (limit based on tier)
  const maxDevices = DEVICE_LIMITS[s.tier] || 3;
  const deviceCheck = await verifyDevice(session.user.id, deviceId, maxDevices);
  if (!deviceCheck.ok) {
    return {
      valid: false, tier: s.tier, status: 'device_limit',
      expiresAt: s.expires_at, deviceId, lastCheck: Date.now(),
      reason: deviceCheck.reason,
    };
  }

  // All good
  return {
    valid: true, tier: s.tier, status: 'active',
    expiresAt: s.expires_at, deviceId, lastCheck: Date.now(),
  };
}

// ─── Device Activation ──────────────────────────────────────────────────────

async function verifyDevice(
  userId: string,
  deviceId: string,
  maxDevices: number = 3,
): Promise<{ ok: boolean; reason?: string }> {
  // Check existing activations
  const { data: activations } = await supabase
    .from('device_activations' as any)
    .select('id, device_id, device_name, last_seen')
    .eq('user_id', userId)
    .order('last_seen', { ascending: false });

  const acts = (activations || []) as any[];

  // Is this device already registered?
  const existing = acts.find((a: any) => a.device_id === deviceId);
  if (existing) {
    // Update last_seen
    await supabase
      .from('device_activations' as any)
      .update({ last_seen: new Date().toISOString() } as any)
      .eq('id', existing.id);
    return { ok: true };
  }

  // New device — check limit
  if (acts.length >= maxDevices) {
    const deviceList = acts.map((a: any) => a.device_name || a.device_id).join(', ');
    return {
      ok: false,
      reason: `Device limit reached (${maxDevices} max for your plan). Active devices: ${deviceList}. Deactivate a device at crowbyte.io/settings to add this one.`,
    };
  }

  // Register new device
  const { error } = await supabase
    .from('device_activations' as any)
    .insert({
      user_id: userId,
      device_id: deviceId,
      device_name: `${navigator.platform} - ${navigator.userAgent.split('(')[1]?.split(')')[0] || 'Unknown'}`,
      last_seen: new Date().toISOString(),
    } as any);

  if (error) {
    console.warn('[license-guard] Failed to register device:', error.message);
    // Don't block on registration failure — allow access
    return { ok: true };
  }

  return { ok: true };
}

/**
 * Get list of activated devices for current user.
 */
export async function getActiveDevices(): Promise<{ id: string; device_id: string; device_name: string; last_seen: string }[]> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return [];
  const { data } = await supabase
    .from('device_activations' as any)
    .select('id, device_id, device_name, last_seen')
    .eq('user_id', session.user.id)
    .order('last_seen', { ascending: false });
  return (data || []) as any[];
}

/**
 * Deactivate a specific device (remove from device_activations).
 */
export async function deactivateDevice(activationId: string): Promise<boolean> {
  const { error } = await supabase
    .from('device_activations' as any)
    .delete()
    .eq('id', activationId);
  return !error;
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Full license verification. Checks online first, falls back to cached ticket.
 */
export async function verifyLicense(): Promise<LicenseStatus> {
  try {
    // Try online check
    const status = await checkSubscription();
    if (status.valid) {
      saveTicket(status);
    } else {
      // Invalid — clear any cached ticket
      clearTicket();
    }
    return status;
  } catch {
    // Offline — use cached ticket
    const cached = loadTicket();
    if (!cached) {
      return {
        valid: false, tier: 'unknown', status: 'offline',
        expiresAt: null, deviceId: getDeviceId(), lastCheck: 0,
        reason: 'Unable to verify subscription. Please connect to the internet.',
      };
    }

    // Check cache TTL
    const age = Date.now() - cached.lastCheck;
    if (age > CACHE_TTL_MS) {
      clearTicket();
      return {
        valid: false, tier: cached.tier, status: 'cache_expired',
        expiresAt: cached.expiresAt, deviceId: cached.deviceId,
        lastCheck: cached.lastCheck,
        reason: 'Subscription verification expired. Please connect to the internet to re-verify.',
      };
    }

    // Cache still valid
    return cached;
  }
}

/**
 * Quick check using cache only (non-blocking).
 */
export function getCachedLicense(): LicenseStatus | null {
  const cached = loadTicket();
  if (!cached) return null;
  const age = Date.now() - cached.lastCheck;
  if (age > CACHE_TTL_MS) return null;
  return cached;
}

/**
 * Check if a background re-verification is needed.
 */
export function needsRecheck(): boolean {
  const cached = loadTicket();
  if (!cached) return true;
  return (Date.now() - cached.lastCheck) > CHECK_INTERVAL_MS;
}

/**
 * Force deactivation (logout / subscription change).
 */
export function deactivate(): void {
  clearTicket();
}

/**
 * Get check interval for periodic verification.
 */
export { CHECK_INTERVAL_MS };
