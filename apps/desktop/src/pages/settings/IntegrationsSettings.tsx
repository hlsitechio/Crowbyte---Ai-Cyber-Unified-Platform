import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { RssSimple, CheckCircle, XCircle, Brain, FloppyDisk } from "@phosphor-icons/react";
import inoreaderService from "@/services/inoreader";
import { useToast } from "@/hooks/use-toast";

export default function IntegrationsSettings() {
  const { toast } = useToast();
  const [inoreaderAuth, setInoreaderAuth] = useState(false);
  const [apiUsage, setApiUsage] = useState({
    count: 0,
    limit: 5000,
    remaining: 5000,
    resetTime: new Date(),
    percentUsed: 0,
  });
  const [ollamaApiKey, setOllamaApiKey] = useState(localStorage.getItem('ollama_api_key') || '');
  const [ollamaEndpoint, setOllamaEndpoint] = useState(localStorage.getItem('ollama_endpoint') || 'http://localhost:11434');

  useEffect(() => {
    setInoreaderAuth(inoreaderService.isAuthenticated());
    if (inoreaderService.isAuthenticated()) {
      setApiUsage(inoreaderService.getAPIUsage());
    }
  }, []);

  const handleInoreaderAuth = () => {
    const authUrl = inoreaderService.getAuthUrl();
    window.open(authUrl, '_blank');
    toast({
      title: "Authentication Required",
      description: "Complete OAuth authentication in the opened window, then refresh this page.",
    });
  };

  const handleInoreaderLogout = () => {
    inoreaderService.logout();
    setInoreaderAuth(false);
    setApiUsage({
      count: 0,
      limit: 5000,
      remaining: 5000,
      resetTime: new Date(),
      percentUsed: 0,
    });
    toast({
      title: "Disconnected",
      description: "Inoreader account disconnected successfully.",
    });
  };

  const handleSaveIntegrations = () => {
    localStorage.setItem('ollama_api_key', ollamaApiKey);
    localStorage.setItem('ollama_endpoint', ollamaEndpoint);
    toast({
      title: "Ollama Settings Saved",
      description: "Ollama configuration has been updated successfully.",
    });
  };

  return (
    <div className="space-y-4">
      {/* Inoreader Integration */}
      <Card className="bg-card/50 backdrop-blur">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <RssSimple size={20} weight="duotone" className="text-emerald-500" />
                Inoreader Integration
              </CardTitle>
              <CardDescription>
                Connect your Inoreader account to aggregate cyber security news feeds
              </CardDescription>
            </div>
            <span className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-md ${inoreaderAuth ? 'bg-transparent text-emerald-500' : 'bg-transparent text-red-500'}`}>
              {inoreaderAuth ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Connected
                </>
              ) : (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  Not Connected
                </>
              )}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {inoreaderAuth ? (
            <>
              <div className="flex items-center justify-between p-4 bg-transparent rounded-lg">
                <div>
                  <p className="text-sm font-medium text-emerald-500">Authentication Status</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Your Inoreader account is successfully connected
                  </p>
                </div>
                <CheckCircle size={32} weight="duotone" className="text-emerald-500" />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>API Usage Statistics</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground">Calls Today</p>
                    <p className="text-2xl font-bold text-primary">{apiUsage.count}/{apiUsage.limit}</p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground">Remaining</p>
                    <p className="text-2xl font-bold text-primary">{apiUsage.remaining}</p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground">Usage</p>
                    <p className="text-2xl font-bold text-primary">{apiUsage.percentUsed.toFixed(1)}%</p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground">Resets At</p>
                    <p className="text-sm font-bold text-primary">{apiUsage.resetTime.toLocaleTimeString()}</p>
                  </div>
                </div>
              </div>

              <Separator />

              <Button
                variant="destructive"
                onClick={handleInoreaderLogout}
                className="w-full"
              >
                Disconnect Inoreader
              </Button>
            </>
          ) : (
            <div className="text-center py-8">
              <RssSimple size={64} weight="duotone" className="mx-auto mb-4 text-primary/50" />
              <h3 className="text-lg font-semibold mb-2">Connect Your Inoreader Account</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                Aggregate cyber security news from multiple sources including The Hacker News,
                Bleeping Computer, CVE feeds, and more in your Command Center dashboard.
              </p>
              <Button
                onClick={handleInoreaderAuth}
                className="gap-2 bg-transparent hover:bg-white/[0.03] text-emerald-500 ring-1 ring-emerald-500/20"
              >
                <RssSimple size={16} weight="bold" />
                Connect Inoreader Account
              </Button>
              <p className="text-xs text-muted-foreground mt-4">
                You'll be redirected to Inoreader to authorize the connection
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ollama Configuration */}
      <Card className="bg-card/50 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain size={20} weight="duotone" className="text-primary" />
            Ollama Configuration
          </CardTitle>
          <CardDescription>Configure your local Ollama instance for AI model inference</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ollama-endpoint">Ollama Endpoint URL</Label>
            <Input
              id="ollama-endpoint"
              placeholder="http://localhost:11434"
              value={ollamaEndpoint}
              onChange={(e) => setOllamaEndpoint(e.target.value)}
              className="terminal-text"
            />
            <p className="text-xs text-muted-foreground">
              Default: http://localhost:11434 (leave as-is for local installation)
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ollama-key">Ollama API Key (Optional)</Label>
            <Input
              id="ollama-key"
              type="password"
              placeholder="Leave empty for local instances"
              value={ollamaApiKey}
              onChange={(e) => setOllamaApiKey(e.target.value)}
              className="terminal-text"
            />
            <p className="text-xs text-muted-foreground">
              Only required if using a remote Ollama server with authentication
            </p>
          </div>
          <Separator />
          <div className="flex justify-end">
            <Button
              onClick={handleSaveIntegrations}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <FloppyDisk size={16} weight="bold" className="mr-2" />
              Save Ollama Settings
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
