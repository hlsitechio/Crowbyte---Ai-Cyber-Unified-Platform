import { useState, useEffect } from "react";
import { Brain, Network, Wrench, BookOpen, Shield, Settings, Terminal, Cpu, Activity, Bot, MessageSquare, LogOut, Swords, User, Bookmark, FileText, BarChart3, Crosshair, ShieldAlert, Database, Zap, Monitor, ScrollText, Target, FlaskConical, PanelRight, PlugZap } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/auth";
import { useBrowserPanelSafe } from "@/contexts/browser";
import { useLogs } from "@/contexts/logs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

// Organized by security operations categories
const commandCenterItems = [
  { title: "Dashboard", url: "/", icon: Activity },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
];

const aiOperationsItems = [
  { title: "Chat", url: "/chat", icon: MessageSquare },
  { title: "Search AI Agent", url: "/ai-agent", icon: Brain },
  { title: "Agent Builder", url: "/agent-builder", icon: Bot },
];

const redTeamItems = [
  { title: "Red Team", url: "/redteam", icon: Crosshair },
  { title: "Cyber Ops", url: "/cyber-ops", icon: Swords },
  { title: "Network Map", url: "/network-scanner", icon: Network },
];

const blueTeamItems = [
  { title: "Connectors", url: "/connectors", icon: PlugZap },
  { title: "Security Monitor", url: "/security-monitor", icon: Shield },
  { title: "Fleet Management", url: "/fleet", icon: Monitor },
  { title: "CVE Database", url: "/cve", icon: ShieldAlert },
  { title: "Threat Intelligence", url: "/threat-intelligence", icon: ShieldAlert },
];

const intelligenceItems = [
  { title: "Mission Planner", url: "/mission-planner", icon: Target },
  { title: "Knowledge Base", url: "/knowledge", icon: BookOpen },
  { title: "Bookmarks", url: "/bookmarks", icon: Bookmark },
];

