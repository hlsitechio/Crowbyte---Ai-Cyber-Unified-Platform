import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollText } from "lucide-react";
import { DocHeader, FeatureList, CodeBlock } from "../components";

export function LogsSection() {
  return (
    <div className="space-y-6">
      <DocHeader icon={ScrollText} title="Logs" description="Application event logging with level filtering, search, and error tracking" status="ready" />

      <Card><CardHeader><CardTitle>How it works</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>The Logs page displays application events captured by the <code className="text-primary">LogsProvider</code> context
            (defined in <code className="text-primary">src/contexts/logs.tsx</code>). Events include API calls, errors, warnings,
            and info messages from across the app.</p>
          <p>The sidebar shows an <strong className="text-foreground">unread error count badge</strong> so you know when something
            needs attention. The badge resets when you visit the Logs page.</p>
        </CardContent></Card>

      <Card><CardHeader><CardTitle>Log Architecture</CardTitle></CardHeader>
        <CardContent>
          <CodeBlock>
            <div className="text-zinc-500"># LogsProvider context (contexts/logs.tsx)</div>
            <div>&nbsp;</div>
            <div><span className="text-green-400">addLog(level, message, source)</span></div>
            <div><span className="text-green-400">getLogs(filter?)</span></div>
            <div><span className="text-green-400">clearLogs()</span></div>
            <div><span className="text-green-400">getErrorCount()</span></div>
            <div><span className="text-green-400">markAllRead()</span></div>
            <div>&nbsp;</div>
            <div className="text-zinc-500"># Log levels</div>
            <div><span className="text-blue-400">debug</span>    <span className="text-zinc-500">Verbose debugging info</span></div>
            <div><span className="text-green-400">info</span>     <span className="text-zinc-500">Normal operations</span></div>
            <div><span className="text-yellow-400">warn</span>     <span className="text-zinc-500">Non-critical issues</span></div>
            <div><span className="text-red-400">error</span>    <span className="text-zinc-500">Failures and exceptions</span></div>
            <div><span className="text-red-600">critical</span> <span className="text-zinc-500">System-level failures</span></div>
            <div>&nbsp;</div>
            <div className="text-zinc-500"># Log categories (source field)</div>
            <div><span className="text-primary">system</span>    <span className="text-zinc-500">App lifecycle, routing, init</span></div>
            <div><span className="text-primary">security</span>  <span className="text-zinc-500">Auth, encryption, monitoring</span></div>
            <div><span className="text-primary">ai</span>        <span className="text-zinc-500">Claude, OpenClaw, agents</span></div>
            <div><span className="text-primary">network</span>   <span className="text-zinc-500">API calls, scans, connections</span></div>
            <div><span className="text-primary">supabase</span>  <span className="text-zinc-500">Database operations</span></div>
          </CodeBlock>
        </CardContent></Card>

      <Card><CardContent className="pt-6"><FeatureList items={[
        { text: "Real-time log streaming from LogsProvider context", status: "done" },
        { text: "Error count badge in sidebar (unread errors)", status: "done" },
        { text: "Log level filtering (debug, info, warn, error, critical)", status: "done" },
        { text: "Search within log messages", status: "done" },
        { text: "Timestamp and source tracking per entry", status: "done" },
        { text: "Color-coded severity (blue/green/yellow/red)", status: "done" },
        { text: "Clear all logs button", status: "done" },
        { text: "Auto-scroll to newest entries", status: "done" },
      ]} /></CardContent></Card>
    </div>
  );
}
