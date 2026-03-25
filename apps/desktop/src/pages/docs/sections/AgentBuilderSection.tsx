import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Robot } from "@phosphor-icons/react";
import { DocHeader, FeatureList, CodeBlock } from "../components";

export function AgentBuilderSection() {
  return (
    <div className="space-y-6">
      <DocHeader icon={Robot} title="Agent Builder" description="Create custom AI agents with specific personas, tools, and capabilities" status="beta" />

      <Card><CardHeader><CardTitle>How it works</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>The Agent Builder lets you create custom AI agents stored in Supabase. Each agent has a name, description,
            system prompt (instructions), model selection, category, conversation starters, and capability toggles.</p>
          <p>Agents are executed via the <code className="text-primary">customAgentExecutor</code> service which routes
            the agent's configuration through OpenClaw with the custom system prompt injected.</p>
        </CardContent></Card>

      <Card><CardHeader><CardTitle>CRUD Workflow</CardTitle></CardHeader>
        <CardContent>
          <CodeBlock>
            <div className="text-zinc-500"># custom-agents.ts → Supabase service</div>
            <div>&nbsp;</div>
            <div><span className="text-emerald-500">createAgent()</span>  <span className="text-zinc-500">Insert new agent config to custom_agents table</span></div>
            <div><span className="text-emerald-500">updateAgent()</span>  <span className="text-zinc-500">Modify existing agent (name, prompt, model, caps)</span></div>
            <div><span className="text-emerald-500">deleteAgent()</span>  <span className="text-zinc-500">Remove agent from database</span></div>
            <div><span className="text-emerald-500">getAgents()</span>    <span className="text-zinc-500">Fetch all agents for current user</span></div>
            <div>&nbsp;</div>
            <div className="text-zinc-500"># custom-agent-executor.ts → Execution engine</div>
            <div>&nbsp;</div>
            <div><span className="text-emerald-500">executeAgent(agent, prompt)</span></div>
            <div>  1. Load agent config (system prompt, model, capabilities)</div>
            <div>  2. Build OpenClaw request with injected system prompt</div>
            <div>  3. Stream response back to UI via SSE</div>
            <div>  4. Handle tool calls if agent has tool capabilities</div>
          </CodeBlock>
        </CardContent></Card>

      <Card><CardHeader><CardTitle>Supabase Schema: custom_agents</CardTitle></CardHeader>
        <CardContent>
          <CodeBlock>
            <div><span className="text-primary">name</span>          <span className="text-zinc-500">TEXT     — Agent display name</span></div>
            <div><span className="text-primary">description</span>   <span className="text-zinc-500">TEXT     — Short description</span></div>
            <div><span className="text-primary">instructions</span>  <span className="text-zinc-500">TEXT     — System prompt (persona, behavior rules)</span></div>
            <div><span className="text-primary">model</span>         <span className="text-zinc-500">TEXT     — OpenClaw model ID</span></div>
            <div><span className="text-primary">category</span>      <span className="text-zinc-500">TEXT     — security / coding / research / analysis / custom</span></div>
            <div><span className="text-primary">capabilities</span>  <span className="text-zinc-500">JSONB    — web_search, code_execution, mcp_tools, file_access</span></div>
            <div><span className="text-primary">starters</span>      <span className="text-zinc-500">TEXT[]   — Predefined conversation starter prompts</span></div>
            <div><span className="text-primary">user_id</span>       <span className="text-zinc-500">UUID     — Owner (RLS enforced)</span></div>
          </CodeBlock>
        </CardContent></Card>

      <Card><CardContent className="pt-6"><FeatureList items={[
        { text: "Visual 3-panel layout: agent list, configuration, live preview", status: "done" },
        { text: "Custom system prompts — define agent persona and behavior", status: "done" },
        { text: "Model selection (any OpenClaw model)", status: "done" },
        { text: "Category tags: security, coding, research, analysis, custom", status: "done" },
        { text: "Capability toggles: web search, code execution, MCP tools, file access", status: "done" },
        { text: "Conversation starters — predefined prompts for quick use", status: "done" },
        { text: "Live preview panel — test agent before saving", status: "done" },
        { text: "Cloud persistence via Supabase (shared across instances)", status: "done" },
        { text: "Export/import agent configs (planned)", status: "warn" },
      ]} /></CardContent></Card>
    </div>
  );
}
