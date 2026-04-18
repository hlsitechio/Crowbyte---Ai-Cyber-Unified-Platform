import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UilCrosshair } from "@iconscout/react-unicons";
import { DocHeader, FeatureList, CodeBlock } from "../components";

export function RedTeamSection() {
  return (
    <div className="space-y-6">
      <DocHeader icon={UilCrosshair} title="Red Team" description="Offensive security operation tracking with findings management and AI analysis" status="ready" />

      <Card><CardHeader><CardTitle>How it works</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>The Red Team page manages offensive security operations stored in Supabase. Each operation has a target, type
            (pentest, red team, bug bounty, social engineering), status, and associated findings.</p>
          <p>Findings are linked to operations and tracked with severity (critical/high/medium/low/info), category,
            and detailed descriptions. Stats cards show total operations, active operations, and finding breakdowns.</p>
        </CardContent></Card>

      <Card><CardHeader><CardTitle>Operation Lifecycle</CardTitle></CardHeader>
        <CardContent>
          <CodeBlock>
            <div className="text-zinc-500"># Operation lifecycle (red-team.ts service)</div>
            <div>&nbsp;</div>
            <div><span className="text-blue-500">planning</span>  <span className="text-zinc-500">→</span> <span className="text-amber-500">active</span> <span className="text-zinc-500">→</span> <span className="text-emerald-500">completed</span></div>
            <div>    <span className="text-zinc-500">↓</span></div>
            <div>  <span className="text-orange-500">paused</span> <span className="text-zinc-500">(can resume to active)</span></div>
            <div>&nbsp;</div>
            <div className="text-zinc-500"># Operation types</div>
            <div><span className="text-primary">pentest</span>            <span className="text-zinc-500">Standard penetration test</span></div>
            <div><span className="text-primary">red_team</span>           <span className="text-zinc-500">Full adversary simulation</span></div>
            <div><span className="text-primary">bug_bounty</span>         <span className="text-zinc-500">UilBug bounty program engagement</span></div>
            <div><span className="text-primary">social_engineering</span> <span className="text-zinc-500">Phishing/SE campaigns</span></div>
            <div>&nbsp;</div>
            <div className="text-zinc-500"># Finding schema (embedded in operation)</div>
            <div><span className="text-primary">title</span>      <span className="text-zinc-500">Finding name</span></div>
            <div><span className="text-primary">severity</span>   <span className="text-zinc-500">critical | high | medium | low | info</span></div>
            <div><span className="text-primary">category</span>   <span className="text-zinc-500">web, network, auth, config, crypto, etc.</span></div>
            <div><span className="text-primary">description</span> <span className="text-zinc-500">Detailed finding with evidence</span></div>
            <div><span className="text-primary">evidence</span>   <span className="text-zinc-500">PoC, screenshots, request/response</span></div>
            <div><span className="text-primary">remediation</span> <span className="text-zinc-500">Fix recommendation</span></div>
          </CodeBlock>
        </CardContent></Card>

      <Card><CardHeader><CardTitle>AI Integration</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>The <code className="text-primary">hybrid-redteam-agent.ts</code> provides AI-powered analysis for red team operations.
          <FeatureList items={[
            { text: "Analyze findings for severity assessment and CVSS scoring", status: "done" },
            { text: "Suggest attack chains from discovered vulns", status: "done" },
            { text: "Generate remediation reports per finding", status: "done" },
            { text: "Auto-categorize findings by CWE/OWASP", status: "done" },
            { text: "Timeline view of operation progress", status: "done" },
          ]} />
        </CardContent></Card>

      <Card><CardHeader><CardTitle>Supabase Schema: red_team_ops</CardTitle></CardHeader>
        <CardContent>
          <CodeBlock>
            <div><span className="text-primary">name</span>       <span className="text-zinc-500">TEXT     — Operation name</span></div>
            <div><span className="text-primary">target</span>     <span className="text-zinc-500">TEXT     — Target domain/system</span></div>
            <div><span className="text-primary">type</span>       <span className="text-zinc-500">TEXT     — pentest | red_team | bug_bounty | social_engineering</span></div>
            <div><span className="text-primary">status</span>     <span className="text-zinc-500">TEXT     — planning | active | completed | paused</span></div>
            <div><span className="text-primary">findings</span>   <span className="text-zinc-500">JSONB[]  — Array of finding objects</span></div>
            <div><span className="text-primary">progress</span>   <span className="text-zinc-500">INT      — 0-100 completion percentage</span></div>
            <div><span className="text-primary">user_id</span>    <span className="text-zinc-500">UUID     — Owner (RLS enforced)</span></div>
          </CodeBlock>
        </CardContent></Card>

      <Card><CardContent className="pt-6"><FeatureList items={[
        { text: "Create operations with target, type, and scope", status: "done" },
        { text: "Operation types: pentest, red team, bug bounty, social engineering", status: "done" },
        { text: "Status tracking: planning, active, completed, paused", status: "done" },
        { text: "Add findings per operation with severity and category", status: "done" },
        { text: "Stats dashboard: total ops, active ops, critical/high findings", status: "done" },
        { text: "Progress bars per operation", status: "done" },
        { text: "All data persisted to Supabase via redTeamService", status: "done" },
      ]} /></CardContent></Card>
    </div>
  );
}
