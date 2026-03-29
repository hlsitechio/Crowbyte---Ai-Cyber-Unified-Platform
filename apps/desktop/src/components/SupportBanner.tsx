/**
 * SupportBanner — User-facing remote support consent + status.
 *
 * Shown when user requests support or when support agent initiates.
 * User must explicitly accept — can close the session anytime.
 * Like TeamViewer: green = connected, red dot = streaming.
 */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Headset,
  X,
  Shield,
  Eye,
  WifiHigh,
  Check,
} from "lucide-react";
import {
  createSupportSession,
  startStreaming,
  stopStreaming,
  getMyPendingSession,
  type SupportCommand,
} from "@/services/support-session";

type BannerState = "hidden" | "requesting" | "pending" | "active";

export function SupportBanner() {
  const [state, setState] = useState<BannerState>("hidden");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [showConsent, setShowConsent] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  // Check for existing pending session on mount
  useEffect(() => {
    getMyPendingSession().then((session) => {
      if (session) {
        setSessionId(session.id);
        if (session.status === "active") {
          setState("active");
          startStreaming(session.id, handleCommand);
        } else {
          setState("pending");
        }
      }
    });
  }, []);

  // Elapsed timer when active
  useEffect(() => {
    if (state !== "active") return;
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(interval);
  }, [state]);

  const handleCommand = useCallback((cmd: SupportCommand) => {
    if (cmd.type === "message") {
      // Could show a toast or notification
      console.log("[support] Message from agent:", cmd.payload);
    }
  }, []);

  const handleRequestSupport = () => {
    setShowConsent(true);
  };

  const handleAccept = async () => {
    setShowConsent(false);
    setState("requesting");

    const id = await createSupportSession();
    if (!id) {
      setState("hidden");
      return;
    }

    setSessionId(id);
    setState("pending");

    // Auto-start streaming — support agent will connect when ready
    startStreaming(id, handleCommand);
    setState("active");
    setElapsed(0);
  };

  const handleClose = async () => {
    await stopStreaming();
    setState("hidden");
    setSessionId(null);
    setElapsed(0);
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  // Hidden state — just show a small support button in the corner
  if (state === "hidden" && !showConsent) {
    return (
      <button
        onClick={handleRequestSupport}
        className="fixed bottom-4 right-4 z-50 w-10 h-10 rounded-full bg-white/[0.04] border border-white/[0.08] hover:bg-blue-500/10 hover:border-blue-500/30 transition-all flex items-center justify-center group"
        title="Request live support"
      >
        <Headset size={16} className="text-zinc-500 group-hover:text-blue-400 transition-colors" />
      </button>
    );
  }

  return (
    <>
      {/* Consent Dialog */}
      <AnimatePresence>
        {showConsent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-[#111] border border-white/[0.08] rounded-2xl p-6 max-w-sm w-full space-y-5"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                  <Headset size={20} className="text-blue-400" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Live Support Session</h3>
                  <p className="text-xs text-zinc-500">Connect with CrowByte support</p>
                </div>
              </div>

              <div className="space-y-2.5">
                <p className="text-xs text-zinc-400 leading-relaxed">
                  A support agent will be able to view your dashboard remotely to diagnose issues. They can see:
                </p>
                <div className="space-y-1.5">
                  {[
                    [Eye, "Your current page and navigation"],
                    [Shield, "Error logs and console output"],
                    [WifiHigh, "Network requests and performance"],
                  ].map(([Icon, label], i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-zinc-500">
                      <Icon size={12} className="text-zinc-600 flex-shrink-0" />
                      <span>{label as string}</span>
                    </div>
                  ))}
                </div>
                <div className="bg-amber-500/5 border border-amber-500/10 rounded-lg p-2.5">
                  <p className="text-[11px] text-amber-400/80">
                    No passwords, API keys, or personal data are shared. You can end the session at any time.
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowConsent(false)}
                  className="flex-1 h-9 rounded-lg bg-white/[0.04] border border-white/[0.06] text-xs text-zinc-400 hover:bg-white/[0.08] transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAccept}
                  className="flex-1 h-9 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs text-white font-medium transition-all flex items-center justify-center gap-1.5"
                >
                  <Check size={12} /> Accept & Connect
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active Session Banner */}
      {(state === "pending" || state === "active" || state === "requesting") && (
        <motion.div
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          className="fixed top-10 left-1/2 -translate-x-1/2 z-[90] flex items-center gap-3 px-4 py-2 rounded-full bg-[#111]/90 border border-white/[0.08] backdrop-blur-xl shadow-2xl"
        >
          {/* Status dot */}
          <div className="relative">
            <div className={`w-2 h-2 rounded-full ${
              state === "active" ? "bg-red-500" : "bg-amber-500"
            }`} />
            {state === "active" && (
              <div className="absolute inset-0 w-2 h-2 rounded-full bg-red-500 animate-ping opacity-75" />
            )}
          </div>

          <span className="text-xs text-zinc-300 font-medium">
            {state === "requesting" ? "Connecting..." :
             state === "pending" ? "Waiting for support agent..." :
             "Live Support"}
          </span>

          {state === "active" && (
            <span className="text-[10px] text-zinc-500 font-mono tabular-nums">
              {formatTime(elapsed)}
            </span>
          )}

          {sessionId && state === "active" && (
            <span className="text-[10px] text-zinc-600 font-mono">
              #{sessionId.slice(0, 8)}
            </span>
          )}

          <button
            onClick={handleClose}
            className="w-6 h-6 rounded-full bg-white/[0.06] hover:bg-red-500/20 border border-white/[0.06] hover:border-red-500/30 flex items-center justify-center transition-all"
            title="End support session"
          >
            <X size={12} className="text-zinc-400 hover:text-red-400" />
          </button>
        </motion.div>
      )}
    </>
  );
}
