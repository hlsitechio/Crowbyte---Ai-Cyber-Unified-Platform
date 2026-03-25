import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Monitor } from "@phosphor-icons/react";
import { DocHeader, FeatureList, CodeBlock } from "../components";

export function FleetSection() {
  return (
    <div className="space-y-6">
      <DocHeader icon={Monitor} title="Fleet Management" description="Endpoint monitoring, VPS agent swarm control, and device health tracking" status="beta" />

      <Card><CardHeader><CardTitle>How it works</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>Fleet Management tracks all your devices/endpoints via the <code className="text-primary">endpointService</code>.
            The current machine auto-registers with its hostname, OS, IP, and system metrics. Metrics auto-update every <strong className="text-foreground">30 seconds</strong>.</p>
          <p>The VPS Status card connects to the OpenClaw agent swarm at <code className="text-primary">your-vps-ip</code> (set via VITE_OPENCLAW_HOST) and shows
            which agents are online, latency, and active services.</p>
        </CardContent></Card>

      <Card><CardHeader><CardTitle>Endpoint Types</CardTitle></CardHeader>
        <CardContent>
          <CodeBlock>
            <div className="text-zinc-500"># endpointService.ts — device types</div>
            <div>&nbsp;</div>
            <div><span className="text-primary">workstation</span>  <span className="text-zinc-500">Local Kali machine (auto-detected)</span></div>
            <div><span className="text-primary">vps</span>          <span className="text-zinc-500">Remote VPS (OpenClaw swarm host)</span></div>
            <div><span className="text-primary">mobile</span>       <span className="text-zinc-500">Mobile device endpoint</span></div>
            <div><span className="text-primary">iot</span>          <span className="text-zinc-500">IoT device endpoint</span></div>
            <div><span className="text-primary">server</span>       <span className="text-zinc-500">Generic server endpoint</span></div>
            <div>&nbsp;</div>
            <div className="text-zinc-500"># VPS Agent Swarm (9 agents)</div>
            <div><span className="text-emerald-500">commander</span>  <span className="text-zinc-500">Central orchestrator</span></div>
            <div><span className="text-emerald-500">recon</span>      <span className="text-zinc-500">Reconnaissance specialist</span></div>
            <div><span className="text-emerald-500">hunter</span>     <span className="text-zinc-500">Bug bounty hunter</span></div>
            <div><span className="text-emerald-500">intel</span>      <span className="text-zinc-500">Threat intelligence</span></div>
            <div><span className="text-emerald-500">analyst</span>    <span className="text-zinc-500">Security analyst</span></div>
            <div><span className="text-emerald-500">sentinel</span>   <span className="text-zinc-500">Continuous monitoring</span></div>
            <div><span className="text-emerald-500">gpt</span>        <span className="text-zinc-500">General purpose assistant</span></div>
            <div><span className="text-emerald-500">obsidian</span>   <span className="text-zinc-500">Knowledge management</span></div>
            <div><span className="text-emerald-500">main</span>       <span className="text-zinc-500">Default/fallback agent</span></div>
          </CodeBlock>
        </CardContent></Card>

      <Card><CardHeader><CardTitle>Health Check Protocol</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>Endpoints report health via heartbeats every 30 seconds. The VPS health check connects via SSH
            to verify agent process status, disk space, and memory usage.</p>
          <CodeBlock>
            <div className="text-zinc-500"># Heartbeat payload (every 30s)</div>
            <div><span className="text-primary">hostname</span>   <span className="text-zinc-500">Machine hostname</span></div>
            <div><span className="text-primary">os</span>         <span className="text-zinc-500">Operating system</span></div>
            <div><span className="text-primary">ip</span>         <span className="text-zinc-500">Local IP address</span></div>
            <div><span className="text-primary">cpu_usage</span>  <span className="text-zinc-500">Current CPU %</span></div>
            <div><span className="text-primary">ram_usage</span>  <span className="text-zinc-500">Current RAM %</span></div>
            <div><span className="text-primary">disk_usage</span> <span className="text-zinc-500">Disk usage %</span></div>
            <div><span className="text-primary">uptime</span>     <span className="text-zinc-500">System uptime seconds</span></div>
            <div><span className="text-primary">status</span>     <span className="text-zinc-500">online | degraded | offline</span></div>
          </CodeBlock>
        </CardContent></Card>

      <Card><CardContent className="pt-6"><FeatureList items={[
        { text: "Endpoint registry with auto-detection of current device", status: "done" },
        { text: "Device metrics: hostname, OS, IP, CPU, RAM, disk", status: "done" },
        { text: "Auto-update metrics every 30 seconds (heartbeat)", status: "done" },
        { text: "VPS agent swarm status (9 agents)", status: "done" },
        { text: "Agent health: idle/busy/offline indicators", status: "done" },
        { text: "Add/remove endpoints manually via AddEndpointDialog", status: "done" },
        { text: "Search and filter by status", status: "done" },
        { text: "Latency monitoring to VPS", status: "done" },
        { text: "Remote command execution via SSH (planned)", status: "warn" },
      ]} /></CardContent></Card>
    </div>
  );
}
