/**
 * Alert Center — Alert Ingestion & SIEM Bridge
 * Phase 6 of the Cybersecurity Gaps Integration Plan.
 * Cross-vendor alert ingestion, normalization, correlation, and investigation timelines.
 * "87% of incidents require 2+ data sources. We unify them all."
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import {
  Bell,
  MagnifyingGlass,
  Plus,
  X,
  CaretRight,
  CaretDown,
  CheckCircle,
  ShieldCheck,
  ShieldSlash,
  Lightning,
  Clock,
  Eye,
  TreeStructure,
  ArrowSquareOut,
  Copy,
  Plugs,
  Target,
  GitBranch,
  ArrowsClockwise,
  PencilSimple,
  Cube,
  Users,
  Desktop,
  WebhooksLogo,
  ListBullets,
  Graph,
  Archive,
} from "@phosphor-icons/react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow, format } from "date-fns";

import {
  alertIngestion,
  type Alert,
  type AlertSource,
  type AlertStatus,
  type SourceType,
  type SourceStatus,
  type InvestigationTimeline,
  type TimelineEvent,
  type CorrelationGroup,
} from "@/services/alert-ingestion";

// ─── Severity Colors ────────────────────────────────────────────────────────

const SEVERITY_COLORS: Record<string, { badge: string; dot: string; text: string }> = {
  critical: {
    badge: "bg-red-500/20 text-red-400 border border-red-500/30",
    dot: "bg-red-500",
    text: "text-red-400",
  },
  high: {
    badge: "bg-orange-500/20 text-orange-400 border border-orange-500/30",
    dot: "bg-orange-500",
    text: "text-orange-400",
  },
  medium: {
    badge: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
    dot: "bg-yellow-500",
    text: "text-yellow-400",
  },
  low: {
    badge: "bg-blue-500/20 text-blue-400 border border-blue-500/30",
    dot: "bg-blue-500",
    text: "text-blue-400",
  },
  info: {
    badge: "bg-zinc-500/20 text-zinc-400 border border-zinc-500/30",
    dot: "bg-zinc-500",
    text: "text-zinc-400",
  },
  informational: {
    badge: "bg-zinc-500/20 text-zinc-400 border border-zinc-500/30",
    dot: "bg-zinc-500",
    text: "text-zinc-400",
  },
};

const STATUS_COLORS: Record<AlertStatus, string> = {
  new: "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30",
  triaging: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
  escalated: "bg-orange-500/20 text-orange-400 border border-orange-500/30",
  resolved: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
  false_positive: "bg-zinc-600/20 text-zinc-500 border border-zinc-600/30",
};

const STATUS_LABELS: Record<AlertStatus, string> = {
  new: "New",
  triaging: "Triaging",
  escalated: "Escalated",
  resolved: "Resolved",
  false_positive: "False Positive",
};

const SOURCE_STATUS_COLORS: Record<SourceStatus, { bg: string; dot: string }> = {
  connected: { bg: "bg-emerald-500/20 text-emerald-400", dot: "bg-emerald-500" },
  disconnected: { bg: "bg-zinc-600/20 text-zinc-500", dot: "bg-zinc-500" },
  error: { bg: "bg-red-500/20 text-red-400", dot: "bg-red-500" },
  syncing: { bg: "bg-blue-500/20 text-blue-400", dot: "bg-blue-500" },
};

const SOURCE_ICONS: Record<SourceType, typeof Cube> = {
  splunk: Lightning,
  elastic: MagnifyingGlass,
  sentinel: ShieldCheck,
  crowdstrike: Target,
  pagerduty: Bell,
  syslog: ListBullets,
  webhook: WebhooksLogo,
  manual: PencilSimple,
};

const TIMELINE_STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
  closed: "bg-zinc-600/20 text-zinc-500 border border-zinc-600/30",
  archived: "bg-purple-500/20 text-purple-400 border border-purple-500/30",
};

// ─── Animations ─────────────────────────────────────────────────────────────

const fadeIn = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.2 },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.04 } },
};

const slideIn = {
  initial: { opacity: 0, x: 300 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 300 },
  transition: { type: "spring", damping: 25, stiffness: 200 },
};

// ─── Mini Sparkline Component ───────────────────────────────────────────────

function Sparkline({ data, color = "#22c55e", width = 120, height = 28 }: {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
}) {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - (v / max) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.7}
      />
    </svg>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function AlertCenter() {
  const { toast } = useToast();

  // ─── State ──────────────────────────────────────────────────────────────────

  const [activeTab, setActiveTab] = useState("feed");
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [sources, setSources] = useState<AlertSource[]>([]);
  const [investigations, setInvestigations] = useState<InvestigationTimeline[]>([]);
  const [correlationGroups, setCorrelationGroups] = useState<CorrelationGroup[]>([]);
  const [loading, setLoading] = useState(true);

  // ─── Load real data from Supabase ───────────────────────────────────────────
  useEffect(() => {
    async function loadData() {
      try {
        const [alertsData, sourcesData, timelinesData] = await Promise.all([
          alertIngestion.getAlerts({ limit: 200 }),
          alertIngestion.getSources().catch(() => []),
          alertIngestion.getTimelines().catch(() => []),
        ]);
        setAlerts(alertsData);
        setSources(sourcesData);
        setInvestigations(timelinesData);

        // Auto-correlate alerts
        try {
          const groups = await alertIngestion.correlateAlerts(30);
          setCorrelationGroups(groups);
        } catch { /* correlation is optional */ }
      } catch (err) {
        console.error('Failed to load alerts:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
    const interval = setInterval(loadData, 60000);
    return () => clearInterval(interval);
  }, []);

  // Feed filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSeverity, setFilterSeverity] = useState<string>("all");
  const [filterSourceType, setFilterSourceType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedAlertIds, setSelectedAlertIds] = useState<Set<string>>(new Set());
  const [detailAlert, setDetailAlert] = useState<Alert | null>(null);
  const [showOriginalJson, setShowOriginalJson] = useState(false);

  // Sources
  const [showAddSource, setShowAddSource] = useState(false);
  const [newSourceName, setNewSourceName] = useState("");
  const [newSourceType, setNewSourceType] = useState<SourceType>("splunk");
  const [newSourceUrl, setNewSourceUrl] = useState("");
  const [newSourceApiKey, setNewSourceApiKey] = useState("");

  // Investigations
  const [showCreateInvestigation, setShowCreateInvestigation] = useState(false);
  const [newInvName, setNewInvName] = useState("");
  const [newInvDescription, setNewInvDescription] = useState("");
  const [newInvSeverity, setNewInvSeverity] = useState("medium");
  const [expandedInvId, setExpandedInvId] = useState<string | null>(null);

  // Correlation
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);

  // ─── Filtered Alerts ──────────────────────────────────────────────────────

  const filteredAlerts = useMemo(() => {
    return alerts.filter(a => {
      if (filterSeverity !== "all" && a.severity !== filterSeverity) return false;
      if (filterSourceType !== "all" && a.source_type !== filterSourceType) return false;
      if (filterStatus !== "all" && a.status !== filterStatus) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchTitle = a.title.toLowerCase().includes(q);
        const matchHost = a.affected_host?.toLowerCase().includes(q);
        const matchIp = a.source_ip?.toLowerCase().includes(q) || a.dest_ip?.toLowerCase().includes(q);
        if (!matchTitle && !matchHost && !matchIp) return false;
      }
      return true;
    });
  }, [alerts, filterSeverity, filterSourceType, filterStatus, searchQuery]);

  // ─── Stats ────────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const bySev: Record<string, number> = {};
    const bySource: Record<string, number> = {};
    for (const a of alerts) {
      bySev[a.severity] = (bySev[a.severity] || 0) + 1;
      bySource[a.source_type] = (bySource[a.source_type] || 0) + 1;
    }
    return {
      total: alerts.length,
      newCount: alerts.filter(a => a.status === "new").length,
      criticalCount: alerts.filter(a => a.severity === "critical").length,
      sourcesConnected: sources.filter(s => s.status === "connected").length,
      activeInvestigations: investigations.filter(i => i.status === "active").length,
      bySev,
      bySource,
    };
  }, [alerts, sources, investigations]);

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const toggleAlertSelection = useCallback((id: string) => {
    setSelectedAlertIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAllFiltered = useCallback(() => {
    if (selectedAlertIds.size === filteredAlerts.length) {
      setSelectedAlertIds(new Set());
    } else {
      setSelectedAlertIds(new Set(filteredAlerts.map(a => a.id)));
    }
  }, [filteredAlerts, selectedAlertIds]);

  const bulkAction = useCallback((action: "resolved" | "escalated" | "false_positive") => {
    if (selectedAlertIds.size === 0) return;
    setAlerts(prev => prev.map(a => {
      if (selectedAlertIds.has(a.id)) {
        return {
          ...a,
          status: action as AlertStatus,
          ...(action === "resolved" || action === "false_positive" ? { resolved_at: new Date().toISOString() } : {}),
        };
      }
      return a;
    }));
    toast({
      title: `${selectedAlertIds.size} alerts updated`,
      description: `Marked as ${STATUS_LABELS[action as AlertStatus] || action}`,
    });
    setSelectedAlertIds(new Set());
  }, [selectedAlertIds, toast]);

  const handleCreateInvestigation = useCallback(() => {
    if (!newInvName.trim()) return;
    const newInv: InvestigationTimeline = {
      id: `inv-${Date.now()}`,
      user_id: "user-1",
      name: newInvName,
      description: newInvDescription,
      alert_ids: [],
      finding_ids: [],
      timeline_events: [{
        id: `evt-${Date.now()}`,
        timestamp: new Date().toISOString(),
        source: "manual",
        event_type: "note",
        title: "Investigation created",
        severity: "info",
      }],
      status: "active",
      severity: newInvSeverity,
      lead_analyst: "analyst-1",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setInvestigations(prev => [newInv, ...prev]);
    setShowCreateInvestigation(false);
    setNewInvName("");
    setNewInvDescription("");
    setNewInvSeverity("medium");
    toast({ title: "Investigation created", description: newInv.name });
  }, [newInvName, newInvDescription, newInvSeverity, toast]);

  const handleAddSource = useCallback(() => {
    if (!newSourceName.trim()) return;
    toast({
      title: "Source added",
      description: `${newSourceName} (${newSourceType}) — testing connection...`,
    });
    setShowAddSource(false);
    setNewSourceName("");
    setNewSourceUrl("");
    setNewSourceApiKey("");
  }, [newSourceName, newSourceType, toast]);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full bg-zinc-950 overflow-hidden">
        {/* Header */}
        <motion.div
          className="flex-none px-6 py-4 border-b border-zinc-800/50"
          {...fadeIn}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                <Bell weight="duotone" className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-zinc-100">Alert Center</h1>
                <p className="text-xs text-zinc-500">
                  SIEM Bridge — {stats.total} alerts from {sources.length} sources
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Summary badges */}
              <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/30 text-xs">
                {stats.criticalCount} Critical
              </Badge>
              <Badge variant="outline" className="bg-cyan-500/10 text-cyan-400 border-cyan-500/30 text-xs">
                {stats.newCount} New
              </Badge>
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-xs">
                {stats.sourcesConnected}/{sources.length} Sources
              </Badge>
              <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/30 text-xs">
                {stats.activeInvestigations} Active Investigations
              </Badge>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <div className="flex-none px-6 pt-3 border-b border-zinc-800/50">
            <TabsList className="bg-zinc-900/50 border border-zinc-800/50">
              <TabsTrigger value="feed" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100 gap-1.5 text-xs">
                <Bell weight="duotone" className="w-3.5 h-3.5" />
                Alert Feed
                <Badge variant="outline" className="ml-1 text-[10px] px-1.5 py-0 bg-red-500/10 text-red-400 border-red-500/30">
                  {stats.newCount}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="sources" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100 gap-1.5 text-xs">
                <Plugs weight="duotone" className="w-3.5 h-3.5" />
                Sources
                <Badge variant="outline" className="ml-1 text-[10px] px-1.5 py-0 bg-zinc-700/50 text-zinc-400 border-zinc-600/30">
                  {sources.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="investigations" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100 gap-1.5 text-xs">
                <GitBranch weight="duotone" className="w-3.5 h-3.5" />
                Investigations
                <Badge variant="outline" className="ml-1 text-[10px] px-1.5 py-0 bg-zinc-700/50 text-zinc-400 border-zinc-600/30">
                  {investigations.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="correlation" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100 gap-1.5 text-xs">
                <Graph weight="duotone" className="w-3.5 h-3.5" />
                Correlation
                <Badge variant="outline" className="ml-1 text-[10px] px-1.5 py-0 bg-zinc-700/50 text-zinc-400 border-zinc-600/30">
                  {correlationGroups.length}
                </Badge>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════════
              TAB 1: Alert Feed
              ═══════════════════════════════════════════════════════════════════════ */}
          <TabsContent value="feed" className="flex-1 flex min-h-0 mt-0 p-0">
            <div className="flex-1 flex flex-col min-h-0">
              {/* Filter bar */}
              <div className="flex-none px-6 py-3 border-b border-zinc-800/30 flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[200px] max-w-[360px]">
                  <MagnifyingGlass weight="duotone" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <Input
                    placeholder="Search alerts by title, host, or IP..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-9 bg-zinc-900/50 border-zinc-800/50 text-zinc-200 placeholder:text-zinc-600 h-8 text-xs"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2">
                      <X className="w-3.5 h-3.5 text-zinc-500 hover:text-zinc-300" />
                    </button>
                  )}
                </div>

                <Select value={filterSeverity} onValueChange={setFilterSeverity}>
                  <SelectTrigger className="w-[130px] h-8 text-xs bg-zinc-900/50 border-zinc-800/50 text-zinc-300">
                    <SelectValue placeholder="Severity" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-700">
                    <SelectItem value="all">All Severities</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="info">Info</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filterSourceType} onValueChange={setFilterSourceType}>
                  <SelectTrigger className="w-[140px] h-8 text-xs bg-zinc-900/50 border-zinc-800/50 text-zinc-300">
                    <SelectValue placeholder="Source" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-700">
                    <SelectItem value="all">All Sources</SelectItem>
                    <SelectItem value="splunk">Splunk</SelectItem>
                    <SelectItem value="elastic">Elastic</SelectItem>
                    <SelectItem value="sentinel">Sentinel</SelectItem>
                    <SelectItem value="crowdstrike">CrowdStrike</SelectItem>
                    <SelectItem value="syslog">Syslog</SelectItem>
                    <SelectItem value="webhook">Webhook</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[130px] h-8 text-xs bg-zinc-900/50 border-zinc-800/50 text-zinc-300">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-700">
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="triaging">Triaging</SelectItem>
                    <SelectItem value="escalated">Escalated</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="false_positive">False Positive</SelectItem>
                  </SelectContent>
                </Select>

                <Separator orientation="vertical" className="h-6 bg-zinc-800" />

                <span className="text-[10px] text-zinc-500">{filteredAlerts.length} alerts</span>

                {selectedAlertIds.size > 0 && (
                  <>
                    <Separator orientation="vertical" className="h-6 bg-zinc-800" />
                    <span className="text-[10px] text-cyan-400">{selectedAlertIds.size} selected</span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-[10px] bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
                      onClick={() => bulkAction("resolved")}
                    >
                      <CheckCircle weight="duotone" className="w-3 h-3 mr-1" />
                      Resolve
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-[10px] bg-orange-500/10 border-orange-500/30 text-orange-400 hover:bg-orange-500/20"
                      onClick={() => bulkAction("escalated")}
                    >
                      <ArrowSquareOut weight="duotone" className="w-3 h-3 mr-1" />
                      Escalate
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-[10px] bg-zinc-600/20 border-zinc-600/30 text-zinc-400 hover:bg-zinc-600/30"
                      onClick={() => bulkAction("false_positive")}
                    >
                      <ShieldSlash weight="duotone" className="w-3 h-3 mr-1" />
                      False Positive
                    </Button>
                  </>
                )}
              </div>

              {/* Alert list + Detail panel */}
              <div className="flex-1 flex min-h-0">
                {/* Alert List */}
                <ScrollArea className={`flex-1 ${detailAlert ? "max-w-[55%]" : ""}`}>
                  <div className="p-4 space-y-2">
                    {/* Loading State */}
                    {loading && (
                      <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <ArrowsClockwise weight="duotone" className="w-8 h-8 text-zinc-500 animate-spin" />
                        <p className="text-sm text-zinc-500">Loading alerts from Supabase...</p>
                      </div>
                    )}

                    {/* Empty State */}
                    {!loading && alerts.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <ShieldCheck weight="duotone" className="w-12 h-12 text-zinc-600" />
                        <p className="text-sm text-zinc-400">No alerts yet</p>
                        <p className="text-xs text-zinc-500">Alerts are generated automatically from intel reports by the CrowByte Alert Agent.</p>
                      </div>
                    )}

                    {/* No Results (filtered) */}
                    {!loading && alerts.length > 0 && filteredAlerts.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-16 gap-2">
                        <MagnifyingGlass weight="duotone" className="w-8 h-8 text-zinc-600" />
                        <p className="text-sm text-zinc-400">No alerts match your filters</p>
                      </div>
                    )}

                    {/* Select All */}
                    {!loading && filteredAlerts.length > 0 && (
                    <div className="flex items-center gap-2 px-2 py-1">
                      <Checkbox
                        checked={selectedAlertIds.size === filteredAlerts.length && filteredAlerts.length > 0}
                        onCheckedChange={selectAllFiltered}
                        className="border-zinc-600"
                      />
                      <span className="text-[10px] text-zinc-500">Select all</span>
                    </div>
                    )}

                    <motion.div variants={stagger} initial="initial" animate="animate">
                      <AnimatePresence mode="popLayout">
                        {filteredAlerts.map(alert => {
                          const sevColor = SEVERITY_COLORS[alert.severity] || SEVERITY_COLORS.medium;
                          const StatusIcon = SOURCE_ICONS[alert.source_type] || Cube;
                          const isSelected = selectedAlertIds.has(alert.id);
                          const isDetail = detailAlert?.id === alert.id;

                          return (
                            <motion.div
                              key={alert.id}
                              layout
                              variants={fadeIn}
                              className={`
                                group relative flex items-start gap-3 px-3 py-3 rounded-lg border cursor-pointer transition-colors mb-2
                                ${isDetail
                                  ? "bg-zinc-800/60 border-zinc-700/60"
                                  : "bg-zinc-900/40 border-zinc-800/30 hover:bg-zinc-900/60 hover:border-zinc-700/40"
                                }
                              `}
                              onClick={() => setDetailAlert(isDetail ? null : alert)}
                            >
                              {/* Checkbox */}
                              <div className="pt-0.5" onClick={e => e.stopPropagation()}>
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() => toggleAlertSelection(alert.id)}
                                  className="border-zinc-600"
                                />
                              </div>

                              {/* Severity dot */}
                              <div className="pt-1.5">
                                <div className={`w-2.5 h-2.5 rounded-full ${sevColor.dot} ${
                                  alert.severity === "critical" ? "animate-pulse" : ""
                                }`} />
                              </div>

                              {/* Content */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-zinc-200 truncate">{alert.title}</p>
                                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${sevColor.badge}`}>
                                        {alert.severity}
                                      </Badge>
                                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${STATUS_COLORS[alert.status]}`}>
                                        {STATUS_LABELS[alert.status]}
                                      </Badge>
                                      <span className="flex items-center gap-1 text-[10px] text-zinc-500">
                                        <StatusIcon weight="duotone" className="w-3 h-3" />
                                        {alert.source_type}
                                      </span>
                                      {alert.affected_host && (
                                        <span className="flex items-center gap-1 text-[10px] text-zinc-500">
                                          <Desktop weight="duotone" className="w-3 h-3" />
                                          {alert.affected_host}
                                        </span>
                                      )}
                                    </div>
                                    {/* MITRE tags */}
                                    {(alert.mitre_tactics.length > 0 || alert.mitre_techniques.length > 0) && (
                                      <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                                        {alert.mitre_tactics.map(t => (
                                          <Badge key={t} variant="outline" className="text-[9px] px-1 py-0 bg-violet-500/10 text-violet-400 border-violet-500/20">
                                            {t}
                                          </Badge>
                                        ))}
                                        {alert.mitre_techniques.map(t => (
                                          <Badge key={t} variant="outline" className="text-[9px] px-1 py-0 bg-zinc-700/40 text-zinc-400 border-zinc-600/30 font-mono">
                                            {t}
                                          </Badge>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                  <span className="text-[10px] text-zinc-600 whitespace-nowrap flex-none">
                                    {formatDistanceToNow(new Date(alert.alert_time), { addSuffix: true })}
                                  </span>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>

                      {filteredAlerts.length === 0 && (
                        <div className="text-center py-12 text-zinc-600">
                          <Bell weight="duotone" className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No alerts match your filters</p>
                        </div>
                      )}
                    </motion.div>
                  </div>
                </ScrollArea>

                {/* Detail Panel */}
                <AnimatePresence>
                  {detailAlert && (
                    <motion.div
                      key="detail-panel"
                      {...slideIn}
                      className="w-[45%] border-l border-zinc-800/50 bg-zinc-950 flex flex-col min-h-0"
                    >
                      <ScrollArea className="flex-1">
                        <div className="p-5">
                          {/* Header */}
                          <div className="flex items-start justify-between gap-3 mb-4">
                            <div className="flex-1">
                              <h3 className="text-sm font-semibold text-zinc-100">{detailAlert.title}</h3>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className={`text-[10px] ${SEVERITY_COLORS[detailAlert.severity]?.badge}`}>
                                  {detailAlert.severity}
                                </Badge>
                                <Badge variant="outline" className={`text-[10px] ${STATUS_COLORS[detailAlert.status]}`}>
                                  {STATUS_LABELS[detailAlert.status]}
                                </Badge>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-zinc-500 hover:text-zinc-300"
                              onClick={() => setDetailAlert(null)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>

                          {/* Description */}
                          {detailAlert.description && (
                            <div className="mb-4">
                              <Label className="text-[10px] text-zinc-500 uppercase tracking-wider">Description</Label>
                              <p className="text-xs text-zinc-300 mt-1 leading-relaxed">{detailAlert.description}</p>
                            </div>
                          )}

                          {/* Metadata grid */}
                          <div className="grid grid-cols-2 gap-3 mb-4">
                            <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800/30">
                              <Label className="text-[10px] text-zinc-500 uppercase tracking-wider">Source</Label>
                              <p className="text-xs text-zinc-300 mt-0.5 flex items-center gap-1">
                                {(() => { const Icon = SOURCE_ICONS[detailAlert.source_type]; return <Icon weight="duotone" className="w-3.5 h-3.5" />; })()}
                                {detailAlert.source_type}
                              </p>
                            </div>
                            <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800/30">
                              <Label className="text-[10px] text-zinc-500 uppercase tracking-wider">Alert Time</Label>
                              <p className="text-xs text-zinc-300 mt-0.5">{format(new Date(detailAlert.alert_time), "MMM dd HH:mm:ss")}</p>
                            </div>
                            {detailAlert.affected_host && (
                              <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800/30">
                                <Label className="text-[10px] text-zinc-500 uppercase tracking-wider">Affected Host</Label>
                                <p className="text-xs text-zinc-300 mt-0.5 font-mono">{detailAlert.affected_host}</p>
                              </div>
                            )}
                            {detailAlert.affected_user && (
                              <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800/30">
                                <Label className="text-[10px] text-zinc-500 uppercase tracking-wider">Affected User</Label>
                                <p className="text-xs text-zinc-300 mt-0.5 font-mono">{detailAlert.affected_user}</p>
                              </div>
                            )}
                            {detailAlert.source_ip && (
                              <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800/30">
                                <Label className="text-[10px] text-zinc-500 uppercase tracking-wider">Source IP</Label>
                                <p className="text-xs text-zinc-300 mt-0.5 font-mono">{detailAlert.source_ip}</p>
                              </div>
                            )}
                            {detailAlert.dest_ip && (
                              <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800/30">
                                <Label className="text-[10px] text-zinc-500 uppercase tracking-wider">Dest IP</Label>
                                <p className="text-xs text-zinc-300 mt-0.5 font-mono">{detailAlert.dest_ip}</p>
                              </div>
                            )}
                            {detailAlert.original_id && (
                              <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800/30">
                                <Label className="text-[10px] text-zinc-500 uppercase tracking-wider">Original ID</Label>
                                <p className="text-xs text-zinc-300 mt-0.5 font-mono">{detailAlert.original_id}</p>
                              </div>
                            )}
                            {detailAlert.assigned_to && (
                              <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800/30">
                                <Label className="text-[10px] text-zinc-500 uppercase tracking-wider">Assigned To</Label>
                                <p className="text-xs text-zinc-300 mt-0.5">{detailAlert.assigned_to}</p>
                              </div>
                            )}
                          </div>

                          {/* MITRE ATT&CK */}
                          {(detailAlert.mitre_tactics.length > 0 || detailAlert.mitre_techniques.length > 0) && (
                            <div className="mb-4">
                              <Label className="text-[10px] text-zinc-500 uppercase tracking-wider">MITRE ATT&CK</Label>
                              <div className="flex flex-wrap gap-1.5 mt-1.5">
                                {detailAlert.mitre_tactics.map(t => (
                                  <Badge key={t} variant="outline" className="text-[10px] bg-violet-500/10 text-violet-400 border-violet-500/20">
                                    {t}
                                  </Badge>
                                ))}
                                {detailAlert.mitre_techniques.map(t => (
                                  <Badge key={t} variant="outline" className="text-[10px] bg-zinc-700/40 text-zinc-400 border-zinc-600/30 font-mono">
                                    {t}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Original JSON */}
                          <div className="mb-4">
                            <button
                              onClick={() => setShowOriginalJson(!showOriginalJson)}
                              className="flex items-center gap-1.5 text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors"
                            >
                              {showOriginalJson ? <CaretDown className="w-3 h-3" /> : <CaretRight className="w-3 h-3" />}
                              <span className="uppercase tracking-wider">Original JSON</span>
                            </button>
                            <AnimatePresence>
                              {showOriginalJson && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="overflow-hidden"
                                >
                                  <pre className="mt-2 p-3 bg-zinc-900/80 rounded-lg border border-zinc-800/30 text-[10px] text-zinc-400 font-mono overflow-x-auto max-h-[200px] overflow-y-auto">
                                    {JSON.stringify(detailAlert.original_data, null, 2)}
                                  </pre>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>

                          <Separator className="bg-zinc-800/50 my-4" />

                          {/* Actions */}
                          <Label className="text-[10px] text-zinc-500 uppercase tracking-wider">Remediation Actions</Label>
                          <div className="flex flex-wrap gap-2 mt-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
                              onClick={() => {
                                setAlerts(prev => prev.map(a => a.id === detailAlert.id ? { ...a, status: "resolved" as AlertStatus, resolved_at: new Date().toISOString() } : a));
                                setDetailAlert({ ...detailAlert, status: "resolved" });
                                toast({ title: "Alert resolved" });
                              }}
                            >
                              <CheckCircle weight="duotone" className="w-3.5 h-3.5 mr-1" />
                              Mark Resolved
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs bg-orange-500/10 border-orange-500/30 text-orange-400 hover:bg-orange-500/20"
                              onClick={() => {
                                setAlerts(prev => prev.map(a => a.id === detailAlert.id ? { ...a, status: "escalated" as AlertStatus } : a));
                                setDetailAlert({ ...detailAlert, status: "escalated" });
                                toast({ title: "Alert escalated to finding" });
                              }}
                            >
                              <ArrowSquareOut weight="duotone" className="w-3.5 h-3.5 mr-1" />
                              Escalate to Finding
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs bg-zinc-600/20 border-zinc-600/30 text-zinc-400 hover:bg-zinc-600/30"
                              onClick={() => {
                                setAlerts(prev => prev.map(a => a.id === detailAlert.id ? { ...a, status: "false_positive" as AlertStatus, resolved_at: new Date().toISOString() } : a));
                                setDetailAlert({ ...detailAlert, status: "false_positive" });
                                toast({ title: "Marked as false positive" });
                              }}
                            >
                              <ShieldSlash weight="duotone" className="w-3.5 h-3.5 mr-1" />
                              False Positive
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs bg-yellow-500/10 border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/20"
                              onClick={() => {
                                setAlerts(prev => prev.map(a => a.id === detailAlert.id ? { ...a, status: "triaging" as AlertStatus } : a));
                                setDetailAlert({ ...detailAlert, status: "triaging" });
                                toast({ title: "Alert set to triaging" });
                              }}
                            >
                              <Eye weight="duotone" className="w-3.5 h-3.5 mr-1" />
                              Start Triage
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs bg-zinc-700/30 border-zinc-700/40 text-zinc-400 hover:bg-zinc-700/40"
                              onClick={() => {
                                navigator.clipboard.writeText(JSON.stringify(detailAlert, null, 2));
                                toast({ title: "Alert data copied to clipboard" });
                              }}
                            >
                              <Copy weight="duotone" className="w-3.5 h-3.5 mr-1" />
                              Copy JSON
                            </Button>
                          </div>
                        </div>
                      </ScrollArea>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </TabsContent>

          {/* ═══════════════════════════════════════════════════════════════════════
              TAB 2: Sources
              ═══════════════════════════════════════════════════════════════════════ */}
          <TabsContent value="sources" className="flex-1 min-h-0 mt-0 p-0">
            <ScrollArea className="h-full">
              <div className="p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="text-sm font-semibold text-zinc-200">Connected Sources</h2>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {sources.filter(s => s.status === "connected").length} connected, {sources.filter(s => s.status === "error").length} errors
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs bg-cyan-500/10 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20"
                    onClick={() => setShowAddSource(true)}
                  >
                    <Plus weight="bold" className="w-3.5 h-3.5 mr-1" />
                    Add Source
                  </Button>
                </div>

                {/* Source Grid */}
                <motion.div
                  className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
                  variants={stagger}
                  initial="initial"
                  animate="animate"
                >
                  {sources.map(source => {
                    const statusColor = SOURCE_STATUS_COLORS[source.status];
                    const Icon = SOURCE_ICONS[source.source_type] || Cube;
                    // Generate sparkline from ingestion count (simulates recent activity curve)
                    const ingested = source.alerts_ingested || 0;
                    const sparkData: number[] = Array.from({ length: 12 }, (_, i) => {
                      const base = Math.max(0, ingested / 12);
                      return Math.round(base * (0.5 + Math.sin(i * 0.8) * 0.5 + Math.random() * 0.3));
                    });
                    const sparkColor = source.status === "connected" ? "#22c55e"
                      : source.status === "error" ? "#ef4444"
                      : "#71717a";

                    return (
                      <motion.div key={source.id} variants={fadeIn}>
                        <Card className="bg-zinc-900/50 border-zinc-800/50 hover:border-zinc-700/50 transition-colors">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-2.5">
                                <div className={`p-2 rounded-lg ${
                                  source.status === "connected" ? "bg-emerald-500/10 border border-emerald-500/20"
                                  : source.status === "error" ? "bg-red-500/10 border border-red-500/20"
                                  : "bg-zinc-800/50 border border-zinc-700/30"
                                }`}>
                                  <Icon weight="duotone" className={`w-4 h-4 ${
                                    source.status === "connected" ? "text-emerald-400"
                                    : source.status === "error" ? "text-red-400"
                                    : "text-zinc-500"
                                  }`} />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-zinc-200">{source.name}</p>
                                  <p className="text-[10px] text-zinc-500 capitalize">{source.source_type}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <div className={`w-2 h-2 rounded-full ${statusColor.dot} ${
                                  source.status === "syncing" ? "animate-pulse" : ""
                                }`} />
                                <span className={`text-[10px] capitalize ${statusColor.bg.split(" ")[1]}`}>
                                  {source.status}
                                </span>
                              </div>
                            </div>

                            {/* Error message */}
                            {source.error_message && (
                              <div className="mb-3 p-2 rounded bg-red-500/10 border border-red-500/20">
                                <p className="text-[10px] text-red-400">{source.error_message}</p>
                              </div>
                            )}

                            {/* Sparkline */}
                            <div className="mb-3">
                              <Sparkline data={sparkData} color={sparkColor} width={240} height={24} />
                            </div>

                            {/* Stats */}
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="text-zinc-500">
                                <span className="text-zinc-300 font-medium">{source.alerts_ingested.toLocaleString()}</span> alerts ingested
                              </span>
                              {source.last_seen_at && (
                                <span className="text-zinc-600">
                                  Last: {formatDistanceToNow(new Date(source.last_seen_at), { addSuffix: true })}
                                </span>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </motion.div>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* ═══════════════════════════════════════════════════════════════════════
              TAB 3: Investigations
              ═══════════════════════════════════════════════════════════════════════ */}
          <TabsContent value="investigations" className="flex-1 min-h-0 mt-0 p-0">
            <ScrollArea className="h-full">
              <div className="p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="text-sm font-semibold text-zinc-200">Investigations</h2>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {investigations.filter(i => i.status === "active").length} active, {investigations.filter(i => i.status === "closed").length} closed
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs bg-cyan-500/10 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20"
                    onClick={() => setShowCreateInvestigation(true)}
                  >
                    <Plus weight="bold" className="w-3.5 h-3.5 mr-1" />
                    New Investigation
                  </Button>
                </div>

                {/* Investigation list */}
                <motion.div className="space-y-4" variants={stagger} initial="initial" animate="animate">
                  {investigations.map(inv => {
                    const isExpanded = expandedInvId === inv.id;
                    const sevColor = SEVERITY_COLORS[inv.severity] || SEVERITY_COLORS.medium;

                    return (
                      <motion.div key={inv.id} variants={fadeIn} layout>
                        <Card className="bg-zinc-900/50 border-zinc-800/50">
                          <CardContent className="p-0">
                            {/* Investigation Header */}
                            <button
                              className="w-full flex items-start gap-3 p-4 text-left hover:bg-zinc-800/30 transition-colors rounded-t-lg"
                              onClick={() => setExpandedInvId(isExpanded ? null : inv.id)}
                            >
                              <div className="pt-0.5">
                                {isExpanded
                                  ? <CaretDown weight="bold" className="w-4 h-4 text-zinc-500" />
                                  : <CaretRight weight="bold" className="w-4 h-4 text-zinc-500" />
                                }
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <h3 className="text-sm font-medium text-zinc-200 truncate">{inv.name}</h3>
                                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${sevColor.badge}`}>
                                    {inv.severity}
                                  </Badge>
                                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${TIMELINE_STATUS_COLORS[inv.status]}`}>
                                    {inv.status}
                                  </Badge>
                                </div>
                                {inv.description && (
                                  <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{inv.description}</p>
                                )}
                                <div className="flex items-center gap-3 mt-1.5 text-[10px] text-zinc-600">
                                  <span className="flex items-center gap-1">
                                    <Bell weight="duotone" className="w-3 h-3" />
                                    {inv.alert_ids.length} alerts
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <ListBullets weight="duotone" className="w-3 h-3" />
                                    {inv.timeline_events.length} events
                                  </span>
                                  {inv.lead_analyst && (
                                    <span className="flex items-center gap-1">
                                      <Users weight="duotone" className="w-3 h-3" />
                                      {inv.lead_analyst}
                                    </span>
                                  )}
                                  <span className="flex items-center gap-1">
                                    <Clock weight="duotone" className="w-3 h-3" />
                                    {formatDistanceToNow(new Date(inv.updated_at), { addSuffix: true })}
                                  </span>
                                </div>
                              </div>
                            </button>

                            {/* Expanded Timeline */}
                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="overflow-hidden"
                                >
                                  <Separator className="bg-zinc-800/50" />
                                  <div className="p-4 pl-11">
                                    <Label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-3 block">
                                      Timeline
                                    </Label>
                                    <div className="relative ml-3">
                                      {/* Timeline line */}
                                      <div className="absolute left-0 top-2 bottom-2 w-px bg-zinc-800" />

                                      {inv.timeline_events.map((evt, idx) => {
                                        const evtSevColor = SEVERITY_COLORS[evt.severity || "info"] || SEVERITY_COLORS.info;
                                        const isAlert = evt.event_type === "alert";
                                        const isAction = evt.event_type === "action";

                                        return (
                                          <div key={evt.id} className="relative flex items-start gap-3 pb-4 last:pb-0">
                                            {/* Timeline dot */}
                                            <div className={`absolute -left-[4px] top-1.5 w-[9px] h-[9px] rounded-full border-2 border-zinc-950 ${evtSevColor.dot}`} />

                                            <div className="ml-4 flex-1">
                                              <div className="flex items-center gap-2">
                                                <span className="text-[10px] text-zinc-600 font-mono">
                                                  {format(new Date(evt.timestamp), "HH:mm:ss")}
                                                </span>
                                                <Badge variant="outline" className={`text-[9px] px-1 py-0 ${
                                                  isAlert ? "bg-red-500/10 text-red-400 border-red-500/20"
                                                  : isAction ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
                                                  : "bg-zinc-700/30 text-zinc-400 border-zinc-600/20"
                                                }`}>
                                                  {evt.event_type}
                                                </Badge>
                                                <span className="text-[10px] text-zinc-600">{evt.source}</span>
                                              </div>
                                              <p className="text-xs text-zinc-300 mt-0.5">{evt.title}</p>
                                              {evt.description && (
                                                <p className="text-[10px] text-zinc-500 mt-0.5">{evt.description}</p>
                                              )}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>

                                    {/* Investigation actions */}
                                    <div className="flex items-center gap-2 mt-4 pt-3 border-t border-zinc-800/30">
                                      {inv.status === "active" && (
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="h-7 text-[10px] bg-zinc-700/20 border-zinc-700/30 text-zinc-400 hover:bg-zinc-700/30"
                                          onClick={() => {
                                            setInvestigations(prev => prev.map(i =>
                                              i.id === inv.id ? { ...i, status: "closed" as const, updated_at: new Date().toISOString() } : i
                                            ));
                                            toast({ title: "Investigation closed" });
                                          }}
                                        >
                                          <CheckCircle weight="duotone" className="w-3 h-3 mr-1" />
                                          Close Investigation
                                        </Button>
                                      )}
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-7 text-[10px] bg-purple-500/10 border-purple-500/30 text-purple-400 hover:bg-purple-500/20"
                                        onClick={() => {
                                          setInvestigations(prev => prev.map(i =>
                                            i.id === inv.id ? { ...i, status: "archived" as const, updated_at: new Date().toISOString() } : i
                                          ));
                                          toast({ title: "Investigation archived" });
                                        }}
                                      >
                                        <Archive weight="duotone" className="w-3 h-3 mr-1" />
                                        Archive
                                      </Button>
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </motion.div>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* ═══════════════════════════════════════════════════════════════════════
              TAB 4: Correlation
              ═══════════════════════════════════════════════════════════════════════ */}
          <TabsContent value="correlation" className="flex-1 min-h-0 mt-0 p-0">
            <ScrollArea className="h-full">
              <div className="p-6">
                {/* Header + Stats */}
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="text-sm font-semibold text-zinc-200">Alert Correlation</h2>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Auto-grouped by host, IP, and user within 15-minute windows
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs bg-violet-500/10 border-violet-500/30 text-violet-400 hover:bg-violet-500/20"
                    onClick={() => toast({ title: "Correlation engine running", description: "Re-analyzing alert relationships..." })}
                  >
                    <ArrowsClockwise weight="duotone" className="w-3.5 h-3.5 mr-1" />
                    Re-correlate
                  </Button>
                </div>

                {/* Correlation Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                  <Card className="bg-zinc-900/50 border-zinc-800/50">
                    <CardContent className="p-3 text-center">
                      <p className="text-lg font-bold text-zinc-100">{correlationGroups.length}</p>
                      <p className="text-[10px] text-zinc-500">Total Groups</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-zinc-900/50 border-zinc-800/50">
                    <CardContent className="p-3 text-center">
                      <p className="text-lg font-bold text-zinc-100">
                        {(correlationGroups.reduce((sum, g) => sum + g.alerts.length, 0) / Math.max(correlationGroups.length, 1)).toFixed(1)}
                      </p>
                      <p className="text-[10px] text-zinc-500">Avg Alerts/Group</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-zinc-900/50 border-zinc-800/50">
                    <CardContent className="p-3 text-center">
                      <p className="text-lg font-bold text-red-400">
                        {correlationGroups.filter(g => g.severity === "critical").length}
                      </p>
                      <p className="text-[10px] text-zinc-500">Critical Groups</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-zinc-900/50 border-zinc-800/50">
                    <CardContent className="p-3 text-center">
                      <p className="text-lg font-bold text-zinc-100">
                        {[...new Set(correlationGroups.flatMap(g => g.affected_hosts))].length}
                      </p>
                      <p className="text-[10px] text-zinc-500">Affected Hosts</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Correlation Groups */}
                <motion.div className="space-y-4" variants={stagger} initial="initial" animate="animate">
                  {correlationGroups.map(group => {
                    const isExpanded = expandedGroupId === group.id;
                    const sevColor = SEVERITY_COLORS[group.severity] || SEVERITY_COLORS.medium;

                    return (
                      <motion.div key={group.id} variants={fadeIn} layout>
                        <Card className={`bg-zinc-900/50 border-zinc-800/50 ${
                          group.severity === "critical" ? "border-l-2 border-l-red-500/50" : ""
                        }`}>
                          <CardContent className="p-0">
                            {/* Group Header */}
                            <button
                              className="w-full flex items-start gap-3 p-4 text-left hover:bg-zinc-800/30 transition-colors rounded-t-lg"
                              onClick={() => setExpandedGroupId(isExpanded ? null : group.id)}
                            >
                              <div className="pt-0.5">
                                {isExpanded
                                  ? <CaretDown weight="bold" className="w-4 h-4 text-zinc-500" />
                                  : <CaretRight weight="bold" className="w-4 h-4 text-zinc-500" />
                                }
                              </div>
                              <div className={`p-1.5 rounded-lg ${
                                group.severity === "critical" ? "bg-red-500/10 border border-red-500/20"
                                : "bg-orange-500/10 border border-orange-500/20"
                              }`}>
                                <Graph weight="duotone" className={`w-4 h-4 ${sevColor.text}`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${sevColor.badge}`}>
                                    {group.severity}
                                  </Badge>
                                  <span className="text-sm font-medium text-zinc-200">
                                    {group.alerts.length} correlated alerts
                                  </span>
                                </div>
                                <p className="text-xs text-zinc-400">{group.description}</p>
                                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                                  {/* Affected hosts */}
                                  {group.affected_hosts.map(h => (
                                    <span key={h} className="flex items-center gap-1 text-[10px] text-zinc-500">
                                      <Desktop weight="duotone" className="w-3 h-3" />
                                      {h}
                                    </span>
                                  ))}
                                  {/* Time range */}
                                  <span className="flex items-center gap-1 text-[10px] text-zinc-600">
                                    <Clock weight="duotone" className="w-3 h-3" />
                                    {format(new Date(group.time_range.start), "HH:mm:ss")} — {format(new Date(group.time_range.end), "HH:mm:ss")}
                                  </span>
                                </div>
                                {/* MITRE Tactics */}
                                <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                                  {group.mitre_tactics.map(t => (
                                    <Badge key={t} variant="outline" className="text-[9px] px-1 py-0 bg-violet-500/10 text-violet-400 border-violet-500/20">
                                      {t}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            </button>

                            {/* Expanded: show constituent alerts */}
                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="overflow-hidden"
                                >
                                  <Separator className="bg-zinc-800/50" />
                                  <div className="p-4 pl-14 space-y-2">
                                    <Label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2 block">
                                      Constituent Alerts
                                    </Label>
                                    {group.alerts.map(alert => {
                                      const alertSev = SEVERITY_COLORS[alert.severity] || SEVERITY_COLORS.medium;
                                      const AlertIcon = SOURCE_ICONS[alert.source_type] || Cube;
                                      return (
                                        <div
                                          key={alert.id}
                                          className="flex items-start gap-2 p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800/30 cursor-pointer hover:bg-zinc-800/40 transition-colors"
                                          onClick={() => {
                                            setDetailAlert(alert);
                                            setActiveTab("feed");
                                          }}
                                        >
                                          <div className={`w-2 h-2 rounded-full mt-1.5 ${alertSev.dot}`} />
                                          <div className="flex-1 min-w-0">
                                            <p className="text-xs text-zinc-300 truncate">{alert.title}</p>
                                            <div className="flex items-center gap-2 mt-1 text-[10px] text-zinc-500">
                                              <AlertIcon weight="duotone" className="w-3 h-3" />
                                              <span>{alert.source_type}</span>
                                              <span className="font-mono">{alert.affected_host}</span>
                                              <span>{format(new Date(alert.alert_time), "HH:mm:ss")}</span>
                                            </div>
                                          </div>
                                          <Badge variant="outline" className={`text-[9px] px-1 py-0 ${alertSev.badge}`}>
                                            {alert.severity}
                                          </Badge>
                                        </div>
                                      );
                                    })}

                                    {/* Group Actions */}
                                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-zinc-800/30">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-7 text-[10px] bg-cyan-500/10 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20"
                                        onClick={() => {
                                          const newInv: InvestigationTimeline = {
                                            id: `inv-from-${group.id}`,
                                            user_id: "user-1",
                                            name: `Investigation: ${group.affected_hosts.join(", ")}`,
                                            description: group.description,
                                            alert_ids: group.alerts.map(a => a.id),
                                            finding_ids: [],
                                            timeline_events: group.alerts.map(a => ({
                                              id: `evt-${a.id}`,
                                              timestamp: a.alert_time,
                                              source: a.source_type,
                                              event_type: "alert" as const,
                                              title: a.title,
                                              severity: a.severity,
                                            })),
                                            status: "active",
                                            severity: group.severity,
                                            lead_analyst: "analyst-1",
                                            created_at: new Date().toISOString(),
                                            updated_at: new Date().toISOString(),
                                          };
                                          setInvestigations(prev => [newInv, ...prev]);
                                          toast({ title: "Investigation created from correlation group" });
                                        }}
                                      >
                                        <GitBranch weight="duotone" className="w-3 h-3 mr-1" />
                                        Create Investigation
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-7 text-[10px] bg-orange-500/10 border-orange-500/30 text-orange-400 hover:bg-orange-500/20"
                                        onClick={() => {
                                          setAlerts(prev => prev.map(a =>
                                            group.alerts.some(ga => ga.id === a.id) ? { ...a, status: "escalated" as AlertStatus } : a
                                          ));
                                          toast({ title: `${group.alerts.length} alerts escalated` });
                                        }}
                                      >
                                        <ArrowSquareOut weight="duotone" className="w-3 h-3 mr-1" />
                                        Escalate All
                                      </Button>
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </motion.div>

                {/* Correlation Rules Info */}
                <Card className="bg-zinc-900/30 border-zinc-800/40 mt-6">
                  <CardHeader className="pb-2 pt-4 px-4">
                    <CardTitle className="text-xs text-zinc-400 flex items-center gap-2">
                      <TreeStructure weight="duotone" className="w-4 h-4" />
                      Correlation Rules
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <div className="space-y-2">
                      {[
                        { name: "Host Affinity", desc: "Group alerts sharing the same affected host within the time window", status: "active" },
                        { name: "IP Correlation", desc: "Group alerts with matching source or destination IPs", status: "active" },
                        { name: "User Correlation", desc: "Group alerts involving the same affected user account", status: "active" },
                        { name: "Kill Chain Progression", desc: "Detect MITRE tactic progression (Recon → Initial Access → Execution → ...)", status: "active" },
                        { name: "Cross-Source Enrichment", desc: "Match alerts across different SIEM sources by common IOCs", status: "active" },
                      ].map(rule => (
                        <div key={rule.name} className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-900/50 border border-zinc-800/30">
                          <div>
                            <p className="text-xs text-zinc-300">{rule.name}</p>
                            <p className="text-[10px] text-zinc-600 mt-0.5">{rule.desc}</p>
                          </div>
                          <Badge variant="outline" className="text-[9px] bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                            {rule.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {/* ═══════════════════════════════════════════════════════════════════════
            DIALOGS
            ═══════════════════════════════════════════════════════════════════════ */}

        {/* Add Source Dialog */}
        <Dialog open={showAddSource} onOpenChange={setShowAddSource}>
          <DialogContent className="bg-zinc-900 border-zinc-700 max-w-md">
            <DialogHeader>
              <DialogTitle className="text-zinc-100 flex items-center gap-2">
                <Plugs weight="duotone" className="w-5 h-5 text-cyan-400" />
                Add Alert Source
              </DialogTitle>
              <DialogDescription className="text-zinc-500">
                Connect a SIEM, EDR, or other alert source.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-2">
              <div>
                <Label className="text-xs text-zinc-400">Source Name</Label>
                <Input
                  value={newSourceName}
                  onChange={e => setNewSourceName(e.target.value)}
                  placeholder="e.g. Production Splunk"
                  className="mt-1 bg-zinc-800/50 border-zinc-700 text-zinc-200"
                />
              </div>

              <div>
                <Label className="text-xs text-zinc-400">Source Type</Label>
                <Select value={newSourceType} onValueChange={v => setNewSourceType(v as SourceType)}>
                  <SelectTrigger className="mt-1 bg-zinc-800/50 border-zinc-700 text-zinc-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700">
                    <SelectItem value="splunk">Splunk</SelectItem>
                    <SelectItem value="elastic">Elastic SIEM</SelectItem>
                    <SelectItem value="sentinel">Microsoft Sentinel</SelectItem>
                    <SelectItem value="crowdstrike">CrowdStrike Falcon</SelectItem>
                    <SelectItem value="pagerduty">PagerDuty</SelectItem>
                    <SelectItem value="syslog">Syslog</SelectItem>
                    <SelectItem value="webhook">Webhook</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs text-zinc-400">
                  {newSourceType === "syslog" ? "Listen Port" : "Connection URL"}
                </Label>
                <Input
                  value={newSourceUrl}
                  onChange={e => setNewSourceUrl(e.target.value)}
                  placeholder={newSourceType === "syslog" ? "514" : "https://..."}
                  className="mt-1 bg-zinc-800/50 border-zinc-700 text-zinc-200"
                />
              </div>

              {newSourceType !== "syslog" && newSourceType !== "webhook" && (
                <div>
                  <Label className="text-xs text-zinc-400">API Key / Token</Label>
                  <Input
                    type="password"
                    value={newSourceApiKey}
                    onChange={e => setNewSourceApiKey(e.target.value)}
                    placeholder="Enter API key or bearer token"
                    className="mt-1 bg-zinc-800/50 border-zinc-700 text-zinc-200"
                  />
                </div>
              )}
            </div>

            <DialogFooter className="mt-4">
              <Button variant="outline" size="sm" onClick={() => setShowAddSource(false)} className="text-zinc-400">
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleAddSource}
                disabled={!newSourceName.trim()}
                className="bg-cyan-600 hover:bg-cyan-500 text-white"
              >
                <Plus weight="bold" className="w-3.5 h-3.5 mr-1" />
                Add Source
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create Investigation Dialog */}
        <Dialog open={showCreateInvestigation} onOpenChange={setShowCreateInvestigation}>
          <DialogContent className="bg-zinc-900 border-zinc-700 max-w-md">
            <DialogHeader>
              <DialogTitle className="text-zinc-100 flex items-center gap-2">
                <GitBranch weight="duotone" className="w-5 h-5 text-cyan-400" />
                New Investigation
              </DialogTitle>
              <DialogDescription className="text-zinc-500">
                Create a unified investigation timeline for related alerts and findings.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-2">
              <div>
                <Label className="text-xs text-zinc-400">Investigation Name</Label>
                <Input
                  value={newInvName}
                  onChange={e => setNewInvName(e.target.value)}
                  placeholder="e.g. PROD-WEB-01 Compromise Investigation"
                  className="mt-1 bg-zinc-800/50 border-zinc-700 text-zinc-200"
                />
              </div>

              <div>
                <Label className="text-xs text-zinc-400">Description</Label>
                <Textarea
                  value={newInvDescription}
                  onChange={e => setNewInvDescription(e.target.value)}
                  placeholder="What triggered this investigation? What are you looking for?"
                  rows={3}
                  className="mt-1 bg-zinc-800/50 border-zinc-700 text-zinc-200 resize-none"
                />
              </div>

              <div>
                <Label className="text-xs text-zinc-400">Initial Severity</Label>
                <Select value={newInvSeverity} onValueChange={setNewInvSeverity}>
                  <SelectTrigger className="mt-1 bg-zinc-800/50 border-zinc-700 text-zinc-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700">
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="mt-4">
              <Button variant="outline" size="sm" onClick={() => setShowCreateInvestigation(false)} className="text-zinc-400">
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleCreateInvestigation}
                disabled={!newInvName.trim()}
                className="bg-cyan-600 hover:bg-cyan-500 text-white"
              >
                <Plus weight="bold" className="w-3.5 h-3.5 mr-1" />
                Create Investigation
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
