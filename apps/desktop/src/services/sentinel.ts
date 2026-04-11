/**
 * Sentinel AI — Autonomous Security Operations Service
 *
 * Pipeline: INGEST infrastructure → CORRELATE with CVEs → ACT on threats
 * Uses CPE (Common Platform Enumeration) strings to match user assets against CVEs.
 */

import { supabase } from '@/lib/supabase';

// ── Types ────────────────────────────────────────────────────────────────

export interface InfrastructureAsset {
  id?: string;
  user_id?: string;
  asset_type: 'host' | 'service' | 'domain' | 'cloud_asset';
  name: string;
  hostname?: string;
  ip_address?: string;
  os?: string;
  services?: ServiceEntry[];
  open_ports?: number[];
  cpe_list?: string[];
  software?: SoftwareEntry[];
  tags?: string[];
  last_scan?: string;
  status?: 'online' | 'offline' | 'unknown';
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ServiceEntry {
  port: number;
  protocol: string;
  service: string;
  version?: string;
  cpe?: string;
}

export interface SoftwareEntry {
  name: string;
  version: string;
  vendor?: string;
  cpe?: string;
}

export interface ThreatAction {
  id?: string;
  user_id?: string;
  cve_id: string;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  urgency: 'immediate' | 'urgent' | 'moderate' | 'low';
  time_to_act?: string;
  summary: string;
  matched_assets?: string[];
  affected_cpes?: string[];
  actions?: ActionItem[];
  detection_rules?: string[];
  hunt_queries?: string[];
  references?: string[];
  status: 'new' | 'investigating' | 'mitigating' | 'resolved' | 'accepted' | 'false_positive';
  created_at?: string;
  updated_at?: string;
}

export interface ActionItem {
  id: string;
  label: string;
  type: 'patch' | 'config' | 'block' | 'scan' | 'investigate' | 'monitor';
  command?: string;
  rollback?: string;
  completed: boolean;
  result?: string;
}

export interface SentinelScan {
  id?: string;
  user_id?: string;
  scan_type: 'discovery' | 'vuln_check' | 'cve_match' | 'port_scan' | 'full';
  targets: string[];
  status: 'pending' | 'running' | 'completed' | 'failed';
  findings?: Record<string, unknown>;
  new_threats?: number;
  duration_ms?: number;
  started_at?: string;
  completed_at?: string;
  created_at?: string;
}

export interface SentinelAction {
  id?: string;
  user_id?: string;
  threat_id: string;
  action_type: 'patch' | 'block' | 'config' | 'scan' | 'notify' | 'rollback';
  command?: string;
  rollback_command?: string;
  status: 'pending' | 'approved' | 'executing' | 'completed' | 'failed' | 'rolled_back';
  output?: string;
  approved_at?: string;
  executed_at?: string;
  created_at?: string;
}

// ── Service ──────────────────────────────────────────────────────────────

class SentinelService {
  private userId: string | null = null;

  private async getUserId(): Promise<string> {
    if (this.userId) return this.userId;
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw new Error('Not authenticated');
    this.userId = data.user.id;
    return this.userId;
  }

  // ── Infrastructure CRUD ──────────────────────────────────────────────

  async getAssets(): Promise<InfrastructureAsset[]> {
    const userId = await this.getUserId();
    const { data, error } = await supabase
      .from('user_infrastructure')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(this.mapAsset);
  }

  async getAsset(id: string): Promise<InfrastructureAsset | null> {
    const userId = await this.getUserId();
    const { data, error } = await supabase
      .from('user_infrastructure')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error) return null;
    return this.mapAsset(data);
  }

