/**
 * Hunt Capture Service
 *
 * Orchestrates the 3 capture streams and bridges hunt-graph data
 * into existing services (findingsEngine, sentinelService, alertIngestion).
 *
 * Capture Sources:
 * 1. Webhook receiver — Caido/Burp push HTTP traffic via POST
 * 2. Terminal hook — xterm.js output auto-parsed for tool results
 * 3. CDP/Browser — Chrome DevTools Protocol network events
 *
 * All capture is gated by:
 * - Hunt Mode (on/off)
 * - Scope filter (only in-scope domains/IPs)
 */

import { huntGraph, type Hunt, type HuntEntity, type StreamSource, type Severity } from './hunt-graph';
import { supabase } from '@/integrations/supabase/client';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface CaptureConfig {
  webhookEnabled: boolean;
  terminalEnabled: boolean;
  browserEnabled: boolean;
  autoTriage: boolean;           // auto-pipe findings to triage engine
  autoSentinel: boolean;         // auto-sync hosts to sentinel assets
  dedupeWindowMs: number;        // ignore duplicate URLs within this window
  maxEventsPerMinute: number;    // rate limit
  excludeStaticAssets: boolean;  // skip .js/.css/.png/.woff etc.
  excludePatterns: string[];     // custom exclude regex patterns
}

export type CaptureStatus = 'idle' | 'active' | 'paused' | 'error';

export interface CaptureStats {
  status: CaptureStatus;
  huntId: string | null;
  huntName: string | null;
  scope: string[];
  totalCaptured: number;
  totalFiltered: number;
  totalFlags: number;
  eventsPerMinute: number;
  lastActivity: string | null;
  sources: {
    webhook: { enabled: boolean; count: number };
    terminal: { enabled: boolean; count: number };
    browser: { enabled: boolean; count: number };
  };
}

type CaptureEventHandler = (event: CaptureEvent) => void;

export interface CaptureEvent {
  type: 'entity_created' | 'flag_raised' | 'finding_created' | 'error' | 'status_change';
  source: StreamSource;
  data: any;
  timestamp: string;
}

// ─── Static Asset Filter ────────────────────────────────────────────────────

const STATIC_EXTENSIONS = /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|map|webp|avif|mp4|webm|mp3|pdf)(\?.*)?$/i;

const DEFAULT_EXCLUDE = [
  /^https?:\/\/(fonts|ajax|cdn|static)\./i,
  /\/(wp-includes|wp-content)\/(themes|plugins)\/.*\.(js|css)/i,
  /google-analytics\.com/i,
  /googletagmanager\.com/i,
  /facebook\.net/i,
  /doubleclick\.net/i,
  /cloudflare\.com\/cdn-cgi/i,
];

// ─── Rate Limiter ───────────────────────────────────────────────────────────

class RateLimiter {
  private timestamps: number[] = [];
  private maxPerMinute: number;

  constructor(maxPerMinute: number) {
    this.maxPerMinute = maxPerMinute;
  }

  check(): boolean {
    const now = Date.now();
    this.timestamps = this.timestamps.filter(t => now - t < 60_000);
    if (this.timestamps.length >= this.maxPerMinute) return false;
    this.timestamps.push(now);
    return true;
  }

  getRate(): number {
    const now = Date.now();
    this.timestamps = this.timestamps.filter(t => now - t < 60_000);
    return this.timestamps.length;
  }

  updateLimit(newLimit: number) {
    this.maxPerMinute = newLimit;
  }
}

// ─── Dedup Cache ────────────────────────────────────────────────────────────

class DedupeCache {
  private seen = new Map<string, number>(); // key → timestamp
  private windowMs: number;

  constructor(windowMs: number) {
    this.windowMs = windowMs;
  }

  isDuplicate(key: string): boolean {
    const now = Date.now();
    const last = this.seen.get(key);
    if (last && now - last < this.windowMs) return true;
    this.seen.set(key, now);
    // Prune old entries every 1000 inserts
    if (this.seen.size > 10000) this.prune();
    return false;
  }

  private prune() {
    const now = Date.now();
    for (const [key, ts] of this.seen) {
      if (now - ts > this.windowMs) this.seen.delete(key);
    }
  }
}

// ─── Hunt Capture Service ───────────────────────────────────────────────────

class HuntCaptureService {
  private activeHunt: Hunt | null = null;
  private config: CaptureConfig = {
    webhookEnabled: true,
    terminalEnabled: true,
    browserEnabled: true,
    autoTriage: true,
    autoSentinel: true,
    dedupeWindowMs: 5_000,        // 5s dedup window
    maxEventsPerMinute: 300,
    excludeStaticAssets: true,
    excludePatterns: [],
  };

