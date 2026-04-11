import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UilMonitor, UilHeartRate, UilRobot, UilCheckCircle } from "@iconscout/react-unicons";
function Feature({ text }: { text: string }) {
  return (
    <li className="text-sm flex items-start gap-2 text-emerald-500">
      <UilCheckCircle size={14} className="mt-0.5 shrink-0" /> {text}
    </li>
  );
}

export function FleetSection() {
  return (
    <div className="space-y-6">
      <div className="space-y-2 mb-6">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <UilMonitor size={32} className="text-primary" />
          Fleet Management
          <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20 text-[9px]">BETA</Badge>
        </h1>
        <p className="text-muted-foreground">UilMonitor endpoints, VPS agents, and infrastructure health</p>
        <div className="h-px bg-border" />
      </div>

      <Card className="border-primary/30 bg-card/50 backdrop-blur">
        <CardHeader><CardTitle className="flex items-center gap-2"><UilHeartRate size={20} className="text-blue-500" /> Endpoint Monitoring</CardTitle></CardHeader>
        <CardContent>
          <ul className="space-y-1.5">
            <Feature text="Register workstations, VPS instances, and mobile devices" />
            <Feature text="Real-time health checks (CPU, memory, disk, uptime)" />
            <Feature text="Online/offline status with last-seen timestamps" />
            <Feature text="Device type classification and tagging" />
            <Feature text="Network connectivity monitoring" />
          </ul>
        </CardContent>
      </Card>

      <Card className="border-primary/30 bg-card/50 backdrop-blur">
        <CardHeader><CardTitle className="flex items-center gap-2"><UilRobot size={20} className="text-emerald-500" /> AI Agent Status</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            UilMonitor your deployed AI agents across your infrastructure. Track which agents are active,
            their current tasks, resource usage, and performance metrics.
          </p>
          <ul className="space-y-1.5">
            <Feature text="Agent health and status overview" />
            <Feature text="Task queue monitoring" />
            <Feature text="Resource consumption per agent" />
            <Feature text="Agent logs and error tracking" />
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
