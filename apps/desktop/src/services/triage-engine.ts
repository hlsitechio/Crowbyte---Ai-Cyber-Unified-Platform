/**
 * AI Triage Engine
 * Phase 2 of the Cybersecurity Gaps Integration Plan.
 *
 * Autonomous finding triage pipeline:
 * Finding arrives → DEDUP → ENRICH (Shodan/CVE/DNS) → CONTEXT SCORE →
 * AI VERDICT (Claude) → AUTO-RESOLVE or HUMAN QUEUE
 *
 * This is what makes CrowByte's agents autonomous across 142 MCP tools.
 * Block/Panther proved 99.9% automated triage is possible — we implement it.
 */

import { supabase } from '@/lib/supabase';
import {
  findingsEngine,
  type Finding,
  type FindingSeverity,
  type FindingStatus,
  type CreateFindingData,
} from './findings-engine';

// ─── Types ────────────────────────────────────────────────────────────────────

export type TriageVerdict = 'confirmed' | 'false_positive' | 'needs_investigation' | 'duplicate' | 'resolved';
export type TriageEventType = 'auto_triage' | 'human_triage' | 'enrich' | 'resolve' | 'suppress' | 'escalate';

export interface TriageEvent {
  id: string;
  finding_id: string;
  event_type: TriageEventType;
  verdict?: TriageVerdict;
  confidence: number;
  reasoning: string;
  enrichment_data?: Record<string, unknown>;
  actions_taken?: Record<string, unknown>;
  performed_by: string;
  created_at: string;
}

export interface EnrichmentResult {
  shodan?: {
    ip: string;
    org?: string;
    isp?: string;
    country?: string;
    city?: string;
    ports?: number[];
    vulns?: string[];
    os?: string;
    hostnames?: string[];
    last_update?: string;
  };
  cve?: {
    id: string;
    description: string;
    cvss: number;
    epss?: number;
    exploitability?: string;
    references?: string[];
    affected_products?: string[];
  }[];
  dns?: {
    a_records?: string[];
    mx_records?: string[];
    ns_records?: string[];
    txt_records?: string[];
    cname?: string;
  };
  whois?: {
    registrar?: string;
    creation_date?: string;
    expiry_date?: string;
    registrant?: string;
    country?: string;
  };
  internal?: {
    previous_findings: number;
    previous_fps: number;
    host_first_seen?: string;
    related_chains: number;
  };
}

export interface TriageResult {
  finding: Finding;
  verdict: TriageVerdict;
  confidence: number;
  reasoning: string;
  enrichment: EnrichmentResult;
  adjusted_severity?: FindingSeverity;
  suggested_actions: TriageAction[];
  auto_resolved: boolean;
}

export interface TriageAction {
  type: 'block_ip' | 'patch' | 'config_fix' | 'rotate_credential' | 'suppress' | 'escalate' | 'investigate' | 'accept_risk';
  description: string;
  command?: string;
  auto_executable: boolean;
  executed: boolean;
}

export interface RemediationPlaybook {
  id: string;
  name: string;
  description?: string;
  trigger_conditions: Record<string, unknown>;
  steps: PlaybookStep[];
  target_type: string;
  auto_execute: boolean;
  success_count: number;
  created_at: string;
}

export interface PlaybookStep {
  order: number;
  action: string;
  description: string;
  command?: string;
  rollback_command?: string;
  requires_approval: boolean;
}

export interface TriageQueueItem {
  finding: Finding;
  ai_verdict?: TriageVerdict;
  ai_confidence?: number;
  ai_reasoning?: string;
  enrichment?: EnrichmentResult;
  priority_score: number;
  queued_at: string;
}

export interface TriageStats {
  total_triaged: number;
  auto_resolved: number;
  human_resolved: number;
  auto_resolve_rate: number;
  avg_confidence: number;
  avg_triage_time_ms: number;
  false_positive_rate: number;
  by_verdict: Record<string, number>;
}

// ─── Known False Positive Patterns ────────────────────────────────────────────

