/**
 * Support Dashboard — Admin-only remote debug console.
 *
 * Connects to user support sessions via Supabase Realtime.
 * Views live state, logs, errors, performance.
 * AI agent analyzes issues and suggests fixes.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Headset,
  Eye,
  Terminal,
  AlertTriangle,
  Activity,
  Wifi,
  WifiOff,
  Clock,
  User,
  Monitor,
  Cpu,
  HardDrive,
  RefreshCw,
  Send,
  Bot,
  Shield,
  X,
  ChevronDown,
  ChevronRight,
  Circle,
  Zap,
} from "lucide-react";
import {
  getActiveSessions,
  getSessionHistory,
  connectToSession,
  sendCommand,
  analyzeState,
  type SupportSession,
  type SessionFrame,
  type SupportSubscription,
  type DebugAnalysis,
} from "@/services/support-session";

// ─── Types ──────────────────────────────────────────────────────────────────

interface LiveSession {
  session: SupportSession;
  subscription: SupportSubscription | null;
  frames: SessionFrame[];
  logs: SessionFrame[];
  latestState: Record<string, unknown> | null;
  analysis: DebugAnalysis | null;
  connected: boolean;
}

// ─── Session Card ───────────────────────────────────────────────────────────

function SessionCard({
  session,
  isActive,
  onConnect,
}: {
  session: SupportSession;
  isActive: boolean;
  onConnect: () => void;
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const meta = session.metadata as any;
  const timeAgo = getTimeAgo(session.createdAt);

  return (
    <div className={`p-4 rounded-xl border transition-all ${
      isActive
        ? "border-blue-500/30 bg-blue-500/[0.04]"
        : session.status === "active"
        ? "border-green-500/20 bg-green-500/[0.02] hover:bg-green-500/[0.04]"
        : session.status === "pending"
        ? "border-amber-500/20 bg-amber-500/[0.02] hover:bg-amber-500/[0.04]"
        : "border-white/[0.06] bg-white/[0.02]"
    }`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${
            session.status === "active" ? "bg-green-500" :
            session.status === "pending" ? "bg-amber-500 animate-pulse" :
            "bg-zinc-600"
          }`} />
          <span className="text-sm font-medium text-white">{session.userEmail}</span>
        </div>
        <span className="text-[10px] text-zinc-600 font-mono">{timeAgo}</span>
      </div>

      <div className="flex items-center gap-3 text-[11px] text-zinc-500 mb-3">
        <span className="flex items-center gap-1">
          <Monitor size={10} /> {meta?.platform || "Unknown"}
        </span>
        <span className="flex items-center gap-1">
          <Eye size={10} /> {meta?.screen || "?"}
        </span>
        <span className="flex items-center gap-1">
          <Terminal size={10} /> {meta?.route || "/"}
        </span>
      </div>

      {!isActive && session.status !== "closed" && (
        <button
          onClick={onConnect}
          className="w-full h-8 rounded-lg bg-blue-600/80 hover:bg-blue-500 text-xs text-white font-medium transition-all flex items-center justify-center gap-1.5"
        >
          <Wifi size={12} /> Connect
        </button>
      )}

      {isActive && (
        <div className="flex items-center gap-1.5 text-[11px] text-green-400">
          <Circle size={8} fill="currentColor" /> Connected — streaming live
        </div>
      )}
    </div>
  );
}

// ─── Log Viewer ─────────────────────────────────────────────────────────────

function LogViewer({ logs }: { logs: SessionFrame[] }) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs.length]);

  if (logs.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-xs text-zinc-600">
        No logs yet — waiting for data...
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto font-mono text-[11px] space-y-0.5 p-2">
      {logs.map((log, i) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const d = log.data as any;
        const level = d?.level || log.type;
        const color = level === "error" ? "text-red-400" :
                      level === "warn" ? "text-amber-400" :
                      level === "info" ? "text-blue-400" : "text-zinc-400";
        const time = new Date(log.timestamp).toLocaleTimeString();

        return (
          <div key={i} className="flex gap-2 leading-tight">
            <span className="text-zinc-600 flex-shrink-0">{time}</span>
            <span className={`${color} flex-shrink-0 w-12`}>[{level}]</span>
            <span className="text-zinc-300 break-all">{d?.message || JSON.stringify(d)}</span>
          </div>
        );
      })}
      <div ref={endRef} />
    </div>
  );
}

// ─── State Inspector ────────────────────────────────────────────────────────

function StateInspector({ state }: { state: Record<string, unknown> | null }) {
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set(["errors", "performance"]));

  if (!state) {
    return (
      <div className="flex items-center justify-center h-full text-xs text-zinc-600">
        No state snapshot yet...
      </div>
    );
  }

  const toggle = (key: string) => {
    const next = new Set(expandedKeys);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setExpandedKeys(next);
  };

  return (
    <div className="h-full overflow-y-auto p-2 font-mono text-[11px] space-y-1">
      {Object.entries(state).map(([key, value]) => {
        const isObj = typeof value === "object" && value !== null;
        const expanded = expandedKeys.has(key);

        return (
          <div key={key}>
            <button
              onClick={() => isObj && toggle(key)}
              className="flex items-center gap-1 w-full text-left hover:bg-white/[0.04] rounded px-1 py-0.5"
            >
              {isObj ? (
                expanded ? <ChevronDown size={10} className="text-zinc-600" /> : <ChevronRight size={10} className="text-zinc-600" />
              ) : (
                <span className="w-2.5" />
              )}
              <span className="text-blue-400">{key}</span>
              <span className="text-zinc-600">:</span>
              {!isObj && (
                <span className="text-zinc-300 ml-1 truncate">
                  {typeof value === "string" ? `"${value}"` : String(value)}
                </span>
              )}
              {isObj && !expanded && (
                <span className="text-zinc-600 ml-1">
                  {Array.isArray(value) ? `[${(value as unknown[]).length}]` : `{${Object.keys(value as Record<string, unknown>).length}}`}
                </span>
              )}
            </button>
            {isObj && expanded && (
              <div className="ml-4 border-l border-white/[0.04] pl-2">
                <pre className="text-zinc-400 whitespace-pre-wrap break-all">
                  {JSON.stringify(value, null, 2)}
                </pre>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── AI Analysis Panel ──────────────────────────────────────────────────────

function AnalysisPanel({ analysis }: { analysis: DebugAnalysis | null }) {
  if (!analysis) {
    return (
      <div className="flex items-center justify-center h-full text-xs text-zinc-600">
        <Bot size={16} className="mr-2" /> Run analysis to diagnose issues
      </div>
    );
  }

  const scoreColor = analysis.score >= 80 ? "text-green-400" :
                     analysis.score >= 50 ? "text-amber-400" : "text-red-400";
  const scoreBg = analysis.score >= 80 ? "bg-green-500/10 border-green-500/20" :
                  analysis.score >= 50 ? "bg-amber-500/10 border-amber-500/20" :
                  "bg-red-500/10 border-red-500/20";

  return (
    <div className="h-full overflow-y-auto p-3 space-y-3">
      {/* Health score */}
      <div className={`flex items-center justify-between p-3 rounded-lg border ${scoreBg}`}>
        <div>
          <div className="text-xs text-zinc-400">Health Score</div>
          <div className={`text-2xl font-bold font-mono ${scoreColor}`}>{analysis.score}</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-zinc-500">{analysis.summary}</div>
        </div>
      </div>

      {/* Issues */}
      {analysis.issues.length === 0 ? (
        <div className="text-xs text-green-400 text-center py-4">
          No issues detected
        </div>
      ) : (
        <div className="space-y-2">
          {analysis.issues.map((issue, i) => {
            const sevColor = issue.severity === "critical" ? "border-red-500/30 bg-red-500/[0.04]" :
                            issue.severity === "high" ? "border-orange-500/30 bg-orange-500/[0.04]" :
                            issue.severity === "medium" ? "border-amber-500/30 bg-amber-500/[0.04]" :
                            "border-zinc-500/30 bg-zinc-500/[0.04]";
            const sevBadge = issue.severity === "critical" ? "bg-red-500/20 text-red-300" :
                            issue.severity === "high" ? "bg-orange-500/20 text-orange-300" :
                            issue.severity === "medium" ? "bg-amber-500/20 text-amber-300" :
                            "bg-zinc-500/20 text-zinc-300";

            return (
              <div key={i} className={`p-3 rounded-lg border ${sevColor}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${sevBadge}`}>
                    {issue.severity.toUpperCase()}
                  </span>
                  <span className="text-[10px] text-zinc-500">{issue.category}</span>
                </div>
                <div className="text-xs text-white mb-1">{issue.message}</div>
                <div className="text-[11px] text-zinc-400">
                  <Zap size={10} className="inline mr-1 text-blue-400" />
                  {issue.suggestion}
                </div>
                {issue.evidence && (
                  <div className="text-[10px] text-zinc-600 mt-1 font-mono">{issue.evidence}</div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main Support Page ──────────────────────────────────────────────────────

export default function Support() {
  const [sessions, setSessions] = useState<SupportSession[]>([]);
  const [history, setHistory] = useState<SupportSession[]>([]);
  const [activeSession, setActiveSession] = useState<LiveSession | null>(null);
  const [tab, setTab] = useState<"logs" | "state" | "analysis">("logs");
  const [loading, setLoading] = useState(true);
  const [commandInput, setCommandInput] = useState("");

  // Load sessions
  useEffect(() => {
    const load = async () => {
      const [active, hist] = await Promise.all([
        getActiveSessions(),
        getSessionHistory(),
      ]);
      setSessions(active);
      setHistory(hist);
      setLoading(false);
    };
    load();
    const interval = setInterval(load, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, []);

  const handleConnect = useCallback((session: SupportSession) => {
    // Disconnect existing
    if (activeSession?.subscription) {
      activeSession.subscription.unsubscribe();
    }

    const live: LiveSession = {
      session,
      subscription: null,
      frames: [],
      logs: [],
      latestState: null,
      analysis: null,
      connected: false,
    };

    const sub = connectToSession(session.id, {
      onFrame: (frame) => {
        setActiveSession((prev) => {
          if (!prev) return prev;
          const updated = { ...prev };
          updated.frames = [...updated.frames.slice(-100), frame];
          if (frame.type === "state") {
            updated.latestState = frame.data as Record<string, unknown>;
          }
          if (frame.type === "error") {
            updated.logs = [...updated.logs.slice(-200), frame];
          }
          updated.connected = true;
          return updated;
        });
      },
      onLogs: (logs) => {
        setActiveSession((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            logs: [...prev.logs.slice(-200), ...logs],
          };
        });
      },
      onDisconnect: () => {
        setActiveSession((prev) => prev ? { ...prev, connected: false } : prev);
      },
    });

    live.subscription = sub;
    live.connected = true;
    setActiveSession(live);
  }, [activeSession]);

  const handleDisconnect = () => {
    if (activeSession?.subscription) {
      activeSession.subscription.unsubscribe();
    }
    setActiveSession(null);
  };

  const handleRunAnalysis = () => {
    if (!activeSession?.latestState) return;
    const analysis = analyzeState(activeSession.latestState);
    setActiveSession((prev) => prev ? { ...prev, analysis } : prev);
  };

  const handleSendCommand = () => {
    if (!commandInput.trim() || !activeSession?.subscription) return;
    sendCommand(activeSession.subscription.channel, {
      type: "message",
      payload: commandInput,
    });
    setCommandInput("");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Headset size={20} className="text-blue-400" />
            Support Console
          </h1>
          <p className="text-xs text-zinc-500 mt-1">Remote debug — connect to user sessions</p>
        </div>
        <button
          onClick={() => {
            setLoading(true);
            Promise.all([getActiveSessions(), getSessionHistory()]).then(([a, h]) => {
              setSessions(a);
              setHistory(h);
              setLoading(false);
            });
          }}
          className="h-8 px-3 rounded-lg bg-white/[0.04] border border-white/[0.06] text-xs text-zinc-400 hover:text-white transition-all flex items-center gap-1.5"
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-12 gap-4 h-[calc(100vh-200px)]">
        {/* Left sidebar — session list */}
        <div className="col-span-3 space-y-3 overflow-y-auto">
          <div className="text-xs text-zinc-500 font-medium uppercase tracking-wider px-1">
            Active Sessions ({sessions.length})
          </div>

          {sessions.length === 0 ? (
            <div className="text-xs text-zinc-600 text-center py-8">
              No active support sessions
            </div>
          ) : (
            sessions.map((s) => (
              <SessionCard
                key={s.id}
                session={s}
                isActive={activeSession?.session.id === s.id}
                onConnect={() => handleConnect(s)}
              />
            ))
          )}

          {/* History */}
          <div className="text-xs text-zinc-500 font-medium uppercase tracking-wider px-1 mt-6">
            Recent ({history.filter(h => h.status === "closed").length})
          </div>
          {history
            .filter((h) => h.status === "closed")
            .slice(0, 5)
            .map((s) => (
              <div key={s.id} className="p-3 rounded-lg border border-white/[0.04] bg-white/[0.01]">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-500">{s.userEmail}</span>
                  <span className="text-[10px] text-zinc-600">{getTimeAgo(s.createdAt)}</span>
                </div>
              </div>
            ))}
        </div>

        {/* Main panel — live view */}
        <div className="col-span-9 flex flex-col">
          {!activeSession ? (
            <div className="flex-1 flex items-center justify-center border border-white/[0.04] rounded-xl bg-white/[0.01]">
              <div className="text-center space-y-3">
                <Headset size={32} className="text-zinc-700 mx-auto" />
                <p className="text-sm text-zinc-500">Select a session to connect</p>
                <p className="text-xs text-zinc-600">
                  Users must accept the support connection before you can view their dashboard
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Session header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className={`w-2.5 h-2.5 rounded-full ${
                      activeSession.connected ? "bg-green-500" : "bg-red-500"
                    }`} />
                    {activeSession.connected && (
                      <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-green-500 animate-ping opacity-50" />
                    )}
                  </div>
                  <div>
                    <span className="text-sm text-white font-medium">
                      {activeSession.session.userEmail}
                    </span>
                    <span className="text-[10px] text-zinc-600 ml-2 font-mono">
                      #{activeSession.session.id.slice(0, 8)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleRunAnalysis}
                    className="h-7 px-3 rounded-lg bg-violet-500/10 border border-violet-500/20 text-xs text-violet-400 hover:bg-violet-500/20 transition-all flex items-center gap-1.5"
                  >
                    <Bot size={12} /> AI Diagnose
                  </button>
                  <button
                    onClick={handleDisconnect}
                    className="h-7 px-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400 hover:bg-red-500/20 transition-all flex items-center gap-1.5"
                  >
                    <WifiOff size={12} /> Disconnect
                  </button>
                </div>
              </div>

              {/* Quick stats bar */}
              {activeSession.latestState && (
                <div className="flex items-center gap-4 mb-3 px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                  <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                    <Eye size={11} />
                    <span className="text-zinc-300">{(activeSession.latestState.route as string) || "/"}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                    <AlertTriangle size={11} />
                    <span className="text-zinc-300">{((activeSession.latestState.errors as unknown[]) || []).length} errors</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                    <Activity size={11} />
                    <span className="text-zinc-300">{activeSession.frames.length} frames</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                    <Terminal size={11} />
                    <span className="text-zinc-300">{activeSession.logs.length} logs</span>
                  </div>
                </div>
              )}

              {/* Tab bar */}
              <div className="flex gap-1 mb-2">
                {[
                  { id: "logs" as const, label: "Logs", icon: Terminal },
                  { id: "state" as const, label: "State", icon: Eye },
                  { id: "analysis" as const, label: "AI Analysis", icon: Bot },
                ].map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setTab(id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                      tab === id
                        ? "bg-white/[0.08] text-white border border-white/[0.08]"
                        : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    <Icon size={12} /> {label}
                  </button>
                ))}
              </div>

              {/* Content */}
              <div className="flex-1 border border-white/[0.06] rounded-xl bg-black/30 overflow-hidden">
                {tab === "logs" && <LogViewer logs={activeSession.logs} />}
                {tab === "state" && <StateInspector state={activeSession.latestState} />}
                {tab === "analysis" && <AnalysisPanel analysis={activeSession.analysis} />}
              </div>

              {/* Command input */}
              <div className="flex gap-2 mt-2">
                <input
                  value={commandInput}
                  onChange={(e) => setCommandInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendCommand()}
                  placeholder="Send message to user..."
                  className="flex-1 h-8 px-3 rounded-lg bg-white/[0.04] border border-white/[0.06] text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/50 font-mono"
                />
                <button
                  onClick={handleSendCommand}
                  disabled={!commandInput.trim()}
                  className="h-8 px-3 rounded-lg bg-blue-600/80 hover:bg-blue-500 disabled:opacity-30 text-xs text-white transition-all flex items-center gap-1.5"
                >
                  <Send size={12} /> Send
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
