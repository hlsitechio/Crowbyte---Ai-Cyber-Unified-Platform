/**
 * Reports Page — Security Report Generator & Manager
 * Phase 3 of the Cybersecurity Gaps Integration Plan.
 * Generate, manage, export security reports from findings.
 * Supports: HackerOne, Bugcrowd, Pentest Full, Executive Summary, Custom.
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
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  reportGenerator,
  type Report,
  type ReportType,
  type ReportTemplate,
  type ReportStatus,
  type ExportFormat,
  type CreateReportData,
  type ReportTemplateConfig,
} from "@/services/report-generator";
import { findingsEngine, type Finding } from "@/services/findings-engine";
import {
  FileText,
  Plus,
  MagnifyingGlass,
  Trash,
  DotsThreeVertical,
  Copy,
  DownloadSimple,
  Eye,
  PencilSimple,
  Crosshair,
  ClipboardText,
  Export,
  FileMd,
  FileHtml,
  FileJs,
  FileCode,
  ArrowsClockwise,
  CheckCircle,
  Clock,
  Note,
  Target,
  Tag,
  CaretDown,
  X,
  Warning,
  ShieldCheck,
  Lightning,
} from "@phosphor-icons/react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow, format } from "date-fns";

// ─── Constants ─────────────────────────────────────────────────────────────────

const REPORT_TYPES: { value: ReportType; label: string }[] = [
  { value: "pentest", label: "Pentest" },
  { value: "bounty", label: "Bug Bounty" },
  { value: "disclosure", label: "Disclosure" },
  { value: "compliance", label: "Compliance" },
  { value: "executive", label: "Executive" },
];

const TEMPLATES: { value: ReportTemplate; label: string; description: string }[] = [
  { value: "hackerone", label: "HackerOne", description: "Standard H1 bug report format" },
  { value: "bugcrowd", label: "Bugcrowd", description: "Bugcrowd submission format" },
  { value: "pentest_full", label: "Pentest Full", description: "Comprehensive pentest report" },
  { value: "pentest_executive", label: "Executive Summary", description: "High-level management summary" },
  { value: "disclosure", label: "Disclosure", description: "Responsible disclosure format" },
  { value: "custom", label: "Custom", description: "Blank template, full control" },
];

const STATUS_COLORS: Record<ReportStatus, string> = {
  draft: "bg-zinc-500/20 text-zinc-400 border border-zinc-500/30",
  review: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
  final: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
  submitted: "bg-blue-500/20 text-blue-400 border border-blue-500/30",
};

const STATUS_LABELS: Record<ReportStatus, string> = {
  draft: "Draft",
  review: "In Review",
  final: "Final",
  submitted: "Submitted",
};

const TYPE_COLORS: Record<ReportType, string> = {
  pentest: "bg-purple-500/20 text-purple-400 border border-purple-500/30",
  bounty: "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30",
  disclosure: "bg-amber-500/20 text-amber-400 border border-amber-500/30",
  compliance: "bg-blue-500/20 text-blue-400 border border-blue-500/30",
  executive: "bg-rose-500/20 text-rose-400 border border-rose-500/30",
};

const TYPE_LABELS: Record<ReportType, string> = {
  pentest: "Pentest",
  bounty: "Bug Bounty",
  disclosure: "Disclosure",
  compliance: "Compliance",
  executive: "Executive",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const EXPORT_FORMATS: { value: ExportFormat; label: string; icon: React.ComponentType<any> }[] = [
  { value: "markdown", label: "Markdown", icon: FileMd },
  { value: "html", label: "HTML", icon: FileHtml },
  { value: "pdf_html", label: "PDF-ready HTML", icon: FileCode },
  { value: "hackerone_json", label: "HackerOne JSON", icon: FileJs },
  { value: "bugcrowd_json", label: "Bugcrowd JSON", icon: FileJs },
  { value: "json", label: "Raw JSON", icon: FileCode },
];

const SEVERITY_COLORS: Record<string, string> = {
  critical: "bg-red-500/20 text-red-400 border border-red-500/30",
  high: "bg-orange-500/20 text-orange-400 border border-orange-500/30",
  medium: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
  low: "bg-blue-500/20 text-blue-400 border border-blue-500/30",
  info: "bg-zinc-500/20 text-zinc-400 border border-zinc-500/30",
};

// ─── Component ─────────────────────────────────────────────────────────────────

export default function Reports() {
  const { toast } = useToast();

  // Data
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<ReportTemplateConfig[]>([]);

  // Search / filter
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<ReportStatus | "all">("all");
  const [filterType, setFilterType] = useState<ReportType | "all">("all");

  // Selection / editing
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [createData, setCreateData] = useState<Partial<CreateReportData>>({
    title: "",
    target: "",
    report_type: "bounty",
    template: "hackerone",
    client_name: "",
    assessor_name: "",
    classification: "Confidential",
  });
  const [creating, setCreating] = useState(false);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<Report | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Report editor state
  const [editFields, setEditFields] = useState<{
    executive_summary: string;
    scope: string;
    methodology: string;
    recommendations: string;
  }>({ executive_summary: "", scope: "", methodology: "", recommendations: "" });
  const [saving, setSaving] = useState(false);

  // Findings for selected report
  const [reportFindings, setReportFindings] = useState<Finding[]>([]);
  const [allFindings, setAllFindings] = useState<Finding[]>([]);
  const [loadingFindings, setLoadingFindings] = useState(false);
  const [autoPopulating, setAutoPopulating] = useState(false);

  // Export
  const [exportFormat, setExportFormat] = useState<ExportFormat>("markdown");
  const [exportPreview, setExportPreview] = useState<string>("");
  const [exporting, setExporting] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // ─── Data Loading ──────────────────────────────────────────────────────────

  const loadReports = useCallback(async () => {
    try {
      setLoading(true);
      const [data, tpls] = await Promise.all([
        reportGenerator.getAll(),
        reportGenerator.getTemplates(),
      ]);
      setReports(data);
      setTemplates(tpls);
    } catch (err) {
      console.error("Failed to load reports:", err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to load reports",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  // Load findings when a report is selected
  useEffect(() => {
    if (!selectedReport) {
      setReportFindings([]);
      return;
    }

    setEditFields({
      executive_summary: selectedReport.executive_summary || "",
      scope: selectedReport.scope || "",
      methodology: selectedReport.methodology || "",
      recommendations: selectedReport.recommendations || "",
    });

    const loadReportFindings = async () => {
      setLoadingFindings(true);
      try {
        const [rFindings, aFindings] = await Promise.all([
          reportGenerator.getReportFindings(selectedReport.id),
          findingsEngine.getAll({}),
        ]);
        setReportFindings(rFindings);
        setAllFindings(aFindings);
      } catch (err) {
        console.error("Failed to load report findings:", err);
      } finally {
        setLoadingFindings(false);
      }
    };

    loadReportFindings();
  }, [selectedReport]);

  // ─── Filtered Reports ──────────────────────────────────────────────────────

  const filteredReports = useMemo(() => {
    let result = [...reports];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        r =>
          r.title.toLowerCase().includes(q) ||
          r.target?.toLowerCase().includes(q) ||
          r.client_name?.toLowerCase().includes(q)
      );
    }
    if (filterStatus !== "all") {
      result = result.filter(r => r.status === filterStatus);
    }
    if (filterType !== "all") {
      result = result.filter(r => r.report_type === filterType);
    }

    return result;
  }, [reports, search, filterStatus, filterType]);

  // ─── Stats ─────────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const total = reports.length;
    const drafts = reports.filter(r => r.status === "draft").length;
    const finals = reports.filter(r => r.status === "final").length;
    const exported = reports.filter(r => r.last_exported_at).length;
    return { total, drafts, finals, exported };
  }, [reports]);

  // ─── Create Report ─────────────────────────────────────────────────────────

  const handleCreate = async () => {
    if (!createData.title?.trim()) {
      toast({ title: "Validation", description: "Report title is required", variant: "destructive" });
      return;
    }

    try {
      setCreating(true);
      const report = await reportGenerator.create({
        title: createData.title!.trim(),
        target: createData.target || undefined,
        report_type: createData.report_type as ReportType,
        template: createData.template as ReportTemplate,
        client_name: createData.client_name || undefined,
        assessor_name: createData.assessor_name || undefined,
        classification: createData.classification || undefined,
      });

      toast({ title: "Report Created", description: `"${report.title}" created as draft` });
      setCreateOpen(false);
      setCreateData({
        title: "",
        target: "",
        report_type: "bounty",
        template: "hackerone",
        client_name: "",
        assessor_name: "",
        classification: "Confidential",
      });
      await loadReports();
      setSelectedReport(report);
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to create report",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  // ─── Delete Report ─────────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await reportGenerator.delete(deleteTarget.id);
      toast({ title: "Deleted", description: `"${deleteTarget.title}" removed` });

      if (selectedReport?.id === deleteTarget.id) {
        setSelectedReport(null);
      }
      setDeleteTarget(null);
      await loadReports();
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to delete report",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  // ─── Save Report Fields ────────────────────────────────────────────────────

  const handleSaveFields = async () => {
    if (!selectedReport) return;
    try {
      setSaving(true);
      const updated = await reportGenerator.update(selectedReport.id, {
        executive_summary: editFields.executive_summary || undefined,
        scope: editFields.scope || undefined,
        methodology: editFields.methodology || undefined,
        recommendations: editFields.recommendations || undefined,
      });
      setSelectedReport(updated);
      toast({ title: "Saved", description: "Report content updated" });
      await loadReports();
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to save",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // ─── Update Report Status ─────────────────────────────────────────────────

  const handleStatusChange = async (status: ReportStatus) => {
    if (!selectedReport) return;
    try {
      const updated = await reportGenerator.update(selectedReport.id, { status });
      setSelectedReport(updated);
      toast({ title: "Status Updated", description: `Report marked as ${STATUS_LABELS[status]}` });
      await loadReports();
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to update status",
        variant: "destructive",
      });
    }
  };

  // ─── Findings Management ──────────────────────────────────────────────────

  const handleAutoPopulate = async () => {
    if (!selectedReport) return;
    try {
      setAutoPopulating(true);
      const count = await reportGenerator.autoPopulate(selectedReport.id, selectedReport.target);
      toast({
        title: "Auto-Populated",
        description: count > 0
          ? `${count} confirmed finding${count !== 1 ? "s" : ""} added`
          : "No new confirmed findings to add",
      });

      // Reload report and findings
      const [updated, rFindings] = await Promise.all([
        reportGenerator.getById(selectedReport.id),
        reportGenerator.getReportFindings(selectedReport.id),
      ]);
      setSelectedReport(updated);
      setReportFindings(rFindings);
      await loadReports();
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Auto-populate failed",
        variant: "destructive",
      });
    } finally {
      setAutoPopulating(false);
    }
  };

  const handleAddFinding = async (findingId: string) => {
    if (!selectedReport) return;
    try {
      await reportGenerator.addFinding(selectedReport.id, findingId);
      const [updated, rFindings] = await Promise.all([
        reportGenerator.getById(selectedReport.id),
        reportGenerator.getReportFindings(selectedReport.id),
      ]);
      setSelectedReport(updated);
      setReportFindings(rFindings);
      toast({ title: "Added", description: "Finding added to report" });
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to add finding",
        variant: "destructive",
      });
    }
  };

  const handleRemoveFinding = async (findingId: string) => {
    if (!selectedReport) return;
    try {
      await reportGenerator.removeFinding(selectedReport.id, findingId);
      const [updated, rFindings] = await Promise.all([
        reportGenerator.getById(selectedReport.id),
        reportGenerator.getReportFindings(selectedReport.id),
      ]);
      setSelectedReport(updated);
      setReportFindings(rFindings);
      toast({ title: "Removed", description: "Finding removed from report" });
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to remove finding",
        variant: "destructive",
      });
    }
  };

  // Available findings (not already in report)
  const availableFindings = useMemo(() => {
    if (!selectedReport) return [];
    const included = new Set(selectedReport.findings_ids || []);
    return allFindings.filter(f => !included.has(f.id));
  }, [allFindings, selectedReport]);

  // ─── Export ────────────────────────────────────────────────────────────────

  const handleGeneratePreview = async () => {
    if (!selectedReport) return;
    try {
      setLoadingPreview(true);
      let content = "";

      switch (exportFormat) {
        case "markdown":
          content = await reportGenerator.exportMarkdown(selectedReport.id);
          break;
        case "html":
          content = await reportGenerator.exportHTML(selectedReport.id);
          break;
        case "pdf_html":
          content = await reportGenerator.exportPdfHTML(selectedReport.id);
          break;
        case "hackerone_json": {
          const h1 = await reportGenerator.exportHackerOneJSON(selectedReport.id);
          content = JSON.stringify(h1, null, 2);
          break;
        }
        case "bugcrowd_json": {
          const bc = await reportGenerator.exportBugcrowdJSON(selectedReport.id);
          content = JSON.stringify(bc, null, 2);
          break;
        }
        case "json": {
          const raw = await reportGenerator.exportJSON(selectedReport.id);
          content = JSON.stringify(raw, null, 2);
          break;
        }
      }

      setExportPreview(content);

      // Refresh report to get updated last_exported_at
      const updated = await reportGenerator.getById(selectedReport.id);
      setSelectedReport(updated);
      await loadReports();
    } catch (err) {
      toast({
        title: "Export Error",
        description: err instanceof Error ? err.message : "Failed to generate export",
        variant: "destructive",
      });
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleCopyToClipboard = async () => {
    if (!exportPreview) return;
    try {
      await navigator.clipboard.writeText(exportPreview);
      toast({ title: "Copied", description: "Export content copied to clipboard" });
    } catch {
      toast({ title: "Error", description: "Failed to copy to clipboard", variant: "destructive" });
    }
  };

  const handleDownload = () => {
    if (!exportPreview || !selectedReport) return;

    const extMap: Record<ExportFormat, string> = {
      markdown: ".md",
      html: ".html",
      pdf_html: ".html",
      hackerone_json: ".json",
      bugcrowd_json: ".json",
      json: ".json",
    };

    const mimeMap: Record<ExportFormat, string> = {
      markdown: "text/markdown",
      html: "text/html",
      pdf_html: "text/html",
      hackerone_json: "application/json",
      bugcrowd_json: "application/json",
      json: "application/json",
    };

    const filename = `${selectedReport.title.replace(/[^a-zA-Z0-9-_ ]/g, "").replace(/\s+/g, "_")}${extMap[exportFormat]}`;
    const blob = new Blob([exportPreview], { type: mimeMap[exportFormat] });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({ title: "Downloaded", description: `Saved as ${filename}` });
  };

  // ─── Template Section Preview ──────────────────────────────────────────────

  const getTemplateSections = (templateId: ReportTemplate): string[] => {
    const tpl = templates.find(t =>
      t.id === `tpl-${templateId.replace("_", "-")}` ||
      t.name.toLowerCase().includes(templateId.replace("_", " "))
    );
    if (tpl) return tpl.sections.map(s => s.title);

    // Fallback
    const fallback: Record<string, string[]> = {
      hackerone: ["Title", "Vulnerability Information", "Steps to Reproduce", "Impact", "Supporting Material"],
      bugcrowd: ["Title", "Description", "Steps to Reproduce", "Impact"],
      pentest_full: ["Executive Summary", "Scope", "Methodology", "Findings", "Recommendations"],
      pentest_executive: ["Executive Summary", "Risk Overview", "Key Findings", "Recommendations"],
      disclosure: ["Summary", "Vulnerability Details", "Impact", "Steps to Reproduce", "Remediation"],
      custom: ["(Custom sections)"],
    };
    return fallback[templateId] || [];
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full bg-zinc-950 overflow-hidden">
      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex-shrink-0 px-6 pt-6 pb-4"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
              <FileText size={24} weight="duotone" className="text-cyan-400" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-zinc-100">Reports</h1>
              <p className="text-sm text-zinc-500">Generate, manage, and export security reports</p>
            </div>
          </div>

          <Button
            onClick={() => setCreateOpen(true)}
            className="bg-cyan-600 hover:bg-cyan-700 text-white gap-2"
          >
            <Plus size={16} weight="bold" />
            New Report
          </Button>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Total Reports", value: stats.total, icon: FileText, color: "text-zinc-400" },
            { label: "Drafts", value: stats.drafts, icon: PencilSimple, color: "text-zinc-400" },
            { label: "Finalized", value: stats.finals, icon: CheckCircle, color: "text-emerald-400" },
            { label: "Exported", value: stats.exported, icon: Export, color: "text-cyan-400" },
          ].map((stat) => (
            <Card key={stat.label} className="bg-zinc-900/50 border-zinc-800/50">
              <CardContent className="p-3 flex items-center gap-3">
                <stat.icon size={20} weight="duotone" className={stat.color} />
                <div>
                  <p className="text-lg font-semibold text-zinc-100">{stat.value}</p>
                  <p className="text-xs text-zinc-500">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </motion.div>

      {/* ─── Main Content ────────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden px-6 pb-6 gap-4">
        {/* ─── Report List (Left Panel) ──────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className={`flex flex-col ${selectedReport ? "w-[380px] flex-shrink-0" : "flex-1"} transition-all duration-300`}
        >
          <Card className="flex-1 flex flex-col bg-zinc-900/50 border-zinc-800/50 overflow-hidden">
            <CardHeader className="p-4 flex-shrink-0 space-y-3">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <Input
                    placeholder="Search reports..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 bg-zinc-800/50 border-zinc-700/50 text-zinc-200 placeholder:text-zinc-600 h-9"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Select
                  value={filterStatus}
                  onValueChange={(v) => setFilterStatus(v as ReportStatus | "all")}
                >
                  <SelectTrigger className="h-8 bg-zinc-800/50 border-zinc-700/50 text-zinc-300 text-xs w-[130px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-700">
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="review">In Review</SelectItem>
                    <SelectItem value="final">Final</SelectItem>
                    <SelectItem value="submitted">Submitted</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={filterType}
                  onValueChange={(v) => setFilterType(v as ReportType | "all")}
                >
                  <SelectTrigger className="h-8 bg-zinc-800/50 border-zinc-700/50 text-zinc-300 text-xs w-[130px]">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-700">
                    <SelectItem value="all">All Types</SelectItem>
                    {REPORT_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {(filterStatus !== "all" || filterType !== "all" || search) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearch("");
                      setFilterStatus("all");
                      setFilterType("all");
                    }}
                    className="h-8 px-2 text-zinc-500 hover:text-zinc-300"
                  >
                    <X size={14} />
                  </Button>
                )}
              </div>
            </CardHeader>

            <CardContent className="flex-1 p-0 overflow-hidden">
              <ScrollArea className="h-full">
                {loading ? (
                  <div className="p-4 space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-20 w-full bg-zinc-800/50 rounded-lg" />
                    ))}
                  </div>
                ) : filteredReports.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                    <FileText size={48} weight="duotone" className="text-zinc-700 mb-3" />
                    <p className="text-zinc-500 text-sm">
                      {reports.length === 0 ? "No reports yet" : "No reports match filters"}
                    </p>
                    {reports.length === 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCreateOpen(true)}
                        className="mt-2 text-cyan-400 hover:text-cyan-300"
                      >
                        <Plus size={14} className="mr-1" />
                        Create your first report
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="p-2 space-y-1">
                    <AnimatePresence>
                      {filteredReports.map((report, index) => (
                        <motion.div
                          key={report.id}
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          transition={{ duration: 0.15, delay: index * 0.02 }}
                          onClick={() => {
                            setSelectedReport(report);
                            setActiveTab("overview");
                            setExportPreview("");
                          }}
                          className={`group p-3 rounded-lg cursor-pointer transition-all duration-150 border ${
                            selectedReport?.id === report.id
                              ? "bg-cyan-500/10 border-cyan-500/30"
                              : "bg-zinc-900/30 border-transparent hover:bg-zinc-800/50 hover:border-zinc-700/50"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-zinc-200 truncate">
                                {report.title}
                              </p>
                              {report.target && (
                                <p className="text-xs text-zinc-500 truncate mt-0.5">
                                  <Target size={10} weight="duotone" className="inline mr-1" />
                                  {report.target}
                                </p>
                              )}
                            </div>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <DotsThreeVertical size={14} className="text-zinc-500" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                align="end"
                                className="bg-zinc-900 border-zinc-700"
                              >
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedReport(report);
                                    setActiveTab("overview");
                                  }}
                                  className="text-zinc-300 focus:text-zinc-100"
                                >
                                  <Eye size={14} className="mr-2" />
                                  Open
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedReport(report);
                                    setActiveTab("export");
                                  }}
                                  className="text-zinc-300 focus:text-zinc-100"
                                >
                                  <Export size={14} className="mr-2" />
                                  Export
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-zinc-700" />
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteTarget(report);
                                  }}
                                  className="text-red-400 focus:text-red-300"
                                >
                                  <Trash size={14} className="mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>

                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <Badge className={`text-[10px] px-1.5 py-0 ${STATUS_COLORS[report.status]}`}>
                              {STATUS_LABELS[report.status]}
                            </Badge>
                            <Badge className={`text-[10px] px-1.5 py-0 ${TYPE_COLORS[report.report_type]}`}>
                              {TYPE_LABELS[report.report_type]}
                            </Badge>
                            {report.findings_ids.length > 0 && (
                              <span className="text-[10px] text-zinc-500">
                                {report.findings_ids.length} finding{report.findings_ids.length !== 1 ? "s" : ""}
                              </span>
                            )}
                            <span className="text-[10px] text-zinc-600 ml-auto">
                              {formatDistanceToNow(new Date(report.updated_at), { addSuffix: true })}
                            </span>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </motion.div>

        {/* ─── Report Editor (Right Panel) ───────────────────────────────── */}
        <AnimatePresence mode="wait">
          {selectedReport && (
            <motion.div
              key={selectedReport.id}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
              className="flex-1 flex flex-col overflow-hidden"
            >
              <Card className="flex-1 flex flex-col bg-zinc-900/50 border-zinc-800/50 overflow-hidden">
                {/* Editor Header */}
                <CardHeader className="p-4 flex-shrink-0 border-b border-zinc-800/50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0 mr-4">
                      <div className="flex items-center gap-2 mb-1">
                        <h2 className="text-lg font-semibold text-zinc-100 truncate">
                          {selectedReport.title}
                        </h2>
                        <Badge className={`text-[10px] px-1.5 py-0 flex-shrink-0 ${STATUS_COLORS[selectedReport.status]}`}>
                          {STATUS_LABELS[selectedReport.status]}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-zinc-500">
                        {selectedReport.target && (
                          <span className="flex items-center gap-1">
                            <Target size={12} weight="duotone" />
                            {selectedReport.target}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Tag size={12} weight="duotone" />
                          {TYPE_LABELS[selectedReport.report_type]}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={12} weight="duotone" />
                          Updated {formatDistanceToNow(new Date(selectedReport.updated_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="h-8 gap-1 border-zinc-700 text-zinc-300">
                            Status
                            <CaretDown size={12} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-zinc-900 border-zinc-700">
                          {(["draft", "review", "final", "submitted"] as ReportStatus[]).map(s => (
                            <DropdownMenuItem
                              key={s}
                              onClick={() => handleStatusChange(s)}
                              className={`text-zinc-300 focus:text-zinc-100 ${selectedReport.status === s ? "bg-zinc-800" : ""}`}
                            >
                              <Badge className={`text-[10px] px-1.5 py-0 mr-2 ${STATUS_COLORS[s]}`}>
                                {STATUS_LABELS[s]}
                              </Badge>
                              {STATUS_LABELS[s]}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedReport(null)}
                        className="h-8 w-8 p-0 text-zinc-500 hover:text-zinc-300"
                      >
                        <X size={16} />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                {/* Editor Tabs */}
                <Tabs
                  value={activeTab}
                  onValueChange={setActiveTab}
                  className="flex-1 flex flex-col overflow-hidden"
                >
                  <TabsList className="mx-4 mt-3 mb-0 bg-zinc-800/50 border border-zinc-700/50 p-0.5 flex-shrink-0 w-fit">
                    <TabsTrigger
                      value="overview"
                      className="text-xs data-[state=active]:bg-zinc-700 data-[state=active]:text-zinc-100 text-zinc-400 px-4"
                    >
                      <Note size={14} weight="duotone" className="mr-1.5" />
                      Overview
                    </TabsTrigger>
                    <TabsTrigger
                      value="findings"
                      className="text-xs data-[state=active]:bg-zinc-700 data-[state=active]:text-zinc-100 text-zinc-400 px-4"
                    >
                      <Crosshair size={14} weight="duotone" className="mr-1.5" />
                      Findings
                      {reportFindings.length > 0 && (
                        <Badge className="ml-1.5 text-[10px] px-1 py-0 bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
                          {reportFindings.length}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger
                      value="export"
                      className="text-xs data-[state=active]:bg-zinc-700 data-[state=active]:text-zinc-100 text-zinc-400 px-4"
                    >
                      <Export size={14} weight="duotone" className="mr-1.5" />
                      Export
                    </TabsTrigger>
                  </TabsList>

                  {/* ─── Overview Tab ──────────────────────────────────────── */}
                  <TabsContent value="overview" className="flex-1 overflow-hidden m-0 p-0">
                    <ScrollArea className="h-full">
                      <div className="p-4 space-y-4">
                        <div className="space-y-2">
                          <Label className="text-xs text-zinc-400 font-medium">Executive Summary</Label>
                          <Textarea
                            value={editFields.executive_summary}
                            onChange={(e) => setEditFields(prev => ({ ...prev, executive_summary: e.target.value }))}
                            placeholder="High-level overview of the assessment and key findings..."
                            className="min-h-[120px] bg-zinc-800/50 border-zinc-700/50 text-zinc-200 placeholder:text-zinc-600 text-sm resize-y"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs text-zinc-400 font-medium">Scope</Label>
                          <Textarea
                            value={editFields.scope}
                            onChange={(e) => setEditFields(prev => ({ ...prev, scope: e.target.value }))}
                            placeholder="Define the assessment scope, targets, and boundaries..."
                            className="min-h-[80px] bg-zinc-800/50 border-zinc-700/50 text-zinc-200 placeholder:text-zinc-600 text-sm resize-y"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs text-zinc-400 font-medium">Methodology</Label>
                          <Textarea
                            value={editFields.methodology}
                            onChange={(e) => setEditFields(prev => ({ ...prev, methodology: e.target.value }))}
                            placeholder="Describe the testing methodology and tools used..."
                            className="min-h-[80px] bg-zinc-800/50 border-zinc-700/50 text-zinc-200 placeholder:text-zinc-600 text-sm resize-y"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs text-zinc-400 font-medium">Recommendations</Label>
                          <Textarea
                            value={editFields.recommendations}
                            onChange={(e) => setEditFields(prev => ({ ...prev, recommendations: e.target.value }))}
                            placeholder="Key remediation recommendations..."
                            className="min-h-[80px] bg-zinc-800/50 border-zinc-700/50 text-zinc-200 placeholder:text-zinc-600 text-sm resize-y"
                          />
                        </div>

                        {/* Report Metadata */}
                        <Separator className="bg-zinc-800" />

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Template</p>
                            <p className="text-sm text-zinc-300">
                              {TEMPLATES.find(t => t.value === selectedReport.template)?.label || selectedReport.template}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Classification</p>
                            <p className="text-sm text-zinc-300">{selectedReport.classification || "—"}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Client</p>
                            <p className="text-sm text-zinc-300">{selectedReport.client_name || "—"}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Assessor</p>
                            <p className="text-sm text-zinc-300">{selectedReport.assessor_name || "—"}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Created</p>
                            <p className="text-sm text-zinc-300">
                              {format(new Date(selectedReport.created_at), "MMM d, yyyy HH:mm")}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Last Exported</p>
                            <p className="text-sm text-zinc-300">
                              {selectedReport.last_exported_at
                                ? format(new Date(selectedReport.last_exported_at), "MMM d, yyyy HH:mm")
                                : "Never"}
                            </p>
                          </div>
                        </div>

                        {/* Save Button */}
                        <div className="flex justify-end pt-2">
                          <Button
                            onClick={handleSaveFields}
                            disabled={saving}
                            className="bg-cyan-600 hover:bg-cyan-700 text-white gap-2"
                          >
                            {saving ? (
                              <ArrowsClockwise size={14} className="animate-spin" />
                            ) : (
                              <CheckCircle size={14} weight="duotone" />
                            )}
                            {saving ? "Saving..." : "Save Changes"}
                          </Button>
                        </div>
                      </div>
                    </ScrollArea>
                  </TabsContent>

                  {/* ─── Findings Tab ─────────────────────────────────────── */}
                  <TabsContent value="findings" className="flex-1 overflow-hidden m-0 p-0">
                    <ScrollArea className="h-full">
                      <div className="p-4 space-y-4">
                        {/* Actions bar */}
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-zinc-400">
                            {reportFindings.length} finding{reportFindings.length !== 1 ? "s" : ""} in report
                          </p>
                          <Button
                            onClick={handleAutoPopulate}
                            disabled={autoPopulating}
                            variant="outline"
                            size="sm"
                            className="h-8 gap-2 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
                          >
                            {autoPopulating ? (
                              <ArrowsClockwise size={14} className="animate-spin" />
                            ) : (
                              <Lightning size={14} weight="duotone" />
                            )}
                            Auto-Populate
                          </Button>
                        </div>

                        {/* Included findings */}
                        {loadingFindings ? (
                          <div className="space-y-2">
                            {Array.from({ length: 3 }).map((_, i) => (
                              <Skeleton key={i} className="h-16 w-full bg-zinc-800/50 rounded-lg" />
                            ))}
                          </div>
                        ) : reportFindings.length === 0 ? (
                          <div className="flex flex-col items-center py-8 text-center">
                            <Crosshair size={36} weight="duotone" className="text-zinc-700 mb-2" />
                            <p className="text-sm text-zinc-500">No findings attached yet</p>
                            <p className="text-xs text-zinc-600 mt-1">
                              Use Auto-Populate or add findings manually below
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {reportFindings.map((finding, index) => (
                              <motion.div
                                key={finding.id}
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.03 }}
                                className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800/30 border border-zinc-700/30 group"
                              >
                                <span className="text-xs text-zinc-600 font-mono w-6 text-center flex-shrink-0">
                                  {index + 1}
                                </span>

                                <Badge className={`text-[10px] px-1.5 py-0 flex-shrink-0 ${SEVERITY_COLORS[finding.severity] || SEVERITY_COLORS.info}`}>
                                  {finding.severity.toUpperCase()}
                                </Badge>

                                <div className="flex-1 min-w-0">
                                  <p className="text-sm text-zinc-200 truncate">{finding.title}</p>
                                  <p className="text-xs text-zinc-500 truncate">
                                    {finding.target_url || finding.target_host}
                                    {finding.target_port ? `:${finding.target_port}` : ""}
                                  </p>
                                </div>

                                <span className="text-[10px] text-zinc-600 flex-shrink-0">
                                  {finding.source}
                                </span>

                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveFinding(finding.id)}
                                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-zinc-500 hover:text-red-400"
                                >
                                  <X size={12} />
                                </Button>
                              </motion.div>
                            ))}
                          </div>
                        )}

                        {/* Add findings section */}
                        {availableFindings.length > 0 && (
                          <>
                            <Separator className="bg-zinc-800" />
                            <div>
                              <p className="text-xs text-zinc-500 font-medium mb-2 uppercase tracking-wider">
                                Available Findings ({availableFindings.length})
                              </p>
                              <div className="space-y-1 max-h-[300px] overflow-y-auto pr-1">
                                {availableFindings.slice(0, 50).map((finding) => (
                                  <div
                                    key={finding.id}
                                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-800/30 cursor-pointer transition-colors group"
                                    onClick={() => handleAddFinding(finding.id)}
                                  >
                                    <Plus
                                      size={14}
                                      weight="bold"
                                      className="text-zinc-600 group-hover:text-cyan-400 transition-colors flex-shrink-0"
                                    />

                                    <Badge className={`text-[10px] px-1.5 py-0 flex-shrink-0 ${SEVERITY_COLORS[finding.severity] || SEVERITY_COLORS.info}`}>
                                      {finding.severity.toUpperCase()}
                                    </Badge>

                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm text-zinc-300 truncate">{finding.title}</p>
                                    </div>

                                    <span className="text-[10px] text-zinc-600 flex-shrink-0">
                                      {finding.status}
                                    </span>
                                  </div>
                                ))}
                                {availableFindings.length > 50 && (
                                  <p className="text-xs text-zinc-600 text-center py-2">
                                    +{availableFindings.length - 50} more findings
                                  </p>
                                )}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </ScrollArea>
                  </TabsContent>

                  {/* ─── Export Tab ────────────────────────────────────────── */}
                  <TabsContent value="export" className="flex-1 overflow-hidden m-0 p-0">
                    <div className="flex flex-col h-full">
                      {/* Export controls */}
                      <div className="p-4 flex-shrink-0 space-y-3 border-b border-zinc-800/50">
                        <div className="flex items-center gap-3">
                          <div className="flex-1">
                            <Label className="text-xs text-zinc-400 font-medium mb-1.5 block">Export Format</Label>
                            <Select
                              value={exportFormat}
                              onValueChange={(v) => {
                                setExportFormat(v as ExportFormat);
                                setExportPreview("");
                              }}
                            >
                              <SelectTrigger className="h-9 bg-zinc-800/50 border-zinc-700/50 text-zinc-300">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-zinc-900 border-zinc-700">
                                {EXPORT_FORMATS.map(fmt => (
                                  <SelectItem key={fmt.value} value={fmt.value}>
                                    <div className="flex items-center gap-2">
                                      <fmt.icon size={14} weight="duotone" />
                                      {fmt.label}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="flex items-end gap-2">
                            <Button
                              onClick={handleGeneratePreview}
                              disabled={loadingPreview}
                              className="bg-cyan-600 hover:bg-cyan-700 text-white gap-2 h-9"
                            >
                              {loadingPreview ? (
                                <ArrowsClockwise size={14} className="animate-spin" />
                              ) : (
                                <Eye size={14} weight="duotone" />
                              )}
                              {loadingPreview ? "Generating..." : "Generate"}
                            </Button>
                          </div>
                        </div>

                        {exportPreview && (
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleCopyToClipboard}
                              className="h-8 gap-1.5 border-zinc-700 text-zinc-300"
                            >
                              <Copy size={14} weight="duotone" />
                              Copy to Clipboard
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleDownload}
                              className="h-8 gap-1.5 border-zinc-700 text-zinc-300"
                            >
                              <DownloadSimple size={14} weight="duotone" />
                              Download
                            </Button>
                            {selectedReport.last_exported_at && (
                              <span className="text-[10px] text-zinc-600 ml-auto">
                                Last exported: {formatDistanceToNow(new Date(selectedReport.last_exported_at), { addSuffix: true })}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Preview pane */}
                      <div className="flex-1 overflow-hidden">
                        {exportPreview ? (
                          <ScrollArea className="h-full">
                            <pre className="p-4 text-xs text-zinc-300 font-mono whitespace-pre-wrap break-words leading-relaxed">
                              {exportPreview}
                            </pre>
                          </ScrollArea>
                        ) : (
                          <div className="flex flex-col items-center justify-center h-full text-center">
                            <Export size={48} weight="duotone" className="text-zinc-700 mb-3" />
                            <p className="text-sm text-zinc-500">Select a format and click Generate</p>
                            <p className="text-xs text-zinc-600 mt-1">
                              Preview will appear here before downloading
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty state when no report selected and we have reports */}
        {!selectedReport && !loading && reports.length > 0 && filteredReports.length > 0 && (
          <div className="hidden" /> // List takes full width when no report selected
        )}
      </div>

      {/* ─── Create Report Dialog ──────────────────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-700 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-zinc-100 flex items-center gap-2">
              <FileText size={20} weight="duotone" className="text-cyan-400" />
              New Report
            </DialogTitle>
            <DialogDescription className="text-zinc-500">
              Create a new security report from your findings
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-xs text-zinc-400">Title *</Label>
              <Input
                value={createData.title || ""}
                onChange={(e) => setCreateData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Q1 2026 Pentest Report — target.com"
                className="bg-zinc-800/50 border-zinc-700/50 text-zinc-200 placeholder:text-zinc-600"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-zinc-400">Target</Label>
              <Input
                value={createData.target || ""}
                onChange={(e) => setCreateData(prev => ({ ...prev, target: e.target.value }))}
                placeholder="e.g., target.com, 10.0.0.0/24"
                className="bg-zinc-800/50 border-zinc-700/50 text-zinc-200 placeholder:text-zinc-600"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs text-zinc-400">Report Type</Label>
                <Select
                  value={createData.report_type || "bounty"}
                  onValueChange={(v) => setCreateData(prev => ({ ...prev, report_type: v as ReportType }))}
                >
                  <SelectTrigger className="bg-zinc-800/50 border-zinc-700/50 text-zinc-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-700">
                    {REPORT_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-zinc-400">Template</Label>
                <Select
                  value={createData.template || "hackerone"}
                  onValueChange={(v) => setCreateData(prev => ({ ...prev, template: v as ReportTemplate }))}
                >
                  <SelectTrigger className="bg-zinc-800/50 border-zinc-700/50 text-zinc-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-700">
                    {TEMPLATES.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Template sections preview */}
            {createData.template && (
              <div className="p-3 rounded-lg bg-zinc-800/30 border border-zinc-700/30">
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2">
                  Template Sections
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {getTemplateSections(createData.template as ReportTemplate).map((section) => (
                    <Badge
                      key={section}
                      className="text-[10px] px-1.5 py-0 bg-zinc-700/50 text-zinc-400 border-zinc-600/50"
                    >
                      {section}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs text-zinc-400">Client Name</Label>
                <Input
                  value={createData.client_name || ""}
                  onChange={(e) => setCreateData(prev => ({ ...prev, client_name: e.target.value }))}
                  placeholder="Optional"
                  className="bg-zinc-800/50 border-zinc-700/50 text-zinc-200 placeholder:text-zinc-600"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-zinc-400">Assessor Name</Label>
                <Input
                  value={createData.assessor_name || ""}
                  onChange={(e) => setCreateData(prev => ({ ...prev, assessor_name: e.target.value }))}
                  placeholder="Optional"
                  className="bg-zinc-800/50 border-zinc-700/50 text-zinc-200 placeholder:text-zinc-600"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-zinc-400">Classification</Label>
              <Select
                value={createData.classification || "Confidential"}
                onValueChange={(v) => setCreateData(prev => ({ ...prev, classification: v }))}
              >
                <SelectTrigger className="bg-zinc-800/50 border-zinc-700/50 text-zinc-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700">
                  <SelectItem value="Public">Public</SelectItem>
                  <SelectItem value="Internal">Internal</SelectItem>
                  <SelectItem value="Confidential">Confidential</SelectItem>
                  <SelectItem value="Restricted">Restricted</SelectItem>
                  <SelectItem value="Top Secret">Top Secret</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setCreateOpen(false)}
              className="text-zinc-400 hover:text-zinc-300"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={creating || !createData.title?.trim()}
              className="bg-cyan-600 hover:bg-cyan-700 text-white gap-2"
            >
              {creating ? (
                <ArrowsClockwise size={14} className="animate-spin" />
              ) : (
                <Plus size={14} weight="bold" />
              )}
              {creating ? "Creating..." : "Create Report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirmation Dialog ────────────────────────────────── */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="bg-zinc-900 border-zinc-700 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-zinc-100 flex items-center gap-2">
              <Warning size={20} weight="duotone" className="text-red-400" />
              Delete Report
            </DialogTitle>
            <DialogDescription className="text-zinc-500">
              Are you sure you want to delete{" "}
              <span className="text-zinc-300 font-medium">"{deleteTarget?.title}"</span>?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDeleteTarget(null)}
              className="text-zinc-400 hover:text-zinc-300"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white gap-2"
            >
              {deleting ? (
                <ArrowsClockwise size={14} className="animate-spin" />
              ) : (
                <Trash size={14} weight="bold" />
              )}
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
