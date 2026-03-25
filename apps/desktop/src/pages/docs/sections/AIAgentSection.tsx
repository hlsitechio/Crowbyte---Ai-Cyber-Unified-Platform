import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain } from "@phosphor-icons/react";
import { DocHeader, FeatureList, CodeBlock } from "../components";

export function AIAgentSection() {
  return (
    <div className="space-y-6">
      <DocHeader icon={Brain} title="Search AI Agent" description="Autonomous research agent powered by Tavily web search with multi-step reasoning" status="beta" />

      <Card><CardHeader><CardTitle>How it works</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>The Search AI Agent uses <strong className="text-foreground">Tavily API</strong> for web search combined with
            LLM reasoning to perform multi-step research tasks. It searches the web, reads sources, extracts relevant information,
            and synthesizes answers with citations.</p>
          <p>Requires a <code className="text-primary">VITE_TAVILY_API_KEY</code> in the environment. The agent auto-initializes on page mount.</p>
        </CardContent></Card>

      <Card><CardHeader><CardTitle>Search Modes</CardTitle></CardHeader>
        <CardContent>
          <CodeBlock>
            <div className="text-zinc-500"># Tavily search configuration (searchAgent.ts)</div>
            <div>&nbsp;</div>
            <div><span className="text-primary">quick</span>    <span className="text-zinc-500">Fast single-pass search, top 5 results</span></div>
            <div><span className="text-primary">deep</span>     <span className="text-zinc-500">Multi-step search with follow-up queries, source validation</span></div>
            <div><span className="text-primary">academic</span> <span className="text-zinc-500">Research-focused with citation tracking</span></div>
            <div>&nbsp;</div>
            <div className="text-zinc-500"># The agent operates in an action-observation loop:</div>
            <div><span className="text-emerald-500">1.</span> Parse user query into search terms</div>
            <div><span className="text-emerald-500">2.</span> Execute Tavily search (fetch URLs, extract content)</div>
            <div><span className="text-emerald-500">3.</span> Observe results, decide if more info needed</div>
            <div><span className="text-emerald-500">4.</span> Repeat or synthesize final answer with sources</div>
          </CodeBlock>
        </CardContent></Card>

      <Card><CardHeader><CardTitle>cybersec-ai-agent.ts</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>A specialized agent focused on cybersecurity research. It extends the base search agent with:</p>
          <FeatureList items={[
            { text: "CVE-aware search — auto-detects CVE IDs and enriches with NVD data", status: "done" },
            { text: "Exploit search — checks ExploitDB, GitHub PoCs for discovered vulns", status: "done" },
            { text: "Threat actor profiling — MITRE ATT&CK technique correlation", status: "done" },
            { text: "Vulnerability context — adds CVSS, affected products, patch status", status: "done" },
          ]} />
        </CardContent></Card>

      <Card><CardContent className="pt-6"><FeatureList items={[
        { text: "Multi-step web search with source citation", status: "done" },
        { text: "Step-by-step reasoning display (action + observation)", status: "done" },
        { text: "Source cards with title, URL, and content preview", status: "done" },
        { text: "Chat-style interface with message history", status: "done" },
        { text: "Auto-scrolling conversation view", status: "done" },
        { text: "Tavily API key configurable from Settings", status: "done" },
        { text: "Cost: ~$0.01 per search (Tavily pricing)", status: "info" },
      ]} /></CardContent></Card>
    </div>
  );
}
