import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UilWrench } from "@iconscout/react-unicons";
import { DocHeader, FeatureList, CodeBlock } from "../components";

export function ToolsPageSection() {
  return (
    <div className="space-y-6">
      <DocHeader icon={UilWrench} title="Tools Registry" description="Custom tool management with execution tracking and statistics" status="beta" />

      <Card><CardHeader><CardTitle>How it works</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>The Tools page provides a registry for custom security tools. Unlike CyberOps (which has a fixed catalog of 95 tools),
            the Tools page lets you <strong className="text-foreground">add your own tools</strong> with custom configurations,
            API endpoints, and execution parameters.</p>
          <p>Tools are stored in Supabase via <code className="text-primary">toolsService</code> and track execution history,
            success rates, and usage statistics.</p>
        </CardContent></Card>

      <Card><CardHeader><CardTitle>Tool Types</CardTitle></CardHeader>
        <CardContent>
          <CodeBlock>
            <div className="text-zinc-500"># tools.ts — Tool interface</div>
            <div>&nbsp;</div>
            <div><span className="text-primary">tool_type</span>:</div>
            <div>  <span className="text-emerald-500">api_endpoint</span>  <span className="text-zinc-500">External API (URL + headers)</span></div>
            <div>  <span className="text-emerald-500">cli_command</span>   <span className="text-zinc-500">Shell command (run via terminal)</span></div>
            <div>  <span className="text-emerald-500">mcp_tool</span>      <span className="text-zinc-500">MCP server tool (via d3bugr/shodan)</span></div>
            <div>  <span className="text-emerald-500">script</span>        <span className="text-zinc-500">Custom script (Python/Bash)</span></div>
            <div>&nbsp;</div>
            <div><span className="text-primary">category</span>:</div>
            <div>  analysis | scanning | exploitation | recon | defense | utility</div>
          </CodeBlock>
        </CardContent></Card>

      <Card><CardContent className="pt-6"><FeatureList items={[
        { text: "Add custom tools with name, category, type, endpoint", status: "done" },
        { text: "Tool categories: analysis, scanning, exploitation, recon, defense, utility", status: "done" },
        { text: "Stats dashboard: total tools, active count, total executions, success rate", status: "done" },
        { text: "Execute tool directly from the page", status: "done" },
        { text: "Execution history with timestamps", status: "done" },
        { text: "Delete tools from registry", status: "done" },
        { text: "Supabase-backed persistence", status: "done" },
      ]} /></CardContent></Card>
    </div>
  );
}
