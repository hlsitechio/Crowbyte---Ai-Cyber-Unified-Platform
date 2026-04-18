/**
 * CrowByte Section Agent
 * Powers inline AI actions across every section of the app.
 * Each section has a specialized persona + context-aware actions.
 */

import openClaw from './ai';

// ─── Section definitions ──────────────────────────────────────────────────────

export type SectionId =
  | 'findings' | 'alerts' | 'cves' | 'threat-intel'
  | 'fleet' | 'sentinel' | 'redteam' | 'reports'
  | 'missions' | 'dashboard';

export type ActionId =
  | 'triage'           // Assess severity/priority
  | 'remediate'        // Draft remediation steps
  | 'link-cve'         // Find related CVEs
  | 'check-fleet'      // Check if fleet devices are exposed
  | 'draft-report'     // Write a report entry
  | 'classify'         // Classify/categorize
  | 'correlate'        // Cross-reference with other data
  | 'summarize'        // Summarize a set of items
  | 'explain'          // Explain what something means
  | 'escalate';        // Recommend escalation path

export interface SectionAction {
  id: ActionId;
  label: string;
  icon: string;
  description: string;
  promptBuilder: (data: Record<string, unknown>) => string;
}

export interface AgentResult {
  content: string;
  actionId: ActionId;
  sectionId: SectionId;
  dataSnapshot: Record<string, unknown>;
  timestamp: number;
}

// ─── Per-section personas ─────────────────────────────────────────────────────

const SECTION_PERSONAS: Record<SectionId, string> = {
  findings: `You are a senior penetration tester and vulnerability analyst for CrowByte.
You review security findings and provide expert triage, remediation guidance, and risk assessment.
Be concise. Use severity ratings (Critical/High/Medium/Low/Info). Always recommend concrete next steps.`,

  alerts: `You are a SOC analyst specializing in alert triage for CrowByte.
You classify security alerts, correlate them with threat intelligence, and determine escalation paths.
Be fast and decisive. Distinguish noise from real threats. Give confidence scores.`,

  cves: `You are a vulnerability intelligence specialist for CrowByte.
You analyze CVEs, assess exploitability (EPSS, KEV status, CVSS), and determine organizational impact.
Cross-reference with known attack patterns. Always check if it's in CISA KEV.`,

  'threat-intel': `You are a cyber threat intelligence analyst for CrowByte.
You analyze IOCs, threat actors, and attack campaigns. You correlate indicators across feeds.
Give tactical context — what does this IOC mean for the organization right now?`,

  fleet: `You are a security engineer specializing in asset management and exposure analysis for CrowByte.
You assess device vulnerabilities, patch status, and exposure. Map CVEs to affected devices.
Be specific — name the devices, versions, and exact risk.`,

  sentinel: `You are a security operations specialist reviewing AI agent decisions for CrowByte.
You validate autonomous actions taken by the Sentinel agent, answer escalations, and refine policies.
Be analytical. When the agent was wrong, explain why and how to prevent it.`,

  redteam: `You are an offensive security operator for CrowByte.
You help with exploit development, payload crafting, reconnaissance, and documenting findings.
Be technical and precise. Write working code. Think like an attacker.`,

  reports: `You are a technical writer specializing in security reports for CrowByte.
You write clear, professional reports in HackerOne/Bugcrowd/NIST format.
Lead with business impact. Executive summary first, then technical detail.`,

  missions: `You are a security operations manager for CrowByte.
You plan and track security missions, assign tasks, and ensure SLAs are met.
Prioritize by risk and effort. Think operationally.`,

  dashboard: `You are the CrowByte command center AI.
You have visibility across all security sections and correlate signals into actionable intelligence.
Surface the most critical issues across the entire security posture. Be a force multiplier.`,
};

// ─── Per-section actions ──────────────────────────────────────────────────────

