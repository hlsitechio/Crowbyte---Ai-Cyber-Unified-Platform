/**
 * SubscriptionGate — Hard paywall for desktop app.
 * Shown when user has no valid Pro+ subscription.
 * Cannot be bypassed — no skip button, no workaround.
 */

import { useState } from "react";
import { motion } from "framer-motion";
import {
  UilLock,
  UilArrowRight,
  UilSync,
  UilSignout,
  UilMonitor,
  UilBolt,
  UilGlobe,
  UilWindow,
  UilAward,
  UilShield,
} from "@iconscout/react-unicons";
import { supabase } from "@/integrations/supabase/client";
import { verifyLicense, type LicenseStatus } from "@/services/license-guard";

interface Props {
  status: LicenseStatus;
  onRetry: () => void;
}

export default function SubscriptionGate({ status, onRetry }: Props) {
  const [checking, setChecking] = useState(false);

  const handleRetry = async () => {
    setChecking(true);
    await onRetry();
    setChecking(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  const openUpgrade = () => {
    if (window.electronAPI?.executeCommand) {
      window.electronAPI.executeCommand('start https://crowbyte.io/payments');
    } else {
      window.open('https://crowbyte.io/payments', '_blank');
    }
  };

  const openWeb = () => {
    if (window.electronAPI?.executeCommand) {
      window.electronAPI.executeCommand('start https://crowbyte.io');
    } else {
      window.open('https://crowbyte.io', '_blank');
    }
  };

  const isAuthIssue = status.status === 'unauthenticated';
  const isOffline = status.status === 'offline' || status.status === 'cache_expired';
  const isDeviceLimit = status.status === 'device_limit';
  const isTierIssue = ['no_subscription', 'tier_insufficient', 'expired'].includes(status.status);

  return (
    <div className="w-screen h-screen bg-background flex flex-col items-center justify-center relative select-none overflow-hidden">
      {/* Drag region */}
      <div
        className="absolute top-0 left-0 right-0 h-8 z-40"
        style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
      />

      {/* Window controls */}
      <div className="absolute top-3 right-3 z-50 flex gap-1.5">
        <button
          onClick={() => window.electronAPI?.minimizeWindow?.()}
          className="w-3 h-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        />
        <button
          onClick={() => window.electronAPI?.closeWindow?.()}
          className="w-3 h-3 rounded-full bg-white/10 hover:bg-red-500/80 transition-colors"
        />
      </div>

      {/* Background glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(239,68,68,0.04),transparent_60%)]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 flex flex-col items-center gap-6 px-10 max-w-md"
      >
        {/* Lock icon */}
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center">
          <UilLock size={28} className="text-red-400" />
        </div>

        {/* Title */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-white">
            {isAuthIssue ? 'Sign In Required' :
             isOffline ? 'Verification Required' :
             isDeviceLimit ? 'Device Limit Reached' :
             'Subscription Required'}
          </h1>
          <p className="text-sm text-zinc-400 leading-relaxed">
            {status.reason}
          </p>
        </div>

        {/* Status badge */}
        {status.tier && status.tier !== 'none' && status.tier !== 'unknown' && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.06]">
            <span className="text-xs text-zinc-500">Current plan:</span>
            <span className={`text-xs font-semibold ${
              status.tier === 'free' ? 'text-zinc-400' :
              status.tier === 'pro' ? 'text-blue-400' :
              status.tier === 'team' ? 'text-violet-400' :
              'text-amber-400'
            }`}>
              {status.tier.toUpperCase()}
            </span>
          </div>
        )}

        {/* What Pro includes */}
        {isTierIssue && (
          <div className="w-full rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-400">
              <UilAward size={14} />
              <span>Pro Plan Includes</span>
            </div>
            {[
              [UilWindow, 'Full desktop app access'],
              [UilBolt, 'AI chat — 50 messages/day'],
              [UilMonitor, 'VPS agent deployment'],
              [UilShield, 'Advanced scanning tools'],
              [UilGlobe, 'API access & webhooks'],
            ].map(([Icon, label], i) => (
              <div key={i} className="flex items-center gap-2.5 text-xs text-zinc-400">
                <Icon size={12} className="text-zinc-500 flex-shrink-0" />
                <span>{label as string}</span>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="w-full space-y-2">
          {isTierIssue && (
            <button
              onClick={openUpgrade}
              className="w-full h-11 rounded-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white text-sm font-semibold transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
            >
              Upgrade to Pro — $19/mo <UilArrowRight size={14} />
            </button>
          )}

          {isAuthIssue && (
            <button
              onClick={() => { window.location.hash = '#/auth'; window.location.reload(); }}
              className="w-full h-11 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-all flex items-center justify-center gap-2"
            >
              Sign In <UilArrowRight size={14} />
            </button>
          )}

          <button
            onClick={handleRetry}
            disabled={checking}
            className="w-full h-10 rounded-full bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-white text-sm font-medium transition-all flex items-center justify-center gap-2"
          >
            {checking ? (
              <motion.div
                className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
              />
            ) : (
              <><UilSync size={14} /> Re-check Subscription</>
            )}
          </button>

          {isTierIssue && (
            <button
              onClick={openWeb}
              className="w-full text-xs text-zinc-600 hover:text-zinc-400 transition-colors py-1"
            >
              Use CrowByte on the web instead (free)
            </button>
          )}

          {!isAuthIssue && (
            <button
              onClick={handleLogout}
              className="w-full text-xs text-zinc-600 hover:text-red-400 transition-colors py-1 flex items-center justify-center gap-1"
            >
              <UilSignout size={10} /> Sign out
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
