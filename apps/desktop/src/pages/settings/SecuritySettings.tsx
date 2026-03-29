import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { FloppyDisk } from "@phosphor-icons/react";
import { useToast } from "@/hooks/use-toast";

export default function SecuritySettings() {
  const { toast } = useToast();
  const [twoFactorAuth, setTwoFactorAuth] = useState(localStorage.getItem('two_factor_auth') === 'true' || false);
  const [encryptedStorage, setEncryptedStorage] = useState(localStorage.getItem('encrypted_storage') === 'true' || true);
  const [auditLogging, setAuditLogging] = useState(localStorage.getItem('audit_logging') === 'true' || true);
  const [aiDebugger, setAiDebugger] = useState(localStorage.getItem('ai_debugger_enabled') !== 'false');
  const [errorMonitor, setErrorMonitor] = useState(localStorage.getItem('error_monitor_enabled') !== 'false');

  const handleSaveSecurity = () => {
    localStorage.setItem('two_factor_auth', String(twoFactorAuth));
    localStorage.setItem('encrypted_storage', String(encryptedStorage));
    localStorage.setItem('audit_logging', String(auditLogging));
    localStorage.setItem('ai_debugger_enabled', String(aiDebugger));
    localStorage.setItem('error_monitor_enabled', String(errorMonitor));

    // Dispatch event so QAAgent and error-monitor react immediately
    window.dispatchEvent(new CustomEvent('crowbyte:debugger-toggle', {
      detail: { aiDebugger, errorMonitor },
    }));

    toast({
      title: "Security Settings Saved",
      description: "Security preferences have been updated successfully.",
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Security Settings</CardTitle>
          <CardDescription>Configure security and access controls</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Two-Factor Authentication</Label>
              <p className="text-sm text-muted-foreground">Add an extra layer of security</p>
            </div>
            <Switch
              checked={twoFactorAuth}
              onCheckedChange={setTwoFactorAuth}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Encrypted Storage</Label>
              <p className="text-sm text-muted-foreground">Encrypt all stored data</p>
            </div>
            <Switch
              checked={encryptedStorage}
              onCheckedChange={setEncryptedStorage}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Audit Logging</Label>
              <p className="text-sm text-muted-foreground">Track all system activities</p>
            </div>
            <Switch
              checked={auditLogging}
              onCheckedChange={setAuditLogging}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>AI Debugger & Diagnostics</CardTitle>
          <CardDescription>Control the built-in AI debugging agent and data collection</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>AI Debug Agent</Label>
              <p className="text-sm text-muted-foreground">
                Show the floating QA agent that detects errors, misclicks, and UI issues in real time
              </p>
            </div>
            <Switch
              checked={aiDebugger}
              onCheckedChange={setAiDebugger}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Error & Network Monitoring</Label>
              <p className="text-sm text-muted-foreground">
                Collect console errors, network requests, navigation history, and performance metrics.
                Disabling this stops all background data gathering.
              </p>
            </div>
            <Switch
              checked={errorMonitor}
              onCheckedChange={(checked) => {
                setErrorMonitor(checked);
                if (!checked) setAiDebugger(false);
              }}
            />
          </div>
          {!errorMonitor && (
            <div className="bg-amber-500/5 border border-amber-500/10 rounded-lg p-3">
              <p className="text-xs text-amber-400/80">
                Monitoring is disabled. No errors, network requests, or navigation data will be collected.
                The AI debug agent requires monitoring to function.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          onClick={handleSaveSecurity}
          className="bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          <FloppyDisk size={16} weight="bold" className="mr-2" />
          Save Settings
        </Button>
      </div>
    </div>
  );
}