const FP_PATTERNS: Array<{ pattern: RegExp; reason: string; confidence: number }> = [
  { pattern: /information disclosure.*server header/i, reason: 'Server header info disclosure is informational, not exploitable', confidence: 0.95 },
  { pattern: /missing x-frame-options/i, reason: 'X-Frame-Options missing is low risk if CSP frame-ancestors is set', confidence: 0.85 },
  { pattern: /missing x-content-type-options/i, reason: 'Missing X-Content-Type-Options is defense-in-depth, rarely exploitable alone', confidence: 0.90 },
  { pattern: /cookie without (secure|httponly) flag/i, reason: 'Cookie flag missing is contextual — depends on cookie purpose', confidence: 0.70 },
  { pattern: /directory listing/i, reason: 'Directory listing needs manual review — may or may not expose sensitive content', confidence: 0.60 },
  { pattern: /ssl.*self.signed/i, reason: 'Self-signed SSL on internal/dev targets is expected', confidence: 0.80 },
  { pattern: /open port 80|open port 443/i, reason: 'HTTP/HTTPS ports open on web servers is expected behavior', confidence: 0.95 },
  { pattern: /dns.*zone transfer.*refused/i, reason: 'Zone transfer refused = correctly configured', confidence: 0.99 },
  { pattern: /wordpress.*version/i, reason: 'WordPress version detection is informational — check if actually outdated', confidence: 0.50 },
];

// ─── Severity Scoring Weights ─────────────────────────────────────────────────

const SEVERITY_WEIGHTS: Record<FindingSeverity, number> = {
  critical: 10, high: 8, medium: 5, low: 2, info: 0,
};

const EXPLOITABILITY_BONUS: Record<string, number> = {
  'active_exploitation': 5,
  'poc_available': 3,
  'weaponized': 4,
  'theoretical': 1,
};

// ─── Service ──────────────────────────────────────────────────────────────────

class TriageEngine {
  private triageQueue: TriageQueueItem[] = [];
  private processing = false;

  // ─── Main Pipeline ──────────────────────────────────────────────────────────

  /**
   * Full auto-triage pipeline for a single finding.
   * DEDUP → ENRICH → CONTEXT → VERDICT → RESOLVE/QUEUE
   */
  async autoTriage(finding: Finding): Promise<TriageResult> {
    const startTime = Date.now();

    // Step 1: DEDUP — seen this before?
    const duplicates = await this.checkDuplicates(finding);
    if (duplicates.length > 0) {
      const result = this.buildDuplicateResult(finding, duplicates[0]);
      await this.recordTriageEvent(finding.id, 'auto_triage', 'duplicate', 0.98,
        `Duplicate of finding ${duplicates[0].id}: "${duplicates[0].title}"`, {}, { merged_with: duplicates[0].id });
      await findingsEngine.update(finding.id, { status: 'duplicate' as FindingStatus });
      return result;
    }

    // Step 2: ENRICH — gather context from external sources
    const enrichment = await this.enrichFinding(finding);

    // Step 3: CONTEXT SCORE — calculate adjusted severity
    const { adjustedSeverity, contextScore } = this.calculateContextScore(finding, enrichment);

    // Step 4: FP PATTERN CHECK — known false positive patterns
    const fpMatch = this.checkFalsePositivePatterns(finding);

    // Step 5: AI VERDICT — Claude analyzes enriched finding
    let verdict: TriageVerdict;
    let confidence: number;
    let reasoning: string;

    if (fpMatch && fpMatch.confidence >= 0.90) {
      verdict = 'false_positive';
      confidence = fpMatch.confidence;
      reasoning = fpMatch.reason;
    } else {
      const aiVerdict = await this.getAIVerdict(finding, enrichment, contextScore);
      verdict = aiVerdict.verdict;
      confidence = aiVerdict.confidence;
      reasoning = aiVerdict.reasoning;
    }

    // Step 6: BUILD ACTIONS
    const suggestedActions = this.buildActions(finding, enrichment, verdict);

    // Step 7: AUTO-RESOLVE or QUEUE
    const autoResolved = confidence >= 0.95;
    if (autoResolved) {
      const newStatus = verdict === 'false_positive' ? 'false_positive' :
                        verdict === 'confirmed' ? 'confirmed' :
                        verdict === 'resolved' ? 'resolved' : 'open';

      await findingsEngine.update(finding.id, {
        status: newStatus as FindingStatus,
        adjusted_severity: adjustedSeverity,
        confidence,
        triage_notes: reasoning,
        triaged_by: 'ai',
        triaged_at: new Date().toISOString(),
      } as Partial<Finding>);
    } else {
      // Add to human queue
      this.triageQueue.push({
        finding,
        ai_verdict: verdict,
        ai_confidence: confidence,
        ai_reasoning: reasoning,
        enrichment,
        priority_score: contextScore,
        queued_at: new Date().toISOString(),
      });
    }

    // Record event
    await this.recordTriageEvent(
      finding.id,
      'auto_triage',
      verdict,
      confidence,
      reasoning,
      enrichment,
      { auto_resolved: autoResolved, duration_ms: Date.now() - startTime, adjusted_severity: adjustedSeverity }
    );

    return {
      finding: { ...finding, adjusted_severity: adjustedSeverity, confidence },
      verdict,
      confidence,
      reasoning,
      enrichment,
      adjusted_severity: adjustedSeverity,
      suggested_actions: suggestedActions,
      auto_resolved: autoResolved,
    };
  }

