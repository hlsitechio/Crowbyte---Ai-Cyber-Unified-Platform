import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { UilFocusTarget, UilPlus, UilBrain, UilExclamationTriangle, UilCheckCircle, UilClock, UilShield, UilBoltAlt, UilTrashAlt, UilAngleDown, UilAngleRight, UilBolt, UilEye, UilSync, UilCalendarAlt, UilSitemap, UilSpinner, UilRobot, UilTachometerFast, UilShieldCheck, UilArrowLeft, UilCrosshair, UilListOlAlt, UilTimes, UilListUl, UilColumns, UilSearch, UilPlaneFly, UilDollarSign, UilSearchAlt, UilBug, UilFileAlt, UilArrowRight, UilDraggabledots, UilRocket, UilPlay, UilTimesCircle, UilHeartRate, UilWrench, UilInfoCircle, UilHardHat, UilAward, UilPause, UilStopCircle, UilSkipForwardCircle } from "@iconscout/react-unicons";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow, format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { missionPlannerService, type MissionPlan, type CreateMissionPlanData } from "@/services/mission-planner";
import { missionPlannerAgent, type GeneratedPlan, type PlanningRequest } from "@/services/mission-planner-agent";
import {
  missionPipeline,
  type Mission, type MissionPhase, type MissionEvent, type MissionStatus,
  type PhaseType, type CreateMissionData,
  PHASE_CONFIG,
} from "@/services/mission-pipeline";

// ─── Status System ──────────────────────────────────────────────────────────

type PlanStatus = string;

interface StatusConfig {
  label: string;
  color: string;
  dotColor: string;
  bgColor: string;
  borderColor: string;
  icon: typeof UilFocusTarget;
  kanbanOrder: number;
}

const STATUS_CONFIG: Record<string, StatusConfig> = {
  draft:         { label: 'Draft',         color: 'text-zinc-400',   dotColor: 'bg-zinc-500',   bgColor: 'bg-zinc-500/10',   borderColor: 'border-zinc-500/30',   icon: UilFileAlt,        kanbanOrder: 0 },
  planning:      { label: 'Planning',      color: 'text-blue-400',   dotColor: 'bg-blue-500',   bgColor: 'bg-blue-500/10',   borderColor: 'border-blue-500/30',   icon: UilBrain,           kanbanOrder: 1 },
  recon:         { label: 'Recon',         color: 'text-cyan-400',   dotColor: 'bg-cyan-500',   bgColor: 'bg-cyan-500/10',   borderColor: 'border-cyan-500/30',   icon: UilSearchAlt,      kanbanOrder: 2 },
  active:        { label: 'Active',        color: 'text-amber-400',  dotColor: 'bg-amber-500',  bgColor: 'bg-amber-500/10',  borderColor: 'border-amber-500/30',  icon: UilBolt,       kanbanOrder: 3 },
  exploitation:  { label: 'Exploitation',  color: 'text-orange-400', dotColor: 'bg-orange-500', bgColor: 'bg-orange-500/10', borderColor: 'border-orange-500/30', icon: UilBug,             kanbanOrder: 4 },
  reporting:     { label: 'Reporting',     color: 'text-violet-400', dotColor: 'bg-violet-500', bgColor: 'bg-violet-500/10', borderColor: 'border-violet-500/30', icon: UilFileAlt,        kanbanOrder: 5 },
  submitted:     { label: 'Submitted',     color: 'text-indigo-400', dotColor: 'bg-indigo-500', bgColor: 'bg-indigo-500/10', borderColor: 'border-indigo-500/30', icon: UilPlaneFly,  kanbanOrder: 6 },
  completed:     { label: 'Completed',     color: 'text-emerald-400',dotColor: 'bg-emerald-500',bgColor: 'bg-emerald-500/10',borderColor: 'border-emerald-500/30',icon: UilCheckCircle,     kanbanOrder: 7 },
  paid:          { label: 'Paid',          color: 'text-green-400',  dotColor: 'bg-green-500',  bgColor: 'bg-green-500/10',  borderColor: 'border-green-500/30',  icon: UilDollarSign,  kanbanOrder: 8 },
  paused:        { label: 'Paused',        color: 'text-yellow-400', dotColor: 'bg-yellow-500', bgColor: 'bg-yellow-500/10', borderColor: 'border-yellow-500/30', icon: UilPause,           kanbanOrder: 9 },
  failed:        { label: 'Failed',        color: 'text-red-400',    dotColor: 'bg-red-500',    bgColor: 'bg-red-500/10',    borderColor: 'border-red-500/30',    icon: UilTimes,               kanbanOrder: 10 },
};

// Kanban columns — ordered left to right
const KANBAN_COLUMNS: string[] = ['draft', 'planning', 'recon', 'active', 'exploitation', 'reporting', 'submitted', 'completed', 'paid', 'paused', 'failed'];
const ALL_STATUSES = KANBAN_COLUMNS;

const getStatusConfig = (status: string): StatusConfig =>
  STATUS_CONFIG[status] || STATUS_CONFIG.draft;

const SEVERITY_COLORS: Record<string, string> = {
  low: 'bg-blue-500',
  medium: 'bg-amber-500',
  high: 'bg-orange-500',
  critical: 'bg-red-500',
};

const TYPE_CONFIG: Record<string, { icon: typeof UilBoltAlt; color: string; label: string }> = {
  offensive:         { icon: UilBoltAlt,   color: 'text-red-500',    label: 'Offensive' },
  defensive:         { icon: UilShield,  color: 'text-blue-500',   label: 'Defensive' },
  pentest:           { icon: UilFocusTarget,  color: 'text-violet-500', label: 'Pentest' },
  bug_bounty:        { icon: UilBug,     color: 'text-emerald-500',label: 'UilBug Bounty' },
  incident_response: { icon: UilExclamationTriangle, color: 'text-amber-500',  label: 'IR' },
};

// ─── Pipeline Constants (from Missions.tsx) ─────────────────────────────────

const PIPELINE_PHASE_ORDER: PhaseType[] = [
  "recon", "enumerate", "vuln_scan", "exploit", "post_exploit", "report",
];

const PIPELINE_PHASE_ICONS: Record<PhaseType, React.ComponentType<any>> = {
  recon: UilSearch,
  enumerate: UilSitemap,
  vuln_scan: UilBug,
  exploit: UilCrosshair,
  post_exploit: UilAward,
  report: UilFileAlt,
};

const PIPELINE_PHASE_COLORS: Record<PhaseType, {
  bg: string; text: string; border: string; glow: string; gradient: string;
}> = {
  recon: {
    bg: "bg-cyan-500/10", text: "text-cyan-400", border: "border-cyan-500/30",
    glow: "shadow-cyan-500/20", gradient: "from-cyan-500 to-cyan-400",
  },
  enumerate: {
    bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/30",
    glow: "shadow-blue-500/20", gradient: "from-blue-500 to-blue-400",
  },
  vuln_scan: {
    bg: "bg-orange-500/10", text: "text-orange-400", border: "border-orange-500/30",
    glow: "shadow-orange-500/20", gradient: "from-orange-500 to-orange-400",
  },
  exploit: {
    bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/30",
    glow: "shadow-red-500/20", gradient: "from-red-500 to-red-400",
  },
  post_exploit: {
    bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/30",
    glow: "shadow-purple-500/20", gradient: "from-purple-500 to-purple-400",
  },
  report: {
    bg: "bg-green-500/10", text: "text-green-400", border: "border-green-500/30",
    glow: "shadow-green-500/20", gradient: "from-green-500 to-green-400",
  },
};

const PIPELINE_STATUS_BADGE: Record<MissionStatus, { className: string; label: string }> = {
  created: { className: "bg-zinc-500/20 text-zinc-400", label: "Created" },
  running: { className: "bg-cyan-500/20 text-cyan-400 animate-pulse", label: "Running" },
  paused: { className: "bg-yellow-500/20 text-yellow-400", label: "Paused" },
  completed: { className: "bg-emerald-500/20 text-emerald-400", label: "Completed" },
  failed: { className: "bg-red-500/20 text-red-400", label: "Failed" },
  aborted: { className: "bg-zinc-500/20 text-zinc-500 border border-zinc-600/30", label: "Aborted" },
};

const PIPELINE_PHASE_STATUS_BADGE: Record<string, { className: string; label: string }> = {
  pending: { className: "bg-zinc-500/20 text-zinc-500 border border-zinc-600/30", label: "Pending" },
  running: { className: "bg-cyan-500/20 text-cyan-400 animate-pulse", label: "Running" },
  completed: { className: "bg-emerald-500/20 text-emerald-400", label: "Completed" },
  failed: { className: "bg-red-500/20 text-red-400", label: "Failed" },
  skipped: { className: "bg-zinc-500/20 text-zinc-600 border border-zinc-700/30", label: "Skipped" },
};

const PIPELINE_EVENT_ICONS: Record<string, React.ComponentType<any>> = {
  mission_created: UilRocket, mission_started: UilPlay, mission_paused: UilPause,
  mission_resumed: UilSync, mission_completed: UilCheckCircle,
  mission_aborted: UilStopCircle, phase_start: UilBolt, phase_complete: UilCheckCircle,
  phase_skipped: UilSkipForwardCircle, report_generated: UilFileAlt, error: UilTimesCircle,
};

const PIPELINE_EVENT_COLORS: Record<string, string> = {
  mission_created: "text-zinc-400", mission_started: "text-cyan-400",
  mission_paused: "text-yellow-400", mission_resumed: "text-cyan-400",
  mission_completed: "text-emerald-400", mission_aborted: "text-zinc-500",
  phase_start: "text-blue-400", phase_complete: "text-emerald-400",
  phase_skipped: "text-zinc-500", report_generated: "text-green-400",
  error: "text-red-400",
};

// ─── Kanban Card ─────────────────────────────────────────────────────────────

