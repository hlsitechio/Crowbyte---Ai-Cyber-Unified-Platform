import { useState } from"react";
import { useNavigate } from"react-router-dom";
import { Badge } from"@/components/ui/badge";
import { Button } from"@/components/ui/button";
import { ScrollArea } from"@/components/ui/scroll-area";
import { motion } from"framer-motion";
import { UilArrowLeft, UilShield, UilBrain, UilWindow, UilCommentDots, UilDatabase, UilBolt, UilCog, UilBracketsCurly, UilSitemap, UilHeartRate, UilBookOpen, UilCrosshair, UilBoltAlt, UilShieldExclamation, UilFocusTarget, UilMonitor, UilRobot, UilChartBar, UilBookmark, UilScroll, UilSearch, UilBug, UilGlobe, UilFileAlt, UilLayerGroup, UilDesktopAlt, UilLock, UilFlask, UilStar, UilWrench, UilServer, UilPlug, UilSignalAlt, UilKeySkeleton, UilCircuit } from "@iconscout/react-unicons";
import type { DocSection, NavGroup } from"./docs/types";

import {
 OverviewSection, InstallationSection, AuthSection,
 DashboardSection, ChatSection,
 AIAgentSection, AgentBuilderSection, AgentTestingSection, LLMSection,
 RedTeamSection, CyberOpsSection, ToolsPageSection, NetworkScannerSection,
 SecurityMonitorSection, FleetSection, CVESection, ThreatIntelSection,
 MissionPlannerSection, KnowledgeSection, BookmarksSection, MemorySection, AnalyticsSection,
 TerminalSection, LogsSection, SettingsSection,
 SupabaseSection, MCPSection, MCPPageSection, AIProvidersSection, NVDShodanSection,
 TechStackSection, ElectronArchSection, DataSecuritySection, CLIToolsSection, RoadmapSection,
} from"./docs/sections";

const NAV_GROUPS: NavGroup[] = [
 {
 label:"Getting Started",
 color:"text-primary/70",
 icon: UilBookOpen,
 items: [
 { id:"overview", label:"Overview", icon: UilShield },
 { id:"installation", label:"Installation", icon: UilDesktopAlt },
 { id:"auth", label:"Authentication", icon: UilLock },
 ],
 },
 {
 label:"Command Center",
 color:"text-primary/70",
 icon: UilHeartRate,
 items: [
 { id:"dashboard", label:"Dashboard", icon: UilHeartRate },
 { id:"chat", label:"AI Chat", icon: UilCommentDots },
 ],
 },
 {
 label:"AI Operations",
 color:"text-blue-500/70",
 icon: UilBolt,
 items: [
 { id:"ai-agent", label:"Support Agent", icon: UilBrain, badge:"New" },
 { id:"agent-builder", label:"Agent Builder", icon: UilRobot },
 { id:"agent-testing", label:"Agent Testing", icon: UilFlask },
 { id:"llm", label:"LLM Models", icon: UilStar },
 ],
 },
 {
 label:"Red Team",
 color:"text-red-500/70",
 icon: UilCrosshair,
 items: [
 { id:"redteam", label:"Red Team", icon: UilCrosshair },
 { id:"cyber-ops", label:"Cyber Ops", icon: UilBoltAlt, badge:"95 tools" },
 { id:"tools-page", label:"Tools Registry", icon: UilWrench },
 { id:"network-scanner", label:"Network Scanner", icon: UilSitemap },
 ],
 },
 {
 label:"Blue Team",
 color:"text-blue-500/70",
 icon: UilShieldExclamation,
 items: [
 { id:"security-monitor", label:"Security Monitor", icon: UilShield, badge:"AI" },
 { id:"fleet", label:"Fleet Management", icon: UilMonitor },
 { id:"cve", label:"CVE Database", icon: UilBug },
 { id:"threat-intel", label:"Threat Intelligence", icon: UilShieldExclamation },
 ],
 },
 {
 label:"Intelligence",
 color:"text-violet-500/70",
 icon: UilDatabase,
 items: [
 { id:"mission-planner", label:"Mission Planner", icon: UilFocusTarget },
 { id:"knowledge", label:"Knowledge Base", icon: UilBookOpen },
 { id:"bookmarks", label:"Bookmarks", icon: UilBookmark },
 { id:"memory", label:"Memory", icon: UilServer },
 { id:"analytics", label:"Analytics", icon: UilChartBar },
 ],
 },
 {
 label:"System",
 color:"text-muted-foreground",
 icon: UilWindow,
 items: [
 { id:"terminal", label:"Terminal", icon: UilWindow },
 { id:"logs", label:"Logs", icon: UilScroll },
 { id:"settings", label:"Settings", icon: UilCog },
 ],
 },
 {
 label:"Integrations",
 color:"text-emerald-500/70",
 icon: UilGlobe,
 items: [
 { id:"supabase", label:"Supabase", icon: UilDatabase },
 { id:"mcp", label:"MCP Protocol", icon: UilDesktopAlt },
 { id:"mcp-page", label:"MCP Management", icon: UilPlug },
 { id:"ai-providers", label:"AI Providers", icon: UilSignalAlt },
 { id:"nvd-shodan", label:"NVD & Shodan", icon: UilSearch },
 ],
 },
 {
 label:"Development",
 color:"text-orange-500/70",
 icon: UilBracketsCurly,
 items: [
 { id:"tech-stack", label:"Tech Stack", icon: UilLayerGroup },
 { id:"electron-arch", label:"Electron Architecture", icon: UilCircuit },
 { id:"data-security", label:"Data & Security", icon: UilKeySkeleton },
 { id:"cli-tools", label:"CLI Tools", icon: UilDesktopAlt },
 { id:"roadmap", label:"Roadmap", icon: UilFocusTarget },
 ],
 },
];

