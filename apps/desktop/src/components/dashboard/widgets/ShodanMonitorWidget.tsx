import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UilSearchAlt, UilArrowRight, UilGlobe, UilExclamationTriangle, UilShieldCheck } from "@iconscout/react-unicons";
import type { WidgetProps } from "../types";

interface ShodanAlert {
  ip: string;
  port: number;
  service: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  title: string;
  timestamp: string;
}

export default function ShodanMonitorWidget({ size }: WidgetProps) {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<ShodanAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [monitoredIPs, setMonitoredIPs] = useState(0);

  useEffect(() => {
    const fetch = async () => {
      try {
        const { supabase } = await import("@/lib/supabase");

        // Get monitored IPs from endpoints
        const { data: endpoints } = await supabase
          .from("endpoints")
          .select("ip_address, hostname")
          .limit(50);

        setMonitoredIPs(endpoints?.length || 0);

        // Get recent shodan findings stored in intel_reports or alerts
        const { data } = await supabase
          .from("alerts")
          .select("id, title, severity, affected_host, source_ip, alert_time, original_data")
          .or("source_type.eq.webhook,source_type.eq.manual")
          .order("alert_time", { ascending: false })
          .limit(size === "4x1" ? 8 : 4);

        if (data) {
          setAlerts(data.map((a: any) => ({
            ip: a.affected_host || a.source_ip || "unknown",
            port: a.original_data?.port || 0,
            service: a.original_data?.service || "unknown",
            severity: a.severity || "medium",
            title: a.title,
            timestamp: a.alert_time,
          })));
        }
      } catch {}
      setLoading(false);
    };
    fetch();
    const interval = setInterval(fetch, 60000);
    return () => clearInterval(interval);
  }, [size]);

  const sevColor: Record<string, string> = {
    critical: "text-red-500",
    high: "text-orange-500",
    medium: "text-amber-500",
    low: "text-blue-400",
    info: "text-zinc-400",
  };

  const sevDot: Record<string, string> = {
    critical: "bg-red-500",
    high: "bg-orange-500",
    medium: "bg-amber-500",
    low: "bg-blue-400",
    info: "bg-zinc-500",
  };

  return (
    <Card className="bg-card/50 backdrop-blur h-full overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <UilSearchAlt size={16} className="text-cyan-500" />
            Shodan Monitor
            <span className="text-[10px] text-muted-foreground ml-1">
              {monitoredIPs} IP{monitoredIPs !== 1 ? "s" : ""}
            </span>
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => navigate("/security-monitor")} className="text-xs h-6 px-2">
            View All <UilArrowRight size={12} className="ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-xs text-muted-foreground animate-pulse">Scanning exposure data...</div>
        ) : alerts.length === 0 ? (
          <div className="flex items-center gap-2 py-4 justify-center">
            <UilShieldCheck size={20} className="text-emerald-500" />
            <span className="text-xs text-emerald-500 font-semibold">No exposure alerts</span>
          </div>
        ) : (
          <div className="space-y-2">
            {alerts.map((alert, i) => (
              <div key={i} className="flex items-start gap-2 text-xs group min-w-0">
                <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${sevDot[alert.severity]}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`font-semibold truncate min-w-0 ${sevColor[alert.severity]}`}>
                      {alert.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5 min-w-0">
                    <UilGlobe size={10} className="shrink-0" />
                    <span className="font-mono truncate">{alert.ip}</span>
                    {alert.port > 0 && <span className="shrink-0">:{alert.port}</span>}
                    <span className="text-zinc-600 shrink-0">&middot;</span>
                    <span className="shrink-0">{new Date(alert.timestamp).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
