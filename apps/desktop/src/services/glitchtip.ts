/**
 * GlitchTip Error Monitoring Service
 *
 * Captures frontend errors and sends them to GlitchTip (Sentry-compatible).
 * Also provides an API client to query issues from the AI agent.
 *
 * DSN: configured via VITE_GLITCHTIP_DSN
 * API: configured via VITE_GLITCHTIP_API_TOKEN
 */

// Use @sentry/electron renderer for Electron, @sentry/browser for web
import * as Sentry from '@sentry/browser';
import { loggingService } from '@/services/logging';
import { IS_WEB, IS_ELECTRON, BUILD_TARGET } from '@/lib/platform';

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

// ─── Configuration ─────────────────────────────────────────────────────────

const GLITCHTIP_DSN = import.meta.env.VITE_GLITCHTIP_DSN || '';
const GLITCHTIP_API_TOKEN = import.meta.env.VITE_GLITCHTIP_API_TOKEN || '';
const GLITCHTIP_API_BASE = 'https://app.glitchtip.com/api/0';
const GLITCHTIP_ORG = 'crowbyte';
const GLITCHTIP_PROJECT = 'crowbyte';

// ─── Service ───────────────────────────────────────────────────────────────

class GlitchTipService {
  private initialized = false;

  /**
   * Initialize Sentry SDK pointing at GlitchTip
   */
  initialize(): void {
    if (this.initialized || !GLITCHTIP_DSN) {
      if (!GLITCHTIP_DSN) {
        console.debug('[GlitchTip] No DSN configured — error monitoring disabled');
      }
      return;
    }

    try {
      Sentry.init({
        dsn: GLITCHTIP_DSN,
        environment: import.meta.env.MODE || 'production',
        release: `crowbyte@${import.meta.env.VITE_APP_VERSION || '0.0.0'}`,
        // Tag every event with build target
        initialScope: {
          tags: {
            build_target: BUILD_TARGET,
            platform: IS_WEB ? 'web' : 'desktop',
          },
        },
        // GlitchTip does not support sessions
        autoSessionTracking: false,
        // Don't send PII
        sendDefaultPii: false,
        // Sample rate — capture all errors, 1% of transactions
        sampleRate: 1.0,
        tracesSampleRate: 0.01,
        // Filter noisy errors
        beforeSend(event) {
          // Don't send extension errors
          if (event.exception?.values?.some(e =>
            e.value?.includes('extension') ||
            e.value?.includes('ResizeObserver')
          )) {
            return null;
          }

          // Log to our internal system too
          const errorMsg = event.exception?.values?.[0]?.value || event.message || 'Unknown error';
          loggingService.addLog('error', 'system', 'Error captured by GlitchTip', errorMsg);

          return event;
        },
      });

      this.initialized = true;
      loggingService.addLog('success', 'system', 'GlitchTip error monitoring initialized');
    } catch (error) {
      console.error('[GlitchTip] Init failed:', error);
    }
  }

  /**
   * Manually capture an error
   */
  captureError(error: Error, context?: Record<string, unknown>): void {
    if (!this.initialized) return;
    Sentry.captureException(error, { extra: context });
  }

  /**
   * Capture a message (non-error event)
   */
  captureMessage(message: string, level: Sentry.SeverityLevel = 'info'): void {
    if (!this.initialized) return;
    Sentry.captureMessage(message, level);
  }

  /**
   * Set user context (after login)
   */
  setUser(user: { id: string; email?: string }): void {
    if (!this.initialized) return;
    Sentry.setUser({ id: user.id, email: user.email });
  }

  /**
   * Clear user context (after logout)
   */
  clearUser(): void {
    if (!this.initialized) return;
    Sentry.setUser(null);
  }

  /**
   * Add breadcrumb for debugging context
   */
  addBreadcrumb(category: string, message: string, data?: Record<string, unknown>): void {
    if (!this.initialized) return;
    Sentry.addBreadcrumb({ category, message, data, level: 'info' });
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

  /**
   * Get all unresolved issues
   */
  async getIssues(query?: string): Promise<GlitchTipIssue[]> {
    const params = new URLSearchParams({ query: query || 'is:unresolved' });
    return await this.apiRequest<GlitchTipIssue[]>(
      `/projects/${GLITCHTIP_ORG}/${GLITCHTIP_PROJECT}/issues/?${params}`
    ) || [];
  }

  /**
   * Get issue details with events
   */
  async getIssueEvents(issueId: string): Promise<GlitchTipEvent[]> {
    return await this.apiRequest<GlitchTipEvent[]>(
      `/issues/${issueId}/events/`
    ) || [];
  }

  /**
   * Get error count summary
   */
  async getErrorSummary(): Promise<{ total: number; unresolved: number; critical: number }> {
    const issues = await this.getIssues();
    return {
      total: issues.length,
      unresolved: issues.filter(i => i.status === 'unresolved').length,
      critical: issues.filter(i => i.level === 'fatal' || i.level === 'error').length,
    };
  }

  /**
   * Resolve an issue
   */
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

  /**
   * Get all issues formatted for AI agent consumption
   */
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
