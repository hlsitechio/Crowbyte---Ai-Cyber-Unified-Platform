/**
 * CrowByte Support Agent — AI-powered support chat with diagnostics,
 * escalation, and real-time push notifications.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  supportAgent,
  type SupportMessage,
  type DiagnosticResult,
  type HealthCheck,
  type EscalationTicket,
  type UserNotification,
  type TicketPriority,
} from "@/services/support-agent";
import {
  Headset,
  Brain,
  Pulse,
  Bug,
  BookOpen,
  Bell,
  Wrench,
  CaretDown,
  CaretRight,
  PaperPlaneTilt,
  CircleNotch,
  X,
  CheckCircle,
  Warning,
  Info,
} from "@phosphor-icons/react";
import { motion, AnimatePresence } from "framer-motion";

// ── Constants ────────────────────────────────────────────────────────────────────

const STORAGE_KEY = "crowbyte_support_history";
const MAX_MESSAGES = 50;

const QUICK_ACTIONS = [
  { label: "System Status", icon: Pulse, action: "Run a full system diagnostic and show me the health status" },
  { label: "How do I...", icon: BookOpen, template: "How do I " },
  { label: "Report Bug", icon: Bug, template: "I found a bug: " },
  { label: "Talk to Human", icon: Headset, action: "I need to talk to a human" },
];

const CAPABILITIES = [
  { icon: Brain, text: "RAG-powered answers from CrowByte documentation" },
  { icon: Wrench, text: "Live system diagnostics and health checks" },
  { icon: Headset, text: "Escalation to human support with full context" },
  { icon: Bell, text: "Real-time notifications from your admin team" },
];

// ── Helpers ──────────────────────────────────────────────────────────────────────

function loadMessages(): SupportMessage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SupportMessage[];
    return parsed.map((m) => ({ ...m, timestamp: new Date(m.timestamp) }));
  } catch {
    return [];
  }
}

function saveMessages(msgs: SupportMessage[]) {
  const trimmed = msgs.slice(-MAX_MESSAGES);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
}

function makeMessage(
  role: SupportMessage["role"],
  content: string,
  extra?: Partial<SupportMessage>,
): SupportMessage {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    timestamp: new Date(),
    ...extra,
  };
}

function statusDot(status: HealthCheck["status"]) {
  if (status === "ok") return "bg-emerald-500";
  if (status === "warning") return "bg-amber-500";
  return "bg-red-500";
}

function statusIcon(status: HealthCheck["status"]) {
  if (status === "ok") return <CheckCircle size={14} weight="fill" className="text-emerald-500" />;
  if (status === "warning") return <Warning size={14} weight="fill" className="text-amber-500" />;
  return <X size={14} weight="bold" className="text-red-500" />;
}

function notifIcon(type: UserNotification["type"]) {
  if (type === "critical" || type === "alert") return <Warning size={14} weight="fill" className="text-red-400" />;
  if (type === "warning") return <Warning size={14} weight="fill" className="text-amber-400" />;
  if (type === "update") return <Info size={14} weight="fill" className="text-blue-400" />;
  return <Info size={14} weight="fill" className="text-zinc-400" />;
}

// ── DiagnosticCard ───────────────────────────────────────────────────────────────

function DiagnosticCard({ result }: { result: DiagnosticResult }) {
  const [open, setOpen] = useState(true);

  const scoreColor =
    result.score >= 80 ? "text-emerald-400" : result.score >= 50 ? "text-amber-400" : "text-red-400";
  const barColor =
    result.score >= 80 ? "bg-emerald-500" : result.score >= 50 ? "bg-amber-500" : "bg-red-500";

  return (
    <div className="mt-2 rounded-lg border border-zinc-800 bg-zinc-900/60 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full px-3 py-2 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
      >
        <span className="flex items-center gap-1.5 font-medium">
          <Pulse size={14} weight="bold" className="text-blue-400" />
          System Diagnostics
        </span>
        <span className="flex items-center gap-2">
          <span className={`font-mono font-semibold ${scoreColor}`}>{result.score}/100</span>
          {open ? <CaretDown size={12} /> : <CaretRight size={12} />}
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-2">
              {/* Health checks */}
              <div className="space-y-1">
                {result.checks.map((check) => (
                  <div key={check.name} className="flex items-center gap-2 text-xs">
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${statusDot(check.status)}`} />
                    <span className="text-zinc-300 font-medium w-28 flex-shrink-0">{check.name}</span>
                    <span className="text-zinc-500 truncate">{check.message}</span>
                  </div>
                ))}
              </div>

              {/* Score bar */}
              <div className="pt-1">
                <div className="w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${result.score}%` }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className={`h-full rounded-full ${barColor}`}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── EscalationDialog ─────────────────────────────────────────────────────────────

function EscalationDialog({
  onSubmit,
  onCancel,
  loading,
}: {
  onSubmit: (subject: string, priority: TicketPriority) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [subject, setSubject] = useState("");
  const [priority, setPriority] = useState<TicketPriority>("medium");

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      className="rounded-lg border border-zinc-800 bg-zinc-900/80 p-3 space-y-3"
    >
      <div className="flex items-center gap-2 text-sm text-zinc-200 font-medium">
        <Headset size={16} weight="duotone" className="text-blue-400" />
        Create Support Ticket
      </div>

      <Input
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        placeholder="Brief description of your issue..."
        className="bg-zinc-900 border-zinc-700 text-sm"
        autoFocus
      />

      <div className="flex items-center gap-3">
        <Select value={priority} onValueChange={(v) => setPriority(v as TicketPriority)}>
          <SelectTrigger className="w-32 h-8 text-xs bg-zinc-900 border-zinc-700">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex-1" />

        <button
          onClick={onCancel}
          className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={() => subject.trim() && onSubmit(subject.trim(), priority)}
          disabled={!subject.trim() || loading}
          className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-md disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
        >
          {loading ? <CircleNotch size={12} weight="bold" className="animate-spin" /> : null}
          Submit Ticket
        </button>
      </div>
    </motion.div>
  );
}

// ── NotificationBanner ───────────────────────────────────────────────────────────

function NotificationBanner({
  notification,
  onDismiss,
}: {
  notification: UserNotification;
  onDismiss: (id: string) => void;
}) {
  const borderColor =
    notification.type === "critical" || notification.type === "alert"
      ? "border-red-500/30"
      : notification.type === "warning"
        ? "border-amber-500/30"
        : "border-blue-500/30";

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className={`flex items-start gap-2 px-3 py-2 rounded-lg border ${borderColor} bg-zinc-900/60`}
    >
      {notifIcon(notification.type)}
      <div className="flex-1 min-w-0">
        <span className="text-xs font-medium text-zinc-200">{notification.title}</span>
        <p className="text-xs text-zinc-400 truncate">{notification.message}</p>
      </div>
      <button
        onClick={() => onDismiss(notification.id)}
        className="text-zinc-600 hover:text-zinc-300 transition-colors flex-shrink-0 mt-0.5"
      >
        <X size={12} weight="bold" />
      </button>
    </motion.div>
  );
}

// ── TicketBadge ──────────────────────────────────────────────────────────────────

function TicketBadge({ ticketId }: { ticketId: string }) {
  return (
    <Badge variant="outline" className="border-blue-500/40 text-blue-400 text-[10px] gap-1">
      <CheckCircle size={10} weight="fill" />
      Ticket #{ticketId.slice(0, 8)}
    </Badge>
  );
}

// ── Chat Message ─────────────────────────────────────────────────────────────────

function ChatMessage({ msg }: { msg: SupportMessage }) {
  // System messages — centered, muted
  if (msg.role === "system" || msg.role === "notification") {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex justify-center"
      >
        <div className="flex items-center gap-1.5 text-xs text-zinc-500 bg-zinc-900/40 px-3 py-1 rounded-full">
          {msg.notification ? notifIcon(msg.notification.type) : <Info size={12} weight="fill" />}
          {msg.content}
        </div>
      </motion.div>
    );
  }

  // User bubble — right aligned
  if (msg.role === "user") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-end"
      >
        <div className="max-w-[80%] bg-blue-600/15 border border-blue-500/20 rounded-xl px-4 py-2.5">
          <p className="text-sm text-zinc-200 whitespace-pre-wrap">{msg.content}</p>
          <span className="text-[10px] text-zinc-600 mt-1 block text-right">
            {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
      </motion.div>
    );
  }

  // Agent / diagnostic — left aligned with icon
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex justify-start"
    >
      <div className="max-w-[90%] space-y-0">
        <div className="flex items-start gap-2.5">
          <Headset size={18} weight="duotone" className="text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
              {msg.content}
            </div>

            {/* Diagnostic card */}
            {msg.diagnostics && <DiagnosticCard result={msg.diagnostics} />}

            {/* Ticket badge */}
            {msg.ticketId && (
              <div className="mt-2">
                <TicketBadge ticketId={msg.ticketId} />
              </div>
            )}

            <span className="text-[10px] text-zinc-700 mt-2 block">
              {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── Welcome State ────────────────────────────────────────────────────────────────

function WelcomeState({ onAction }: { onAction: (text: string, isTemplate: boolean) => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 space-y-6">
      <div className="text-center space-y-2">
        <Headset size={36} weight="duotone" className="text-blue-400 mx-auto" />
        <h2 className="text-lg font-semibold text-zinc-200">CrowByte Support</h2>
        <p className="text-sm text-zinc-500 max-w-sm">
          Get help with CrowByte features, diagnose issues, or talk to a human.
        </p>
      </div>

      {/* Capabilities */}
      <div className="space-y-2 max-w-sm w-full">
        {CAPABILITIES.map((cap, i) => (
          <div key={i} className="flex items-center gap-2.5 text-sm text-zinc-400">
            <cap.icon size={16} weight="bold" className="text-zinc-600 flex-shrink-0" />
            {cap.text}
          </div>
        ))}
      </div>

      {/* Quick actions grid */}
      <div className="grid grid-cols-2 gap-2 max-w-sm w-full pt-2">
        {QUICK_ACTIONS.map((qa) => (
          <button
            key={qa.label}
            onClick={() => onAction(qa.action || qa.template || "", !!qa.template)}
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-800/60 hover:border-zinc-700 transition-colors text-left"
          >
            <qa.icon size={16} weight="bold" className="text-blue-400 flex-shrink-0" />
            <span className="text-xs text-zinc-300">{qa.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Header ───────────────────────────────────────────────────────────────────────

function Header({
  notifCount,
  onRunDiagnostics,
  diagLoading,
}: {
  notifCount: number;
  onRunDiagnostics: () => void;
  diagLoading: boolean;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/60">
      <div className="flex items-center gap-2.5">
        <Headset size={22} weight="duotone" className="text-blue-400" />
        <div>
          <h1 className="text-base font-semibold text-zinc-200">CrowByte Support</h1>
          <p className="text-[11px] text-zinc-600">AI-powered help desk</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Online indicator */}
        <span className="flex items-center gap-1.5 text-xs text-emerald-500">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Online
        </span>

        {/* Notification bell */}
        <button className="relative p-1 text-zinc-500 hover:text-zinc-200 transition-colors">
          <Bell size={18} weight={notifCount > 0 ? "fill" : "regular"} />
          {notifCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
              {notifCount > 9 ? "9+" : notifCount}
            </span>
          )}
        </button>

        {/* Run Diagnostics */}
        <button
          onClick={onRunDiagnostics}
          disabled={diagLoading}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-zinc-400 hover:text-white border border-zinc-800 hover:border-zinc-600 rounded-md transition-colors disabled:opacity-40"
        >
          {diagLoading ? (
            <CircleNotch size={12} weight="bold" className="animate-spin" />
          ) : (
            <Pulse size={12} weight="bold" />
          )}
          Run Diagnostics
        </button>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────────

export default function AIAgent() {
  const { toast } = useToast();
  const [messages, setMessages] = useState<SupportMessage[]>(loadMessages);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [diagLoading, setDiagLoading] = useState(false);
  const [escalationOpen, setEscalationOpen] = useState(false);
  const [escalationLoading, setEscalationLoading] = useState(false);
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [bannerNotifs, setBannerNotifs] = useState<UserNotification[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Persist messages on change
  useEffect(() => {
    saveMessages(messages);
  }, [messages]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading, escalationOpen, bannerNotifs]);

  // Subscribe to push notifications
  useEffect(() => {
    // Load existing
    supportAgent.getNotifications().then(setNotifications).catch(() => {});

    const unsub = supportAgent.subscribeToNotifications((notif) => {
      setNotifications((prev) => [notif, ...prev]);
      setBannerNotifs((prev) => [notif, ...prev]);
      // Also inject as system message in chat
      setMessages((prev) => [
        ...prev,
        makeMessage("notification", `${notif.title}: ${notif.message}`, { notification: notif }),
      ]);
    });

    return unsub;
  }, []);

  // ── Actions ─────────────────────────────────────────────────────────────────

  const addMessage = useCallback((msg: SupportMessage) => {
    setMessages((prev) => [...prev, msg].slice(-MAX_MESSAGES));
  }, []);

  const sendMessage = useCallback(
    async (text?: string) => {
      const content = text || input.trim();
      if (!content || isLoading) return;

      const userMsg = makeMessage("user", content);
      const updated = [...messages, userMsg].slice(-MAX_MESSAGES);
      setMessages(updated);
      setInput("");
      setIsLoading(true);

      try {
        const reply = await supportAgent.chat(updated);
        addMessage(reply);

        // If agent suggests escalation and user confirms
        const intent = supportAgent.classifyIntent(content);
        if (intent === "escalation") {
          setEscalationOpen(true);
        }
      } catch (err) {
        addMessage(
          makeMessage("agent", `Error: ${(err instanceof Error ? err.message : null) || "Failed to get response"}. Try running diagnostics or escalating.`),
        );
        toast({ title: "Chat Error", description: err instanceof Error ? err.message : String(err), variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    },
    [input, isLoading, messages, addMessage, toast],
  );

  const runDiagnostics = useCallback(async () => {
    setDiagLoading(true);
    addMessage(makeMessage("agent", "Running system diagnostics..."));

    try {
      const result = await supportAgent.runDiagnostics();
      addMessage(
        makeMessage("agent", result.summary, { diagnostics: result }),
      );
    } catch (err) {
      addMessage(makeMessage("agent", `Diagnostics failed: ${err instanceof Error ? err.message : String(err)}`));
      toast({ title: "Diagnostic Error", description: err instanceof Error ? err.message : String(err), variant: "destructive" });
    } finally {
      setDiagLoading(false);
    }
  }, [addMessage, toast]);

  const handleEscalate = useCallback(
    async (subject: string, priority: TicketPriority) => {
      setEscalationLoading(true);
      try {
        const lastDiag = [...messages]
          .reverse()
          .find((m) => m.diagnostics)?.diagnostics;

        const ticket: EscalationTicket = {
          subject,
          priority,
          conversation: messages,
          diagnostics: lastDiag,
        };

        const ticketId = await supportAgent.escalate(ticket);
        setEscalationOpen(false);
        addMessage(
          makeMessage("agent", `Ticket created successfully. A human will review your case shortly.`, {
            ticketId,
          }),
        );
      } catch (err) {
        toast({ title: "Escalation Failed", description: err instanceof Error ? err.message : String(err), variant: "destructive" });
      } finally {
        setEscalationLoading(false);
      }
    },
    [messages, addMessage, toast],
  );

  const dismissBanner = useCallback(
    (id: string) => {
      setBannerNotifs((prev) => prev.filter((n) => n.id !== id));
      supportAgent.dismissNotification(id).catch(() => {});
    },
    [],
  );

  const handleQuickAction = useCallback(
    (text: string, isTemplate: boolean) => {
      if (isTemplate) {
        setInput(text);
        inputRef.current?.focus();
      } else {
        sendMessage(text);
      }
    },
    [sendMessage],
  );

  // ── Render ──────────────────────────────────────────────────────────────────

  const unreadNotifCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="flex flex-col h-screen">
      <Header
        notifCount={unreadNotifCount}
        onRunDiagnostics={runDiagnostics}
        diagLoading={diagLoading}
      />

      {/* Notification banners */}
      <AnimatePresence>
        {bannerNotifs.length > 0 && (
          <div className="px-4 pt-2 space-y-1.5">
            {bannerNotifs.slice(0, 3).map((n) => (
              <NotificationBanner key={n.id} notification={n} onDismiss={dismissBanner} />
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* Chat area */}
      <ScrollArea className="flex-1 px-4 py-3" ref={scrollRef}>
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.length === 0 ? (
            <WelcomeState onAction={handleQuickAction} />
          ) : (
            <AnimatePresence>
              {messages.map((msg) => (
                <ChatMessage key={msg.id} msg={msg} />
              ))}
            </AnimatePresence>
          )}

          {/* Loading indicator */}
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2.5"
            >
              <Headset size={18} weight="duotone" className="text-blue-400" />
              <div className="flex items-center gap-2 text-sm text-zinc-500">
                <CircleNotch size={14} weight="bold" className="animate-spin text-blue-400" />
                Thinking...
              </div>
            </motion.div>
          )}

          {/* Inline escalation dialog */}
          <AnimatePresence>
            {escalationOpen && (
              <EscalationDialog
                onSubmit={handleEscalate}
                onCancel={() => setEscalationOpen(false)}
                loading={escalationLoading}
              />
            )}
          </AnimatePresence>
        </div>
      </ScrollArea>

      {/* Bottom: quick actions + input */}
      <div className="border-t border-zinc-800/60 px-4 py-3">
        <div className="max-w-3xl mx-auto space-y-2.5">
          {/* Quick action chips */}
          <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none">
            {QUICK_ACTIONS.map((qa) => (
              <button
                key={qa.label}
                onClick={() => handleQuickAction(qa.action || qa.template || "", !!qa.template)}
                disabled={isLoading}
                className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-white disabled:opacity-40 transition-colors whitespace-nowrap flex-shrink-0"
              >
                <qa.icon size={13} weight="bold" />
                {qa.label}
              </button>
            ))}
          </div>

          {/* Input row */}
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Describe your issue or ask a question..."
              disabled={isLoading}
              className="flex-1 bg-zinc-900 border-zinc-800 focus-visible:ring-blue-500/30 text-sm"
            />
            <button
              onClick={() => sendMessage()}
              disabled={isLoading || !input.trim()}
              className="px-3 rounded-md bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center"
            >
              {isLoading ? (
                <CircleNotch size={16} weight="bold" className="animate-spin text-white" />
              ) : (
                <PaperPlaneTilt size={16} weight="bold" className="text-white" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
