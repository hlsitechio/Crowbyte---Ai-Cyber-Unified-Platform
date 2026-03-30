import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Target, Plus, Brain, Warning, CheckCircle, Clock, Shield, Sword,
  Trash, CaretDown, CaretRight, Lightning, Eye, ArrowsClockwise,
  Calendar, TreeStructure, Spinner, Robot, Gauge, ShieldCheck,
  ArrowLeft, Crosshair, ListChecks, X
} from "@phosphor-icons/react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { missionPlannerService, type MissionPlan, type CreateMissionPlanData } from "@/services/mission-planner";
import { missionPlannerAgent, type GeneratedPlan, type PlanningRequest } from "@/services/mission-planner-agent";

type PlanStatus = MissionPlan['status'];

const STATUS_COLORS: Record<PlanStatus, string> = {
  draft: 'text-zinc-500',
  planning: 'text-blue-500',
  approved: 'text-violet-500',
  active: 'text-amber-500',
  completed: 'text-emerald-500',
  failed: 'text-red-500',
};

const STATUS_DOT_COLORS: Record<PlanStatus, string> = {
  draft: 'bg-zinc-500',
  planning: 'bg-blue-500',
  approved: 'bg-violet-500',
  active: 'bg-amber-500',
  completed: 'bg-emerald-500',
  failed: 'bg-red-500',
};

const SEVERITY_COLORS: Record<string, string> = {
  low: 'bg-blue-500',
  medium: 'bg-amber-500',
  high: 'bg-orange-500',
  critical: 'bg-red-500',
};

const TYPE_CONFIG: Record<string, { icon: typeof Sword; color: string; label: string }> = {
  offensive: { icon: Sword, color: 'text-red-500', label: 'Offensive' },
  defensive: { icon: Shield, color: 'text-blue-500', label: 'Defensive' },
  pentest: { icon: Target, color: 'text-violet-500', label: 'Pentest' },
  incident_response: { icon: Warning, color: 'text-amber-500', label: 'IR' },
};

const ALL_STATUSES: PlanStatus[] = ['draft', 'planning', 'approved', 'active', 'completed', 'failed'];

