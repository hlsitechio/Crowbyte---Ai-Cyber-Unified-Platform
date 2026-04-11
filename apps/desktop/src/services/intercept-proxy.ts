/**
 * Intercept Proxy Service (Renderer Side)
 *
 * IPC bridge to the Electron proxy-server.cjs running in main process.
 * Provides React-friendly API + event subscription for real-time captures.
 * This is the MITM intercepting proxy — NOT the web CORS proxy (proxy.ts).
 */

import { IS_ELECTRON } from '@/lib/platform';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ProxyCapture {
  id: string;
  timestamp: string;
  method: string;
  url: string;
  hostname: string;
  path: string;
  protocol: 'http' | 'https';
  status?: number;
  duration: number;
  requestSize: number;
  responseSize: number;
  contentType?: string;
  flags: string[];
  tags: string[];
}

export interface ProxyCaptureDetail {
  id: string;
  timestamp: string;
  method: string;
  url: string;
  hostname: string;
  path: string;
  protocol: string;
  request: {
    headers: Record<string, string>;
    body: string;
    size: number;
  };
  response: {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    body: string;
    size: number;
    truncated: boolean;
  } | null;
  duration: number;
  flags: string[];
  tags: string[];
}

export interface ProxyStats {
  running: boolean;
  port: number;
  intercept: boolean;
  paused: boolean;
  scope: string[];
  caPath?: string;
  total: number;
  captured: number;
  filtered: number;
  errors: number;
  historySize: number;
}

export interface ProxyStartOpts {
  port?: number;
  intercept?: boolean;
  scope?: string[];
  excludeScope?: string[];
}

type CaptureHandler = (capture: ProxyCapture) => void;

// ─── IPC Helper ─────────────────────────────────────────────────────────────

function getProxyAPI(): any {
  return (window as any).electronAPI?.proxy;
}

function hasProxy(): boolean {
  return IS_ELECTRON && !!getProxyAPI();
}

// ─── Intercept Proxy Service ────────────────────────────────────────────────

class InterceptProxyService {
  private listeners: CaptureHandler[] = [];
  private ipcListenerRegistered = false;

  constructor() {
    this.setupIPCListener();
  }

  private setupIPCListener() {
    if (!IS_ELECTRON || this.ipcListenerRegistered) return;

    const api = getProxyAPI();
    if (api?.onCapture) {
      api.onCapture((capture: ProxyCapture) => {
        for (const handler of this.listeners) {
          try { handler(capture); } catch {}
        }
      });
      this.ipcListenerRegistered = true;
    }
  }

  // ── Lifecycle ───────────────────────────────────────────────────────

  async start(opts: ProxyStartOpts = {}): Promise<{ success: boolean; port?: number; error?: string }> {
    if (!hasProxy()) return { success: false, error: 'Requires Electron' };
    return getProxyAPI().start(opts);
  }

  async stop(): Promise<{ success: boolean }> {
    if (!hasProxy()) return { success: false };
    return getProxyAPI().stop();
  }

  async getStatus(): Promise<ProxyStats> {
    if (!hasProxy()) return { running: false, port: 0, intercept: false, paused: false, scope: [], total: 0, captured: 0, filtered: 0, errors: 0, historySize: 0 };
    return getProxyAPI().status();
  }

  async pause(): Promise<{ success: boolean }> {
    if (!hasProxy()) return { success: false };
    return getProxyAPI().pause();
  }

  async resume(): Promise<{ success: boolean }> {
    if (!hasProxy()) return { success: false };
    return getProxyAPI().resume();
  }

  // ── Scope ───────────────────────────────────────────────────────────

  async setScope(scope: string[], excludeScope: string[] = []): Promise<{ success: boolean }> {
    if (!hasProxy()) return { success: false };
    return getProxyAPI().setScope(scope, excludeScope);
  }

  // ── History ─────────────────────────────────────────────────────────

  async getHistory(filters?: {
    hostname?: string;
    method?: string;
    status?: number;
    search?: string;
    flags?: string[];
    offset?: number;
    limit?: number;
  }): Promise<{ items: ProxyCapture[]; total: number }> {
    if (!hasProxy()) return { items: [], total: 0 };
    return getProxyAPI().history(filters || {});
  }

  async getCapture(id: string): Promise<ProxyCaptureDetail | null> {
    if (!hasProxy()) return null;
    return getProxyAPI().getCapture(id);
  }

  async clearHistory(): Promise<{ success: boolean }> {
    if (!hasProxy()) return { success: false };
    return getProxyAPI().clear();
  }

  // ── Replay (Repeater) ──────────────────────────────────────────────

  async replay(id: string, modifications?: {
    method?: string;
    url?: string;
    headers?: Record<string, string>;
    body?: string;
  }): Promise<{ success: boolean; capture?: ProxyCaptureDetail; error?: string }> {
    if (!hasProxy()) return { success: false, error: 'Requires Electron' };
    return getProxyAPI().replay(id, modifications);
  }

  // ── CA Cert ─────────────────────────────────────────────────────────

  async getCAPath(): Promise<string | null> {
    if (!hasProxy()) return null;
    return getProxyAPI().caPath();
  }

  // ── Real-time Events ────────────────────────────────────────────────

  onCapture(handler: CaptureHandler): () => void {
    this.listeners.push(handler);
    return () => {
      this.listeners = this.listeners.filter(h => h !== handler);
    };
  }
}

// ── Singleton ───────────────────────────────────────────────────────────────

export const interceptProxy = new InterceptProxyService();
export default interceptProxy;
