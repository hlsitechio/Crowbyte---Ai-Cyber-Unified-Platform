import { supabase } from '@/lib/supabase';

export interface ThreatIOC {
  id: string;
  ioc_type: string;
  value: string;
  feed_id?: string;
  feed_name: string;
  confidence: number;
  severity: string;
  tags: string[];
  first_seen: string;
  last_seen: string;
  description?: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface IOCSearchParams {
  query?: string;
  ioc_type?: string;
  severity?: string;
  feed_name?: string;
  tags?: string[];
  limit?: number;
  offset?: number;
  order_by?: string;
}

export interface IOCStats {
  total: number;
  by_type: Record<string, number>;
  by_severity: Record<string, number>;
  by_feed: Record<string, number>;
  new_today: number;
  new_this_week: number;
}

export const iocService = {
  async search(params: IOCSearchParams): Promise<{ data: ThreatIOC[]; count: number }> {
    let query = supabase
      .from('threat_iocs')
      .select('*', { count: 'exact' });

    if (params.query) {
      query = query.ilike('value', `%${params.query}%`);
    }
    if (params.ioc_type) {
      query = query.eq('ioc_type', params.ioc_type);
    }
    if (params.severity) {
      query = query.eq('severity', params.severity);
    }
    if (params.feed_name) {
      query = query.eq('feed_name', params.feed_name);
    }
    if (params.tags?.length) {
      query = query.overlaps('tags', params.tags);
    }

    const limit = params.limit || 50;
    const offset = params.offset || 0;
    const order = params.order_by || 'last_seen';

    query = query.order(order, { ascending: false }).range(offset, offset + limit - 1);

    const { data, error, count } = await query;
    if (error) throw error;
    return { data: data || [], count: count || 0 };
  },

  async check(value: string): Promise<ThreatIOC[]> {
    const { data, error } = await supabase
      .from('threat_iocs')
      .select('*')
      .eq('value', value)
      .order('confidence', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getStats(): Promise<IOCStats> {
    const { data, error } = await supabase
      .from('threat_iocs')
      .select('ioc_type, severity, feed_name, created_at');

    if (error) throw error;

    const items = data || [];
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const weekStart = new Date(now.getTime() - 7 * 86400000).toISOString();

    const by_type: Record<string, number> = {};
    const by_severity: Record<string, number> = {};
    const by_feed: Record<string, number> = {};
    let new_today = 0;
    let new_this_week = 0;

    for (const item of items) {
      by_type[item.ioc_type] = (by_type[item.ioc_type] || 0) + 1;
      by_severity[item.severity] = (by_severity[item.severity] || 0) + 1;
      by_feed[item.feed_name] = (by_feed[item.feed_name] || 0) + 1;
      if (item.created_at >= todayStart) new_today++;
      if (item.created_at >= weekStart) new_this_week++;
    }

    return { total: items.length, by_type, by_severity, by_feed, new_today, new_this_week };
  },

  async getRecent(limit = 20): Promise<ThreatIOC[]> {
    const { data, error } = await supabase
      .from('threat_iocs')
      .select('*')
      .order('last_seen', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  },

  async getByType(ioc_type: string, limit = 100): Promise<ThreatIOC[]> {
    const { data, error } = await supabase
      .from('threat_iocs')
      .select('*')
      .eq('ioc_type', ioc_type)
      .order('last_seen', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  },

  async getSeverityCounts(): Promise<Record<string, number>> {
    const { data, error } = await supabase
      .from('threat_iocs')
      .select('severity');

    if (error) throw error;
    const counts: Record<string, number> = {};
    for (const item of data || []) {
      counts[item.severity] = (counts[item.severity] || 0) + 1;
    }
    return counts;
  },
};
