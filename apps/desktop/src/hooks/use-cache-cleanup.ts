/**
 * Cache Cleanup Hook
 * Automatically cleans up expired cache entries on a schedule
 */

import { useEffect, useRef } from 'react';
import { cacheService } from '@/services/cache';

export interface CacheCleanupOptions {
  intervalMs?: number;
  enabled?: boolean;
  onCleanup?: (removedCount: number) => void;
  onError?: (error: Error) => void;
}

export function useCacheCleanup(options: CacheCleanupOptions = {}) {
  const {
    intervalMs = 60 * 60 * 1000,
    enabled = true,
    onCleanup,
    onError,
  } = options;

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const cleanupInProgressRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    const runCleanup = async () => {
      if (cleanupInProgressRef.current) return;
      cleanupInProgressRef.current = true;

      try {
        const removedCount = await cacheService.cleanupExpired();
        onCleanup?.(removedCount);
      } catch (error) {
        console.error('[Cache Cleanup] Failed:', error);
        onError?.(error as Error);
      } finally {
        cleanupInProgressRef.current = false;
      }
    };

    runCleanup();
    intervalRef.current = setInterval(runCleanup, intervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [intervalMs, enabled, onCleanup, onError]);
}

export default useCacheCleanup;
