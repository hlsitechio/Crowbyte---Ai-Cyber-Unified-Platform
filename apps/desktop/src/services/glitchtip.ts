/**
 * GlitchTip Error Monitoring — Zero Dependencies
 *
 * Lightweight error reporter using GlitchTip's Sentry-compatible store API.
 * No @sentry/* packages. Just fetch().
 *
 * DSN: configured via VITE_GLITCHTIP_DSN
 * API: configured via VITE_GLITCHTIP_API_TOKEN
 */

import { loggingService } from '@/services/logging';
import { IS_WEB, BUILD_TARGET } from '@/lib/platform';

// ─── Types ─────────────────────────────────────────────────────────────────

export interface GlitchTipIssue {
  id: string;
  title: string;
  culprit: string;
  level: string;
  status: string;
  count: number;
  firstSeen: string;
  lastSeen: string;
  platform: string;
  metadata: {
    type?: string;
    value?: string;
    filename?: string;
    function?: string;
  };
}

export interface GlitchTipEvent {
  id: string;
  eventID: string;
  title: string;
  message: string;
  dateCreated: string;
  platform: string;
  tags: Array<{ key: string; value: string }>;
  entries: Array<{
    type: string;
    data: Record<string, unknown>;
  }>;
}

type SeverityLevel = 'fatal' | 'error' | 'warning' | 'info' | 'debug';

// ─── DSN Parser ────────────────────────────────────────────────────────────

interface ParsedDSN {
  publicKey: string;
  host: string;
  projectId: string;
  storeUrl: string;
}

function parseDSN(dsn: string): ParsedDSN | null {
  try {
    // DSN format: https://<key>@<host>/<project_id>
    const url = new URL(dsn);
    const publicKey = url.username;
    const host = url.host;
    const projectId = url.pathname.replace('/', '');
    return {
      publicKey,
      host,
      projectId,
      storeUrl: `${url.protocol}//${host}/api/${projectId}/store/?sentry_key=${publicKey}&sentry_version=7`,
    };
  } catch {
    return null;
  }
}

// ─── Stack Trace Parser ────────────────────────────────────────────────────

interface StackFrame {
  filename: string;
  function: string;
  lineno: number;
  colno: number;
  in_app: boolean;
}

function parseStack(stack: string): StackFrame[] {
  const frames: StackFrame[] = [];
  const lines = stack.split('\n').slice(1); // Skip error message line

  for (const line of lines) {
    // Chrome/Edge: "    at functionName (file:line:col)"
    // Firefox: "functionName@file:line:col"
    const chromeMatch = line.match(/^\s*at\s+(?:(.+?)\s+\()?(.+?):(\d+):(\d+)\)?$/);
    const firefoxMatch = line.match(/^(.+?)@(.+?):(\d+):(\d+)$/);
    const match = chromeMatch || firefoxMatch;

    if (match) {
      frames.push({
        function: match[1] || '?',
        filename: match[2],
        lineno: parseInt(match[3], 10),
        colno: parseInt(match[4], 10),
        in_app: !match[2].includes('node_modules'),
      });
    }
  }

  return frames.reverse(); // Sentry expects oldest frame first
}

// ─── Configuration ─────────────────────────────────────────────────────────

const GLITCHTIP_DSN = import.meta.env.VITE_GLITCHTIP_DSN || '';
const GLITCHTIP_API_TOKEN = import.meta.env.VITE_GLITCHTIP_API_TOKEN || '';
const GLITCHTIP_API_BASE = 'https://app.glitchtip.com/api/0';
const GLITCHTIP_ORG = 'crowbyte';
const GLITCHTIP_PROJECT = 'crowbyte';

// Noisy errors to suppress
const NOISE_PATTERNS = ['ResizeObserver', 'extension', 'chrome-extension://'];

// ─── Service ───────────────────────────────────────────────────────────────

class GlitchTipService {
  private initialized = false;
  private dsn: ParsedDSN | null = null;
  private user: { id: string; email?: string } | null = null;
  private breadcrumbs: Array<{
    category: string;
    message: string;
    data?: Record<string, unknown>;
    timestamp: number;
  }> = [];

