import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UilWindow, UilCheckCircle } from "@iconscout/react-unicons";
function Feature({ text }: { text: string }) {
  return (
    <li className="text-sm flex items-start gap-2 text-emerald-500">
      <UilCheckCircle size={14} className="mt-0.5 shrink-0" /> {text}
    </li>
  );
}

export function TerminalSection() {
  return (
    <div className="space-y-6">
      <div className="space-y-2 mb-6">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <UilWindow size={32} className="text-primary" />
          UilWindow
          <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20 text-[9px]">DESKTOP</Badge>
        </h1>
        <p className="text-muted-foreground">Integrated terminal with tmux support and shell presets</p>
        <div className="h-px bg-border" />
      </div>

      <Card className="border-primary/30 bg-card/50 backdrop-blur">
        <CardHeader><CardTitle>Features</CardTitle></CardHeader>
        <CardContent>
          <ul className="space-y-1.5">
            <Feature text="Full terminal emulator built into CrowByte" />
            <Feature text="tmux integration for session management" />
            <Feature text="Multiple shell support (bash, zsh)" />
            <Feature text="Copy/paste with keyboard shortcuts" />
            <Feature text="Customizable font, theme, and cursor style" />
            <Feature text="Auto-resize to fit the panel" />
          </ul>
        </CardContent>
      </Card>

      <Card className="border-amber-500/20 bg-amber-500/5">
        <CardContent className="pt-6">
          <div className="text-sm text-muted-foreground">
            <strong className="text-amber-500">Desktop Only:</strong> The integrated terminal is available in the desktop app.
            Web users can use the AI chat for command suggestions and tool execution.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