export const SECTION_ACTIONS: Record<SectionId, SectionAction[]> = {
  findings: [
    {
      id: 'triage',
      label: 'Triage',
      icon: '🔍',
      description: 'Assess severity and priority',
      promptBuilder: (f) => `Triage this security finding:

Title: ${f.title}
Severity: ${f.severity}
Target: ${f.target_host}${f.target_port ? `:${f.target_port}` : ''}
Source: ${f.source}
Description: ${f.description || 'N/A'}
Evidence: ${f.evidence || 'N/A'}
CVE: ${f.cve_id || 'None'}
Status: ${f.status}

Provide:
1. Confirmed severity (agree or adjust, with reasoning)
2. Exploitability assessment (is this actually exploitable right now?)
3. Business impact (what happens if exploited?)
4. Priority score (P1-P4)
5. Recommended next action (one sentence)`,
    },
    {
      id: 'remediate',
      label: 'Fix it',
      icon: '🔧',
      description: 'Get remediation steps',
      promptBuilder: (f) => `Write remediation steps for this finding:

Title: ${f.title}
Severity: ${f.severity}
Target: ${f.target_host}
Description: ${f.description || 'N/A'}
CVE: ${f.cve_id || 'None'}

Provide:
1. Immediate mitigation (do this NOW to reduce exposure)
2. Permanent fix (what to deploy/patch/configure)
3. Verification steps (how to confirm it's fixed)
4. Estimated effort (hours)`,
    },
    {
      id: 'draft-report',
      label: 'Report',
      icon: '📋',
      description: 'Draft a report entry',
      promptBuilder: (f) => `Write a professional bug bounty / pentest report entry for this finding:

Title: ${f.title}
Severity: ${f.severity}
Target: ${f.target_host}${f.target_port ? `:${f.target_port}` : ''}
Description: ${f.description || 'N/A'}
Evidence: ${f.evidence || 'N/A'}
CVE: ${f.cve_id || 'None'}

Format: HackerOne/Bugcrowd standard. Include: Summary, Steps to Reproduce, Impact, Remediation.`,
    },
    {
      id: 'explain',
      label: 'Explain',
      icon: '💡',
      description: 'Explain this finding',
      promptBuilder: (f) => `Explain this security finding in plain English for a technical but non-specialist audience:

Title: ${f.title}
CVE: ${f.cve_id || 'None'}
Description: ${f.description || 'N/A'}

What is it, why does it matter, and what could an attacker do with it? Keep it under 150 words.`,
    },
  ],

  alerts: [
    {
      id: 'classify',
      label: 'Classify',
      icon: '🏷️',
      description: 'Classify this alert',
      promptBuilder: (a) => `Classify this security alert:

Title: ${a.title}
Source: ${a.source}
Severity: ${a.severity}
Description: ${a.description || 'N/A'}
Raw data: ${JSON.stringify(a.raw_data || {}).slice(0, 500)}

Determine:
1. Alert category (intrusion/malware/recon/policy/anomaly/false-positive)
2. Confidence this is a real threat (0-100%)
3. MITRE ATT&CK technique (if applicable)
4. Recommended action (escalate/investigate/close/monitor)`,
    },
    {
      id: 'correlate',
      label: 'Correlate',
      icon: '🔗',
      description: 'Find related threats',
      promptBuilder: (a) => `Correlate this alert with known threat patterns:

Alert: ${a.title}
Source IP/Domain: ${a.source_ip || a.source_host || 'N/A'}
Description: ${a.description || 'N/A'}

What threat actor, campaign, or malware family does this pattern resemble?
What other indicators should we look for?`,
    },
    {
      id: 'escalate',
      label: 'Escalate',
      icon: '⚠️',
      description: 'Draft escalation',
      promptBuilder: (a) => `Draft an escalation message for this alert:

Alert: ${a.title}
Severity: ${a.severity}
Time: ${a.ingested_at}
Description: ${a.description || 'N/A'}

Write a concise escalation message for a security manager. Include: what happened, potential impact, recommended immediate action.`,
    },
  ],

  cves: [
    {
      id: 'triage',
      label: 'Assess',
      icon: '🔍',
      description: 'Assess exploitability',
      promptBuilder: (c) => `Assess this CVE for our organization:

CVE ID: ${c.cve_id}
Description: ${c.description || 'N/A'}
CVSS: ${c.cvss_score || 'N/A'}
EPSS: ${c.epss_score || 'N/A'}
KEV: ${c.in_kev ? 'YES - CISA Known Exploited' : 'No'}
Affected: ${c.affected_products || 'N/A'}

1. Real-world exploitability right now (is PoC/exploit public?)
2. Priority (should we patch this week, this month, or monitor?)
3. Affected attack surface (what types of systems?)
4. Recommended patch/mitigation`,
    },
    {
      id: 'check-fleet',
      label: 'Check Fleet',
      icon: '🖥️',
      description: 'Check device exposure',
      promptBuilder: (c) => `This CVE may affect our fleet. Help me check exposure:

CVE: ${c.cve_id}
Affected products: ${c.affected_products || 'N/A'}
Description: ${c.description || 'N/A'}

What specific software versions, OS configurations, or services are vulnerable?
What should I search for in my asset inventory to find exposed devices?`,
    },
  ],

  'threat-intel': [
    {
      id: 'explain',
      label: 'Explain IOC',
      icon: '🔎',
      description: 'Analyze this indicator',
      promptBuilder: (ioc) => `Analyze this threat indicator:

Type: ${ioc.type}
Value: ${ioc.value}
Source: ${ioc.source}
First seen: ${ioc.first_seen || 'Unknown'}
Tags: ${ioc.tags || 'None'}

What does this indicator suggest? What threat actor or campaign? What should we do if we see this in our logs?`,
    },
    {
      id: 'correlate',
      label: 'Correlate',
      icon: '🔗',
      description: 'Find related IOCs',
      promptBuilder: (ioc) => `What other IOCs and indicators are typically associated with:

Type: ${ioc.type}
Value: ${ioc.value}
Context: ${ioc.description || 'N/A'}

Give me a pivot list — what domains, IPs, hashes, or behavioral patterns should I hunt for?`,
    },
  ],

  fleet: [
    {
      id: 'check-fleet',
      label: 'Assess Risk',
      icon: '🛡️',
      description: 'Assess device risk',
      promptBuilder: (d) => `Assess the security risk of this device:

Hostname: ${d.hostname}
OS: ${d.os_name} ${d.os_version}
Open ports: ${d.open_ports || 'Unknown'}
Last seen: ${d.last_seen}
Agent version: ${d.agent_version || 'Unknown'}

What are the likely attack surfaces? What should I patch or harden first?`,
    },
  ],

  sentinel: [
    {
      id: 'explain',
      label: 'Review Decision',
      icon: '⚖️',
      description: 'Review this agent decision',
      promptBuilder: (d) => `Review this autonomous agent decision:

Action taken: ${JSON.stringify(d.actions || [])}
Reasoning: ${d.reasoning}
Confidence: ${d.confidence}
Signals: ${JSON.stringify(d.signals || []).slice(0, 400)}

Was this the right call? What would you have done differently? Any policy adjustments recommended?`,
    },
  ],

  redteam: [
    {
      id: 'explain',
      label: 'Analyze',
      icon: '🎯',
      description: 'Analyze this operation',
      promptBuilder: (op) => `Analyze this red team operation:

Name: ${op.name}
Target: ${op.target}
Status: ${op.status}
Findings: ${op.findings_count || 0}
Notes: ${op.notes || 'None'}

Summarize what was found, what attack paths were successful, and what the blue team needs to know.`,
    },
  ],

  reports: [
    {
      id: 'summarize',
      label: 'Executive Summary',
      icon: '📄',
      description: 'Write exec summary',
      promptBuilder: (r) => `Write an executive summary for this security report:

Title: ${r.title}
Type: ${r.type}
Findings count: ${r.findings_count || 'N/A'}
Critical: ${r.critical_count || 0}, High: ${r.high_count || 0}
Period: ${r.period || 'N/A'}

2-3 paragraphs. Non-technical. Business impact first. What the board needs to know.`,
    },
  ],

  missions: [
    {
      id: 'summarize',
      label: 'Summarize',
      icon: '🚀',
      description: 'Summarize mission status',
      promptBuilder: (m) => `Summarize this security mission:

Name: ${m.name}
Status: ${m.status}
Priority: ${m.priority}
Due: ${m.due_date || 'No deadline'}
Description: ${m.description || 'N/A'}

What's the current risk if this mission isn't completed? What should happen next?`,
    },
  ],

  dashboard: [
    {
      id: 'summarize',
      label: 'Brief Me',
      icon: '📊',
      description: 'Get a security briefing',
      promptBuilder: (data) => `Give me a security briefing based on this snapshot:

${JSON.stringify(data, null, 2).slice(0, 1000)}

What are the top 3 things that need my attention right now? What can wait?`,
    },
  ],
};

