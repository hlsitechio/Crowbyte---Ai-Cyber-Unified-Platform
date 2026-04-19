import { useState, useEffect, useCallback } from "react";
import { UilBrain, UilSitemap, UilBookOpen, UilShield, UilShieldCheck, UilCog, UilWindow, UilProcessor, UilHeartRate, UilRobot, UilCommentDots, UilSignout, UilBoltAlt, UilUser, UilBookmark, UilFileAlt, UilChartBar, UilCrosshair, UilShieldExclamation, UilMonitor, UilScroll, UilFocusTarget, UilLeftArrowFromLeft, UilPlug, UilFilter, UilNotebooks, UilBolt, UilRocket, UilBell, UilCloud, UilDownloadAlt, UilHeadphones, UilFlask, UilTicket, UilListOlAlt, UilClipboard, UilFavorite, UilAngleDown, UilBug, UilDatabase, UilLock, UilSearch, UilExclamationTriangle, UilAnalysis } from "@iconscout/react-unicons";
import { getPinnedUrls, togglePin, initPins } from "@/services/sidebar-pins";
import { IS_WEB, IS_ELECTRON } from "@/lib/platform";
import { isAdmin } from "@/lib/admin";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/auth";
import { useBrowserPanelSafe } from "@/contexts/browser";
import { useLogs } from "@/contexts/logs";
import { getUnreadCount } from "@/services/subscription";
import { supportAgent } from "@/services/support-agent";
import { CreditsBadge } from "@/components/CreditsBadge";
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
 SidebarMenuSub,
 SidebarMenuSubItem,
 SidebarMenuSubButton,
 SidebarHeader,
 SidebarFooter,
 SidebarTrigger,
 useSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import {
 Tooltip,
 TooltipContent,
 TooltipProvider,
 TooltipTrigger,
} from "@/components/ui/tooltip";

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

