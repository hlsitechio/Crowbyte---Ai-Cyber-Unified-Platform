/**
 * Findings Engine Service
 * Unified findings database — ALL tool outputs normalize here.
 * Phase 1 of the Cybersecurity Gaps Integration Plan.
 *
 * Every scan (nmap, nuclei, sqlmap, burp, shodan, manual) produces
 * normalized findings in a single schema. Cross-tool correlation,
 * dedup, and attack chain detection built in.
 */

import { supabase } from '@/lib/supabase';
import { pgOr } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

export type FindingSource = 'nmap' | 'nuclei' | 'sqlmap' | 'burp' | 'shodan' | 'manual' | 'dalfox' | 'ffuf' | 'nikto' | 'masscan' | 'import';
export type FindingType = 'vuln' | 'misconfig' | 'info' | 'exposure' | 'credential' | 'service';
export type FindingSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type FindingStatus = 'open' | 'confirmed' | 'false_positive' | 'resolved' | 'accepted_risk' | 'duplicate';
export type TriagedBy = 'human' | 'ai' | 'auto-rule';
export type ScanStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface Finding {
  id: string;
  user_id: string;

  // Source
  source: FindingSource;
  source_scan_id?: string;
  source_raw?: Record<string, unknown>;

  // Target
  target_host: string;
  target_port?: number;
  target_url?: string;
  target_protocol?: string;

  // Finding
  title: string;
  description?: string;
  finding_type: FindingType;
  severity: FindingSeverity;
  cvss_score?: number;
  cve_ids: string[];
  cwe_ids: string[];

  // Context (the 82% fix)
  is_reachable?: boolean;
  is_exploitable?: boolean;
  runtime_context?: Record<string, unknown>;
  adjusted_severity?: FindingSeverity;
  confidence?: number;

  // Status
  status: FindingStatus;
  triage_notes?: string;
  triaged_by?: TriagedBy;
  triaged_at?: string;

  // Chain
  chain_id?: string;
  chain_position?: number;

  // Report
  included_in_report: boolean;
  report_id?: string;

  // Meta
  tags: string[];
  evidence?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Scan {
  id: string;
  user_id: string;
  tool: FindingSource;
  target: string;
  command?: string;
  options?: Record<string, unknown>;
  status: ScanStatus;
  findings_count: number;
  started_at: string;
  completed_at?: string;
  raw_output?: string;
  parsed_output?: Record<string, unknown>;
}

export interface AttackChain {
  id: string;
  user_id: string;
  name: string;
  target: string;
  impact?: string;
  cvss_chain_score?: number;
  status: 'in_progress' | 'confirmed' | 'reported';
  findings_ids: string[];
  created_at: string;
}

export interface CreateFindingData {
  source: FindingSource;
  source_scan_id?: string;
  source_raw?: Record<string, unknown>;
  target_host: string;
  target_port?: number;
  target_url?: string;
  target_protocol?: string;
  title: string;
  description?: string;
  finding_type: FindingType;
  severity: FindingSeverity;
  cvss_score?: number;
  cve_ids?: string[];
  cwe_ids?: string[];
  is_reachable?: boolean;
  is_exploitable?: boolean;
  runtime_context?: Record<string, unknown>;
  confidence?: number;
  tags?: string[];
  evidence?: Record<string, unknown>;
}

export interface FindingsFilter {
  source?: FindingSource;
  severity?: FindingSeverity;
  status?: FindingStatus;
  finding_type?: FindingType;
  target_host?: string;
  chain_id?: string;
  search?: string;
  tags?: string[];
  has_cve?: boolean;
  included_in_report?: boolean;
}

export interface FindingsStats {
  total: number;
  by_severity: Record<FindingSeverity, number>;
  by_source: Record<string, number>;
  by_status: Record<string, number>;
  by_type: Record<string, number>;
  unique_hosts: number;
  false_positive_rate: number;
  avg_confidence: number;
}

// ─── Normalizers ──────────────────────────────────────────────────────────────

/** Normalize nmap XML/JSON output into findings */
function normalizeNmap(scanResult: Record<string, unknown>, scanId?: string): CreateFindingData[] {
  const findings: CreateFindingData[] = [];
  const hosts = (scanResult.hosts || scanResult.host || []) as Record<string, unknown>[];

  for (const host of Array.isArray(hosts) ? hosts : [hosts]) {
    const ip = (host.address || host.ip || host.addr || '') as string;
    const ports = (host.ports || host.port || []) as Record<string, unknown>[];

    for (const port of Array.isArray(ports) ? ports : [ports]) {
      const portNum = Number(port.portid || port.port || port.number || 0);
      const state = (port.state || '') as string;
      const service = (port.service || {}) as Record<string, unknown>;
      const product = (service.product || service.name || 'unknown') as string;
      const version = (service.version || '') as string;

      if (state === 'open' || (typeof state === 'object' && (state as any)?.state === 'open')) {
        findings.push({
          source: 'nmap',
          source_scan_id: scanId,
          source_raw: port,
          target_host: ip,
          target_port: portNum,
          target_protocol: (port.protocol || 'tcp') as string,
          title: `Open port ${portNum}/${port.protocol || 'tcp'} — ${product}${version ? ' ' + version : ''}`,
          description: `Service detected: ${product} ${version} on ${ip}:${portNum}`,
          finding_type: 'service',
          severity: 'info',
          cve_ids: [],
          cwe_ids: [],
          tags: ['nmap', 'service-detection'],
        });
      }

      // Check for vuln scripts
      const scripts = (port.scripts || port.script || []) as Record<string, unknown>[];
      for (const script of Array.isArray(scripts) ? scripts : [scripts]) {
        if (script.id && String(script.id).includes('vuln')) {
          const cves = extractCVEs(String(script.output || ''));
          findings.push({
            source: 'nmap',
            source_scan_id: scanId,
            source_raw: script,
            target_host: ip,
            target_port: portNum,
            target_protocol: (port.protocol || 'tcp') as string,
            title: `${script.id}: ${ip}:${portNum}`,
            description: String(script.output || ''),
            finding_type: 'vuln',
            severity: cves.length > 0 ? 'high' : 'medium',
            cve_ids: cves,
            cwe_ids: [],
            tags: ['nmap', 'nse-script', String(script.id)],
          });
        }
      }
    }
  }

  return findings;
}

/** Normalize nuclei JSON output into findings */
function normalizeNuclei(scanResult: Record<string, unknown> | Record<string, unknown>[], scanId?: string): CreateFindingData[] {
  const results = Array.isArray(scanResult) ? scanResult : [scanResult];
  const findings: CreateFindingData[] = [];

  for (const result of results) {
    const info = (result.info || {}) as Record<string, unknown>;
    const severityMap: Record<string, FindingSeverity> = {
      critical: 'critical', high: 'high', medium: 'medium', low: 'low', info: 'info',
    };

    const host = (result.host || result.matched || result.url || '') as string;
    const parsedUrl = parseTarget(host);
    const cves = extractCVEs(JSON.stringify(result));

    findings.push({
      source: 'nuclei',
      source_scan_id: scanId,
      source_raw: result,
      target_host: parsedUrl.host,
      target_port: parsedUrl.port,
      target_url: host,
      target_protocol: parsedUrl.protocol,
      title: `[${result['template-id'] || result.templateID || 'unknown'}] ${(info.name || result.name || 'Nuclei Finding') as string}`,
      description: (info.description || result.description || '') as string,
      finding_type: mapNucleiType((result.type || info.classification?.toString() || 'vuln') as string),
      severity: severityMap[String(info.severity || result.severity || 'info').toLowerCase()] || 'info',
      cvss_score: Number(info['cvss-score'] || info.cvss_score) || undefined,
      cve_ids: cves,
      cwe_ids: extractCWEs(JSON.stringify(result)),
      tags: [...((info.tags || []) as string[]), 'nuclei'],
      evidence: result.curl_command ? { curl: result.curl_command } : undefined,
    });
  }

  return findings;
}

/** Normalize sqlmap output into findings */
function normalizeSqlmap(scanResult: Record<string, unknown>, scanId?: string): CreateFindingData[] {
  const findings: CreateFindingData[] = [];
  const target = (scanResult.url || scanResult.target || '') as string;
  const parsedUrl = parseTarget(target);
  const injections = (scanResult.data || scanResult.injections || []) as Record<string, unknown>[];

  for (const injection of Array.isArray(injections) ? injections : [injections]) {
    const param = (injection.parameter || injection.param || 'unknown') as string;
    const technique = (injection.type || injection.technique || 'unknown') as string;

    findings.push({
      source: 'sqlmap',
      source_scan_id: scanId,
      source_raw: injection,
      target_host: parsedUrl.host,
      target_port: parsedUrl.port,
      target_url: target,
      target_protocol: parsedUrl.protocol,
      title: `SQLi — ${param} (${technique})`,
      description: `SQL injection found in parameter "${param}" using ${technique} technique. Target: ${target}`,
      finding_type: 'vuln',
      severity: 'critical',
      cve_ids: [],
      cwe_ids: ['CWE-89'],
      is_exploitable: true,
      confidence: 0.95,
      tags: ['sqlmap', 'sqli', technique.toLowerCase()],
      evidence: {
        parameter: param,
        technique,
        payload: injection.payload || injection.data,
      },
    });
  }

  return findings;
}

/** Normalize Shodan IP data into findings */
function normalizeShodan(ipData: Record<string, unknown>, scanId?: string): CreateFindingData[] {
  const findings: CreateFindingData[] = [];
  const ip = (ipData.ip_str || ipData.ip || '') as string;
  const ports = (ipData.ports || []) as number[];
  const vulns = (ipData.vulns || []) as string[];
  const data = (ipData.data || []) as Record<string, unknown>[];

  // Service findings from banners
  for (const banner of data) {
    findings.push({
      source: 'shodan',
      source_scan_id: scanId,
      source_raw: banner,
      target_host: ip,
      target_port: Number(banner.port),
      target_protocol: (banner.transport || 'tcp') as string,
      title: `${banner.product || banner.module || 'Service'} on ${ip}:${banner.port}`,
      description: `${banner.product || ''} ${banner.version || ''}\n${(banner.data || '').toString().slice(0, 500)}`,
      finding_type: 'service',
      severity: 'info',
      cve_ids: [],
      cwe_ids: [],
      tags: ['shodan', 'banner'],
    });
  }

  // Known vulns
  for (const cve of vulns) {
    findings.push({
      source: 'shodan',
      source_scan_id: scanId,
      target_host: ip,
      title: `${cve} — ${ip}`,
      description: `Shodan reports ${ip} is potentially vulnerable to ${cve}`,
      finding_type: 'vuln',
      severity: 'high',
      cve_ids: [cve],
      cwe_ids: [],
      confidence: 0.7,
      tags: ['shodan', 'passive-vuln'],
    });
  }

  return findings;
}

/** Normalize Burp Suite XML export */
function normalizeBurp(xmlData: Record<string, unknown>, scanId?: string): CreateFindingData[] {
  const findings: CreateFindingData[] = [];
  const issues = (xmlData.issues || xmlData.issue || []) as Record<string, unknown>[];

  const burpSeverityMap: Record<string, FindingSeverity> = {
    high: 'high', medium: 'medium', low: 'low', information: 'info', info: 'info',
  };

  for (const issue of Array.isArray(issues) ? issues : [issues]) {
    const url = (issue.url || issue.path || '') as string;
    const parsedUrl = parseTarget(url);

    findings.push({
      source: 'burp',
      source_scan_id: scanId,
      source_raw: issue,
      target_host: parsedUrl.host || (issue.host || '') as string,
      target_port: parsedUrl.port,
      target_url: url,
      target_protocol: parsedUrl.protocol,
      title: (issue.name || issue.type || 'Burp Finding') as string,
      description: stripHtml((issue.issueDetail || issue.description || '') as string),
      finding_type: 'vuln',
      severity: burpSeverityMap[String(issue.severity || 'info').toLowerCase()] || 'info',
      cvss_score: Number(issue.cvss) || undefined,
      cve_ids: extractCVEs(JSON.stringify(issue)),
      cwe_ids: extractCWEs(JSON.stringify(issue)),
      confidence: mapBurpConfidence((issue.confidence || 'tentative') as string),
      tags: ['burp', (issue.type || '') as string],
      evidence: {
        request: issue.requestresponse?.request || issue.request,
        response: issue.requestresponse?.response || issue.response,
        remediation: issue.remediationDetail || issue.remediation,
      },
    });
  }

  return findings;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractCVEs(text: string): string[] {
  const matches = text.match(/CVE-\d{4}-\d{4,}/gi) || [];
  return [...new Set(matches.map(m => m.toUpperCase()))];
}

function extractCWEs(text: string): string[] {
  const matches = text.match(/CWE-\d+/gi) || [];
  return [...new Set(matches.map(m => m.toUpperCase()))];
}

function parseTarget(url: string): { host: string; port?: number; protocol?: string } {
  try {
    if (!url.includes('://')) url = 'https://' + url;
    const parsed = new URL(url);
    const port = parsed.port ? Number(parsed.port) : (parsed.protocol === 'https:' ? 443 : 80);
    return { host: parsed.hostname, port, protocol: parsed.protocol.replace(':', '') };
  } catch {
    return { host: url.split(':')[0].split('/')[0] };
  }
}

function mapNucleiType(type: string): FindingType {
  const map: Record<string, FindingType> = {
    http: 'vuln', dns: 'misconfig', ssl: 'misconfig', network: 'vuln',
    file: 'exposure', code: 'vuln', headless: 'vuln',
  };
  return map[type.toLowerCase()] || 'vuln';
}

function mapBurpConfidence(conf: string): number {
  const map: Record<string, number> = { certain: 1.0, firm: 0.85, tentative: 0.5 };
  return map[conf.toLowerCase()] || 0.5;
}

function stripHtml(html: string): string {
  let result = html;
  let prev = '';
  // Loop until no more tags (handles nested/broken tags like <scr<script>ipt>)
  while (result !== prev) {
    prev = result;
    result = result.replace(/<[^>]*>/g, '');
  }
  return result.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').trim();
}

// ─── Service ──────────────────────────────────────────────────────────────────

class FindingsEngine {
  // ─── Ingest ─────────────────────────────────────────────────────────────────

  /** Ingest raw nmap output → normalized findings */
  async ingestNmap(scanResult: Record<string, unknown>, scanId?: string): Promise<Finding[]> {
    const normalized = normalizeNmap(scanResult, scanId);
    return this.bulkCreate(normalized);
  }

  /** Ingest raw nuclei output → normalized findings */
  async ingestNuclei(scanResult: Record<string, unknown> | Record<string, unknown>[], scanId?: string): Promise<Finding[]> {
    const normalized = normalizeNuclei(scanResult, scanId);
    return this.bulkCreate(normalized);
  }

  /** Ingest raw sqlmap output → normalized findings */
  async ingestSqlmap(scanResult: Record<string, unknown>, scanId?: string): Promise<Finding[]> {
    const normalized = normalizeSqlmap(scanResult, scanId);
    return this.bulkCreate(normalized);
  }

  /** Ingest Shodan IP data → normalized findings */
  async ingestShodan(ipData: Record<string, unknown>, scanId?: string): Promise<Finding[]> {
    const normalized = normalizeShodan(ipData, scanId);
    return this.bulkCreate(normalized);
  }

  /** Ingest Burp XML export → normalized findings */
  async ingestBurp(xmlData: Record<string, unknown>, scanId?: string): Promise<Finding[]> {
    const normalized = normalizeBurp(xmlData, scanId);
    return this.bulkCreate(normalized);
  }

  /** Ingest a single manual finding */
  async ingestManual(finding: CreateFindingData): Promise<Finding> {
    return this.create({ ...finding, source: 'manual' });
  }

  // ─── CRUD ───────────────────────────────────────────────────────────────────

  async create(data: CreateFindingData): Promise<Finding> {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error('User not authenticated');

    const { data: finding, error } = await supabase
      .from('findings')
      .insert({
        user_id: user.id,
        ...data,
        cve_ids: data.cve_ids || [],
        cwe_ids: data.cwe_ids || [],
        tags: data.tags || [],
        status: 'open',
        included_in_report: false,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create finding: ${error.message}`);
    return finding;
  }

  async bulkCreate(items: CreateFindingData[]): Promise<Finding[]> {
    if (items.length === 0) return [];

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error('User not authenticated');

    const rows = items.map(item => ({
      user_id: user.id,
      ...item,
      cve_ids: item.cve_ids || [],
      cwe_ids: item.cwe_ids || [],
      tags: item.tags || [],
      status: 'open' as FindingStatus,
      included_in_report: false,
    }));

    const { data: findings, error } = await supabase
      .from('findings')
      .insert(rows)
      .select();

    if (error) throw new Error(`Failed to bulk create findings: ${error.message}`);
    return findings || [];
  }

  async getAll(filter?: FindingsFilter): Promise<Finding[]> {
    let query = supabase
      .from('findings')
      .select('*')
      .order('created_at', { ascending: false });

    if (filter?.source) query = query.eq('source', filter.source);
    if (filter?.severity) query = query.eq('severity', filter.severity);
    if (filter?.status) query = query.eq('status', filter.status);
    if (filter?.finding_type) query = query.eq('finding_type', filter.finding_type);
    if (filter?.target_host) query = query.eq('target_host', filter.target_host);
    if (filter?.chain_id) query = query.eq('chain_id', filter.chain_id);
    if (filter?.included_in_report !== undefined) query = query.eq('included_in_report', filter.included_in_report);
    if (filter?.has_cve) query = query.not('cve_ids', 'eq', '{}');
    if (filter?.search) query = query.or(`title.ilike.%${pgOr(filter.search)}%,description.ilike.%${pgOr(filter.search)}%,target_host.ilike.%${pgOr(filter.search)}%`);

    const { data, error } = await query;
    if (error) throw new Error(`Failed to fetch findings: ${error.message}`);
    return data || [];
  }

  async getById(id: string): Promise<Finding> {
    const { data, error } = await supabase
      .from('findings')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw new Error(`Failed to fetch finding: ${error.message}`);
    return data;
  }

  async update(id: string, updates: Partial<Finding>): Promise<Finding> {
    const { data, error } = await supabase
      .from('findings')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update finding: ${error.message}`);
    return data;
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('findings')
      .delete()
      .eq('id', id);

    if (error) throw new Error(`Failed to delete finding: ${error.message}`);
  }

  async bulkUpdateStatus(ids: string[], status: FindingStatus, notes?: string): Promise<void> {
    const updates: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };
    if (notes) updates.triage_notes = notes;
    if (status !== 'open') {
      updates.triaged_at = new Date().toISOString();
      updates.triaged_by = 'human';
    }

    const { error } = await supabase
      .from('findings')
      .update(updates)
      .in('id', ids);

    if (error) throw new Error(`Failed to bulk update: ${error.message}`);
  }

  // ─── Correlation ────────────────────────────────────────────────────────────

  /** Find findings related to a given finding (same host, same CVE, same port) */
  async correlate(findingId: string): Promise<Finding[]> {
    const finding = await this.getById(findingId);
    const related: Finding[] = [];

    // Same host, different source
    const { data: hostFindings } = await supabase
      .from('findings')
      .select('*')
      .eq('target_host', finding.target_host)
      .neq('id', findingId)
      .order('severity', { ascending: true });

    if (hostFindings) related.push(...hostFindings);

    // Same CVE across different hosts
    if (finding.cve_ids.length > 0) {
      const { data: cveFindings } = await supabase
        .from('findings')
        .select('*')
        .neq('id', findingId)
        .overlaps('cve_ids', finding.cve_ids);

      if (cveFindings) {
        const existingIds = new Set(related.map(f => f.id));
        related.push(...cveFindings.filter(f => !existingIds.has(f.id)));
      }
    }

    return related;
  }

  /** Detect potential duplicates for a finding */
  async findDuplicates(finding: CreateFindingData): Promise<Finding[]> {
    const { data } = await supabase
      .from('findings')
      .select('*')
      .eq('target_host', finding.target_host)
      .eq('finding_type', finding.finding_type)
      .ilike('title', `%${finding.title.slice(0, 50)}%`);

    return data || [];
  }

  /** Get all findings for a specific target host */
  async getByHost(host: string): Promise<Finding[]> {
    const { data, error } = await supabase
      .from('findings')
      .select('*')
      .eq('target_host', host)
      .order('severity', { ascending: true });

    if (error) throw new Error(`Failed to fetch host findings: ${error.message}`);
    return data || [];
  }

  /** Get unique target hosts */
  async getUniqueHosts(): Promise<string[]> {
    const { data, error } = await supabase
      .from('findings')
      .select('affected_host')
      .order('target_host');

    if (error) throw new Error(`Failed to fetch hosts: ${error.message}`);
    return [...new Set((data || []).map(d => d.target_host))];
  }

  // ─── Attack Chains ──────────────────────────────────────────────────────────

  async createChain(name: string, target: string, findingIds: string[]): Promise<AttackChain> {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('attack_chains')
      .insert({
        user_id: user.id,
        name,
        target,
        findings_ids: findingIds,
        status: 'in_progress',
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create chain: ${error.message}`);

    // Update findings with chain reference
    for (let i = 0; i < findingIds.length; i++) {
      await this.update(findingIds[i], {
        chain_id: data.id,
        chain_position: i + 1,
      } as Partial<Finding>);
    }

    return data;
  }

  async getChains(): Promise<AttackChain[]> {
    const { data, error } = await supabase
      .from('attack_chains')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to fetch chains: ${error.message}`);
    return data || [];
  }

  async getChainFindings(chainId: string): Promise<Finding[]> {
    const { data, error } = await supabase
      .from('findings')
      .select('*')
      .eq('chain_id', chainId)
      .order('chain_position', { ascending: true });

    if (error) throw new Error(`Failed to fetch chain findings: ${error.message}`);
    return data || [];
  }

  // ─── Scans ──────────────────────────────────────────────────────────────────

  async createScan(tool: FindingSource, target: string, command?: string, options?: Record<string, unknown>): Promise<Scan> {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('scans')
      .insert({
        user_id: user.id,
        tool,
        target,
        command,
        options: options || {},
        status: 'running',
        findings_count: 0,
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create scan: ${error.message}`);
    return data;
  }

  async completeScan(scanId: string, findingsCount: number, parsedOutput?: Record<string, unknown>): Promise<Scan> {
    const { data, error } = await supabase
      .from('scans')
      .update({
        status: 'completed',
        findings_count: findingsCount,
        completed_at: new Date().toISOString(),
        parsed_output: parsedOutput,
      })
      .eq('id', scanId)
      .select()
      .single();

    if (error) throw new Error(`Failed to complete scan: ${error.message}`);
    return data;
  }

  async getScans(): Promise<Scan[]> {
    const { data, error } = await supabase
      .from('scans')
      .select('*')
      .order('started_at', { ascending: false });

    if (error) throw new Error(`Failed to fetch scans: ${error.message}`);
    return data || [];
  }

  // ─── Stats ──────────────────────────────────────────────────────────────────

  async getStats(): Promise<FindingsStats> {
    const findings = await this.getAll();

    const by_severity: Record<FindingSeverity, number> = {
      critical: 0, high: 0, medium: 0, low: 0, info: 0,
    };
    const by_source: Record<string, number> = {};
    const by_status: Record<string, number> = {};
    const by_type: Record<string, number> = {};
    const hosts = new Set<string>();
    let fpCount = 0;
    let totalConfidence = 0;
    let confidenceCount = 0;

    for (const f of findings) {
      by_severity[f.severity] = (by_severity[f.severity] || 0) + 1;
      by_source[f.source] = (by_source[f.source] || 0) + 1;
      by_status[f.status] = (by_status[f.status] || 0) + 1;
      by_type[f.finding_type] = (by_type[f.finding_type] || 0) + 1;
      hosts.add(f.target_host);
      if (f.status === 'false_positive') fpCount++;
      if (f.confidence !== undefined && f.confidence !== null) {
        totalConfidence += f.confidence;
        confidenceCount++;
      }
    }

    const triaged = (by_status['confirmed'] || 0) + fpCount;
    return {
      total: findings.length,
      by_severity,
      by_source,
      by_status,
      by_type,
      unique_hosts: hosts.size,
      false_positive_rate: triaged > 0 ? fpCount / triaged : 0,
      avg_confidence: confidenceCount > 0 ? totalConfidence / confidenceCount : 0,
    };
  }
}

// Export singleton
export const findingsEngine = new FindingsEngine();
export default findingsEngine;
