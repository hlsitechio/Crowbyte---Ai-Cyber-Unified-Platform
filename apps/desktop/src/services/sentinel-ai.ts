import { createChatCompletion } from './ai';
/**
 * Sentinel AI UilBrain — LLM-powered threat analysis
 *
 * Adds intelligence to the Sentinel pipeline:
 * - Contextual risk assessment (not just CVSS)
 * - Smart action generation based on actual infrastructure
 * - Natural language threat briefings
 * - Interactive threat Q&A
 *
 * Uses: Supabase edge function (web) or Claude IPC (desktop)
 */

import { supabase } from '@/lib/supabase';
import type { InfrastructureAsset, ThreatAction, ActionItem } from './sentinel';
import type { CPEMatch, CVERecord } from './sentinel-engine';

// ── Types ────────────────────────────────────────────────────────────────

export interface AIThreatAnalysis {
  cve_id: string;
  risk_score: number;              // 0-100, context-aware (not just CVSS)
  risk_level: 'critical' | 'high' | 'medium' | 'low' | 'info';
  exploit_likelihood: 'confirmed_itw' | 'poc_public' | 'likely' | 'possible' | 'unlikely';
  impact_summary: string;          // One-line: what happens if exploited
  context_analysis: string;        // Why this matters for YOUR specific stack
  attack_scenario: string;         // How an attacker would chain this
  remediation_plan: AIRemediationStep[];
  detection_advice: string;        // How to detect exploitation attempts
  related_threats: string[];       // Other CVEs that chain with this
  confidence: number;              // AI confidence in analysis 0-1
  briefing: string;                // Full natural language briefing for the user
}

export interface AIRemediationStep {
  order: number;
  title: string;
  description: string;
  command?: string;
  rollback?: string;
  risk: 'none' | 'low' | 'medium' | 'high';   // Risk of the remediation itself
  downtime: boolean;
  estimated_time: string;           // "2 minutes", "requires restart"
}

export interface SentinelChatMessage {
  role: 'user' | 'sentinel';
  content: string;
  timestamp: string;
  context?: {
    threats?: string[];
    assets?: string[];
  };
}

// ── Prompts ──────────────────────────────────────────────────────────────

const SENTINEL_SYSTEM_PROMPT = `You are Sentinel AI, an autonomous security operations agent embedded in CrowByte Terminal. You analyze vulnerabilities against the user's actual infrastructure and provide actionable intelligence.

Your personality:
- Direct and technical. No fluff.
- Think like a red teamer — how would YOU exploit this?
- Always relate findings to the user's SPECIFIC infrastructure
- Prioritize by real-world exploitability, not just CVSS
- Give exact commands, not vague advice
- Flag when things can be chained together

Output format for threat analysis (JSON):
{
  "risk_score": 0-100,
  "risk_level": "critical|high|medium|low|info",
  "exploit_likelihood": "confirmed_itw|poc_public|likely|possible|unlikely",
  "impact_summary": "one line — what happens if exploited",
  "context_analysis": "2-3 sentences — why this matters for THIS user's stack",
  "attack_scenario": "step-by-step how an attacker chains this",
  "remediation_plan": [
    {"order": 1, "title": "...", "description": "...", "command": "...", "rollback": "...", "risk": "none|low|medium|high", "downtime": false, "estimated_time": "2 min"}
  ],
  "detection_advice": "how to detect exploitation attempts",
  "related_threats": ["CVE-YYYY-XXXX"],
  "confidence": 0.0-1.0,
  "briefing": "full paragraph briefing for the user"
}`;

const SENTINEL_CHAT_PROMPT = `You are Sentinel AI, the security operations agent in CrowByte Terminal. You have full context of the user's infrastructure and active threats.

Rules:
- Answer security questions about their infrastructure
- Explain threats in plain language when asked
- Generate reports, remediation plans, detection rules on demand
- Suggest what to prioritize
- Flag attack chains across multiple vulnerabilities
- Be direct, technical, no fluff
- If asked about something outside your context, say so`;

// ── Service ──────────────────────────────────────────────────────────────

class SentinelAI {
  private chatHistory: SentinelChatMessage[] = [];

  // ── Threat Analysis ──────────────────────────────────────────────────