// Desktop: full glow effect with radial gradients and box-shadow
function GlowDotDesktop({ color, active = false }: { color: DotColor; active?: boolean }) {
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

// Web: simple colored dot, no radial gradients or animated box-shadow
function GlowDotWeb({ color, active = false }: { color: DotColor; active?: boolean }) {
 const c = DOT_COLORS[color];
 return (
  <span
   className="flex-shrink-0 rounded-full"
   style={{
    width: active ? 6 : 5,
    height: active ? 6 : 5,
    backgroundColor: c.core,
    opacity: active ? 1 : 0.5,
    transition: "opacity 0.15s ease, width 0.15s ease, height 0.15s ease",
   }}
  />
 );
}

function GlowDot(props: { color: DotColor; active?: boolean }) {
 return IS_WEB ? <GlowDotWeb {...props} /> : <GlowDotDesktop {...props} />;
}

// ─── Section header dot color mapping ────────────────────────────────────────

const SECTION_DOT: Record<string, DotColor> = {
 command: "silver",
 ism: "green",
 ai: "cyan",
 red: "red",
 blue: "blue",
 intel: "purple",
 system: "gray",
 config: "gray",
 operations: "red",
 settings: "gray",
};

// ─── Nav items ───────────────────────────────────────────────────────────────

interface NavItem {
 title: string;
 url: string;
 icon: typeof UilHeartRate;
 beta?: boolean; // Requires desktop beta access
 adminOnly?: boolean; // Hidden from non-admin users
}

// ─── Desktop nav items (full) ────────────────────────────────────────────────

const commandCenterItems: NavItem[] = [
 { title: "Dashboard", url: "/dashboard", icon: UilHeartRate },
 { title: "Analytics", url: "/analytics", icon: UilChartBar },
 { title: "Alert Center", url: "/alert-center", icon: UilBell },
];

const ismItems: NavItem[] = [
 { title: "Mission Center", url: "/ism", icon: UilShieldCheck },
 { title: "Cases", url: "/ism/cases", icon: UilTicket },
 { title: "Missions", url: "/missions", icon: UilRocket },
 { title: "Compliance", url: "/ism/compliance", icon: UilClipboard },
];

const aiOperationsItems: NavItem[] = [
 { title: "AI Chat", url: "/chat", icon: UilCommentDots },
 { title: "Terminal", url: "/terminal", icon: UilWindow },
 { title: "Agent Builder", url: "/agent-builder", icon: UilRobot, adminOnly: true },
 { title: "Agent Teams", url: "/agent-teams", icon: UilBolt, adminOnly: true },
];

const redTeamItems: NavItem[] = [
 { title: "Red Team", url: "/redteam", icon: UilCrosshair, beta: true },
 { title: "Cyber Ops", url: "/cyber-ops", icon: UilBoltAlt, beta: true },
 { title: "Network Map", url: "/network-scanner", icon: UilSitemap, beta: true },
];

const defenderSubItems: NavItem[] = [
 { title: "Overview", url: "/defender", icon: UilHeartRate },
 { title: "Threats", url: "/defender/threats", icon: UilBug },
 { title: "Sandbox", url: "/defender/sandbox", icon: UilFlask },
 { title: "Rules", url: "/defender/rules", icon: UilFileAlt },
 { title: "IOCs", url: "/defender/iocs", icon: UilDatabase },
 { title: "Quarantine", url: "/defender/quarantine", icon: UilLock },
 { title: "Forensics", url: "/defender/forensics", icon: UilSearch },
];

const blueTeamItems: NavItem[] = [
 { title: "Sentinel AI", url: "/sentinel", icon: UilShield },
 { title: "Security Monitor", url: "/security-monitor", icon: UilShieldCheck, beta: true },
 { title: "Fleet Management", url: "/fleet", icon: UilMonitor, beta: true },
 { title: "Detection Lab", url: "/detection-lab", icon: UilBolt },
 { title: "Cloud Security", url: "/cloud-security", icon: UilCloud },
];

const intelligenceItems: NavItem[] = [
 { title: "CVE Database", url: "/cve", icon: UilShieldExclamation },
 { title: "Threat Intel", url: "/threat-intelligence", icon: UilShieldExclamation },
 { title: "Findings", url: "/findings", icon: UilFilter },
 { title: "Reports", url: "/reports", icon: UilNotebooks },
 { title: "Knowledge Base", url: "/knowledge", icon: UilBookOpen },
 { title: "Bookmarks", url: "/bookmarks", icon: UilBookmark },
 { title: "Memory", url: "/memory", icon: UilBrain, adminOnly: true },
];

const systemItems: NavItem[] = [
 { title: "Terminal", url: "/terminal", icon: UilWindow, beta: true },
 { title: "Logs", url: "/logs", icon: UilScroll },
 { title: "Connectors", url: "/connectors", icon: UilPlug },
];

// ─── Web nav items (consolidated, no beta items) ────────────────────────────

const webCommandItems: NavItem[] = [
 { title: "Dashboard", url: "/dashboard", icon: UilHeartRate },
 { title: "Analytics", url: "/analytics", icon: UilChartBar },
 { title: "Alert Center", url: "/alert-center", icon: UilBell },
];

const webAiItems: NavItem[] = [
 { title: "AI Chat", url: "/chat", icon: UilCommentDots },
 { title: "Terminal", url: "/terminal", icon: UilWindow },
 { title: "Agent Builder", url: "/agent-builder", icon: UilRobot, adminOnly: true },
 { title: "Agent Teams", url: "/agent-teams", icon: UilBolt, adminOnly: true },
];

const webISMItems: NavItem[] = [
 { title: "Mission Center", url: "/ism", icon: UilShieldCheck },
 { title: "Missions", url: "/missions", icon: UilRocket },
];

const webOperationsItems: NavItem[] = [
 { title: "Sentinel AI", url: "/sentinel", icon: UilShield },
 { title: "CVE Database", url: "/cve", icon: UilShieldExclamation },
 { title: "Knowledge Base", url: "/knowledge", icon: UilBookOpen },
 { title: "Reports", url: "/reports", icon: UilNotebooks },
 { title: "Detection Lab", url: "/detection-lab", icon: UilFlask },
 { title: "Cloud Security", url: "/cloud-security", icon: UilCloud },
 { title: "Threat Intel", url: "/threat-intelligence", icon: UilShieldExclamation },
 { title: "Findings", url: "/findings", icon: UilFilter },
];

const webSettingsItems: NavItem[] = [
 { title: "Settings", url: "/settings", icon: UilCog },
 { title: "Documentation", url: "/documentation", icon: UilFileAlt },
 { title: "Downloads", url: "/downloads", icon: UilDownloadAlt },
];

export function AppSidebar() {
 const { state } = useSidebar();
 const location = useLocation();
 const navigate = useNavigate();
 const { user, signOut } = useAuth();
 const { unreadErrorCount } = useLogs();
 const browserPanel = useBrowserPanelSafe();
 const currentPath = location.pathname;

 // Track last visited page for Chat context badge
 const CHAT_CONTEXT_PAGES = ['/dashboard', '/alert-center', '/findings', '/sentinel', '/terminal', '/redteam', '/cyber-ops', '/network-scanner'];
 if (currentPath !== '/chat' && CHAT_CONTEXT_PAGES.includes(currentPath)) {
   try { localStorage.setItem('cb_last_page', currentPath); } catch { /* empty */ }
 }
 const [workspaceName, setWorkspaceName] = useState(localStorage.getItem('workspace_name') || 'CROWBYT_OPS');
 const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(null);
 const [feedUnread, setFeedUnread] = useState(0);
 const [notifUnread, setNotifUnread] = useState(0);
 const [pinnedUrls, setPinnedUrls] = useState<string[]>(getPinnedUrls);

 // Build lookup map: url → NavItem (for rendering pinned items)
 const allNavItems: NavItem[] = [
  ...commandCenterItems, ...ismItems, ...aiOperationsItems,
  ...redTeamItems, ...blueTeamItems, ...intelligenceItems, ...systemItems,
 ];
 const navItemMap = new Map(allNavItems.map(item => [item.url, item]));

 // Listen for pin changes
 useEffect(() => {
  const handler = (e: Event) => setPinnedUrls((e as CustomEvent).detail || getPinnedUrls());
  window.addEventListener('pinsChanged', handler);
  initPins(); // Load from cloud
  return () => window.removeEventListener('pinsChanged', handler);
 }, []);

 const handleTogglePin = useCallback((url: string) => {
  const updated = togglePin(url);
  setPinnedUrls(updated);
 }, []);

 // Poll feed unread count every 60s
 useEffect(() => {
  const fetchCount = () => getUnreadCount().then(setFeedUnread).catch(() => {});
  fetchCount();
  const interval = setInterval(fetchCount, 60000);
  return () => clearInterval(interval);
 }, []);

 // Poll notification unread count every 30s (desktop only)
 useEffect(() => {
  if (IS_WEB) return;
  const fetchNotifs = async () => {
   try {
    const notifs = await supportAgent.getNotifications();
    setNotifUnread(notifs.filter((n: any) => !n.read && !n.dismissed).length);
   } catch { /* silent */ }
  };
  fetchNotifs();
  const interval = setInterval(fetchNotifs, 30000);
  return () => clearInterval(interval);
 }, []);

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
     .maybeSingle();

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

 const sectionLabelClass = IS_WEB
  ? "text-[10px] text-zinc-600 font-medium tracking-wide uppercase pl-1"
  : "text-zinc-500 uppercase text-[10px] font-medium tracking-widest pl-1";

 const renderNavItems = (items: NavItem[], dotColor: DotColor, delayOffset: number = 0) => {
  return items.map((item, index) => {
   const isItemActive = isActive(item.url);
   const showErrorBadge = item.url === '/logs' && unreadErrorCount > 0;
   const showFeedBadge = item.url === '/dashboard' && feedUnread > 0;
   const showNotifBadge = !IS_WEB && item.url === '/ai-agent' && notifUnread > 0;
   const isCollapsed = state === "collapsed";
   const isBetaLocked = IS_WEB && item.beta;

   // On web, skip beta-locked items entirely
   if (IS_WEB && item.beta) return null;

   // Hide admin-only items from non-admin users (web only)
   if (IS_WEB && item.adminOnly && !isAdmin(user?.id)) return null;

   const navContent = (
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
        to={isBetaLocked ? "#" : item.url}
        end
        onClick={isBetaLocked ? (e: React.MouseEvent) => {
         e.preventDefault();
         navigate('/settings/billing');
        } : isItemActive && item.url === '/terminal' ? (e: React.MouseEvent) => {
         e.preventDefault();
         window.location.reload();
        } : undefined}
        className={`group/navitem relative hover:bg-white/[0.03] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-600 ${isCollapsed ? "gap-0 justify-center" : "gap-3"} ${isBetaLocked ? "opacity-70" : ""}`}
       >
        {!isCollapsed && <GlowDot color={dotColor} active={isItemActive} />}
        <item.icon size={16} className={`flex-shrink-0 ${isBetaLocked ? "text-zinc-600" : isItemActive ? "text-zinc-100" : "text-zinc-400"}`} />
        {!isCollapsed && (
         <span className={`text-[13px] ${isBetaLocked ? "text-zinc-500" : isItemActive ? "text-zinc-100 font-medium" : "text-zinc-300"}`}>
          {item.title}
         </span>
        )}
        {!isCollapsed && isBetaLocked && (
         <span className="ml-auto text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400/70 border border-blue-500/15">beta</span>
        )}
        {showErrorBadge && (
         <span className="ml-auto text-[10px] text-red-500">{unreadErrorCount}</span>
        )}
        {showFeedBadge && (
         <span className="ml-auto flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-blue-500 text-[9px] text-white font-bold">{feedUnread > 99 ? "99+" : feedUnread}</span>
        )}
        {showNotifBadge && (
         <span className="ml-auto flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-orange-500 text-[9px] text-white font-bold">{notifUnread > 9 ? "9+" : notifUnread}</span>
        )}
        {/* Pin toggle — visible on hover, expanded only */}
        {!isCollapsed && !isBetaLocked && !showErrorBadge && !showFeedBadge && !showNotifBadge && (
         <span
          className={`ml-auto opacity-0 group-hover/navitem:opacity-100 transition-opacity cursor-pointer ${pinnedUrls.includes(item.url) ? "opacity-60 text-primary" : "text-zinc-600 hover:text-zinc-400"}`}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleTogglePin(item.url); }}
          title={pinnedUrls.includes(item.url) ? "Unpin" : "Pin to top"}
         >
          <UilFavorite size={10} />
         </span>
        )}
       </NavLink>
      </SidebarMenuButton>
     </SidebarMenuItem>
    </motion.div>
   );

   if (isCollapsed) {
    return (
     <Tooltip key={item.title} delayDuration={0}>
      <TooltipTrigger asChild>{navContent}</TooltipTrigger>
      <TooltipContent side="right" className="bg-zinc-900 border-zinc-700 text-zinc-200 text-xs px-2.5 py-1">
       {item.title}{isBetaLocked ? ' (Beta)' : ''}
      </TooltipContent>
     </Tooltip>
    );
   }

   return navContent;
  });
 };

 const CollapsedTooltip = ({ children, label }: { children: React.ReactNode; label: string }) => {
  if (state !== "collapsed") return <>{children}</>;
  return (
   <Tooltip delayDuration={0}>
    <TooltipTrigger asChild>{children}</TooltipTrigger>
    <TooltipContent side="right" className="bg-zinc-900 border-zinc-700 text-zinc-200 text-xs px-2.5 py-1">
     {label}
    </TooltipContent>
   </Tooltip>
  );
 };

 // ─── Web Sidebar ──────────────────────────────────────────────────────────
 if (IS_WEB) {
  return (
   <TooltipProvider>
    <Sidebar collapsible="icon" className="border-r border-white/[0.06]">
     <SidebarHeader className={`border-b border-white/[0.04] ${state === "collapsed" ? "p-2 space-y-1" : IS_ELECTRON ? "px-3 py-2 space-y-1.5" : "p-4 space-y-3"}`}>
      <div className={`flex items-center ${state === "collapsed" ? "flex-col gap-1.5" : "gap-2.5 justify-between"}`}>
       <div className="flex h-7 w-7 items-center justify-center rounded-md bg-zinc-800/80 flex-shrink-0">
        <UilProcessor size={16} className="text-zinc-300" />
       </div>
       {state === "expanded" && (
        <span className="text-sm font-semibold text-zinc-100 tracking-wide flex-1">{workspaceName}</span>
       )}
       <SidebarTrigger className="text-zinc-500 hover:text-zinc-300 transition-colors flex-shrink-0" />
      </div>

     </SidebarHeader>

     <SidebarContent>
      {/* Command */}
      <SidebarGroup>
       <SidebarGroupLabel className={state === "collapsed" ? "sr-only" : sectionLabelClass}>
        Command
       </SidebarGroupLabel>
       <SidebarGroupContent>
        <SidebarMenu>
         {renderNavItems(webCommandItems, "silver", 0)}
        </SidebarMenu>
       </SidebarGroupContent>
      </SidebarGroup>

      {/* AI */}
      <SidebarGroup>
       <SidebarGroupLabel className={state === "collapsed" ? "sr-only" : sectionLabelClass}>
        AI
       </SidebarGroupLabel>
       <SidebarGroupContent>
        <SidebarMenu>
         {renderNavItems(webAiItems, "cyan", 3)}
        </SidebarMenu>
       </SidebarGroupContent>
      </SidebarGroup>

      {/* ISM */}
      <SidebarGroup>
       <SidebarGroupLabel className={state === "collapsed" ? "sr-only" : sectionLabelClass}>
        ISM
       </SidebarGroupLabel>
       <SidebarGroupContent>
        <SidebarMenu>
         {renderNavItems(webISMItems, "green", 6)}
        </SidebarMenu>
       </SidebarGroupContent>
      </SidebarGroup>

      {/* Defender */}
      <SidebarGroup>
       <SidebarGroupLabel className={state === "collapsed" ? "sr-only" : sectionLabelClass}>
        Defender
       </SidebarGroupLabel>
       <SidebarGroupContent>
        <SidebarMenu>
         <Collapsible defaultOpen={location.pathname.startsWith("/defender")} className="group/collapsible">
          <SidebarMenuItem>
           <CollapsibleTrigger asChild>
            <SidebarMenuButton className={`group/navitem hover:bg-white/[0.03] transition-colors duration-150 ${state === "collapsed" ? "gap-0 justify-center" : "gap-3"}`}>
             {state !== "collapsed" && <GlowDot color="cyan" active={location.pathname.startsWith("/defender")} />}
             <UilShieldCheck size={16} className={location.pathname.startsWith("/defender") ? "text-zinc-100" : "text-zinc-400"} />
             {state !== "collapsed" && (
              <>
               <span className={`text-[13px] flex-1 ${location.pathname.startsWith("/defender") ? "text-zinc-100 font-medium" : "text-zinc-300"}`}>
                CrowByte Shield
               </span>
               <UilAngleDown size={14} className="text-zinc-500 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
              </>
             )}
            </SidebarMenuButton>
           </CollapsibleTrigger>
           <CollapsibleContent>
            <SidebarMenuSub className="ml-3.5 border-l border-white/[0.06] pl-0">
             {defenderSubItems.map((item) => {
              const isSubActive = location.pathname === item.url;
              return (
               <SidebarMenuSubItem key={item.url}>
                <SidebarMenuSubButton asChild className={isSubActive ? "bg-white/[0.04]" : ""}>
                 <NavLink to={item.url} end className="group/subitem flex items-center gap-2.5 hover:bg-white/[0.03] transition-colors">
                  <item.icon size={13} className={isSubActive ? "text-zinc-100" : "text-zinc-500"} />
                  <span className={`text-[12px] ${isSubActive ? "text-zinc-100 font-medium" : "text-zinc-400"}`}>{item.title}</span>
                 </NavLink>
                </SidebarMenuSubButton>
               </SidebarMenuSubItem>
              );
             })}
            </SidebarMenuSub>
           </CollapsibleContent>
          </SidebarMenuItem>
         </Collapsible>
        </SidebarMenu>
       </SidebarGroupContent>
      </SidebarGroup>

      {/* Operations */}
      <SidebarGroup>
       <SidebarGroupLabel className={state === "collapsed" ? "sr-only" : sectionLabelClass}>
        Operations
       </SidebarGroupLabel>
       <SidebarGroupContent>
        <SidebarMenu>
         {renderNavItems(webOperationsItems, "purple", 9)}
        </SidebarMenu>
       </SidebarGroupContent>
      </SidebarGroup>

      {/* Settings — pinned to bottom */}
      <SidebarGroup className="mt-auto">
       <SidebarGroupLabel className={state === "collapsed" ? "sr-only" : sectionLabelClass}>
        Settings
       </SidebarGroupLabel>
       <SidebarGroupContent>
        <SidebarMenu>
         {renderNavItems(webSettingsItems, "gray", 15)}

         {/* Browser Panel Toggle */}
         {browserPanel && (
          <CollapsedTooltip label="Browser">
           <motion.div whileHover={{ x: 2 }} className="relative">
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
               <UilLeftArrowFromLeft size={16} className={`flex-shrink-0 ${browserPanel.isOpen ? "text-zinc-200" : "text-zinc-500"}`} />
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
          </CollapsedTooltip>
         )}
        </SidebarMenu>
       </SidebarGroupContent>
      </SidebarGroup>
     </SidebarContent>

     {/* UilUser Info — pinned to bottom */}
     {user && (
      <SidebarFooter className={`border-t border-white/[0.06] ${state === "collapsed" ? "p-2" : "p-3"}`}>
       {state === "expanded" ? (
        <div className="space-y-1">
         <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-md bg-white/[0.04]">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-700/60 overflow-hidden flex-shrink-0">
           {profilePictureUrl ? (
            <img src={profilePictureUrl} alt="Profile" className="h-full w-full object-cover" />
           ) : (
            <UilUser size={12} className="text-zinc-400" />
           )}
          </div>
          <div className="flex flex-col flex-1 min-w-0">
           <span className="text-[11px] text-zinc-400">Operator</span>
           <span className="text-xs text-zinc-300 truncate" title={user.email || ''}>
            {user.email}
           </span>
          </div>
          <CreditsBadge />
         </div>
         <button
          onClick={handleLogoutAndExit}
          className="flex items-center gap-2 w-full px-2 py-1 rounded-md text-xs text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
         >
          <UilSignout size={12} />
          <span>Log out</span>
         </button>
        </div>
       ) : (
        <Tooltip delayDuration={0}>
         <TooltipTrigger asChild>
          <button
           onClick={handleLogoutAndExit}
           className="flex items-center justify-center w-full rounded-md hover:bg-red-500/10 transition-colors p-1.5"
          >
           <div className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-700/60">
            <UilUser size={14} className="text-zinc-400" />
           </div>
          </button>
         </TooltipTrigger>
         <TooltipContent side="right" className="bg-zinc-900 border-zinc-700 text-zinc-200 text-xs px-2.5 py-1">
          {user.email} — Log out
         </TooltipContent>
        </Tooltip>
       )}
      </SidebarFooter>
     )}
    </Sidebar>
   </TooltipProvider>
  );
 }

 // ─── Desktop Sidebar (full, unchanged) ─────────────────────────────────────
 return (
  <TooltipProvider>
   <Sidebar collapsible="icon" className="border-r border-white/[0.06]">
    <SidebarHeader className={`border-b border-white/[0.04] ${state === "collapsed" ? "p-2 space-y-1" : IS_ELECTRON ? "px-3 py-2 space-y-1.5" : "p-4 space-y-3"}`}>
     <div className={`flex items-center ${state === "collapsed" ? "flex-col gap-1.5" : "gap-2.5 justify-between"}`}>
      <div className="flex h-7 w-7 items-center justify-center rounded-md bg-zinc-800/80 flex-shrink-0">
       <UilProcessor size={16} className="text-zinc-300" />
      </div>
      {state === "expanded" && (
       <span className="text-sm font-semibold text-zinc-100 tracking-wide flex-1">{workspaceName}</span>
      )}
      {/* Global notification bell */}
      {state === "expanded" && (
       <button
        onClick={() => navigate('/ai-agent')}
        className="relative text-zinc-500 hover:text-zinc-300 transition-colors flex-shrink-0 p-1"
        title="Notifications"
       >
        <UilBell size={15} className={notifUnread > 0 ? "text-orange-400" : ""} />
        {notifUnread > 0 && (
         <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[14px] h-3.5 px-0.5 rounded-full bg-orange-500 text-[8px] text-white font-bold">
          {notifUnread > 9 ? "9+" : notifUnread}
         </span>
        )}
       </button>
      )}
      <SidebarTrigger className="text-zinc-500 hover:text-zinc-300 transition-colors flex-shrink-0" />
     </div>

    </SidebarHeader>

    <SidebarContent>
     {/* Pins — Quick Access (only show if pins exist) */}
     {pinnedUrls.length > 0 && (
      <SidebarGroup>
       <SidebarGroupLabel className={state === "collapsed" ? "sr-only" : "text-primary/60 uppercase text-[10px] font-medium tracking-widest pl-1 flex items-center gap-1.5"}>
        <UilFavorite size={10} className="text-primary/40" />
        Pins
       </SidebarGroupLabel>
       <SidebarGroupContent>
        <SidebarMenu>
         {pinnedUrls.map((url) => {
          const item = navItemMap.get(url);
          if (!item) return null;
          const isItemActive = isActive(url);
          const isCollapsed = state === "collapsed";

          const pinContent = (
           <motion.div
            key={`pin-${url}`}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.15 }}
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
               to={url}
               end
               className={`group/navitem relative hover:bg-white/[0.03] transition-colors duration-150 ${isCollapsed ? "gap-0 justify-center" : "gap-3"}`}
              >
               {!isCollapsed && <GlowDot color="silver" active={isItemActive} />}
               <item.icon size={16} className={`flex-shrink-0 ${isItemActive ? "text-zinc-100" : "text-zinc-400"}`} />
               {!isCollapsed && (
                <span className={`text-[13px] ${isItemActive ? "text-zinc-100 font-medium" : "text-zinc-300"}`}>
                 {item.title}
                </span>
               )}
               {!isCollapsed && (
                <span
                 className="ml-auto opacity-0 group-hover/navitem:opacity-100 transition-opacity cursor-pointer text-primary/50 hover:text-primary"
                 onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleTogglePin(url); }}
                 title="Unpin"
                >
                 <UilFavorite size={10} />
                </span>
               )}
              </NavLink>
             </SidebarMenuButton>
            </SidebarMenuItem>
           </motion.div>
          );

          if (isCollapsed) {
           return (
            <Tooltip key={`pin-${url}`} delayDuration={0}>
             <TooltipTrigger asChild>{pinContent}</TooltipTrigger>
             <TooltipContent side="right" className="bg-zinc-900 border-zinc-700 text-zinc-200 text-xs px-2.5 py-1">
              {item.title}
             </TooltipContent>
            </Tooltip>
           );
          }
          return pinContent;
         })}
        </SidebarMenu>
       </SidebarGroupContent>
      </SidebarGroup>
     )}

     {/* Command Center */}
     <SidebarGroup>
      <SidebarGroupLabel className={state === "collapsed" ? "sr-only" : "text-zinc-500 uppercase text-[10px] font-medium tracking-widest pl-1"}>
       Command Center
      </SidebarGroupLabel>
      <SidebarGroupContent>
       <SidebarMenu>
        {renderNavItems(commandCenterItems, "silver", 0)}
       </SidebarMenu>
      </SidebarGroupContent>
     </SidebarGroup>

     {/* ISM — Information Security Management */}
     <SidebarGroup>
      <SidebarGroupLabel className={state === "collapsed" ? "sr-only" : "text-zinc-500 uppercase text-[10px] font-medium tracking-widest pl-1"}>
       ISM
      </SidebarGroupLabel>
      <SidebarGroupContent>
       <SidebarMenu>
        {renderNavItems(ismItems, "green", 2)}
       </SidebarMenu>
      </SidebarGroupContent>
     </SidebarGroup>

     {/* AI Operations */}
     <SidebarGroup>
      <SidebarGroupLabel className={state === "collapsed" ? "sr-only" : "text-zinc-500 uppercase text-[10px] font-medium tracking-widest pl-1"}>
       AI Operations
      </SidebarGroupLabel>
      <SidebarGroupContent>
       <SidebarMenu>
        {renderNavItems(aiOperationsItems, "cyan", 6)}
       </SidebarMenu>
      </SidebarGroupContent>
     </SidebarGroup>

     {/* Red Team (Offensive) */}
     <SidebarGroup>
      <SidebarGroupLabel className={state === "collapsed" ? "sr-only" : "text-zinc-500 uppercase text-[10px] font-medium tracking-widest pl-1"}>
       Red Team
      </SidebarGroupLabel>
      <SidebarGroupContent>
       <SidebarMenu>
        {renderNavItems(redTeamItems, "red", 6)}
       </SidebarMenu>
      </SidebarGroupContent>
     </SidebarGroup>

     {/* Defender (Collapsible with sub-tabs) */}
     <SidebarGroup>
      <SidebarGroupLabel className={state === "collapsed" ? "sr-only" : "text-zinc-500 uppercase text-[10px] font-medium tracking-widest pl-1"}>
       Defender
      </SidebarGroupLabel>
      <SidebarGroupContent>
       <SidebarMenu>
        <Collapsible defaultOpen={location.pathname.startsWith("/defender")} className="group/collapsible">
         <SidebarMenuItem>
          <CollapsibleTrigger asChild>
           <SidebarMenuButton className={`group/navitem hover:bg-white/[0.03] transition-colors duration-150 ${state === "collapsed" ? "gap-0 justify-center" : "gap-3"}`}>
            {state !== "collapsed" && <GlowDot color="cyan" active={location.pathname.startsWith("/defender")} />}
            <UilShieldCheck size={16} className={location.pathname.startsWith("/defender") ? "text-zinc-100" : "text-zinc-400"} />
            {state !== "collapsed" && (
             <>
              <span className={`text-[13px] flex-1 ${location.pathname.startsWith("/defender") ? "text-zinc-100 font-medium" : "text-zinc-300"}`}>
               CrowByte Shield
              </span>
              <UilAngleDown size={14} className="text-zinc-500 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
             </>
            )}
           </SidebarMenuButton>
          </CollapsibleTrigger>
          <CollapsibleContent>
           <SidebarMenuSub className="ml-3.5 border-l border-white/[0.06] pl-0">
            {defenderSubItems.map((item) => {
             const isSubActive = location.pathname === item.url;
             return (
              <SidebarMenuSubItem key={item.url}>
               <SidebarMenuSubButton asChild className={isSubActive ? "bg-white/[0.04]" : ""}>
                <NavLink to={item.url} end className="group/subitem flex items-center gap-2.5 hover:bg-white/[0.03] transition-colors">
                 <item.icon size={13} className={isSubActive ? "text-zinc-100" : "text-zinc-500"} />
                 <span className={`text-[12px] ${isSubActive ? "text-zinc-100 font-medium" : "text-zinc-400"}`}>{item.title}</span>
                </NavLink>
               </SidebarMenuSubButton>
              </SidebarMenuSubItem>
             );
            })}
           </SidebarMenuSub>
          </CollapsibleContent>
         </SidebarMenuItem>
        </Collapsible>
       </SidebarMenu>
      </SidebarGroupContent>
     </SidebarGroup>

     {/* Blue Team (Defensive) */}
     <SidebarGroup>
      <SidebarGroupLabel className={state === "collapsed" ? "sr-only" : "text-zinc-500 uppercase text-[10px] font-medium tracking-widest pl-1"}>
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
      <SidebarGroupLabel className={state === "collapsed" ? "sr-only" : "text-zinc-500 uppercase text-[10px] font-medium tracking-widest pl-1"}>
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
      <SidebarGroupLabel className={state === "collapsed" ? "sr-only" : "text-zinc-500 uppercase text-[10px] font-medium tracking-widest pl-1"}>
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
      <SidebarGroupLabel className={state === "collapsed" ? "sr-only" : "text-zinc-500 uppercase text-[10px] font-medium tracking-widest pl-1"}>
       Configuration
      </SidebarGroupLabel>
      <SidebarGroupContent>
       <SidebarMenu>
        {/* Downloads */}
        <CollapsedTooltip label="Downloads">
         <motion.div
          whileHover={{ x: 2 }}
          className="relative"
         >
          {isActive("/downloads") && (
           <motion.div
            layoutId="activeTab"
            className="absolute inset-0 bg-white/[0.04] rounded-md"
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
           />
          )}
          <SidebarMenuItem>
           <SidebarMenuButton asChild>
            <NavLink
             to="/downloads"
             className={`relative hover:bg-white/[0.03] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-600 ${state === "collapsed" ? "gap-0 justify-center" : "gap-3"}`}
            >
             {state === "expanded" && <GlowDot color="gray" active={isActive("/downloads")} />}
             <UilDownloadAlt size={16} className={`flex-shrink-0 ${isActive("/downloads") ? "text-zinc-200" : "text-zinc-500"}`} />
             {state === "expanded" && (
              <span className={`text-[13px] ${isActive("/downloads") ? "text-zinc-200 font-medium" : "text-zinc-400"}`}>
               Downloads
              </span>
             )}
            </NavLink>
           </SidebarMenuButton>
          </SidebarMenuItem>
         </motion.div>
        </CollapsedTooltip>

        {/* Documentation */}
        <CollapsedTooltip label="Documentation">
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
             <UilFileAlt size={16} className={`flex-shrink-0 ${isActive("/documentation") ? "text-zinc-200" : "text-zinc-500"}`} />
             {state === "expanded" && (
              <span className={`text-[13px] ${isActive("/documentation") ? "text-zinc-200 font-medium" : "text-zinc-400"}`}>
               Documentation
              </span>
             )}
            </NavLink>
           </SidebarMenuButton>
          </SidebarMenuItem>
         </motion.div>
        </CollapsedTooltip>

        {/* Browser Panel Toggle */}
        {browserPanel && (
         <CollapsedTooltip label="Browser">
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
              <UilLeftArrowFromLeft size={16} className={`flex-shrink-0 ${browserPanel.isOpen ? "text-zinc-200" : "text-zinc-500"}`} />
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
         </CollapsedTooltip>
        )}

        {/* Settings */}
        <CollapsedTooltip label="Settings">
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
             <UilCog size={16} className={`flex-shrink-0 ${isActive("/settings") ? "text-zinc-200" : "text-zinc-500"}`} />
             {state === "expanded" && (
              <span className={`text-[13px] ${isActive("/settings") ? "text-zinc-200 font-medium" : "text-zinc-400"}`}>
               Settings
              </span>
             )}
            </NavLink>
           </SidebarMenuButton>
          </SidebarMenuItem>
         </motion.div>
        </CollapsedTooltip>

        {/* Exit */}
        <CollapsedTooltip label="Exit">
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
             <UilSignout size={16} className="text-zinc-500 flex-shrink-0" />
             {state === "expanded" && <span className="text-[13px] text-zinc-400">Exit</span>}
            </Button>
           </SidebarMenuButton>
          </SidebarMenuItem>
         </motion.div>
        </CollapsedTooltip>
       </SidebarMenu>
      </SidebarGroupContent>
     </SidebarGroup>
    </SidebarContent>

     {/* UilUser Info — pinned to bottom */}
     {user && (
      <SidebarFooter className={`border-t border-white/[0.06] ${state === "collapsed" ? "p-2" : "p-3"}`}>
       {state === "expanded" ? (
        <div className="space-y-1">
         <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-md bg-white/[0.04]">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-700/60 overflow-hidden flex-shrink-0">
           {profilePictureUrl ? (
            <img src={profilePictureUrl} alt="Profile" className="h-full w-full object-cover" />
           ) : (
            <UilUser size={12} className="text-zinc-400" />
           )}
          </div>
          <div className="flex flex-col flex-1 min-w-0">
           <span className="text-[11px] text-zinc-400">Operator</span>
           <span className="text-xs text-zinc-300 truncate" title={user.email || ''}>
            {user.email}
           </span>
          </div>
          <CreditsBadge />
         </div>
         <button
          onClick={handleLogoutAndExit}
          className="flex items-center gap-2 w-full px-2 py-1 rounded-md text-xs text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
         >
          <UilSignout size={12} />
          <span>Log out</span>
         </button>
        </div>
       ) : (
        <Tooltip delayDuration={0}>
         <TooltipTrigger asChild>
          <button
           onClick={handleLogoutAndExit}
           className="flex items-center justify-center w-full rounded-md hover:bg-red-500/10 transition-colors p-1.5"
          >
           <div className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-700/60">
            <UilUser size={14} className="text-zinc-400" />
           </div>
          </button>
         </TooltipTrigger>
         <TooltipContent side="right" className="bg-zinc-900 border-zinc-700 text-zinc-200 text-xs px-2.5 py-1">
          {user.email} — Log out
         </TooltipContent>
        </Tooltip>
       )}
      </SidebarFooter>
     )}
   </Sidebar>
  </TooltipProvider>
 );
}