  /**
   * Batch triage — process multiple findings
   */
  async batchTriage(findings: Finding[]): Promise<TriageResult[]> {
    const results: TriageResult[] = [];
    for (const finding of findings) {
      try {
        const result = await this.autoTriage(finding);
        results.push(result);
      } catch (err) {
        console.error(`Triage failed for finding ${finding.id}:`, err);
        results.push({
          finding,
          verdict: 'needs_investigation',
          confidence: 0,
          reasoning: `Triage error: ${err instanceof Error ? err.message : 'Unknown error'}`,
          enrichment: {},
          suggested_actions: [{ type: 'investigate', description: 'Manual review required — auto-triage failed', auto_executable: false, executed: false }],
          auto_resolved: false,
        });
      }
    }
    return results;
  }

  /**
   * Triage all open findings that haven't been triaged yet
   */
  async triageOpenFindings(): Promise<TriageResult[]> {
    const openFindings = await findingsEngine.getAll({ status: 'open' });
    const untriaged = openFindings.filter(f => !f.triaged_at);
    return this.batchTriage(untriaged);
  }

  // ─── Enrichment ─────────────────────────────────────────────────────────────

  /**
   * Enrich a finding with external data sources.
   * Uses MCP tools when available, falls back to direct API calls.
   */
  async enrichFinding(finding: Finding): Promise<EnrichmentResult> {
    const enrichment: EnrichmentResult = {};

    // Parallel enrichment calls
    const promises: Promise<void>[] = [];

    // Shodan enrichment (if we have an IP)
    if (finding.target_host && this.isIP(finding.target_host)) {
      promises.push(
        this.enrichShodan(finding.target_host).then(data => { enrichment.shodan = data; }).catch(() => {})
      );
    }

    // CVE enrichment (if we have CVE IDs)
    if (finding.cve_ids && finding.cve_ids.length > 0) {
      promises.push(
        this.enrichCVEs(finding.cve_ids).then(data => { enrichment.cve = data; }).catch(() => {})
      );
    }

    // DNS enrichment (if we have a hostname)
    if (finding.target_host && !this.isIP(finding.target_host)) {
      promises.push(
        this.enrichDNS(finding.target_host).then(data => { enrichment.dns = data; }).catch(() => {})
      );
    }

    // Internal context (always)
    promises.push(
      this.enrichInternal(finding).then(data => { enrichment.internal = data; }).catch(() => {})
    );

    await Promise.allSettled(promises);

    // Record enrichment event
    await this.recordTriageEvent(finding.id, 'enrich', undefined, 0, 'Enrichment completed', enrichment);

    return enrichment;
  }

  private async enrichShodan(ip: string): Promise<EnrichmentResult['shodan']> {
    // Try MCP Shodan tool via Electron IPC
    if (window.electronAPI?.claudeChat) {
      try {
        const response = await this.queryClaudeForData(
          `Use the Shodan MCP tool to look up IP ${ip}. Return ONLY a JSON object with: ip, org, isp, country, city, ports (array), vulns (array of CVE strings), os, hostnames (array). No explanation.`
        );
        if (response) return JSON.parse(response);
      } catch { /* fall through */ }
    }

    // Fallback: call Shodan API directly if we have a key
    try {
      const apiKey = localStorage.getItem('shodan_api_key');
      if (apiKey) {
        const res = await fetch(`https://api.shodan.io/shodan/host/${ip}?key=${apiKey}`);
        if (res.ok) {
          const data = await res.json();
          return {
            ip: data.ip_str,
            org: data.org,
            isp: data.isp,
            country: data.country_name,
            city: data.city,
            ports: data.ports,
            vulns: data.vulns || [],
            os: data.os,
            hostnames: data.hostnames,
            last_update: data.last_update,
          };
        }
      }
    } catch { /* silent */ }

    return undefined;
  }

