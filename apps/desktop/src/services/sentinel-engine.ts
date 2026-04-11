/**
 * Sentinel Engine — The Autonomous UilBrain
 *
 * Phase 2: CVE Ingestion + CPE Matching
 * Phase 3: AI Triage → Threat Action Card generation
 * Phase 4: Auto-scan (nmap light discovery)
 * Phase 5: Action Engine (one-click remediation)
 *
 * Pipeline: INGEST CVEs → MATCH against user CPEs → TRIAGE → GENERATE action cards → EXECUTE
 */

import { supabase } from '@/lib/supabase';
import { sentinelService, type InfrastructureAsset, type ThreatAction, type ActionItem, type SentinelScan } from './sentinel';
import { sentinelAI } from './sentinel-ai';

// ── Types ────────────────────────────────────────────────────────────────

export interface CVERecord {
  cve_id: string;
  description: string;
  severity: string;
  cvss_score: number;
  cvss_vector?: string;
  products?: string[];
  cpe_match?: string[];
  cwe?: string[];
  refs?: string[];
  exploit_status?: string;
  epss_score?: number;
  published_date?: string;
  last_modified?: string;
}

export interface CPEMatch {
  cve: CVERecord;
  asset: InfrastructureAsset;
  matched_cpe: string;
  match_type: 'exact' | 'version_range' | 'vendor_product' | 'fuzzy';
  confidence: number;
}

export interface ScanResult {
  host: string;
  ports: PortResult[];
  os?: string;
  hostnames?: string[];
  scan_time: number;
}

export interface PortResult {
  port: number;
  protocol: string;
  state: string;
  service: string;
  version?: string;
  cpe?: string;
  scripts?: Record<string, string>;
}

export interface ActionExecution {
  action_id: string;
  threat_id: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'rolled_back';
  output: string;
  started_at: string;
  completed_at?: string;
  error?: string;
}

export interface SentinelEvent {
  type: 'cve_match' | 'scan_complete' | 'threat_created' | 'action_executed' | 'asset_updated';
  data: Record<string, unknown>;
  timestamp: string;
}

// ── Sentinel Engine ──────────────────────────────────────────────────────

class SentinelEngine {
  private eventListeners: Array<(event: SentinelEvent) => void> = [];
  private scanInProgress = false;

  // ════════════════════════════════════════════════════════════════════════
  // PHASE 2: CVE INGESTION + CPE MATCHING
  // ════════════════════════════════════════════════════════════════════════

  /**
   * Ingest CVEs from our Supabase cves table and match against user infrastructure.
   * This is the core correlation engine.
   */
  async ingestAndMatch(): Promise<CPEMatch[]> {
    const startTime = Date.now();
    const matches: CPEMatch[] = [];

    // Get user's infrastructure
    const assets = await sentinelService.getAssets();
    if (assets.length === 0) return [];

    // Collect all user CPE strings
    const userCPEs = new Map<string, InfrastructureAsset>();
    for (const asset of assets) {
      if (asset.cpe_list) {
        for (const cpe of asset.cpe_list) {
          userCPEs.set(cpe, asset);
        }
      }
    }

    if (userCPEs.size === 0) return [];

    // Extract vendor:product pairs for efficient DB querying
    const vendorProducts = this.extractVendorProducts(userCPEs);

    // Query CVEs that match our products (last 90 days by default)
    const cves = await this.fetchMatchingCVEs(vendorProducts);

    // Match CVEs against user CPEs
    for (const cve of cves) {
      const cveMatches = this.matchCVEtoAssets(cve, userCPEs);
      matches.push(...cveMatches);
    }

    // Record scan
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (userId) {
      await sentinelService.createScan({
        scan_type: 'cve_match',
        targets: Array.from(new Set(assets.map(a => a.name))),
        status: 'completed',
        findings: { total_cves_checked: cves.length, matches: matches.length },
        new_threats: matches.length,
        duration_ms: Date.now() - startTime,
        started_at: new Date(startTime).toISOString(),
        completed_at: new Date().toISOString(),
      });
    }

    this.emit({ type: 'scan_complete', data: { scan_type: 'cve_match', matches: matches.length }, timestamp: new Date().toISOString() });

    return matches;
  }

