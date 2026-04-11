import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UilSitemap, UilCheckCircle } from "@iconscout/react-unicons";
import { Badge } from "@/components/ui/badge";

function Feature({ text }: { text: string }) {
  return (
    <li className="text-sm flex items-start gap-2 text-emerald-500">
      <UilCheckCircle size={14} className="mt-0.5 shrink-0" /> {text}
    </li>
  );
}

const scanProfiles = [
  { name: "Quick Scan", desc: "Top 100 ports, fast host discovery", time: "~15s" },
  { name: "Full Port Scan", desc: "All 65,535 ports", time: "~5min" },
  { name: "Version Detection", desc: "Service and version identification", time: "~2min" },
  { name: "OS Detection", desc: "Operating system fingerprinting", time: "~1min" },
  { name: "Vulnerability Scan", desc: "NSE vuln scripts against found services", time: "~3min" },
  { name: "Stealth Scan", desc: "SYN scan with timing evasion", time: "~2min" },
  { name: "UDP Scan", desc: "Top UDP ports (DNS, SNMP, etc.)", time: "~3min" },
  { name: "Aggressive Scan", desc: "Version + OS + scripts + traceroute", time: "~5min" },
  { name: "Web Ports", desc: "HTTP/HTTPS ports with HTTP scripts", time: "~1min" },
  { name: "Custom", desc: "Define your own nmap flags", time: "varies" },
];

export function NetworkScannerSection() {
  return (
    <div className="space-y-6">
      <div className="space-y-2 mb-6">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <UilSitemap size={32} className="text-primary" />
          Network Scanner
        </h1>
        <p className="text-muted-foreground">10 nmap scan profiles with parsed, visual results</p>
        <div className="h-px bg-border" />
      </div>

      <Card className="border-primary/30 bg-card/50 backdrop-blur">
        <CardHeader><CardTitle>Scan Profiles</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-2">
            {scanProfiles.map((p) => (
              <div key={p.name} className="flex items-center justify-between p-2.5 rounded-lg border border-border/50 bg-card/30">
                <div>
                  <span className="text-sm font-medium text-foreground">{p.name}</span>
                  <span className="text-xs text-muted-foreground ml-2">{p.desc}</span>
                </div>
                <Badge className="bg-zinc-500/10 text-zinc-400 border-zinc-500/20 text-[9px]">{p.time}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-primary/30 bg-card/50 backdrop-blur">
        <CardHeader><CardTitle>Results</CardTitle></CardHeader>
        <CardContent>
          <ul className="space-y-1.5">
            <Feature text="Parsed host list with open ports and services" />
            <Feature text="Service version and banner information" />
            <Feature text="OS detection results" />
            <Feature text="Vulnerability findings from NSE scripts" />
            <Feature text="Scan history — all previous scans saved and searchable" />
            <Feature text="Export to JSON or plain text" />
          </ul>
        </CardContent>
      </Card>

      <Card className="border-amber-500/20 bg-amber-500/5">
        <CardContent className="pt-6">
          <div className="text-sm text-muted-foreground">
            <strong className="text-amber-500">Note:</strong> Network scanning requires the desktop app with local nmap installation.
            Web users can view saved scan results but cannot initiate new scans.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
