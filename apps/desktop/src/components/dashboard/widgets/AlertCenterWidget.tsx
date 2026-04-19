import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UilBell, UilArrowRight, UilExclamationTriangle, UilShieldCheck } from "@iconscout/react-unicons";
import type { WidgetProps } from "../types";

interface AlertSummary {
  total: number;
  newAlerts: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  recentAlerts: {
    id: string;
    title: string;
    severity: string;
    source_type: string;
    status: string;
    alert_time: string;
    affected_host?: string;
  }[];
}

export default function AlertCenterWidget({ size }: WidgetProps) {
  const navigate = useNavigate();
  const [data, setData] = useState<AlertSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const { supabase } = await import("@/lib/supabase");

        const { data: alerts } = await supabase
          .from("alerts")
          .select("id, title, severity, source_type, status, alert_time, affected_host")
          .order("alert_time", { ascending: false })
          .limit(200);

        if (alerts) {
          const newAlerts = alerts.filter((a: any) => a.status === "new");
          setData({
            total: alerts.length,
            newAlerts: newAlerts.length,
            critical: alerts.filter((a: any) => a.severity === "critical").length,
            high: alerts.filter((a: any) => a.severity === "high").length,
            medium: alerts.filter((a: any) => a.severity === "medium").length,
            low: alerts.filter((a: any) => a.severity === "low").length,
            recentAlerts: (size === "4x1" ? alerts.slice(0, 6) : alerts.slice(0, 4)) as any[],
          });
        }
      } catch { /* empty */ }
      setLoading(false);
    };
    fetch();
    const interval = setInterval(fetch, 30000);
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

  const sevBadge: Record<string, string> = {
    critical: "bg-red-500/20 text-red-400",
    high: "bg-orange-500/20 text-orange-400",
    medium: "bg-amber-500/20 text-amber-400",
    low: "bg-blue-500/20 text-blue-400",
  };

  return (
    <Card className="bg-card/50 backdrop-blur h-full overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <UilBell size={16} className="text-amber-500" />
            Alert Center
            {data && data.newAlerts > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] font-bold bg-red-500/20 text-red-400 rounded-full">
                {data.newAlerts} new
              </span>
            )}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => navigate("/alert-center")} className="text-xs h-6 px-2">
            Open <UilArrowRight size={12} className="ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-xs text-muted-foreground animate-pulse">Loading alerts...</div>
        ) : !data || data.total === 0 ? (
          <div className="flex items-center gap-2 py-4 justify-center">
            <UilShieldCheck size={20} className="text-emerald-500" />
            <span className="text-xs text-emerald-500 font-semibold">All clear — no alerts</span>
          </div>
        ) : (
          <>
            {/* Severity breakdown bar */}
            <div className="flex items-center gap-2 mb-3 flex-wrap min-w-0">
              {data.critical > 0 && (
                <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded border ${sevBadge.critical}`}>
                  {data.critical} CRIT
                </span>
              )}
              {data.high > 0 && (
                <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded border ${sevBadge.high}`}>
                  {data.high} HIGH
                </span>
              )}
              {data.medium > 0 && (
                <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded border ${sevBadge.medium}`}>
                  {data.medium} MED
                </span>
              )}
              {data.low > 0 && (
                <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded border ${sevBadge.low}`}>
                  {data.low} LOW
                </span>
              )}
            </div>

            {/* Recent alerts list */}
            <div className="space-y-1.5">
              {data.recentAlerts.map((alert) => {
                const timeAgo = Math.floor((Date.now() - new Date(alert.alert_time).getTime()) / 3600000);
                const timeText = timeAgo < 1 ? "just now" : timeAgo < 24 ? `${timeAgo}h ago` : `${Math.floor(timeAgo / 24)}d ago`;

                return (
                  <button
                    key={alert.id}
                    onClick={() => navigate("/alert-center")}
                    className="w-full flex items-start gap-2 text-xs p-1.5 rounded hover:bg-white/5 transition-colors text-left min-w-0"
                  >
                    <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${sevDot[alert.severity] || "bg-zinc-500"}`} />
                    <div className="flex-1 min-w-0">
                      <span className={`font-semibold truncate block min-w-0 ${sevColor[alert.severity] || "text-zinc-400"}`}>
                        {alert.title}
                      </span>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                        <span className="uppercase">{alert.source_type}</span>
                        {alert.affected_host && (
                          <>
                            <span className="text-zinc-700">&middot;</span>
                            <span className="font-mono">{alert.affected_host}</span>
                          </>
                        )}
                        <span className="text-zinc-700">&middot;</span>
                        <span>{timeText}</span>
                      </div>
                    </div>
                    {alert.status === "new" && (
                      <span className="text-[9px] px-1 py-0.5 bg-blue-500/20 text-blue-400 rounded font-bold shrink-0">NEW</span>
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
