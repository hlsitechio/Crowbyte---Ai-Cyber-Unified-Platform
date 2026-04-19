import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { UilRobot, UilCloud, UilBolt, UilSave, UilCheckCircle, UilTimesCircle, UilSpinner, UilGithub, UilGlobe, UilDatabase, UilKeySkeleton, UilPlug, UilShieldCheck, UilSync } from "@iconscout/react-unicons";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth";

type ConnectionStatus = "connected" | "disconnected" | "testing" | "error";

interface ProviderConfig {
  name: string;
  endpointUrl: string;
  apiKey: string;
  model: string;
  enabled: boolean;
}

const DEFAULT_PROVIDERS: Record<string, ProviderConfig> = {
  openclaw: {
    name: "OpenClaw / NVIDIA",
    endpointUrl: import.meta.env.VITE_OPENCLAW_HOSTNAME
      ? `https://${import.meta.env.VITE_OPENCLAW_HOSTNAME}/nvidia/v1`
      : "",
    apiKey: import.meta.env.VITE_NVIDIA_API_KEY || "",
    model: "deepseek-v3.2",
    enabled: true,
  },
  openai: {
    name: "OpenAI Compatible",
    endpointUrl: "",
    apiKey: "",
    model: "gpt-4o",
    enabled: false,
  },
  anthropic: {
    name: "Anthropic",
    endpointUrl: "https://api.anthropic.com/v1",
    apiKey: "",
    model: "claude-sonnet-4-20250514",
    enabled: false,
  },
  ollama: {
    name: "Ollama (Self-Hosted)",
    endpointUrl: "http://localhost:11434/v1",
    apiKey: "",
    model: "llama3.1:70b",
    enabled: false,
  },
  custom: {
    name: "Custom Endpoint",
    endpointUrl: "",
    apiKey: "",
    model: "",
    enabled: false,
  },
};

function loadProviders(): Record<string, ProviderConfig> {
  try {
    const saved = localStorage.getItem("crowbyte_ai_providers");
    if (saved) return JSON.parse(saved);
  } catch {}
  return { ...DEFAULT_PROVIDERS };
}

function loadServiceKeys(): Record<string, string> {
  return {
    shodan: localStorage.getItem("shodan_api_key") || "",
  };
}

