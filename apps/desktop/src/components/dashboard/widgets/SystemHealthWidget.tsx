import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UilProcessor, UilHeartRate, UilServer, UilClock, UilMonitor, UilArrowRight, UilBolt } from "@iconscout/react-unicons";
import { NumberTicker } from "@/components/ui/number-ticker";
import { BorderBeam } from "@/components/ui/border-beam";
import { systemMonitor, SystemMetrics } from "@/services/systemMonitor";
import { endpointService } from "@/services/endpointService";
import type { WidgetProps } from "../types";

const getHealthColor = (value: number) => {
  if (value > 80) return "#f87171";
  if (value > 60) return "#facc15";
  return "#4ade80";
};

export default function SystemHealthWidget(_props: WidgetProps) {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [health, setHealth] = useState({ cpu: 0, memory: 0, disk: 0 });

  useEffect(() => {
    const fetch = async () => {
      try {
        const endpoint = await endpointService.findCurrentDevice();
        if (endpoint) {
          setHealth({
            cpu: Math.round(endpoint.cpu_usage),
            memory: Math.round(endpoint.memory_usage),
            disk: Math.round(endpoint.disk_usage),
          });
        }
        const m = await systemMonitor.getMetrics();
        setMetrics(m);
        setHealth({ cpu: Math.round(m.cpuUsage), memory: Math.round(m.memoryUsage), disk: Math.round(m.diskUsage) });
      } catch {
        // fallback
      }
    };
    fetch();
    const interval = setInterval(fetch, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Card className="bg-card/50 backdrop-blur h-full relative overflow-hidden">
      <BorderBeam size={120} duration={8} colorFrom="#a78bfa" colorTo="#3b82f6" borderWidth={1} />
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <UilMonitor size={16} className="text-primary" />
            Kali System
            {metrics && <span className="text-[10px] text-zinc-500 ml-1">{metrics.hostname}</span>}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => navigate("/fleet")} className="text-xs h-7 px-2">
            View Fleet <UilArrowRight size={12} className="ml-1" />
          </Button>
        </div>
        {metrics && (
          <CardDescription className="text-[10px]">
            {metrics.platform} {metrics.osVersion} | {metrics.cpuModel} ({metrics.cpuCores} cores)
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <MetricBar label="CPU" icon={UilProcessor} value={health.cpu} color="text-primary" barColor="bg-primary" getColor={getHealthColor} />
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5"><UilHeartRate size={14} className="text-blue-500" /><span>Memory</span></div>
              <span className="font-bold" style={{ color: getHealthColor(health.memory) }}>
                <NumberTicker value={health.memory} className="text-inherit tabular-nums" />%
              </span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${health.memory}%` }} />
            </div>
            {metrics && <p className="text-[10px] text-muted-foreground">{metrics.memoryUsed.toFixed(1)} / {metrics.memoryTotal.toFixed(1)} GB</p>}
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5"><UilServer size={14} className="text-amber-500" /><span>Disk</span></div>
              <span className="font-bold text-amber-500"><NumberTicker value={health.disk} className="text-inherit tabular-nums" />%</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-amber-500 transition-all duration-500" style={{ width: `${health.disk}%` }} />
            </div>
            {metrics && metrics.diskTotal > 0 && <p className="text-[10px] text-muted-foreground">{metrics.diskUsed.toFixed(0)} / {metrics.diskTotal.toFixed(0)} GB</p>}
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs"><UilClock size={14} className="text-emerald-500" /><span>Uptime</span></div>
            {metrics && (
              <>
                <div className="text-lg font-bold text-emerald-500">
                  {Math.floor(metrics.uptime / 3600)}h {Math.floor((metrics.uptime % 3600) / 60)}m
                </div>
                <p className="text-[10px] text-muted-foreground">IP: {metrics.ipAddress}</p>
              </>
            )}
          </div>
        </div>
        {metrics?.gpu && (
          <div className="mt-4 pt-3 border-t border-white/[0.04]">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5"><UilBolt size={14} className="text-violet-500" /><span>GPU</span></div>
                  <span className="font-bold" style={{ color: metrics.gpu.utilization > 80 ? "#f87171" : metrics.gpu.utilization > 60 ? "#facc15" : "#a78bfa" }}>
                    <NumberTicker value={metrics.gpu.utilization} className="text-inherit tabular-nums" />%
                  </span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-violet-500 transition-all duration-500" style={{ width: `${metrics.gpu.utilization}%` }} />
                </div>
                <p className="text-[10px] text-muted-foreground">{metrics.gpu.name}</p>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5"><UilHeartRate size={14} className="text-violet-500" /><span>VRAM</span></div>
                  <span className="font-bold text-violet-500">{Math.round(metrics.gpu.memoryUsed / metrics.gpu.memoryTotal * 100)}%</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-violet-500/70 transition-all duration-500" style={{ width: `${Math.round(metrics.gpu.memoryUsed / metrics.gpu.memoryTotal * 100)}%` }} />
                </div>
                <p className="text-[10px] text-muted-foreground">{metrics.gpu.memoryUsed} / {metrics.gpu.memoryTotal} MiB · {metrics.gpu.temperature}°C · {metrics.gpu.powerDraw.toFixed(0)}W</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MetricBar({ label, icon: Icon, value, color, barColor, getColor }: {
  label: string; icon: any; value: number; color: string; barColor: string; getColor: (v: number) => string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5"><Icon size={14} className={color} /><span>{label}</span></div>
        <span className="font-bold" style={{ color: getColor(value) }}>
          <NumberTicker value={value} className="text-inherit tabular-nums" />%
        </span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full ${barColor} transition-all duration-500`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
