/**
 * ISM — Information Security Management
 * Unified Mission Center: Cases, SLA, Assignment, Compliance.
 * Everything flows through here.
 */

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  ismCaseService,
  type ISMCase, type CaseType, type CaseStatus, type CasePriority,
  type CaseSeverity, type CreateCaseData, type CaseStats,
} from "@/services/ism-case";
import { UilShieldCheck, UilPlus, UilSearch, UilClock, UilExclamationTriangle, UilHeartRate, UilFire, UilUser, UilAngleRight, UilTicket, UilChartBar, UilSync } from "@iconscout/react-unicons";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow, format } from "date-fns";

// ─── Priority Config ──────────────────────────────────────────────────────────

const PRIORITY_CONFIG: Record<CasePriority, { label: string; color: string; bgColor: string }> = {
  P1: { label: "P1 Critical", color: "text-red-400", bgColor: "bg-red-500/15" },
  P2: { label: "P2 High", color: "text-orange-400", bgColor: "bg-orange-500/15" },
  P3: { label: "P3 Medium", color: "text-yellow-400", bgColor: "bg-yellow-500/15 border-yellow-500/30" },
  P4: { label: "P4 Low", color: "text-blue-400", bgColor: "bg-blue-500/15" },
  P5: { label: "P5 Info", color: "text-zinc-400", bgColor: "bg-zinc-500/15 border-zinc-500/30" },
};

const CASE_TYPES: { value: CaseType; label: string }[] = [
  { value: "incident", label: "Incident" },
  { value: "vulnerability", label: "Vulnerability" },
  { value: "pentest", label: "Pentest" },
  { value: "threat_hunt", label: "Threat Hunt" },
  { value: "compliance_audit", label: "Compliance Audit" },
  { value: "change_request", label: "Change Request" },
  { value: "risk_assessment", label: "Risk Assessment" },
  { value: "forensic", label: "Forensics" },
  { value: "general", label: "General" },
];

