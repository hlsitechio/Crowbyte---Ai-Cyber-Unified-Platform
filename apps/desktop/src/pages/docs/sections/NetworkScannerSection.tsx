import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UilSitemap } from "@iconscout/react-unicons";
import { DocHeader, FeatureList, CodeBlock } from "../components";

export function NetworkScannerSection() {
  return (
    <div className="space-y-6">
      <DocHeader icon={UilSitemap} title="Network Scanner" description="10-profile nmap GUI with parsed results and scan history" status="ready" />

      <Card><CardHeader><CardTitle>How it works</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>The Network Scanner provides a GUI for nmap scans. Enter a target, select a scan profile,
            and the app runs nmap via Electron's shell access. Results are parsed into structured host/port/service data.</p>
          <p>Scans are managed by the <code className="text-primary">network-scans.ts</code> service which handles
            execution, parsing, and history persistence to Supabase.</p>
        </CardContent></Card>

      <Card><CardHeader><CardTitle>Scan Profiles (10)</CardTitle></CardHeader>
        <CardContent>
          <CodeBlock>
            <div className="text-zinc-500"># network-scans.ts scan profiles</div>
            <div>&nbsp;</div>
            <div><span className="text-primary">quick</span>        <span className="text-zinc-500">-sV -T4 --top-ports 1000</span></div>
            <div><span className="text-primary">full</span>         <span className="text-zinc-500">-sV -sC -p- -T3</span></div>
            <div><span className="text-primary">stealth</span>      <span className="text-zinc-500">-sS -T2 --max-retries 1</span></div>
            <div><span className="text-primary">vuln</span>         <span className="text-zinc-500">-sV --script vuln -T3</span></div>
            <div><span className="text-primary">os-detect</span>    <span className="text-zinc-500">-sV -O --osscan-guess</span></div>
            <div><span className="text-primary">aggressive</span>   <span className="text-zinc-500">-A -T4 (version + script + OS + traceroute)</span></div>
            <div><span className="text-primary">udp</span>          <span className="text-zinc-500">-sU --top-ports 100</span></div>
            <div><span className="text-primary">firewall</span>     <span className="text-zinc-500">-sA -T3 (ACK scan for firewall rules)</span></div>
            <div><span className="text-primary">service</span>      <span className="text-zinc-500">-sV --version-intensity 5</span></div>
            <div><span className="text-primary">script</span>       <span className="text-zinc-500">-sC (default scripts only)</span></div>
          </CodeBlock>
        </CardContent></Card>

      <Card><CardHeader><CardTitle>Result Parsing</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>Nmap XML output is parsed into structured data:</p>
          <CodeBlock>
            <div className="text-zinc-500"># Parsed result structure</div>
            <div><span className="text-primary">hosts[]</span></div>
            <div>  <span className="text-emerald-500">ip</span>        <span className="text-zinc-500">IP address</span></div>
            <div>  <span className="text-emerald-500">hostname</span>  <span className="text-zinc-500">Reverse DNS / PTR</span></div>
            <div>  <span className="text-emerald-500">os</span>        <span className="text-zinc-500">OS detection result</span></div>
            <div>  <span className="text-emerald-500">state</span>     <span className="text-zinc-500">up / down</span></div>
            <div>  <span className="text-emerald-500">ports[]</span></div>
            <div>    <span className="text-amber-500">port</span>     <span className="text-zinc-500">Port number</span></div>
            <div>    <span className="text-amber-500">protocol</span> <span className="text-zinc-500">tcp / udp</span></div>
            <div>    <span className="text-amber-500">state</span>    <span className="text-zinc-500">open / filtered / closed</span></div>
            <div>    <span className="text-amber-500">service</span>  <span className="text-zinc-500">Service name (http, ssh, etc.)</span></div>
            <div>    <span className="text-amber-500">version</span>  <span className="text-zinc-500">Service version string</span></div>
            <div>    <span className="text-amber-500">scripts[]</span> <span className="text-zinc-500">NSE script output</span></div>
          </CodeBlock>
        </CardContent></Card>

      <Card><CardContent className="pt-6"><FeatureList items={[
        { text: "10 scan profiles: Quick, Full, Stealth, Vuln, OS Detect, Aggressive, UDP, Firewall, Service, Script", status: "done" },
        { text: "Parsed results: hosts, ports, services, versions, OS detection", status: "done" },
        { text: "Service fingerprinting and banner grabbing", status: "done" },
        { text: "Port state indicators (open/filtered/closed) with color coding", status: "done" },
        { text: "Real-time scan output streaming", status: "done" },
        { text: "Scan history persisted to Supabase", status: "done" },
        { text: "Raw nmap output view alongside parsed data", status: "done" },
        { text: "Export results as JSON, XML, or text", status: "done" },
      ]} /></CardContent></Card>
    </div>
  );
}