export default function IntegrationsSettings() {
  const { toast } = useToast();
  const { user } = useAuth();

  // AI Providers
  const [providers, setProviders] = useState<Record<string, ProviderConfig>>(loadProviders);
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [providerStatus, setProviderStatus] = useState<Record<string, ConnectionStatus>>({});

  // Service API keys
  const [serviceKeys, setServiceKeys] = useState(loadServiceKeys);
  const [testingService, setTestingService] = useState<string | null>(null);
  const [serviceStatus, setServiceStatus] = useState<Record<string, ConnectionStatus>>({});

  // Load Shodan key from Supabase if not in localStorage
  useEffect(() => {
    if (!serviceKeys.shodan && user) {
      (async () => {
        try {
          const { supabase } = await import('@/integrations/supabase/client');
          const { data } = await supabase
            .from('user_settings')
            .select('shodan_api_key')
            .eq('user_id', user.id)
            .maybeSingle();
          if (data?.shodan_api_key) {
            setServiceKeys(prev => ({ ...prev, shodan: data.shodan_api_key }));
            localStorage.setItem('shodan_api_key', data.shodan_api_key);
          }
        } catch {}
      })();
    }
  }, [user]);

  // Supabase status
  const [supabaseStatus, setSupabaseStatus] = useState<ConnectionStatus>("testing");

  // GitHub OAuth
  const [githubConnected, setGithubConnected] = useState(false);

  useEffect(() => {
    // Check Supabase
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (supabaseUrl) {
      fetch(`${supabaseUrl}/rest/v1/`, {
        headers: {
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY || "",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY || ""}`,
        },
      })
        .then((r) => setSupabaseStatus(r.ok ? "connected" : "error"))
        .catch(() => setSupabaseStatus("error"));
    } else {
      setSupabaseStatus("disconnected");
    }

    // Check GitHub OAuth
    if (user?.app_metadata?.provider === "github" || user?.identities?.some((i: { provider: string }) => i.provider === "github")) {
      setGithubConnected(true);
    }
  }, [user]);

  const updateProvider = (key: string, field: keyof ProviderConfig, value: string | boolean) => {
    setProviders((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }));
  };

  const testProvider = async (key: string) => {
    const p = providers[key];
    if (!p.endpointUrl) {
      toast({ title: "No endpoint URL", description: "Enter an endpoint URL first.", variant: "destructive" });
      return;
    }
    setTestingProvider(key);
    setProviderStatus((prev) => ({ ...prev, [key]: "testing" }));

    try {
      const url = p.endpointUrl.replace(/\/+$/, "");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (p.apiKey) headers["Authorization"] = `Bearer ${p.apiKey}`;

      const res = await fetch(`${url}/models`, { headers, signal: AbortSignal.timeout(8000) });
      setProviderStatus((prev) => ({ ...prev, [key]: res.ok ? "connected" : "error" }));
      toast({
        title: res.ok ? "Connection Successful" : "Connection Failed",
        description: res.ok ? `${p.name} is reachable` : `HTTP ${res.status}`,
        variant: res.ok ? "default" : "destructive",
      });
    } catch (err) {
      setProviderStatus((prev) => ({ ...prev, [key]: "error" }));
      toast({ title: "Connection Failed", description: String(err), variant: "destructive" });
    } finally {
      setTestingProvider(null);
    }
  };

  const testShodan = async () => {
    const key = serviceKeys.shodan;
    if (!key) return;
    setTestingService("shodan");
    setServiceStatus((prev) => ({ ...prev, shodan: "testing" }));
    try {
      const res = await fetch(`https://api.shodan.io/api-info?key=${key}`, { signal: AbortSignal.timeout(8000) });
      const ok = res.ok;
      setServiceStatus((prev) => ({ ...prev, shodan: ok ? "connected" : "error" }));
      toast({ title: ok ? "Shodan Connected" : "Invalid Key", variant: ok ? "default" : "destructive" });
    } catch {
      setServiceStatus((prev) => ({ ...prev, shodan: "error" }));
    } finally {
      setTestingService(null);
    }
  };


  const handleSaveAll = async () => {
    localStorage.setItem("crowbyte_ai_providers", JSON.stringify(providers));
    localStorage.setItem("shodan_api_key", serviceKeys.shodan); // CodeQL: local desktop storage, not a web app

    // Sync Shodan key to Supabase for cross-device access
    try {
      if (user) {
        const { supabase } = await import('@/integrations/supabase/client');
        await supabase
          .from('user_settings')
          .upsert({
            user_id: user.id,
            shodan_api_key: serviceKeys.shodan || null,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' });
      }
    } catch {}

    window.dispatchEvent(new CustomEvent("crowbyte:integrations-updated", { detail: { providers, serviceKeys } }));

    toast({ title: "Integrations Saved", description: "All integration settings updated." });
  };

  const StatusBadge = ({ status }: { status?: ConnectionStatus }) => {
    if (!status || status === "disconnected")
      return (
        <span className="flex items-center gap-1.5 text-xs text-zinc-500">
          <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
          Not Connected
        </span>
      );
    if (status === "testing")
      return (
        <span className="flex items-center gap-1.5 text-xs text-blue-400">
          <UilSpinner size={12} className="animate-spin" />
          Testing...
        </span>
      );
    if (status === "connected")
      return (
        <span className="flex items-center gap-1.5 text-xs text-emerald-500">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Connected
        </span>
      );
    return (
      <span className="flex items-center gap-1.5 text-xs text-red-500">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
        Error
      </span>
    );
  };

  const providerEntries = Object.entries(providers);

  return (
    <div className="space-y-6">
      {/* ── AI Infrastructure ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UilRobot size={20} className="text-blue-500" />
            AI Infrastructure
          </CardTitle>
          <CardDescription>
            Connect your own AI providers. Enterprise users can route all AI calls through their infrastructure.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {providerEntries.map(([key, provider], idx) => (
            <div key={key}>
              {idx > 0 && <Separator className="my-4" />}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={provider.enabled}
                      onCheckedChange={(v) => updateProvider(key, "enabled", v)}
                    />
                    <div>
                      <Label className="text-sm font-semibold">{provider.name}</Label>
                      {key === "openclaw" && (
                        <p className="text-[11px] text-zinc-500">Default CrowByte AI gateway</p>
                      )}
                      {key === "custom" && (
                        <p className="text-[11px] text-zinc-500">Any OpenAI-compatible endpoint</p>
                      )}
                    </div>
                  </div>
                  <StatusBadge status={providerStatus[key]} />
                </div>

                {provider.enabled && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pl-12">
                    <div className="space-y-1">
                      <Label className="text-xs text-zinc-400">Endpoint URL</Label>
                      <Input
                        placeholder="https://api.example.com/v1"
                        value={provider.endpointUrl}
                        onChange={(e) => updateProvider(key, "endpointUrl", e.target.value)}
                        className="h-8 text-xs font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-zinc-400">API UilKeySkeleton</Label>
                      <Input
                        type="password"
                        placeholder="sk-..."
                        value={provider.apiKey}
                        onChange={(e) => updateProvider(key, "apiKey", e.target.value)}
                        className="h-8 text-xs font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-zinc-400">Model</Label>
                      <Input
                        placeholder="model-name"
                        value={provider.model}
                        onChange={(e) => updateProvider(key, "model", e.target.value)}
                        className="h-8 text-xs font-mono"
                      />
                    </div>
                    <div className="col-span-full flex justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => testProvider(key)}
                        disabled={testingProvider === key || !provider.endpointUrl}
                        className="h-7 text-xs gap-1.5"
                      >
                        {testingProvider === key ? (
                          <UilSpinner size={12} className="animate-spin" />
                        ) : (
                          <UilBolt size={12} />
                        )}
                        Test Connection
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          <div className="bg-blue-500/5 border border-blue-500/10 rounded-lg p-3 mt-2">
            <p className="text-xs text-blue-400/80">
              <strong>Enterprise:</strong> Enable your own AI provider to route all CrowByte AI
              operations through your infrastructure. Supports any OpenAI-compatible API endpoint.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ── Platform Services ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UilPlug size={20} className="text-purple-500" />
            Platform Services
          </CardTitle>
          <CardDescription>Core service connections and API keys</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Supabase (read-only) */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/50 border border-zinc-800">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-md bg-emerald-500/10 flex items-center justify-center">
                <UilDatabase size={16} className="text-emerald-500" />
              </div>
              <div>
                <p className="text-sm font-semibold">Supabase</p>
                <p className="text-[11px] text-zinc-500 font-mono">
                  {import.meta.env.VITE_SUPABASE_URL
                    ? new URL(import.meta.env.VITE_SUPABASE_URL).hostname
                    : "Not configured"}
                </p>
              </div>
            </div>
            <StatusBadge status={supabaseStatus} />
          </div>

          {/* GitHub OAuth (read-only) */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/50 border border-zinc-800">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-md bg-zinc-700/50 flex items-center justify-center">
                <UilGithub size={16} className="text-zinc-300" />
              </div>
              <div>
                <p className="text-sm font-semibold">GitHub OAuth</p>
                <p className="text-[11px] text-zinc-500">
                  {githubConnected ? "Linked via Supabase Auth" : "Not linked — login with GitHub to connect"}
                </p>
              </div>
            </div>
            <StatusBadge status={githubConnected ? "connected" : "disconnected"} />
          </div>

          <Separator />

          {/* Shodan */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UilGlobe size={16} className="text-red-400" />
                <Label className="text-sm font-semibold">Shodan</Label>
              </div>
              <StatusBadge status={serviceStatus.shodan} />
            </div>
            <div className="flex gap-2">
              <Input
                type="password"
                placeholder="Shodan API key"
                value={serviceKeys.shodan}
                onChange={(e) => setServiceKeys((p) => ({ ...p, shodan: e.target.value }))}
                className="h-8 text-xs font-mono flex-1"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={testShodan}
                disabled={testingService === "shodan" || !serviceKeys.shodan}
                className="h-8 text-xs gap-1.5"
              >
                {testingService === "shodan" ? (
                  <UilSpinner size={12} className="animate-spin" />
                ) : (
                  <UilSync size={12} />
                )}
                Test
              </Button>
            </div>
            <p className="text-[11px] text-zinc-500">Network intelligence, CVE lookup, IP enrichment</p>
          </div>

        </CardContent>
      </Card>

      {/* ── Save ── */}
      <div className="flex justify-end">
        <Button onClick={handleSaveAll} className="bg-primary hover:bg-primary/90 text-primary-foreground">
          <UilSave size={16} className="mr-2" />
          Save All Integrations
        </Button>
      </div>
    </div>
  );
}
