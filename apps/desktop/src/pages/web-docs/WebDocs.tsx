import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/auth";
import { isAdmin } from "@/lib/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion } from "framer-motion";
import { UilArrowLeft, UilShield, UilRocket, UilCommentDots, UilStar, UilBug, UilCrosshair, UilBoltAlt, UilSitemap, UilShieldExclamation, UilMonitor, UilBookOpen, UilRobot, UilFocusTarget, UilBookmark, UilBolt, UilChartBar, UilWindow, UilLock, UilDollarSign, UilQuestionCircle, UilFileAlt, UilHeartRate, UilBrain } from "@iconscout/react-unicons";
import type { WebDocSection, WebNavGroup } from "./types";

import {
  OverviewSection, GettingStartedSection, AIChatSection, AIModelsSection,
  CVEDatabaseSection, RedTeamSection, CyberOpsSection, NetworkScannerSection,
  SecurityMonitorSection, FleetSection, KnowledgeBaseSection, AgentBuilderSection,
  MissionPlannerSection, BookmarksSection, ThreatIntelSection, AnalyticsSection,
  TerminalSection, SecuritySection, BetaProgramSection, PricingSection,
  RoadmapSection, FAQSection,
} from "./sections";

const NAV_GROUPS: WebNavGroup[] = [
  {
    label: "Getting Started",
    color: "text-primary/70",
    icon: UilRocket,
    items: [
      { id: "overview", label: "Overview", icon: UilShield },
      { id: "getting-started", label: "Quick Start", icon: UilRocket },
      { id: "beta-program", label: "Beta Program", icon: UilBolt, badge: "Active" },
    ],
  },
  {
    label: "AI Features",
    color: "text-blue-500/70",
    icon: UilBrain,
    items: [
      { id: "ai-chat", label: "AI Chat", icon: UilCommentDots },
      { id: "ai-models", label: "AI Models", icon: UilStar },
      { id: "agent-builder", label: "Agent Builder", icon: UilRobot, badge: "Beta", adminOnly: true },
    ],
  },
  {
    label: "Offensive Security",
    color: "text-red-500/70",
    icon: UilCrosshair,
    items: [
      { id: "red-team", label: "Red Team Ops", icon: UilCrosshair },
      { id: "cyber-ops", label: "Cyber Ops", icon: UilBoltAlt, badge: "95 tools" },
      { id: "network-scanner", label: "Network Scanner", icon: UilSitemap },
      { id: "mission-planner", label: "Mission Planner", icon: UilFocusTarget },
    ],
  },
  {
    label: "Defense & Intel",
    color: "text-blue-500/70",
    icon: UilShieldExclamation,
    items: [
      { id: "cve-database", label: "CVE UilDatabase", icon: UilBug },
      { id: "security-monitor", label: "Security Monitor", icon: UilShield, badge: "AI" },
      { id: "threat-intel", label: "Threat Intel", icon: UilShieldExclamation },
      { id: "fleet", label: "Fleet", icon: UilMonitor },
    ],
  },
  {
    label: "Research Tools",
    color: "text-violet-500/70",
    icon: UilBookOpen,
    items: [
      { id: "knowledge-base", label: "Knowledge Base", icon: UilBookOpen },
      { id: "bookmarks", label: "Bookmarks", icon: UilBookmark },
      { id: "analytics", label: "Analytics", icon: UilChartBar },
      { id: "terminal", label: "UilWindow", icon: UilWindow, badge: "Desktop" },
    ],
  },
  {
    label: "Platform",
    color: "text-muted-foreground",
    icon: UilShield,
    items: [
      { id: "security", label: "Security & Privacy", icon: UilLock },
      { id: "pricing", label: "Pricing", icon: UilDollarSign },
      { id: "roadmap", label: "Roadmap", icon: UilFocusTarget },
      { id: "faq", label: "FAQ", icon: UilQuestionCircle },
    ],
  },
];

function renderSection(section: WebDocSection) {
  switch (section) {
    case "overview": return <OverviewSection />;
    case "getting-started": return <GettingStartedSection />;
    case "ai-chat": return <AIChatSection />;
    case "ai-models": return <AIModelsSection />;
    case "cve-database": return <CVEDatabaseSection />;
    case "red-team": return <RedTeamSection />;
    case "cyber-ops": return <CyberOpsSection />;
    case "network-scanner": return <NetworkScannerSection />;
    case "security-monitor": return <SecurityMonitorSection />;
    case "fleet": return <FleetSection />;
    case "knowledge-base": return <KnowledgeBaseSection />;
    case "agent-builder": return <AgentBuilderSection />;
    case "mission-planner": return <MissionPlannerSection />;
    case "bookmarks": return <BookmarksSection />;
    case "threat-intel": return <ThreatIntelSection />;
    case "analytics": return <AnalyticsSection />;
    case "terminal": return <TerminalSection />;
    case "security": return <SecuritySection />;
    case "beta-program": return <BetaProgramSection />;
    case "pricing": return <PricingSection />;
    case "roadmap": return <RoadmapSection />;
    case "faq": return <FAQSection />;
    default: return <OverviewSection />;
  }
}

export default function WebDocs() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const admin = isAdmin(user?.id);
  const [activeSection, setActiveSection] = useState<WebDocSection>("overview");

  return (
    <div className="flex w-full h-screen bg-background">
      {/* Docs Sidebar */}
      <div className="w-64 shrink-0 border-r border-white/[0.06] bg-sidebar flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-primary/20 space-y-3">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/")}
              className="h-8 w-8 p-0 hover:bg-primary/10"
            >
              <UilArrowLeft size={16} />
            </Button>
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center ring-1 ring-primary/20 bg-black">
                <UilFileAlt className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm font-bold text-gradient-silver tracking-wider">DOCS</span>
              <Badge variant="secondary" className="text-[8px] h-3.5 px-1">22</Badge>
            </div>
          </div>
        </div>

        {/* Nav sections */}
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {NAV_GROUPS.map((group) => (
              <div key={group.label} className="mb-2">
                <div className={`flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider ${group.color}`}>
                  <group.icon size={12} />
                  {group.label}
                </div>
                {group.items.filter(item => !item.adminOnly || admin).map((item) => {
                  const isActive = activeSection === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveSection(item.id)}
                      className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-all relative ${
                        isActive
                          ? "bg-primary/10 text-primary border-l-2 border-primary"
                          : "text-muted-foreground hover:text-foreground hover:bg-white/[0.03]"
                      }`}
                    >
                      <item.icon className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{item.label}</span>
                      {item.badge && (
                        <span className="ml-auto text-[9px] text-primary">{item.badge}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="p-3 border-t border-white/[0.04]">
          <div className="text-[10px] text-zinc-600 text-center">
            CrowByte v1.0 Beta | 22 sections
          </div>
        </div>
      </div>

      {/* Content Area */}
      <ScrollArea className="flex-1">
        <motion.div
          key={activeSection}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="max-w-4xl mx-auto p-8"
        >
          {renderSection(activeSection)}
        </motion.div>
      </ScrollArea>
    </div>
  );
}
