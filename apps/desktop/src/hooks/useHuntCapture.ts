/**
 * useHuntCapture — React hook that wires capture sources to hunt-graph.
 *
 * When hunt mode is active:
 * 1. Proxy captures → huntCapture.ingestWebhook()
 * 2. Terminal output → huntCapture.ingestTerminalChunk()
 * 3. Stats updated in real-time
 *
 * Mount this hook in a top-level component (e.g., AppWithTitleBar)
 * so it runs whenever the user is authenticated.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { huntCapture, type CaptureStats, type CaptureEvent } from '@/services/hunt-capture';
import { interceptProxy, type ProxyCapture } from '@/services/intercept-proxy';
import { IS_ELECTRON } from '@/lib/platform';

export interface UseHuntCaptureResult {
  /** Whether hunt mode is currently active */
  isActive: boolean;
  /** Current capture statistics */
  stats: CaptureStats;
  /** Recent flags (auto-clears after 50) */
  recentFlags: string[];
  /** Start hunt mode */
  startHunt: (huntId?: string) => Promise<void>;
  /** Stop hunt mode */
  stopHunt: () => Promise<void>;
  /** Pause/resume capture */
  togglePause: () => void;
}

export function useHuntCapture(): UseHuntCaptureResult {
  const [isActive, setIsActive] = useState(false);
  const [stats, setStats] = useState<CaptureStats>(huntCapture.getStats());
  const [recentFlags, setRecentFlags] = useState<string[]>([]);
  const proxyUnsubRef = useRef<(() => void) | null>(null);
  const captureUnsubRef = useRef<(() => void) | null>(null);
  const terminalUnsubRef = useRef<(() => void) | null>(null);

  // Subscribe to hunt-capture events
  useEffect(() => {
    captureUnsubRef.current = huntCapture.on((event: CaptureEvent) => {
      // Update stats on any event
      setStats(huntCapture.getStats());
      setIsActive(huntCapture.isActive());

      // Track flags
      if (event.type === 'flag_raised') {
        setRecentFlags(prev => {
          const next = [event.data.flag, ...prev];
          return next.slice(0, 50); // keep last 50
        });
      }

      if (event.type === 'status_change') {
        setIsActive(event.data.status === 'active');
      }
    });

    return () => {
      captureUnsubRef.current?.();
    };
  }, []);

  // Wire proxy captures → hunt-capture when active
  useEffect(() => {
    if (!isActive || !IS_ELECTRON) return;

    // Subscribe to proxy captures
    proxyUnsubRef.current = interceptProxy.onCapture(async (capture: ProxyCapture) => {
      if (!huntCapture.isActive()) return;

      // Get full capture detail for body inspection
      const detail = await interceptProxy.getCapture(capture.id);
      if (!detail) return;

      await huntCapture.ingestWebhook({
        method: detail.method,
        url: detail.url,
        status: detail.response?.status,
        request_headers: detail.request?.headers,
        response_headers: detail.response?.headers,
        request_body: detail.request?.body,
        response_body: detail.response?.body,
      });
    });

    return () => {
      proxyUnsubRef.current?.();
    };
  }, [isActive]);

  // Wire terminal output → hunt-capture when active
  useEffect(() => {
    if (!isActive || !IS_ELECTRON) return;

    const electron = (window as any).electronAPI;
    if (!electron) return;

    // Hook into terminal output events
    const handleTerminalOutput = (output: { terminalId: string; data: string }) => {
      if (!huntCapture.isActive()) return;
      huntCapture.ingestTerminalChunk(output.data);
    };

    electron.onTerminalOutput(handleTerminalOutput);
    terminalUnsubRef.current = () => {
      // Note: can't selectively remove — handled by component lifecycle
    };

    return () => {
      terminalUnsubRef.current?.();
    };
  }, [isActive]);

  const startHunt = useCallback(async (huntId?: string) => {
    try {
      await huntCapture.start(huntId);
      setIsActive(true);
      setStats(huntCapture.getStats());
    } catch (err) {
      console.error('[useHuntCapture] Failed to start:', err);
    }
  }, []);

  const stopHunt = useCallback(async () => {
    await huntCapture.stop();
    setIsActive(false);
    setStats(huntCapture.getStats());
    setRecentFlags([]);
  }, []);

  const togglePause = useCallback(() => {
    if (huntCapture.getStatus() === 'active') {
      huntCapture.pause();
    } else if (huntCapture.getStatus() === 'paused') {
      huntCapture.resume();
    }
    setStats(huntCapture.getStats());
  }, []);

  return { isActive, stats, recentFlags, startHunt, stopHunt, togglePause };
}
