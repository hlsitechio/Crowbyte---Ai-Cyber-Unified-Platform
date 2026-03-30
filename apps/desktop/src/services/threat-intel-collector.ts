/**
 * Threat Intel Collector — Auto-fetching service for public threat feeds
 * Fetches from free, no-API-key-required feeds and upserts to Supabase
 */

import { supabase } from '@/lib/supabase';

// ── Types ──

interface FeedConfig {
  name: string;
  url: string;
  type: string;
  format: string;
  parser: string;
  method?: 'GET' | 'POST';
  body?: Record<string, unknown>;
}

interface NormalizedIOC {
  ioc_type: string;
  value: string;
  feed_name: string;
  confidence: number;
  severity: string;
  tags: string[];
  first_seen: string;
  last_seen: string;
  description?: string;
  metadata: Record<string, unknown>;
}

export interface SyncResult {
  feed: string;
  success: boolean;
  added: number;
  error?: string;
  duration_ms: number;
}

export interface SyncProgress {
  current: number;
  total: number;
  currentFeed: string;
  results: SyncResult[];
}

// ── Feed Definitions ──

const PUBLIC_FEEDS: FeedConfig[] = [
  {
    name: 'abuse_ch_urlhaus',
    url: 'https://urlhaus-api.abuse.ch/v1/urls/recent/',
    type: 'url',
    format: 'json',
    parser: 'urlhaus',
    method: 'POST',
    body: {},
  },
  {
    name: 'abuse_ch_feodo',
    url: 'https://feodotracker.abuse.ch/downloads/ipblocklist.json',
    type: 'ip_blocklist',
    format: 'json',
    parser: 'feodo',
  },
  {
    name: 'abuse_ch_threatfox',
    url: 'https://threatfox-api.abuse.ch/api/v1/',
    type: 'mixed',
    format: 'json',
    parser: 'threatfox',
    method: 'POST',
    body: { query: 'get_iocs', days: 1 },
  },
  {
    name: 'blocklist_de_ssh',
    url: 'https://lists.blocklist.de/lists/ssh.txt',
    type: 'ip_list',
    format: 'plaintext',
    parser: 'plaintext_ip',
  },
  {
    name: 'blocklist_de_bruteforce',
    url: 'https://lists.blocklist.de/lists/bruteforcelogin.txt',
    type: 'ip_list',
    format: 'plaintext',
    parser: 'plaintext_ip',
  },
  {
    name: 'cinsscore_badguys',
    url: 'https://cinsscore.com/list/ci-badguys.txt',
    type: 'ip_list',
    format: 'plaintext',
    parser: 'plaintext_ip',
  },
  {
    name: 'emerging_threats_compromised',
    url: 'https://rules.emergingthreats.net/blockrules/compromised-ips.txt',
    type: 'ip_list',
    format: 'plaintext',
    parser: 'plaintext_ip',
  },
];

// ── Parsers ──

function parseUrlhaus(data: unknown): NormalizedIOC[] {
  const iocs: NormalizedIOC[] = [];
  const obj = data as { urls?: Array<Record<string, unknown>> };
  const urls = obj?.urls;
  if (!Array.isArray(urls)) return iocs;

  const now = new Date().toISOString();
  for (const entry of urls.slice(0, 500)) {
    const url = entry.url as string;
    if (!url) continue;

    const threat = (entry.threat as string) || 'unknown';
    const tags = entry.tags as string[] | null;
    const dateAdded = (entry.date_added as string) || now;

    iocs.push({
      ioc_type: 'url',
      value: url,
      feed_name: 'abuse_ch_urlhaus',
      confidence: 80,
      severity: threat === 'malware_download' ? 'high' : 'medium',
      tags: tags?.filter(Boolean) || [threat],
      first_seen: dateAdded,
      last_seen: now,
      description: `URLhaus: ${threat} — status: ${entry.url_status || 'unknown'}`,
      metadata: {
        threat,
        url_status: entry.url_status,
        host: entry.host,
        reporter: entry.reporter,
        urlhaus_reference: entry.urlhaus_reference,
      },
    });
  }
  return iocs;
}

