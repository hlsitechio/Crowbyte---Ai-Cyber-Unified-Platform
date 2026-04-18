import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UilProcessor, UilHeartRate, UilServer, UilClock, UilGlobe, UilArrowRight, UilRobot } from "@iconscout/react-unicons";
import { NumberTicker } from "@/components/ui/number-ticker";
import { BorderBeam } from "@/components/ui/border-beam";
import { testConnection as aiTestConnection } from "@/services/ai";
import type { WidgetProps } from "../types";

interface VPSMetrics {
  cpu: number; memory: number; memoryUsed: number; memoryTotal: number;
  disk: number; diskUsed: string; diskTotal: string; uptime: string;
  hostname: string; cores: number;
}

export default function VPSHealthWidget(_props: WidgetProps) {
  const navigate = useNavigate();
  const [vps, setVps] = useState<VPSMetrics | null>(null);
  const [status, setStatus] = useState<{ ok: boolean; latencyMs: number } | null>(null);
  const [supabaseOk, setSupabaseOk] = useState<boolean | null>(null);

  useEffect(() => {
    const check = async () => {
      // Health check
      const start = Date.now();
      const vpsOk = await aiTestConnection().catch(() => false);
      setStatus({ ok: vpsOk, latencyMs: Date.now() - start });

      // Supabase check
      try {
        const { supabase } = await import("@/lib/supabase");
        const { error } = await supabase.from("conversations").select("id", { count: "exact", head: true });
        setSupabaseOk(!error);
      } catch { setSupabaseOk(false); }

      // VPS metrics from endpoints table
      try {
        const { supabase } = await import("@/lib/supabase");
        const { data } = await supabase
          .from("endpoints")
          .select("*")
          .eq("hostname", import.meta.env.VITE_VPS_HOSTNAME_ID || "vps")
          .maybeSingle();
        if (data) {
          const memTotalGb = data.total_memory_gb || 16;
          const memPct = Math.round(data.memory_usage || 0);
          setVps({
            cpu: Math.round(data.cpu_usage || 0),
            memory: memPct,
            memoryUsed: Math.round(memTotalGb * (memPct / 100) * 1024),
            memoryTotal: Math.round(memTotalGb * 1024),
            disk: Math.round(data.disk_usage || 0),
            diskUsed: `${Math.round((data.total_disk_gb || 193) * (data.disk_usage || 0) / 100)}G`,
            diskTotal: `${Math.round(data.total_disk_gb || 193)}G`,
            uptime: data.last_seen_at ? "Live" : "--",
            hostname: data.hostname || "vps",
            cores: data.cpu_cores || 4,
          });
        }
      } catch {}
    };

    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, []);

  const getColor = (v: number) => v > 80 ? "#f87171" : v > 60 ? "#facc15" : "#4ade80";

  return (
    <Card className="bg-card/50 backdrop-blur h-full relative overflow-hidden">
      <BorderBeam size={120} duration={8} colorFrom="#4ade80" colorTo="#06b6d4" borderWidth={1} />
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <UilGlobe size={16} className="text-emerald-500" />
            OpenClaw VPS
            <span className="flex items-center gap-1.5 ml-1">
              <span className={`w-1.5 h-1.5 rounded-full ${status?.ok ? "bg-emerald-500" : status === null ? "bg-amber-500 animate-pulse" : "bg-red-500"}`} />
              <span className={`text-[10px] ${status?.ok ? "text-emerald-500" : status === null ? "text-amber-500" : "text-red-500"}`}>
                {status?.ok ? "Online" : status === null ? "Checking..." : "Offline"}
              </span>
            </span>
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => navigate("/settings")} className="text-xs h-7 px-2">
            Settings <UilArrowRight size={12} className="ml-1" />
          </Button>
        </div>
        <CardDescription className="text-[10px]">
          {vps ? `${vps.hostname} \u2014 ${vps.cores} cores \u2014 NVIDIA Free Inference` : "OpenClaw VPS \u2014 NVIDIA Free Inference"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5"><UilProcessor size={14} className="text-emerald-500" /><span>CPU</span></div>
              <span className="font-bold" style={{ color: vps ? getColor(vps.cpu) : "#4ade80" }}>
                {vps ? <><NumberTicker value={vps.cpu} className="text-inherit tabular-nums" />%</> : "--"}
              </span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${vps?.cpu || 0}%` }} />
            </div>
            {vps && <p className="text-[10px] text-muted-foreground">{vps.cores} cores</p>}
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5"><UilHeartRate size={14} className="text-blue-500" /><span>Memory</span></div>
              <span className="font-bold" style={{ color: vps ? getColor(vps.memory) : "#4ade80" }}>
                {vps ? <><NumberTicker value={vps.memory} className="text-inherit tabular-nums" />%</> : "--"}
              </span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${vps?.memory || 0}%` }} />
            </div>
            {vps && <p className="text-[10px] text-muted-foreground">{(vps.memoryUsed / 1024).toFixed(1)} / {(vps.memoryTotal / 1024).toFixed(1)} GB</p>}
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5"><UilServer size={14} className="text-amber-500" /><span>Disk</span></div>
              <span className="font-bold text-amber-500">{vps ? <><NumberTicker value={vps.disk} className="text-inherit tabular-nums" />%</> : "--"}</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-amber-500 transition-all duration-500" style={{ width: `${vps?.disk || 0}%` }} />
            </div>
            {vps && <p className="text-[10px] text-muted-foreground">{vps.diskUsed} / {vps.diskTotal}</p>}
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs"><UilClock size={14} className="text-emerald-500" /><span>Uptime</span></div>
            <div className="text-lg font-bold text-emerald-500">
              {vps?.uptime || (status?.ok ? `${status.latencyMs}ms` : "--")}
            </div>
            <p className="text-[10px] text-muted-foreground">
              {status?.ok ? `Gateway ${status.latencyMs}ms` : "Gateway offline"}
            </p>
          </div>
        </div>
        <div className="mt-4 pt-3 border-t border-white/[0.04] flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 text-xs">
            <UilRobot size={12} className="text-emerald-500" />
            <span className="text-muted-foreground">9 Agents</span>
            <span className="text-muted-foreground">&middot;</span>
            <span className="text-muted-foreground">10 Models</span>
            <span className="text-[10px] text-emerald-500">$0/tok</span>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${supabaseOk ? "bg-emerald-500" : supabaseOk === null ? "bg-amber-500 animate-pulse" : "bg-red-500"}`} />
              <span className={supabaseOk ? "text-emerald-500" : "text-red-500"}>{supabaseOk ? "Supabase" : "DB Off"}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${status?.ok ? "bg-emerald-500" : "bg-red-500"}`} />
              <span className={status?.ok ? "text-emerald-500" : "text-red-500"}>{status?.ok ? "D3bugr" : "MCP Off"}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
