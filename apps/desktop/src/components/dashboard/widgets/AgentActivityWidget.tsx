import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UilRobot, UilSync, UilShield, UilExclamationTriangle } from "@iconscout/react-unicons";
import { NumberTicker } from "@/components/ui/number-ticker";
import type { WidgetProps } from "../types";
import { sentinelCentral } from "@/services/sentinel-central";
import { useNavigate } from "react-router-dom";
import { IS_WEB } from "@/lib/platform";

interface AgentActivity {
  agent: string;
  icon: string;
  lastRun: string;
  status: "active" | "idle" | "error";
  metric: string;
  metricLabel: string;
}

export default function AgentActivityWidget(_props: WidgetProps) {
  if (IS_WEB) return null;
  const navigate = useNavigate();
  const [agents, setAgents] = useState<AgentActivity[]>([]);
  const [sentinelStats, setSentinelStats] = useState({ orgs: 0, decisions: 0, escalations: 0 });

  const fetchAgentActivity = async () => {
    try {
      const { supabase } = await import("@/lib/supabase");
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 3600000).toISOString();

      const [intelRes, alertsRes, reportsRes, cveRes] = await Promise.all([
        supabase.from("intel_reports").select("created_at", { count: "exact", head: false })
          .gte("created_at", oneDayAgo).order("created_at", { ascending: false }).limit(1),
        supabase.from("alerts").select("ingested_at", { count: "exact", head: false })
          .gte("ingested_at", oneDayAgo).order("ingested_at", { ascending: false }).limit(1),
        supabase.from("reports").select("created_at", { count: "exact", head: false })
          .gte("created_at", oneDayAgo).order("created_at", { ascending: false }).limit(1),
        supabase.from("cves").select("created_at", { count: "exact", head: false })
          .gte("created_at", oneDayAgo).order("created_at", { ascending: false }).limit(1),
      ]);

      const timeAgo = (iso: string | null) => {
        if (!iso) return "Never";
        const ms = now.getTime() - new Date(iso).getTime();
        const mins = Math.floor(ms / 60000);
        if (mins < 1) return "Just now";
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        return `${Math.floor(hrs / 24)}d ago`;
      };

      setAgents([
        { agent: "Sentinel", icon: "\u{1F6F0}\uFE0F", lastRun: timeAgo(intelRes.data?.[0]?.created_at || null), status: (intelRes.count || 0) > 0 ? "active" : "idle", metric: String(intelRes.count || 0), metricLabel: "reports/24h" },
        { agent: "Alerter", icon: "\u{1F6A8}", lastRun: timeAgo(alertsRes.data?.[0]?.ingested_at || null), status: (alertsRes.count || 0) > 0 ? "active" : "idle", metric: String(alertsRes.count || 0), metricLabel: "alerts/24h" },
        { agent: "Classifier", icon: "\u{1F9EC}", lastRun: timeAgo(cveRes.data?.[0]?.created_at || null), status: (cveRes.count || 0) > 0 ? "active" : "idle", metric: String(cveRes.count || 0), metricLabel: "CVEs/24h" },
        { agent: "Reporter", icon: "\u{1F4CA}", lastRun: timeAgo(reportsRes.data?.[0]?.created_at || null), status: (reportsRes.count || 0) > 0 ? "active" : "idle", metric: String(reportsRes.count || 0), metricLabel: "reports/24h" },
      ]);
    } catch (err) {
      console.error("Agent activity fetch failed:", err);
    }
  };

  useEffect(() => {
    fetchAgentActivity();
    const interval = setInterval(fetchAgentActivity, 120000);

    // Sentinel Central stats
    Promise.all([
      sentinelCentral.getOrgs(),
      sentinelCentral.getDecisions(100),
      sentinelCentral.getEscalations('pending'),
    ]).then(([orgs, decisions, escalations]) => {
      setSentinelStats({ orgs: orgs.length, decisions: decisions.length, escalations: escalations.length });
    }).catch(() => {});

    return () => clearInterval(interval);
  }, []);

  return (
    <Card className="bg-card/50 backdrop-blur h-full overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-emerald-500">
              <UilRobot size={20} />
              AI Agent Swarm
            </CardTitle>
            <CardDescription>VPS autonomous agents — Sentinel, Alerter, Classifier, Reporter</CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={fetchAgentActivity} className="h-8 px-3">
            <UilSync size={16} className="mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Sentinel Central quick stats */}
        <div
          className="flex items-center gap-2 p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800/50 cursor-pointer hover:border-zinc-700 transition-colors"
          onClick={() => navigate('/sentinel')}
        >
          <UilShield size={14} className="text-red-400 shrink-0" />
          <span className="text-[11px] text-zinc-400 flex-1">Sentinel Agent</span>
          <div className="flex items-center gap-3 text-[11px] font-mono">
            <span className="text-zinc-300">{sentinelStats.orgs} <span className="text-zinc-600">orgs</span></span>
            <span className="text-emerald-400">{sentinelStats.decisions} <span className="text-zinc-600">decisions</span></span>
            {sentinelStats.escalations > 0 && (
              <Badge
                className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[9px] px-1.5 py-0 cursor-pointer animate-pulse"
                onClick={e => { e.stopPropagation(); navigate('/alert-center'); }}
              >
                <UilExclamationTriangle size={9} className="mr-0.5" />
                {sentinelStats.escalations} pending
              </Badge>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {agents.map(agent => (
            <div key={agent.agent} className="rounded-lg p-3 ring-1 ring-white/[0.06] transition-all hover:bg-primary/5 hover:ring-white/[0.1] min-w-0">
              <div className="flex items-center justify-between mb-2 min-w-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-sm shrink-0">{agent.icon}</span>
                  <span className="font-semibold text-xs text-zinc-100 truncate">{agent.agent}</span>
                </div>
                <div className={`h-2 w-2 rounded-full ${
                  agent.status === "active" ? "bg-emerald-500 animate-pulse" :
                  agent.status === "error" ? "bg-red-500" : "bg-zinc-600"
                }`} />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Last run</span>
                  <span className="text-xs font-mono text-zinc-300">{agent.lastRun}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{agent.metricLabel}</span>
                  <span className={`text-sm font-bold ${parseInt(agent.metric) > 0 ? "text-emerald-400" : "text-zinc-500"}`}>
                    <NumberTicker value={parseInt(agent.metric) || 0} className="text-inherit tabular-nums" />
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
        {agents.length === 0 && (
          <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
            <UilSync size={16} className="mr-2 animate-spin" />
            Loading agent activity...
          </div>
        )}
      </CardContent>
    </Card>
  );
}
