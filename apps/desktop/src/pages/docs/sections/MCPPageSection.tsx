import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plug } from "@phosphor-icons/react";
import { DocHeader, FeatureList, CodeBlock } from "../components";

export function MCPPageSection() {
  return (
    <div className="space-y-6">
      <DocHeader icon={Plug} title="MCP Management" description="MCP server connections UI, tool browser, and Tavily integration" status="beta" />

      <Card><CardHeader><CardTitle>How it works</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>The MCP page (distinct from the MCP Protocol doc section) provides a management UI for MCP server connections.
            It shows configured connectors, their status, capabilities, and includes a Tavily-powered search integration
            for cybersecurity intelligence.</p>
          <p>Each connector displays: name, type, status, endpoint, last sync time, data flow direction, and capabilities list.</p>
        </CardContent></Card>

      <Card><CardHeader><CardTitle>Configured Connectors</CardTitle></CardHeader>
        <CardContent>
          <CodeBlock>
            <div className="text-zinc-500"># MCP.tsx — Pre-configured connectors</div>
            <div>&nbsp;</div>
            <div><span className="text-primary">Tavily CyberSec Search</span></div>
            <div>  Type: AI Search</div>
            <div>  Endpoint: https://mcp.tavily.com/mcp/</div>
            <div>  Data Flow: Bidirectional</div>
            <div>  Caps: Web Search, Q&A, Content Extraction, Threat Intel, CVE Lookup</div>
            <div>&nbsp;</div>
            <div className="text-zinc-500"># MCP Server browser (from mcp-client.ts config)</div>
            <div><span className="text-primary">PC Monitor</span>      <span className="text-zinc-500">npx @anthropic/mcp-server-pc-monitor</span></div>
            <div><span className="text-primary">Tavily</span>          <span className="text-zinc-500">npx @anthropic/mcp-server-tavily</span></div>
            <div><span className="text-primary">Filesystem</span>      <span className="text-zinc-500">/usr/local/bin/mcp-filesystem (binary)</span></div>
            <div><span className="text-primary">Memory</span>          <span className="text-zinc-500">npx @anthropic/mcp-server-memory</span></div>
          </CodeBlock>
        </CardContent></Card>

      <Card><CardHeader><CardTitle>Tavily Integration</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>The page includes a built-in Tavily search form for cybersecurity intelligence gathering.
            Search results can be bookmarked directly to the Bookmarks page with auto-categorization.</p>
          <FeatureList items={[
            { text: "Tavily cybersec search with domain context", status: "done" },
            { text: "Search results with title, URL, content snippet", status: "done" },
            { text: "One-click bookmark to Supabase (auto-category)", status: "done" },
            { text: "Copy result URL to clipboard", status: "done" },
          ]} />
        </CardContent></Card>

      <Card><CardContent className="pt-6"><FeatureList items={[
        { text: "MCP connector status dashboard", status: "done" },
        { text: "Server health indicators (connected/disconnected)", status: "done" },
        { text: "Capability listing per server", status: "done" },
        { text: "Tavily cybersec search integration", status: "done" },
        { text: "Bookmark search results to Supabase", status: "done" },
        { text: "Add new MCP server connections (planned)", status: "warn" },
      ]} /></CardContent></Card>
    </div>
  );
}
