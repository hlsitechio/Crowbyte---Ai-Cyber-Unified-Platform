import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion } from "framer-motion";
import {
  Monitor,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Cpu,
  HardDrive,
  Activity,
  RefreshCw,
  Search,
  Filter,
  Shield,
  Clock,
  MapPin,
  Plus,
  Server,
  Trash2,
  MoreVertical,
  Zap,
  ScreenShare,
  Eye,
  MousePointer2,
  Lock,
  History,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AddEndpointDialog } from "@/components/fleet/AddEndpointDialog";
import { RemoteControlDialog } from "@/components/fleet/RemoteControlDialog";
import { VNCViewer } from "@/components/fleet/VNCViewer";
import { endpointService, Endpoint } from "@/services/endpointService";
import { toast } from "sonner";
import { openClaw } from "@/services/openclaw";

interface VPSStatus {
  ok: boolean;
  latencyMs: number;
  agents: string[];
  services: { name: string; active: boolean }[];
}

const Fleet = () => {
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [remoteDialogOpen, setRemoteDialogOpen] = useState(false);
  const [vncDialogOpen, setVncDialogOpen] = useState(false);
  const [remoteTarget, setRemoteTarget] = useState<Endpoint | null>(null);
  const [vpsStatus, setVpsStatus] = useState<VPSStatus | null>(null);
  const [vpsLoading, setVpsLoading] = useState(true);

  const loadEndpoints = useCallback(async () => {
    setLoading(true);
    try {
      const data = await endpointService.getAll();
      setEndpoints(data);
    } catch (error) {
      console.error('Failed to load endpoints:', error);
      toast.error('Failed to load endpoints');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEndpoints();

    // Start auto-update for current device if registered
    endpointService.findCurrentDevice().then(device => {
      if (device) {
        endpointService.startAutoUpdate(30000);
      }
    });

    return () => {
      endpointService.stopAutoUpdate();
    };
  }, [loadEndpoints]);

  // Realtime endpoint updates from Supabase
  useEffect(() => {
    let channel: any = null;
    const setupRealtime = async () => {
      try {
        const { supabase } = await import('@/lib/supabase');
        channel = supabase
          .channel('fleet-endpoints')
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'endpoints',
          }, () => {
            // Reload all endpoints on any change
            loadEndpoints();
          })
          .subscribe();
      } catch {}
    };
    setupRealtime();
    // Fallback poll every 60s (realtime handles most updates)
    const interval = setInterval(loadEndpoints, 60000);
    return () => {
      clearInterval(interval);
      if (channel) {
        import('@/lib/supabase').then(({ supabase }) => supabase.removeChannel(channel));
      }
    };
  }, [loadEndpoints]);

  // VPS health check
  useEffect(() => {
    const checkVPS = async () => {
      setVpsLoading(true);
      try {
        // Health check via OpenClaw
        let health = await openClaw.healthCheck();

        // If renderer fetch fails, try via Electron curl
        if (!health.ok && window.electronAPI?.executeCommand) {
          const start = Date.now();
          const output = await window.electronAPI.executeCommand(
            `curl -sk -o /dev/null -w %{http_code} https://${import.meta.env.VITE_OPENCLAW_HOSTNAME || 'localhost'}/nvidia/v1/models --connect-timeout 5`
          );
          health = { ok: output.includes('200'), latencyMs: Date.now() - start };
        }

        // Get service status via SSH
        let services: { name: string; active: boolean }[] = [];
        if (window.electronAPI?.executeCommand) {
          try {
            const svcOutput = await window.electronAPI.executeCommand(
              `ssh -o ConnectTimeout=5 -o StrictHostKeyChecking=no root@${import.meta.env.VITE_VPS_IP || 'localhost'} 'systemctl is-active nvidia-proxy openclaw-gateway openclaw-mcp docker 2>/dev/null; docker inspect -f "{{.State.Status}}" traefik-traefik-1 2>/dev/null || echo inactive' 2>/dev/null`
            );
            const svcNames = ['nvidia-proxy', 'openclaw-gateway', 'openclaw-mcp', 'docker', 'traefik'];
            const svcStates = svcOutput.trim().split('\n');
            services = svcNames.map((name, i) => ({
              name,
              active: svcStates[i]?.trim() === 'active' || svcStates[i]?.trim() === 'running',
            }));
          } catch { /* SSH failed */ }
        }

        setVpsStatus({
          ok: health.ok,
          latencyMs: health.latencyMs,
          agents: openClaw.getAgents(),
          services,
        });
      } catch {
        setVpsStatus({ ok: false, latencyMs: 0, agents: [], services: [] });
      } finally {
        setVpsLoading(false);
      }
    };

    checkVPS();
    const interval = setInterval(checkVPS, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleDeleteEndpoint = async (id: string, hostname: string) => {
    if (!confirm(`Are you sure you want to remove ${hostname} from your fleet?`)) {
      return;
    }

    try {
      await endpointService.delete(id);
      toast.success('Endpoint removed', {
        description: `${hostname} has been removed from your fleet`,
      });
      loadEndpoints();
    } catch (error) {
      toast.error('Failed to remove endpoint');
    }
  };

  const handleRemoteControl = (endpoint: Endpoint) => {
    if (endpoint.status === 'offline') {
      toast.error('Endpoint is offline', { description: `${endpoint.hostname} must be online for remote control` });
      return;
    }
    setRemoteTarget(endpoint);
    // Use VNC viewer for direct connections (VPS, servers with VNC)
    setVncDialogOpen(true);
  };

  const filteredEndpoints = endpoints.filter(ep => {
    const matchesSearch = ep.hostname.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         ep.ip_address.includes(searchQuery);
    const matchesStatus = statusFilter === "all" || ep.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: endpoints.length,
    online: endpoints.filter(e => e.status === "online").length,
    offline: endpoints.filter(e => e.status === "offline").length,
    warning: endpoints.filter(e => e.status === "warning").length,
    critical: endpoints.filter(e => e.status === "critical").length,
    totalThreats: endpoints.reduce((sum, e) => sum + e.threats_detected, 0),
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "online": return <CheckCircle className="h-5 w-5 text-green-400" />;
      case "offline": return <XCircle className="h-5 w-5 text-gray-400" />;
      case "warning": return <AlertTriangle className="h-5 w-5 text-yellow-400" />;
      case "critical": return <AlertTriangle className="h-5 w-5 text-red-400" />;
      default: return <Monitor className="h-5 w-5" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "online": return "bg-green-500/20 text-green-400 border-green-500/50";
      case "offline": return "bg-gray-500/20 text-gray-400 border-gray-500/50";
      case "warning": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/50";
      case "critical": return "bg-red-500/20 text-red-400 border-red-500/50";
      default: return "bg-gray-500/20 text-gray-400 border-gray-500/50";
    }
  };

  const getHealthColor = (value: number) => {
    if (value > 80) return "text-red-400";
    if (value > 60) return "text-yellow-400";
    return "text-green-400";
  };

  const getProgressColor = (value: number) => {
    if (value > 80) return "bg-red-500";
    if (value > 60) return "bg-yellow-500";
    return "bg-green-500";
  };

  const formatLastSeen = (lastSeenAt: string) => {
    const diff = Date.now() - new Date(lastSeenAt).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-4xl font-bold text-gradient-silver flex items-center gap-3">
            <Monitor className="h-10 w-10 text-primary" />
            Fleet Management
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Monitor and manage all endpoints across your organization
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadEndpoints} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={() => setAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Endpoint
          </Button>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border-primary/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Total Endpoints</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <Monitor className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="border-green-500/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Online</p>
                  <p className="text-2xl font-bold text-green-400">{stats.online}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="border-gray-500/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Offline</p>
                  <p className="text-2xl font-bold text-gray-400">{stats.offline}</p>
                </div>
                <XCircle className="h-8 w-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Card className="border-yellow-500/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Warning</p>
                  <p className="text-2xl font-bold text-yellow-400">{stats.warning}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-yellow-400" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="border-red-500/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Critical</p>
                  <p className="text-2xl font-bold text-red-400">{stats.critical}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-400" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <Card className="border-red-500/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Active Threats</p>
                  <p className="text-2xl font-bold text-red-400">{stats.totalThreats}</p>
                </div>
                <Shield className="h-8 w-8 text-red-400" />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Filters */}
      <Card className="border-primary/30">
        <CardContent className="p-4">
          <div className="flex gap-4 items-center flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by hostname or IP..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant={statusFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("all")}
              >
                <Filter className="h-4 w-4 mr-2" />
                All
              </Button>
              <Button
                variant={statusFilter === "online" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("online")}
              >
                Online
              </Button>
              <Button
                variant={statusFilter === "offline" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("offline")}
              >
                Offline
              </Button>
              <Button
                variant={statusFilter === "warning" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("warning")}
              >
                Warning
              </Button>
              <Button
                variant={statusFilter === "critical" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("critical")}
              >
                Critical
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* VPS Infrastructure */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <Card className={`border-2 ${vpsStatus?.ok ? 'border-green-500/40' : 'border-red-500/40'} bg-gradient-to-br from-card/80 to-primary/5`}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Server className="h-5 w-5 text-primary" />
                Infrastructure — OpenClaw VPS
              </CardTitle>
              <div className="flex items-center gap-2">
                {vpsLoading ? (
                  <Badge variant="outline" className="text-xs border-yellow-500/30 bg-yellow-500/10 text-yellow-400">
                    <RefreshCw className="h-3 w-3 mr-1 animate-spin" /> Checking...
                  </Badge>
                ) : vpsStatus?.ok ? (
                  <Badge variant="outline" className="text-xs border-green-500/30 bg-green-500/10 text-green-400">
                    <CheckCircle className="h-3 w-3 mr-1" /> Online — {vpsStatus.latencyMs}ms
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs border-red-500/30 bg-red-500/10 text-red-400">
                    <XCircle className="h-3 w-3 mr-1" /> Offline
                  </Badge>
                )}
              </div>
            </div>
            <CardDescription className="font-mono text-xs flex items-center justify-between">
              <span>{import.meta.env.VITE_OPENCLAW_HOSTNAME || 'VPS'} ({import.meta.env.VITE_VPS_IP || 'Not configured'}) — Hostinger VPS</span>
              <Button
                variant="outline"
                size="sm"
                className="h-6 text-[11px] border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-400 ml-2"
                onClick={() => {
                  setRemoteTarget(null);
                  setVncDialogOpen(true);
                }}
              >
                <ScreenShare className="h-3 w-3 mr-1" />
                Remote Desktop
              </Button>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Services */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Services</p>
                <div className="space-y-1">
                  {(vpsStatus?.services && vpsStatus.services.length > 0) ? (
                    vpsStatus.services.map((svc) => (
                      <div key={svc.name} className="flex items-center justify-between text-xs">
                        <span className="font-mono">{svc.name}</span>
                        <Badge variant="outline" className={`text-xs px-1.5 py-0 h-4 ${
                          svc.active ? 'border-green-500/30 text-green-400' : 'border-red-500/30 text-red-400'
                        }`}>
                          {svc.active ? 'active' : 'inactive'}
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <>
                      {['nvidia-proxy', 'openclaw-gateway', 'openclaw-mcp', 'docker', 'traefik'].map(name => (
                        <div key={name} className="flex items-center justify-between text-xs">
                          <span className="font-mono">{name}</span>
                          <Badge variant="outline" className="text-xs px-1.5 py-0 h-4 border-gray-500/30 text-gray-400">
                            {vpsLoading ? '...' : 'unknown'}
                          </Badge>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>

              {/* Agents */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">AI Agents ({vpsStatus?.agents.length || 9})</p>
                <div className="flex flex-wrap gap-1">
                  {(vpsStatus?.agents || openClaw.getAgents()).map((agent) => (
                    <Badge key={agent} variant="outline" className="text-xs px-1.5 py-0 h-5 border-primary/30 bg-primary/5 text-primary">
                      {agent}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Config */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Configuration</p>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Model</span>
                    <span className="font-mono text-primary">{openClaw.getModels().find(m => m.id === openClaw.getCurrentModel())?.name || 'GLM5'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Inference</span>
                    <span className="text-green-400">NVIDIA Free</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Gateway</span>
                    <span className="font-mono">:18789</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Proxy</span>
                    <span className="font-mono">:19990</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Endpoints Grid or Empty State */}
      <ScrollArea className="h-[calc(100vh-500px)]">
        {loading && endpoints.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredEndpoints.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-20"
          >
            <div className="p-6 rounded-full bg-muted/20 mb-6">
              <Server className="h-16 w-16 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No Endpoints Registered</h3>
            <p className="text-muted-foreground text-center max-w-md mb-6">
              Start monitoring your infrastructure by adding endpoints to your fleet.
              Register this device to begin real-time monitoring.
            </p>
            <Button onClick={() => setAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Endpoint
            </Button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredEndpoints.map((endpoint, index) => (
              <motion.div
                key={endpoint.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className={`border-${endpoint.status === 'critical' ? 'red' : endpoint.status === 'warning' ? 'yellow' : 'primary'}/30 hover:border-primary/50 transition-all`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(endpoint.status)}
                        <div>
                          <CardTitle className="text-lg flex items-center gap-2">
                            {endpoint.hostname}
                            {endpoint.is_current_device && (
                              <Badge variant="outline" className="text-xs">This PC</Badge>
                            )}
                          </CardTitle>
                          <CardDescription className="text-xs">{endpoint.ip_address}</CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={`text-xs ${getStatusColor(endpoint.status)}`}>
                          {endpoint.status.toUpperCase()}
                        </Badge>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleRemoteControl(endpoint)}
                              disabled={endpoint.status === 'offline'}
                            >
                              <ScreenShare className="h-4 w-4 mr-2 text-emerald-400" />
                              Remote Control
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleRemoteControl({ ...endpoint } as Endpoint)}
                              disabled={endpoint.status === 'offline'}
                            >
                              <Eye className="h-4 w-4 mr-2 text-blue-400" />
                              View Only
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDeleteEndpoint(endpoint.id, endpoint.hostname)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Remove
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* OS & Location */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{endpoint.os_name} {endpoint.os_version}</span>
                      {endpoint.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {endpoint.location}
                        </div>
                      )}
                    </div>

                    {/* Resource Usage */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <Cpu className="h-3 w-3" />
                          <span>CPU</span>
                        </div>
                        <span className={`font-mono ${getHealthColor(endpoint.cpu_usage)}`}>{Math.round(endpoint.cpu_usage)}%</span>
                      </div>
                      <div className="h-1 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full ${getProgressColor(endpoint.cpu_usage)} transition-all`}
                          style={{ width: `${endpoint.cpu_usage}%` }}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <Activity className="h-3 w-3" />
                          <span>Memory</span>
                        </div>
                        <span className={`font-mono ${getHealthColor(endpoint.memory_usage)}`}>{Math.round(endpoint.memory_usage)}%</span>
                      </div>
                      <div className="h-1 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full ${getProgressColor(endpoint.memory_usage)} transition-all`}
                          style={{ width: `${endpoint.memory_usage}%` }}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <HardDrive className="h-3 w-3" />
                          <span>Disk</span>
                        </div>
                        <span className={`font-mono ${getHealthColor(endpoint.disk_usage)}`}>{Math.round(endpoint.disk_usage)}%</span>
                      </div>
                      <div className="h-1 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full ${getProgressColor(endpoint.disk_usage)} transition-all`}
                          style={{ width: `${endpoint.disk_usage}%` }}
                        />
                      </div>
                    </div>

                    {/* GPU (if available) */}
                    {endpoint.gpu && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <Zap className="h-3 w-3 text-purple-400" />
                            <span>GPU</span>
                          </div>
                          <span className="font-mono text-purple-400">{endpoint.gpu.utilization}%</span>
                        </div>
                        <div className="h-1 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-purple-500 transition-all"
                            style={{ width: `${endpoint.gpu.utilization}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                          <span>{endpoint.gpu.name}</span>
                          <span>{endpoint.gpu.memoryUsed}/{endpoint.gpu.memoryTotal} MiB · {endpoint.gpu.temperature}°C</span>
                        </div>
                      </div>
                    )}

                    {/* Threats & Last Seen */}
                    <div className="flex items-center justify-between pt-2 border-t border-border/50">
                      <div className="flex items-center gap-2 text-xs">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          {formatLastSeen(endpoint.last_seen_at)}
                        </span>
                      </div>
                      {endpoint.threats_detected > 0 && (
                        <Badge className="bg-red-500/20 text-red-400 border-red-500/50 text-xs">
                          {endpoint.threats_detected} threat{endpoint.threats_detected > 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>

                    {/* Remote Control Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-2 border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 hover:border-emerald-500/40 text-emerald-400 text-xs"
                      onClick={() => handleRemoteControl(endpoint)}
                      disabled={endpoint.status === 'offline'}
                    >
                      <ScreenShare className="h-3.5 w-3.5 mr-2" />
                      Remote Control
                      <Lock className="h-3 w-3 ml-auto text-emerald-500/50" />
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Add Endpoint Dialog */}
      <AddEndpointDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onEndpointAdded={loadEndpoints}
      />

      {/* Remote Control Dialog (future E2E agent system) */}
      <RemoteControlDialog
        open={remoteDialogOpen}
        onOpenChange={setRemoteDialogOpen}
        endpoint={remoteTarget}
      />

      {/* VNC Viewer (direct VNC/noVNC connections) */}
      <VNCViewer
        open={vncDialogOpen}
        onOpenChange={setVncDialogOpen}
        endpoint={remoteTarget}
      />
    </div>
  );
};

export default Fleet;
