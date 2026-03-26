/**
 * Alert Ingestion & SIEM Bridge Service
 * Phase 6 of the Cybersecurity Gaps Integration Plan.
 *
 * Cross-vendor alert ingestion, normalization, correlation, and investigation timelines.
 * Connects: Splunk, Elastic, Sentinel, CrowdStrike, Syslog, Webhooks, PagerDuty.
 *
 * "87% of incidents require 2+ data sources. We unify them all."
 */

import { supabase } from '@/lib/supabase';
import { findingsEngine, type CreateFindingData } from './findings-engine';

// ─── Types ────────────────────────────────────────────────────────────────────

export type SourceType = 'splunk' | 'elastic' | 'sentinel' | 'crowdstrike' | 'syslog' | 'webhook' | 'pagerduty' | 'manual';
export type SourceStatus = 'connected' | 'disconnected' | 'error' | 'syncing';
export type AlertStatus = 'new' | 'triaging' | 'escalated' | 'resolved' | 'false_positive';
export type TimelineStatus = 'active' | 'closed' | 'archived';

export interface AlertSource {
  id: string;
  user_id: string;
  name: string;
  source_type: SourceType;
  connection_config: ConnectionConfig;
  status: SourceStatus;
  last_seen_at?: string;
  alerts_ingested: number;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface ConnectionConfig {
  url?: string;
  api_key?: string;
  token?: string;
  username?: string;
  index?: string;
  port?: number;
  workspace_id?: string;
  client_id?: string;
  poll_interval_ms?: number;
  filters?: Record<string, string>;
}

export interface Alert {
  id: string;
  user_id: string;
  source_id?: string;
  title: string;
  description?: string;
  severity: string;
  source_type: SourceType;
  original_id?: string;
  original_data: Record<string, unknown>;
  affected_host?: string;
  affected_user?: string;
  source_ip?: string;
  dest_ip?: string;
  mitre_tactics: string[];
  mitre_techniques: string[];
  status: AlertStatus;
  assigned_to?: string;
  correlation_group_id?: string;
  finding_id?: string;
  alert_time: string;
  ingested_at: string;
  resolved_at?: string;
}

export interface InvestigationTimeline {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  alert_ids: string[];
  finding_ids: string[];
  timeline_events: TimelineEvent[];
  status: TimelineStatus;
  severity: string;
  lead_analyst?: string;
  created_at: string;
  updated_at: string;
}

export interface TimelineEvent {
  id: string;
  timestamp: string;
  source: string;
  event_type: string;
  title: string;
  description?: string;
  severity?: string;
  data?: Record<string, unknown>;
}

export interface CreateAlertData {
  title: string;
  description?: string;
  severity: string;
  source_type: SourceType;
  source_id?: string;
  original_id?: string;
  original_data?: Record<string, unknown>;
  affected_host?: string;
  affected_user?: string;
  source_ip?: string;
  dest_ip?: string;
  mitre_tactics?: string[];
  mitre_techniques?: string[];
  alert_time: string;
}

export interface CorrelationGroup {
  id: string;
  alerts: Alert[];
  severity: string;
  affected_hosts: string[];
  affected_users: string[];
  mitre_tactics: string[];
  time_range: { start: string; end: string };
  description: string;
}

// ─── Normalizers ─────────────────────────────────────────────────────────────

const NORMALIZERS: Record<string, (raw: Record<string, unknown>) => Partial<CreateAlertData>> = {
  splunk: (raw) => ({
    title: String(raw.search_name || raw._raw?.toString().slice(0, 100) || 'Splunk Alert'),
    description: String(raw.result?.description || raw._raw || ''),
    severity: normalizeSeverity(String(raw.severity || raw.urgency || 'medium')),
    affected_host: String(raw.result?.host || raw.host || raw.dest || ''),
    affected_user: String(raw.result?.user || ''),
    source_ip: String(raw.result?.src_ip || raw.src || ''),
    dest_ip: String(raw.result?.dest_ip || raw.dest || ''),
    alert_time: String(raw._time || raw.result?._time || new Date().toISOString()),
    original_data: raw,
  }),

  elastic: (raw) => ({
    title: String(raw.rule?.name || raw.signal?.rule?.name || raw._source?.message?.slice(0, 100) || 'Elastic Alert'),
    description: String(raw.rule?.description || raw.signal?.rule?.description || ''),
    severity: normalizeSeverity(String(raw.rule?.severity || raw.signal?.rule?.severity || 'medium')),
    affected_host: String(raw.host?.name || raw._source?.host?.name || ''),
    affected_user: String(raw.user?.name || raw._source?.user?.name || ''),
    source_ip: String(raw.source?.ip || raw._source?.source?.ip || ''),
    dest_ip: String(raw.destination?.ip || raw._source?.destination?.ip || ''),
    mitre_tactics: extractArray(raw.rule?.threat, 'tactic.name'),
    mitre_techniques: extractArray(raw.rule?.threat, 'technique.name'),
    alert_time: String(raw['@timestamp'] || raw._source?.['@timestamp'] || new Date().toISOString()),
    original_data: raw,
  }),

  sentinel: (raw) => ({
    title: String(raw.AlertName || raw.properties?.alertDisplayName || 'Sentinel Alert'),
    description: String(raw.Description || raw.properties?.description || ''),
    severity: normalizeSeverity(String(raw.Severity || raw.properties?.severity || 'medium')),
    affected_host: String(raw.CompromisedEntity || raw.properties?.compromisedEntity || ''),
    source_ip: String(raw.properties?.sourceAddress || ''),
    dest_ip: String(raw.properties?.destinationAddress || ''),
    mitre_tactics: asArray(raw.Tactics || raw.properties?.tactics),
    mitre_techniques: asArray(raw.Techniques || raw.properties?.techniques),
    alert_time: String(raw.TimeGenerated || raw.properties?.startTimeUtc || new Date().toISOString()),
    original_data: raw,
  }),

  crowdstrike: (raw) => ({
    title: String(raw.display_name || raw.description?.slice(0, 100) || 'CrowdStrike Detection'),
    description: String(raw.description || ''),
    severity: normalizeCSSeverity(Number(raw.max_severity || raw.severity || 3)),
    affected_host: String(raw.device?.hostname || raw.hostname || ''),
    affected_user: String(raw.device?.machine_domain || ''),
    source_ip: String(raw.device?.external_ip || ''),
    mitre_tactics: asArray(raw.tactics),
    mitre_techniques: asArray(raw.techniques),
    alert_time: String(raw.created_timestamp || raw.timestamp || new Date().toISOString()),
    original_data: raw,
  }),

  pagerduty: (raw) => ({
    title: String(raw.incident?.title || raw.title || 'PagerDuty Incident'),
    description: String(raw.incident?.description || raw.description || ''),
    severity: normalizeSeverity(String(raw.incident?.urgency || raw.severity || 'medium')),
    alert_time: String(raw.incident?.created_at || raw.created_at || new Date().toISOString()),
    original_data: raw,
  }),

  syslog: (raw) => ({
    title: String(raw.message?.slice(0, 120) || raw.msg || 'Syslog Message'),
    description: String(raw.message || raw.msg || ''),
    severity: normalizeSyslogSeverity(Number(raw.severity || raw.priority || 6)),
    affected_host: String(raw.hostname || raw.host || ''),
    source_ip: String(raw.source_ip || raw.fromhost_ip || ''),
    alert_time: String(raw.timestamp || raw['@timestamp'] || new Date().toISOString()),
    original_data: raw,
  }),

  webhook: (raw) => ({
    title: String(raw.title || raw.name || raw.alert || 'Webhook Alert'),
    description: String(raw.description || raw.message || raw.body || ''),
    severity: normalizeSeverity(String(raw.severity || raw.priority || 'medium')),
    affected_host: String(raw.host || raw.hostname || raw.target || ''),
    source_ip: String(raw.source_ip || raw.src || ''),
    alert_time: String(raw.timestamp || raw.time || raw.created_at || new Date().toISOString()),
    original_data: raw,
  }),

  manual: (raw) => ({
    title: String(raw.title || 'Manual Alert'),
    description: String(raw.description || ''),
    severity: normalizeSeverity(String(raw.severity || 'medium')),
    affected_host: String(raw.host || ''),
    alert_time: String(raw.alert_time || new Date().toISOString()),
    original_data: raw,
  }),
};

// ─── Severity Helpers ────────────────────────────────────────────────────────

function normalizeSeverity(sev: string): string {
  const s = sev.toLowerCase().trim();
  if (['critical', 'crit', '1', 'p1', 'urgent'].includes(s)) return 'critical';
  if (['high', '2', 'p2', 'major'].includes(s)) return 'high';
  if (['medium', 'med', '3', 'p3', 'warning', 'warn'].includes(s)) return 'medium';
  if (['low', '4', 'p4', 'minor'].includes(s)) return 'low';
  if (['info', 'informational', '5', 'p5', 'notice'].includes(s)) return 'info';
  return 'medium';
}

function normalizeCSSeverity(num: number): string {
  if (num >= 80) return 'critical';
  if (num >= 60) return 'high';
  if (num >= 40) return 'medium';
  if (num >= 20) return 'low';
  return 'info';
}

function normalizeSyslogSeverity(priority: number): string {
  const severity = priority % 8;
  if (severity <= 1) return 'critical';
  if (severity <= 2) return 'critical';
  if (severity <= 3) return 'high';
  if (severity <= 4) return 'medium';
  if (severity <= 5) return 'low';
  return 'info';
}

function extractArray(threats: unknown, path: string): string[] {
  if (!Array.isArray(threats)) return [];
  const parts = path.split('.');
  return threats.map(t => {
    let val: unknown = t;
    for (const p of parts) val = (val as Record<string, unknown>)?.[p];
    return String(val || '');
  }).filter(Boolean);
}

function asArray(val: unknown): string[] {
  if (Array.isArray(val)) return val.map(String);
  if (typeof val === 'string') return val.split(',').map(s => s.trim()).filter(Boolean);
  return [];
}

// ─── Service ──────────────────────────────────────────────────────────────────

class AlertIngestion {

