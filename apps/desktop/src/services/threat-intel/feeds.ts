import { supabase } from '@/lib/supabase';

export interface ThreatFeed {
  id: string;
  name: string;
  url: string;
  feed_type: string;
  format: string;
  auth_type: string;
  auth_key?: string;
  enabled: boolean;
  refresh_interval_min: number;
  last_fetched?: string;
  last_count: number;
  last_error?: string;
  created_at: string;
  user_id?: string;
}

export const feedService = {
  async getAll(): Promise<ThreatFeed[]> {
    const { data, error } = await supabase
      .from('threat_feeds')
      .select('*')
      .order('name');

    if (error) throw error;
    return data || [];
  },

  async getEnabled(): Promise<ThreatFeed[]> {
    const { data, error } = await supabase
      .from('threat_feeds')
      .select('*')
      .eq('enabled', true)
      .order('name');

    if (error) throw error;
    return data || [];
  },

  async toggle(id: string, enabled: boolean): Promise<void> {
    const { error } = await supabase
      .from('threat_feeds')
      .update({ enabled })
      .eq('id', id);

    if (error) throw error;
  },

  async updateInterval(id: string, interval: number): Promise<void> {
    const { error } = await supabase
      .from('threat_feeds')
      .update({ refresh_interval_min: interval })
      .eq('id', id);

    if (error) throw error;
  },

  async addFeed(feed: Partial<ThreatFeed>): Promise<ThreatFeed> {
    const { data, error } = await supabase
      .from('threat_feeds')
      .insert([feed])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteFeed(id: string): Promise<void> {
    const { error } = await supabase
      .from('threat_feeds')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async getHealthSummary(): Promise<{ total: number; enabled: number; healthy: number; errored: number; stale: number }> {
    const feeds = await this.getAll();
    const now = new Date();
    const staleThreshold = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2 hours

    return {
      total: feeds.length,
      enabled: feeds.filter(f => f.enabled).length,
      healthy: feeds.filter(f => f.enabled && !f.last_error && f.last_fetched).length,
      errored: feeds.filter(f => f.last_error).length,
      stale: feeds.filter(f => f.enabled && f.last_fetched && new Date(f.last_fetched) < staleThreshold).length,
    };
  },
};
