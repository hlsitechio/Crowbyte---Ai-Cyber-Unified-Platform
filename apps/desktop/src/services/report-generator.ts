/**
 * Report Generator Service
 * Phase 3 of the Cybersecurity Gaps Integration Plan.
 *
 * One-click report generation from findings.
 * Supports: HackerOne, Bugcrowd, Pentest Full, Executive Summary, Custom.
 * Exports: Markdown, HTML, PDF-ready HTML, HackerOne JSON, Bugcrowd JSON.
 *
 * "Reporting is universally the most hated workflow in pentesting."
 * Not anymore.
 */

import { supabase } from '@/lib/supabase';
import { findingsEngine, type Finding, type FindingSeverity } from './findings-engine';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ReportType = 'pentest' | 'bounty' | 'disclosure' | 'compliance' | 'executive';
export type ReportTemplate = 'hackerone' | 'bugcrowd' | 'pentest_full' | 'pentest_executive' | 'disclosure' | 'custom';
export type ReportStatus = 'draft' | 'review' | 'final' | 'submitted';
export type ExportFormat = 'markdown' | 'html' | 'pdf_html' | 'hackerone_json' | 'bugcrowd_json' | 'json';

export interface Report {
  id: string;
  user_id: string;
  title: string;
  target?: string;
  report_type: ReportType;
  template: ReportTemplate;
  status: ReportStatus;
  executive_summary?: string;
  scope?: string;
  methodology?: string;
  findings_ids: string[];
  recommendations?: string;
  client_name?: string;
  assessment_dates?: { start: string; end: string };
  assessor_name?: string;
  classification?: string;
  custom_sections?: ReportSection[];
  last_exported_at?: string;
  export_format?: string;
  created_at: string;
  updated_at: string;
}

export interface ReportSection {
  id: string;
  title: string;
  content: string;
  order: number;
}

export interface ReportTemplateConfig {
  id: string;
  name: string;
  description?: string;
  platform: string;
  sections: TemplateSectionConfig[];
  css_theme?: string;
  is_default: boolean;
  created_at: string;
}

export interface TemplateSectionConfig {
  key: string;
  title: string;
  required: boolean;
  auto_populate: boolean;
  placeholder?: string;
}

export interface CreateReportData {
  title: string;
  target?: string;
  report_type: ReportType;
  template: ReportTemplate;
  client_name?: string;
  assessor_name?: string;
  assessment_dates?: { start: string; end: string };
  classification?: string;
  findings_ids?: string[];
}

export interface H1Report {
  title: string;
  vulnerability_information: string;
  impact: string;
  severity_rating: string;
  weakness_id?: string;
  structured_scope?: string;
  steps_to_reproduce: string;
  supporting_material?: string[];
}

export interface BugcrowdReport {
  title: string;
  description: string;
  severity: number;
  vrt: string;
  steps_to_reproduce: string;
  impact: string;
  url?: string;
  http_request?: string;
}

// ─── Severity Helpers ─────────────────────────────────────────────────────────

const SEVERITY_ORDER: Record<FindingSeverity, number> = {
  critical: 0, high: 1, medium: 2, low: 3, info: 4,
};

const SEVERITY_COLORS: Record<FindingSeverity, string> = {
  critical: '#ef4444', high: '#f97316', medium: '#eab308', low: '#3b82f6', info: '#71717a',
};

const H1_SEVERITY_MAP: Record<FindingSeverity, string> = {
  critical: 'critical', high: 'high', medium: 'medium', low: 'low', info: 'none',
};

const BUGCROWD_SEVERITY_MAP: Record<FindingSeverity, number> = {
  critical: 5, high: 4, medium: 3, low: 2, info: 1,
};

// ─── Service ──────────────────────────────────────────────────────────────────

class ReportGenerator {

  // ─── CRUD ───────────────────────────────────────────────────────────────────

