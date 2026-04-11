import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UilShieldExclamation } from "@iconscout/react-unicons";
import { DocHeader, FeatureList, CodeBlock } from "../components";

export function ThreatIntelSection() {
  return (
    <div className="space-y-6">
      <DocHeader icon={UilShieldExclamation} title="Threat Intelligence" description="IOC feeds, threat enrichment, and indicator correlation" status="beta" />

      <Card><CardHeader><CardTitle>How it works</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>The Threat Intelligence page aggregates Indicators of Compromise (IOCs) from multiple threat feeds.
            Feeds are configurable with custom URLs, refresh intervals, and format parsers.
            IOCs are stored in Supabase with confidence scores and severity levels.</p>
          <p>The page provides real-time feed management, IOC search/filter, and statistical dashboards with
            PieChart (by type) and BarChart (by severity) visualizations via Recharts.</p>
        </CardContent></Card>

      <Card><CardHeader><CardTitle>IOC Types</CardTitle></CardHeader>
        <CardContent>
          <CodeBlock>
            <div className="text-zinc-500"># ThreatIntelligence.tsx — IOC types tracked</div>
            <div>&nbsp;</div>
            <div><span className="text-primary">ipv4 / ipv6</span>  <span className="text-zinc-500">Malicious IP addresses</span></div>
            <div><span className="text-primary">domain</span>       <span className="text-zinc-500">Malicious domains</span></div>
            <div><span className="text-primary">url</span>          <span className="text-zinc-500">Malicious URLs</span></div>
            <div><span className="text-primary">md5</span>          <span className="text-zinc-500">File hash (MD5)</span></div>
            <div><span className="text-primary">sha1</span>         <span className="text-zinc-500">File hash (SHA-1)</span></div>
            <div><span className="text-primary">sha256</span>       <span className="text-zinc-500">File hash (SHA-256)</span></div>
            <div><span className="text-primary">email</span>        <span className="text-zinc-500">Threat actor email</span></div>
            <div><span className="text-primary">cve</span>          <span className="text-zinc-500">CVE identifiers (correlates with CVE DB)</span></div>
          </CodeBlock>
        </CardContent></Card>

      <Card><CardHeader><CardTitle>Feed Management</CardTitle></CardHeader>
        <CardContent>
          <CodeBlock>
            <div className="text-zinc-500"># ThreatFeed schema (Supabase)</div>
            <div>&nbsp;</div>
            <div><span className="text-primary">name</span>                <span className="text-zinc-500">Feed display name</span></div>
            <div><span className="text-primary">url</span>                 <span className="text-zinc-500">Feed endpoint URL</span></div>
            <div><span className="text-primary">feed_type</span>           <span className="text-zinc-500">osint | commercial | internal</span></div>
            <div><span className="text-primary">format</span>              <span className="text-zinc-500">csv | json | stix | plain</span></div>
            <div><span className="text-primary">enabled</span>             <span className="text-zinc-500">Toggle feed on/off</span></div>
            <div><span className="text-primary">refresh_interval_min</span> <span className="text-zinc-500">Auto-refresh period</span></div>
            <div><span className="text-primary">last_fetched</span>        <span className="text-zinc-500">Last successful fetch timestamp</span></div>
            <div><span className="text-primary">last_count</span>          <span className="text-zinc-500">IOCs from last fetch</span></div>
            <div><span className="text-primary">last_error</span>          <span className="text-zinc-500">Error message if fetch failed</span></div>
          </CodeBlock>
        </CardContent></Card>

      <Card><CardHeader><CardTitle>IOC Stats Dashboard</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>The stats dashboard tracks:</p>
          <FeatureList items={[
            { text: "Total IOC count across all feeds", status: "done" },
            { text: "IOC breakdown by type (PieChart)", status: "done" },
            { text: "IOC breakdown by severity (BarChart)", status: "done" },
            { text: "IOC breakdown by feed source", status: "done" },
            { text: "New IOCs today counter", status: "done" },
          ]} />
        </CardContent></Card>

      <Card><CardContent className="pt-6"><FeatureList items={[
        { text: "IOC feed aggregation from multiple configurable sources", status: "done" },
        { text: "IOC types: IPv4/6, domain, URL, MD5, SHA1, SHA256, email, CVE", status: "done" },
        { text: "Confidence scoring per IOC (0-100)", status: "done" },
        { text: "Severity classification: critical, high, medium, low, info", status: "done" },
        { text: "Feed enable/disable toggle", status: "done" },
        { text: "Auto-refresh with configurable intervals", status: "done" },
        { text: "Search and filter IOCs by type, severity, feed", status: "done" },
        { text: "PieChart + BarChart statistical dashboards", status: "done" },
        { text: "CVE correlation with CVE UilDatabase page", status: "done" },
        { text: "Supabase-backed persistence for feeds and IOCs", status: "done" },
      ]} /></CardContent></Card>
    </div>
  );
}
