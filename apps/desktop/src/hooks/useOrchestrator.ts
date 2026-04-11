/**
 * Hook to start/stop the agent orchestrator when authenticated.
 * Call once at the app root level.
 *
 * IMPORTANT: Only runs on Electron (desktop). On web, the orchestrator has
 * no dispatch endpoint and SSH fallback — all tasks would fail with 401.
 */

import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/auth';
import { IS_WEB } from '@/lib/platform';
import orchestrator from '@/services/agent-orchestrator';

export function useOrchestrator() {
  const { user } = useAuth();
  const startedRef = useRef(false);

  useEffect(() => {
    // Skip on web — no dispatch endpoint available
    if (IS_WEB) return;

    if (!user?.id) {
      if (startedRef.current) {
        orchestrator.stop();
        startedRef.current = false;
      }
      return;
    }

    if (!startedRef.current) {
      orchestrator.start(10000);
      startedRef.current = true;
    }

    return () => {
      orchestrator.stop();
      startedRef.current = false;
    };
  }, [user?.id]);
}
