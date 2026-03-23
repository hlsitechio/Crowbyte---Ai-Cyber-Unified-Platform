import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, Brain, Zap } from "lucide-react";
import { DocHeader, FeatureList } from "../components";

export function ChatSection() {
  return (
    <div className="space-y-6">
      <DocHeader icon={MessageSquare} title="AI Chat" description="Dual-provider AI chat with streaming, tool use, and conversation history" status="ready" />

      <Card className="border-blue-500/30"><CardHeader><CardTitle className="flex items-center gap-2"><Brain className="h-5 w-5 text-blue-400" /> Claude Code CLI Provider</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Claude runs <strong className="text-foreground">inside CrowByte</strong> via Electron IPC. The app spawns
            <code className="text-primary mx-1">claude -p --output-format stream-json</code> as a child process through the Electron main process.
            Claude has full access to MCP servers (d3bugr, shodan, filesystem, memory-engine), all Kali tools, and the
            <code className="text-primary mx-1">.env-unfiltered</code> workspace with its CLAUDE.md identity.
          </p>
          <FeatureList items={[
            { text: "Claude Opus 4.6, Sonnet 4.6, Haiku 4.5 — select per-conversation", status: "done" },
            { text: "Streamed via Electron IPC (electronAPI.claudeChat)", status: "done" },
            { text: "Full MCP tool access — can run nmap, nuclei, sqlmap through d3bugr", status: "done" },
            { text: "Persistent sessions — sessionId carried across messages", status: "done" },
            { text: "Budget control — configurable max spend per message", status: "done" },
            { text: "Thinking block display — collapsible <think> sections", status: "done" },
          ]} />
        </CardContent></Card>

      <Card className="border-green-500/30"><CardHeader><CardTitle className="flex items-center gap-2"><Zap className="h-5 w-5 text-green-400" /> OpenClaw Provider</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            OpenClaw connects to a remote VPS agent swarm at <code className="text-primary">your-vps-ip</code> (configured via VITE_OPENCLAW_HOST).
            It routes through an NVIDIA proxy (<code className="text-primary">port 19990</code>) that re-adds model provider prefixes
            stripped by OpenClaw, then forwards to NVIDIA Cloud's free inference API.
          </p>
          <FeatureList items={[
            { text: "DeepSeek V3.2 (671B) — flagship reasoning model", status: "done" },
            { text: "Qwen3 Coder 480B — coding specialist", status: "done" },
            { text: "Qwen 3.5 397B — general purpose", status: "done" },
            { text: "Mistral Large 675B — multilingual reasoning", status: "done" },
            { text: "Kimi K2 — Moonshot reasoning model", status: "done" },
            { text: "Devstral 123B — fast coding assistant", status: "done" },
            { text: "GLM5 — Z-AI general model", status: "done" },
          ]} />
        </CardContent></Card>

      <Card><CardHeader><CardTitle>Chat Features</CardTitle></CardHeader>
        <CardContent><FeatureList items={[
          { text: "Provider switcher — toggle between Claude and OpenClaw mid-conversation", status: "done" },
          { text: "Streaming responses with real-time token output", status: "done" },
          { text: "Markdown rendering (ReactMarkdown + remark-gfm)", status: "done" },
          { text: "Code block syntax highlighting with copy buttons", status: "done" },
          { text: "Thinking/reasoning block collapse (DeepSeek <think> tags)", status: "done" },
          { text: "Conversation sidebar — saved chat history", status: "done" },
          { text: "System prompt customization via settings sheet", status: "done" },
          { text: "Cost tracking per message (Claude provider)", status: "done" },
          { text: "Stop generation button (abort stream)", status: "done" },
        ]} /></CardContent></Card>
    </div>
  );
}
