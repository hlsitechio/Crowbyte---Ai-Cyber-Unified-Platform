/**
 * Security Monitor — AI-powered threat analysis
 * Uses DeepSeek V3.1 via monitoring-agent.ts
 */

import { useState, useEffect, useCallback } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { UilShield, UilExclamationTriangle, UilHeartRate, UilBrain, UilSignalAlt, UilEye, UilSync, UilCheckCircle, UilTimesCircle, UilInfoCircle } from "@iconscout/react-unicons";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import {
  monitoringAgent,
  type MonitoringReport,
  type IncidentMemory,
} from "@/services/monitoring-agent";
import { IS_ELECTRON } from "@/lib/platform";

// ── Helpers ──────────────────────────────────────────────────────────────

const statusDot = (status: string) => {
  const color =
    status === "healthy" || status === "HEALTHY"
      ? "bg-emerald-500"
      : status === "warning" || status === "WARNING"
        ? "bg-amber-500"
        : status === "critical" || status === "CRITICAL"
          ? "bg-red-500"
          : "bg-zinc-500";
  return (
    <span
      className={`inline-block h-2.5 w-2.5 rounded-full ${color} shrink-0`}
    />
  );
};

const statusText = (status: string) => {
  const color =
    status === "healthy"
      ? "text-emerald-400"
      : status === "warning"
        ? "text-amber-400"
        : status === "critical"
          ? "text-red-400"
          : "text-zinc-400";
  return <span className={`font-semibold uppercase ${color}`}>{status}</span>;
};

/** Try to pull numbered recommendations from the AI text */
const extractRecommendations = (text: string): string[] => {
  const lines = text.split("\n");
  const recs: string[] = [];
  let inSection = false;

  for (const line of lines) {
    const trimmed = line.trim();
    // Detect recommendation / action section headers
    if (
      /^#+\s*(recommend|action|suggestion|next\s*step)/i.test(trimmed) ||
      /^\*{0,2}(RECOMMEND|ACTION|SUGGESTION|NEXT\s*STEP)/i.test(trimmed)
    ) {
      inSection = true;
      continue;
    }
    // Another heading ends the section
    if (inSection && /^#+\s/.test(trimmed) && !/recommend|action/i.test(trimmed)) {
      inSection = false;
    }
    if (inSection) {
      // Numbered or bulleted items
      const match = trimmed.match(/^(?:\d+[\.\)]\s*|[-*]\s+)(.+)/);
      if (match) {
        recs.push(match[1].replace(/\*\*/g, ""));
      }
    }
  }
  return recs;
};

// ── Component ────────────────────────────────────────────────────────────

