import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UilDesktop, UilArrowRight, UilCircle, UilExclamationTriangle } from "@iconscout/react-unicons";
import { endpointService, type Endpoint } from "@/services/endpointService";
import type { WidgetProps } from "../types";

export default function FleetWidget({ size }: WidgetProps) {
  const navigate = useNavigate();
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await endpointService.getAll();
        setEndpoints(data);
      } catch {}
      setLoading(false);
    };
    fetch();
    const interval = setInterval(fetch, 30000);
    return () => clearInterval(interval);
  }, []);

  const statusColor: Record<string, string> = {
    online: "text-emerald-500",
    warning: "text-amber-500",
    critical: "text-red-500",
    offline: "text-zinc-500",
  };

  const statusDot: Record<string, string> = {
    online: "fill-emerald-500 text-emerald-500",
    warning: "fill-amber-500 text-amber-500",
    critical: "fill-red-500 text-red-500 animate-pulse",
    offline: "fill-zinc-600 text-zinc-600",
  };

  const online = endpoints.filter(e => e.status === "online").length;
  const warning = endpoints.filter(e => e.status === "warning").length;
  const critical = endpoints.filter(e => e.status === "critical").length;
  const offline = endpoints.filter(e => e.status === "offline").length;

  const maxShow = size === "4x1" ? 8 : 4;

  return (
    <Card className="bg-card/50 backdrop-blur h-full overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <UilDesktop size={16} className="text-blue-400" />
            Fleet
            <div className="flex items-center gap-2 ml-2">
              {online > 0 && <span className="text-[10px] text-emerald-500">{online} online</span>}
              {warning > 0 && <span className="text-[10px] text-amber-500">{warning} warn</span>}
              {critical > 0 && <span className="text-[10px] text-red-500">{critical} crit</span>}
              {offline > 0 && <span className="text-[10px] text-zinc-500">{offline} off</span>}
            </div>
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => navigate("/fleet")} className="text-xs h-6 px-2">
            Manage <UilArrowRight size={12} className="ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-xs text-muted-foreground animate-pulse">Loading fleet...</div>
        ) : endpoints.length === 0 ? (
          <div className="text-xs text-muted-foreground text-center py-4">
            No endpoints registered.{" "}
            <button onClick={() => navigate("/fleet")} className="text-blue-400 hover:underline">Add one</button>
          </div>
        ) : (
          <div className="space-y-1.5">
            {endpoints.slice(0, maxShow).map((ep) => (
              <button
                key={ep.id}
                onClick={() => navigate("/fleet")}
                className="w-full flex items-center gap-1.5 text-xs p-1.5 rounded hover:bg-white/5 transition-colors text-left min-w-0"
              >
                <UilCircle size={8} className={`${statusDot[ep.status]} shrink-0`} />
                <span className="font-mono font-semibold text-zinc-200 truncate flex-1 min-w-0">{ep.hostname}</span>
                <span className="text-[10px] text-muted-foreground font-mono truncate hidden sm:inline max-w-[25%]">{ep.ip_address}</span>
                <span className="text-[10px] text-muted-foreground truncate hidden md:inline max-w-[15%]">{ep.os_name}</span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[10px] font-mono" style={{ color: ep.cpu_usage > 80 ? "#f87171" : ep.cpu_usage > 60 ? "#facc15" : "#4ade80" }}>
                    {Math.round(ep.cpu_usage)}%
                  </span>
                  <span className="text-zinc-700">|</span>
                  <span className="text-[10px] font-mono" style={{ color: ep.memory_usage > 80 ? "#f87171" : ep.memory_usage > 60 ? "#facc15" : "#4ade80" }}>
                    {Math.round(ep.memory_usage)}%
                  </span>
                </div>
                {ep.status === "critical" && <UilExclamationTriangle size={12} className="text-red-500" />}
              </button>
            ))}
            {endpoints.length > maxShow && (
              <div className="text-[10px] text-muted-foreground text-center pt-1">
                +{endpoints.length - maxShow} more endpoints
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
