import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UilChartBar, UilArrowRight, UilChartGrowth, UilClock } from "@iconscout/react-unicons";
import { analyticsService } from "@/services/analytics";
import type { WidgetProps } from "../types";

interface QuickStats {
  todayEvents: number;
  topServices: { name: string; count: number; avgMs: number }[];
  weekSummary: Record<string, number>;
}

export default function AnalyticsWidget({ size }: WidgetProps) {
  const navigate = useNavigate();
  const [stats, setStats] = useState<QuickStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const [todayUsage, weekData] = await Promise.all([
          analyticsService.getTodayUsageStats(),
          analyticsService.getActivitySummary(7),
        ]);

        const todayEvents = todayUsage.reduce((sum, s) => sum + s.call_count, 0);
        const topServices = todayUsage
          .sort((a, b) => b.call_count - a.call_count)
          .slice(0, size === "4x1" ? 6 : 4)
          .map(s => ({
            name: s.service_name,
            count: s.call_count,
            avgMs: s.avg_response_time_ms,
          }));

        setStats({ todayEvents, topServices, weekSummary: weekData });
      } catch { /* empty */ }
      setLoading(false);
    };
    fetch();
    const interval = setInterval(fetch, 60000);
    return () => clearInterval(interval);
  }, [size]);

  // Mini sparkline from week data
  const weekValues = stats?.weekSummary ? Object.values(stats.weekSummary) : [];
  const maxVal = Math.max(...weekValues, 1);
  const weekTotal = weekValues.reduce((a, b) => a + b, 0);

  return (
    <Card className="bg-card/50 backdrop-blur h-full overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <UilChartBar size={16} className="text-violet-500" />
            Analytics
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => navigate("/analytics")} className="text-xs h-6 px-2">
            Details <UilArrowRight size={12} className="ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-xs text-muted-foreground animate-pulse">Loading analytics...</div>
        ) : !stats ? (
          <div className="text-xs text-muted-foreground text-center py-4">No analytics data yet</div>
        ) : (
          <div className="space-y-3">
            {/* Summary row */}
            <div className="flex items-center gap-3 min-w-0 flex-wrap">
              <div className="flex items-center gap-1.5">
                <UilChartGrowth size={14} className="text-emerald-500" />
                <span className="text-lg font-bold text-white">{stats.todayEvents}</span>
                <span className="text-[10px] text-muted-foreground">today</span>
              </div>
              <div className="flex items-center gap-1.5">
                <UilClock size={14} className="text-blue-400" />
                <span className="text-lg font-bold text-white">{weekTotal}</span>
                <span className="text-[10px] text-muted-foreground">this week</span>
              </div>

              {/* Mini bar chart */}
              {weekValues.length > 0 && (
                <div className="flex items-end gap-0.5 h-5 ml-auto">
                  {weekValues.map((val, i) => (
                    <div
                      key={i}
                      className="w-2 bg-violet-500/60 rounded-t-sm"
                      style={{ height: `${Math.max((val / maxVal) * 100, 8)}%` }}
                      title={`${Object.keys(stats.weekSummary)[i]}: ${val} events`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Top services */}
            {stats.topServices.length > 0 && (
              <div className="space-y-1">
                <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Top Services Today</div>
                {stats.topServices.map((svc, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs min-w-0">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-zinc-300 truncate min-w-0">{svc.name}</span>
                        <span className="text-[10px] text-muted-foreground">{svc.count} calls</span>
                      </div>
                      {/* Usage bar */}
                      <div className="h-1 bg-muted rounded-full overflow-hidden mt-0.5">
                        <div
                          className="h-full bg-violet-500/60 rounded-full"
                          style={{ width: `${(svc.count / (stats.topServices[0]?.count || 1)) * 100}%` }}
                        />
                      </div>
                    </div>
                    {svc.avgMs > 0 && (
                      <span className="text-[10px] font-mono text-muted-foreground shrink-0">{svc.avgMs}ms</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