  /**
   * Extract vendor:product pairs from CPE strings for DB querying.
   * CPE 2.3: cpe:2.3:a:vendor:product:version:*:*:*:*:*:*:*
   */
  private extractVendorProducts(cpes: Map<string, InfrastructureAsset>): string[] {
    const pairs = new Set<string>();
    for (const cpe of cpes.keys()) {
      const parts = cpe.split(':');
      if (parts.length >= 5) {
        const vendor = parts[3];
        const product = parts[4];
        pairs.add(`${vendor}:${product}`);
      }
    }
    return Array.from(pairs);
  }

  /**
   * Fetch CVEs from Supabase that could match our infrastructure.
   * Uses product name matching + recent timeframe.
   */
  private async fetchMatchingCVEs(vendorProducts: string[]): Promise<CVERecord[]> {
    const allCVEs: CVERecord[] = [];

    // Strategy 1: Match by product names in our CVE table
    const productNames = vendorProducts.map(vp => vp.split(':')[1]);
    const uniqueProducts = [...new Set(productNames)];

    // Query in batches of 10 products
    for (let i = 0; i < uniqueProducts.length; i += 10) {
      const batch = uniqueProducts.slice(i, i + 10);

      for (const product of batch) {
        const { data } = await supabase
          .from('cves')
          .select('*')
          .or(`description.ilike.%${product}%,products.cs.{${product}}`)
          .order('cvss_score', { ascending: false })
          .limit(50);

        if (data) {
          for (const row of data) {
            if (!allCVEs.find(c => c.cve_id === row.cve_id)) {
              allCVEs.push(this.mapCVE(row));
            }
          }
        }
      }
    }

    // Strategy 2: Also grab critical/high CVEs from last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
    const { data: recentCritical } = await supabase
      .from('cves')
      .select('*')
      .in('severity', ['CRITICAL', 'HIGH', 'critical', 'high'])
      .gte('created_at', thirtyDaysAgo)
      .order('cvss_score', { ascending: false })
      .limit(100);

    if (recentCritical) {
      for (const row of recentCritical) {
        if (!allCVEs.find(c => c.cve_id === row.cve_id)) {
          allCVEs.push(this.mapCVE(row));
        }
      }
    }

    return allCVEs;
  }

  /**
   * Match a single CVE against all user CPE strings.
   */
  private matchCVEtoAssets(cve: CVERecord, userCPEs: Map<string, InfrastructureAsset>): CPEMatch[] {
    const matches: CPEMatch[] = [];

    for (const [userCPE, asset] of userCPEs) {
      const match = this.compareCPE(cve, userCPE);
      if (match) {
        matches.push({
          cve,
          asset,
          matched_cpe: userCPE,
          match_type: match.type,
          confidence: match.confidence,
        });
      }
    }

    return matches;
  }

  /**
   * Compare a CVE's affected products/CPEs against a user CPE string.
   */
  private compareCPE(cve: CVERecord, userCPE: string): { type: CPEMatch['match_type']; confidence: number } | null {
    const userParts = userCPE.split(':');
    if (userParts.length < 5) return null;

    const userVendor = userParts[3]?.toLowerCase();
    const userProduct = userParts[4]?.toLowerCase();
    const userVersion = userParts[5]?.toLowerCase();

    // Check against CVE's CPE match list
    if (cve.cpe_match) {
      for (const cveCPE of cve.cpe_match) {
        const cveParts = cveCPE.split(':');
        const cveVendor = cveParts[3]?.toLowerCase();
        const cveProduct = cveParts[4]?.toLowerCase();
        const cveVersion = cveParts[5]?.toLowerCase();

        if (cveVendor === userVendor && cveProduct === userProduct) {
          if (cveVersion === userVersion || cveVersion === '*') {
            return { type: 'exact', confidence: 0.95 };
          }
          return { type: 'version_range', confidence: 0.80 };
        }
      }
    }

    // Check against products array
    if (cve.products) {
      for (const product of cve.products) {
        const lower = product.toLowerCase();
        if (lower === userProduct || lower.includes(userProduct)) {
          return { type: 'vendor_product', confidence: 0.70 };
        }
      }
    }

    // Fuzzy match against description
    if (cve.description) {
      const desc = cve.description.toLowerCase();
      if (desc.includes(userProduct) && (desc.includes(userVendor) || userVendor === userProduct)) {
        return { type: 'fuzzy', confidence: 0.50 };
      }
    }

    return null;
  }

