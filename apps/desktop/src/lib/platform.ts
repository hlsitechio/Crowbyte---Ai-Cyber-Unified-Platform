/**
 * Platform Context
 * Provides build target detection + platform tag + org context.
 * Every service that writes to Supabase should import this.
 */

// ── Build Target (compile-time, injected by Vite define) ──────────────────
export const BUILD_TARGET: 'web' | 'electron' =
  (typeof __BUILD_TARGET__ !== 'undefined' ? __BUILD_TARGET__ : 'electron') as 'web' | 'electron';
export const IS_WEB = BUILD_TARGET === 'web';
export const IS_ELECTRON = BUILD_TARGET === 'electron';

/** Runtime safety-net — checks if Electron IPC bridge is actually present */
export const hasElectronAPI = (): boolean =>
  typeof window !== 'undefined' && !!window.electronAPI;

// Platform from env (set in .env per build)
export const PLATFORM = import.meta.env.VITE_PLATFORM || 'linux';

// Organization context (set after login)
let currentOrgId: string | null = null;

export function setOrgId(orgId: string | null) {
  currentOrgId = orgId;
}

export function getOrgId(): string | null {
  return currentOrgId;
}

/**
 * Returns { platform, org_id } to spread into Supabase inserts.
 * Usage: .insert({ ...data, ...platformContext() })
 */
export function platformContext() {
  return {
    platform: PLATFORM,
    ...(currentOrgId ? { org_id: currentOrgId } : {}),
  };
}

/**
 * Returns query filters to scope reads by platform + org.
 * Usage: query.eq('platform', platformFilter().platform)
 *
 * For org-scoped queries, also add .eq('org_id', orgFilter())
 */
export function platformFilter() {
  return PLATFORM;
}

export function orgFilter() {
  return currentOrgId;
}

/**
 * Plan feature check (cached from Supabase on login)
 */
interface PlanFeatures {
  [feature: string]: { enabled: boolean; limit: number };
}

let cachedFeatures: PlanFeatures = {};

export function setFeatures(features: PlanFeatures) {
  cachedFeatures = features;
}

export function canUse(feature: string): boolean {
  return cachedFeatures[feature]?.enabled ?? false;
}

export function featureLimit(feature: string): number {
  return cachedFeatures[feature]?.limit ?? 0;
}

/**
 * Check if a count is within the plan limit
 * Returns true if unlimited (-1) or under limit
 */
export function withinLimit(feature: string, currentCount: number): boolean {
  const limit = featureLimit(feature);
  if (limit === -1) return true; // unlimited
  return currentCount < limit;
}
