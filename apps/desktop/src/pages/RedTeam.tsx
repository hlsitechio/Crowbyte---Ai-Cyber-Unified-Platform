import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  redTeamService,
  type RedTeamOperation,
  type RedTeamFinding,
  type CreateOperationData,
  type CreateFindingData,
} from "@/services/red-team";
import { motion, AnimatePresence } from "framer-motion";
import { UilShield, UilFocusTarget, UilHeartRate, UilExclamationTriangle, UilPlus, UilTrashAlt, UilPlay, UilCheckCircle, UilAngleDown, UilAngleUp, UilPen, UilBug, UilTimesCircle, UilPause } from "@iconscout/react-unicons";
// --- Status / Severity helpers ---

const STATUS_CONFIG: Record<
  RedTeamOperation["status"],
  { color: string; label: string }
> = {
  planned: { color: "text-zinc-500", label: "Planned" },
  in_progress: { color: "text-amber-500", label: "In Progress" },
  completed: { color: "text-emerald-500", label: "Completed" },
  paused: { color: "text-blue-500", label: "Paused" },
  cancelled: { color: "text-red-500", label: "Cancelled" },
};

const STATUS_DOT: Record<RedTeamOperation["status"], string> = {
  planned: "bg-zinc-500",
  in_progress: "bg-amber-500",
  completed: "bg-emerald-500",
  paused: "bg-blue-500",
  cancelled: "bg-red-500",
};

const SEVERITY_CONFIG: Record<
  RedTeamFinding["severity"],
  { color: string; dot: string; label: string }
> = {
  critical: { color: "text-red-500", dot: "bg-red-500", label: "Critical" },
  high: { color: "text-orange-500", dot: "bg-orange-500", label: "High" },
  medium: { color: "text-amber-500", dot: "bg-amber-500", label: "Medium" },
  low: { color: "text-emerald-500", dot: "bg-emerald-500", label: "Low" },
  info: { color: "text-zinc-500", dot: "bg-zinc-500", label: "Info" },
};

const OPERATION_TYPES: { value: CreateOperationData["operation_type"]; label: string }[] = [
  { value: "pentest", label: "Penetration Test" },
  { value: "red_team", label: "Red Team Assessment" },
  { value: "vulnerability_assessment", label: "Vulnerability Assessment" },
  { value: "bug_bounty", label: "Bug Bounty" },
];

const FINDING_CATEGORIES: { value: CreateFindingData["category"]; label: string }[] = [
  { value: "injection", label: "Injection" },
  { value: "authentication", label: "Authentication" },
  { value: "authorization", label: "Authorization" },
  { value: "crypto", label: "Cryptography" },
  { value: "config", label: "Configuration" },
  { value: "other", label: "Other" },
];

// --- Stats Row ---

interface StatsRowProps {
  stats: {
    totalOperations: number;
    activeOperations: number;
    totalFindings: number;
    criticalFindings: number;
    highFindings: number;
  };
  loading: boolean;
}

function StatsRow({ stats, loading }: StatsRowProps) {
  if (loading) {
    return (
      <div className="flex items-center gap-8">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-28" />
        ))}
      </div>
    );
  }

  const items = [
    { label: "Total Operations", value: stats.totalOperations, color: "text-white" },
    { label: "Active", value: stats.activeOperations, color: "text-amber-500" },
    { label: "Total Findings", value: stats.totalFindings, color: "text-white" },
    { label: "Critical", value: stats.criticalFindings, color: "text-red-500" },
    { label: "High", value: stats.highFindings, color: "text-orange-500" },
  ];

  return (
    <div className="flex items-center gap-8 flex-wrap">
      {items.map((item) => (
        <div key={item.label} className="flex flex-col">
          <span className="text-xs text-muted-foreground">{item.label}</span>
          <span className={`text-xl font-bold ${item.color}`}>{item.value}</span>
        </div>
      ))}
    </div>
  );
}

// --- Finding Row ---

