import { useState } from"react";
import { useNavigate } from"react-router-dom";
import { Badge } from"@/components/ui/badge";
import { Button } from"@/components/ui/button";
import { ScrollArea } from"@/components/ui/scroll-area";
import { motion } from"framer-motion";
import {
 ArrowLeft, Shield, Brain, Terminal, ChatDots, Database, Lightning,
 GearSix, Code, TreeStructure, Pulse,
 BookOpen, Crosshair, Sword, ShieldWarning, Target, Monitor, Robot,
 ChartBar, BookmarkSimple, Scroll, MagnifyingGlass, Bug, Globe,
 FileText, Stack, DesktopTower,
 // New icons for new sections
 DownloadSimple, Lock, TestTube, Sparkle, Wrench, HardDrives, Plug, Broadcast,
 Key, TerminalWindow, Circuitry,
} from"@phosphor-icons/react";

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
 icon: BookOpen,
 items: [
 { id:"overview", label:"Overview", icon: Shield },
 { id:"installation", label:"Installation", icon: DownloadSimple },
 { id:"auth", label:"Authentication", icon: Lock },
 ],
 },
 {
 label:"Command Center",
 color:"text-primary/70",
 icon: Pulse,
 items: [
 { id:"dashboard", label:"Dashboard", icon: Pulse },
 { id:"chat", label:"AI Chat", icon: ChatDots },
 ],
 },
 {
 label:"AI Operations",
 color:"text-blue-500/70",
 icon: Lightning,
 items: [
 { id:"ai-agent", label:"Support Agent", icon: Brain, badge:"New" },
 { id:"agent-builder", label:"Agent Builder", icon: Robot },
 { id:"agent-testing", label:"Agent Testing", icon: TestTube },
 { id:"llm", label:"LLM Models", icon: Sparkle },
 ],
 },
 {
 label:"Red Team",
 color:"text-red-500/70",
 icon: Crosshair,
 items: [
 { id:"redteam", label:"Red Team", icon: Crosshair },
 { id:"cyber-ops", label:"Cyber Ops", icon: Sword, badge:"95 tools" },
 { id:"tools-page", label:"Tools Registry", icon: Wrench },
 { id:"network-scanner", label:"Network Scanner", icon: TreeStructure },
 ],
 },
 {
 label:"Blue Team",
 color:"text-blue-500/70",
 icon: ShieldWarning,
 items: [
 { id:"security-monitor", label:"Security Monitor", icon: Shield, badge:"AI" },
 { id:"fleet", label:"Fleet Management", icon: Monitor },
 { id:"cve", label:"CVE Database", icon: Bug },
 { id:"threat-intel", label:"Threat Intelligence", icon: ShieldWarning },
 ],
 },
 {
 label:"Intelligence",
 color:"text-violet-500/70",
 icon: Database,
 items: [
 { id:"mission-planner", label:"Mission Planner", icon: Target },
 { id:"knowledge", label:"Knowledge Base", icon: BookOpen },
 { id:"bookmarks", label:"Bookmarks", icon: BookmarkSimple },
 { id:"memory", label:"Memory", icon: HardDrives },
 { id:"analytics", label:"Analytics", icon: ChartBar },
 ],
 },
 {
 label:"System",
 color:"text-muted-foreground",
 icon: Terminal,
 items: [
 { id:"terminal", label:"Terminal", icon: Terminal },
 { id:"logs", label:"Logs", icon: Scroll },
 { id:"settings", label:"Settings", icon: GearSix },
 ],
 },
 {
 label:"Integrations",
 color:"text-emerald-500/70",
 icon: Globe,
 items: [
 { id:"supabase", label:"Supabase", icon: Database },
 { id:"mcp", label:"MCP Protocol", icon: DesktopTower },
 { id:"mcp-page", label:"MCP Management", icon: Plug },
 { id:"ai-providers", label:"AI Providers", icon: Broadcast },
 { id:"nvd-shodan", label:"NVD & Shodan", icon: MagnifyingGlass },
 ],
 },
 {
 label:"Development",
 color:"text-orange-500/70",
 icon: Code,
 items: [
 { id:"tech-stack", label:"Tech Stack", icon: Stack },
 { id:"electron-arch", label:"Electron Architecture", icon: Circuitry },
 { id:"data-security", label:"Data & Security", icon: Key },
 { id:"cli-tools", label:"CLI Tools", icon: TerminalWindow },
 { id:"roadmap", label:"Roadmap", icon: Target },
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
 <ArrowLeft size={16} weight="bold" />
 </Button>
 <div className="flex items-center gap-2">
 <div className="flex h-7 w-7 items-center justify-center ring-1 ring-primary/20 bg-black">
 <FileText className="h-4 w-4 text-primary" />
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
 <group.icon size={12} weight="bold" />
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
