import { createChatCompletion } from './ai';
/**
 * Agent Orchestrator — Task queue, team provisioning, agent dispatch
 *
 * This is the brain of Agent-as-a-Service. It:
 * 1. Manages agent teams (provision, configure, scale)
 * 2. Queues and dispatches tasks to agents
 * 3. Tracks agent instances and their health
 * 4. Handles scheduled jobs (cron-style)
 * 5. Enforces tier limits (free/pro/enterprise)
 */

import { supabase } from '@/lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

export type TeamType = 'security' | 'dev' | 'ops' | 'support';
export type Tier = 'free' | 'pro' | 'enterprise';
export type TaskStatus = 'queued' | 'assigned' | 'running' | 'completed' | 'failed' | 'cancelled';
export type TaskType = 'scan' | 'build' | 'review' | 'deploy' | 'monitor' | 'triage' | 'report' | 'analyze' | 'custom';
export type InstanceStatus = 'idle' | 'busy' | 'offline' | 'error' | 'starting' | 'stopping';

export interface AgentTeam {
  id: string;
  user_id: string;
  org_id?: string;
  team_type: TeamType;
  tier: Tier;
  config: Record<string, unknown>;
  status: string;
  agents_enabled: string[];
  max_concurrent_tasks: number;
  tasks_used_this_month: number;
  tasks_limit: number;
  created_at: string;
  updated_at: string;
}

export interface AgentTask {
  id: string;
  team_id: string;
  user_id: string;
  org_id?: string;
  agent_type: string;
  task_type: TaskType;
  priority: number;
  status: TaskStatus;
  input: Record<string, unknown>;
  output: Record<string, unknown> | null;
  error: string | null;
  assigned_at: string | null;
  scheduled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  retries: number;
  max_retries: number;
  timeout_ms: number;
  created_at: string;
  updated_at: string;
}

export interface AgentInstance {
  id: string;
  team_id: string;
  agent_type: string;
  status: InstanceStatus;
  current_task_id: string | null;
  host: string;
  pid: number | null;
  capabilities: string[];
  metrics: Record<string, unknown>;
  last_heartbeat: string | null;
  started_at: string;
  stopped_at: string | null;
  error_count: number;
  tasks_completed: number;
  avg_task_duration_ms: number;
  created_at: string;
  updated_at: string;
}

export interface AgentSchedule {
  id: string;
  team_id: string;
  user_id: string;
  name: string;
  agent_type: string;
  task_type: TaskType;
  cron_expression: string;
  timezone: string;
  input: Record<string, unknown>;
  enabled: boolean;
  last_run_at: string | null;
  next_run_at: string | null;
  last_task_id: string | null;
  run_count: number;
  failure_count: number;
  max_retries: number;
  timeout_ms: number;
  created_at: string;
  updated_at: string;
}

// ─── Tier Limits ──────────────────────────────────────────────────────────────

const TIER_LIMITS: Record<Tier, {
  tasks_limit: number;
  max_concurrent: number;
  scheduling: boolean;
  teams: TeamType[];
  priority_queue: boolean;
}> = {
  free: {
    tasks_limit: 50,
    max_concurrent: 2,
    scheduling: false,
    teams: ['security'],
    priority_queue: false,
  },
  pro: {
    tasks_limit: 500,
    max_concurrent: 10,
    scheduling: true,
    teams: ['security', 'dev', 'ops'],
    priority_queue: true,
  },
  enterprise: {
    tasks_limit: -1, // unlimited
    max_concurrent: 50,
    scheduling: true,
    teams: ['security', 'dev', 'ops', 'support'],
    priority_queue: true,
  },
};

// ─── Agent Registry ───────────────────────────────────────────────────────────
// Maps agent types to their team and capabilities