  private status: CaptureStatus = 'idle';
  private stats: CaptureStats = this.emptyStats();
  private rateLimiter = new RateLimiter(this.config.maxEventsPerMinute);
  private dedupeCache = new DedupeCache(this.config.dedupeWindowMs);
  private listeners: CaptureEventHandler[] = [];
  private compiledExcludes: RegExp[] = [];
  private terminalBuffer = '';          // buffer for partial terminal output
  private terminalFlushTimer: any = null;

  // ── Hunt Lifecycle ──────────────────────────────────────────────────────

  /**
   * Start hunt mode. Activates capture on all enabled sources.
   */
  async start(huntId?: string): Promise<Hunt> {
    let hunt: Hunt | null = null;

    if (huntId) {
      hunt = await huntGraph.getHunt(huntId);
    } else {
      hunt = await huntGraph.getActiveHunt();
    }

    if (!hunt) {
      throw new Error('No active hunt found. Create one first.');
    }

    this.activeHunt = hunt;
    this.status = 'active';
    this.stats = this.emptyStats();
    this.stats.status = 'active';
    this.stats.huntId = hunt.id;
    this.stats.huntName = hunt.name;
    this.stats.scope = hunt.scope;

    // Compile exclude patterns
    this.compiledExcludes = [
      ...DEFAULT_EXCLUDE,
      ...this.config.excludePatterns.map(p => new RegExp(p, 'i')),
    ];

    this.emit({ type: 'status_change', source: 'manual', data: { status: 'active', hunt: hunt.name }, timestamp: new Date().toISOString() });

    return hunt;
  }

  /**
   * Pause capture (keeps hunt active, stops ingestion).
   */
  pause() {
    this.status = 'paused';
    this.stats.status = 'paused';
    this.emit({ type: 'status_change', source: 'manual', data: { status: 'paused' }, timestamp: new Date().toISOString() });
  }

  /**
   * Resume from pause.
   */
  resume() {
    if (!this.activeHunt) throw new Error('No active hunt to resume');
    this.status = 'active';
    this.stats.status = 'active';
    this.emit({ type: 'status_change', source: 'manual', data: { status: 'active' }, timestamp: new Date().toISOString() });
  }

  /**
   * Stop hunt mode entirely.
   */
  async stop() {
    if (this.activeHunt) {
      await huntGraph.updateHunt(this.activeHunt.id, { status: 'paused' });
    }
    this.activeHunt = null;
    this.status = 'idle';
    this.stats = this.emptyStats();
    this.terminalBuffer = '';
    if (this.terminalFlushTimer) clearTimeout(this.terminalFlushTimer);
    this.emit({ type: 'status_change', source: 'manual', data: { status: 'idle' }, timestamp: new Date().toISOString() });
  }

  // ── Scope Check ─────────────────────────────────────────────────────────

  /**
   * Check if a URL/domain is in scope for the active hunt.
   */
  isInScope(urlOrDomain: string): boolean {
    if (!this.activeHunt) return false;

    let hostname: string;
    try {
      hostname = new URL(urlOrDomain).hostname;
    } catch {
      hostname = urlOrDomain.toLowerCase();
    }

    // Check exclude scope first
    for (const pattern of this.activeHunt.exclude_scope) {
      if (this.matchScope(hostname, pattern)) return false;
    }

    // Check include scope
    for (const pattern of this.activeHunt.scope) {
      if (this.matchScope(hostname, pattern)) return true;
    }

    return false;
  }

  private matchScope(hostname: string, pattern: string): boolean {
    // Wildcard: *.example.com matches sub.example.com and example.com
    if (pattern.startsWith('*.')) {
      const base = pattern.slice(2).toLowerCase();
      return hostname === base || hostname.endsWith('.' + base);
    }
    // CIDR: 10.0.0.0/24 (basic support)
    if (pattern.includes('/')) {
      // Simple prefix match for now
      const prefix = pattern.split('/')[0];
      return hostname.startsWith(prefix.split('.').slice(0, -1).join('.'));
    }
    // Exact match
    return hostname.toLowerCase() === pattern.toLowerCase();
  }

  // ── Filters ─────────────────────────────────────────────────────────────

