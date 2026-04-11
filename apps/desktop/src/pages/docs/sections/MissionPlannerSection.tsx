import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UilFocusTarget } from "@iconscout/react-unicons";
import { DocHeader, FeatureList, CodeBlock } from "../components";

export function MissionPlannerSection() {
  return (
    <div className="space-y-6">
      <DocHeader icon={UilFocusTarget} title="Mission Planner" description="Phase-based strategic planning for offensive and defensive operations" status="beta" />

      <Card><CardHeader><CardTitle>How it works</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>The Mission Planner creates structured operation plans with phases, tasks, risk assessments, and AI feasibility scoring.
            Plans are stored in <code className="text-primary">localStorage</code> (Supabase migration planned).
            Each plan has a type, objective, target scope, timeline, and multiple phases with nested tasks.</p>
          <p>You can create plans from scratch or use one of four built-in templates. The AI Planner generates
            feasibility scores, risk scores, success probability, and recommendations.</p>
        </CardContent></Card>

      <Card><CardHeader><CardTitle>Plan Templates</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { name: "Web Application Pentest", phases: "Reconnaissance (8h) -> Vuln Scanning (4h) -> Exploitation (16h) -> Post-Exploitation (8h) -> Reporting (8h)", type: "pentest" },
              { name: "Network Infrastructure Attack", phases: "External Recon (16h) -> Initial Access (12h) -> Lateral Movement (16h) -> Priv Esc (8h) -> Persistence (8h) -> Exfil (8h)", type: "offensive" },
              { name: "Incident Response Plan", phases: "Detection & Analysis (2h) -> Containment (4h) -> Eradication (8h) -> Recovery (8h) -> Post-Incident Review (4h)", type: "defensive" },
              { name: "Cloud Security Audit", phases: "Asset Discovery (8h) -> Config Review (16h) -> Access Control Audit (8h) -> Vuln Assessment (16h) -> Remediation (8h)", type: "defensive" },
            ].map((t) => (
              <div key={t.name} className="p-3 rounded-lg border border-border/50 bg-card/30">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium">{t.name}</span>
                  <Badge variant="secondary" className="text-[9px]">{t.type}</Badge>
                </div>
                <div className="text-xs text-muted-foreground font-mono">{t.phases}</div>
              </div>
            ))}
          </div>
        </CardContent></Card>

      <Card><CardHeader><CardTitle>Data Model</CardTitle></CardHeader>
        <CardContent>
          <CodeBlock>
            <div className="text-zinc-500"># MissionPlan</div>
            <div><span className="text-primary">type</span>:       offensive | defensive | pentest | incident_response</div>
            <div><span className="text-primary">status</span>:     draft | planning | approved | active | completed | failed</div>
            <div><span className="text-primary">objective</span>:  What we're trying to achieve</div>
            <div><span className="text-primary">targetScope</span>: UilFocusTarget systems/networks in scope</div>
            <div>&nbsp;</div>
            <div className="text-zinc-500"># Phase (nested)</div>
            <div><span className="text-primary">name</span>, <span className="text-primary">description</span>, <span className="text-primary">duration</span> (hours), <span className="text-primary">dependencies</span>, <span className="text-primary">status</span></div>
            <div>&nbsp;</div>
            <div className="text-zinc-500"># Task (nested under Phase)</div>
            <div><span className="text-primary">name</span>, <span className="text-primary">description</span>, <span className="text-primary">assignee</span>, <span className="text-primary">priority</span> (low/med/high/critical), <span className="text-primary">status</span></div>
            <div>&nbsp;</div>
            <div className="text-zinc-500"># Risk</div>
            <div><span className="text-primary">severity</span>, <span className="text-primary">probability</span> (0-100), <span className="text-primary">impact</span> (0-100), <span className="text-primary">mitigation</span></div>
            <div>&nbsp;</div>
            <div className="text-zinc-500"># AI Assessment</div>
            <div><span className="text-primary">feasibilityScore</span>, <span className="text-primary">riskScore</span>, <span className="text-primary">successProbability</span>, <span className="text-primary">recommendations</span>[]</div>
          </CodeBlock>
        </CardContent></Card>

      <Card><CardContent className="pt-6"><FeatureList items={[
        { text: "Create from template or blank", status: "done" },
        { text: "Phase-based planning with duration estimates", status: "done" },
        { text: "Task checklists per phase with assignee and priority", status: "done" },
        { text: "Risk registry with severity, probability, impact, mitigation", status: "done" },
        { text: "Success criteria and failure scenario documentation", status: "done" },
        { text: "Timeline with start/end dates", status: "done" },
        { text: "AI feasibility assessment with recommendations", status: "done" },
        { text: "Status progression: draft -> planning -> approved -> active -> completed", status: "done" },
        { text: "Stored in localStorage (Supabase migration planned)", status: "warn" },
      ]} /></CardContent></Card>
    </div>
  );
}
