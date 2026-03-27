import { useState, useEffect } from "react";
import '@/services/error-monitor';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { TitleBar } from "@/components/TitleBar";
import { GlobalContextMenu } from "@/components/GlobalContextMenu";
import { AuthProvider } from "@/contexts/auth";
import { LogsProvider } from "@/contexts/logs";
import { BrowserPanelProvider } from "@/contexts/browser";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { BrowserPanel } from "@/components/BrowserPanel";
import { BrowserPanelErrorBoundary } from "@/components/BrowserPanelErrorBoundary";
import { QAAgent } from "@/components/QAAgent";
import { useCacheCleanup } from "@/hooks/use-cache-cleanup";
import SetupWizard from "@/pages/SetupWizard";
import { setupService } from "@/services/setupService";
import Dashboard from "./pages/Dashboard";
import Analytics from "./pages/Analytics";
import {
  SettingsLayout,
  ProfileSettings,
  GeneralSettings,
  LLMSettings,
  MCPSettings,
  ToolsSettings,
  MemorySettings,
  AgentTestingSettings,
  SecuritySettings,
  IntegrationsSettings,
  AdvancedSettings,
} from "./pages/settings";
import Chat from "./pages/Chat";
import Auth from "./pages/Auth";
import AIAgent from "./pages/AIAgent";
import Tools from "./pages/Tools";
import Knowledge from "./pages/Knowledge";
import Bookmarks from "./pages/Bookmarks";
import RedTeam from "./pages/RedTeam";
import Terminal from "./pages/Terminal";
import AgentBuilder from "./pages/AgentBuilder";
import Memory from "./pages/Memory";
import MissionPlanner from "./pages/MissionPlanner";
import CVE from "./pages/CVE";
import ThreatIntelligence from "./pages/ThreatIntelligence";
import NetworkScanner from "./pages/NetworkScanner";
import CyberOps from "./pages/CyberOps";
import Documentation from "./pages/Documentation";
import Fleet from "./pages/Fleet";
import Connectors from "./pages/Connectors";
import Findings from "./pages/Findings";
import Reports from "./pages/Reports";
import DetectionLab from "./pages/DetectionLab";
import Missions from "./pages/Missions";
import AlertCenter from "./pages/AlertCenter";
import CloudSecurity from "./pages/CloudSecurity";
import Logs from "./pages/Logs";
import SecurityMonitor from "./pages/SecurityMonitor";
import NotFound from "./pages/NotFound";
import LandingPage from "./pages/LandingPage";

const queryClient = new QueryClient();

