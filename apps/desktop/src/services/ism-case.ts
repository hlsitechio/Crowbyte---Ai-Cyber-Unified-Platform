/**
 * ISM Case Service
 * Information Security Management — unified case lifecycle.
 *
 * Every security event (alert, finding, incident, pentest, audit) becomes a Case.
 * Cases flow through: NEW -> TRIAGE -> ASSIGN -> IN_PROGRESS -> REVIEW -> CLOSE
 * SLA engine tracks response/resolution deadlines per priority.
 * Full audit trail via ism_case_events.
 */

import { supabase } from '@/lib/supabase';
import { pgOr } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

export type CaseType =
  | 'incident'
  | 'vulnerability'
  | 'pentest'
  | 'threat_hunt'
  | 'compliance_audit'
  | 'change_request'
  | 'risk_assessment'
  | 'forensic'
  | 'general';

export type CaseStatus =
  | 'new'
  | 'triaging'
  | 'assigned'
  | 'in_progress'
  | 'pending_review'
  | 'escalated'
  | 'on_hold'
  | 'resolved'
  | 'closed'
  | 'reopened';

export type CasePriority = 'P1' | 'P2' | 'P3' | 'P4' | 'P5';
export type CaseSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export interface ISMCase {
  id: string;
  user_id: string;
  case_number: string;
  title: string;
  description?: string;
  case_type: CaseType;
  status: CaseStatus;
  priority: CasePriority;
  severity?: CaseSeverity;

  // Assignment
  assigned_to?: string;
  assigned_role?: string;
  assigned_team?: string;

  // SLA
  sla_policy_id?: string;
  sla_response_deadline?: string;
  sla_resolution_deadline?: string;
  sla_responded_at?: string;
  sla_resolved_at?: string;
  sla_breached: boolean;

  // Links
  alert_ids: string[];
  finding_ids: string[];
  mission_id?: string;
  report_id?: string;
  timeline_id?: string;

  // Context
  source?: string;
  source_ref?: string;
  affected_assets: string[];
  tags: string[];

  // Compliance
  compliance_frameworks: ComplianceMapping[];
  control_ids: string[];

  // Evidence
  evidence: EvidenceItem[];

  // MITRE
  mitre_tactics: string[];
  mitre_techniques: string[];

  // AI
  ai_triage_verdict?: string;
  ai_triage_confidence?: number;
  ai_triage_reasoning?: string;

  // Timestamps
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  closed_at?: string;
  reopened_at?: string;
}

export interface ComplianceMapping {
  framework: string; // ISO 27001, NIST, SOC2, PCI-DSS, HIPAA
  controls: string[];
  status: 'compliant' | 'non_compliant' | 'partial' | 'not_applicable';
}

export interface EvidenceItem {
  id: string;
  type: 'screenshot' | 'log' | 'pcap' | 'file' | 'url' | 'note' | 'command_output';
  title: string;
  content?: string;
  url?: string;
  timestamp: string;
  added_by: string;
}

export interface CaseEvent {
  id: string;
  case_id: string;
  event_type: string;
  actor: string;
  old_value?: string;
  new_value?: string;
  message?: string;
  data: Record<string, unknown>;
  created_at: string;
}

export interface SLAPolicy {
  id: string;
  name: string;
  description?: string;
  priority: string;
  response_time_minutes: number;
  resolution_time_minutes: number;
  business_hours_only: boolean;
  escalation_chain: EscalationStep[];
  is_default: boolean;
  created_at: string;
}

export interface EscalationStep {
  level: number;
  after_minutes: number;
  notify: string;
  action: string;
}

export interface CreateCaseData {
  title: string;
  description?: string;
  case_type: CaseType;
  priority?: CasePriority;
  severity?: CaseSeverity;
  assigned_to?: string;
  assigned_role?: string;
  assigned_team?: string;
  source?: string;
  source_ref?: string;
  affected_assets?: string[];
  tags?: string[];
  alert_ids?: string[];
  finding_ids?: string[];
  mission_id?: string;
  mitre_tactics?: string[];
  mitre_techniques?: string[];
  compliance_frameworks?: ComplianceMapping[];
  control_ids?: string[];
}

export interface CaseFilters {
  status?: CaseStatus | CaseStatus[];
  priority?: CasePriority | CasePriority[];
  case_type?: CaseType;
  assigned_to?: string;
  sla_breached?: boolean;
  search?: string;
  limit?: number;
}

