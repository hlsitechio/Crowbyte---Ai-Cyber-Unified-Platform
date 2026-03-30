/**
 * Hook to start/stop the agent orchestrator when authenticated.
 * Call once at the app root level.
 */

import { useEffect } from 'react';
import { useAuth } from '@/contexts/auth';
import orchestrator from '@/services/agent-orchestrator';

export function useOrchestrator() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Start queue processor with 10s polling interval
    orchestrator.start(10000);

    return () => {
      orchestrator.stop();
    };
  }, [user]);
}
