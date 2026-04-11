import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UilBolt, UilCheckCircle, UilExclamationTriangle, UilRocket, UilEnvelope } from "@iconscout/react-unicons";
export function BetaProgramSection() {
  return (
    <div className="space-y-6">
      <div className="space-y-2 mb-6">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <UilBolt size={32} className="text-primary" />
          Beta Program
          <Badge className="bg-primary/10 text-primary border-primary/20">Active</Badge>
        </h1>
        <p className="text-muted-foreground">CrowByte is currently in closed beta — here's what that means</p>
        <div className="h-px bg-border" />
      </div>

      <Card className="border-primary/30 bg-card/50 backdrop-blur">
        <CardHeader><CardTitle className="flex items-center gap-2"><UilRocket size={20} className="text-emerald-500" /> What's Live</CardTitle></CardHeader>
        <CardContent>
          <ul className="space-y-1.5">
            {[
              "Multi-model AI Chat (Claude, DeepSeek, Qwen, Mistral, and more)",
              "CVE UilDatabase with NVD + Shodan dual-source lookup",
              "Knowledge Base with cloud sync",
              "Bookmarks with categories and tags",
              "Red Team operation tracking",
              "Cyber Ops — 95+ security tools",
              "Network Scanner — 10 nmap profiles",
              "Agent Builder and Testing Lab",
              "Mission Planner with phased operations",
              "Dashboard with system metrics",
              "Analytics and reporting",
              "User authentication and profiles",
            ].map((item, i) => (
              <li key={i} className="text-sm flex items-start gap-2 text-emerald-500">
                <UilCheckCircle size={14} className="mt-0.5 shrink-0" /> {item}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card className="border-yellow-500/20 bg-yellow-500/5">
        <CardHeader><CardTitle className="flex items-center gap-2"><UilExclamationTriangle size={20} className="text-yellow-500" /> Beta Limitations</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <ul className="space-y-1.5">
            <li className="flex items-start gap-2 text-yellow-500">~ Some features may have rough edges or incomplete UI</li>
            <li className="flex items-start gap-2 text-yellow-500">~ Desktop-only features (Terminal, full Network Scanner) not available on web</li>
            <li className="flex items-start gap-2 text-yellow-500">~ Stripe payment integration coming soon (beta access is free)</li>
            <li className="flex items-start gap-2 text-yellow-500">~ Windows and macOS desktop builds not yet available</li>
            <li className="flex items-start gap-2 text-yellow-500">~ Rate limits may apply during high-traffic periods</li>
          </ul>
        </CardContent>
      </Card>

      <Card className="border-primary/30 bg-card/50 backdrop-blur">
        <CardHeader><CardTitle className="flex items-center gap-2"><UilEnvelope size={20} className="text-violet-500" /> Request Beta Access</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            Beta access is currently invite-only. To request access:
          </p>
          <ol className="space-y-1.5 ml-4">
            <li className="flex items-start gap-2"><span className="text-primary font-bold">1.</span> Create an account at <strong className="text-primary">crowbyte.io</strong></li>
            <li className="flex items-start gap-2"><span className="text-primary font-bold">2.</span> Go to <strong className="text-foreground">Settings → Billing</strong></li>
            <li className="flex items-start gap-2"><span className="text-primary font-bold">3.</span> Submit the beta access request form</li>
            <li className="flex items-start gap-2"><span className="text-primary font-bold">4.</span> You'll receive an email when your access is approved</li>
          </ol>
        </CardContent>
      </Card>

      <Card className="border-primary/30 bg-card/50 backdrop-blur">
        <CardHeader><CardTitle>Feedback</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>
            Found a bug? Have a feature request? We want to hear from you.
            Use the feedback form in <strong className="text-foreground">Settings</strong> or reach out to the development team.
            Beta testers who report issues will receive priority access and potential discounts on future paid tiers.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