const systemItems = [
  { title: "Terminal", url: "/terminal", icon: Terminal },
  { title: "Logs", url: "/logs", icon: ScrollText },
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

  const isActive = (path: string) => currentPath === path;

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

  // Load and listen for profile picture changes
  useEffect(() => {
    const loadProfilePicture = async () => {
      if (!user) return;

      try {
        const { supabase } = await import('@/lib/supabase');
        const { data, error } = await supabase
          .from('user_settings')
          .select('profile_picture_url')
          .eq('user_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error loading profile picture:', error);
          return;
        }

        if (data?.profile_picture_url) {
          setProfilePictureUrl(data.profile_picture_url);
        }
      } catch (error) {
        console.error('Failed to load profile picture:', error);
      }
    };

    const handleProfilePictureChange = () => {
      loadProfilePicture();
    };

    loadProfilePicture();

    // Listen for profile picture changes
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

  const renderNavItems = (items: typeof commandCenterItems, delayOffset: number = 0) => {
    return items.map((item, index) => {
      const isItemActive = isActive(item.url);
      const showErrorBadge = item.url === '/logs' && unreadErrorCount > 0;

      return (
        <motion.div
          key={item.title}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{
            duration: 0.3,
            delay: (delayOffset + index) * 0.03,
            ease: "easeOut"
          }}
          whileHover={{ x: 4, scale: 1.01 }}
          className="relative overflow-hidden"
        >
          {isItemActive && (
            <motion.div
              layoutId="activeTab"
              className="absolute inset-0 bg-gradient-to-r from-primary/10 via-primary/15 to-primary/10 border-l-2 border-primary shadow-[0_0_20px_rgba(192,192,192,0.15)]"
              transition={{
                type: "spring",
                stiffness: 500,
                damping: 30
              }}
            />
          )}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-silver-muted/10 to-transparent opacity-0"
            initial={{ x: "-100%" }}
            whileHover={{
              x: "100%",
              opacity: 1,
              transition: {
                x: { duration: 0.6, ease: "easeInOut" },
                opacity: { duration: 0.3 }
              }
            }}
          />
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <NavLink
                to={item.url}
                end
                className="relative hover:bg-gradient-to-r hover:from-primary/5 hover:via-primary/10 hover:to-primary/5 hover:shadow-[0_0_15px_rgba(192,192,192,0.1)] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <motion.div
                  whileHover={{ scale: 1.1, rotate: [0, -5, 5, 0] }}
                  transition={{ duration: 0.3 }}
                  className={isItemActive ? "text-primary" : ""}
                >
                  <item.icon className="h-4 w-4" />
                </motion.div>
                {state === "expanded" && (
                  <span className={`tracking-wide ${isItemActive ? "text-primary" : ""}`}>
                    {item.title}
                  </span>
                )}
                {item.badge && state === "expanded" && (
                  <Badge variant="secondary" className="ml-auto text-xs bg-primary/20 text-primary border-primary/30">
                    {item.badge}
                  </Badge>
                )}
                {showErrorBadge && (
                  <Badge variant="destructive" className="ml-auto text-xs bg-red-500/20 text-red-400 border-red-500/30 animate-pulse">
                    {unreadErrorCount}
                  </Badge>
                )}
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </motion.div>
      );
    });
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarHeader className="border-b border-primary/20 p-4 space-y-3">
        <motion.div
          className="flex items-center gap-2 justify-between"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <div className="flex items-center gap-2">
            <motion.div
              className="flex h-8 w-8 items-center justify-center border border-primary/40 bg-black"
              whileHover={{ scale: 1.05, borderColor: "hsl(var(--primary))" }}
              transition={{ duration: 0.2 }}
            >
              <Cpu className="h-5 w-5 text-primary" />
            </motion.div>
            {state === "expanded" && (
              <motion.div
                className="flex flex-col"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
              >
                <span className="text-sm font-bold text-gradient-silver tracking-wider">{workspaceName}</span>
              </motion.div>
            )}
          </div>
          <SidebarTrigger className="text-foreground hover:text-primary transition-colors" />
        </motion.div>

        {/* User Info */}
        {user && state === "expanded" && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="flex items-center gap-2 px-2 py-2 bg-primary/5 rounded-lg border border-primary/20"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 border border-primary/40 overflow-hidden">
              {profilePictureUrl ? (
                <img
                  src={profilePictureUrl}
                  alt="Profile"
                  className="h-full w-full object-cover"
                />
              ) : (
                <User className="h-3 w-3 text-primary" />
              )}
            </div>
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-xs text-muted-foreground">Operator</span>
              <span className="text-xs font-medium text-foreground truncate" title={user.email || ''}>
                {user.email}
              </span>
            </div>
            <Badge variant="outline" className="text-xs bg-green-500/10 text-green-400 border-green-500/30">
              ACTIVE
            </Badge>
          </motion.div>
        )}
        {user && state === "collapsed" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="flex items-center justify-center"
            title={user.email || 'User'}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 border border-primary/40">
              <User className="h-4 w-4 text-primary" />
            </div>
          </motion.div>
        )}
      </SidebarHeader>

      <SidebarContent>
        {/* Command Center */}
        <SidebarGroup>
          <SidebarGroupLabel className={state === "collapsed" ? "sr-only" : "text-primary/70 uppercase text-xs font-bold tracking-wider"}>
            Command Center
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {renderNavItems(commandCenterItems, 0)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* AI Operations */}
        <SidebarGroup>
          <SidebarGroupLabel className={state === "collapsed" ? "sr-only" : "text-blue-400/70 uppercase text-xs font-bold tracking-wider"}>
            <Zap className="h-3 w-3 inline mr-1" />
            AI Operations
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {renderNavItems(aiOperationsItems, 2)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Red Team (Offensive) */}
        <SidebarGroup>
          <SidebarGroupLabel className={state === "collapsed" ? "sr-only" : "text-red-400/70 uppercase text-xs font-bold tracking-wider"}>
            <Crosshair className="h-3 w-3 inline mr-1" />
            Red Team
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {renderNavItems(redTeamItems, 6)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Blue Team (Defensive) */}
        <SidebarGroup>
          <SidebarGroupLabel className={state === "collapsed" ? "sr-only" : "text-blue-400/70 uppercase text-xs font-bold tracking-wider"}>
            <ShieldAlert className="h-3 w-3 inline mr-1" />
            Blue Team
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {renderNavItems(blueTeamItems, 9)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Intelligence */}
        <SidebarGroup>
          <SidebarGroupLabel className={state === "collapsed" ? "sr-only" : "text-purple-400/70 uppercase text-xs font-bold tracking-wider"}>
            <Database className="h-3 w-3 inline mr-1" />
            Intelligence
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {renderNavItems(intelligenceItems, 11)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* System */}
        <SidebarGroup>
          <SidebarGroupLabel className={state === "collapsed" ? "sr-only" : "text-muted-foreground uppercase text-xs font-bold tracking-wider"}>
            System
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {renderNavItems(systemItems, 14)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Configuration */}
        <SidebarGroup className="mt-auto">
          <SidebarGroupLabel className={state === "collapsed" ? "sr-only" : "text-muted-foreground uppercase text-xs font-bold tracking-wider"}>
            <Settings className="h-3 w-3 inline mr-1" />
            Configuration
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* Documentation */}
              <motion.div
                whileHover={{ x: 4, scale: 1.01 }}
                className="relative overflow-hidden"
              >
                {isActive("/documentation") && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-gradient-to-r from-primary/10 via-primary/15 to-primary/10 border-l-2 border-primary shadow-[0_0_20px_rgba(192,192,192,0.15)]"
                    transition={{
                      type: "spring",
                      stiffness: 500,
                      damping: 30
                    }}
                  />
                )}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-silver-muted/10 to-transparent opacity-0"
                  initial={{ x: "-100%" }}
                  whileHover={{
                    x: "100%",
                    opacity: 1,
                    transition: {
                      x: { duration: 0.6, ease: "easeInOut" },
                      opacity: { duration: 0.3 }
                    }
                  }}
                />
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to="/documentation"
                      className="relative hover:bg-gradient-to-r hover:from-primary/5 hover:via-primary/10 hover:to-primary/5 hover:shadow-[0_0_15px_rgba(192,192,192,0.1)] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    >
                      <motion.div
                        whileHover={{ scale: 1.1, rotate: [0, -5, 5, 0] }}
                        transition={{ duration: 0.3 }}
                        className={isActive("/documentation") ? "text-primary" : ""}
                      >
                        <FileText className="h-4 w-4" />
                      </motion.div>
                      {state === "expanded" && (
                        <span className={`tracking-wide ${isActive("/documentation") ? "text-primary" : ""}`}>
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
                  whileHover={{ x: 4, scale: 1.01 }}
                  className="relative overflow-hidden"
                >
                  {browserPanel.isOpen && (
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-primary/10 via-primary/15 to-primary/10 border-l-2 border-primary shadow-[0_0_20px_rgba(192,192,192,0.15)]"
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  )}
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-silver-muted/10 to-transparent opacity-0"
                    initial={{ x: "-100%" }}
                    whileHover={{
                      x: "100%",
                      opacity: 1,
                      transition: { x: { duration: 0.6, ease: "easeInOut" }, opacity: { duration: 0.3 } }
                    }}
                  />
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <button
                        onClick={browserPanel.toggle}
                        className="relative w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-gradient-to-r hover:from-primary/5 hover:via-primary/10 hover:to-primary/5 hover:shadow-[0_0_15px_rgba(192,192,192,0.1)] transition-all duration-200"
                      >
                        <motion.div
                          whileHover={{ scale: 1.1, rotate: [0, -5, 5, 0] }}
                          transition={{ duration: 0.3 }}
                          className={browserPanel.isOpen ? "text-primary" : ""}
                        >
                          <PanelRight className="h-4 w-4" />
                        </motion.div>
                        {state === "expanded" && (
                          <span className={`tracking-wide text-sm ${browserPanel.isOpen ? "text-primary" : ""}`}>
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
                whileHover={{ x: 4, scale: 1.01 }}
                className="relative overflow-hidden"
              >
                {isActive("/settings") && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-gradient-to-r from-primary/10 via-primary/15 to-primary/10 border-l-2 border-primary shadow-[0_0_20px_rgba(192,192,192,0.15)]"
                    transition={{
                      type: "spring",
                      stiffness: 500,
                      damping: 30
                    }}
                  />
                )}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-silver-muted/10 to-transparent opacity-0"
                  initial={{ x: "-100%" }}
                  whileHover={{
                    x: "100%",
                    opacity: 1,
                    transition: {
                      x: { duration: 0.6, ease: "easeInOut" },
                      opacity: { duration: 0.3 }
                    }
                  }}
                />
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to="/settings"
                      className="relative hover:bg-gradient-to-r hover:from-primary/5 hover:via-primary/10 hover:to-primary/5 hover:shadow-[0_0_15px_rgba(192,192,192,0.1)] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    >
                      <motion.div
                        whileHover={{ scale: 1.1, rotate: [0, -5, 5, 0] }}
                        transition={{ duration: 0.3 }}
                        className={isActive("/settings") ? "text-primary" : ""}
                      >
                        <Settings className="h-4 w-4" />
                      </motion.div>
                      {state === "expanded" && (
                        <span className={`tracking-wide ${isActive("/settings") ? "text-primary" : ""}`}>
                          Settings
                        </span>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </motion.div>

              {/* Exit */}
              <motion.div
                whileHover={{ x: 4, scale: 1.01 }}
                className="relative overflow-hidden"
              >
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-red-500/10 to-transparent opacity-0"
                  initial={{ x: "-100%" }}
                  whileHover={{
                    x: "100%",
                    opacity: 1,
                    transition: {
                      x: { duration: 0.6, ease: "easeInOut" },
                      opacity: { duration: 0.3 }
                    }
                  }}
                />
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Button
                      variant="ghost"
                      onClick={handleLogoutAndExit}
                      className="relative w-full justify-start hover:bg-gradient-to-r hover:from-red-500/5 hover:via-red-500/10 hover:to-red-500/5 hover:border-l-2 hover:border-red-500/50 hover:shadow-[0_0_15px_rgba(239,68,68,0.1)] transition-all duration-200 text-foreground hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    >
                      <motion.div
                        whileHover={{ scale: 1.1, rotate: [0, -5, 5, 0] }}
                        transition={{ duration: 0.3 }}
                        className="flex items-center gap-2"
                      >
                        <LogOut className="h-4 w-4" />
                      </motion.div>
                      {state === "expanded" && <span className="tracking-wide">Exit</span>}
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