/** Layout wrapper that includes TitleBar — used for all routes except /landing */
const AppWithTitleBar = () => (
  <>
    <TitleBar />
    <Routes>
      {/* Auth route without sidebar */}
      <Route path="/auth" element={<div className="pt-8"><Auth /></div>} />

      {/* Documentation - own layout, no main sidebar */}
      <Route path="/documentation/*" element={
        <ProtectedRoute>
          <div className="flex h-screen w-full bg-background pt-8 overflow-hidden">
            <GlobalContextMenu>
              <div className="flex-1 min-w-0 overflow-y-auto" style={{ overscrollBehavior: "contain" }}>
                <Documentation />
              </div>
            </GlobalContextMenu>
            <BrowserPanelErrorBoundary><BrowserPanel /></BrowserPanelErrorBoundary>
          </div>
        </ProtectedRoute>
      } />

      {/* All other routes with sidebar - PROTECTED */}
      <Route path="/*" element={
        <ProtectedRoute>
          <SidebarProvider defaultOpen={true}>
            <div className="flex h-screen w-full bg-background pt-8 overflow-hidden">
              <AppSidebar />
              <GlobalContextMenu>
                <main className="flex-1 min-w-0 p-6 overflow-y-auto overflow-x-hidden main-content-container" style={{ overscrollBehavior: "contain" }}>
                  <Routes>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/analytics" element={<Analytics />} />
                    <Route path="/fleet" element={<Fleet />} />
                    <Route path="/findings" element={<Findings />} />
                    <Route path="/reports" element={<Reports />} />
                    <Route path="/detection-lab" element={<DetectionLab />} />
                    <Route path="/missions" element={<Missions />} />
                    <Route path="/alert-center" element={<AlertCenter />} />
                    <Route path="/cloud-security" element={<CloudSecurity />} />
                    <Route path="/connectors" element={<Connectors />} />
                    <Route path="/chat" element={<Chat />} />
                    <Route path="/ai-agent" element={<AIAgent />} />
                    {/* Redirect /llm to /settings/llm */}
                    <Route path="/llm" element={<Navigate to="/settings/llm" replace />} />
                    {/* Redirect /mcp to /settings/mcp */}
                    <Route path="/mcp" element={<Navigate to="/settings/mcp" replace />} />
                    <Route path="/tools" element={<Tools />} />
                    <Route path="/mission-planner" element={<MissionPlanner />} />
                    <Route path="/knowledge" element={<Knowledge />} />
                    <Route path="/bookmarks" element={<Bookmarks />} />
                    <Route path="/memory" element={<Memory />} />
                    <Route path="/cve" element={<CVE />} />
                    <Route path="/threat-intelligence" element={<ThreatIntelligence />} />
                    <Route path="/security-monitor" element={<SecurityMonitor />} />
                    <Route path="/redteam" element={<RedTeam />} />
                    <Route path="/network-scanner" element={<NetworkScanner />} />
                    <Route path="/cyber-ops" element={<CyberOps />} />
                    <Route path="/terminal" element={<Terminal />} />
                    <Route path="/logs" element={<Logs />} />
                    <Route path="/agent-builder" element={<AgentBuilder />} />
                    <Route path="/settings" element={<SettingsLayout />}>
                      <Route index element={<Navigate to="/settings/profile" replace />} />
                      <Route path="profile" element={<ProfileSettings />} />
                      <Route path="general" element={<GeneralSettings />} />
                      <Route path="llm" element={<LLMSettings />} />
                      <Route path="mcp" element={<MCPSettings />} />
                      <Route path="tools" element={<ToolsSettings />} />
                      <Route path="memory" element={<MemorySettings />} />
                      <Route path="testing" element={<AgentTestingSettings />} />
                      <Route path="security" element={<SecuritySettings />} />
                      <Route path="integrations" element={<IntegrationsSettings />} />
                      <Route path="advanced" element={<AdvancedSettings />} />
                    </Route>
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </main>
              </GlobalContextMenu>
              <BrowserPanelErrorBoundary><BrowserPanel /></BrowserPanelErrorBoundary>
            </div>
          </SidebarProvider>
        </ProtectedRoute>
      } />
    </Routes>
  </>
);

const App = () => {
  const [setupComplete, setSetupComplete] = useState(setupService.isSetupComplete());
  const [setupChecked, setSetupChecked] = useState(setupService.isSetupComplete());
  const [loadingSettings, setLoadingSettings] = useState(false);

  // Check server-side setup status (for server deployments)
  useEffect(() => {
    if (!setupComplete) {
      setupService.checkServerSetup().then((complete) => {
        if (complete) setSetupComplete(true);
        setSetupChecked(true);
      });
    }
  }, [setupComplete]);

  // Enable automatic cache cleanup (runs every hour)
  useCacheCleanup({
    intervalMs: 60 * 60 * 1000, // 1 hour
    onCleanup: (count) => {
      if (count > 0) {
        console.log(`[App] Cache cleanup removed ${count} expired entries`);
      }
    },
    onError: (error) => {
      console.error('[App] Cache cleanup error:', error);
    },
  });

  // Setup wizard gate — runs before anything else on first launch
  // Wait for server-side check before showing wizard
  if (!setupComplete && !setupChecked) {
    return null; // Loading — checking server setup status
  }
  if (!setupComplete) {
    return (
      <QueryClientProvider client={queryClient}>
        <TitleBar />
        <Sonner />
        <div className="pt-8">
          <SetupWizard onComplete={() => setSetupComplete(true)} />
        </div>
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <HashRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <Routes>
          {/* Landing page — web/marketing only, Electron skips to dashboard */}
          <Route path="/landing" element={<LandingPage />} />
          <Route path="/" element={
            typeof window !== 'undefined' && (window as any).electronAPI
              ? <Navigate to="/dashboard" replace />
              : <LandingPage />
          } />

          {/* All other routes need auth context */}
          <Route path="/*" element={
            <AuthProvider>
              <LogsProvider>
                <BrowserPanelProvider>
                  <Toaster />
                  <Sonner />
                  <AppWithTitleBar />
                  <QAAgent />
                </BrowserPanelProvider>
              </LogsProvider>
            </AuthProvider>
          } />
        </Routes>
      </HashRouter>
    </QueryClientProvider>
  );
};

export default App;