  // ─── Source CRUD ────────────────────────────────────────────────────────────

  async createSource(data: { name: string; source_type: SourceType; connection_config: ConnectionConfig }): Promise<AlertSource> {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error('Not authenticated');

    const { data: source, error } = await supabase
      .from('alert_sources')
      .insert({ user_id: user.id, ...data, status: 'disconnected' })
      .select()
      .single();

    if (error) throw new Error(`Failed to create source: ${error.message}`);
    return source;
  }

  async getSources(): Promise<AlertSource[]> {
    const { data, error } = await supabase
      .from('alert_sources')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw new Error(`Failed to fetch sources: ${error.message}`);
    return data || [];
  }

  async updateSource(id: string, updates: Partial<AlertSource>): Promise<AlertSource> {
    const { data, error } = await supabase
      .from('alert_sources')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(`Failed to update source: ${error.message}`);
    return data;
  }

  async deleteSource(id: string): Promise<void> {
    const { error } = await supabase.from('alert_sources').delete().eq('id', id);
    if (error) throw new Error(`Failed to delete source: ${error.message}`);
  }

  async testConnection(sourceId: string): Promise<{ success: boolean; message: string }> {
    const source = await this.getSourceById(sourceId);
    const config = source.connection_config;

    try {
      switch (source.source_type) {
        case 'splunk': {
          if (!config.url) throw new Error('Missing Splunk URL');
          const res = await fetch(`${config.url}/services/server/info`, {
            headers: { Authorization: `Bearer ${config.token || config.api_key}` },
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          await this.updateSource(sourceId, { status: 'connected', last_seen_at: new Date().toISOString(), error_message: undefined } as Partial<AlertSource>);
          return { success: true, message: 'Splunk connection verified' };
        }
        case 'elastic': {
          if (!config.url) throw new Error('Missing Elastic URL');
          const res = await fetch(`${config.url}/_cluster/health`, {
            headers: config.api_key ? { Authorization: `ApiKey ${config.api_key}` } : {},
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          await this.updateSource(sourceId, { status: 'connected', last_seen_at: new Date().toISOString(), error_message: undefined } as Partial<AlertSource>);
          return { success: true, message: 'Elastic connection verified' };
        }
        default:
          await this.updateSource(sourceId, { status: 'connected', last_seen_at: new Date().toISOString() });
          return { success: true, message: `${source.source_type} source registered` };
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Connection failed';
      await this.updateSource(sourceId, { status: 'error', error_message: msg });
      return { success: false, message: msg };
    }
  }

  private async getSourceById(id: string): Promise<AlertSource> {
    const { data, error } = await supabase.from('alert_sources').select('*').eq('id', id).single();
    if (error) throw new Error(`Source not found: ${error.message}`);
    return data;
  }

  // ─── Alert Ingestion ───────────────────────────────────────────────────────

  async ingestAlert(sourceType: SourceType, rawData: Record<string, unknown>, sourceId?: string): Promise<Alert> {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error('Not authenticated');

    const normalizer = NORMALIZERS[sourceType] || NORMALIZERS.manual;
    const normalized = normalizer(rawData);

    const { data: alert, error } = await supabase
      .from('alerts')
      .insert({
        user_id: user.id,
        source_id: sourceId || null,
        source_type: sourceType,
        title: normalized.title || 'Unknown Alert',
        description: normalized.description,
        severity: normalized.severity || 'medium',
        original_id: normalized.original_data?.id ? String(normalized.original_data.id) : undefined,
        original_data: normalized.original_data || rawData,
        affected_host: normalized.affected_host,
        affected_user: normalized.affected_user,
        source_ip: normalized.source_ip,
        dest_ip: normalized.dest_ip,
        mitre_tactics: normalized.mitre_tactics || [],
        mitre_techniques: normalized.mitre_techniques || [],
        alert_time: normalized.alert_time || new Date().toISOString(),
        status: 'new',
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to ingest alert: ${error.message}`);

    // Update source counter
    if (sourceId) {
      const source = await this.getSourceById(sourceId);
      await this.updateSource(sourceId, {
        alerts_ingested: source.alerts_ingested + 1,
        last_seen_at: new Date().toISOString(),
      });
    }

    return alert;
  }

  async ingestBatch(sourceType: SourceType, alerts: Record<string, unknown>[], sourceId?: string): Promise<Alert[]> {
    const results: Alert[] = [];
    for (const raw of alerts) {
      try {
        const alert = await this.ingestAlert(sourceType, raw, sourceId);
        results.push(alert);
      } catch { /* continue */ }
    }
    return results;
  }

  // ─── Alert CRUD ────────────────────────────────────────────────────────────

  async getAlerts(filters?: {
    status?: AlertStatus;
    severity?: string;
    source_type?: SourceType;
    search?: string;
    limit?: number;
  }): Promise<Alert[]> {
    let query = supabase.from('alerts').select('*').order('alert_time', { ascending: false });

    if (filters?.status) query = query.eq('status', filters.status);
    if (filters?.severity) query = query.eq('severity', filters.severity);
    if (filters?.source_type) query = query.eq('source_type', filters.source_type);
    if (filters?.search) query = query.or(`title.ilike.%${filters.search}%,affected_host.ilike.%${filters.search}%`);
    if (filters?.limit) query = query.limit(filters.limit);
    else query = query.limit(200);

    const { data, error } = await query;
    if (error) throw new Error(`Failed to fetch alerts: ${error.message}`);
    return data || [];
  }

  async updateAlert(id: string, updates: Partial<Alert>): Promise<Alert> {
    const { data, error } = await supabase
      .from('alerts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(`Failed to update alert: ${error.message}`);
    return data;
  }

  async resolveAlert(id: string, status: 'resolved' | 'false_positive'): Promise<void> {
    await this.updateAlert(id, { status, resolved_at: new Date().toISOString() });
  }

  /** Escalate alert to a finding in the Findings Engine */
  async escalateToFinding(alertId: string): Promise<string> {
    const { data: alert } = await supabase.from('alerts').select('*').eq('id', alertId).single();
    if (!alert) throw new Error('Alert not found');

    const findingData: CreateFindingData = {
      title: alert.title,
      description: alert.description || `Escalated from ${alert.source_type} alert`,
      target_host: alert.affected_host || alert.source_ip || 'unknown',
      severity: alert.severity as 'critical' | 'high' | 'medium' | 'low' | 'info',
      finding_type: 'vuln',
      source: 'import',
      tags: ['escalated-alert', `source:${alert.source_type}`],
      cve_ids: [],
      cwe_ids: [],
    };

    const finding = await findingsEngine.ingestManual(findingData);
    await this.updateAlert(alertId, { status: 'escalated', finding_id: finding.id });
    return finding.id;
  }

  // ─── Correlation ───────────────────────────────────────────────────────────

  async correlateAlerts(timeWindowMinutes = 15): Promise<CorrelationGroup[]> {
    const alerts = await this.getAlerts({ status: 'new', limit: 500 });
    if (alerts.length === 0) return [];

    const groups: CorrelationGroup[] = [];
    const assigned = new Set<string>();

    // Sort by time
    const sorted = [...alerts].sort((a, b) =>
      new Date(a.alert_time).getTime() - new Date(b.alert_time).getTime()
    );

    for (const alert of sorted) {
      if (assigned.has(alert.id)) continue;

      const windowEnd = new Date(new Date(alert.alert_time).getTime() + timeWindowMinutes * 60000);
      const related = sorted.filter(a =>
        !assigned.has(a.id) &&
        new Date(a.alert_time) <= windowEnd &&
        (a.affected_host === alert.affected_host ||
         a.source_ip === alert.source_ip ||
         a.dest_ip === alert.dest_ip ||
         a.affected_user === alert.affected_user)
      );

      if (related.length >= 2) {
        const groupId = crypto.randomUUID();
        const group: CorrelationGroup = {
          id: groupId,
          alerts: related,
          severity: this.highestSeverity(related),
          affected_hosts: [...new Set(related.map(a => a.affected_host).filter(Boolean) as string[])],
          affected_users: [...new Set(related.map(a => a.affected_user).filter(Boolean) as string[])],
          mitre_tactics: [...new Set(related.flatMap(a => a.mitre_tactics))],
          time_range: {
            start: related[0].alert_time,
            end: related[related.length - 1].alert_time,
          },
          description: `${related.length} correlated alerts affecting ${[...new Set(related.map(a => a.affected_host).filter(Boolean))].join(', ')}`,
        };

        groups.push(group);

        for (const a of related) {
          assigned.add(a.id);
          await this.updateAlert(a.id, { correlation_group_id: groupId });
        }
      }
    }

    return groups;
  }

  private highestSeverity(alerts: Alert[]): string {
    const order = ['critical', 'high', 'medium', 'low', 'info'];
    for (const sev of order) {
      if (alerts.some(a => a.severity === sev)) return sev;
    }
    return 'medium';
  }

  // ─── Investigation Timelines ───────────────────────────────────────────────

  async createTimeline(data: {
    name: string;
    description?: string;
    alert_ids?: string[];
    finding_ids?: string[];
    severity?: string;
  }): Promise<InvestigationTimeline> {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error('Not authenticated');

    // Build initial events from alerts
    const events: TimelineEvent[] = [];
    if (data.alert_ids?.length) {
      for (const aid of data.alert_ids) {
        const { data: alert } = await supabase.from('alerts').select('*').eq('id', aid).single();
        if (alert) {
          events.push({
            id: crypto.randomUUID(),
            timestamp: alert.alert_time,
            source: alert.source_type,
            event_type: 'alert',
            title: alert.title,
            description: alert.description,
            severity: alert.severity,
            data: { alert_id: alert.id },
          });
        }
      }
    }

    events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const { data: timeline, error } = await supabase
      .from('investigation_timelines')
      .insert({
        user_id: user.id,
        name: data.name,
        description: data.description,
        alert_ids: data.alert_ids || [],
        finding_ids: data.finding_ids || [],
        timeline_events: events,
        status: 'active',
        severity: data.severity || 'medium',
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create timeline: ${error.message}`);
    return timeline;
  }

  async getTimelines(): Promise<InvestigationTimeline[]> {
    const { data, error } = await supabase
      .from('investigation_timelines')
      .select('*')
      .order('updated_at', { ascending: false });
    if (error) throw new Error(`Failed to fetch timelines: ${error.message}`);
    return data || [];
  }

  async addTimelineEvent(timelineId: string, event: Omit<TimelineEvent, 'id'>): Promise<void> {
    const { data: timeline } = await supabase
      .from('investigation_timelines')
      .select('timeline_events')
      .eq('id', timelineId)
      .single();

    if (!timeline) throw new Error('Timeline not found');

    const events = [...(timeline.timeline_events || []), { ...event, id: crypto.randomUUID() }];
    events.sort((a: TimelineEvent, b: TimelineEvent) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    await supabase
      .from('investigation_timelines')
      .update({ timeline_events: events, updated_at: new Date().toISOString() })
      .eq('id', timelineId);
  }

  async closeTimeline(id: string): Promise<void> {
    await supabase
      .from('investigation_timelines')
      .update({ status: 'closed', updated_at: new Date().toISOString() })
      .eq('id', id);
  }

  // ─── Stats ─────────────────────────────────────────────────────────────────

  async getStats(): Promise<{
    total_alerts: number;
    new_alerts: number;
    sources_connected: number;
    active_timelines: number;
    by_severity: Record<string, number>;
    by_source: Record<string, number>;
  }> {
    const [alerts, sources, timelines] = await Promise.all([
      this.getAlerts({ limit: 1000 }),
      this.getSources(),
      this.getTimelines(),
    ]);

    const by_severity: Record<string, number> = {};
    const by_source: Record<string, number> = {};

    for (const a of alerts) {
      by_severity[a.severity] = (by_severity[a.severity] || 0) + 1;
      by_source[a.source_type] = (by_source[a.source_type] || 0) + 1;
    }

    return {
      total_alerts: alerts.length,
      new_alerts: alerts.filter(a => a.status === 'new').length,
      sources_connected: sources.filter(s => s.status === 'connected').length,
      active_timelines: timelines.filter(t => t.status === 'active').length,
      by_severity,
      by_source,
    };
  }
}

// Export singleton
export const alertIngestion = new AlertIngestion();
export default alertIngestion;