function FindingRow({
  finding,
  onDelete,
}: {
  finding: RedTeamFinding;
  onDelete: (id: string) => void;
}) {
  const sev = SEVERITY_CONFIG[finding.severity] || SEVERITY_CONFIG.info;
  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-md bg-transparent group">
      <div className="flex items-center gap-3 min-w-0">
        <span className={`h-2 w-2 rounded-full shrink-0 ${sev.dot}`} />
        <span className="text-sm text-white truncate">{finding.title}</span>
        <span className="text-xs text-muted-foreground shrink-0">{finding.category}</span>
        {finding.cvss_score != null && (
          <span className={`text-xs font-mono shrink-0 ${sev.color}`}>
            CVSS {finding.cvss_score.toFixed(1)}
          </span>
        )}
        <span className="text-xs text-muted-foreground shrink-0">
          {finding.status.replace("_", " ")}
        </span>
      </div>
      <Button
        size="sm"
        variant="ghost"
        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500"
        onClick={() => onDelete(finding.id)}
      >
        <UilTrashAlt size={14} />
      </Button>
    </div>
  );
}

// --- Operation Detail Panel ---

interface DetailPanelProps {
  operation: RedTeamOperation;
  findings: RedTeamFinding[];
  findingsLoading: boolean;
  onStatusChange: (status: RedTeamOperation["status"], progress?: number) => Promise<void>;
  onUpdate: (updates: Partial<CreateOperationData & { progress: number }>) => Promise<void>;
  onAddFinding: () => void;
  onDeleteFinding: (id: string) => void;
}

