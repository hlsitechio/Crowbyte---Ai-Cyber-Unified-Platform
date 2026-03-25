import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { FloppyDisk } from "@phosphor-icons/react";
import { useToast } from "@/hooks/use-toast";

export default function GeneralSettings() {
  const { toast } = useToast();
  const [workspaceName, setWorkspaceName] = useState(localStorage.getItem('workspace_name') || 'CyberOps HQ');
  const [enableNotifications, setEnableNotifications] = useState(localStorage.getItem('enable_notifications') === 'true' || true);

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

  return (
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
  );
}
