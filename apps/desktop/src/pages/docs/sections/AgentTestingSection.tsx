import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TestTube } from "@phosphor-icons/react";
import { DocHeader, FeatureList, CodeBlock } from "../components";

export function AgentTestingSection() {
  return (
    <div className="space-y-6">
      <DocHeader icon={TestTube} title="Agent Testing Lab" description="Comprehensive testing dashboard for all AI agents with benchmarking" status="beta" />

      <Card><CardHeader><CardTitle>How it works</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>The Agent Testing page provides a unified interface to test all AI agents in CrowByte. It uses the
            <code className="text-primary mx-1">agentTester</code> service to run predefined test suites against each agent
            (Search, OpenClaw, Monitoring, Custom agents) and collect pass/fail results with timing metrics.</p>
          <p>Tests run sequentially with progress tracking. Results show per-agent success rates, response times,
            and detailed error logs for failed tests.</p>
        </CardContent></Card>

      <Card><CardHeader><CardTitle>Testable Agents</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { name: "Search Agent (Tavily)", config: "maxResults, tavilyApiKey", tests: "Query parsing, result quality, source citation" },
              { name: "OpenClaw Agent", config: "model, temperature, maxTokens, requestType", tests: "Connection, streaming, tool calling, fallback" },
              { name: "Monitoring Agent (GHOST)", config: "model, interval, maxIterations", tests: "Metric collection, threat detection, alert generation" },
              { name: "Custom Agents", config: "per-agent from Agent Builder", tests: "System prompt injection, capability enforcement" },
            ].map((a) => (
              <div key={a.name} className="p-3 rounded-lg border border-border/50 bg-card/30">
                <div className="text-sm font-medium mb-1">{a.name}</div>
                <div className="text-xs text-muted-foreground">Config: {a.config}</div>
                <div className="text-xs text-muted-foreground">Tests: {a.tests}</div>
              </div>
            ))}
          </div>
        </CardContent></Card>

      <Card><CardHeader><CardTitle>Agent Config Parameters</CardTitle></CardHeader>
        <CardContent>
          <CodeBlock>
            <div className="text-zinc-500"># OpenClaw agent config</div>
            <div><span className="text-primary">model</span>         <span className="text-zinc-500">llama-3.3-70b (default)</span></div>
            <div><span className="text-primary">temperature</span>   <span className="text-zinc-500">0.7 (creativity vs determinism)</span></div>
            <div><span className="text-primary">maxTokens</span>     <span className="text-zinc-500">2048 (response length limit)</span></div>
            <div><span className="text-primary">requestType</span>   <span className="text-zinc-500">exploit | vulnerability | attack_vector | tool_usage | general</span></div>
            <div><span className="text-primary">preferLowRisk</span> <span className="text-zinc-500">true (safety preference)</span></div>
            <div><span className="text-primary">enableFallback</span> <span className="text-zinc-500">true (try alt model on failure)</span></div>
            <div>&nbsp;</div>
            <div className="text-zinc-500"># Monitoring agent config</div>
            <div><span className="text-primary">model</span>         <span className="text-zinc-500">deepseek-v3.1</span></div>
            <div><span className="text-primary">interval</span>      <span className="text-zinc-500">300000ms (5 min)</span></div>
            <div><span className="text-primary">maxIterations</span> <span className="text-zinc-500">10 (tool loop limit)</span></div>
          </CodeBlock>
        </CardContent></Card>

      <Card><CardContent className="pt-6"><FeatureList items={[
        { text: "Run all agents or select specific agent for testing", status: "done" },
        { text: "Progress bar with current agent name and test count", status: "done" },
        { text: "Per-agent results: pass/fail count, success rate, avg response time", status: "done" },
        { text: "Detailed error logs for failed tests", status: "done" },
        { text: "Configurable agent parameters before test run", status: "done" },
        { text: "Export test results as JSON", status: "done" },
        { text: "Benchmark comparison across models (planned)", status: "warn" },
      ]} /></CardContent></Card>
    </div>
  );
}