  private shouldCapture(url: string, source: StreamSource): boolean {
    if (this.status !== 'active') return false;
    if (!this.activeHunt) return false;

    // Source enabled check
    if (source === 'proxy' && !this.config.webhookEnabled) return false;
    if (source === 'terminal' && !this.config.terminalEnabled) return false;
    if (source === 'browser' && !this.config.browserEnabled) return false;

    // Rate limit
    if (!this.rateLimiter.check()) {
      this.stats.totalFiltered++;
      return false;
    }

    // Static asset filter
    if (this.config.excludeStaticAssets && STATIC_EXTENSIONS.test(url)) {
      this.stats.totalFiltered++;
      return false;
    }

    // Custom exclude patterns
    for (const re of this.compiledExcludes) {
      if (re.test(url)) {
        this.stats.totalFiltered++;
        return false;
      }
    }

    // Scope check
    if (!this.isInScope(url)) {
      this.stats.totalFiltered++;
      return false;
    }

    // Dedup
    if (this.dedupeCache.isDuplicate(url)) {
      this.stats.totalFiltered++;
      return false;
    }

    return true;
  }

  // ── Capture Ingestion Points ────────────────────────────────────────────

  /**
   * WEBHOOK INGESTION
   * Called when Caido/Burp pushes an HTTP request via webhook.
   * Expected payload matches Caido's webhook format.
   */
  async ingestWebhook(payload: {
    method: string;
    url: string;
    status?: number;
    request_headers?: Record<string, string>;
    response_headers?: Record<string, string>;
    request_body?: string;
    response_body?: string;
  }): Promise<{ captured: boolean; flags: string[] }> {
    if (!this.shouldCapture(payload.url, 'proxy')) {
      return { captured: false, flags: [] };
    }

    const { entities, flags } = await huntGraph.processProxyStream(this.activeHunt!.id, payload);

    this.stats.totalCaptured++;
    this.stats.sources.webhook.count++;
    this.stats.totalFlags += flags.length;
    this.stats.lastActivity = new Date().toISOString();
    this.stats.eventsPerMinute = this.rateLimiter.getRate();

    // Bridge: auto-create findings for flagged items
    if (flags.length > 0 && this.config.autoTriage) {
      await this.bridgeToFindings(entities, flags, 'proxy');
    }

    // Bridge: sync discovered hosts to sentinel
    if (this.config.autoSentinel) {
      await this.bridgeToSentinel(entities);
    }

    for (const flag of flags) {
      this.emit({ type: 'flag_raised', source: 'proxy', data: { flag, url: payload.url }, timestamp: new Date().toISOString() });
    }

    return { captured: true, flags };
  }

  /**
   * TERMINAL INGESTION
   * Called from xterm.js onData hook. Buffers output and auto-flushes
   * when a tool output block is detected (newline gap or prompt return).
   */
  ingestTerminalChunk(chunk: string) {
    if (this.status !== 'active' || !this.config.terminalEnabled) return;

    this.terminalBuffer += chunk;

    // Reset flush timer — flush after 2s of silence (tool finished)
    if (this.terminalFlushTimer) clearTimeout(this.terminalFlushTimer);
    this.terminalFlushTimer = setTimeout(() => this.flushTerminalBuffer(), 2000);

    // Also flush if buffer exceeds 50KB (long-running tool)
    if (this.terminalBuffer.length > 50_000) {
      this.flushTerminalBuffer();
    }
  }

