/**
 * Remote Support Session Service
 *
 * TeamViewer-style remote debug for CrowByte. Uses Supabase Realtime
 * as the transport layer. User must explicitly accept + can close anytime.
 *
 * Architecture:
 *   User side:  streams logs, errors, DOM state, console, performance metrics
 *   Support side: subscribes to channel, renders live dashboard view
 *   Transport:  Supabase Realtime (broadcast + presence)
 *   AI Agent:   analyzes stream for bugs, suggests fixes
 *
 * Channel: `support:{session_id}`
 * Events:
 *   user→support:  "state" (dashboard snapshot), "log", "error", "console", "perf"
 *   support→user:  "command" (request specific data), "highlight" (point at element)
 */

import { supabase } from "@/integrations/supabase/client";
import { errorMonitor } from "@/services/error-monitor";
import type { RealtimeChannel } from "@supabase/supabase-js";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface SupportSession {
  id: string;
  userId: string;
  userEmail: string;
  supportAgentId: string | null;
  status: "pending" | "active" | "closed";
  createdAt: string;
  closedAt: string | null;
  metadata: Record<string, unknown>;
}

export interface SessionFrame {
  type: "state" | "log" | "error" | "console" | "perf" | "route" | "action";
  timestamp: number;
  data: unknown;
}

export interface SupportCommand {
  type: "request_state" | "request_logs" | "request_console" | "highlight" | "message";
  payload?: unknown;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const TABLE = "support_sessions";
const FRAME_INTERVAL_MS = 2000; // Send state snapshot every 2s
const MAX_LOG_BUFFER = 100;

// ─── User Side — Stream data to support agent ───────────────────────────────

let _channel: RealtimeChannel | null = null;
let _frameInterval: ReturnType<typeof setInterval> | null = null;
let _logBuffer: SessionFrame[] = [];
let _sessionId: string | null = null;
let _onCommand: ((cmd: SupportCommand) => void) | null = null;

/**
 * Create a support session (user-initiated or support-requested).
 * Returns the session ID for sharing.
 */
export async function createSupportSession(): Promise<string | null> {
  const { data: { session: _s } } = await supabase.auth.getSession();
    const user = _s?.user ?? null;
  if (!user) return null;

  const { data, error } = await supabase
    .from(TABLE as 'support_sessions')
    .insert({
      user_id: user.id,
      user_email: user.email,
      status: "pending",
      metadata: {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        screen: `${screen.width}x${screen.height}`,
        route: window.location.hash,
        appVersion: "2.0.0",
      },
    })
    .select("id")
    .single();

  if (error) {
    console.error("[support] Failed to create session:", error.message);
    return null;
  }

  return (data as { id: string }).id;
}

/**
 * Start streaming data to the support channel.
 * Called after user accepts the connection.
 */
export function startStreaming(
  sessionId: string,
  onCommand?: (cmd: SupportCommand) => void,
): void {
  if (_channel) stopStreaming();

  _sessionId = sessionId;
  _onCommand = onCommand || null;

  // Join the realtime channel
  _channel = supabase.channel(`support:${sessionId}`, {
    config: { broadcast: { self: false } },
  });

  // Listen for commands from support agent
  _channel.on("broadcast", { event: "command" }, ({ payload }) => {
    if (_onCommand && payload) {
      _onCommand(payload as SupportCommand);
    }
  });

  _channel.subscribe((status) => {
    if (status === "SUBSCRIBED") {
      console.log("[support] Streaming started on channel:", sessionId);
      // Send initial state
      collectState().then((state) => {
        sendFrame({ type: "state", timestamp: Date.now(), data: state });
      });
    }
  });

  // Periodic state snapshots
  _frameInterval = setInterval(async () => {
    const state = await collectState();
    sendFrame({ type: "state", timestamp: Date.now(), data: state });
    flushLogs();
    // Persist snapshot to DB so AI can read it
    if (_sessionId) {
      supabase
        .from(TABLE as 'support_sessions')
        .update({ last_snapshot: state as Record<string, unknown> })
        .eq("id", _sessionId)
        .then(() => {});
    }
    // Capture screenshot if running in Electron
    const api = (window as Window & { electronAPI?: { invoke?: (ch: string) => Promise<string | null> } }).electronAPI;
    if (api?.invoke) {
      const dataUrl: string | null = await api.invoke('support:screenshot').catch(() => null);
      if (dataUrl) {
        sendFrame({ type: "action", timestamp: Date.now(), data: { screenshot: dataUrl } });
      }
    }
  }, FRAME_INTERVAL_MS);

  // Hook into error monitor
  hookErrorMonitor();

  // Update session status to active
  supabase
    .from(TABLE as 'support_sessions')
    .update({ status: "active" })
    .eq("id", sessionId)
    .then(() => {});
}

/**
 * Stop streaming and close the session.
 */
export async function stopStreaming(): Promise<void> {
  if (_frameInterval) {
    clearInterval(_frameInterval);
    _frameInterval = null;
  }

  if (_channel) {
    supabase.removeChannel(_channel);
    _channel = null;
  }

  if (_sessionId) {
    await supabase
      .from(TABLE as 'support_sessions')
      .update({ status: "closed", closed_at: new Date().toISOString() })
      .eq("id", _sessionId);
    _sessionId = null;
  }

  _logBuffer = [];
  _onCommand = null;
  unhookErrorMonitor();
}

/**
 * Push a single frame to the channel.
 */
function sendFrame(frame: SessionFrame): void {
  if (!_channel) return;
  _channel.send({
    type: "broadcast",
    event: "frame",
    payload: frame,
  });
}

/**
 * Buffer a log entry and flush periodically.
 */
export function pushLog(level: string, message: string, data?: unknown): void {
  if (!_sessionId) return;
  _logBuffer.push({
    type: "log",
    timestamp: Date.now(),
    data: { level, message, detail: data },
  });
  if (_logBuffer.length > MAX_LOG_BUFFER) _logBuffer.shift();
}

function flushLogs(): void {
  if (!_channel || _logBuffer.length === 0) return;
  _channel.send({
    type: "broadcast",
    event: "logs",
    payload: _logBuffer.splice(0),
  });
}

// ─── State Collection ───────────────────────────────────────────────────────

async function collectState(): Promise<Record<string, unknown>> {
  const errors = errorMonitor.getErrors();
  const network = errorMonitor.getNetworkLog();
  const perf = errorMonitor.getPerformanceMetrics();
  const nav = errorMonitor.getNavigationLog();

  return {
    route: window.location.hash?.replace("#", "") || "/",
    timestamp: Date.now(),
    errors: errors.slice(-20),
    networkLog: network.slice(-20),
    performance: perf,
    navigation: nav.slice(-10),
    localStorage: collectLocalStorage(),
    session: await collectSessionInfo(),
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio,
    },
  };
}

