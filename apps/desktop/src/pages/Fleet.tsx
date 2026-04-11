import { useState, useEffect, useCallback } from"react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from"@/components/ui/card";
import { Button } from"@/components/ui/button";
import { Input } from"@/components/ui/input";
import { ScrollArea } from"@/components/ui/scroll-area";
import { motion } from"framer-motion";
import { UilMonitor, UilExclamationTriangle, UilCheckCircle, UilTimesCircle, UilProcessor, UilServer, UilHeartRate, UilSync, UilSearch, UilFilter, UilShield, UilClock, UilMapPin, UilPlus, UilDesktopAlt, UilTrashAlt, UilEllipsisV, UilBolt, UilEye, UilMouseAlt, UilLock, UilHistory } from "@iconscout/react-unicons";
import {
 DropdownMenu,
 DropdownMenuContent,
 DropdownMenuItem,
 DropdownMenuTrigger,
} from"@/components/ui/dropdown-menu";
import { AddEndpointDialog } from"@/components/fleet/AddEndpointDialog";
import { RemoteControlDialog } from"@/components/fleet/RemoteControlDialog";
import { VNCViewer } from"@/components/fleet/VNCViewer";
import { endpointService, Endpoint } from"@/services/endpointService";
import { toast } from"sonner";
import { openClaw } from"@/services/openclaw";

interface VPSStatus {
 ok: boolean;
 latencyMs: number;
 agents: string[];
 services: { name: string; active: boolean }[];
}

interface HostMetrics {
 hostname: string;
 os: string;
 uptime: string;
 cpu: { model: string; cores: number; usage: number; temperature?: number };
 memory: { total: string; used: string; percent: number };
 disk: { total: string; used: string; percent: number };
 network: { rx_rate: string; tx_rate: string; interfaces: number };
 docker: { running: number; total: number };
 loadAvg: number[];
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
 const [hostMetrics, setHostMetrics] = useState<HostMetrics | null>(null);
 const [hostLoading, setHostLoading] = useState(true);

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
 `ssh -o ConnectTimeout=5 -o StrictHostKeyChecking=no root@${import.meta.env.VITE_VPS_IP || 'localhost'} 'systemctl is-active nvidia-proxy openclaw-gateway openclaw-mcp docker 2>/dev/null; docker inspect -f"{{.State.Status}}" traefik-traefik-1 2>/dev/null || echo inactive' 2>/dev/null`
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

