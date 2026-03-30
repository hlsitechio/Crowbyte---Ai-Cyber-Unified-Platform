/**
 * Support Dashboard — Admin support console with ticket management,
 * remote debug, and push notifications.
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
  Ticket,
  Bell,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Timer,
  ArrowUpRight,
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
import { supportAgent } from "@/services/support-agent";
import { useToast } from "@/hooks/use-toast";

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

interface TicketRow {
  id: string;
  subject: string;
  priority: string;
  status: string;
  user_email: string;
  user_id: string;
  admin_notes: string | null;
  assigned_to: string | null;
  conversation: any;
  diagnostics: any;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, { className: string; label: string }> = {
  open: { className: "bg-amber-500/20 text-amber-300 border-amber-500/30", label: "Open" },
  in_progress: { className: "bg-blue-500/20 text-blue-300 border-blue-500/30", label: "In Progress" },
  resolved: { className: "bg-green-500/20 text-green-300 border-green-500/30", label: "Resolved" },
  closed: { className: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30", label: "Closed" },
};

const PRIORITY_BADGE: Record<string, { className: string; label: string }> = {
  critical: { className: "bg-red-500/20 text-red-300", label: "CRIT" },
  high: { className: "bg-orange-500/20 text-orange-300", label: "HIGH" },
  medium: { className: "bg-amber-500/20 text-amber-300", label: "MED" },
  low: { className: "bg-zinc-500/20 text-zinc-400", label: "LOW" },
};

// ─── Ticket Card ────────────────────────────────────────────────────────────

function TicketCard({
  ticket,
  isSelected,
  onSelect,
}: {
  ticket: TicketRow;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const status = STATUS_BADGE[ticket.status] || STATUS_BADGE.open;
  const priority = PRIORITY_BADGE[ticket.priority] || PRIORITY_BADGE.medium;
  const convo = Array.isArray(ticket.conversation) ? ticket.conversation : [];

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left p-3 rounded-xl border transition-all ${
        isSelected
          ? "border-blue-500/30 bg-blue-500/[0.06]"
          : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]"
      }`}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${status.className}`}>
          {status.label}
        </span>
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${priority.className}`}>
          {priority.label}
        </span>
      </div>
      <div className="text-sm text-white font-medium truncate mb-1">{ticket.subject}</div>
      <div className="flex items-center gap-2 text-[11px] text-zinc-500">
        <span className="flex items-center gap-1"><User size={10} /> {ticket.user_email}</span>
        <span className="flex items-center gap-1"><MessageSquare size={10} /> {convo.length}</span>
      </div>
      <div className="text-[10px] text-zinc-600 mt-1">{getTimeAgo(ticket.created_at)}</div>
    </button>
  );
}

// ─── Ticket Detail ──────────────────────────────────────────────────────────

function TicketDetail({
  ticket,
  onStatusChange,
  onPushNotification,
}: {
  ticket: TicketRow;
  onStatusChange: (status: string, notes?: string) => void;
  onPushNotification: (title: string, message: string) => void;
}) {
  const [notes, setNotes] = useState(ticket.admin_notes || "");
  const [notifTitle, setNotifTitle] = useState("");
  const [notifMessage, setNotifMessage] = useState("");
  const [showNotifForm, setShowNotifForm] = useState(false);
  const convo = Array.isArray(ticket.conversation) ? ticket.conversation : [];
  const diag = ticket.diagnostics;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-white/[0.06]">
        <h2 className="text-lg font-bold text-white mb-1">{ticket.subject}</h2>
        <div className="flex items-center gap-3 text-xs text-zinc-500">
          <span className="flex items-center gap-1"><User size={11} /> {ticket.user_email}</span>
          <span className="flex items-center gap-1"><Clock size={11} /> {new Date(ticket.created_at).toLocaleString()}</span>
          {ticket.assigned_to && (
            <span className="flex items-center gap-1"><ArrowUpRight size={11} /> {ticket.assigned_to}</span>
          )}
        </div>
      </div>

      {/* Actions bar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-white/[0.06] bg-white/[0.01]">
        {ticket.status !== "in_progress" && ticket.status !== "resolved" && (
          <button
            onClick={() => onStatusChange("in_progress")}
            className="h-7 px-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-blue-400 hover:bg-blue-500/20 transition-all flex items-center gap-1"
          >
            <Timer size={11} /> Start Working
          </button>
        )}
        {ticket.status !== "resolved" && (
          <button
            onClick={() => onStatusChange("resolved", notes)}
            className="h-7 px-3 rounded-lg bg-green-500/10 border border-green-500/20 text-xs text-green-400 hover:bg-green-500/20 transition-all flex items-center gap-1"
          >
            <CheckCircle2 size={11} /> Resolve
          </button>
        )}
        {ticket.status !== "closed" && (
          <button
            onClick={() => onStatusChange("closed", notes)}
            className="h-7 px-3 rounded-lg bg-zinc-500/10 border border-zinc-500/20 text-xs text-zinc-400 hover:bg-zinc-500/20 transition-all flex items-center gap-1"
          >
            <XCircle size={11} /> Close
          </button>
        )}
        <button
          onClick={() => setShowNotifForm(!showNotifForm)}
          className="h-7 px-3 rounded-lg bg-orange-500/10 border border-orange-500/20 text-xs text-orange-400 hover:bg-orange-500/20 transition-all flex items-center gap-1 ml-auto"
        >
          <Bell size={11} /> Push Notification
        </button>
      </div>

      {/* Push notification form */}
      <AnimatePresence>
        {showNotifForm && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-4 py-3 border-b border-white/[0.06] bg-orange-500/[0.02] overflow-hidden"
          >
            <div className="space-y-2">
              <input
                value={notifTitle}
                onChange={(e) => setNotifTitle(e.target.value)}
                placeholder="Notification title..."
                className="w-full h-8 px-3 rounded-lg bg-white/[0.04] border border-white/[0.06] text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500/50"
              />
              <div className="flex gap-2">
                <input
                  value={notifMessage}
                  onChange={(e) => setNotifMessage(e.target.value)}
                  placeholder="Message to user..."
                  className="flex-1 h-8 px-3 rounded-lg bg-white/[0.04] border border-white/[0.06] text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500/50"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && notifTitle && notifMessage) {
                      onPushNotification(notifTitle, notifMessage);
                      setNotifTitle("");
                      setNotifMessage("");
                      setShowNotifForm(false);
                    }
                  }}
                />
                <button
                  onClick={() => {
                    if (notifTitle && notifMessage) {
                      onPushNotification(notifTitle, notifMessage);
                      setNotifTitle("");
                      setNotifMessage("");
                      setShowNotifForm(false);
                    }
                  }}
                  disabled={!notifTitle || !notifMessage}
                  className="h-8 px-3 rounded-lg bg-orange-500/80 hover:bg-orange-500 disabled:opacity-30 text-xs text-white transition-all"
                >
                  Send
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Conversation */}
        <div>
          <div className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-2">Conversation</div>
          <div className="space-y-2">
            {convo.length === 0 ? (
              <div className="text-xs text-zinc-600 text-center py-4">No messages</div>
            ) : (
              convo.map((msg: any, i: number) => (
                <div
                  key={i}
                  className={`p-3 rounded-lg text-xs ${
                    msg.role === "user"
                      ? "bg-blue-500/[0.06] border border-blue-500/10 ml-8"
                      : msg.role === "agent"
                      ? "bg-white/[0.03] border border-white/[0.06] mr-8"
                      : "bg-amber-500/[0.04] border border-amber-500/10"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] text-zinc-500 font-medium uppercase">{msg.role}</span>
                    {msg.timestamp && (
                      <span className="text-[10px] text-zinc-600">
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                  <div className="text-zinc-300 whitespace-pre-wrap">{msg.content}</div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Diagnostics */}
        {diag && (
          <div>
            <div className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-2">Diagnostics</div>
            <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
              {diag.summary && <div className="text-xs text-zinc-300 mb-2">{diag.summary}</div>}
              {diag.score != null && (
                <div className={`text-sm font-mono font-bold mb-2 ${
                  diag.score >= 80 ? "text-green-400" : diag.score >= 50 ? "text-amber-400" : "text-red-400"
                }`}>
                  Health Score: {diag.score}/100
                </div>
              )}
              {Array.isArray(diag.checks) && diag.checks.map((c: any, i: number) => (
                <div key={i} className="flex items-center gap-2 text-[11px] py-0.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    c.status === "ok" ? "bg-green-500" : c.status === "warning" ? "bg-amber-500" : "bg-red-500"
                  }`} />
                  <span className="text-zinc-400">{c.name}</span>
                  <span className="text-zinc-500">—</span>
                  <span className="text-zinc-300">{c.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Admin notes */}
        <div>
          <div className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-2">Admin Notes</div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Internal notes..."
            className="w-full h-24 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/50 resize-none font-mono"
          />
        </div>
      </div>
    </div>
  );
}

// ─── Session Card (Remote Debug) ────────────────────────────────────────────

function SessionCard({
  session,
  isActive,
  onConnect,
}: {
  session: SupportSession;
  isActive: boolean;
  onConnect: () => void;
}) {
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
                  {Array.isArray(value) ? `[${(value as any[]).length}]` : `{${Object.keys(value).length}}`}
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
      <div className={`flex items-center justify-between p-3 rounded-lg border ${scoreBg}`}>
        <div>
          <div className="text-xs text-zinc-400">Health Score</div>
          <div className={`text-2xl font-bold font-mono ${scoreColor}`}>{analysis.score}</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-zinc-500">{analysis.summary}</div>
        </div>
      </div>

      {analysis.issues.length === 0 ? (
        <div className="text-xs text-green-400 text-center py-4">No issues detected</div>
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
  const { toast } = useToast();
  const [mainTab, setMainTab] = useState<"tickets" | "remote">("tickets");

  // ── Tickets state ──
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<TicketRow | null>(null);
  const [ticketFilter, setTicketFilter] = useState<"all" | "open" | "in_progress" | "resolved" | "closed">("all");

  // ── Remote debug state ──
  const [sessions, setSessions] = useState<SupportSession[]>([]);
  const [history, setHistory] = useState<SupportSession[]>([]);
  const [activeSession, setActiveSession] = useState<LiveSession | null>(null);
  const [debugTab, setDebugTab] = useState<"logs" | "state" | "analysis">("logs");
  const [loading, setLoading] = useState(true);
  const [commandInput, setCommandInput] = useState("");

  // Load tickets
  useEffect(() => {
    const loadTickets = async () => {
      try {
        const data = await supportAgent.getAllTickets();
        setTickets(data);
      } catch { /* silent */ }
    };
    loadTickets();
    const interval = setInterval(loadTickets, 15000);
    return () => clearInterval(interval);
  }, []);

  // Load remote sessions
  useEffect(() => {
    const load = async () => {
      try {
        const [active, hist] = await Promise.all([getActiveSessions(), getSessionHistory()]);
        setSessions(active);
        setHistory(hist);
      } catch { /* silent */ }
      setLoading(false);
    };
    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleStatusChange = async (status: string, notes?: string) => {
    if (!selectedTicket) return;
    try {
      await supportAgent.updateTicketStatus(selectedTicket.id, status, notes);
      // Notify user
      await supportAgent.pushNotification(selectedTicket.user_id, {
        type: status === "resolved" ? "info" : "update",
        title: `Ticket ${status === "resolved" ? "Resolved" : "Updated"}`,
        message: `Your ticket "${selectedTicket.subject}" has been ${status.replace("_", " ")}.`,
        actionUrl: "/ai-agent",
      });
      // Refresh
      const data = await supportAgent.getAllTickets();
      setTickets(data);
      const updated = data.find((t: any) => t.id === selectedTicket.id);
      if (updated) setSelectedTicket(updated);
      toast({ title: `Ticket ${status.replace("_", " ")}`, description: "User notified." });
    } catch (err) {
      toast({ title: "Error", description: "Failed to update ticket", variant: "destructive" });
    }
  };

  const handlePushNotification = async (title: string, message: string) => {
    if (!selectedTicket) return;
    try {
      await supportAgent.pushNotification(selectedTicket.user_id, {
        type: "info",
        title,
        message,
        actionUrl: "/ai-agent",
      });
      toast({ title: "Notification sent", description: `Pushed to ${selectedTicket.user_email}` });
    } catch {
      toast({ title: "Error", description: "Failed to send notification", variant: "destructive" });
    }
  };

  const handleConnect = useCallback((session: SupportSession) => {
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
          return { ...prev, logs: [...prev.logs.slice(-200), ...logs] };
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

  const filteredTickets = ticketFilter === "all"
    ? tickets
    : tickets.filter((t) => t.status === ticketFilter);

  const ticketStats = {
    open: tickets.filter((t) => t.status === "open").length,
    inProgress: tickets.filter((t) => t.status === "in_progress").length,
    resolved: tickets.filter((t) => t.status === "resolved").length,
    total: tickets.length,
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Headset size={20} className="text-blue-400" />
            Support Console
          </h1>
          <p className="text-xs text-zinc-500 mt-1">Ticket management, remote debug, push notifications</p>
        </div>

        {/* Main tab toggle */}
        <div className="flex gap-1 bg-white/[0.04] rounded-lg p-0.5">
          {[
            { id: "tickets" as const, label: "Tickets", icon: Ticket, count: ticketStats.open },
            { id: "remote" as const, label: "Remote Debug", icon: Monitor, count: sessions.length },
          ].map(({ id, label, icon: Icon, count }) => (
            <button
              key={id}
              onClick={() => setMainTab(id)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
                mainTab === id
                  ? "bg-white/[0.08] text-white"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <Icon size={13} /> {label}
              {count > 0 && (
                <span className="ml-1 min-w-[16px] h-4 px-1 rounded-full bg-blue-500/20 text-blue-300 text-[10px] flex items-center justify-center font-bold">
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── TICKETS TAB ── */}
      {mainTab === "tickets" && (
        <>
          {/* Stats bar */}
          <div className="flex gap-3">
            {[
              { label: "Open", count: ticketStats.open, color: "text-amber-400", filter: "open" as const },
              { label: "In Progress", count: ticketStats.inProgress, color: "text-blue-400", filter: "in_progress" as const },
              { label: "Resolved", count: ticketStats.resolved, color: "text-green-400", filter: "resolved" as const },
              { label: "Total", count: ticketStats.total, color: "text-zinc-300", filter: "all" as const },
            ].map(({ label, count, color, filter }) => (
              <button
                key={filter}
                onClick={() => setTicketFilter(filter)}
                className={`flex-1 p-3 rounded-xl border transition-all ${
                  ticketFilter === filter
                    ? "border-blue-500/30 bg-blue-500/[0.04]"
                    : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]"
                }`}
              >
                <div className={`text-xl font-bold font-mono ${color}`}>{count}</div>
                <div className="text-[10px] text-zinc-500 uppercase tracking-wider">{label}</div>
              </button>
            ))}
          </div>

          {/* Ticket list + detail */}
          <div className="grid grid-cols-12 gap-4 h-[calc(100vh-280px)]">
            {/* Left — ticket list */}
            <div className="col-span-4 space-y-2 overflow-y-auto">
              {filteredTickets.length === 0 ? (
                <div className="flex items-center justify-center h-40 text-xs text-zinc-600">
                  No {ticketFilter === "all" ? "" : ticketFilter.replace("_", " ")} tickets
                </div>
              ) : (
                filteredTickets.map((t) => (
                  <TicketCard
                    key={t.id}
                    ticket={t}
                    isSelected={selectedTicket?.id === t.id}
                    onSelect={() => setSelectedTicket(t)}
                  />
                ))
              )}
            </div>

            {/* Right — detail */}
            <div className="col-span-8 border border-white/[0.06] rounded-xl bg-white/[0.01] overflow-hidden">
              {selectedTicket ? (
                <TicketDetail
                  ticket={selectedTicket}
                  onStatusChange={handleStatusChange}
                  onPushNotification={handlePushNotification}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-center space-y-3">
                  <div>
                    <Ticket size={32} className="text-zinc-700 mx-auto mb-3" />
                    <p className="text-sm text-zinc-500">Select a ticket to view details</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── REMOTE DEBUG TAB ── */}
      {mainTab === "remote" && (
        <div className="grid grid-cols-12 gap-4 h-[calc(100vh-200px)]">
          {/* Left sidebar — session list */}
          <div className="col-span-3 space-y-3 overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="text-xs text-zinc-500 font-medium uppercase tracking-wider px-1">
                Active ({sessions.length})
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
                className="text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
              </button>
            </div>

            {sessions.length === 0 ? (
              <div className="text-xs text-zinc-600 text-center py-8">No active sessions</div>
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

          {/* Main panel */}
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
                      <span className="text-sm text-white font-medium">{activeSession.session.userEmail}</span>
                      <span className="text-[10px] text-zinc-600 ml-2 font-mono">
                        #{activeSession.session.id.slice(0, 8)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        if (!activeSession?.latestState) return;
                        const analysis = analyzeState(activeSession.latestState);
                        setActiveSession((prev) => prev ? { ...prev, analysis } : prev);
                      }}
                      className="h-7 px-3 rounded-lg bg-violet-500/10 border border-violet-500/20 text-xs text-violet-400 hover:bg-violet-500/20 transition-all flex items-center gap-1.5"
                    >
                      <Bot size={12} /> AI Diagnose
                    </button>
                    <button
                      onClick={() => {
                        if (activeSession?.subscription) activeSession.subscription.unsubscribe();
                        setActiveSession(null);
                      }}
                      className="h-7 px-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400 hover:bg-red-500/20 transition-all flex items-center gap-1.5"
                    >
                      <WifiOff size={12} /> Disconnect
                    </button>
                  </div>
                </div>

                {/* Quick stats */}
                {activeSession.latestState && (
                  <div className="flex items-center gap-4 mb-3 px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                    <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                      <Eye size={11} />
                      <span className="text-zinc-300">{(activeSession.latestState.route as string) || "/"}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                      <AlertTriangle size={11} />
                      <span className="text-zinc-300">{((activeSession.latestState.errors as any[]) || []).length} errors</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                      <Activity size={11} />
                      <span className="text-zinc-300">{activeSession.frames.length} frames</span>
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
                      onClick={() => setDebugTab(id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                        debugTab === id
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
                  {debugTab === "logs" && <LogViewer logs={activeSession.logs} />}
                  {debugTab === "state" && <StateInspector state={activeSession.latestState} />}
                  {debugTab === "analysis" && <AnalysisPanel analysis={activeSession.analysis} />}
                </div>

                {/* Command input */}
                <div className="flex gap-2 mt-2">
                  <input
                    value={commandInput}
                    onChange={(e) => setCommandInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && commandInput.trim() && activeSession?.subscription) {
                        sendCommand(activeSession.subscription.channel, {
                          type: "message",
                          payload: commandInput,
                        });
                        setCommandInput("");
                      }
                    }}
                    placeholder="Send message to user..."
                    className="flex-1 h-8 px-3 rounded-lg bg-white/[0.04] border border-white/[0.06] text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/50 font-mono"
                  />
                  <button
                    onClick={() => {
                      if (commandInput.trim() && activeSession?.subscription) {
                        sendCommand(activeSession.subscription.channel, {
                          type: "message",
                          payload: commandInput,
                        });
                        setCommandInput("");
                      }
                    }}
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
      )}
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
