import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bug } from "@phosphor-icons/react";
import { DocHeader, FeatureList, CodeBlock } from "../components";

export function CVESection() {
  return (
    <div className="space-y-6">
      <DocHeader icon={Bug} title="CVE Database" description="Cloud-synced vulnerability tracking with NVD + Shodan parallel lookup" status="ready" />
      <Card><CardHeader><CardTitle>How it works</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>The CVE Database stores vulnerabilities in the Supabase <code className="text-primary">cves</code> table,
            shared in real-time across all CrowByte instances, Claude Code CLI sessions, and the OpenClaw AI chat.
            CVEs can be added three ways: manually through the UI form, auto-saved via the <code className="text-primary">cve-db</code> CLI,
            or by asking the AI in Chat to look up a CVE.</p>
          <p>The lookup engine fetches from <strong className="text-foreground">NVD API v2.0</strong> and
            <strong className="text-foreground">Shodan CVEDB</strong> in parallel. NVD is primary (CVSS, CWE, CPE, refs),
            Shodan fills gaps and adds EPSS scores. Data is merged and upserted (no duplicates).</p>
        </CardContent></Card>

      <Card><CardHeader><CardTitle>UI Features</CardTitle></CardHeader>
        <CardContent><FeatureList items={[
          { text: "Severity-grouped view: collapsible sections with colored borders (Critical=red, High=orange, Medium=yellow, Low=blue)", status: "done" },
          { text: "Flat list view: sortable table with all CVEs", status: "done" },
          { text: "View mode toggle: grouped vs list", status: "done" },
          { text: "Sort by date, CVSS score, or CVE ID (asc/desc)", status: "done" },
          { text: "6 stat cards: Critical, High, Medium, Low, Bookmarked, Exploitable", status: "done" },
          { text: "Search bar: filter by ID, title, description, products", status: "done" },
          { text: "Expandable detail rows with full description, products, references", status: "done" },
          { text: "Bookmark toggle per CVE (star icon)", status: "done" },
          { text: "Multi-select with checkboxes + bulk delete", status: "done" },
          { text: "Add CVE form with auto severity detection from CVSS", status: "done" },
          { text: "Edit CVE inline", status: "done" },
          { text: "Exploit status tracking: in-the-wild, poc-available, theoretical", status: "done" },
        ]} /></CardContent></Card>

      <Card><CardHeader><CardTitle>Supabase Schema: cves</CardTitle></CardHeader>
        <CardContent>
          <CodeBlock>
            <div><span className="text-primary">cve_id</span>          <span className="text-zinc-500">TEXT UNIQUE  — e.g., CVE-2024-3400</span></div>
            <div><span className="text-primary">title</span>           <span className="text-zinc-500">TEXT         — Short vulnerability title</span></div>
            <div><span className="text-primary">severity</span>        <span className="text-zinc-500">TEXT         — CRITICAL / HIGH / MEDIUM / LOW</span></div>
            <div><span className="text-primary">cvss</span>            <span className="text-zinc-500">NUMERIC      — CVSS v3.1 base score (0-10)</span></div>
            <div><span className="text-primary">cvss_vector</span>     <span className="text-zinc-500">TEXT         — CVSS:3.1/AV:N/AC:L/PR:N/...</span></div>
            <div><span className="text-primary">description</span>     <span className="text-zinc-500">TEXT         — Full vulnerability description</span></div>
            <div><span className="text-primary">products</span>        <span className="text-zinc-500">TEXT         — Affected software/versions (CPE)</span></div>
            <div><span className="text-primary">cwe</span>             <span className="text-zinc-500">TEXT         — CWE IDs (e.g., CWE-78)</span></div>
            <div><span className="text-primary">references</span>      <span className="text-zinc-500">TEXT         — Reference URLs</span></div>
            <div><span className="text-primary">notes</span>           <span className="text-zinc-500">TEXT         — Exploitation notes</span></div>
            <div><span className="text-primary">tags</span>            <span className="text-zinc-500">TEXT         — Searchable tags</span></div>
            <div><span className="text-primary">exploit_status</span>  <span className="text-zinc-500">TEXT         — in-the-wild / poc-available / theoretical</span></div>
            <div><span className="text-primary">patch_url</span>       <span className="text-zinc-500">TEXT         — Vendor patch link</span></div>
            <div><span className="text-primary">nvd_uuid</span>        <span className="text-zinc-500">TEXT         — NVD internal UUID</span></div>
            <div><span className="text-primary">bookmarked</span>      <span className="text-zinc-500">BOOLEAN      — Starred for quick access</span></div>
          </CodeBlock>
        </CardContent></Card>

      <Card><CardHeader><CardTitle>CLI: cve-db</CardTitle><CardDescription>/usr/local/bin/cve-db</CardDescription></CardHeader>
        <CardContent>
          <CodeBlock>
            <div className="text-zinc-500"># Lookup (parallel NVD + Shodan, auto-save)</div>
            <div><span className="text-emerald-500">cve-db lookup</span> CVE-2024-3400</div>
            <div>&nbsp;</div>
            <div className="text-zinc-500"># Individual source queries</div>
            <div><span className="text-emerald-500">cve-db nvd</span> CVE-2024-3400</div>
            <div><span className="text-emerald-500">cve-db shodan</span> CVE-2024-3400</div>
            <div>&nbsp;</div>
            <div className="text-zinc-500"># Database operations</div>
            <div><span className="text-emerald-500">cve-db search</span> "RCE"</div>
            <div><span className="text-emerald-500">cve-db list</span> --severity CRITICAL</div>
            <div><span className="text-emerald-500">cve-db list</span> -n 20</div>
            <div><span className="text-emerald-500">cve-db stats</span></div>
            <div>&nbsp;</div>
            <div className="text-zinc-500"># Manual save</div>
            <div><span className="text-emerald-500">cve-db save</span> "CVE-2024-3400" "PAN-OS Command Injection" \</div>
            <div>  --cvss 10.0 --severity CRITICAL \</div>
            <div>  --desc "OS command injection in GlobalProtect" \</div>
            <div>  --products "paloaltonetworks:pan-os" \</div>
            <div>  --cwe "CWE-78" --exploit "in-the-wild"</div>
          </CodeBlock>
        </CardContent></Card>
    </div>
  );
}
