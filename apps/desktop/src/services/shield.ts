import { supabase } from '@/lib/supabase';

// ── Types ──────────────────────────────────────────────

export type ThreatSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type ThreatVerdict = 'malicious' | 'suspicious' | 'clean' | 'unknown';
export type SandboxStatus = 'queued' | 'running' | 'completed' | 'failed' | 'timeout';
export type RuleType = 'yara' | 'sigma' | 'custom';
export type IOCType = 'hash_md5' | 'hash_sha1' | 'hash_sha256' | 'ip' | 'domain' | 'url' | 'email' | 'filename' | 'mutex' | 'registry';
export type SentinelModule = 'file_shield' | 'process_guard' | 'net_watch' | 'log_ingest' | 'memory_scan';

export interface ShieldThreat {
  id: string;
  user_id: string;
  hash_sha256: string;
  hash_md5?: string;
  hash_sha1?: string;
  file_name: string;
  file_size: number;
  file_type?: string;
  threat_name?: string;
  severity: ThreatSeverity;
  verdict: ThreatVerdict;
  source: string; // 'sandbox' | 'sentinel' | 'manual_scan' | 'import'
  mitre_techniques: string[];
  yara_matches: string[];
  details?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ShieldVerdict {
  id: string;
  user_id: string;
  threat_id?: string;
  file_name: string;
  file_hash: string;
  file_size: number;
  sandbox_status: SandboxStatus;
  verdict: ThreatVerdict;
  score: number; // 0-100 threat score
  duration_ms: number;
  behavior_report: BehaviorReport;
  network_iocs: NetworkIOC[];
  dropped_files: DroppedFile[];
  screenshots: string[];
  mitre_techniques: string[];
  sandbox_config: SandboxConfig;
  created_at: string;
  completed_at?: string;
}

export interface BehaviorReport {
  processes_spawned: ProcessInfo[];
  files_created: string[];
  files_modified: string[];
  files_deleted: string[];
  registry_modified: string[];
  dns_queries: string[];
  connections: NetworkConnection[];
  syscalls_suspicious: string[];
  mutexes_created: string[];
  persistence_mechanisms: string[];
  evasion_techniques: string[];
  summary: string;
}

export interface ProcessInfo {
  pid: number;
  name: string;
  cmdline: string;
  parent_pid: number;
  parent_name: string;
  is_suspicious: boolean;
  reason?: string;
}

export interface NetworkIOC {
  type: 'ip' | 'domain' | 'url';
  value: string;
  direction: 'outbound' | 'inbound';
  port?: number;
  protocol?: string;
  is_known_bad: boolean;
}

export interface NetworkConnection {
  dst_ip: string;
  dst_port: number;
  protocol: string;
  bytes_sent: number;
  bytes_recv: number;
  domain?: string;
}

export interface DroppedFile {
  path: string;
  hash: string;
  size: number;
  type: string;
  is_malicious: boolean;
}

export interface SandboxConfig {
  timeout_seconds: number;
  network_enabled: boolean;
  image: string; // container image name
  analysis_modules: string[];
}

export interface ShieldRule {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  type: RuleType;
  content: string; // YARA/Sigma rule content
  enabled: boolean;
  hit_count: number;
  last_hit?: string;
  tags: string[];
  severity: ThreatSeverity;
  source: string; // 'builtin' | 'community' | 'custom' | 'import'
  created_at: string;
  updated_at: string;
}

export interface ShieldIOC {
  id: string;
  user_id: string;
  type: IOCType;
  value: string;
  threat_name?: string;
  source: string;
  confidence: number; // 0-100
  tags: string[];
  first_seen: string;
  last_seen: string;
  hit_count: number;
  is_active: boolean;
  created_at: string;
}

export interface ShieldQuarantine {
  id: string;
  user_id: string;
  threat_id?: string;
  original_path: string;
  file_name: string;
  file_hash: string;
  file_size: number;
  threat_name?: string;
  severity: ThreatSeverity;
  quarantined_at: string;
  restored: boolean;
  restored_at?: string;
  auto_delete_at?: string;
}

export interface ShieldEvent {
  id: string;
  user_id: string;
  timestamp: string;
  module: SentinelModule;
  severity: ThreatSeverity;
  title: string;
  details: Record<string, unknown>;
  process_name?: string;
  process_pid?: number;
  file_path?: string;
  resolved: boolean;
  resolved_at?: string;
}

export interface ShieldStats {
  threats_total: number;
  threats_today: number;
  threats_by_severity: Record<ThreatSeverity, number>;
  sandbox_runs_total: number;
  sandbox_runs_today: number;
  verdicts_malicious: number;
  verdicts_suspicious: number;
  verdicts_clean: number;
  rules_total: number;
  rules_enabled: number;
  iocs_total: number;
  quarantine_count: number;
  sentinel_uptime?: number;
  sentinel_status: 'active' | 'inactive' | 'error';
  events_today: number;
  last_scan?: string;
}

// ── Create DTOs ──────────────────────────────────────────

export interface CreateThreatData {
  hash_sha256: string;
  hash_md5?: string;
  hash_sha1?: string;
  file_name: string;
  file_size: number;
  file_type?: string;
  threat_name?: string;
  severity: ThreatSeverity;
  verdict: ThreatVerdict;
  source: string;
  mitre_techniques?: string[];
  yara_matches?: string[];
  details?: Record<string, unknown>;
}

export interface CreateVerdictData {
  file_name: string;
  file_hash: string;
  file_size: number;
  sandbox_config?: Partial<SandboxConfig>;
}

export interface CreateRuleData {
  name: string;
  description?: string;
  type: RuleType;
  content: string;
  severity: ThreatSeverity;
  tags?: string[];
  source?: string;
}

export interface CreateIOCData {
  type: IOCType;
  value: string;
  threat_name?: string;
  source: string;
  confidence?: number;
  tags?: string[];
}

// ── Service ──────────────────────────────────────────────

class ShieldService {
  // ── Threats ──