function collectLocalStorage(): Record<string, string> {
  const safe: Record<string, string> = {};
  const allowedKeys = [
    "crowbyte_license_ticket",
    "crowbyte_onboard",
    "crowbyte_prefs_wizard_done",
    "sidebar_open",
    "theme",
  ];
  for (const key of allowedKeys) {
    const val = localStorage.getItem(key);
    if (val) safe[key] = val.length > 200 ? val.slice(0, 200) + "..." : val;
  }
  return safe;
}

async function collectSessionInfo(): Promise<Record<string, unknown>> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { authenticated: false };
    return {
      authenticated: true,
      userId: session.user.id,
      email: session.user.email,
      provider: session.user.app_metadata?.provider,
      expiresAt: session.expires_at,
    };
  } catch {
    return { authenticated: false, error: "Failed to get session" };
  }
}

// ─── Error Monitor Hook ─────────────────────────────────────────────────────

let _origConsoleError: typeof console.error | null = null;
let _origConsoleWarn: typeof console.warn | null = null;

function hookErrorMonitor(): void {
  // Intercept console.error and console.warn
  _origConsoleError = console.error;
  _origConsoleWarn = console.warn;

  console.error = (...args: unknown[]) => {
    pushLog("error", args.map(String).join(" "));
    _origConsoleError?.apply(console, args);
  };

  console.warn = (...args: unknown[]) => {
    pushLog("warn", args.map(String).join(" "));
    _origConsoleWarn?.apply(console, args);
  };

  // Global error handler
  window.addEventListener("error", _onGlobalError);
  window.addEventListener("unhandledrejection", _onUnhandledRejection);
}

