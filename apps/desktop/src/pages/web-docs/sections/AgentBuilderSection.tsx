import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UilRobot, UilCog, UilFlask, UilCheckCircle } from "@iconscout/react-unicons";
function Feature({ text }: { text: string }) {
  return (
    <li className="text-sm flex items-start gap-2 text-emerald-500">
      <UilCheckCircle size={14} className="mt-0.5 shrink-0" /> {text}
    </li>
  );
}

export function AgentBuilderSection() {
  return (
    <div className="space-y-6">
      <div className="space-y-2 mb-6">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <UilRobot size={32} className="text-primary" />
          Agent Builder
          <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20 text-[9px]">BETA</Badge>
        </h1>
        <p className="text-muted-foreground">Create custom AI agents with specific capabilities and workflows</p>
        <div className="h-px bg-border" />
      </div>

      <Card className="border-primary/30 bg-card/50 backdrop-blur">
        <CardHeader><CardTitle className="flex items-center gap-2"><UilCog size={20} className="text-blue-500" /> Build Custom Agents</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Design AI agents tailored to your specific security workflows. Define their purpose, instructions,
            model selection, and capabilities — then deploy them for automated tasks.
          </p>
          <ul className="space-y-1.5">
            <Feature text="Custom system prompts and instructions" />
            <Feature text="Model selection — choose the best AI for the task" />
            <Feature text="Capability configuration (tools, permissions, scope)" />
            <Feature text="Category organization (Recon, Exploit, Analysis, etc.)" />
            <Feature text="Cloud-synced — agents available across devices" />
          </ul>
        </CardContent>
      </Card>

      <Card className="border-primary/30 bg-card/50 backdrop-blur">
        <CardHeader><CardTitle className="flex items-center gap-2"><UilFlask size={20} className="text-violet-500" /> Agent Testing Lab</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Test your custom agents in a controlled environment before deployment. Benchmark performance,
            validate outputs, and refine instructions.
          </p>
          <ul className="space-y-1.5">
            <Feature text="Interactive testing environment" />
            <Feature text="Multi-agent benchmarking" />
            <Feature text="Response quality evaluation" />
            <Feature text="Iteration tracking and comparison" />
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
