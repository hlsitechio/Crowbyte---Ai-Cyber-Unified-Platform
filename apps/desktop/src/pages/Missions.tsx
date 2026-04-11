/**
 * Missions Page — Automated Pentest Pipeline
 * Phase 5 of the Cybersecurity Gaps Integration Plan.
 * Full pipeline visualization: RECON -> ENUMERATE -> VULN_SCAN -> EXPLOIT -> POST_EXPLOIT -> REPORT.
 * Each phase auto-feeds the next. Findings flow into the Findings Engine.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
  missionPipeline,
  type Mission, type MissionPhase, type MissionEvent, type MissionStatus,
  type PhaseType, type CreateMissionData,
  PHASE_CONFIG,
} from "@/services/mission-pipeline";
import { UilRocket, UilPlus, UilPlay, UilSearch, UilSitemap, UilBug, UilCrosshair, UilAward, UilFileAlt, UilBolt, UilFocusTarget, UilClock, UilCheckCircle, UilTimesCircle, UilExclamationTriangle, UilArrowRight, UilAngleRight, UilAngleDown, UilTrashAlt, UilEye, UilHeartRate, UilShieldCheck, UilTachometerFast, UilWrench, UilCalendarAlt, UilSync, UilTimes, UilSpinner, UilInfoCircle, UilHardHat, UilPause, UilStopCircle, UilSkipForwardCircle } from "@iconscout/react-unicons";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow, format } from "date-fns";

// ─── Constants ─────────────────────────────────────────────────────────────────

const PHASE_ORDER: PhaseType[] = [
  "recon", "enumerate", "vuln_scan", "exploit", "post_exploit", "report",
];

const PHASE_ICONS: Record<PhaseType, React.ComponentType<any>> = {
  recon: UilSearch,
  enumerate: UilSitemap,
  vuln_scan: UilBug,
  exploit: UilCrosshair,
  post_exploit: UilAward,
  report: UilFileAlt,
};

const PHASE_COLORS: Record<PhaseType, {
  bg: string; text: string; border: string; glow: string; gradient: string;
}> = {
  recon: {
    bg: "bg-cyan-500/10",
    text: "text-cyan-400",
    border: "border-cyan-500/30",
    glow: "shadow-cyan-500/20",
    gradient: "from-cyan-500 to-cyan-400",
  },
  enumerate: {
    bg: "bg-blue-500/10",
    text: "text-blue-400",
    border: "border-blue-500/30",
    glow: "shadow-blue-500/20",
    gradient: "from-blue-500 to-blue-400",
  },
  vuln_scan: {
    bg: "bg-orange-500/10",
    text: "text-orange-400",
    border: "border-orange-500/30",
    glow: "shadow-orange-500/20",
    gradient: "from-orange-500 to-orange-400",
  },
  exploit: {
    bg: "bg-red-500/10",
    text: "text-red-400",
    border: "border-red-500/30",
    glow: "shadow-red-500/20",
    gradient: "from-red-500 to-red-400",
  },
  post_exploit: {
    bg: "bg-purple-500/10",
    text: "text-purple-400",
    border: "border-purple-500/30",
    glow: "shadow-purple-500/20",
    gradient: "from-purple-500 to-purple-400",
  },
  report: {
    bg: "bg-green-500/10",
    text: "text-green-400",
    border: "border-green-500/30",
    glow: "shadow-green-500/20",
    gradient: "from-green-500 to-green-400",
  },
};

const STATUS_BADGE: Record<MissionStatus, { className: string; label: string }> = {
  created: {
    className: "bg-zinc-500/20 text-zinc-400",
    label: "Created",
  },
  running: {
    className: "bg-cyan-500/20 text-cyan-400 animate-pulse",
    label: "Running",
  },
  paused: {
    className: "bg-yellow-500/20 text-yellow-400",
    label: "Paused",
  },
  completed: {
    className: "bg-emerald-500/20 text-emerald-400",
    label: "Completed",
  },
  failed: {
    className: "bg-red-500/20 text-red-400",
    label: "Failed",
  },
  aborted: {
    className: "bg-zinc-500/20 text-zinc-500 border border-zinc-600/30",
    label: "Aborted",
  },
};

const PHASE_STATUS_BADGE: Record<string, { className: string; label: string }> = {
  pending: {
    className: "bg-zinc-500/20 text-zinc-500 border border-zinc-600/30",
    label: "Pending",
  },
  running: {
    className: "bg-cyan-500/20 text-cyan-400 animate-pulse",
    label: "Running",
  },
  completed: {
    className: "bg-emerald-500/20 text-emerald-400",
    label: "Completed",
  },
  failed: {
    className: "bg-red-500/20 text-red-400",
    label: "Failed",
  },
  skipped: {
    className: "bg-zinc-500/20 text-zinc-600 border border-zinc-700/30",
    label: "Skipped",
  },
};

const EVENT_ICONS: Record<string, React.ComponentType<any>> = {
  mission_created: UilRocket,
  mission_started: UilPlay,
  mission_paused: UilPause,
  mission_resumed: UilPlay,
  mission_completed: UilCheckCircle,
  mission_aborted: UilStopCircle,
  phase_start: UilBolt,
  phase_complete: UilCheckCircle,
  phase_skipped: UilSkipForwardCircle,
  report_generated: UilFileAlt,
  error: UilTimesCircle,
};

const EVENT_COLORS: Record<string, string> = {
  mission_created: "text-zinc-400",
  mission_started: "text-cyan-400",
  mission_paused: "text-yellow-400",
  mission_resumed: "text-cyan-400",
  mission_completed: "text-emerald-400",
  mission_aborted: "text-zinc-500",
  phase_start: "text-blue-400",
  phase_complete: "text-emerald-400",
  phase_skipped: "text-zinc-500",
  report_generated: "text-green-400",
  error: "text-red-400",
};

// ─── Component ─────────────────────────────────────────────────────────────────

export default function Missions() {
  const { toast } = useToast();

  // ─── State ─────────────────────────────────────────────────────────────────

  // Data
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null);
  const [phases, setPhases] = useState<MissionPhase[]>([]);
  const [events, setEvents] = useState<MissionEvent[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    total: 0, running: 0, completed: 0, total_findings: 0, total_critical: 0,
  });

  // Search
  const [search, setSearch] = useState("");

  // Expanded phase
  const [expandedPhase, setExpandedPhase] = useState<string | null>(null);

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [createData, setCreateData] = useState<{
    name: string;
    target: string;
    scope: string;
    rules_of_engagement: string;
    estimated_duration: string;
    skip_phases: Set<PhaseType>;
  }>({
    name: "",
    target: "",
    scope: "",
    rules_of_engagement: "",
    estimated_duration: "",
    skip_phases: new Set(),
  });
  const [creating, setCreating] = useState(false);

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<Mission | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Action loading
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // ─── Data Loading ──────────────────────────────────────────────────────────

  const loadMissions = useCallback(async () => {
    try {
      setLoading(true);
      const [data, statsData] = await Promise.all([
        missionPipeline.getAll(),
        missionPipeline.getStats(),
      ]);
      setMissions(data);
      setStats(statsData);
    } catch (err) {
      console.error("Failed to load missions:", err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to load missions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const loadMissionDetail = useCallback(async (mission: Mission) => {
    try {
      setLoadingDetail(true);
      const [phasesData, eventsData] = await Promise.all([
        missionPipeline.getPhases(mission.id),
        missionPipeline.getEvents(mission.id, 100),
      ]);
      setPhases(phasesData);
      setEvents(eventsData);
    } catch (err) {
      console.error("Failed to load mission detail:", err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to load mission details",
        variant: "destructive",
      });
    } finally {
      setLoadingDetail(false);
    }
  }, [toast]);

  useEffect(() => {
    loadMissions();
  }, [loadMissions]);

  // Load detail when mission selected
  useEffect(() => {
    if (selectedMission) {
      loadMissionDetail(selectedMission);
    } else {
      setPhases([]);
      setEvents([]);
      setExpandedPhase(null);
    }
  }, [selectedMission, loadMissionDetail]);

  // Polling for running missions
  useEffect(() => {
    const hasRunning = missions.some(m => m.status === "running");
    if (!hasRunning) return;

    const interval = setInterval(async () => {
      try {
        const data = await missionPipeline.getAll();
        setMissions(data);
        const statsData = await missionPipeline.getStats();
        setStats(statsData);

        // Refresh selected mission if it's running
        if (selectedMission && data.find(m => m.id === selectedMission.id)?.status === "running") {
          const updated = data.find(m => m.id === selectedMission.id);
          if (updated) {
            setSelectedMission(updated);
            const [p, e] = await Promise.all([
              missionPipeline.getPhases(updated.id),
              missionPipeline.getEvents(updated.id, 100),
            ]);
            setPhases(p);
            setEvents(e);
          }
        }
      } catch {
        // Silent fail on polling
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [missions, selectedMission]);

  // ─── Filtered Missions ─────────────────────────────────────────────────────

  const filteredMissions = useMemo(() => {
    if (!search.trim()) return missions;
    const q = search.toLowerCase();
    return missions.filter(
      m => m.name.toLowerCase().includes(q) || m.target.toLowerCase().includes(q)
    );
  }, [missions, search]);

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleCreate = async (startImmediately: boolean) => {
    if (!createData.name.trim() || !createData.target.trim()) {
      toast({ title: "Validation", description: "Name and target are required", variant: "destructive" });
      return;
    }

    try {
      setCreating(true);

      // Parse scope textarea into domains/IPs
      const scopeLines = createData.scope
        .split("\n")
        .map(l => l.trim())
        .filter(Boolean);

      const domains = scopeLines.filter(l => !l.match(/^\d+\.\d+\.\d+\.\d+/));
      const ips = scopeLines.filter(l => l.match(/^\d+\.\d+\.\d+\.\d+/));

      const payload: CreateMissionData = {
        name: createData.name,
        target: createData.target,
        scope: {
          domains: domains.length > 0 ? domains : [createData.target],
          ips: ips.length > 0 ? ips : undefined,
        },
        rules_of_engagement: createData.rules_of_engagement || undefined,
        estimated_duration: createData.estimated_duration || undefined,
        skip_phases: createData.skip_phases.size > 0
          ? Array.from(createData.skip_phases)
          : undefined,
        auto_advance: true,
      };

      const mission = await missionPipeline.create(payload);

      if (startImmediately) {
        await missionPipeline.startMission(mission.id);
        toast({ title: "Mission Started", description: `"${mission.name}" is now running` });
      } else {
        toast({ title: "Mission Created", description: `"${mission.name}" saved as draft` });
      }

      setCreateOpen(false);
      setCreateData({
        name: "", target: "", scope: "", rules_of_engagement: "",
        estimated_duration: "", skip_phases: new Set(),
      });
      await loadMissions();
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to create mission",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleStartMission = async (mission: Mission) => {
    try {
      setActionLoading(`start-${mission.id}`);
      await missionPipeline.startMission(mission.id);
      toast({ title: "Mission Started", description: `"${mission.name}" is now running` });
      await loadMissions();
      if (selectedMission?.id === mission.id) {
        const updated = await missionPipeline.getById(mission.id);
        setSelectedMission(updated);
      }
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to start mission",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handlePauseMission = async (mission: Mission) => {
    try {
      setActionLoading(`pause-${mission.id}`);
      await missionPipeline.pauseMission(mission.id);
      toast({ title: "Mission Paused", description: `"${mission.name}" paused` });
      await loadMissions();
      if (selectedMission?.id === mission.id) {
        const updated = await missionPipeline.getById(mission.id);
        setSelectedMission(updated);
      }
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to pause mission",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleResumeMission = async (mission: Mission) => {
    try {
      setActionLoading(`resume-${mission.id}`);
      await missionPipeline.resumeMission(mission.id);
      toast({ title: "Mission Resumed", description: `"${mission.name}" resumed` });
      await loadMissions();
      if (selectedMission?.id === mission.id) {
        const updated = await missionPipeline.getById(mission.id);
        setSelectedMission(updated);
      }
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to resume mission",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleAbortMission = async (mission: Mission) => {
    try {
      setActionLoading(`abort-${mission.id}`);
      await missionPipeline.abortMission(mission.id);
      toast({ title: "Mission Aborted", description: `"${mission.name}" aborted` });
      await loadMissions();
      if (selectedMission?.id === mission.id) {
        const updated = await missionPipeline.getById(mission.id);
        setSelectedMission(updated);
      }
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to abort mission",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleSkipPhase = async (phaseId: string) => {
    try {
      setActionLoading(`skip-${phaseId}`);
      await missionPipeline.skipPhase(phaseId);
      toast({ title: "Phase Skipped" });
      if (selectedMission) {
        const [p, e] = await Promise.all([
          missionPipeline.getPhases(selectedMission.id),
          missionPipeline.getEvents(selectedMission.id, 100),
        ]);
        setPhases(p);
        setEvents(e);
      }
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to skip phase",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteMission = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await missionPipeline.delete(deleteTarget.id);
      toast({ title: "Mission Deleted", description: `"${deleteTarget.name}" removed` });
      if (selectedMission?.id === deleteTarget.id) setSelectedMission(null);
      setDeleteTarget(null);
      await loadMissions();
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to delete mission",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleRefresh = async () => {
    await loadMissions();
    if (selectedMission) {
      const updated = await missionPipeline.getById(selectedMission.id);
      setSelectedMission(updated);
    }
    toast({ title: "Refreshed" });
  };

  // ─── Helpers ───────────────────────────────────────────────────────────────

  const formatDuration = (ms?: number): string => {
    if (!ms) return "--";
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${Math.round(ms / 1000)}s`;
    if (ms < 3600000) return `${Math.round(ms / 60000)}m`;
    return `${(ms / 3600000).toFixed(1)}h`;
  };

  const getMissionDuration = (mission: Mission): string => {
    if (!mission.started_at) return "--";
    const end = mission.completed_at ? new Date(mission.completed_at) : new Date();
    const start = new Date(mission.started_at);
    return formatDuration(end.getTime() - start.getTime());
  };

  const getPhaseConfig = (type: PhaseType) => PHASE_CONFIG[type] || PHASE_CONFIG.recon;
  const getPhaseColors = (type: PhaseType) => PHASE_COLORS[type] || PHASE_COLORS.recon;
  const getPhaseIcon = (type: PhaseType) => PHASE_ICONS[type] || PHASE_ICONS.recon;

  // ─── Render: Stats Bar ─────────────────────────────────────────────────────

  const renderStatsBar = () => (
    <div className="grid grid-cols-5 gap-3">
      {[
        { label: "Total Missions", value: stats.total, icon: UilRocket, color: "text-zinc-400" },
        { label: "Running", value: stats.running, icon: UilHeartRate, color: "text-cyan-400" },
        { label: "Completed", value: stats.completed, icon: UilCheckCircle, color: "text-emerald-400" },
        { label: "Total Findings", value: stats.total_findings, icon: UilBug, color: "text-orange-400" },
        { label: "Critical", value: stats.total_critical, icon: UilExclamationTriangle, color: "text-red-400" },
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

  // ─── Render: Mission Card ──────────────────────────────────────────────────

  const renderMissionCard = (mission: Mission) => {
    const isSelected = selectedMission?.id === mission.id;
    const statusBadge = STATUS_BADGE[mission.status] || STATUS_BADGE.created;
    const phaseConfig = getPhaseConfig(mission.current_phase);
    const phaseColors = getPhaseColors(mission.current_phase);

    return (
      <motion.div
        key={mission.id}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.15 }}
      >
        <Card
          className={`
            bg-zinc-900/50 border cursor-pointer transition-all duration-200
            hover:border-zinc-600/50 hover:bg-zinc-900/70
            ${isSelected ? "border-cyan-500/50 bg-zinc-900/80 shadow-lg shadow-cyan-500/5" : "border-zinc-800/50"}
          `}
          onClick={() => setSelectedMission(isSelected ? null : mission)}
        >
          <CardContent className="p-4 space-y-3">
            {/* Header row */}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold text-zinc-100 truncate">{mission.name}</h3>
                <div className="flex items-center gap-1.5 mt-1">
                  <UilFocusTarget size={12} className="text-zinc-500 shrink-0" />
                  <span className="text-xs text-zinc-500 font-mono truncate">{mission.target}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge className={`text-[10px] px-1.5 py-0 ${statusBadge.className}`}>
                  {statusBadge.label}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-zinc-600 hover:text-red-400"
                  onClick={(e) => { e.stopPropagation(); setDeleteTarget(mission); }}
                >
                  <UilTrashAlt size={12} />
                </Button>
              </div>
            </div>

            {/* Progress bar */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px]">
                <span className={`${phaseColors.text} font-medium`}>{phaseConfig.label}</span>
                <span className="text-zinc-500 font-mono">{mission.progress}%</span>
              </div>
              <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <motion.div
                  className={`h-full rounded-full bg-gradient-to-r ${phaseColors.gradient}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${mission.progress}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
              </div>
            </div>

            {/* Footer row */}
            <div className="flex items-center justify-between text-[10px] text-zinc-500">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <UilBug size={10} />
                  {mission.total_findings} findings
                </span>
                {mission.critical_findings > 0 && (
                  <span className="flex items-center gap-1 text-red-400">
                    <UilExclamationTriangle size={10} />
                    {mission.critical_findings} critical
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <UilClock size={10} />
                {getMissionDuration(mission)}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  // ─── Render: Mission List ──────────────────────────────────────────────────

  const renderMissionList = () => (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <UilSearch
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
        />
        <Input
          placeholder="Search missions..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-zinc-900/50 border-zinc-800/50 h-9 text-sm"
        />
      </div>

      {/* Missions */}
      <ScrollArea className="h-[calc(100vh-340px)]">
        <div className="space-y-2 pr-2">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[120px] bg-zinc-800/50 rounded-lg" />
            ))
          ) : filteredMissions.length === 0 ? (
            <div className="text-center py-12 text-zinc-600">
              <UilRocket size={40} className="mx-auto mb-3 opacity-50" />
              <p className="text-sm">No missions yet</p>
              <p className="text-xs mt-1">Create a mission to start your pipeline</p>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {filteredMissions.map(renderMissionCard)}
            </AnimatePresence>
          )}
        </div>
      </ScrollArea>
    </div>
  );

  // ─── Render: Pipeline Visualization ────────────────────────────────────────

  const renderPipeline = () => {
    if (!selectedMission || phases.length === 0) return null;

    return (
      <div className="space-y-1">
        <h4 className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-3">Pipeline</h4>
        <div className="flex items-stretch gap-0 overflow-x-auto pb-2">
          {phases.map((phase, idx) => {
            const type = phase.phase_type as PhaseType;
            const config = getPhaseConfig(type);
            const colors = getPhaseColors(type);
            const PhaseIcon = getPhaseIcon(type);
            const statusInfo = PHASE_STATUS_BADGE[phase.status] || PHASE_STATUS_BADGE.pending;
            const isExpanded = expandedPhase === phase.id;
            const isRunning = phase.status === "running";
            const isCompleted = phase.status === "completed";
            const isCurrent = selectedMission.current_phase === type;

            return (
              <div key={phase.id} className="flex items-stretch">
                {/* Phase Card */}
                <motion.div
                  className={`
                    relative rounded-lg border p-3 min-w-[140px] max-w-[160px] cursor-pointer
                    transition-all duration-200 select-none
                    ${colors.bg} ${colors.border}
                    ${isCurrent && isRunning ? `shadow-lg ${colors.glow}` : ""}
                    ${isExpanded ? "ring-1 ring-cyan-500/40" : ""}
                    hover:brightness-110
                  `}
                  onClick={() => setExpandedPhase(isExpanded ? null : phase.id)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {/* Running glow */}
                  {isRunning && (
                    <motion.div
                      className={`absolute inset-0 rounded-lg border ${colors.border} opacity-50`}
                      animate={{ opacity: [0.3, 0.6, 0.3] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  )}

                  <div className="relative z-10 space-y-2">
                    {/* Icon + Label */}
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-md bg-zinc-900/60 ${colors.text}`}>
                        {isRunning ? (
                          <UilSpinner size={14} className="animate-spin" />
                        ) : (
                          <PhaseIcon size={14} />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className={`text-[11px] font-semibold ${colors.text} truncate`}>{config.label}</p>
                        <p className="text-[9px] text-zinc-600">Phase {config.order}</p>
                      </div>
                    </div>

                    {/* Status badge */}
                    <Badge className={`text-[9px] px-1 py-0 ${statusInfo.className}`}>
                      {statusInfo.label}
                    </Badge>

                    {/* Tools count + findings */}
                    <div className="flex items-center justify-between text-[9px] text-zinc-500">
                      <span className="flex items-center gap-0.5">
                        <UilWrench size={8} />
                        {phase.tools?.length || 0} tools
                      </span>
                      {phase.findings_created > 0 && (
                        <span className="flex items-center gap-0.5 text-orange-400">
                          <UilBug size={8} />
                          {phase.findings_created}
                        </span>
                      )}
                    </div>

                    {/* Duration */}
                    {phase.duration_ms && (
                      <div className="text-[9px] text-zinc-600 flex items-center gap-0.5">
                        <UilClock size={8} />
                        {formatDuration(phase.duration_ms)}
                      </div>
                    )}

                    {/* Skip button for pending phases */}
                    {phase.status === "pending" && selectedMission.status === "running" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 px-1.5 text-[9px] text-zinc-500 hover:text-yellow-400 mt-1"
                        onClick={(e) => { e.stopPropagation(); handleSkipPhase(phase.id); }}
                        disabled={actionLoading === `skip-${phase.id}`}
                      >
                        <UilSkipForwardCircle size={10} className="mr-0.5" />
                        Skip
                      </Button>
                    )}
                  </div>
                </motion.div>

                {/* Connector arrow */}
                {idx < phases.length - 1 && (
                  <div className="flex items-center px-1">
                    <div className={`h-px w-4 ${isCompleted ? "bg-emerald-500/50" : "bg-zinc-700/50"}`} />
                    <UilArrowRight
                      size={10}
                      className={isCompleted ? "text-emerald-500/50" : "text-zinc-700/50"}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Progress line */}
        <div className="mt-2 h-1 bg-zinc-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-blue-500 via-orange-500 via-red-500 via-purple-500 to-green-500"
            initial={{ width: 0 }}
            animate={{ width: `${selectedMission.progress}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
      </div>
    );
  };

  // ─── Render: Phase Detail (expanded) ───────────────────────────────────────

  const renderPhaseDetail = () => {
    if (!expandedPhase) return null;
    const phase = phases.find(p => p.id === expandedPhase);
    if (!phase) return null;

    const type = phase.phase_type as PhaseType;
    const config = getPhaseConfig(type);
    const colors = getPhaseColors(type);

    return (
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.2 }}
      >
        <Card className={`bg-zinc-900/50 border ${colors.border} mt-3`}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className={`text-sm ${colors.text} flex items-center gap-2`}>
                {(() => { const I = getPhaseIcon(type); return <I size={16} />; })()}
                {config.label} Detail
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-zinc-500"
                onClick={() => setExpandedPhase(null)}
              >
                <UilTimes size={12} />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* UilInfoCircle grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div>
                <p className="text-zinc-500 mb-0.5">Status</p>
                <Badge className={`text-[10px] ${(PHASE_STATUS_BADGE[phase.status] || PHASE_STATUS_BADGE.pending).className}`}>
                  {(PHASE_STATUS_BADGE[phase.status] || PHASE_STATUS_BADGE.pending).label}
                </Badge>
              </div>
              <div>
                <p className="text-zinc-500 mb-0.5">Duration</p>
                <p className="text-zinc-300 font-mono">{formatDuration(phase.duration_ms)}</p>
              </div>
              <div>
                <p className="text-zinc-500 mb-0.5">Findings</p>
                <p className="text-orange-400 font-mono">{phase.findings_created}</p>
              </div>
              <div>
                <p className="text-zinc-500 mb-0.5">Started</p>
                <p className="text-zinc-300 font-mono text-[10px]">
                  {phase.started_at ? format(new Date(phase.started_at), "HH:mm:ss") : "--"}
                </p>
              </div>
            </div>

            <Separator className="bg-zinc-800/50" />

            {/* Tools */}
            <div>
              <h5 className="text-xs font-medium text-zinc-400 mb-2">Tools</h5>
              <div className="space-y-1.5">
                {(phase.tools || []).map((tool, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2 rounded-md bg-zinc-800/30 border border-zinc-800/50"
                  >
                    <div className="flex items-center gap-2">
                      <UilWrench size={12} className="text-zinc-500" />
                      <span className="text-xs text-zinc-300 font-mono">{tool.tool}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {tool.duration_ms && (
                        <span className="text-[10px] text-zinc-600 font-mono">
                          {formatDuration(tool.duration_ms)}
                        </span>
                      )}
                      <Badge className={`text-[9px] px-1 py-0 ${
                        tool.status === "done"
                          ? "bg-emerald-500/20 text-emerald-400"
                          : tool.status === "running"
                          ? "bg-cyan-500/20 text-cyan-400 animate-pulse"
                          : tool.status === "failed"
                          ? "bg-red-500/20 text-red-400"
                          : "bg-zinc-500/20 text-zinc-500 border border-zinc-600/30"
                      }`}>
                        {tool.status || "pending"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Error */}
            {phase.error_message && (
              <>
                <Separator className="bg-zinc-800/50" />
                <div className="p-3 rounded-md bg-red-500/5">
                  <div className="flex items-center gap-2 mb-1">
                    <UilTimesCircle size={14} className="text-red-400" />
                    <span className="text-xs font-medium text-red-400">Error</span>
                  </div>
                  <p className="text-xs text-red-300/70 font-mono">{phase.error_message}</p>
                </div>
              </>
            )}

            {/* Output preview */}
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

  // ─── Render: Mission Controls ──────────────────────────────────────────────

  const renderMissionControls = () => {
    if (!selectedMission) return null;
    const m = selectedMission;

    return (
      <div className="flex items-center gap-2">
        {m.status === "created" && (
          <Button
            size="sm"
            className="h-7 px-3 text-xs bg-cyan-600 hover:bg-cyan-500 text-black font-semibold"
            onClick={() => handleStartMission(m)}
            disabled={actionLoading === `start-${m.id}`}
          >
            {actionLoading === `start-${m.id}` ? (
              <UilSpinner size={12} className="animate-spin mr-1" />
            ) : (
              <UilPlay size={12} className="mr-1" />
            )}
            Start
          </Button>
        )}
        {m.status === "running" && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-3 text-xs border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10"
            onClick={() => handlePauseMission(m)}
            disabled={actionLoading === `pause-${m.id}`}
          >
            <UilPause size={12} className="mr-1" />
            Pause
          </Button>
        )}
        {m.status === "paused" && (
          <Button
            size="sm"
            className="h-7 px-3 text-xs bg-cyan-600 hover:bg-cyan-500 text-black font-semibold"
            onClick={() => handleResumeMission(m)}
            disabled={actionLoading === `resume-${m.id}`}
          >
            <UilPlay size={12} className="mr-1" />
            Resume
          </Button>
        )}
        {(m.status === "running" || m.status === "paused") && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-3 text-xs text-red-400 hover:bg-red-500/10"
            onClick={() => handleAbortMission(m)}
            disabled={actionLoading === `abort-${m.id}`}
          >
            <UilStopCircle size={12} className="mr-1" />
            Abort
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-xs text-zinc-500 hover:text-zinc-300"
          onClick={handleRefresh}
        >
          <UilSync size={12} />
        </Button>
      </div>
    );
  };

  // ─── Render: Summary Stats ─────────────────────────────────────────────────

  const renderSummaryStats = () => {
    if (!selectedMission) return null;
    const m = selectedMission;
    const completedPhases = phases.filter(p => p.status === "completed").length;
    const totalPhases = phases.length;

    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            label: "Phases",
            value: `${completedPhases}/${totalPhases}`,
            icon: UilTachometerFast,
            color: "text-blue-400",
          },
          {
            label: "Findings",
            value: m.total_findings,
            icon: UilBug,
            color: "text-orange-400",
          },
          {
            label: "Critical / High",
            value: `${m.critical_findings} / ${m.high_findings}`,
            icon: UilExclamationTriangle,
            color: "text-red-400",
          },
          {
            label: "Duration",
            value: getMissionDuration(m),
            icon: UilClock,
            color: "text-zinc-400",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="flex items-center gap-2 p-2.5 rounded-lg bg-zinc-800/30 border border-zinc-800/50"
          >
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

  // ─── Render: Event Log ─────────────────────────────────────────────────────

  const renderEventLog = () => {
    if (!selectedMission) return null;

    return (
      <div className="space-y-2">
        <h4 className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Event Log</h4>
        <ScrollArea className="h-[240px]">
          <div className="space-y-1 pr-2">
            {events.length === 0 ? (
              <p className="text-xs text-zinc-600 text-center py-6">No events yet</p>
            ) : (
              events.map((event) => {
                const EventIcon = EVENT_ICONS[event.event_type] || UilInfoCircle;
                const color = EVENT_COLORS[event.event_type] || "text-zinc-500";

                return (
                  <div
                    key={event.id}
                    className="flex items-start gap-2 p-2 rounded-md hover:bg-zinc-800/30 transition-colors"
                  >
                    <div className={`mt-0.5 shrink-0 ${color}`}>
                      <EventIcon size={12} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-zinc-300 leading-snug">{event.message}</p>
                      <p className="text-[10px] text-zinc-600 font-mono mt-0.5">
                        {format(new Date(event.created_at), "MMM dd HH:mm:ss")}
                      </p>
                    </div>
                    <Badge className={`text-[8px] px-1 py-0 shrink-0 ${
                      event.event_type.includes("error")
                        ? "bg-red-500/10 text-red-400"
                        : event.event_type.includes("complete")
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "bg-zinc-500/10 text-zinc-500 border border-zinc-600/20"
                    }`}>
                      {event.event_type.replace(/_/g, " ")}
                    </Badge>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </div>
    );
  };

  // ─── Render: Mission Detail View ───────────────────────────────────────────

  const renderDetailView = () => {
    if (!selectedMission) {
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

    const m = selectedMission;

    return (
      <div className="space-y-4 h-full">
        {/* Mission header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-zinc-100">{m.name}</h2>
              <Badge className={`text-[10px] ${(STATUS_BADGE[m.status] || STATUS_BADGE.created).className}`}>
                {(STATUS_BADGE[m.status] || STATUS_BADGE.created).label}
              </Badge>
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500">
              <span className="flex items-center gap-1 font-mono">
                <UilFocusTarget size={11} />
                {m.target}
              </span>
              <span className="flex items-center gap-1">
                <UilCalendarAlt size={11} />
                {formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}
              </span>
              {m.rules_of_engagement && (
                <span className="flex items-center gap-1">
                  <UilShieldCheck size={11} />
                  RoE defined
                </span>
              )}
            </div>
          </div>
          {renderMissionControls()}
        </div>

        <Separator className="bg-zinc-800/50" />

        {/* Summary stats */}
        {renderSummaryStats()}

        {/* Pipeline */}
        {loadingDetail ? (
          <Skeleton className="h-[100px] bg-zinc-800/50 rounded-lg" />
        ) : (
          renderPipeline()
        )}

        {/* Expanded phase detail */}
        <AnimatePresence mode="wait">
          {renderPhaseDetail()}
        </AnimatePresence>

        {/* Event log */}
        <Separator className="bg-zinc-800/50" />
        {renderEventLog()}
      </div>
    );
  };

  // ─── Render: Create Dialog ─────────────────────────────────────────────────

  const renderCreateDialog = () => (
    <Dialog open={createOpen} onOpenChange={setCreateOpen}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-zinc-100 flex items-center gap-2">
            <UilRocket size={18} className="text-cyan-400" />
            New Mission
          </DialogTitle>
          <DialogDescription className="text-zinc-500">
            Configure and launch an automated pentest pipeline
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Name */}
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">Mission Name *</Label>
            <Input
              placeholder="e.g., Q1 External Pentest"
              value={createData.name}
              onChange={(e) => setCreateData(prev => ({ ...prev, name: e.target.value }))}
              className="bg-zinc-800/50 border-zinc-700/50 text-sm"
            />
          </div>

          {/* UilFocusTarget */}
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">UilFocusTarget *</Label>
            <Input
              placeholder="e.g., example.com"
              value={createData.target}
              onChange={(e) => setCreateData(prev => ({ ...prev, target: e.target.value }))}
              className="bg-zinc-800/50 border-zinc-700/50 text-sm font-mono"
            />
          </div>

          {/* Scope */}
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">Scope (domains/IPs, one per line)</Label>
            <Textarea
              placeholder={"example.com\napi.example.com\n10.0.0.0/24"}
              value={createData.scope}
              onChange={(e) => setCreateData(prev => ({ ...prev, scope: e.target.value }))}
              className="bg-zinc-800/50 border-zinc-700/50 text-sm font-mono h-20 resize-none"
            />
          </div>

          {/* Rules of Engagement */}
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">Rules of Engagement</Label>
            <Textarea
              placeholder="e.g., No DoS, no social engineering, testing window: 09:00-17:00 UTC"
              value={createData.rules_of_engagement}
              onChange={(e) => setCreateData(prev => ({ ...prev, rules_of_engagement: e.target.value }))}
              className="bg-zinc-800/50 border-zinc-700/50 text-sm h-16 resize-none"
            />
          </div>

          {/* Estimated Duration */}
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">Estimated Duration</Label>
            <Input
              placeholder="e.g., 2h, 30m, 1d"
              value={createData.estimated_duration}
              onChange={(e) => setCreateData(prev => ({ ...prev, estimated_duration: e.target.value }))}
              className="bg-zinc-800/50 border-zinc-700/50 text-sm w-32"
            />
          </div>

          {/* Phase selector */}
          <div className="space-y-2">
            <Label className="text-xs text-zinc-400">Phases to include</Label>
            <div className="grid grid-cols-2 gap-2">
              {PHASE_ORDER.map((phase) => {
                const config = PHASE_CONFIG[phase];
                const colors = getPhaseColors(phase);
                const PhaseIcon = getPhaseIcon(phase);
                const isSkipped = createData.skip_phases.has(phase);

                return (
                  <div
                    key={phase}
                    className={`
                      flex items-center gap-2 p-2 rounded-md border cursor-pointer transition-all
                      ${isSkipped
                        ? "bg-zinc-800/20 border-zinc-800/30 opacity-50"
                        : `${colors.bg} ${colors.border}`
                      }
                    `}
                    onClick={() => {
                      setCreateData(prev => {
                        const next = new Set(prev.skip_phases);
                        if (next.has(phase)) next.delete(phase);
                        else next.add(phase);
                        return { ...prev, skip_phases: next };
                      });
                    }}
                  >
                    <Checkbox
                      checked={!isSkipped}
                      className="border-zinc-600 data-[state=checked]:bg-cyan-600 data-[state=checked]:border-cyan-600"
                    />
                    <PhaseIcon size={14} className={isSkipped ? "text-zinc-600" : colors.text} />
                    <span className={`text-xs font-medium ${isSkipped ? "text-zinc-600" : colors.text}`}>
                      {config.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            className="border-zinc-700/50 text-zinc-400 hover:text-zinc-300 text-xs"
            onClick={() => handleCreate(false)}
            disabled={creating}
          >
            {creating ? (
              <UilSpinner size={12} className="animate-spin mr-1" />
            ) : (
              <UilFileAlt size={12} className="mr-1" />
            )}
            Create as Draft
          </Button>
          <Button
            className="bg-cyan-600 hover:bg-cyan-500 text-black font-semibold text-xs"
            onClick={() => handleCreate(true)}
            disabled={creating}
          >
            {creating ? (
              <UilSpinner size={12} className="animate-spin mr-1" />
            ) : (
              <UilRocket size={12} className="mr-1" />
            )}
            Create & Start
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  // ─── Render: Delete Dialog ─────────────────────────────────────────────────

  const renderDeleteDialog = () => (
    <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-zinc-100 flex items-center gap-2">
            <UilExclamationTriangle size={18} className="text-red-400" />
            Delete Mission
          </DialogTitle>
          <DialogDescription className="text-zinc-500">
            This will permanently delete <span className="text-zinc-300 font-medium">"{deleteTarget?.name}"</span> and
            all its phases, events, and logs. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            className="border-zinc-700/50 text-zinc-400 text-xs"
            onClick={() => setDeleteTarget(null)}
            disabled={deleting}
          >
            Cancel
          </Button>
          <Button
            className="bg-red-600 hover:bg-red-500 text-white font-semibold text-xs"
            onClick={handleDeleteMission}
            disabled={deleting}
          >
            {deleting ? (
              <UilSpinner size={12} className="animate-spin mr-1" />
            ) : (
              <UilTrashAlt size={12} className="mr-1" />
            )}
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  // ─── Main Layout ───────────────────────────────────────────────────────────

  return (
    <div className="h-full bg-background p-4 space-y-4 overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <UilRocket size={22} className="text-cyan-400" />
            <h1 className="text-lg font-bold text-zinc-100">Missions</h1>
          </div>
          <p className="text-xs text-zinc-500 mt-0.5 ml-[30px]">
            Automated pentest pipeline — recon to report
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs text-zinc-500 hover:text-zinc-300"
            onClick={handleRefresh}
          >
            <UilSync size={14} />
          </Button>
          <Button
            size="sm"
            className="h-8 px-3 text-xs bg-cyan-600 hover:bg-cyan-500 text-black font-semibold"
            onClick={() => setCreateOpen(true)}
          >
            <UilPlus size={14} className="mr-1" />
            New Mission
          </Button>
        </div>
      </div>

      {/* Preview Banner */}
      <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-400 flex items-center gap-2">
        <UilHardHat size={16} />
        <span>Mission Pipeline is in preview — tool execution is simulated. Connect MCP scanning tools for live results.</span>
      </div>

      {/* Stats */}
      {renderStatsBar()}

      {/* Main content: list + detail */}
      <div className="grid grid-cols-12 gap-4 h-[calc(100vh-240px)]">
        {/* Left panel: mission list */}
        <div className="col-span-4 xl:col-span-3">
          {renderMissionList()}
        </div>

        {/* Right panel: detail view */}
        <div className="col-span-8 xl:col-span-9">
          <Card className="bg-zinc-900/30 border-zinc-800/50 h-full">
            <CardContent className="p-4 h-full overflow-y-auto">
              {renderDetailView()}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialogs */}
      {renderCreateDialog()}
      {renderDeleteDialog()}
    </div>
  );
}
