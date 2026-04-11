/**
 * Scoped UilDatabase Client
 * Wraps Supabase queries to auto-inject platform + org_id context.
 *
 * Usage:
 *   import { scopedFrom, scopedInsert } from '@/lib/scoped-db';
 *
 *   // Reads: auto-filters by platform (+ org if set)
 *   const { data } = await scopedFrom('bookmarks').select('*').order('created_at', { ascending: false });
 *
 *   // Writes: auto-injects platform + org_id
 *   const { data } = await scopedInsert('bookmarks', { title: 'test', url: '...' });
 */

import { supabase } from './supabase';
import { PLATFORM, getOrgId } from './platform';

/**
 * Returns a Supabase query builder scoped to current platform + org.
 * Filters: .eq('platform', PLATFORM) and optionally .eq('org_id', orgId)
 *
 * For tables that DON'T have platform/org_id columns, use supabase.from() directly.
 */
export function scopedFrom(table: string) {
  let query = supabase.from(table).select('*').eq('platform', PLATFORM);

  const orgId = getOrgId();
  if (orgId) {
    query = query.eq('org_id', orgId);
  }

  return query;
}

/**
 * Returns a scoped select with custom column selection.
 */
export function scopedSelect(table: string, columns: string) {
  let query = supabase.from(table).select(columns).eq('platform', PLATFORM);

  const orgId = getOrgId();
  if (orgId) {
    query = query.eq('org_id', orgId);
  }

  return query;
}

/**
 * Insert with auto-injected platform + org_id.
 */
export async function scopedInsert(table: string, data: Record<string, unknown> | Record<string, unknown>[]) {
  const context = {
    platform: PLATFORM,
    ...(getOrgId() ? { org_id: getOrgId() } : {}),
  };

  const rows = Array.isArray(data)
    ? data.map(row => ({ ...row, ...context }))
    : { ...data, ...context };

  return supabase.from(table).insert(rows).select();
}

/**
 * Upsert with auto-injected platform + org_id.
 */
export async function scopedUpsert(table: string, data: Record<string, unknown>, options?: { onConflict?: string }) {
  const context = {
    platform: PLATFORM,
    ...(getOrgId() ? { org_id: getOrgId() } : {}),
  };

  let query = supabase.from(table).upsert({ ...data, ...context });
  return query.select();
}

/**
 * Delete scoped by platform + org.
 */
export function scopedDelete(table: string) {
  let query = supabase.from(table).delete().eq('platform', PLATFORM);

  const orgId = getOrgId();
  if (orgId) {
    query = query.eq('org_id', orgId);
  }

  return query;
}

/**
 * Update scoped by platform + org.
 */
export function scopedUpdate(table: string, data: Record<string, unknown>) {
  let query = supabase.from(table).update(data).eq('platform', PLATFORM);

  const orgId = getOrgId();
  if (orgId) {
    query = query.eq('org_id', orgId);
  }

  return query;
}

// Re-export raw supabase for tables without platform/org columns
export { supabase } from './supabase';
