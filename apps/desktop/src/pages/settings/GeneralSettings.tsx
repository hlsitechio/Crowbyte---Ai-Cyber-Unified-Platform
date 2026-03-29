import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { FloppyDisk, Headset, CircleNotch, Eye, ShieldCheck, WifiHigh } from "@phosphor-icons/react";
import { useToast } from "@/hooks/use-toast";
import {
  createSupportSession,
  startStreaming,
  stopStreaming,
  getMyPendingSession,
} from "@/services/support-session";

export default function GeneralSettings() {
  const { toast } = useToast();
  const [workspaceName, setWorkspaceName] = useState(localStorage.getItem('workspace_name') || 'CyberOps HQ');
  const [enableNotifications, setEnableNotifications] = useState(localStorage.getItem('enable_notifications') === 'true' || true);

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
              <FloppyDisk size={16} weight="bold" className="mr-2" />
              Save General Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Live Support */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Headset size={20} weight="duotone" className="text-blue-500" />
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
                    <Eye size={12} weight="bold" className="text-zinc-600" />
                    Your current page and navigation
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <ShieldCheck size={12} weight="bold" className="text-zinc-600" />
                    Error logs and console output
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <WifiHigh size={12} weight="bold" className="text-zinc-600" />
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
                    <CircleNotch size={16} weight="bold" className="mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Headset size={16} weight="bold" className="mr-2" />
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