const SecurityMonitor = () => {
  const { toast } = useToast();
  const [report, setReport] = useState<MonitoringReport | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [autoOn, setAutoOn] = useState(false);
  const [history, setHistory] = useState<IncidentMemory[]>([]);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  // Sync auto-monitoring state from service
  useEffect(() => {
    setAutoOn(monitoringAgent.isAutoMonitoringActive());
  }, []);

  // Refresh history whenever report changes
  useEffect(() => {
    setHistory(monitoringAgent.getIncidentMemory().slice(-10).reverse());
  }, [report]);

  // Load last report on mount
  useEffect(() => {
    const last = monitoringAgent.getLastReport();
    if (last) setReport(last);
    setHistory(monitoringAgent.getIncidentMemory().slice(-10).reverse());
  }, []);

  const handleScan = useCallback(async () => {
    try {
      setIsScanning(true);
      toast({ title: "Starting AI Security Scan", description: "DeepSeek V3.1 is analyzing..." });
      const r = await monitoringAgent.performMonitoringScan();
      setReport(r);
      toast({
        title: "Scan Complete",
        description: `Status: ${r.status.toUpperCase()}`,
        variant: r.status === "critical" ? "destructive" : "default",
      });
    } catch (err) {
      console.error("Scan failed:", err);
      toast({
        title: "Scan Failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsScanning(false);
    }
  }, [toast]);

  // Auto-monitoring interval (page-level, mirrors the service)
  useEffect(() => {
    if (!autoOn) return;
    const id = setInterval(handleScan, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [autoOn, handleScan]);

  const toggleAuto = () => {
    if (autoOn) {
      monitoringAgent.stopAutoMonitoring();
      setAutoOn(false);
      toast({ title: "Auto-Monitoring Disabled", description: "Automatic scans stopped" });
    } else {
      monitoringAgent.startAutoMonitoring();
      setAutoOn(true);
      toast({ title: "Auto-Monitoring Enabled", description: "Scanning every 5 minutes" });
    }
  };

  const recommendations = report ? extractRecommendations(report.aiAnalysis) : [];

  // ── Render ───────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 p-6">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <UilShield size={28} className="text-primary" />
              Security Monitor
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              AI-powered threat analysis &mdash; DeepSeek V3.1
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={handleScan}
              disabled={isScanning || !IS_ELECTRON}
              size="sm"
              className="bg-primary/20 hover:bg-primary/30"
            >
              {isScanning ? (
                <>
                  <UilSync size={16} className="mr-1.5 animate-spin" />
                  Scanning...
                </>
              ) : (
                <>
                  <UilEye size={16} className="mr-1.5" />
                  Scan Now
                </>
              )}
            </Button>

            <Button
              onClick={toggleAuto}
              disabled={!IS_ELECTRON}
              size="sm"
              variant="ghost"
              className={autoOn ? "text-emerald-400" : "text-muted-foreground"}
            >
              <UilSignalAlt size={16} className={`mr-1.5 ${autoOn ? "animate-pulse" : ""}`} />
              {autoOn ? "Auto: ON" : "Auto: OFF"}
            </Button>
          </div>
        </div>
      </motion.div>

      {/* ── Browser mode info line ─────────────────────────────────── */}
      {!IS_ELECTRON && (
        <div className="flex items-center gap-2 text-xs text-amber-400/80">
          <UilInfoCircle size={14} />
          <span>Desktop mode required for system metrics</span>
        </div>
      )}

      {/* ── Report content ─────────────────────────────────────────── */}
      {report ? (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="space-y-5"
        >
          {/* Status bar */}
          <div className="flex items-center gap-3 text-sm">
            {statusDot(report.status)}
            {statusText(report.status)}
            <span className="text-xs text-muted-foreground ml-auto font-mono">
              {report.timestamp.toLocaleString()}
            </span>
          </div>

          {/* AI Analysis */}
          <div className="rounded-lg bg-transparent p-4">
            <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground">
              <UilBrain size={14} />
              <span className="uppercase tracking-wide">AI Analysis</span>
            </div>
            <ScrollArea className="h-[320px]">
              <pre className="text-sm text-zinc-300 whitespace-pre-wrap font-mono leading-relaxed">
                {report.aiAnalysis}
              </pre>
            </ScrollArea>
          </div>

          {/* Threats */}
          {report.securityThreats.length > 0 && (
            <div className="rounded-lg bg-transparent p-4">
              <div className="flex items-center gap-2 mb-3 text-xs text-red-400">
                <UilExclamationTriangle size={14} />
                <span className="uppercase tracking-wide">Threats</span>
              </div>
              <ul className="space-y-2">
                {report.securityThreats.map((t, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-red-300">
                    <span className="inline-block h-2 w-2 rounded-full bg-red-500 mt-1.5 shrink-0" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Anomalies */}
          {report.anomalies.length > 0 && (
            <div className="rounded-lg bg-transparent p-4">
              <div className="flex items-center gap-2 mb-3 text-xs text-amber-400">
                <UilHeartRate size={14} />
                <span className="uppercase tracking-wide">Anomalies</span>
              </div>
              <ul className="space-y-2">
                {report.anomalies.map((a, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-amber-300">
                    <span className="inline-block h-2 w-2 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                    <span>{a}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recommendations */}
          {recommendations.length > 0 && (
            <div className="rounded-lg bg-transparent p-4">
              <div className="flex items-center gap-2 mb-3 text-xs text-emerald-400">
                <UilCheckCircle size={14} />
                <span className="uppercase tracking-wide">Recommendations</span>
              </div>
              <ol className="space-y-1.5 list-decimal list-inside">
                {recommendations.map((r, i) => (
                  <li key={i} className="text-sm text-zinc-300">
                    {r}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </motion.div>
      ) : (
        /* ── Empty state ──────────────────────────────────────────── */
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <UilShield size={48} className="text-zinc-600 mb-4" />
          <p className="text-sm text-muted-foreground">
            No scan data. Click <span className="text-zinc-300">Scan Now</span> to analyze system security.
          </p>
        </motion.div>
      )}

      {/* ── Scan History ───────────────────────────────────────────── */}
      {history.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1 }}
          className="rounded-lg bg-transparent p-4"
        >
          <div className="flex items-center gap-2 mb-4 text-xs text-muted-foreground">
            <UilSync size={14} />
            <span className="uppercase tracking-wide">Scan History</span>
            <span className="ml-auto text-[10px] text-zinc-600">{history.length} entries</span>
          </div>

          <div className="space-y-1">
            {history.map((entry, idx) => (
              <div key={idx}>
                <button
                  onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-white/[0.05] transition-colors text-left"
                >
                  {statusDot(entry.type)}
                  <span className="text-xs font-mono text-zinc-500 shrink-0">
                    {entry.timestamp.toLocaleString()}
                  </span>
                  <span className="text-xs text-zinc-400 truncate">
                    {entry.description}
                  </span>
                </button>

                <AnimatePresence>
                  {expandedIdx === idx && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="ml-5 mb-2 p-3 rounded bg-zinc-900/80 text-xs text-zinc-400 font-mono whitespace-pre-wrap">
                        <p>
                          <span className="text-zinc-500">Type:</span> {entry.type}
                        </p>
                        <p>
                          <span className="text-zinc-500">Description:</span> {entry.description}
                        </p>
                        {entry.criticalInfo && (
                          <p>
                            <span className="text-zinc-500">Critical UilInfoCircle:</span>{" "}
                            <span className="text-red-400">{entry.criticalInfo}</span>
                          </p>
                        )}
                        {entry.resolution && (
                          <p>
                            <span className="text-zinc-500">Resolution:</span> {entry.resolution}
                          </p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default SecurityMonitor;