  async addAsset(asset: Omit<InfrastructureAsset, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<InfrastructureAsset> {
    const userId = await this.getUserId();

    // Auto-generate CPE list from services + software
    const cpeList = this.generateCPEList(asset);

    const { data, error } = await supabase
      .from('user_infrastructure')
      .insert({
        user_id: userId,
        asset_type: asset.asset_type,
        name: asset.name,
        hostname: asset.hostname || null,
        ip_address: asset.ip_address || null,
        os: asset.os || null,
        services: asset.services || [],
        open_ports: asset.open_ports || [],
        cpe_list: cpeList,
        software: asset.software || [],
        tags: asset.tags || [],
        status: asset.status || 'unknown',
        notes: asset.notes || null,
      })
      .select()
      .single();

    if (error) throw error;
    return this.mapAsset(data);
  }

  async updateAsset(id: string, updates: Partial<InfrastructureAsset>): Promise<InfrastructureAsset> {
    const userId = await this.getUserId();

    // Regenerate CPE list if services or software changed
    const updateData: Record<string, unknown> = { ...updates, updated_at: new Date().toISOString() };
    delete updateData.id;
    delete updateData.user_id;
    delete updateData.created_at;

    if (updates.services || updates.software) {
      const current = await this.getAsset(id);
      if (current) {
        const merged = { ...current, ...updates };
        updateData.cpe_list = this.generateCPEList(merged);
      }
    }

    const { data, error } = await supabase
      .from('user_infrastructure')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return this.mapAsset(data);
  }

  async deleteAsset(id: string): Promise<void> {
    const userId = await this.getUserId();
    const { error } = await supabase
      .from('user_infrastructure')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;
  }

  // ── Threat Actions ───────────────────────────────────────────────────

  async getThreats(status?: ThreatAction['status']): Promise<ThreatAction[]> {
    const userId = await this.getUserId();
    let query = supabase
      .from('threat_actions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(this.mapThreat);
  }

  async getThreat(id: string): Promise<ThreatAction | null> {
    const userId = await this.getUserId();
    const { data, error } = await supabase
      .from('threat_actions')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error) return null;
    return this.mapThreat(data);
  }

  async createThreat(threat: Omit<ThreatAction, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<ThreatAction> {
    const userId = await this.getUserId();
    const { data, error } = await supabase
      .from('threat_actions')
      .insert({ user_id: userId, ...threat })
      .select()
      .single();

    if (error) throw error;
    return this.mapThreat(data);
  }

  async updateThreatStatus(id: string, status: ThreatAction['status']): Promise<void> {
    const userId = await this.getUserId();
    const { error } = await supabase
      .from('threat_actions')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;
  }

  async updateThreatActions(id: string, actions: ActionItem[]): Promise<void> {
    const userId = await this.getUserId();
    const { error } = await supabase
      .from('threat_actions')
      .update({ actions, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;
  }

  // ── Scans ────────────────────────────────────────────────────────────

  async getScans(limit = 20): Promise<SentinelScan[]> {
    const userId = await this.getUserId();
    const { data, error } = await supabase
      .from('sentinel_scans')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  async createScan(scan: Omit<SentinelScan, 'id' | 'user_id' | 'created_at'>): Promise<SentinelScan> {
    const userId = await this.getUserId();
    const { data, error } = await supabase
      .from('sentinel_scans')
      .insert({ user_id: userId, ...scan })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateScan(id: string, updates: Partial<SentinelScan>): Promise<void> {
    const userId = await this.getUserId();
    const { error } = await supabase
      .from('sentinel_scans')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;
  }

  // ── Actions (remediation) ────────────────────────────────────────────

  async getActions(threatId?: string): Promise<SentinelAction[]> {
    const userId = await this.getUserId();
    let query = supabase
      .from('sentinel_actions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (threatId) query = query.eq('threat_id', threatId);

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  async createAction(action: Omit<SentinelAction, 'id' | 'user_id' | 'created_at'>): Promise<SentinelAction> {
    const userId = await this.getUserId();
    const { data, error } = await supabase
      .from('sentinel_actions')
      .insert({ user_id: userId, ...action })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async approveAction(id: string): Promise<void> {
    const userId = await this.getUserId();
    const { error } = await supabase
      .from('sentinel_actions')
      .update({ status: 'approved', approved_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;
  }

  // ── Realtime Subscriptions ───────────────────────────────────────────

  subscribeToThreats(callback: (threat: ThreatAction) => void): () => void {
    const channel = supabase
      .channel('sentinel-threats')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'threat_actions' }, (payload) => {
        callback(this.mapThreat(payload.new));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }

  subscribeToScans(callback: (scan: SentinelScan) => void): () => void {
    const channel = supabase
      .channel('sentinel-scans')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sentinel_scans' }, (payload) => {
        callback(payload.new as SentinelScan);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }

  // ── CPE Generation ───────────────────────────────────────────────────

  /**
   * Generate CPE 2.3 strings from services and software entries.
   * Format: cpe:2.3:a:vendor:product:version:*:*:*:*:*:*:*
   */
  generateCPEList(asset: Partial<InfrastructureAsset>): string[] {
    const cpes: string[] = [];

    // From services (applications)
    if (asset.services) {
      for (const svc of asset.services) {
        if (svc.cpe) {
          cpes.push(svc.cpe);
        } else if (svc.service && svc.version) {
          const vendor = this.guessVendor(svc.service);
          cpes.push(`cpe:2.3:a:${vendor}:${svc.service}:${svc.version}:*:*:*:*:*:*:*`);
        }
      }
    }

    // From software
    if (asset.software) {
      for (const sw of asset.software) {
        if (sw.cpe) {
          cpes.push(sw.cpe);
        } else if (sw.name && sw.version) {
          const vendor = sw.vendor || this.guessVendor(sw.name);
          cpes.push(`cpe:2.3:a:${vendor}:${sw.name.toLowerCase().replace(/\s+/g, '_')}:${sw.version}:*:*:*:*:*:*:*`);
        }
      }
    }

    // From OS (operating system)
    if (asset.os) {
      const osCpe = this.osToCP(asset.os);
      if (osCpe) cpes.push(osCpe);
    }

    return [...new Set(cpes)]; // deduplicate
  }

  // ── Stats ────────────────────────────────────────────────────────────

  async getDashboardStats(): Promise<{
    totalAssets: number;
    activeThreats: number;
    criticalThreats: number;
    recentScans: number;
    resolvedThreats: number;
  }> {
    const userId = await this.getUserId();

    const [assets, threats, scans] = await Promise.all([
      supabase.from('user_infrastructure').select('id', { count: 'exact', head: true }).eq('user_id', userId),
      supabase.from('threat_actions').select('id, severity, status').eq('user_id', userId),
      supabase.from('sentinel_scans').select('id', { count: 'exact', head: true }).eq('user_id', userId)
        .gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString()),
    ]);

    const threatData = threats.data || [];
    const activeStatuses = ['new', 'investigating', 'mitigating'];

    return {
      totalAssets: assets.count || 0,
      activeThreats: threatData.filter(t => activeStatuses.includes(t.status)).length,
      criticalThreats: threatData.filter(t => t.severity === 'critical' && activeStatuses.includes(t.status)).length,
      recentScans: scans.count || 0,
      resolvedThreats: threatData.filter(t => t.status === 'resolved').length,
    };
  }

  // ── Helpers ──────────────────────────────────────────────────────────

  private guessVendor(name: string): string {
    const vendorMap: Record<string, string> = {
      nginx: 'nginx', apache: 'apache', httpd: 'apache', openssh: 'openbsd',
      ssh: 'openbsd', mysql: 'oracle', mariadb: 'mariadb', postgres: 'postgresql',
      postgresql: 'postgresql', redis: 'redis', mongodb: 'mongodb', node: 'nodejs',
      nodejs: 'nodejs', php: 'php', python: 'python', java: 'oracle',
      tomcat: 'apache', iis: 'microsoft', docker: 'docker', kubernetes: 'kubernetes',
      elasticsearch: 'elastic', kibana: 'elastic', grafana: 'grafana',
      jenkins: 'jenkins', gitlab: 'gitlab', wordpress: 'wordpress',
      drupal: 'drupal', joomla: 'joomla', exchange: 'microsoft',
      bind: 'isc', postfix: 'postfix', dovecot: 'dovecot',
      vsftpd: 'vsftpd', proftpd: 'proftpd', openssl: 'openssl',
      chrome: 'google', firefox: 'mozilla', edge: 'microsoft',
    };
    const lower = name.toLowerCase();
    return vendorMap[lower] || lower;
  }

  private osToCP(os: string): string | null {
    const lower = os.toLowerCase();
    if (lower.includes('ubuntu')) return `cpe:2.3:o:canonical:ubuntu_linux:*:*:*:*:*:*:*:*`;
    if (lower.includes('debian')) return `cpe:2.3:o:debian:debian_linux:*:*:*:*:*:*:*:*`;
    if (lower.includes('centos')) return `cpe:2.3:o:centos:centos:*:*:*:*:*:*:*:*`;
    if (lower.includes('rhel') || lower.includes('red hat')) return `cpe:2.3:o:redhat:enterprise_linux:*:*:*:*:*:*:*:*`;
    if (lower.includes('kali')) return `cpe:2.3:o:kali:kali_linux:*:*:*:*:*:*:*:*`;
    if (lower.includes('windows server')) return `cpe:2.3:o:microsoft:windows_server:*:*:*:*:*:*:*:*`;
    if (lower.includes('windows')) return `cpe:2.3:o:microsoft:windows:*:*:*:*:*:*:*:*`;
    if (lower.includes('macos') || lower.includes('mac os')) return `cpe:2.3:o:apple:macos:*:*:*:*:*:*:*:*`;
    return null;
  }

  private mapAsset(row: any): InfrastructureAsset {
    return {
      id: row.id,
      user_id: row.user_id,
      asset_type: row.asset_type,
      name: row.name,
      hostname: row.hostname,
      ip_address: row.ip_address,
      os: row.os,
      services: row.services || [],
      open_ports: row.open_ports || [],
      cpe_list: row.cpe_list || [],
      software: row.software || [],
      tags: row.tags || [],
      last_scan: row.last_scan,
      status: row.status || 'unknown',
      notes: row.notes,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  private mapThreat(row: any): ThreatAction {
    return {
      id: row.id,
      user_id: row.user_id,
      cve_id: row.cve_id,
      title: row.title,
      severity: row.severity,
      urgency: row.urgency,
      time_to_act: row.time_to_act,
      summary: row.summary,
      matched_assets: row.matched_assets || [],
      affected_cpes: row.affected_cpes,
      actions: row.actions || [],
      detection_rules: row.detection_rules || [],
      hunt_queries: row.hunt_queries || [],
      references: row.references,
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }
}

export const sentinelService = new SentinelService();
export default sentinelService;
