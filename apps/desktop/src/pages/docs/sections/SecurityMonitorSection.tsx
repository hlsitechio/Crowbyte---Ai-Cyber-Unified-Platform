import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield } from "@phosphor-icons/react";
import { DocHeader, FeatureList, CodeBlock } from "../components";

export function SecurityMonitorSection() {
  return (
    <div className="space-y-6">
      <DocHeader icon={Shield} title="Security Monitor" description="AI-powered real-time security monitoring with GHOST agent analysis" status="beta" />

      <Card><CardHeader><CardTitle>How it works</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>The Security Monitor uses the <code className="text-primary">monitoringAgent</code> service (codename: <strong className="text-foreground">GHOST</strong>)
            to perform AI-driven security scans. It collects system metrics, running processes, and open connections via the
            <code className="text-primary mx-1">pcMonitor</code> service.</p>
          <p>Data is sent to DeepSeek V3.1 (via Ollama Cloud) which analyzes it for anomalies, suspicious processes, and security threats.
            The agent operates in a <strong className="text-foreground">10-iteration tool loop</strong> — each iteration can call
            different analysis tools before generating the final threat report.</p>
        </CardContent></Card>

      <Card><CardHeader><CardTitle>GHOST Agent Architecture</CardTitle></CardHeader>
        <CardContent>
          <CodeBlock>
            <div className="text-zinc-500"># monitoring-agent.ts — GHOST Security Agent</div>
            <div>&nbsp;</div>
            <div><span className="text-primary">Model</span>:      DeepSeek V3.1 (671B) via Ollama Cloud</div>
            <div><span className="text-primary">Loop</span>:       10 iterations max per analysis cycle</div>
            <div><span className="text-primary">Interval</span>:   300,000ms (5 minutes) when auto-monitoring</div>
            <div>&nbsp;</div>
            <div className="text-zinc-500"># Each iteration, GHOST can call:</div>
            <div><span className="text-emerald-500">get_system_metrics</span>   <span className="text-zinc-500">CPU, RAM, disk, network stats</span></div>
            <div><span className="text-emerald-500">get_processes</span>        <span className="text-zinc-500">Running processes with PID, user, CPU%</span></div>
            <div><span className="text-emerald-500">get_connections</span>      <span className="text-zinc-500">Active network connections (like netstat)</span></div>
            <div><span className="text-emerald-500">check_ports</span>          <span className="text-zinc-500">Listening ports and bound services</span></div>
            <div><span className="text-emerald-500">analyze_logs</span>         <span className="text-zinc-500">Recent syslog/auth.log entries</span></div>
            <div>&nbsp;</div>
            <div className="text-zinc-500"># Output: structured threat report</div>
            <div><span className="text-primary">alerts[]</span></div>
            <div>  <span className="text-red-500">severity</span>:     info | warning | critical</div>
            <div>  <span className="text-amber-500">category</span>:    process | network | system | auth</div>
            <div>  <span className="text-emerald-500">description</span>: What was detected</div>
            <div>  <span className="text-blue-500">recommendation</span>: What to do about it</div>
          </CodeBlock>
        </CardContent></Card>

      <Card><CardHeader><CardTitle>Metrics Collected</CardTitle></CardHeader>
        <CardContent>
          <CodeBlock>
            <div className="text-zinc-500"># systemMonitor.ts + pcMonitor.ts</div>
            <div>&nbsp;</div>
            <div><span className="text-primary">CPU</span>:     Usage %, load average, per-core stats</div>
            <div><span className="text-primary">RAM</span>:     Total, used, free, swap usage</div>
            <div><span className="text-primary">Disk</span>:    Mount points, usage %, read/write IO</div>
            <div><span className="text-primary">Network</span>: Interfaces, bytes in/out, active connections</div>
            <div><span className="text-primary">Procs</span>:   PID, user, CPU%, MEM%, command line</div>
            <div><span className="text-primary">Ports</span>:   Listening ports, bound addresses, service names</div>
          </CodeBlock>
        </CardContent></Card>

      <Card><CardContent className="pt-6"><FeatureList items={[
        { text: "AI threat analysis via DeepSeek V3.1 GHOST agent", status: "done" },
        { text: "10-iteration tool loop per analysis cycle", status: "done" },
        { text: "System metrics collection: CPU, RAM, disk, network", status: "done" },
        { text: "Process monitoring and anomaly detection", status: "done" },
        { text: "Auto-monitoring toggle (5-minute intervals)", status: "done" },
        { text: "On-demand manual scan button", status: "done" },
        { text: "Alert severity levels: info, warning, critical", status: "done" },
        { text: "AI-generated recommendations per alert", status: "done" },
        { text: "Incident memory (last 50 events)", status: "done" },
        { text: "Electron environment detection (features require desktop app)", status: "warn" },
      ]} /></CardContent></Card>
    </div>
  );
}