function DetailPanel({
  operation,
  findings,
  findingsLoading,
  onStatusChange,
  onUpdate,
  onAddFinding,
  onDeleteFinding,
}: DetailPanelProps) {
  const [editName, setEditName] = useState(operation.name);
  const [editTarget, setEditTarget] = useState(operation.target);
  const [editDesc, setEditDesc] = useState(operation.description || "");
  const [editProgress, setEditProgress] = useState(operation.progress);
  const [saving, setSaving] = useState(false);

  const hasChanges =
    editName !== operation.name ||
    editTarget !== operation.target ||
    editDesc !== (operation.description || "") ||
    editProgress !== operation.progress;

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdate({
        name: editName,
        target: editTarget,
        description: editDesc,
        progress: editProgress,
      });
    } finally {
      setSaving(false);
    }
  };

  const fmtDate = (d?: string) => {
    if (!d) return "\u2014";
    return new Date(d).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const statusCfg = STATUS_CONFIG[operation.status] || STATUS_CONFIG.planned;

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="overflow-hidden"
    >
      <div className="px-5 pb-5 space-y-5">
        {/* Divider */}
        <div className="border-t border-white/[0.06]" />

        {/* Editable fields */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs text-muted-foreground">Name</Label>
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="mt-1 terminal-text"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">UilFocusTarget</Label>
            <Input
              value={editTarget}
              onChange={(e) => setEditTarget(e.target.value)}
              className="mt-1 terminal-text"
            />
          </div>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Description</Label>
          <Textarea
            value={editDesc}
            onChange={(e) => setEditDesc(e.target.value)}
            className="mt-1 terminal-text min-h-16"
          />
        </div>
        <div className="w-48">
          <Label className="text-xs text-muted-foreground">Progress</Label>
          <Input
            type="number"
            min={0}
            max={100}
            value={editProgress}
            onChange={(e) => setEditProgress(Math.min(100, Math.max(0, Number(e.target.value))))}
            className="mt-1 terminal-text"
          />
        </div>

        {hasChanges && (
          <Button size="sm" onClick={handleSave} disabled={saving}>
            <UilPen size={14} className="mr-1" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        )}

        {/* Status actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground mr-2">
            Status: <span className={statusCfg.color}>{statusCfg.label}</span>
          </span>
          {operation.status === "planned" && (
            <Button size="sm" variant="outline" onClick={() => onStatusChange("in_progress")}>
              <UilPlay size={14} className="mr-1" />
              Start
            </Button>
          )}
          {operation.status === "in_progress" && (
            <>
              <Button size="sm" variant="outline" onClick={() => onStatusChange("paused")}>
                <UilPause size={14} className="mr-1" />
                Pause
              </Button>
              <Button size="sm" variant="outline" onClick={() => onStatusChange("completed", 100)}>
                <UilCheckCircle size={14} className="mr-1" />
                Complete
              </Button>
            </>
          )}
          {operation.status === "paused" && (
            <Button size="sm" variant="outline" onClick={() => onStatusChange("in_progress")}>
              <UilPlay size={14} className="mr-1" />
              Resume
            </Button>
          )}
          {(operation.status === "planned" || operation.status === "in_progress" || operation.status === "paused") && (
            <Button size="sm" variant="outline" onClick={() => onStatusChange("cancelled")}>
              <UilTimesCircle size={14} className="mr-1" />
              Cancel
            </Button>
          )}
        </div>

        {/* Read-only metadata */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div>
            <span className="text-muted-foreground">Planned Start</span>
            <p className="text-white">{fmtDate(operation.planned_start)}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Planned End</span>
            <p className="text-white">{fmtDate(operation.planned_end)}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Actual Start</span>
            <p className="text-white">{fmtDate(operation.actual_start)}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Actual End</span>
            <p className="text-white">{fmtDate(operation.actual_end)}</p>
          </div>
        </div>

        {operation.scope && (operation.scope as unknown[]).length > 0 && (
          <div className="text-xs">
            <span className="text-muted-foreground">Scope</span>
            <p className="text-white mt-1">{JSON.stringify(operation.scope)}</p>
          </div>
        )}

        {operation.exclusions && (operation.exclusions as unknown[]).length > 0 && (
          <div className="text-xs">
            <span className="text-muted-foreground">Exclusions</span>
            <p className="text-white mt-1">{JSON.stringify(operation.exclusions)}</p>
          </div>
        )}

        {operation.rules_of_engagement && (
          <div className="text-xs">
            <span className="text-muted-foreground">Rules of Engagement</span>
            <p className="text-white mt-1 whitespace-pre-wrap">{operation.rules_of_engagement}</p>
          </div>
        )}

        {operation.tags && operation.tags.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {operation.tags.map((tag) => (
              <span key={tag} className="text-xs text-muted-foreground px-2 py-0.5 rounded">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Findings list */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-white">Findings</span>
            <Button size="sm" variant="ghost" onClick={onAddFinding}>
              <UilPlus size={14} className="mr-1" />
              Add Finding
            </Button>
          </div>

          {findingsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : findings.length === 0 ? (
            <p className="text-xs text-muted-foreground py-3">No findings recorded yet.</p>
          ) : (
            <div className="space-y-1.5">
              {findings.map((f) => (
                <FindingRow key={f.id} finding={f} onDelete={onDeleteFinding} />
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// --- Main Component ---

const RedTeam = () => {
  const { toast } = useToast();
  const [operations, setOperations] = useState<RedTeamOperation[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalOperations: 0,
    activeOperations: 0,
    totalFindings: 0,
    criticalFindings: 0,
    highFindings: 0,
  });

  // Expanded operation
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedFindings, setExpandedFindings] = useState<RedTeamFinding[]>([]);
  const [findingsLoading, setFindingsLoading] = useState(false);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // Add operation dialog
  const [addOpDialogOpen, setAddOpDialogOpen] = useState(false);
  const [newOperation, setNewOperation] = useState<CreateOperationData>({
    name: "",
    target: "",
    operation_type: "pentest",
    description: "",
  });

  // Add finding dialog
  const [addFindingDialogOpen, setAddFindingDialogOpen] = useState(false);
  const [selectedOperationId, setSelectedOperationId] = useState("");
  const [newFinding, setNewFinding] = useState<CreateFindingData>({
    operation_id: "",
    title: "",
    description: "",
    severity: "medium",
    category: "other",
  });

  // --- Data loading ---

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [ops, s] = await Promise.all([
        redTeamService.getOperations(),
        redTeamService.getOperationStats(),
      ]);
      setOperations(ops);
      setStats(s);
    } catch (error: unknown) {
      toast({
        title: "Failed to load operations",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load findings when expanding
  const loadFindings = useCallback(
    async (operationId: string) => {
      setFindingsLoading(true);
      try {
        const f = await redTeamService.getFindings(operationId);
        setExpandedFindings(f);
      } catch (error: unknown) {
        toast({
          title: "Failed to load findings",
          description: error instanceof Error ? error.message : "Unknown error",
          variant: "destructive",
        });
      } finally {
        setFindingsLoading(false);
      }
    },
    [toast]
  );

  const toggleExpand = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      setExpandedFindings([]);
    } else {
      setExpandedId(id);
      loadFindings(id);
    }
  };

  // --- Handlers ---

  const handleAddOperation = async () => {
    if (!newOperation.name || !newOperation.target) {
      toast({
        title: "Validation Error",
        description: "Name and target are required",
        variant: "destructive",
      });
      return;
    }
    try {
      await redTeamService.createOperation(newOperation);
      toast({ title: "Operation created" });
      setAddOpDialogOpen(false);
      setNewOperation({ name: "", target: "", operation_type: "pentest", description: "" });
      loadData();
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create operation",
        variant: "destructive",
      });
    }
  };

  const handleDeleteOperation = async (id: string) => {
    try {
      await redTeamService.deleteOperation(id);
      toast({ title: "Operation deleted" });
      if (expandedId === id) {
        setExpandedId(null);
        setExpandedFindings([]);
      }
      loadData();
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete operation",
        variant: "destructive",
      });
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleStatusChange = async (
    operationId: string,
    status: RedTeamOperation["status"],
    progress?: number
  ) => {
    try {
      await redTeamService.updateOperationStatus(operationId, status, progress);
      toast({ title: `Status updated to ${STATUS_CONFIG[status].label}` });
      loadData();
      if (expandedId === operationId) loadFindings(operationId);
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update status",
        variant: "destructive",
      });
    }
  };

  const handleUpdateOperation = async (
    operationId: string,
    updates: Partial<CreateOperationData & { progress: number }>
  ) => {
    try {
      await redTeamService.updateOperation(operationId, updates);
      toast({ title: "Operation updated" });
      loadData();
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update operation",
        variant: "destructive",
      });
    }
  };

  const openAddFindingDialog = (operationId: string) => {
    setSelectedOperationId(operationId);
    setAddFindingDialogOpen(true);
  };

  const handleAddFinding = async () => {
    if (!newFinding.title || !newFinding.description) {
      toast({
        title: "Validation Error",
        description: "Title and description are required",
        variant: "destructive",
      });
      return;
    }
    try {
      await redTeamService.createFinding({
        ...newFinding,
        operation_id: selectedOperationId,
      });
      toast({ title: "Finding added" });
      setAddFindingDialogOpen(false);
      setNewFinding({
        operation_id: "",
        title: "",
        description: "",
        severity: "medium",
        category: "other",
      });
      setSelectedOperationId("");
      loadData();
      if (expandedId) loadFindings(expandedId);
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add finding",
        variant: "destructive",
      });
    }
  };

  const handleDeleteFinding = async (findingId: string) => {
    try {
      await redTeamService.deleteFinding(findingId);
      toast({ title: "Finding deleted" });
      loadData();
      if (expandedId) loadFindings(expandedId);
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete finding",
        variant: "destructive",
      });
    }
  };

  // --- Severity count helper for card ---

  const severityCounts = (op: RedTeamOperation) => [
    { label: "C", count: op.critical_findings, color: "text-red-500" },
    { label: "H", count: op.high_findings, color: "text-orange-500" },
    { label: "M", count: op.medium_findings, color: "text-amber-500" },
    { label: "L", count: op.low_findings, color: "text-emerald-500" },
    { label: "I", count: op.info_findings, color: "text-zinc-500" },
  ];

  // --- Render ---

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Red Team Operations</h1>
          <p className="text-muted-foreground terminal-text mt-2">
            Active security assessments and penetration testing
          </p>
        </div>
        <Dialog open={addOpDialogOpen} onOpenChange={setAddOpDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UilPlus size={16} className="mr-2" />
              New Operation
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card">
            <DialogHeader>
              <DialogTitle className="text-white">New Operation</DialogTitle>
              <DialogDescription>
                Create a new penetration test or security assessment
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="op-name">Operation Name</Label>
                <Input
                  id="op-name"
                  value={newOperation.name}
                  onChange={(e) => setNewOperation({ ...newOperation, name: e.target.value })}
                  placeholder="e.g., Web App Pentest"
                  className="terminal-text"
                />
              </div>
              <div>
                <Label htmlFor="op-target">UilFocusTarget</Label>
                <Input
                  id="op-target"
                  value={newOperation.target}
                  onChange={(e) => setNewOperation({ ...newOperation, target: e.target.value })}
                  placeholder="e.g., example.com or 192.168.1.0/24"
                  className="terminal-text"
                />
              </div>
              <div>
                <Label htmlFor="op-type">Operation Type</Label>
                <Select
                  value={newOperation.operation_type}
                  onValueChange={(v) =>
                    setNewOperation({
                      ...newOperation,
                      operation_type: v as CreateOperationData["operation_type"],
                    })
                  }
                >
                  <SelectTrigger className="terminal-text">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OPERATION_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="op-description">Description</Label>
                <Textarea
                  id="op-description"
                  value={newOperation.description}
                  onChange={(e) =>
                    setNewOperation({ ...newOperation, description: e.target.value })
                  }
                  placeholder="Brief description of the operation..."
                  className="terminal-text"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddOpDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddOperation}>Create Operation</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Row */}
      <StatsRow stats={stats} loading={loading} />

      {/* Add Finding Dialog (shared, opened from detail panels) */}
      <Dialog open={addFindingDialogOpen} onOpenChange={setAddFindingDialogOpen}>
        <DialogContent className="bg-card max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">Add Finding</DialogTitle>
            <DialogDescription>
              Document a new security finding or vulnerability
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <div>
              <Label htmlFor="finding-title">Title</Label>
              <Input
                id="finding-title"
                value={newFinding.title}
                onChange={(e) => setNewFinding({ ...newFinding, title: e.target.value })}
                placeholder="e.g., SQL Injection in Login Form"
                className="terminal-text"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Severity</Label>
                <Select
                  value={newFinding.severity}
                  onValueChange={(v) =>
                    setNewFinding({ ...newFinding, severity: v as CreateFindingData["severity"] })
                  }
                >
                  <SelectTrigger className="terminal-text">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(SEVERITY_CONFIG).map(([val, cfg]) => (
                      <SelectItem key={val} value={val}>
                        {cfg.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Category</Label>
                <Select
                  value={newFinding.category}
                  onValueChange={(v) =>
                    setNewFinding({
                      ...newFinding,
                      category: v as CreateFindingData["category"],
                    })
                  }
                >
                  <SelectTrigger className="terminal-text">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FINDING_CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="finding-component">Affected Component</Label>
              <Input
                id="finding-component"
                value={newFinding.affected_component || ""}
                onChange={(e) =>
                  setNewFinding({ ...newFinding, affected_component: e.target.value })
                }
                placeholder="e.g., /api/auth/login"
                className="terminal-text"
              />
            </div>
            <div>
              <Label htmlFor="finding-vector">Attack Vector</Label>
              <Input
                id="finding-vector"
                value={newFinding.attack_vector || ""}
                onChange={(e) => setNewFinding({ ...newFinding, attack_vector: e.target.value })}
                placeholder="e.g., Network / Adjacent"
                className="terminal-text"
              />
            </div>
            <div>
              <Label htmlFor="finding-description">Description</Label>
              <Textarea
                id="finding-description"
                value={newFinding.description}
                onChange={(e) => setNewFinding({ ...newFinding, description: e.target.value })}
                placeholder="Detailed description of the vulnerability..."
                className="terminal-text min-h-24"
              />
            </div>
            <div>
              <Label htmlFor="finding-poc">Proof of Concept</Label>
              <Textarea
                id="finding-poc"
                value={newFinding.proof_of_concept || ""}
                onChange={(e) =>
                  setNewFinding({ ...newFinding, proof_of_concept: e.target.value })
                }
                placeholder="Steps to reproduce..."
                className="terminal-text min-h-20"
              />
            </div>
            <div>
              <Label htmlFor="finding-impact">Impact</Label>
              <Textarea
                id="finding-impact"
                value={newFinding.impact || ""}
                onChange={(e) => setNewFinding({ ...newFinding, impact: e.target.value })}
                placeholder="Business / security impact..."
                className="terminal-text"
              />
            </div>
            <div>
              <Label htmlFor="finding-remediation">Remediation</Label>
              <Textarea
                id="finding-remediation"
                value={newFinding.remediation || ""}
                onChange={(e) => setNewFinding({ ...newFinding, remediation: e.target.value })}
                placeholder="Recommended fix..."
                className="terminal-text"
              />
            </div>
            <div className="w-48">
              <Label htmlFor="finding-cvss">CVSS Score</Label>
              <Input
                id="finding-cvss"
                type="number"
                min={0}
                max={10}
                step={0.1}
                value={newFinding.cvss_score ?? ""}
                onChange={(e) =>
                  setNewFinding({
                    ...newFinding,
                    cvss_score: e.target.value ? parseFloat(e.target.value) : undefined,
                  })
                }
                placeholder="0.0 - 10.0"
                className="terminal-text"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddFindingDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddFinding}>Add Finding</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Operation</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the operation and all associated findings. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deleteTarget && handleDeleteOperation(deleteTarget)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Operations List */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-lg bg-card p-5 space-y-3">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-72" />
              <Skeleton className="h-2 w-full" />
            </div>
          ))}
        </div>
      ) : operations.length === 0 ? (
        <div className="rounded-lg bg-card flex flex-col items-center justify-center py-16">
          <UilShield size={64} className="text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No Active Operations</h3>
          <p className="text-muted-foreground text-center mb-4">
            Start a new penetration test or security assessment
          </p>
          <Button variant="outline" onClick={() => setAddOpDialogOpen(true)}>
            <UilFocusTarget size={16} className="mr-2" />
            New Operation
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {operations.map((op) => {
            const isExpanded = expandedId === op.id;
            const sCfg = STATUS_CONFIG[op.status] || STATUS_CONFIG.planned;
            return (
              <motion.div
                key={op.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div className="rounded-lg bg-card">
                  {/* Card header — clickable */}
                  <button
                    type="button"
                    className="w-full text-left px-5 py-4 focus:outline-none"
                    onClick={() => toggleExpand(op.id)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-semibold text-white truncate">
                            {op.name}
                          </h3>
                          <span className={`h-2 w-2 rounded-full shrink-0 ${STATUS_DOT[op.status] || STATUS_DOT.planned}`} />
                          <span className={`text-xs ${sCfg.color}`}>{sCfg.label}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 terminal-text truncate">
                          {op.target} &middot;{" "}
                          {OPERATION_TYPES.find((t) => t.value === op.operation_type)?.label ||
                            op.operation_type}
                        </p>

                        {/* Progress bar */}
                        <div className="mt-3 flex items-center gap-3">
                          <Progress value={op.progress} className="h-1.5 flex-1" />
                          <span className="text-xs text-muted-foreground terminal-text w-8 text-right">
                            {op.progress}%
                          </span>
                        </div>

                        {/* Severity counts */}
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-xs text-muted-foreground">
                            {op.total_findings} finding{op.total_findings !== 1 ? "s" : ""}
                          </span>
                          {severityCounts(op)
                            .filter((s) => s.count > 0)
                            .map((s) => (
                              <span key={s.label} className={`text-xs font-medium ${s.color}`}>
                                {s.count}{s.label}
                              </span>
                            ))}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0 pt-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteTarget(op.id);
                          }}
                        >
                          <UilTrashAlt size={15} />
                        </Button>
                        {isExpanded ? (
                          <UilAngleUp size={16} className="text-muted-foreground" />
                        ) : (
                          <UilAngleDown size={16} className="text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </button>

                  {/* Expandable detail panel */}
                  <AnimatePresence>
                    {isExpanded && (
                      <DetailPanel
                        operation={op}
                        findings={expandedFindings}
                        findingsLoading={findingsLoading}
                        onStatusChange={(status, progress) =>
                          handleStatusChange(op.id, status, progress)
                        }
                        onUpdate={(updates) => handleUpdateOperation(op.id, updates)}
                        onAddFinding={() => openAddFindingDialog(op.id)}
                        onDeleteFinding={handleDeleteFinding}
                      />
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RedTeam;
