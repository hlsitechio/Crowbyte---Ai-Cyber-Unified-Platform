import { useState, useEffect } from "react";
import { Brain, TreeStructure, BookOpen, ShieldCheck, GearSix, Terminal, Cpu, Pulse, Robot, ChatDots, SignOut, Sword, User, BookmarkSimple, FileText, ChartBar, Crosshair, ShieldWarning, Monitor, Scroll, Target, SidebarSimple, PlugsConnected } from "@phosphor-icons/react";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/auth";
import { useBrowserPanelSafe } from "@/contexts/browser";
import { useLogs } from "@/contexts/logs";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import {
 Sidebar,
 SidebarContent,
 SidebarGroup,
 SidebarGroupContent,
 SidebarGroupLabel,
 SidebarMenu,
 SidebarMenuButton,
 SidebarMenuItem,
 SidebarHeader,
 SidebarTrigger,
 useSidebar,
} from "@/components/ui/sidebar";

// ─── Glowing Dot Component ──────────────────────────────────────────────────

type DotColor = "silver" | "cyan" | "red" | "blue" | "purple" | "gray" | "green";

const DOT_COLORS: Record<DotColor, { core: string; glow: string; ring: string }> = {
 silver: { core: "#d4d4d8", glow: "rgba(212,212,216,0.5)", ring: "rgba(212,212,216,0.2)" },
 cyan: { core: "#22d3ee", glow: "rgba(34,211,238,0.5)", ring: "rgba(34,211,238,0.15)" },
 red: { core: "#f87171", glow: "rgba(248,113,113,0.5)", ring: "rgba(248,113,113,0.15)" },
 blue: { core: "#60a5fa", glow: "rgba(96,165,250,0.5)", ring: "rgba(96,165,250,0.15)" },
 purple: { core: "#c084fc", glow: "rgba(192,132,252,0.5)", ring: "rgba(192,132,252,0.15)" },
 green: { core: "#4ade80", glow: "rgba(74,222,128,0.5)", ring: "rgba(74,222,128,0.15)" },
 gray: { core: "#71717a", glow: "rgba(113,113,122,0.3)", ring: "rgba(113,113,122,0.1)" },
};

function GlowDot({ color, active = false }: { color: DotColor; active?: boolean }) {
 const c = DOT_COLORS[color];
 return (
 <span
 className="relative flex-shrink-0 flex items-center justify-center"
 style={{ width: 8, height: 8 }}
 >
 {/* Outer glow */}
 <span
 className="absolute inset-0 rounded-full"
 style={{
 background: `radial-gradient(circle, ${active ? c.glow : c.ring} 0%, transparent 70%)`,
 transform: active ? "scale(2.5)" : "scale(1.8)",
 transition: "transform 0.2s ease, background 0.2s ease",
 }}
 />
 {/* Core dot */}
 <span
 className="relative rounded-full"
 style={{
 width: active ? 6 : 5,
 height: active ? 6 : 5,
 background: `radial-gradient(circle at 35% 35%, ${c.core}, ${c.glow})`,
 boxShadow: active ? `0 0 6px ${c.glow}, 0 0 12px ${c.ring}` : `0 0 3px ${c.ring}`,
 transition: "all 0.2s ease",
 }}
 />
 </span>
 );
}

// ─── Section header dot color mapping ────────────────────────────────────────

const SECTION_DOT: Record<string, DotColor> = {
 command: "silver",
 ai: "cyan",
 red: "red",
 blue: "blue",
 intel: "purple",
 system: "gray",
 config: "gray",
};

// ─── Nav items ───────────────────────────────────────────────────────────────

const commandCenterItems = [
 { title: "Dashboard", url: "/dashboard", icon: Pulse },
 { title: "Analytics", url: "/analytics", icon: ChartBar },
];

const aiOperationsItems = [
 { title: "Chat", url: "/chat", icon: ChatDots },
 { title: "Search AI Agent", url: "/ai-agent", icon: Brain },
 { title: "Agent Builder", url: "/agent-builder", icon: Robot },
];

