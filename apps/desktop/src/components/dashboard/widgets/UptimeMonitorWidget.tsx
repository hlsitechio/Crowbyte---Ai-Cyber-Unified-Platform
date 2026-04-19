import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UilHeartbeat, UilSync, UilCircle, UilGlobe } from "@iconscout/react-unicons";
import type { WidgetProps } from "../types";

interface UptimeTarget {
  url: string;
  label: string;
  status: "up" | "down" | "checking";
  latencyMs: number;
  lastChecked: Date | null;
}

const STORAGE_KEY = "crowbyte-uptime-targets";

const DEFAULT_TARGETS = [
  { url: "https://crowbyte.io", label: "CrowByte" },
  { url: "https://crowbyte.io/api/health", label: "CrowByte API" },
];

function loadTargets(): { url: string; label: string }[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* empty */ }
  return DEFAULT_TARGETS;
}

export default function UptimeMonitorWidget({ size }: WidgetProps) {
  const [targets, setTargets] = useState<UptimeTarget[]>(() =>
    loadTargets().map(t => ({ ...t, status: "checking" as const, latencyMs: 0, lastChecked: null }))
  );
  const [checking, setChecking] = useState(false);

  const checkAll = useCallback(async () => {
    setChecking(true);
    const updated = await Promise.all(
      targets.map(async (target) => {
        try {
          const start = Date.now();
          const res = await fetch(target.url, {
            method: "HEAD",
            mode: "no-cors",
            signal: AbortSignal.timeout(10000),
          });
          const latency = Date.now() - start;
          return { ...target, status: "up" as const, latencyMs: latency, lastChecked: new Date() };
        } catch {
          return { ...target, status: "down" as const, latencyMs: 0, lastChecked: new Date() };
        }
      })
    );
    setTargets(updated);
    setChecking(false);
  }, [targets]);

  useEffect(() => {
    checkAll();
    const interval = setInterval(checkAll, 60000);
    return () => clearInterval(interval);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const upCount = targets.filter(t => t.status === "up").length;
  const downCount = targets.filter(t => t.status === "down").length;

  const statusDot: Record<string, string> = {
    up: "fill-emerald-500 text-emerald-500",
    down: "fill-red-500 text-red-500 animate-pulse",
    checking: "fill-amber-500 text-amber-500 animate-pulse",
  };

  const latencyColor = (ms: number) => {
    if (ms === 0) return "text-zinc-500";
    if (ms < 200) return "text-emerald-500";
    if (ms < 500) return "text-amber-500";
    return "text-red-500";
  };

  return (
    <Card className="bg-card/50 backdrop-blur h-full overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <UilHeartbeat size={16} className="text-emerald-500" />
            Uptime Monitor
            <div className="flex items-center gap-2 ml-2">
              {upCount > 0 && <span className="text-[10px] text-emerald-500">{upCount} up</span>}
              {downCount > 0 && <span className="text-[10px] text-red-500">{downCount} down</span>}
            </div>
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={checkAll}
            disabled={checking}
            className="text-xs h-6 px-2"
          >
            <UilSync size={12} className={checking ? "animate-spin mr-1" : "mr-1"} />
            Check
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-1.5">
          {targets.map((target, i) => (
            <div key={i} className="flex items-center gap-1.5 text-xs p-1.5 rounded hover:bg-white/5 transition-colors min-w-0">
              <UilCircle size={8} className={`${statusDot[target.status]} shrink-0`} />
              <span className="font-semibold text-zinc-200 truncate min-w-0 flex-1">{target.label}</span>
              <span className="text-[10px] text-muted-foreground font-mono truncate min-w-0 max-w-[30%] hidden sm:inline">
                {target.url.replace(/^https?:\/\//, "")}
              </span>
              <span className={`text-[10px] font-mono font-bold shrink-0 ${latencyColor(target.latencyMs)}`}>
                {target.status === "checking" ? "..." : target.status === "down" ? "DOWN" : `${target.latencyMs}ms`}
              </span>
            </div>
          ))}
        </div>
        {targets.length > 0 && targets[0].lastChecked && (
          <div className="text-[10px] text-zinc-600 mt-2 text-right">
            Last check: {targets[0].lastChecked.toLocaleTimeString()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
