import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UilDesktopAlt } from "@iconscout/react-unicons";
import { DocHeader, FeatureList, CodeBlock } from "../components";

export function MCPSection() {
  return (
    <div className="space-y-6">
      <DocHeader icon={UilDesktopAlt} title="MCP Protocol" description="Model Context Protocol — how Claude accesses external tools inside CrowByte" status="ready" />

      <Card><CardHeader><CardTitle>How MCP works in CrowByte</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>When you use the Claude provider in Chat, CrowByte spawns <code className="text-primary">claude -p</code> via Electron IPC.
            Claude UilBracketsCurly CLI has its own MCP config (in <code className="text-primary">.env-unfiltered/.claude/</code>)
            giving it access to security tools, file operations, network intelligence, and persistent memory.</p>
          <p>On the VPS side, OpenClaw agents use <code className="text-primary">mcporter</code> — a skill-based bridge
            that injects tool descriptions into system prompts and executes <code className="text-primary">mcporter call d3bugr.&lt;tool&gt;</code>.</p>
        </CardContent></Card>

      <Card><CardHeader><CardTitle>MCP Servers</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-3 rounded-lg border border-transparent bg-transparent">
              <div className="font-medium text-sm text-red-500 mb-1">D3bugr — 142 security tools</div>
              <p className="text-xs text-muted-foreground">Docker on VPS. Nmap, Nuclei, SQLMap, browser automation (CDP + Stagehand), DNS, SSL, SSRF, XSS, subdomain enum.</p>
            </div>
            <div className="p-3 rounded-lg border border-transparent bg-transparent">
              <div className="font-medium text-sm text-blue-500 mb-1">Shodan — Network intelligence</div>
              <p className="text-xs text-muted-foreground">IP lookup, CVE search, DNS lookup/reverse, CPE lookup, device search. EPSS scores and exploit data.</p>
            </div>
            <div className="p-3 rounded-lg border border-transparent bg-transparent">
              <div className="font-medium text-sm text-emerald-500 mb-1">Filesystem — File operations</div>
              <p className="text-xs text-muted-foreground">Read, write, search, manage files across /mnt/bounty and /home/rainkode. Includes bigfile tools.</p>
            </div>
            <div className="p-3 rounded-lg border border-transparent bg-transparent">
              <div className="font-medium text-sm text-violet-500 mb-1">Memory Engine — Persistent knowledge</div>
              <p className="text-xs text-muted-foreground">SQLite-backed brain DB. Full-text + semantic search, topic tracking, session management.</p>
            </div>
            <div className="p-3 rounded-lg border border-transparent bg-transparent">
              <div className="font-medium text-sm text-amber-500 mb-1">Fetch — HTTP requests</div>
              <p className="text-xs text-muted-foreground">HTTP requests to external APIs. Web scraping, API testing, data retrieval.</p>
            </div>
          </div>
        </CardContent></Card>

      <Card><CardHeader><CardTitle>MCP Architecture</CardTitle></CardHeader>
        <CardContent>
          <CodeBlock>
            <div className="text-zinc-500"># Local MCP (Claude UilBracketsCurly CLI)</div>
            <div><span className="text-primary">mcp-client.ts</span>       <span className="text-zinc-500">StdioClientTransport — spawns MCP server as child process</span></div>
            <div><span className="text-primary">filesystemMCP.ts</span>    <span className="text-zinc-500">17 tools for file operations</span></div>
            <div>&nbsp;</div>
            <div className="text-zinc-500"># Cloud MCP (OpenClaw VPS)</div>
            <div><span className="text-primary">mcp-client-cloud.ts</span> <span className="text-zinc-500">SSE transport — connects to remote MCP server</span></div>
            <div><span className="text-primary">mcporter</span>            <span className="text-zinc-500">Skill bridge on VPS — routes tool calls to d3bugr Docker</span></div>
            <div>&nbsp;</div>
            <div className="text-zinc-500"># In-app MCP server</div>
            <div><span className="text-primary">mcp-supabase-server.ts</span> <span className="text-zinc-500">Exposes Supabase tables as MCP tools</span></div>
            <div>  <span className="text-emerald-500">17 tools</span>: CRUD on CVEs, KB, bookmarks, agents, endpoints, analytics</div>
          </CodeBlock>
        </CardContent></Card>

      <Card><CardContent className="pt-6"><FeatureList items={[
        { text: "5 MCP servers: d3bugr, shodan, filesystem, memory-engine, fetch", status: "done" },
        { text: "142 security tools via d3bugr MCP", status: "done" },
        { text: "StdioClientTransport for local MCP (child process)", status: "done" },
        { text: "SSE transport for cloud MCP connections", status: "done" },
        { text: "In-app Supabase MCP server (17 CRUD tools)", status: "done" },
        { text: "mcporter bridge on VPS for agent tool routing", status: "done" },
      ]} /></CardContent></Card>
    </div>
  );
}
