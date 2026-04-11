import { Card, CardContent } from "@/components/ui/card";
import { UilFocusTarget, UilCheckCircle, UilAngleRight, UilClock } from "@iconscout/react-unicons";
export function RoadmapSection() {
  return (
    <div className="space-y-6">
      <div className="space-y-2 mb-6">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <UilFocusTarget size={32} className="text-primary" />
          Roadmap
        </h1>
        <p className="text-muted-foreground">What we've built and what's coming next</p>
        <div className="h-px bg-border" />
      </div>

      <Card className="border-transparent">
        <CardContent className="pt-6">
          <div className="text-sm font-medium text-emerald-500 mb-3 flex items-center gap-2">
            <UilCheckCircle size={16} /> Completed
          </div>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {[
              "Multi-provider AI Chat with growing model support",
              "CVE UilDatabase with dual-source NVD + Shodan lookup",
              "Red Team operation tracking and findings management",
              "Cyber Ops — 95+ integrated security tools",
              "Network Scanner — 10 nmap scan profiles",
              "Knowledge Base with cloud sync and file attachments",
              "Agent Builder + Testing Lab",
              "Mission Planner with phase-based operations",
              "Bookmarks with categories and tags",
              "Threat Intelligence with IOC tracking",
              "Security Monitor with AI analysis",
              "Fleet Management for endpoints and agents",
              "Analytics dashboard with visualizations",
              "Encrypted credential vault (desktop)",
              "User authentication and tier system",
              "Integrated terminal with tmux (desktop)",
              "Web beta launch at crowbyte.io",
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <UilCheckCircle size={16} className="text-emerald-500 mt-0.5 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card className="border-transparent">
        <CardContent className="pt-6">
          <div className="text-sm font-medium text-primary mb-3 flex items-center gap-2">
            <UilClock size={16} /> In Progress
          </div>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {[
              "CI/CD pipeline for automated deployments",
              "Staging environment at staging.crowbyte.io",
              "Stripe checkout integration for paid tiers",
              "Windows and macOS desktop builds",
              "Full signup flow testing and validation",
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <UilClock size={16} className="text-primary mt-0.5 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card className="border-transparent">
        <CardContent className="pt-6">
          <div className="text-sm font-medium text-orange-500 mb-3 flex items-center gap-2">
            <UilAngleRight size={16} /> Planned
          </div>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {[
              "Chat history persistence to cloud (cross-session)",
              "Multiple chat sessions / conversation threads",
              "File upload to chat conversations",
              "Export reports as PDF/JSON (HackerOne/Bugcrowd format)",
              "Push notifications for critical security events",
              "Plugin system for third-party tool integrations",
              "Collaborative mode — multiple operators on shared workspace",
              "Automated recon pipelines (chained tool execution)",
              "STIX/TAXII support for Threat Intel feeds",
              "Custom theme builder",
              "Import/export for agents, bookmarks, and settings",
              "Mobile companion app",
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <UilAngleRight size={16} className="text-orange-500 mt-0.5 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
