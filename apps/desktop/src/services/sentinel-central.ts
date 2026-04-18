// CrowByte Sentinel Central — service layer for heartbeat/agent/escalation data
// Connects to Supabase tables created by CrowByte Central (heartbeat_log, audit_log, escalations)

import { createClient } from '@supabase/supabase-js';

const _url = import.meta.env.VITE_SUPABASE_URL;
const _key = import.meta.env.VITE_SUPABASE_SERVICE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(_url, _key);

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ConnectedOrg {
  id: string;
  name: string;
  token: string;
  tier: 'free' | 'pro' | 'elite';
  context: Record<string, any>;
  policy: { threshold: number; action_mode: string; escalation_contact: string };
  lastHeartbeat: string | null;
  signalCount: number;
  status: 'active' | 'stale' | 'offline';
}

export interface AgentDecision {
  id: string;
  org_id: string;
  org_name?: string;
  timestamp: string;
  signals: AgentSignal[];
  actions: AgentAction[];
  reasoning: string;
  confidence: number;
  agent_model: string;
}

export interface AgentSignal {
  type: string;
  source: string;
  severity: number;
  data: Record<string, any>;
  timestamp: number;
}

export interface AgentAction {
  type: 'block_ip' | 'quarantine_file' | 'alert' | 'log';
  target: string;
  reason: string;
  confidence: number;
}

export interface Escalation {
  id: string;
  org_id: string;
  org_name?: string;
  timestamp: string;
  signals: AgentSignal[];
  question: string;   // the precise question the agent is asking
  reasoning: string;
  confidence: number;
  status: 'pending' | 'answered' | 'dismissed';
  answer?: string;
}

// Agent lifecycle step — used for animated pipeline visualization
export type AgentStep = 'dormant' | 'wake' | 'load_context' | 'inference' | 'decide' | 'act' | 'report' | 'sleep';

export interface AgentActivity {
  orgId: string;
  orgName: string;
  step: AgentStep;
  startedAt: number;
  confidence?: number;
  actionsCount?: number;
}

// ─── Live activity state (in-memory for animation) ────────────────────────────

let _activityListeners: ((a: AgentActivity | null) => void)[] = [];
let _currentActivity: AgentActivity | null = null;

export function onAgentActivity(cb: (a: AgentActivity | null) => void) {
  _activityListeners.push(cb);
  cb(_currentActivity);
  return () => { _activityListeners = _activityListeners.filter(l => l !== cb); };
}

function setActivity(a: AgentActivity | null) {
  _currentActivity = a;
  _activityListeners.forEach(l => l(a));
}

// Simulate agent lifecycle from a new audit_log entry (plays animation retroactively)
function animateDecision(decision: AgentDecision) {
  const steps: AgentStep[] = ['wake', 'load_context', 'inference', 'decide', 'act', 'report', 'sleep'];
  const delays = [0, 400, 800, 1800, 2400, 3000, 3800];

  steps.forEach((step, i) => {
    setTimeout(() => {
      if (step === 'sleep') {
        setActivity(null);
      } else {
        setActivity({
          orgId: decision.org_id,
          orgName: decision.org_name || decision.org_id,
          step,
          startedAt: Date.now(),
          confidence: step === 'decide' ? decision.confidence : undefined,
          actionsCount: step === 'act' ? decision.actions.length : undefined,
        });
      }
    }, delays[i]);
  });
}

// ─── Supabase queries ─────────────────────────────────────────────────────────

export const sentinelCentral = {

  // ── Orgs ──────────────────────────────────────────────────────────────────

  async getOrgs(): Promise<ConnectedOrg[]> {
    const { data: orgs } = await supabase
      .from('org_context')
      .select('id, name, token, tier, context, policy');

    if (!orgs) return [];

    // Get last heartbeat for each org
    const orgIds = orgs.map(o => o.id);
    const { data: heartbeats } = await supabase
      .from('heartbeat_log')
      .select('org_id, timestamp, signal_count')
      .in('org_id', orgIds)
      .order('timestamp', { ascending: false });

    const lastHeartbeat: Record<string, { timestamp: string; signal_count: number }> = {};
    heartbeats?.forEach(hb => {
      if (!lastHeartbeat[hb.org_id]) lastHeartbeat[hb.org_id] = hb;
    });

    const now = Date.now();
    return orgs.map(org => {
      const hb = lastHeartbeat[org.id];
      const lastMs = hb ? new Date(hb.timestamp).getTime() : 0;
      const ageMin = (now - lastMs) / 60000;

      return {
        ...org,
        lastHeartbeat: hb?.timestamp || null,
        signalCount: hb?.signal_count || 0,
        status: !hb ? 'offline' : ageMin < 2 ? 'active' : ageMin < 10 ? 'stale' : 'offline',
      };
    });
  },

  // ── Audit log (agent decisions) ───────────────────────────────────────────

  async getDecisions(limit = 20): Promise<AgentDecision[]> {
    const { data } = await supabase
      .from('audit_log')
      .select('*, org_context(name)')
      .order('timestamp', { ascending: false })
      .limit(limit);

    return (data || []).map(d => ({
      ...d,
      org_name: (d.org_context as any)?.name,
    }));
  },

  // ── Escalations ───────────────────────────────────────────────────────────

  async getEscalations(status?: string): Promise<Escalation[]> {
    let q = supabase
      .from('escalations')
      .select('*, org_context(name)')
      .order('timestamp', { ascending: false })
      .limit(50);

    if (status) q = q.eq('status', status);

    const { data } = await q;
    return (data || []).map(e => ({
      ...e,
      org_name: (e.org_context as any)?.name,
    }));
  },

  async answerEscalation(id: string, answer: string): Promise<void> {
    await supabase
      .from('escalations')
      .update({ status: 'answered', answer })
      .eq('id', id);
  },

  async dismissEscalation(id: string): Promise<void> {
    await supabase
      .from('escalations')
      .update({ status: 'dismissed' })
      .eq('id', id);
  },

  // ── Real-time subscriptions ───────────────────────────────────────────────

  subscribeToDecisions(cb: (decision: AgentDecision) => void) {
    const channel = supabase
      .channel('audit-log-live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'audit_log' }, payload => {
        const decision = payload.new as AgentDecision;
        animateDecision(decision); // trigger animated lifecycle
        cb(decision);
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  },

  subscribeToEscalations(cb: (escalation: Escalation) => void) {
    const channel = supabase
      .channel('escalations-live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'escalations' }, payload => {
        cb(payload.new as Escalation);
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  },

  subscribeToHeartbeats(cb: (hb: { org_id: string; signal_count: number; timestamp: string }) => void) {
    const channel = supabase
      .channel('heartbeat-live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'heartbeat_log' }, payload => {
        cb(payload.new as any);
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  },
};
