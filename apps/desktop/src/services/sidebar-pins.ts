/**
 * Sidebar Pins — Quick access pinned pages
 * Persists to localStorage + Supabase user_settings.pinned_pages
 */

import supabase from '@/lib/supabase';

const STORAGE_KEY = 'crowbyte-sidebar-pins';

export function getPinnedUrls(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

export function isPinned(url: string): boolean {
  return getPinnedUrls().includes(url);
}

export function togglePin(url: string): string[] {
  const current = getPinnedUrls();
  const updated = current.includes(url)
    ? current.filter(u => u !== url)
    : [...current, url];

  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  syncPinsToCloud(updated);
  window.dispatchEvent(new CustomEvent('pinsChanged', { detail: updated }));
  return updated;
}

export function reorderPins(urls: string[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(urls));
  syncPinsToCloud(urls);
  window.dispatchEvent(new CustomEvent('pinsChanged', { detail: urls }));
}

async function syncPinsToCloud(pins: string[]): Promise<void> {
  try {
    const { data: { session: _s } } = await supabase.auth.getSession();
    const user = _s?.user ?? null;
    if (!user) return;
    await supabase
      .from('user_settings')
      .upsert({
        user_id: user.id,
        pinned_pages: JSON.stringify(pins),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
  } catch {}
}

export async function initPins(): Promise<void> {
  try {
    const { data: { session: _s } } = await supabase.auth.getSession();
    const user = _s?.user ?? null;
    if (!user) return;
    const { data } = await supabase
      .from('user_settings')
      .select('pinned_pages')
      .eq('user_id', user.id)
      .single();

    if (data?.pinned_pages) {
      const cloudPins = JSON.parse(data.pinned_pages);
      if (Array.isArray(cloudPins) && cloudPins.length > 0) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cloudPins));
        window.dispatchEvent(new CustomEvent('pinsChanged', { detail: cloudPins }));
      }
    }
  } catch {}
}