  initialize(): void {
    if (this.initialized || !GLITCHTIP_DSN) {
      if (!GLITCHTIP_DSN) {
        console.debug('[GlitchTip] No DSN configured — error monitoring disabled');
      }
      return;
    }

    this.dsn = parseDSN(GLITCHTIP_DSN);
    if (!this.dsn) {
      console.error('[GlitchTip] Invalid DSN');
      return;
    }

    // Global error handler
    window.addEventListener('error', (event) => {
      if (event.error) {
        this.captureError(event.error);
      } else {
        this.captureMessage(event.message || 'Unknown error', 'error');
      }
    });

    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      const error = event.reason instanceof Error
        ? event.reason
        : new Error(String(event.reason));
      this.captureError(error, { unhandled: true });
    });

    this.initialized = true;
    loggingService.addLog('success', 'system', 'GlitchTip error monitoring initialized');
  }

  captureError(error: Error, context?: Record<string, unknown>): void {
    if (!this.initialized || !this.dsn) return;

    // Filter noise
    const msg = error.message || '';
    if (NOISE_PATTERNS.some(p => msg.includes(p))) return;

    // Log locally too
    loggingService.addLog('error', 'system', 'Error captured by GlitchTip', msg);

    const frames = error.stack ? parseStack(error.stack) : [];

    const event = {
      event_id: crypto.randomUUID().replace(/-/g, ''),
      timestamp: new Date().toISOString(),
      platform: 'javascript',
      level: 'error' as SeverityLevel,
      environment: import.meta.env.MODE || 'production',
      release: `crowbyte@${import.meta.env.VITE_APP_VERSION || '0.0.0'}`,
      tags: {
        build_target: BUILD_TARGET,
        platform: IS_WEB ? 'web' : 'desktop',
      },
      user: this.user || undefined,
      breadcrumbs: this.breadcrumbs.slice(-20), // Last 20
      extra: context,
      exception: {
        values: [{
          type: error.name || 'Error',
          value: error.message,
          stacktrace: frames.length > 0 ? { frames } : undefined,
        }],
      },
    };

    this.sendEvent(event);
  }

  captureMessage(message: string, level: SeverityLevel = 'info'): void {
    if (!this.initialized || !this.dsn) return;

    const event = {
      event_id: crypto.randomUUID().replace(/-/g, ''),
      timestamp: new Date().toISOString(),
      platform: 'javascript',
      level,
      environment: import.meta.env.MODE || 'production',
      release: `crowbyte@${import.meta.env.VITE_APP_VERSION || '0.0.0'}`,
      tags: {
        build_target: BUILD_TARGET,
        platform: IS_WEB ? 'web' : 'desktop',
      },
      user: this.user || undefined,
      message: { formatted: message },
    };

    this.sendEvent(event);
  }

  setUser(user: { id: string; email?: string }): void {
    this.user = user;
  }

  clearUser(): void {
    this.user = null;
  }

  addBreadcrumb(category: string, message: string, data?: Record<string, unknown>): void {
    this.breadcrumbs.push({
      category,
      message,
      data,
      timestamp: Date.now() / 1000,
    });
    // Keep last 50
    if (this.breadcrumbs.length > 50) {
      this.breadcrumbs = this.breadcrumbs.slice(-50);
    }
  }

  private sendEvent(event: Record<string, unknown>): void {
    if (!this.dsn) return;

    // Fire-and-forget — don't block the UI
    fetch(this.dsn.storeUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    }).catch(() => {
      // Silent fail — error reporting shouldn't cause errors
    });
  }

  // ─── API Client (for AI Agent queries) ─────────────────────────────────

  private async apiRequest<T>(path: string): Promise<T | null> {
    if (!GLITCHTIP_API_TOKEN) {
      console.debug('[GlitchTip] No API token — API queries disabled');
      return null;
    }

    try {
      const response = await fetch(`${GLITCHTIP_API_BASE}${path}`, {
        headers: {
          'Authorization': `Bearer ${GLITCHTIP_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`GlitchTip API ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[GlitchTip] API error:', error);
      return null;
    }
  }

  async getIssues(query?: string): Promise<GlitchTipIssue[]> {
    const params = new URLSearchParams({ query: query || 'is:unresolved' });
    return await this.apiRequest<GlitchTipIssue[]>(
      `/projects/${GLITCHTIP_ORG}/${GLITCHTIP_PROJECT}/issues/?${params}`
    ) || [];
  }

  async getIssueEvents(issueId: string): Promise<GlitchTipEvent[]> {
    return await this.apiRequest<GlitchTipEvent[]>(
      `/issues/${issueId}/events/`
    ) || [];
  }

  async getErrorSummary(): Promise<{ total: number; unresolved: number; critical: number }> {
    const issues = await this.getIssues();
    return {
      total: issues.length,
      unresolved: issues.filter(i => i.status === 'unresolved').length,
      critical: issues.filter(i => i.level === 'fatal' || i.level === 'error').length,
    };
  }

  async resolveIssue(issueId: string): Promise<boolean> {
    if (!GLITCHTIP_API_TOKEN) return false;

    try {
      const response = await fetch(`${GLITCHTIP_API_BASE}/issues/${issueId}/`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${GLITCHTIP_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'resolved' }),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async getIssuesForAgent(): Promise<string> {
    const issues = await this.getIssues();
    if (issues.length === 0) return 'No unresolved issues found.';

    return issues.map(issue =>
      `[${issue.level.toUpperCase()}] ${issue.title}\n` +
      `  Culprit: ${issue.culprit}\n` +
      `  Count: ${issue.count} | First: ${issue.firstSeen} | Last: ${issue.lastSeen}\n` +
      `  ID: ${issue.id}`
    ).join('\n\n');
  }
}

export const glitchTipService = new GlitchTipService();
export default glitchTipService;