// ─── Core execution ───────────────────────────────────────────────────────────

export async function runSectionAction(
  sectionId: SectionId,
  actionId: ActionId,
  data: Record<string, unknown>,
  onChunk: (text: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  const persona = SECTION_PERSONAS[sectionId];
  const actions = SECTION_ACTIONS[sectionId] || [];
  const action = actions.find(a => a.id === actionId);
  if (!action) throw new Error(`Action ${actionId} not found for section ${sectionId}`);

  const userPrompt = action.promptBuilder(data);

  const messages = [
    { role: 'system' as const, content: persona },
    { role: 'user' as const, content: userPrompt },
  ];

  let full = '';

  try {
    for await (const chunk of openClaw.streamChat(messages, 'deepseek-ai/deepseek-v3.2', 0.4, signal)) {
      full += chunk;
      onChunk(chunk);
    }
  } catch (err: any) {
    if (err.name === 'AbortError') return full;
    throw err;
  }

  return full;
}

// ─── Proactive context fetch ──────────────────────────────────────────────────

export interface ProactiveContext {
  sectionId: SectionId;
  headline: string;       // "14 open findings, 3 critical"
  suggestion: string;     // "Want me to triage the criticals?"
  actionId: ActionId;
  quickPrompt: string;    // Pre-built prompt for the chat
  data: Record<string, unknown>;
}

export async function getProactiveContext(path: string): Promise<ProactiveContext | null> {
  try {
    const { supabase } = await import('@/integrations/supabase/client');

    if (path === '/findings') {
      const { data, count } = await supabase
        .from('findings')
        .select('id, title, severity, status, target_host, cve_id', { count: 'exact' })
        .eq('status', 'open')
        .order('severity', { ascending: true })
        .limit(20);

      if (!data || !count) return null;
      const crits = data.filter(f => f.severity === 'critical').length;
      const highs = data.filter(f => f.severity === 'high').length;

      return {
        sectionId: 'findings',
        headline: `${count} open findings${crits > 0 ? ` — ${crits} critical` : highs > 0 ? ` — ${highs} high` : ''}`,
        suggestion: crits > 0
          ? `Triage the ${crits} critical findings and give me a priority report`
          : `Summarize the top findings and recommend what to fix first`,
        actionId: 'triage',
        quickPrompt: `I'm looking at my findings. There are ${count} open issues (${crits} critical, ${highs} high). Please triage the most important ones and give me a prioritized action plan:\n\n${data.slice(0, 10).map(f => `- [${f.severity.toUpperCase()}] ${f.title} (${f.target_host})`).join('\n')}`,
        data: { findings: data, total: count },
      };
    }

    if (path === '/alert-center') {
      const { data, count } = await supabase
        .from('alerts')
        .select('id, title, severity, source, ingested_at', { count: 'exact' })
        .in('status', ['new', 'investigating'])
        .order('ingested_at', { ascending: false })
        .limit(20);

      if (!data || !count) return null;
      const crits = data.filter(a => a.severity === 'critical').length;

      return {
        sectionId: 'alerts',
        headline: `${count} unresolved alerts${crits > 0 ? ` — ${crits} critical` : ''}`,
        suggestion: `Classify the alerts and identify which ones are real threats`,
        actionId: 'classify',
        quickPrompt: `I have ${count} unresolved security alerts. Here are the most recent:\n\n${data.slice(0, 10).map(a => `- [${a.severity}] ${a.title} (${a.source})`).join('\n')}\n\nClassify each one: real threat or noise? For real threats, what should I do?`,
        data: { alerts: data, total: count },
      };
    }

    if (path === '/sentinel') {
      const { data: escalations } = await supabase
        .from('escalations')
        .select('id, question, reasoning, confidence, org_id')
        .eq('status', 'pending')
        .limit(10);

      if (!escalations?.length) return null;

      return {
        sectionId: 'sentinel',
        headline: `${escalations.length} pending escalations need your answer`,
        suggestion: `Review and answer the pending Sentinel escalations`,
        actionId: 'explain',
        quickPrompt: `The Sentinel agent has ${escalations.length} pending escalations that need human input:\n\n${escalations.map((e, i) => `${i + 1}. ${e.question} (confidence: ${Math.round((e.confidence || 0) * 100)}%)`).join('\n')}\n\nHelp me understand each one and decide how to answer.`,
        data: { escalations },
      };
    }

    return null;
  } catch {
    return null;
  }
}