function unhookErrorMonitor(): void {
  if (_origConsoleError) console.error = _origConsoleError;
  if (_origConsoleWarn) console.warn = _origConsoleWarn;
  _origConsoleError = null;
  _origConsoleWarn = null;
  window.removeEventListener("error", _onGlobalError);
  window.removeEventListener("unhandledrejection", _onUnhandledRejection);
}

function _persistError(entry: object): void {
  if (!_sessionId) return;
  // Append to error_log array in DB (keep last 50)
  supabase.rpc('append_support_error', { session_id: _sessionId, entry }).then(() => {});
}

function _onGlobalError(e: ErrorEvent): void {
  const frame = {
    type: "error",
    timestamp: Date.now(),
    data: { message: e.message, filename: e.filename, line: e.lineno, col: e.colno },
  };
  sendFrame(frame);
  _persistError(frame.data);
}

function _onUnhandledRejection(e: PromiseRejectionEvent): void {
  const frame = {
    type: "error",
    timestamp: Date.now(),
    data: { message: String(e.reason), type: "unhandled_rejection" },
  };
  sendFrame(frame);
  _persistError(frame.data);
}

// ─── Support Side — Subscribe to user's stream ──────────────────────────────

export interface SupportSubscription {
  channel: RealtimeChannel;
  unsubscribe: () => void;
}

/**
 * Connect to a user's support session as the support agent.
 */
export function connectToSession(
  sessionId: string,
  callbacks: {
    onFrame: (frame: SessionFrame) => void;
    onLogs: (logs: SessionFrame[]) => void;
    onDisconnect?: () => void;
  },
): SupportSubscription {
  const channel = supabase.channel(`support:${sessionId}`, {
    config: { broadcast: { self: false } },
  });

  channel.on("broadcast", { event: "frame" }, ({ payload }) => {
    if (payload) callbacks.onFrame(payload as SessionFrame);
  });

  channel.on("broadcast", { event: "logs" }, ({ payload }) => {
    if (payload) callbacks.onLogs(payload as SessionFrame[]);
  });

  channel.subscribe((status) => {
    if (status === "SUBSCRIBED") {
      console.log("[support-agent] Connected to session:", sessionId);
      // Mark ourselves as support agent
      supabase
        .from(TABLE as 'support_sessions')
        .update({ support_agent_id: "admin" })
        .eq("id", sessionId)
        .then(() => {});
    }
    if (status === "CLOSED" || status === "CHANNEL_ERROR") {
      callbacks.onDisconnect?.();
    }
  });

  return {
    channel,
    unsubscribe: () => {
      supabase.removeChannel(channel);
    },
  };
}

/**
 * Send a command to the user's app from support side.
 */
export function sendCommand(
  channel: RealtimeChannel,
  cmd: SupportCommand,
): void {
  channel.send({
    type: "broadcast",
    event: "command",
    payload: cmd,
  });
}

// ─── Session Management ─────────────────────────────────────────────────────

/**
 * Get all pending/active support sessions (for support dashboard).
 */
export async function getActiveSessions(): Promise<SupportSession[]> {
  const { data, error } = await supabase
    .from(TABLE as 'support_sessions')
    .select("*")
    .in("status", ["pending", "active"])
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[support] Failed to fetch sessions:", error.message);
    return [];
  }
  return (data || []).map((s: Record<string, unknown>) => ({
    id: s.id as string,
    userId: s.user_id as string,
    userEmail: s.user_email as string,
    supportAgentId: s.support_agent_id as string | null,
    status: s.status as SupportSession['status'],
    createdAt: s.created_at as string,
    closedAt: s.closed_at as string | null,
    metadata: (s.metadata as Record<string, unknown>) || {},
  }));
}

/**
 * Get session history (for support dashboard).
 */
export async function getSessionHistory(limit = 50): Promise<SupportSession[]> {
  const { data, error } = await supabase
    .from(TABLE as 'support_sessions')
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return [];
  return (data || []).map((s: Record<string, unknown>) => ({
    id: s.id as string,
    userId: s.user_id as string,
    userEmail: s.user_email as string,
    supportAgentId: s.support_agent_id as string | null,
    status: s.status as SupportSession['status'],
    createdAt: s.created_at as string,
    closedAt: s.closed_at as string | null,
    metadata: (s.metadata as Record<string, unknown>) || {},
  }));
}