  async getThreats(limit = 100): Promise<ShieldThreat[]> {
    const { data, error } = await supabase
      .from('shield_threats')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw new Error(`Failed to fetch threats: ${error.message}`);
    return data || [];
  }

  async getThreat(id: string): Promise<ShieldThreat> {
    const { data, error } = await supabase
      .from('shield_threats')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw new Error(`Failed to fetch threat: ${error.message}`);
    return data;
  }

  async createThreat(threatData: CreateThreatData): Promise<ShieldThreat> {
    const { data: { session: _s } } = await supabase.auth.getSession();
    const user = _s?.user ?? null;
    const userError = user ? null : new Error("Not authenticated");
    if (userError || !user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('shield_threats')
      .insert({
        user_id: user.id,
        mitre_techniques: [],
        yara_matches: [],
        ...threatData,
      })
      .select()
      .single();
    if (error) throw new Error(`Failed to create threat: ${error.message}`);
    return data;
  }

  async deleteThreat(id: string): Promise<void> {
    const { error } = await supabase
      .from('shield_threats')
      .delete()
      .eq('id', id);
    if (error) throw new Error(`Failed to delete threat: ${error.message}`);
  }

  // ── Verdicts (Sandbox) ──

  async getVerdicts(limit = 50): Promise<ShieldVerdict[]> {
    const { data, error } = await supabase
      .from('shield_verdicts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw new Error(`Failed to fetch verdicts: ${error.message}`);
    return data || [];
  }

  async getVerdict(id: string): Promise<ShieldVerdict> {
    const { data, error } = await supabase
      .from('shield_verdicts')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw new Error(`Failed to fetch verdict: ${error.message}`);
    return data;
  }

  async createVerdict(verdictData: CreateVerdictData): Promise<ShieldVerdict> {
    const { data: { session: _s } } = await supabase.auth.getSession();
    const user = _s?.user ?? null;
    const userError = user ? null : new Error("Not authenticated");
    if (userError || !user) throw new Error('User not authenticated');

    const defaultConfig: SandboxConfig = {
      timeout_seconds: 60,
      network_enabled: false,
      image: 'crowbyte-shield-sandbox:latest',
      analysis_modules: ['yara', 'strace', 'network', 'filesystem'],
    };

    const { data, error } = await supabase
      .from('shield_verdicts')
      .insert({
        user_id: user.id,
        file_name: verdictData.file_name,
        file_hash: verdictData.file_hash,
        file_size: verdictData.file_size,
        sandbox_status: 'queued' as SandboxStatus,
        verdict: 'unknown' as ThreatVerdict,
        score: 0,
        duration_ms: 0,
        behavior_report: { processes_spawned: [], files_created: [], files_modified: [], files_deleted: [], registry_modified: [], dns_queries: [], connections: [], syscalls_suspicious: [], mutexes_created: [], persistence_mechanisms: [], evasion_techniques: [], summary: '' },
        network_iocs: [],
        dropped_files: [],
        screenshots: [],
        mitre_techniques: [],
        sandbox_config: { ...defaultConfig, ...verdictData.sandbox_config },
      })
      .select()
      .single();
    if (error) throw new Error(`Failed to create verdict: ${error.message}`);
    return data;
  }

  async updateVerdict(id: string, updates: Partial<ShieldVerdict>): Promise<ShieldVerdict> {
    const { data, error } = await supabase
      .from('shield_verdicts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(`Failed to update verdict: ${error.message}`);
    return data;
  }

  // ── Rules ──

  async getRules(): Promise<ShieldRule[]> {
    const { data, error } = await supabase
      .from('shield_rules')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw new Error(`Failed to fetch rules: ${error.message}`);
    return data || [];
  }

  async createRule(ruleData: CreateRuleData): Promise<ShieldRule> {
    const { data: { session: _s } } = await supabase.auth.getSession();
    const user = _s?.user ?? null;
    const userError = user ? null : new Error("Not authenticated");
    if (userError || !user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('shield_rules')
      .insert({
        user_id: user.id,
        enabled: true,
        hit_count: 0,
        tags: [],
        source: 'custom',
        ...ruleData,
      })
      .select()
      .single();
    if (error) throw new Error(`Failed to create rule: ${error.message}`);
    return data;
  }

  async updateRule(id: string, updates: Partial<ShieldRule>): Promise<ShieldRule> {
    const { data, error } = await supabase
      .from('shield_rules')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(`Failed to update rule: ${error.message}`);
    return data;
  }

  async toggleRule(id: string, enabled: boolean): Promise<void> {
    const { error } = await supabase
      .from('shield_rules')
      .update({ enabled, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw new Error(`Failed to toggle rule: ${error.message}`);
  }

  async deleteRule(id: string): Promise<void> {
    const { error } = await supabase
      .from('shield_rules')
      .delete()
      .eq('id', id);
    if (error) throw new Error(`Failed to delete rule: ${error.message}`);
  }

  // ── IOCs ──

  async getIOCs(limit = 200): Promise<ShieldIOC[]> {
    const { data, error } = await supabase
      .from('shield_iocs')
      .select('*')
      .order('last_seen', { ascending: false })
      .limit(limit);
    if (error) throw new Error(`Failed to fetch IOCs: ${error.message}`);
    return data || [];
  }

  async createIOC(iocData: CreateIOCData): Promise<ShieldIOC> {
    const { data: { session: _s } } = await supabase.auth.getSession();
    const user = _s?.user ?? null;
    const userError = user ? null : new Error("Not authenticated");
    if (userError || !user) throw new Error('User not authenticated');

    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('shield_iocs')
      .insert({
        user_id: user.id,
        confidence: 50,
        tags: [],
        first_seen: now,
        last_seen: now,
        hit_count: 0,
        is_active: true,
        ...iocData,
      })
      .select()
      .single();
    if (error) throw new Error(`Failed to create IOC: ${error.message}`);
    return data;
  }

  async bulkImportIOCs(iocs: CreateIOCData[]): Promise<number> {
    const { data: { session: _s } } = await supabase.auth.getSession();
    const user = _s?.user ?? null;
    const userError = user ? null : new Error("Not authenticated");
    if (userError || !user) throw new Error('User not authenticated');

    const now = new Date().toISOString();
    const rows = iocs.map(ioc => ({
      user_id: user.id,
      confidence: 50,
      tags: [],
      first_seen: now,
      last_seen: now,
      hit_count: 0,
      is_active: true,
      ...ioc,
    }));

    const { data, error } = await supabase
      .from('shield_iocs')
      .insert(rows)
      .select();
    if (error) throw new Error(`Failed to bulk import IOCs: ${error.message}`);
    return data?.length || 0;
  }

  // ── Quarantine ──

  async getQuarantine(): Promise<ShieldQuarantine[]> {
    const { data, error } = await supabase
      .from('shield_quarantine')
      .select('*')
      .order('quarantined_at', { ascending: false });
    if (error) throw new Error(`Failed to fetch quarantine: ${error.message}`);
    return data || [];
  }

  async restoreQuarantine(id: string): Promise<void> {
    const { error } = await supabase
      .from('shield_quarantine')
      .update({ restored: true, restored_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw new Error(`Failed to restore from quarantine: ${error.message}`);
  }

  async deleteQuarantine(id: string): Promise<void> {
    const { error } = await supabase
      .from('shield_quarantine')
      .delete()
      .eq('id', id);
    if (error) throw new Error(`Failed to delete quarantine entry: ${error.message}`);
  }

  // ── Events ──

  async getEvents(limit = 100, module?: SentinelModule): Promise<ShieldEvent[]> {
    let query = supabase
      .from('shield_events')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (module) query = query.eq('module', module);

    const { data, error } = await query;
    if (error) throw new Error(`Failed to fetch events: ${error.message}`);
    return data || [];
  }

  async resolveEvent(id: string): Promise<void> {
    const { error } = await supabase
      .from('shield_events')
      .update({ resolved: true, resolved_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw new Error(`Failed to resolve event: ${error.message}`);
  }

  // ── Stats ──

  async getStats(): Promise<ShieldStats> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    const [threats, threatsToday, verdicts, verdictsToday, rules, iocs, quarantine, events] = await Promise.all([
      supabase.from('shield_threats').select('id, severity', { count: 'exact' }),
      supabase.from('shield_threats').select('id', { count: 'exact' }).gte('created_at', todayISO),
      supabase.from('shield_verdicts').select('id, verdict', { count: 'exact' }),
      supabase.from('shield_verdicts').select('id', { count: 'exact' }).gte('created_at', todayISO),
      supabase.from('shield_rules').select('id, enabled', { count: 'exact' }),
      supabase.from('shield_iocs').select('id', { count: 'exact' }).eq('is_active', true),
      supabase.from('shield_quarantine').select('id', { count: 'exact' }).eq('restored', false),
      supabase.from('shield_events').select('id', { count: 'exact' }).gte('timestamp', todayISO),
    ]);

    const threatsBySeverity: Record<ThreatSeverity, number> = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    (threats.data || []).forEach((t: { severity: ThreatSeverity }) => {
      threatsBySeverity[t.severity] = (threatsBySeverity[t.severity] || 0) + 1;
    });

    const verdictCounts = { malicious: 0, suspicious: 0, clean: 0 };
    (verdicts.data || []).forEach((v: { verdict: string }) => {
      if (v.verdict in verdictCounts) verdictCounts[v.verdict as keyof typeof verdictCounts]++;
    });

    const enabledRules = (rules.data || []).filter((r: { enabled: boolean }) => r.enabled).length;

    return {
      threats_total: threats.count || 0,
      threats_today: threatsToday.count || 0,
      threats_by_severity: threatsBySeverity,
      sandbox_runs_total: verdicts.count || 0,
      sandbox_runs_today: verdictsToday.count || 0,
      verdicts_malicious: verdictCounts.malicious,
      verdicts_suspicious: verdictCounts.suspicious,
      verdicts_clean: verdictCounts.clean,
      rules_total: rules.count || 0,
      rules_enabled: enabledRules,
      iocs_total: iocs.count || 0,
      quarantine_count: quarantine.count || 0,
      sentinel_status: 'inactive',
      events_today: events.count || 0,
    };
  }
}

export const shieldService = new ShieldService();
export default shieldService;