  private async enrichCVEs(cveIds: string[]): Promise<EnrichmentResult['cve']> {
    const results: NonNullable<EnrichmentResult['cve']> = [];

    for (const cveId of cveIds.slice(0, 5)) { // Limit to 5 CVEs
      try {
        // Try local Supabase CVE table first
        const { data } = await supabase
          .from('cves')
          .select('*')
          .eq('cve_id', cveId)
          .single();

        if (data) {
          results.push({
            id: data.cve_id,
            description: data.description,
            cvss: data.cvss_score || data.cvss || 0,
            epss: data.epss_score,
            exploitability: data.exploit_status,
            references: data.refs || data.references || [],
            affected_products: data.products || [],
          });
          continue;
        }

        // Fallback: NVD API
        const res = await fetch(`https://services.nvd.nist.gov/rest/json/cves/2.0?cveId=${cveId}`);
        if (res.ok) {
          const nvdData = await res.json();
          const vuln = nvdData.vulnerabilities?.[0]?.cve;
          if (vuln) {
            const cvssData = vuln.metrics?.cvssMetricV31?.[0] || vuln.metrics?.cvssMetricV2?.[0];
            results.push({
              id: cveId,
              description: vuln.descriptions?.find((d: any) => d.lang === 'en')?.value || '',
              cvss: cvssData?.cvssData?.baseScore || 0,
              references: vuln.references?.map((r: any) => r.url) || [],
            });
          }
        }
      } catch { /* silent per-CVE */ }
    }

    return results.length > 0 ? results : undefined;
  }

  private async enrichDNS(hostname: string): Promise<EnrichmentResult['dns']> {
    // Try MCP DNS tool
    if (window.electronAPI?.claudeChat) {
      try {
        const response = await this.queryClaudeForData(
          `Use the DNS MCP tool to look up ${hostname}. Return ONLY a JSON object with: a_records, mx_records, ns_records, txt_records, cname. No explanation.`
        );
        if (response) return JSON.parse(response);
      } catch { /* fall through */ }
    }

    return undefined;
  }

