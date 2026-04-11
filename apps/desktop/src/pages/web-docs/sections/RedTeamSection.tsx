import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UilCrosshair, UilListOlAlt, UilShieldExclamation, UilCheckCircle } from "@iconscout/react-unicons";
function Feature({ text }: { text: string }) {
  return (
    <li className="text-sm flex items-start gap-2 text-emerald-500">
      <UilCheckCircle size={14} className="mt-0.5 shrink-0" /> {text}
    </li>
  );
}

export function RedTeamSection() {
  return (
    <div className="space-y-6">
      <div className="space-y-2 mb-6">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <UilCrosshair size={32} className="text-primary" />
          Red Team Operations
        </h1>
        <p className="text-muted-foreground">Track engagements, document findings, and manage operations</p>
        <div className="h-px bg-border" />
      </div>

      <Card className="border-primary/30 bg-card/50 backdrop-blur">
        <CardHeader><CardTitle className="flex items-center gap-2"><UilListOlAlt size={20} className="text-red-500" /> Operation Management</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Create and manage red team operations with full lifecycle tracking — from initial recon through
            exploitation, persistence, lateral movement, and exfiltration.
          </p>
          <ul className="space-y-1.5">
            <Feature text="Operation types: Recon, Exploit, Persistence, Lateral Movement, Exfiltration" />
            <Feature text="Status tracking: Planning, Active, Paused, Completed" />
            <Feature text="Target assignment and scope definition" />
            <Feature text="Timeline view of operation progress" />
            <Feature text="Cloud-synced — access operations from any device" />
          </ul>
        </CardContent>
      </Card>

      <Card className="border-primary/30 bg-card/50 backdrop-blur">
        <CardHeader><CardTitle className="flex items-center gap-2"><UilShieldExclamation size={20} className="text-orange-500" /> Findings Tracker</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>Document vulnerabilities and findings as you discover them, linked to their parent operation.</p>
          <ul className="space-y-1.5">
            <Feature text="Severity classification (Critical, High, Medium, Low, Info)" />
            <Feature text="Evidence attachment for each finding" />
            <Feature text="Remediation recommendations" />
            <Feature text="CVSS scoring support" />
            <Feature text="Export-ready for reporting" />
          </ul>
        </CardContent>
      </Card>

      <Card className="border-primary/30 bg-card/50 backdrop-blur">
        <CardHeader><CardTitle>AI-Assisted Analysis</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            Use CrowByte's AI chat to analyze findings, suggest attack paths, and generate report content.
            The AI can access your operation data and provide context-aware recommendations.
          </p>
          <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20 text-[9px]">PRO FEATURE</Badge>
        </CardContent>
      </Card>
    </div>
  );
}