function renderSection(section: DocSection) {
 switch (section) {
 case"overview": return <OverviewSection />;
 case"installation": return <InstallationSection />;
 case"auth": return <AuthSection />;
 case"dashboard": return <DashboardSection />;
 case"chat": return <ChatSection />;
 case"ai-agent": return <AIAgentSection />;
 case"agent-builder": return <AgentBuilderSection />;
 case"agent-testing": return <AgentTestingSection />;
 case"llm": return <LLMSection />;
 case"redteam": return <RedTeamSection />;
 case"cyber-ops": return <CyberOpsSection />;
 case"tools-page": return <ToolsPageSection />;
 case"network-scanner": return <NetworkScannerSection />;
 case"security-monitor": return <SecurityMonitorSection />;
 case"fleet": return <FleetSection />;
 case"cve": return <CVESection />;
 case"threat-intel": return <ThreatIntelSection />;
 case"mission-planner": return <MissionPlannerSection />;
 case"knowledge": return <KnowledgeSection />;
 case"bookmarks": return <BookmarksSection />;
 case"memory": return <MemorySection />;
 case"analytics": return <AnalyticsSection />;
 case"terminal": return <TerminalSection />;
 case"logs": return <LogsSection />;
 case"settings": return <SettingsSection />;
 case"supabase": return <SupabaseSection />;
 case"mcp": return <MCPSection />;
 case"mcp-page": return <MCPPageSection />;
 case"ai-providers": return <AIProvidersSection />;
 case"nvd-shodan": return <NVDShodanSection />;
 case"tech-stack": return <TechStackSection />;
 case"electron-arch": return <ElectronArchSection />;
 case"data-security": return <DataSecuritySection />;
 case"cli-tools": return <CLIToolsSection />;
 case"roadmap": return <RoadmapSection />;
 default: return <OverviewSection />;
 }
}

export default function Documentation() {
 const navigate = useNavigate();
 const [activeSection, setActiveSection] = useState<DocSection>("overview");

 return (
 <div className="flex w-full h-[calc(100vh-2rem)]">
 {/* Docs Sidebar */}
 <div className="w-64 shrink-0 border-r border-white/[0.06] bg-sidebar flex flex-col">
 {/* Back button + header */}
 <div className="p-4 border-b border-primary/20 space-y-3">
 <div className="flex items-center gap-2">
 <Button
 variant="ghost"
 size="sm"
 onClick={() => navigate("/dashboard")}
 className="h-8 w-8 p-0 hover:bg-primary/10"
 >
 <UilArrowLeft size={16} />
 </Button>
 <div className="flex items-center gap-2">
 <div className="flex h-7 w-7 items-center justify-center ring-1 ring-primary/20 bg-black">
 <UilFileAlt className="h-4 w-4 text-primary" />
 </div>
 <span className="text-sm font-bold text-gradient-silver tracking-wider">DOCS</span>
 <Badge variant="secondary" className="text-[8px] h-3.5 px-1">34</Badge>
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
 {group.items.map((item) => {
 const isActive = activeSection === item.id;
 return (
 <button
 key={item.id}
 onClick={() => setActiveSection(item.id)}
 className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-all relative ${
 isActive
 ?"bg-primary/10 text-primary border-l-2 border-primary"
 :"text-muted-foreground hover:text-foreground hover:bg-white/[0.03]"
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
 CrowByte Terminal v1.0 | 34 sections | {new Date().toLocaleDateString()}
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
