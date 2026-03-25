import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brain, ArrowsClockwise, CheckCircle, XCircle, Pulse, TreeStructure, Lightning, FloppyDisk } from "@phosphor-icons/react";
import openClaw from "@/services/openclaw";
import { useToast } from "@/hooks/use-toast";

export default function LLMSettings() {
  const { toast } = useToast();
  const [models, setModels] = useState<any[]>([]);
  const [loadingModels, setLoadingModels] = useState(true);
  const [openClawConnected, setOpenClawConnected] = useState(false);
  const [openClawEndpoint, setOpenClawEndpoint] = useState(localStorage.getItem('openclaw_endpoint') || `https://${import.meta.env.VITE_OPENCLAW_HOSTNAME || 'localhost'}`);
  const [testingConnection, setTestingConnection] = useState(false);

  useEffect(() => {
    fetchModels();
    checkOpenClaw();
  }, []);

  const checkOpenClaw = async () => {
    try {
      const health = await openClaw.healthCheck();
      setOpenClawConnected(health.ok);
    } catch {
      setOpenClawConnected(false);
    }
  };

  const saveOpenClawEndpoint = async () => {
    localStorage.setItem('openclaw_endpoint', openClawEndpoint);
    toast({
      title: "Endpoint Saved",
      description: "OpenClaw VPS endpoint has been saved",
    });
    checkOpenClaw();
  };

  const testOpenClawConnection = async () => {
    setTestingConnection(true);
    try {
      const health = await openClaw.healthCheck();
      setOpenClawConnected(health.ok);
      toast({
        title: health.ok ? "Connection Successful" : "Connection Failed",
        description: health.ok ? "OpenClaw VPS is online and responding" : "VPS is not responding",
        variant: health.ok ? "default" : "destructive",
      });
    } catch (error) {
      console.error('Connection test failed:', error);
      setOpenClawConnected(false);
      toast({
        title: "Connection Failed",
        description: "OpenClaw VPS is unreachable",
        variant: "destructive",
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const fetchModels = async () => {
    setLoadingModels(true);
    try {
      const data = openClaw.getModels();
      setModels(data);
    } catch (error) {
      console.error('Failed to fetch models:', error);
    } finally {
      setLoadingModels(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* OpenClaw VPS Configuration Card */}
      <Card className="bg-card/50 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TreeStructure size={20} weight="duotone" className="text-emerald-500" />
            OpenClaw VPS Configuration
          </CardTitle>
          <CardDescription>
            Manage your OpenClaw VPS endpoint for NVIDIA free inference
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="openclaw-endpoint">VPS Endpoint</Label>
            <div className="flex gap-2">
              <Input
                id="openclaw-endpoint"
                type="text"
                placeholder="https://your-vps-hostname"
                value={openClawEndpoint}
                onChange={(e) => setOpenClawEndpoint(e.target.value)}
                className="flex-1"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={saveOpenClawEndpoint}
              className="flex-1"
            >
              <FloppyDisk size={16} weight="bold" className="mr-2" />
              Save Endpoint
            </Button>
            <Button
              onClick={testOpenClawConnection}
              variant="outline"
              className="flex-1"
              disabled={testingConnection}
            >
              {testingConnection ? (
                <>
                  <ArrowsClockwise size={16} weight="bold" className="mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <CheckCircle size={16} weight="bold" className="mr-2" />
                  Test Connection
                </>
              )}
            </Button>
          </div>

          <div className="p-3 bg-transparent rounded-lg">
            <p className="text-xs text-emerald-500">
              <strong>Status:</strong> {openClawConnected ? 'VPS Online — NVIDIA free inference active ($0/token)' : 'VPS Offline — check your connection'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* OpenClaw Status Card */}
      <Card className="bg-card/50 backdrop-blur">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Pulse size={20} weight="duotone" className={`${openClawConnected ? 'text-emerald-500' : 'text-red-500'}`} />
                OpenClaw VPS Status
              </CardTitle>
              <CardDescription>
                NVIDIA free inference via VPS agent swarm
              </CardDescription>
            </div>
            <span className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-md ${openClawConnected ? 'bg-transparent text-emerald-500' : 'bg-transparent text-red-500'}`}>
              {openClawConnected ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Online
                </>
              ) : (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  Offline
                </>
              )}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">Available Models</p>
              <p className="text-2xl font-bold text-emerald-500">{models.length}</p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">Cost Per Token</p>
              <p className="text-2xl font-bold text-emerald-500">$0</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Models Summary Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-card/50 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white">Total Models</CardTitle>
            <Brain size={16} weight="bold" className="text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-500">{loadingModels ? '...' : models.length}</div>
            <p className="text-xs text-muted-foreground">
              {loadingModels ? 'Loading...' : models.length === 0 ? 'No models found' : 'Available models'}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white">VPS Status</CardTitle>
            <Pulse size={16} weight="bold" className="text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-500">
              {openClawConnected ? 'Online' : 'Offline'}
            </div>
            <p className="text-xs text-muted-foreground">NVIDIA Free Inference</p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white">Cost</CardTitle>
            <Lightning size={16} weight="bold" className="text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-500">$0</div>
            <p className="text-xs text-muted-foreground">Per token</p>
          </CardContent>
        </Card>
      </div>

      {/* Refresh Button */}
      <div className="flex justify-end">
        <Button
          onClick={fetchModels}
          variant="outline"
          className="border-transparent text-emerald-500 hover:bg-transparent"
          disabled={loadingModels}
        >
          <ArrowsClockwise size={16} weight="bold" className={`mr-2 ${loadingModels ? 'animate-spin' : ''}`} />
          Refresh Models
        </Button>
      </div>

      {/* Models List */}
      {loadingModels ? (
        <Card className="bg-card/50 backdrop-blur">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ArrowsClockwise size={64} weight="duotone" className="text-emerald-500 mb-4 animate-spin" />
            <h3 className="text-lg font-semibold text-white mb-2">Loading Models...</h3>
            <p className="text-muted-foreground text-center">
              Fetching available OpenClaw models
            </p>
          </CardContent>
        </Card>
      ) : models.length === 0 ? (
        <Card className="bg-card/50 backdrop-blur">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Brain size={64} weight="duotone" className="text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">No Models Available</h3>
            <p className="text-muted-foreground text-center mb-4">
              Connect to OpenClaw VPS to access models
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {models.map((model) => (
            <Card key={model.id} className="bg-card/50 backdrop-blur transition-colors">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Brain size={20} weight="duotone" className="text-emerald-500" />
                      {model.name || model.id}
                    </CardTitle>
                    <CardDescription className="terminal-text mt-1">
                      Context: {model.context_length?.toLocaleString() || 'N/A'} tokens
                    </CardDescription>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-md bg-transparent text-emerald-500 font-medium">
                    OpenClaw
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Model ID</p>
                    <p className="text-sm font-medium text-white terminal-text">{model.id}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Type</p>
                    <p className="text-sm font-medium text-white">{model.type}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Capabilities</p>
                    <div className="flex flex-wrap gap-1">
                      {model.capabilities?.slice(0, 3).map((cap: string, i: number) => (
                        <span key={i} className="text-xs px-1.5 py-0.5 rounded bg-transparent text-emerald-500">
                          {cap}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                {model.pricing && (
                  <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t border-transparent">
                    <span>Input: ${model.pricing.input}/M tokens</span>
                    <span>&#183;</span>
                    <span>Output: ${model.pricing.output}/M tokens</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
