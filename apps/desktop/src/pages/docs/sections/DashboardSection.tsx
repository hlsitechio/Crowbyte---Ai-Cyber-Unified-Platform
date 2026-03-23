import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity } from "lucide-react";
import { DocHeader, FeatureList, CodeBlock } from "../components";

export function DashboardSection() {
  return (
    <div className="space-y-6">
      <DocHeader icon={Activity} title="Dashboard" description="Central command overview with real-time system metrics, AI analysis, and quick actions" status="ready" />

      <Card><CardHeader><CardTitle>What it does</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>The Dashboard is your home screen. It shows real-time system health (CPU, memory, disk, network) pulled from the local Kali machine,
            IP status (public IP, VPN detection), recent CVE alerts from the Supabase database, and security news via RSS feeds.</p>
          <p>The <strong className="text-foreground">CommandCenterHeader</strong> card at the top provides AI-powered security analysis
            using the OpenClaw service and an auto-monitoring toggle that scans every 5 minutes.</p>
        </CardContent></Card>

      <Card><CardHeader><CardTitle>Services Architecture</CardTitle></CardHeader>
        <CardContent>
          <CodeBlock>
            <div className="text-zinc-500"># Dashboard pulls from multiple services</div>
            <div>&nbsp;</div>
            <div><span className="text-primary">systemMonitor</span>     <span className="text-zinc-500">CPU, RAM, disk, network — polled via Electron IPC</span></div>
            <div><span className="text-primary">ip-status.ts</span>      <span className="text-zinc-500">Public IP, VPN detection, geolocation (ipify + ipapi)</span></div>
            <div><span className="text-primary">pc-monitor.ts</span>     <span className="text-zinc-500">Process list, open connections, system info</span></div>
            <div><span className="text-primary">inoreader.ts</span>      <span className="text-zinc-500">RSS feeds — security news aggregation</span></div>
            <div><span className="text-primary">openclaw.ts</span>       <span className="text-zinc-500">VPS health check, agent status</span></div>
            <div><span className="text-primary">endpointService</span>   <span className="text-zinc-500">Fleet device registry (auto-register on mount)</span></div>
            <div>&nbsp;</div>
            <div className="text-zinc-500"># 4 Supabase Realtime channels for live updates</div>
            <div><span className="text-green-400">cves</span>             <span className="text-zinc-500">New CVE alerts</span></div>
            <div><span className="text-green-400">knowledge_base</span>   <span className="text-zinc-500">New KB entries</span></div>
            <div><span className="text-green-400">red_team_ops</span>     <span className="text-zinc-500">Operation updates</span></div>
            <div><span className="text-green-400">bookmarks</span>        <span className="text-zinc-500">New bookmarks</span></div>
          </CodeBlock>
        </CardContent></Card>

      <Card><CardHeader><CardTitle>Features</CardTitle></CardHeader>
        <CardContent><FeatureList items={[
          { text: "Real-time system metrics (CPU/RAM/disk/network) via systemMonitor service", status: "done" },
          { text: "IP status card — public IP, VPN detection, geolocation via ipify + ipapi.co", status: "done" },
          { text: "OpenClaw connection status — VPS agent swarm health with latency", status: "done" },
          { text: "Recent CVE alerts from Supabase (severity-colored, clickable)", status: "done" },
          { text: "Security news feed via Inoreader RSS integration", status: "done" },
          { text: "Quick action buttons — navigate to Chat, Terminal, Red Team, etc.", status: "done" },
          { text: "Auto-monitoring toggle (5-minute interval AI scans via GHOST agent)", status: "done" },
          { text: "Endpoint registry — tracked devices from Fleet with auto-registration", status: "done" },
          { text: "CommandCenterHeader — AI threat summary from OpenClaw", status: "done" },
          { text: "4 Supabase Realtime channels for live data sync", status: "done" },
        ]} /></CardContent></Card>

      <Card><CardHeader><CardTitle>Auto-Monitoring</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>When auto-monitoring is enabled, the GHOST security agent runs every 5 minutes. It collects system metrics,
            running processes, and open connections, then sends them to DeepSeek V3.1 (via Ollama Cloud) for AI threat analysis.
            Alerts are categorized as info, warning, or critical with actionable recommendations.</p>
          <p>The monitoring service uses the <code className="text-primary">monitoringAgent</code> which operates in a 10-iteration
            tool loop — each iteration can call different analysis tools before generating the final report.</p>
        </CardContent></Card>
    </div>
  );
}
