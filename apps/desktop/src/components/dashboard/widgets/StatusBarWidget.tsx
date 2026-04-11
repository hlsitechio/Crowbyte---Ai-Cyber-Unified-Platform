import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import type { WidgetProps } from "../types";

interface StatusItem {
  label: string;
  value: string;
  color: string;
  percent?: number; // 0-100 for the bar fill
}

function useStatusData(): StatusItem[] {
  const [items, setItems] = useState<StatusItem[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const stats: StatusItem[] = [];

      // Threat Level — based on raised alerts count
      try {
        const { supabase } = await import("@/lib/supabase");
        const { count: alertCount } = await supabase
          .from("alert_events")
          .select("*", { count: "exact", head: true })
          .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

        const level = (alertCount || 0) > 20 ? "HIGH" : (alertCount || 0) > 5 ? "MED" : "LOW";
        const levelColor = level === "HIGH" ? "#f87171" : level === "MED" ? "#fbbf24" : "#4ade80";
        const levelPercent = Math.min(100, ((alertCount || 0) / 30) * 100);
        stats.push({ label: "THREAT", value: level, color: levelColor, percent: levelPercent });
      } catch {
        stats.push({ label: "THREAT", value: "LOW", color: "#4ade80", percent: 10 });
      }

      // Alerts (24h)
      try {
        const { supabase } = await import("@/lib/supabase");
        const { count } = await supabase
          .from("alert_events")
          .select("*", { count: "exact", head: true })
          .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

        stats.push({ label: "ALERTS", value: String(count || 0), color: "#60a5fa", percent: Math.min(100, ((count || 0) / 50) * 100) });
      } catch {
        stats.push({ label: "ALERTS", value: "0", color: "#60a5fa", percent: 0 });
      }

      // CVEs tracked
      try {
        const { supabase } = await import("@/lib/supabase");
        const { count } = await supabase
          .from("cves")
          .select("*", { count: "exact", head: true });

        stats.push({ label: "CVEs", value: String(count || 0), color: "#c084fc", percent: Math.min(100, ((count || 0) / 500) * 100) });
      } catch {
        stats.push({ label: "CVEs", value: "0", color: "#c084fc", percent: 0 });
      }

      // Findings
      try {
        const { supabase } = await import("@/lib/supabase");
        const { count } = await supabase
          .from("findings")
          .select("*", { count: "exact", head: true });

        stats.push({ label: "FINDS", value: String(count || 0), color: "#f97316", percent: Math.min(100, ((count || 0) / 100) * 100) });
      } catch {
        stats.push({ label: "FINDS", value: "0", color: "#f97316", percent: 0 });
      }

      // Uptime — simple heartbeat
      const upHours = Math.floor((Date.now() - performance.timeOrigin) / 3600000);
      stats.push({
        label: "UPTIME",
        value: upHours > 0 ? `${upHours}h` : `${Math.floor((Date.now() - performance.timeOrigin) / 60000)}m`,
        color: "#22d3ee",
        percent: Math.min(100, upHours * 4),
      });

      setItems(stats);
    };

    fetchData();
    const interval = setInterval(fetchData, 60000); // Refresh every 60s
    return () => clearInterval(interval);
  }, []);

  return items;
}

export default function StatusBarWidget({ editMode }: WidgetProps) {
  const items = useStatusData();

  return (
    <Card className="border-primary/30 bg-card/50 backdrop-blur h-full">
      <CardContent className="p-3 h-full flex flex-col justify-between gap-2">
        {items.map((item) => (
          <div key={item.label} className="flex flex-col gap-1">
            {/* Label + Value */}
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">
                {item.label}
              </span>
              <span
                className="text-[11px] font-mono font-bold"
                style={{ color: item.color }}
              >
                {item.value}
              </span>
            </div>
            {/* Bar */}
            <div className="w-full h-1 rounded-full bg-white/5 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${item.percent || 0}%`,
                  backgroundColor: item.color,
                  opacity: 0.7,
                  boxShadow: `0 0 6px ${item.color}40`,
                }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