/**
 * Check if this user has a pending support request (shown in their UI).
 */
export async function getMyPendingSession(): Promise<SupportSession | null> {
  const { data: { session: _s } } = await supabase.auth.getSession();
    const user = _s?.user ?? null;
  if (!user) return null;

  const { data, error } = await supabase
    .from(TABLE as 'support_sessions')
    .select("*")
    .eq("user_id", user.id)
    .in("status", ["pending", "active"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  const s = data as Record<string, unknown>;
  return {
    id: s.id as string,
    userId: s.user_id as string,
    userEmail: s.user_email as string,
    supportAgentId: s.support_agent_id as string | null,
    status: s.status as SupportSession['status'],
    createdAt: s.created_at as string,
    closedAt: s.closed_at as string | null,
    metadata: (s.metadata as Record<string, unknown>) || {},
  };
}

// ─── AI Debug Analysis ──────────────────────────────────────────────────────

export interface DebugAnalysis {
  issues: Array<{
    severity: "critical" | "high" | "medium" | "low";
    category: string;
    message: string;
    suggestion: string;
    evidence?: string;
  }>;
  summary: string;
  score: number; // 0-100 health score
}

/**
 * Analyze collected state for bugs/issues (runs locally, no AI API needed).
 */
export function analyzeState(state: Record<string, unknown>): DebugAnalysis {
  const issues: DebugAnalysis["issues"] = [];
  const errors = (state.errors as Record<string, unknown>[]) || [];
  const network = (state.networkLog as Record<string, unknown>[]) || [];
  const perf = (state.performance as Record<string, unknown>) || {};

  // Check for JS errors
  for (const err of errors) {
    issues.push({
      severity: err.type === "error" ? "high" : "medium",
      category: "JavaScript Error",
      message: err.message || "Unknown error",
      suggestion: `Check ${err.source || "unknown source"} at line ${err.line || "?"}`,
      evidence: `${err.page || "?"} — ${err.timestamp ? new Date(err.timestamp).toLocaleTimeString() : "?"}`,
    });
  }

  // Check for failed network requests
  const failedRequests = network.filter((n) => (n.status as number) >= 400 || n.status === 0);
  for (const req of failedRequests) {
    issues.push({
      severity: req.status === 0 ? "critical" : req.status >= 500 ? "high" : "medium",
      category: "Network Error",
      message: `${req.method} ${req.url} → ${req.status || "FAILED"}`,
      suggestion: req.status === 0
        ? "Request blocked or network offline — check CORS, CSP, or connectivity"
        : req.status >= 500
        ? "Server error — check backend logs"
        : "Client error — verify request params",
      evidence: `Duration: ${req.duration || "?"}ms`,
    });
  }

  // Check performance
  if (perf.domContentLoaded > 3000) {
    issues.push({
      severity: "medium",
      category: "Performance",
      message: `Slow DOM load: ${perf.domContentLoaded}ms`,
      suggestion: "Consider code splitting or lazy loading heavy components",
    });
  }

  if (perf.memoryUsage && perf.memoryUsage > 200 * 1024 * 1024) {
    issues.push({
      severity: "high",
      category: "Memory",
      message: `High memory usage: ${Math.round(perf.memoryUsage / 1024 / 1024)}MB`,
      suggestion: "Check for memory leaks — large state objects, uncleared intervals, event listener buildup",
    });
  }

  // Check auth state
  const session = state.session as Record<string, unknown> | undefined;
  if (session && !session.authenticated) {
    issues.push({
      severity: "low",
      category: "Auth",
      message: "User is not authenticated",
      suggestion: "Verify Supabase session persistence and token refresh",
    });
  }

  // Health score
  const critCount = issues.filter((i) => i.severity === "critical").length;
  const highCount = issues.filter((i) => i.severity === "high").length;
  const medCount = issues.filter((i) => i.severity === "medium").length;
  const score = Math.max(0, 100 - critCount * 30 - highCount * 15 - medCount * 5);

  return {
    issues,
    summary: issues.length === 0
      ? "No issues detected — system healthy"
      : `Found ${issues.length} issue(s): ${critCount} critical, ${highCount} high, ${medCount} medium`,
    score,
  };
}
