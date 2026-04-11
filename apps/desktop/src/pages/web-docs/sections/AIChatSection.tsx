import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UilCommentDots, UilBrain, UilBolt, UilCheckCircle } from "@iconscout/react-unicons";
function Feature({ text }: { text: string }) {
  return (
    <li className="text-sm flex items-start gap-2 text-emerald-500">
      <UilCheckCircle size={14} className="mt-0.5 shrink-0" /> {text}
    </li>
  );
}

export function AIChatSection() {
  return (
    <div className="space-y-6">
      <div className="space-y-2 mb-6">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <UilCommentDots size={32} className="text-primary" />
          AI Chat
        </h1>
        <p className="text-muted-foreground">Multi-provider AI chat with streaming, tool use, and conversation history</p>
        <div className="h-px bg-border" />
      </div>

      <Card className="border-primary/30 bg-card/50 backdrop-blur">
        <CardHeader><CardTitle className="flex items-center gap-2"><UilBrain size={20} className="text-blue-500" /> Claude Provider</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Chat with <strong className="text-foreground">Anthropic's Claude</strong> models directly inside CrowByte.
            Claude has access to security tools, can execute commands, search vulnerabilities, and assist with
            reconnaissance — all within the conversation.
          </p>
          <ul className="space-y-1.5">
            <Feature text="Claude Opus 4.6, Sonnet 4.6, Haiku 4.5 — select per conversation" />
            <Feature text="Streamed responses with real-time token output" />
            <Feature text="Full tool access — can run nmap, nuclei, sqlmap, and more" />
            <Feature text="Persistent sessions across messages" />
            <Feature text="Thinking block display — see the AI's reasoning process" />
          </ul>
        </CardContent>
      </Card>

      <Card className="border-primary/30 bg-card/50 backdrop-blur">
        <CardHeader><CardTitle className="flex items-center gap-2"><UilBolt size={20} className="text-emerald-500" /> Open-Source Models</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Access <strong className="text-foreground">open-source AI models</strong> via CrowByte's cloud inference — new models added regularly.
            These models run on high-performance GPU infrastructure and are free for all users.
          </p>
          <ul className="space-y-1.5">
            <Feature text="DeepSeek V3.2 (671B) — flagship reasoning model" />
            <Feature text="Qwen3 Coder 480B — coding specialist" />
            <Feature text="Qwen 3.5 397B — general purpose" />
            <Feature text="Mistral Large 675B — multilingual reasoning" />
            <Feature text="Kimi K2 — advanced reasoning" />
            <Feature text="GLM5, Devstral 123B, and many more" />
          </ul>
        </CardContent>
      </Card>

      <Card className="border-primary/30 bg-card/50 backdrop-blur">
        <CardHeader><CardTitle>Chat Features</CardTitle></CardHeader>
        <CardContent>
          <ul className="space-y-1.5">
            <Feature text="Provider switcher — toggle between AI providers mid-conversation" />
            <Feature text="Markdown rendering with syntax-highlighted code blocks" />
            <Feature text="Copy buttons on code blocks" />
            <Feature text="Thinking/reasoning block collapse" />
            <Feature text="Conversation sidebar — saved chat history" />
            <Feature text="System prompt customization" />
            <Feature text="Cost tracking per message" />
            <Feature text="Stop generation button" />
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