  private async enrichInternal(finding: Finding): Promise<EnrichmentResult['internal']> {
    try {
      const hostFindings = await findingsEngine.getByHost(finding.target_host);
      const fpCount = hostFindings.filter(f => f.status === 'false_positive').length;
      const chains = await findingsEngine.getChains();
      const relatedChains = chains.filter(c => c.target === finding.target_host);
      const oldestFinding = hostFindings.sort((a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )[0];

      return {
        previous_findings: hostFindings.length,
        previous_fps: fpCount,
        host_first_seen: oldestFinding?.created_at,
        related_chains: relatedChains.length,
      };
    } catch {
      return { previous_findings: 0, previous_fps: 0, related_chains: 0 };
    }
  }

  // ─── Context Scoring ────────────────────────────────────────────────────────

  /**
   * Calculate context-aware severity.
   * This is the "82% fix" — most criticals aren't critical in context.
   */
  private calculateContextScore(finding: Finding, enrichment: EnrichmentResult): {
    adjustedSeverity: FindingSeverity;
    contextScore: number;
  } {
    let score = SEVERITY_WEIGHTS[finding.severity] || 0;

    // Boost: has known exploits
    if (enrichment.cve) {
      for (const cve of enrichment.cve) {
        if (cve.exploitability) {
          score += EXPLOITABILITY_BONUS[cve.exploitability] || 0;
        }
        // EPSS score > 0.5 means likely to be exploited
        if (cve.epss && cve.epss > 0.5) score += 3;
        if (cve.epss && cve.epss > 0.9) score += 2;
      }
    }

    // Boost: Shodan confirms the service is internet-facing
    if (enrichment.shodan) {
      score += 1; // Internet-reachable = higher risk
      if (enrichment.shodan.vulns && enrichment.shodan.vulns.length > 0) score += 2;
    }

    // Reduce: high FP rate on this host historically
    if (enrichment.internal) {
      const fpRate = enrichment.internal.previous_findings > 0
        ? enrichment.internal.previous_fps / enrichment.internal.previous_findings
        : 0;
      if (fpRate > 0.7) score -= 3;
      if (fpRate > 0.9) score -= 2;
    }

    // Boost: is explicitly marked reachable/exploitable
    if (finding.is_reachable) score += 2;
    if (finding.is_exploitable) score += 3;

    // Reduce: info-only finding types
    if (finding.finding_type === 'info' || finding.finding_type === 'service') score -= 2;

    // Map score to severity
    let adjustedSeverity: FindingSeverity;
    if (score >= 12) adjustedSeverity = 'critical';
    else if (score >= 8) adjustedSeverity = 'high';
    else if (score >= 5) adjustedSeverity = 'medium';
    else if (score >= 2) adjustedSeverity = 'low';
    else adjustedSeverity = 'info';

    return { adjustedSeverity, contextScore: Math.max(0, Math.min(15, score)) };
  }

  // ─── AI Verdict ─────────────────────────────────────────────────────────────

  /**
   * Get AI verdict from Claude via Electron IPC.
   * Falls back to heuristic analysis if Claude is unavailable.
   */
  private async getAIVerdict(
    finding: Finding,
    enrichment: EnrichmentResult,
    contextScore: number
  ): Promise<{ verdict: TriageVerdict; confidence: number; reasoning: string }> {
    // Try Claude first
    if (window.electronAPI?.claudeChat) {
      try {
        const prompt = this.buildTriagePrompt(finding, enrichment, contextScore);
        const response = await this.queryClaudeForData(prompt);

        if (response) {
          try {
            const parsed = JSON.parse(response);
            return {
              verdict: parsed.verdict || 'needs_investigation',
              confidence: Math.min(1, Math.max(0, parsed.confidence || 0.5)),
              reasoning: parsed.reasoning || 'AI analysis completed',
            };
          } catch {
            // Claude returned non-JSON, try to extract
            return this.parseNaturalLanguageVerdict(response);
          }
        }
      } catch { /* fall through to heuristic */ }
    }

    // Heuristic fallback
    return this.heuristicVerdict(finding, enrichment, contextScore);
  }

  /**
   * Build the triage prompt for Claude.
   */
  private buildTriagePrompt(finding: Finding, enrichment: EnrichmentResult, contextScore: number): string {
    return `You are a security triage analyst. Analyze this finding and return a JSON verdict.

FINDING:
- Title: ${finding.title}
- Severity: ${finding.severity}
- Type: ${finding.finding_type}
- Source: ${finding.source}
- Target: ${finding.target_host}${finding.target_port ? ':' + finding.target_port : ''}
- Description: ${finding.description || 'N/A'}
- CVEs: ${finding.cve_ids?.join(', ') || 'None'}
- Context Score: ${contextScore}/15

ENRICHMENT:
${enrichment.shodan ? `- Shodan: ${enrichment.shodan.org || 'unknown org'}, ${enrichment.shodan.country || 'unknown country'}, ${enrichment.shodan.vulns?.length || 0} known vulns` : '- Shodan: No data'}
${enrichment.cve ? `- CVE Data: ${enrichment.cve.map(c => `${c.id} (CVSS: ${c.cvss}, EPSS: ${c.epss || 'N/A'})`).join(', ')}` : '- CVE Data: No data'}
${enrichment.internal ? `- Internal: ${enrichment.internal.previous_findings} previous findings on host, ${enrichment.internal.previous_fps} FPs, ${enrichment.internal.related_chains} attack chains` : '- Internal: No data'}

Return ONLY a JSON object (no markdown, no explanation):
{"verdict": "confirmed|false_positive|needs_investigation", "confidence": 0.0-1.0, "reasoning": "one sentence explanation"}`;
  }

  /**
   * Heuristic verdict when AI is unavailable.
   */
  private heuristicVerdict(
    finding: Finding,
    enrichment: EnrichmentResult,
    contextScore: number
  ): { verdict: TriageVerdict; confidence: number; reasoning: string } {
    // High context score + CVE data = likely confirmed
    if (contextScore >= 10 && enrichment.cve && enrichment.cve.length > 0) {
      return {
        verdict: 'confirmed',
        confidence: 0.85,
        reasoning: `High context score (${contextScore}/15) with ${enrichment.cve.length} confirmed CVE(s). Likely exploitable.`,
      };
    }

    // Info/service findings with no CVEs = likely FP or info only
    if ((finding.finding_type === 'info' || finding.finding_type === 'service') && (!finding.cve_ids || finding.cve_ids.length === 0)) {
      return {
        verdict: 'false_positive',
        confidence: 0.80,
        reasoning: 'Informational finding with no associated CVEs — low risk.',
      };
    }

    // High historical FP rate on this host
    if (enrichment.internal && enrichment.internal.previous_fps > 5 && enrichment.internal.previous_findings > 0) {
      const fpRate = enrichment.internal.previous_fps / enrichment.internal.previous_findings;
      if (fpRate > 0.8) {
        return {
          verdict: 'false_positive',
          confidence: 0.75,
          reasoning: `Host has ${Math.round(fpRate * 100)}% historical FP rate (${enrichment.internal.previous_fps}/${enrichment.internal.previous_findings}).`,
        };
      }
    }

    // Medium context — needs investigation
    if (contextScore >= 5) {
      return {
        verdict: 'needs_investigation',
        confidence: 0.60,
        reasoning: `Moderate context score (${contextScore}/15). Requires manual verification.`,
      };
    }

    // Low score
    return {
      verdict: 'false_positive',
      confidence: 0.65,
      reasoning: `Low context score (${contextScore}/15). Likely informational or non-exploitable.`,
    };
  }

  /**
   * Parse natural language response into verdict.
   */
  private parseNaturalLanguageVerdict(text: string): { verdict: TriageVerdict; confidence: number; reasoning: string } {
    const lower = text.toLowerCase();
    if (lower.includes('false positive') || lower.includes('not exploitable') || lower.includes('informational')) {
      return { verdict: 'false_positive', confidence: 0.70, reasoning: text.slice(0, 200) };
    }
    if (lower.includes('confirmed') || lower.includes('exploitable') || lower.includes('critical')) {
      return { verdict: 'confirmed', confidence: 0.75, reasoning: text.slice(0, 200) };
    }
    return { verdict: 'needs_investigation', confidence: 0.50, reasoning: text.slice(0, 200) };
  }

  // ─── False Positive Detection ───────────────────────────────────────────────

  private checkFalsePositivePatterns(finding: Finding): { reason: string; confidence: number } | null {
    const text = `${finding.title} ${finding.description || ''}`;
    for (const fp of FP_PATTERNS) {
      if (fp.pattern.test(text)) {
        return { reason: fp.reason, confidence: fp.confidence };
      }
    }
    return null;
  }

  // ─── Actions ────────────────────────────────────────────────────────────────

  private buildActions(finding: Finding, enrichment: EnrichmentResult, verdict: TriageVerdict): TriageAction[] {
    const actions: TriageAction[] = [];

    if (verdict === 'false_positive') {
      actions.push({
        type: 'suppress',
        description: 'Suppress this finding and similar future matches',
        auto_executable: true,
        executed: false,
      });
      return actions;
    }

    if (verdict === 'confirmed') {
      // SQLi → suggest parameterized queries
      if (finding.finding_type === 'vuln' && finding.cwe_ids?.includes('CWE-89')) {
        actions.push({
          type: 'patch',
          description: 'SQL Injection — use parameterized queries or ORM',
          auto_executable: false,
          executed: false,
        });
      }

      // XSS → suggest encoding
      if (finding.finding_type === 'vuln' && finding.cwe_ids?.includes('CWE-79')) {
        actions.push({
          type: 'patch',
          description: 'XSS — implement output encoding and CSP headers',
          auto_executable: false,
          executed: false,
        });
      }

      // Credential exposure
      if (finding.finding_type === 'credential') {
        actions.push({
          type: 'rotate_credential',
          description: 'Rotate exposed credentials immediately',
          auto_executable: false,
          executed: false,
        });
      }

      // Misconfig
      if (finding.finding_type === 'misconfig') {
        actions.push({
          type: 'config_fix',
          description: `Fix misconfiguration on ${finding.target_host}`,
          auto_executable: false,
          executed: false,
        });
      }

      // Generic escalation for confirmed vulns
      actions.push({
        type: 'escalate',
        description: `Escalate confirmed ${finding.severity} finding for remediation`,
        auto_executable: true,
        executed: false,
      });
    }

    if (verdict === 'needs_investigation') {
      actions.push({
        type: 'investigate',
        description: 'Manual investigation required — AI confidence too low for auto-resolution',
        auto_executable: false,
        executed: false,
      });
    }

    return actions;
  }

  // ─── Queue Management ──────────────────────────────────────────────────────

  /** Get the current triage queue (findings needing human review) */
  getTriageQueue(): TriageQueueItem[] {
    return [...this.triageQueue].sort((a, b) => b.priority_score - a.priority_score);
  }

  /** Human approves AI verdict */
  async approveVerdict(findingId: string): Promise<void> {
    const item = this.triageQueue.find(q => q.finding.id === findingId);
    if (!item || !item.ai_verdict) return;

    const newStatus = item.ai_verdict === 'false_positive' ? 'false_positive' :
                      item.ai_verdict === 'confirmed' ? 'confirmed' : 'open';

    await findingsEngine.update(findingId, {
      status: newStatus as FindingStatus,
      confidence: item.ai_confidence,
      triage_notes: `AI verdict approved by human: ${item.ai_reasoning}`,
      triaged_by: 'human',
      triaged_at: new Date().toISOString(),
    } as Partial<Finding>);

    await this.recordTriageEvent(findingId, 'human_triage', item.ai_verdict, item.ai_confidence || 0,
      `Human approved AI verdict: ${item.ai_verdict}`, item.enrichment);

    this.triageQueue = this.triageQueue.filter(q => q.finding.id !== findingId);
  }

  /** Human rejects AI verdict and provides own */
  async rejectVerdict(findingId: string, humanVerdict: TriageVerdict, notes?: string): Promise<void> {
    const newStatus = humanVerdict === 'false_positive' ? 'false_positive' :
                      humanVerdict === 'confirmed' ? 'confirmed' :
                      humanVerdict === 'resolved' ? 'resolved' : 'open';

    await findingsEngine.update(findingId, {
      status: newStatus as FindingStatus,
      triage_notes: notes || `Human override: ${humanVerdict}`,
      triaged_by: 'human',
      triaged_at: new Date().toISOString(),
    } as Partial<Finding>);

    await this.recordTriageEvent(findingId, 'human_triage', humanVerdict, 1.0,
      notes || `Human rejected AI verdict, set to: ${humanVerdict}`);

    this.triageQueue = this.triageQueue.filter(q => q.finding.id !== findingId);
  }

  // ─── Remediation Playbooks ─────────────────────────────────────────────────

  async getPlaybooks(): Promise<RemediationPlaybook[]> {
    const { data, error } = await supabase
      .from('remediation_playbooks')
      .select('*')
      .order('success_count', { ascending: false });

    if (error) throw new Error(`Failed to fetch playbooks: ${error.message}`);
    return data || [];
  }

  async createPlaybook(playbook: Omit<RemediationPlaybook, 'id' | 'success_count' | 'created_at'>): Promise<RemediationPlaybook> {
    const { data, error } = await supabase
      .from('remediation_playbooks')
      .insert({ ...playbook, success_count: 0 })
      .select()
      .single();

    if (error) throw new Error(`Failed to create playbook: ${error.message}`);
    return data;
  }

  async executePlaybook(playbookId: string, findingId: string): Promise<{ success: boolean; output: string }> {
    const playbook = await this.getPlaybook(playbookId);
    if (!playbook) return { success: false, output: 'Playbook not found' };

    const outputs: string[] = [];

    for (const step of playbook.steps.sort((a, b) => a.order - b.order)) {
      if (step.requires_approval) {
        outputs.push(`[PAUSE] Step ${step.order}: ${step.description} — requires manual approval`);
        break;
      }

      if (step.command && window.electronAPI?.claudeChat) {
        try {
          const result = await this.queryClaudeForData(`Execute this command and return the output: ${step.command}`);
          outputs.push(`[OK] Step ${step.order}: ${step.description}\n${result || 'Executed'}`);
        } catch (err) {
          outputs.push(`[FAIL] Step ${step.order}: ${step.description}\n${err}`);
          return { success: false, output: outputs.join('\n\n') };
        }
      } else {
        outputs.push(`[SKIP] Step ${step.order}: ${step.description} — no command or no executor`);
      }
    }

    // Increment success count
    await supabase
      .from('remediation_playbooks')
      .update({ success_count: playbook.success_count + 1 })
      .eq('id', playbookId);

    await this.recordTriageEvent(findingId, 'resolve', 'resolved', 1.0,
      `Playbook "${playbook.name}" executed`, {}, { playbook_id: playbookId, output: outputs });

    return { success: true, output: outputs.join('\n\n') };
  }

  private async getPlaybook(id: string): Promise<RemediationPlaybook | null> {
    const { data } = await supabase
      .from('remediation_playbooks')
      .select('*')
      .eq('id', id)
      .single();
    return data;
  }

  // ─── Stats ──────────────────────────────────────────────────────────────────

  async getStats(): Promise<TriageStats> {
    const { data: events, error } = await supabase
      .from('triage_events')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !events) {
      return {
        total_triaged: 0, auto_resolved: 0, human_resolved: 0,
        auto_resolve_rate: 0, avg_confidence: 0, avg_triage_time_ms: 0,
        false_positive_rate: 0, by_verdict: {},
      };
    }

    const autoEvents = events.filter(e => e.event_type === 'auto_triage');
    const humanEvents = events.filter(e => e.event_type === 'human_triage');
    const autoResolved = autoEvents.filter(e => e.actions_taken?.auto_resolved);
    const fpEvents = events.filter(e => e.verdict === 'false_positive');
    const verdictedEvents = events.filter(e => e.verdict);

    const by_verdict: Record<string, number> = {};
    for (const e of events) {
      if (e.verdict) by_verdict[e.verdict] = (by_verdict[e.verdict] || 0) + 1;
    }

    const totalConfidence = events.reduce((sum, e) => sum + (e.confidence || 0), 0);
    const totalTime = autoEvents.reduce((sum, e) => sum + (e.actions_taken?.duration_ms || 0), 0);

    return {
      total_triaged: events.length,
      auto_resolved: autoResolved.length,
      human_resolved: humanEvents.length,
      auto_resolve_rate: events.length > 0 ? autoResolved.length / events.length : 0,
      avg_confidence: events.length > 0 ? totalConfidence / events.length : 0,
      avg_triage_time_ms: autoEvents.length > 0 ? totalTime / autoEvents.length : 0,
      false_positive_rate: verdictedEvents.length > 0 ? fpEvents.length / verdictedEvents.length : 0,
      by_verdict,
    };
  }