const AGENT_REGISTRY: Record<string, {
  team: TeamType;
  capabilities: string[];
  description: string;
  default_timeout_ms: number;
}> = {
  // Security team
  recon:        { team: 'security', capabilities: ['subdomain_enum', 'port_scan', 'tech_detect'], description: 'Reconnaissance & asset discovery', default_timeout_ms: 600000 },
  hunter:       { team: 'security', capabilities: ['vuln_scan', 'exploit_check', 'payload_gen'], description: 'Vulnerability hunting & exploitation', default_timeout_ms: 900000 },
  triage:       { team: 'security', capabilities: ['severity_assess', 'dedup', 'prioritize'], description: 'Finding triage & prioritization', default_timeout_ms: 300000 },
  sentinel:     { team: 'security', capabilities: ['monitor', 'alert', 'baseline'], description: 'Continuous security monitoring', default_timeout_ms: 0 },
  'bug-watcher':{ team: 'security', capabilities: ['cve_track', 'disclosure_monitor', 'patch_check'], description: 'CVE & disclosure monitoring', default_timeout_ms: 300000 },
  intel:        { team: 'security', capabilities: ['osint', 'threat_intel', 'ioc_correlate'], description: 'Threat intelligence gathering', default_timeout_ms: 600000 },

  // Dev team
  coder:        { team: 'dev', capabilities: ['code_gen', 'refactor', 'implement'], description: 'UilBracketsCurly generation & implementation', default_timeout_ms: 600000 },
  reviewer:     { team: 'dev', capabilities: ['code_review', 'security_audit', 'best_practice'], description: 'UilBracketsCurly review & security audit', default_timeout_ms: 300000 },
  tester:       { team: 'dev', capabilities: ['unit_test', 'integration_test', 'e2e_test'], description: 'Test generation & execution', default_timeout_ms: 600000 },
  debugger:     { team: 'dev', capabilities: ['debug', 'trace', 'profile'], description: 'Debugging & profiling', default_timeout_ms: 300000 },
  docs:         { team: 'dev', capabilities: ['doc_gen', 'api_docs', 'readme'], description: 'Documentation generation', default_timeout_ms: 180000 },

  // Ops team
  cicd:         { team: 'ops', capabilities: ['pipeline', 'build', 'deploy_config'], description: 'CI/CD pipeline management', default_timeout_ms: 600000 },
  deployer:     { team: 'ops', capabilities: ['deploy', 'rollback', 'canary'], description: 'Deployment & rollback', default_timeout_ms: 900000 },
  monitor:      { team: 'ops', capabilities: ['metrics', 'logs', 'alerts'], description: 'Infrastructure monitoring', default_timeout_ms: 0 },
  incident:     { team: 'ops', capabilities: ['incident_response', 'postmortem', 'escalate'], description: 'Incident response', default_timeout_ms: 300000 },

  // Support team
  support:      { team: 'support', capabilities: ['ticket_handle', 'user_assist', 'faq'], description: 'User support & ticket handling', default_timeout_ms: 300000 },
  onboard:      { team: 'support', capabilities: ['setup_guide', 'tutorial', 'walkthrough'], description: 'User onboarding', default_timeout_ms: 300000 },
  escalation:   { team: 'support', capabilities: ['escalate', 'priority_route', 'sla_track'], description: 'Ticket escalation & SLA tracking', default_timeout_ms: 180000 },
};

// ─── Orchestrator Class ───────────────────────────────────────────────────────

class AgentOrchestrator {
  private pollInterval: ReturnType<typeof setInterval> | null = null;
  private isProcessing = false;

  // ── Team Management ─────────────────────────────────────────────────────

  /**
   * Provision a new agent team for a user.
   * Auto-assigns agents based on team type and tier.
   */
  async provisionTeam(userId: string, teamType: TeamType, tier: Tier, orgId?: string): Promise<AgentTeam | null> {
    const limits = TIER_LIMITS[tier];

    // Check tier allows this team type
    if (!limits.teams.includes(teamType)) {
      console.error(`[orchestrator] Tier "${tier}" does not include team type "${teamType}"`);
      return null;
    }

    // Get agents for this team type
    const agentsForTeam = Object.entries(AGENT_REGISTRY)
      .filter(([, info]) => info.team === teamType)
      .map(([name]) => name);

    const { data, error } = await supabase
      .from('agent_teams')
      .insert({
        user_id: userId,
        org_id: orgId || null,
        team_type: teamType,
        tier,
        config: { auto_provisioned: true, version: 1 },
        status: 'active',
        agents_enabled: agentsForTeam,
        max_concurrent_tasks: limits.max_concurrent,
        tasks_used_this_month: 0,
        tasks_limit: limits.tasks_limit,
      })
      .select()
      .single();

    if (error) {
      console.error('[orchestrator] Failed to provision team:', error);
      return null;
    }

    // Spin up agent instances for this team
    await this.spawnAgentInstances(data.id, agentsForTeam);

    return data as AgentTeam;
  }

  /**
   * Auto-provision all teams for a user based on their tier.
   * Called on signup or tier upgrade.
   */
  async provisionAllTeams(userId: string, tier: Tier, orgId?: string): Promise<AgentTeam[]> {
    const limits = TIER_LIMITS[tier];
    const teams: AgentTeam[] = [];

    for (const teamType of limits.teams) {
      const team = await this.provisionTeam(userId, teamType, tier, orgId);
      if (team) teams.push(team);
    }

    return teams;
  }

