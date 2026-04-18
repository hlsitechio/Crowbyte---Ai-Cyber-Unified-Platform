import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UilStar } from "@iconscout/react-unicons";
import { DocHeader, FeatureList, CodeBlock } from "../components";

export function LLMSection() {
  return (
    <div className="space-y-6">

      <Card><CardHeader><CardTitle>How it works</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>The LLM page shows all available models across providers. It checks OpenClaw VPS connectivity
            and lists models from both <code className="text-primary">openclaw.getModels()</code> and
            <code className="text-primary">claudeProvider.getModels()</code>.</p>
          <p>Stats cards show total model count, NVIDIA free tier availability (via VPS), and Anthropic model access.</p>
        </CardContent></Card>

      <Card><CardHeader><CardTitle>Provider Overview</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-3 rounded-lg border border-transparent bg-transparent">
              <div className="font-medium text-sm text-violet-500 mb-1">Anthropic (Claude UilBracketsCurly CLI)</div>
              <p className="text-xs text-muted-foreground">Opus 4.6, Sonnet 4.6, Haiku 4.5 — via Electron IPC. Full MCP access. Pay-per-token.</p>
            </div>
            <div className="p-3 rounded-lg border border-transparent bg-transparent">
              <div className="font-medium text-sm text-emerald-500 mb-1">OpenClaw (NVIDIA Cloud)</div>
              <p className="text-xs text-muted-foreground">DeepSeek V3.2, Qwen3 Coder 480B, Qwen 3.5 397B, Mistral Large 675B, Kimi K2, Devstral 123B, GLM5 — Free tier via VPS proxy.</p>
            </div>
            <div className="p-3 rounded-lg border border-transparent bg-transparent">
            </div>
            <div className="p-3 rounded-lg border border-transparent bg-transparent">
              <div className="font-medium text-sm text-orange-500 mb-1">Ollama (Local)</div>
              <p className="text-xs text-muted-foreground">Hermes 3 (8B), other local models. Ollama server on localhost:11434. Zero cost, fully offline.</p>
            </div>
          </div>
        </CardContent></Card>

      <Card><CardHeader><CardTitle>Model Registry</CardTitle></CardHeader>
        <CardContent>
          <CodeBlock>
            <div className="text-zinc-500"># Claude CLI models (claude-provider.ts)</div>
            <div><span className="text-violet-500">claude-opus-4-6</span>     <span className="text-zinc-500">Most capable, highest cost</span></div>
            <div><span className="text-violet-500">claude-sonnet-4-6</span>   <span className="text-zinc-500">Balanced speed/quality</span></div>
            <div><span className="text-violet-500">claude-haiku-4-5</span>    <span className="text-zinc-500">Fast, lowest cost</span></div>
            <div>&nbsp;</div>
            <div className="text-zinc-500"># OpenClaw models (openclaw.ts) — all free via NVIDIA</div>
            <div><span className="text-emerald-500">deepseek-v3.2</span>       <span className="text-zinc-500">671B params — flagship reasoning</span></div>
            <div><span className="text-emerald-500">qwen3-coder-480b</span>    <span className="text-zinc-500">Coding specialist</span></div>
            <div><span className="text-emerald-500">qwen-3.5-397b</span>       <span className="text-zinc-500">General purpose</span></div>
            <div><span className="text-emerald-500">mistral-large-675b</span>  <span className="text-zinc-500">Multilingual reasoning</span></div>
            <div><span className="text-emerald-500">kimi-k2</span>             <span className="text-zinc-500">Moonshot reasoning</span></div>
            <div><span className="text-emerald-500">devstral-123b</span>       <span className="text-zinc-500">Fast coding</span></div>
            <div><span className="text-emerald-500">glm5</span>                <span className="text-zinc-500">Z-AI general</span></div>
            <div>&nbsp;</div>
          </CodeBlock>
        </CardContent></Card>

      <Card><CardContent className="pt-6"><FeatureList items={[
        { text: "Model overview with total count across all providers", status: "done" },
        { text: "Provider health checks — online/offline status", status: "done" },
        { text: "NVIDIA free tier model listing (via OpenClaw VPS)", status: "done" },
        { text: "Anthropic model listing with pricing tier indicators", status: "done" },
        { text: "Refresh button for live connection check", status: "done" },
        { text: "Model selection propagates to Chat provider picker", status: "done" },
      ]} /></CardContent></Card>
    </div>
  );
}