function parseFeodo(data: unknown): NormalizedIOC[] {
  const iocs: NormalizedIOC[] = [];
  const arr = data as Array<Record<string, unknown>>;
  if (!Array.isArray(arr)) return iocs;

  const now = new Date().toISOString();
  for (const entry of arr.slice(0, 500)) {
    const ip = entry.ip_address as string;
    if (!ip) continue;

    const port = entry.port as number | undefined;
    const malware = (entry.malware as string) || 'unknown';
    const firstSeen = (entry.first_seen as string) || now;
    const lastOnline = (entry.last_online as string) || now;

    iocs.push({
      ioc_type: 'ipv4',
      value: ip,
      feed_name: 'abuse_ch_feodo',
      confidence: 90,
      severity: 'high',
      tags: ['botnet', 'c2', malware.toLowerCase()],
      first_seen: firstSeen,
      last_seen: lastOnline,
      description: `Feodo C2: ${malware}${port ? ` on port ${port}` : ''}`,
      metadata: {
        port,
        malware,
        status: entry.status,
        as_number: entry.as_number,
        as_name: entry.as_name,
        country: entry.country,
      },
    });
  }
  return iocs;
}

function parseThreatfox(data: unknown): NormalizedIOC[] {
  const iocs: NormalizedIOC[] = [];
  const obj = data as { query_status?: string; data?: Array<Record<string, unknown>> };
  if (obj?.query_status !== 'ok' || !Array.isArray(obj.data)) return iocs;

  const now = new Date().toISOString();
  for (const entry of obj.data.slice(0, 500)) {
    const iocValue = entry.ioc as string;
    if (!iocValue) continue;

    const iocType = (entry.ioc_type as string) || '';
    let normalizedType = 'unknown';
    if (iocType.includes('ip')) normalizedType = 'ipv4';
    else if (iocType.includes('domain')) normalizedType = 'domain';
    else if (iocType.includes('url')) normalizedType = 'url';
    else if (iocType.includes('md5')) normalizedType = 'md5';
    else if (iocType.includes('sha256')) normalizedType = 'sha256';
    else if (iocType.includes('sha1')) normalizedType = 'sha1';

    const threatType = (entry.threat_type as string) || 'unknown';
    const malware = (entry.malware_printable as string) || '';
    const confidence = (entry.confidence_level as number) || 70;
    const tags = entry.tags as string[] | null;

    const severityMap: Record<number, string> = { 100: 'critical', 90: 'high', 75: 'high' };
    const severity = severityMap[confidence] || (confidence >= 70 ? 'medium' : 'low');

    iocs.push({
      ioc_type: normalizedType,
      value: iocValue.includes(':') && normalizedType === 'ipv4'
        ? iocValue.split(':')[0]  // strip port from ip:port
        : iocValue,
      feed_name: 'abuse_ch_threatfox',
      confidence,
      severity,
      tags: [...(tags?.filter(Boolean) || []), threatType, malware].filter(Boolean).slice(0, 5),
      first_seen: (entry.first_seen_utc as string) || now,
      last_seen: (entry.last_seen_utc as string) || now,
      description: `ThreatFox: ${threatType} — ${malware || 'unknown malware'}`,
      metadata: {
        threat_type: threatType,
        malware,
        malware_alias: entry.malware_alias,
        reporter: entry.reporter,
        reference: entry.reference,
        ioc_type_desc: entry.ioc_type_desc,
      },
    });
  }
  return iocs;
}

function parsePlaintextIPs(text: string, feedName: string): NormalizedIOC[] {
  const iocs: NormalizedIOC[] = [];
  const now = new Date().toISOString();
  const lines = text.split('\n');
  let count = 0;

  const tagMap: Record<string, string[]> = {
    blocklist_de_ssh: ['ssh', 'bruteforce'],
    blocklist_de_bruteforce: ['bruteforce', 'login'],
    cinsscore_badguys: ['malicious', 'scanner'],
    emerging_threats_compromised: ['compromised', 'botnet'],
  };

  const severityMap: Record<string, string> = {
    blocklist_de_ssh: 'medium',
    blocklist_de_bruteforce: 'medium',
    cinsscore_badguys: 'high',
    emerging_threats_compromised: 'high',
  };

  for (const line of lines) {
    if (count >= 500) break;
    const trimmed = line.trim();
    // Skip comments and empty lines
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith(';')) continue;
    // Basic IPv4 validation
    if (!/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(trimmed)) continue;

    iocs.push({
      ioc_type: 'ipv4',
      value: trimmed,
      feed_name: feedName,
      confidence: 70,
      severity: severityMap[feedName] || 'medium',
      tags: tagMap[feedName] || ['malicious'],
      first_seen: now,
      last_seen: now,
      description: `${feedName.replace(/_/g, ' ')} blocklist entry`,
      metadata: { source: feedName },
    });
    count++;
  }
  return iocs;
}

