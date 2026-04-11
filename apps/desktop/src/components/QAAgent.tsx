import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
 errorMonitor,
 type ErrorEntry,
 type NetworkEntry,
 type NavigationEntry,
 type PerformanceMetrics,
 type NetworkStats,
 type MisclickEntry,
 type UIAuditEntry,
} from "@/services/error-monitor";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { UilBug, UilTimes, UilGlobe, UilMap, UilHeartRate, UilVolumeUp, UilVolumeMute, UilCopy, UilTrashAlt, UilAngleUp, UilExclamationTriangle, UilWindow, UilClock, UilBolt, UilCheckCircle, UilMouse, UilQrcodeScan, UilSync, UilShieldExclamation, UilPaintTool, UilWheelchair, UilLightbulb, UilEyeSlash, UilEye, UilDraggabledots } from "@iconscout/react-unicons";
// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ErrorFilter = "all" | "critical" | "warning" | "network";

// ---------------------------------------------------------------------------
// Ignore System — persisted in localStorage
// ---------------------------------------------------------------------------

const IGNORED_STORAGE_KEY = "qa_agent_ignored";

function loadIgnoredKeys(): Set<string> {
 try {
 const raw = localStorage.getItem(IGNORED_STORAGE_KEY);
 if (raw) return new Set(JSON.parse(raw));
 } catch { /* corrupted — reset */ }
 return new Set();
}

function saveIgnoredKeys(keys: Set<string>): void {
 localStorage.setItem(IGNORED_STORAGE_KEY, JSON.stringify([...keys]));
}

/** Deterministic key for an error entry */
function errorIgnoreKey(e: ErrorEntry): string {
 return `error::${e.type}::${e.message}::${e.page}`;
}

/** Deterministic key for an audit entry */
function auditIgnoreKey(a: UIAuditEntry): string {
 return `audit::${a.rule}::${a.selector}::${a.page}`;
}

/** Deterministic key for a misclick entry */
function misclickIgnoreKey(m: MisclickEntry): string {
 return `misclick::${m.type}::${m.selector}::${m.page}`;
}

// ---------------------------------------------------------------------------
// Panel Resize — persisted in localStorage
// ---------------------------------------------------------------------------

const PANEL_SIZE_KEY = "qa_agent_panel_size";
const MIN_WIDTH = 380;
const MAX_WIDTH = 900;
const MIN_HEIGHT = 300;
const MAX_HEIGHT = 850;
const DEFAULT_WIDTH = 480;
const DEFAULT_HEIGHT = 600;

interface PanelSize { w: number; h: number }

function loadPanelSize(): PanelSize {
 try {
 const raw = localStorage.getItem(PANEL_SIZE_KEY);
 if (raw) {
 const parsed = JSON.parse(raw);
 return {
 w: Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, parsed.w || DEFAULT_WIDTH)),
 h: Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, parsed.h || DEFAULT_HEIGHT)),
 };
 }
 } catch { /* reset */ }
 return { w: DEFAULT_WIDTH, h: DEFAULT_HEIGHT };
}

function savePanelSize(size: PanelSize): void {
 localStorage.setItem(PANEL_SIZE_KEY, JSON.stringify(size));
}