  // ════════════════════════════════════════════════════════════════════════
  // PHASE 3: AI TRIAGE → THREAT ACTION CARD GENERATION
  // ════════════════════════════════════════════════════════════════════════

  /**
   * Process CPE matches into threat action cards.
   */
  async triageMatches(matches: CPEMatch[]): Promise<ThreatAction[]> {
    if (matches.length === 0) return [];

    // Get all assets for AI context
    const assets = await sentinelService.getAssets();

    // Group matches by CVE ID
    const byCVE = new Map<string, CPEMatch[]>();
    for (const match of matches) {
      const existing = byCVE.get(match.cve.cve_id) || [];
      existing.push(match);
      byCVE.set(match.cve.cve_id, existing);
    }

    const threats: ThreatAction[] = [];

    // Check existing threat cards
    const existingThreats = await sentinelService.getThreats();
    const existingCVEs = new Set(existingThreats.map(t => t.cve_id));

    for (const [cveId, cveMatches] of byCVE) {
      if (existingCVEs.has(cveId)) continue;

      const cve = cveMatches[0].cve;
      const affectedAssets = [...new Set(cveMatches.map(m => m.asset.name))];
      const affectedCPEs = [...new Set(cveMatches.map(m => m.matched_cpe))];
      const maxConfidence = Math.max(...cveMatches.map(m => m.confidence));

      const severity = this.mapSeverity(cve.cvss_score);
      const urgency = this.calculateUrgency(cve);
      const detectionRules = this.generateDetectionRules(cve, cveMatches);
      const huntQueries = this.generateHuntQueries(cve, cveMatches);

      // Try AI-enhanced analysis first, fallback to templates
      let actions: ActionItem[];
      let summary: string;

      try {
        const aiAnalysis = await sentinelAI.analyzeThreat(cveMatches[0], assets, existingThreats);
        // Use AI-generated remediation plan as actions
        actions = aiAnalysis.remediation_plan.map(step => ({
          id: crypto.randomUUID().slice(0, 8),
          label: `${step.title}: ${step.description}`,
          type: (step.command ? 'patch' : 'investigate') as ActionItem['type'],
          command: step.command,
          rollback: step.rollback,
          completed: false,
        }));
        // Use AI briefing as summary
        summary = aiAnalysis.briefing || aiAnalysis.context_analysis;
        // If AI found related threats, add to hunt queries
        if (aiAnalysis.related_threats.length > 0) {
          huntQueries.push(`Related CVEs: ${aiAnalysis.related_threats.join(', ')}`);
        }
        if (aiAnalysis.detection_advice) {
          detectionRules.push(`AI: ${aiAnalysis.detection_advice}`);
        }
      } catch {
        // Fallback to template generation
        actions = this.generateActionItems(cve, cveMatches);
        summary = this.buildThreatSummary(cve, cveMatches, maxConfidence);
      }

      try {
        const threat = await sentinelService.createThreat({
          cve_id: cveId,
          title: cve.description?.slice(0, 200) || `Vulnerability in ${cve.products?.join(', ') || 'unknown product'}`,
          severity,
          urgency,
          time_to_act: urgency === 'immediate' ? '< 24h' : urgency === 'urgent' ? '< 72h' : urgency === 'moderate' ? '< 7d' : '> 7d',
          summary,
          matched_assets: affectedAssets,
          affected_cpes: affectedCPEs,
          actions,
          detection_rules: detectionRules,
          hunt_queries: huntQueries,
          references: cve.refs,
          status: 'new',
        });

        threats.push(threat);
        this.emit({ type: 'threat_created', data: { cve_id: cveId, severity, affected_assets: affectedAssets.length }, timestamp: new Date().toISOString() });
      } catch (err) {
        console.error(`Failed to create threat for ${cveId}:`, err);
      }
    }

    return threats;
  }

  private mapSeverity(cvss: number): ThreatAction['severity'] {
    if (cvss >= 9.0) return 'critical';
    if (cvss >= 7.0) return 'high';
    if (cvss >= 4.0) return 'medium';
    if (cvss >= 0.1) return 'low';
    return 'info';
  }

