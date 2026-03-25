import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Target, CaretRight, CheckCircle } from "@phosphor-icons/react";
import { DocHeader } from "../components";

export function RoadmapSection() {
  return (
    <div className="space-y-6">
      <DocHeader icon={Target} title="Roadmap" description="Completed milestones and planned features" />

      <Card className="border-transparent"><CardContent className="pt-6">
        <div className="text-sm font-medium text-emerald-500 mb-3 flex items-center gap-2">
          <CheckCircle size={16} weight="bold" /> Recently Completed
        </div>
        <ul className="space-y-2 text-sm text-muted-foreground">
          {[
            "Venice AI integration (standard + uncensored + Electron IPC)",
            "Memory page for persistent fact storage",
            "Agent Testing Lab with multi-agent benchmarking",
            "Threat Intelligence feeds with IOC tracking",
            "Analytics dashboard with Recharts visualizations",
            "MCP Management page with Tavily integration",
            "LLM Models page with provider overview",
            "AES-256-GCM credential encryption with device fingerprinting",
            "Supabase Health Dashboard in Analytics",
            "10 nmap scan profiles in Network Scanner",
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-2">
              <CheckCircle size={16} weight="bold" className="text-emerald-500 mt-0.5 shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </CardContent></Card>

      <Card className="border-transparent"><CardContent className="pt-6">
        <div className="text-sm font-medium text-orange-500 mb-3">Planned Features</div>
        <ul className="space-y-3 text-sm text-muted-foreground">
          {[
            "Chat history persistence to Supabase (cross-session)",
            "Multiple chat sessions / conversation threads",
            "File upload to chat conversations (images, documents)",
            "Code execution sandbox within the app",
            "User-configurable MCP server connections from Settings",
            "Push notifications for critical security events",
            "Export reports as PDF/JSON (HackerOne/Bugcrowd format)",
            "Custom theme builder with color presets",
            "Plugin system for third-party tool integrations",
            "Collaborative mode — multiple operators on shared workspace",
            "Automated recon pipelines (subfinder -> httpx -> nuclei chain)",
            "Mission Planner migration from localStorage to Supabase",
            "Import/export for agents, bookmarks, and settings",
            "STIX/TAXII support for Threat Intel feeds",
            "Remote command execution via Fleet endpoints",
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-2">
              <CaretRight size={16} weight="bold" className="text-orange-500 mt-0.5 shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </CardContent></Card>
    </div>
  );
}