interface EndpointSummary {
 endpoint: string;
 method: string;
 avgDuration: number;
 count: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function relativeTime(ts: string | number): string {
 const msValue = typeof ts === "string" ? new Date(ts).getTime() : ts;
 const diff = Math.max(0, Math.floor((Date.now() - msValue) / 1000));
 if (diff < 60) return `${diff}s ago`;
 if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
 if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
 return `${Math.floor(diff / 86400)}d ago`;
}

function formatTime(ts: string): string {
 try {
 const d = new Date(ts);
 return d.toLocaleTimeString("en-US", {
 hour12: false,
 hour: "2-digit",
 minute: "2-digit",
 second: "2-digit",
 });
 } catch {
 return "--:--:--";
 }
}

function truncate(str: string, max: number): string {
 if (str.length <= max) return str;
 return str.slice(0, max) + "...";
}

function formatBytes(bytes: number | undefined): string {
 if (bytes === undefined || bytes === 0) return "--";
 if (bytes < 1024) return `${bytes}B`;
 if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
 return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function formatDuration(ms: number | undefined): string {
 if (ms === undefined) return "--";
 if (ms < 1000) return `${Math.round(ms)}ms`;
 return `${(ms / 1000).toFixed(1)}s`;
}

function cleanPageName(page: string): string {
 if (!page || page === "#/" || page === "/") return "Dashboard";
 const cleaned = page.replace(/^#?\/?/, "").replace(/\//g, " > ");
 return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function trimUrl(url: string): string {
 try {
 const u = new URL(url);
 return u.pathname + u.search;
 } catch {
 // If not a full URL, just return a trimmed version
 const idx = url.indexOf("/", url.indexOf("//") + 2);
 return idx >= 0 ? url.slice(idx) : url;
 }
}

function severityBgClass(severity: ErrorEntry["severity"]): string {
 switch (severity) {
 case "critical":
 return "bg-transparent border-transparent";
 case "warning":
 return "bg-transparent border-orange-500/25";
 case "info":
 return "bg-zinc-500/10 border-zinc-500/25";
 default:
 return "bg-zinc-500/10 border-zinc-500/25";
 }
}

function severityBadgeClass(severity: ErrorEntry["severity"]): string {
 switch (severity) {
 case "critical":
 return "bg-red-600 text-white";
 case "warning":
 return "bg-orange-600 text-white";
 case "info":
 return "bg-zinc-600 text-zinc-200";
 default:
 return "bg-zinc-600 text-zinc-200";
 }
}

function methodBadgeClass(method: string): string {
 switch (method.toUpperCase()) {
 case "GET":
 return "bg-emerald-600/80 text-white";
 case "POST":
 return "bg-blue-600/80 text-white";
 case "PUT":
 case "PATCH":
 return "bg-yellow-600/80 text-white";
 case "DELETE":
 return "bg-red-600/80 text-white";
 default:
 return "bg-zinc-600/80 text-zinc-200";
 }
}

function statusBadgeClass(status: number): string {
 if (status === 0) return "bg-red-700 text-white";
 if (status < 300) return "bg-emerald-600/80 text-white";
 if (status < 400) return "bg-blue-600/80 text-white";
 if (status < 500) return "bg-orange-600/80 text-white";
 return "bg-red-600/80 text-white";
}

function durationColor(ms: number): string {
 if (ms < 200) return "text-emerald-500";
 if (ms <= 500) return "text-amber-500";
 return "text-red-500";
}

function latencyColorClass(ms: number): string {
 if (ms < 200) return "text-emerald-500";
 if (ms <= 500) return "text-amber-500";
 return "text-red-500";
}

function memoryColorClass(pct: number): string {
 if (pct < 50) return "text-emerald-500";
 if (pct <= 80) return "text-amber-500";
 return "text-red-500";
}

function typeIcon(type: ErrorEntry["type"]) {
 switch (type) {
 case "network":
 return <UilGlobe size={12} />;
 case "console":
 return <UilWindow size={12} />;
 case "uncaught":
 case "promise":
 return <UilExclamationTriangle size={12} />;
 default:
 return <UilBug size={12} />;
 }
}

function getSlowestEndpoints(network: NetworkEntry[]): EndpointSummary[] {
 const agg: Record<string, { total: number; count: number; method: string }> = {};
 for (const entry of network) {
 const path = trimUrl(entry.url);
 const key = `${entry.method} ${path}`;
 const existing = agg[key];
 if (existing) {
 existing.total += entry.duration;
 existing.count++;
 } else {
 agg[key] = { total: entry.duration, count: 1, method: entry.method };
 }
 }
 return Object.entries(agg)
 .map(([endpoint, data]) => ({
 endpoint: endpoint.replace(/^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s/, ""),
 method: data.method,
 avgDuration: Math.round(data.total / data.count),
 count: data.count,
 }))
 .sort((a, b) => b.avgDuration - a.avgDuration)
 .slice(0, 10);
}

// Web Audio beep for critical errors
function playBeep(): void {
 try {
 const AudioCtx =
 window.AudioContext ||
 ((window as unknown as Record<string, unknown>).webkitAudioContext as typeof AudioContext);
 if (!AudioCtx) return;
 const ctx = new AudioCtx();
 const oscillator = ctx.createOscillator();
 const gain = ctx.createGain();
 oscillator.connect(gain);
 gain.connect(ctx.destination);
 oscillator.type = "sine";
 oscillator.frequency.setValueAtTime(440, ctx.currentTime);
 gain.gain.setValueAtTime(0.05, ctx.currentTime); // very quiet
 gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
 oscillator.start(ctx.currentTime);
 oscillator.stop(ctx.currentTime + 0.2);
 setTimeout(() => ctx.close(), 300);
 } catch {
 // Audio not available
 }
}

function buildFullReport(
 errors: ErrorEntry[],
 network: NetworkEntry[],
 navigation: NavigationEntry[],
 perf: PerformanceMetrics,
 misclicks?: MisclickEntry[],
 audit?: UIAuditEntry[]
): string {
 const now = new Date();
 const sessionStart =
 navigation.length > 0 ? new Date(navigation[0].timestamp) : now;
 const durationMs = now.getTime() - sessionStart.getTime();
 const durationStr = formatDuration(durationMs);

 const criticals = errors.filter((e) => e.severity === "critical");
 const warnings = errors.filter((e) => e.severity === "warning");

 const stats = {
 total: network.length,
 failed: network.filter((n) => !n.ok).length,
 slow: network.filter((n) => n.duration > 500).length,
 avgLatency: perf.avgLatency,
 };

 const slowest = getSlowestEndpoints(network);

 const lines: string[] = [];
 lines.push("# QA Agent Report");
 lines.push(`**Session:** ${now.toISOString()}`);
 lines.push(`**Duration:** ${durationStr}`);
 lines.push(`**Pages visited:** ${navigation.length}`);
 lines.push("");

 // Errors section
 lines.push(`## Errors (${errors.length})`);
 if (criticals.length > 0) {
 lines.push(`### Critical (${criticals.length})`);
 for (const e of criticals) {
 lines.push(`- [${cleanPageName(e.page)}] ${e.message} (${formatTime(e.timestamp)})`);
 }
 }
 if (warnings.length > 0) {
 lines.push(`### UilExclamationTriangle (${warnings.length})`);
 for (const w of warnings) {
 lines.push(`- [${cleanPageName(w.page)}] ${w.message} (${formatTime(w.timestamp)})`);
 }
 }
 if (errors.length === 0) {
 lines.push("No errors detected.");
 }
 lines.push("");

 // Network section
 lines.push(`## Network (${stats.total} requests)`);
 lines.push(`- Failed: ${stats.failed}`);
 lines.push(`- Slow (>500ms): ${stats.slow}`);
 lines.push(`- Avg latency: ${stats.avgLatency}ms`);
 lines.push("");

 if (slowest.length > 0) {
 lines.push("### Slowest Endpoints");
 lines.push("| Endpoint | Avg | Count |");
 lines.push("|----------|-----|-------|");
 for (const s of slowest) {
 lines.push(`| ${s.method} ${s.endpoint} | ${s.avgDuration}ms | ${s.count} |`);
 }
 lines.push("");
 }

 // Navigation Trail
 lines.push("## Navigation Trail");
 for (let i = 0; i < navigation.length; i++) {
 const nav = navigation[i];
 const dur = nav.duration !== undefined ? ` (${formatDuration(nav.duration)})` : "";
 lines.push(`${i + 1}. ${formatTime(nav.timestamp)} - ${cleanPageName(nav.page)}${dur}`);
 }
 lines.push("");

 // Misclicks
 if (misclicks && misclicks.length > 0) {
 const deadClicks = misclicks.filter((m) => m.type === 'dead_click');
 const rageClicks = misclicks.filter((m) => m.type === 'rage_click');
 lines.push(`## Misclicks (${misclicks.length})`);
 if (deadClicks.length > 0) {
 lines.push(`### Dead Clicks (${deadClicks.length})`);
 for (const m of deadClicks) {
 lines.push(`- [${cleanPageName(m.page)}] ${m.element} @ (${m.x},${m.y}) — ${m.selector} (${formatTime(m.timestamp)})`);
 }
 }
 if (rageClicks.length > 0) {
 lines.push(`### Rage Clicks (${rageClicks.length})`);
 for (const m of rageClicks) {
 lines.push(`- [${cleanPageName(m.page)}] ${m.element} x${m.clickCount || '?'} @ (${m.x},${m.y}) — ${m.selector} (${formatTime(m.timestamp)})`);
 }
 }
 lines.push("");
 }

 // UI Audit
 if (audit && audit.length > 0) {
 const auditErrors = audit.filter((a) => a.severity === 'error');
 const auditWarnings = audit.filter((a) => a.severity === 'warning');
 const auditSuggestions = audit.filter((a) => a.severity === 'suggestion');
 lines.push(`## UI/UX Audit (${audit.length})`);
 if (auditErrors.length > 0) {
 lines.push(`### Errors (${auditErrors.length})`);
 for (const a of auditErrors) {
 lines.push(`- [${a.rule}] ${a.message} — ${a.selector} (${cleanPageName(a.page)})`);
 }
 }
 if (auditWarnings.length > 0) {
 lines.push(`### Warnings (${auditWarnings.length})`);
 for (const a of auditWarnings) {
 lines.push(`- [${a.rule}] ${a.message} — ${a.selector} (${cleanPageName(a.page)})`);
 }
 }
 if (auditSuggestions.length > 0) {
 lines.push(`### Suggestions (${auditSuggestions.length})`);
 for (const a of auditSuggestions) {
 lines.push(`- [${a.rule}] ${a.message} — ${a.selector} (${cleanPageName(a.page)})`);
 }
 }
 lines.push("");
 }

 // Performance
 lines.push("## Performance");
 if (perf.pageLoadTime !== undefined) {
 lines.push(`- Page Load: ${perf.pageLoadTime}ms`);
 }
 if (perf.memoryUsed !== undefined && perf.memoryTotal !== undefined) {
 lines.push(`- Memory: ${perf.memoryUsed}MB / ${perf.memoryTotal}MB`);
 }
 lines.push(`- Avg Latency: ${perf.avgLatency}ms`);
 lines.push(`- Slow Requests: ${perf.slowRequests}`);

 return lines.join("\n");
}

function buildGitHubIssue(
 errors: ErrorEntry[],
 network: NetworkEntry[],
 perf: PerformanceMetrics
): string {
 const criticals = errors.filter((e) => e.severity === "critical");
 const stats = {
 total: network.length,
 failed: network.filter((n) => !n.ok).length,
 slow: network.filter((n) => n.duration > 500).length,
 };

 const lines: string[] = [];
 lines.push("## QA Agent Automated Report");
 lines.push("");
 lines.push("### Summary");
 lines.push(`- **Errors:** ${errors.length} (${criticals.length} critical)`);
 lines.push(`- **Network:** ${stats.total} requests, ${stats.failed} failed, ${stats.slow} slow`);
 lines.push(`- **Avg Latency:** ${perf.avgLatency}ms`);
 lines.push("");

 if (criticals.length > 0) {
 lines.push("### Critical Errors");
 lines.push("```");
 for (const e of criticals.slice(0, 10)) {
 lines.push(`[${e.type}] ${e.message}`);
 if (e.stack) {
 const stackLines = e.stack.split("\n").slice(0, 3);
 for (const sl of stackLines) {
 lines.push(` ${sl.trim()}`);
 }
 }
 }
 lines.push("```");
 lines.push("");
 }

 lines.push("### Environment");
 lines.push(`- **Timestamp:** ${new Date().toISOString()}`);
 lines.push(`- **User Agent:** ${navigator.userAgent}`);

 if (perf.memoryUsed !== undefined) {
 lines.push(`- **Memory:** ${perf.memoryUsed}MB / ${perf.memoryTotal}MB`);
 }

 return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Sub-component: ErrorRow
// ---------------------------------------------------------------------------

const ErrorRow = ({
 error,
 expanded,
 onToggle,
 isIgnored,
 onIgnore,
 onUnignore,
}: {
 error: ErrorEntry;
 expanded: boolean;
 onToggle: () => void;
 isIgnored: boolean;
 onIgnore: () => void;
 onUnignore: () => void;
}) => {
 const bgClass = severityBgClass(error.severity);

 return (
 <div
 className={`w-full text-left px-3 py-2 hover:bg-white/5 transition-colors border-b border-white/5 last:border-b-0 ${bgClass} ${isIgnored ? "opacity-40" : ""}`}
 >
 <button type="button" onClick={onToggle} className="w-full text-left">
 <div className="flex items-start gap-2">
 <span className="text-[10px] text-zinc-500 whitespace-nowrap pt-0.5 min-w-[44px]">
 {relativeTime(error.timestamp)}
 </span>

 <span
 className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${severityBadgeClass(error.severity)} whitespace-nowrap`}
 >
 {error.severity === "critical" ? "CRITICAL" : error.severity === "warning" ? "WARN" : "INFO"}
 </span>

 <span
 className="inline-flex items-center gap-1 text-[10px] font-mono text-zinc-400 whitespace-nowrap"
 >
 {typeIcon(error.type)}
 {error.type}
 </span>

 <span className="text-xs text-zinc-300 break-all leading-relaxed flex-1">
 {truncate(error.message, 100)}
 </span>

 {/* Ignore/Unignore button */}
 <span
 role="button"
 tabIndex={0}
 onClick={(e) => { e.stopPropagation(); isIgnored ? onUnignore() : onIgnore(); }}
 onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); isIgnored ? onUnignore() : onIgnore(); } }}
 className="flex-shrink-0 p-1 rounded hover:bg-white/10 transition-colors text-zinc-600 hover:text-zinc-300"
 title={isIgnored ? "Unignore this error" : "Ignore this error"}
 >
 {isIgnored ? <UilEye size={12} /> : <UilEyeSlash size={12} />}
 </span>
 </div>

 <div className="mt-1 ml-[44px] text-[10px] text-zinc-600 font-mono">
 {error.page}
 </div>

 <AnimatePresence>
 {expanded && (
 <motion.div
 initial={{ height: 0, opacity: 0 }}
 animate={{ height: "auto", opacity: 1 }}
 exit={{ height: 0, opacity: 0 }}
 transition={{ duration: 0.15 }}
 className="overflow-hidden"
 >
 <div className="mt-2 ml-[44px] p-2 rounded bg-black/40 border border-white/5 text-[11px] font-mono text-zinc-400 space-y-1">
 {error.stack && (
 <div>
 <span className="text-zinc-600">stack:</span>
 <pre className="whitespace-pre-wrap break-all mt-0.5 text-zinc-500 max-h-32 overflow-auto">
 {error.stack}
 </pre>
 </div>
 )}
 {error.url && (
 <div>
 <span className="text-zinc-600">url:</span>{" "}
 <span className="text-zinc-400 break-all">{error.url}</span>
 </div>
 )}
 {error.status !== undefined && (
 <div>
 <span className="text-zinc-600">status:</span>{" "}
 {error.status} {error.statusText}
 </div>
 )}
 {error.method && (
 <div>
 <span className="text-zinc-600">method:</span>{" "}
 {error.method}
 </div>
 )}
 </div>
 </motion.div>
 )}
 </AnimatePresence>
 </button>
 </div>
 );
};

// ---------------------------------------------------------------------------
// Sub-component: NetworkRow
// ---------------------------------------------------------------------------

const NetworkRow = ({ entry }: { entry: NetworkEntry }) => {
 const isSlow = entry.duration > 500;
 return (
 <div
 className={`flex items-center gap-2 px-3 py-1.5 text-[11px] font-mono border-b border-white/5 hover:bg-white/5 transition-colors ${
 isSlow ? "border-l-2 border-l-yellow-500" : ""
 }`}
 >
 <span
 className={`inline-flex items-center justify-center text-[9px] font-bold uppercase px-1.5 py-0.5 rounded min-w-[40px] ${methodBadgeClass(entry.method)}`}
 >
 {entry.method}
 </span>

 <span className="flex-1 text-zinc-400 truncate" title={entry.url}>
 {trimUrl(entry.url)}
 </span>

 <span
 className={`inline-flex items-center justify-center text-[9px] font-bold px-1.5 py-0.5 rounded min-w-[32px] ${statusBadgeClass(entry.status)}`}
 >
 {entry.status || "ERR"}
 </span>

 <span className={`min-w-[48px] text-right ${durationColor(entry.duration)}`}>
 {formatDuration(entry.duration)}
 </span>

 <span className="min-w-[40px] text-right text-zinc-600">
 {formatBytes(entry.size)}
 </span>
 </div>
 );
};

// ---------------------------------------------------------------------------
// Sub-component: ErrorsTab
// ---------------------------------------------------------------------------

const ErrorsTab = ({
 errors,
 expandedId,
 onToggleExpanded,
 ignoredKeys,
 onIgnore,
 onUnignore,
}: {
 errors: ErrorEntry[];
 expandedId: string | null;
 onToggleExpanded: (id: string) => void;
 ignoredKeys: Set<string>;
 onIgnore: (key: string) => void;
 onUnignore: (key: string) => void;
}) => {
 const [filter, setFilter] = useState<ErrorFilter>("all");

 const filtered = useMemo(() => {
 if (filter === "all") return errors;
 if (filter === "critical") return errors.filter((e) => e.severity === "critical");
 if (filter === "warning") return errors.filter((e) => e.severity === "warning");
 if (filter === "network") return errors.filter((e) => e.type === "network");
 return errors;
 }, [errors, filter]);

 const counts = useMemo(() => {
 let critical = 0;
 let warning = 0;
 let network = 0;
 for (const e of errors) {
 if (e.severity === "critical") critical++;
 if (e.severity === "warning") warning++;
 if (e.type === "network") network++;
 }
 return { critical, warning, network };
 }, [errors]);

 const filters: { key: ErrorFilter; label: string; count?: number }[] = [
 { key: "all", label: "All" },
 { key: "critical", label: "Critical", count: counts.critical },
 { key: "warning", label: "UilExclamationTriangle", count: counts.warning },
 { key: "network", label: "Network", count: counts.network },
 ];

 if (errors.length === 0) {
 return (
 <div className="flex flex-col items-center justify-center py-12 text-zinc-600 gap-2">
 <UilCheckCircle size={32} className="text-emerald-500/40" />
 <span className="text-xs">No errors detected</span>
 <span className="text-[10px] text-zinc-700">
 Monitoring console, network, and uncaught exceptions
 </span>
 </div>
 );
 }

 return (
 <div className="flex flex-col h-full">
 {/* Filter bar */}
 <div className="flex items-center gap-1 px-3 py-2 border-b border-white/5 bg-zinc-900/30">
 {filters.map((f) => (
 <button
 key={f.key}
 type="button"
 onClick={() => setFilter(f.key)}
 className={`text-[10px] px-2 py-1 rounded font-medium transition-colors ${
 filter === f.key
 ? "bg-primary/20 text-primary"
 : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
 }`}
 >
 {f.label}
 {f.count !== undefined && f.count > 0 && (
 <span className="ml-1 text-[9px] opacity-70">({f.count})</span>
 )}
 </button>
 ))}
 </div>
 <ScrollArea className="flex-1">
 <div>
 {[...filtered].reverse().map((error) => {
 const key = errorIgnoreKey(error);
 return (
 <ErrorRow
 key={error.id}
 error={error}
 expanded={expandedId === error.id}
 onToggle={() => onToggleExpanded(error.id)}
 isIgnored={ignoredKeys.has(key)}
 onIgnore={() => onIgnore(key)}
 onUnignore={() => onUnignore(key)}
 />
 );
 })}
 </div>
 </ScrollArea>
 </div>
 );
};

// ---------------------------------------------------------------------------
// Sub-component: NetworkTab
// ---------------------------------------------------------------------------

const NetworkTab = ({ network, stats }: { network: NetworkEntry[]; stats: NetworkStats }) => {
 if (network.length === 0) {
 return (
 <div className="flex flex-col items-center justify-center py-12 text-zinc-600 gap-2">
 <UilGlobe size={32} className="text-zinc-700" />
 <span className="text-xs">No network requests captured</span>
 </div>
 );
 }

 return (
 <div className="flex flex-col h-full">
 {/* Stats bar */}
 <div className="grid grid-cols-4 gap-2 px-3 py-2 border-b border-white/5 bg-zinc-900/30">
 <div className="text-center">
 <div className="text-[10px] text-zinc-500">Total</div>
 <div className="text-sm font-bold text-zinc-200">{stats.total}</div>
 </div>
 <div className="text-center">
 <div className="text-[10px] text-zinc-500">Failed</div>
 <div className={`text-sm font-bold ${stats.failed > 0 ? "text-red-500" : "text-zinc-200"}`}>
 {stats.failed}
 </div>
 </div>
 <div className="text-center">
 <div className="text-[10px] text-zinc-500">Slow</div>
 <div className={`text-sm font-bold ${stats.slow > 0 ? "text-amber-500" : "text-zinc-200"}`}>
 {stats.slow}
 </div>
 </div>
 <div className="text-center">
 <div className="text-[10px] text-zinc-500">Avg</div>
 <div className={`text-sm font-bold ${latencyColorClass(stats.avgLatency)}`}>
 {stats.avgLatency}ms
 </div>
 </div>
 </div>
 <ScrollArea className="flex-1">
 <div>
 {[...network].reverse().map((entry) => (
 <NetworkRow key={entry.id} entry={entry} />
 ))}
 </div>
 </ScrollArea>
 </div>
 );
};

// ---------------------------------------------------------------------------
// Sub-component: PagesTab
// ---------------------------------------------------------------------------

const PagesTab = ({
 navigation,
 errors,
}: {
 navigation: NavigationEntry[];
 errors: ErrorEntry[];
}) => {
 const sessionDuration = useMemo(() => {
 if (navigation.length === 0) return "--";
 const start = new Date(navigation[0].timestamp).getTime();
 const dur = Date.now() - start;
 return formatDuration(dur);
 }, [navigation]);

 const errorPages = useMemo(() => {
 const pages = new Set<string>();
 for (const e of errors) {
 pages.add(e.page);
 }
 return pages;
 }, [errors]);

 if (navigation.length === 0) {
 return (
 <div className="flex flex-col items-center justify-center py-12 text-zinc-600 gap-2">
 <UilMap size={32} className="text-zinc-700" />
 <span className="text-xs">No navigation recorded</span>
 </div>
 );
 }

 return (
 <div className="flex flex-col h-full">
 {/* Summary bar */}
 <div className="flex items-center justify-between px-3 py-2 border-b border-white/5 bg-zinc-900/30">
 <div className="flex items-center gap-3">
 <div>
 <span className="text-[10px] text-zinc-500 mr-1">Pages:</span>
 <span className="text-xs font-bold text-zinc-200">{navigation.length}</span>
 </div>
 <div>
 <span className="text-[10px] text-zinc-500 mr-1">Session:</span>
 <span className="text-xs font-bold text-zinc-200">{sessionDuration}</span>
 </div>
 </div>
 </div>
 <ScrollArea className="flex-1">
 <div className="px-4 py-3">
 {/* Vertical timeline */}
 <div className="relative">
 {/* Vertical line */}
 <div className="absolute left-[7px] top-2 bottom-2 w-px bg-white/[0.08]" />

 {navigation.map((nav, i) => {
 const hasErrors = errorPages.has(nav.page);
 return (
 <div key={i} className="relative flex items-start gap-3 pb-4 last:pb-0">
 {/* Dot */}
 <div
 className={`relative z-10 mt-1 h-[15px] w-[15px] rounded-full border-2 flex-shrink-0 ${
 hasErrors
 ? "border-red-500 bg-transparent"
 : "border-emerald-500 bg-transparent"
 }`}
 >
 <div
 className={`absolute inset-[3px] rounded-full ${
 hasErrors ? "bg-red-500" : "bg-emerald-500"
 }`}
 />
 </div>

 {/* Content */}
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-2">
 <span className="text-xs font-medium text-zinc-200">
 {cleanPageName(nav.page)}
 </span>
 {hasErrors && (
 <UilExclamationTriangle size={12} className="text-red-500 flex-shrink-0" />
 )}
 </div>
 <div className="flex items-center gap-2 mt-0.5">
 <span className="text-[10px] text-zinc-500 font-mono">
 {formatTime(nav.timestamp)}
 </span>
 {nav.duration !== undefined && (
 <span className="text-[10px] text-zinc-600">
 {formatDuration(nav.duration)}
 </span>
 )}
 </div>
 </div>
 </div>
 );
 })}
 </div>
 </div>
 </ScrollArea>
 </div>
 );
};

// ---------------------------------------------------------------------------
// Sub-component: PerfTab
// ---------------------------------------------------------------------------

const PerfTab = ({
 perf,
 network,
}: {
 perf: PerformanceMetrics;
 network: NetworkEntry[];
}) => {
 const memoryPct = useMemo(() => {
 if (!perf.memoryUsed || !perf.memoryTotal || perf.memoryTotal === 0) return 0;
 return Math.round((perf.memoryUsed / perf.memoryTotal) * 100);
 }, [perf.memoryUsed, perf.memoryTotal]);

 const slowest = useMemo(() => getSlowestEndpoints(network), [network]);

 return (
 <div className="flex flex-col h-full">
 <ScrollArea className="flex-1">
 <div className="p-3 space-y-3">
 {/* Metric cards */}
 <div className="grid grid-cols-2 gap-2">
 {/* Page Load */}
 <div className="rounded-lg border border-white/5 bg-transparent p-3">
 <div className="flex items-center gap-1.5 mb-1">
 <UilBolt size={14} className="text-zinc-500" />
 <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Page Load</span>
 </div>
 <div
 className={`text-lg font-bold ${
 perf.pageLoadTime !== undefined
 ? latencyColorClass(perf.pageLoadTime)
 : "text-zinc-500"
 }`}
 >
 {perf.pageLoadTime !== undefined ? `${perf.pageLoadTime}ms` : "--"}
 </div>
 </div>

 {/* Memory */}
 <div className="rounded-lg border border-white/5 bg-transparent p-3">
 <div className="flex items-center gap-1.5 mb-1">
 <UilHeartRate size={14} className="text-zinc-500" />
 <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Memory</span>
 </div>
 {perf.memoryUsed !== undefined ? (
 <>
 <div className={`text-lg font-bold ${memoryColorClass(memoryPct)}`}>
 {memoryPct}%
 </div>
 <Progress
 value={memoryPct}
 className="h-1.5 mt-1 bg-white/[0.05]"
 />
 <div className="text-[9px] text-zinc-600 mt-0.5">
 {perf.memoryUsed}MB / {perf.memoryTotal}MB
 </div>
 </>
 ) : (
 <div className="text-lg font-bold text-zinc-500">--</div>
 )}
 </div>

 {/* Avg Latency */}
 <div className="rounded-lg border border-white/5 bg-transparent p-3">
 <div className="flex items-center gap-1.5 mb-1">
 <UilClock size={14} className="text-zinc-500" />
 <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Avg Latency</span>
 </div>
 <div className={`text-lg font-bold ${latencyColorClass(perf.avgLatency)}`}>
 {perf.avgLatency}ms
 </div>
 </div>

 {/* Slow Requests */}
 <div className="rounded-lg border border-white/5 bg-transparent p-3">
 <div className="flex items-center gap-1.5 mb-1">
 <UilExclamationTriangle size={14} className="text-zinc-500" />
 <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Slow Reqs</span>
 </div>
 <div
 className={`text-lg font-bold ${
 perf.slowRequests > 0 ? "text-amber-500" : "text-emerald-500"
 }`}
 >
 {perf.slowRequests}
 </div>
 <div className="text-[9px] text-zinc-600">&gt;500ms threshold</div>
 </div>
 </div>

 {/* Slowest endpoints */}
 {slowest.length > 0 && (
 <div>
 <div className="text-zinc-500 uppercase tracking-wider text-[10px] mb-2">
 Slowest Endpoints
 </div>
 <div className="rounded-lg border border-white/5 bg-transparent overflow-hidden">
 {/* Table header */}
 <div className="grid grid-cols-[1fr_60px_40px] gap-1 px-3 py-1.5 text-[9px] text-zinc-600 uppercase tracking-wider border-b border-white/5">
 <span>Endpoint</span>
 <span className="text-right">Avg</span>
 <span className="text-right">Cnt</span>
 </div>
 {slowest.map((s, i) => (
 <div
 key={i}
 className="grid grid-cols-[1fr_60px_40px] gap-1 px-3 py-1.5 text-[10px] font-mono border-b border-white/5 last:border-b-0 hover:bg-white/5"
 >
 <span className="text-zinc-400 truncate">
 <span className={methodBadgeClass(s.method).replace(/bg-\S+/, "").trim()}>
 {s.method}
 </span>{" "}
 {s.endpoint}
 </span>
 <span className={`text-right ${latencyColorClass(s.avgDuration)}`}>
 {s.avgDuration}ms
 </span>
 <span className="text-right text-zinc-500">{s.count}</span>
 </div>
 ))}
 </div>
 </div>
 )}
 </div>
 </ScrollArea>
 </div>
 );
};

// ---------------------------------------------------------------------------
// Sub-component: ClicksTab
// ---------------------------------------------------------------------------

const ClicksTab = ({
 misclicks,
 ignoredKeys,
 onIgnore,
 onUnignore,
}: {
 misclicks: MisclickEntry[];
 ignoredKeys: Set<string>;
 onIgnore: (key: string) => void;
 onUnignore: (key: string) => void;
}) => {
 const stats = useMemo(() => {
 let dead = 0;
 let rage = 0;
 for (const m of misclicks) {
 if (m.type === 'dead_click') dead++;
 else rage++;
 }
 return { dead, rage, total: misclicks.length };
 }, [misclicks]);

 // Group by element selector for frequency analysis
 const grouped = useMemo(() => {
 const map: Record<string, { entry: MisclickEntry; count: number }> = {};
 for (const m of misclicks) {
 const key = `${m.page}::${m.selector}::${m.type}`;
 if (map[key]) {
 map[key].count++;
 } else {
 map[key] = { entry: m, count: 1 };
 }
 }
 return Object.values(map).sort((a, b) => b.count - a.count);
 }, [misclicks]);

 if (misclicks.length === 0) {
 return (
 <div className="flex flex-col items-center justify-center py-12 text-zinc-600 gap-2">
 <UilMouse size={32} className="text-emerald-500/40" />
 <span className="text-xs">No misclicks detected</span>
 <span className="text-[10px] text-zinc-700">
 Monitoring dead clicks & rage clicks
 </span>
 </div>
 );
 }

 return (
 <div className="flex flex-col h-full">
 {/* Stats bar */}
 <div className="grid grid-cols-3 gap-2 px-3 py-2 border-b border-white/5 bg-zinc-900/30">
 <div className="text-center">
 <div className="text-[10px] text-zinc-500">Total</div>
 <div className="text-sm font-bold text-zinc-200">{stats.total}</div>
 </div>
 <div className="text-center">
 <div className="text-[10px] text-zinc-500">Dead</div>
 <div className={`text-sm font-bold ${stats.dead > 0 ? "text-orange-500" : "text-zinc-200"}`}>
 {stats.dead}
 </div>
 </div>
 <div className="text-center">
 <div className="text-[10px] text-zinc-500">Rage</div>
 <div className={`text-sm font-bold ${stats.rage > 0 ? "text-red-500" : "text-zinc-200"}`}>
 {stats.rage}
 </div>
 </div>
 </div>

 <ScrollArea className="flex-1">
 <div className="p-3 space-y-2">
 {/* Frequency table — most problematic elements first */}
 {grouped.length > 0 && (
 <div>
 <div className="text-zinc-500 uppercase tracking-wider text-[10px] mb-2">
 Problem Elements
 </div>
 <div className="rounded-lg border border-white/5 bg-transparent overflow-hidden">
 {grouped.map((g, i) => {
 const key = misclickIgnoreKey(g.entry);
 const isIgnored = ignoredKeys.has(key);
 return (
 <div
 key={i}
 className={`px-3 py-2 border-b border-white/5 last:border-b-0 hover:bg-white/5 transition-colors ${isIgnored ? "opacity-40" : ""} ${
 g.entry.type === 'rage_click'
 ? 'border-l-2 border-l-red-500'
 : 'border-l-2 border-l-orange-500'
 }`}
 >
 <div className="flex items-center gap-2">
 <span
 className={`inline-flex items-center text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
 g.entry.type === 'rage_click'
 ? 'bg-red-600 text-white'
 : 'bg-orange-600 text-white'
 }`}
 >
 {g.entry.type === 'rage_click' ? 'RAGE' : 'DEAD'}
 </span>
 <span className="text-[10px] text-zinc-400 font-mono truncate flex-1">
 {g.entry.element}
 </span>
 {g.count > 1 && (
 <Badge className="text-[9px] px-1.5 py-0 h-4 bg-zinc-700 text-zinc-300">
 x{g.count}
 </Badge>
 )}
 <button
 type="button"
 onClick={() => isIgnored ? onUnignore(key) : onIgnore(key)}
 className="flex-shrink-0 p-1 rounded hover:bg-white/10 transition-colors text-zinc-600 hover:text-zinc-300"
 title={isIgnored ? "Unignore" : "Ignore this misclick"}
 >
 {isIgnored ? <UilEye size={12} /> : <UilEyeSlash size={12} />}
 </button>
 </div>
 <div className="mt-1 flex items-center gap-3 text-[10px]">
 <span className="text-zinc-600 font-mono">{g.entry.selector}</span>
 <span className="text-zinc-700">|</span>
 <span className="text-zinc-500">{cleanPageName(g.entry.page)}</span>
 </div>
 </div>
 );
 })}
 </div>
 </div>
 )}

 {/* Recent misclicks timeline */}
 <div>
 <div className="text-zinc-500 uppercase tracking-wider text-[10px] mb-2 mt-3">
 Recent Events
 </div>
 {[...misclicks].reverse().slice(0, 20).map((m) => (
 <div
 key={m.id}
 className="flex items-start gap-2 px-2 py-1.5 text-[11px] border-b border-white/5 last:border-b-0"
 >
 <span className="text-[10px] text-zinc-600 whitespace-nowrap min-w-[44px]">
 {relativeTime(m.timestamp)}
 </span>
 <span
 className={`inline-flex items-center text-[9px] font-bold uppercase px-1 py-0.5 rounded whitespace-nowrap ${
 m.type === 'rage_click'
 ? 'bg-red-600/80 text-white'
 : 'bg-orange-600/80 text-white'
 }`}
 >
 {m.type === 'rage_click' ? `RAGE x${m.clickCount || '?'}` : 'DEAD'}
 </span>
 <span className="text-zinc-400 font-mono truncate flex-1">{m.element}</span>
 <span className="text-zinc-700 whitespace-nowrap text-[10px]">
 ({m.x},{m.y})
 </span>
 </div>
 ))}
 </div>
 </div>
 </ScrollArea>
 </div>
 );
};

// ---------------------------------------------------------------------------
// Sub-component: AuditTab
// ---------------------------------------------------------------------------

function auditSeverityBadge(severity: UIAuditEntry['severity']): string {
 switch (severity) {
 case 'error': return 'bg-red-600 text-white';
 case 'warning': return 'bg-orange-600 text-white';
 case 'suggestion': return 'bg-blue-600 text-white';
 default: return 'bg-zinc-600 text-zinc-200';
 }
}

function auditCategoryIcon(category: UIAuditEntry['category']) {
 switch (category) {
 case 'format': return <UilPaintTool size={12} />;
 case 'accessibility': return <UilWheelchair size={12} />;
 case 'ux': return <UilLightbulb size={12} />;
 case 'performance': return <UilBolt size={12} />;
 default: return <UilQrcodeScan size={12} />;
 }
}

const AuditTab = ({
 audit,
 onReaudit,
 ignoredKeys,
 onIgnore,
 onUnignore,
}: {
 audit: UIAuditEntry[];
 onReaudit: () => void;
 ignoredKeys: Set<string>;
 onIgnore: (key: string) => void;
 onUnignore: (key: string) => void;
}) => {
 const [filterCategory, setFilterCategory] = useState<string>("all");

 const stats = useMemo(() => {
 let errors = 0, warnings = 0, suggestions = 0;
 const byCategory: Record<string, number> = {};
 const byRule: Record<string, number> = {};
 for (const a of audit) {
 if (a.severity === 'error') errors++;
 else if (a.severity === 'warning') warnings++;
 else suggestions++;
 byCategory[a.category] = (byCategory[a.category] || 0) + 1;
 byRule[a.rule] = (byRule[a.rule] || 0) + 1;
 }
 return { total: audit.length, errors, warnings, suggestions, byCategory, byRule };
 }, [audit]);

 const filtered = useMemo(() => {
 if (filterCategory === 'all') return audit;
 return audit.filter((a) => a.category === filterCategory);
 }, [audit, filterCategory]);

 // Group by rule for summary view
 const groupedByRule = useMemo(() => {
 const map: Record<string, { entries: UIAuditEntry[]; count: number }> = {};
 for (const a of filtered) {
 const key = `${a.rule}::${a.page}`;
 if (map[key]) {
 map[key].entries.push(a);
 map[key].count++;
 } else {
 map[key] = { entries: [a], count: 1 };
 }
 }
 return Object.values(map).sort((a, b) => {
 // Sort: errors first, then by count
 const sevOrder = { error: 0, warning: 1, suggestion: 2 };
 const aSev = sevOrder[a.entries[0].severity] ?? 3;
 const bSev = sevOrder[b.entries[0].severity] ?? 3;
 if (aSev !== bSev) return aSev - bSev;
 return b.count - a.count;
 });
 }, [filtered]);

 if (audit.length === 0) {
 return (
 <div className="flex flex-col items-center justify-center py-12 text-zinc-600 gap-2">
 <UilQrcodeScan size={32} className="text-emerald-500/40" />
 <span className="text-xs">No audit findings</span>
 <span className="text-[10px] text-zinc-700">
 UI/UX audit runs automatically on each page visit
 </span>
 <Button
 variant="ghost"
 size="sm"
 className="mt-2 text-[10px] text-zinc-500 hover:text-zinc-300"
 onClick={onReaudit}
 >
 <UilSync size={12} className="mr-1" /> Re-audit current page
 </Button>
 </div>
 );
 }

 return (
 <div className="flex flex-col h-full">
 {/* Stats bar */}
 <div className="flex items-center justify-between px-3 py-2 border-b border-white/5 bg-zinc-900/30">
 <div className="flex items-center gap-3">
 <div className="text-center">
 <span className="text-[10px] text-zinc-500 mr-1">Total:</span>
 <span className="text-xs font-bold text-zinc-200">{stats.total}</span>
 </div>
 {stats.errors > 0 && (
 <Badge className="text-[9px] px-1.5 py-0 h-4 bg-red-600 text-white">{stats.errors} err</Badge>
 )}
 {stats.warnings > 0 && (
 <Badge className="text-[9px] px-1.5 py-0 h-4 bg-orange-600 text-white">{stats.warnings} warn</Badge>
 )}
 {stats.suggestions > 0 && (
 <Badge className="text-[9px] px-1.5 py-0 h-4 bg-blue-600 text-white">{stats.suggestions} tip</Badge>
 )}
 </div>
 <Button
 variant="ghost"
 size="icon"
 className="h-6 w-6 text-zinc-500 hover:text-zinc-300"
 onClick={onReaudit}
 title="Re-audit current page"
 >
 <UilSync size={12} />
 </Button>
 </div>

 {/* Category filter */}
 <div className="flex items-center gap-1 px-3 py-1.5 border-b border-white/5 bg-zinc-900/20">
 {["all", "format", "accessibility", "ux"].map((cat) => (
 <button
 key={cat}
 type="button"
 onClick={() => setFilterCategory(cat)}
 className={`text-[10px] px-2 py-0.5 rounded font-medium transition-colors ${
 filterCategory === cat
 ? "bg-primary/20 text-primary"
 : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
 }`}
 >
 {cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1)}
 {cat !== 'all' && stats.byCategory[cat] ? ` (${stats.byCategory[cat]})` : ''}
 </button>
 ))}
 </div>

 <ScrollArea className="flex-1">
 <div className="p-2 space-y-1.5">
 {groupedByRule.map((group, i) => {
 const first = group.entries[0];
 const key = auditIgnoreKey(first);
 const isIgnored = ignoredKeys.has(key);
 return (
 <div
 key={i}
 className={`rounded-md border px-3 py-2 ${isIgnored ? "opacity-40" : ""} ${
 first.severity === 'error'
 ? 'border-transparent bg-transparent'
 : first.severity === 'warning'
 ? 'border-transparent bg-transparent'
 : 'border-transparent bg-transparent'
 }`}
 >
 <div className="flex items-center gap-2 min-w-0">
 <span className="flex-shrink-0">{auditCategoryIcon(first.category)}</span>
 <span
 className={`inline-flex items-center text-[9px] font-bold uppercase px-1.5 py-0.5 rounded flex-shrink-0 ${auditSeverityBadge(first.severity)}`}
 >
 {first.severity === 'suggestion' ? 'TIP' : first.severity.toUpperCase()}
 </span>
 <span className="text-[10px] text-zinc-400 font-mono truncate min-w-0">{first.rule}</span>
 {group.count > 1 && (
 <Badge className="text-[9px] px-1.5 py-0 h-4 bg-zinc-700 text-zinc-300 flex-shrink-0">
 x{group.count}
 </Badge>
 )}
 <span className="text-[10px] text-zinc-600 ml-auto flex-shrink-0">{cleanPageName(first.page)}</span>
 <button
 type="button"
 onClick={() => isIgnored ? onUnignore(key) : onIgnore(key)}
 className="flex-shrink-0 p-1 rounded hover:bg-white/10 transition-colors text-zinc-600 hover:text-zinc-300"
 title={isIgnored ? "Unignore" : "Ignore this finding"}
 >
 {isIgnored ? <UilEye size={12} /> : <UilEyeSlash size={12} />}
 </button>
 </div>
 <div className="mt-1 text-[11px] text-zinc-300">{first.message}</div>
 <div className="mt-0.5 text-[10px] text-zinc-600 font-mono truncate">{first.selector}</div>
 {first.element && (
 <div className="mt-0.5 text-[10px] text-zinc-700 font-mono truncate">{first.element}</div>
 )}
 </div>
 );
 })}
 </div>
 </ScrollArea>
 </div>
 );
};

// ---------------------------------------------------------------------------
// Sub-component: ActivitySparkline
// ---------------------------------------------------------------------------

const ActivitySparkline = ({ timestamps }: { timestamps: number[] }) => {
 // Show last 10 timestamps as dots spread across a small bar
 const recent = timestamps.slice(-10);
 if (recent.length === 0) return null;

 const now = Date.now();
 const oldest = recent[0];
 const range = Math.max(now - oldest, 1000);

 return (
 <div className="flex items-center gap-[2px] h-3 ml-2">
 {recent.map((ts, i) => {
 const age = now - ts;
 const opacity = Math.max(0.2, 1 - age / range);
 return (
 <div
 key={i}
 className="h-2 w-[3px] rounded-sm bg-red-500"
 style={{ opacity }}
 />
 );
 })}
 </div>
 );
};

// ---------------------------------------------------------------------------
// Main Component: QAAgent
// ---------------------------------------------------------------------------

export function QAAgent() {
 const location = useLocation();
 const [enabled, setEnabled] = useState(() => localStorage.getItem('ai_debugger_enabled') !== 'false');
 const [open, setOpen] = useState(false);

 // Listen for settings toggle
 useEffect(() => {
 const handler = (e: Event) => {
 const detail = (e as CustomEvent).detail;
 if (detail && typeof detail.aiDebugger === 'boolean') {
 setEnabled(detail.aiDebugger);
 if (!detail.aiDebugger) setOpen(false);
 }
 };
 window.addEventListener('crowbyte:debugger-toggle', handler);
 // Also check on storage change (other tabs)
 const storageHandler = () => {
 setEnabled(localStorage.getItem('ai_debugger_enabled') !== 'false');
 };
 window.addEventListener('storage', storageHandler);
 return () => {
 window.removeEventListener('crowbyte:debugger-toggle', handler);
 window.removeEventListener('storage', storageHandler);
 };
 }, []);

 const [errors, setErrors] = useState<ErrorEntry[]>([]);
 const [network, setNetwork] = useState<NetworkEntry[]>([]);
 const [navigation, setNavigation] = useState<NavigationEntry[]>([]);
 const [misclicks, setMisclicks] = useState<MisclickEntry[]>([]);
 const [audit, setAudit] = useState<UIAuditEntry[]>([]);
 const [perf, setPerf] = useState<PerformanceMetrics>({
 slowRequests: 0,
 totalRequests: 0,
 avgLatency: 0,
 });
 const [netStats, setNetStats] = useState<NetworkStats>({
 total: 0,
 failed: 0,
 slow: 0,
 avgLatency: 0,
 });
 const [expandedId, setExpandedId] = useState<string | null>(null);
 const [copiedReport, setCopiedReport] = useState(false);
 const [copiedIssue, setCopiedIssue] = useState(false);
 const [soundEnabled, setSoundEnabled] = useState(false);
 const [prevCriticalCount, setPrevCriticalCount] = useState(0);
 const [countBounce, setCountBounce] = useState(false);
 const [showIgnored, setShowIgnored] = useState(false);
 const [ignoredKeys, setIgnoredKeys] = useState<Set<string>>(loadIgnoredKeys);
 const prevErrorCountRef = useRef(0);

 const handleIgnore = useCallback((key: string) => {
 setIgnoredKeys((prev) => {
 const next = new Set(prev);
 next.add(key);
 saveIgnoredKeys(next);
 return next;
 });
 }, []);

 const handleUnignore = useCallback((key: string) => {
 setIgnoredKeys((prev) => {
 const next = new Set(prev);
 next.delete(key);
 saveIgnoredKeys(next);
 return next;
 });
 }, []);

 const handleClearIgnored = useCallback(() => {
 setIgnoredKeys(new Set());
 saveIgnoredKeys(new Set());
 }, []);

 // Filter out ignored items
 const visibleErrors = useMemo(
 () => showIgnored ? errors : errors.filter((e) => !ignoredKeys.has(errorIgnoreKey(e))),
 [errors, ignoredKeys, showIgnored]
 );
 const visibleAudit = useMemo(
 () => showIgnored ? audit : audit.filter((a) => !ignoredKeys.has(auditIgnoreKey(a))),
 [audit, ignoredKeys, showIgnored]
 );
 const visibleMisclicks = useMemo(
 () => showIgnored ? misclicks : misclicks.filter((m) => !ignoredKeys.has(misclickIgnoreKey(m))),
 [misclicks, ignoredKeys, showIgnored]
 );

 const ignoredCount = useMemo(() => {
 let count = 0;
 for (const e of errors) if (ignoredKeys.has(errorIgnoreKey(e))) count++;
 for (const a of audit) if (ignoredKeys.has(auditIgnoreKey(a))) count++;
 for (const m of misclicks) if (ignoredKeys.has(misclickIgnoreKey(m))) count++;
 return count;
 }, [errors, audit, misclicks, ignoredKeys]);

 // ── Panel resize ──────────────────────────────────────────────────────
 const [panelSize, setPanelSize] = useState<PanelSize>(loadPanelSize);
 const resizingRef = useRef<{ axis: 'w' | 'h' | 'both'; startX: number; startY: number; startW: number; startH: number } | null>(null);

 const onResizeMouseDown = useCallback((axis: 'w' | 'h' | 'both') => (e: React.MouseEvent) => {
 e.preventDefault();
 e.stopPropagation();
 resizingRef.current = { axis, startX: e.clientX, startY: e.clientY, startW: panelSize.w, startH: panelSize.h };

 const onMove = (ev: MouseEvent) => {
 const r = resizingRef.current;
 if (!r) return;
 let w = r.startW;
 let h = r.startH;
 // Panel is anchored bottom-right, so dragging left = wider, dragging up = taller
 if (r.axis === 'w' || r.axis === 'both') {
 w = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, r.startW + (r.startX - ev.clientX)));
 }
 if (r.axis === 'h' || r.axis === 'both') {
 h = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, r.startH + (r.startY - ev.clientY)));
 }
 setPanelSize({ w, h });
 };

 const onUp = () => {
 document.removeEventListener('mousemove', onMove);
 document.removeEventListener('mouseup', onUp);
 resizingRef.current = null;
 setPanelSize((s) => { savePanelSize(s); return s; });
 };

 document.addEventListener('mousemove', onMove);
 document.addEventListener('mouseup', onUp);
 }, [panelSize]);

 const tabContentHeight = panelSize.h - 120; // header (~56) + tabs (~40) + padding

 const isAuthPage = location.pathname === "/auth";

 // Poll all monitors every 2 seconds
 useEffect(() => {
 function poll() {
 setErrors(errorMonitor.getErrors());
 setNetwork(errorMonitor.getNetworkLog());
 setNavigation(errorMonitor.getNavigationLog());
 setMisclicks(errorMonitor.getMisclickLog());
 setAudit(errorMonitor.getAuditLog());
 setPerf(errorMonitor.getPerformanceMetrics());
 setNetStats(errorMonitor.getNetworkStats());
 }
 poll();
 const interval = setInterval(poll, 2000);
 return () => clearInterval(interval);
 }, []);

 // Animate count badge on change
 useEffect(() => {
 if (errors.length !== prevErrorCountRef.current) {
 prevErrorCountRef.current = errors.length;
 if (errors.length > 0) {
 setCountBounce(true);
 const timer = setTimeout(() => setCountBounce(false), 300);
 return () => clearTimeout(timer);
 }
 }
 }, [errors.length]);

 // Sound alert for new critical errors
 useEffect(() => {
 const criticals = errors.filter((e) => e.severity === "critical").length;
 if (soundEnabled && criticals > prevCriticalCount && prevCriticalCount >= 0) {
 playBeep();
 }
 setPrevCriticalCount(criticals);
 }, [errors, soundEnabled, prevCriticalCount]);

 const errorTimestamps = useMemo(
 () => errors.map((e) => new Date(e.timestamp).getTime()),
 [errors]
 );

 // Request rate: requests in last 5 seconds
 const requestRate = useMemo(() => {
 const now = Date.now();
 const recent = network.filter(
 (n) => now - new Date(n.timestamp).getTime() < 5000
 );
 return recent.length;
 }, [network]);

 const tooltipText = useMemo(() => {
 return `${errors.length} errors, ${netStats.total} requests, ${netStats.slow} slow`;
 }, [errors.length, netStats.total, netStats.slow]);

 const handleClearAll = useCallback(() => {
 errorMonitor.clearAll();
 setErrors([]);
 setNetwork([]);
 setNavigation([]);
 setMisclicks([]);
 setAudit([]);
 setExpandedId(null);
 }, []);

 const handleCopyReport = useCallback(() => {
 const report = buildFullReport(errors, network, navigation, perf, misclicks, audit);
 navigator.clipboard.writeText(report).then(() => {
 setCopiedReport(true);
 setTimeout(() => setCopiedReport(false), 2000);
 });
 }, [errors, network, navigation, perf, misclicks, audit]);

 const handleCopyGitHubIssue = useCallback(() => {
 const issue = buildGitHubIssue(errors, network, perf);
 navigator.clipboard.writeText(issue).then(() => {
 setCopiedIssue(true);
 setTimeout(() => setCopiedIssue(false), 2000);
 });
 }, [errors, network, perf]);

 const toggleExpanded = useCallback((id: string) => {
 setExpandedId((prev) => (prev === id ? null : id));
 }, []);

 // If disabled or on auth page, render nothing (AFTER all hooks to satisfy Rules of Hooks)
 if (!enabled || isAuthPage) return null;

 const errorCount = visibleErrors.length;
 const isMonitoring = errorMonitor.isActive();
 const hasErrors = errorCount > 0;

 return (
 <div data-qa-agent className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
 {/* Expanded panel */}
 <AnimatePresence>
 {open && (
 <motion.div
 initial={{ opacity: 0, y: 20, scale: 0.95 }}
 animate={{ opacity: 1, y: 0, scale: 1 }}
 exit={{ opacity: 0, y: 20, scale: 0.95 }}
 transition={{ duration: 0.2, ease: "easeOut" }}
 >
 <Card
 className="bg-card/95 backdrop-blur-xl border-primary/30 shadow-2xl shadow-black/50 flex flex-col overflow-hidden relative"
 style={{ width: panelSize.w, height: panelSize.h }}
 >
 {/* Resize handles */}
 {/* Left edge — resize width */}
 <div
 onMouseDown={onResizeMouseDown('w')}
 className="absolute left-0 top-0 bottom-0 w-1.5 cursor-ew-resize hover:bg-primary/20 transition-colors z-10"
 />
 {/* Top edge — resize height */}
 <div
 onMouseDown={onResizeMouseDown('h')}
 className="absolute top-0 left-0 right-0 h-1.5 cursor-ns-resize hover:bg-primary/20 transition-colors z-10"
 />
 {/* Top-left corner — resize both */}
 <div
 onMouseDown={onResizeMouseDown('both')}
 className="absolute top-0 left-0 w-4 h-4 cursor-nwse-resize z-20 flex items-center justify-center group"
 >
 <UilDraggabledots size={10} className="text-zinc-700 group-hover:text-primary/60 rotate-45" />
 </div>

 {/* Header */}
 <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
 <div className="flex items-center gap-2">
 <UilBug size={16} className="text-primary" />
 <span className="text-sm font-semibold text-zinc-200">
 QA Agent v2
 </span>
 <ActivitySparkline timestamps={errorTimestamps} />
 </div>
 <div className="flex items-center gap-1">
 {/* Sound toggle */}
 <Button
 variant="ghost"
 size="icon"
 className="h-6 w-6 text-zinc-500 hover:text-zinc-300"
 onClick={() => setSoundEnabled((p) => !p)}
 title={soundEnabled ? "Mute alerts" : "Enable sound alerts"}
 >
 {soundEnabled ? (
 <UilVolumeUp size={12} />
 ) : (
 <UilVolumeMute size={12} />
 )}
 </Button>

 {/* UilCopy Report */}
 <Button
 variant="ghost"
 size="icon"
 className="h-6 w-6 text-zinc-500 hover:text-zinc-300"
 onClick={handleCopyReport}
 title="UilCopy full report"
 >
 {copiedReport ? (
 <UilCheckCircle size={12} className="text-emerald-500" />
 ) : (
 <UilCopy size={12} />
 )}
 </Button>

 {/* UilCopy GitHub Issue */}
 <Button
 variant="ghost"
 size="icon"
 className="h-6 w-6 text-zinc-500 hover:text-zinc-300"
 onClick={handleCopyGitHubIssue}
 title="UilCopy as GitHub issue"
 >
 {copiedIssue ? (
 <UilCheckCircle size={12} className="text-emerald-500" />
 ) : (
 <UilWindow size={12} />
 )}
 </Button>

 {/* Show/hide ignored */}
 {ignoredCount > 0 && (
 <Button
 variant="ghost"
 size="icon"
 className={`h-6 w-6 ${showIgnored ? "text-primary" : "text-zinc-500"} hover:text-zinc-300`}
 onClick={() => setShowIgnored((p) => !p)}
 title={showIgnored ? `Hide ${ignoredCount} ignored` : `Show ${ignoredCount} ignored`}
 >
 {showIgnored ? <UilEye size={12} /> : <UilEyeSlash size={12} />}
 </Button>
 )}

 {/* Clear ignored list */}
 {ignoredCount > 0 && showIgnored && (
 <Button
 variant="ghost"
 size="icon"
 className="h-6 w-6 text-zinc-500 hover:text-orange-500"
 onClick={handleClearIgnored}
 title="Clear all ignored items"
 >
 <UilSync size={12} />
 </Button>
 )}

 {/* Clear all */}
 <Button
 variant="ghost"
 size="icon"
 className="h-6 w-6 text-zinc-500 hover:text-zinc-300"
 onClick={handleClearAll}
 title="Clear all data"
 >
 <UilTrashAlt size={12} />
 </Button>

 {/* Close */}
 <Button
 variant="ghost"
 size="icon"
 className="text-zinc-500 hover:text-zinc-300"
 onClick={() => setOpen(false)}
 >
 <UilTimes size={14} />
 </Button>
 </div>
 </div>

 {/* 4-tab layout */}
 <Tabs defaultValue="errors" className="flex-1 flex flex-col min-h-0">
 <TabsList className="w-full rounded-none bg-transparent border-b border-white/5 h-9 gap-0">
 <TabsTrigger
 value="errors"
 className="flex-1 text-[11px] gap-1.5 data-[state=active]:bg-white/[0.08]"
 >
 <UilBug size={12} />
 Errors
 {errorCount > 0 && (
 <Badge
 variant="destructive"
 className="text-[9px] px-1 py-0 h-3.5 ml-0.5"
 >
 {errorCount}
 </Badge>
 )}
 </TabsTrigger>
 <TabsTrigger
 value="network"
 className="flex-1 text-[11px] gap-1.5 data-[state=active]:bg-white/[0.08]"
 >
 <UilGlobe size={12} />
 Network
 </TabsTrigger>
 <TabsTrigger
 value="pages"
 className="flex-1 text-[11px] gap-1.5 data-[state=active]:bg-white/[0.08]"
 >
 <UilMap size={12} />
 Pages
 </TabsTrigger>
 <TabsTrigger
 value="clicks"
 className="flex-1 text-[11px] gap-1.5 data-[state=active]:bg-white/[0.08]"
 >
 <UilMouse size={12} />
 Clicks
 {visibleMisclicks.length > 0 && (
 <Badge className="text-[9px] px-1 py-0 h-3.5 ml-0.5 bg-orange-600 text-white">
 {visibleMisclicks.length}
 </Badge>
 )}
 </TabsTrigger>
 <TabsTrigger
 value="audit"
 className="flex-1 text-[11px] gap-1.5 data-[state=active]:bg-white/[0.08]"
 >
 <UilQrcodeScan size={12} />
 Audit
 {visibleAudit.length > 0 && (
 <Badge className="text-[9px] px-1 py-0 h-3.5 ml-0.5 bg-purple-600 text-white">
 {visibleAudit.length}
 </Badge>
 )}
 </TabsTrigger>
 <TabsTrigger
 value="perf"
 className="flex-1 text-[11px] gap-1.5 data-[state=active]:bg-white/[0.08]"
 >
 <UilHeartRate size={12} />
 Perf
 </TabsTrigger>
 </TabsList>

 {/* Errors Tab */}
 <TabsContent value="errors" className="flex-1 min-h-0 mt-0" style={{ height: tabContentHeight }}>
 <ErrorsTab
 errors={visibleErrors}
 expandedId={expandedId}
 onToggleExpanded={toggleExpanded}
 ignoredKeys={ignoredKeys}
 onIgnore={handleIgnore}
 onUnignore={handleUnignore}
 />
 </TabsContent>

 {/* Network Tab */}
 <TabsContent value="network" className="flex-1 min-h-0 mt-0" style={{ height: tabContentHeight }}>
 <NetworkTab network={network} stats={netStats} />
 </TabsContent>

 {/* Pages Tab */}
 <TabsContent value="pages" className="flex-1 min-h-0 mt-0" style={{ height: tabContentHeight }}>
 <PagesTab navigation={navigation} errors={errors} />
 </TabsContent>

 {/* Clicks Tab */}
 <TabsContent value="clicks" className="flex-1 min-h-0 mt-0" style={{ height: tabContentHeight }}>
 <ClicksTab
 misclicks={visibleMisclicks}
 ignoredKeys={ignoredKeys}
 onIgnore={handleIgnore}
 onUnignore={handleUnignore}
 />
 </TabsContent>

 {/* Audit Tab */}
 <TabsContent value="audit" className="flex-1 min-h-0 mt-0" style={{ height: tabContentHeight }}>
 <AuditTab
 audit={visibleAudit}
 onReaudit={() => errorMonitor.reauditCurrentPage()}
 ignoredKeys={ignoredKeys}
 onIgnore={handleIgnore}
 onUnignore={handleUnignore}
 />
 </TabsContent>

 {/* Perf Tab */}
 <TabsContent value="perf" className="flex-1 min-h-0 mt-0" style={{ height: tabContentHeight }}>
 <PerfTab perf={perf} network={network} />
 </TabsContent>
 </Tabs>
 </Card>
 </motion.div>
 )}
 </AnimatePresence>

 {/* Floating badge button */}
 <div className="relative group/qa">
 <button
 type="button"
 onClick={() => setOpen((prev) => !prev)}
 className="h-12 w-12 relative rounded-full bg-zinc-900 border border-white/10 hover:border-primary/40 shadow-lg shadow-black/40 flex items-center justify-center transition-colors group"
 title={tooltipText}
 >
 {open ? (
 <UilAngleUp size={20} className="text-zinc-400 group-hover:text-primary transition-colors" />
 ) : (
 <UilBug size={20} className="text-zinc-400 group-hover:text-primary transition-colors" />
 )}

 {/* Status dot */}
 <span className={`h-2.5 w-2.5 absolute top-0.5 right-0.5 rounded-full border-2 border-zinc-900 ${
 hasErrors
 ? "bg-red-500 animate-pulse"
 : isMonitoring
 ? "bg-emerald-500"
 : "bg-zinc-600"
 }`}
 />

 {/* Breathing animation when closed and monitoring */}
 {!open && isMonitoring && !hasErrors && (
 <motion.span
 className="absolute inset-0 rounded-full border border-transparent"
 animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0, 0.5] }}
 transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
 />
 )}

 {/* Error count badge (red) */}
 <AnimatePresence>
 {hasErrors && !open && (
 <motion.span
 key="error-count"
 initial={{ scale: 0 }}
 animate={{ scale: countBounce ? 1.3 : 1 }}
 exit={{ scale: 0 }}
 transition={{ type: "spring", stiffness: 500, damping: 25 }}
 className="absolute -top-1 -left-1 h-5 min-w-[20px] px-1 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center"
 >
 {errorCount > 99 ? "99+" : errorCount}
 </motion.span>
 )}
 </AnimatePresence>

 {/* Request rate badge (blue) */}
 <AnimatePresence>
 {requestRate > 0 && !open && (
 <motion.span
 key="req-rate"
 initial={{ scale: 0 }}
 animate={{ scale: 1 }}
 exit={{ scale: 0 }}
 transition={{ type: "spring", stiffness: 500, damping: 25 }}
 className="absolute -bottom-1 -left-1 h-4 min-w-[16px] px-1 rounded-full bg-blue-600 text-white text-[9px] font-bold flex items-center justify-center"
 >
 {requestRate}
 </motion.span>
 )}
 </AnimatePresence>
 </button>

 {/* Hide button — sits on the border, top-left of the bubble */}
 <button
 type="button"
 onClick={(e) => {
 e.stopPropagation();
 setEnabled(false);
 setOpen(false);
 localStorage.setItem('ai_debugger_enabled', 'false');
 window.dispatchEvent(new CustomEvent('crowbyte:debugger-toggle', { detail: { aiDebugger: false } }));
 }}
 className="absolute -top-1.5 -left-1.5 h-5 w-5 rounded-full bg-zinc-800 border border-white/10 hover:border-red-500/60 hover:bg-red-500/20 flex items-center justify-center transition-all opacity-0 group-hover/qa:opacity-100 z-10"
 title="Hide QA Agent"
 >
 <UilEyeSlash size={10} className="text-zinc-500 group-hover/qa:text-zinc-400" />
 </button>
 </div>
 </div>
 );
}
