import { useState, useEffect, useCallback, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  UilShield,
  UilBug,
  UilExclamationTriangle,
  UilFileAlt,
  UilDatabase,
  UilClock,
  UilSync,
  UilCheckCircle,
  UilTimesCircle,
  UilServer,
  UilAnalysis,
} from "@iconscout/react-unicons";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { shieldService, type ShieldStats, type ShieldThreat, type ShieldEvent, type ShieldQuarantine, type ThreatSeverity } from "@/services/shield";

// ── Constants ──

const SEVERITY_COLORS: Record<ThreatSeverity, string> = {
  critical: "text-red-500 bg-red-500/10 border-red-500/20",
  high: "text-orange-500 bg-orange-500/10 border-orange-500/20",
  medium: "text-yellow-500 bg-yellow-500/10 border-yellow-500/20",
  low: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  info: "text-zinc-400 bg-zinc-400/10 border-zinc-400/20",
};

const SEVERITY_DOT: Record<ThreatSeverity, string> = {
  critical: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-yellow-500",
  low: "bg-blue-400",
  info: "bg-zinc-500",
};

const MODULE_ICONS: Record<string, string> = {
  file_shield: "File Shield",
  process_guard: "Process Guard",
  net_watch: "Net Watch",
  log_ingest: "Log Ingest",
  memory_scan: "Memory Scan",
};

// ── Stat Card ──

function StatCard({ title, value, subtitle, icon: Icon, color = "text-primary" }: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: typeof UilShield;
  color?: string;
}) {
  return (
    <Card className="bg-card/50 border-white/[0.06] hover:border-white/[0.12] transition-colors">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-['JetBrains_Mono'] uppercase tracking-wider">{title}</p>
            <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
          <Icon size={24} className={`${color} opacity-40`} />
        </div>
      </CardContent>
    </Card>
  );
}

// ── Threat Row ──