function KanbanCard({
  plan,
  onSelect,
  onDelete,
  onDragStart,
  onDragEnd,
  linkedMissions,
  onLaunchPipeline,
  launchingPipeline,
}: {
  plan: MissionPlan;
  onSelect: () => void;
  onDelete: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: (e: React.DragEvent) => void;
  linkedMissions?: Mission[];
  onLaunchPipeline?: (startImmediately: boolean) => void;
  launchingPipeline?: boolean;
}) {
  const typeConf = TYPE_CONFIG[plan.type] || TYPE_CONFIG.pentest;
  const TypeIcon = typeConf.icon;
  const phases = Array.isArray(plan.phases) ? plan.phases : [];
  const wasDragging = useRef(false);

  // Pipeline link status
  const latestMission = linkedMissions?.[0];
  const pipelineStatus = latestMission?.status;

  return (
    <div
      draggable
      onDragStart={(e) => {
        wasDragging.current = true;
        onDragStart(e);
      }}
      onDragEnd={(e) => {
        onDragEnd(e);
        // Keep flag true briefly so the click handler can check it
        setTimeout(() => { wasDragging.current = false; }, 0);
      }}
      onClick={() => {
        // Don't open detail view if we just finished a drag
        if (wasDragging.current) return;
        onSelect();
      }}
      className="group rounded-lg bg-zinc-900/80 border border-zinc-800/60 p-3 cursor-grab active:cursor-grabbing hover:border-zinc-700/80 hover:bg-zinc-900 transition-all select-none"
    >
      {/* Header */}
      <div className="flex items-start gap-2 mb-1.5">
        <UilDraggabledots size={14} className="text-zinc-700 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-zinc-200 truncate leading-tight">{plan.name}</h4>
          {plan.target_scope && (
            <p className="text-[10px] text-zinc-600 truncate mt-0.5">{plan.target_scope}</p>
          )}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-600 hover:text-red-400 p-0.5 shrink-0"
        >
          <UilTrashAlt size={11} />
        </button>
      </div>

      {/* Type badge + phase count */}
      <div className="flex items-center gap-2 mb-1">
        <span className={`inline-flex items-center gap-1 text-[9px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded ${typeConf.color} bg-white/[0.04]`}>
          <TypeIcon size={10} />
          {typeConf.label}
        </span>
        {phases.length > 0 && (
          <span className="inline-flex items-center gap-1 text-[9px] text-zinc-500 font-mono">
            <UilSitemap size={9} />
            {phases.length} phases
          </span>
        )}
      </div>

      {/* Pipeline status indicator */}
      {latestMission && (
        <div className={`flex items-center gap-1.5 text-[9px] mb-1 px-1.5 py-0.5 rounded ${
          pipelineStatus === 'running' ? 'bg-cyan-500/10 text-cyan-400' :
          pipelineStatus === 'completed' ? 'bg-emerald-500/10 text-emerald-400' :
          pipelineStatus === 'failed' ? 'bg-red-500/10 text-red-400' :
          pipelineStatus === 'paused' ? 'bg-yellow-500/10 text-yellow-400' :
          'bg-zinc-500/10 text-zinc-400'
        }`}>
          <UilRocket size={9} />
          <span className="font-medium">Pipeline: {pipelineStatus}</span>
          {latestMission.progress > 0 && <span className="font-mono ml-auto">{latestMission.progress}%</span>}
        </div>
      )}

      {/* Launch Pipeline button (shown on hover if no pipeline linked) */}
      {!latestMission && onLaunchPipeline && (
        <div className="opacity-0 group-hover:opacity-100 transition-opacity mb-1">
          <button
            onClick={(e) => { e.stopPropagation(); onLaunchPipeline(true); }}
            disabled={launchingPipeline}
            className="flex items-center gap-1 text-[9px] text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            {launchingPipeline ? <UilSpinner size={9} className="animate-spin" /> : <UilRocket size={9} />}
            Launch Pipeline
          </button>
        </div>
      )}

      {/* Footer meta */}
      <div className="flex items-center gap-3 text-[10px] text-zinc-600">
        <span className="flex items-center gap-1">
          <UilCalendarAlt size={9} />
          {new Date(plan.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </span>
        {plan.ai_assessment && (
          <span className="flex items-center gap-1 text-violet-500/60">
            <UilBrain size={9} />
            AI
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Kanban Column ───────────────────────────────────────────────────────────

function KanbanColumn({
  status,
  plans,
  onSelect,
  onDelete,
  onDragStart,
  onDragEnd,
  onDrop,
  isDragOver,
  onDragOver,
  onDragLeave,
  linkedMissions,
  onLaunchPipeline,
  launchingPipeline,
}: {
  status: string;
  plans: MissionPlan[];
  onSelect: (plan: MissionPlan) => void;
  onDelete: (id: string) => void;
  onDragStart: (e: React.DragEvent, planId: string) => void;
  onDragEnd: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  isDragOver: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  linkedMissions?: Record<string, Mission[]>;
  onLaunchPipeline?: (plan: MissionPlan, startImmediately: boolean) => void;
  launchingPipeline?: string | null;
}) {
  const conf = getStatusConfig(status);
  const StatusIcon = conf.icon;
  const columnRef = useRef<HTMLDivElement>(null);

  const handleDragLeave = (e: React.DragEvent) => {
    // Only fire leave if we're actually leaving the column element,
    // not just moving between child elements within the column
    const related = e.relatedTarget as Node | null;
    if (columnRef.current && related && columnRef.current.contains(related)) {
      return; // Still inside the column — ignore
    }
    onDragLeave(e);
  };

  return (
    <div
      ref={columnRef}
      className={`flex flex-col min-w-[220px] w-[220px] shrink-0 rounded-xl transition-all duration-150 ${
        isDragOver
          ? `${conf.bgColor} border-2 border-dashed ${conf.borderColor} ring-1 ring-current/10 scale-[1.01]`
          : 'bg-zinc-900/40 border border-zinc-800/40'
      }`}
      onDragOver={onDragOver}
      onDragLeave={handleDragLeave}
      onDrop={onDrop}
    >
      {/* Column header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-zinc-800/40">
        <StatusIcon size={13} className={conf.color} />
        <span className={`text-xs font-semibold ${conf.color}`}>{conf.label}</span>
        <span className="ml-auto text-[10px] text-zinc-600 font-mono">{plans.length}</span>
      </div>

      {/* Cards — scrollable vertically */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[120px] scrollbar-thin scrollbar-thumb-zinc-800">
        {plans.map((plan) => (
          <KanbanCard
            key={plan.id}
            plan={plan}
            onSelect={() => onSelect(plan)}
            onDelete={() => onDelete(plan.id)}
            onDragStart={(e) => onDragStart(e, plan.id)}
            onDragEnd={onDragEnd}
            linkedMissions={linkedMissions?.[plan.id]}
            onLaunchPipeline={onLaunchPipeline ? (start) => onLaunchPipeline(plan, start) : undefined}
            launchingPipeline={launchingPipeline === plan.id}
          />
        ))}

        {/* Empty state / drop target */}
        {plans.length === 0 && (
          <div className={`flex items-center justify-center h-20 rounded-lg border border-dashed text-[10px] transition-colors ${
            isDragOver ? `${conf.borderColor} ${conf.color}` : 'border-zinc-800/40 text-zinc-700'
          }`}>
            Drop here
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

const MissionPlanner = () => {
  const { toast } = useToast();
  const [plans, setPlans] = useState<MissionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<MissionPlan | null>(null);
  const [expandedPhases, setExpandedPhases] = useState<Set<number>>(new Set());
  const [viewMode, setViewMode] = useState<'kanban' | 'list' | 'pipeline'>('kanban');
  const [searchQuery, setSearchQuery] = useState('');

  // DnD state
  const [draggedPlanId, setDraggedPlanId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);

  // Create form
  const [newPlan, setNewPlan] = useState({ name: '', type: 'bug_bounty', objective: '', target_scope: '', status: 'draft' });

  // AI form
  const [aiForm, setAiForm] = useState({ objective: '', type: 'pentest', targetScope: '', constraints: '' });
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiPreview, setAiPreview] = useState<GeneratedPlan | null>(null);

  // ─── Pipeline State (from Missions.tsx) ────────────────────────────────────
  const [pipelineMissions, setPipelineMissions] = useState<Mission[]>([]);
  const [pipelineLoading, setPipelineLoading] = useState(true);
  const [pipelineSelectedMission, setPipelineSelectedMission] = useState<Mission | null>(null);
  const [pipelinePhases, setPipelinePhases] = useState<MissionPhase[]>([]);
  const [pipelineEvents, setPipelineEvents] = useState<MissionEvent[]>([]);
  const [pipelineLoadingDetail, setPipelineLoadingDetail] = useState(false);
  const [pipelineStats, setPipelineStats] = useState({ total: 0, running: 0, completed: 0, total_findings: 0, total_critical: 0 });
  const [pipelineSearch, setPipelineSearch] = useState("");
  const [pipelineExpandedPhase, setPipelineExpandedPhase] = useState<string | null>(null);
  const [pipelineCreateOpen, setPipelineCreateOpen] = useState(false);
  const [pipelineCreateData, setPipelineCreateData] = useState<{
    name: string; target: string; scope: string; rules_of_engagement: string;
    estimated_duration: string; skip_phases: Set<PhaseType>;
  }>({ name: "", target: "", scope: "", rules_of_engagement: "", estimated_duration: "", skip_phases: new Set() });
  const [pipelineCreating, setPipelineCreating] = useState(false);
  const [pipelineDeleteTarget, setPipelineDeleteTarget] = useState<Mission | null>(null);
  const [pipelineDeleting, setPipelineDeleting] = useState(false);
  const [pipelineActionLoading, setPipelineActionLoading] = useState<string | null>(null);

  // Plan-to-Pipeline linking
  const [linkedMissions, setLinkedMissions] = useState<Record<string, Mission[]>>({});
  const [launchingPipeline, setLaunchingPipeline] = useState<string | null>(null);

  // AI modify
  const [modifying, setModifying] = useState<string | null>(null);

  // Stats
  const stats = {
    total: plans.length,
    active: plans.filter(p => ['active', 'exploitation', 'recon'].includes(p.status)).length,
    completed: plans.filter(p => ['completed', 'paid'].includes(p.status)).length,
    submitted: plans.filter(p => p.status === 'submitted').length,
    paused: plans.filter(p => p.status === 'paused').length,
  };

  const loadPlans = useCallback(async () => {
    try {
      setLoading(true);
      const fetchedPlans = await missionPlannerService.getPlans();
      setPlans(fetchedPlans);
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to load plans", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { loadPlans(); }, [loadPlans]);

  // Load linked pipeline missions for all plans
  const loadLinkedMissions = useCallback(async () => {
    try {
      const allMissions = await missionPipeline.getAll();
      const linked: Record<string, Mission[]> = {};
      allMissions.forEach(m => {
        if (m.plan_id) {
          if (!linked[m.plan_id]) linked[m.plan_id] = [];
          linked[m.plan_id].push(m);
        }
      });
      setLinkedMissions(linked);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { loadLinkedMissions(); }, [loadLinkedMissions]);

  // Launch pipeline from a kanban plan
  const handleLaunchPipeline = async (plan: MissionPlan, startImmediately = false) => {
    try {
      setLaunchingPipeline(plan.id);
      const payload: CreateMissionData = {
        name: plan.name,
        target: plan.target_scope || 'target.com',
        scope: plan.target_scope ? {
          domains: plan.target_scope.split(/[,\s]+/).filter(Boolean),
        } : undefined,
        plan_id: plan.id,
        auto_advance: true,
      };
      const mission = await missionPipeline.create(payload);
      if (startImmediately) {
        await missionPipeline.startMission(mission.id);
        toast({ title: "Pipeline Started", description: `"${plan.name}" pipeline is now running` });
      } else {
        toast({ title: "Pipeline Created", description: `"${plan.name}" pipeline created as draft` });
      }
      // Refresh linked missions
      await loadLinkedMissions();
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to launch pipeline", variant: "destructive" });
    } finally {
      setLaunchingPipeline(null);
    }
  };

  // Filter plans by search
  const filteredPlans = searchQuery
    ? plans.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.objective?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.target_scope?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.type.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : plans;

  // Group plans by status for kanban
  const plansByStatus = KANBAN_COLUMNS.reduce((acc, status) => {
    acc[status] = filteredPlans.filter(p => p.status === status);
    return acc;
  }, {} as Record<string, MissionPlan[]>);

  // ─── DnD Handlers ──────────────────────────────────────────────────────────

  const handleDragStart = (e: React.DragEvent, planId: string) => {
    setDraggedPlanId(planId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', planId);
    // Add a drag image class for visual feedback
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.classList.add('opacity-40');
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    // Restore opacity on the source element
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.classList.remove('opacity-40');
    }
    setDraggedPlanId(null);
    setDragOverColumn(null);
  };

  const handleDragOver = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverColumn !== status) {
      setDragOverColumn(status);
    }
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();
    setDragOverColumn(null);
    const planId = draggedPlanId || e.dataTransfer.getData('text/plain');
    if (!planId) {
      setDraggedPlanId(null);
      return;
    }

    const plan = plans.find(p => p.id === planId);
    if (!plan || plan.status === targetStatus) {
      setDraggedPlanId(null);
      return;
    }

    const previousStatus = plan.status;

    // Optimistic update
    setPlans(prev => prev.map(p => p.id === planId ? { ...p, status: targetStatus } : p));
    if (selectedPlan?.id === planId) {
      setSelectedPlan(prev => prev ? { ...prev, status: targetStatus } : null);
    }

    try {
      await missionPlannerService.updatePlan(planId, { status: targetStatus as any });
      const conf = getStatusConfig(targetStatus);
      toast({ title: `Moved to ${conf.label}`, description: plan.name });
    } catch (err: any) {
      // Rollback to previous status
      setPlans(prev => prev.map(p => p.id === planId ? { ...p, status: previousStatus } : p));
      if (selectedPlan?.id === planId) {
        setSelectedPlan(prev => prev ? { ...prev, status: previousStatus } : null);
      }
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }

    setDraggedPlanId(null);
  };

  // ─── CRUD ────────────────────────────────────────────────────────────────────

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
        status: newPlan.status as any,
      });
      setPlans(prev => [created, ...prev]);
      setCreateDialogOpen(false);
      setNewPlan({ name: '', type: 'bug_bounty', objective: '', target_scope: '', status: 'draft' });
      toast({ title: "Mission Created", description: created.name });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleDeletePlan = async (id: string) => {
    try {
      await missionPlannerService.deletePlan(id);
      setPlans(prev => prev.filter(p => p.id !== id));
      if (selectedPlan?.id === id) setSelectedPlan(null);
      toast({ title: "Deleted", description: "Mission removed" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleStatusChange = async (id: string, status: PlanStatus) => {
    try {
      const updated = await missionPlannerService.updatePlan(id, { status: status as any });
      setPlans(prev => prev.map(p => p.id === id ? updated : p));
      if (selectedPlan?.id === id) setSelectedPlan(updated);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  // ─── AI Generation ─────────────────────────────────────────────────────────

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
    } catch (err: any) {
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
      setAiDialogOpen(false);
      setAiPreview(null);
      setAiForm({ objective: '', type: 'pentest', targetScope: '', constraints: '' });
      setSelectedPlan(created);
      toast({ title: "AI Plan Saved", description: created.name });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  // ─── AI Modify ─────────────────────────────────────────────────────────────

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
    } catch (err: any) {
      toast({ title: "Modify Failed", description: err.message, variant: "destructive" });
    } finally {
      setModifying(null);
    }
  };

  // ─── Pipeline Data Loading ──────────────────────────────────────────────────

  const loadPipelineMissions = useCallback(async () => {
    try {
      setPipelineLoading(true);
      const [data, statsData] = await Promise.all([
        missionPipeline.getAll(),
        missionPipeline.getStats(),
      ]);
      setPipelineMissions(data);
      setPipelineStats(statsData);
    } catch (err) {
      console.error("Failed to load pipeline missions:", err);
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to load missions", variant: "destructive" });
    } finally {
      setPipelineLoading(false);
    }
  }, [toast]);

  const loadPipelineMissionDetail = useCallback(async (mission: Mission) => {
    try {
      setPipelineLoadingDetail(true);
      const [phasesData, eventsData] = await Promise.all([
        missionPipeline.getPhases(mission.id),
        missionPipeline.getEvents(mission.id, 100),
      ]);
      setPipelinePhases(phasesData);
      setPipelineEvents(eventsData);
    } catch (err) {
      console.error("Failed to load mission detail:", err);
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to load mission details", variant: "destructive" });
    } finally {
      setPipelineLoadingDetail(false);
    }
  }, [toast]);

  // Load pipeline missions when switching to pipeline view
  useEffect(() => {
    if (viewMode === 'pipeline') {
      loadPipelineMissions();
    }
  }, [viewMode, loadPipelineMissions]);

  // Load detail when pipeline mission selected
  useEffect(() => {
    if (pipelineSelectedMission) {
      loadPipelineMissionDetail(pipelineSelectedMission);
    } else {
      setPipelinePhases([]);
      setPipelineEvents([]);
      setPipelineExpandedPhase(null);
    }
  }, [pipelineSelectedMission, loadPipelineMissionDetail]);

  // Polling for running pipeline missions
  useEffect(() => {
    if (viewMode !== 'pipeline') return;
    const hasRunning = pipelineMissions.some(m => m.status === "running");
    if (!hasRunning) return;

    const interval = setInterval(async () => {
      try {
        const data = await missionPipeline.getAll();
        setPipelineMissions(data);
        const statsData = await missionPipeline.getStats();
        setPipelineStats(statsData);
        if (pipelineSelectedMission && data.find(m => m.id === pipelineSelectedMission.id)?.status === "running") {
          const updated = data.find(m => m.id === pipelineSelectedMission.id);
          if (updated) {
            setPipelineSelectedMission(updated);
            const [p, e] = await Promise.all([
              missionPipeline.getPhases(updated.id),
              missionPipeline.getEvents(updated.id, 100),
            ]);
            setPipelinePhases(p);
            setPipelineEvents(e);
          }
        }
      } catch { /* Silent fail on polling */ }
    }, 5000);
    return () => clearInterval(interval);
  }, [viewMode, pipelineMissions, pipelineSelectedMission]);

  // Filtered pipeline missions
  const filteredPipelineMissions = useMemo(() => {
    if (!pipelineSearch.trim()) return pipelineMissions;
    const q = pipelineSearch.toLowerCase();
    return pipelineMissions.filter(m => m.name.toLowerCase().includes(q) || m.target.toLowerCase().includes(q));
  }, [pipelineMissions, pipelineSearch]);

  // ─── Pipeline Handlers ────────────────────────────────────────────────────

  const handlePipelineCreate = async (startImmediately: boolean) => {
    if (!pipelineCreateData.name.trim() || !pipelineCreateData.target.trim()) {
      toast({ title: "Validation", description: "Name and target are required", variant: "destructive" });
      return;
    }
    try {
      setPipelineCreating(true);
      const scopeLines = pipelineCreateData.scope.split("\n").map(l => l.trim()).filter(Boolean);
      const domains = scopeLines.filter(l => !l.match(/^\d+\.\d+\.\d+\.\d+/));
      const ips = scopeLines.filter(l => l.match(/^\d+\.\d+\.\d+\.\d+/));
      const payload: CreateMissionData = {
        name: pipelineCreateData.name, target: pipelineCreateData.target,
        scope: { domains: domains.length > 0 ? domains : [pipelineCreateData.target], ips: ips.length > 0 ? ips : undefined },
        rules_of_engagement: pipelineCreateData.rules_of_engagement || undefined,
        estimated_duration: pipelineCreateData.estimated_duration || undefined,
        skip_phases: pipelineCreateData.skip_phases.size > 0 ? Array.from(pipelineCreateData.skip_phases) : undefined,
        auto_advance: true,
      };
      const mission = await missionPipeline.create(payload);
      if (startImmediately) {
        await missionPipeline.startMission(mission.id);
        toast({ title: "Mission Started", description: `"${mission.name}" is now running` });
      } else {
        toast({ title: "Mission Created", description: `"${mission.name}" saved as draft` });
      }
      setPipelineCreateOpen(false);
      setPipelineCreateData({ name: "", target: "", scope: "", rules_of_engagement: "", estimated_duration: "", skip_phases: new Set() });
      await loadPipelineMissions();
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to create mission", variant: "destructive" });
    } finally {
      setPipelineCreating(false);
    }
  };

  const handlePipelineStartMission = async (mission: Mission) => {
    try {
      setPipelineActionLoading(`start-${mission.id}`);
      await missionPipeline.startMission(mission.id);
      toast({ title: "Mission Started", description: `"${mission.name}" is now running` });
      await loadPipelineMissions();
      if (pipelineSelectedMission?.id === mission.id) {
        const updated = await missionPipeline.getById(mission.id);
        setPipelineSelectedMission(updated);
      }
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to start mission", variant: "destructive" });
    } finally { setPipelineActionLoading(null); }
  };

  const handlePipelinePauseMission = async (mission: Mission) => {
    try {
      setPipelineActionLoading(`pause-${mission.id}`);
      await missionPipeline.pauseMission(mission.id);
      toast({ title: "Mission Paused", description: `"${mission.name}" paused` });
      await loadPipelineMissions();
      if (pipelineSelectedMission?.id === mission.id) {
        const updated = await missionPipeline.getById(mission.id);
        setPipelineSelectedMission(updated);
      }
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to pause mission", variant: "destructive" });
    } finally { setPipelineActionLoading(null); }
  };

  const handlePipelineResumeMission = async (mission: Mission) => {
    try {
      setPipelineActionLoading(`resume-${mission.id}`);
      await missionPipeline.resumeMission(mission.id);
      toast({ title: "Mission Resumed", description: `"${mission.name}" resumed` });
      await loadPipelineMissions();
      if (pipelineSelectedMission?.id === mission.id) {
        const updated = await missionPipeline.getById(mission.id);
        setPipelineSelectedMission(updated);
      }
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to resume mission", variant: "destructive" });
    } finally { setPipelineActionLoading(null); }
  };

  const handlePipelineAbortMission = async (mission: Mission) => {
    try {
      setPipelineActionLoading(`abort-${mission.id}`);
      await missionPipeline.abortMission(mission.id);
      toast({ title: "Mission Aborted", description: `"${mission.name}" aborted` });
      await loadPipelineMissions();
      if (pipelineSelectedMission?.id === mission.id) {
        const updated = await missionPipeline.getById(mission.id);
        setPipelineSelectedMission(updated);
      }
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to abort mission", variant: "destructive" });
    } finally { setPipelineActionLoading(null); }
  };

  const handlePipelineSkipPhase = async (phaseId: string) => {
    try {
      setPipelineActionLoading(`skip-${phaseId}`);
      await missionPipeline.skipPhase(phaseId);
      toast({ title: "Phase Skipped" });
      if (pipelineSelectedMission) {
        const [p, e] = await Promise.all([
          missionPipeline.getPhases(pipelineSelectedMission.id),
          missionPipeline.getEvents(pipelineSelectedMission.id, 100),
        ]);
        setPipelinePhases(p);
        setPipelineEvents(e);
      }
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to skip phase", variant: "destructive" });
    } finally { setPipelineActionLoading(null); }
  };

  const handlePipelineDeleteMission = async () => {
    if (!pipelineDeleteTarget) return;
    try {
      setPipelineDeleting(true);
      await missionPipeline.delete(pipelineDeleteTarget.id);
      toast({ title: "Mission Deleted", description: `"${pipelineDeleteTarget.name}" removed` });
      if (pipelineSelectedMission?.id === pipelineDeleteTarget.id) setPipelineSelectedMission(null);
      setPipelineDeleteTarget(null);
      await loadPipelineMissions();
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to delete mission", variant: "destructive" });
    } finally { setPipelineDeleting(false); }
  };

  const handlePipelineRefresh = async () => {
    await loadPipelineMissions();
    if (pipelineSelectedMission) {
      const updated = await missionPipeline.getById(pipelineSelectedMission.id);
      setPipelineSelectedMission(updated);
    }
    toast({ title: "Refreshed" });
  };

  // ─── Pipeline Helpers ─────────────────────────────────────────────────────

  const pipelineFormatDuration = (ms?: number): string => {
    if (!ms) return "--";
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${Math.round(ms / 1000)}s`;
    if (ms < 3600000) return `${Math.round(ms / 60000)}m`;
    return `${(ms / 3600000).toFixed(1)}h`;
  };

  const getPipelineMissionDuration = (mission: Mission): string => {
    if (!mission.started_at) return "--";
    const end = mission.completed_at ? new Date(mission.completed_at) : new Date();
    const start = new Date(mission.started_at);
    return pipelineFormatDuration(end.getTime() - start.getTime());
  };

  const getPipelinePhaseConfig = (type: PhaseType) => PHASE_CONFIG[type] || PHASE_CONFIG.recon;
  const getPipelinePhaseColors = (type: PhaseType) => PIPELINE_PHASE_COLORS[type] || PIPELINE_PHASE_COLORS.recon;
  const getPipelinePhaseIcon = (type: PhaseType) => PIPELINE_PHASE_ICONS[type] || PIPELINE_PHASE_ICONS.recon;

  // ─── Helpers ───────────────────────────────────────────────────────────────

  const togglePhase = (idx: number) => {
    setExpandedPhases(prev => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  const getTypeIcon = (type: string) => {
    const config = TYPE_CONFIG[type] || TYPE_CONFIG.pentest;
    const Icon = config.icon;
    return <Icon size={16} className={config.color} />;
  };

  // ════════════════════════════════════════════════════════════════════════════
  // PIPELINE VIEW (self-contained, from Missions.tsx)
  // ════════════════════════════════════════════════════════════════════════════

  const renderPipelineStatsBar = () => (
    <div className="grid grid-cols-5 gap-3">
      {[
        { label: "Total Missions", value: pipelineStats.total, icon: UilRocket, color: "text-zinc-400" },
        { label: "Running", value: pipelineStats.running, icon: UilHeartRate, color: "text-cyan-400" },
        { label: "Completed", value: pipelineStats.completed, icon: UilCheckCircle, color: "text-emerald-400" },
        { label: "Total Findings", value: pipelineStats.total_findings, icon: UilBug, color: "text-orange-400" },
        { label: "Critical", value: pipelineStats.total_critical, icon: UilExclamationTriangle, color: "text-red-400" },
      ].map((stat) => (
        <Card key={stat.label} className="bg-zinc-900/50 border-zinc-800/50">
          <CardContent className="p-3 flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-zinc-800/50 ${stat.color}`}>
              <stat.icon size={18} />
            </div>
            <div>
              <p className="text-xs text-zinc-500">{stat.label}</p>
              <p className={`text-lg font-semibold font-mono ${stat.color}`}>{stat.value}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const renderPipelineMissionCard = (mission: Mission) => {
    const isSelected = pipelineSelectedMission?.id === mission.id;
    const statusBadge = PIPELINE_STATUS_BADGE[mission.status] || PIPELINE_STATUS_BADGE.created;
    const phaseConfig = getPipelinePhaseConfig(mission.current_phase);
    const phaseColors = getPipelinePhaseColors(mission.current_phase);

    return (
      <motion.div key={mission.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>
        <Card
          className={`bg-zinc-900/50 border cursor-pointer transition-all duration-200 hover:border-zinc-600/50 hover:bg-zinc-900/70 ${isSelected ? "border-cyan-500/50 bg-zinc-900/80 shadow-lg shadow-cyan-500/5" : "border-zinc-800/50"}`}
          onClick={() => setPipelineSelectedMission(isSelected ? null : mission)}
        >
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold text-zinc-100 truncate">{mission.name}</h3>
                <div className="flex items-center gap-1.5 mt-1">
                  <UilFocusTarget size={12} className="text-zinc-500 shrink-0" />
                  <span className="text-xs text-zinc-500 font-mono truncate">{mission.target}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge className={`text-[10px] px-1.5 py-0 ${statusBadge.className}`}>{statusBadge.label}</Badge>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-600 hover:text-red-400" onClick={(e) => { e.stopPropagation(); setPipelineDeleteTarget(mission); }}>
                  <UilTrashAlt size={12} />
                </Button>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px]">
                <span className={`${phaseColors.text} font-medium`}>{phaseConfig.label}</span>
                <span className="text-zinc-500 font-mono">{mission.progress}%</span>
              </div>
              <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <motion.div className={`h-full rounded-full bg-gradient-to-r ${phaseColors.gradient}`} initial={{ width: 0 }} animate={{ width: `${mission.progress}%` }} transition={{ duration: 0.5, ease: "easeOut" }} />
              </div>
            </div>
            <div className="flex items-center justify-between text-[10px] text-zinc-500">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1"><UilBug size={10} />{mission.total_findings} findings</span>
                {mission.critical_findings > 0 && (
                  <span className="flex items-center gap-1 text-red-400"><UilExclamationTriangle size={10} />{mission.critical_findings} critical</span>
                )}
              </div>
              <div className="flex items-center gap-1"><UilClock size={10} />{getPipelineMissionDuration(mission)}</div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  const renderPipelineMissionList = () => (
    <div className="space-y-3">
      <div className="relative">
        <UilSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
        <Input placeholder="Search missions..." value={pipelineSearch} onChange={(e) => setPipelineSearch(e.target.value)} className="pl-9 bg-zinc-900/50 border-zinc-800/50 h-9 text-sm" />
      </div>
      <ScrollArea className="h-[calc(100vh-340px)]">
        <div className="space-y-2 pr-2">
          {pipelineLoading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[120px] bg-zinc-800/50 rounded-lg" />)
          ) : filteredPipelineMissions.length === 0 ? (
            <div className="text-center py-12 text-zinc-600">
              <UilRocket size={40} className="mx-auto mb-3 opacity-50" />
              <p className="text-sm">No missions yet</p>
              <p className="text-xs mt-1">Create a mission to start your pipeline</p>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">{filteredPipelineMissions.map(renderPipelineMissionCard)}</AnimatePresence>
          )}
        </div>
      </ScrollArea>
    </div>
  );

  const renderPipelineVisualization = () => {
    if (!pipelineSelectedMission || pipelinePhases.length === 0) return null;
    return (
      <div className="space-y-1">
        <h4 className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-3">Pipeline</h4>
        <div className="flex items-stretch gap-0 overflow-x-auto pb-2">
          {pipelinePhases.map((phase, idx) => {
            const type = phase.phase_type as PhaseType;
            const config = getPipelinePhaseConfig(type);
            const colors = getPipelinePhaseColors(type);
            const PhaseIcon = getPipelinePhaseIcon(type);
            const statusInfo = PIPELINE_PHASE_STATUS_BADGE[phase.status] || PIPELINE_PHASE_STATUS_BADGE.pending;
            const isExpanded = pipelineExpandedPhase === phase.id;
            const isRunning = phase.status === "running";
            const isCompleted = phase.status === "completed";
            const isCurrent = pipelineSelectedMission.current_phase === type;

            return (
              <div key={phase.id} className="flex items-stretch">
                <motion.div
                  className={`relative rounded-lg border p-3 min-w-[140px] max-w-[160px] cursor-pointer transition-all duration-200 select-none ${colors.bg} ${colors.border} ${isCurrent && isRunning ? `shadow-lg ${colors.glow}` : ""} ${isExpanded ? "ring-1 ring-cyan-500/40" : ""} hover:brightness-110`}
                  onClick={() => setPipelineExpandedPhase(isExpanded ? null : phase.id)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {isRunning && (
                    <motion.div className={`absolute inset-0 rounded-lg border ${colors.border} opacity-50`} animate={{ opacity: [0.3, 0.6, 0.3] }} transition={{ duration: 2, repeat: Infinity }} />
                  )}
                  <div className="relative z-10 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-md bg-zinc-900/60 ${colors.text}`}>
                        {isRunning ? <UilSpinner size={14} className="animate-spin" /> : <PhaseIcon size={14} />}
                      </div>
                      <div className="min-w-0">
                        <p className={`text-[11px] font-semibold ${colors.text} truncate`}>{config.label}</p>
                        <p className="text-[9px] text-zinc-600">Phase {config.order}</p>
                      </div>
                    </div>
                    <Badge className={`text-[9px] px-1 py-0 ${statusInfo.className}`}>{statusInfo.label}</Badge>
                    <div className="flex items-center justify-between text-[9px] text-zinc-500">
                      <span className="flex items-center gap-0.5"><UilWrench size={8} />{phase.tools?.length || 0} tools</span>
                      {phase.findings_created > 0 && <span className="flex items-center gap-0.5 text-orange-400"><UilBug size={8} />{phase.findings_created}</span>}
                    </div>
                    {phase.duration_ms && (
                      <div className="text-[9px] text-zinc-600 flex items-center gap-0.5"><UilClock size={8} />{pipelineFormatDuration(phase.duration_ms)}</div>
                    )}
                    {phase.status === "pending" && pipelineSelectedMission.status === "running" && (
                      <Button variant="ghost" size="sm" className="h-5 px-1.5 text-[9px] text-zinc-500 hover:text-yellow-400 mt-1" onClick={(e) => { e.stopPropagation(); handlePipelineSkipPhase(phase.id); }} disabled={pipelineActionLoading === `skip-${phase.id}`}>
                        <UilSkipForwardCircle size={10} className="mr-0.5" />Skip
                      </Button>
                    )}
                  </div>
                </motion.div>
                {idx < pipelinePhases.length - 1 && (
                  <div className="flex items-center px-1">
                    <div className={`h-px w-4 ${isCompleted ? "bg-emerald-500/50" : "bg-zinc-700/50"}`} />
                    <UilArrowRight size={10} className={isCompleted ? "text-emerald-500/50" : "text-zinc-700/50"} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-2 h-1 bg-zinc-800 rounded-full overflow-hidden">
          <motion.div className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-blue-500 via-orange-500 via-red-500 via-purple-500 to-green-500" initial={{ width: 0 }} animate={{ width: `${pipelineSelectedMission.progress}%` }} transition={{ duration: 0.8, ease: "easeOut" }} />
        </div>
      </div>
    );
  };

  const renderPipelinePhaseDetail = () => {
    if (!pipelineExpandedPhase) return null;
    const phase = pipelinePhases.find(p => p.id === pipelineExpandedPhase);
    if (!phase) return null;
    const type = phase.phase_type as PhaseType;
    const config = getPipelinePhaseConfig(type);
    const colors = getPipelinePhaseColors(type);

    return (
      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}>
        <Card className={`bg-zinc-900/50 border ${colors.border} mt-3`}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className={`text-sm ${colors.text} flex items-center gap-2`}>
                {(() => { const I = getPipelinePhaseIcon(type); return <I size={16} />; })()}
                {config.label} Detail
              </CardTitle>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-500" onClick={() => setPipelineExpandedPhase(null)}>
                <UilTimes size={12} />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div>
                <p className="text-zinc-500 mb-0.5">Status</p>
                <Badge className={`text-[10px] ${(PIPELINE_PHASE_STATUS_BADGE[phase.status] || PIPELINE_PHASE_STATUS_BADGE.pending).className}`}>
                  {(PIPELINE_PHASE_STATUS_BADGE[phase.status] || PIPELINE_PHASE_STATUS_BADGE.pending).label}
                </Badge>
              </div>
              <div><p className="text-zinc-500 mb-0.5">Duration</p><p className="text-zinc-300 font-mono">{pipelineFormatDuration(phase.duration_ms)}</p></div>
              <div><p className="text-zinc-500 mb-0.5">Findings</p><p className="text-orange-400 font-mono">{phase.findings_created}</p></div>
              <div><p className="text-zinc-500 mb-0.5">Started</p><p className="text-zinc-300 font-mono text-[10px]">{phase.started_at ? format(new Date(phase.started_at), "HH:mm:ss") : "--"}</p></div>
            </div>
            <Separator className="bg-zinc-800/50" />
            <div>
              <h5 className="text-xs font-medium text-zinc-400 mb-2">Tools</h5>
              <div className="space-y-1.5">
                {(phase.tools || []).map((tool, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-md bg-zinc-800/30 border border-zinc-800/50">
                    <div className="flex items-center gap-2">
                      <UilWrench size={12} className="text-zinc-500" />
                      <span className="text-xs text-zinc-300 font-mono">{tool.tool}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {tool.duration_ms && <span className="text-[10px] text-zinc-600 font-mono">{pipelineFormatDuration(tool.duration_ms)}</span>}
                      <Badge className={`text-[9px] px-1 py-0 ${
                        tool.status === "done" ? "bg-emerald-500/20 text-emerald-400"
                        : tool.status === "running" ? "bg-cyan-500/20 text-cyan-400 animate-pulse"
                        : tool.status === "failed" ? "bg-red-500/20 text-red-400"
                        : "bg-zinc-500/20 text-zinc-500 border border-zinc-600/30"
                      }`}>{tool.status || "pending"}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {phase.error_message && (
              <>
                <Separator className="bg-zinc-800/50" />
                <div className="p-3 rounded-md bg-red-500/5">
                  <div className="flex items-center gap-2 mb-1"><UilTimesCircle size={14} className="text-red-400" /><span className="text-xs font-medium text-red-400">Error</span></div>
                  <p className="text-xs text-red-300/70 font-mono">{phase.error_message}</p>
                </div>
              </>
            )}
            {phase.output && Object.keys(phase.output).length > 0 && (
              <>
                <Separator className="bg-zinc-800/50" />
                <div>
                  <h5 className="text-xs font-medium text-zinc-400 mb-2">Output</h5>
                  <ScrollArea className="h-[120px]">
                    <pre className="text-[10px] text-zinc-500 font-mono bg-zinc-900/50 p-2 rounded-md border border-zinc-800/30 whitespace-pre-wrap">
                      {JSON.stringify(phase.output, null, 2)}
                    </pre>
                  </ScrollArea>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  const renderPipelineMissionControls = () => {
    if (!pipelineSelectedMission) return null;
    const m = pipelineSelectedMission;
    return (
      <div className="flex items-center gap-2">
        {m.status === "created" && (
          <Button size="sm" className="h-7 px-3 text-xs bg-cyan-600 hover:bg-cyan-500 text-black font-semibold" onClick={() => handlePipelineStartMission(m)} disabled={pipelineActionLoading === `start-${m.id}`}>
            {pipelineActionLoading === `start-${m.id}` ? <UilSpinner size={12} className="animate-spin mr-1" /> : <UilPlay size={12} className="mr-1" />}Start
          </Button>
        )}
        {m.status === "running" && (
          <Button size="sm" variant="outline" className="h-7 px-3 text-xs border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10" onClick={() => handlePipelinePauseMission(m)} disabled={pipelineActionLoading === `pause-${m.id}`}>
            <UilPause size={12} className="mr-1" />Pause
          </Button>
        )}
        {m.status === "paused" && (
          <Button size="sm" className="h-7 px-3 text-xs bg-cyan-600 hover:bg-cyan-500 text-black font-semibold" onClick={() => handlePipelineResumeMission(m)} disabled={pipelineActionLoading === `resume-${m.id}`}>
            <UilPlay size={12} className="mr-1" />Resume
          </Button>
        )}
        {(m.status === "running" || m.status === "paused") && (
          <Button size="sm" variant="outline" className="h-7 px-3 text-xs text-red-400 hover:bg-red-500/10" onClick={() => handlePipelineAbortMission(m)} disabled={pipelineActionLoading === `abort-${m.id}`}>
            <UilStopCircle size={12} className="mr-1" />Abort
          </Button>
        )}
        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-zinc-500 hover:text-zinc-300" onClick={handlePipelineRefresh}>
          <UilSync size={12} />
        </Button>
      </div>
    );
  };

  const renderPipelineSummaryStats = () => {
    if (!pipelineSelectedMission) return null;
    const m = pipelineSelectedMission;
    const completedPhases = pipelinePhases.filter(p => p.status === "completed").length;
    const totalPhases = pipelinePhases.length;
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Phases", value: `${completedPhases}/${totalPhases}`, icon: UilTachometerFast, color: "text-blue-400" },
          { label: "Findings", value: m.total_findings, icon: UilBug, color: "text-orange-400" },
          { label: "Critical / High", value: `${m.critical_findings} / ${m.high_findings}`, icon: UilExclamationTriangle, color: "text-red-400" },
          { label: "Duration", value: getPipelineMissionDuration(m), icon: UilClock, color: "text-zinc-400" },
        ].map((stat) => (
          <div key={stat.label} className="flex items-center gap-2 p-2.5 rounded-lg bg-zinc-800/30 border border-zinc-800/50">
            <stat.icon size={14} className={stat.color} />
            <div>
              <p className="text-[10px] text-zinc-500">{stat.label}</p>
              <p className={`text-sm font-semibold font-mono ${stat.color}`}>{stat.value}</p>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderPipelineEventLog = () => {
    if (!pipelineSelectedMission) return null;
    return (
      <div className="space-y-2">
        <h4 className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Event Log</h4>
        <ScrollArea className="h-[240px]">
          <div className="space-y-1 pr-2">
            {pipelineEvents.length === 0 ? (
              <p className="text-xs text-zinc-600 text-center py-6">No events yet</p>
            ) : (
              pipelineEvents.map((event) => {
                const EventIcon = PIPELINE_EVENT_ICONS[event.event_type] || UilInfoCircle;
                const color = PIPELINE_EVENT_COLORS[event.event_type] || "text-zinc-500";
                return (
                  <div key={event.id} className="flex items-start gap-2 p-2 rounded-md hover:bg-zinc-800/30 transition-colors">
                    <div className={`mt-0.5 shrink-0 ${color}`}><EventIcon size={12} /></div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-zinc-300 leading-snug">{event.message}</p>
                      <p className="text-[10px] text-zinc-600 font-mono mt-0.5">{format(new Date(event.created_at), "MMM dd HH:mm:ss")}</p>
                    </div>
                    <Badge className={`text-[8px] px-1 py-0 shrink-0 ${
                      event.event_type.includes("error") ? "bg-red-500/10 text-red-400"
                      : event.event_type.includes("complete") ? "bg-emerald-500/10 text-emerald-400"
                      : "bg-zinc-500/10 text-zinc-500 border border-zinc-600/20"
                    }`}>{event.event_type.replace(/_/g, " ")}</Badge>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </div>
    );
  };

  const renderPipelineDetailView = () => {
    if (!pipelineSelectedMission) {
      return (
        <div className="flex items-center justify-center h-full text-zinc-600">
          <div className="text-center">
            <UilRocket size={48} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">Select a mission to view details</p>
            <p className="text-xs mt-1">Or create a new one to get started</p>
          </div>
        </div>
      );
    }
    const m = pipelineSelectedMission;
    return (
      <div className="space-y-4 h-full">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-zinc-100">{m.name}</h2>
              <Badge className={`text-[10px] ${(PIPELINE_STATUS_BADGE[m.status] || PIPELINE_STATUS_BADGE.created).className}`}>
                {(PIPELINE_STATUS_BADGE[m.status] || PIPELINE_STATUS_BADGE.created).label}
              </Badge>
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500">
              <span className="flex items-center gap-1 font-mono"><UilFocusTarget size={11} />{m.target}</span>
              <span className="flex items-center gap-1"><UilCalendarAlt size={11} />{formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}</span>
              {m.rules_of_engagement && <span className="flex items-center gap-1"><UilShieldCheck size={11} />RoE defined</span>}
            </div>
          </div>
          {renderPipelineMissionControls()}
        </div>
        <Separator className="bg-zinc-800/50" />
        {renderPipelineSummaryStats()}
        {pipelineLoadingDetail ? <Skeleton className="h-[100px] bg-zinc-800/50 rounded-lg" /> : renderPipelineVisualization()}
        <AnimatePresence mode="wait">{renderPipelinePhaseDetail()}</AnimatePresence>
        <Separator className="bg-zinc-800/50" />
        {renderPipelineEventLog()}
      </div>
    );
  };

  const renderPipelineCreateDialog = () => (
    <Dialog open={pipelineCreateOpen} onOpenChange={setPipelineCreateOpen}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-zinc-100 flex items-center gap-2"><UilRocket size={18} className="text-cyan-400" />New Pipeline Mission</DialogTitle>
          <DialogDescription className="text-zinc-500">Configure and launch an automated pentest pipeline</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">Mission Name *</Label>
            <Input placeholder="e.g., Q1 External Pentest" value={pipelineCreateData.name} onChange={(e) => setPipelineCreateData(prev => ({ ...prev, name: e.target.value }))} className="bg-zinc-800/50 border-zinc-700/50 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">UilFocusTarget *</Label>
            <Input placeholder="e.g., example.com" value={pipelineCreateData.target} onChange={(e) => setPipelineCreateData(prev => ({ ...prev, target: e.target.value }))} className="bg-zinc-800/50 border-zinc-700/50 text-sm font-mono" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">Scope (domains/IPs, one per line)</Label>
            <Textarea placeholder={"example.com\napi.example.com\n10.0.0.0/24"} value={pipelineCreateData.scope} onChange={(e) => setPipelineCreateData(prev => ({ ...prev, scope: e.target.value }))} className="bg-zinc-800/50 border-zinc-700/50 text-sm font-mono h-20 resize-none" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">Rules of Engagement</Label>
            <Textarea placeholder="e.g., No DoS, no social engineering, testing window: 09:00-17:00 UTC" value={pipelineCreateData.rules_of_engagement} onChange={(e) => setPipelineCreateData(prev => ({ ...prev, rules_of_engagement: e.target.value }))} className="bg-zinc-800/50 border-zinc-700/50 text-sm h-16 resize-none" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">Estimated Duration</Label>
            <Input placeholder="e.g., 2h, 30m, 1d" value={pipelineCreateData.estimated_duration} onChange={(e) => setPipelineCreateData(prev => ({ ...prev, estimated_duration: e.target.value }))} className="bg-zinc-800/50 border-zinc-700/50 text-sm w-32" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-zinc-400">Phases to include</Label>
            <div className="grid grid-cols-2 gap-2">
              {PIPELINE_PHASE_ORDER.map((phase) => {
                const config = PHASE_CONFIG[phase];
                const colors = getPipelinePhaseColors(phase);
                const PhaseIcon = getPipelinePhaseIcon(phase);
                const isSkipped = pipelineCreateData.skip_phases.has(phase);
                return (
                  <div key={phase} className={`flex items-center gap-2 p-2 rounded-md border cursor-pointer transition-all ${isSkipped ? "bg-zinc-800/20 border-zinc-800/30 opacity-50" : `${colors.bg} ${colors.border}`}`}
                    onClick={() => { setPipelineCreateData(prev => { const next = new Set(prev.skip_phases); if (next.has(phase)) next.delete(phase); else next.add(phase); return { ...prev, skip_phases: next }; }); }}>
                    <Checkbox checked={!isSkipped} className="border-zinc-600 data-[state=checked]:bg-cyan-600 data-[state=checked]:border-cyan-600" />
                    <PhaseIcon size={14} className={isSkipped ? "text-zinc-600" : colors.text} />
                    <span className={`text-xs font-medium ${isSkipped ? "text-zinc-600" : colors.text}`}>{config.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" className="border-zinc-700/50 text-zinc-400 hover:text-zinc-300 text-xs" onClick={() => handlePipelineCreate(false)} disabled={pipelineCreating}>
            {pipelineCreating ? <UilSpinner size={12} className="animate-spin mr-1" /> : <UilFileAlt size={12} className="mr-1" />}Create as Draft
          </Button>
          <Button className="bg-cyan-600 hover:bg-cyan-500 text-black font-semibold text-xs" onClick={() => handlePipelineCreate(true)} disabled={pipelineCreating}>
            {pipelineCreating ? <UilSpinner size={12} className="animate-spin mr-1" /> : <UilRocket size={12} className="mr-1" />}Create & Start
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  const renderPipelineDeleteDialog = () => (
    <Dialog open={!!pipelineDeleteTarget} onOpenChange={(open) => !open && setPipelineDeleteTarget(null)}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-zinc-100 flex items-center gap-2"><UilExclamationTriangle size={18} className="text-red-400" />Delete Mission</DialogTitle>
          <DialogDescription className="text-zinc-500">
            This will permanently delete <span className="text-zinc-300 font-medium">"{pipelineDeleteTarget?.name}"</span> and all its phases, events, and logs.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button variant="outline" className="border-zinc-700/50 text-zinc-400 text-xs" onClick={() => setPipelineDeleteTarget(null)} disabled={pipelineDeleting}>Cancel</Button>
          <Button className="bg-red-600 hover:bg-red-500 text-white font-semibold text-xs" onClick={handlePipelineDeleteMission} disabled={pipelineDeleting}>
            {pipelineDeleting ? <UilSpinner size={12} className="animate-spin mr-1" /> : <UilTrashAlt size={12} className="mr-1" />}Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  const renderPipelineView = () => (
    <div className="h-full bg-background p-4 space-y-4 overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <UilRocket size={22} className="text-cyan-400" />
            <h1 className="text-lg font-bold text-zinc-100">Pipeline</h1>
          </div>
          <p className="text-xs text-zinc-500 mt-0.5 ml-[30px]">Automated pentest pipeline — recon to report</p>
        </div>
        <div className="flex items-center gap-3">
          {/* View toggle */}
          <div className="flex items-center bg-zinc-900 rounded-lg p-0.5 border border-zinc-800/50">
            <button onClick={() => setViewMode('kanban')} className="flex items-center gap-1 px-2.5 py-1 rounded text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
              <UilColumns size={12} />Board
            </button>
            <button onClick={() => setViewMode('list')} className="flex items-center gap-1 px-2.5 py-1 rounded text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
              <UilListUl size={12} />List
            </button>
            <button className="flex items-center gap-1 px-2.5 py-1 rounded text-xs bg-zinc-800 text-zinc-200 transition-colors">
              <UilRocket size={12} />Pipeline
            </button>
          </div>
          <Button variant="ghost" size="sm" className="h-8 px-2 text-xs text-zinc-500 hover:text-zinc-300" onClick={handlePipelineRefresh}>
            <UilSync size={14} />
          </Button>
          <Button size="sm" className="h-8 px-3 text-xs bg-cyan-600 hover:bg-cyan-500 text-black font-semibold" onClick={() => setPipelineCreateOpen(true)}>
            <UilPlus size={14} className="mr-1" />New Mission
          </Button>
        </div>
      </div>
      {/* Preview Banner */}
      <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-400 flex items-center gap-2">
        <UilHardHat size={16} />
        <span>Mission Pipeline is in preview — tool execution is simulated. Connect MCP scanning tools for live results.</span>
      </div>
      {/* Stats */}
      {renderPipelineStatsBar()}
      {/* Main content: list + detail */}
      <div className="grid grid-cols-12 gap-4 h-[calc(100vh-240px)]">
        <div className="col-span-4 xl:col-span-3">{renderPipelineMissionList()}</div>
        <div className="col-span-8 xl:col-span-9">
          <Card className="bg-zinc-900/30 border-zinc-800/50 h-full">
            <CardContent className="p-4 h-full overflow-y-auto">{renderPipelineDetailView()}</CardContent>
          </Card>
        </div>
      </div>
      {/* Dialogs */}
      {renderPipelineCreateDialog()}
      {renderPipelineDeleteDialog()}
    </div>
  );

  // ════════════════════════════════════════════════════════════════════════════
  // DETAIL VIEW
  // ════════════════════════════════════════════════════════════════════════════
  if (selectedPlan) {
    const plan = selectedPlan;
    const assessment = plan.ai_assessment;
    const phases = Array.isArray(plan.phases) ? plan.phases : [];
    const risks = Array.isArray(plan.risks) ? plan.risks : [];
    const criteria = Array.isArray(plan.success_criteria) ? plan.success_criteria : [];
    const statusConf = getStatusConfig(plan.status);

    return (
      <div className="space-y-6 p-6 max-w-5xl">
        {/* Back + Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => { setSelectedPlan(null); setExpandedPhases(new Set()); }}>
            <UilArrowLeft size={16} className="mr-1" />
            Back
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              {getTypeIcon(plan.type)}
              <h1 className="text-2xl font-bold text-white">{plan.name}</h1>
              <span className={`flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full ${statusConf.bgColor} ${statusConf.color}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${statusConf.dotColor}`} />
                {statusConf.label}
              </span>
            </div>
            <p className="text-sm text-zinc-500 mt-1">{TYPE_CONFIG[plan.type]?.label || plan.type} &middot; Created {new Date(plan.created_at).toLocaleDateString()}</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={plan.status} onValueChange={(v) => handleStatusChange(plan.id, v)}>
              <SelectTrigger className="w-[140px] h-8 text-xs bg-transparent">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALL_STATUSES.map(s => {
                  const c = getStatusConfig(s);
                  return (
                    <SelectItem key={s} value={s} className="text-xs">
                      <span className="flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${c.dotColor}`} />
                        {c.label}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-400 hover:bg-white/[0.03]" onClick={() => handleDeletePlan(plan.id)}>
              <UilTrashAlt size={14} />
            </Button>
            {/* Launch Pipeline from plan */}
            {linkedMissions[plan.id]?.length ? (
              <Button
                variant="outline"
                size="sm"
                className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 text-xs"
                onClick={() => {
                  const m = linkedMissions[plan.id][0];
                  setPipelineSelectedMission(m);
                  setViewMode('pipeline');
                }}
              >
                <UilRocket size={14} className="mr-1" />
                View Pipeline ({linkedMissions[plan.id][0].status})
              </Button>
            ) : (
              <Button
                size="sm"
                className="bg-cyan-600 hover:bg-cyan-500 text-black font-semibold text-xs"
                onClick={() => handleLaunchPipeline(plan, true)}
                disabled={launchingPipeline === plan.id}
              >
                {launchingPipeline === plan.id ? <UilSpinner size={14} className="animate-spin mr-1" /> : <UilRocket size={14} className="mr-1" />}
                Launch Pipeline
              </Button>
            )}
          </div>
        </div>

        {/* Linked Pipeline Status */}
        {linkedMissions[plan.id]?.length > 0 && (() => {
          const m = linkedMissions[plan.id][0];
          return (
            <div className={`flex items-center gap-3 p-3 rounded-lg border ${
              m.status === 'running' ? 'border-cyan-500/30 bg-cyan-500/5' :
              m.status === 'completed' ? 'border-emerald-500/30 bg-emerald-500/5' :
              m.status === 'failed' ? 'border-red-500/30 bg-red-500/5' :
              'border-zinc-800/50 bg-zinc-900/30'
            }`}>
              <UilRocket size={16} className={
                m.status === 'running' ? 'text-cyan-400' :
                m.status === 'completed' ? 'text-emerald-400' :
                m.status === 'failed' ? 'text-red-400' : 'text-zinc-400'
              } />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-zinc-200">Pipeline: {m.name}</span>
                  <Badge className={`text-[9px] px-1.5 py-0 ${
                    m.status === 'running' ? 'bg-cyan-500/20 text-cyan-400' :
                    m.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' :
                    m.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                    m.status === 'created' ? 'bg-zinc-500/20 text-zinc-400' :
                    'bg-yellow-500/20 text-yellow-400'
                  }`}>{m.status}</Badge>
                </div>
                <div className="flex items-center gap-4 text-[10px] text-zinc-500 mt-1">
                  <span>{m.progress}% complete</span>
                  <span>{m.total_findings} findings</span>
                  {m.critical_findings > 0 && <span className="text-red-400">{m.critical_findings} critical</span>}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-zinc-400 hover:text-zinc-200"
                onClick={() => { setPipelineSelectedMission(m); setViewMode('pipeline'); }}
              >
                <UilEye size={12} className="mr-1" />View
              </Button>
            </div>
          );
        })()}

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
              <span className="text-xs text-zinc-500">UilFocusTarget Scope</span>
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

        {/* Status Pipeline */}
        <div className="rounded-lg bg-transparent p-4">
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Pipeline</h2>
          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            {KANBAN_COLUMNS.filter(s => !['paused', 'failed'].includes(s)).map((s, i, arr) => {
              const c = getStatusConfig(s);
              const isCurrent = plan.status === s;
              const isPast = KANBAN_COLUMNS.indexOf(plan.status) > KANBAN_COLUMNS.indexOf(s);
              return (
                <div key={s} className="flex items-center gap-1">
                  <button
                    onClick={() => handleStatusChange(plan.id, s)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium transition-all whitespace-nowrap ${
                      isCurrent
                        ? `${c.bgColor} ${c.color} ring-1 ring-current/30`
                        : isPast
                          ? `${c.bgColor} ${c.color} opacity-50`
                          : 'bg-zinc-900 text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800'
                    }`}
                  >
                    {isPast && <UilCheckCircle size={10} />}
                    {c.label}
                  </button>
                  {i < arr.length - 1 && <UilArrowRight size={10} className="text-zinc-700 shrink-0" />}
                </div>
              );
            })}
          </div>
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
              {modifying === mod ? <UilSpinner size={12} className="animate-spin mr-1" /> : <UilRobot size={12} className="mr-1" />}
              {mod.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
            </Button>
          ))}
        </div>

        {/* Phases */}
        {phases.length > 0 && (
          <div className="rounded-lg bg-transparent p-5 space-y-3">
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
              <UilSitemap size={14} />
              Phases ({phases.length})
            </h2>
            <div className="space-y-2">
              {phases.map((phase: any, idx: number) => {
                const isOpen = expandedPhases.has(idx);
                const tasks = Array.isArray(phase.tasks) ? phase.tasks : [];
                const tools = Array.isArray(phase.tools) ? phase.tools : [];
                return (
                  <div key={idx} className="rounded bg-white/[0.03]">
                    <button
                      className="w-full flex items-center gap-2 p-3 text-left hover:bg-white/[0.05] transition-colors"
                      onClick={() => togglePhase(idx)}
                    >
                      {isOpen ? <UilAngleDown size={12} className="text-zinc-500" /> : <UilAngleRight size={12} className="text-zinc-500" />}
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
                                  <span key={ti} className="text-xs text-zinc-400 px-1.5 py-0.5 rounded bg-zinc-800/50">{tool}</span>
                                ))}
                              </div>
                            )}
                            {tasks.length > 0 && (
                              <div className="space-y-1 mt-1">
                                {tasks.map((task: any, ti: number) => (
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
              <UilExclamationTriangle size={14} />
              Risks ({risks.length})
            </h2>
            <div className="space-y-2">
              {risks.map((risk: any, idx: number) => (
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
              <UilCheckCircle size={14} />
              Success Criteria
            </h2>
            <ul className="space-y-1">
              {criteria.map((c: any, idx: number) => (
                <li key={idx} className="text-sm text-zinc-300 flex items-start gap-2">
                  <UilCrosshair size={12} className="text-emerald-500 mt-1 shrink-0" />
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
              <UilBrain size={14} />
              AI Assessment
            </h2>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <span className="text-xs text-zinc-500">Feasibility</span>
                <div className="flex items-center gap-2 mt-1">
                  <UilTachometerFast size={14} className="text-blue-500" />
                  <span className="text-lg font-bold text-white">{assessment.feasibilityScore}</span>
                  <span className="text-xs text-zinc-500">/ 100</span>
                </div>
              </div>
              <div>
                <span className="text-xs text-zinc-500">Risk Score</span>
                <div className="flex items-center gap-2 mt-1">
                  <UilExclamationTriangle size={14} className="text-amber-500" />
                  <span className="text-lg font-bold text-white">{assessment.riskScore}</span>
                  <span className="text-xs text-zinc-500">/ 100</span>
                </div>
              </div>
              <div>
                <span className="text-xs text-zinc-500">Success Probability</span>
                <div className="flex items-center gap-2 mt-1">
                  <UilShieldCheck size={14} className="text-emerald-500" />
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
                      <UilBolt size={10} className="text-violet-500 mt-0.5 shrink-0" />
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

  // ════════════════════════════════════════════════════════════════════════════
  // PIPELINE VIEW (full-screen)
  // ════════════════════════════════════════════════════════════════════════════
  if (viewMode === 'pipeline') {
    return renderPipelineView();
  }

  // ════════════════════════════════════════════════════════════════════════════
  // LIST / KANBAN VIEW
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-6 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <UilFocusTarget size={28} className="text-primary" />
            Missions
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Drag missions between columns to update status
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setAiDialogOpen(true)}
            className="border-violet-500/30 hover:bg-violet-500/10 text-violet-400"
          >
            <UilBrain size={16} className="mr-2" />
            AI Generate
          </Button>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary/20 hover:bg-primary/30 ring-1 ring-primary/20">
                <UilPlus size={16} className="mr-2" />
                New Mission
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create Mission</DialogTitle>
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
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select value={newPlan.type} onValueChange={(v) => setNewPlan({ ...newPlan, type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bug_bounty">UilBug Bounty</SelectItem>
                        <SelectItem value="offensive">Offensive (Red Team)</SelectItem>
                        <SelectItem value="defensive">Defensive (Blue Team)</SelectItem>
                        <SelectItem value="pentest">Penetration Test</SelectItem>
                        <SelectItem value="incident_response">Incident Response</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Initial Status</Label>
                    <Select value={newPlan.status} onValueChange={(v) => setNewPlan({ ...newPlan, status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ALL_STATUSES.map(s => {
                          const c = getStatusConfig(s);
                          return (
                            <SelectItem key={s} value={s} className="text-xs">
                              <span className="flex items-center gap-2">
                                <span className={`w-1.5 h-1.5 rounded-full ${c.dotColor}`} />
                                {c.label}
                              </span>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
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
                  <Label>UilFocusTarget Scope</Label>
                  <Input
                    value={newPlan.target_scope}
                    onChange={(e) => setNewPlan({ ...newPlan, target_scope: e.target.value })}
                    placeholder="IP ranges, domains, systems..."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleCreatePlan}>Create Mission</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats + Controls */}
      <div className="flex items-center justify-between px-6 pb-4">
        <div className="flex items-center gap-5 text-xs">
          <div>
            <span className="text-zinc-500">Total</span>
            <p className="text-lg font-bold text-white">{stats.total}</p>
          </div>
          <Separator orientation="vertical" className="h-8" />
          <div>
            <span className="text-zinc-500">Active</span>
            <p className="text-lg font-bold text-amber-400">{stats.active}</p>
          </div>
          <Separator orientation="vertical" className="h-8" />
          <div>
            <span className="text-zinc-500">Submitted</span>
            <p className="text-lg font-bold text-indigo-400">{stats.submitted}</p>
          </div>
          <Separator orientation="vertical" className="h-8" />
          <div>
            <span className="text-zinc-500">Completed</span>
            <p className="text-lg font-bold text-emerald-400">{stats.completed}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <UilSearch size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-600" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search missions..."
              className="w-[200px] h-8 text-xs pl-8 bg-transparent border-zinc-800"
            />
          </div>
          {/* View toggle */}
          <div className="flex items-center bg-zinc-900 rounded-lg p-0.5 border border-zinc-800/50">
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs transition-colors ${
                viewMode === 'kanban' ? 'bg-zinc-800 text-zinc-200' : 'text-zinc-600 hover:text-zinc-400'
              }`}
            >
              <UilColumns size={12} />
              Board
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs transition-colors ${
                viewMode === 'list' ? 'bg-zinc-800 text-zinc-200' : 'text-zinc-600 hover:text-zinc-400'
              }`}
            >
              <UilListUl size={12} />
              List
            </button>
            <button
              onClick={() => setViewMode('pipeline')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs transition-colors ${
                viewMode === 'pipeline' ? 'bg-zinc-800 text-zinc-200' : 'text-zinc-600 hover:text-zinc-400'
              }`}
            >
              <UilRocket size={12} />
              Pipeline
            </button>
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <UilSpinner size={24} className="animate-spin text-zinc-500" />
        </div>
      )}

      {/* ─── KANBAN VIEW ──────────────────────────────────────────── */}
      {!loading && viewMode === 'kanban' && (
        <div className="flex-1 overflow-x-auto overflow-y-hidden px-4 pb-4">
          <div className="flex gap-3 h-full" style={{ minHeight: '300px' }}>
            {KANBAN_COLUMNS.map((status) => (
              <KanbanColumn
                key={status}
                status={status}
                plans={plansByStatus[status] || []}
                onSelect={setSelectedPlan}
                onDelete={handleDeletePlan}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDrop={(e) => handleDrop(e, status)}
                isDragOver={dragOverColumn === status}
                onDragOver={(e) => handleDragOver(e, status)}
                onDragLeave={handleDragLeave}
                linkedMissions={linkedMissions}
                onLaunchPipeline={handleLaunchPipeline}
                launchingPipeline={launchingPipeline}
              />
            ))}
          </div>
        </div>
      )}

      {/* ─── LIST VIEW ────────────────────────────────────────────── */}
      {!loading && viewMode === 'list' && (
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {filteredPlans.length > 0 ? (
            <div className="space-y-2">
              {filteredPlans.map((plan) => {
                const phases = Array.isArray(plan.phases) ? plan.phases : [];
                const statusConf = getStatusConfig(plan.status);
                const StatusIcon = statusConf.icon;
                return (
                  <motion.div
                    key={plan.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-lg bg-transparent p-4 cursor-pointer hover:bg-zinc-900/70 transition-colors border border-transparent hover:border-zinc-800/50"
                    onClick={() => setSelectedPlan(plan)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        {getTypeIcon(plan.type)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <h3 className="font-semibold text-white truncate">{plan.name}</h3>
                            <span className={`flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-full shrink-0 ${statusConf.bgColor} ${statusConf.color}`}>
                              <StatusIcon size={10} />
                              {statusConf.label}
                            </span>
                          </div>
                          {plan.objective && (
                            <p className="text-sm text-zinc-500 truncate">{plan.objective}</p>
                          )}
                          <div className="flex items-center gap-4 mt-1.5 text-xs text-zinc-600">
                            <span className="flex items-center gap-1">
                              <UilCalendarAlt size={11} />
                              {new Date(plan.created_at).toLocaleDateString()}
                            </span>
                            {plan.target_scope && (
                              <span className="flex items-center gap-1 truncate max-w-[200px]">
                                <UilCrosshair size={11} />
                                {plan.target_scope}
                              </span>
                            )}
                            {phases.length > 0 && (
                              <span className="flex items-center gap-1">
                                <UilSitemap size={11} />
                                {phases.length} phases
                              </span>
                            )}
                            {plan.ai_assessment && (
                              <span className="flex items-center gap-1 text-violet-500/70">
                                <UilBrain size={11} />
                                AI
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 ml-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setSelectedPlan(plan)}>
                          <UilEye size={13} className="text-zinc-500" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-red-500/60 hover:text-red-400 hover:bg-white/[0.03]"
                          onClick={() => handleDeletePlan(plan.id)}
                        >
                          <UilTrashAlt size={13} />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20">
              <UilFocusTarget size={48} className="text-zinc-700 mb-3" />
              <h3 className="text-base font-semibold text-zinc-400 mb-1">No Missions</h3>
              <p className="text-sm text-zinc-600 text-center mb-4">
                Create a mission manually or use AI to generate one
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setAiDialogOpen(true)}>
                  <UilBrain size={14} className="mr-1" />
                  AI Generate
                </Button>
                <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
                  <UilPlus size={14} className="mr-1" />
                  New Mission
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty kanban */}
      {!loading && viewMode === 'kanban' && plans.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center pointer-events-auto">
            <UilFocusTarget size={48} className="text-zinc-700 mb-3 mx-auto" />
            <h3 className="text-base font-semibold text-zinc-400 mb-1">No Missions Yet</h3>
            <p className="text-sm text-zinc-600 mb-4">Create your first mission to start the board</p>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" size="sm" onClick={() => setAiDialogOpen(true)}>
                <UilBrain size={14} className="mr-1" />
                AI Generate
              </Button>
              <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
                <UilPlus size={14} className="mr-1" />
                New Mission
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* AI Generate Dialog */}
      <Dialog open={aiDialogOpen} onOpenChange={(open) => { setAiDialogOpen(open); if (!open) { setAiPreview(null); setAiGenerating(false); } }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UilBrain size={20} className="text-violet-500" />
              AI Mission Planner
            </DialogTitle>
            <DialogDescription>
              Describe your objective and the AI will generate a full tactical plan
            </DialogDescription>
          </DialogHeader>

          {!aiPreview ? (
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
                      <SelectItem value="bug_bounty">UilBug Bounty</SelectItem>
                      <SelectItem value="offensive">Offensive</SelectItem>
                      <SelectItem value="defensive">Defensive</SelectItem>
                      <SelectItem value="pentest">Penetration Test</SelectItem>
                      <SelectItem value="incident_response">Incident Response</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>UilFocusTarget Scope</Label>
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
                      <UilSpinner size={14} className="animate-spin mr-2" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <UilRobot size={14} className="mr-2" />
                      Generate Plan
                    </>
                  )}
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="rounded-lg bg-transparent p-4 space-y-2">
                <h3 className="text-base font-semibold text-white">{aiPreview.name}</h3>
                <p className="text-sm text-zinc-400">{aiPreview.objective}</p>
                {aiPreview.strategy && <p className="text-xs text-zinc-500">{aiPreview.strategy}</p>}
              </div>

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
                  <UilSync size={14} className="mr-1" />
                  Regenerate
                </Button>
                <Button onClick={handleAcceptAiPlan} className="bg-emerald-600 hover:bg-emerald-700">
                  <UilCheckCircle size={14} className="mr-1" />
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