  private calculateUrgency(cve: CVERecord): ThreatAction['urgency'] {
    if (cve.exploit_status === 'active' || cve.exploit_status === 'weaponized') return 'immediate';
    if (cve.cvss_score >= 9.5) return 'immediate';
    if (cve.exploit_status === 'poc' || cve.exploit_status === 'poc_available') return 'urgent';
    if (cve.cvss_score >= 8.0) return 'urgent';
    if (cve.cvss_score >= 6.0) return 'moderate';
    return 'low';
  }

  private generateActionItems(cve: CVERecord, matches: CPEMatch[]): ActionItem[] {
    const actions: ActionItem[] = [];
    const id = () => crypto.randomUUID().slice(0, 8);

    actions.push({
      id: id(), label: 'Verify affected service versions are running on matched assets',
      type: 'investigate', completed: false,
    });

    actions.push({
      id: id(), label: 'Update affected software to latest patched version',
      type: 'patch', command: this.generatePatchCommand(cve, matches), completed: false,
    });

    // Network-exploitable — add firewall rule
    if (cve.cvss_vector?.includes('AV:N') || cve.cvss_vector?.includes('NETWORK')) {
      const ports = [...new Set(matches.flatMap(m => m.asset.open_ports || []))];
      if (ports.length > 0) {
        actions.push({
          id: id(), label: `Restrict network access to ports: ${ports.join(', ')}`,
          type: 'block',
          command: ports.map(p => `ufw deny ${p}/tcp`).join(' && '),
          rollback: ports.map(p => `ufw delete deny ${p}/tcp`).join(' && '),
          completed: false,
        });
      }
    }

    // Auth bypass / privesc
    if (cve.cwe?.some(c => ['CWE-287', 'CWE-269', 'CWE-862'].includes(c))) {
      actions.push({ id: id(), label: 'Audit authentication and authorization configurations', type: 'config', completed: false });
    }

    // Deep scan
    actions.push({
      id: id(), label: 'Run targeted vulnerability scan on affected assets',
      type: 'scan',
      command: `nmap -sV --script vuln ${matches.map(m => m.asset.ip_address || m.asset.hostname).filter(Boolean).join(' ')}`,
      completed: false,
    });

    actions.push({ id: id(), label: 'Enable monitoring for exploitation attempts', type: 'monitor', completed: false });

    return actions;
  }

  private generatePatchCommand(_cve: CVERecord, matches: CPEMatch[]): string {
    const services = new Set<string>();
    for (const match of matches) {
      if (match.asset.services) {
        for (const svc of match.asset.services) services.add(svc.service.toLowerCase());
      }
    }

    const commands: string[] = [];
    if (services.has('nginx')) commands.push('apt-get update && apt-get upgrade nginx -y');
    if (services.has('apache') || services.has('httpd')) commands.push('apt-get update && apt-get upgrade apache2 -y');
    if (services.has('openssh') || services.has('ssh')) commands.push('apt-get update && apt-get upgrade openssh-server -y');
    if (services.has('mysql')) commands.push('apt-get update && apt-get upgrade mysql-server -y');
    if (services.has('postgresql') || services.has('postgres')) commands.push('apt-get update && apt-get upgrade postgresql -y');
    if (services.has('redis')) commands.push('apt-get update && apt-get upgrade redis-server -y');
    return commands.length > 0 ? commands.join(' && ') : 'apt-get update && apt-get upgrade -y';
  }

  private generateDetectionRules(cve: CVERecord, matches: CPEMatch[]): string[] {
    const rules: string[] = [];

    if (cve.cvss_vector?.includes('AV:N') || cve.cvss_vector?.includes('NETWORK')) {
      const ports = [...new Set(matches.flatMap(m => m.asset.open_ports || []))];
      if (ports.length > 0) {
        rules.push(`alert tcp any any -> any ${ports[0]} (msg:"Potential ${cve.cve_id} exploitation"; sid:${Math.floor(Math.random() * 900000) + 100000}; rev:1;)`);
      }
    }

    rules.push(`grep -i "${cve.cve_id.replace('CVE-', '')}" /var/log/syslog /var/log/auth.log`);

    if (cve.cwe?.includes('CWE-78')) {
      rules.push(`sigma: process_creation | CommandLine contains '|' OR ';' OR '&&' | filter: known_admin_scripts`);
    }
    if (cve.cwe?.includes('CWE-89')) {
      rules.push(`sigma: web_access_log | uri contains "'" OR "UNION" OR "SELECT" | threshold: 5 per minute`);
    }

    return rules;
  }

