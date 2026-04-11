import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UilSearch } from "@iconscout/react-unicons";
import { DocHeader, FeatureList, CodeBlock } from "../components";

export function NVDShodanSection() {
  return (
    <div className="space-y-6">
      <DocHeader icon={UilSearch} title="NVD & Shodan" description="Dual-source vulnerability intelligence integrated into the CVE workflow" status="ready" />

      <Card><CardHeader><CardTitle>NVD API v2.0</CardTitle><CardDescription>services.nvd.nist.gov/rest/json/cves/2.0</CardDescription></CardHeader>
        <CardContent><FeatureList items={[
          { text: "CVSS v3.1 / v3.0 / v2 scores with full vector strings", status: "done" },
          { text: "Severity classification (Critical/High/Medium/Low)", status: "done" },
          { text: "CWE weakness IDs", status: "done" },
          { text: "CPE product matching (affected software/versions)", status: "done" },
          { text: "Official reference URLs", status: "done" },
          { text: "NVD UUID for unique identification", status: "done" },
          { text: "No API key required (rate-limited)", status: "info" },
        ]} /></CardContent></Card>

      <Card><CardHeader><CardTitle>Shodan CVEDB</CardTitle><CardDescription>cvedb.shodan.io/cve/CVE-ID</CardDescription></CardHeader>
        <CardContent><FeatureList items={[
          { text: "EPSS (Exploit Prediction Scoring System) scores", status: "done" },
          { text: "Exploit availability tracking", status: "done" },
          { text: "Supplementary CVSS data", status: "done" },
          { text: "Additional reference URLs", status: "done" },
          { text: "No API key required", status: "info" },
        ]} /></CardContent></Card>

      <Card><CardHeader><CardTitle>Integration Flow</CardTitle></CardHeader>
        <CardContent>
          <CodeBlock>
            <div className="text-zinc-500"># cve-db lookup runs both APIs in parallel</div>
            <div>&nbsp;</div>
            <div><span className="text-blue-500">NVD API</span>   <span className="text-emerald-500">--&gt;</span> CVSS, severity, CWE, CPE, refs, vector</div>
            <div><span className="text-amber-500">Shodan</span>    <span className="text-emerald-500">--&gt;</span> EPSS score, exploit status, extra refs</div>
            <div><span className="text-violet-500">Merge</span>     <span className="text-emerald-500">--&gt;</span> NVD primary, Shodan fills gaps + adds EPSS</div>
            <div><span className="text-primary">Upsert</span>    <span className="text-emerald-500">--&gt;</span> Save to Supabase (on_conflict=cve_id)</div>
          </CodeBlock>
        </CardContent></Card>
    </div>
  );
}
