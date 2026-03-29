/**
 * Proxy Service — Routes external API calls through the server when running on web.
 * In Electron, direct fetch works (no CORS). On web, browser blocks cross-origin requests.
 * This service transparently proxies through /api/proxy/* on the CrowByte server.
 */

const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI;

/** Base URL for the proxy API (same origin) */
const PROXY_BASE = '/api/proxy';

/**
 * Fetch IP info. Returns ipinfo.io-style JSON.
 */
export async function fetchIP(): Promise<any> {
  if (isElectron) {
    // Direct fetch in Electron (no CORS)
    const res = await fetch('https://ipinfo.io/json', { signal: AbortSignal.timeout(5000) });
    return res.json();
  }
  const res = await fetch(`${PROXY_BASE}/ip`, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`IP proxy failed: ${res.status}`);
  return res.json();
}

/**
 * Fetch from OpenClaw/NVIDIA API via proxy.
 */
export async function fetchOpenClaw(path: string, options: RequestInit = {}): Promise<Response> {
  if (isElectron) {
    const base = 'https://srv1459982.hstgr.cloud';
    return fetch(`${base}/${path}`, options);
  }
  return fetch(`${PROXY_BASE}/openclaw/${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
}

/**
 * Fetch a threat intel feed by ID.
 * Available feeds: urlhaus-recent, threatfox, feodo-ipblocklist,
 *   blocklist-ssh, blocklist-brute, ci-badguys, et-compromised
 */
export async function fetchFeed(feedId: string, body?: any): Promise<Response> {
  if (isElectron) {
    // Direct fetch — map feedId back to URL
    const feedUrls: Record<string, { url: string; method?: string }> = {
      'urlhaus-recent':    { url: 'https://urlhaus-api.abuse.ch/v1/urls/recent/', method: 'POST' },
      'threatfox':         { url: 'https://threatfox-api.abuse.ch/api/v1/', method: 'POST' },
      'feodo-ipblocklist': { url: 'https://feodotracker.abuse.ch/downloads/ipblocklist.json' },
      'blocklist-ssh':     { url: 'https://lists.blocklist.de/lists/ssh.txt' },
      'blocklist-brute':   { url: 'https://lists.blocklist.de/lists/bruteforcelogin.txt' },
      'ci-badguys':        { url: 'https://cinsscore.com/list/ci-badguys.txt' },
      'et-compromised':    { url: 'https://rules.emergingthreats.net/blockrules/compromised-ips.txt' },
    };
    const feed = feedUrls[feedId];
    if (!feed) throw new Error(`Unknown feed: ${feedId}`);
    const opts: RequestInit = { method: feed.method || 'GET' };
    if (feed.method === 'POST' && body) {
      opts.headers = { 'Content-Type': 'application/json' };
      opts.body = JSON.stringify(body);
    }
    return fetch(feed.url, opts);
  }

  const method = body ? 'POST' : 'GET';
  const opts: RequestInit = { method };
  if (body) {
    opts.headers = { 'Content-Type': 'application/json' };
    opts.body = JSON.stringify(body);
  }
  return fetch(`${PROXY_BASE}/feed/${feedId}`, opts);
}

/**
 * Generic proxied fetch for allowlisted domains.
 * Falls back to direct fetch in Electron.
 */
export async function proxyFetch(url: string, options: RequestInit = {}): Promise<Response> {
  if (isElectron) {
    return fetch(url, options);
  }
  return fetch(`${PROXY_BASE}/fetch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url,
      method: options.method || 'GET',
      headers: options.headers,
      body: options.body,
    }),
  });
}
