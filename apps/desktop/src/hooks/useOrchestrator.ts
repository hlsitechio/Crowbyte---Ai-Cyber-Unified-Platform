/**
 * Hook to start/stop the agent orchestrator when authenticated.
 * Call once at the app root level.
 */

import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/auth';
import orchestrator from '@/services/agent-orchestrator';

export function useOrchestrator() {
  const { user } = useAuth();
  const startedRef = useRef(false);

  useEffect(() => {
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
