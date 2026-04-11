import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UilBug, UilSearch, UilBookmark, UilCheckCircle } from "@iconscout/react-unicons";
function Feature({ text }: { text: string }) {
  return (
    <li className="text-sm flex items-start gap-2 text-emerald-500">
      <UilCheckCircle size={14} className="mt-0.5 shrink-0" /> {text}
    </li>
  );
}

export function CVEDatabaseSection() {
  return (
    <div className="space-y-6">
      <div className="space-y-2 mb-6">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <UilBug size={32} className="text-primary" />
          CVE UilDatabase
        </h1>
        <p className="text-muted-foreground">Search, track, and analyze vulnerabilities from NVD and Shodan</p>
        <div className="h-px bg-border" />
      </div>

      <Card className="border-primary/30 bg-card/50 backdrop-blur">
        <CardHeader><CardTitle className="flex items-center gap-2"><UilSearch size={20} className="text-blue-500" /> Dual-Source Lookup</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            CrowByte queries both <strong className="text-foreground">NVD (National Vulnerability UilDatabase)</strong> and
            <strong className="text-foreground"> Shodan's CVEDB</strong> in parallel, merging results into a comprehensive
            vulnerability profile.
          </p>
          <ul className="space-y-1.5">
            <Feature text="Parallel NVD + Shodan queries for faster results" />
            <Feature text="CVSS v3.1 scoring with severity breakdown" />
            <Feature text="CWE classification and weakness type" />
            <Feature text="Affected product and version tracking (CPE)" />
            <Feature text="Exploit availability status" />
            <Feature text="Reference links to advisories and patches" />
          </ul>
        </CardContent>
      </Card>

      <Card className="border-primary/30 bg-card/50 backdrop-blur">
        <CardHeader><CardTitle className="flex items-center gap-2"><UilBookmark size={20} className="text-violet-500" /> Cloud-Synced Tracking</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>Save CVEs to your personal database for tracking and reference. All saved CVEs sync across your devices.</p>
          <ul className="space-y-1.5">
            <Feature text="Save any CVE with one click" />
            <Feature text="Bookmark important vulnerabilities" />
            <Feature text="Filter by severity: Critical, High, Medium, Low" />
            <Feature text="Search saved CVEs by ID, description, or product" />
            <Feature text="Track exploit status changes over time" />
            <Feature text="Bulk operations — save multiple CVEs at once" />
          </ul>
        </CardContent>
      </Card>

      <Card className="border-primary/30 bg-card/50 backdrop-blur">
        <CardHeader><CardTitle>Severity Groups</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Critical", range: "9.0 — 10.0", color: "text-red-500 border-red-500/20 bg-red-500/5" },
              { label: "High", range: "7.0 — 8.9", color: "text-orange-500 border-orange-500/20 bg-orange-500/5" },
              { label: "Medium", range: "4.0 — 6.9", color: "text-yellow-500 border-yellow-500/20 bg-yellow-500/5" },
              { label: "Low", range: "0.1 — 3.9", color: "text-blue-500 border-blue-500/20 bg-blue-500/5" },
            ].map((s) => (
              <div key={s.label} className={`p-3 rounded-lg border ${s.color}`}>
                <div className="text-sm font-medium">{s.label}</div>
                <div className="text-xs opacity-70">CVSS {s.range}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
