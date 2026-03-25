import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sword } from "@phosphor-icons/react";
import { DocHeader, FeatureList, CodeBlock } from "../components";

export function CyberOpsSection() {
  return (
    <div className="space-y-6">
      <DocHeader icon={Sword} title="Cyber Ops" description="95-tool tactical security toolkit with AI-assisted analysis, caching, and analytics" status="ready" />

      <Card><CardHeader><CardTitle>How it works</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>Cyber Ops is the hands-on hacking page. It provides a catalog of <strong className="text-foreground">95 security tools</strong> organized across
            4 tabs (Scanning, Recon, Attack, Defence) that run commands via OpenClaw on the VPS or locally.</p>
          <p>Results are cached using the <code className="text-primary">cacheService</code> and tracked via
            <code className="text-primary mx-1">analyticsService</code>. The page also integrates Tavily for
            vulnerability research and web intelligence gathering.</p>
        </CardContent></Card>

      <Card><CardHeader><CardTitle>Tool Categories (4 Tabs)</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-3 rounded-lg border border-transparent bg-transparent">
              <div className="font-medium text-sm text-blue-500 mb-2 flex items-center gap-2">
                Scanning <Badge variant="secondary" className="text-[9px]">~25 tools</Badge>
              </div>
              <p className="text-xs text-muted-foreground">nmap, masscan, zmap, nikto, wapiti, arachni, skipfish, w3af, openvas, nessus, qualys, burpsuite, zap, sslyze, testssl, whatweb, wappalyzer, retire.js, snyk, trivy, grype, clair, anchore, dockle, lynis</p>
            </div>
            <div className="p-3 rounded-lg border border-transparent bg-transparent">
              <div className="font-medium text-sm text-emerald-500 mb-2 flex items-center gap-2">
                Recon <Badge variant="secondary" className="text-[9px]">~25 tools</Badge>
              </div>
              <p className="text-xs text-muted-foreground">subfinder, amass, assetfinder, findomain, knockpy, dnsrecon, fierce, theHarvester, recon-ng, spiderfoot, maltego, shodan, censys, zoomeye, fofa, hunter.io, phonebook, crt.sh, securitytrails, dnsdumpster, waybackurls, gau, katana, gospider, hakrawler</p>
            </div>
            <div className="p-3 rounded-lg border border-transparent bg-transparent">
              <div className="font-medium text-sm text-red-500 mb-2 flex items-center gap-2">
                Attack <Badge variant="secondary" className="text-[9px]">~25 tools</Badge>
              </div>
              <p className="text-xs text-muted-foreground">sqlmap, ffuf, gobuster, dirb, dirsearch, feroxbuster, nuclei, dalfox, xsstrike, kxss, commix, tplmap, ssrfmap, crlfuzz, cors-scanner, jwt_tool, arjun, paramspider, wfuzz, hydra, john, hashcat, metasploit, crackmapexec, evil-winrm</p>
            </div>
            <div className="p-3 rounded-lg border border-transparent bg-transparent">
              <div className="font-medium text-sm text-amber-500 mb-2 flex items-center gap-2">
                Defence <Badge variant="secondary" className="text-[9px]">~20 tools</Badge>
              </div>
              <p className="text-xs text-muted-foreground">wafw00f, cloudflare-bypass, waf-bypass, modsecurity, fail2ban, snort, suricata, ossec, wazuh, aide, rkhunter, chkrootkit, clamav, yara, sigma, elastic, splunk, graylog, ossim, thehive</p>
            </div>
          </div>
        </CardContent></Card>

      <Card><CardHeader><CardTitle>Execution Flow</CardTitle></CardHeader>
        <CardContent>
          <CodeBlock>
            <div className="text-zinc-500"># Tool execution pipeline</div>
            <div>&nbsp;</div>
            <div><span className="text-emerald-500">1.</span> User selects tool + enters target</div>
            <div><span className="text-emerald-500">2.</span> Command template auto-fills with target</div>
            <div><span className="text-emerald-500">3.</span> Check cacheService for existing results</div>
            <div><span className="text-emerald-500">4.</span> If no cache: execute via OpenClaw (VPS) or local shell</div>
            <div><span className="text-emerald-500">5.</span> Stream output to result pane</div>
            <div><span className="text-emerald-500">6.</span> Cache results (cacheService.set)</div>
            <div><span className="text-emerald-500">7.</span> Track usage (analyticsService.trackToolUse)</div>
            <div><span className="text-emerald-500">8.</span> Optional: AI analysis via OpenClaw on results</div>
          </CodeBlock>
        </CardContent></Card>

      <Card><CardContent className="pt-6"><FeatureList items={[
        { text: "95 security tools across 4 category tabs", status: "done" },
        { text: "Target input with command template auto-fill", status: "done" },
        { text: "AI-powered result analysis via OpenClaw", status: "done" },
        { text: "Result caching via cacheService (avoid re-running same scans)", status: "done" },
        { text: "Scan history with timestamps and favorites", status: "done" },
        { text: "Analytics tracking (tool usage stats)", status: "done" },
        { text: "Tavily web search integration for vuln research", status: "done" },
        { text: "Per-tool description and example command", status: "done" },
        { text: "Pinned/favorite tools for quick access", status: "done" },
      ]} /></CardContent></Card>
    </div>
  );
}