 // Host server metrics (this server's hardware)
 useEffect(() => {
 const fetchHostMetrics = async () => {
 setHostLoading(true);
 try {
 const baseUrl = window.location.origin;
 const token = localStorage.getItem('crowbyte_server_token');
 const headers: Record<string, string> = token ? { 'Authorization': `Bearer ${token}` } : {};

 const [overviewRes, cpuRes, memRes, diskRes, netRes, dockerRes] = await Promise.allSettled([
 fetch(`${baseUrl}/api/system/overview`, { headers }),
 fetch(`${baseUrl}/api/system/cpu`, { headers }),
 fetch(`${baseUrl}/api/system/memory`, { headers }),
 fetch(`${baseUrl}/api/system/disk`, { headers }),
 fetch(`${baseUrl}/api/system/network`, { headers }),
 fetch(`${baseUrl}/api/system/docker`, { headers }),
 ]);

 const getJson = (r: PromiseSettledResult<Response>) =>
 r.status === 'fulfilled' && r.value.ok ? r.value.json() : Promise.resolve(null);

 const [overview, cpu, mem, disk, net, docker] = await Promise.all([
 getJson(overviewRes), getJson(cpuRes), getJson(memRes),
 getJson(diskRes), getJson(netRes), getJson(dockerRes),
 ]);

 if (overview || cpu || mem) {
 const formatBytes = (bytes: number) => {
 if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(1)} GB`;
 if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(0)} MB`;
 return `${(bytes / 1024).toFixed(0)} KB`;
 };

 const rootDisk = disk?.filesystems?.find((f: any) => f.mount === '/') || disk?.filesystems?.[0];

 // Map API response fields
 const cpuUsage = cpu?.usage?.total ?? cpu?.currentLoad ?? 0;
 const memTotal = mem?.total || 0;
 const memUsed = mem?.used || (memTotal - (mem?.available || mem?.free || 0));
 const memPercent = mem?.usedPercent ?? (memTotal ? Math.round((memUsed / memTotal) * 100) : 0);
 const diskPercent = rootDisk?.usedPercent ?? (rootDisk?.size ? Math.round((rootDisk.used / rootDisk.size) * 100) : 0);

 // Network rates from interfaces
 const ethIface = net?.interfaces?.find((i: any) => i.iface !== 'lo' && i.operstate === 'up') || net?.interfaces?.find((i: any) => i.iface !== 'lo');
 const rxRate = net?.rxRate ?? ethIface?.rx?.rate;
 const txRate = net?.txRate ?? ethIface?.tx?.rate;

 // Load avg
 const la = overview?.loadAvg;
 const loadArr = la ? [la.load1 ?? la[0] ?? 0, la.load5 ?? la[1] ?? 0, la.load15 ?? la[2] ?? 0] : [];

 setHostMetrics({
 hostname: overview?.hostname || 'CrowByte Server',
 os: overview?.distro ? `${overview.distro} ${overview.release || ''}`.trim() : 'Linux',
 uptime: overview?.uptimeFormatted || '--',
 cpu: {
 model: cpu?.model || 'Unknown',
 cores: cpu?.cores || cpu?.threads || 0,
 usage: cpuUsage,
 temperature: cpu?.temperature?.main,
 },
 memory: {
 total: mem?.formatted?.total || formatBytes(memTotal),
 used: mem?.formatted?.used || formatBytes(memUsed),
 percent: memPercent,
 },
 disk: {
 total: rootDisk?.formatted?.size || (rootDisk ? formatBytes(rootDisk.size) : '--'),
 used: rootDisk?.formatted?.used || (rootDisk ? formatBytes(rootDisk.used) : '--'),
 percent: diskPercent,
 },
 network: {
 rx_rate: rxRate ? formatBytes(rxRate) + '/s' : '--',
 tx_rate: txRate ? formatBytes(txRate) + '/s' : '--',
 interfaces: net?.interfaces?.filter((i: any) => i.iface !== 'lo').length || 0,
 },
 docker: {
 running: docker?.running ?? docker?.containers?.filter((c: any) => c.state === 'running').length ?? 0,
 total: (docker?.running ?? 0) + (docker?.stopped ?? 0) + (docker?.paused ?? 0),
 },
 loadAvg: loadArr,
 });
 }
 } catch (err) {
 console.error('Host metrics fetch failed:', err);
 } finally {
 setHostLoading(false);
 }
 };

 fetchHostMetrics();
 const interval = setInterval(fetchHostMetrics, 5000);
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
 const matchesStatus = statusFilter ==="all" || ep.status === statusFilter;
 return matchesSearch && matchesStatus;
 });

 const stats = {
 total: endpoints.length,
 online: endpoints.filter(e => e.status ==="online").length,
 offline: endpoints.filter(e => e.status ==="offline").length,
 warning: endpoints.filter(e => e.status ==="warning").length,
 critical: endpoints.filter(e => e.status ==="critical").length,
 totalThreats: endpoints.reduce((sum, e) => sum + e.threats_detected, 0),
 };

 const getStatusIcon = (status: string) => {
 switch (status) {
 case"online": return <UilCheckCircle size={20} className="text-emerald-500" />;
 case"offline": return <UilTimesCircle size={20} className="text-zinc-500" />;
 case"warning": return <UilExclamationTriangle size={20} className="text-amber-500" />;
 case"critical": return <UilExclamationTriangle size={20} className="text-red-500" />;
 default: return <UilMonitor size={20} />;
 }
 };

 const getStatusColor = (status: string) => {
 switch (status) {
 case"online": return"text-emerald-500";
 case"offline": return"text-zinc-500";
 case"warning": return"text-amber-500";
 case"critical": return"text-red-500";
 default: return"text-zinc-500";
 }
 };

 const getHealthColor = (value: number) => {
 if (value > 80) return"text-red-500";
 if (value > 60) return"text-amber-500";
 return"text-emerald-500";
 };

 const getProgressColor = (value: number) => {
 if (value > 80) return"bg-red-500";
 if (value > 60) return"bg-yellow-500";
 return"bg-emerald-500";
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
 <UilMonitor size={40} className="text-primary" />
 Fleet Management
 </h1>
 <p className="text-sm text-muted-foreground mt-2">
 UilMonitor and manage all endpoints across your organization
 </p>
 </div>
 <div className="flex gap-2">
 <Button variant="outline" onClick={loadEndpoints} disabled={loading}>
 <UilSync size={16} className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
 Refresh
 </Button>
 <Button onClick={() => setAddDialogOpen(true)}>
 <UilPlus size={16} className="mr-2" />
 Add Endpoint
 </Button>
 </div>
 </motion.div>

 {/* Stats Cards */}
 <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
 <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
 <Card>
 <CardContent className="p-4">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-xs text-muted-foreground">Total Endpoints</p>
 <p className="text-2xl font-bold">{stats.total}</p>
 </div>
 <UilMonitor size={32} className="text-primary" />
 </div>
 </CardContent>
 </Card>
 </motion.div>

 <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
 <Card>
 <CardContent className="p-4">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-xs text-muted-foreground">Online</p>
 <p className="text-2xl font-bold text-emerald-500">{stats.online}</p>
 </div>
 <UilCheckCircle size={32} className="text-emerald-500" />
 </div>
 </CardContent>
 </Card>
 </motion.div>

 <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
 <Card>
 <CardContent className="p-4">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-xs text-muted-foreground">Offline</p>
 <p className="text-2xl font-bold text-zinc-500">{stats.offline}</p>
 </div>
 <UilTimesCircle size={32} className="text-zinc-500" />
 </div>
 </CardContent>
 </Card>
 </motion.div>

 <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
 <Card>
 <CardContent className="p-4">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-xs text-muted-foreground">UilExclamationTriangle</p>
 <p className="text-2xl font-bold text-amber-500">{stats.warning}</p>
 </div>
 <UilExclamationTriangle size={32} className="text-amber-500" />
 </div>
 </CardContent>
 </Card>
 </motion.div>

 <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
 <Card>
 <CardContent className="p-4">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-xs text-muted-foreground">Critical</p>
 <p className="text-2xl font-bold text-red-500">{stats.critical}</p>
 </div>
 <UilExclamationTriangle size={32} className="text-red-500" />
 </div>
 </CardContent>
 </Card>
 </motion.div>

 <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
 <Card>
 <CardContent className="p-4">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-xs text-muted-foreground">Active Threats</p>
 <p className="text-2xl font-bold text-red-500">{stats.totalThreats}</p>
 </div>
 <UilShield size={32} className="text-red-500" />
 </div>
 </CardContent>
 </Card>
 </motion.div>
 </div>

 {/* Filters */}
 <Card>
 <CardContent className="p-4">
 <div className="flex gap-4 items-center flex-wrap">
 <div className="flex-1 min-w-[200px]">
 <div className="relative">
 <UilSearch size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
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
 variant={statusFilter ==="all" ?"default" :"outline"}
 size="sm"
 onClick={() => setStatusFilter("all")}
 >
 <UilFilter size={16} className="mr-2" />
 All
 </Button>
 <Button
 variant={statusFilter ==="online" ?"default" :"outline"}
 size="sm"
 onClick={() => setStatusFilter("online")}
 >
 Online
 </Button>
 <Button
 variant={statusFilter ==="offline" ?"default" :"outline"}
 size="sm"
 onClick={() => setStatusFilter("offline")}
 >
 Offline
 </Button>
 <Button
 variant={statusFilter ==="warning" ?"default" :"outline"}
 size="sm"
 onClick={() => setStatusFilter("warning")}
 >
 UilExclamationTriangle
 </Button>
 <Button
 variant={statusFilter ==="critical" ?"default" :"outline"}
 size="sm"
 onClick={() => setStatusFilter("critical")}
 >
 Critical
 </Button>
 </div>
 </div>
 </CardContent>
 </Card>

 {/* Host Server — This Machine */}
 <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
 <Card className="ring-1 ring-white/[0.06] bg-gradient-to-br from-card/80 to-emerald-500/5">
 <CardHeader className="pb-3">
 <div className="flex items-center justify-between">
 <CardTitle className="flex items-center gap-2 text-lg">
 <UilDesktopAlt size={20} className="text-emerald-500" />
 Host Server — {hostMetrics?.hostname || 'CrowByte OS'}
 <span className="text-xs text-emerald-500 ml-2">This Machine</span>
 </CardTitle>
 <div className="flex items-center gap-2">
 {hostLoading && !hostMetrics ? (
 <span className="flex items-center gap-1.5 text-xs">
 <UilSync size={12} className="text-amber-500 animate-spin" />
 <span className="text-amber-500">Loading...</span>
 </span>
 ) : (
 <span className="flex items-center gap-1.5 text-xs">
 <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
 <span className="text-emerald-500">Online</span>
 </span>
 )}
 </div>
 </div>
 <CardDescription className="font-mono text-xs">
 {hostMetrics?.os || 'Linux'} — {hostMetrics?.cpu?.model || 'Loading...'} — Uptime: {hostMetrics?.uptime || '--'}
 </CardDescription>
 </CardHeader>
 <CardContent>
 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
 {/* CPU */}
 <div className="space-y-2">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-1.5">
 <UilProcessor size={16} className="text-blue-500" />
 <span className="text-xs font-semibold text-muted-foreground uppercase">CPU</span>
 </div>
 <span className={`text-sm font-bold ${getHealthColor(hostMetrics?.cpu?.usage || 0)}`}>
 {hostMetrics?.cpu?.usage?.toFixed(0) || 0}%
 </span>
 </div>
 <div className="w-full bg-white/[0.05] rounded-full h-2">
 <div
 className={`h-2 rounded-full transition-all duration-500 ${getProgressColor(hostMetrics?.cpu?.usage || 0)}`}
 style={{ width: `${hostMetrics?.cpu?.usage || 0}%` }}
 />
 </div>
 <p className="text-[10px] text-muted-foreground">
 {hostMetrics?.cpu?.cores || 0} cores
 {hostMetrics?.cpu?.temperature ? ` — ${hostMetrics.cpu.temperature}°C` : ''}
 {hostMetrics?.loadAvg?.length ? ` — Load: ${hostMetrics.loadAvg.map(l => l.toFixed(2)).join(', ')}` : ''}
 </p>
 </div>

 {/* Memory */}
 <div className="space-y-2">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-1.5">
 <UilHeartRate size={16} className="text-violet-500" />
 <span className="text-xs font-semibold text-muted-foreground uppercase">Memory</span>
 </div>
 <span className={`text-sm font-bold ${getHealthColor(hostMetrics?.memory?.percent || 0)}`}>
 {hostMetrics?.memory?.percent || 0}%
 </span>
 </div>
 <div className="w-full bg-white/[0.05] rounded-full h-2">
 <div
 className={`h-2 rounded-full transition-all duration-500 ${getProgressColor(hostMetrics?.memory?.percent || 0)}`}
 style={{ width: `${hostMetrics?.memory?.percent || 0}%` }}
 />
 </div>
 <p className="text-[10px] text-muted-foreground">
 {hostMetrics?.memory?.used || '--'} / {hostMetrics?.memory?.total || '--'}
 </p>
 </div>

 {/* Disk */}
 <div className="space-y-2">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-1.5">
 <UilServer size={16} className="text-amber-500" />
 <span className="text-xs font-semibold text-muted-foreground uppercase">Disk</span>
 </div>
 <span className={`text-sm font-bold ${getHealthColor(hostMetrics?.disk?.percent || 0)}`}>
 {hostMetrics?.disk?.percent || 0}%
 </span>
 </div>
 <div className="w-full bg-white/[0.05] rounded-full h-2">
 <div
 className={`h-2 rounded-full transition-all duration-500 ${getProgressColor(hostMetrics?.disk?.percent || 0)}`}
 style={{ width: `${hostMetrics?.disk?.percent || 0}%` }}
 />
 </div>
 <p className="text-[10px] text-muted-foreground">
 {hostMetrics?.disk?.used || '--'} / {hostMetrics?.disk?.total || '--'}
 </p>
 </div>

 {/* Network + Docker */}
 <div className="space-y-2">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-1.5">
 <UilBolt size={16} className="text-cyan-500" />
 <span className="text-xs font-semibold text-muted-foreground uppercase">Network</span>
 </div>
 </div>
 <div className="space-y-1">
 <div className="flex items-center justify-between text-xs">
 <span className="text-emerald-500">RX</span>
 <span className="font-mono text-muted-foreground">{hostMetrics?.network?.rx_rate || '--'}</span>
 </div>
 <div className="flex items-center justify-between text-xs">
 <span className="text-blue-500">TX</span>
 <span className="font-mono text-muted-foreground">{hostMetrics?.network?.tx_rate || '--'}</span>
 </div>
 <div className="flex items-center justify-between text-xs pt-1 border-t border-white/[0.06]">
 <span className="text-muted-foreground">Docker</span>
 <span className="font-mono text-emerald-500">
 {hostMetrics?.docker?.running || 0}/{hostMetrics?.docker?.total || 0} containers
 </span>
 </div>
 </div>
 </div>
 </div>
 </CardContent>
 </Card>
 </motion.div>

 {/* VPS Infrastructure */}
 <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
 <Card className={`ring-1 ring-white/[0.06] ${vpsStatus?.ok ? '' : ''} bg-gradient-to-br from-card/80 to-primary/5`}>
 <CardHeader className="pb-3">
 <div className="flex items-center justify-between">
 <CardTitle className="flex items-center gap-2 text-lg">
 <UilDesktopAlt size={20} className="text-primary" />
 Infrastructure — OpenClaw VPS
 </CardTitle>
 <div className="flex items-center gap-2">
 {vpsLoading ? (
 <span className="flex items-center gap-1.5 text-xs">
 <UilSync size={12} className="text-amber-500 animate-spin" />
 <span className="text-amber-500">Checking...</span>
 </span>
 ) : vpsStatus?.ok ? (
 <span className="flex items-center gap-1.5 text-xs">
 <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
 <span className="text-emerald-500">Online — {vpsStatus.latencyMs}ms</span>
 </span>
 ) : (
 <span className="flex items-center gap-1.5 text-xs">
 <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
 <span className="text-red-500">Offline</span>
 </span>
 )}
 </div>
 </div>
 <CardDescription className="font-mono text-xs flex items-center justify-between">
 <span>{import.meta.env.VITE_OPENCLAW_HOSTNAME || 'VPS'} ({import.meta.env.VITE_VPS_IP || 'Not configured'}) — Hostinger VPS</span>
 <Button
 variant="outline"
 size="sm"
 className="h-6 text-[11px] border-transparent bg-transparent hover:bg-transparent text-emerald-500 ml-2"
 onClick={() => {
 setRemoteTarget(null);
 setVncDialogOpen(true);
 }}
 >
 <UilMonitor size={12} className="mr-1" />
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
 <span className="flex items-center gap-1.5 text-xs">
 <span className={`w-1.5 h-1.5 rounded-full ${svc.active ? 'bg-emerald-500' : 'bg-red-500'}`} />
 <span className={svc.active ? 'text-emerald-500' : 'text-red-500'}>{svc.active ? 'active' : 'inactive'}</span>
 </span>
 </div>
 ))
 ) : (
 <>
 {['nvidia-proxy', 'openclaw-gateway', 'openclaw-mcp', 'docker', 'traefik'].map(name => (
 <div key={name} className="flex items-center justify-between text-xs">
 <span className="font-mono">{name}</span>
 <span className="text-xs text-zinc-500">{vpsLoading ? '...' : 'unknown'}</span>
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
 <span key={agent} className="text-xs text-primary">{agent}</span>
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
 <span className="text-emerald-500">NVIDIA Free</span>
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
 <UilSync size={32} className="animate-spin text-primary" />
 </div>
 ) : filteredEndpoints.length === 0 ? (
 <motion.div
 initial={{ opacity: 0, scale: 0.95 }}
 animate={{ opacity: 1, scale: 1 }}
 className="flex flex-col items-center justify-center py-20"
 >
 <div className="p-6 rounded-full bg-muted/20 mb-6">
 <UilDesktopAlt size={64} className="text-muted-foreground" />
 </div>
 <h3 className="text-xl font-semibold mb-2">No Endpoints Registered</h3>
 <p className="text-muted-foreground text-center max-w-md mb-6">
 Start monitoring your infrastructure by adding endpoints to your fleet.
 Register this device to begin real-time monitoring.
 </p>
 <Button onClick={() => setAddDialogOpen(true)}>
 <UilPlus size={16} className="mr-2" />
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
 <Card className={`ring-1 ring-white/[0.06] hover:ring-white/[0.1] transition-all`}>
 <CardHeader className="pb-3">
 <div className="flex items-start justify-between">
 <div className="flex items-center gap-2">
 {getStatusIcon(endpoint.status)}
 <div>
 <CardTitle className="text-lg flex items-center gap-2">
 {endpoint.hostname}
 {endpoint.is_current_device && (
 <span className="text-xs text-zinc-400">This PC</span>
 )}
 </CardTitle>
 <CardDescription className="text-xs">{endpoint.ip_address}</CardDescription>
 </div>
 </div>
 <div className="flex items-center gap-2">
 <span className={`flex items-center gap-1.5 text-xs ${getStatusColor(endpoint.status)}`}>
 <span className="w-1.5 h-1.5 rounded-full bg-current" />
 {endpoint.status.toUpperCase()}
 </span>
 <DropdownMenu>
 <DropdownMenuTrigger asChild>
 <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
 <UilEllipsisV size={16} />
 </Button>
 </DropdownMenuTrigger>
 <DropdownMenuContent align="end">
 <DropdownMenuItem
 onClick={() => handleRemoteControl(endpoint)}
 disabled={endpoint.status === 'offline'}
 >
 <UilMonitor size={16} className="mr-2 text-emerald-500" />
 Remote Control
 </DropdownMenuItem>
 <DropdownMenuItem
 onClick={() => handleRemoteControl({ ...endpoint } as Endpoint)}
 disabled={endpoint.status === 'offline'}
 >
 <UilEye size={16} className="mr-2 text-blue-500" />
 View Only
 </DropdownMenuItem>
 <DropdownMenuItem
 className="text-destructive"
 onClick={() => handleDeleteEndpoint(endpoint.id, endpoint.hostname)}
 >
 <UilTrashAlt size={16} className="mr-2" />
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
 <UilMapPin size={12} />
 {endpoint.location}
 </div>
 )}
 </div>

 {/* Resource Usage */}
 <div className="space-y-2">
 <div className="flex items-center justify-between text-xs">
 <div className="flex items-center gap-2">
 <UilProcessor size={12} />
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
 <UilHeartRate size={12} />
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
 <UilServer size={12} />
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
 <UilBolt size={12} className="text-violet-500" />
 <span>GPU</span>
 </div>
 <span className="font-mono text-violet-500">{endpoint.gpu.utilization}%</span>
 </div>
 <div className="h-1 bg-muted rounded-full overflow-hidden">
 <div
 className="h-full bg-violet-500 transition-all"
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
 <div className="flex items-center justify-between pt-2 border-t border-white/[0.04]">
 <div className="flex items-center gap-2 text-xs">
 <UilClock size={12} className="text-muted-foreground" />
 <span className="text-muted-foreground">
 {formatLastSeen(endpoint.last_seen_at)}
 </span>
 </div>
 {endpoint.threats_detected > 0 && (
 <span className="text-xs text-red-500">
 {endpoint.threats_detected} threat{endpoint.threats_detected > 1 ? 's' : ''}
 </span>
 )}
 </div>

 {/* Remote Control Button */}
 <Button
 variant="outline"
 size="sm"
 className="w-full mt-2 bg-transparent hover:bg-transparent ring-1 ring-emerald-500/10 text-emerald-500 text-xs"
 onClick={() => handleRemoteControl(endpoint)}
 disabled={endpoint.status === 'offline'}
 >
 <UilMonitor size={14} className="mr-2" />
 Remote Control
 <UilLock size={12} className="ml-auto text-emerald-500/50" />
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
