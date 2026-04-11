import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { UilSave, UilHeadphones, UilSpinner, UilEye, UilShieldCheck, UilWifi, UilGlobe, UilMapPin, UilSync, UilPalette, UilCheck } from "@iconscout/react-unicons";
import { useToast } from "@/hooks/use-toast";
import {
  createSupportSession,
  startStreaming,
  stopStreaming,
  getMyPendingSession,
} from "@/services/support-session";
import {
  getUserTimezone,
  getUserLocale,
  setUserTimezone,
  setUserLocale,
  getTimezoneInfo,
  getTimezoneLabel,
  TIMEZONE_REGIONS,
} from "@/services/timezone";
import { THEMES, getCurrentThemeId, applyTheme } from "@/services/themes";

export default function GeneralSettings() {
  const { toast } = useToast();
  const [workspaceName, setWorkspaceName] = useState(localStorage.getItem('workspace_name') || 'CyberOps HQ');
  const [enableNotifications, setEnableNotifications] = useState(localStorage.getItem('enable_notifications') === 'true' || true);
  const [activeTheme, setActiveTheme] = useState(getCurrentThemeId());

  // Timezone
  const tzInfo = getTimezoneInfo();
  const detectedTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const [selectedTz, setSelectedTz] = useState(getUserTimezone());
  const [selectedLocale, setSelectedLocale] = useState(getUserLocale());

  // Support
  const [supportState, setSupportState] = useState<"idle" | "requesting" | "pending" | "active">("idle");
  const [showConsent, setShowConsent] = useState(false);

  const handleSaveGeneral = async () => {
    localStorage.setItem('workspace_name', workspaceName);
    localStorage.setItem('enable_notifications', String(enableNotifications));

    window.dispatchEvent(new Event('workspaceNameChanged'));

    if (window.electronAPI?.saveAppSettings) {
      await window.electronAPI.saveAppSettings({
        showIntroAnimation: false,
        rememberMe: false,
      });
    }

    toast({
      title: "Settings Saved",
      description: "General settings have been updated successfully.",
    });
  };

  const handleRequestSupport = async () => {
    setSupportState("requesting");
    try {
      const id = await createSupportSession();
      if (!id) {
        setSupportState("idle");
        toast({ title: "Failed", description: "Could not create support session.", variant: "destructive" });
        return;
      }
      setSupportState("active");
      startStreaming(id, (cmd) => {
        if (cmd.type === "message") {
          toast({ title: "Support Agent", description: String(cmd.payload) });
        }
      });
      toast({ title: "Support Session Active", description: "A support agent can now view your dashboard." });
    } catch {
      setSupportState("idle");
      toast({ title: "Error", description: "Failed to start support session.", variant: "destructive" });
    }
  };

  const handleEndSupport = async () => {
    await stopStreaming();
    setSupportState("idle");
    toast({ title: "Session Ended", description: "Support session disconnected." });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>General Settings</CardTitle>
          <CardDescription>Manage your workspace preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="workspace">Workspace Name</Label>
            <Input
              id="workspace"
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              className="terminal-text"
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Notifications</Label>
              <p className="text-sm text-muted-foreground">Receive alerts for system events</p>
            </div>
            <Switch
              checked={enableNotifications}
              onCheckedChange={setEnableNotifications}
            />
          </div>
          <Separator />
          <div className="flex justify-end">
            <Button
              onClick={handleSaveGeneral}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <UilSave size={16} className="mr-2" />
              Save General Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Theme Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UilPalette size={20} className="text-purple-500" />
            App Theme
          </CardTitle>
          <CardDescription>Choose a color scheme for the interface</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {THEMES.map((theme) => {
              const isActive = activeTheme === theme.id;
              return (
                <button
                  key={theme.id}
                  onClick={() => {
                    applyTheme(theme.id);
                    setActiveTheme(theme.id);
                    toast({
                      title: "Theme Applied",
                      description: `Switched to ${theme.name} theme.`,
                    });
                  }}
                  className={`group relative rounded-xl border-2 transition-all duration-200 overflow-hidden text-left ${
                    isActive
                      ? "border-primary ring-2 ring-primary/20"
                      : "border-border hover:border-muted-foreground/30"
                  }`}
                >
                  {/* Theme preview mini-UI */}
                  <div
                    className="flex h-24"
                    style={{ backgroundColor: theme.preview.bg }}
                  >
                    {/* Sidebar preview */}
                    <div
                      className="w-12 h-full flex flex-col items-center pt-3 gap-2"
                      style={{ backgroundColor: theme.preview.sidebar }}
                    >
                      {[1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className="w-5 h-1.5 rounded-full opacity-40"
                          style={{ backgroundColor: theme.preview.text }}
                        />
                      ))}
                    </div>
                    {/* Content preview */}
                    <div className="flex-1 p-3 flex flex-col gap-2">
                      <div
                        className="w-16 h-2 rounded-full"
                        style={{ backgroundColor: theme.preview.text, opacity: 0.7 }}
                      />
                      <div
                        className="w-24 h-1.5 rounded-full"
                        style={{ backgroundColor: theme.preview.text, opacity: 0.3 }}
                      />
                      <div className="flex gap-1.5 mt-auto">
                        <div
                          className="w-10 h-4 rounded"
                          style={{ backgroundColor: theme.preview.accent }}
                        />
                        <div
                          className="w-8 h-4 rounded opacity-30"
                          style={{ backgroundColor: theme.preview.text }}
                        />
                      </div>
                    </div>
                  </div>
                  {/* Theme info */}
                  <div className="px-3 py-2.5 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{theme.name}</p>
                      <p className="text-[11px] text-muted-foreground">{theme.description}</p>
                    </div>
                    {isActive && (
                      <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                        <UilCheck size={12} className="text-primary-foreground" />
                      </div>
                    )}
                  </div>
                  {/* Color swatches */}
                  <div className="px-3 pb-2.5 flex gap-1.5">
                    {Object.values(theme.preview).map((color, i) => (
                      <div
                        key={i}
                        className="w-4 h-4 rounded-full border border-white/10"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Timezone & Locale */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UilGlobe size={20} className="text-blue-500" />
            Timezone & Locale
          </CardTitle>
          <CardDescription>
            Controls the clock, calendar, and date formatting across the dashboard
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Auto-detected info */}
          <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-500/5 border border-blue-500/10">
            <UilMapPin size={14} className="text-blue-400 shrink-0" />
            <div className="text-xs">
              <span className="text-zinc-400">Auto-detected: </span>
              <span className="text-zinc-200 font-mono">{detectedTz}</span>
              <span className="text-zinc-500 ml-2">({navigator.language})</span>
            </div>
            {selectedTz !== detectedTz && (
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto h-6 px-2 text-[10px] text-blue-400"
                onClick={() => {
                  setSelectedTz(detectedTz);
                  setUserTimezone(detectedTz);
                  toast({ title: "Timezone Reset", description: `Set to auto-detected: ${detectedTz}` });
                }}
              >
                <UilSync size={10} className="mr-1" />
                Reset to auto
              </Button>
            )}
          </div>

          {/* Timezone selector */}
          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <select
              id="timezone"
              value={selectedTz}
              onChange={(e) => {
                setSelectedTz(e.target.value);
                setUserTimezone(e.target.value);
                toast({ title: "Timezone Updated", description: getTimezoneLabel(e.target.value) });
              }}
              className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              {Object.entries(TIMEZONE_REGIONS).map(([region, zones]) => (
                <optgroup key={region} label={region}>
                  {zones.map((z) => (
                    <option key={z.tz} value={z.tz}>
                      {z.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <p className="text-[11px] text-muted-foreground">
              Current: {new Date().toLocaleString(selectedLocale, { timeZone: selectedTz, timeZoneName: "long" })}
            </p>
          </div>

          <Separator />

          {/* Locale selector */}
          <div className="space-y-2">
            <Label htmlFor="locale">Date & Number Format</Label>
            <select
              id="locale"
              value={selectedLocale}
              onChange={(e) => {
                setSelectedLocale(e.target.value);
                setUserLocale(e.target.value);
                toast({ title: "Locale Updated", description: `Date format: ${e.target.value}` });
              }}
              className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <option value="en-US">English (US) — MM/DD/YYYY</option>
              <option value="en-GB">English (UK) — DD/MM/YYYY</option>
              <option value="fr-FR">French — DD/MM/YYYY</option>
              <option value="de-DE">German — DD.MM.YYYY</option>
              <option value="ja-JP">Japanese — YYYY/MM/DD</option>
              <option value="ko-KR">Korean — YYYY. MM. DD</option>
              <option value="zh-CN">Chinese — YYYY/MM/DD</option>
              <option value="ar-SA">Arabic — DD/MM/YYYY (Hijri)</option>
              <option value="pt-BR">Portuguese (BR) — DD/MM/YYYY</option>
              <option value="es-ES">Spanish — DD/MM/YYYY</option>
              <option value="ru-RU">Russian — DD.MM.YYYY</option>
            </select>
            <p className="text-[11px] text-muted-foreground">
              Preview: {new Date().toLocaleDateString(selectedLocale, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Live Support */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UilHeadphones size={20} className="text-blue-500" />
            Live Support
          </CardTitle>
          <CardDescription>Request a remote support session with the CrowByte team</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {supportState === "active" ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/5 border border-red-500/10">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                </span>
                <p className="text-sm text-red-400 font-medium">Support session is active</p>
              </div>
              <Button variant="destructive" onClick={handleEndSupport} className="w-full">
                End Support Session
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-xs text-zinc-400">A support agent will be able to view your dashboard remotely to diagnose issues:</p>
                <div className="space-y-1.5 pl-1">
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <UilEye size={12} className="text-zinc-600" />
                    Your current page and navigation
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <UilShieldCheck size={12} className="text-zinc-600" />
                    Error logs and console output
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <UilWifi size={12} className="text-zinc-600" />
                    Network requests and performance
                  </div>
                </div>
              </div>
              <div className="bg-amber-500/5 border border-amber-500/10 rounded-lg p-3">
                <p className="text-xs text-amber-400/80">
                  No passwords, API keys, or personal data are shared. You can end the session at any time.
                </p>
              </div>
              <Button
                onClick={handleRequestSupport}
                disabled={supportState === "requesting"}
                className="w-full"
              >
                {supportState === "requesting" ? (
                  <>
                    <UilSpinner size={16} className="mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <UilHeadphones size={16} className="mr-2" />
                    Request Live Support
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
