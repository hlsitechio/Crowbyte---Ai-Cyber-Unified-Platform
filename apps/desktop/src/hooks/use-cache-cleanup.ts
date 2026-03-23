/**
 * Cache Cleanup Hook
 * Automatically cleans up expired cache entries on a schedule
 */

import { useEffect, useRef } from 'react';
import { cacheService } from '@/services/cache';

export interface CacheCleanupOptions {
  intervalMs?: number; // Cleanup interval in milliseconds (default: 1 hour)
  enabled?: boolean; // Whether cleanup is enabled (default: true)
  onCleanup?: (removedCount: number) => void; // Callback when cleanup completes
  onError?: (error: Error) => void; // Callback when cleanup fails
}

/**
 * Hook to automatically cleanup expired cache entries
 *
 * @example
 * ```tsx
 * // Basic usage - runs cleanup every hour (default)
 * useCacheCleanup();
 *
 * // Custom interval - runs every 30 minutes
 * useCacheCleanup({ intervalMs: 30 * 60 * 1000 });
 *
 * // With callbacks
 * useCacheCleanup({
 *   onCleanup: (count) => console.log(`Removed ${count} expired entries`),
 *   onError: (err) => console.error('Cleanup failed:', err)
 * });
 * ```
 */
export function useCacheCleanup(options: CacheCleanupOptions = {}) {
  const {
    intervalMs = 60 * 60 * 1000, // 1 hour default
    enabled = true,
    onCleanup,
    onError,
  } = options;

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const cleanupInProgressRef = useRef(false);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const runCleanup = async () => {
      // Prevent concurrent cleanup runs
      if (cleanupInProgressRef.current) {
        console.log('[Cache Cleanup] Skipping - cleanup already in progress');
        return;
      }

      cleanupInProgressRef.current = true;

      try {
        console.log('[Cache Cleanup] Starting automatic cleanup...');
        const removedCount = await cacheService.cleanupExpired();
        console.log(`[Cache Cleanup] Removed ${removedCount} expired cache entries`);

        onCleanup?.(removedCount);
      } catch (error) {
        console.error('[Cache Cleanup] Failed:', error);
        onError?.(error as Error);
      } finally {
        cleanupInProgressRef.current = false;
      }
    };

    // Run cleanup immediately on mount
    runCleanup();

    // Set up periodic cleanup
    intervalRef.current = setInterval(runCleanup, intervalMs);

    console.log(`[Cache Cleanup] Scheduled to run every ${intervalMs / 1000 / 60} minutes`);

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        console.log('[Cache Cleanup] Stopped automatic cleanup');
      }
    };
  }, [intervalMs, enabled, onCleanup, onError]);
}

export default useCacheCleanup;