const MissionPlanner = () => {
  const { toast } = useToast();
  const [plans, setPlans] = useState<MissionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<MissionPlan | null>(null);
  const [expandedPhases, setExpandedPhases] = useState<Set<number>>(new Set());

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);

  // Create form
  const [newPlan, setNewPlan] = useState({ name: '', type: 'pentest', objective: '', target_scope: '' });

  // AI form
  const [aiForm, setAiForm] = useState({ objective: '', type: 'pentest', targetScope: '', constraints: '' });
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiPreview, setAiPreview] = useState<GeneratedPlan | null>(null);

  // AI modify
  const [modifying, setModifying] = useState<string | null>(null);

  // Stats
  const [stats, setStats] = useState({ total: 0, active: 0, completed: 0, failed: 0 });

  const loadPlans = useCallback(async () => {
    try {
      setLoading(true);
      const [fetchedPlans, fetchedStats] = await Promise.all([
        missionPlannerService.getPlans(),
        missionPlannerService.getPlanStats(),
      ]);
      setPlans(fetchedPlans);
      setStats(fetchedStats);
    } catch (err) {
      toast({ title: "Error", description: err.message || "Failed to load plans", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { loadPlans(); }, [loadPlans]);

  // --- CRUD ---

  const handleCreatePlan = async () => {
    if (!newPlan.name || !newPlan.objective) {
      toast({ title: "Validation", description: "Name and objective required", variant: "destructive" });
      return;
    }
    try {
      const created = await missionPlannerService.createPlan({
        name: newPlan.name,
        type: newPlan.type,
        objective: newPlan.objective,
        target_scope: newPlan.target_scope || undefined,
      });
      setPlans(prev => [created, ...prev]);
      setStats(prev => ({ ...prev, total: prev.total + 1 }));
      setCreateDialogOpen(false);
      setNewPlan({ name: '', type: 'pentest', objective: '', target_scope: '' });
      setSelectedPlan(created);
      toast({ title: "Plan Created", description: created.name });
    } catch (err) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleDeletePlan = async (id: string) => {
    try {
      await missionPlannerService.deletePlan(id);
      setPlans(prev => prev.filter(p => p.id !== id));
      if (selectedPlan?.id === id) setSelectedPlan(null);
      loadPlans(); // refresh stats
      toast({ title: "Deleted", description: "Plan removed" });
    } catch (err) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleStatusChange = async (id: string, status: PlanStatus) => {
    try {
      const updated = await missionPlannerService.updatePlan(id, { status });
      setPlans(prev => prev.map(p => p.id === id ? updated : p));
      if (selectedPlan?.id === id) setSelectedPlan(updated);
      loadPlans();
    } catch (err) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  // --- AI Generation ---

  const handleAiGenerate = async () => {
    if (!aiForm.objective) {
      toast({ title: "Validation", description: "Objective is required", variant: "destructive" });
      return;
    }
    try {
      setAiGenerating(true);
      setAiPreview(null);
      const request: PlanningRequest = {
        objective: aiForm.objective,
        type: aiForm.type as PlanningRequest['type'],
        targetScope: aiForm.targetScope || undefined,
        constraints: aiForm.constraints ? aiForm.constraints.split('\n').filter(Boolean) : undefined,
      };
      const generated = await missionPlannerAgent.generatePlan(request);
      setAiPreview(generated);
    } catch (err) {
      toast({ title: "AI Generation Failed", description: err.message, variant: "destructive" });
    } finally {
      setAiGenerating(false);
    }
  };

  const handleAcceptAiPlan = async () => {
    if (!aiPreview) return;
    try {
      const planData: CreateMissionPlanData = {
        name: aiPreview.name,
        type: aiForm.type,
        objective: aiPreview.objective,
        target_scope: aiForm.targetScope || undefined,
        strategy: aiPreview.strategy,
        phases: aiPreview.phases || [],
        risks: aiPreview.risks || [],
        success_criteria: aiPreview.successCriteria || [],
        failure_scenarios: aiPreview.failureScenarios || [],
        timeline: aiPreview.timeline?.estimatedDuration ? `${aiPreview.timeline.estimatedDuration}h` : undefined,
        ai_assessment: aiPreview.aiAssessment || undefined,
        tags: ['ai-generated'],
      };
      const created = await missionPlannerService.createPlan(planData);
      setPlans(prev => [created, ...prev]);
      setStats(prev => ({ ...prev, total: prev.total + 1 }));
      setAiDialogOpen(false);
      setAiPreview(null);
      setAiForm({ objective: '', type: 'pentest', targetScope: '', constraints: '' });
      setSelectedPlan(created);
      toast({ title: "AI Plan Saved", description: created.name });
    } catch (err) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  // --- AI Modify ---

  const handleModifyPlan = async (modificationType: 'optimize' | 'reduce_risk' | 'accelerate' | 'enhance_stealth') => {
    if (!selectedPlan) return;
    try {
      setModifying(modificationType);
      const modified = await missionPlannerAgent.modifyPlan({
        currentPlan: {
          name: selectedPlan.name,
          objective: selectedPlan.objective,
          strategy: selectedPlan.strategy,
          phases: selectedPlan.phases,
          risks: selectedPlan.risks,
          successCriteria: selectedPlan.success_criteria,
          failureScenarios: selectedPlan.failure_scenarios,
          aiAssessment: selectedPlan.ai_assessment,
        },
        modificationType,
        requirements: `${modificationType} the plan`,
      });
      const updated = await missionPlannerService.updatePlan(selectedPlan.id, {
        phases: modified.phases || selectedPlan.phases,
        risks: modified.risks || selectedPlan.risks,
        success_criteria: modified.successCriteria || selectedPlan.success_criteria,
        failure_scenarios: modified.failureScenarios || selectedPlan.failure_scenarios,
        ai_assessment: modified.aiAssessment || selectedPlan.ai_assessment,
        strategy: modified.strategy || selectedPlan.strategy,
      });
      setPlans(prev => prev.map(p => p.id === updated.id ? updated : p));
      setSelectedPlan(updated);
      toast({ title: "Plan Modified", description: `${modificationType} applied` });
    } catch (err) {
      toast({ title: "Modify Failed", description: err.message, variant: "destructive" });
    } finally {
      setModifying(null);
    }
  };

  // --- Helpers ---

  const togglePhase = (idx: number) => {
    setExpandedPhases(prev => {
      const next = new Set(prev);
      if (next.has(idx)) { next.delete(idx); } else { next.add(idx); }
      return next;
    });
  };

  const getTypeIcon = (type: string) => {
    const config = TYPE_CONFIG[type] || TYPE_CONFIG.pentest;
    const Icon = config.icon;
    return <Icon size={16} weight="bold" className={config.color} />;
  };

  // ============================================================
  // DETAIL VIEW
  // ============================================================
  if (selectedPlan) {
    const plan = selectedPlan;
    const assessment = plan.ai_assessment;
    const phases = Array.isArray(plan.phases) ? plan.phases : [];
    const risks = Array.isArray(plan.risks) ? plan.risks : [];
    const criteria = Array.isArray(plan.success_criteria) ? plan.success_criteria : [];

    return (
      <div className="space-y-6 p-6">
        {/* Back + Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => { setSelectedPlan(null); setExpandedPhases(new Set()); }}>
            <ArrowLeft size={16} weight="bold" className="mr-1" />
            Back
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              {getTypeIcon(plan.type)}
              <h1 className="text-2xl font-bold text-white">{plan.name}</h1>
              <span className={`flex items-center gap-1.5 text-xs ${STATUS_COLORS[plan.status as PlanStatus] || 'text-zinc-500'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT_COLORS[plan.status as PlanStatus] || 'bg-zinc-500'}`} />
                {plan.status}
              </span>
            </div>
            <p className="text-sm text-zinc-500 mt-1">{TYPE_CONFIG[plan.type]?.label || plan.type} &middot; Created {new Date(plan.created_at).toLocaleDateString()}</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={plan.status} onValueChange={(v) => handleStatusChange(plan.id, v as PlanStatus)}>
              <SelectTrigger className="w-[130px] h-8 text-xs bg-transparent">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALL_STATUSES.map(s => (
                  <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-400 hover:bg-white/[0.03]" onClick={() => handleDeletePlan(plan.id)}>
              <Trash size={14} weight="bold" />
            </Button>
          </div>
        </div>

        {/* Overview */}
        <div className="rounded-lg bg-transparent p-5 space-y-3">
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Overview</h2>
          {plan.objective && (
            <div>
              <span className="text-xs text-zinc-500">Objective</span>
              <p className="text-sm text-zinc-200 mt-0.5">{plan.objective}</p>
            </div>
          )}
          {plan.target_scope && (
            <div>
              <span className="text-xs text-zinc-500">Target Scope</span>
              <p className="text-sm text-zinc-200 mt-0.5">{plan.target_scope}</p>
            </div>
          )}
          {plan.strategy && (
            <div>
              <span className="text-xs text-zinc-500">Strategy</span>
              <p className="text-sm text-zinc-200 mt-0.5">{plan.strategy}</p>
            </div>
          )}
          {plan.timeline && (
            <div>
              <span className="text-xs text-zinc-500">Timeline</span>
              <p className="text-sm text-zinc-200 mt-0.5">{plan.timeline}</p>
            </div>
          )}
        </div>

        {/* AI Modification Buttons */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500 mr-1">AI Modify:</span>
          {(['optimize', 'reduce_risk', 'accelerate', 'enhance_stealth'] as const).map(mod => (
            <Button
              key={mod}
              variant="outline"
              size="sm"
              className="text-xs border-zinc-700 hover:bg-white/[0.05]"
              disabled={!!modifying}
              onClick={() => handleModifyPlan(mod)}
            >
              {modifying === mod ? <Spinner size={12} className="animate-spin mr-1" /> : <Robot size={12} weight="bold" className="mr-1" />}
              {mod.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
            </Button>
          ))}
        </div>

        {/* Phases */}
        {phases.length > 0 && (
          <div className="rounded-lg bg-transparent p-5 space-y-3">
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
              <TreeStructure size={14} weight="bold" />
              Phases ({phases.length})
            </h2>
            <div className="space-y-2">
              {phases.map((phase: Record<string, unknown>, idx: number) => {
                const isOpen = expandedPhases.has(idx);
                const tasks = Array.isArray(phase.tasks) ? phase.tasks : [];
                const tools = Array.isArray(phase.tools) ? phase.tools : [];
                return (
                  <div key={idx} className="rounded bg-white/[0.03]">
                    <button
                      className="w-full flex items-center gap-2 p-3 text-left hover:bg-white/[0.05] transition-colors"
                      onClick={() => togglePhase(idx)}
                    >
                      {isOpen ? <CaretDown size={12} weight="bold" className="text-zinc-500" /> : <CaretRight size={12} weight="bold" className="text-zinc-500" />}
                      <span className="text-sm font-medium text-zinc-200 flex-1">{phase.name || `Phase ${idx + 1}`}</span>
                      {phase.duration && <span className="text-xs text-zinc-500">{phase.duration}h</span>}
                      {tasks.length > 0 && <span className="text-xs text-zinc-600">{tasks.length} tasks</span>}
                    </button>
                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.15 }}
                          className="overflow-hidden"
                        >
                          <div className="px-3 pb-3 space-y-2">
                            {phase.description && <p className="text-xs text-zinc-400">{phase.description}</p>}
                            {tools.length > 0 && (
                              <div className="flex items-center gap-1 flex-wrap">
                                <span className="text-xs text-zinc-600">Tools:</span>
                                {tools.map((tool: string, ti: number) => (
                                  <span key={ti} className="text-xs text-zinc-400 px-1.5 py-0.5 rounded">{tool}</span>
                                ))}
                              </div>
                            )}
                            {tasks.length > 0 && (
                              <div className="space-y-1 mt-1">
                                {tasks.map((task: Record<string, unknown>, ti: number) => (
                                  <div key={ti} className="flex items-center gap-2 text-xs pl-4">
                                    <span className={`w-1 h-1 rounded-full ${
                                      task.priority === 'critical' ? 'bg-red-500' :
                                      task.priority === 'high' ? 'bg-orange-500' :
                                      task.priority === 'medium' ? 'bg-amber-500' : 'bg-blue-500'
                                    }`} />
                                    <span className="text-zinc-300 flex-1">{task.name || task.description || `Task ${ti + 1}`}</span>
                                    {task.estimatedTime && <span className="text-zinc-600">{task.estimatedTime}h</span>}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Risks */}
        {risks.length > 0 && (
          <div className="rounded-lg bg-transparent p-5 space-y-3">
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
              <Warning size={14} weight="bold" />
              Risks ({risks.length})
            </h2>
            <div className="space-y-2">
              {risks.map((risk: Record<string, unknown>, idx: number) => (
                <div key={idx} className="flex items-start gap-2 text-sm">
                  <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${SEVERITY_COLORS[risk.severity] || 'bg-zinc-500'}`} />
                  <div className="flex-1">
                    <p className="text-zinc-200">{risk.description}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500">
                      {risk.probability !== undefined && <span>Prob: {risk.probability}%</span>}
                      {risk.impact !== undefined && <span>Impact: {risk.impact}%</span>}
                    </div>
                    {risk.mitigation && <p className="text-xs text-zinc-500 mt-0.5">Mitigation: {risk.mitigation}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Success Criteria */}
        {criteria.length > 0 && (
          <div className="rounded-lg bg-transparent p-5 space-y-3">
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
              <CheckCircle size={14} weight="bold" />
              Success Criteria
            </h2>
            <ul className="space-y-1">
              {criteria.map((c: string | Record<string, unknown>, idx: number) => (
                <li key={idx} className="text-sm text-zinc-300 flex items-start gap-2">
                  <Crosshair size={12} weight="bold" className="text-emerald-500 mt-1 shrink-0" />
                  {typeof c === 'string' ? c : JSON.stringify(c)}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* AI Assessment */}
        {assessment && (
          <div className="rounded-lg bg-transparent p-5 space-y-3">
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
              <Brain size={14} weight="bold" />
              AI Assessment
            </h2>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <span className="text-xs text-zinc-500">Feasibility</span>
                <div className="flex items-center gap-2 mt-1">
                  <Gauge size={14} weight="bold" className="text-blue-500" />
                  <span className="text-lg font-bold text-white">{assessment.feasibilityScore}</span>
                  <span className="text-xs text-zinc-500">/ 100</span>
                </div>
              </div>
              <div>
                <span className="text-xs text-zinc-500">Risk Score</span>
                <div className="flex items-center gap-2 mt-1">
                  <Warning size={14} weight="bold" className="text-amber-500" />
                  <span className="text-lg font-bold text-white">{assessment.riskScore}</span>
                  <span className="text-xs text-zinc-500">/ 100</span>
                </div>
              </div>
              <div>
                <span className="text-xs text-zinc-500">Success Probability</span>
                <div className="flex items-center gap-2 mt-1">
                  <ShieldCheck size={14} weight="bold" className="text-emerald-500" />
                  <span className="text-lg font-bold text-white">{assessment.successProbability}%</span>
                </div>
              </div>
            </div>
            {assessment.recommendations && assessment.recommendations.length > 0 && (
              <div className="mt-3">
                <span className="text-xs text-zinc-500">Recommendations</span>
                <ul className="mt-1 space-y-1">
                  {assessment.recommendations.map((r: string, i: number) => (
                    <li key={i} className="text-xs text-zinc-400 flex items-start gap-1.5">
                      <Lightning size={10} weight="bold" className="text-violet-500 mt-0.5 shrink-0" />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ============================================================
  // LIST VIEW
  // ============================================================
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Target size={32} weight="duotone" className="text-primary" />
            Mission Planner
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Strategic planning for offensive & defensive operations
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setAiDialogOpen(true)}
            className="border-violet-500/30 hover:bg-violet-500/10 text-violet-400"
          >
            <Brain size={16} weight="bold" className="mr-2" />
            AI Generate Plan
          </Button>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary/20 hover:bg-primary/30 ring-1 ring-primary/20">
                <Plus size={16} weight="bold" className="mr-2" />
                New Plan
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create Mission Plan</DialogTitle>
                <DialogDescription>Define operation objectives and parameters</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Mission Name</Label>
                  <Input
                    value={newPlan.name}
                    onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })}
                    placeholder="Operation Nightfall"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={newPlan.type} onValueChange={(v) => setNewPlan({ ...newPlan, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="offensive">Offensive (Red Team)</SelectItem>
                      <SelectItem value="defensive">Defensive (Blue Team)</SelectItem>
                      <SelectItem value="pentest">Penetration Test</SelectItem>
                      <SelectItem value="incident_response">Incident Response</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Objective</Label>
                  <Textarea
                    value={newPlan.objective}
                    onChange={(e) => setNewPlan({ ...newPlan, objective: e.target.value })}
                    placeholder="Primary mission objective..."
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Target Scope</Label>
                  <Input
                    value={newPlan.target_scope}
                    onChange={(e) => setNewPlan({ ...newPlan, target_scope: e.target.value })}
                    placeholder="IP ranges, domains, systems..."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleCreatePlan}>Create Plan</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Row */}
      <div className="flex items-center gap-6">
        <div>
          <p className="text-xs text-zinc-500">Total Plans</p>
          <p className="text-xl font-bold text-white">{stats.total}</p>
        </div>
        <Separator orientation="vertical" className="h-8" />
        <div>
          <p className="text-xs text-zinc-500">Active</p>
          <p className="text-xl font-bold text-amber-500">{stats.active}</p>
        </div>
        <Separator orientation="vertical" className="h-8" />
        <div>
          <p className="text-xs text-zinc-500">Completed</p>
          <p className="text-xl font-bold text-emerald-500">{stats.completed}</p>
        </div>
        <Separator orientation="vertical" className="h-8" />
        <div>
          <p className="text-xs text-zinc-500">Failed</p>
          <p className="text-xl font-bold text-red-500">{stats.failed}</p>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Spinner size={24} className="animate-spin text-zinc-500" />
        </div>
      )}

      {/* Plans List */}
      {!loading && plans.length > 0 && (
        <div className="space-y-2">
          {plans.map((plan) => {
            const phases = Array.isArray(plan.phases) ? plan.phases : [];
            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-lg bg-transparent p-4 cursor-pointer hover:bg-zinc-900/70 transition-colors"
                onClick={() => setSelectedPlan(plan)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    {getTypeIcon(plan.type)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="font-semibold text-white truncate">{plan.name}</h3>
                        <span className={`flex items-center gap-1.5 text-xs shrink-0 ${STATUS_COLORS[plan.status as PlanStatus] || 'text-zinc-500'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT_COLORS[plan.status as PlanStatus] || 'bg-zinc-500'}`} />
                          {plan.status}
                        </span>
                      </div>
                      {plan.objective && (
                        <p className="text-sm text-zinc-500 truncate">{plan.objective}</p>
                      )}
                      <div className="flex items-center gap-4 mt-1.5 text-xs text-zinc-600">
                        <span className="flex items-center gap-1">
                          <Calendar size={11} weight="bold" />
                          {new Date(plan.created_at).toLocaleDateString()}
                        </span>
                        {phases.length > 0 && (
                          <span className="flex items-center gap-1">
                            <TreeStructure size={11} weight="bold" />
                            {phases.length} phases
                          </span>
                        )}
                        {plan.ai_assessment && (
                          <span className="flex items-center gap-1 text-violet-500/70">
                            <Brain size={11} weight="bold" />
                            AI
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setSelectedPlan(plan)}>
                      <Eye size={13} weight="bold" className="text-zinc-500" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-red-500/60 hover:text-red-400 hover:bg-white/[0.03]"
                      onClick={() => handleDeletePlan(plan.id)}
                    >
                      <Trash size={13} weight="bold" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!loading && plans.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20">
          <Target size={48} weight="duotone" className="text-zinc-700 mb-3" />
          <h3 className="text-base font-semibold text-zinc-400 mb-1">No Mission Plans</h3>
          <p className="text-sm text-zinc-600 text-center mb-4">
            Create a plan manually or use AI to generate one
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setAiDialogOpen(true)}>
              <Brain size={14} weight="bold" className="mr-1" />
              AI Generate
            </Button>
            <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
              <Plus size={14} weight="bold" className="mr-1" />
              New Plan
            </Button>
          </div>
        </div>
      )}

      {/* AI Generate Dialog */}
      <Dialog open={aiDialogOpen} onOpenChange={(open) => { setAiDialogOpen(open); if (!open) { setAiPreview(null); setAiGenerating(false); } }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain size={20} weight="duotone" className="text-violet-500" />
              AI Mission Planner
            </DialogTitle>
            <DialogDescription>
              Describe your objective and the AI will generate a full tactical plan
            </DialogDescription>
          </DialogHeader>

          {!aiPreview ? (
            /* Input Form */
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Objective *</Label>
                <Textarea
                  value={aiForm.objective}
                  onChange={(e) => setAiForm({ ...aiForm, objective: e.target.value })}
                  placeholder="Perform a comprehensive web application pentest on the target domain, focusing on authentication bypass and data exfiltration..."
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={aiForm.type} onValueChange={(v) => setAiForm({ ...aiForm, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="offensive">Offensive</SelectItem>
                      <SelectItem value="defensive">Defensive</SelectItem>
                      <SelectItem value="pentest">Penetration Test</SelectItem>
                      <SelectItem value="incident_response">Incident Response</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Target Scope</Label>
                  <Input
                    value={aiForm.targetScope}
                    onChange={(e) => setAiForm({ ...aiForm, targetScope: e.target.value })}
                    placeholder="*.target.com, 10.0.0.0/24"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Constraints (one per line, optional)</Label>
                <Textarea
                  value={aiForm.constraints}
                  onChange={(e) => setAiForm({ ...aiForm, constraints: e.target.value })}
                  placeholder="No denial of service&#10;Business hours only&#10;Avoid production databases"
                  rows={2}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAiDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleAiGenerate} disabled={aiGenerating || !aiForm.objective} className="bg-violet-600 hover:bg-violet-700">
                  {aiGenerating ? (
                    <>
                      <Spinner size={14} className="animate-spin mr-2" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Robot size={14} weight="bold" className="mr-2" />
                      Generate Plan
                    </>
                  )}
                </Button>
              </DialogFooter>
            </div>
          ) : (
            /* Preview */
            <div className="space-y-4 py-2">
              <div className="rounded-lg bg-transparent p-4 space-y-2">
                <h3 className="text-base font-semibold text-white">{aiPreview.name}</h3>
                <p className="text-sm text-zinc-400">{aiPreview.objective}</p>
                {aiPreview.strategy && <p className="text-xs text-zinc-500">{aiPreview.strategy}</p>}
              </div>

              {/* AI Scores */}
              {aiPreview.aiAssessment && (
                <div className="flex items-center gap-6 text-sm">
                  <div>
                    <span className="text-xs text-zinc-500">Feasibility</span>
                    <p className="font-bold text-white">{aiPreview.aiAssessment.feasibilityScore}/100</p>
                  </div>
                  <div>
                    <span className="text-xs text-zinc-500">Risk</span>
                    <p className="font-bold text-white">{aiPreview.aiAssessment.riskScore}/100</p>
                  </div>
                  <div>
                    <span className="text-xs text-zinc-500">Success</span>
                    <p className="font-bold text-emerald-500">{aiPreview.aiAssessment.successProbability}%</p>
                  </div>
                </div>
              )}

              {/* Phases summary */}
              {aiPreview.phases && aiPreview.phases.length > 0 && (
                <div>
                  <span className="text-xs text-zinc-500">{aiPreview.phases.length} Phases</span>
                  <div className="mt-1 space-y-1">
                    {aiPreview.phases.map((p, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <span className="w-5 h-5 rounded flex items-center justify-center text-zinc-400 text-[10px] font-bold">{i + 1}</span>
                        <span className="text-zinc-300 flex-1">{p.name}</span>
                        {p.duration && <span className="text-zinc-600">{p.duration}h</span>}
                        {p.tasks && <span className="text-zinc-600">{p.tasks.length} tasks</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Risks summary */}
              {aiPreview.risks && aiPreview.risks.length > 0 && (
                <div>
                  <span className="text-xs text-zinc-500">{aiPreview.risks.length} Risks Identified</span>
                  <div className="mt-1 space-y-1">
                    {aiPreview.risks.slice(0, 3).map((r, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <span className={`w-1.5 h-1.5 rounded-full ${SEVERITY_COLORS[r.severity] || 'bg-zinc-500'}`} />
                        <span className="text-zinc-400 truncate">{r.description}</span>
                      </div>
                    ))}
                    {aiPreview.risks.length > 3 && (
                      <span className="text-xs text-zinc-600">+{aiPreview.risks.length - 3} more</span>
                    )}
                  </div>
                </div>
              )}

              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setAiPreview(null)}>
                  <ArrowsClockwise size={14} weight="bold" className="mr-1" />
                  Regenerate
                </Button>
                <Button onClick={handleAcceptAiPlan} className="bg-emerald-600 hover:bg-emerald-700">
                  <CheckCircle size={14} weight="bold" className="mr-1" />
                  Accept & Save
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MissionPlanner;