  private generateHuntQueries(cve: CVERecord, matches: CPEMatch[]): string[] {
    const queries: string[] = [];
    const hosts = matches.map(m => m.asset.ip_address || m.asset.hostname).filter(Boolean);

    queries.push(`shodan: vuln:"${cve.cve_id}"`);
    queries.push(`nuclei -u ${hosts[0] || '<target>'} -id ${cve.cve_id.toLowerCase()}`);
    if (hosts.length > 0) queries.push(`nmap --script vuln -p- ${hosts[0]}`);

    return queries;
  }

  private buildThreatSummary(cve: CVERecord, matches: CPEMatch[], _confidence: number): string {
    const assetCount = new Set(matches.map(m => m.asset.name)).size;
    const maxMatch = matches.reduce((best, m) => m.confidence > best.confidence ? m : best, matches[0]);
    const exploit = cve.exploit_status ? ` Exploit status: ${cve.exploit_status}.` : '';

    return `${cve.cve_id} (CVSS ${cve.cvss_score}) affects ${assetCount} asset(s) in your infrastructure. ` +
      `Best match: ${maxMatch.matched_cpe} (${Math.round(maxMatch.confidence * 100)}% confidence, ${maxMatch.match_type}).` +
      `${exploit} ${cve.description?.slice(0, 300) || ''}`;
  }

  // ════════════════════════════════════════════════════════════════════════
  // PHASE 4: AUTO-SCAN (NMAP LIGHT DISCOVERY)
  // ════════════════════════════════════════════════════════════════════════

  /**
   * Light scan of all user hosts via edge function or Electron IPC.
   * Discovers services + versions, updates infrastructure profile.
   */
  async autoScan(targetAssets?: InfrastructureAsset[]): Promise<ScanResult[]> {
    if (this.scanInProgress) throw new Error('Scan already in progress');
    this.scanInProgress = true;

    const assets = targetAssets || await sentinelService.getAssets();
    const targets = assets.filter(a => a.ip_address || a.hostname).map(a => a.ip_address || a.hostname!);

    if (targets.length === 0) {
      this.scanInProgress = false;
      return [];
    }

    const startTime = Date.now();
    const results: ScanResult[] = [];

    const scan = await sentinelService.createScan({
      scan_type: 'discovery',
      targets,
      status: 'running',
      started_at: new Date().toISOString(),
    });

    try {
      // Scan each target (max 5 concurrent)
      const chunks = this.chunkArray(targets, 5);
      for (const chunk of chunks) {
        const chunkResults = await Promise.allSettled(
          chunk.map(target => this.scanHost(target))
        );
        for (const result of chunkResults) {
          if (result.status === 'fulfilled' && result.value) results.push(result.value);
        }
      }

      // Update infrastructure with scan results
      let newThreats = 0;
      for (const result of results) {
        const updated = await this.updateAssetFromScan(result, assets);
        if (updated) newThreats++;
      }

      await sentinelService.updateScan(scan.id!, {
        status: 'completed',
        findings: { hosts_scanned: targets.length, results: results.length },
        new_threats: newThreats,
        duration_ms: Date.now() - startTime,
        completed_at: new Date().toISOString(),
      });

      this.emit({ type: 'scan_complete', data: { scan_type: 'discovery', hosts: targets.length, results: results.length }, timestamp: new Date().toISOString() });
    } catch (err) {
      await sentinelService.updateScan(scan.id!, {
        status: 'failed',
        findings: { error: err instanceof Error ? err.message : 'Unknown error' },
        duration_ms: Date.now() - startTime,
        completed_at: new Date().toISOString(),
      });
    } finally {
      this.scanInProgress = false;
    }

    return results;
  }