  async create(data: CreateReportData): Promise<Report> {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error('User not authenticated');

    const { data: report, error } = await supabase
      .from('reports')
      .insert({
        user_id: user.id,
        ...data,
        findings_ids: data.findings_ids || [],
        status: 'draft',
        custom_sections: [],
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create report: ${error.message}`);
    return report;
  }

  async getAll(): Promise<Report[]> {
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) throw new Error(`Failed to fetch reports: ${error.message}`);
    return data || [];
  }

  async getById(id: string): Promise<Report> {
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw new Error(`Failed to fetch report: ${error.message}`);
    return data;
  }

  async update(id: string, updates: Partial<Report>): Promise<Report> {
    const { data, error } = await supabase
      .from('reports')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update report: ${error.message}`);
    return data;
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('reports').delete().eq('id', id);
    if (error) throw new Error(`Failed to delete report: ${error.message}`);
  }

  // ─── Finding Management ─────────────────────────────────────────────────────

  async addFinding(reportId: string, findingId: string): Promise<void> {
    const report = await this.getById(reportId);
    if (report.findings_ids.includes(findingId)) return;
    await this.update(reportId, { findings_ids: [...report.findings_ids, findingId] });
    await findingsEngine.update(findingId, { included_in_report: true, report_id: reportId } as Partial<Finding>);
  }

  async removeFinding(reportId: string, findingId: string): Promise<void> {
    const report = await this.getById(reportId);
    await this.update(reportId, { findings_ids: report.findings_ids.filter(id => id !== findingId) });
    await findingsEngine.update(findingId, { included_in_report: false, report_id: undefined } as Partial<Finding>);
  }

  async reorderFindings(reportId: string, orderedIds: string[]): Promise<void> {
    await this.update(reportId, { findings_ids: orderedIds });
  }

  /** Get all findings for a report, sorted by severity */
  async getReportFindings(reportId: string): Promise<Finding[]> {
    const report = await this.getById(reportId);
    if (!report.findings_ids.length) return [];

    const findings: Finding[] = [];
    for (const id of report.findings_ids) {
      try {
        const f = await findingsEngine.getById(id);
        findings.push(f);
      } catch { /* skip missing */ }
    }

    return findings.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
  }

  /** Auto-populate report with all confirmed findings for a target */
  async autoPopulate(reportId: string, target?: string): Promise<number> {
    const confirmed = await findingsEngine.getAll({
      status: 'confirmed',
      ...(target ? { target_host: target } : {}),
    });

    const report = await this.getById(reportId);
    const existingIds = new Set(report.findings_ids);
    const newIds = confirmed.filter(f => !existingIds.has(f.id)).map(f => f.id);

    if (newIds.length > 0) {
      await this.update(reportId, { findings_ids: [...report.findings_ids, ...newIds] });
      for (const id of newIds) {
        await findingsEngine.update(id, { included_in_report: true, report_id: reportId } as Partial<Finding>);
      }
    }

    return newIds.length;
  }

  // ─── Export Formats ─────────────────────────────────────────────────────────

  async exportMarkdown(reportId: string): Promise<string> {
    const report = await this.getById(reportId);
    const findings = await this.getReportFindings(reportId);
    const template = report.template;

    let md = '';

    if (template === 'hackerone' || template === 'bugcrowd') {
      md = this.renderBountyMarkdown(report, findings);
    } else if (template === 'pentest_executive') {
      md = this.renderExecutiveMarkdown(report, findings);
    } else {
      md = this.renderFullMarkdown(report, findings);
    }

    await this.update(reportId, { last_exported_at: new Date().toISOString(), export_format: 'markdown' });
    return md;
  }

  async exportHTML(reportId: string): Promise<string> {
    const md = await this.exportMarkdown(reportId);
    const html = this.markdownToHTML(md);
    const report = await this.getById(reportId);

    await this.update(reportId, { last_exported_at: new Date().toISOString(), export_format: 'html' });

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${this.escapeHtml(report.title)}</title>
<style>${this.getReportCSS()}</style>
</head>
<body>
<div class="report-container">
${html}
</div>
</body>
</html>`;
  }

  async exportPdfHTML(reportId: string): Promise<string> {
    const html = await this.exportHTML(reportId);
    // This HTML is optimized for window.print() or Electron's webContents.printToPDF()
    return html.replace('</style>', `
  @media print {
    .report-container { max-width: 100%; margin: 0; padding: 20px; }
    .finding-card { break-inside: avoid; }
    .page-break { page-break-before: always; }
  }
</style>`);
  }

  async exportHackerOneJSON(reportId: string): Promise<H1Report[]> {
    const report = await this.getById(reportId);
    const findings = await this.getReportFindings(reportId);

    await this.update(reportId, { last_exported_at: new Date().toISOString(), export_format: 'hackerone_json' });

    return findings.map(f => ({
      title: f.title,
      vulnerability_information: this.buildH1Description(f),
      impact: this.buildImpactStatement(f),
      severity_rating: H1_SEVERITY_MAP[f.severity] || 'none',
      weakness_id: f.cwe_ids?.[0] || undefined,
      structured_scope: f.target_url || `${f.target_host}${f.target_port ? ':' + f.target_port : ''}`,
      steps_to_reproduce: this.buildStepsToReproduce(f),
      supporting_material: this.buildSupportingMaterial(f),
    }));
  }

  async exportBugcrowdJSON(reportId: string): Promise<BugcrowdReport[]> {
    const report = await this.getById(reportId);
    const findings = await this.getReportFindings(reportId);

    await this.update(reportId, { last_exported_at: new Date().toISOString(), export_format: 'bugcrowd_json' });

    return findings.map(f => ({
      title: f.title,
      description: this.buildBugcrowdDescription(f),
      severity: BUGCROWD_SEVERITY_MAP[f.severity] || 1,
      vrt: this.mapToVRT(f),
      steps_to_reproduce: this.buildStepsToReproduce(f),
      impact: this.buildImpactStatement(f),
      url: f.target_url || undefined,
      http_request: (f.evidence as any)?.request || undefined,
    }));
  }

  async exportJSON(reportId: string): Promise<Record<string, unknown>> {
    const report = await this.getById(reportId);
    const findings = await this.getReportFindings(reportId);

    return {
      report: { ...report, findings: undefined },
      findings: findings.map(f => ({
        ...f,
        source_raw: undefined, // strip raw data for cleaner export
      })),
      metadata: {
        exported_at: new Date().toISOString(),
        tool: 'CrowByte Terminal',
        version: '1.0',
      },
    };
  }

  // ─── Markdown Renderers ─────────────────────────────────────────────────────

  private renderBountyMarkdown(report: Report, findings: Finding[]): string {
    const parts: string[] = [];

    for (const finding of findings) {
      parts.push(`# ${finding.title}\n`);
      parts.push(`**Severity:** ${finding.severity.toUpperCase()}${finding.cvss_score ? ` (CVSS: ${finding.cvss_score})` : ''}`);
      parts.push(`**Target:** ${finding.target_url || finding.target_host}${finding.target_port ? ':' + finding.target_port : ''}`);

      if (finding.cve_ids?.length) {
        parts.push(`**CVEs:** ${finding.cve_ids.join(', ')}`);
      }
      if (finding.cwe_ids?.length) {
        parts.push(`**CWEs:** ${finding.cwe_ids.join(', ')}`);
      }

      parts.push(`\n## Description\n\n${finding.description || 'N/A'}`);
      parts.push(`\n## Steps to Reproduce\n\n${this.buildStepsToReproduce(finding)}`);
      parts.push(`\n## Impact\n\n${this.buildImpactStatement(finding)}`);

      if (finding.evidence) {
        parts.push(`\n## Evidence\n`);
        if ((finding.evidence as any).request) {
          parts.push('### HTTP Request\n```http\n' + (finding.evidence as any).request + '\n```');
        }
        if ((finding.evidence as any).response) {
          parts.push('### HTTP Response\n```http\n' + String((finding.evidence as any).response).slice(0, 2000) + '\n```');
        }
        if ((finding.evidence as any).curl) {
          parts.push('### cURL\n```bash\n' + (finding.evidence as any).curl + '\n```');
        }
        if ((finding.evidence as any).payload) {
          parts.push('### Payload\n```\n' + (finding.evidence as any).payload + '\n```');
        }
      }

      parts.push(`\n## Remediation\n\n${this.buildRemediation(finding)}`);
      parts.push('\n---\n');
    }

    return parts.join('\n');
  }

