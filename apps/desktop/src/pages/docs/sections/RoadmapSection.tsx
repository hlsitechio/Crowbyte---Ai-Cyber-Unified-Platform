import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Target, CaretRight, CheckCircle, Sparkle, Wrench } from "@phosphor-icons/react";
import { DocHeader } from "../components";

const recentlyCompleted = [
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
];

const possibleNewFeatures = [
  "Conversation workspace with cross-session chat history",
  "Multiple chat sessions / conversation threads",
  "File uploads inside chat conversations (images, documents)",
  "Code execution sandbox within the app",
  "Push notifications for critical security events",
  "Plugin system for third-party tool integrations",
  "Collaborative mode for shared operator workspaces",
  "Automated recon pipelines (subfinder → httpx → nuclei chain)",
  "STIX/TAXII support for Threat Intel feeds",
  "Remote command execution via Fleet endpoints",
];

const featureEnhancements = [
  "User-configurable MCP server connections directly from Settings",
  "Export reports as PDF/JSON in HackerOne and Bugcrowd-ready formats",
  "Custom theme builder with reusable color presets",
  "Mission Planner migration from localStorage to Supabase",
  "Import/export for agents, bookmarks, and settings",
];

export function RoadmapSection() {
  return (
    <div className="space-y-6">
      <DocHeader icon={Target} title="Roadmap" description="Completed milestones, possible new features, and targeted feature enhancements" />

      <div className="grid gap-3 md:grid-cols-3">
        <Card className="border-transparent">
          <CardContent className="pt-6">
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Recently Completed</div>
            <div className="mt-2 flex items-end justify-between">
              <div className="text-3xl font-semibold text-emerald-500">{recentlyCompleted.length}</div>
              <Badge className="bg-transparent text-emerald-500 border-transparent">Live now</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-transparent">
          <CardContent className="pt-6">
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Possible New Features</div>
            <div className="mt-2 flex items-end justify-between">
              <div className="text-3xl font-semibold text-orange-500">{possibleNewFeatures.length}</div>
              <Badge className="bg-transparent text-orange-500 border-transparent">Discovery</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-transparent">
          <CardContent className="pt-6">
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Feature Enhancements</div>
            <div className="mt-2 flex items-end justify-between">
              <div className="text-3xl font-semibold text-sky-500">{featureEnhancements.length}</div>
              <Badge className="bg-transparent text-sky-500 border-transparent">Improve current flows</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-transparent"><CardContent className="pt-6">
        <div className="text-sm font-medium text-emerald-500 mb-3 flex items-center gap-2">
          <CheckCircle size={16} weight="bold" /> Recently Completed
        </div>
        <ul className="space-y-2 text-sm text-muted-foreground">
          {recentlyCompleted.map((item, i) => (
            <li key={i} className="flex items-start gap-2">
              <CheckCircle size={16} weight="bold" className="text-emerald-500 mt-0.5 shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </CardContent></Card>

      <Card className="border-transparent"><CardContent className="pt-6">
        <div className="flex items-center gap-2 text-sm font-medium text-orange-500 mb-3">
          <Sparkle size={16} weight="bold" /> Possible New Features
        </div>
        <ul className="space-y-3 text-sm text-muted-foreground">
          {possibleNewFeatures.map((item, i) => (
            <li key={i} className="flex items-start gap-2">
              <CaretRight size={16} weight="bold" className="text-orange-500 mt-0.5 shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </CardContent></Card>

      <Card className="border-transparent"><CardContent className="pt-6">
        <div className="flex items-center gap-2 text-sm font-medium text-sky-500 mb-3">
          <Wrench size={16} weight="bold" /> Feature Enhancements
        </div>
        <ul className="space-y-3 text-sm text-muted-foreground">
          {featureEnhancements.map((item, i) => (
            <li key={i} className="flex items-start gap-2">
              <CaretRight size={16} weight="bold" className="text-sky-500 mt-0.5 shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </CardContent></Card>
    </div>
  );
}
