import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UilChartBar } from "@iconscout/react-unicons";
import { DocHeader, FeatureList, CodeBlock } from "../components";

export function AnalyticsSection() {
  return (
    <div className="space-y-6">
      <DocHeader icon={UilChartBar} title="Analytics" description="Usage metrics, CVE statistics, API health, and Supabase dashboard" status="ready" />

      <Card><CardHeader><CardTitle>How it works</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>The Analytics page provides a comprehensive dashboard with multiple data sources. It combines
            tool usage statistics from <code className="text-primary">analyticsService</code>, CVE library stats from
            the <code className="text-primary">cves</code> table, and infrastructure health from the
            <code className="text-primary">SupabaseHealthDashboard</code> component.</p>
          <p>Charts are rendered with Recharts: LineChart (activity timeline), AreaChart (trends), BarChart (tool usage),
            PieChart (CVE severity distribution), RadarChart (capability coverage).</p>
        </CardContent></Card>

      <Card><CardHeader><CardTitle>Dashboard Tabs</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { name: "Overview", content: "Activity timeline, tool usage stats, API health cards, recent activity log" },
              { name: "CVE Intelligence", content: "CVE library stats (total, critical, high, medium, low), severity distribution PieChart, recent critical CVEs list" },
              { name: "Infrastructure", content: "Supabase health dashboard — table row counts, connection status, RLS status, storage usage" },
              { name: "AI Usage", content: "Model usage breakdown, token consumption, provider availability, cost tracking" },
            ].map((tab) => (
              <div key={tab.name} className="p-3 rounded-lg border border-border/50 bg-card/30">
                <div className="text-sm font-medium mb-1">{tab.name}</div>
                <div className="text-xs text-muted-foreground">{tab.content}</div>
              </div>
            ))}
          </div>
        </CardContent></Card>

      <Card><CardHeader><CardTitle>Analytics Service</CardTitle></CardHeader>
        <CardContent>
          <CodeBlock>
            <div className="text-zinc-500"># analytics.ts — Service API</div>
            <div>&nbsp;</div>
            <div><span className="text-emerald-500">trackToolUse(tool, target)</span>  <span className="text-zinc-500">Record tool execution</span></div>
            <div><span className="text-emerald-500">trackApiCall(provider, tokens)</span> <span className="text-zinc-500">Record API usage</span></div>
            <div><span className="text-emerald-500">getToolStats()</span>             <span className="text-zinc-500">Tool usage counts</span></div>
            <div><span className="text-emerald-500">getActivityLog(limit)</span>      <span className="text-zinc-500">Recent activity entries</span></div>
            <div><span className="text-emerald-500">getApiUsageStats()</span>         <span className="text-zinc-500">Provider breakdown</span></div>
            <div>&nbsp;</div>
            <div className="text-zinc-500"># ActivityLog interface</div>
            <div><span className="text-primary">action</span>     <span className="text-zinc-500">tool_use | api_call | scan | search</span></div>
            <div><span className="text-primary">tool</span>       <span className="text-zinc-500">Tool/provider name</span></div>
            <div><span className="text-primary">target</span>     <span className="text-zinc-500">Target domain/IP</span></div>
            <div><span className="text-primary">timestamp</span>  <span className="text-zinc-500">ISO timestamp</span></div>
            <div><span className="text-primary">success</span>    <span className="text-zinc-500">Boolean</span></div>
          </CodeBlock>
        </CardContent></Card>

      <Card><CardContent className="pt-6"><FeatureList items={[
        { text: "Tool usage statistics with execution counts", status: "done" },
        { text: "CVE library stats (total, by severity, exploitable)", status: "done" },
        { text: "Supabase health dashboard (table counts, connections, RLS)", status: "done" },
        { text: "Activity timeline with LineChart", status: "done" },
        { text: "Severity distribution PieChart", status: "done" },
        { text: "RadarChart for capability coverage", status: "done" },
        { text: "API provider usage breakdown", status: "done" },
        { text: "Recent activity log with timestamps", status: "done" },
        { text: "Refresh button for live data", status: "done" },
      ]} /></CardContent></Card>
    </div>
  );
}