// ── Core Collector ──

// Map feed names to proxy feed IDs
const FEED_PROXY_MAP: Record<string, string> = {
  'abuse_ch_urlhaus': 'urlhaus-recent',
  'abuse_ch_feodo': 'feodo-ipblocklist',
  'abuse_ch_threatfox': 'threatfox',
  'blocklist_de_ssh': 'blocklist-ssh',
  'blocklist_de_bruteforce': 'blocklist-brute',
  'cinsscore_badguys': 'ci-badguys',
  'emerging_threats_compromised': 'et-compromised',
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const isWeb = typeof window !== 'undefined' && !(window as any).electronAPI;

async function fetchFeed(feed: FeedConfig): Promise<NormalizedIOC[]> {
  let response: Response;

  // On web, use server-side proxy to avoid CORS
  if (isWeb && FEED_PROXY_MAP[feed.name]) {
    const proxyId = FEED_PROXY_MAP[feed.name];
    const proxyOpts: RequestInit = {
      method: feed.method === 'POST' ? 'POST' : 'GET',
    };
    if (feed.method === 'POST' && feed.body) {
      proxyOpts.headers = { 'Content-Type': 'application/json' };
      proxyOpts.body = JSON.stringify(feed.body);
    }
    try {
      response = await fetch(`/api/proxy/feed/${proxyId}`, proxyOpts);
    } catch {
      console.debug(`[threat-intel] Proxy feed unavailable: ${feed.name}`);
      return [];
    }
  } else {
    // Direct fetch (Electron — no CORS issues)
    const opts: RequestInit = {
      method: feed.method || 'GET',
      headers: { 'Accept': 'application/json, text/plain, */*' },
    };

    if (feed.method === 'POST' && feed.body) {
      opts.headers = { ...opts.headers as Record<string, string>, 'Content-Type': 'application/json' };
      opts.body = JSON.stringify(feed.body);
    }

    try {
      response = await fetch(feed.url, opts);
    } catch {
      console.debug(`[threat-intel] Feed unavailable: ${feed.name} (${feed.url})`);
      return [];
    }
  }

  if (!response.ok) {
    console.debug(`[threat-intel] Feed ${feed.name} returned HTTP ${response.status} — skipping`);
    return [];
  }

  try {
    if (feed.parser === 'plaintext_ip') {
      const text = await response.text();
      return parsePlaintextIPs(text, feed.name);
    }

    const data = await response.json();

    switch (feed.parser) {
      case 'urlhaus':
        return parseUrlhaus(data);
      case 'feodo':
        return parseFeodo(data);
      case 'threatfox':
        return parseThreatfox(data);
      default:
        console.warn(`Unknown parser: ${feed.parser}`);
        return [];
    }
  } catch {
    console.debug(`[threat-intel] Failed to parse response from ${feed.name} — skipping`);
    return [];
  }
}

async function upsertIOCs(iocs: NormalizedIOC[]): Promise<number> {
  if (iocs.length === 0) return 0;

  // Batch in chunks of 200 to avoid payload limits
  const BATCH_SIZE = 200;
  let totalUpserted = 0;

  for (let i = 0; i < iocs.length; i += BATCH_SIZE) {
    const batch = iocs.slice(i, i + BATCH_SIZE);

    const { error } = await supabase
      .from('threat_iocs')
      .upsert(batch, { onConflict: 'value,feed_name' });

    if (error) {
      // If upsert fails (e.g., no unique constraint), fall back to insert + ignore dupes
      console.warn('Upsert failed, falling back to insert:', error.message);
      const { error: insertError } = await supabase
        .from('threat_iocs')
        .insert(batch);

      if (insertError) {
        // Likely duplicate key errors — count what we can
        console.warn('Batch insert error (possible duplicates):', insertError.message);
        continue;
      }
    }

    totalUpserted += batch.length;
  }

  return totalUpserted;
}

async function registerFeed(feed: FeedConfig, count: number, error?: string): Promise<void> {
  const now = new Date().toISOString();
  const feedRecord = {
    name: feed.name,
    url: feed.url,
    feed_type: feed.type,
    format: feed.format,
    auth_type: 'none',
    enabled: true,
    refresh_interval_min: 60,
    last_fetched: error ? undefined : now,
    last_count: count,
    last_error: error || null,
  };

  const { error: upsertError } = await supabase
    .from('threat_feeds')
    .upsert([feedRecord], { onConflict: 'name' });

  if (upsertError) {
    // Fallback: try update by name
    const { error: updateError } = await supabase
      .from('threat_feeds')
      .update({
        last_fetched: error ? undefined : now,
        last_count: count,
        last_error: error || null,
      })
      .eq('name', feed.name);

    if (updateError) {
      // Last resort: insert and ignore conflict
      await supabase.from('threat_feeds').insert([feedRecord]).select();
    }
  }
}

// ── Public API ──

export const threatIntelCollector = {
  /**
   * Sync a single feed by name
   */
  async syncFeed(feedName: string): Promise<SyncResult> {
    const feed = PUBLIC_FEEDS.find(f => f.name === feedName);
    if (!feed) {
      return { feed: feedName, success: false, added: 0, error: 'Feed not found', duration_ms: 0 };
    }

    const start = Date.now();
    try {
      const iocs = await fetchFeed(feed);
      const added = await upsertIOCs(iocs);
      await registerFeed(feed, iocs.length);

      return {
        feed: feedName,
        success: true,
        added,
        duration_ms: Date.now() - start,
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      await registerFeed(feed, 0, errorMsg).catch(() => {});

      return {
        feed: feedName,
        success: false,
        added: 0,
        error: errorMsg,
        duration_ms: Date.now() - start,
      };
    }
  },

  /**
   * Sync all enabled feeds, calling onProgress for UI updates
   */
  async syncAllFeeds(
    onProgress?: (progress: SyncProgress) => void
  ): Promise<SyncResult[]> {
    const results: SyncResult[] = [];
    const total = PUBLIC_FEEDS.length;

    for (let i = 0; i < PUBLIC_FEEDS.length; i++) {
      const feed = PUBLIC_FEEDS[i];

      onProgress?.({
        current: i + 1,
        total,
        currentFeed: feed.name,
        results: [...results],
      });

      const result = await this.syncFeed(feed.name);
      results.push(result);
    }

    onProgress?.({
      current: total,
      total,
      currentFeed: 'done',
      results,
    });

    return results;
  },

  /**
   * Get the most recent sync timestamp across all feeds
   */
  async getLastSyncTime(): Promise<string | null> {
    const { data, error } = await supabase
      .from('threat_feeds')
      .select('last_fetched')
      .not('last_fetched', 'is', null)
      .order('last_fetched', { ascending: false })
      .limit(1);

    if (error || !data?.length) return null;
    return data[0].last_fetched;
  },

  /**
   * Check if feeds are stale (last sync > threshold minutes ago)
   */
  async isStale(thresholdMinutes = 60): Promise<boolean> {
    const lastSync = await this.getLastSyncTime();
    if (!lastSync) return true;

    const elapsed = Date.now() - new Date(lastSync).getTime();
    return elapsed > thresholdMinutes * 60 * 1000;
  },

  /**
   * Auto-sync: only syncs if stale. Returns results if synced, null if fresh.
   */
  async autoSync(
    onProgress?: (progress: SyncProgress) => void
  ): Promise<SyncResult[] | null> {
    const stale = await this.isStale(60);
    if (!stale) return null;
    return this.syncAllFeeds(onProgress);
  },

  /**
   * Get list of configured feed names
   */
  getFeedNames(): string[] {
    return PUBLIC_FEEDS.map(f => f.name);
  },

  /**
   * Get feed configs (read-only)
   */
  getFeeds(): FeedConfig[] {
    return [...PUBLIC_FEEDS];
  },
};

export default threatIntelCollector;