  /**
   * Scan a single host. Uses edge function or passive Shodan data.
   */
  private async scanHost(target: string): Promise<ScanResult | null> {
    try {
      // Try edge function for active scanning
      const { data: session } = await supabase.auth.getSession();
      if (session?.session) {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sentinel-scan`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.session.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ target, scan_type: 'service_discovery' }),
          }
        );

        if (response.ok) {
          const data = await response.json();
          if (data.result) return data.result;
        }
      }

      // Fallback: passive Shodan scan
      return await this.passiveScan(target);
    } catch (err) {
      console.error(`Scan failed for ${target}:`, err);
      return null;
    }
  }

  /**
   * Passive scan using Shodan data (no active probing).
   */
  private async passiveScan(target: string): Promise<ScanResult | null> {
    try {
      if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(target)) {
        const apiKey = localStorage.getItem('shodan_api_key');
        if (!apiKey) return null;

        const res = await fetch(`https://api.shodan.io/shodan/host/${target}?key=${apiKey}`);
        if (!res.ok) return null;

        const data = await res.json();
        return {
          host: target,
          ports: (data.data || []).map((svc: any) => ({
            port: svc.port,
            protocol: svc.transport || 'tcp',
            state: 'open',
            service: svc.product || svc._shodan?.module || 'unknown',
            version: svc.version,
            cpe: svc.cpe?.length > 0 ? svc.cpe[0] : undefined,
          })),
          os: data.os,
          hostnames: data.hostnames,
          scan_time: 0,
        };
      }
    } catch { /* silent */ }
    return null;
  }

  /**
   * Update infrastructure asset from scan results.
   */
  private async updateAssetFromScan(result: ScanResult, assets: InfrastructureAsset[]): Promise<boolean> {
    const asset = assets.find(a =>
      a.ip_address === result.host ||
      a.hostname === result.host ||
      result.hostnames?.includes(a.hostname || '')
    );

    if (!asset || !asset.id) return false;

    const existingPorts = new Set((asset.services || []).map(s => s.port));
    const newServices = result.ports
      .filter(p => !existingPorts.has(p.port) && p.state === 'open')
      .map(p => ({ port: p.port, protocol: p.protocol, service: p.service, version: p.version, cpe: p.cpe }));

    if (newServices.length === 0 && !result.os) return false;

    const updatedServices = [...(asset.services || []), ...newServices];
    const updates: Partial<InfrastructureAsset> = {
      services: updatedServices,
      open_ports: updatedServices.map(s => s.port),
      last_scan: new Date().toISOString(),
      status: 'online',
    };

    if (result.os && !asset.os) updates.os = result.os;

    await sentinelService.updateAsset(asset.id, updates);
    this.emit({ type: 'asset_updated', data: { asset_id: asset.id, new_services: newServices.length }, timestamp: new Date().toISOString() });

    return newServices.length > 0;
  }

  // ════════════════════════════════════════════════════════════════════════
  // PHASE 5: ACTION ENGINE (ONE-CLICK REMEDIATION)
  // ════════════════════════════════════════════════════════════════════════