  private async flushTerminalBuffer() {
    const raw = this.terminalBuffer.trim();
    this.terminalBuffer = '';
    if (this.terminalFlushTimer) clearTimeout(this.terminalFlushTimer);

    if (!raw || raw.length < 20) return; // too short to be useful
    if (!this.activeHunt) return;

    // Strip ANSI escape codes
    const clean = raw.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '').replace(/\x1b\][^\x07]*\x07/g, '');

    const { entities, tool } = await huntGraph.processTerminalStream(this.activeHunt.id, clean);

    if (tool === 'unknown' && entities.length === 0) return; // unrecognized output, skip

    this.stats.totalCaptured++;
    this.stats.sources.terminal.count++;
    this.stats.lastActivity = new Date().toISOString();

    // Bridge findings
    const findingEntities = entities.filter(e => e.type === 'finding');
    if (findingEntities.length > 0 && this.config.autoTriage) {
      await this.bridgeToFindings(findingEntities, [], 'terminal');
    }

    // Bridge hosts to sentinel
    if (this.config.autoSentinel) {
      await this.bridgeToSentinel(entities);
    }

    this.emit({
      type: 'entity_created',
      source: 'terminal',
      data: { tool, entityCount: entities.length, findingCount: findingEntities.length },
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * BROWSER/CDP INGESTION
   * Called from Chrome DevTools Protocol network event listener.
   * Receives individual request/response pairs.
   */
  async ingestCDP(data: {
    method: string;
    url: string;
    status?: number;
    requestHeaders?: Record<string, string>;
    responseHeaders?: Record<string, string>;
    responseBody?: string;
  }): Promise<{ captured: boolean; flags: string[] }> {
    if (!this.shouldCapture(data.url, 'browser')) {
      return { captured: false, flags: [] };
    }

    const { entities, flags } = await huntGraph.processProxyStream(this.activeHunt!.id, {
      method: data.method,
      url: data.url,
      status: data.status,
      request_headers: data.requestHeaders,
      response_headers: data.responseHeaders,
      response_body: data.responseBody,
    });

    this.stats.totalCaptured++;
    this.stats.sources.browser.count++;
    this.stats.totalFlags += flags.length;
    this.stats.lastActivity = new Date().toISOString();

    if (flags.length > 0 && this.config.autoTriage) {
      await this.bridgeToFindings(entities, flags, 'browser');
    }

    if (this.config.autoSentinel) {
      await this.bridgeToSentinel(entities);
    }

    for (const flag of flags) {
      this.emit({ type: 'flag_raised', source: 'browser', data: { flag, url: data.url }, timestamp: new Date().toISOString() });
    }

    return { captured: true, flags };
  }

  /**
   * BROWSER PAGE INGESTION
   * Called when a full page is captured (forms, links, scripts, comments).
   */
  async ingestPage(data: {
    url: string;
    title?: string;
    forms?: { action: string; method: string; inputs: { name: string; type: string }[] }[];
    links?: string[];
    scripts?: string[];
    comments?: string[];
  }): Promise<{ captured: boolean; flags: string[] }> {
    if (!this.shouldCapture(data.url, 'browser')) {
      return { captured: false, flags: [] };
    }

    const { entities, flags } = await huntGraph.processBrowserStream(this.activeHunt!.id, data);

    this.stats.totalCaptured++;
    this.stats.sources.browser.count++;
    this.stats.totalFlags += flags.length;
    this.stats.lastActivity = new Date().toISOString();

    return { captured: true, flags };
  }

  // ── Bridge Functions (Hunt Graph → Existing Services) ───────────────────

  /**
   * Bridge flagged hunt entities → findingsEngine.
   * Creates findings in the central `findings` table so they appear in
   * Findings page, get auto-triaged, and flow into Reports.
   */
  private async bridgeToFindings(entities: HuntEntity[], flags: string[], source: StreamSource) {
    // Lazy import to avoid circular deps
    const { findingsEngine } = await import('./findings-engine');

    for (const entity of entities) {
      if (entity.type !== 'finding' && entity.severity === 'none') continue;
      if (entity.type === 'finding' || ['critical', 'high', 'medium'].includes(entity.severity)) {
        try {
          await findingsEngine.create({
            title: entity.value,
            description: flags.join('\n') || `Auto-captured from ${source}: ${entity.value}`,
            severity: this.mapSeverity(entity.severity),
            source: this.mapSource(source),
            target: entity.metadata?.url || entity.metadata?.endpoint || entity.value,
            type: entity.metadata?.vuln_type || this.inferFindingType(entity),
            status: 'open',
            evidence: entity.metadata ? JSON.stringify(entity.metadata, null, 2) : undefined,
            tags: [...(entity.tags || []), 'hunt-graph', `hunt:${this.activeHunt?.name}`],
          });

          this.emit({
            type: 'finding_created',
            source,
            data: { entity: entity.value, severity: entity.severity },
            timestamp: new Date().toISOString(),
          });
        } catch (err: any) {
          // Duplicate finding — skip silently
          if (err?.code === '23505') continue;
          console.error('[HuntCapture] Failed to bridge finding:', err);
        }
      }
    }
  }

  /**
   * Bridge discovered hosts/IPs → sentinel infrastructure assets.
   * So they get CVE-matched automatically by sentinelEngine.
   */
  private async bridgeToSentinel(entities: HuntEntity[]) {
    const hostEntities = entities.filter(e =>
      ['domain', 'subdomain', 'ip'].includes(e.type) && e.hit_count === 1 // only on first discovery
    );

    if (hostEntities.length === 0) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      for (const entity of hostEntities) {
        // Check if already exists in sentinel
        const { data: existing } = await supabase
          .from('user_infrastructure')
          .select('id')
          .eq('user_id', user.id)
          .eq('host', entity.value)
          .maybeSingle();

        if (existing) continue;

        // Create sentinel asset
        const assetType = entity.type === 'ip' ? 'server' : 'domain';
        await supabase.from('user_infrastructure').insert({
          user_id: user.id,
          host: entity.value,
          type: assetType,
          services: entity.metadata?.services || [],
          software: entity.metadata?.technologies || [],
          tags: ['auto-discovered', `hunt:${this.activeHunt?.name}`],
          status: 'active',
        });
      }
    } catch (err) {
      console.error('[HuntCapture] Failed to bridge to sentinel:', err);
    }
  }

  /**
   * Bridge high-severity flags → AlertCenter.
   * Creates alerts for critical/high auto-flagged items.
   */
  async bridgeToAlerts(entity: HuntEntity, flag: string) {
    try {
      const { alertIngestion } = await import('./alert-ingestion');

      await alertIngestion.ingestAlert({
        title: flag,
        description: `Hunt Graph auto-flag: ${entity.value}`,
        severity: entity.severity === 'critical' ? 'critical' : entity.severity === 'high' ? 'high' : 'medium',
        source: 'hunt-graph',
        raw_event: JSON.stringify({ entity: entity.value, metadata: entity.metadata, flag }),
        tags: entity.tags || [],
      });
    } catch (err) {
      console.error('[HuntCapture] Failed to bridge to alerts:', err);
    }
  }

  // ── Config ──────────────────────────────────────────────────────────────

  getConfig(): CaptureConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<CaptureConfig>) {
    this.config = { ...this.config, ...updates };
    if (updates.maxEventsPerMinute) {
      this.rateLimiter.updateLimit(updates.maxEventsPerMinute);
    }
    if (updates.dedupeWindowMs) {
      this.dedupeCache = new DedupeCache(updates.dedupeWindowMs);
    }
    if (updates.excludePatterns) {
      this.compiledExcludes = [
        ...DEFAULT_EXCLUDE,
        ...updates.excludePatterns.map(p => new RegExp(p, 'i')),
      ];
    }
  }

  // ── Status ──────────────────────────────────────────────────────────────

  getStatus(): CaptureStatus {
    return this.status;
  }

  getStats(): CaptureStats {
    return {
      ...this.stats,
      eventsPerMinute: this.rateLimiter.getRate(),
    };
  }

  getActiveHunt(): Hunt | null {
    return this.activeHunt;
  }

  isActive(): boolean {
    return this.status === 'active' && this.activeHunt !== null;
  }

  // ── Event System ────────────────────────────────────────────────────────

  on(handler: CaptureEventHandler): () => void {
    this.listeners.push(handler);
    return () => {
      this.listeners = this.listeners.filter(h => h !== handler);
    };
  }

  private emit(event: CaptureEvent) {
    for (const handler of this.listeners) {
      try {
        handler(event);
      } catch (err) {
        console.error('[HuntCapture] Event handler error:', err);
      }
    }
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  private emptyStats(): CaptureStats {
    return {
      status: 'idle',
      huntId: null,
      huntName: null,
      scope: [],
      totalCaptured: 0,
      totalFiltered: 0,
      totalFlags: 0,
      eventsPerMinute: 0,
      lastActivity: null,
      sources: {
        webhook: { enabled: this.config.webhookEnabled, count: 0 },
        terminal: { enabled: this.config.terminalEnabled, count: 0 },
        browser: { enabled: this.config.browserEnabled, count: 0 },
      },
    };
  }

  private mapSeverity(sev: Severity): string {
    const map: Record<Severity, string> = {
      critical: 'critical', high: 'high', medium: 'medium',
      low: 'low', info: 'informational', none: 'informational',
    };
    return map[sev] || 'informational';
  }

  private mapSource(source: StreamSource): string {
    const map: Record<StreamSource, string> = {
      proxy: 'burp', terminal: 'manual', browser: 'manual', manual: 'manual', ai: 'manual',
    };
    return map[source] || 'manual';
  }

  private inferFindingType(entity: HuntEntity): string {
    if (entity.tags?.includes('idor')) return 'IDOR';
    if (entity.tags?.includes('open-redirect')) return 'Open Redirect';
    if (entity.tags?.includes('error-disclosure')) return 'Information Disclosure';
    if (entity.type === 'secret') return 'Sensitive Data Exposure';
    if (entity.type === 'cookie') return 'Insecure Cookie';
    return 'Other';
  }
}

// ── Singleton ───────────────────────────────────────────────────────────────

export const huntCapture = new HuntCaptureService();
export default huntCapture;