  /**
   * AI-powered analysis of a CVE match against user infrastructure.
   * Returns enriched threat intelligence with context-aware risk scoring.
   */
  async analyzeThreat(
    match: CPEMatch,
    allAssets: InfrastructureAsset[],
    existingThreats: ThreatAction[]
  ): Promise<AIThreatAnalysis> {
    const prompt = this.buildAnalysisPrompt(match, allAssets, existingThreats);

    try {
      const response = await this.callLLM(prompt, SENTINEL_SYSTEM_PROMPT);
      const analysis = this.parseAnalysis(response, match.cve);
      return analysis;
    } catch (err) {
      // Fallback to heuristic analysis
      return this.heuristicAnalysis(match, allAssets);
    }
  }

  /**
   * Batch analyze multiple matches. Groups by CVE to avoid redundant calls.
   */
  async batchAnalyze(
    matches: CPEMatch[],
    allAssets: InfrastructureAsset[],
    existingThreats: ThreatAction[]
  ): Promise<AIThreatAnalysis[]> {
    // Group by CVE ID
    const byCVE = new Map<string, CPEMatch[]>();
    for (const match of matches) {
      const existing = byCVE.get(match.cve.cve_id) || [];
      existing.push(match);
      byCVE.set(match.cve.cve_id, existing);
    }

    const analyses: AIThreatAnalysis[] = [];

    // Process in batches of 3 to avoid rate limits
    const entries = Array.from(byCVE.entries());
    for (let i = 0; i < entries.length; i += 3) {
      const batch = entries.slice(i, i + 3);
      const results = await Promise.allSettled(
        batch.map(([_, cveMatches]) =>
          this.analyzeThreat(cveMatches[0], allAssets, existingThreats)
        )
      );

      for (const result of results) {
        if (result.status === 'fulfilled') {
          analyses.push(result.value);
        }
      }
    }

    // Sort by risk score descending
    return analyses.sort((a, b) => b.risk_score - a.risk_score);
  }

  /**
   * Generate a threat briefing for all active threats.
   * "Here's what Sentinel found — prioritized by real risk."
   */
  async generateBriefing(
    threats: ThreatAction[],
    assets: InfrastructureAsset[]
  ): Promise<string> {
    const activeThreats = threats.filter(t => ['new', 'investigating', 'mitigating'].includes(t.status));

    if (activeThreats.length === 0) {
      return 'No active threats detected. Your infrastructure looks clean based on current CVE data. Keep your asset profiles updated for continuous monitoring.';
    }

    const prompt = `Generate a security briefing for the operator. Be concise and actionable.

INFRASTRUCTURE:
${assets.map(a => `- ${a.name} (${a.asset_type}) — ${a.ip_address || a.hostname || 'no IP'} — ${a.services?.length || 0} services — ${a.os || 'unknown OS'}`).join('\n')}

ACTIVE THREATS (${activeThreats.length}):
${activeThreats.map(t => `- ${t.cve_id} [${t.severity.toUpperCase()}] — ${t.title?.slice(0, 100)} — Affects: ${t.matched_assets?.join(', ') || 'unknown'} — Status: ${t.status}`).join('\n')}

Write a 3-5 paragraph briefing covering:
1. Overall security posture (one sentence)
2. Top priority threat and why
3. Quick wins (what can be fixed in < 30 min)
4. What needs deeper investigation
5. Recommended next actions`;

    try {
      return await this.callLLM(prompt, SENTINEL_CHAT_PROMPT);
    } catch {
      return `${activeThreats.length} active threats detected across ${assets.length} assets. ` +
        `${activeThreats.filter(t => t.severity === 'critical').length} critical, ` +
        `${activeThreats.filter(t => t.severity === 'high').length} high severity. ` +
        `Priority: ${activeThreats[0]?.cve_id || 'review threats'}.`;
    }
  }

  // ── Chat Interface ───────────────────────────────────────────────────

  /**
   * Chat with Sentinel AI about threats and infrastructure.
   */
  async chat(
    message: string,
    threats: ThreatAction[],
    assets: InfrastructureAsset[]
  ): Promise<string> {
    // Add user message to history
    this.chatHistory.push({
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    });

    // Build context-aware prompt
    const contextPrompt = this.buildChatContext(threats, assets);

    const fullPrompt = `${contextPrompt}

CONVERSATION HISTORY:
${this.chatHistory.slice(-10).map(m => `${m.role === 'user' ? 'USER' : 'SENTINEL'}: ${m.content}`).join('\n')}

USER: ${message}

Respond as Sentinel AI. Be direct and technical.`;

    try {
      const response = await this.callLLM(fullPrompt, SENTINEL_CHAT_PROMPT);

      this.chatHistory.push({
        role: 'sentinel',
        content: response,
        timestamp: new Date().toISOString(),
      });

      return response;
    } catch (err) {
      const errorMsg = 'Sentinel AI is temporarily unavailable. Check your LLM configuration in Settings > Integrations.';
      this.chatHistory.push({ role: 'sentinel', content: errorMsg, timestamp: new Date().toISOString() });
      return errorMsg;
    }
  }

