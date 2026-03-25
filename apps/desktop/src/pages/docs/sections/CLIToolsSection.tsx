import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TerminalWindow } from "@phosphor-icons/react";
import { DocHeader, FeatureList, CodeBlock } from "../components";

export function CLIToolsSection() {
  return (
    <div className="space-y-6">
      <DocHeader icon={TerminalWindow} title="CLI Tools" description="cve-db and kb command-line tools shared across all Claude Code instances" status="ready" />

      <Card><CardHeader><CardTitle>cve-db</CardTitle><CardDescription>/usr/local/bin/cve-db — CVE lookup, search, and management</CardDescription></CardHeader>
        <CardContent>
          <CodeBlock>
            <div className="text-zinc-500"># Parallel lookup (NVD + Shodan, auto-save to Supabase)</div>
            <div><span className="text-emerald-500">cve-db lookup</span> CVE-2024-3400</div>
            <div>&nbsp;</div>
            <div className="text-zinc-500"># Individual source queries (no auto-save)</div>
            <div><span className="text-emerald-500">cve-db nvd</span> CVE-2024-3400      <span className="text-zinc-500"># NVD API v2.0 only</span></div>
            <div><span className="text-emerald-500">cve-db shodan</span> CVE-2024-3400   <span className="text-zinc-500"># Shodan CVEDB only</span></div>
            <div>&nbsp;</div>
            <div className="text-zinc-500"># Database search and filtering</div>
            <div><span className="text-emerald-500">cve-db search</span> "RCE"            <span className="text-zinc-500"># Full-text search</span></div>
            <div><span className="text-emerald-500">cve-db list</span> --severity CRITICAL <span className="text-zinc-500"># Filter by severity</span></div>
            <div><span className="text-emerald-500">cve-db list</span> -n 20              <span className="text-zinc-500"># Last 20 entries</span></div>
            <div><span className="text-emerald-500">cve-db stats</span>                   <span className="text-zinc-500"># Severity breakdown</span></div>
            <div>&nbsp;</div>
            <div className="text-zinc-500"># Manual save with all fields</div>
            <div><span className="text-emerald-500">cve-db save</span> "CVE-2024-3400" "PAN-OS Command Injection" \</div>
            <div>  --cvss 10.0 --severity CRITICAL \</div>
            <div>  --desc "OS command injection in GlobalProtect" \</div>
            <div>  --products "paloaltonetworks:pan-os" \</div>
            <div>  --cwe "CWE-78" --tags "firewall,rce" \</div>
            <div>  --exploit "in-the-wild"</div>
            <div>&nbsp;</div>
            <div className="text-zinc-500"># Bulk lookup from scan results</div>
            <div>for cve in CVE-2024-3400 CVE-2024-21887; do</div>
            <div>  <span className="text-emerald-500">cve-db lookup</span> "$cve"</div>
            <div>done</div>
          </CodeBlock>
        </CardContent></Card>

      <Card><CardHeader><CardTitle>kb</CardTitle><CardDescription>/usr/local/bin/kb — Knowledge base save, search, and pipe</CardDescription></CardHeader>
        <CardContent>
          <CodeBlock>
            <div className="text-zinc-500"># Save an entry</div>
            <div><span className="text-emerald-500">kb save</span> "PAN-OS RCE Analysis" \</div>
            <div>  --content "CVE-2024-3400 allows unauthenticated RCE..." \</div>
            <div>  --category vulnerabilities --priority P1 \</div>
            <div>  --tags "paloalto,rce,critical"</div>
            <div>&nbsp;</div>
            <div className="text-zinc-500"># Pipe command output directly to KB</div>
            <div>nmap -sV -sC target.com | <span className="text-emerald-500">kb pipe</span> "Target.com Full Scan" \</div>
            <div>  --category research --priority P3</div>
            <div>&nbsp;</div>
            <div className="text-zinc-500"># Search and list</div>
            <div><span className="text-emerald-500">kb search</span> "RCE"          <span className="text-zinc-500"># Full-text search</span></div>
            <div><span className="text-emerald-500">kb recent</span> -n 10          <span className="text-zinc-500"># Last 10 entries</span></div>
            <div><span className="text-emerald-500">kb list</span> --category tools <span className="text-zinc-500"># Filter by category</span></div>
          </CodeBlock>
        </CardContent></Card>

      <Card><CardContent className="pt-6"><FeatureList items={[
        { text: "Both tools available in all Claude Code CLI sessions", status: "done" },
        { text: "Both tools share the same Supabase backend as the UI", status: "done" },
        { text: "Changes appear in the app in real-time (Realtime subscriptions)", status: "done" },
        { text: "AI agents (Claude, OpenClaw) know about these tools and can use them", status: "done" },
        { text: "cve-db: parallel NVD + Shodan with Python merge", status: "done" },
        { text: "kb: pipe any command output directly to knowledge base", status: "done" },
      ]} /></CardContent></Card>
    </div>
  );
}
