/**
 * Cyber Pulse Widget — Global threat activity dashboard
 * Shows live IOC counts, threat level, feed activity, top threats
 * Data sourced from server-side cached threat feeds (available to all users)
 * Streams updates via Supabase Realtime
 */
import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  UilShield, UilBug, UilLink, UilGlobe, UilExclamationTriangle,
  UilSync, UilArrowUp, UilBolt, UilDatabase, UilServer,
  UilEnvelope, UilLock, UilArrowDown,
} from "@iconscout/react-unicons";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import type { WidgetProps } from "../types";

interface PulseData {
  threat_level: "LOW" | "MODERATE" | "ELEVATED" | "HIGH" | "CRITICAL";
  total_iocs_24h: number;
  total_iocs_7d: number;
  feeds_active: number;
  feeds_total: number;
  last_sync: string;
  breakdown: Record<string, number>;
  top_threats: Array<{ name: string; count: number; severity: string }>;
  trend: "rising" | "stable" | "declining";
}

const THREAT_COLORS: Record<string, string> = {
  LOW: "text-emerald-400",
  MODERATE: "text-blue-400",
  ELEVATED: "text-yellow-400",
  HIGH: "text-orange-400",
  CRITICAL: "text-red-400",
};

const THREAT_BG: Record<string, string> = {
  LOW: "bg-emerald-500/10 border-emerald-500/20",
  MODERATE: "bg-blue-500/10 border-blue-500/20",
  ELEVATED: "bg-yellow-500/10 border-yellow-500/20",
  HIGH: "bg-orange-500/10 border-orange-500/20",
  CRITICAL: "bg-red-500/10 border-red-500/20",
};

const THREAT_GLOW: Record<string, string> = {
  LOW: "shadow-emerald-500/10",
  MODERATE: "shadow-blue-500/10",
  ELEVATED: "shadow-yellow-500/10",
  HIGH: "shadow-orange-500/10",
  CRITICAL: "shadow-red-500/20",
};

// Map category keys to display metrics
const CATEGORY_METRICS: Array<{
  key: string;
  label: string;
  icon: typeof UilBug;
  color: string;
  keys: string[]; // breakdown keys to sum
}> = [
  { key: "malware", label: "Malware", icon: UilBug, color: "text-red-400", keys: ["malware_urls", "iocs"] },
  { key: "phishing", label: "Phishing", icon: UilLink, color: "text-orange-400", keys: ["phishing"] },
  { key: "brute", label: "Brute Force", icon: UilShield, color: "text-yellow-400", keys: ["brute_force", "spam"] },
  { key: "compromised", label: "Bad IPs", icon: UilExclamationTriangle, color: "text-cyan-400", keys: ["compromised_ips", "ip_reputation", "web_attacks"] },
  { key: "vulns", label: "CVEs", icon: UilDatabase, color: "text-purple-400", keys: ["vulnerabilities", "oss_vulns"] },
  { key: "c2", label: "C2/Infra", icon: UilServer, color: "text-pink-400", keys: ["c2_servers", "network_intel"] },
];