  // ─── Event Recording ───────────────────────────────────────────────────────

  async getTriageHistory(findingId: string): Promise<TriageEvent[]> {
    const { data, error } = await supabase
      .from('triage_events')
      .select('*')
      .eq('finding_id', findingId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to fetch triage history: ${error.message}`);
    return data || [];
  }

  private async recordTriageEvent(
    findingId: string,
    eventType: TriageEventType,
    verdict: TriageVerdict | undefined,
    confidence: number,
    reasoning: string,
    enrichmentData?: Record<string, unknown>,
    actionsTaken?: Record<string, unknown>
  ): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('triage_events').insert({
        finding_id: findingId,
        event_type: eventType,
        verdict,
        confidence,
        reasoning,
        enrichment_data: enrichmentData || {},
        actions_taken: actionsTaken || {},
        performed_by: eventType === 'human_triage' ? `human:${user?.email || 'unknown'}` : 'ai:claude',
      });
    } catch (err) {
      console.error('Failed to record triage event:', err);
    }
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private async checkDuplicates(finding: Finding): Promise<Finding[]> {
    try {
      const dupes = await findingsEngine.getAll({
        target_host: finding.target_host,
        finding_type: finding.finding_type,
        search: finding.title.slice(0, 40),
      });
      // Exclude self, only confirmed/open
      return dupes.filter(d =>
        d.id !== finding.id &&
        d.status !== 'duplicate' &&
        d.status !== 'false_positive'
      );
    } catch {
      return [];
    }
  }

  private buildDuplicateResult(finding: Finding, original: Finding): TriageResult {
    return {
      finding,
      verdict: 'duplicate',
      confidence: 0.98,
      reasoning: `Duplicate of existing finding "${original.title}" (${original.id})`,
      enrichment: {},
      suggested_actions: [{
        type: 'suppress',
        description: `Merged with existing finding ${original.id}`,
        auto_executable: true,
        executed: true,
      }],
      auto_resolved: true,
    };
  }

  private isIP(host: string): boolean {
    return /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host);
  }

  /**
   * Query Claude for structured data via Electron IPC.
   * Sends a prompt, collects text events, returns the text response.
   */
  private queryClaudeForData(prompt: string): Promise<string | null> {
    return new Promise((resolve) => {
      if (!window.electronAPI?.claudeChat) {
        resolve(null);
        return;
      }

      let response = '';
      const timeout = setTimeout(() => resolve(response || null), 30000);

      window.electronAPI.removeClaudeListeners?.();
      window.electronAPI.onClaudeStreamEvent?.((raw: any) => {
        try {
          const event = typeof raw === 'string' ? JSON.parse(raw) : raw;
          if (event.type === 'text' || event.type === 'assistant') {
            response += event.content || event.text || '';
          }
          if (event.type === 'done' || event.type === 'error') {
            clearTimeout(timeout);
            resolve(response || null);
          }
        } catch { /* ignore parse errors */ }
      });

      window.electronAPI.claudeChat({
        prompt,
        model: 'haiku', // Fast + cheap for triage
        maxBudget: 0.50,
        sessionId: null,
      });
    });
  }
}

// Export singleton
export const triageEngine = new TriageEngine();
export default triageEngine;
