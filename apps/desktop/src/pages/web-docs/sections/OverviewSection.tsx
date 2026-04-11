import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UilShield, UilHeartRate, UilCommentDots, UilCrosshair, UilWindow, UilBookOpen, UilMonitor, UilSearch, UilFocusTarget, UilBrain, UilBolt, UilSitemap, UilBug, UilBoltAlt, UilCheckCircle, UilClock } from "@iconscout/react-unicons";
function StatusBadge({ status }: { status: "ready" | "beta" | "coming" | "desktop" }) {
  const config = {
    ready: { cls: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20", label: "LIVE" },
    beta: { cls: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20", label: "BETA" },
    coming: { cls: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20", label: "COMING SOON" },
    desktop: { cls: "bg-blue-500/10 text-blue-400 border-blue-500/20", label: "DESKTOP" },
  }[status];
  return <Badge className={`text-[9px] ${config.cls}`}>{config.label}</Badge>;
}

export function OverviewSection() {
  return (
    <div className="space-y-6">
      <div className="space-y-2 mb-6">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <UilShield size={32} className="text-primary" />
          CrowByte UilWindow
          <Badge className="bg-primary/10 text-primary border-primary/20">v1.0 Beta</Badge>
        </h1>
        <p className="text-muted-foreground">AI-powered offensive security command center for bug bounty hunters and security professionals</p>
        <div className="h-px bg-border" />
      </div>

      <Card className="border-primary/30 bg-card/50 backdrop-blur">
        <CardHeader><CardTitle>What is CrowByte?</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            CrowByte UilWindow is a <strong className="text-foreground">security operations platform</strong> designed for professional
            bug bounty hunters, penetration testers, and security researchers. It combines AI-powered analysis with
            a comprehensive toolkit for offensive and defensive security operations.
          </p>
          <p>
            The platform integrates multiple AI providers including <strong className="text-foreground">Claude</strong> (Anthropic),
            <strong className="text-foreground"> DeepSeek</strong>, <strong className="text-foreground">Qwen</strong>,
            <strong className="text-foreground"> Mistral</strong>, and more — giving you access to a wide range of AI models
            for security research, code analysis, and automated reconnaissance.
          </p>
          <p>
            All data syncs across devices in real-time via cloud storage — your CVEs, knowledge base, agents,
            bookmarks, and red team operations are always up to date.
          </p>
        </CardContent>
      </Card>

      <Card className="border-primary/30 bg-card/50 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><UilHeartRate size={20} /> Platform Status</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="flex items-center gap-3"><StatusBadge status="beta" /><span className="text-sm">Web app — live at crowbyte.io (closed beta)</span></div>
          <div className="flex items-center gap-3"><StatusBadge status="coming" /><span className="text-sm">Desktop app — Linux build in development</span></div>
          <div className="flex items-center gap-3"><StatusBadge status="coming" /><span className="text-sm">Desktop app — Windows and macOS builds coming soon</span></div>
        </CardContent>
      </Card>

      <Card className="border-primary/30 bg-card/50 backdrop-blur">
        <CardHeader>
          <CardTitle>Core Features</CardTitle>
          <CardDescription>Everything you need for professional security operations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: "AI Chat", desc: "Multi-provider AI chat with integrated security tools for research", icon: UilCommentDots, status: "ready" as const },
              { label: "Red Team Ops", desc: "Track operations, findings, and evidence in one place", icon: UilCrosshair, status: "ready" as const },
              { label: "Cyber Ops", desc: "95+ integrated security tools with guided workflows", icon: UilBoltAlt, status: "ready" as const },
              { label: "CVE UilDatabase", desc: "Search, track, and analyze vulnerabilities with NVD + Shodan", icon: UilBug, status: "ready" as const },
              { label: "Network Scanner", desc: "10 nmap scan profiles — requires desktop app", icon: UilSitemap, status: "desktop" as const },
              { label: "Security Monitor", desc: "AI-powered security monitoring — requires desktop app", icon: UilShield, status: "desktop" as const },
              { label: "Knowledge Base", desc: "Cloud-synced research entries with file attachments", icon: UilBookOpen, status: "ready" as const },
              { label: "Agent Builder", desc: "Create custom AI agents with specific capabilities", icon: UilBrain, status: "beta" as const },
              { label: "Mission Planner", desc: "Phase-based operation planning and tracking", icon: UilFocusTarget, status: "beta" as const },
              { label: "Fleet Management", desc: "UilMonitor endpoints and agent status across your infra", icon: UilMonitor, status: "beta" as const },
              { label: "Threat Intelligence", desc: "IOC feeds, enrichment, and correlation", icon: UilBolt, status: "beta" as const },
              { label: "UilWindow", desc: "Integrated terminal with tmux — requires desktop app", icon: UilWindow, status: "desktop" as const },
            ].map((f) => (
              <div key={f.label} className="flex items-start gap-3 p-3 rounded-lg border border-border/50 bg-card/30">
                <f.icon size={20} className="text-primary mt-0.5 shrink-0" />
                <div>
                  <div className="text-sm font-medium flex items-center gap-2">{f.label} <StatusBadge status={f.status} /></div>
                  <div className="text-xs text-muted-foreground">{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