export interface CaseStats {
  total: number;
  by_status: Record<string, number>;
  by_priority: Record<string, number>;
  by_type: Record<string, number>;
  sla_breached: number;
  open_cases: number;
  avg_resolution_hours: number;
  mttr_hours: number; // Mean Time To Resolve
}

// ─── Status Transitions ───────────────────────────────────────────────────────

const VALID_TRANSITIONS: Record<CaseStatus, CaseStatus[]> = {
  new: ['triaging', 'assigned', 'closed'],
  triaging: ['assigned', 'escalated', 'closed'],
  assigned: ['in_progress', 'on_hold', 'escalated', 'closed'],
  in_progress: ['pending_review', 'on_hold', 'escalated', 'resolved'],
  pending_review: ['resolved', 'in_progress', 'escalated'],
  escalated: ['assigned', 'in_progress', 'resolved'],
  on_hold: ['in_progress', 'assigned', 'closed'],
  resolved: ['closed', 'reopened'],
  closed: ['reopened'],
  reopened: ['triaging', 'assigned', 'in_progress'],
};

// ─── Service ──────────────────────────────────────────────────────────────────

class ISMCaseService {
  private slaPolicesCache: SLAPolicy[] | null = null;

  // ─── Case CRUD ──────────────────────────────────────────────────────────────

  async create(data: CreateCaseData): Promise<ISMCase> {
    const { data: { session: _authSession } } = await supabase.auth.getSession();
    const user = _authSession?.user ?? null;
    const userError = user ? null : new Error('Not authenticated');
    if (userError || !user) throw new Error('Not authenticated');

    // Get SLA policy for priority
    const slaPolicy = await this.getSLAPolicyForPriority(data.priority || 'P3');
    const now = new Date();

    const caseData: Record<string, unknown> = {
      user_id: user.id,
      title: data.title,
      description: data.description,
      case_type: data.case_type,
      priority: data.priority || 'P3',
      severity: data.severity || 'medium',
      status: 'new',
      assigned_to: data.assigned_to,
      assigned_role: data.assigned_role,
      assigned_team: data.assigned_team,
      source: data.source,
      source_ref: data.source_ref,
      affected_assets: data.affected_assets || [],
      tags: data.tags || [],
      alert_ids: data.alert_ids || [],
      finding_ids: data.finding_ids || [],
      mission_id: data.mission_id,
      mitre_tactics: data.mitre_tactics || [],
      mitre_techniques: data.mitre_techniques || [],
      compliance_frameworks: data.compliance_frameworks || [],
      control_ids: data.control_ids || [],
      evidence: [],
    };

    // Set SLA deadlines
    if (slaPolicy) {
      caseData.sla_policy_id = slaPolicy.id;
      caseData.sla_response_deadline = new Date(
        now.getTime() + slaPolicy.response_time_minutes * 60000
      ).toISOString();
      caseData.sla_resolution_deadline = new Date(
        now.getTime() + slaPolicy.resolution_time_minutes * 60000
      ).toISOString();
    }

    const { data: created, error } = await supabase
      .from('ism_cases')
      .insert(caseData)
      .select()
      .single();

    if (error) throw new Error(`Failed to create case: ${error.message}`);

    // Record creation event
    await this.addEvent(created.id, 'case_created', 'system', undefined, undefined,
      `Case ${created.case_number} created: ${data.title}`);

    // Auto-assign if specified
    if (data.assigned_to) {
      await this.addEvent(created.id, 'assigned', 'system', undefined, data.assigned_to,
        `Assigned to ${data.assigned_to}`);
    }

    return created;
  }

  async getAll(filters?: CaseFilters): Promise<ISMCase[]> {
    let query = supabase
      .from('ism_cases')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters?.status) {
      if (Array.isArray(filters.status)) {
        query = query.in('status', filters.status);
      } else {
        query = query.eq('status', filters.status);
      }
    }

    if (filters?.priority) {
      if (Array.isArray(filters.priority)) {
        query = query.in('priority', filters.priority);
      } else {
        query = query.eq('priority', filters.priority);
      }
    }

    if (filters?.case_type) query = query.eq('case_type', filters.case_type);
    if (filters?.assigned_to) query = query.eq('assigned_to', filters.assigned_to);
    if (filters?.sla_breached !== undefined) query = query.eq('sla_breached', filters.sla_breached);
    if (filters?.search) {
      query = query.or(`title.ilike.%${pgOr(filters.search)}%,case_number.ilike.%${pgOr(filters.search)}%,description.ilike.%${pgOr(filters.search)}%`);
    }

    query = query.limit(filters?.limit || 200);

