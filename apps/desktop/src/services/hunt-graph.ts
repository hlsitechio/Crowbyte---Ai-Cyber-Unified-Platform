/**
 * Hunt Graph Service
 *
 * Zero-save passive capture → auto-structure → visual graph → AI triage
 *
 * Architecture:
 * 1. Three capture streams: proxy, terminal, browser — all passive
 * 2. Stream processor: dedup, classify, extract entities, link to graph, score
 * 3. Hunt graph stored in Supabase (hunts, hunt_entities, hunt_edges, hunt_events)
 * 4. Visual layer: live graph + timeline + triage queue + evidence wall
 * 5. AI triage: catches what the hunter missed
 */

import { supabase } from '@/integrations/supabase/client';

// ─── Entity Types ───────────────────────────────────────────────────────────

export type EntityType =
  | 'program'
  | 'domain'
  | 'subdomain'
  | 'ip'
  | 'port'
  | 'endpoint'
  | 'parameter'
  | 'header'
  | 'cookie'
  | 'technology'
  | 'credential'
  | 'finding'
  | 'evidence'
  | 'response_code'
  | 'content_type'
  | 'secret'
  | 'email'
  | 'api_key';

export type EdgeType =
  | 'resolves_to'    // domain → ip
  | 'has_subdomain'  // domain → subdomain
  | 'runs_on'        // service → port
  | 'serves'         // ip:port → endpoint
  | 'has_param'      // endpoint → parameter
  | 'sets_header'    // endpoint → header
  | 'sets_cookie'    // endpoint → cookie
  | 'uses_tech'      // endpoint → technology
  | 'leaks'          // endpoint → secret/credential
  | 'redirects_to'   // endpoint → endpoint
  | 'linked_from'    // endpoint → endpoint
  | 'vulnerable_to'  // endpoint/param → finding
  | 'evidence_of'    // evidence → finding
  | 'same_as'        // dedup link
  | 'belongs_to';    // entity → program

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info' | 'none';

export type StreamSource = 'proxy' | 'terminal' | 'browser' | 'manual' | 'ai';

export type TriageStatus = 'new' | 'interesting' | 'investigating' | 'confirmed' | 'false_positive' | 'reported' | 'dismissed';

// ─── Core Interfaces ────────────────────────────────────────────────────────

export interface Hunt {
  id: string;
  user_id: string;
  name: string;
  program?: string;
  scope: string[];          // in-scope domains/IPs
  exclude_scope: string[];  // out-of-scope patterns
  status: 'active' | 'paused' | 'completed' | 'archived';
  stats: HuntStats;
  created_at: string;
  updated_at: string;
}

export interface HuntStats {
  entities: number;
  edges: number;
  events: number;
  findings: number;
  triage_pending: number;
  last_activity: string;
}

export interface HuntEntity {
  id: string;
  hunt_id: string;
  type: EntityType;
  value: string;           // canonical value (lowercase domain, normalized URL, etc.)
  raw_value?: string;      // original as-seen value
  metadata: Record<string, any>;
  severity: Severity;
  triage_status: TriageStatus;
  triage_notes?: string;
  tags: string[];
  first_seen: string;
  last_seen: string;
  hit_count: number;
  source: StreamSource;
  created_at: string;
}

export interface HuntEdge {
  id: string;
  hunt_id: string;
  source_id: string;       // entity ID
  target_id: string;       // entity ID
  type: EdgeType;
  metadata: Record<string, any>;
  weight: number;           // frequency/confidence
  created_at: string;
}

export interface HuntEvent {
  id: string;
  hunt_id: string;
  entity_id?: string;
  source: StreamSource;
  event_type: string;       // 'request', 'response', 'tool_output', 'page_load', 'manual_note'
  raw_data: string;         // original data (truncated if huge)
  extracted: Record<string, any>; // parsed/extracted info
  timestamp: string;
}

// ─── Sensitive Pattern Detection ────────────────────────────────────────────