  /**
   * Get suggested questions based on current threat landscape.
   */
  getSuggestedQuestions(threats: ThreatAction[], assets: InfrastructureAsset[]): string[] {
    const questions: string[] = [];

    if (threats.length === 0 && assets.length === 0) {
      return [
        'How do I add my infrastructure?',
        'What does the Sentinel pipeline do?',
        'How does CPE matching work?',
      ];
    }

    if (assets.length > 0 && threats.length === 0) {
      return [
        'Run a CVE scan against my infrastructure',
        'What are the most common vulnerabilities for my stack?',
        'Is my infrastructure properly hardened?',
      ];
    }

    const critical = threats.filter(t => t.severity === 'critical');
    const high = threats.filter(t => t.severity === 'high');

    if (critical.length > 0) {
      questions.push(`Explain ${critical[0].cve_id} — how bad is it for me?`);
      questions.push('What should I patch first?');
    }

    if (high.length > 0) {
      questions.push(`Can any of these ${threats.length} threats be chained together?`);
    }

    questions.push('Give me a security briefing');
    questions.push('What quick wins can I do right now?');
    questions.push('Generate a report for my team');

    return questions.slice(0, 5);
  }

  /**
   * Clear chat history.
   */
  clearChat() {
    this.chatHistory = [];
  }

  /**
   * Get chat history.
   */
  getHistory(): SentinelChatMessage[] {
    return [...this.chatHistory];
  }

  // ── AI-Enhanced Action Generation ────────────────────────────────────

  /**
   * Generate smart remediation actions using AI.
   * Unlike template actions, these are specific to the user's OS, package manager, and setup.
   */
  async generateSmartActions(
    cve: CVERecord,
    affectedAssets: InfrastructureAsset[]
  ): Promise<ActionItem[]> {
    const prompt = `Generate specific remediation actions for this vulnerability on these systems.

CVE: ${cve.cve_id}
CVSS: ${cve.cvss_score}
Description: ${cve.description?.slice(0, 300)}
Exploit Status: ${cve.exploit_status || 'unknown'}

AFFECTED SYSTEMS:
${affectedAssets.map(a => `- ${a.name}: ${a.os || 'unknown OS'}, Services: ${a.services?.map(s => `${s.service} ${s.version || ''} (port ${s.port})`).join(', ') || 'none'}`).join('\n')}

Return a JSON array of actions:
[{"label": "...", "type": "patch|config|block|scan|investigate|monitor", "command": "exact command", "rollback": "rollback command or null", "estimated_time": "2 min"}]

Rules:
- Use the correct package manager for the OS (apt for Debian/Ubuntu, yum for RHEL/CentOS)
- Include service restarts after patches
- Add firewall rules using ufw or iptables
- Include verification steps
- Max 6 actions`;

    try {
      const response = await this.callLLM(prompt, SENTINEL_SYSTEM_PROMPT);
      const parsed = JSON.parse(this.extractJSON(response));

      if (Array.isArray(parsed)) {
        return parsed.map((action: any, i: number) => ({
          id: crypto.randomUUID().slice(0, 8),
          label: action.label || `Action ${i + 1}`,
          type: action.type || 'investigate',
          command: action.command,
          rollback: action.rollback,
          completed: false,
        }));
      }
    } catch { /* fall through */ }

    // Fallback: return basic actions
    return [
      { id: crypto.randomUUID().slice(0, 8), label: 'Investigate vulnerability impact', type: 'investigate', completed: false },
      { id: crypto.randomUUID().slice(0, 8), label: 'Update affected packages', type: 'patch', command: 'apt-get update && apt-get upgrade -y', completed: false },
    ];
  }

  // ── Private Methods ──────────────────────────────────────────────────