  private renderExecutiveMarkdown(report: Report, findings: Finding[]): string {
    const critCount = findings.filter(f => f.severity === 'critical').length;
    const highCount = findings.filter(f => f.severity === 'high').length;
    const medCount = findings.filter(f => f.severity === 'medium').length;
    const lowCount = findings.filter(f => f.severity === 'low').length;

    return `# ${report.title}

**Prepared for:** ${report.client_name || 'N/A'}
**Prepared by:** ${report.assessor_name || 'CrowByte Terminal'}
**Date:** ${report.assessment_dates?.start ? `${report.assessment_dates.start} — ${report.assessment_dates.end}` : new Date().toISOString().split('T')[0]}
**Classification:** ${report.classification || 'Confidential'}

---

## Executive Summary

${report.executive_summary || `A security assessment was conducted against ${report.target || 'the target environment'}. The assessment identified **${findings.length} findings** across the target attack surface.`}

### Risk Overview

| Severity | Count |
|----------|-------|
| Critical | ${critCount} |
| High | ${highCount} |
| Medium | ${medCount} |
| Low | ${lowCount} |
| **Total** | **${findings.length}** |

${critCount > 0 ? `\n> **URGENT:** ${critCount} critical finding(s) require immediate attention.\n` : ''}

## Scope

${report.scope || `Target: ${report.target || 'See findings for individual targets'}`}

## Key Findings

${findings.filter(f => f.severity === 'critical' || f.severity === 'high').map(f =>
  `### ${f.severity.toUpperCase()}: ${f.title}\n\n${f.description || 'See technical details.'}\n\n**Target:** ${f.target_url || f.target_host}\n`
).join('\n')}

