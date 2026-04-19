/**
 * Hunt Mode Dashboard Widget
 *
 * Shows active hunt status, capture stats, proxy state,
 * triage queue count, and recent auto-flags.
 */

import React, { useEffect, useState } from 'react';
import { Crosshair, Radio, Pause, Play, Wifi, WifiOff, AlertTriangle, Activity, Target, Layers } from 'lucide-react';
import { huntCapture } from '@/services/hunt-capture';
import { interceptProxy } from '@/services/intercept-proxy';
import { IS_ELECTRON } from '@/lib/platform';

const HuntWidget = () => {
  const [stats, setStats] = useState(huntCapture.getStats());
  const [proxyRunning, setProxyRunning] = useState(false);

  useEffect(() => {
    // Poll stats every 2s
    const interval = setInterval(async () => {
      setStats(huntCapture.getStats());
      if (IS_ELECTRON) {
        try {
          const ps = await interceptProxy.getStatus();
          setProxyRunning(ps.running);
        } catch { /* empty */ }
      }
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const isActive = stats.status === 'active';
  const isPaused = stats.status === 'paused';

  return (
    <div className="h-full flex flex-col gap-3 p-1">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Crosshair className={`w-4 h-4 ${isActive ? 'text-green-400 animate-pulse' : 'text-zinc-500'}`} />
          <span className="text-xs font-bold uppercase tracking-wider">
            {isActive ? 'Hunt Active' : isPaused ? 'Hunt Paused' : 'Hunt Idle'}
          </span>
        </div>
        {stats.huntName && (
          <span className="text-[10px] text-zinc-500 font-mono truncate max-w-[120px]">
            {stats.huntName}
          </span>
        )}
      </div>

      {/* Stats Grid */}
      {isActive || isPaused ? (
        <>
          <div className="grid grid-cols-3 gap-2">
            <StatBox
              icon={<Activity className="w-3 h-3" />}
              label="Captured"
              value={stats.totalCaptured}
              color="text-blue-400"
            />
            <StatBox
              icon={<Layers className="w-3 h-3" />}
              label="Filtered"
              value={stats.totalFiltered}
              color="text-zinc-500"
            />
            <StatBox
              icon={<AlertTriangle className="w-3 h-3" />}
              label="Flags"
              value={stats.totalFlags}
              color={stats.totalFlags > 0 ? 'text-orange-400' : 'text-zinc-500'}
            />
          </div>

          {/* Sources */}
          <div className="flex items-center gap-3 text-[10px] text-zinc-500">
            <SourceDot label="Proxy" count={stats.sources.webhook.count} enabled={proxyRunning} />
            <SourceDot label="Terminal" count={stats.sources.terminal.count} enabled={stats.sources.terminal.enabled} />
            <SourceDot label="Browser" count={stats.sources.browser.count} enabled={stats.sources.browser.enabled} />
          </div>

          {/* Rate */}
          <div className="flex items-center justify-between text-[10px] text-zinc-500">
            <span>{stats.eventsPerMinute} req/min</span>
            <span className="font-mono">{stats.scope.join(', ').slice(0, 40) || 'all'}</span>
          </div>
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Target className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
            <p className="text-[11px] text-zinc-600">No active hunt</p>
            <p className="text-[10px] text-zinc-700 mt-1">Create a hunt to start capturing</p>
          </div>
        </div>
      )}
    </div>
  );
};

const StatBox = ({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) => (
  <div className="bg-zinc-900/50 rounded px-2 py-1.5 text-center">
    <div className={`flex items-center justify-center gap-1 ${color} mb-0.5`}>
      {icon}
      <span className="text-sm font-mono font-bold">{value}</span>
    </div>
    <span className="text-[9px] text-zinc-600 uppercase">{label}</span>
  </div>
);

const SourceDot = ({ label, count, enabled }: { label: string; count: number; enabled: boolean }) => (
  <div className="flex items-center gap-1">
    <div className={`w-1.5 h-1.5 rounded-full ${enabled ? 'bg-green-500' : 'bg-zinc-700'}`} />
    <span>{label}</span>
    {count > 0 && <span className="text-zinc-400">({count})</span>}
  </div>
);

export default HuntWidget;