const SENSITIVE_PATTERNS: { name: string; pattern: RegExp; severity: Severity }[] = [
  { name: 'aws_access_key', pattern: /AKIA[0-9A-Z]{16}/g, severity: 'critical' },
  { name: 'aws_secret_key', pattern: /(?:aws_secret|secret_key|secretkey)\s*[:=]\s*['"]?([A-Za-z0-9/+=]{40})['"]?/gi, severity: 'critical' },
  { name: 'github_token', pattern: /gh[pousr]_[A-Za-z0-9_]{36,}/g, severity: 'critical' },
  { name: 'github_fine_grained', pattern: /github_pat_[A-Za-z0-9_]{22,}/g, severity: 'critical' },
  { name: 'slack_token', pattern: /xox[bpoas]-[0-9a-zA-Z-]{10,}/g, severity: 'high' },
  { name: 'slack_webhook', pattern: /hooks\.slack\.com\/services\/T[A-Z0-9]+\/B[A-Z0-9]+\/[a-zA-Z0-9]+/g, severity: 'high' },
  { name: 'jwt', pattern: /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, severity: 'medium' },
  { name: 'private_key', pattern: /-----BEGIN (?:RSA |EC |DSA )?PRIVATE KEY-----/g, severity: 'critical' },
  { name: 'google_api_key', pattern: /AIza[0-9A-Za-z_-]{35}/g, severity: 'high' },
  { name: 'stripe_key', pattern: /(?:sk|pk)_(?:live|test)_[0-9a-zA-Z]{24,}/g, severity: 'critical' },
  { name: 'heroku_api_key', pattern: /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g, severity: 'low' },
  { name: 'generic_api_key', pattern: /(?:api[_-]?key|apikey|api[_-]?secret)\s*[:=]\s*['"]?([A-Za-z0-9_-]{16,})['"]?/gi, severity: 'medium' },
  { name: 'bearer_token', parameter: /[Bb]earer\s+[A-Za-z0-9_-]{20,}/g, severity: 'medium' } as any,
  { name: 'password_in_url', pattern: /(?:password|passwd|pwd)\s*[:=]\s*[^\s&]{4,}/gi, severity: 'high' },
  { name: 'internal_ip', pattern: /(?:10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3})/g, severity: 'info' },
];

// ─── Error/Debug Pattern Detection ──────────────────────────────────────────

const ERROR_PATTERNS: { name: string; pattern: RegExp; tech: string }[] = [
  { name: 'sql_error', pattern: /(?:SQL syntax|mysql_fetch|ORA-\d{5}|PG::Error|sqlite3\.OperationalError|SQLSTATE\[)/i, tech: 'SQL' },
  { name: 'php_error', pattern: /(?:Fatal error|Parse error|Warning:.*on line \d+|Stack trace:|<?php)/i, tech: 'PHP' },
  { name: 'java_stack', pattern: /(?:at [a-z]+\.[a-z]+\..*\(.*\.java:\d+\)|java\.lang\.|javax\.)/i, tech: 'Java' },
  { name: 'python_traceback', pattern: /(?:Traceback \(most recent call|File ".*\.py", line \d+)/i, tech: 'Python' },
  { name: 'node_error', pattern: /(?:at Object\.<anonymous>|node_modules|ReferenceError|TypeError:.*undefined)/i, tech: 'Node.js' },
  { name: 'dotnet_error', pattern: /(?:System\.(?:Web|Net|IO)\.|Microsoft\.|\.aspx|Server Error in)/i, tech: '.NET' },
  { name: 'ruby_error', pattern: /(?:ActionController|ActiveRecord|NoMethodError|NameError.*ruby)/i, tech: 'Ruby' },
  { name: 'django_debug', pattern: /(?:django\.core|DJANGO_SETTINGS_MODULE|ImproperlyConfigured)/i, tech: 'Django' },
  { name: 'laravel_debug', pattern: /(?:Whoops!|Illuminate\\|laravel|artisan)/i, tech: 'Laravel' },
  { name: 'spring_error', pattern: /(?:org\.springframework|Whitelabel Error Page|Spring Boot)/i, tech: 'Spring' },
  { name: 'debug_mode', pattern: /(?:DEBUG\s*=\s*True|FLASK_DEBUG|APP_DEBUG\s*=\s*true)/i, tech: 'Debug' },
  { name: 'version_disclosure', pattern: /(?:X-Powered-By|Server:|X-AspNet-Version)/i, tech: 'Server' },
];

// ─── IDOR / Access Control Patterns ─────────────────────────────────────────

const IDOR_PATTERNS: RegExp[] = [
  /\/(?:user|account|profile|order|invoice|document|file|report|message|ticket)s?\/(\d+)/i,
  /[?&](?:id|user_id|account_id|uid|oid|pid|doc_id|file_id)=(\d+)/i,
  /[?&](?:uuid|guid)=([0-9a-f-]{36})/i,
  /\/api\/v\d+\/[a-z]+\/([0-9a-f-]{36}|\d+)/i,
];

// ─── Tool Output Parsers ────────────────────────────────────────────────────

interface ToolParseResult {
  tool: string;
  entities: { type: EntityType; value: string; metadata?: Record<string, any> }[];
  edges: { source_value: string; target_value: string; type: EdgeType }[];
}

function parseSubfinderOutput(raw: string): ToolParseResult {
  const lines = raw.split('\n').filter(l => l.trim() && !l.startsWith('['));
  return {
    tool: 'subfinder',
    entities: lines.map(line => ({
      type: 'subdomain' as EntityType,
      value: line.trim().toLowerCase(),
    })),
    edges: [],
  };
}

function parseNmapOutput(raw: string): ToolParseResult {
  const entities: ToolParseResult['entities'] = [];
  const edges: ToolParseResult['edges'] = [];

  // Extract host
  const hostMatch = raw.match(/Nmap scan report for (\S+)/);
  const host = hostMatch?.[1]?.toLowerCase();
  if (host) {
    const isIp = /^\d+\.\d+\.\d+\.\d+$/.test(host);
    entities.push({ type: isIp ? 'ip' : 'domain', value: host });
  }

  // Extract ports
  const portRegex = /^(\d+)\/(tcp|udp)\s+(\w+)\s+(.*)$/gm;
  let match;
  while ((match = portRegex.exec(raw)) !== null) {
    const [, port, proto, state, service] = match;
    if (state === 'open') {
      entities.push({
        type: 'port',
        value: `${port}/${proto}`,
        metadata: { state, service: service.trim(), host },
      });
      if (host) {
        edges.push({ source_value: host, target_value: `${port}/${proto}`, type: 'runs_on' });
      }
      // Extract tech from service banner
      const techMatch = service.match(/(\S+)\s+([\d.]+)/);
      if (techMatch) {
        entities.push({
          type: 'technology',
          value: `${techMatch[1]}/${techMatch[2]}`,
          metadata: { port, version: techMatch[2] },
        });
      }
    }
  }

  return { tool: 'nmap', entities, edges };
}

function parseNucleiOutput(raw: string): ToolParseResult {
  const entities: ToolParseResult['entities'] = [];
  const edges: ToolParseResult['edges'] = [];

  // Nuclei output: [template-id] [protocol] [severity] url [info]
  const lineRegex = /\[([^\]]+)\]\s+\[([^\]]+)\]\s+\[([^\]]+)\]\s+(\S+)/g;
  let match;
  while ((match = lineRegex.exec(raw)) !== null) {
    const [, templateId, protocol, severity, url] = match;
    entities.push({
      type: 'finding',
      value: `${templateId}@${url}`,
      metadata: { template: templateId, protocol, severity: severity.toLowerCase(), url },
    });

    // Link finding to endpoint
    try {
      const u = new URL(url);
      const endpoint = `${u.origin}${u.pathname}`;
      entities.push({ type: 'endpoint', value: endpoint });
      edges.push({ source_value: endpoint, target_value: `${templateId}@${url}`, type: 'vulnerable_to' });
    } catch { /* invalid URL */ }
  }

  return { tool: 'nuclei', entities, edges };
}

function parseFfufOutput(raw: string): ToolParseResult {
  const entities: ToolParseResult['entities'] = [];

  // FFUF output lines: URL [Status: X, Size: Y, Words: Z, Lines: L]
  const lineRegex = /(\S+)\s+\[Status:\s*(\d+),\s*Size:\s*(\d+)/g;
  let match;
  while ((match = lineRegex.exec(raw)) !== null) {
    const [, url, status, size] = match;
    entities.push({
      type: 'endpoint',
      value: url,
      metadata: { status: parseInt(status), size: parseInt(size), tool: 'ffuf' },
    });
  }

  return { tool: 'ffuf', entities, edges: [] };
}

function parseHttpxOutput(raw: string): ToolParseResult {
  const entities: ToolParseResult['entities'] = [];

  // httpx outputs URLs with optional status/title
  const lines = raw.split('\n').filter(l => l.trim());
  for (const line of lines) {
    const parts = line.split(/\s+/);
    const url = parts[0];
    if (url?.startsWith('http')) {
      const statusMatch = line.match(/\[(\d{3})\]/);
      const titleMatch = line.match(/\[([^\]]+)\]$/);
      entities.push({
        type: 'endpoint',
        value: url,
        metadata: {
          status: statusMatch ? parseInt(statusMatch[1]) : undefined,
          title: titleMatch?.[1],
          tool: 'httpx',
        },
      });
    }
  }

  return { tool: 'httpx', entities, edges: [] };
}

function parseSqlmapOutput(raw: string): ToolParseResult {
  const entities: ToolParseResult['entities'] = [];

  // SQLMap findings
  if (raw.includes('is vulnerable')) {
    const urlMatch = raw.match(/URL:\s*(\S+)/i) || raw.match(/Target URL:\s*(\S+)/i);
    const paramMatch = raw.match(/Parameter:\s*(\S+)/i);
    const typeMatch = raw.match(/Type:\s*(.+?)(?:\n|$)/i);

    if (urlMatch) {
      entities.push({
        type: 'finding',
        value: `sqli@${urlMatch[1]}${paramMatch ? `?${paramMatch[1]}` : ''}`,
        metadata: {
          vuln_type: 'SQL Injection',
          url: urlMatch[1],
          parameter: paramMatch?.[1],
          injection_type: typeMatch?.[1],
          severity: 'critical',
        },
      });
    }
  }

  return { tool: 'sqlmap', entities, edges: [] };
}

// Tool detection + parse routing
const TOOL_DETECTORS: { test: (raw: string) => boolean; parse: (raw: string) => ToolParseResult }[] = [
  { test: r => /Nmap scan report|Starting Nmap/i.test(r), parse: parseNmapOutput },
  { test: r => /nuclei|template-id/i.test(r) && /\[(critical|high|medium|low|info)\]/i.test(r), parse: parseNucleiOutput },
  { test: r => /FUZZ|ffuf/i.test(r) && /Status:/i.test(r), parse: parseFfufOutput },
  { test: r => r.split('\n').filter(l => l.trim()).every(l => /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(l.trim())), parse: parseSubfinderOutput },
  { test: r => /httpx|tech-detect/i.test(r) && /https?:\/\//i.test(r), parse: parseHttpxOutput },
  { test: r => /sqlmap|is vulnerable|injection/i.test(r), parse: parseSqlmapOutput },
];

// ─── Hunt Graph Service ─────────────────────────────────────────────────────

class HuntGraphService {
  // ── Hunt CRUD ───────────────────────────────────────────────────────────

  async createHunt(data: { name: string; program?: string; scope: string[]; exclude_scope?: string[] }): Promise<Hunt> {
    const { data: { session: _s } } = await supabase.auth.getSession();
    const user = _s?.user ?? null;
    if (!user) throw new Error('Not authenticated');

    const { data: hunt, error } = await supabase
      .from('hunts')
      .insert({
        user_id: user.id,
        name: data.name,
        program: data.program,
        scope: data.scope,
        exclude_scope: data.exclude_scope || [],
        status: 'active',
        stats: { entities: 0, edges: 0, events: 0, findings: 0, triage_pending: 0, last_activity: new Date().toISOString() },
      })
      .select()
      .single();

    if (error) throw error;
    return hunt;
  }

  async getActiveHunt(): Promise<Hunt | null> {
    const { data, error } = await supabase
      .from('hunts')
      .select('*')
      .eq('status', 'active')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async getHunt(id: string): Promise<Hunt | null> {
    const { data, error } = await supabase.from('hunts').select('*').eq('id', id).single();
    if (error) throw error;
    return data;
  }

  async listHunts(): Promise<Hunt[]> {
    const { data, error } = await supabase.from('hunts').select('*').order('updated_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async updateHunt(id: string, updates: Partial<Hunt>): Promise<Hunt> {
    const { data, error } = await supabase.from('hunts').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }

  // ── Entity Ingestion ──────────────────────────────────────────────────

  /**
   * Ingest an entity into the hunt graph.
   * Auto-deduplicates by (hunt_id, type, value).
   * Returns the entity (existing or newly created).
   */
  async ingestEntity(
    huntId: string,
    entity: {
      type: EntityType;
      value: string;
      raw_value?: string;
      metadata?: Record<string, any>;
      severity?: Severity;
      tags?: string[];
      source?: StreamSource;
    }
  ): Promise<HuntEntity> {
    const normalized = this.normalizeValue(entity.type, entity.value);
    const now = new Date().toISOString();

    // Upsert: if exists, bump hit_count + update last_seen + merge metadata
    const { data: existing } = await supabase
      .from('hunt_entities')
      .select('*')
      .eq('hunt_id', huntId)
      .eq('type', entity.type)
      .eq('value', normalized)
      .maybeSingle();

    if (existing) {
      const mergedMeta = { ...existing.metadata, ...entity.metadata };
      const mergedTags = [...new Set([...(existing.tags || []), ...(entity.tags || [])])];
      const { data: updated, error } = await supabase
        .from('hunt_entities')
        .update({
          metadata: mergedMeta,
          tags: mergedTags,
          hit_count: existing.hit_count + 1,
          last_seen: now,
          // Escalate severity if new is higher
          severity: this.maxSeverity(existing.severity, entity.severity || 'none'),
        })
        .eq('id', existing.id)
        .select()
        .single();
      if (error) throw error;
      return updated;
    }

    // Create new
    const { data: created, error } = await supabase
      .from('hunt_entities')
      .insert({
        hunt_id: huntId,
        type: entity.type,
        value: normalized,
        raw_value: entity.raw_value || entity.value,
        metadata: entity.metadata || {},
        severity: entity.severity || 'none',
        triage_status: 'new',
        tags: entity.tags || [],
        first_seen: now,
        last_seen: now,
        hit_count: 1,
        source: entity.source || 'manual',
      })
      .select()
      .single();

    if (error) throw error;

    // Update hunt stats
    await this.incrementStat(huntId, 'entities');
    if (entity.type === 'finding') await this.incrementStat(huntId, 'findings');

    return created;
  }

  /**
   * Ingest multiple entities in batch (parallel upserts).
   */
  async ingestEntities(
    huntId: string,
    entities: Parameters<typeof this.ingestEntity>[1][]
  ): Promise<HuntEntity[]> {
    return Promise.all(entities.map(e => this.ingestEntity(huntId, e)));
  }

  // ── Edge Creation ─────────────────────────────────────────────────────

  async createEdge(
    huntId: string,
    sourceId: string,
    targetId: string,
    type: EdgeType,
    metadata?: Record<string, any>
  ): Promise<HuntEdge> {
    // Check for existing edge
    const { data: existing } = await supabase
      .from('hunt_edges')
      .select('*')
      .eq('hunt_id', huntId)
      .eq('source_id', sourceId)
      .eq('target_id', targetId)
      .eq('type', type)
      .maybeSingle();

    if (existing) {
      const { data: updated, error } = await supabase
        .from('hunt_edges')
        .update({ weight: existing.weight + 1, metadata: { ...existing.metadata, ...metadata } })
        .eq('id', existing.id)
        .select()
        .single();
      if (error) throw error;
      return updated;
    }

    const { data: edge, error } = await supabase
      .from('hunt_edges')
      .insert({ hunt_id: huntId, source_id: sourceId, target_id: targetId, type, metadata: metadata || {}, weight: 1 })
      .select()
      .single();

    if (error) throw error;
    await this.incrementStat(huntId, 'edges');
    return edge;
  }

  /**
   * Create edge by entity values (resolves IDs internally).
   */
  async linkEntities(
    huntId: string,
    sourceType: EntityType,
    sourceValue: string,
    targetType: EntityType,
    targetValue: string,
    edgeType: EdgeType
  ): Promise<HuntEdge | null> {
    const srcNorm = this.normalizeValue(sourceType, sourceValue);
    const tgtNorm = this.normalizeValue(targetType, targetValue);

    const [{ data: src }, { data: tgt }] = await Promise.all([
      supabase.from('hunt_entities').select('id').eq('hunt_id', huntId).eq('type', sourceType).eq('value', srcNorm).maybeSingle(),
      supabase.from('hunt_entities').select('id').eq('hunt_id', huntId).eq('type', targetType).eq('value', tgtNorm).maybeSingle(),
    ]);

    if (!src || !tgt) return null;
    return this.createEdge(huntId, src.id, tgt.id, edgeType);
  }

  // ── Event Logging ─────────────────────────────────────────────────────

  async logEvent(
    huntId: string,
    event: {
      entity_id?: string;
      source: StreamSource;
      event_type: string;
      raw_data: string;
      extracted?: Record<string, any>;
    }
  ): Promise<HuntEvent> {
    // Truncate raw_data to 50KB max
    const truncated = event.raw_data.length > 50000
      ? event.raw_data.slice(0, 50000) + '\n[...truncated]'
      : event.raw_data;

    const { data, error } = await supabase
      .from('hunt_events')
      .insert({
        hunt_id: huntId,
        entity_id: event.entity_id,
        source: event.source,
        event_type: event.event_type,
        raw_data: truncated,
        extracted: event.extracted || {},
      })
      .select()
      .single();

    if (error) throw error;
    await this.incrementStat(huntId, 'events');
    return data;
  }

  // ── Stream Processors ─────────────────────────────────────────────────

  /**
   * Process a proxy/HTTP capture event.
   * Extracts: endpoints, params, headers, cookies, secrets, error patterns, IDOR patterns.
   */
  async processProxyStream(
    huntId: string,
    data: {
      method: string;
      url: string;
      status?: number;
      request_headers?: Record<string, string>;
      response_headers?: Record<string, string>;
      request_body?: string;
      response_body?: string;
    }
  ): Promise<{ entities: HuntEntity[]; flags: string[] }> {
    const results: HuntEntity[] = [];
    const flags: string[] = [];

    let parsed: URL;
    try {
      parsed = new URL(data.url);
    } catch {
      return { entities: [], flags: [] };
    }

    // 1. Domain entity
    const domain = await this.ingestEntity(huntId, {
      type: parsed.hostname.split('.').length > 2 ? 'subdomain' : 'domain',
      value: parsed.hostname,
      source: 'proxy',
    });
    results.push(domain);

    // 2. Endpoint entity
    const endpointValue = `${parsed.origin}${parsed.pathname}`;
    const endpoint = await this.ingestEntity(huntId, {
      type: 'endpoint',
      value: endpointValue,
      metadata: {
        method: data.method,
        status: data.status,
        content_type: data.response_headers?.['content-type'],
      },
      severity: data.status && data.status >= 500 ? 'low' : 'none',
      source: 'proxy',
    });
    results.push(endpoint);

    // Link domain → endpoint
    await this.linkEntities(huntId, domain.type, domain.value, 'endpoint', endpointValue, 'serves');

    // 3. Parameters
    for (const [key, val] of parsed.searchParams.entries()) {
      const param = await this.ingestEntity(huntId, {
        type: 'parameter',
        value: `${endpointValue}?${key}`,
        metadata: { name: key, sample_value: val.slice(0, 200), method: data.method },
        source: 'proxy',
      });
      results.push(param);
      await this.linkEntities(huntId, 'endpoint', endpointValue, 'parameter', param.value, 'has_param');
    }

    // 4. POST body params
    if (data.request_body && data.request_headers?.['content-type']?.includes('application/x-www-form-urlencoded')) {
      try {
        const bodyParams = new URLSearchParams(data.request_body);
        for (const [key, val] of bodyParams.entries()) {
          const param = await this.ingestEntity(huntId, {
            type: 'parameter',
            value: `${endpointValue}#POST:${key}`,
            metadata: { name: key, sample_value: val.slice(0, 200), method: 'POST', in_body: true },
            source: 'proxy',
          });
          results.push(param);
        }
      } catch { /* not valid form data */ }
    }

    // 5. Response headers — interesting ones
    if (data.response_headers) {
      const interesting = ['server', 'x-powered-by', 'x-aspnet-version', 'x-runtime', 'x-request-id', 'x-amzn-requestid'];
      for (const h of interesting) {
        const val = data.response_headers[h];
        if (val) {
          await this.ingestEntity(huntId, {
            type: 'technology',
            value: `${h}:${val}`,
            metadata: { header: h, value: val, endpoint: endpointValue },
            source: 'proxy',
          });
        }
      }
    }

    // 6. Cookies
    const setCookie = data.response_headers?.['set-cookie'];
    if (setCookie) {
      const cookieName = setCookie.split('=')[0]?.trim();
      if (cookieName) {
        const hasSecure = /;\s*Secure/i.test(setCookie);
        const hasHttpOnly = /;\s*HttpOnly/i.test(setCookie);
        const hasSameSite = /;\s*SameSite/i.test(setCookie);
        await this.ingestEntity(huntId, {
          type: 'cookie',
          value: `${parsed.hostname}:${cookieName}`,
          metadata: { name: cookieName, secure: hasSecure, httpOnly: hasHttpOnly, sameSite: hasSameSite, endpoint: endpointValue },
          severity: (!hasSecure || !hasHttpOnly) ? 'info' : 'none',
          source: 'proxy',
        });
        if (!hasSecure || !hasHttpOnly) {
          flags.push(`Cookie "${cookieName}" missing ${!hasSecure ? 'Secure' : ''} ${!hasHttpOnly ? 'HttpOnly' : ''}`.trim());
        }
      }
    }

    // 7. Secret scanning on response body
    const bodyToScan = [data.response_body, data.request_body].filter(Boolean).join('\n');
    if (bodyToScan) {
      for (const sp of SENSITIVE_PATTERNS) {
        const matches = bodyToScan.match(sp.pattern);
        if (matches) {
          for (const m of matches.slice(0, 5)) { // max 5 per pattern
            const secret = await this.ingestEntity(huntId, {
              type: 'secret',
              value: `${sp.name}:${m.slice(0, 40)}...`,
              metadata: { pattern: sp.name, match: m.slice(0, 100), endpoint: endpointValue },
              severity: sp.severity,
              source: 'proxy',
              tags: ['auto-flagged'],
            });
            results.push(secret);
            flags.push(`[!] ${sp.severity.toUpperCase()} — ${sp.name} leaked at ${endpointValue}`);
          }
        }
      }
    }

    // 8. Error pattern detection
    if (data.response_body) {
      for (const ep of ERROR_PATTERNS) {
        if (ep.pattern.test(data.response_body)) {
          await this.ingestEntity(huntId, {
            type: 'technology',
            value: `error:${ep.tech}@${endpointValue}`,
            metadata: { pattern: ep.name, tech: ep.tech, endpoint: endpointValue },
            severity: 'low',
            tags: ['error-disclosure', 'auto-flagged'],
            source: 'proxy',
          });
          flags.push(`[i] ${ep.tech} error disclosure at ${endpointValue}`);
        }
      }
    }

    // 9. IDOR pattern detection
    for (const pat of IDOR_PATTERNS) {
      if (pat.test(data.url)) {
        flags.push(`[!] Potential IDOR pattern: ${data.url}`);
        await this.ingestEntity(huntId, {
          type: 'finding',
          value: `potential-idor@${endpointValue}`,
          metadata: { url: data.url, method: data.method, pattern: pat.source },
          severity: 'medium',
          tags: ['idor', 'auto-flagged', 'needs-verification'],
          source: 'proxy',
        });
      }
    }

    // 10. Open redirect detection
    if (data.status && [301, 302, 303, 307, 308].includes(data.status)) {
      const location = data.response_headers?.['location'];
      if (location) {
        // Check if any param value appears in the redirect location
        for (const [, val] of parsed.searchParams.entries()) {
          if (val && location.includes(val)) {
            flags.push(`[!] Potential open redirect: param value reflected in Location header`);
            await this.ingestEntity(huntId, {
              type: 'finding',
              value: `potential-open-redirect@${endpointValue}`,
              metadata: { url: data.url, location, reflected_value: val },
              severity: 'medium',
              tags: ['open-redirect', 'auto-flagged'],
              source: 'proxy',
            });
          }
        }
      }
    }

    // Log the raw event
    await this.logEvent(huntId, {
      source: 'proxy',
      event_type: 'request',
      raw_data: `${data.method} ${data.url} → ${data.status || '?'}`,
      extracted: { method: data.method, url: data.url, status: data.status, flags },
    });

    return { entities: results, flags };
  }

  /**
   * Process terminal/tool output.
   * Auto-detects tool and parses output into entities + edges.
   */
  async processTerminalStream(
    huntId: string,
    raw: string,
    meta?: { command?: string; tool?: string }
  ): Promise<{ entities: HuntEntity[]; tool: string }> {
    // Detect which tool produced this output
    let parseResult: ToolParseResult | null = null;
    for (const detector of TOOL_DETECTORS) {
      if (detector.test(raw)) {
        parseResult = detector.parse(raw);
        break;
      }
    }

    if (!parseResult) {
      // Unknown output — just log as event
      await this.logEvent(huntId, {
        source: 'terminal',
        event_type: 'tool_output',
        raw_data: raw,
        extracted: { command: meta?.command },
      });
      return { entities: [], tool: 'unknown' };
    }

    // Ingest all parsed entities
    const ingested = await this.ingestEntities(
      huntId,
      parseResult.entities.map(e => ({ ...e, source: 'terminal' as StreamSource }))
    );

    // Create edges (resolve values to IDs)
    for (const edge of parseResult.edges) {
      await this.linkEntities(
        huntId,
        this.inferEntityType(edge.source_value), edge.source_value,
        this.inferEntityType(edge.target_value), edge.target_value,
        edge.type
      );
    }

    // Log the event
    await this.logEvent(huntId, {
      source: 'terminal',
      event_type: 'tool_output',
      raw_data: raw.slice(0, 50000),
      extracted: { tool: parseResult.tool, command: meta?.command, entity_count: ingested.length },
    });

    return { entities: ingested, tool: parseResult.tool };
  }

  /**
   * Process browser page capture.
   * Extracts: forms, links, scripts, comments, meta tags.
   */
  async processBrowserStream(
    huntId: string,
    data: {
      url: string;
      title?: string;
      forms?: { action: string; method: string; inputs: { name: string; type: string }[] }[];
      links?: string[];
      scripts?: string[];
      comments?: string[];
      meta?: Record<string, string>;
    }
  ): Promise<{ entities: HuntEntity[]; flags: string[] }> {
    const results: HuntEntity[] = [];
    const flags: string[] = [];

    // Page endpoint
    const endpoint = await this.ingestEntity(huntId, {
      type: 'endpoint',
      value: data.url,
      metadata: { title: data.title, source_type: 'browser' },
      source: 'browser',
    });
    results.push(endpoint);

    // Forms → potential attack surface
    if (data.forms) {
      for (const form of data.forms) {
        for (const input of form.inputs) {
          if (['hidden', 'text', 'password', 'email', 'search', 'url', 'number'].includes(input.type)) {
            const param = await this.ingestEntity(huntId, {
              type: 'parameter',
              value: `${form.action || data.url}#FORM:${input.name}`,
              metadata: { name: input.name, input_type: input.type, form_action: form.action, form_method: form.method },
              source: 'browser',
            });
            results.push(param);

            if (input.type === 'hidden') {
              flags.push(`[i] Hidden field: ${input.name} in form @ ${form.action || data.url}`);
            }
          }
        }
      }
    }

    // Links → discover new endpoints
    if (data.links) {
      for (const link of data.links) {
        try {
          const u = new URL(link, data.url);
          await this.ingestEntity(huntId, { type: 'endpoint', value: u.href, source: 'browser' });
        } catch { /* relative URL parse failed */ }
      }
    }

    // Comments → might leak info
    if (data.comments) {
      for (const comment of data.comments) {
        // Check for TODO, FIXME, DEBUG, credentials, API keys
        if (/todo|fixme|hack|debug|password|secret|key|token|credential/i.test(comment)) {
          flags.push(`[i] Interesting comment: "${comment.slice(0, 100)}"`);
          await this.ingestEntity(huntId, {
            type: 'evidence',
            value: `comment@${data.url}:${comment.slice(0, 50)}`,
            metadata: { comment: comment.slice(0, 500), page: data.url },
            severity: 'info',
            tags: ['html-comment', 'auto-flagged'],
            source: 'browser',
          });
        }
      }
    }

    // Script sources → external JS for analysis
    if (data.scripts) {
      for (const src of data.scripts) {
        if (src.startsWith('http')) {
          await this.ingestEntity(huntId, {
            type: 'endpoint',
            value: src,
            metadata: { type: 'javascript', referenced_from: data.url },
            tags: ['js-source'],
            source: 'browser',
          });
        }
      }
    }

    await this.logEvent(huntId, {
      source: 'browser',
      event_type: 'page_load',
      raw_data: `${data.url} — ${data.title || 'untitled'}`,
      extracted: {
        url: data.url, title: data.title,
        form_count: data.forms?.length || 0,
        link_count: data.links?.length || 0,
        flags,
      },
    });

    return { entities: results, flags };
  }

  // ── Graph Queries ─────────────────────────────────────────────────────

  async getEntities(huntId: string, filters?: {
    type?: EntityType;
    severity?: Severity;
    triage_status?: TriageStatus;
    tag?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ data: HuntEntity[]; count: number }> {
    let query = supabase.from('hunt_entities').select('*', { count: 'exact' }).eq('hunt_id', huntId);

    if (filters?.type) query = query.eq('type', filters.type);
    if (filters?.severity) query = query.eq('severity', filters.severity);
    if (filters?.triage_status) query = query.eq('triage_status', filters.triage_status);
    if (filters?.tag) query = query.contains('tags', [filters.tag]);
    if (filters?.search) query = query.ilike('value', `%${filters.search}%`);

    query = query.order('last_seen', { ascending: false });
    if (filters?.limit) query = query.limit(filters.limit);
    if (filters?.offset) query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);

    const { data, error, count } = await query;
    if (error) throw error;
    return { data: data || [], count: count || 0 };
  }

  async getGraph(huntId: string): Promise<{ nodes: HuntEntity[]; edges: HuntEdge[] }> {
    const [{ data: nodes, error: ne }, { data: edges, error: ee }] = await Promise.all([
      supabase.from('hunt_entities').select('*').eq('hunt_id', huntId).order('hit_count', { ascending: false }).limit(500),
      supabase.from('hunt_edges').select('*').eq('hunt_id', huntId).order('weight', { ascending: false }).limit(2000),
    ]);

    if (ne) throw ne;
    if (ee) throw ee;
    return { nodes: nodes || [], edges: edges || [] };
  }

  async getTriageQueue(huntId: string): Promise<HuntEntity[]> {
    const { data, error } = await supabase
      .from('hunt_entities')
      .select('*')
      .eq('hunt_id', huntId)
      .in('triage_status', ['new', 'interesting'])
      .in('severity', ['critical', 'high', 'medium'])
      .order('severity', { ascending: true }) // critical first
      .order('last_seen', { ascending: false })
      .limit(100);

    if (error) throw error;
    return data || [];
  }

  async getTimeline(huntId: string, opts?: { limit?: number; after?: string; before?: string }): Promise<HuntEvent[]> {
    let query = supabase.from('hunt_events').select('*').eq('hunt_id', huntId);

    if (opts?.after) query = query.gte('timestamp', opts.after);
    if (opts?.before) query = query.lte('timestamp', opts.before);

    query = query.order('timestamp', { ascending: false }).limit(opts?.limit || 200);

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  async getStats(huntId: string): Promise<HuntStats> {
    const hunt = await this.getHunt(huntId);
    return hunt?.stats || { entities: 0, edges: 0, events: 0, findings: 0, triage_pending: 0, last_activity: new Date().toISOString() };
  }

  // ── Triage ────────────────────────────────────────────────────────────

  async triageEntity(entityId: string, status: TriageStatus, notes?: string): Promise<HuntEntity> {
    const updates: any = { triage_status: status };
    if (notes) updates.triage_notes = notes;

    const { data, error } = await supabase
      .from('hunt_entities')
      .update(updates)
      .eq('id', entityId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async bulkTriage(entityIds: string[], status: TriageStatus): Promise<void> {
    const { error } = await supabase
      .from('hunt_entities')
      .update({ triage_status: status })
      .in('id', entityIds);

    if (error) throw error;
  }

  // ── AI Triage Suggestions ─────────────────────────────────────────────

  /**
   * Generate AI triage context for a set of entities.
   * Returns a structured prompt for the AI to analyze.
   */
  async generateTriageContext(huntId: string): Promise<string> {
    const queue = await this.getTriageQueue(huntId);
    if (queue.length === 0) return 'No items in triage queue.';

    const hunt = await this.getHunt(huntId);
    const lines: string[] = [
      `Hunt: ${hunt?.name || huntId}`,
      `Program: ${hunt?.program || 'unknown'}`,
      `Scope: ${hunt?.scope?.join(', ') || 'not defined'}`,
      `\nTriage Queue (${queue.length} items):`,
      '',
    ];

    for (const entity of queue) {
      lines.push(`[${entity.severity.toUpperCase()}] ${entity.type}: ${entity.value}`);
      if (entity.metadata && Object.keys(entity.metadata).length > 0) {
        lines.push(`  Meta: ${JSON.stringify(entity.metadata).slice(0, 300)}`);
      }
      if (entity.tags?.length) {
        lines.push(`  Tags: ${entity.tags.join(', ')}`);
      }
      lines.push(`  Seen: ${entity.hit_count}x | First: ${entity.first_seen} | Source: ${entity.source}`);
      lines.push('');
    }

    return lines.join('\n');
  }

  // ── Helpers ───────────────────────────────────────────────────────────

  private normalizeValue(type: EntityType, value: string): string {
    switch (type) {
      case 'domain':
      case 'subdomain':
      case 'email':
        return value.toLowerCase().trim();
      case 'endpoint':
        // Normalize URL: lowercase host, remove trailing slash, remove default ports
        try {
          const u = new URL(value);
          let normalized = `${u.protocol}//${u.hostname.toLowerCase()}`;
          if (u.port && u.port !== '80' && u.port !== '443') normalized += `:${u.port}`;
          normalized += u.pathname.replace(/\/+$/, '') || '/';
          return normalized;
        } catch {
          return value.toLowerCase().trim();
        }
      case 'ip':
        return value.trim();
      default:
        return value.trim();
    }
  }

  private maxSeverity(a: Severity, b: Severity): Severity {
    const order: Severity[] = ['critical', 'high', 'medium', 'low', 'info', 'none'];
    return order.indexOf(a) <= order.indexOf(b) ? a : b;
  }

  private inferEntityType(value: string): EntityType {
    if (/^\d+\.\d+\.\d+\.\d+$/.test(value)) return 'ip';
    if (/^\d+\/(tcp|udp)$/.test(value)) return 'port';
    if (value.startsWith('http')) return 'endpoint';
    if (value.includes('@')) return 'email';
    if (/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(value)) {
      return value.split('.').length > 2 ? 'subdomain' : 'domain';
    }
    return 'technology';
  }

  private async incrementStat(huntId: string, field: keyof HuntStats): Promise<void> {
    const hunt = await this.getHunt(huntId);
    if (!hunt) return;

    const stats = { ...hunt.stats };
    if (typeof stats[field] === 'number') {
      (stats as any)[field] += 1;
    }
    stats.last_activity = new Date().toISOString();

    await supabase.from('hunts').update({ stats, updated_at: new Date().toISOString() }).eq('id', huntId);
  }
}

// ── Singleton Export ──────────────────────────────────────────────────────────

export const huntGraph = new HuntGraphService();
export default huntGraph;