## Recommendations

${report.recommendations || findings.filter(f => f.severity === 'critical' || f.severity === 'high').map((f, i) =>
  `${i + 1}. **${f.title}** — ${this.buildRemediation(f)}`
).join('\n')}

---

*Generated by CrowByte Terminal | HLSI Tech*
`;
  }

  private renderFullMarkdown(report: Report, findings: Finding[]): string {
    const critCount = findings.filter(f => f.severity === 'critical').length;
    const highCount = findings.filter(f => f.severity === 'high').length;
    const medCount = findings.filter(f => f.severity === 'medium').length;
    const lowCount = findings.filter(f => f.severity === 'low').length;
    const infoCount = findings.filter(f => f.severity === 'info').length;

    let md = `# ${report.title}

| Field | Value |
|-------|-------|
| Client | ${report.client_name || 'N/A'} |
| Assessor | ${report.assessor_name || 'CrowByte Terminal'} |
| Assessment Period | ${report.assessment_dates?.start || 'N/A'} — ${report.assessment_dates?.end || 'N/A'} |
| Classification | ${report.classification || 'Confidential'} |
| Target | ${report.target || 'Multiple'} |
| Total Findings | ${findings.length} |

---

## 1. Executive Summary

${report.executive_summary || `This report presents the findings of a security assessment conducted against ${report.target || 'the target environment'}. A total of **${findings.length}** findings were identified: **${critCount} critical**, **${highCount} high**, **${medCount} medium**, **${lowCount} low**, and **${infoCount} informational**.`}

