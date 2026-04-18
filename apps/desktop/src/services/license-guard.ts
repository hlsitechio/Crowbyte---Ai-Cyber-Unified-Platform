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

// ─── AES-GCM ticket encryption using device fingerprint as key material ────

async function deriveTicketKey(): Promise<CryptoKey> {
  const deviceId = getDeviceId();
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(deviceId),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  // Use a per-installation salt stored in localStorage; generate on first use
  let salt = localStorage.getItem('crowbyte_ticket_salt');
  if (!salt) {
    const randomSalt = crypto.getRandomValues(new Uint8Array(32));
    salt = btoa(String.fromCharCode(...randomSalt));
    localStorage.setItem('crowbyte_ticket_salt', salt);
  }
  const saltBytes = Uint8Array.from(atob(salt), c => c.charCodeAt(0));
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: saltBytes, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function encryptTicket(status: LicenseStatus): Promise<string> {
  const key = await deriveTicketKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify(status));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);
  const combined = new Uint8Array(12 + ciphertext.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), 12);
  return btoa(String.fromCharCode(...combined));
}

async function decryptTicket(raw: string): Promise<LicenseStatus> {
  const key = await deriveTicketKey();
  const combined = Uint8Array.from(atob(raw), c => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
  return JSON.parse(new TextDecoder().decode(plaintext)) as LicenseStatus;
}

function saveTicket(status: LicenseStatus): void {
  // Fire-and-forget async save; also try Electron safeStorage
  encryptTicket(status).then(encrypted => {
    try {
      localStorage.setItem(CACHE_KEY, encrypted);
    } catch {
      // Silent fail
    }
  }).catch(() => {});
  // localStorage is sufficient for the license ticket — safeStorage is for user credentials only
}

function loadTicket(): LicenseStatus | null {
  // Synchronous path — returns null; callers that need the ticket should use loadTicketAsync
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    // Attempt legacy btoa decode for migration from old format
    try {
      const legacy = JSON.parse(atob(raw));
      if (legacy && typeof legacy.valid === 'boolean') return legacy as LicenseStatus;
    } catch {
      // Not legacy format — fall through to return null; async path will decrypt
    }
    return null;
  } catch {
    return null;
  }
}

async function loadTicketAsync(): Promise<LicenseStatus | null> {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    // Try AES-GCM decrypt first
    try {
      return await decryptTicket(raw);
    } catch {
      // Fall back to legacy btoa for one-time migration
      try {
        const legacy = JSON.parse(atob(raw)) as LicenseStatus;
        // Re-save in new encrypted format
        saveTicket(legacy);
        return legacy;
      } catch {
        return null;
      }
    }
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
    const cached = await loadTicketAsync();
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
 * Quick check using cache only (non-blocking). Returns null synchronously;
 * use getCachedLicenseAsync for the decrypted value.
 */
export function getCachedLicense(): LicenseStatus | null {
  // Synchronous stub retained for API compatibility — returns null when ticket is encrypted
  return loadTicket();
}

/**
 * Async version of getCachedLicense — decrypts AES-GCM ticket.
 */
export async function getCachedLicenseAsync(): Promise<LicenseStatus | null> {
  const cached = await loadTicketAsync();
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
