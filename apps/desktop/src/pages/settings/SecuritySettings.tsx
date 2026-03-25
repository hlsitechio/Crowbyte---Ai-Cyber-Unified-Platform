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

  const handleSaveSecurity = () => {
    localStorage.setItem('two_factor_auth', String(twoFactorAuth));
    localStorage.setItem('encrypted_storage', String(encryptedStorage));
    localStorage.setItem('audit_logging', String(auditLogging));
    toast({
      title: "Security Settings Saved",
      description: "Security preferences have been updated successfully.",
    });
  };

  return (
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
        <Separator />
        <div className="flex justify-end">
          <Button
            onClick={handleSaveSecurity}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <FloppyDisk size={16} weight="bold" className="mr-2" />
            Save Security Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
