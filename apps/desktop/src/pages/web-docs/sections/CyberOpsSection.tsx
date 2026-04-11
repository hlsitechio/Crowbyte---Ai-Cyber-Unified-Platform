import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UilBoltAlt, UilSearch, UilGlobe, UilLock, UilBug, UilBracketsCurly, UilBolt } from "@iconscout/react-unicons";
const toolCategories = [
  { label: "Reconnaissance", icon: UilSearch, count: 15, tools: "Subdomain enumeration, DNS lookup, WHOIS, port scanning, banner grabbing, technology detection" },
  { label: "Web Application", icon: UilGlobe, count: 20, tools: "Directory bruteforcing, parameter fuzzing, spider/crawl, HTTP method testing, header analysis" },
  { label: "Vulnerability Scanning", icon: UilBug, count: 12, tools: "Nuclei templates, CVE scanning, misconfiguration detection, SSL/TLS analysis, CMS scanning" },
  { label: "Injection Testing", icon: UilBracketsCurly, count: 10, tools: "SQL injection, XSS, SSTI, command injection, LDAP injection, XXE" },
  { label: "Authentication", icon: UilLock, count: 8, tools: "Brute force, credential stuffing, JWT analysis, session testing, OAuth flow testing" },
  { label: "Network", icon: UilBolt, count: 15, tools: "Nmap profiles, service enumeration, SNMP walking, SMB enumeration, ARP scanning" },
  { label: "Cryptography", icon: UilLock, count: 5, tools: "Hash identification, cipher analysis, certificate inspection, key strength testing" },
  { label: "OSINT", icon: UilSearch, count: 10, tools: "Email harvesting, social media lookup, Google dorking, Shodan queries, Wayback Machine" },
];

export function CyberOpsSection() {
  return (
    <div className="space-y-6">
      <div className="space-y-2 mb-6">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <UilBoltAlt size={32} className="text-primary" />
          Cyber Ops
        </h1>
        <p className="text-muted-foreground">95+ integrated security tools organized by category</p>
        <div className="h-px bg-border" />
      </div>

      <Card className="border-primary/30 bg-card/50 backdrop-blur">
        <CardHeader><CardTitle>Tool Categories</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {toolCategories.map((cat) => (
              <div key={cat.label} className="flex items-start gap-3 p-3 rounded-lg border border-border/50 bg-card/30">
                <cat.icon size={20} className="text-primary mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{cat.label}</span>
                    <span className="text-[10px] text-zinc-500">{cat.count} tools</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{cat.tools}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-primary/30 bg-card/50 backdrop-blur">
        <CardHeader><CardTitle>How It Works</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            Each tool in Cyber Ops has a guided interface with pre-configured parameters. Select a tool,
            set your target, configure options, and execute — results appear directly in the CrowByte interface.
          </p>
          <p>
            Tools can be <strong className="text-foreground">pinned to favorites</strong> for quick access, and results
            can be saved to the Knowledge Base for later reference.
          </p>
          <p>
            The AI chat can suggest which tools to use based on your target and objectives, and can help
            interpret results.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
