/**
 * Detection Lab — Natural Language to Detection Rules
 * Phase 4 of the Cybersecurity Gaps Integration Plan.
 * Generate SIGMA, KQL, SPL, YARA, Snort, Suricata rules from plain English.
 * Test against sample logs. Deploy to SIEMs. Track MITRE ATT&CK coverage.
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  detectionEngine,
  type DetectionRule, type RuleFormat, type RuleStatus, type CreateRuleData,
  type GenerateRuleRequest, type TestResults,
  MITRE_TACTICS, COMMON_TECHNIQUES,
} from "@/services/detection-engine";
import { UilBolt, UilPlus, UilSearch, UilTrashAlt, UilEllipsisV, UilCopy, UilDownloadAlt, UilPen, UilPlay, UilSync, UilCheckCircle, UilClock, UilAngleDown, UilTimes, UilExclamationTriangle, UilBracketsCurly, UilSave, UilFlask, UilRocket, UilListUl, UilFocusTarget, UilFilter, UilSitemap, UilAngleRight, UilExchange } from "@iconscout/react-unicons";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow, format } from "date-fns";

// ─── Constants ─────────────────────────────────────────────────────────────────

const RULE_FORMATS: { value: RuleFormat; label: string }[] = [
  { value: "sigma", label: "SIGMA" },
  { value: "kql", label: "KQL" },
  { value: "spl", label: "SPL" },
  { value: "yara", label: "YARA" },
  { value: "snort", label: "Snort" },
  { value: "suricata", label: "Suricata" },
];

const SEVERITY_OPTIONS = [
  { value: "critical", label: "Critical" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

const FORMAT_BADGE_COLORS: Record<RuleFormat, string> = {
  sigma: "bg-purple-500/20 text-purple-400",
  kql: "bg-blue-500/20 text-blue-400",
  spl: "bg-orange-500/20 text-orange-400",
  yara: "bg-emerald-500/20 text-emerald-400",
  snort: "bg-red-500/20 text-red-400",
  suricata: "bg-amber-500/20 text-amber-400",
};

const STATUS_BADGE_COLORS: Record<RuleStatus, string> = {
  draft: "bg-zinc-500/20 text-zinc-400",
  testing: "bg-yellow-500/20 text-yellow-400",
  active: "bg-emerald-500/20 text-emerald-400",
  disabled: "bg-zinc-600/20 text-zinc-500 border border-zinc-600/30",
  retired: "bg-red-500/20 text-red-400",
};

const STATUS_LABELS: Record<RuleStatus, string> = {
  draft: "Draft",
  testing: "Testing",
  active: "Active",
  disabled: "Disabled",
  retired: "Retired",
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: "text-red-400",
  high: "text-orange-400",
  medium: "text-yellow-400",
  low: "text-blue-400",
};

const DEPLOY_TARGETS = [
  "Elastic SIEM",
  "Splunk Enterprise",
  "Microsoft Sentinel",
  "CrowdStrike Falcon",
  "Wazuh",
  "Suricata IDS",
  "Snort IDS",
];

// ─── Component ──────────────────────────────────────────────────────────────────

function DetectionLab() {
  const { toast } = useToast();

  // ─── State ──────────────────────────────────────────────────────────────────

  const [rules, setRules] = useState<DetectionRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRule, setSelectedRule] = useState<DetectionRule | null>(null);
  const [expandedRuleId, setExpandedRuleId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("rule");

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterFormat, setFilterFormat] = useState<RuleFormat | "all">("all");
  const [filterStatus, setFilterStatus] = useState<RuleStatus | "all">("all");

  // Generator state
  const [genDescription, setGenDescription] = useState("");
  const [genFormat, setGenFormat] = useState<RuleFormat>("sigma");
  const [genSeverity, setGenSeverity] = useState("high");
  const [generating, setGenerating] = useState(false);
  const [generatedResult, setGeneratedResult] = useState<{
    rule_content: string;
    mitre_tags: string[];
    severity: string;
    confidence: number;
  } | null>(null);

  // Test state
  const [testLogs, setTestLogs] = useState("");
  const [testRunning, setTestRunning] = useState(false);
  const [testResults, setTestResults] = useState<TestResults | null>(null);

  // Deploy state
  const [deployTarget, setDeployTarget] = useState("");
  const [deploying, setDeploying] = useState(false);

  // Edit state
  const [editContent, setEditContent] = useState("");
  const [saving, setSaving] = useState(false);

  // New rule dialog
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [newRuleName, setNewRuleName] = useState("");
  const [newRuleFormat, setNewRuleFormat] = useState<RuleFormat>("sigma");
  const [newRuleContent, setNewRuleContent] = useState("");

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<DetectionRule | null>(null);

  // MITRE sidebar
  const [expandedTactic, setExpandedTactic] = useState<string | null>(null);

  // Stats
  const [stats, setStats] = useState<{
    total: number;
    by_format: Record<string, number>;
    by_status: Record<string, number>;
    active: number;
    avg_confidence: number;
  } | null>(null);

  // ─── Data Loading ───────────────────────────────────────────────────────────

  const loadRules = useCallback(async () => {
    try {
      setLoading(true);
      const filters: { format?: RuleFormat; status?: RuleStatus; search?: string } = {};
      if (filterFormat !== "all") filters.format = filterFormat;
      if (filterStatus !== "all") filters.status = filterStatus;
      if (searchQuery.trim()) filters.search = searchQuery.trim();

      const data = await detectionEngine.getAll(filters);
      setRules(data);
    } catch (err) {
      toast({
        title: "Load failed",
        description: err instanceof Error ? err.message : "Failed to load rules",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [filterFormat, filterStatus, searchQuery, toast]);

  const loadStats = useCallback(async () => {
    try {
      const s = await detectionEngine.getStats();
      setStats(s);
    } catch {
      // Silently fail stats load
    }
  }, []);

  useEffect(() => {
    loadRules();
    loadStats();
  }, [loadRules, loadStats]);

  // ─── Filtered Rules ─────────────────────────────────────────────────────────

  const filteredRules = useMemo(() => {
    return rules;
  }, [rules]);

  // ─── Actions ────────────────────────────────────────────────────────────────

  const handleGenerate = useCallback(async () => {
    if (!genDescription.trim()) {
      toast({ title: "Required", description: "Describe the threat behavior first", variant: "destructive" });
      return;
    }

    setGenerating(true);
    setGeneratedResult(null);

    try {
      const request: GenerateRuleRequest = {
        description: genDescription.trim(),
        format: genFormat,
        severity: genSeverity,
      };

      const result = detectionEngine.generateFromDescription(request);
      setGeneratedResult(result);
      toast({ title: "Rule Generated", description: `${detectionEngine.getFormatLabel(genFormat)} rule with ${Math.round(result.confidence * 100)}% confidence` });
    } catch (err) {
      toast({
        title: "Generation failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  }, [genDescription, genFormat, genSeverity, toast]);

  const handleSaveGenerated = useCallback(async () => {
    if (!generatedResult) return;

    try {
      const data: CreateRuleData = {
        name: genDescription.slice(0, 120),
        description: genDescription,
        format: genFormat,
        rule_content: generatedResult.rule_content,
        rule_metadata: {
          severity: generatedResult.severity,
          tags: generatedResult.mitre_tags,
        },
        generated_by: "ai:crowbyte",
        ai_confidence: generatedResult.confidence,
        mitre_tactics: generatedResult.mitre_tags
          .filter(t => t.startsWith("attack.") && !t.match(/attack\.t\d/))
          .map(t => t.replace("attack.", "")),
        mitre_techniques: generatedResult.mitre_tags
          .filter(t => /attack\.t\d+/i.test(t))
          .map(t => t.replace("attack.", "")),
      };

      await detectionEngine.create(data);
      toast({ title: "Saved", description: "Rule saved to library" });
      setGeneratedResult(null);
      setGenDescription("");
      loadRules();
      loadStats();
    } catch (err) {
      toast({
        title: "Save failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    }
  }, [generatedResult, genDescription, genFormat, toast, loadRules, loadStats]);

  const handleConvert = useCallback(async (toFormat: RuleFormat) => {
    if (!generatedResult) return;

    try {
      const converted = detectionEngine.convertRule(
        generatedResult.rule_content,
        genFormat,
        toFormat,
        genDescription,
      );
      setGenFormat(toFormat);
      setGeneratedResult({ ...generatedResult, rule_content: converted });
      toast({ title: "Converted", description: `Rule converted to ${detectionEngine.getFormatLabel(toFormat)}` });
    } catch (err) {
      toast({
        title: "Conversion failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    }
  }, [generatedResult, genFormat, genDescription, toast]);

  const handleCreateManual = useCallback(async () => {
    if (!newRuleName.trim()) {
      toast({ title: "Required", description: "Rule name is required", variant: "destructive" });
      return;
    }

    try {
      await detectionEngine.create({
        name: newRuleName.trim(),
        format: newRuleFormat,
        rule_content: newRuleContent || `# ${newRuleName}\n# Format: ${newRuleFormat.toUpperCase()}\n`,
      });
      toast({ title: "Created", description: `"${newRuleName}" created as draft` });
      setShowNewDialog(false);
      setNewRuleName("");
      setNewRuleContent("");
      loadRules();
      loadStats();
    } catch (err) {
      toast({
        title: "Create failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    }
  }, [newRuleName, newRuleFormat, newRuleContent, toast, loadRules, loadStats]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;

    try {
      await detectionEngine.delete(deleteTarget.id);
      toast({ title: "Deleted", description: `"${deleteTarget.name}" removed` });
      setDeleteTarget(null);
      if (expandedRuleId === deleteTarget.id) setExpandedRuleId(null);
      loadRules();
      loadStats();
    } catch (err) {
      toast({
        title: "Delete failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    }
  }, [deleteTarget, expandedRuleId, toast, loadRules, loadStats]);

  const handleSaveEdit = useCallback(async (rule: DetectionRule) => {
    setSaving(true);
    try {
      await detectionEngine.bumpVersion(rule.id, editContent);
      toast({ title: "Saved", description: `Rule updated to v${rule.version + 1}` });
      loadRules();
    } catch (err) {
      toast({
        title: "Save failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }, [editContent, toast, loadRules]);

  const handleTest = useCallback(async (rule: DetectionRule) => {
    const logs = testLogs.split("\n").filter(l => l.trim());
    if (logs.length === 0) {
      toast({ title: "No logs", description: "Paste sample log lines to test against", variant: "destructive" });
      return;
    }

    setTestRunning(true);
    setTestResults(null);

    try {
      const results = await detectionEngine.testRule(rule.id, logs);
      setTestResults(results);
      toast({
        title: "Test Complete",
        description: `${results.true_positives}/${results.samples_tested} matched — ${Math.round(results.accuracy * 100)}% accuracy`,
      });
      loadRules();
    } catch (err) {
      toast({
        title: "Test failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setTestRunning(false);
    }
  }, [testLogs, toast, loadRules]);

  const handleDeploy = useCallback(async (rule: DetectionRule) => {
    if (!deployTarget) {
      toast({ title: "Required", description: "Select a deployment target", variant: "destructive" });
      return;
    }

    setDeploying(true);
    try {
      await detectionEngine.deploy(rule.id, deployTarget);
      toast({ title: "Deployed", description: `Rule deployed to ${deployTarget}` });
      setDeployTarget("");
      loadRules();
    } catch (err) {
      toast({
        title: "Deploy failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setDeploying(false);
    }
  }, [deployTarget, toast, loadRules]);

  const handleUndeploy = useCallback(async (rule: DetectionRule, target: string) => {
    try {
      await detectionEngine.undeploy(rule.id, target);
      toast({ title: "Undeployed", description: `Rule removed from ${target}` });
      loadRules();
    } catch (err) {
      toast({
        title: "Undeploy failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    }
  }, [toast, loadRules]);

  const handleStatusChange = useCallback(async (rule: DetectionRule, status: RuleStatus) => {
    try {
      await detectionEngine.update(rule.id, { status });
      toast({ title: "Updated", description: `Status changed to ${STATUS_LABELS[status]}` });
      loadRules();
    } catch (err) {
      toast({
        title: "Update failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    }
  }, [toast, loadRules]);

  const handleCopyRule = useCallback((content: string) => {
    navigator.clipboard.writeText(content).then(
      () => toast({ title: "Copied", description: "Rule content copied to clipboard" }),
      () => toast({ title: "Error", description: "Failed to copy to clipboard", variant: "destructive" }),
    );
  }, [toast]);

  const handleExportRule = useCallback((rule: DetectionRule) => {
    const ext = detectionEngine.getFormatExtension(rule.format);
    const filename = `${rule.name.replace(/[^a-zA-Z0-9_-]/g, "_")}.${ext}`;
    const blob = new Blob([rule.rule_content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Downloaded", description: `Saved as ${filename}` });
  }, [toast]);

  const handleExpandRule = useCallback((rule: DetectionRule) => {
    if (expandedRuleId === rule.id) {
      setExpandedRuleId(null);
      setSelectedRule(null);
    } else {
      setExpandedRuleId(rule.id);
      setSelectedRule(rule);
      setEditContent(rule.rule_content);
      setTestLogs("");
      setTestResults(null);
      setActiveTab("rule");
    }
  }, [expandedRuleId]);

  // ─── Render Helpers ─────────────────────────────────────────────────────────

  const formatBadge = (fmt: RuleFormat) => (
    <Badge variant="outline" className={`text-xs font-mono ${FORMAT_BADGE_COLORS[fmt]}`}>
      {detectionEngine.getFormatLabel(fmt)}
    </Badge>
  );

  const statusBadge = (status: RuleStatus) => (
    <Badge variant="outline" className={`text-xs ${STATUS_BADGE_COLORS[status]}`}>
      {STATUS_LABELS[status]}
    </Badge>
  );

  const confidenceBadge = (confidence?: number) => {
    if (confidence === undefined || confidence === null) return null;
    const pct = Math.round(confidence * 100);
    const color = pct >= 80 ? "text-emerald-400" : pct >= 50 ? "text-yellow-400" : "text-red-400";
    return (
      <Badge variant="outline" className={`text-xs ${color} border-current/30`}>
        {pct}% conf
      </Badge>
    );
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full bg-background">
      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <div className="flex-none px-6 pt-6 pb-4 border-b border-zinc-800/50">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <UilBolt size={24} className="text-cyan-400" />
            <div>
              <h1 className="text-xl font-bold text-zinc-100">Detection Lab</h1>
              <p className="text-sm text-zinc-500">
                Natural language to detection rules — SIGMA, KQL, SPL, YARA, Snort, Suricata
              </p>
            </div>
          </div>
          <Button
            onClick={() => setShowNewDialog(true)}
            className="bg-cyan-600 hover:bg-cyan-500 text-white"
          >
            <UilPlus size={16} className="mr-1.5" />
            New Rule
          </Button>
        </div>

        {/* Stats bar */}
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-1.5">
            <UilListUl size={14} className="text-zinc-500" />
            <span className="text-zinc-400">
              <span className="text-zinc-100 font-medium">{stats?.total ?? 0}</span> rules
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <UilCheckCircle size={14} className="text-emerald-400" />
            <span className="text-zinc-400">
              <span className="text-emerald-400 font-medium">{stats?.active ?? 0}</span> active
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <UilPen size={14} className="text-zinc-500" />
            <span className="text-zinc-400">
              <span className="text-zinc-100 font-medium">{stats?.by_status?.draft ?? 0}</span> drafts
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <UilBracketsCurly size={14} className="text-cyan-400" />
            <span className="text-zinc-400">
              <span className="text-cyan-400 font-medium">
                {stats ? Object.keys(stats.by_format).length : 0}
              </span> formats
            </span>
          </div>
          {stats && stats.avg_confidence > 0 && (
            <div className="flex items-center gap-1.5">
              <UilFocusTarget size={14} className="text-purple-400" />
              <span className="text-zinc-400">
                <span className="text-purple-400 font-medium">
                  {Math.round(stats.avg_confidence * 100)}%
                </span> avg confidence
              </span>
            </div>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">

          {/* ── Natural Language Generator ──────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="bg-zinc-900/50 border-zinc-800/50">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base text-zinc-100">
                  <UilBolt size={18} className="text-cyan-400" />
                  Natural Language Rule Generator
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Description input */}
                <div>
                  <Textarea
                    placeholder="Describe the threat behavior in plain English... e.g. 'Detect PowerShell encoded commands used for obfuscation' or 'Alert on LSASS credential dumping via Mimikatz'"
                    value={genDescription}
                    onChange={(e) => setGenDescription(e.target.value)}
                    className="bg-zinc-900 border-zinc-700 text-zinc-100 placeholder:text-zinc-600 min-h-[100px] text-sm resize-none"
                  />
                  <p className="text-xs text-muted-foreground mt-1.5">Pattern-based generation. AI-powered generation coming soon.</p>
                </div>

                {/* Controls row */}
                <div className="flex flex-wrap items-center gap-3">
                  {/* Format toggles */}
                  <div className="flex items-center gap-1">
                    {RULE_FORMATS.map(f => (
                      <Button
                        key={f.value}
                        size="sm"
                        variant={genFormat === f.value ? "default" : "outline"}
                        onClick={() => setGenFormat(f.value)}
                        className={
                          genFormat === f.value
                            ? "bg-cyan-600 hover:bg-cyan-500 text-white text-xs h-7 px-2.5"
                            : "border-zinc-700 text-zinc-400 hover:text-zinc-100 text-xs h-7 px-2.5"
                        }
                      >
                        {f.label}
                      </Button>
                    ))}
                  </div>

                  <Separator orientation="vertical" className="h-6 bg-zinc-700" />

                  {/* Severity selector */}
                  <Select value={genSeverity} onValueChange={setGenSeverity}>
                    <SelectTrigger className="w-[120px] h-7 bg-zinc-900 border-zinc-700 text-xs">
                      <SelectValue placeholder="Severity" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-700">
                      {SEVERITY_OPTIONS.map(s => (
                        <SelectItem key={s.value} value={s.value} className="text-xs">
                          <span className={SEVERITY_COLORS[s.value]}>{s.label}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className="flex-1" />

                  {/* Generate button */}
                  <Button
                    onClick={handleGenerate}
                    disabled={generating || !genDescription.trim()}
                    className="bg-cyan-600 hover:bg-cyan-500 text-white h-8"
                  >
                    {generating ? (
                      <UilSync size={14} className="mr-1.5 animate-spin" />
                    ) : (
                      <UilBolt size={14} className="mr-1.5" />
                    )}
                    {generating ? "Generating..." : "Generate Rule"}
                  </Button>
                </div>

                {/* Generated result */}
                <AnimatePresence>
                  {generatedResult && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-3"
                    >
                      <Separator className="bg-zinc-800" />

                      {/* Meta row */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {formatBadge(genFormat)}
                        {confidenceBadge(generatedResult.confidence)}
                        <Badge
                          variant="outline"
                          className={`text-xs ${SEVERITY_COLORS[generatedResult.severity] || "text-zinc-400"} border-current/30`}
                        >
                          {generatedResult.severity}
                        </Badge>
                        {generatedResult.mitre_tags.map(tag => (
                          <Badge
                            key={tag}
                            variant="outline"
                            className="text-xs bg-violet-500/10 text-violet-400"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>

                      {/* UilBracketsCurly block */}
                      <div className="relative group">
                        <pre className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto text-sm font-mono text-zinc-300 leading-relaxed max-h-[400px] overflow-y-auto">
                          {generatedResult.rule_content}
                        </pre>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleCopyRule(generatedResult.rule_content)}
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 p-0 text-zinc-500 hover:text-zinc-100"
                        >
                          <UilCopy size={14} />
                        </Button>
                      </div>

                      {/* Action row */}
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={handleSaveGenerated}
                          className="bg-cyan-600 hover:bg-cyan-500 text-white h-8"
                        >
                          <UilSave size={14} className="mr-1.5" />
                          Save Rule
                        </Button>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="border-zinc-700 text-zinc-400 h-8">
                              <UilExchange size={14} className="mr-1.5" />
                              Convert
                              <UilAngleDown size={12} className="ml-1" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="bg-zinc-900 border-zinc-700">
                            {RULE_FORMATS.filter(f => f.value !== genFormat).map(f => (
                              <DropdownMenuItem
                                key={f.value}
                                onClick={() => handleConvert(f.value)}
                                className="text-zinc-300 hover:text-zinc-100 text-xs"
                              >
                                Convert to {f.label}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setGeneratedResult(null)}
                          className="text-zinc-500 hover:text-zinc-300 h-8"
                        >
                          <UilTimes size={14} className="mr-1" />
                          Clear
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          </motion.div>

          {/* ── Rules Library ───────────────────────────────────────────────── */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <UilSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <Input
                placeholder="Search rules..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 bg-zinc-900/50 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 h-8 text-sm"
              />
            </div>

            <Select value={filterFormat} onValueChange={(v) => setFilterFormat(v as RuleFormat | "all")}>
              <SelectTrigger className="w-[130px] h-8 bg-zinc-900/50 border-zinc-800 text-xs">
                <UilFilter size={12} className="mr-1 text-zinc-500" />
                <SelectValue placeholder="Format" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700">
                <SelectItem value="all" className="text-xs">All Formats</SelectItem>
                {RULE_FORMATS.map(f => (
                  <SelectItem key={f.value} value={f.value} className="text-xs">{f.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as RuleStatus | "all")}>
              <SelectTrigger className="w-[130px] h-8 bg-zinc-900/50 border-zinc-800 text-xs">
                <UilFilter size={12} className="mr-1 text-zinc-500" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700">
                <SelectItem value="all" className="text-xs">All Statuses</SelectItem>
                {Object.entries(STATUS_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => { loadRules(); loadStats(); }}
              className="text-zinc-500 hover:text-zinc-300 h-8"
            >
              <UilSync size={14} />
            </Button>
          </div>

          {/* Rules list */}
          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-20 bg-zinc-800/50 rounded-lg" />
              ))}
            </div>
          ) : filteredRules.length === 0 ? (
            <Card className="bg-zinc-900/50 border-zinc-800/50">
              <CardContent className="py-16 text-center">
                <UilBolt size={48} className="mx-auto mb-4 text-zinc-700" />
                <h3 className="text-lg font-medium text-zinc-400 mb-1">No detection rules yet</h3>
                <p className="text-sm text-zinc-600 mb-4">
                  Generate your first rule using natural language above, or create one manually.
                </p>
                <Button
                  onClick={() => setShowNewDialog(true)}
                  variant="outline"
                  className="border-zinc-700 text-zinc-300"
                >
                  <UilPlus size={14} className="mr-1.5" />
                  Create Rule
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              <AnimatePresence>
                {filteredRules.map((rule, idx) => (
                  <motion.div
                    key={rule.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.15, delay: idx * 0.03 }}
                  >
                    <Card
                      className={`bg-zinc-900/50 border-zinc-800/50 transition-colors ${
                        expandedRuleId === rule.id ? "border-cyan-800/50" : "hover:border-zinc-700/50"
                      }`}
                    >
                      {/* Rule header row */}
                      <div
                        className="flex items-center gap-3 p-4 cursor-pointer"
                        onClick={() => handleExpandRule(rule)}
                      >
                        <UilAngleRight
                          size={14}
                          className={`text-zinc-500 transition-transform ${
                            expandedRuleId === rule.id ? "rotate-90" : ""
                          }`}
                        />

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-zinc-100 truncate">
                              {rule.name}
                            </span>
                            {formatBadge(rule.format)}
                            {statusBadge(rule.status)}
                            {confidenceBadge(rule.ai_confidence)}
                            <Badge variant="outline" className="text-xs text-zinc-500 border-zinc-700">
                              v{rule.version}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-zinc-500">
                            {rule.mitre_tactics.length > 0 && (
                              <span className="flex items-center gap-1">
                                <UilSitemap size={10} />
                                {rule.mitre_tactics.slice(0, 3).join(", ")}
                                {rule.mitre_tactics.length > 3 && ` +${rule.mitre_tactics.length - 3}`}
                              </span>
                            )}
                            {rule.mitre_techniques.length > 0 && (
                              <span className="flex items-center gap-1">
                                <Tag size={10} />
                                {rule.mitre_techniques.slice(0, 3).join(", ")}
                                {rule.mitre_techniques.length > 3 && ` +${rule.mitre_techniques.length - 3}`}
                              </span>
                            )}
                            {rule.last_tested_at && (
                              <span className="flex items-center gap-1">
                                <UilFlask size={10} />
                                tested {formatDistanceToNow(new Date(rule.last_tested_at), { addSuffix: true })}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <UilClock size={10} />
                              {formatDistanceToNow(new Date(rule.updated_at), { addSuffix: true })}
                            </span>
                          </div>
                        </div>

                        {/* Actions dropdown */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-zinc-500 hover:text-zinc-300">
                              <UilEllipsisV size={16} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="bg-zinc-900 border-zinc-700" align="end">
                            <DropdownMenuItem
                              onClick={(e) => { e.stopPropagation(); handleCopyRule(rule.rule_content); }}
                              className="text-zinc-300 text-xs"
                            >
                              <UilCopy size={12} className="mr-2" />
                              UilCopy Rule
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => { e.stopPropagation(); handleExportRule(rule); }}
                              className="text-zinc-300 text-xs"
                            >
                              <UilDownloadAlt size={12} className="mr-2" />
                              Export
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-zinc-800" />
                            {(["draft", "testing", "active", "disabled", "retired"] as RuleStatus[])
                              .filter(s => s !== rule.status)
                              .map(s => (
                                <DropdownMenuItem
                                  key={s}
                                  onClick={(e) => { e.stopPropagation(); handleStatusChange(rule, s); }}
                                  className="text-zinc-300 text-xs"
                                >
                                  Set {STATUS_LABELS[s]}
                                </DropdownMenuItem>
                              ))}
                            <DropdownMenuSeparator className="bg-zinc-800" />
                            <DropdownMenuItem
                              onClick={(e) => { e.stopPropagation(); setDeleteTarget(rule); }}
                              className="text-red-400 text-xs"
                            >
                              <UilTrashAlt size={12} className="mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {/* Expanded content */}
                      <AnimatePresence>
                        {expandedRuleId === rule.id && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <Separator className="bg-zinc-800/50" />
                            <div className="p-4">
                              <Tabs value={activeTab} onValueChange={setActiveTab}>
                                <TabsList className="bg-zinc-800/50 mb-4">
                                  <TabsTrigger value="rule" className="text-xs data-[state=active]:bg-zinc-700">
                                    <UilBracketsCurly size={12} className="mr-1" />
                                    Rule
                                  </TabsTrigger>
                                  <TabsTrigger value="test" className="text-xs data-[state=active]:bg-zinc-700">
                                    <UilFlask size={12} className="mr-1" />
                                    Test
                                  </TabsTrigger>
                                  <TabsTrigger value="deploy" className="text-xs data-[state=active]:bg-zinc-700">
                                    <UilRocket size={12} className="mr-1" />
                                    Deploy
                                  </TabsTrigger>
                                  <TabsTrigger value="history" className="text-xs data-[state=active]:bg-zinc-700">
                                    <UilClock size={12} className="mr-1" />
                                    History
                                  </TabsTrigger>
                                </TabsList>

                                {/* Rule tab */}
                                <TabsContent value="rule" className="space-y-3 mt-0">
                                  <Textarea
                                    value={editContent}
                                    onChange={(e) => setEditContent(e.target.value)}
                                    className="bg-zinc-900 border-zinc-700 text-zinc-300 font-mono text-sm min-h-[300px] leading-relaxed resize-y"
                                    spellCheck={false}
                                  />
                                  <div className="flex items-center gap-2">
                                    <Button
                                      size="sm"
                                      onClick={() => handleSaveEdit(rule)}
                                      disabled={saving || editContent === rule.rule_content}
                                      className="bg-cyan-600 hover:bg-cyan-500 text-white h-7 text-xs"
                                    >
                                      {saving ? (
                                        <UilSync size={12} className="mr-1 animate-spin" />
                                      ) : (
                                        <UilSave size={12} className="mr-1" />
                                      )}
                                      Save & Version
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleCopyRule(editContent)}
                                      className="text-zinc-500 h-7 text-xs"
                                    >
                                      <UilCopy size={12} className="mr-1" />
                                      UilCopy
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => setEditContent(rule.rule_content)}
                                      disabled={editContent === rule.rule_content}
                                      className="text-zinc-500 h-7 text-xs"
                                    >
                                      Reset
                                    </Button>
                                  </div>

                                  {/* MITRE ATT&CK mapping */}
                                  {(rule.mitre_tactics.length > 0 || rule.mitre_techniques.length > 0) && (
                                    <div className="pt-2">
                                      <Label className="text-xs text-zinc-500 mb-2 block">MITRE ATT&CK Mapping</Label>
                                      <div className="flex flex-wrap gap-1.5">
                                        {rule.mitre_tactics.map(t => (
                                          <Badge
                                            key={t}
                                            variant="outline"
                                            className="text-xs bg-violet-500/10 text-violet-400"
                                          >
                                            {t}
                                          </Badge>
                                        ))}
                                        {rule.mitre_techniques.map(t => (
                                          <Badge
                                            key={t}
                                            variant="outline"
                                            className="text-xs bg-cyan-500/10 text-cyan-400"
                                          >
                                            {t}
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </TabsContent>

                                {/* Test tab */}
                                <TabsContent value="test" className="space-y-3 mt-0">
                                  <div>
                                    <Label className="text-xs text-zinc-400 mb-1.5 block">
                                      Paste sample log lines (one per line)
                                    </Label>
                                    <Textarea
                                      placeholder={"powershell.exe -EncodedCommand JABzAD0A...\ncmd.exe /c whoami\nnormal_process.exe --flag value"}
                                      value={testLogs}
                                      onChange={(e) => setTestLogs(e.target.value)}
                                      className="bg-zinc-900 border-zinc-700 text-zinc-300 font-mono text-sm min-h-[150px] resize-y"
                                      spellCheck={false}
                                    />
                                  </div>
                                  <Button
                                    size="sm"
                                    onClick={() => handleTest(rule)}
                                    disabled={testRunning || !testLogs.trim()}
                                    className="bg-cyan-600 hover:bg-cyan-500 text-white h-7 text-xs"
                                  >
                                    {testRunning ? (
                                      <UilSync size={12} className="mr-1 animate-spin" />
                                    ) : (
                                      <UilPlay size={12} className="mr-1" />
                                    )}
                                    {testRunning ? "Running..." : "Run Test"}
                                  </Button>

                                  {/* Test results */}
                                  <AnimatePresence>
                                    {testResults && (
                                      <motion.div
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="space-y-3"
                                      >
                                        <Separator className="bg-zinc-800" />
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                          <div className="bg-zinc-900 rounded-lg p-3 border border-zinc-800">
                                            <div className="text-xs text-zinc-500 mb-1">Samples Tested</div>
                                            <div className="text-lg font-bold text-zinc-100">{testResults.samples_tested}</div>
                                          </div>
                                          <div className="bg-zinc-900 rounded-lg p-3 border border-emerald-800/30">
                                            <div className="text-xs text-zinc-500 mb-1">True Positives</div>
                                            <div className="text-lg font-bold text-emerald-400">{testResults.true_positives}</div>
                                          </div>
                                          <div className="bg-zinc-900 rounded-lg p-3 border border-red-800/30">
                                            <div className="text-xs text-zinc-500 mb-1">False Negatives</div>
                                            <div className="text-lg font-bold text-red-400">{testResults.false_negatives}</div>
                                          </div>
                                          <div className="bg-zinc-900 rounded-lg p-3 border border-yellow-800/30">
                                            <div className="text-xs text-zinc-500 mb-1">False Positives</div>
                                            <div className="text-lg font-bold text-yellow-400">{testResults.false_positives}</div>
                                          </div>
                                        </div>

                                        <div className="grid grid-cols-3 gap-3">
                                          <div className="bg-zinc-900 rounded-lg p-3 border border-zinc-800">
                                            <div className="text-xs text-zinc-500 mb-1">Accuracy</div>
                                            <div className="text-lg font-bold text-cyan-400">
                                              {Math.round(testResults.accuracy * 100)}%
                                            </div>
                                          </div>
                                          <div className="bg-zinc-900 rounded-lg p-3 border border-zinc-800">
                                            <div className="text-xs text-zinc-500 mb-1">Precision</div>
                                            <div className="text-lg font-bold text-cyan-400">
                                              {Math.round(testResults.precision * 100)}%
                                            </div>
                                          </div>
                                          <div className="bg-zinc-900 rounded-lg p-3 border border-zinc-800">
                                            <div className="text-xs text-zinc-500 mb-1">Recall</div>
                                            <div className="text-lg font-bold text-cyan-400">
                                              {Math.round(testResults.recall * 100)}%
                                            </div>
                                          </div>
                                        </div>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </TabsContent>

                                {/* Deploy tab */}
                                <TabsContent value="deploy" className="space-y-3 mt-0">
                                  <div className="flex items-end gap-3">
                                    <div className="flex-1">
                                      <Label className="text-xs text-zinc-400 mb-1.5 block">UilFocusTarget SIEM / IDS</Label>
                                      <Select value={deployTarget} onValueChange={setDeployTarget}>
                                        <SelectTrigger className="bg-zinc-900 border-zinc-700 text-sm h-8">
                                          <SelectValue placeholder="Select target..." />
                                        </SelectTrigger>
                                        <SelectContent className="bg-zinc-900 border-zinc-700">
                                          {DEPLOY_TARGETS.map(t => (
                                            <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <Button
                                      size="sm"
                                      onClick={() => handleDeploy(rule)}
                                      disabled={deploying || !deployTarget}
                                      className="bg-cyan-600 hover:bg-cyan-500 text-white h-8 text-xs"
                                    >
                                      {deploying ? (
                                        <UilSync size={12} className="mr-1 animate-spin" />
                                      ) : (
                                        <UilRocket size={12} className="mr-1" />
                                      )}
                                      Deploy
                                    </Button>
                                  </div>

                                  {/* Current deployments */}
                                  {rule.deployed_to.length > 0 && (
                                    <div className="pt-2">
                                      <Label className="text-xs text-zinc-500 mb-2 block">Active Deployments</Label>
                                      <div className="space-y-1.5">
                                        {rule.deployed_to.map(target => (
                                          <div
                                            key={target}
                                            className="flex items-center justify-between bg-zinc-900 rounded-md p-2.5 border border-zinc-800"
                                          >
                                            <div className="flex items-center gap-2">
                                              <UilCheckCircle size={14} className="text-emerald-400" />
                                              <span className="text-sm text-zinc-200">{target}</span>
                                            </div>
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              onClick={() => handleUndeploy(rule, target)}
                                              className="text-red-400 hover:text-red-300 h-6 text-xs px-2"
                                            >
                                              Undeploy
                                            </Button>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {rule.deployed_to.length === 0 && (
                                    <div className="text-center py-8 text-zinc-600 text-sm">
                                      <UilRocket size={24} className="mx-auto mb-2 text-zinc-700" />
                                      Not deployed anywhere yet
                                    </div>
                                  )}

                                  {rule.deployed_at && (
                                    <div className="text-xs text-zinc-500">
                                      Last deployed: {format(new Date(rule.deployed_at), "PPp")}
                                    </div>
                                  )}
                                </TabsContent>

                                {/* History tab */}
                                <TabsContent value="history" className="space-y-3 mt-0">
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between bg-zinc-900 rounded-md p-3 border border-zinc-800">
                                      <div>
                                        <div className="text-sm text-zinc-200 font-medium">Version {rule.version}</div>
                                        <div className="text-xs text-zinc-500">
                                          Current — updated {formatDistanceToNow(new Date(rule.updated_at), { addSuffix: true })}
                                        </div>
                                      </div>
                                      <Badge variant="outline" className="text-xs bg-cyan-500/10 text-cyan-400">
                                        current
                                      </Badge>
                                    </div>

                                    {rule.last_tested_at && (
                                      <div className="flex items-center justify-between bg-zinc-900 rounded-md p-3 border border-zinc-800">
                                        <div>
                                          <div className="text-sm text-zinc-300">Last Test Run</div>
                                          <div className="text-xs text-zinc-500">
                                            {format(new Date(rule.last_tested_at), "PPp")}
                                          </div>
                                        </div>
                                        {rule.test_results && (
                                          <div className="text-xs text-zinc-400">
                                            {rule.test_results.true_positives}/{rule.test_results.samples_tested} matched
                                          </div>
                                        )}
                                      </div>
                                    )}

                                    <div className="flex items-center justify-between bg-zinc-900 rounded-md p-3 border border-zinc-800">
                                      <div>
                                        <div className="text-sm text-zinc-300">Created</div>
                                        <div className="text-xs text-zinc-500">
                                          {format(new Date(rule.created_at), "PPp")}
                                        </div>
                                      </div>
                                      {rule.generated_by && (
                                        <Badge variant="outline" className="text-xs text-zinc-400 border-zinc-700">
                                          {rule.generated_by}
                                        </Badge>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-4 text-xs text-zinc-500 pt-2">
                                      <span>Total matches: {rule.total_matches}</span>
                                      <span>False positives: {rule.false_positive_count}</span>
                                      {rule.last_match_at && (
                                        <span>
                                          Last match: {formatDistanceToNow(new Date(rule.last_match_at), { addSuffix: true })}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </TabsContent>
                              </Tabs>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}

          {/* ── MITRE ATT&CK Reference Panel ───────────────────────────────── */}
          <Card className="bg-zinc-900/50 border-zinc-800/50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base text-zinc-100">
                <UilSitemap size={18} className="text-violet-400" />
                MITRE ATT&CK Coverage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {MITRE_TACTICS.map(tactic => {
                  const techniques = COMMON_TECHNIQUES[tactic.id] || [];
                  const isExpanded = expandedTactic === tactic.id;
                  const ruleCount = rules.filter(r =>
                    r.mitre_tactics.some(t => t.toLowerCase().includes(tactic.name.toLowerCase().replace(/\s+/g, "_")))
                  ).length;

                  return (
                    <div key={tactic.id} className="space-y-1">
                      <button
                        onClick={() => setExpandedTactic(isExpanded ? null : tactic.id)}
                        className="w-full flex items-center justify-between p-2 rounded-md bg-zinc-900 border border-zinc-800 hover:border-violet-700/50 transition-colors text-left"
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <UilAngleRight
                            size={10}
                            className={`text-zinc-500 transition-transform flex-none ${isExpanded ? "rotate-90" : ""}`}
                          />
                          <span className="text-xs text-zinc-300 truncate">{tactic.name}</span>
                        </div>
                        {ruleCount > 0 && (
                          <Badge variant="outline" className="text-[10px] bg-violet-500/10 text-violet-400 flex-none ml-1">
                            {ruleCount}
                          </Badge>
                        )}
                      </button>

                      <AnimatePresence>
                        {isExpanded && techniques.length > 0 && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.15 }}
                            className="pl-3 space-y-0.5"
                          >
                            {techniques.map(tech => (
                              <div
                                key={tech.id}
                                className="flex items-center gap-1.5 text-xs text-zinc-500 py-0.5 px-1.5 rounded hover:bg-zinc-800/50 cursor-default"
                              >
                                <span className="text-zinc-600 font-mono">{tech.id}</span>
                                <span className="truncate">{tech.name}</span>
                              </div>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

        </div>
      </ScrollArea>

      {/* ── New Rule Dialog ──────────────────────────────────────────────────── */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent className="bg-zinc-900 border-zinc-700 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-zinc-100">Create Detection Rule</DialogTitle>
            <DialogDescription className="text-zinc-500">
              Manually create a new detection rule. Use the generator above for AI-assisted creation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs text-zinc-400 mb-1.5 block">Rule Name</Label>
              <Input
                placeholder="e.g. Detect Encoded PowerShell Execution"
                value={newRuleName}
                onChange={(e) => setNewRuleName(e.target.value)}
                className="bg-zinc-900 border-zinc-700 text-zinc-100"
              />
            </div>
            <div>
              <Label className="text-xs text-zinc-400 mb-1.5 block">Format</Label>
              <Select value={newRuleFormat} onValueChange={(v) => setNewRuleFormat(v as RuleFormat)}>
                <SelectTrigger className="bg-zinc-900 border-zinc-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700">
                  {RULE_FORMATS.map(f => (
                    <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-zinc-400 mb-1.5 block">Rule Content (optional)</Label>
              <Textarea
                placeholder="Paste or write rule content..."
                value={newRuleContent}
                onChange={(e) => setNewRuleContent(e.target.value)}
                className="bg-zinc-900 border-zinc-700 text-zinc-300 font-mono text-sm min-h-[120px]"
                spellCheck={false}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setShowNewDialog(false)}
              className="text-zinc-400"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateManual}
              className="bg-cyan-600 hover:bg-cyan-500 text-white"
            >
              <UilPlus size={14} className="mr-1.5" />
              Create Rule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation Dialog ───────────────────────────────────────── */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="bg-zinc-900 border-zinc-700 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-zinc-100 flex items-center gap-2">
              <UilExclamationTriangle size={20} className="text-red-400" />
              Delete Detection Rule
            </DialogTitle>
            <DialogDescription className="text-zinc-500">
              This will permanently delete "{deleteTarget?.name}". This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDeleteTarget(null)}
              className="text-zinc-400"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-500 text-white"
            >
              <UilTrashAlt size={14} className="mr-1.5" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default DetectionLab;
