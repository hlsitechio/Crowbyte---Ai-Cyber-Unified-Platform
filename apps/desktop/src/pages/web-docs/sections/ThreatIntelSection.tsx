import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UilShieldExclamation, UilBolt, UilCheckCircle } from "@iconscout/react-unicons";
function Feature({ text }: { text: string }) {
  return (
    <li className="text-sm flex items-start gap-2 text-emerald-500">
      <UilCheckCircle size={14} className="mt-0.5 shrink-0" /> {text}
    </li>
  );
}

export function ThreatIntelSection() {
  return (
    <div className="space-y-6">
      <div className="space-y-2 mb-6">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <UilShieldExclamation size={32} className="text-primary" />
          Threat Intelligence
          <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20 text-[9px]">BETA</Badge>
        </h1>
        <p className="text-muted-foreground">IOC feeds, enrichment, and threat correlation</p>
        <div className="h-px bg-border" />
      </div>

      <Card className="border-primary/30 bg-card/50 backdrop-blur">
        <CardHeader><CardTitle className="flex items-center gap-2"><UilBolt size={20} className="text-blue-500" /> Intelligence Feeds</CardTitle></CardHeader>
        <CardContent>
          <ul className="space-y-1.5">
            <Feature text="IOC (Indicators of Compromise) tracking — IPs, domains, hashes, URLs" />
            <Feature text="Multiple feed source integration" />
            <Feature text="Automatic enrichment with context data" />
            <Feature text="Severity scoring and classification" />
            <Feature text="Correlation with CVE database entries" />
            <Feature text="Historical IOC tracking" />
          </ul>
        </CardContent>
      </Card>

      <Card className="border-primary/30 bg-card/50 backdrop-blur">
        <CardHeader><CardTitle>IOC Types</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {["IP Address", "Domain", "URL", "File Hash (MD5/SHA)", "Email Address", "CVE ID", "YARA Rule", "Registry Key"].map((t) => (
              <span key={t} className="px-2 py-1 rounded-md bg-zinc-800 text-xs text-zinc-400 border border-zinc-700">{t}</span>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
