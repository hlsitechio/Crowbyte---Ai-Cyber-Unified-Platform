import React, { useState, useEffect } from "react";
import '@/services/error-monitor';
import { glitchTipService } from '@/services/glitchtip';
import { initTheme } from '@/services/themes';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { TitleBar } from "@/components/TitleBar";
import { GlobalContextMenu } from "@/components/GlobalContextMenu";
import { AuthProvider } from "@/contexts/auth";
import { LogsProvider } from "@/contexts/logs";
import { BrowserPanelProvider } from "@/contexts/browser";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminRoute } from "@/components/AdminRoute";
import { BrowserPanel } from "@/components/BrowserPanel";
import { BrowserPanelErrorBoundary } from "@/components/BrowserPanelErrorBoundary";
import { GlobalErrorBoundary } from "@/components/GlobalErrorBoundary";
import { QAAgent } from "@/components/QAAgent";
import { SupportBanner } from "@/components/SupportBanner";
import { useCacheCleanup } from "@/hooks/use-cache-cleanup";
import Dashboard from "./pages/Dashboard";
import Analytics from "./pages/Analytics";
import {
  SettingsLayout,
  ProfileSettings,
  BillingSettings,
  GeneralSettings,
  MCPSettings,
  ToolsSettings,
  MemorySettings,
  AgentTestingSettings,
  SecuritySettings,
  IntegrationsSettings,
  ConnectorsSettings,
  AdvancedSettings,
  OnboardingSettings,
} from "./pages/settings";
import Chat from "./pages/Chat";
import Auth from "./pages/Auth";
import PasswordReset from "./pages/PasswordReset";
import AIAgent from "./pages/AIAgent";
import Tools from "./pages/Tools";
import Knowledge from "./pages/Knowledge";
import Bookmarks from "./pages/Bookmarks";
import RedTeam from "./pages/RedTeam";
import Terminal from "./pages/Terminal";
import AgentBuilder from "./pages/AgentBuilder";
import AgentTeams from "./pages/AgentTeams";
import Memory from "./pages/Memory";
import MissionPlanner from "./pages/MissionPlanner";
import ISM from "./pages/ISM";
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
// Missions merged into MissionPlanner — single unified page
import AlertCenter from "./pages/AlertCenter";
import CloudSecurity from "./pages/CloudSecurity";
import Logs from "./pages/Logs";
import SecurityMonitor from "./pages/SecurityMonitor";
import Sentinel from "./pages/Sentinel";
import Support from "./pages/Support";
import OAuthCallback from "./pages/OAuthCallback";
import NotFound from "./pages/NotFound";
import LandingPage from "./pages/LandingPage";
import BetaSignup from "./pages/BetaSignup";
import Onboarding from "./pages/Onboarding";
import Downloads from "./pages/Downloads";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import WebDocs from "./pages/web-docs/WebDocs";
import RefundPolicy from "./pages/RefundPolicy";
import Contact from "./pages/Contact";
import Checkout from "./pages/Checkout";
import PreferencesWizard from "./pages/PreferencesWizard";
import SubscriptionGate from "./pages/SubscriptionGate";
import { verifyLicense, needsRecheck, CHECK_INTERVAL_MS, type LicenseStatus } from "@/services/license-guard";
import { needsPreferencesSetup } from "@/services/subscription";
import { IS_ELECTRON } from "@/lib/platform";
import { useOrchestrator } from "@/hooks/useOrchestrator";
import { SplitScreenProvider } from "@/contexts/split-screen";
import { TabController } from "@/components/TabController";
import { SplitScreenLayout } from "@/components/SplitScreenLayout";

const queryClient = new QueryClient();

/** Wrapper that provides SplitScreen context with reactive path */
const SplitScreenWrapper = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  return (
    <SplitScreenProvider currentPath={location.pathname}>
      {children}
    </SplitScreenProvider>
  );
};