## 2. Scope

${report.scope || `The assessment targeted: ${report.target || 'See individual findings for targets.'}`}

## 3. Methodology

${report.methodology || `The assessment utilized automated and manual testing techniques including:
- Network scanning and service enumeration
- Vulnerability scanning with multiple engines
- Manual verification of automated findings
- Web application testing (OWASP Top 10)
- Configuration review`}

## 4. Findings Summary

| # | Severity | Title | Target | Status |
|---|----------|-------|--------|--------|
${findings.map((f, i) => `| ${i + 1} | ${f.severity.toUpperCase()} | ${f.title} | ${f.target_host} | ${f.status} |`).join('\n')}

## 5. Detailed Findings

`;

    findings.forEach((f, i) => {
      md += `### 5.${i + 1} — ${f.title}

| Field | Value |
|-------|-------|
| Severity | **${f.severity.toUpperCase()}** |
| CVSS | ${f.cvss_score || 'N/A'} |
| Target | ${f.target_url || f.target_host}${f.target_port ? ':' + f.target_port : ''} |
| Source | ${f.source} |
| CVEs | ${f.cve_ids?.join(', ') || 'None'} |
| CWEs | ${f.cwe_ids?.join(', ') || 'None'} |
| Status | ${f.status} |

#### Description

${f.description || 'No description provided.'}

#### Steps to Reproduce

${this.buildStepsToReproduce(f)}

#### Impact

${this.buildImpactStatement(f)}

`;

      if (f.evidence) {
        md += '#### Evidence\n\n';
        if ((f.evidence as any).request) {
          md += '**HTTP Request:**\n```http\n' + (f.evidence as any).request + '\n```\n\n';
        }
        if ((f.evidence as any).response) {
          md += '**HTTP Response:**\n```http\n' + String((f.evidence as any).response).slice(0, 2000) + '\n```\n\n';
        }
        if ((f.evidence as any).curl) {
          md += '**cURL:**\n```bash\n' + (f.evidence as any).curl + '\n```\n\n';
        }
      }

      md += `#### Remediation

${this.buildRemediation(f)}

---

`;
    });

    md += `## 6. Recommendations

${report.recommendations || findings.filter(f => f.severity === 'critical' || f.severity === 'high').map((f, i) =>
  `${i + 1}. **${f.title}** — ${this.buildRemediation(f)}`
).join('\n')}

---