function ThreatRow({ threat }: { threat: ShieldThreat }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/[0.03] transition-colors group"
    >
      <span className={`h-2 w-2 rounded-full ${SEVERITY_DOT[threat.severity]} shrink-0`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground truncate">{threat.file_name}</span>
          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${SEVERITY_COLORS[threat.severity]}`}>
            {threat.severity}
          </Badge>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[11px] text-muted-foreground font-mono truncate">
            {threat.threat_name || threat.hash_sha256.slice(0, 16) + '...'}
          </span>
          {threat.yara_matches.length > 0 && (
            <span className="text-[10px] text-yellow-500/70">{threat.yara_matches.length} YARA</span>
          )}
        </div>
      </div>
      <span className="text-[10px] text-muted-foreground font-mono">
        {new Date(threat.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </span>
    </motion.div>
  );
}

// ── Event Row ──

function EventRow({ event }: { event: ShieldEvent }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/[0.03] transition-colors">
      <span className={`h-2 w-2 rounded-full ${SEVERITY_DOT[event.severity]} shrink-0`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm text-foreground">{event.title}</span>
          <span className="text-[10px] text-muted-foreground px-1.5 py-0.5 rounded bg-white/[0.04] font-mono">
            {MODULE_ICONS[event.module] || event.module}
          </span>
        </div>
        {event.process_name && (
          <span className="text-[11px] text-muted-foreground font-mono">{event.process_name} (PID {event.process_pid})</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {event.resolved ? (
          <UilCheckCircle size={14} className="text-emerald-500" />
        ) : (
          <UilTimesCircle size={14} className="text-red-400" />
        )}
        <span className="text-[10px] text-muted-foreground font-mono">
          {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
}

// ── Sentinel Status Panel ──

function SentinelStatus({ stats }: { stats: ShieldStats }) {
  const modules = [
    { name: "File Shield", key: "file_shield", desc: "Real-time file scanning on create/modify/exec" },
    { name: "Process Guard", key: "process_guard", desc: "Process injection & hollowing detection" },
    { name: "Net Watch", key: "net_watch", desc: "C2 beacon & exfil detection" },
    { name: "Log Ingest", key: "log_ingest", desc: "SSH brute force, privesc, persistence" },
    { name: "Memory Scan", key: "memory_scan", desc: "Injected shellcode & RWX region detection" },
  ];

  const isActive = stats.sentinel_status === 'active';

  return (
    <Card className="bg-card/50 border-white/[0.06]">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-['JetBrains_Mono'] flex items-center gap-2">
            <UilServer size={16} className="text-primary" />
            Sentinel Daemon
          </CardTitle>
          <Badge
            variant="outline"
            className={isActive ? "text-emerald-400 border-emerald-400/30 bg-emerald-400/10" : "text-zinc-500 border-zinc-500/30 bg-zinc-500/10"}
          >
            <span className={`h-1.5 w-1.5 rounded-full mr-1.5 ${isActive ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'}`} />
            {stats.sentinel_status.toUpperCase()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {modules.map(mod => (
          <div key={mod.key} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-white/[0.03]">
            <div>
              <span className="text-xs font-medium">{mod.name}</span>
              <p className="text-[10px] text-muted-foreground">{mod.desc}</p>
            </div>
            <span className={`h-2 w-2 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-zinc-600'}`} />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ── Quarantine Panel ──

function QuarantinePanel({ items, onRestore }: { items: ShieldQuarantine[]; onRestore: (id: string) => void }) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <UilCheckCircle size={32} className="text-emerald-500/40 mb-2" />
        <p className="text-sm text-muted-foreground">Quarantine vault is empty</p>
        <p className="text-xs text-muted-foreground/60 mt-1">Detected threats will be isolated here</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {items.map(item => (
        <div key={item.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/[0.03]">
          <span className={`h-2 w-2 rounded-full ${SEVERITY_DOT[item.severity]} shrink-0`} />
          <div className="flex-1 min-w-0">
            <span className="text-sm font-medium truncate block">{item.file_name}</span>
            <span className="text-[11px] text-muted-foreground font-mono">{item.original_path}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground">
              {new Date(item.quarantined_at).toLocaleDateString()}
            </span>
            {!item.restored && (
              <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => onRestore(item.id)}>
                Restore
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main Page ──

const TAB_MAP: Record<string, string> = {
  '/defender': 'overview',
  '/defender/threats': 'threats',
  '/defender/sandbox': 'sandbox',
  '/defender/rules': 'rules',
  '/defender/iocs': 'iocs',
  '/defender/quarantine': 'quarantine',
  '/defender/forensics': 'forensics',
};

const REVERSE_TAB_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(TAB_MAP).map(([k, v]) => [v, k])
);

const Defender = () => {
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const [stats, setStats] = useState<ShieldStats | null>(null);
  const [threats, setThreats] = useState<ShieldThreat[]>([]);
  const [events, setEvents] = useState<ShieldEvent[]>([]);
  const [quarantine, setQuarantine] = useState<ShieldQuarantine[]>([]);
  const [loading, setLoading] = useState(true);

  const activeTab = useMemo(() => TAB_MAP[location.pathname] || 'overview', [location.pathname]);

  const setActiveTab = useCallback((tab: string) => {
    const path = REVERSE_TAB_MAP[tab] || '/defender';
    navigate(path, { replace: true });
  }, [navigate]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [statsData, threatsData, eventsData, quarantineData] = await Promise.all([
        shieldService.getStats(),
        shieldService.getThreats(20),
        shieldService.getEvents(20),
        shieldService.getQuarantine(),
      ]);
      setStats(statsData);
      setThreats(threatsData);
      setEvents(eventsData);
      setQuarantine(quarantineData);
    } catch (err) {
      console.error('Shield data load error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    // Auto-refresh every 30s
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  const handleRestore = async (id: string) => {
    try {
      await shieldService.restoreQuarantine(id);
      toast({ title: "File restored from quarantine" });
      loadData();
    } catch (err) {
      toast({ title: "Failed to restore", description: String(err), variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <UilShield size={28} className="text-primary" />
              CrowByte Shield
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Real-time threat detection, sandbox detonation, and endpoint defense
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={loadData} className="gap-1.5">
              <UilSync size={14} />
              Refresh
            </Button>
            <Button size="sm" className="gap-1.5" onClick={() => setActiveTab("sandbox")}>
              <UilAnalysis size={14} />
              Open Sandbox
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-card/50 border border-white/[0.06]">
          <TabsTrigger value="overview" className="font-['JetBrains_Mono'] text-xs">Overview</TabsTrigger>
          <TabsTrigger value="threats" className="font-['JetBrains_Mono'] text-xs">Threats</TabsTrigger>
          <TabsTrigger value="sandbox" className="font-['JetBrains_Mono'] text-xs">Sandbox</TabsTrigger>
          <TabsTrigger value="rules" className="font-['JetBrains_Mono'] text-xs">Rules</TabsTrigger>
          <TabsTrigger value="iocs" className="font-['JetBrains_Mono'] text-xs">IOCs</TabsTrigger>
          <TabsTrigger value="quarantine" className="font-['JetBrains_Mono'] text-xs">Quarantine</TabsTrigger>
          <TabsTrigger value="forensics" className="font-['JetBrains_Mono'] text-xs">Forensics</TabsTrigger>
        </TabsList>

        {/* ── Overview Tab ── */}
        <TabsContent value="overview" className="space-y-6 mt-4">
          {/* Stats Grid */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-3"
          >
            <StatCard
              title="Threats Detected"
              value={stats?.threats_total || 0}
              subtitle={`${stats?.threats_today || 0} today`}
              icon={UilBug}
              color="text-red-400"
            />
            <StatCard
              title="Sandbox Runs"
              value={stats?.sandbox_runs_total || 0}
              subtitle={`${stats?.sandbox_runs_today || 0} today`}
              icon={UilAnalysis}
              color="text-blue-400"
            />
            <StatCard
              title="Active Rules"
              value={`${stats?.rules_enabled || 0}/${stats?.rules_total || 0}`}
              subtitle="YARA + Sigma"
              icon={UilFileAlt}
              color="text-yellow-400"
            />
            <StatCard
              title="IOC Database"
              value={stats?.iocs_total || 0}
              subtitle="Active indicators"
              icon={UilDatabase}
              color="text-purple-400"
            />
          </motion.div>

          {/* Severity Breakdown */}
          {stats && (stats.threats_by_severity.critical > 0 || stats.threats_by_severity.high > 0) && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
              <Card className="bg-card/50 border-white/[0.06]">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground font-['JetBrains_Mono'] uppercase tracking-wider mb-3">Threat Distribution</p>
                  <div className="flex gap-4">
                    {(Object.entries(stats.threats_by_severity) as [ThreatSeverity, number][])
                      .filter(([, count]) => count > 0)
                      .map(([severity, count]) => (
                        <div key={severity} className="flex items-center gap-2">
                          <span className={`h-2.5 w-2.5 rounded-full ${SEVERITY_DOT[severity]}`} />
                          <span className="text-xs capitalize">{severity}</span>
                          <span className="text-xs font-bold">{count}</span>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Two Column: Recent Threats + Sentinel Status */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="lg:col-span-2"
            >
              <Card className="bg-card/50 border-white/[0.06]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-['JetBrains_Mono'] flex items-center gap-2">
                    <UilExclamationTriangle size={16} className="text-orange-400" />
                    Recent Threats
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px]">
                    {threats.length > 0 ? (
                      <div className="space-y-0.5">
                        {threats.map(threat => (
                          <ThreatRow key={threat.id} threat={threat} />
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-16">
                        <UilCheckCircle size={40} className="text-emerald-500/30 mb-3" />
                        <p className="text-sm text-muted-foreground">No threats detected</p>
                        <p className="text-xs text-muted-foreground/50 mt-1">Shield is watching</p>
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <SentinelStatus stats={stats || { sentinel_status: 'inactive' } as ShieldStats} />
            </motion.div>
          </div>

          {/* Recent Events */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <Card className="bg-card/50 border-white/[0.06]">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-['JetBrains_Mono'] flex items-center gap-2">
                    <UilClock size={16} className="text-blue-400" />
                    Event Stream
                  </CardTitle>
                  <span className="text-[10px] text-muted-foreground">{stats?.events_today || 0} events today</span>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[200px]">
                  {events.length > 0 ? (
                    <div className="space-y-0.5">
                      {events.map(event => (
                        <EventRow key={event.id} event={event} />
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center py-8">
                      <p className="text-xs text-muted-foreground">No events recorded yet</p>
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* ── Threats Tab ── */}
        <TabsContent value="threats" className="mt-4">
          <Card className="bg-card/50 border-white/[0.06]">
            <CardHeader>
              <CardTitle className="text-sm font-['JetBrains_Mono']">All Detected Threats</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                {threats.length > 0 ? (
                  <div className="space-y-0.5">
                    {threats.map(threat => (
                      <ThreatRow key={threat.id} threat={threat} />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20">
                    <UilShield size={48} className="text-emerald-500/20 mb-3" />
                    <p className="text-sm text-muted-foreground">No threats in database</p>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Sandbox Tab (placeholder — full page is Sandbox.tsx) ── */}
        <TabsContent value="sandbox" className="mt-4">
          <SandboxTab />
        </TabsContent>

        {/* ── Rules Tab ── */}
        <TabsContent value="rules" className="mt-4">
          <RulesTab />
        </TabsContent>

        {/* ── IOCs Tab ── */}
        <TabsContent value="iocs" className="mt-4">
          <IOCsTab />
        </TabsContent>

        {/* ── Quarantine Tab ── */}
        <TabsContent value="quarantine" className="mt-4">
          <Card className="bg-card/50 border-white/[0.06]">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-['JetBrains_Mono']">Quarantine Vault</CardTitle>
                <Badge variant="outline" className="text-xs">{quarantine.filter(q => !q.restored).length} isolated</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <QuarantinePanel items={quarantine} onRestore={handleRestore} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Forensics Tab ── */}
        <TabsContent value="forensics" className="mt-4">
          <ForensicsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

// ── Sandbox Tab Component ──

function SandboxTab() {
  const { toast } = useToast();
  const [dragOver, setDragOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [verdicts, setVerdicts] = useState<any[]>([]);

  useEffect(() => {
    shieldService.getVerdicts(10).then(setVerdicts).catch(console.error);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    setSubmitting(true);
    try {
      const { sandboxService } = await import('@/services/sandbox');
      for (const file of files) {
        await sandboxService.submit({ file });
        toast({ title: `Submitted: ${file.name}`, description: "Queued for sandbox analysis" });
      }
      // Refresh verdicts
      const updated = await shieldService.getVerdicts(10);
      setVerdicts(updated);
    } catch (err) {
      toast({ title: "Submission failed", description: String(err), variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }, [toast]);

  const handleFileSelect = useCallback(async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.onchange = async () => {
      const files = Array.from(input.files || []);
      if (files.length === 0) return;
      setSubmitting(true);
      try {
        const { sandboxService } = await import('@/services/sandbox');
        for (const file of files) {
          await sandboxService.submit({ file });
          toast({ title: `Submitted: ${file.name}` });
        }
        const updated = await shieldService.getVerdicts(10);
        setVerdicts(updated);
      } catch (err) {
        toast({ title: "Submission failed", description: String(err), variant: "destructive" });
      } finally {
        setSubmitting(false);
      }
    };
    input.click();
  }, [toast]);

  const verdictColor = (v: string) => {
    switch (v) {
      case 'malicious': return 'text-red-500 bg-red-500/10 border-red-500/20';
      case 'suspicious': return 'text-orange-400 bg-orange-400/10 border-orange-400/20';
      case 'clean': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
      default: return 'text-zinc-400 bg-zinc-400/10 border-zinc-400/20';
    }
  };

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <Card
        className={`bg-card/50 border-2 border-dashed transition-colors cursor-pointer ${
          dragOver ? 'border-primary/60 bg-primary/5' : 'border-white/[0.08] hover:border-white/[0.15]'
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={handleFileSelect}
      >
        <CardContent className="flex flex-col items-center justify-center py-16">
          <motion.div
            animate={dragOver ? { scale: 1.1 } : { scale: 1 }}
            className="mb-4"
          >
            <UilAnalysis size={48} className={`${dragOver ? 'text-primary' : 'text-muted-foreground/30'} transition-colors`} />
          </motion.div>
          <p className="text-sm font-medium">{submitting ? 'Submitting...' : 'Drop files here to detonate'}</p>
          <p className="text-xs text-muted-foreground mt-1">
            PE, ELF, PDF, Office, scripts, archives — any suspicious file
          </p>
          <p className="text-[10px] text-muted-foreground/50 mt-3">
            Files are executed in an air-gapped container. No network access by default.
          </p>
        </CardContent>
      </Card>

      {/* Recent Verdicts */}
      <Card className="bg-card/50 border-white/[0.06]">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-['JetBrains_Mono']">Recent Detonations</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px]">
            {verdicts.length > 0 ? (
              <div className="space-y-1">
                {verdicts.map((v: any) => (
                  <div key={v.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/[0.03]">
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium truncate block">{v.file_name}</span>
                      <span className="text-[11px] text-muted-foreground font-mono">{v.file_hash?.slice(0, 24)}...</span>
                    </div>
                    <Badge variant="outline" className={`text-[10px] ${verdictColor(v.verdict)}`}>
                      {v.verdict}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      {v.sandbox_status}
                    </Badge>
                    {v.score > 0 && (
                      <span className={`text-xs font-bold ${v.score >= 70 ? 'text-red-400' : v.score >= 40 ? 'text-orange-400' : 'text-emerald-400'}`}>
                        {v.score}/100
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center py-12">
                <p className="text-xs text-muted-foreground">No sandbox runs yet — drop a file above</p>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Rules Tab Component ──

function RulesTab() {
  const [rules, setRules] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    shieldService.getRules().then(setRules).catch(console.error);
  }, []);

  const toggleRule = async (id: string, enabled: boolean) => {
    try {
      await shieldService.toggleRule(id, enabled);
      setRules(prev => prev.map(r => r.id === id ? { ...r, enabled } : r));
    } catch (err) {
      toast({ title: "Failed to toggle rule", variant: "destructive" });
    }
  };

  return (
    <Card className="bg-card/50 border-white/[0.06]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-['JetBrains_Mono']">Detection Rules</CardTitle>
          <Button variant="outline" size="sm" className="text-xs">+ Add Rule</Button>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px]">
          {rules.length > 0 ? (
            <div className="space-y-1">
              {rules.map(rule => (
                <div key={rule.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/[0.03]">
                  <button
                    onClick={() => toggleRule(rule.id, !rule.enabled)}
                    className={`h-3 w-3 rounded-full border-2 transition-colors ${rule.enabled ? 'bg-emerald-500 border-emerald-500' : 'border-zinc-600'}`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{rule.name}</span>
                      <Badge variant="outline" className="text-[10px] uppercase">{rule.type}</Badge>
                      <Badge variant="outline" className={`text-[10px] ${SEVERITY_COLORS[rule.severity as ThreatSeverity]}`}>
                        {rule.severity}
                      </Badge>
                    </div>
                    {rule.description && <p className="text-[11px] text-muted-foreground mt-0.5">{rule.description}</p>}
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono">{rule.hit_count} hits</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20">
              <UilFileAlt size={40} className="text-muted-foreground/20 mb-3" />
              <p className="text-sm text-muted-foreground">No rules configured</p>
              <p className="text-xs text-muted-foreground/50 mt-1">Add YARA or Sigma rules to start detecting</p>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

// ── IOCs Tab Component ──

function IOCsTab() {
  const [iocs, setIOCs] = useState<any[]>([]);

  useEffect(() => {
    shieldService.getIOCs(50).then(setIOCs).catch(console.error);
  }, []);

  return (
    <Card className="bg-card/50 border-white/[0.06]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-['JetBrains_Mono']">Indicators of Compromise</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="text-xs">Import</Button>
            <Button variant="outline" size="sm" className="text-xs">+ Add IOC</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px]">
          {iocs.length > 0 ? (
            <div className="space-y-1">
              {iocs.map(ioc => (
                <div key={ioc.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/[0.03]">
                  <Badge variant="outline" className="text-[10px] font-mono uppercase w-16 justify-center">{ioc.type?.replace('hash_', '')}</Badge>
                  <span className="text-xs font-mono text-muted-foreground flex-1 truncate">{ioc.value}</span>
                  <span className="text-[10px] text-muted-foreground">{ioc.source}</span>
                  <span className={`text-[10px] font-bold ${ioc.confidence >= 80 ? 'text-red-400' : ioc.confidence >= 50 ? 'text-orange-400' : 'text-zinc-400'}`}>
                    {ioc.confidence}%
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20">
              <UilDatabase size={40} className="text-muted-foreground/20 mb-3" />
              <p className="text-sm text-muted-foreground">No IOCs loaded</p>
              <p className="text-xs text-muted-foreground/50 mt-1">Import from abuse.ch, OTX, or add manually</p>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

// ── Forensics Tab Component ──

function ForensicsTab() {
  return (
    <Card className="bg-card/50 border-white/[0.06]">
      <CardHeader>
        <CardTitle className="text-sm font-['JetBrains_Mono']">Forensic Analysis</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center py-20">
          <UilAnalysis size={48} className="text-muted-foreground/20 mb-3" />
          <p className="text-sm text-muted-foreground">Select a threat or sandbox verdict to analyze</p>
          <p className="text-xs text-muted-foreground/50 mt-1">
            PE/ELF analysis, string extraction, memory forensics, timeline reconstruction
          </p>
          <div className="flex gap-2 mt-6">
            <Badge variant="outline" className="text-[10px]">File Carving</Badge>
            <Badge variant="outline" className="text-[10px]">PE Headers</Badge>
            <Badge variant="outline" className="text-[10px]">String Analysis</Badge>
            <Badge variant="outline" className="text-[10px]">PCAP Replay</Badge>
            <Badge variant="outline" className="text-[10px]">Memory Dump</Badge>
            <Badge variant="outline" className="text-[10px]">MITRE ATT&CK</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default Defender;