  /**
   * Execute a remediation action from a threat card.
   * Records result in sentinel_actions table.
   */
  async executeAction(threatId: string, actionId: string): Promise<ActionExecution> {
    const threat = await sentinelService.getThreat(threatId);
    if (!threat) throw new Error('Threat not found');

    const action = threat.actions?.find(a => a.id === actionId);
    if (!action) throw new Error('Action not found');
    if (!action.command) throw new Error('No command defined for this action');

    const execution: ActionExecution = {
      action_id: actionId, threat_id: threatId,
      status: 'running', output: '', started_at: new Date().toISOString(),
    };

    try {
      const sentinelAction = await sentinelService.createAction({
        threat_id: threatId,
        action_type: action.type as any,
        command: action.command,
        rollback_command: action.rollback,
        status: 'executing',
      });

      // Execute via edge function (safe — no direct shell access from browser)
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session) throw new Error('Not authenticated');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sentinel-execute`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action_id: sentinelAction.id,
            command: action.command,
            threat_id: threatId,
          }),
        }
      );

      const result = await response.json();
      execution.output = result.output || result.error || 'Executed via edge function';
      execution.status = response.ok ? 'completed' : 'failed';
      execution.completed_at = new Date().toISOString();

      // Mark action completed in threat card
      const updatedActions = (threat.actions || []).map(a =>
        a.id === actionId ? { ...a, completed: true, result: execution.output.slice(0, 500) } : a
      );
      await sentinelService.updateThreatActions(threatId, updatedActions);

      // Auto-resolve if all actions done
      if (updatedActions.every(a => a.completed)) {
        await sentinelService.updateThreatStatus(threatId, 'resolved');
      }

      this.emit({ type: 'action_executed', data: { threat_id: threatId, action_id: actionId, status: execution.status }, timestamp: new Date().toISOString() });
    } catch (err) {
      execution.status = 'failed';
      execution.error = err instanceof Error ? err.message : 'Unknown error';
      execution.output = `Error: ${execution.error}`;
      execution.completed_at = new Date().toISOString();
    }

    return execution;
  }

  /**
   * Rollback a previously executed action.
   */
  async rollbackAction(threatId: string, actionId: string): Promise<ActionExecution> {
    const threat = await sentinelService.getThreat(threatId);
    if (!threat) throw new Error('Threat not found');

    const action = threat.actions?.find(a => a.id === actionId);
    if (!action?.rollback) throw new Error('No rollback command defined');

    const execution: ActionExecution = {
      action_id: actionId, threat_id: threatId,
      status: 'running', output: '', started_at: new Date().toISOString(),
    };

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session) throw new Error('Not authenticated');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sentinel-execute`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ command: action.rollback, threat_id: threatId, rollback: true }),
        }
      );

      const result = await response.json();
      execution.output = result.output || 'Rollback executed';
      execution.status = 'rolled_back';
      execution.completed_at = new Date().toISOString();

      const updatedActions = (threat.actions || []).map(a =>
        a.id === actionId ? { ...a, completed: false, result: `Rolled back: ${execution.output.slice(0, 200)}` } : a
      );
      await sentinelService.updateThreatActions(threatId, updatedActions);
    } catch (err) {
      execution.status = 'failed';
      execution.error = err instanceof Error ? err.message : 'Unknown error';
    }

    return execution;
  }

  // ════════════════════════════════════════════════════════════════════════
  // FULL PIPELINE
  // ════════════════════════════════════════════════════════════════════════

  /**
   * Run the complete Sentinel pipeline:
   * 1. Auto-scan infrastructure (optional)
   * 2. Ingest CVEs + match CPEs
   * 3. Triage matches → generate threat action cards
   */
  async runFullPipeline(options?: { skipScan?: boolean }): Promise<{
    assetsScanned: number;
    cvesChecked: number;
    matchesFound: number;
    threatsCreated: number;
    scanResults: ScanResult[];
    threats: ThreatAction[];
  }> {
    let scanResults: ScanResult[] = [];

    if (!options?.skipScan) {
      try { scanResults = await this.autoScan(); } catch (err) { console.error('Auto-scan failed:', err); }
    }

    const matches = await this.ingestAndMatch();
    const threats = await this.triageMatches(matches);

    return {
      assetsScanned: scanResults.length,
      cvesChecked: matches.length,
      matchesFound: matches.length,
      threatsCreated: threats.length,
      scanResults,
      threats,
    };
  }

  // ── Event System ───────────────────────────────────────────────────────

  on(listener: (event: SentinelEvent) => void): () => void {
    this.eventListeners.push(listener);
    return () => { this.eventListeners = this.eventListeners.filter(l => l !== listener); };
  }

  private emit(event: SentinelEvent) {
    for (const listener of this.eventListeners) {
      try { listener(event); } catch { /* silent */ }
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────

  private mapCVE(row: any): CVERecord {
    return {
      cve_id: row.cve_id, description: row.description, severity: row.severity,
      cvss_score: row.cvss_score || row.cvss || 0, cvss_vector: row.cvss_vector,
      products: row.products || [], cpe_match: row.cpe_match, cwe: row.cwe ? [row.cwe] : [],
      refs: row.refs || row.references || [], exploit_status: row.exploit_status,
      epss_score: row.epss_score, published_date: row.published_date, last_modified: row.last_modified,
    };
  }

  private chunkArray<T>(arr: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
    return chunks;
  }

  get isScanning(): boolean { return this.scanInProgress; }
}

export const sentinelEngine = new SentinelEngine();
export default sentinelEngine;