const redTeamItems = [
 { title: "Red Team", url: "/redteam", icon: Crosshair },
 { title: "Cyber Ops", url: "/cyber-ops", icon: Sword },
 { title: "Network Map", url: "/network-scanner", icon: TreeStructure },
];

const blueTeamItems = [
 { title: "Connectors", url: "/connectors", icon: PlugsConnected },
 { title: "Security Monitor", url: "/security-monitor", icon: ShieldCheck },
 { title: "Fleet Management", url: "/fleet", icon: Monitor },
 { title: "CVE Database", url: "/cve", icon: ShieldWarning },
 { title: "Threat Intelligence", url: "/threat-intelligence", icon: ShieldWarning },
];

const intelligenceItems = [
 { title: "Mission Planner", url: "/mission-planner", icon: Target },
 { title: "Knowledge Base", url: "/knowledge", icon: BookOpen },
 { title: "Bookmarks", url: "/bookmarks", icon: BookmarkSimple },
];

const systemItems = [
 { title: "Terminal", url: "/terminal", icon: Terminal },
 { title: "Logs", url: "/logs", icon: Scroll },
];

export function AppSidebar() {
 const { state } = useSidebar();
 const location = useLocation();
 const navigate = useNavigate();
 const { user, signOut } = useAuth();
 const { unreadErrorCount } = useLogs();
 const browserPanel = useBrowserPanelSafe();
 const currentPath = location.pathname;
 const [workspaceName, setWorkspaceName] = useState(localStorage.getItem('workspace_name') || 'CROWBYT_OPS');
 const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(null);

 const isActive = (path: string) => currentPath === path || (path !== "/" && currentPath.startsWith(path + "/"));

 // Listen for workspace name changes
 useEffect(() => {
 const handleStorageChange = () => {
 setWorkspaceName(localStorage.getItem('workspace_name') || 'CROWBYT_OPS');
 };

 // Listen for storage events (updates from other tabs/windows)
 window.addEventListener('storage', handleStorageChange);

 // Listen for custom event for same-tab updates
 window.addEventListener('workspaceNameChanged', handleStorageChange);

 return () => {
 window.removeEventListener('storage', handleStorageChange);
 window.removeEventListener('workspaceNameChanged', handleStorageChange);
 };
 }, []);

 // Load and listen for profile picture changes (cached to avoid repeated Supabase calls)
 useEffect(() => {
 const loadProfilePicture = async () => {
 if (!user) return;

 // Check sessionStorage cache first
 const cached = sessionStorage.getItem(`profile_pic_${user.id}`);
 if (cached) {
 setProfilePictureUrl(cached);
 return;
 }

 try {
 const { supabase } = await import('@/lib/supabase');
 const { data, error } = await supabase
 .from('user_settings')
 .select('profile_picture_url')
 .eq('user_id', user.id)
 .single();

 if (error && error.code !== 'PGRST116') {
 return;
 }

 if (data?.profile_picture_url) {
 setProfilePictureUrl(data.profile_picture_url);
 sessionStorage.setItem(`profile_pic_${user.id}`, data.profile_picture_url);
 }
 } catch {
 // Silent fail — profile pic is cosmetic
 }
 };

 const handleProfilePictureChange = () => {
 // Bust cache on explicit change
 if (user) sessionStorage.removeItem(`profile_pic_${user.id}`);
 loadProfilePicture();
 };

 loadProfilePicture();

 window.addEventListener('profilePictureChanged', handleProfilePictureChange);

 return () => {
 window.removeEventListener('profilePictureChanged', handleProfilePictureChange);
 };
 }, [user]);

 const handleLogoutAndExit = async () => {
 try {
 // First logout the user
 await signOut();

 // Then quit the app if running in Electron
 if (window.electronAPI?.quitApp) {
 await window.electronAPI.quitApp();
 }
 } catch (error) {
 console.error('Logout and exit error:', error);
 }
 };

 const renderNavItems = (items: typeof commandCenterItems, dotColor: DotColor, delayOffset: number = 0) => {
 return items.map((item, index) => {
 const isItemActive = isActive(item.url);
 const showErrorBadge = item.url === '/logs' && unreadErrorCount > 0;

 return (
 <motion.div
 key={item.title}
 initial={{ opacity: 0, x: -12 }}
 animate={{ opacity: 1, x: 0 }}
 transition={{
 duration: 0.25,
 delay: (delayOffset + index) * 0.03,
 ease: "easeOut"
 }}
 className="relative"
 >
 {isItemActive && (
 <motion.div
 layoutId="activeTab"
 className="absolute inset-0 bg-white/[0.04] rounded-md"
 transition={{ type: "spring", stiffness: 500, damping: 30 }}
 />
 )}
 <SidebarMenuItem>
 <SidebarMenuButton asChild>
 <NavLink
 to={item.url}
 end
 className={`relative hover:bg-white/[0.03] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-600 ${state === "collapsed" ? "gap-0 justify-center" : "gap-3"}`}
 >
 {state === "expanded" && <GlowDot color={dotColor} active={isItemActive} />}
 <item.icon size={16} weight="duotone" className={`flex-shrink-0 ${isItemActive ? "text-zinc-200" : "text-zinc-500"}`} />
 {state === "expanded" && (
 <span className={`text-[13px] ${isItemActive ? "text-zinc-200 font-medium" : "text-zinc-400"}`}>
 {item.title}
 </span>
 )}
 {showErrorBadge && (
 <span className="ml-auto text-[10px] text-red-500">{unreadErrorCount}</span>
 )}
 </NavLink>
 </SidebarMenuButton>
 </SidebarMenuItem>
 </motion.div>
 );
 });
 };

 return (
 <Sidebar collapsible="icon" className="border-r border-white/[0.06]">
 <SidebarHeader className={`border-b border-white/[0.04] ${state === "collapsed" ? "p-2 space-y-2" : "p-4 space-y-3"}`}>
 <div className={`flex items-center ${state === "collapsed" ? "flex-col gap-1.5" : "gap-2.5 justify-between"}`}>
 <div className="flex h-7 w-7 items-center justify-center rounded-md bg-zinc-800/80 flex-shrink-0">
 <Cpu size={16} weight="duotone" className="text-zinc-300" />
 </div>
 {state === "expanded" && (
 <span className="text-sm font-semibold text-zinc-200 tracking-wide flex-1">{workspaceName}</span>
 )}
 <SidebarTrigger className="text-zinc-500 hover:text-zinc-300 transition-colors flex-shrink-0" />
 </div>

 {/* User Info */}
 {user && state === "expanded" && (
 <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-md bg-zinc-800/30">
 <div className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-700/60 overflow-hidden">
 {profilePictureUrl ? (
 <img src={profilePictureUrl} alt="Profile" className="h-full w-full object-cover" />
 ) : (
 <User size={12} weight="bold" className="text-zinc-400" />
 )}
 </div>
 <div className="flex flex-col flex-1 min-w-0">
 <span className="text-[11px] text-zinc-500">Operator</span>
 <span className="text-xs text-zinc-300 truncate" title={user.email || ''}>
 {user.email}
 </span>
 </div>
 <GlowDot color="green" active={true} />
 </div>
 )}
 {user && state === "collapsed" && (
 <div className="flex items-center justify-center" title={user.email || 'User'}>
 <div className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-700/60">
 <User size={14} weight="bold" className="text-zinc-400" />
 </div>
 </div>
 )}
 </SidebarHeader>

 <SidebarContent>
 {/* Command Center */}
 <SidebarGroup>
 <SidebarGroupLabel className={state === "collapsed" ? "sr-only" : "text-zinc-600 uppercase text-[10px] font-medium tracking-widest pl-1"}>
 Command Center
 </SidebarGroupLabel>
 <SidebarGroupContent>
 <SidebarMenu>
 {renderNavItems(commandCenterItems, "silver", 0)}
 </SidebarMenu>
 </SidebarGroupContent>
 </SidebarGroup>

 {/* AI Operations */}
 <SidebarGroup>
 <SidebarGroupLabel className={state === "collapsed" ? "sr-only" : "text-zinc-600 uppercase text-[10px] font-medium tracking-widest pl-1"}>
 AI Operations
 </SidebarGroupLabel>
 <SidebarGroupContent>
 <SidebarMenu>
 {renderNavItems(aiOperationsItems, "cyan", 2)}
 </SidebarMenu>
 </SidebarGroupContent>
 </SidebarGroup>

 {/* Red Team (Offensive) */}
 <SidebarGroup>
 <SidebarGroupLabel className={state === "collapsed" ? "sr-only" : "text-zinc-600 uppercase text-[10px] font-medium tracking-widest pl-1"}>
 Red Team
 </SidebarGroupLabel>
 <SidebarGroupContent>
 <SidebarMenu>
 {renderNavItems(redTeamItems, "red", 6)}
 </SidebarMenu>
 </SidebarGroupContent>
 </SidebarGroup>

 {/* Blue Team (Defensive) */}
 <SidebarGroup>
 <SidebarGroupLabel className={state === "collapsed" ? "sr-only" : "text-zinc-600 uppercase text-[10px] font-medium tracking-widest pl-1"}>
 Blue Team
 </SidebarGroupLabel>
 <SidebarGroupContent>
 <SidebarMenu>
 {renderNavItems(blueTeamItems, "blue", 9)}
 </SidebarMenu>
 </SidebarGroupContent>
 </SidebarGroup>

 {/* Intelligence */}
 <SidebarGroup>
 <SidebarGroupLabel className={state === "collapsed" ? "sr-only" : "text-zinc-600 uppercase text-[10px] font-medium tracking-widest pl-1"}>
 Intelligence
 </SidebarGroupLabel>
 <SidebarGroupContent>
 <SidebarMenu>
 {renderNavItems(intelligenceItems, "purple", 11)}
 </SidebarMenu>
 </SidebarGroupContent>
 </SidebarGroup>

 {/* System */}
 <SidebarGroup>
 <SidebarGroupLabel className={state === "collapsed" ? "sr-only" : "text-zinc-600 uppercase text-[10px] font-medium tracking-widest pl-1"}>
 System
 </SidebarGroupLabel>
 <SidebarGroupContent>
 <SidebarMenu>
 {renderNavItems(systemItems, "gray", 14)}
 </SidebarMenu>
 </SidebarGroupContent>
 </SidebarGroup>

 {/* Configuration */}
 <SidebarGroup className="mt-auto">
 <SidebarGroupLabel className={state === "collapsed" ? "sr-only" : "text-zinc-600 uppercase text-[10px] font-medium tracking-widest pl-1"}>
 Configuration
 </SidebarGroupLabel>
 <SidebarGroupContent>
 <SidebarMenu>
 {/* Documentation */}
 <motion.div
 whileHover={{ x: 2 }}
 className="relative"
 >
 {isActive("/documentation") && (
 <motion.div
 layoutId="activeTab"
 className="absolute inset-0 bg-white/[0.04] rounded-md"
 transition={{ type: "spring", stiffness: 500, damping: 30 }}
 />
 )}
 <SidebarMenuItem>
 <SidebarMenuButton asChild>
 <NavLink
 to="/documentation"
 className={`relative hover:bg-white/[0.03] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-600 ${state === "collapsed" ? "gap-0 justify-center" : "gap-3"}`}
 >
 {state === "expanded" && <GlowDot color="gray" active={isActive("/documentation")} />}
 <FileText size={16} weight="duotone" className={`flex-shrink-0 ${isActive("/documentation") ? "text-zinc-200" : "text-zinc-500"}`} />
 {state === "expanded" && (
 <span className={`text-[13px] ${isActive("/documentation") ? "text-zinc-200 font-medium" : "text-zinc-400"}`}>
 Documentation
 </span>
 )}
 </NavLink>
 </SidebarMenuButton>
 </SidebarMenuItem>
 </motion.div>

 {/* Browser Panel Toggle */}
 {browserPanel && (
 <motion.div
 whileHover={{ x: 2 }}
 className="relative"
 >
 {browserPanel.isOpen && (
 <motion.div
 className="absolute inset-0 bg-white/[0.04] rounded-md"
 transition={{ type: "spring", stiffness: 500, damping: 30 }}
 />
 )}
 <SidebarMenuItem>
 <SidebarMenuButton asChild>
 <button
 onClick={browserPanel.toggle}
 className={`relative w-full flex items-center px-2 py-1.5 rounded-md hover:bg-white/[0.03] transition-colors duration-150 ${state === "collapsed" ? "gap-0 justify-center" : "gap-3"}`}
 >
 {state === "expanded" && <GlowDot color="gray" active={browserPanel.isOpen} />}
 <SidebarSimple size={16} weight="duotone" className={`flex-shrink-0 ${browserPanel.isOpen ? "text-zinc-200" : "text-zinc-500"}`} />
 {state === "expanded" && (
 <span className={`text-[13px] ${browserPanel.isOpen ? "text-zinc-200 font-medium" : "text-zinc-400"}`}>
 Browser
 </span>
 )}
 {state === "expanded" && (
 <span className="ml-auto text-[10px] text-zinc-600">Ctrl+B</span>
 )}
 </button>
 </SidebarMenuButton>
 </SidebarMenuItem>
 </motion.div>
 )}

 {/* Settings */}
 <motion.div
 whileHover={{ x: 2 }}
 className="relative"
 >
 {isActive("/settings") && (
 <motion.div
 layoutId="activeTab"
 className="absolute inset-0 bg-white/[0.04] rounded-md"
 transition={{ type: "spring", stiffness: 500, damping: 30 }}
 />
 )}
 <SidebarMenuItem>
 <SidebarMenuButton asChild>
 <NavLink
 to="/settings"
 className={`relative hover:bg-white/[0.03] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-600 ${state === "collapsed" ? "gap-0 justify-center" : "gap-3"}`}
 >
 {state === "expanded" && <GlowDot color="gray" active={isActive("/settings")} />}
 <GearSix size={16} weight="duotone" className={`flex-shrink-0 ${isActive("/settings") ? "text-zinc-200" : "text-zinc-500"}`} />
 {state === "expanded" && (
 <span className={`text-[13px] ${isActive("/settings") ? "text-zinc-200 font-medium" : "text-zinc-400"}`}>
 Settings
 </span>
 )}
 </NavLink>
 </SidebarMenuButton>
 </SidebarMenuItem>
 </motion.div>

 {/* Exit */}
 <motion.div
 whileHover={{ x: 2 }}
 className="relative"
 >
 <SidebarMenuItem>
 <SidebarMenuButton asChild>
 <Button
 variant="ghost"
 onClick={handleLogoutAndExit}
 className={`relative w-full hover:bg-white/[0.03] transition-colors duration-150 text-foreground hover:text-red-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-600 ${state === "collapsed" ? "justify-center gap-0" : "justify-start gap-3"}`}
 >
 {state === "expanded" && <GlowDot color="red" active={false} />}
 <SignOut size={16} weight="duotone" className="text-zinc-500 flex-shrink-0" />
 {state === "expanded" && <span className="text-[13px] text-zinc-400">Exit</span>}
 </Button>
 </SidebarMenuButton>
 </SidebarMenuItem>
 </motion.div>
 </SidebarMenu>
 </SidebarGroupContent>
 </SidebarGroup>
 </SidebarContent>
 </Sidebar>
 );
}