/** Layout wrapper that includes TitleBar — used for all routes except /landing */
const AppWithTitleBar = () => {
  // Start agent orchestrator queue when authenticated
  useOrchestrator();

  return (
  <>
    <TitleBar />
    <Routes>
      {/* Auth routes without sidebar */}
      <Route path="/auth" element={<div className={IS_ELECTRON ? "pt-8" : ""}><Auth /></div>} />
      <Route path="/passwordreset" element={<div className={IS_ELECTRON ? "pt-8" : ""}><PasswordReset /></div>} />

      {/* Documentation - own layout, no main sidebar */}
      <Route path="/documentation/*" element={
        <ProtectedRoute>
          <div className={`flex h-screen w-full bg-background ${IS_ELECTRON ? 'pt-8' : ''} overflow-hidden`}>
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
          <SidebarProvider defaultOpen={IS_ELECTRON}>
            <AppSidebar />
            <div className={`flex-1 min-w-0 flex flex-col h-screen bg-background ${IS_ELECTRON ? 'pt-8' : ''} overflow-hidden`}>
              <GlobalContextMenu>
                <SplitScreenWrapper>
                  <div className="flex flex-col flex-1 min-w-0 relative overflow-hidden">
                    {/* TabController: top-right floating controls */}
                    <TabController />
                    <main className="relative flex-1 min-w-0 overflow-hidden main-content-container">
                      <SplitScreenLayout>
                        {/* Normal single-pane routes */}
                        <div className="h-full overflow-y-auto overflow-x-hidden p-6" style={{ overscrollBehavior: "contain" }}>
                          <Routes>
                            <Route path="/dashboard" element={<Dashboard />} />
                            <Route path="/analytics" element={<Analytics />} />
                            <Route path="/fleet" element={<Fleet />} />
                            <Route path="/findings" element={<Findings />} />
                            <Route path="/reports" element={<Reports />} />
                            <Route path="/detection-lab" element={<DetectionLab />} />
                            <Route path="/ism" element={<ISM />} />
                            <Route path="/ism/cases" element={<ISM />} />
                            <Route path="/ism/compliance" element={<ISM />} />
                            <Route path="/missions" element={<MissionPlanner />} />
                            <Route path="/alert-center" element={<AlertCenter />} />
                            <Route path="/cloud-security" element={<CloudSecurity />} />
                            <Route path="/connectors" element={<Connectors />} />
                            {/* Chat page removed — Terminal is the primary AI interface */}
                            <Route path="/chat" element={<Navigate to="/terminal" replace />} />
                            <Route path="/ai-agent" element={<AdminRoute><AIAgent /></AdminRoute>} />
                            {/* Redirect /llm to /settings/integrations */}
                            <Route path="/llm" element={<Navigate to="/settings/integrations" replace />} />
                            {/* Redirect /mcp to /settings/mcp */}
                            <Route path="/mcp" element={<Navigate to="/settings/mcp" replace />} />
                            <Route path="/tools" element={<Tools />} />
                            <Route path="/mission-planner" element={<Navigate to="/missions" replace />} />
                            <Route path="/knowledge" element={<Knowledge />} />
                            <Route path="/bookmarks" element={<Bookmarks />} />
                            <Route path="/memory" element={<AdminRoute><Memory /></AdminRoute>} />
                            <Route path="/cve" element={<CVE />} />
                            <Route path="/threat-intelligence" element={<ThreatIntelligence />} />
                            <Route path="/security-monitor" element={<SecurityMonitor />} />
                            <Route path="/sentinel" element={<Sentinel />} />
                            <Route path="/redteam" element={<RedTeam />} />
                            <Route path="/network-scanner" element={<NetworkScanner />} />
                            <Route path="/cyber-ops" element={<CyberOps />} />
                            <Route path="/terminal" element={<Terminal />} />
                            <Route path="/oauth/callback" element={<OAuthCallback />} />
                            <Route path="/logs" element={<Logs />} />
                            <Route path="/support" element={<Support />} />
                            <Route path="/agent-builder" element={<AdminRoute><AgentBuilder /></AdminRoute>} />
                            <Route path="/agent-teams" element={<AdminRoute><AgentTeams /></AdminRoute>} />
                            <Route path="/downloads" element={<Downloads />} />
                            <Route path="/settings" element={<SettingsLayout />}>
                              <Route index element={<Navigate to="/settings/profile" replace />} />
                              <Route path="profile" element={<ProfileSettings />} />
                              <Route path="billing" element={<BillingSettings />} />
                              <Route path="general" element={<GeneralSettings />} />
                              <Route path="llm" element={<Navigate to="/settings/integrations" replace />} />
                              <Route path="mcp" element={<AdminRoute><MCPSettings /></AdminRoute>} />
                              <Route path="tools" element={<ToolsSettings />} />
                              <Route path="memory" element={<AdminRoute><MemorySettings /></AdminRoute>} />
                              <Route path="testing" element={<AdminRoute><AgentTestingSettings /></AdminRoute>} />
                              <Route path="connectors" element={<ConnectorsSettings />} />
                              <Route path="security" element={<SecuritySettings />} />
                              <Route path="integrations" element={<AdminRoute><IntegrationsSettings /></AdminRoute>} />
                              <Route path="advanced" element={<AdminRoute><AdvancedSettings /></AdminRoute>} />
                              <Route path="onboarding" element={<OnboardingSettings />} />
                            </Route>
                            <Route path="*" element={<NotFound />} />
                          </Routes>
                        </div>
                      </SplitScreenLayout>
                    </main>
                  </div>
                </SplitScreenWrapper>
              </GlobalContextMenu>
              <BrowserPanelErrorBoundary><BrowserPanel /></BrowserPanelErrorBoundary>
            </div>
          </SidebarProvider>
        </ProtectedRoute>
      } />
    </Routes>
  </>
  );
};