  private buildAnalysisPrompt(
    match: CPEMatch,
    allAssets: InfrastructureAsset[],
    existingThreats: ThreatAction[]
  ): string {
    const asset = match.asset;
    const cve = match.cve;

    // Find related threats for chain analysis
    const relatedThreats = existingThreats.filter(t =>
      t.matched_assets?.some(a => match.asset.name === a) &&
      t.cve_id !== cve.cve_id
    );

    return `Analyze this CVE match against the user's infrastructure. Return JSON analysis.

CVE: ${cve.cve_id}
CVSS Score: ${cve.cvss_score}
CVSS Vector: ${cve.cvss_vector || 'N/A'}
Description: ${cve.description || 'N/A'}
Exploit Status: ${cve.exploit_status || 'unknown'}
CWE: ${cve.cwe?.join(', ') || 'N/A'}
Published: ${cve.published_date || 'N/A'}

MATCHED ASSET:
- Name: ${asset.name}
- Type: ${asset.asset_type}
- IP: ${asset.ip_address || 'N/A'}
- Hostname: ${asset.hostname || 'N/A'}
- OS: ${asset.os || 'unknown'}
- Open Ports: ${asset.open_ports?.join(', ') || 'none'}
- Services: ${asset.services?.map(s => `${s.service} ${s.version || ''} (port ${s.port}/${s.protocol})`).join(', ') || 'none'}
- Tags: ${asset.tags?.join(', ') || 'none'}

MATCHED CPE: ${match.matched_cpe}
Match Type: ${match.match_type} (${Math.round(match.confidence * 100)}% confidence)

FULL INFRASTRUCTURE (${allAssets.length} assets):
${allAssets.slice(0, 10).map(a => `- ${a.name} (${a.asset_type}): ${a.ip_address || a.hostname || 'no addr'} — ${a.services?.length || 0} services`).join('\n')}

${relatedThreats.length > 0 ? `EXISTING THREATS ON SAME ASSET (chain potential!):
${relatedThreats.map(t => `- ${t.cve_id} [${t.severity}] — ${t.title?.slice(0, 80)}`).join('\n')}` : 'No other threats on this asset.'}

Analyze and return the JSON analysis object.`;
  }

  private buildChatContext(threats: ThreatAction[], assets: InfrastructureAsset[]): string {
    return `CURRENT INFRASTRUCTURE (${assets.length} assets):
${assets.slice(0, 15).map(a => `- ${a.name} (${a.asset_type}) — ${a.ip_address || a.hostname || 'no IP'} — OS: ${a.os || '?'} — ${a.services?.length || 0} services — CPEs: ${a.cpe_list?.length || 0}`).join('\n')}

ACTIVE THREATS (${threats.filter(t => ['new', 'investigating', 'mitigating'].includes(t.status)).length}):
${threats.filter(t => t.status !== 'resolved' && t.status !== 'false_positive').slice(0, 10).map(t =>
  `- ${t.cve_id} [${t.severity.toUpperCase()}/${t.urgency}] — ${t.title?.slice(0, 80)} — Assets: ${t.matched_assets?.join(', ') || '?'} — Status: ${t.status} — Actions: ${t.actions?.filter(a => a.completed).length || 0}/${t.actions?.length || 0} done`
).join('\n')}

RESOLVED: ${threats.filter(t => t.status === 'resolved').length} | FALSE POSITIVES: ${threats.filter(t => t.status === 'false_positive').length}`;
  }

  private parseAnalysis(response: string, cve: CVERecord): AIThreatAnalysis {
    const json = this.extractJSON(response);
    const parsed = JSON.parse(json);

    return {
      cve_id: cve.cve_id,
      risk_score: Math.min(100, Math.max(0, parsed.risk_score || 50)),
      risk_level: parsed.risk_level || this.cvssToRisk(cve.cvss_score),
      exploit_likelihood: parsed.exploit_likelihood || 'possible',
      impact_summary: parsed.impact_summary || cve.description?.slice(0, 100) || 'Unknown impact',
      context_analysis: parsed.context_analysis || 'AI analysis unavailable',
      attack_scenario: parsed.attack_scenario || 'No attack scenario generated',
      remediation_plan: (parsed.remediation_plan || []).map((step: any, i: number) => ({
        order: step.order || i + 1,
        title: step.title || `Step ${i + 1}`,
        description: step.description || '',
        command: step.command,
        rollback: step.rollback,
        risk: step.risk || 'low',
        downtime: step.downtime || false,
        estimated_time: step.estimated_time || 'unknown',
      })),
      detection_advice: parsed.detection_advice || 'Monitor logs for exploitation attempts',
      related_threats: parsed.related_threats || [],
      confidence: Math.min(1, Math.max(0, parsed.confidence || 0.5)),
      briefing: parsed.briefing || `${cve.cve_id} (CVSS ${cve.cvss_score}) detected in your infrastructure.`,
    };
  }

