import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UilFocusTarget, UilListOlAlt, UilCheckCircle } from "@iconscout/react-unicons";
function Feature({ text }: { text: string }) {
  return (
    <li className="text-sm flex items-start gap-2 text-emerald-500">
      <UilCheckCircle size={14} className="mt-0.5 shrink-0" /> {text}
    </li>
  );
}

export function MissionPlannerSection() {
  return (
    <div className="space-y-6">
      <div className="space-y-2 mb-6">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <UilFocusTarget size={32} className="text-primary" />
          Mission Planner
          <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20 text-[9px]">BETA</Badge>
        </h1>
        <p className="text-muted-foreground">Phase-based operation planning and execution tracking</p>
        <div className="h-px bg-border" />
      </div>

      <Card className="border-primary/30 bg-card/50 backdrop-blur">
        <CardHeader><CardTitle className="flex items-center gap-2"><UilListOlAlt size={20} className="text-blue-500" /> Operation Phases</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Plan security engagements with structured phases. Each phase has objectives, tasks,
            and success criteria — keeping your operations organized and on track.
          </p>
          <div className="grid gap-2">
            {[
              { phase: "1. Reconnaissance", desc: "Asset discovery, subdomain enumeration, technology fingerprinting" },
              { phase: "2. Scanning", desc: "Port scanning, vulnerability scanning, web crawling" },
              { phase: "3. Enumeration", desc: "Service enumeration, user discovery, directory bruteforcing" },
              { phase: "4. Exploitation", desc: "Vulnerability exploitation, proof of concept development" },
              { phase: "5. Post-Exploitation", desc: "Privilege escalation, lateral movement, data collection" },
              { phase: "6. Reporting", desc: "Finding documentation, impact assessment, remediation advice" },
            ].map((p) => (
              <div key={p.phase} className="p-2.5 rounded-lg border border-border/50 bg-card/30">
                <div className="text-sm font-medium text-foreground">{p.phase}</div>
                <div className="text-xs text-muted-foreground">{p.desc}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-primary/30 bg-card/50 backdrop-blur">
        <CardHeader><CardTitle>Features</CardTitle></CardHeader>
        <CardContent>
          <ul className="space-y-1.5">
            <Feature text="Drag-and-drop task management" />
            <Feature text="Phase progress tracking with completion percentages" />
            <Feature text="Task assignment and priority levels" />
            <Feature text="Notes and attachments per phase" />
            <Feature text="Timeline visualization" />
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
