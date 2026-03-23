import { supabase } from '@/lib/supabase';

export interface ShodanCacheEntry {
  id: string;
  query_type: string;
  query_value: string;
  result: Record<string, unknown>;
  cached_at: string;
  expires_at: string;
}

export interface EnrichmentResult {
  ioc_hits: number;
  feeds: string[];
  shodan?: Record<string, unknown>;
  severity: string;
  confidence: number;
  tags: string[];
}

export const enrichmentService = {
  async getShodanCache(queryType: string, queryValue: string): Promise<ShodanCacheEntry | null> {
    const { data, error } = await supabase
      .from('shodan_cache')
      .select('*')
      .eq('query_type', queryType)
      .eq('query_value', queryValue)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error) return null;
    return data;
  },

  async cacheShodanResult(queryType: string, queryValue: string, result: Record<string, unknown>): Promise<void> {
    const now = new Date();
    const expires = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24h TTL

    const { error } = await supabase
      .from('shodan_cache')
      .upsert([{
        query_type: queryType,
        query_value: queryValue,
        result,
        cached_at: now.toISOString(),
        expires_at: expires.toISOString(),
      }], { onConflict: 'query_type,query_value' });

    if (error) console.error('Failed to cache Shodan result:', error);
  },

  async enrichIP(ip: string): Promise<EnrichmentResult> {
    // Check IOC database
    const { data: iocs } = await supabase
      .from('threat_iocs')
      .select('feed_name, severity, confidence, tags')
      .eq('value', ip);

    const feeds = [...new Set((iocs || []).map(i => i.feed_name))];
    const allTags = [...new Set((iocs || []).flatMap(i => i.tags || []))];
    const maxConf = Math.max(0, ...(iocs || []).map(i => i.confidence));
    const severityOrder = ['critical', 'high', 'medium', 'low', 'info'];
    const worstSeverity = severityOrder.find(s => (iocs || []).some(i => i.severity === s)) || 'unknown';

    // Check Shodan cache
    const cached = await this.getShodanCache('ip', ip);

    return {
      ioc_hits: (iocs || []).length,
      feeds,
      shodan: cached?.result,
      severity: worstSeverity,
      confidence: maxConf,
      tags: allTags,
    };
  },

  async getCacheStats(): Promise<{ total: number; expired: number; active: number }> {
    const now = new Date().toISOString();

    const { count: total } = await supabase
      .from('shodan_cache')
      .select('id', { count: 'exact', head: true });

    const { count: active } = await supabase
      .from('shodan_cache')
      .select('id', { count: 'exact', head: true })
      .gt('expires_at', now);

    return {
      total: total || 0,
      active: active || 0,
      expired: (total || 0) - (active || 0),
    };
  },

  async cleanExpiredCache(): Promise<number> {
    const { data, error } = await supabase
      .from('shodan_cache')
      .delete()
      .lt('expires_at', new Date().toISOString())
      .select('id');

    if (error) throw error;
    return (data || []).length;
  },
};