const STATUS_LABELS: Record<CaseStatus, string> = {
  new: "New",
  triaging: "Triaging",
  assigned: "Assigned",
  in_progress: "In Progress",
  pending_review: "Review",
  escalated: "Escalated",
  on_hold: "On Hold",
  resolved: "Resolved",
  closed: "Closed",
  reopened: "Reopened",
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function ISM() {
  const { toast } = useToast();
  const [cases, setCases] = useState<ISMCase[]>([]);
  const [stats, setStats] = useState<CaseStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [showCreate, setShowCreate] = useState(false);
  const [selectedCase, setSelectedCase] = useState<ISMCase | null>(null);

  // New case form
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newType, setNewType] = useState<CaseType>("incident");
  const [newPriority, setNewPriority] = useState<CasePriority>("P3");
  const [newSeverity, setNewSeverity] = useState<CaseSeverity>("medium");
  const [newAssignee, setNewAssignee] = useState("");
  const [newTags, setNewTags] = useState("");

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const filters: Record<string, unknown> = {};
      if (filterStatus !== "all") filters.status = filterStatus;
      if (filterPriority !== "all") filters.priority = filterPriority;
      if (filterType !== "all") filters.case_type = filterType;
      if (search) filters.search = search;

      const [casesData, statsData] = await Promise.all([
        ismCaseService.getAll(filters as any),
        ismCaseService.getStats(),
      ]);
      setCases(casesData);
      setStats(statsData);
    } catch (err) {
      toast({ title: "Failed to load cases", description: String(err), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterPriority, filterType, search, toast]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    try {
      const data: CreateCaseData = {
        title: newTitle.trim(),
        description: newDescription.trim() || undefined,
        case_type: newType,
        priority: newPriority,
        severity: newSeverity,
        assigned_to: newAssignee.trim() || undefined,
        tags: newTags.split(",").map(t => t.trim()).filter(Boolean),
      };
      const created = await ismCaseService.create(data);
      toast({ title: `Case ${created.case_number} created` });
      setShowCreate(false);
      resetForm();
      loadData();
    } catch (err) {
      toast({ title: "Failed to create case", description: String(err), variant: "destructive" });
    }
  };

  const handleTransition = async (id: string, newStatus: CaseStatus) => {
    try {
      await ismCaseService.transition(id, newStatus, "operator");
      toast({ title: `Status updated to ${STATUS_LABELS[newStatus]}` });
      loadData();
      if (selectedCase?.id === id) {
        setSelectedCase(await ismCaseService.getById(id));
      }
    } catch (err) {
      toast({ title: "Transition failed", description: String(err), variant: "destructive" });
    }
  };

  const resetForm = () => {
    setNewTitle("");
    setNewDescription("");
    setNewType("incident");
    setNewPriority("P3");
    setNewSeverity("medium");
    setNewAssignee("");
    setNewTags("");
  };

  // ─── Metrics Cards ──────────────────────────────────────────────────────────

  const MetricsBar = () => {
    if (!stats) return null;
    const metrics = [
      { label: "Total Cases", value: stats.total, icon: UilTicket, color: "text-zinc-300" },
      { label: "Open", value: stats.open_cases, icon: UilHeartRate, color: "text-blue-400" },
      { label: "SLA Breached", value: stats.sla_breached, icon: UilExclamationTriangle, color: stats.sla_breached > 0 ? "text-red-400" : "text-zinc-500" },
      { label: "P1 Critical", value: stats.by_priority?.P1 || 0, icon: UilFire, color: (stats.by_priority?.P1 || 0) > 0 ? "text-red-400" : "text-zinc-500" },
      { label: "MTTR", value: `${stats.mttr_hours}h`, icon: UilClock, color: "text-cyan-400" },
    ];

    return (
      <div className="grid grid-cols-5 gap-3 mb-6">
        {metrics.map((m) => (
          <Card key={m.label} className="bg-zinc-900/60 border-zinc-800/60">
            <CardContent className="p-4 flex items-center gap-3">
              <m.icon size={20} className={m.color} />
              <div>
                <p className="text-[11px] text-zinc-500 uppercase tracking-wider">{m.label}</p>
                <p className={`text-lg font-bold ${m.color}`}>{m.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  // ─── Priority Distribution ──────────────────────────────────────────────────

  const PriorityBar = () => {
    if (!stats || stats.total === 0) return null;
    const priorities: CasePriority[] = ["P1", "P2", "P3", "P4", "P5"];
    const colors = ["bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-blue-500", "bg-zinc-500"];

    return (
      <div className="mb-4">
        <div className="flex h-2 rounded-full overflow-hidden bg-zinc-800">
          {priorities.map((p, i) => {
            const count = stats.by_priority?.[p] || 0;
            const pct = (count / stats.total) * 100;
            if (pct === 0) return null;
            return (
              <div
                key={p}
                className={`${colors[i]} transition-all duration-500`}
                style={{ width: `${pct}%` }}
                title={`${p}: ${count} cases (${Math.round(pct)}%)`}
              />
            );
          })}
        </div>
        <div className="flex justify-between mt-1">
          {priorities.map((p, i) => (
            <span key={p} className="text-[10px] text-zinc-600">
              {p}: {stats.by_priority?.[p] || 0}
            </span>
          ))}
        </div>
      </div>
    );
  };

  // ─── Case Row ───────────────────────────────────────────────────────────────

  const CaseRow = ({ c }: { c: ISMCase }) => {
    const priorityCfg = PRIORITY_CONFIG[c.priority];
    const isBreached = c.sla_breached;
    const slaDeadline = c.sla_resolution_deadline ? new Date(c.sla_resolution_deadline) : null;
    const slaRemaining = slaDeadline ? slaDeadline.getTime() - Date.now() : null;
    const slaUrgent = slaRemaining !== null && slaRemaining > 0 && slaRemaining < 3600000; // < 1hr

    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors hover:bg-white/[0.02] ${
          isBreached ? "border-red-500/30 bg-red-500/[0.03]" :
          slaUrgent ? "border-yellow-500/20 bg-yellow-500/[0.02]" :
          "border-zinc-800/60 bg-zinc-900/40"
        }`}
        onClick={() => setSelectedCase(c)}
      >
        {/* Priority badge */}
        <Badge variant="outline" className={`text-[10px] font-mono px-1.5 py-0.5 ${priorityCfg.bgColor} ${priorityCfg.color} border`}>
          {c.priority}
        </Badge>

        {/* Case number + title */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-zinc-500 font-mono">{c.case_number}</span>
            <span className="text-sm text-zinc-200 truncate">{c.title}</span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] text-zinc-600">{ismCaseService.getTypeLabel(c.case_type)}</span>
            {c.affected_assets?.length > 0 && (
              <span className="text-[10px] text-zinc-600">| {c.affected_assets[0]}</span>
            )}
            {c.assigned_to && (
              <span className="text-[10px] text-cyan-500/70 flex items-center gap-0.5">
                <UilUser size={8} /> {c.assigned_to}
              </span>
            )}
          </div>
        </div>

        {/* Status */}
        <Badge variant="outline" className={`text-[10px] ${ismCaseService.getStatusColor(c.status)}`}>
          {STATUS_LABELS[c.status]}
        </Badge>

        {/* SLA indicator */}
        {slaDeadline && !["resolved", "closed"].includes(c.status) && (
          <div className={`text-[10px] font-mono ${
            isBreached ? "text-red-400" : slaUrgent ? "text-yellow-400" : "text-zinc-500"
          }`}>
            {isBreached ? "BREACHED" :
             slaRemaining && slaRemaining > 0 ?
               formatDistanceToNow(slaDeadline, { addSuffix: false }) :
               "EXPIRED"
            }
          </div>
        )}

        {/* Age */}
        <span className="text-[10px] text-zinc-600 whitespace-nowrap">
          {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
        </span>

        <UilAngleRight size={14} className="text-zinc-600" />
      </motion.div>
    );
  };

  // ─── Case Detail Panel ──────────────────────────────────────────────────────

  const CaseDetail = ({ c }: { c: ISMCase }) => {
    const priorityCfg = PRIORITY_CONFIG[c.priority];

    const getNextActions = (): { label: string; status: CaseStatus; variant: "default" | "outline" }[] => {
      const transitions: Record<CaseStatus, { label: string; status: CaseStatus; variant: "default" | "outline" }[]> = {
        new: [
          { label: "Start Triage", status: "triaging", variant: "default" },
          { label: "Assign", status: "assigned", variant: "outline" },
        ],
        triaging: [
          { label: "Assign", status: "assigned", variant: "default" },
          { label: "Escalate", status: "escalated", variant: "outline" },
        ],
        assigned: [
          { label: "Start Work", status: "in_progress", variant: "default" },
          { label: "Hold", status: "on_hold", variant: "outline" },
        ],
        in_progress: [
          { label: "Submit for Review", status: "pending_review", variant: "default" },
          { label: "Resolve", status: "resolved", variant: "outline" },
        ],
        pending_review: [
          { label: "Approve & Resolve", status: "resolved", variant: "default" },
          { label: "Return", status: "in_progress", variant: "outline" },
        ],
        escalated: [
          { label: "Assign", status: "assigned", variant: "default" },
          { label: "Resolve", status: "resolved", variant: "outline" },
        ],
        on_hold: [
          { label: "Resume", status: "in_progress", variant: "default" },
        ],
        resolved: [
          { label: "Close", status: "closed", variant: "default" },
          { label: "Reopen", status: "reopened", variant: "outline" },
        ],
        closed: [
          { label: "Reopen", status: "reopened", variant: "outline" },
        ],
        reopened: [
          { label: "Start Work", status: "in_progress", variant: "default" },
        ],
      };
      return transitions[c.status] || [];
    };

    return (
      <Dialog open={!!selectedCase} onOpenChange={() => setSelectedCase(null)}>
        <DialogContent className="max-w-2xl bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={`${priorityCfg.bgColor} ${priorityCfg.color}`}>
                {c.priority}
              </Badge>
              <Badge variant="outline" className={ismCaseService.getStatusColor(c.status)}>
                {STATUS_LABELS[c.status]}
              </Badge>
              <span className="text-xs text-zinc-500 font-mono">{c.case_number}</span>
            </div>
            <DialogTitle className="text-lg">{c.title}</DialogTitle>
            {c.description && (
              <DialogDescription className="text-zinc-400 text-sm">{c.description}</DialogDescription>
            )}
          </DialogHeader>

          <div className="space-y-4">
            {/* Meta grid */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-zinc-500 text-xs">Type</span>
                <p className="text-zinc-300">{ismCaseService.getTypeLabel(c.case_type)}</p>
              </div>
              <div>
                <span className="text-zinc-500 text-xs">Severity</span>
                <p className="text-zinc-300 capitalize">{c.severity || "—"}</p>
              </div>
              <div>
                <span className="text-zinc-500 text-xs">Assigned To</span>
                <p className="text-zinc-300">{c.assigned_to || "Unassigned"}</p>
              </div>
              <div>
                <span className="text-zinc-500 text-xs">Source</span>
                <p className="text-zinc-300">{c.source || "Manual"}</p>
              </div>
              <div>
                <span className="text-zinc-500 text-xs">Created</span>
                <p className="text-zinc-300">{format(new Date(c.created_at), "PPp")}</p>
              </div>
              <div>
                <span className="text-zinc-500 text-xs">SLA Deadline</span>
                <p className={c.sla_breached ? "text-red-400 font-medium" : "text-zinc-300"}>
                  {c.sla_resolution_deadline
                    ? format(new Date(c.sla_resolution_deadline), "PPp")
                    : "—"}
                  {c.sla_breached && " (BREACHED)"}
                </p>
              </div>
            </div>

            {/* Affected assets */}
            {c.affected_assets?.length > 0 && (
              <div>
                <span className="text-zinc-500 text-xs">Affected Assets</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {c.affected_assets.map((a, i) => (
                    <Badge key={i} variant="outline" className="text-[10px] bg-zinc-800/50 border-zinc-700 text-zinc-300">
                      {a}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Tags */}
            {c.tags?.length > 0 && (
              <div>
                <span className="text-zinc-500 text-xs">Tags</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {c.tags.map((t, i) => (
                    <Badge key={i} variant="outline" className="text-[10px] bg-blue-500/10 border-blue-500/20 text-blue-400">
                      {t}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* MITRE */}
            {(c.mitre_tactics?.length > 0 || c.mitre_techniques?.length > 0) && (
              <div>
                <span className="text-zinc-500 text-xs">MITRE ATT&CK</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {c.mitre_tactics?.map((t, i) => (
                    <Badge key={`t-${i}`} variant="outline" className="text-[10px] bg-purple-500/10 border-purple-500/20 text-purple-400">
                      {t}
                    </Badge>
                  ))}
                  {c.mitre_techniques?.map((t, i) => (
                    <Badge key={`tech-${i}`} variant="outline" className="text-[10px] bg-violet-500/10 border-violet-500/20 text-violet-400">
                      {t}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Links */}
            <div className="flex gap-4 text-xs text-zinc-500">
              {c.alert_ids?.length > 0 && <span>{c.alert_ids.length} linked alert(s)</span>}
              {c.finding_ids?.length > 0 && <span>{c.finding_ids.length} linked finding(s)</span>}
              {c.mission_id && <span>Mission linked</span>}
              {c.report_id && <span>Report linked</span>}
            </div>

            <Separator className="bg-zinc-800" />

            {/* Actions */}
            <div className="flex gap-2 flex-wrap">
              {getNextActions().map((action) => (
                <Button
                  key={action.status}
                  variant={action.variant}
                  size="sm"
                  onClick={() => handleTransition(c.id, action.status)}
                  className="text-xs"
                >
                  {action.label}
                </Button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  // ─── Main Render ────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
            <UilShieldCheck size={28} className="text-green-400" />
            ISM — Mission Center
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Information Security Management — Unified Case Lifecycle
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadData} className="text-xs">
            <UilSync size={14} className="mr-1" /> Refresh
          </Button>
          <Button size="sm" onClick={() => setShowCreate(true)} className="text-xs bg-green-600 hover:bg-green-700">
            <UilPlus size={14} className="mr-1" /> New Case
          </Button>
        </div>
      </div>

      {/* Metrics */}
      <MetricsBar />
      <PriorityBar />

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <UilSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <Input
            placeholder="Search cases..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-zinc-900/60 border-zinc-800 text-sm h-9"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[140px] h-9 bg-zinc-900/60 border-zinc-800 text-sm">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-[120px] h-9 bg-zinc-900/60 border-zinc-800 text-sm">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            {(["P1", "P2", "P3", "P4", "P5"] as CasePriority[]).map((p) => (
              <SelectItem key={p} value={p}>{PRIORITY_CONFIG[p].label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[150px] h-9 bg-zinc-900/60 border-zinc-800 text-sm">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {CASE_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Case List */}
      <div className="space-y-2">
        {loading ? (
          <div className="text-center py-12 text-zinc-500">Loading cases...</div>
        ) : cases.length === 0 ? (
          <Card className="bg-zinc-900/40 border-zinc-800/60">
            <CardContent className="p-12 text-center">
              <UilShieldCheck size={48} className="text-zinc-700 mx-auto mb-3" />
              <p className="text-zinc-400 text-lg font-medium">No cases yet</p>
              <p className="text-zinc-600 text-sm mt-1">
                Create your first case or ingest alerts from your SIEM
              </p>
              <Button
                size="sm"
                onClick={() => setShowCreate(true)}
                className="mt-4 bg-green-600 hover:bg-green-700"
              >
                <UilPlus size={14} className="mr-1" /> Create Case
              </Button>
            </CardContent>
          </Card>
        ) : (
          <AnimatePresence>
            {cases.map((c) => (
              <CaseRow key={c.id} c={c} />
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Case Detail Dialog */}
      {selectedCase && <CaseDetail c={selectedCase} />}

      {/* Create Case Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UilPlus size={18} className="text-green-400" />
              New ISM Case
            </DialogTitle>
            <DialogDescription>Create a new security case for tracking and resolution.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="text-xs text-zinc-400">Title</Label>
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Brief description of the case"
                className="bg-zinc-900 border-zinc-800"
              />
            </div>

            <div>
              <Label className="text-xs text-zinc-400">Description</Label>
              <Textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Detailed description, context, evidence..."
                className="bg-zinc-900 border-zinc-800 min-h-[80px]"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs text-zinc-400">Type</Label>
                <Select value={newType} onValueChange={(v) => setNewType(v as CaseType)}>
                  <SelectTrigger className="bg-zinc-900 border-zinc-800">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CASE_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-zinc-400">Priority</Label>
                <Select value={newPriority} onValueChange={(v) => setNewPriority(v as CasePriority)}>
                  <SelectTrigger className="bg-zinc-900 border-zinc-800">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(["P1", "P2", "P3", "P4", "P5"] as CasePriority[]).map((p) => (
                      <SelectItem key={p} value={p}>{PRIORITY_CONFIG[p].label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-zinc-400">Severity</Label>
                <Select value={newSeverity} onValueChange={(v) => setNewSeverity(v as CaseSeverity)}>
                  <SelectTrigger className="bg-zinc-900 border-zinc-800">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(["critical", "high", "medium", "low", "info"] as CaseSeverity[]).map((s) => (
                      <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-xs text-zinc-400">Assign To</Label>
              <Input
                value={newAssignee}
                onChange={(e) => setNewAssignee(e.target.value)}
                placeholder="operator@team"
                className="bg-zinc-900 border-zinc-800"
              />
            </div>

            <div>
              <Label className="text-xs text-zinc-400">Tags (comma-separated)</Label>
              <Input
                value={newTags}
                onChange={(e) => setNewTags(e.target.value)}
                placeholder="incident, web-app, production"
                className="bg-zinc-900 border-zinc-800"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreate(false); resetForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!newTitle.trim()} className="bg-green-600 hover:bg-green-700">
              Create Case
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
