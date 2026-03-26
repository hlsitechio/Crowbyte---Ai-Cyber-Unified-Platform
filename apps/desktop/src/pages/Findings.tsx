/**
 * Findings Page — Unified Security Findings Dashboard
 * Central hub for ALL security tool outputs: nmap, nuclei, sqlmap, burp, shodan, manual.
 * Cross-tool correlation, triage, bulk actions, attack chain integration.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import {
  findingsEngine,
  type Finding,
  type FindingsFilter,
  type FindingsStats,
  type FindingSource,
  type FindingSeverity,
  type FindingStatus,
  type FindingType,
  type CreateFindingData,
} from "@/services/findings-engine";
import { triageEngine } from "@/services/triage-engine";
import {
  Crosshair,
  MagnifyingGlass,
  Plus,
  DownloadSimple,
  TreeStructure,
  Atom,
  Database,
  Bug,
  Eye,
  PencilSimple,
  Terminal,
  Funnel,
  X,
  CaretDown,
  CaretRight,
  CaretLeft,
  CheckSquare,
  Square,
  MinusSquare,
  Trash,
  ShieldCheck,
  ShieldSlash,
  ShieldWarning,
  CheckCircle,
  Link,
  Clock,
  Tag,
  ArrowsDownUp,
  SortAscending,
  SortDescending,
  Copy,
  FileText,
  Warning,
  ArrowSquareOut,
  DotsThreeVertical,
  Target,
  Lightning,
} from "@phosphor-icons/react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";

// ─── Constants ─────────────────────────────────────────────────────────────────

const SOURCES: { value: FindingSource | "all"; label: string }[] = [
  { value: "all", label: "All Sources" },
  { value: "nmap", label: "Nmap" },
  { value: "nuclei", label: "Nuclei" },
  { value: "sqlmap", label: "SQLMap" },
  { value: "burp", label: "Burp" },
  { value: "shodan", label: "Shodan" },
  { value: "manual", label: "Manual" },
];

const SEVERITIES: { value: FindingSeverity | "all"; label: string }[] = [
  { value: "all", label: "All Severities" },
  { value: "critical", label: "Critical" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
  { value: "info", label: "Info" },
];

const STATUSES: { value: FindingStatus | "all"; label: string }[] = [
  { value: "all", label: "All Statuses" },
  { value: "open", label: "Open" },
  { value: "confirmed", label: "Confirmed" },
  { value: "false_positive", label: "False Positive" },
  { value: "resolved", label: "Resolved" },
  { value: "duplicate", label: "Duplicate" },
];

const TYPES: { value: FindingType | "all"; label: string }[] = [
  { value: "all", label: "All Types" },
  { value: "vuln", label: "Vuln" },
  { value: "misconfig", label: "Misconfig" },
  { value: "info", label: "Info" },
  { value: "exposure", label: "Exposure" },
  { value: "credential", label: "Credential" },
  { value: "service", label: "Service" },
];

const SEVERITY_COLORS: Record<FindingSeverity, { badge: string; dot: string }> = {
  critical: {
    badge: "bg-red-500/20 text-red-400 border border-red-500/30",
    dot: "bg-red-500",
  },
  high: {
    badge: "bg-orange-500/20 text-orange-400 border border-orange-500/30",
    dot: "bg-orange-500",
  },
  medium: {
    badge: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
    dot: "bg-yellow-500",
  },
  low: {
    badge: "bg-blue-500/20 text-blue-400 border border-blue-500/30",
    dot: "bg-blue-500",
  },
  info: {
    badge: "bg-zinc-500/20 text-zinc-400 border border-zinc-500/30",
    dot: "bg-zinc-500",
  },
};

const STATUS_COLORS: Record<FindingStatus, string> = {
  open: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
  confirmed: "bg-red-500/20 text-red-400 border border-red-500/30",
  false_positive: "bg-zinc-500/20 text-zinc-500 border border-zinc-500/30",
  resolved: "bg-blue-500/20 text-blue-400 border border-blue-500/30",
  accepted_risk: "bg-amber-500/20 text-amber-400 border border-amber-500/30",
  duplicate: "bg-purple-500/20 text-purple-400 border border-purple-500/30",
};

const STATUS_LABELS: Record<FindingStatus, string> = {
  open: "Open",
  confirmed: "Confirmed",
  false_positive: "False Positive",
  resolved: "Resolved",
  accepted_risk: "Accepted Risk",
  duplicate: "Duplicate",
};

const SOURCE_ICONS: Record<string, React.ComponentType<{ size?: number; weight?: string; className?: string }>> = {
  nmap: TreeStructure,
  nuclei: Atom,
  sqlmap: Database,
  burp: Bug,
  shodan: Eye,
  manual: PencilSimple,
};

const PAGE_SIZE = 50;

type SortField = "severity" | "title" | "target_host" | "source" | "status" | "confidence" | "created_at";
type SortDir = "asc" | "desc";

const SEVERITY_WEIGHT: Record<FindingSeverity, number> = {
  critical: 0, high: 1, medium: 2, low: 3, info: 4,
};

// ─── Component ─────────────────────────────────────────────────────────────────

export default function Findings() {
  const { toast } = useToast();

  // Data
  const [findings, setFindings] = useState<Finding[]>([]);
  const [stats, setStats] = useState<FindingsStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [filterSource, setFilterSource] = useState<FindingSource | "all">("all");
  const [filterSeverity, setFilterSeverity] = useState<FindingSeverity | "all">("all");
  const [filterStatus, setFilterStatus] = useState<FindingStatus | "all">("all");
  const [filterType, setFilterType] = useState<FindingType | "all">("all");

  // Sort
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Expansion
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [correlatedFindings, setCorrelatedFindings] = useState<Finding[]>([]);
  const [loadingCorrelation, setLoadingCorrelation] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  // AI Triage
  const [triageRunning, setTriageRunning] = useState(false);

  // Dialogs
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [newFindingDialogOpen, setNewFindingDialogOpen] = useState(false);

  // Import state
  const [importJson, setImportJson] = useState("");
  const [importSource, setImportSource] = useState<FindingSource>("nmap");
  const [importPreview, setImportPreview] = useState<number | null>(null);
  const [importing, setImporting] = useState(false);

  // New finding form
  const [newFinding, setNewFinding] = useState<Partial<CreateFindingData>>({
    title: "",
    target_host: "",
    target_port: undefined,
    severity: "medium",
    finding_type: "vuln",
    description: "",
    cve_ids: [],
    cwe_ids: [],
    tags: [],
    source: "manual",
  });
  const [newFindingCves, setNewFindingCves] = useState("");
  const [newFindingTags, setNewFindingTags] = useState("");
  const [creating, setCreating] = useState(false);

  // Triage notes (inline editing in expanded view)
  const [editingTriageNotes, setEditingTriageNotes] = useState<string>("");

  // ─── Data Loading ──────────────────────────────────────────────────────────

  const loadFindings = useCallback(async () => {
    try {
      setLoading(true);
      const filter: FindingsFilter = {};
      if (filterSource !== "all") filter.source = filterSource;
      if (filterSeverity !== "all") filter.severity = filterSeverity;
      if (filterStatus !== "all") filter.status = filterStatus;
      if (filterType !== "all") filter.finding_type = filterType;
      if (search.trim()) filter.search = search.trim();

      const [data, statsData] = await Promise.all([
        findingsEngine.getAll(filter),
        findingsEngine.getStats(),
      ]);
      setFindings(data);
      setStats(statsData);
    } catch (err) {
      console.error("Failed to load findings:", err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to load findings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [filterSource, filterSeverity, filterStatus, filterType, search, toast]);

  useEffect(() => {
    loadFindings();
  }, [loadFindings]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds(new Set());
  }, [filterSource, filterSeverity, filterStatus, filterType, search]);

  // ─── Sorted + Paginated Data ───────────────────────────────────────────────

  const sortedFindings = useMemo(() => {
    const sorted = [...findings];
    sorted.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "severity":
          cmp = SEVERITY_WEIGHT[a.severity] - SEVERITY_WEIGHT[b.severity];
          break;
        case "title":
          cmp = a.title.localeCompare(b.title);
          break;
        case "target_host":
          cmp = a.target_host.localeCompare(b.target_host);
          break;
        case "source":
          cmp = a.source.localeCompare(b.source);
          break;
        case "status":
          cmp = a.status.localeCompare(b.status);
          break;
        case "confidence":
          cmp = (a.confidence ?? 0) - (b.confidence ?? 0);
          break;
        case "created_at":
          cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [findings, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedFindings.length / PAGE_SIZE));
  const paginatedFindings = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return sortedFindings.slice(start, start + PAGE_SIZE);
  }, [sortedFindings, currentPage]);

  // ─── Selection ─────────────────────────────────────────────────────────────

  const allOnPageSelected = paginatedFindings.length > 0 && paginatedFindings.every(f => selectedIds.has(f.id));
  const someOnPageSelected = paginatedFindings.some(f => selectedIds.has(f.id));

  const toggleSelectAll = () => {
    if (allOnPageSelected) {
      const next = new Set(selectedIds);
      paginatedFindings.forEach(f => next.delete(f.id));
      setSelectedIds(next);
    } else {
      const next = new Set(selectedIds);
      paginatedFindings.forEach(f => next.add(f.id));
      setSelectedIds(next);
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  // ─── Bulk Actions ──────────────────────────────────────────────────────────

  const bulkUpdateStatus = async (status: FindingStatus) => {
    if (selectedIds.size === 0) return;
    try {
      await findingsEngine.bulkUpdateStatus(Array.from(selectedIds), status);
      toast({ title: "Updated", description: `${selectedIds.size} findings marked as ${STATUS_LABELS[status]}` });
      setSelectedIds(new Set());
      await loadFindings();
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Bulk update failed",
        variant: "destructive",
      });
    }
  };

  const bulkDelete = async () => {
    if (selectedIds.size === 0) return;
    try {
      for (const id of selectedIds) {
        await findingsEngine.delete(id);
      }
      toast({ title: "Deleted", description: `${selectedIds.size} findings removed` });
      setSelectedIds(new Set());
      await loadFindings();
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Delete failed",
        variant: "destructive",
      });
    }
  };

  // ─── AI Triage ─────────────────────────────────────────────────────────────

  const handleAITriage = async () => {
    const openFindings = findings.filter(f => f.status === 'open' && !f.triaged_at);
    if (openFindings.length === 0) {
      toast({ title: "No untriaged findings", description: "All open findings have already been triaged." });
      return;
    }

    setTriageRunning(true);
    try {
      const results = await triageEngine.batchTriage(openFindings.slice(0, 20)); // Process 20 at a time
      const autoResolved = results.filter(r => r.auto_resolved).length;
      const needsReview = results.filter(r => !r.auto_resolved).length;

      toast({
        title: `AI Triage Complete`,
        description: `${autoResolved} auto-resolved, ${needsReview} need review. ${results.length} findings processed.`,
      });

      await loadFindings();
    } catch (err) {
      toast({ title: "Triage failed", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    } finally {
      setTriageRunning(false);
    }
  };

  // ─── Import ────────────────────────────────────────────────────────────────

  const handleImportPreview = () => {
    try {
      const parsed = JSON.parse(importJson);
      const items = Array.isArray(parsed) ? parsed : [parsed];
      setImportPreview(items.length);
    } catch {
      toast({ title: "Invalid JSON", description: "Could not parse the input", variant: "destructive" });
      setImportPreview(null);
    }
  };

  const handleImport = async () => {
    try {
      setImporting(true);
      const parsed = JSON.parse(importJson);
      let created: Finding[] = [];

      switch (importSource) {
        case "nmap":
          created = await findingsEngine.ingestNmap(parsed);
          break;
        case "nuclei":
          created = await findingsEngine.ingestNuclei(parsed);
          break;
        case "sqlmap":
          created = await findingsEngine.ingestSqlmap(parsed);
          break;
        case "burp":
          created = await findingsEngine.ingestBurp(parsed);
          break;
        case "shodan":
          created = await findingsEngine.ingestShodan(parsed);
          break;
        default: {
          const items = Array.isArray(parsed) ? parsed : [parsed];
          for (const item of items) {
            const f = await findingsEngine.ingestManual(item);
            created.push(f);
          }
        }
      }

      toast({ title: "Imported", description: `${created.length} findings ingested from ${importSource}` });
      setImportDialogOpen(false);
      setImportJson("");
      setImportPreview(null);
      await loadFindings();
    } catch (err) {
      toast({
        title: "Import Failed",
        description: err instanceof Error ? err.message : "Failed to import findings",
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  };

  // ─── New Finding ───────────────────────────────────────────────────────────

  const handleCreateFinding = async () => {
    if (!newFinding.title || !newFinding.target_host) {
      toast({ title: "Validation", description: "Title and target host are required", variant: "destructive" });
      return;
    }
    try {
      setCreating(true);
      const cveList = newFindingCves.split(",").map(s => s.trim()).filter(Boolean);
      const tagList = newFindingTags.split(",").map(s => s.trim()).filter(Boolean);

      await findingsEngine.ingestManual({
        ...newFinding as CreateFindingData,
        source: "manual",
        cve_ids: cveList,
        cwe_ids: [],
        tags: tagList,
      });

      toast({ title: "Created", description: `Finding "${newFinding.title}" added` });
      setNewFindingDialogOpen(false);
      setNewFinding({
        title: "", target_host: "", target_port: undefined,
        severity: "medium", finding_type: "vuln", description: "",
        cve_ids: [], cwe_ids: [], tags: [], source: "manual",
      });
      setNewFindingCves("");
      setNewFindingTags("");
      await loadFindings();
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to create finding",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  // ─── Expand / Correlate ────────────────────────────────────────────────────

  const handleExpand = async (finding: Finding) => {
    if (expandedId === finding.id) {
      setExpandedId(null);
      setCorrelatedFindings([]);
      return;
    }
    setExpandedId(finding.id);
    setEditingTriageNotes(finding.triage_notes || "");
    setCorrelatedFindings([]);
  };

  const handleCorrelate = async (findingId: string) => {
    try {
      setLoadingCorrelation(true);
      const related = await findingsEngine.correlate(findingId);
      setCorrelatedFindings(related);
    } catch (err) {
      toast({
        title: "Correlation Error",
        description: err instanceof Error ? err.message : "Failed to correlate",
        variant: "destructive",
      });
    } finally {
      setLoadingCorrelation(false);
    }
  };

  const handleSaveTriageNotes = async (findingId: string) => {
    try {
      await findingsEngine.update(findingId, { triage_notes: editingTriageNotes });
      toast({ title: "Saved", description: "Triage notes updated" });
      await loadFindings();
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to save notes",
        variant: "destructive",
      });
    }
  };

  const handleToggleReport = async (finding: Finding) => {
    try {
      await findingsEngine.update(finding.id, { included_in_report: !finding.included_in_report });
      await loadFindings();
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to toggle report status",
        variant: "destructive",
      });
    }
  };

  const handleUpdateStatus = async (findingId: string, status: FindingStatus) => {
    try {
      await findingsEngine.update(findingId, {
        status,
        triaged_at: new Date().toISOString(),
        triaged_by: "human",
      });
      toast({ title: "Updated", description: `Status changed to ${STATUS_LABELS[status]}` });
      await loadFindings();
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to update status",
        variant: "destructive",
      });
    }
  };

  // ─── Sort Toggle ───────────────────────────────────────────────────────────

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowsDownUp size={14} weight="duotone" className="text-zinc-600" />;
    return sortDir === "asc"
      ? <SortAscending size={14} weight="duotone" className="text-blue-400" />
      : <SortDescending size={14} weight="duotone" className="text-blue-400" />;
  };

  // ─── Clear Filters ─────────────────────────────────────────────────────────

  const hasActiveFilters = filterSource !== "all" || filterSeverity !== "all" || filterStatus !== "all" || filterType !== "all";

  const clearFilters = () => {
    setFilterSource("all");
    setFilterSeverity("all");
    setFilterStatus("all");
    setFilterType("all");
    setSearch("");
  };

  // ─── Source Icon Helper ────────────────────────────────────────────────────

  const SourceIcon = ({ source, size = 16 }: { source: string; size?: number }) => {
    const Icon = SOURCE_ICONS[source] || Terminal;
    return <Icon size={size} weight="duotone" />;
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full overflow-hidden">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex-none px-6 pt-6 pb-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
                <Crosshair size={20} weight="duotone" className="text-red-400" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-zinc-100">Findings</h1>
                <p className="text-sm text-zinc-500">Unified security findings from all tools</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setImportDialogOpen(true)}
                className="gap-1.5"
              >
                <DownloadSimple size={16} weight="duotone" />
                Import Findings
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAITriage}
                className="gap-1.5 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
                disabled={triageRunning}
              >
                <Lightning size={16} weight="duotone" />
                {triageRunning ? 'Triaging...' : 'AI Triage'}
              </Button>
              <Button
                size="sm"
                onClick={() => setNewFindingDialogOpen(true)}
                className="gap-1.5"
              >
                <Plus size={16} weight="bold" />
                New Finding
              </Button>
            </div>
          </div>

          {/* Search */}
          <div className="relative mt-4">
            <MagnifyingGlass size={16} weight="duotone" className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <Input
              placeholder="Search findings by title, host, or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-zinc-900/50 border-zinc-800"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="flex-none px-6 pb-4"
        >
          <div className="grid grid-cols-4 gap-3">
            {/* Total Findings */}
            <Card className="bg-zinc-900/50 border-zinc-800/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Total Findings</span>
                  <Target size={16} weight="duotone" className="text-zinc-600" />
                </div>
                {loading ? (
                  <Skeleton className="h-7 w-16" />
                ) : (
                  <>
                    <p className="text-2xl font-bold text-zinc-100">{stats?.total ?? 0}</p>
                    <div className="flex gap-0.5 mt-2 h-1.5 rounded-full overflow-hidden bg-zinc-800">
                      {stats && stats.total > 0 && (
                        <>
                          {stats.by_severity.critical > 0 && (
                            <div
                              className="bg-red-500 rounded-full"
                              style={{ width: `${(stats.by_severity.critical / stats.total) * 100}%` }}
                            />
                          )}
                          {stats.by_severity.high > 0 && (
                            <div
                              className="bg-orange-500 rounded-full"
                              style={{ width: `${(stats.by_severity.high / stats.total) * 100}%` }}
                            />
                          )}
                          {stats.by_severity.medium > 0 && (
                            <div
                              className="bg-yellow-500 rounded-full"
                              style={{ width: `${(stats.by_severity.medium / stats.total) * 100}%` }}
                            />
                          )}
                          {stats.by_severity.low > 0 && (
                            <div
                              className="bg-blue-500 rounded-full"
                              style={{ width: `${(stats.by_severity.low / stats.total) * 100}%` }}
                            />
                          )}
                          {stats.by_severity.info > 0 && (
                            <div
                              className="bg-zinc-500 rounded-full"
                              style={{ width: `${(stats.by_severity.info / stats.total) * 100}%` }}
                            />
                          )}
                        </>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Confirmed Vulns */}
            <Card className="bg-zinc-900/50 border-zinc-800/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Confirmed</span>
                  <ShieldWarning size={16} weight="duotone" className="text-red-500" />
                </div>
                {loading ? (
                  <Skeleton className="h-7 w-16" />
                ) : (
                  <p className="text-2xl font-bold text-red-400">{stats?.by_status?.confirmed ?? 0}</p>
                )}
              </CardContent>
            </Card>

            {/* Unique Targets */}
            <Card className="bg-zinc-900/50 border-zinc-800/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Unique Targets</span>
                  <Crosshair size={16} weight="duotone" className="text-emerald-500" />
                </div>
                {loading ? (
                  <Skeleton className="h-7 w-16" />
                ) : (
                  <p className="text-2xl font-bold text-zinc-100">{stats?.unique_hosts ?? 0}</p>
                )}
              </CardContent>
            </Card>

            {/* FP Rate */}
            <Card className="bg-zinc-900/50 border-zinc-800/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-zinc-500 font-medium uppercase tracking-wider">FP Rate</span>
                  <ShieldSlash size={16} weight="duotone" className="text-zinc-500" />
                </div>
                {loading ? (
                  <Skeleton className="h-7 w-16" />
                ) : (
                  <p className="text-2xl font-bold text-zinc-100">
                    {stats ? `${(stats.false_positive_rate * 100).toFixed(1)}%` : "0%"}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </motion.div>

        {/* Filter Bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.15 }}
          className="flex-none px-6 pb-3"
        >
          <div className="flex items-center gap-2 flex-wrap">
            <Funnel size={16} weight="duotone" className="text-zinc-500" />

            <Select value={filterSource} onValueChange={(v) => setFilterSource(v as FindingSource | "all")}>
              <SelectTrigger className="w-[140px] h-8 text-xs bg-zinc-900/50 border-zinc-800">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SOURCES.map(s => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterSeverity} onValueChange={(v) => setFilterSeverity(v as FindingSeverity | "all")}>
              <SelectTrigger className="w-[140px] h-8 text-xs bg-zinc-900/50 border-zinc-800">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SEVERITIES.map(s => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as FindingStatus | "all")}>
              <SelectTrigger className="w-[140px] h-8 text-xs bg-zinc-900/50 border-zinc-800">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map(s => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterType} onValueChange={(v) => setFilterType(v as FindingType | "all")}>
              <SelectTrigger className="w-[120px] h-8 text-xs bg-zinc-900/50 border-zinc-800">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPES.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs text-zinc-500 hover:text-zinc-300 gap-1">
                <X size={12} />
                Clear Filters
              </Button>
            )}

            <div className="ml-auto text-xs text-zinc-600">
              {sortedFindings.length} finding{sortedFindings.length !== 1 ? "s" : ""}
            </div>
          </div>
        </motion.div>

        {/* Bulk Actions Bar */}
        <AnimatePresence>
          {selectedIds.size > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="flex-none px-6 pb-3"
            >
              <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <span className="text-xs text-blue-400 font-medium">{selectedIds.size} selected</span>
                <Separator orientation="vertical" className="h-4" />
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => bulkUpdateStatus("confirmed")}>
                  <ShieldWarning size={14} weight="duotone" className="text-red-400" />
                  Confirm
                </Button>
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => bulkUpdateStatus("false_positive")}>
                  <ShieldSlash size={14} weight="duotone" className="text-zinc-400" />
                  Mark FP
                </Button>
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => bulkUpdateStatus("resolved")}>
                  <CheckCircle size={14} weight="duotone" className="text-blue-400" />
                  Resolve
                </Button>
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-red-400 hover:text-red-300" onClick={bulkDelete}>
                  <Trash size={14} weight="duotone" />
                  Delete
                </Button>
                <div className="ml-auto">
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setSelectedIds(new Set())}>
                    Clear
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Table */}
        <div className="flex-1 overflow-hidden px-6 pb-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="h-full flex flex-col rounded-lg border border-zinc-800/50 bg-zinc-900/30 overflow-hidden"
          >
            {/* Table Header */}
            <div className="flex-none grid grid-cols-[32px_80px_1fr_180px_100px_70px_90px_80px_120px] items-center gap-2 px-3 py-2 bg-zinc-900/80 border-b border-zinc-800/50 text-xs font-medium text-zinc-500 uppercase tracking-wider">
              <div className="flex items-center justify-center">
                <Checkbox
                  checked={allOnPageSelected}
                  onCheckedChange={toggleSelectAll}
                  className="h-4 w-4"
                  aria-label="Select all findings"
                />
              </div>
              <button onClick={() => handleSort("severity")} className="flex items-center gap-1 hover:text-zinc-300 transition-colors">
                Severity <SortIcon field="severity" />
              </button>
              <button onClick={() => handleSort("title")} className="flex items-center gap-1 hover:text-zinc-300 transition-colors text-left">
                Title <SortIcon field="title" />
              </button>
              <button onClick={() => handleSort("target_host")} className="flex items-center gap-1 hover:text-zinc-300 transition-colors">
                Target <SortIcon field="target_host" />
              </button>
              <button onClick={() => handleSort("source")} className="flex items-center gap-1 hover:text-zinc-300 transition-colors">
                Source <SortIcon field="source" />
              </button>
              <span>CVEs</span>
              <button onClick={() => handleSort("status")} className="flex items-center gap-1 hover:text-zinc-300 transition-colors">
                Status <SortIcon field="status" />
              </button>
              <button onClick={() => handleSort("confidence")} className="flex items-center gap-1 hover:text-zinc-300 transition-colors">
                Conf. <SortIcon field="confidence" />
              </button>
              <button onClick={() => handleSort("created_at")} className="flex items-center gap-1 hover:text-zinc-300 transition-colors">
                Created <SortIcon field="created_at" />
              </button>
            </div>

            {/* Table Body */}
            <ScrollArea className="flex-1">
              {loading ? (
                <div className="p-4 space-y-3">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="grid grid-cols-[32px_80px_1fr_180px_100px_70px_90px_80px_120px] gap-2 px-3 py-2">
                      <Skeleton className="h-4 w-4" />
                      <Skeleton className="h-5 w-16" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-4 w-8" />
                      <Skeleton className="h-5 w-16" />
                      <Skeleton className="h-4 w-12" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                  ))}
                </div>
              ) : paginatedFindings.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-zinc-600">
                  <Crosshair size={48} weight="duotone" className="mb-3 text-zinc-700" />
                  <p className="text-sm font-medium text-zinc-500">No findings yet</p>
                  <p className="text-xs text-zinc-600 mt-1">Run a scan or import results to see them here.</p>
                </div>
              ) : (
                <div>
                  {paginatedFindings.map((finding) => (
                    <div key={finding.id}>
                      {/* Row */}
                      <div
                        className={`grid grid-cols-[32px_80px_1fr_180px_100px_70px_90px_80px_120px] items-center gap-2 px-3 py-2.5 border-b border-zinc-800/30 hover:bg-zinc-800/30 transition-colors cursor-pointer text-sm ${
                          expandedId === finding.id ? "bg-zinc-800/40" : ""
                        } ${selectedIds.has(finding.id) ? "bg-blue-500/5" : ""}`}
                        onClick={() => handleExpand(finding)}
                      >
                        {/* Checkbox */}
                        <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedIds.has(finding.id)}
                            onCheckedChange={() => toggleSelect(finding.id)}
                            className="h-4 w-4"
                            aria-label={`Select finding ${finding.title}`}
                          />
                        </div>

                        {/* Severity */}
                        <div>
                          <Badge className={`text-[10px] px-1.5 py-0 font-medium ${SEVERITY_COLORS[finding.severity].badge}`}>
                            {finding.severity.toUpperCase()}
                          </Badge>
                        </div>

                        {/* Title */}
                        <div className="flex items-center gap-2 min-w-0">
                          {expandedId === finding.id ? (
                            <CaretDown size={12} className="text-zinc-500 flex-none" />
                          ) : (
                            <CaretRight size={12} className="text-zinc-600 flex-none" />
                          )}
                          <span className="truncate text-zinc-200">{finding.title}</span>
                          {finding.included_in_report && (
                            <Tooltip>
                              <TooltipTrigger>
                                <FileText size={12} weight="duotone" className="text-blue-400 flex-none" />
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                <p className="text-xs">Included in report</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>

                        {/* Target */}
                        <div className="text-zinc-400 text-xs truncate font-mono">
                          {finding.target_host}{finding.target_port ? `:${finding.target_port}` : ""}
                        </div>

                        {/* Source */}
                        <div className="flex items-center gap-1.5 text-zinc-400 text-xs">
                          <SourceIcon source={finding.source} size={14} />
                          <span>{finding.source}</span>
                        </div>

                        {/* CVEs */}
                        <div>
                          {finding.cve_ids.length > 0 ? (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono border-zinc-700 text-zinc-400">
                              {finding.cve_ids.length}
                            </Badge>
                          ) : (
                            <span className="text-zinc-700 text-xs">--</span>
                          )}
                        </div>

                        {/* Status */}
                        <div>
                          <Badge className={`text-[10px] px-1.5 py-0 font-medium ${STATUS_COLORS[finding.status]}`}>
                            {STATUS_LABELS[finding.status]}
                          </Badge>
                        </div>

                        {/* Confidence */}
                        <div className="text-xs text-zinc-500 font-mono">
                          {finding.confidence !== undefined && finding.confidence !== null
                            ? `${Math.round(finding.confidence * 100)}%`
                            : "--"}
                        </div>

                        {/* Created */}
                        <div className="text-xs text-zinc-600">
                          {formatDistanceToNow(new Date(finding.created_at), { addSuffix: true })}
                        </div>
                      </div>

                      {/* Expanded Detail */}
                      <AnimatePresence>
                        {expandedId === finding.id && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="border-b border-zinc-800/30 bg-zinc-900/60"
                          >
                            <div className="p-4 grid grid-cols-[1fr_300px] gap-4">
                              {/* Left: Details */}
                              <div className="space-y-4">
                                {/* Description */}
                                {finding.description && (
                                  <div>
                                    <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">Description</h4>
                                    <p className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">{finding.description}</p>
                                  </div>
                                )}

                                {/* Evidence */}
                                {finding.evidence && Object.keys(finding.evidence).length > 0 && (
                                  <div>
                                    <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">Evidence</h4>
                                    <pre className="text-xs text-zinc-400 bg-zinc-950/50 rounded-md p-3 overflow-x-auto border border-zinc-800/50 font-mono max-h-48">
                                      {JSON.stringify(finding.evidence, null, 2)}
                                    </pre>
                                  </div>
                                )}

                                {/* CVE / CWE Lists */}
                                <div className="flex gap-6">
                                  {finding.cve_ids.length > 0 && (
                                    <div>
                                      <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">CVEs</h4>
                                      <div className="flex flex-wrap gap-1">
                                        {finding.cve_ids.map(cve => (
                                          <Badge key={cve} variant="outline" className="text-[10px] font-mono border-red-500/30 text-red-400 cursor-pointer hover:bg-red-500/10">
                                            {cve}
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  {finding.cwe_ids.length > 0 && (
                                    <div>
                                      <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">CWEs</h4>
                                      <div className="flex flex-wrap gap-1">
                                        {finding.cwe_ids.map(cwe => (
                                          <Badge key={cwe} variant="outline" className="text-[10px] font-mono border-amber-500/30 text-amber-400">
                                            {cwe}
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* Tags */}
                                {finding.tags.length > 0 && (
                                  <div>
                                    <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">Tags</h4>
                                    <div className="flex flex-wrap gap-1">
                                      {finding.tags.map(tag => (
                                        <Badge key={tag} variant="outline" className="text-[10px] border-zinc-700 text-zinc-400">
                                          <Tag size={10} weight="duotone" className="mr-0.5" />
                                          {tag}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Triage Notes */}
                                <div>
                                  <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">Triage Notes</h4>
                                  <div className="flex gap-2">
                                    <Textarea
                                      value={editingTriageNotes}
                                      onChange={(e) => setEditingTriageNotes(e.target.value)}
                                      placeholder="Add triage notes..."
                                      className="text-xs bg-zinc-950/50 border-zinc-800 min-h-[60px] resize-none"
                                    />
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="self-end text-xs"
                                      onClick={() => handleSaveTriageNotes(finding.id)}
                                    >
                                      Save
                                    </Button>
                                  </div>
                                </div>

                                {/* Timeline */}
                                <div>
                                  <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">Timeline</h4>
                                  <div className="flex gap-4 text-xs text-zinc-500">
                                    <div className="flex items-center gap-1">
                                      <Clock size={12} weight="duotone" />
                                      <span>Created: {new Date(finding.created_at).toLocaleString()}</span>
                                    </div>
                                    {finding.triaged_at && (
                                      <div className="flex items-center gap-1">
                                        <ShieldCheck size={12} weight="duotone" />
                                        <span>Triaged: {new Date(finding.triaged_at).toLocaleString()}</span>
                                      </div>
                                    )}
                                    {finding.updated_at && finding.updated_at !== finding.created_at && (
                                      <div className="flex items-center gap-1">
                                        <Clock size={12} weight="duotone" />
                                        <span>Updated: {new Date(finding.updated_at).toLocaleString()}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Right: Actions + Correlation */}
                              <div className="space-y-3 border-l border-zinc-800/50 pl-4">
                                {/* Status Changer */}
                                <div>
                                  <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Status</h4>
                                  <Select
                                    value={finding.status}
                                    onValueChange={(v) => handleUpdateStatus(finding.id, v as FindingStatus)}
                                  >
                                    <SelectTrigger className="h-8 text-xs bg-zinc-950/50 border-zinc-800">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="open">Open</SelectItem>
                                      <SelectItem value="confirmed">Confirmed</SelectItem>
                                      <SelectItem value="false_positive">False Positive</SelectItem>
                                      <SelectItem value="resolved">Resolved</SelectItem>
                                      <SelectItem value="accepted_risk">Accepted Risk</SelectItem>
                                      <SelectItem value="duplicate">Duplicate</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>

                                {/* Report Toggle */}
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-zinc-500">Include in Report</span>
                                  <Button
                                    variant={finding.included_in_report ? "default" : "outline"}
                                    size="sm"
                                    className="h-7 text-xs gap-1"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleToggleReport(finding);
                                    }}
                                  >
                                    <FileText size={12} weight="duotone" />
                                    {finding.included_in_report ? "In Report" : "Add"}
                                  </Button>
                                </div>

                                <Separator className="bg-zinc-800/50" />

                                {/* Correlate */}
                                <div>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full h-8 text-xs gap-1.5"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleCorrelate(finding.id);
                                    }}
                                    disabled={loadingCorrelation}
                                  >
                                    <Link size={14} weight="duotone" />
                                    {loadingCorrelation ? "Correlating..." : "Find Related"}
                                  </Button>

                                  {correlatedFindings.length > 0 && (
                                    <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                                      <p className="text-[10px] text-zinc-600 uppercase tracking-wider">{correlatedFindings.length} related</p>
                                      {correlatedFindings.map(cf => (
                                        <div
                                          key={cf.id}
                                          className="flex items-center gap-1.5 p-1.5 rounded bg-zinc-950/50 text-xs hover:bg-zinc-800/50 cursor-pointer"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleExpand(cf);
                                          }}
                                        >
                                          <div className={`w-1.5 h-1.5 rounded-full flex-none ${SEVERITY_COLORS[cf.severity].dot}`} />
                                          <span className="truncate text-zinc-300">{cf.title}</span>
                                          <SourceIcon source={cf.source} size={10} />
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                <Separator className="bg-zinc-800/50" />

                                {/* Meta Info */}
                                <div className="space-y-1 text-xs text-zinc-600">
                                  {finding.cvss_score !== undefined && finding.cvss_score !== null && (
                                    <div className="flex justify-between">
                                      <span>CVSS</span>
                                      <span className="text-zinc-400 font-mono">{finding.cvss_score.toFixed(1)}</span>
                                    </div>
                                  )}
                                  <div className="flex justify-between">
                                    <span>Type</span>
                                    <span className="text-zinc-400">{finding.finding_type}</span>
                                  </div>
                                  {finding.target_url && (
                                    <div className="flex justify-between gap-2">
                                      <span className="flex-none">URL</span>
                                      <span className="text-zinc-400 truncate font-mono text-[10px]">{finding.target_url}</span>
                                    </div>
                                  )}
                                  {finding.is_exploitable !== undefined && (
                                    <div className="flex justify-between">
                                      <span>Exploitable</span>
                                      <span className={finding.is_exploitable ? "text-red-400" : "text-zinc-500"}>
                                        {finding.is_exploitable ? "Yes" : "No"}
                                      </span>
                                    </div>
                                  )}
                                  {finding.triaged_by && (
                                    <div className="flex justify-between">
                                      <span>Triaged by</span>
                                      <span className="text-zinc-400">{finding.triaged_by}</span>
                                    </div>
                                  )}
                                  <div className="flex justify-between">
                                    <span>ID</span>
                                    <span className="text-zinc-500 font-mono text-[10px]">{finding.id.slice(0, 8)}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            {/* Pagination */}
            {!loading && sortedFindings.length > PAGE_SIZE && (
              <div className="flex-none flex items-center justify-between px-4 py-2 border-t border-zinc-800/50 bg-zinc-900/60">
                <span className="text-xs text-zinc-600">
                  Showing {((currentPage - 1) * PAGE_SIZE) + 1}-{Math.min(currentPage * PAGE_SIZE, sortedFindings.length)} of {sortedFindings.length}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  >
                    <CaretLeft size={14} />
                  </Button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "ghost"}
                        size="sm"
                        className="h-7 w-7 p-0 text-xs"
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  >
                    <CaretRight size={14} />
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        </div>

        {/* ─── Import Dialog ────────────────────────────────────────────────────── */}
        <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <DownloadSimple size={18} weight="duotone" />
                Import Findings
              </DialogTitle>
              <DialogDescription>
                Paste raw JSON output from a security tool. The engine will normalize it into unified findings.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label className="text-xs text-zinc-500">Source Tool</Label>
                <Select value={importSource} onValueChange={(v) => setImportSource(v as FindingSource)}>
                  <SelectTrigger className="mt-1 bg-zinc-900/50 border-zinc-800">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nmap">Nmap</SelectItem>
                    <SelectItem value="nuclei">Nuclei</SelectItem>
                    <SelectItem value="sqlmap">SQLMap</SelectItem>
                    <SelectItem value="burp">Burp Suite</SelectItem>
                    <SelectItem value="shodan">Shodan</SelectItem>
                    <SelectItem value="manual">Manual / Generic</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs text-zinc-500">JSON Data</Label>
                <Textarea
                  value={importJson}
                  onChange={(e) => {
                    setImportJson(e.target.value);
                    setImportPreview(null);
                  }}
                  placeholder='Paste JSON output here... (e.g. nmap XML-to-JSON, nuclei JSONL, sqlmap results)'
                  className="mt-1 font-mono text-xs bg-zinc-950/50 border-zinc-800 min-h-[200px] resize-y"
                />
              </div>

              {importPreview !== null && (
                <div className="text-sm text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle size={14} weight="duotone" />
                  {importPreview} item{importPreview !== 1 ? "s" : ""} parsed. Ready to import.
                </div>
              )}
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" size="sm" onClick={handleImportPreview} disabled={!importJson.trim()}>
                Preview
              </Button>
              <Button
                size="sm"
                onClick={handleImport}
                disabled={!importJson.trim() || importing}
                className="gap-1.5"
              >
                {importing ? "Importing..." : "Import"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ─── New Finding Dialog ───────────────────────────────────────────────── */}
        <Dialog open={newFindingDialogOpen} onOpenChange={setNewFindingDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus size={18} weight="bold" />
                New Finding
              </DialogTitle>
              <DialogDescription>
                Manually add a security finding.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <div>
                <Label className="text-xs text-zinc-500">Title *</Label>
                <Input
                  value={newFinding.title || ""}
                  onChange={(e) => setNewFinding(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g. SQLi in login form"
                  className="mt-1 bg-zinc-900/50 border-zinc-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-zinc-500">Target Host *</Label>
                  <Input
                    value={newFinding.target_host || ""}
                    onChange={(e) => setNewFinding(prev => ({ ...prev, target_host: e.target.value }))}
                    placeholder="e.g. example.com"
                    className="mt-1 bg-zinc-900/50 border-zinc-800"
                  />
                </div>
                <div>
                  <Label className="text-xs text-zinc-500">Port</Label>
                  <Input
                    type="number"
                    value={newFinding.target_port ?? ""}
                    onChange={(e) => setNewFinding(prev => ({ ...prev, target_port: e.target.value ? Number(e.target.value) : undefined }))}
                    placeholder="443"
                    className="mt-1 bg-zinc-900/50 border-zinc-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-zinc-500">Severity</Label>
                  <Select
                    value={newFinding.severity || "medium"}
                    onValueChange={(v) => setNewFinding(prev => ({ ...prev, severity: v as FindingSeverity }))}
                  >
                    <SelectTrigger className="mt-1 bg-zinc-900/50 border-zinc-800">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="info">Info</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-zinc-500">Type</Label>
                  <Select
                    value={newFinding.finding_type || "vuln"}
                    onValueChange={(v) => setNewFinding(prev => ({ ...prev, finding_type: v as FindingType }))}
                  >
                    <SelectTrigger className="mt-1 bg-zinc-900/50 border-zinc-800">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vuln">Vulnerability</SelectItem>
                      <SelectItem value="misconfig">Misconfiguration</SelectItem>
                      <SelectItem value="info">Information</SelectItem>
                      <SelectItem value="exposure">Exposure</SelectItem>
                      <SelectItem value="credential">Credential</SelectItem>
                      <SelectItem value="service">Service</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="text-xs text-zinc-500">Description</Label>
                <Textarea
                  value={newFinding.description || ""}
                  onChange={(e) => setNewFinding(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe the finding..."
                  className="mt-1 bg-zinc-900/50 border-zinc-800 min-h-[80px] resize-none text-sm"
                />
              </div>

              <div>
                <Label className="text-xs text-zinc-500">CVEs (comma-separated)</Label>
                <Input
                  value={newFindingCves}
                  onChange={(e) => setNewFindingCves(e.target.value)}
                  placeholder="CVE-2024-1234, CVE-2024-5678"
                  className="mt-1 bg-zinc-900/50 border-zinc-800 font-mono text-xs"
                />
              </div>

              <div>
                <Label className="text-xs text-zinc-500">Tags (comma-separated)</Label>
                <Input
                  value={newFindingTags}
                  onChange={(e) => setNewFindingTags(e.target.value)}
                  placeholder="auth-bypass, critical-chain, rce"
                  className="mt-1 bg-zinc-900/50 border-zinc-800 text-xs"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setNewFindingDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleCreateFinding}
                disabled={creating || !newFinding.title || !newFinding.target_host}
                className="gap-1.5"
              >
                {creating ? "Creating..." : "Create Finding"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
