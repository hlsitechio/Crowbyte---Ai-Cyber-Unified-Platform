import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Broadcast } from "@phosphor-icons/react";
import { DocHeader, FeatureList, CodeBlock } from "../components";

export function AIProvidersSection() {
  return (
    <div className="space-y-6">
      <DocHeader icon={Broadcast} title="AI Providers" description="Deep dive into all 6 AI provider implementations" status="ready" />

      <Card className="border-transparent"><CardHeader><CardTitle className="text-violet-500">1. Claude Code CLI (claude-provider.ts)</CardTitle></CardHeader>
        <CardContent>
          <CodeBlock>
            <div className="text-zinc-500"># Spawns claude -p as child process via Electron IPC</div>
            <div><span className="text-primary">Command</span>:  claude -p --output-format stream-json</div>
            <div><span className="text-primary">Models</span>:   Opus 4.6, Sonnet 4.6, Haiku 4.5</div>
            <div><span className="text-primary">IPC</span>:      electronAPI.claudeChat(prompt, options)</div>
            <div><span className="text-primary">Features</span>: Full MCP access, session persistence, budget control</div>
            <div><span className="text-primary">Stream</span>:   JSON events (assistant, result, tool_use, error)</div>
          </CodeBlock>
        </CardContent></Card>

      <Card className="border-transparent"><CardHeader><CardTitle className="text-emerald-500">2. OpenClaw (openclaw.ts)</CardTitle></CardHeader>
        <CardContent>
          <CodeBlock>
            <div className="text-zinc-500"># VPS agent swarm at your-vps-ip (VITE_OPENCLAW_HOST)</div>
            <div><span className="text-primary">Gateway</span>: https://your-vps-hostname:18789 (VITE_OPENCLAW_HOSTNAME)</div>
            <div><span className="text-primary">Proxy</span>:   NVIDIA proxy on port 19990 (re-adds model prefixes)</div>
            <div><span className="text-primary">Models</span>:  DeepSeek V3.2, Qwen3 Coder 480B, Qwen 3.5, Mistral Large, Kimi K2, Devstral, GLM5</div>
            <div><span className="text-primary">Agents</span>:  9 specialized (commander, recon, hunter, intel, analyst, sentinel, gpt, obsidian, main)</div>
            <div><span className="text-primary">Tools</span>:   execute_command, dispatch_agent (agentic chat)</div>
            <div><span className="text-primary">Auth</span>:    Bearer token via gateway password</div>
          </CodeBlock>
        </CardContent></Card>

      <Card className="border-transparent"><CardHeader><CardTitle className="text-blue-500">3. Venice AI (venice-ai.ts)</CardTitle></CardHeader>
        <CardContent>
          <CodeBlock>
            <div className="text-zinc-500"># Privacy-focused AI — standard provider</div>
            <div><span className="text-primary">API</span>:     https://api.venice.ai/api/v1/chat/completions</div>
            <div><span className="text-primary">Models</span>:  DeepSeek R1 671B, Llama 3.3 70B, Qwen 2.5 Coder</div>
            <div><span className="text-primary">Auth</span>:    Venice API key (VITE_VENICE_API_KEY)</div>
            <div><span className="text-primary">Features</span>: Streaming, system prompts, privacy-first</div>
          </CodeBlock>
        </CardContent></Card>

      <Card className="border-transparent"><CardHeader><CardTitle className="text-red-500">4. Venice Uncensored (venice-uncensored.ts)</CardTitle></CardHeader>
        <CardContent>
          <CodeBlock>
            <div className="text-zinc-500"># Venice with prompt engineering to bypass content filters</div>
            <div><span className="text-primary">Same API</span> as Venice AI but with uncensored system prompt</div>
            <div><span className="text-primary">Purpose</span>:  Security research requiring unrestricted responses</div>
            <div><span className="text-primary">Models</span>:   Same as Venice AI</div>
          </CodeBlock>
        </CardContent></Card>

      <Card className="border-transparent"><CardHeader><CardTitle className="text-cyan-500">5. Venice Electron (venice-ai-electron.ts)</CardTitle></CardHeader>
        <CardContent>
          <CodeBlock>
            <div className="text-zinc-500"># Venice routed through Electron main process</div>
            <div><span className="text-primary">Purpose</span>:  Bypass CORS restrictions in Electron renderer</div>
            <div><span className="text-primary">IPC</span>:      electronAPI.veniceChat(prompt, model)</div>
            <div><span className="text-primary">Features</span>: Same as Venice AI but via Electron IPC bridge</div>
          </CodeBlock>
        </CardContent></Card>

      <Card className="border-transparent"><CardHeader><CardTitle className="text-orange-500">6. Ollama Hermes (ollama-hermes.ts)</CardTitle></CardHeader>
        <CardContent>
          <CodeBlock>
            <div className="text-zinc-500"># Local Ollama instance</div>
            <div><span className="text-primary">Endpoint</span>: http://localhost:11434/api/chat</div>
            <div><span className="text-primary">Model</span>:    Hermes 3 (8B) — NousResearch fine-tune</div>
            <div><span className="text-primary">Cost</span>:     $0 (fully local, GPU required)</div>
            <div><span className="text-primary">Features</span>: Streaming, offline operation, no API key needed</div>
          </CodeBlock>
        </CardContent></Card>
    </div>
  );
}
