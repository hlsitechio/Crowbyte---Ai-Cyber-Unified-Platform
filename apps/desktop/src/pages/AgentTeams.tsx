/**
 * Agent Teams Dashboard — Manage agent teams, tasks, instances, and schedules.
 * The command center for Agent-as-a-Service.
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UilShield, UilBracketsCurly, UilServer, UilHeadphones,
  UilPlay, UilPause, UilSync,
  UilClock, UilCheckCircle, UilTimesCircle, UilExclamationTriangle, UilBolt, UilUsersAlt,
  UilCalendarAlt, UilPlus, UilTrashAlt, UilHeartbeat,
  UilRobot, UilAngleRight, UilSpinner,
} from '@iconscout/react-unicons';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth';
import orchestrator, {
  type AgentTeam,
  type AgentTask,
  type AgentInstance,
  type AgentSchedule,
  type TeamType,
  type TaskType,
  type TaskStatus,
} from '@/services/agent-orchestrator';

// ─── Constants ────────────────────────────────────────────────────────────────

type IconComponent = React.FC<{ className?: string; size?: number; color?: string }>;

const TEAM_ICONS: Record<TeamType, IconComponent> = {
  security: UilShield,
  dev: UilBracketsCurly,
  ops: UilServer,
  support: UilHeadphones,
};

const TEAM_COLORS: Record<TeamType, string> = {
  security: 'text-red-400',
  dev: 'text-blue-400',
  ops: 'text-green-400',
  support: 'text-purple-400',
};

const TEAM_BG: Record<TeamType, string> = {
  security: '',
  dev: '',
  ops: '',
  support: '',
};

const STATUS_BADGE: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
  queued: { variant: 'secondary', label: 'Queued' },
  assigned: { variant: 'outline', label: 'Assigned' },
  running: { variant: 'default', label: 'Running' },
  completed: { variant: 'secondary', label: 'Completed' },
  failed: { variant: 'destructive', label: 'Failed' },
  cancelled: { variant: 'outline', label: 'Cancelled' },
  idle: { variant: 'secondary', label: 'Idle' },
  busy: { variant: 'default', label: 'Busy' },
  offline: { variant: 'outline', label: 'Offline' },
  error: { variant: 'destructive', label: 'Error' },
  starting: { variant: 'outline', label: 'Starting' },
  stopping: { variant: 'outline', label: 'Stopping' },
};

const TASK_TYPE_LABELS: Record<TaskType, string> = {
  scan: 'Security Scan',
  build: 'Build',
  review: 'UilBracketsCurly Review',
  deploy: 'Deploy',
  monitor: 'Monitor',
  triage: 'Triage',
  report: 'Report',
  analyze: 'Analyze',
  custom: 'Custom',
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function AgentTeams() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [teams, setTeams] = useState<AgentTeam[]>([]);
  const [tasks, setTasks] = useState<AgentTask[]>([]);
  const [instances, setInstances] = useState<AgentInstance[]>([]);
  const [schedules, setSchedules] = useState<AgentSchedule[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<AgentTeam | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Awaited<ReturnType<typeof orchestrator.getDashboardStats>> | null>(null);

  // New task dialog
  const [showNewTask, setShowNewTask] = useState(false);
  const [newTaskAgent, setNewTaskAgent] = useState('');
  const [newTaskType, setNewTaskType] = useState<TaskType>('scan');
  const [newTaskInput, setNewTaskInput] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState('50');

  // VPS health
  const [vpsOnline, setVpsOnline] = useState<boolean | null>(null);
  const [vpsVersion, setVpsVersion] = useState('');

  // New schedule dialog
  const [showNewSchedule, setShowNewSchedule] = useState(false);
  const [schedName, setSchedName] = useState('');
  const [schedAgent, setSchedAgent] = useState('');
  const [schedTaskType, setSchedTaskType] = useState<TaskType>('scan');
  const [schedCron, setSchedCron] = useState('0 * * * *');
  const [schedInput, setSchedInput] = useState('');

  const userId = user?.id;

  const loadData = useCallback(async () => {
    if (!userId) return;
    setLoading(true);

    try {
      const [dashStats, userTasks] = await Promise.all([
        orchestrator.getDashboardStats(userId),
        orchestrator.getUserTasks(userId),
      ]);

      setStats(dashStats);
      setTeams(dashStats.teams);
      setTasks(userTasks);

      if (dashStats.teams.length > 0) {
        const team = selectedTeam || dashStats.teams[0];
        setSelectedTeam(team);

        const [teamInstances, teamSchedules] = await Promise.all([
          orchestrator.getInstances(team.id),
          orchestrator.getSchedules(team.id),
        ]);
        setInstances(teamInstances);
        setSchedules(teamSchedules);
      }
      // Check VPS health (non-blocking)
      fetch(`${window.location.origin}/api/agents/status`)
        .then(r => r.json())
        .then(data => {
          setVpsOnline(data.online);
          setVpsVersion(data.version || '');
        })
        .catch(() => setVpsOnline(false));
    } catch (err) {
      console.error('[AgentTeams] Load error:', err);
    } finally {
      setLoading(false);
    }
  }, [userId, selectedTeam]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000); // Refresh every 15s
    return () => clearInterval(interval);
  }, [loadData]);

  const handleSelectTeam = async (team: AgentTeam) => {
    setSelectedTeam(team);
    const [teamInstances, teamSchedules] = await Promise.all([
      orchestrator.getInstances(team.id),
      orchestrator.getSchedules(team.id),
    ]);
    setInstances(teamInstances);
    setSchedules(teamSchedules);
  };

  const handleProvisionTeams = async () => {
    if (!userId) return;
    const newTeams = await orchestrator.provisionAllTeams(userId, 'pro');
    if (newTeams.length) {
      toast({ title: 'Teams Provisioned', description: `${newTeams.length} agent teams created` });
      loadData();
    }
  };

  const handleSubmitTask = async () => {
    if (!selectedTeam || !userId || !newTaskAgent) return;

    let inputObj: Record<string, unknown> = {};
    try {
      inputObj = newTaskInput ? JSON.parse(newTaskInput) : {};
    } catch {
      inputObj = { prompt: newTaskInput };
    }

    const task = await orchestrator.submitTask({
      teamId: selectedTeam.id,
      userId,
      agentType: newTaskAgent,
      taskType: newTaskType,
      input: inputObj,
      priority: parseInt(newTaskPriority) || 50,
    });

    if (task) {
      toast({ title: 'Task Submitted', description: `${newTaskAgent} → ${newTaskType}` });
      setShowNewTask(false);
      setNewTaskInput('');
      loadData();
    } else {
      toast({ title: 'Failed', description: 'Could not submit task. Check limits.', variant: 'destructive' });
    }
  };

  const handleCreateSchedule = async () => {
    if (!selectedTeam || !userId || !schedAgent || !schedName) return;

    let inputObj: Record<string, unknown> = {};
    try {
      inputObj = schedInput ? JSON.parse(schedInput) : {};
    } catch {
      inputObj = { prompt: schedInput };
    }

    const schedule = await orchestrator.createSchedule({
      teamId: selectedTeam.id,
      userId,
      name: schedName,
      agentType: schedAgent,
      taskType: schedTaskType,
      cronExpression: schedCron,
      input: inputObj,
    });

    if (schedule) {
      toast({ title: 'Schedule Created', description: schedName });
      setShowNewSchedule(false);
      loadData();
    } else {
      toast({ title: 'Failed', description: 'Could not create schedule', variant: 'destructive' });
    }
  };

  const handleCancelTask = async (taskId: string) => {
    await orchestrator.cancelTask(taskId);
    toast({ title: 'Task Cancelled' });
    loadData();
  };

  const handleRetryTask = async (taskId: string) => {
    await orchestrator.retryTask(taskId);
    toast({ title: 'Task Retried' });
    loadData();
  };

  const handleToggleSchedule = async (scheduleId: string, enabled: boolean) => {
    await orchestrator.toggleSchedule(scheduleId, enabled);
    loadData();
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    await orchestrator.deleteSchedule(scheduleId);
    toast({ title: 'Schedule Deleted' });
    loadData();
  };

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center h-full">
        <UilSpinner className="w-8 h-8 animate-spin text-zinc-500" />
      </div>
    );
  }

  const agentRegistry = orchestrator.getAgentRegistry();
  const selectedTeamAgents = selectedTeam
    ? Object.entries(agentRegistry).filter(([name]) => (selectedTeam.agents_enabled || []).includes(name))
    : [];

  const teamTasks = selectedTeam
    ? tasks.filter((t) => t.team_id === selectedTeam.id)
    : tasks;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <UilRobot className="w-6 h-6 text-orange-400" />
          <h1 className="text-xl font-bold">Agent Teams</h1>
          <Badge variant="outline" className="text-xs">
            {teams.length} teams
          </Badge>
          {vpsOnline !== null && (
            <div className="flex items-center gap-1.5 text-xs">
              <div className={`w-2 h-2 rounded-full ${vpsOnline ? 'bg-green-400' : 'bg-red-400'}`} />
              <span className="text-zinc-500">VPS {vpsOnline ? 'Online' : 'Offline'}</span>
              {vpsVersion && <span className="text-zinc-600 text-[10px]">{vpsVersion.slice(0, 30)}</span>}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={loadData}>
            <UilSync className="w-4 h-4" />
          </Button>
          {teams.length === 0 && (
            <Button size="sm" onClick={handleProvisionTeams}>
              <UilPlus className="w-4 h-4 mr-1" />
              Provision Teams
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Team Sidebar */}
        <div className="w-64 border-r border-zinc-800 flex flex-col">
          <div className="p-3 border-b border-zinc-800">
            <p className="text-xs text-zinc-500 uppercase tracking-wider">Your Teams</p>
          </div>
          <ScrollArea className="flex-1">
            {teams.map((team) => {
              const Icon = TEAM_ICONS[team.team_type as TeamType] || UilShield;
              const color = TEAM_COLORS[team.team_type as TeamType] || 'text-zinc-400';
              const isSelected = selectedTeam?.id === team.id;

              return (
                <button
                  key={team.id}
                  onClick={() => handleSelectTeam(team)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                    isSelected ? 'bg-zinc-800/50 border-l-2 border-orange-400' : 'hover:bg-zinc-800/30 border-l-2 border-transparent'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${color}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium capitalize">{team.team_type}</p>
                    <p className="text-xs text-zinc-500">
                      {(team.agents_enabled || []).length} agents · {team.tier}
                    </p>
                  </div>
                  <UilAngleRight className={`w-4 h-4 text-zinc-600 ${isSelected ? 'text-orange-400' : ''}`} />
                </button>
              );
            })}

            {teams.length === 0 && (
              <div className="p-6 text-center">
                <UilRobot className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
                <p className="text-sm text-zinc-500">No teams yet</p>
                <Button size="sm" className="mt-3" onClick={handleProvisionTeams}>
                  <UilPlus className="w-4 h-4 mr-1" />
                  Provision
                </Button>
              </div>
            )}
          </ScrollArea>

          {/* Usage Summary */}
          {stats && (
            <div className="p-4 border-t border-zinc-800 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500">Tasks this month</span>
                <span className="text-zinc-300">
                  {stats.tasksThisMonth} / {stats.tasksLimit === -1 ? '∞' : stats.tasksLimit}
                </span>
              </div>
              {stats.tasksLimit > 0 && (
                <Progress
                  value={(stats.tasksThisMonth / stats.tasksLimit) * 100}
                  className="h-1"
                />
              )}
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500">Active agents</span>
                <span className="text-green-400">{stats.activeAgents} / {stats.totalAgents}</span>
              </div>
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Stats Bar */}
          {stats && (
            <div className="grid grid-cols-5 gap-3 px-6 py-4 border-b border-zinc-800">
              <StatCard icon={UilBolt} label="Running" value={stats.runningTasks} color="text-blue-400" />
              <StatCard icon={UilClock} label="Queued" value={stats.queuedTasks} color="text-amber-400" />
              <StatCard icon={UilCheckCircle} label="Completed" value={stats.completedTasks} color="text-green-400" />
              <StatCard icon={UilTimesCircle} label="Failed" value={stats.failedTasks} color="text-red-400" />
              <StatCard icon={UilCalendarAlt} label="Schedules" value={stats.schedules} color="text-purple-400" />
            </div>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-2 border-b border-zinc-800">
              <TabsList className="bg-zinc-900">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="tasks">Tasks</TabsTrigger>
                <TabsTrigger value="agents">Agents</TabsTrigger>
                <TabsTrigger value="schedules">Schedules</TabsTrigger>
              </TabsList>

              <div className="flex gap-2">
                {activeTab === 'tasks' && selectedTeam && (
                  <Dialog open={showNewTask} onOpenChange={setShowNewTask}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <UilPlus className="w-4 h-4 mr-1" />
                        New Task
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-zinc-900 border-zinc-800">
                      <DialogHeader>
                        <DialogTitle>Submit Task</DialogTitle>
                        <DialogDescription>Queue a task for an agent on the {selectedTeam.team_type} team.</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>Agent</Label>
                          <Select value={newTaskAgent} onValueChange={setNewTaskAgent}>
                            <SelectTrigger><SelectValue placeholder="Select agent" /></SelectTrigger>
                            <SelectContent>
                              {selectedTeamAgents.map(([name, info]) => (
                                <SelectItem key={name} value={name}>
                                  {name} — {info.description}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Task Type</Label>
                          <Select value={newTaskType} onValueChange={(v) => setNewTaskType(v as TaskType)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {Object.entries(TASK_TYPE_LABELS).map(([value, label]) => (
                                <SelectItem key={value} value={value}>{label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Priority (0-100)</Label>
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            value={newTaskPriority}
                            onChange={(e) => setNewTaskPriority(e.target.value)}
                          />
                        </div>
                        <div>
                          <Label>Input (JSON or text prompt)</Label>
                          <Textarea
                            value={newTaskInput}
                            onChange={(e) => setNewTaskInput(e.target.value)}
                            placeholder='{"target": "example.com", "scan_type": "full"}'
                            rows={4}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="ghost" onClick={() => setShowNewTask(false)}>Cancel</Button>
                        <Button onClick={handleSubmitTask}>Submit Task</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}

                {activeTab === 'schedules' && selectedTeam && (
                  <Dialog open={showNewSchedule} onOpenChange={setShowNewSchedule}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <UilPlus className="w-4 h-4 mr-1" />
                        New Schedule
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-zinc-900 border-zinc-800">
                      <DialogHeader>
                        <DialogTitle>Create Schedule</DialogTitle>
                        <DialogDescription>Schedule recurring tasks for agents.</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>Name</Label>
                          <Input value={schedName} onChange={(e) => setSchedName(e.target.value)} placeholder="Nightly recon scan" />
                        </div>
                        <div>
                          <Label>Agent</Label>
                          <Select value={schedAgent} onValueChange={setSchedAgent}>
                            <SelectTrigger><SelectValue placeholder="Select agent" /></SelectTrigger>
                            <SelectContent>
                              {selectedTeamAgents.map(([name, info]) => (
                                <SelectItem key={name} value={name}>{name} — {info.description}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Task Type</Label>
                          <Select value={schedTaskType} onValueChange={(v) => setSchedTaskType(v as TaskType)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {Object.entries(TASK_TYPE_LABELS).map(([value, label]) => (
                                <SelectItem key={value} value={value}>{label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Cron Expression</Label>
                          <Input value={schedCron} onChange={(e) => setSchedCron(e.target.value)} placeholder="0 * * * *" />
                          <p className="text-xs text-zinc-500 mt-1">Examples: 0 * * * * (hourly), 0 0 * * * (daily), 0 0 * * 0 (weekly)</p>
                        </div>
                        <div>
                          <Label>Input (JSON or text)</Label>
                          <Textarea
                            value={schedInput}
                            onChange={(e) => setSchedInput(e.target.value)}
                            placeholder='{"target": "example.com"}'
                            rows={3}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="ghost" onClick={() => setShowNewSchedule(false)}>Cancel</Button>
                        <Button onClick={handleCreateSchedule}>Create Schedule</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </div>

            <ScrollArea className="flex-1">
              {/* Overview Tab */}
              <TabsContent value="overview" className="p-6 space-y-6 mt-0">
                {selectedTeam && (
                  <>
                    <TeamOverviewCard team={selectedTeam} instances={instances} />

                    {/* Agent Grid */}
                    <div>
                      <h3 className="text-sm font-medium text-zinc-400 mb-3">Agents</h3>
                      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                        {selectedTeamAgents.map(([name, info]) => {
                          const instance = instances.find((i) => i.agent_type === name);
                          const statusInfo = STATUS_BADGE[instance?.status || 'offline'] || STATUS_BADGE.offline;

                          return (
                            <Card key={name} className="bg-zinc-900/50 border-zinc-800">
                              <CardContent className="p-4">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <UilRobot className="w-4 h-4 text-orange-400" />
                                    <span className="text-sm font-medium">{name}</span>
                                  </div>
                                  <Badge variant={statusInfo.variant} className="text-xs">
                                    {statusInfo.label}
                                  </Badge>
                                </div>
                                <p className="text-xs text-zinc-500 mb-2">{info.description}</p>
                                <div className="flex flex-wrap gap-1">
                                  {info.capabilities.slice(0, 3).map((cap) => (
                                    <span key={cap} className="text-[10px] px-1.5 py-0.5 bg-zinc-800 rounded text-zinc-400">
                                      {cap}
                                    </span>
                                  ))}
                                </div>
                                {instance && (
                                  <div className="mt-2 pt-2 border-t border-zinc-800 flex justify-between text-[10px] text-zinc-500">
                                    <span>{instance.tasks_completed} completed</span>
                                    <span>{instance.error_count} errors</span>
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </div>

                    {/* Recent Tasks */}
                    <div>
                      <h3 className="text-sm font-medium text-zinc-400 mb-3">Recent Tasks</h3>
                      <div className="space-y-2">
                        {teamTasks.slice(0, 5).map((task) => (
                          <TaskRow key={task.id} task={task} onCancel={handleCancelTask} onRetry={handleRetryTask} />
                        ))}
                        {teamTasks.length === 0 && (
                          <p className="text-sm text-zinc-500 text-center py-6">No tasks yet. Submit one to get started.</p>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </TabsContent>

              {/* Tasks Tab */}
              <TabsContent value="tasks" className="p-6 mt-0">
                <div className="space-y-2">
                  <AnimatePresence>
                    {teamTasks.map((task) => (
                      <motion.div
                        key={task.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                      >
                        <TaskRow task={task} onCancel={handleCancelTask} onRetry={handleRetryTask} expanded />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {teamTasks.length === 0 && (
                    <div className="text-center py-12">
                      <UilBolt className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
                      <p className="text-zinc-500">No tasks in queue</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Agents Tab */}
              <TabsContent value="agents" className="p-6 mt-0">
                <div className="space-y-3">
                  {instances.map((instance) => {
                    const agentInfo = agentRegistry[instance.agent_type];
                    const statusInfo = STATUS_BADGE[instance.status] || STATUS_BADGE.offline;

                    return (
                      <Card key={instance.id} className="bg-zinc-900/50 border-zinc-800">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`w-2 h-2 rounded-full ${
                                instance.status === 'idle' ? 'bg-green-400' :
                                instance.status === 'busy' ? 'bg-blue-400 animate-pulse' :
                                instance.status === 'error' ? 'bg-red-400' : 'bg-zinc-600'
                              }`} />
                              <div>
                                <p className="text-sm font-medium">{instance.agent_type}</p>
                                <p className="text-xs text-zinc-500">{agentInfo?.description || 'Agent'}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <Badge variant={statusInfo.variant} className="text-xs">{statusInfo.label}</Badge>
                              <div className="text-right text-xs text-zinc-500">
                                <p>{instance.tasks_completed} tasks</p>
                                <p>{instance.avg_task_duration_ms ? `~${Math.round(instance.avg_task_duration_ms / 1000)}s avg` : '-'}</p>
                              </div>
                            </div>
                          </div>
                          {instance.current_task_id && (
                            <div className="mt-2 pt-2 border-t border-zinc-800">
                              <p className="text-xs text-blue-400">
                                <UilHeartbeat className="w-3 h-3 inline mr-1" />
                                Active task: {instance.current_task_id.slice(0, 8)}...
                              </p>
                            </div>
                          )}
                          <div className="mt-2 flex gap-1 flex-wrap">
                            {(instance.capabilities || []).map((cap) => (
                              <span key={cap} className="text-[10px] px-1.5 py-0.5 bg-zinc-800 rounded text-zinc-400">{cap}</span>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                  {instances.length === 0 && (
                    <div className="text-center py-12">
                      <UilUsersAlt className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
                      <p className="text-zinc-500">No agent instances. Provision a team first.</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Schedules Tab */}
              <TabsContent value="schedules" className="p-6 mt-0">
                <div className="space-y-3">
                  {schedules.map((schedule) => (
                    <Card key={schedule.id} className="bg-zinc-900/50 border-zinc-800">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <UilCalendarAlt className={`w-5 h-5 ${schedule.enabled ? 'text-green-400' : 'text-zinc-600'}`} />
                            <div>
                              <p className="text-sm font-medium">{schedule.name}</p>
                              <p className="text-xs text-zinc-500">
                                {schedule.agent_type} · {schedule.cron_expression} · {schedule.run_count} runs
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={schedule.enabled ? 'default' : 'secondary'} className="text-xs">
                              {schedule.enabled ? 'Active' : 'Paused'}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleToggleSchedule(schedule.id, !schedule.enabled)}
                            >
                              {schedule.enabled ? <UilPause className="w-3.5 h-3.5" /> : <UilPlay className="w-3.5 h-3.5" />}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-red-400 hover:text-red-300"
                              onClick={() => handleDeleteSchedule(schedule.id)}
                            >
                              <UilTrashAlt className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                        <div className="mt-2 flex gap-4 text-xs text-zinc-500">
                          {schedule.last_run_at && (
                            <span>Last: {new Date(schedule.last_run_at).toLocaleString()}</span>
                          )}
                          {schedule.next_run_at && (
                            <span>Next: {new Date(schedule.next_run_at).toLocaleString()}</span>
                          )}
                          {schedule.failure_count > 0 && (
                            <span className="text-red-400">{schedule.failure_count} failures</span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {schedules.length === 0 && (
                    <div className="text-center py-12">
                      <UilCalendarAlt className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
                      <p className="text-zinc-500">No scheduled jobs</p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-Components ───────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, color }: { icon: IconComponent; label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-zinc-900/50 rounded-lg border border-zinc-800">
      <Icon className={`w-5 h-5 ${color}`} />
      <div>
        <p className="text-lg font-bold">{value}</p>
        <p className="text-xs text-zinc-500">{label}</p>
      </div>
    </div>
  );
}

function TeamOverviewCard({ team, instances }: { team: AgentTeam; instances: AgentInstance[] }) {
  const Icon = TEAM_ICONS[team.team_type as TeamType] || UilShield;
  const bg = TEAM_BG[team.team_type as TeamType] || 'bg-zinc-900 border-zinc-800';
  const color = TEAM_COLORS[team.team_type as TeamType] || 'text-zinc-400';

  const activeCount = instances.filter((i) => i.status === 'idle' || i.status === 'busy').length;
  const busyCount = instances.filter((i) => i.status === 'busy').length;

  return (
    <Card className={`${bg}`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Icon className={`w-8 h-8 ${color}`} />
            <div>
              <h2 className="text-xl font-bold capitalize">{team.team_type} Team</h2>
              <p className="text-sm text-zinc-400">
                {(team.agents_enabled || []).length} agents · {team.tier} tier
              </p>
            </div>
          </div>
          <div className="flex gap-6 text-center">
            <div>
              <p className="text-2xl font-bold text-green-400">{activeCount}</p>
              <p className="text-xs text-zinc-500">Online</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-400">{busyCount}</p>
              <p className="text-xs text-zinc-500">Busy</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{team.tasks_used_this_month}</p>
              <p className="text-xs text-zinc-500">Tasks/mo</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TaskRow({
  task,
  onCancel,
  onRetry,
  expanded,
}: {
  task: AgentTask;
  onCancel: (id: string) => void;
  onRetry: (id: string) => void;
  expanded?: boolean;
}) {
  const [showOutput, setShowOutput] = useState(false);
  const statusInfo = STATUS_BADGE[task.status] || STATUS_BADGE.queued;
  const typeLabel = TASK_TYPE_LABELS[task.task_type as TaskType] || task.task_type;
  const hasOutput = task.output && Object.keys(task.output).length > 0;
  const hasError = !!task.error;
  const durationMs = task.started_at && task.completed_at
    ? new Date(task.completed_at).getTime() - new Date(task.started_at).getTime()
    : null;

  return (
    <div className="bg-zinc-900/50 rounded-lg border border-zinc-800 hover:border-zinc-700 transition-colors">
      <div
        className="flex items-center justify-between p-3 cursor-pointer"
        onClick={() => (hasOutput || hasError) && setShowOutput(!showOutput)}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className={`w-1.5 h-8 rounded-full ${
            task.status === 'running' ? 'bg-blue-400 animate-pulse' :
            task.status === 'completed' ? 'bg-green-400' :
            task.status === 'failed' ? 'bg-red-400' :
            task.status === 'queued' ? 'bg-amber-400' : 'bg-zinc-600'
          }`} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{task.agent_type}</span>
              <span className="text-xs text-zinc-500">&rarr;</span>
              <span className="text-xs text-zinc-400">{typeLabel}</span>
              <Badge variant={statusInfo.variant} className="text-[10px] h-5">
                {statusInfo.label}
              </Badge>
              {task.priority > 75 && (
                <UilExclamationTriangle className="w-3 h-3 text-amber-400" />
              )}
              {(hasOutput || hasError) && (
                <UilAngleRight className={`w-3 h-3 text-zinc-500 transition-transform ${showOutput ? 'rotate-90' : ''}`} />
              )}
            </div>
            {expanded && !showOutput && (
              <div className="mt-1 text-xs text-zinc-500 truncate max-w-[500px]">
                {task.error || JSON.stringify(task.input).slice(0, 120)}
              </div>
            )}
            <div className="flex gap-3 mt-0.5 text-[10px] text-zinc-600">
              <span>P{task.priority}</span>
              {task.started_at && <span>Started: {new Date(task.started_at).toLocaleTimeString()}</span>}
              {durationMs !== null && <span className="text-zinc-400">{(durationMs / 1000).toFixed(1)}s</span>}
              {task.retry_count > 0 && <span className="text-amber-500">Retry {task.retry_count}/{task.max_retries}</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 ml-2" onClick={(e) => e.stopPropagation()}>
          {(task.status === 'queued' || task.status === 'assigned') && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onCancel(task.id)}>
              <UilTimesCircle className="w-3.5 h-3.5 text-zinc-500" />
            </Button>
          )}
          {task.status === 'failed' && task.retry_count < task.max_retries && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onRetry(task.id)}>
              <UilSync className="w-3.5 h-3.5 text-amber-400" />
            </Button>
          )}
        </div>
      </div>

      {/* Expandable Output Panel */}
      <AnimatePresence>
        {showOutput && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-2">
              {/* Input */}
              <div className="border-t border-zinc-800 pt-2">
                <p className="text-[10px] uppercase tracking-wider text-zinc-600 mb-1">Input</p>
                <pre className="text-xs text-zinc-400 bg-black/30 rounded p-2 overflow-x-auto max-h-32 whitespace-pre-wrap font-mono">
                  {JSON.stringify(task.input, null, 2)}
                </pre>
              </div>

              {/* Output */}
              {hasOutput && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-green-600 mb-1">Output</p>
                  <pre className="text-xs text-green-300/80 bg-black/30 rounded p-2 overflow-x-auto max-h-64 whitespace-pre-wrap font-mono">
                    {typeof task.output === 'string' ? task.output : JSON.stringify(task.output, null, 2)}
                  </pre>
                </div>
              )}

              {/* Error */}
              {hasError && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-red-600 mb-1">Error</p>
                  <pre className="text-xs text-red-300/80 bg-red-950/20 rounded p-2 overflow-x-auto max-h-32 whitespace-pre-wrap font-mono">
                    {task.error}
                  </pre>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
