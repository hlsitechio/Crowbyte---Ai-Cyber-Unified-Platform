import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UilStar } from "@iconscout/react-unicons";
const models = [
  { name: "Claude Opus 4.6", provider: "Anthropic", params: "—", tier: "pro", desc: "Most capable reasoning model" },
  { name: "Claude Sonnet 4.6", provider: "Anthropic", params: "—", tier: "pro", desc: "Balanced performance and speed" },
  { name: "Claude Haiku 4.5", provider: "Anthropic", params: "—", tier: "pro", desc: "Fast, lightweight tasks" },
  { name: "DeepSeek V3.2", provider: "DeepSeek", params: "671B", tier: "free", desc: "Flagship open-source reasoning" },
  { name: "Qwen3 Coder 480B", provider: "Alibaba", params: "480B", tier: "free", desc: "UilBracketsCurly generation specialist" },
  { name: "Qwen 3.5 397B", provider: "Alibaba", params: "397B", tier: "free", desc: "General purpose" },
  { name: "Mistral Large", provider: "Mistral", params: "675B", tier: "free", desc: "Multilingual reasoning" },
  { name: "Kimi K2", provider: "Moonshot", params: "—", tier: "free", desc: "Advanced reasoning" },
  { name: "Devstral 123B", provider: "Mistral", params: "123B", tier: "free", desc: "Fast coding assistant" },
  { name: "GLM5", provider: "Z-AI", params: "—", tier: "free", desc: "General model" },
];

export function AIModelsSection() {
  return (
    <div className="space-y-6">
      <div className="space-y-2 mb-6">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <UilStar size={32} className="text-primary" />
          AI Models
        </h1>
        <p className="text-muted-foreground">Multi-provider model support — always expanding</p>
        <div className="h-px bg-border" />
      </div>

      <Card className="border-primary/30 bg-card/50 backdrop-blur">
        <CardHeader><CardTitle>Available Models</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left py-2 pr-4 text-muted-foreground font-medium">Model</th>
                  <th className="text-left py-2 pr-4 text-muted-foreground font-medium">Provider</th>
                  <th className="text-left py-2 pr-4 text-muted-foreground font-medium">Parameters</th>
                  <th className="text-left py-2 pr-4 text-muted-foreground font-medium">Tier</th>
                  <th className="text-left py-2 text-muted-foreground font-medium">Best For</th>
                </tr>
              </thead>
              <tbody>
                {models.map((m) => (
                  <tr key={m.name} className="border-b border-border/20">
                    <td className="py-2 pr-4 font-medium text-foreground">{m.name}</td>
                    <td className="py-2 pr-4 text-muted-foreground">{m.provider}</td>
                    <td className="py-2 pr-4 text-muted-foreground font-mono text-xs">{m.params}</td>
                    <td className="py-2 pr-4">
                      <Badge className={m.tier === "free"
                        ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[9px]"
                        : "bg-primary/10 text-primary border-primary/20 text-[9px]"
                      }>
                        {m.tier.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="py-2 text-muted-foreground">{m.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-zinc-600 mt-4">
            + 170 additional models available. Full list visible in the AI Chat model selector.
          </p>
        </CardContent>
      </Card>

      <Card className="border-primary/30 bg-card/50 backdrop-blur">
        <CardHeader><CardTitle>Model Selection</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>Switch models at any time using the model selector in the AI Chat page. Each conversation remembers its model selection.</p>
          <p><strong className="text-foreground">Free tier</strong> users get access to all open-source models (DeepSeek, Qwen, Mistral, etc.).</p>
          <p><strong className="text-primary">Pro tier</strong> users additionally get access to Claude models (Opus, Sonnet, Haiku) and priority inference.</p>
        </CardContent>
      </Card>
    </div>
  );
}