  /**
   * Get all teams for a user.
   */
  async getTeams(userId: string): Promise<AgentTeam[]> {
    const { data, error } = await supabase
      .from('agent_teams')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[orchestrator] Failed to fetch teams:', error);
      return [];
    }
    return (data || []) as AgentTeam[];
  }

  /**
   * Update team configuration.
   */
  async updateTeam(teamId: string, updates: Partial<AgentTeam>): Promise<AgentTeam | null> {
    const { data, error } = await supabase
      .from('agent_teams')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', teamId)
      .select()
      .single();

    if (error) {
      console.error('[orchestrator] Failed to update team:', error);
      return null;
    }
    return data as AgentTeam;
  }

  // ── Task Queue ──────────────────────────────────────────────────────────

  /**
   * Submit a task to the queue. Returns the created task.
   * Validates tier limits before accepting.
   */
  async submitTask(params: {
    teamId: string;
    userId: string;
    agentType: string;
    taskType: TaskType;
    input: Record<string, unknown>;
    priority?: number;
    scheduledAt?: string;
    maxRetries?: number;
    timeoutMs?: number;
  }): Promise<AgentTask | null> {
    // Fetch team to check limits
    const { data: team, error: teamError } = await supabase
      .from('agent_teams')
      .select('*')
      .eq('id', params.teamId)
      .single();

    if (teamError || !team) {
      console.error('[orchestrator] Team not found:', params.teamId);
      return null;
    }

    // Enforce monthly task limit (-1 = unlimited)
    if (team.tasks_limit !== -1 && team.tasks_used_this_month >= team.tasks_limit) {
      console.error('[orchestrator] Monthly task limit reached:', team.tasks_used_this_month, '/', team.tasks_limit);
      return null;
    }

    // Validate agent type is enabled for this team
    if (!(team.agents_enabled || []).includes(params.agentType)) {
      console.error('[orchestrator] Agent type not enabled:', params.agentType);
      return null;
    }

    const agentInfo = AGENT_REGISTRY[params.agentType];
    const timeoutMs = params.timeoutMs || agentInfo?.default_timeout_ms || 300000;

    // Build human-readable task name from type + input
    const taskName = (params.input?.name as string)
      || (params.input?.schedule_name as string)
      || `${params.taskType} — ${params.agentType}`;
    const target = (params.input?.target as string) || 'system';

    const { data, error } = await supabase
      .from('agent_tasks')
      .insert({
        team_id: params.teamId,
        user_id: params.userId,
        agent: params.agentType,
        agent_type: params.agentType,
        task: taskName,
        task_type: params.taskType,
        target,
        priority: params.priority || 50,
        status: 'queued' as TaskStatus,
        input: params.input,
        scheduled_at: params.scheduledAt || null,
        max_retries: params.maxRetries || 3,
        retries: 0,
        timeout_ms: timeoutMs,
      })
      .select()
      .single();

    if (error) {
      console.error('[orchestrator] Failed to submit task:', error);
      return null;
    }

    // Increment monthly usage
    await supabase
      .from('agent_teams')
      .update({
        tasks_used_this_month: (team.tasks_used_this_month || 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.teamId);

    return data as AgentTask;
  }

  /**
   * Get tasks for a team, optionally filtered by status.
   */
  async getTasks(teamId: string, status?: TaskStatus, limit = 50): Promise<AgentTask[]> {
    let query = supabase
      .from('agent_tasks')
      .select('*')
      .eq('team_id', teamId)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(limit);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[orchestrator] Failed to fetch tasks:', error);
      return [];
    }
    return (data || []) as AgentTask[];
  }

  /**
   * Get all tasks for a user across all their teams.
   */
  async getUserTasks(userId: string, status?: TaskStatus, limit = 100): Promise<AgentTask[]> {
    let query = supabase
      .from('agent_tasks')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[orchestrator] Failed to fetch user tasks:', error);
      return [];
    }
    return (data || []) as AgentTask[];
  }

  /**
   * Cancel a task. Only queued/assigned tasks can be cancelled.
   */
  async cancelTask(taskId: string): Promise<boolean> {
    const { error } = await supabase
      .from('agent_tasks')
      .update({
        status: 'cancelled' as TaskStatus,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', taskId)
      .in('status', ['queued', 'assigned']);

    if (error) {
      console.error('[orchestrator] Failed to cancel task:', error);
      return false;
    }
    return true;
  }

  /**
   * Retry a failed task by re-queuing it.
   */
  async retryTask(taskId: string): Promise<AgentTask | null> {
    const { data: task, error: fetchError } = await supabase
      .from('agent_tasks')
      .select('*')
      .eq('id', taskId)
      .single();

    if (fetchError || !task) return null;
    if (task.status !== 'failed') return null;
    if (task.retries >= task.max_retries) {
      console.error('[orchestrator] Max retries reached for task:', taskId);
      return null;
    }

    const { data, error } = await supabase
      .from('agent_tasks')
      .update({
        status: 'queued' as TaskStatus,
        retries: task.retries + 1,
        error: null,
        assigned_at: null,
        started_at: null,
        completed_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', taskId)
      .select()
      .single();

    if (error) {
      console.error('[orchestrator] Failed to retry task:', error);
      return null;
    }
    return data as AgentTask;
  }

  // ── Agent Instances ─────────────────────────────────────────────────────

  /**
   * Spawn agent instances for a team.
   */
  async spawnAgentInstances(teamId: string, agentTypes: string[]): Promise<AgentInstance[]> {
    const instances: AgentInstance[] = [];

    for (const agentType of agentTypes) {
      const agentInfo = AGENT_REGISTRY[agentType];
      if (!agentInfo) continue;

      const { data, error } = await supabase
        .from('agent_instances')
        .insert({
          team_id: teamId,
          agent_type: agentType,
          status: 'idle' as InstanceStatus,
          host: 'openclaw-vps',
          capabilities: agentInfo.capabilities,
          metrics: { tasks_per_hour: 0, success_rate: 100 },
          last_heartbeat: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error(`[orchestrator] Failed to spawn ${agentType}:`, error);
        continue;
      }
      instances.push(data as AgentInstance);
    }

    return instances;
  }

  /**
   * Get all instances for a team.
   */
  async getInstances(teamId: string): Promise<AgentInstance[]> {
    const { data, error } = await supabase
      .from('agent_instances')
      .select('*')
      .eq('team_id', teamId)
      .order('agent_type');

    if (error) {
      console.error('[orchestrator] Failed to fetch instances:', error);
      return [];
    }
    return (data || []) as AgentInstance[];
  }

  /**
   * Update agent instance status and heartbeat.
   */
  async updateInstanceStatus(instanceId: string, status: InstanceStatus, metrics?: Record<string, unknown>): Promise<void> {
    const update: Record<string, unknown> = {
      status,
      last_heartbeat: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (metrics) update.metrics = metrics;
    if (status === 'offline' || status === 'stopping') {
      update.stopped_at = new Date().toISOString();
    }

    await supabase
      .from('agent_instances')
      .update(update)
      .eq('id', instanceId);
  }

  /**
   * Find an idle agent instance for a given agent type and team.
   */
  async findIdleInstance(teamId: string, agentType: string): Promise<AgentInstance | null> {
    const { data, error } = await supabase
      .from('agent_instances')
      .select('*')
      .eq('team_id', teamId)
      .eq('agent_type', agentType)
      .eq('status', 'idle')
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;
    return data as AgentInstance;
  }

  // ── Task Dispatch (the core loop) ───────────────────────────────────────

  /**
   * Process the task queue — assign queued tasks to idle agents.
   * This is the heart of the orchestrator.
   */
  async processQueue(): Promise<number> {
    if (this.isProcessing) return 0;
    this.isProcessing = true;

    let dispatched = 0;

    try {
      // Get all queued tasks ordered by priority (desc) then created_at (asc)
      const { data: queuedTasks, error } = await supabase
        .from('agent_tasks')
        .select('*')
        .eq('status', 'queued')
        .or(`scheduled_at.is.null,scheduled_at.lte.${new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')}`)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: true })
        .limit(20);

      if (error || !queuedTasks?.length) {
        this.isProcessing = false;
        return 0;
      }

      for (const task of queuedTasks) {
        // Check team concurrency limit
        const { count: runningCount } = await supabase
          .from('agent_tasks')
          .select('*', { count: 'exact', head: true })
          .eq('team_id', task.team_id)
          .eq('status', 'running');

        const { data: team } = await supabase
          .from('agent_teams')
          .select('max_concurrent_tasks')
          .eq('id', task.team_id)
          .single();

        if (team && (runningCount || 0) >= team.max_concurrent_tasks) {
          continue; // Skip — team at capacity
        }

        // Find an idle agent instance
        const instance = await this.findIdleInstance(task.team_id, task.agent_type);
        if (!instance) continue; // No idle agent available

        // Assign task to agent
        const now = new Date().toISOString();

        await supabase
          .from('agent_tasks')
          .update({
            status: 'assigned' as TaskStatus,
            assigned_at: now,
            updated_at: now,
          })
          .eq('id', task.id);

        await supabase
          .from('agent_instances')
          .update({
            status: 'busy' as InstanceStatus,
            current_task_id: task.id,
            last_heartbeat: now,
            updated_at: now,
          })
          .eq('id', instance.id);

        dispatched++;

        // Dispatch to the actual agent runtime
        this.executeTask(task, instance).catch((err) => {
          console.error(`[orchestrator] Task execution failed:`, err);
        });
      }
    } finally {
      this.isProcessing = false;
    }

    return dispatched;
  }

  /**
   * Execute a task on an agent instance.
   * This bridges to the OpenClaw VPS agent swarm.
   */
  private async executeTask(task: AgentTask, instance: AgentInstance): Promise<void> {
    const now = new Date().toISOString();

    // Mark as running
    await supabase
      .from('agent_tasks')
      .update({ status: 'running' as TaskStatus, started_at: now, updated_at: now })
      .eq('id', task.id);

    try {
      // Build the agent command for OpenClaw VPS
      const agentCommand = this.buildAgentCommand(task);

      // Execute via OpenClaw gateway or SSH
      const result = await this.dispatchToVPS(task.agent_type, agentCommand, task.timeout_ms);

      // Mark completed
      const completedAt = new Date().toISOString();
      await supabase
        .from('agent_tasks')
        .update({
          status: 'completed' as TaskStatus,
          output: result,
          completed_at: completedAt,
          updated_at: completedAt,
        })
        .eq('id', task.id);

      // Update instance metrics
      const durationMs = new Date(completedAt).getTime() - new Date(now).getTime();
      await supabase
        .from('agent_instances')
        .update({
          status: 'idle' as InstanceStatus,
          current_task_id: null,
          tasks_completed: (instance.tasks_completed || 0) + 1,
          avg_task_duration_ms: Math.round(
            ((instance.avg_task_duration_ms || 0) * (instance.tasks_completed || 0) + durationMs) /
            ((instance.tasks_completed || 0) + 1)
          ),
          last_heartbeat: completedAt,
          updated_at: completedAt,
        })
        .eq('id', instance.id);

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      const failedAt = new Date().toISOString();

      await supabase
        .from('agent_tasks')
        .update({
          status: 'failed' as TaskStatus,
          error: errorMsg,
          completed_at: failedAt,
          updated_at: failedAt,
        })
        .eq('id', task.id);

      await supabase
        .from('agent_instances')
        .update({
          status: 'idle' as InstanceStatus,
          current_task_id: null,
          error_count: (instance.error_count || 0) + 1,
          last_heartbeat: failedAt,
          updated_at: failedAt,
        })
        .eq('id', instance.id);

      // Auto-retry if under limit
      if (task.retries < task.max_retries) {
        await this.retryTask(task.id);
      }
    }
  }

  /**
   * Build the command string for an agent task.
   */
  private buildAgentCommand(task: AgentTask): string {
    const input = task.input || {};

    switch (task.task_type) {
      case 'scan':
        return `Run a ${input.scan_type || 'full'} security scan on ${input.target || 'unknown'}. ${input.options ? JSON.stringify(input.options) : ''}`;

      case 'build':
        return `Build ${input.project || 'the project'} with config: ${JSON.stringify(input.config || {})}`;

      case 'review':
        return `Review code: ${input.description || input.file_path || 'unknown'}. Focus: ${input.focus || 'security + quality'}`;

      case 'deploy':
        return `Deploy ${input.service || 'app'} to ${input.environment || 'staging'}. ${input.notes || ''}`;

      case 'monitor':
        return `Monitor ${input.target || 'infrastructure'} for ${input.duration || '1h'}. Alert on: ${JSON.stringify(input.alert_conditions || ['errors', 'anomalies'])}`;

      case 'triage':
        return `Triage finding: ${input.title || 'untitled'}. Severity: ${input.severity || 'unknown'}. Details: ${JSON.stringify(input.details || {})}`;

      case 'report':
        return `Generate ${input.report_type || 'summary'} report. Data: ${JSON.stringify(input.data || {})}`;

      case 'analyze':
        return `Analyze: ${input.description || JSON.stringify(input)}`;

      case 'custom':
        return input.command as string || input.prompt as string || JSON.stringify(input);

      default:
        return JSON.stringify(input);
    }
  }

  /**
   * Dispatch a command to the OpenClaw VPS agent swarm.
   * Routes through our Express server relay API (/api/agents/dispatch).
   * Falls back to Electron IPC SSH for desktop mode.
   */
  private async dispatchToVPS(
    agentType: string,
    command: string,
    timeoutMs: number
  ): Promise<Record<string, unknown>> {
    // Try server relay first (works for both web and desktop)
    try {
      const serverUrl = this.getServerUrl();
      const controller = new AbortController();
      const abortTimeout = timeoutMs > 0
        ? setTimeout(() => controller.abort(), timeoutMs + 15000) // Extra 15s for SSH overhead
        : null;

      const response = await fetch(`${serverUrl}/api/agents/dispatch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`,
        },
        body: JSON.stringify({
          agent_type: agentType,
          command,
          timeout_seconds: Math.ceil(timeoutMs / 1000),
        }),
        signal: controller.signal,
      });

      if (abortTimeout) clearTimeout(abortTimeout);

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || `Server returned ${response.status}`);
      }

      return result;
    } catch (err) {
      console.warn('[orchestrator] Server relay failed, trying NVIDIA Cloud fallback:', (err as Error).message);

      // Fallback 1: NVIDIA Cloud direct (works in both web and desktop)
      try {
        return await this.dispatchViaNvidiaCloud(agentType, command);
      } catch (nvidiaErr) {
        console.warn('[orchestrator] NVIDIA Cloud fallback failed, trying Electron IPC SSH:', (nvidiaErr as Error).message);
      }

      // Fallback 2: Electron IPC → SSH (desktop only)
      return await this.dispatchViaElectronSSH(agentType, command);
    }
  }

  /**
   * Get the CrowByte server URL.
   */
  private getServerUrl(): string {
    // Check for configured server URL
    if (typeof window !== 'undefined') {
      const origin = window.location.origin;
      // If running on crowbyte.io, use same origin (strict hostname check)
      try {
        const hostname = new URL(origin).hostname;
        if (hostname === 'crowbyte.io' || hostname.endsWith('.crowbyte.io')) return origin;
      } catch {}
    }
    // Default: local Express server
    return import.meta.env.VITE_SERVER_URL || 'https://crowbyte.io';
  }

  /**
   * Get the current auth token for API calls.
   */
  private getAuthToken(): string {
    // Try to get from Supabase session
    const storageKey = Object.keys(localStorage).find(k => k.includes('supabase') && k.includes('auth'));
    if (storageKey) {
      try {
        const session = JSON.parse(localStorage.getItem(storageKey) || '{}');
        return session?.access_token || '';
      } catch { /* ignore */ }
    }
    return '';
  }

  /**
   * Direct NVIDIA Cloud API fallback — works in both web and desktop mode.
   * Uses deepseek-v3-2 to run the agent command when server relay is down.
   */
  private async dispatchViaNvidiaCloud(agentType: string, command: string): Promise<Record<string, unknown>> {
    const agentPersonas: Record<string, string> = {
      recon: 'You are a recon agent specializing in OSINT, subdomain enumeration, and attack surface mapping.',
      hunter: 'You are a vulnerability hunter focused on finding and exploiting security flaws in web applications.',
      triage: 'You are a security analyst triaging findings, assessing severity, and prioritizing remediation.',
      sentinel: 'You are a sentinel agent monitoring infrastructure for threats and anomalies.',
      intel: 'You are a threat intelligence agent tracking CVEs, threat actors, and IOCs.',
      'bug-watcher': 'You are an automated bug watcher monitoring for new vulnerabilities affecting tracked assets.',
      coder: 'You are a senior software engineer specializing in security-aware code.',
      reviewer: 'You are a code reviewer focusing on security vulnerabilities and code quality.',
      tester: 'You are a QA engineer writing and running security-focused tests.',
      debugger: 'You are an expert debugger analyzing errors and finding root causes.',
      docs: 'You are a technical writer creating clear, accurate documentation.',
      cicd: 'You are a DevOps engineer managing CI/CD pipelines and deployments.',
      deployer: 'You are a deployment specialist managing infrastructure and releases.',
      monitor: 'You are an infrastructure monitoring agent tracking system health and performance.',
      incident: 'You are an incident response commander coordinating security incidents.',
      support: 'You are a technical support specialist helping users resolve issues.',
      onboard: 'You are an onboarding specialist helping new users get started.',
      escalation: 'You are an escalation commander handling high-priority incidents.',
    };

    const persona = agentPersonas[agentType] || 'You are CrowByte AI, an expert security operations agent.';

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
          { role: 'system', content: persona },
          { role: 'user', content: command },
        ],
      }),
      signal: AbortSignal.timeout(120000),
    });

    if (!response.ok) {
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const output = data.choices?.[0]?.message?.content || '';

    return {
      success: true,
      agent: agentType,
      agent_type: agentType,
      output,
      method: 'nvidia-cloud',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * SSH fallback via Electron IPC (desktop only).
   */
  private async dispatchViaElectronSSH(agentType: string, command: string): Promise<Record<string, unknown>> {
    const isElectron = typeof window !== 'undefined' && !!(window as Record<string, unknown>).electronAPI;

    if (!isElectron) {
      throw new Error('Agent dispatch failed: server relay unreachable and SSH not available in web mode');
    }

    const electronAPI = (window as Record<string, unknown>).electronAPI as Record<string, (...args: unknown[]) => Promise<unknown>>;

    if (!electronAPI?.executeCommand) {
      throw new Error('Electron executeCommand IPC not available');
    }

    const agentMap: Record<string, string> = {
      recon: 'recon', hunter: 'hunter', triage: 'analyst',
      sentinel: 'sentinel', intel: 'intel', 'bug-watcher': 'intel',
      coder: 'gpt', reviewer: 'analyst', tester: 'gpt',
      debugger: 'gpt', docs: 'gpt', cicd: 'commander',
      deployer: 'commander', monitor: 'sentinel', incident: 'commander',
      support: 'obsidian', onboard: 'obsidian', escalation: 'commander',
    };

    const openclawAgent = agentMap[agentType] || 'main';
    const escapedCommand = command.replace(/'/g, "'\\''");
    const vpsHost = (import.meta as any).env?.VITE_VPS_HOST || 'vps.crowbyte.io';
    const sshCmd = `ssh -o ConnectTimeout=10 root@${vpsHost} "openclaw agent --agent ${openclawAgent} --local --json -m '${escapedCommand}'"`;

    const result = await electronAPI.executeCommand(sshCmd);
    return {
      success: true,
      agent: openclawAgent,
      agent_type: agentType,
      output: result,
      method: 'ssh-ipc',
      timestamp: new Date().toISOString(),
    };
  }

  // ── Scheduling ──────────────────────────────────────────────────────────

  /**
   * Create a scheduled job.
   */
  async createSchedule(params: {
    teamId: string;
    userId: string;
    name: string;
    agentType: string;
    taskType: TaskType;
    cronExpression: string;
    input: Record<string, unknown>;
    timezone?: string;
    maxRetries?: number;
    timeoutMs?: number;
  }): Promise<AgentSchedule | null> {
    // Check tier supports scheduling
    const { data: team } = await supabase
      .from('agent_teams')
      .select('tier')
      .eq('id', params.teamId)
      .single();

    if (!team || !TIER_LIMITS[team.tier as Tier]?.scheduling) {
      console.error('[orchestrator] Scheduling not available on this tier');
      return null;
    }

    const nextRun = this.getNextCronRun(params.cronExpression, params.timezone || 'UTC');

    const { data, error } = await supabase
      .from('agent_schedules')
      .insert({
        team_id: params.teamId,
        user_id: params.userId,
        name: params.name,
        agent_type: params.agentType,
        task_type: params.taskType,
        cron_expression: params.cronExpression,
        timezone: params.timezone || 'UTC',
        input: params.input,
        enabled: true,
        next_run_at: nextRun,
        max_retries: params.maxRetries || 3,
        timeout_ms: params.timeoutMs || 300000,
      })
      .select()
      .single();

    if (error) {
      console.error('[orchestrator] Failed to create schedule:', error);
      return null;
    }
    return data as AgentSchedule;
  }

  /**
   * Get schedules for a team.
   */
  async getSchedules(teamId: string): Promise<AgentSchedule[]> {
    const { data, error } = await supabase
      .from('agent_schedules')
      .select('*')
      .eq('team_id', teamId)
      .order('created_at');

    if (error) {
      console.error('[orchestrator] Failed to fetch schedules:', error);
      return [];
    }
    return (data || []) as AgentSchedule[];
  }

  /**
   * Toggle a schedule on/off.
   */
  async toggleSchedule(scheduleId: string, enabled: boolean): Promise<void> {
    await supabase
      .from('agent_schedules')
      .update({ enabled, updated_at: new Date().toISOString() })
      .eq('id', scheduleId);
  }

  /**
   * Delete a schedule.
   */
  async deleteSchedule(scheduleId: string): Promise<void> {
    await supabase
      .from('agent_schedules')
      .delete()
      .eq('id', scheduleId);
  }

  /**
   * Process due schedules — create tasks for schedules whose next_run_at has passed.
   */
  async processSchedules(): Promise<number> {
    const now = new Date().toISOString();

    const { data: dueSchedules, error } = await supabase
      .from('agent_schedules')
      .select('*')
      .eq('enabled', true)
      .lte('next_run_at', now)
      .order('next_run_at');

    if (error || !dueSchedules?.length) return 0;

    let processed = 0;

    for (const schedule of dueSchedules) {
      const task = await this.submitTask({
        teamId: schedule.team_id,
        userId: schedule.user_id,
        agentType: schedule.agent_type,
        taskType: schedule.task_type,
        input: { ...schedule.input, scheduled_by: schedule.id, schedule_name: schedule.name },
        maxRetries: schedule.max_retries,
        timeoutMs: schedule.timeout_ms,
      });

      if (task) {
        const nextRun = this.getNextCronRun(schedule.cron_expression, schedule.timezone);
        await supabase
          .from('agent_schedules')
          .update({
            last_run_at: now,
            next_run_at: nextRun,
            last_task_id: task.id,
            run_count: (schedule.run_count || 0) + 1,
            updated_at: now,
          })
          .eq('id', schedule.id);

        processed++;
      } else {
        // CRITICAL: Always advance next_run_at on failure to prevent infinite retry loop
        const nextRun = this.getNextCronRun(schedule.cron_expression, schedule.timezone);
        await supabase
          .from('agent_schedules')
          .update({
            failure_count: (schedule.failure_count || 0) + 1,
            next_run_at: nextRun,
            updated_at: now,
          })
          .eq('id', schedule.id);
      }
    }

    return processed;
  }

  /**
   * Calculate the next cron run time.
   * Simplified — supports: "* * * * *" (every minute), "0 * * * *" (hourly),
   * "0 0 * * *" (daily), "0 0 * * 0" (weekly).
   */
  private getNextCronRun(cronExpr: string, _timezone: string): string {
    const fallback = new Date(Date.now() + 3600000).toISOString(); // 1h from now

    try {
      const parts = (cronExpr || '').trim().split(/\s+/);

      if (parts.length !== 5) return fallback;

      const now = new Date();
      const next = new Date(now);
      const [minute, hour, dayOfMonth, , dayOfWeek] = parts;

      if (minute === '*' && hour === '*') {
        next.setMinutes(next.getMinutes() + 1);
      } else if (hour === '*') {
        const m = parseInt(minute);
        if (isNaN(m)) return fallback;
        next.setMinutes(m);
        if (next <= now) next.setHours(next.getHours() + 1);
      } else if (dayOfMonth === '*' && dayOfWeek === '*') {
        const h = parseInt(hour), m = parseInt(minute);
        if (isNaN(h) || isNaN(m)) return fallback;
        next.setHours(h, m, 0, 0);
        if (next <= now) next.setDate(next.getDate() + 1);
      } else if (dayOfWeek !== '*') {
        const d = parseInt(dayOfWeek), h = parseInt(hour), m = parseInt(minute);
        if (isNaN(d) || isNaN(h) || isNaN(m)) return fallback;
        next.setHours(h, m, 0, 0);
        const daysUntil = (d - next.getDay() + 7) % 7 || 7;
        next.setDate(next.getDate() + daysUntil);
      } else {
        const dom = parseInt(dayOfMonth), h = parseInt(hour), m = parseInt(minute);
        if (isNaN(dom) || isNaN(h) || isNaN(m)) return fallback;
        next.setDate(dom);
        next.setHours(h, m, 0, 0);
        if (next <= now) next.setMonth(next.getMonth() + 1);
      }

      // Final guard — if date is invalid, use fallback
      if (isNaN(next.getTime())) return fallback;
      return next.toISOString();
    } catch {
      return fallback;
    }
  }

  // ── Queue Polling ───────────────────────────────────────────────────────

  /**
   * Start the queue processing loop.
   * Polls every `intervalMs` for new tasks and due schedules.
   */
  start(intervalMs = 5000): void {
    if (this.pollInterval) return;

    console.log(`[orchestrator] Starting queue processor (${intervalMs}ms interval)`);

    this.pollInterval = setInterval(async () => {
      let dispatched = 0;
      let scheduled = 0;

      try {
        dispatched = await this.processQueue();
      } catch (err) {
        console.warn('[orchestrator] Queue error:', (err as Error).message);
      }

      try {
        scheduled = await this.processSchedules();
      } catch (err) {
        console.warn('[orchestrator] Schedule error:', (err as Error).message);
      }

      if (dispatched > 0 || scheduled > 0) {
        console.log(`[orchestrator] Dispatched: ${dispatched} tasks, Scheduled: ${scheduled} jobs`);
      }
    }, intervalMs);

    // Run immediately on start
    this.processQueue();
    this.processSchedules();
  }

  /**
   * Stop the queue processing loop.
   */
  stop(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
      console.log('[orchestrator] Queue processor stopped');
    }
  }

  // ── Stats & Dashboard ───────────────────────────────────────────────────

  /**
   * Get dashboard stats for a user's teams.
   */
  async getDashboardStats(userId: string): Promise<{
    teams: AgentTeam[];
    totalTasks: number;
    runningTasks: number;
    completedTasks: number;
    failedTasks: number;
    queuedTasks: number;
    activeAgents: number;
    totalAgents: number;
    tasksThisMonth: number;
    tasksLimit: number;
    schedules: number;
  }> {
    const teams = await this.getTeams(userId);

    if (!teams.length) {
      return {
        teams: [],
        totalTasks: 0,
        runningTasks: 0,
        completedTasks: 0,
        failedTasks: 0,
        queuedTasks: 0,
        activeAgents: 0,
        totalAgents: 0,
        tasksThisMonth: 0,
        tasksLimit: 0,
        schedules: 0,
      };
    }

    const teamIds = teams.map((t) => t.id);

    // Parallel queries for stats
    const [
      { count: totalTasks },
      { count: runningTasks },
      { count: completedTasks },
      { count: failedTasks },
      { count: queuedTasks },
      { count: activeAgents },
      { count: totalAgents },
      { count: schedules },
    ] = await Promise.all([
      supabase.from('agent_tasks').select('*', { count: 'exact', head: true }).in('team_id', teamIds),
      supabase.from('agent_tasks').select('*', { count: 'exact', head: true }).in('team_id', teamIds).eq('status', 'running'),
      supabase.from('agent_tasks').select('*', { count: 'exact', head: true }).in('team_id', teamIds).eq('status', 'completed'),
      supabase.from('agent_tasks').select('*', { count: 'exact', head: true }).in('team_id', teamIds).eq('status', 'failed'),
      supabase.from('agent_tasks').select('*', { count: 'exact', head: true }).in('team_id', teamIds).eq('status', 'queued'),
      supabase.from('agent_instances').select('*', { count: 'exact', head: true }).in('team_id', teamIds).in('status', ['idle', 'busy']),
      supabase.from('agent_instances').select('*', { count: 'exact', head: true }).in('team_id', teamIds),
      supabase.from('agent_schedules').select('*', { count: 'exact', head: true }).in('team_id', teamIds).eq('enabled', true),
    ]);

    const tasksThisMonth = teams.reduce((sum, t) => sum + (t.tasks_used_this_month || 0), 0);
    const tasksLimit = teams.reduce((sum, t) => sum + (t.tasks_limit === -1 ? Infinity : t.tasks_limit || 0), 0);

    return {
      teams,
      totalTasks: totalTasks || 0,
      runningTasks: runningTasks || 0,
      completedTasks: completedTasks || 0,
      failedTasks: failedTasks || 0,
      queuedTasks: queuedTasks || 0,
      activeAgents: activeAgents || 0,
      totalAgents: totalAgents || 0,
      tasksThisMonth,
      tasksLimit: tasksLimit === Infinity ? -1 : tasksLimit,
      schedules: schedules || 0,
    };
  }

  /**
   * Get the agent registry (static info about available agents).
   */
  getAgentRegistry() {
    return AGENT_REGISTRY;
  }

  /**
   * Get tier limits (static).
   */
  getTierLimits() {
    return TIER_LIMITS;
  }
}

// ─── Singleton Export ─────────────────────────────────────────────────────────

export const orchestrator = new AgentOrchestrator();
export default orchestrator;