const App = () => {
  // ─── License Gate (Electron only) ─────────────────────────────────────
  const [licenseStatus, setLicenseStatus] = useState<LicenseStatus | null>(null);
  const [licenseChecked, setLicenseChecked] = useState(!IS_ELECTRON); // Skip for web

  // ─── Post-upgrade Preferences Wizard redirect ───────────────────────
  const [prefsChecked, setPrefsChecked] = useState(false);
  const [needsPrefsWizard, setNeedsPrefsWizard] = useState(false);

  useEffect(() => {
    if (!IS_ELECTRON) return; // Web users don't need license check

    const checkLicense = async () => {
      const status = await verifyLicense();
      setLicenseStatus(status);
      setLicenseChecked(true);

      // If license is valid (Pro+), check if they need preferences setup
      if (status.valid) {
        const needsSetup = await needsPreferencesSetup();
        setNeedsPrefsWizard(needsSetup);
      }
      setPrefsChecked(true);
    };

    checkLicense();

    // Periodic re-verification while app is running
    const interval = setInterval(async () => {
      if (needsRecheck()) {
        const status = await verifyLicense();
        setLicenseStatus(status);
        // If license became invalid while running, force re-render
        if (!status.valid) {
          console.warn('[App] License revoked during session:', status.reason);
        }
      }
    }, CHECK_INTERVAL_MS);

    return () => clearInterval(interval);
  }, []);

  // Initialize GlitchTip error monitoring
  useEffect(() => {
    glitchTipService.initialize();
  }, []);

  // Initialize saved theme on startup (skip on landing page — it uses its own palette)
  useEffect(() => {
    const publicPage = ['/', '/landing', '/auth', '/passwordreset', '/beta', '/privacy', '/terms', '/refund', '/contact'].includes(window.location.pathname);
    if (!publicPage || IS_ELECTRON) {
      initTheme();
    }
  }, []);

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

  // License gate — Electron only, blocks EVERYTHING until valid
  if (IS_ELECTRON && !licenseChecked) {
    return null; // Loading — checking license
  }
  if (IS_ELECTRON && licenseStatus && !licenseStatus.valid) {
    // Allow onboarding + auth routes through (new installs need to sign up/login first)
    const hash = window.location.hash || '';
    const isPassthrough = hash.includes('/onboarding') || hash.includes('/auth') || hash.includes('/payments');
    if (!isPassthrough) {
      return (
        <SubscriptionGate
          status={licenseStatus}
          onRetry={async () => {
            const status = await verifyLicense();
            setLicenseStatus(status);
            // If they just upgraded and license is now valid, check prefs
            if (status.valid) {
              const needsSetup = await needsPreferencesSetup();
              setNeedsPrefsWizard(needsSetup);
            }
          }}
        />
      );
    }
  }

  // ─── Post-upgrade: redirect Pro+ users to preferences wizard ─────────
  // Runs after license gate passes — if user just upgraded and hasn't configured agents/intel
  if (IS_ELECTRON && prefsChecked && needsPrefsWizard) {
    const isAlreadyOnPrefs = window.location.hash?.includes('/setup-preferences');
    if (!isAlreadyOnPrefs) {
      // Render a minimal router that redirects to preferences wizard
      return (
        <QueryClientProvider client={queryClient}>
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <AuthProvider>
              <Routes>
                <Route path="/setup-preferences" element={<PreferencesWizard />} />
                <Route path="*" element={<Navigate to="/setup-preferences" replace />} />
              </Routes>
            </AuthProvider>
          </BrowserRouter>
        </QueryClientProvider>
      );
    }
  }

  return (
    <GlobalErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <Routes>
          {/* Onboarding — Discord-style first-run, frameless window */}
          <Route path="/onboarding" element={<Onboarding />} />

          {/* Landing page — web/marketing only, Electron skips to dashboard */}
          <Route path="/landing" element={<LandingPage />} />

          {/* Preferences wizard — post-signup onboarding for SaaS */}
          <Route path="/setup-preferences" element={
            <AuthProvider><PreferencesWizard /></AuthProvider>
          } />

          {/* Beta signup — public, no auth */}
          <Route path="/beta" element={<BetaSignup />} />

          {/* Public docs — sanitized for web, no auth required */}
          <Route path="/docs" element={<WebDocs />} />

          {/* Public legal & contact pages — no auth required */}
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/refund" element={<RefundPolicy />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/payments" element={<Checkout />} />
          <Route path="/" element={
            IS_ELECTRON
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
                  {/* SupportBanner moved to Settings — no longer floating */}
                </BrowserPanelProvider>
              </LogsProvider>
            </AuthProvider>
          } />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
    </GlobalErrorBoundary>
  );
};

export default App;
