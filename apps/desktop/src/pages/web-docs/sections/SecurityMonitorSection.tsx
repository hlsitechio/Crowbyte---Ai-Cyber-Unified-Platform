import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UilShield, UilBrain, UilHeartRate, UilCheckCircle } from "@iconscout/react-unicons";
function Feature({ text }: { text: string }) {
  return (
    <li className="text-sm flex items-start gap-2 text-emerald-500">
      <UilCheckCircle size={14} className="mt-0.5 shrink-0" /> {text}
    </li>
  );
}

export function SecurityMonitorSection() {
  return (
    <div className="space-y-6">
      <div className="space-y-2 mb-6">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <UilShield size={32} className="text-primary" />
          Security Monitor
          <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20 text-[9px]">BETA</Badge>
        </h1>
        <p className="text-muted-foreground">AI-powered security monitoring and threat detection</p>
        <div className="h-px bg-border" />
      </div>

      <Card className="border-primary/30 bg-card/50 backdrop-blur">
        <CardHeader><CardTitle className="flex items-center gap-2"><UilBrain size={20} className="text-blue-500" /> AI Analysis</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            The Security Monitor uses AI to continuously analyze system metrics, network activity,
            and process behavior — identifying potential threats and anomalies automatically.
          </p>
          <ul className="space-y-1.5">
            <Feature text="AI-driven anomaly detection across system metrics" />
            <Feature text="Process monitoring for suspicious activity" />
            <Feature text="Network traffic analysis" />
            <Feature text="Automated threat classification" />
            <Feature text="Real-time alerting with severity levels" />
          </ul>
        </CardContent>
      </Card>

      <Card className="border-primary/30 bg-card/50 backdrop-blur">
        <CardHeader><CardTitle className="flex items-center gap-2"><UilHeartRate size={20} className="text-emerald-500" /> System Metrics</CardTitle></CardHeader>
        <CardContent>
          <ul className="space-y-1.5">
            <Feature text="CPU, memory, disk usage monitoring" />
            <Feature text="Network interface statistics" />
            <Feature text="Active connection tracking" />
            <Feature text="Process list with resource consumption" />
            <Feature text="Historical data with trend visualization" />
          </ul>
        </CardContent>
      </Card>

      <Card className="border-amber-500/20 bg-amber-500/5">
        <CardContent className="pt-6">
          <div className="text-sm text-muted-foreground">
            <strong className="text-amber-500">Desktop Only:</strong> Full monitoring capabilities require the desktop app.
            Web users can view monitoring dashboards and alert history.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