  private heuristicAnalysis(match: CPEMatch, _allAssets: InfrastructureAsset[]): AIThreatAnalysis {
    const cve = match.cve;
    const asset = match.asset;
    const isPublicFacing = asset.tags?.some(t => ['public', 'public-facing', 'external', 'dmz'].includes(t.toLowerCase()));
    const hasExploit = ['active', 'weaponized', 'poc', 'poc_available'].includes(cve.exploit_status || '');

    let riskScore = cve.cvss_score * 10;
    if (isPublicFacing) riskScore += 15;
    if (hasExploit) riskScore += 20;
    if (match.match_type === 'exact') riskScore += 5;
    riskScore = Math.min(100, Math.max(0, riskScore));

    return {
      cve_id: cve.cve_id,
      risk_score: riskScore,
      risk_level: this.cvssToRisk(cve.cvss_score),
      exploit_likelihood: hasExploit ? 'poc_public' : 'possible',
      impact_summary: cve.description?.slice(0, 120) || 'Vulnerability detected',
      context_analysis: `${cve.cve_id} affects ${asset.name} (${asset.os || 'unknown OS'})${isPublicFacing ? ' — this asset is PUBLIC-FACING, increasing risk' : ''}. Matched via ${match.match_type} CPE comparison with ${Math.round(match.confidence * 100)}% confidence.`,
      attack_scenario: `An attacker targeting ${asset.ip_address || asset.hostname || asset.name} could exploit ${cve.cve_id} on ${asset.services?.map(s => s.service).join('/') || 'exposed services'}.`,
      remediation_plan: [
        { order: 1, title: 'Verify vulnerability', description: 'Confirm affected version is running', risk: 'none' as const, downtime: false, estimated_time: '5 min' },
        { order: 2, title: 'Apply patch', description: 'Update to latest version', command: 'apt-get update && apt-get upgrade -y', risk: 'low' as const, downtime: true, estimated_time: '10 min' },
      ],
      detection_advice: 'Monitor access logs and IDS alerts for exploitation patterns',
      related_threats: [],
      confidence: 0.6,
      briefing: `${cve.cve_id} (CVSS ${cve.cvss_score}) was matched against ${asset.name}. ${hasExploit ? 'Active exploits exist.' : 'No known exploits.'} ${isPublicFacing ? 'The asset is internet-facing, increasing exposure.' : ''}`,
    };
  }

  /**
   * Call LLM via Supabase edge function or Electron IPC.
   */
  private async callLLM(prompt: string, systemPrompt: string): Promise<string> {
    // Strategy 1: Supabase edge function (works everywhere)
    try {
      const { data: session } = await supabase.auth.getSession();
      if (session?.session) {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sentinel-ai`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.session.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: prompt },
              ],
              max_tokens: 2000,
              temperature: 0.3,
            }),
          }
        );

        if (response.ok) {
          const data = await response.json();
          if (data.content || data.text || data.message) {
            return data.content || data.text || data.message;
          }
        }
      }
    } catch { /* try next strategy */ }

    // Strategy 2: CrowByte API proxy (server-side key)
    try {
      const { supabase } = await import('@/lib/supabase');
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('https://crowbyte.io/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          model: 'deepseek-ai/deepseek-v3.2',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt },
          ],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) return content;
      }
    } catch { /* try next strategy */ }

    // Strategy 3: Direct API key from settings
    try {
      const apiKey = localStorage.getItem('anthropic_api_key') || localStorage.getItem('openai_api_key');
      if (apiKey) {
        const isAnthropic = localStorage.getItem('anthropic_api_key') === apiKey;

        if (isAnthropic) {
          const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'claude-haiku-4-5-20251001',
              max_tokens: 2000,
              system: systemPrompt,
              messages: [{ role: 'user', content: prompt }],
            }),
          });

          if (response.ok) {
            const data = await response.json();
            return data.content?.[0]?.text || '';
          }
        } else {
          const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'gpt-4o-mini',
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: prompt },
              ],
              max_tokens: 2000,
              temperature: 0.3,
            }),
          });

          if (response.ok) {
            const data = await response.json();
            return data.choices?.[0]?.message?.content || '';
          }
        }
      }
    } catch { /* all strategies failed */ }

    throw new Error('No LLM provider available');
  }

  private extractJSON(text: string): string {
    // Try to find JSON in the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) return jsonMatch[0];

    const arrayMatch = text.match(/\[[\s\S]*\]/);
    if (arrayMatch) return arrayMatch[0];

    return text;
  }

  private cvssToRisk(cvss: number): AIThreatAnalysis['risk_level'] {
    if (cvss >= 9.0) return 'critical';
    if (cvss >= 7.0) return 'high';
    if (cvss >= 4.0) return 'medium';
    if (cvss >= 0.1) return 'low';
    return 'info';
  }
}

export const sentinelAI = new SentinelAI();
export default sentinelAI;