*Report generated by CrowByte Terminal | HLSI Tech | ${new Date().toISOString().split('T')[0]}*
`;

    return md;
  }

  // ─── Content Builders ───────────────────────────────────────────────────────

  private buildH1Description(finding: Finding): string {
    let desc = finding.description || finding.title;
    if (finding.cve_ids?.length) desc += `\n\nRelated CVEs: ${finding.cve_ids.join(', ')}`;
    if (finding.cwe_ids?.length) desc += `\nCWE: ${finding.cwe_ids.join(', ')}`;
    return desc;
  }

  private buildBugcrowdDescription(finding: Finding): string {
    return `${finding.description || finding.title}\n\nTarget: ${finding.target_url || finding.target_host}${finding.target_port ? ':' + finding.target_port : ''}`;
  }

  private buildStepsToReproduce(finding: Finding): string {
    const steps: string[] = [];

    steps.push(`1. Navigate to \`${finding.target_url || finding.target_host + (finding.target_port ? ':' + finding.target_port : '')}\``);

    if (finding.source === 'sqlmap' && finding.evidence) {
      const ev = finding.evidence as any;
      steps.push(`2. Inject the following payload in the \`${ev.parameter || 'vulnerable'}\` parameter:`);
      steps.push(`   \`\`\`\n   ${ev.payload || 'See evidence'}\n   \`\`\``);
      steps.push(`3. Observe the ${ev.technique || 'SQL injection'} response`);
    } else if (finding.source === 'nuclei') {
      steps.push(`2. The vulnerability was detected by Nuclei template`);
      if ((finding.evidence as any)?.curl) {
        steps.push(`3. Reproduce with:\n   \`\`\`bash\n   ${(finding.evidence as any).curl}\n   \`\`\``);
      }
    } else if (finding.evidence) {
      if ((finding.evidence as any).request) {
        steps.push(`2. Send the following HTTP request:\n   \`\`\`http\n   ${(finding.evidence as any).request}\n   \`\`\``);
      }
      steps.push(`${steps.length + 1}. Observe the vulnerability in the response`);
    } else {
      steps.push(`2. ${finding.description || 'Observe the vulnerability'}`);
    }

    return steps.join('\n');
  }

  private buildImpactStatement(finding: Finding): string {
    const impacts: Record<string, string> = {
      'CWE-89': 'An attacker could extract, modify, or delete data from the database, potentially compromising all user data and gaining unauthorized access to the system.',
      'CWE-79': 'An attacker could execute arbitrary JavaScript in victim browsers, steal session cookies, redirect users, or perform actions on their behalf.',
      'CWE-918': 'An attacker could abuse the server to make requests to internal services, potentially accessing sensitive internal resources or cloud metadata.',
      'CWE-22': 'An attacker could read arbitrary files from the server, potentially accessing configuration files, source code, or credentials.',
      'CWE-502': 'An attacker could execute arbitrary code on the server through deserialization of untrusted data.',
      'CWE-287': 'An attacker could bypass authentication and gain unauthorized access to protected resources.',
      'CWE-862': 'An attacker could access or modify resources belonging to other users due to missing authorization checks.',
    };

    for (const cwe of finding.cwe_ids || []) {
      if (impacts[cwe]) return impacts[cwe];
    }

    const severityImpacts: Record<FindingSeverity, string> = {
      critical: `This ${finding.severity} severity finding could lead to complete system compromise, data breach, or unauthorized access to critical systems.`,
      high: `This ${finding.severity} severity finding could lead to significant data exposure, unauthorized access, or service disruption.`,
      medium: `This ${finding.severity} severity finding could be leveraged in combination with other vulnerabilities to increase attack impact.`,
      low: `This ${finding.severity} severity finding represents a minor security weakness that should be addressed as part of security hardening.`,
      info: `This is an informational finding that provides context about the target but does not represent a direct security risk.`,
    };

    return severityImpacts[finding.severity] || severityImpacts.medium;
  }

  private buildRemediation(finding: Finding): string {
    const remediations: Record<string, string> = {
      'CWE-89': 'Use parameterized queries or prepared statements. Implement an ORM. Apply input validation and the principle of least privilege for database accounts.',
      'CWE-79': 'Implement context-aware output encoding. Deploy Content Security Policy (CSP) headers. Use frameworks with built-in XSS protection.',
      'CWE-918': 'Implement allowlists for outbound requests. Block access to internal IP ranges and cloud metadata endpoints. Use network segmentation.',
      'CWE-22': 'Validate and sanitize file paths. Use a chroot or jail. Implement allowlists for accessible files.',
      'CWE-502': 'Avoid deserializing untrusted data. Use safe serialization formats (JSON). Implement integrity checks.',
      'CWE-287': 'Implement proper authentication mechanisms. Use multi-factor authentication. Review and fix authentication logic.',
      'CWE-862': 'Implement proper authorization checks on every request. Use role-based access control. Validate ownership of resources.',
    };

    for (const cwe of finding.cwe_ids || []) {
      if (remediations[cwe]) return remediations[cwe];
    }

    if (finding.finding_type === 'misconfig') {
      return 'Review and harden the configuration according to security best practices and vendor guidelines.';
    }
    if (finding.finding_type === 'credential') {
      return 'Rotate the exposed credentials immediately. Review access logs for unauthorized usage. Implement secrets management.';
    }
    if (finding.finding_type === 'exposure') {
      return 'Remove or restrict access to the exposed resource. Implement proper access controls and authentication.';
    }

    return 'Apply vendor patches and security updates. Review the application security architecture. Implement defense-in-depth controls.';
  }

  private buildSupportingMaterial(finding: Finding): string[] {
    const materials: string[] = [];
    if (finding.evidence) {
      if ((finding.evidence as any).screenshot) materials.push((finding.evidence as any).screenshot);
      if ((finding.evidence as any).curl) materials.push(`cURL command: ${(finding.evidence as any).curl}`);
    }
    if (finding.cve_ids?.length) {
      materials.push(...finding.cve_ids.map(c => `https://nvd.nist.gov/vuln/detail/${c}`));
    }
    return materials;
  }

  private mapToVRT(finding: Finding): string {
    // Map CWE to Bugcrowd VRT (Vulnerability Rating Taxonomy)
    const vrtMap: Record<string, string> = {
      'CWE-89': 'server_security_misconfiguration.sql_injection',
      'CWE-79': 'cross_site_scripting_xss.reflected',
      'CWE-918': 'server_side_request_forgery',
      'CWE-22': 'server_security_misconfiguration.path_traversal',
      'CWE-502': 'server_security_misconfiguration.deserialization',
      'CWE-287': 'broken_authentication_and_session_management',
      'CWE-862': 'broken_access_control.idor',
    };

    for (const cwe of finding.cwe_ids || []) {
      if (vrtMap[cwe]) return vrtMap[cwe];
    }

    return 'other';
  }

  // ─── HTML Conversion ────────────────────────────────────────────────────────

  private markdownToHTML(md: string): string {
    let html = md;

    // Headers
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

    // Bold/italic
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

    // Code blocks
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>');
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Tables
    html = html.replace(/^\|(.+)\|$/gm, (match) => {
      const cells = match.split('|').filter(c => c.trim());
      if (cells.every(c => /^[\s-:]+$/.test(c))) return ''; // separator row
      const tag = html.indexOf(match) < html.indexOf('\n|---') ? 'th' : 'td';
      return '<tr>' + cells.map(c => `<${tag}>${c.trim()}</${tag}>`).join('') + '</tr>';
    });
    html = html.replace(/(<tr>[\s\S]*?<\/tr>\n?)+/g, '<table>$&</table>');

    // Blockquotes
    html = html.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');

    // Horizontal rules
    html = html.replace(/^---$/gm, '<hr>');

    // Line breaks → paragraphs
    html = html.replace(/\n\n/g, '</p><p>');
    html = '<p>' + html + '</p>';

    // Clean up
    html = html.replace(/<p><\/p>/g, '');
    html = html.replace(/<p>(<h[1-6]>)/g, '$1');
    html = html.replace(/(<\/h[1-6]>)<\/p>/g, '$1');
    html = html.replace(/<p>(<table>)/g, '$1');
    html = html.replace(/(<\/table>)<\/p>/g, '$1');
    html = html.replace(/<p>(<pre>)/g, '$1');
    html = html.replace(/(<\/pre>)<\/p>/g, '$1');
    html = html.replace(/<p>(<hr>)<\/p>/g, '$1');
    html = html.replace(/<p>(<blockquote>)/g, '$1');

    return html;
  }

  private getReportCSS(): string {
    return `
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'Inter', -apple-system, sans-serif; background: #09090b; color: #e4e4e7; line-height: 1.6; }
.report-container { max-width: 900px; margin: 0 auto; padding: 40px 30px; }
h1 { font-size: 28px; color: #fafafa; margin: 30px 0 15px; border-bottom: 1px solid #27272a; padding-bottom: 10px; }
h2 { font-size: 22px; color: #e4e4e7; margin: 25px 0 12px; }
h3 { font-size: 18px; color: #d4d4d8; margin: 20px 0 10px; }
p { margin: 8px 0; color: #a1a1aa; }
strong { color: #e4e4e7; }
code { background: #18181b; padding: 2px 6px; border-radius: 4px; font-size: 13px; color: #22d3ee; }
pre { background: #18181b; padding: 16px; border-radius: 8px; overflow-x: auto; margin: 12px 0; border: 1px solid #27272a; }
pre code { padding: 0; background: none; }
table { width: 100%; border-collapse: collapse; margin: 16px 0; }
th, td { padding: 10px 14px; text-align: left; border: 1px solid #27272a; }
th { background: #18181b; color: #e4e4e7; font-weight: 600; font-size: 13px; }
td { color: #a1a1aa; font-size: 13px; }
blockquote { border-left: 3px solid #ef4444; padding: 10px 16px; margin: 12px 0; background: #18181b; }
hr { border: none; border-top: 1px solid #27272a; margin: 30px 0; }
.finding-card { border: 1px solid #27272a; border-radius: 8px; padding: 20px; margin: 16px 0; background: #18181b; }
`;
  }

  private escapeHtml(str: string): string {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ─── Templates ──────────────────────────────────────────────────────────────

  async getTemplates(): Promise<ReportTemplateConfig[]> {
    const { data, error } = await supabase
      .from('report_templates')
      .select('*')
      .order('name');

    if (error) return this.getDefaultTemplates();
    return data?.length ? data : this.getDefaultTemplates();
  }

  private getDefaultTemplates(): ReportTemplateConfig[] {
    return [
      {
        id: 'tpl-h1', name: 'HackerOne Submission', platform: 'hackerone', is_default: true,
        created_at: '', description: 'Standard HackerOne bug report format',
        sections: [
          { key: 'title', title: 'Title', required: true, auto_populate: true },
          { key: 'vulnerability_information', title: 'Vulnerability Information', required: true, auto_populate: true },
          { key: 'steps_to_reproduce', title: 'Steps to Reproduce', required: true, auto_populate: true },
          { key: 'impact', title: 'Impact', required: true, auto_populate: true },
          { key: 'supporting_material', title: 'Supporting Material', required: false, auto_populate: true },
        ],
      },
      {
        id: 'tpl-bc', name: 'Bugcrowd Submission', platform: 'bugcrowd', is_default: true,
        created_at: '', description: 'Standard Bugcrowd bug report format',
        sections: [
          { key: 'title', title: 'Title', required: true, auto_populate: true },
          { key: 'description', title: 'Description', required: true, auto_populate: true },
          { key: 'steps_to_reproduce', title: 'Steps to Reproduce', required: true, auto_populate: true },
          { key: 'impact', title: 'Impact', required: true, auto_populate: true },
        ],
      },
      {
        id: 'tpl-pt', name: 'Pentest Report (Full)', platform: 'generic', is_default: true,
        created_at: '', description: 'Comprehensive penetration test report',
        sections: [
          { key: 'executive_summary', title: 'Executive Summary', required: true, auto_populate: true },
          { key: 'scope', title: 'Scope', required: true, auto_populate: false },
          { key: 'methodology', title: 'Methodology', required: true, auto_populate: true },
          { key: 'findings', title: 'Findings', required: true, auto_populate: true },
          { key: 'recommendations', title: 'Recommendations', required: true, auto_populate: true },
        ],
      },
      {
        id: 'tpl-exec', name: 'Executive Summary', platform: 'generic', is_default: true,
        created_at: '', description: 'High-level summary for management',
        sections: [
          { key: 'executive_summary', title: 'Executive Summary', required: true, auto_populate: true },
          { key: 'risk_overview', title: 'Risk Overview', required: true, auto_populate: true },
          { key: 'key_findings', title: 'Key Findings', required: true, auto_populate: true },
          { key: 'recommendations', title: 'Recommendations', required: true, auto_populate: true },
        ],
      },
    ];
  }
}

// Export singleton
export const reportGenerator = new ReportGenerator();
export default reportGenerator;
