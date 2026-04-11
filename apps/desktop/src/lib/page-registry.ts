/**
 * Page Registry — Maps route paths to lazy-loaded components and metadata.
 * Used by SplitScreenLayout to render any page in any pane.
 */
import { lazy, type ComponentType, type LazyExoticComponent } from "react";

export interface PageEntry {
  path: string;
  title: string;
  component: LazyExoticComponent<ComponentType<any>> | ComponentType<any>;
  /** Sidebar section for grouping in split-picker */
  section: "command" | "ai" | "operations" | "intel" | "system";
}

// Eager imports for pages that are already loaded in the main bundle
// (avoids double-loading overhead for the most common pages)
import Dashboard from "@/pages/Dashboard";
import Analytics from "@/pages/Analytics";
import AlertCenter from "@/pages/AlertCenter";
import Chat from "@/pages/Chat";
import Terminal from "@/pages/Terminal";
import AgentBuilder from "@/pages/AgentBuilder";
import AgentTeams from "@/pages/AgentTeams";
import Sentinel from "@/pages/Sentinel";
import MissionPlanner from "@/pages/MissionPlanner";
import CVE from "@/pages/CVE";
import Knowledge from "@/pages/Knowledge";
import Reports from "@/pages/Reports";
import DetectionLab from "@/pages/DetectionLab";
import CloudSecurity from "@/pages/CloudSecurity";
import ThreatIntelligence from "@/pages/ThreatIntelligence";
import Findings from "@/pages/Findings";
import SecurityMonitor from "@/pages/SecurityMonitor";
import RedTeam from "@/pages/RedTeam";
import CyberOps from "@/pages/CyberOps";
import NetworkScanner from "@/pages/NetworkScanner";
import Fleet from "@/pages/Fleet";
import Bookmarks from "@/pages/Bookmarks";
import Memory from "@/pages/Memory";
import Logs from "@/pages/Logs";
import Tools from "@/pages/Tools";
import Connectors from "@/pages/Connectors";
import AIAgent from "@/pages/AIAgent";

export const PAGE_REGISTRY: PageEntry[] = [
  // Command Center
  { path: "/dashboard",          title: "Dashboard",        component: Dashboard,          section: "command" },
  { path: "/analytics",          title: "Analytics",         component: Analytics,           section: "command" },
  { path: "/alert-center",       title: "Alert Center",      component: AlertCenter,         section: "command" },

  // AI
  { path: "/chat",               title: "Chat",              component: Chat,                section: "ai" },
  { path: "/terminal",           title: "Terminal",          component: Terminal,            section: "ai" },
  { path: "/agent-builder",      title: "Agent Builder",     component: AgentBuilder,        section: "ai" },
  { path: "/agent-teams",        title: "Agent Teams",       component: AgentTeams,          section: "ai" },
  { path: "/ai-agent",           title: "AI Agent",          component: AIAgent,             section: "ai" },

  // Operations
  { path: "/sentinel",           title: "Sentinel AI",       component: Sentinel,            section: "operations" },
  { path: "/missions",           title: "Missions",          component: MissionPlanner,      section: "operations" },
  { path: "/redteam",            title: "Red Team",          component: RedTeam,             section: "operations" },
  { path: "/cyber-ops",          title: "Cyber Ops",         component: CyberOps,            section: "operations" },
  { path: "/network-scanner",    title: "Network Map",       component: NetworkScanner,      section: "operations" },
  { path: "/security-monitor",   title: "Security Monitor",  component: SecurityMonitor,     section: "operations" },
  { path: "/fleet",              title: "Fleet Management",  component: Fleet,               section: "operations" },
  { path: "/detection-lab",      title: "Detection Lab",     component: DetectionLab,        section: "operations" },
  { path: "/cloud-security",     title: "Cloud Security",    component: CloudSecurity,       section: "operations" },

  // Intelligence
  { path: "/cve",                title: "CVE Database",      component: CVE,                 section: "intel" },
  { path: "/threat-intelligence",title: "Threat Intel",      component: ThreatIntelligence,  section: "intel" },
  { path: "/findings",           title: "Findings",          component: Findings,            section: "intel" },
  { path: "/reports",            title: "Reports",           component: Reports,             section: "intel" },
  { path: "/knowledge",          title: "Knowledge Base",    component: Knowledge,           section: "intel" },
  { path: "/bookmarks",          title: "Bookmarks",         component: Bookmarks,           section: "intel" },
  { path: "/memory",             title: "Memory",            component: Memory,              section: "intel" },

  // System
  { path: "/logs",               title: "Logs",              component: Logs,                section: "system" },
  { path: "/tools",              title: "Tools",             component: Tools,               section: "system" },
  { path: "/connectors",         title: "Connectors",        component: Connectors,          section: "system" },
];

/** Lookup a page entry by path */
export function getPageByPath(path: string): PageEntry | undefined {
  return PAGE_REGISTRY.find((p) => p.path === path);
}

/** Get pages grouped by section */
export function getPagesBySection() {
  const sections: Record<string, PageEntry[]> = {
    command: [],
    ai: [],
    operations: [],
    intel: [],
    system: [],
  };
  for (const page of PAGE_REGISTRY) {
    sections[page.section].push(page);
  }
  return sections;
}

/** Section display names */
export const SECTION_LABELS: Record<string, string> = {
  command: "Command Center",
  ai: "AI",
  operations: "Operations",
  intel: "Intelligence",
  system: "System",
};