function formatNumber(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return n.toString();
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

function sumKeys(breakdown: Record<string, number>, keys: string[]): number {
  return keys.reduce((sum, k) => {
    // Also check partial matches for flexibility
    for (const bk of Object.keys(breakdown)) {
      if (bk === k || bk.startsWith(k)) sum += breakdown[bk] || 0;
    }
    return sum;
  }, 0);
}

export default function CyberPulseWidget(_props: WidgetProps) {
  const [pulse, setPulse] = useState<PulseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const fetchPulse = async () => {
    try {
      const resp = await fetch("/api/intel/pulse");
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      setPulse(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPulse();
    intervalRef.current = setInterval(fetchPulse, 5 * 60 * 1000);

    // Supabase Realtime — listen for new pulse snapshots
    const channel = supabase
      .channel("intel-pulse-live")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "intel_pulse_history" },
        (payload) => {
          const row = payload.new as any;
          if (row) {
            setPulse((prev) => ({
              threat_level: row.threat_level || prev?.threat_level || "LOW",
              total_iocs_24h: row.total_iocs || prev?.total_iocs_24h || 0,
              total_iocs_7d: (row.total_iocs || 0) * 7,
              feeds_active: row.feeds_active || prev?.feeds_active || 0,
              feeds_total: row.feeds_total || prev?.feeds_total || 0,
              last_sync: row.synced_at || new Date().toISOString(),
              breakdown: row.breakdown || prev?.breakdown || {},
              top_threats: row.top_threats || prev?.top_threats || [],
              trend: row.trend || prev?.trend || "stable",
            }));
          }
        }
      )
      .subscribe();

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading) {
    return (
      <Card className="bg-card/50 backdrop-blur h-full overflow-hidden">
        <CardContent className="flex items-center justify-center h-full">
          <UilSync size={20} className="animate-spin text-zinc-500" />
        </CardContent>
      </Card>
    );
  }

  if (error || !pulse) {
    return (
      <Card className="bg-card/50 backdrop-blur h-full overflow-hidden">
        <CardContent className="flex flex-col items-center justify-center h-full gap-2">
          <UilExclamationTriangle size={20} className="text-zinc-500" />
          <span className="text-xs text-zinc-500">Intel feeds offline</span>
        </CardContent>
      </Card>
    );
  }

  const level = pulse.threat_level;
  const breakdown = pulse.breakdown || {};

  // Build metrics from dynamic breakdown
  const metrics = CATEGORY_METRICS.map((m) => ({
    ...m,
    value: sumKeys(breakdown, m.keys),
  })).filter((m) => m.value > 0);

  // If fewer than 6 metrics, pad with any remaining breakdown keys
  if (metrics.length < 6) {
    const usedKeys = new Set(metrics.flatMap((m) => m.keys));
    for (const [k, v] of Object.entries(breakdown)) {
      if (metrics.length >= 6) break;
      if (v > 0 && !usedKeys.has(k)) {
        metrics.push({
          key: k,
          label: k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()).slice(0, 12),
          icon: UilGlobe,
          color: "text-zinc-400",
          value: v,
          keys: [k],
        });
      }
    }
  }

  return (
    <Card className={`bg-card/50 backdrop-blur h-full shadow-lg overflow-hidden ${THREAT_GLOW[level]}`}>
      <CardContent className="p-4 h-full flex flex-col gap-3 min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UilBolt size={16} className="text-primary" />
            <span className="text-xs font-semibold text-zinc-300 tracking-wide">CYBER PULSE</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-zinc-500">{pulse.feeds_active}/{pulse.feeds_total} feeds</span>
            <span className="text-[9px] text-zinc-600">{timeAgo(pulse.last_sync)}</span>
          </div>
        </div>

        {/* Threat Level Badge */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={`flex items-center justify-between px-2 py-1.5 rounded-lg border min-w-0 gap-2 ${THREAT_BG[level]}`}
        >
          <div className="flex items-center gap-1.5 shrink-0">
            <div className={`w-2 h-2 rounded-full ${level === "CRITICAL" || level === "HIGH" ? "animate-pulse" : ""} ${THREAT_COLORS[level].replace("text-", "bg-")}`} />
            <span className={`text-xs font-bold tracking-wider ${THREAT_COLORS[level]}`}>
              {level}
            </span>
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <div className="text-right">
              <div className="text-sm font-bold text-zinc-100 tabular-nums">{formatNumber(pulse.total_iocs_24h)}</div>
              <div className="text-[8px] text-zinc-500">24h</div>
            </div>
            <div className="text-right">
              <div className="text-xs font-semibold text-zinc-300 tabular-nums">{formatNumber(pulse.total_iocs_7d)}</div>
              <div className="text-[8px] text-zinc-500">7d</div>
            </div>
            {pulse.trend === "rising" && <UilArrowUp size={12} className="text-red-400 shrink-0" />}
            {pulse.trend === "declining" && <UilArrowDown size={12} className="text-emerald-400 shrink-0" />}
          </div>
        </motion.div>

        {/* Metric bars — auto-wrap responsive grid */}
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-1 flex-1 min-w-0">
          {metrics.slice(0, 6).map((m, i) => (
            <motion.div
              key={m.key}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex flex-col items-center gap-0.5 p-1 rounded-md bg-zinc-900/50 hover:bg-zinc-800/50 transition-colors min-w-0"
            >
              <m.icon size={12} className={m.color} />
              <span className="text-xs font-bold text-zinc-200 tabular-nums">{formatNumber(m.value)}</span>
              <span className="text-[7px] text-zinc-500 text-center leading-tight truncate w-full">{m.label}</span>
            </motion.div>
          ))}
        </div>

        {/* Top threats ticker */}
        {pulse.top_threats.length > 0 && (
          <div className="flex items-center gap-1 overflow-hidden min-w-0">
            <span className="text-[8px] text-zinc-600 shrink-0">TOP</span>
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none min-w-0">
              {pulse.top_threats.slice(0, 4).map((t, i) => (
                <span
                  key={i}
                  className={`shrink-0 text-[8px] px-1 py-0.5 rounded text-zinc-400 whitespace-nowrap ${
                    t.severity === "critical"
                      ? "bg-red-900/30"
                      : t.severity === "high"
                      ? "bg-orange-900/30"
                      : "bg-zinc-800/80"
                  }`}
                >
                  {t.name.length > 14 ? t.name.slice(0, 12) + ".." : t.name}
                  <span className="text-zinc-500 ml-0.5">{formatNumber(t.count)}</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