    const { data, error } = await query;
    if (error) throw new Error(`Failed to fetch cases: ${error.message}`);
    return data || [];
  }

  async getById(id: string): Promise<ISMCase> {
    const { data, error } = await supabase
      .from('ism_cases')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw new Error(`Failed to fetch case: ${error.message}`);
    return data;
  }

  async update(id: string, updates: Partial<ISMCase>): Promise<ISMCase> {
    const { data, error } = await supabase
      .from('ism_cases')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update case: ${error.message}`);
    return data;
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('ism_cases').delete().eq('id', id);
    if (error) throw new Error(`Failed to delete case: ${error.message}`);
  }

  // ─── Status Transitions ──────────────────────────────────────────────────────

  async transition(id: string, newStatus: CaseStatus, actor: string = 'operator', notes?: string): Promise<ISMCase> {
    const current = await this.getById(id);
    const allowed = VALID_TRANSITIONS[current.status] || [];

    if (!allowed.includes(newStatus)) {
      throw new Error(
        `Invalid transition: ${current.status} -> ${newStatus}. ` +
        `Allowed: ${allowed.join(', ')}`
      );
    }

    const updates: Partial<ISMCase> = { status: newStatus };

    // Set timestamps based on transition
    const now = new Date().toISOString();
    if (newStatus === 'resolved') updates.resolved_at = now;
    if (newStatus === 'closed') updates.closed_at = now;
    if (newStatus === 'reopened') updates.reopened_at = now;

    // SLA response tracking
    if (['assigned', 'in_progress', 'triaging'].includes(newStatus) && !current.sla_responded_at) {
      updates.sla_responded_at = now;
    }

    // SLA resolution tracking
    if (['resolved', 'closed'].includes(newStatus) && !current.sla_resolved_at) {
      updates.sla_resolved_at = now;
      // Check if SLA was breached
      if (current.sla_resolution_deadline) {
        const deadline = new Date(current.sla_resolution_deadline);
        if (new Date(now) > deadline) {
          updates.sla_breached = true;
        }
      }
    }

    const updated = await this.update(id, updates);

    await this.addEvent(id, 'status_change', actor, current.status, newStatus,
      notes || `Status changed: ${current.status} -> ${newStatus}`);

    return updated;
  }

  // ─── Assignment ─────────────────────────────────────────────────────────────

  async assign(id: string, assignTo: string, role?: string, team?: string): Promise<ISMCase> {
    const current = await this.getById(id);
    const updates: Partial<ISMCase> = {
      assigned_to: assignTo,
      assigned_role: role,
      assigned_team: team,
    };

    // Auto-transition to assigned if currently new/triaging
    if (['new', 'triaging'].includes(current.status)) {
      updates.status = 'assigned';
    }

    // Track SLA response
    if (!current.sla_responded_at) {
      updates.sla_responded_at = new Date().toISOString();
    }

    const updated = await this.update(id, updates);

    await this.addEvent(id, 'assigned', 'operator',
      current.assigned_to || 'unassigned', assignTo,
      `Assigned to ${assignTo}${role ? ` (${role})` : ''}${team ? ` [${team}]` : ''}`);

    return updated;
  }

  // ─── Escalation ─────────────────────────────────────────────────────────────

  async escalate(id: string, reason: string, escalateTo?: string): Promise<ISMCase> {
    const current = await this.getById(id);

    // Bump priority by one level
    const priorityOrder: CasePriority[] = ['P5', 'P4', 'P3', 'P2', 'P1'];
    const currentIdx = priorityOrder.indexOf(current.priority);
    const newPriority = currentIdx < priorityOrder.length - 1
      ? priorityOrder[currentIdx + 1]
      : current.priority;

    const updates: Partial<ISMCase> = {
      status: 'escalated' as CaseStatus,
      priority: newPriority,
    };

    if (escalateTo) {
      updates.assigned_to = escalateTo;
    }

    // Update SLA deadlines for new priority
    const slaPolicy = await this.getSLAPolicyForPriority(newPriority);
    if (slaPolicy) {
      const now = new Date();
      updates.sla_resolution_deadline = new Date(
        now.getTime() + slaPolicy.resolution_time_minutes * 60000
      ).toISOString();
    }

    const updated = await this.update(id, updates);

    await this.addEvent(id, 'escalated', 'operator', current.priority, newPriority,
      `Escalated: ${reason}${escalateTo ? ` → ${escalateTo}` : ''}`);

    return updated;
  }

  // ─── Evidence ───────────────────────────────────────────────────────────────

  async addEvidence(id: string, evidence: Omit<EvidenceItem, 'id' | 'timestamp'>): Promise<ISMCase> {
    const current = await this.getById(id);
    const newEvidence: EvidenceItem = {
      ...evidence,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    };

    const updated = await this.update(id, {
      evidence: [...(current.evidence || []), newEvidence],
    });

    await this.addEvent(id, 'evidence_added', evidence.added_by, undefined, undefined,
      `Evidence added: ${evidence.title} (${evidence.type})`);

    return updated;
  }

  // ─── Link Operations ────────────────────────────────────────────────────────

  async linkAlert(caseId: string, alertId: string): Promise<ISMCase> {
    const current = await this.getById(caseId);
    if (current.alert_ids.includes(alertId)) return current;

    return this.update(caseId, {
      alert_ids: [...current.alert_ids, alertId],
    });
  }

  async linkFinding(caseId: string, findingId: string): Promise<ISMCase> {
    const current = await this.getById(caseId);
    if (current.finding_ids.includes(findingId)) return current;

    return this.update(caseId, {
      finding_ids: [...current.finding_ids, findingId],
    });
  }

  async linkMission(caseId: string, missionId: string): Promise<ISMCase> {
    return this.update(caseId, { mission_id: missionId });
  }

  // ─── Create from existing entities ──────────────────────────────────────────

  async createFromAlert(alertId: string): Promise<ISMCase> {
    const { data: alert, error } = await supabase
      .from('alerts')
      .select('*')
      .eq('id', alertId)
      .single();

    if (error || !alert) throw new Error('Alert not found');

    return this.create({
      title: alert.title,
      description: alert.description,
      case_type: 'incident',
      severity: alert.severity as CaseSeverity,
      priority: this.severityToPriority(alert.severity),
      source: `alert:${alert.source_type}`,
      source_ref: alert.original_id,
      affected_assets: [alert.affected_host, alert.source_ip, alert.dest_ip].filter(Boolean) as string[],
      alert_ids: [alertId],
      mitre_tactics: alert.mitre_tactics || [],
      mitre_techniques: alert.mitre_techniques || [],
      tags: ['from-alert', `source:${alert.source_type}`],
    });
  }

  async createFromFinding(findingId: string): Promise<ISMCase> {
    const { data: finding, error } = await supabase
      .from('findings')
      .select('*')
      .eq('id', findingId)
      .single();

    if (error || !finding) throw new Error('Finding not found');

    return this.create({
      title: finding.title,
      description: finding.description,
      case_type: 'vulnerability',
      severity: finding.severity as CaseSeverity,
      priority: this.severityToPriority(finding.severity),
      source: `finding:${finding.source}`,
      affected_assets: [finding.target_host, finding.target_url].filter(Boolean) as string[],
      finding_ids: [findingId],
      tags: ['from-finding', ...(finding.tags || [])],
    });
  }

  async createFromMission(missionId: string): Promise<ISMCase> {
    const { data: mission, error } = await supabase
      .from('missions')
      .select('*')
      .eq('id', missionId)
      .single();

    if (error || !mission) throw new Error('Mission not found');

    return this.create({
      title: `Pentest: ${mission.name}`,
      description: `Penetration test targeting ${mission.target}`,
      case_type: 'pentest',
      priority: 'P3',
      affected_assets: [mission.target],
      mission_id: missionId,
      tags: ['pentest', 'mission-linked'],
    });
  }

  // ─── SLA Engine ─────────────────────────────────────────────────────────────

  async getSLAPolicies(): Promise<SLAPolicy[]> {
    if (this.slaPolicesCache) return this.slaPolicesCache;

    const { data, error } = await supabase
      .from('ism_sla_policies')
      .select('*')
      .order('priority');

    if (error) throw new Error(`Failed to fetch SLA policies: ${error.message}`);
    this.slaPolicesCache = data || [];
    return this.slaPolicesCache;
  }

  async getSLAPolicyForPriority(priority: string): Promise<SLAPolicy | null> {
    const policies = await this.getSLAPolicies();
    return policies.find(p => p.priority === priority && p.is_default) || null;
  }

  async checkSLABreaches(): Promise<ISMCase[]> {
    const now = new Date().toISOString();

    // Find cases where SLA deadline has passed but not yet marked breached
    const { data, error } = await supabase
      .from('ism_cases')
      .select('*')
      .eq('sla_breached', false)
      .not('status', 'in', '("resolved","closed")')
      .lt('sla_resolution_deadline', now);

    if (error) throw new Error(`SLA check failed: ${error.message}`);
    if (!data || data.length === 0) return [];

    // Mark as breached
    for (const c of data) {
      await this.update(c.id, { sla_breached: true });
      await this.addEvent(c.id, 'sla_breached', 'system', undefined, undefined,
        `SLA breached: resolution deadline was ${c.sla_resolution_deadline}`);
    }

    return data;
  }

  // ─── Stats ──────────────────────────────────────────────────────────────────

  async getStats(): Promise<CaseStats> {
    const cases = await this.getAll({ limit: 1000 });

    const by_status: Record<string, number> = {};
    const by_priority: Record<string, number> = {};
    const by_type: Record<string, number> = {};
    let totalResolutionMs = 0;
    let resolvedCount = 0;

    for (const c of cases) {
      by_status[c.status] = (by_status[c.status] || 0) + 1;
      by_priority[c.priority] = (by_priority[c.priority] || 0) + 1;
      by_type[c.case_type] = (by_type[c.case_type] || 0) + 1;

      if (c.resolved_at && c.created_at) {
        totalResolutionMs += new Date(c.resolved_at).getTime() - new Date(c.created_at).getTime();
        resolvedCount++;
      }
    }

    const openStatuses: CaseStatus[] = ['new', 'triaging', 'assigned', 'in_progress', 'pending_review', 'escalated', 'on_hold', 'reopened'];
    const avgResolutionHours = resolvedCount > 0
      ? (totalResolutionMs / resolvedCount) / 3600000
      : 0;

    return {
      total: cases.length,
      by_status,
      by_priority,
      by_type,
      sla_breached: cases.filter(c => c.sla_breached).length,
      open_cases: cases.filter(c => openStatuses.includes(c.status)).length,
      avg_resolution_hours: Math.round(avgResolutionHours * 10) / 10,
      mttr_hours: Math.round(avgResolutionHours * 10) / 10,
    };
  }

  // ─── Events / Audit Trail ───────────────────────────────────────────────────

  async getEvents(caseId: string, limit = 50): Promise<CaseEvent[]> {
    const { data, error } = await supabase
      .from('ism_case_events')
      .select('*')
      .eq('case_id', caseId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw new Error(`Failed to fetch events: ${error.message}`);
    return data || [];
  }

  async addEvent(
    caseId: string,
    eventType: string,
    actor: string,
    oldValue?: string,
    newValue?: string,
    message?: string,
    data?: Record<string, unknown>
  ): Promise<void> {
    try {
      await supabase.from('ism_case_events').insert({
        case_id: caseId,
        event_type: eventType,
        actor,
        old_value: oldValue,
        new_value: newValue,
        message,
        data: data || {},
      });
    } catch (err) {
      console.error('Failed to record case event:', err);
    }
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private severityToPriority(severity: string): CasePriority {
    switch (severity?.toLowerCase()) {
      case 'critical': return 'P1';
      case 'high': return 'P2';
      case 'medium': return 'P3';
      case 'low': return 'P4';
      case 'info': return 'P5';
      default: return 'P3';
    }
  }

  getStatusColor(status: CaseStatus): string {
    const colors: Record<CaseStatus, string> = {
      new: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      triaging: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      assigned: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
      in_progress: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      pending_review: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      escalated: 'bg-red-500/20 text-red-400 border-red-500/30',
      on_hold: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
      resolved: 'bg-green-500/20 text-green-400 border-green-500/30',
      closed: 'bg-zinc-700/20 text-zinc-500 border-zinc-700/30',
      reopened: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    };
    return colors[status] || 'bg-zinc-500/20 text-zinc-400';
  }

  getPriorityColor(priority: CasePriority): string {
    const colors: Record<CasePriority, string> = {
      P1: 'bg-red-500/20 text-red-400 border-red-500/30',
      P2: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      P3: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      P4: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      P5: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
    };
    return colors[priority] || 'bg-zinc-500/20 text-zinc-400';
  }

  getTypeLabel(type: CaseType): string {
    const labels: Record<CaseType, string> = {
      incident: 'Incident',
      vulnerability: 'Vulnerability',
      pentest: 'Pentest',
      threat_hunt: 'Threat Hunt',
      compliance_audit: 'Compliance Audit',
      change_request: 'Change Request',
      risk_assessment: 'Risk Assessment',
      forensic: 'Forensics',
      general: 'General',
    };
    return labels[type] || type;
  }
}

// Export singleton
export const ismCaseService = new ISMCaseService();
export default ismCaseService;
