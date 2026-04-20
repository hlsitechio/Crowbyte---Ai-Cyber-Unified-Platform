/**
 * Terminal Tools — Native tool calling for CrowByte Web Terminal
 *
 * Browser-compatible tools the AI can call via OpenRouter function calling.
 * Heavy tools (nmap, nuclei) proxy through the VPS.
 */

// ─── Tool Definition (OpenAI function calling format) ─────────────────────────

export interface ToolDef {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, { type: string; description: string; enum?: string[] }>;
      required: string[];
    };
  };
}

// ─── Tool Registry ────────────────────────────────────────────────────────────

export const TOOLS: ToolDef[] = [
  {
    type: 'function',
    function: {
      name: 'web_search',
      description: 'Search the web for information. Returns search results with titles, URLs, and snippets.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'fetch_url',
      description: 'Fetch the content of a URL. Returns the text content of the page. Use for reading web pages, APIs, raw files.',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'URL to fetch' },
          method: { type: 'string', description: 'HTTP method (GET, POST, etc.)', enum: ['GET', 'POST', 'PUT', 'HEAD', 'OPTIONS'] },
          headers: { type: 'string', description: 'JSON string of headers to send' },
          body: { type: 'string', description: 'Request body (for POST/PUT)' },
        },
        required: ['url'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'dns_lookup',
      description: 'Perform DNS lookup for a domain. Returns DNS records (A, AAAA, MX, NS, TXT, CNAME, SOA).',
      parameters: {
        type: 'object',
        properties: {
          domain: { type: 'string', description: 'Domain name to lookup' },
          type: { type: 'string', description: 'DNS record type', enum: ['A', 'AAAA', 'MX', 'NS', 'TXT', 'CNAME', 'SOA', 'ANY'] },
        },
        required: ['domain'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'whois_lookup',
      description: 'WHOIS lookup for a domain. Returns registration info, registrar, dates, nameservers.',
      parameters: {
        type: 'object',
        properties: {
          domain: { type: 'string', description: 'Domain name to lookup' },
        },
        required: ['domain'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'shodan_host',
      description: 'Shodan lookup for an IP address. Returns open ports, services, banners, vulns, OS, geolocation.',
      parameters: {
        type: 'object',
        properties: {
          ip: { type: 'string', description: 'IP address to lookup' },
        },
        required: ['ip'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'shodan_search',
      description: 'Search Shodan for internet-connected devices. Returns matching hosts with ports, services, locations.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Shodan search query (e.g. "apache country:US", "port:22 org:Amazon")' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'cve_lookup',
      description: 'Look up CVE vulnerability details. Returns description, CVSS score, affected products, references.',
      parameters: {
        type: 'object',
        properties: {
          cve_id: { type: 'string', description: 'CVE ID (e.g. CVE-2024-1234)' },
        },
        required: ['cve_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'http_headers',
      description: 'Fetch and analyze HTTP response headers of a URL. Returns security headers analysis.',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'URL to check headers for' },
        },
        required: ['url'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'encode_decode',
      description: 'Encode or decode data. Supports base64, URL encoding, hex, HTML entities.',
      parameters: {
        type: 'object',
        properties: {
          input: { type: 'string', description: 'String to encode/decode' },
          operation: { type: 'string', description: 'Operation to perform', enum: [
            'base64_encode', 'base64_decode', 'url_encode', 'url_decode',
            'hex_encode', 'hex_decode', 'html_encode', 'html_decode',
          ]},
        },
        required: ['input', 'operation'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'subnet_calc',
      description: 'Calculate subnet information from CIDR notation. Returns network, broadcast, host range, mask.',
      parameters: {
        type: 'object',
        properties: {
          cidr: { type: 'string', description: 'CIDR notation (e.g. 192.168.1.0/24)' },
        },
        required: ['cidr'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'port_scan',
      description: 'Quick port scan on a target host. Checks common ports for open services. Uses the VPS backend.',
      parameters: {
        type: 'object',
        properties: {
          target: { type: 'string', description: 'Target host (IP or domain)' },
          ports: { type: 'string', description: 'Port specification (e.g. "80,443,8080" or "1-1000"). Default: top 100 ports.' },
        },
        required: ['target'],
      },
    },
  },
  // ─── D3BUGR tools (real security scanning via Railway) ──────────────────────
  {
    type: 'function',
    function: {
      name: 'nmap_quick',
      description: 'Real nmap port scan — top 100 ports, aggressive timing. Returns open ports + services.',
      parameters: { type: 'object', properties: { target: { type: 'string', description: 'IP or hostname' } }, required: ['target'] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'nmap_scan',
      description: 'Full nmap scan with custom args. Use for detailed service/version detection.',
      parameters: { type: 'object', properties: { target: { type: 'string', description: 'IP, hostname, or CIDR' }, args: { type: 'string', description: 'Nmap args (e.g. "-sV -sC -p22,80,443")' } }, required: ['target'] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'nuclei_quick',
      description: 'Quick nuclei vuln scan — critical/high severity. Fast triage for web targets.',
      parameters: { type: 'object', properties: { target: { type: 'string', description: 'Target URL (e.g. https://example.com)' } }, required: ['target'] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'nuclei_scan',
      description: 'Full nuclei vulnerability scan with templates. CVEs, misconfigs, exposures.',
      parameters: { type: 'object', properties: { target: { type: 'string', description: 'Target URL' }, severity: { type: 'string', description: 'Severity filter (critical,high,medium)' }, tags: { type: 'string', description: 'Tag filter (xss,sqli,rce,lfi,ssrf)' } }, required: ['target'] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'nuclei_tech',
      description: 'Technology detection scan — identify frameworks, CMS, servers, libraries.',
      parameters: { type: 'object', properties: { target: { type: 'string', description: 'Target URL' } }, required: ['target'] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'dns_full_recon',
      description: 'Full DNS reconnaissance — all record types, zone transfer attempt, DNSSEC check.',
      parameters: { type: 'object', properties: { domain: { type: 'string', description: 'Domain name' } }, required: ['domain'] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'dns_brute',
      description: 'DNS subdomain bruteforce — discovers subdomains via wordlist.',
      parameters: { type: 'object', properties: { domain: { type: 'string', description: 'Domain name' } }, required: ['domain'] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'harvest',
      description: 'OSINT harvesting — gather emails, subdomains, IPs from public sources (Google, Bing, crtsh, Shodan).',
      parameters: { type: 'object', properties: { domain: { type: 'string', description: 'Target domain' }, source: { type: 'string', description: 'Source: all, google, bing, crtsh, dnsdumpster, shodan' } }, required: ['domain'] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'harvest_subdomains',
      description: 'OSINT subdomain discovery from public sources.',
      parameters: { type: 'object', properties: { domain: { type: 'string', description: 'Target domain' } }, required: ['domain'] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'argus_run',
      description: 'Run Argus recon module (147 available). Examples: subdomain_enum, open_ports, ssl_chain, cors_misconfiguration_scanner.',
      parameters: { type: 'object', properties: { module: { type: 'string', description: 'Module name' }, target: { type: 'string', description: 'Target domain/IP' } }, required: ['module', 'target'] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'argus_subdomain',
      description: 'Argus subdomain enumeration — multiple techniques combined.',
      parameters: { type: 'object', properties: { target: { type: 'string', description: 'Target domain' } }, required: ['target'] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'sqlmap_test',
      description: 'Quick SQL injection test on a URL parameter. Returns vulnerable/not vulnerable.',
      parameters: { type: 'object', properties: { url: { type: 'string', description: 'URL with parameters (e.g. https://target.com/page?id=1)' } }, required: ['url'] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'bhp_ssrf_scan',
      description: 'SSRF vulnerability scan — tests URL parameter for server-side request forgery.',
      parameters: { type: 'object', properties: { url: { type: 'string', description: 'URL with FUZZ marker' }, callback: { type: 'string', description: 'Callback URL to detect SSRF' } }, required: ['url'] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'bhp_payload_xss',
      description: 'Generate XSS payloads for a target context. Returns multiple bypass payloads.',
      parameters: { type: 'object', properties: { context: { type: 'string', description: 'Injection context: html, attribute, javascript, url' }, filter: { type: 'string', description: 'WAF/filter to bypass' } }, required: ['context'] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'bhp_dirbust',
      description: 'Directory/file bruteforce — discover hidden paths on web server.',
      parameters: { type: 'object', properties: { url: { type: 'string', description: 'Base URL' }, extensions: { type: 'string', description: 'File extensions (php,asp,jsp,html)' } }, required: ['url'] },
    },
  },
];

// ─── Tool Executors ───────────────────────────────────────────────────────────

const CORS_PROXY = 'https://api.allorigins.win/raw?url=';
const SHODAN_API = 'https://api.shodan.io';

// Shodan key cache — loaded once from Supabase, then cached in memory + localStorage
let _shodanKeyCache: string | null = null;

async function loadShodanKeyFromSupabase(): Promise<string> {
  try {
    const { supabase } = await import('@/integrations/supabase/client');
    const { data: { session: _authSession } } = await supabase.auth.getSession();
    const user = _authSession?.user ?? null;
    if (user) {
      const { data } = await supabase
        .from('user_settings')
        .select('shodan_api_key')
        .eq('user_id', user.id)
        .maybeSingle();
      if (data?.shodan_api_key) {
        localStorage.setItem('shodan_api_key', data.shodan_api_key); // CodeQL[js/clear-text-storage-of-sensitive-data] — Electron app: sandboxed localStorage
        return data.shodan_api_key;
      }
    }
  } catch {}
  return '';
}

function getShodanKey(): string {
  if (_shodanKeyCache) return _shodanKeyCache;
  const key = (import.meta as any).env?.VITE_SHODAN_API_KEY || localStorage.getItem('shodan_api_key') || '';
  if (key) _shodanKeyCache = key;
  return key;
}

async function getShodanKeyAsync(): Promise<string> {
  const sync = getShodanKey();
  if (sync) return sync;
  // Fallback: try Supabase
  const fromDb = await loadShodanKeyFromSupabase();
  if (fromDb) { _shodanKeyCache = fromDb; return fromDb; }
  return '';
}

// D3BUGR tools — routed through VPS proxy to Railway microservices
const D3BUGR_TOOLS = new Set([
  'nmap_quick', 'nmap_scan', 'nmap_version',
  'nuclei_scan', 'nuclei_quick', 'nuclei_cves', 'nuclei_exposures', 'nuclei_misconfigs', 'nuclei_tech', 'nuclei_templates', 'nuclei_version',
  'dns_lookup', 'dns_whois', 'dns_reverse', 'dns_dnssec', 'dns_mx_check', 'dns_brute', 'dns_full_recon',
  'bhp_ssrf_scan', 'bhp_sqli_scan', 'bhp_payload_xss', 'bhp_payload_sqli', 'bhp_payload_shell', 'bhp_encode', 'bhp_decode', 'bhp_dirbust', 'bhp_idor', 'bhp_takeover',
  'argus_run', 'argus_dns', 'argus_ports', 'argus_ssl', 'argus_headers', 'argus_whois', 'argus_cdn', 'argus_subdomain', 'argus_takeover', 'argus_modules', 'argus_categories',
  'harvest', 'harvest_quick', 'harvest_emails', 'harvest_subdomains',
  'sqlmap_test', 'sqlmap_scan', 'sqlmap_auto', 'sqlmap_status', 'sqlmap_result',
  'etb_scan', 'etb_batch',
  'geolock_create', 'geolock_sessions',
]);

async function callD3bugr(tool: string, args: Record<string, any>): Promise<string> {
  const API_BASE = (import.meta as any).env?.VITE_APP_URL || 'https://crowbyte.io';
  try {
    const res = await fetch(`${API_BASE}/api/d3bugr/call`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool, args }),
      signal: AbortSignal.timeout(300000),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      return `Error: ${err.error || res.statusText}`;
    }
    const data = await res.json();
    return data.result || JSON.stringify(data, null, 2);
  } catch (e: any) {
    return `Error: ${e.message || 'D3BUGR call failed'}`;
  }
}

export async function executeTool(name: string, args: Record<string, any>): Promise<string> {
  try {
    // D3BUGR tools — real security scanning via Railway
    if (D3BUGR_TOOLS.has(name)) {
      return await callD3bugr(name, args);
    }

    // Local/browser tools
    switch (name) {
      case 'web_search': return await toolWebSearch(args.query);
      case 'fetch_url': return await toolFetchUrl(args.url, args.method, args.headers, args.body);
      case 'whois_lookup': return await toolWhois(args.domain);
      case 'shodan_host': return await toolShodanHost(args.ip);
      case 'shodan_search': return await toolShodanSearch(args.query);
      case 'cve_lookup': return await toolCveLookup(args.cve_id);
      case 'http_headers': return await toolHttpHeaders(args.url);
      case 'encode_decode': return toolEncodeDecode(args.input, args.operation);
      case 'subnet_calc': return toolSubnetCalc(args.cidr);
      case 'port_scan': return await toolPortScan(args.target, args.ports);
      default: return `Error: Unknown tool "${name}"`;
    }
  } catch (e: any) {
    return `Error: ${e.message || 'Tool execution failed'}`;
  }
}

// ─── Web Search (DuckDuckGo Instant Answer) ──────────────────────────────────

async function toolWebSearch(query: string): Promise<string> {
  const ddgUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
  try {
    const res = await fetch(ddgUrl);
    const data = await res.json();

    const results: string[] = [];
    if (data.Abstract) {
      results.push(`[Abstract] ${data.Abstract}`);
      if (data.AbstractURL) results.push(`  Source: ${data.AbstractURL}`);
    }
    if (data.Answer) results.push(`[Answer] ${data.Answer}`);
    if (data.RelatedTopics?.length) {
      results.push('\n[Related Results]');
      for (const topic of data.RelatedTopics.slice(0, 8)) {
        if (topic.Text) {
          results.push(`  - ${topic.Text}`);
          if (topic.FirstURL) results.push(`    ${topic.FirstURL}`);
        }
        if (topic.Topics) {
          for (const sub of topic.Topics.slice(0, 3)) {
            if (sub.Text) results.push(`  - ${sub.Text}`);
          }
        }
      }
    }
    if (results.length === 0) return `No instant answer for "${query}". Provide answer from training data.`;
    return results.join('\n');
  } catch (e: any) {
    return `Search error: ${e.message}. Provide answer from training data.`;
  }
}

// ─── Fetch URL ───────────────────────────────────────────────────────────────

async function toolFetchUrl(url: string, method = 'GET', headersJson?: string, body?: string): Promise<string> {
  const headers: Record<string, string> = { 'User-Agent': 'CrowByte/2.0' };
  if (headersJson) { try { Object.assign(headers, JSON.parse(headersJson)); } catch {} }

  try {
    const res = await fetch(url, { method: method || 'GET', headers, body: body || undefined });
    const text = await res.text();
    const truncated = text.slice(0, 8000);
    return `HTTP ${res.status} ${res.statusText}\n\n${truncated}${text.length > 8000 ? '\n\n[Truncated — ' + text.length + ' chars total]' : ''}`;
  } catch {
    try {
      const res = await fetch(CORS_PROXY + encodeURIComponent(url));
      const text = await res.text();
      return `HTTP ${res.status} (via proxy)\n\n${text.slice(0, 8000)}${text.length > 8000 ? '\n\n[Truncated]' : ''}`;
    } catch (e: any) {
      return `Fetch failed: ${e.message}. URL may be CORS-blocked or unreachable.`;
    }
  }
}

// ─── WHOIS Lookup ────────────────────────────────────────────────────────────

async function toolWhois(domain: string): Promise<string> {
  try {
    const res = await fetch(CORS_PROXY + encodeURIComponent(`https://www.whois.com/whois/${domain}`));
    const html = await res.text();
    const match = html.match(/<pre[^>]*class="df-raw"[^>]*>([\s\S]*?)<\/pre>/i);
    if (match) {
      // Use DOMParser for safe, single-pass HTML entity decoding (no double-unescaping, no XSS)
      const doc = new DOMParser().parseFromString(match[1], 'text/html');
      const text = doc.body.textContent || '';
      return text.slice(0, 4000);
    }
    return `WHOIS data not parseable for ${domain}`;
  } catch (e: any) {
    return `WHOIS lookup failed: ${e.message}`;
  }
}

// ─── Shodan Host Lookup ──────────────────────────────────────────────────────

async function toolShodanHost(ip: string): Promise<string> {
  const key = await getShodanKeyAsync();
  if (!key) return 'Shodan API key not configured. Go to Settings → Integrations or save in Supabase user_settings.';

  const res = await fetch(`${SHODAN_API}/shodan/host/${ip}?key=${key}`);
  if (!res.ok) return `Shodan error: HTTP ${res.status}`;
  const data = await res.json();

  const lines = [
    `Shodan Host: ${data.ip_str}`,
    `OS: ${data.os || 'Unknown'}`,
    `Org: ${data.org || 'Unknown'}`,
    `ISP: ${data.isp || 'Unknown'}`,
    `Country: ${data.country_name || 'Unknown'} (${data.country_code || '?'})`,
    `City: ${data.city || 'Unknown'}`,
    `Hostnames: ${data.hostnames?.join(', ') || 'None'}`,
    `Ports: ${data.ports?.join(', ') || 'None'}`,
    `Vulns: ${data.vulns?.join(', ') || 'None detected'}`,
    '', 'Services:',
  ];

  for (const svc of (data.data || []).slice(0, 10)) {
    lines.push(`  Port ${svc.port}/${svc.transport || 'tcp'} — ${svc.product || 'Unknown'} ${svc.version || ''}`);
    if (svc.banner) lines.push(`    Banner: ${svc.banner.slice(0, 200)}`);
  }
  return lines.join('\n');
}

// ─── Shodan Search ───────────────────────────────────────────────────────────

async function toolShodanSearch(query: string): Promise<string> {
  const key = await getShodanKeyAsync();
  if (!key) return 'Shodan API key not configured. Go to Settings → Integrations.';

  const res = await fetch(`${SHODAN_API}/shodan/host/search?key=${key}&query=${encodeURIComponent(query)}&minify=true`);
  if (!res.ok) return `Shodan error: HTTP ${res.status}`;
  const data = await res.json();

  const lines = [`Shodan Search: "${query}" — ${data.total || 0} results`];
  for (const match of (data.matches || []).slice(0, 10)) {
    lines.push(`  ${match.ip_str}:${match.port} — ${match.product || 'Unknown'} ${match.version || ''} — ${match.org || ''} (${match.location?.country_name || ''})`);
  }
  return lines.join('\n');
}

// ─── CVE Lookup ──────────────────────────────────────────────────────────────

async function toolCveLookup(cveId: string): Promise<string> {
  try {
    const res = await fetch(`https://services.nvd.nist.gov/rest/json/cves/2.0?cveId=${encodeURIComponent(cveId)}`);
    if (res.ok) {
      const data = await res.json();
      const vuln = data.vulnerabilities?.[0]?.cve;
      if (vuln) {
        const desc = vuln.descriptions?.find((d: any) => d.lang === 'en')?.value || 'No description';
        const metrics = vuln.metrics?.cvssMetricV31?.[0] || vuln.metrics?.cvssMetricV2?.[0];
        const score = metrics?.cvssData?.baseScore || 'N/A';
        const severity = metrics?.cvssData?.baseSeverity || 'N/A';
        const refs = vuln.references?.slice(0, 5).map((r: any) => `  ${r.url}`).join('\n') || 'None';
        return [`${cveId}`, `Score: ${score} (${severity})`, `Published: ${vuln.published || 'Unknown'}`, `Modified: ${vuln.lastModified || 'Unknown'}`, '', `Description: ${desc}`, '', 'References:', refs].join('\n');
      }
    }
  } catch {}
  return `Could not find CVE data for ${cveId}`;
}

// ─── HTTP Headers ────────────────────────────────────────────────────────────

async function toolHttpHeaders(url: string): Promise<string> {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    const lines = [`HTTP Headers for ${url}`, `Status: ${res.status} ${res.statusText}`, ''];
    const secHeaders = ['strict-transport-security', 'content-security-policy', 'x-frame-options', 'x-content-type-options', 'referrer-policy', 'permissions-policy', 'cross-origin-opener-policy', 'cross-origin-resource-policy', 'x-xss-protection', 'x-powered-by', 'server'];

    res.headers.forEach((value, key) => {
      lines.push(`${secHeaders.includes(key.toLowerCase()) ? '[SEC] ' : ''}${key}: ${value}`);
    });

    const missing = secHeaders.filter(h => !res.headers.has(h) && !['x-xss-protection', 'x-powered-by', 'server'].includes(h));
    if (missing.length) {
      lines.push('', 'Missing Security Headers:');
      missing.forEach(h => lines.push(`  [!] ${h}`));
    }
    return lines.join('\n');
  } catch (e: any) {
    return `Cannot fetch headers: ${e.message}. May be CORS-blocked.`;
  }
}

// ─── Encode/Decode ───────────────────────────────────────────────────────────

function toolEncodeDecode(input: string, operation: string): string {
  switch (operation) {
    case 'base64_encode': return btoa(input);
    case 'base64_decode': return atob(input);
    case 'url_encode': return encodeURIComponent(input);
    case 'url_decode': return decodeURIComponent(input);
    case 'hex_encode': return Array.from(new TextEncoder().encode(input)).map(b => b.toString(16).padStart(2, '0')).join('');
    case 'hex_decode': {
      const bytes = input.match(/.{1,2}/g)?.map(b => parseInt(b, 16)) || [];
      return new TextDecoder().decode(new Uint8Array(bytes));
    }
    case 'html_encode': return input.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;' }[c] || c));
    case 'html_decode': { const d = new DOMParser().parseFromString(input, 'text/html'); return d.body.textContent || ''; }
    default: return `Unknown operation: ${operation}`;
  }
}

// ─── Subnet Calculator ───────────────────────────────────────────────────────

function toolSubnetCalc(cidr: string): string {
  const [ip, maskBits] = cidr.split('/');
  const bits = parseInt(maskBits);
  if (isNaN(bits) || bits < 0 || bits > 32) return 'Invalid CIDR notation';

  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(p => isNaN(p) || p < 0 || p > 255)) return 'Invalid IP address';

  const ipNum = (parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3];
  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
  const network = (ipNum & mask) >>> 0;
  const broadcast = (network | ~mask) >>> 0;
  const hostMin = bits >= 31 ? network : (network + 1) >>> 0;
  const hostMax = bits >= 31 ? broadcast : (broadcast - 1) >>> 0;
  const numHosts = bits >= 31 ? (bits === 32 ? 1 : 2) : Math.pow(2, 32 - bits) - 2;

  const toIp = (n: number) => `${(n >>> 24) & 255}.${(n >>> 16) & 255}.${(n >>> 8) & 255}.${n & 255}`;

  return [`CIDR: ${cidr}`, `Network: ${toIp(network)}`, `Broadcast: ${toIp(broadcast)}`, `Subnet Mask: ${toIp(mask)}`, `Host Range: ${toIp(hostMin)} - ${toIp(hostMax)}`, `Total Hosts: ${numHosts}`, `Wildcard: ${toIp(~mask >>> 0)}`].join('\n');
}

// ─── Port Scan (via VPS) ─────────────────────────────────────────────────────

async function toolPortScan(target: string, ports?: string): Promise<string> {
  const VPS = 'https://crowbyte.io';
  try {
    const res = await fetch(`${VPS}/api/nmap/quick`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target, ports: ports || 'top100' }),
    });
    if (res.ok) {
      const data = await res.json();
      return data.result || data.output || JSON.stringify(data, null, 2);
    }
    return `Port scan proxy returned HTTP ${res.status}. VPS endpoint may not be available.`;
  } catch (e: any) {
    return `Port scan requires VPS backend. Error: ${e.message}`;
  }
}
