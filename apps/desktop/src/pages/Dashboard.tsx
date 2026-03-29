import { useState, useEffect } from"react";
import { useNavigate } from"react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from"@/components/ui/card";
import { ScrollArea } from"@/components/ui/scroll-area";
import { Separator } from"@/components/ui/separator";
import { Button } from"@/components/ui/button";
import { Warning, Pulse, Cpu, HardDrives, WifiHigh, Clock, Lightning, Broadcast, Eye, ArrowSquareOut, ArrowsClockwise, Globe, ArrowRight, Monitor, Terminal, ChatDots, Sword, Database, Robot } from "@phosphor-icons/react";
import { motion } from"framer-motion";
import CommandCenterHeader from"@/components/CommandCenterHeader";
import { FeedPanel } from"@/components/FeedPanel";
import { useToast } from"@/hooks/use-toast";
import { ipStatusService, type IPStatusData } from"@/services/ip-status";
import { systemMonitor, SystemMetrics } from"@/services/systemMonitor";
import { endpointService, Endpoint } from"@/services/endpointService";
import { openClaw } from"@/services/openclaw";

interface CVE {
 id: string;
 description: string;
 severity: string;
 publishedDate: string;
 cvssScore: number;
}

interface NewsItem {
 title: string;
 source: string;
 time: string;
 category: string;
 url: string;
}

interface SystemHealth {
 cpu: number;
 memory: number;
 disk: number;
 network: number;
}

interface AgentActivity {
 agent: string;
 icon: string;
 lastRun: string;
 status: 'active' | 'idle' | 'error';
 metric: string;
 metricLabel: string;
}

const Dashboard = () => {
 const { toast } = useToast();
 const navigate = useNavigate();
 const [cveAlerts, setCveAlerts] = useState<CVE[]>([]);
 const [loadingCVEs, setLoadingCVEs] = useState(false);
 const [news, setNews] = useState<NewsItem[]>([]);
 const [loadingNews, setLoadingNews] = useState(false);
 const [systemHealth, setSystemHealth] = useState<SystemHealth>({
 cpu: 0,
 memory: 0,
 disk: 0,
 network: 0,
 });
 const [dailyInsight, setDailyInsight] = useState("");

 // IP Status state
 const [ipStatus, setIpStatus] = useState<IPStatusData | null>(null);
 const [loadingIPStatus, setLoadingIPStatus] = useState(true);

 // Real system metrics state
 const [realMetrics, setRealMetrics] = useState<SystemMetrics | null>(null);
 const [currentEndpoint, setCurrentEndpoint] = useState<Endpoint | null>(null);
 const [hasEndpoint, setHasEndpoint] = useState<boolean | null>(null);

 // OpenClaw status
 const [openClawStatus, setOpenClawStatus] = useState<{ ok: boolean; latencyMs: number } | null>(null);
 const [supabaseOk, setSupabaseOk] = useState<boolean | null>(null);

 // Agent activity
 const [agentActivity, setAgentActivity] = useState<AgentActivity[]>([]);

 // VPS system metrics
 const [vpsMetrics, setVpsMetrics] = useState<{
 cpu: number; memory: number; memoryUsed: number; memoryTotal: number;
 disk: number; diskUsed: string; diskTotal: string; uptime: string; hostname: string; cores: number;
 } | null>(null);

 // Fetch IP status on mount and refresh every 5 minutes
 useEffect(() => {
 const fetchIPStatus = async () => {
 try {
 setLoadingIPStatus(true);
 const status = await ipStatusService.getIPStatus();
 setIpStatus(status);

 // Show error toast if there was a problem
 if (status.error) {
 console.warn('⚠️ IP status has error:', status.error);
 toast({
 title:"IP Fetch Issue",
 description: status.ip === 'Unavailable'
 ?"Unable to fetch your IP address. Network may be offline."
 :"Partial IP data retrieved. Some features may be unavailable.",
 variant: status.ip === 'Unavailable' ?"destructive" :"default",
 });
 }
 } catch (error) {
 // This should rarely happen due to error boundaries in ipStatusService
 console.error('❌ Unexpected error in IP status fetch:', error);
 // Set a minimal status to show something
 setIpStatus({
 ip: 'Unavailable',
 isVPN: false,
 isTor: false,
 isProxy: false,
 connectionType: 'unknown',
 lastChecked: new Date(),
 error: error instanceof Error ? error.message : 'Unexpected error',
 });
 toast({
 title:"Network Error",
 description:"Failed to check network status. Please check your connection.",
 variant:"destructive",
 });
 } finally {
 setLoadingIPStatus(false);
 }
 };

 fetchIPStatus();
 const interval = setInterval(fetchIPStatus, 5 * 60 * 1000); // Refresh every 5 minutes
 return () => clearInterval(interval);
 }, []);

 // Manual refresh function
 const refreshIPStatus = async () => {
 try {
 setLoadingIPStatus(true);
 console.log('🔄 Manually refreshing IP status...');
 const status = await ipStatusService.getIPStatus(true); // Force refresh
 console.log('✅ IP status refreshed:', status);
 setIpStatus(status);
 toast({
 title:"IP Status Refreshed",
 description: `Your IP: ${status.ip}`,
 });
 } catch (error) {
 console.error('❌ Failed to refresh IP status:', error);
 toast({
 title:"Error",
 description:"Failed to fetch IP address. Check console for details.",
 variant:"destructive",
 });
 } finally {
 setLoadingIPStatus(false);
 }
 };

 // Fetch CVE alerts from Supabase
 const fetchCVEs = async () => {
 try {
 setLoadingCVEs(true);

 // Fetch CVEs silently

 const { supabase } = await import('@/lib/supabase');

 // Get top 5 most critical recent CVEs
 const { data, error } = await supabase
 .from('cves')
 .select('*')
 .order('cvss_score', { ascending: false })
 .order('published_date', { ascending: false })
 .limit(5);

 if (error || !data || data.length === 0) {
 if (error) console.warn('⚠️ Supabase CVE error:', error);
 setCveAlerts([]);
 } else {
 // Successfully fetched from Supabase
 // CVEs loaded successfully

 const cves: CVE[] = data.map((item: any) => ({
 id: item.cve_id || item.id,
 description: item.description ||"No description available",
 severity: item.severity ||"UNKNOWN",
 publishedDate: item.published_date,
 cvssScore: item.cvss_score || 0,
 }));

 setCveAlerts(cves);
 }
 } catch (error) {
 console.error("❌ Error fetching CVEs:", error);
 setCveAlerts([]);
 } finally {
 setLoadingCVEs(false);
 }
 };

 // Manual refresh function for CVEs
 const refreshCVEs = async () => {
 await fetchCVEs();
 toast({
 title:"CVE Alerts Refreshed",
 description: `Updated with latest ${new Date().getFullYear()} vulnerabilities`,
 });
 };

 useEffect(() => {
 fetchCVEs();
 }, []);

 // Fetch threat intel from Supabase intel_reports (ingested by Sentinel agent every 15 min)
 const fetchNews = async () => {
 try {
 setLoadingNews(true);
 const { supabase } = await import('@/lib/supabase');
 const { data, error } = await supabase
 .from('intel_reports')
 .select('title, source_url, source, category, severity, processed_at, created_at')
 .order('created_at', { ascending: false })
 .limit(20);

 if (error || !data || data.length === 0) throw new Error('No intel');

 const items: NewsItem[] = data.map((item: any) => {
 const pubDate = item.processed_at ? new Date(item.processed_at) : new Date(item.created_at);
 const hoursAgo = Math.floor((Date.now() - pubDate.getTime()) / 3600000);
 const timeText = hoursAgo < 1 ? 'Just now' : hoursAgo < 24 ? `${hoursAgo}h ago` : `${Math.floor(hoursAgo / 24)}d ago`;
 const categoryLabel = (item.category || 'other').replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
 return {
 title: item.title,
 source: item.source || 'Unknown',
 time: timeText,
 category: item.severity === 'critical' ? `CRITICAL — ${categoryLabel}` : categoryLabel,
 url: item.source_url || '#',
 };
 });
 setNews(items);
 } catch {
 setNews([
 { title:"Waiting for Sentinel agent to ingest feeds...", source:"CrowByte", time:"now", category:"System", url:"#" },
 ]);
 } finally {
 setLoadingNews(false);
 }
 };

 // Manual refresh function for news
 const refreshNews = async () => {
 await fetchNews();
 toast({
 title:"Threat Intelligence Refreshed",
 description:"Updated with latest security news from Supabase",
 });
 };

 useEffect(() => {
 fetchNews();
 }, []);

 // Fetch agent activity stats from Supabase
 const fetchAgentActivity = async () => {
 try {
 const { supabase } = await import('@/lib/supabase');
 const now = new Date();
 const oneDayAgo = new Date(now.getTime() - 24 * 3600000).toISOString();

 // Parallel queries for agent metrics
 const [intelRes, alertsRes, reportsRes, cveRes] = await Promise.all([
 supabase.from('intel_reports').select('created_at', { count: 'exact', head: false })
 .gte('created_at', oneDayAgo).order('created_at', { ascending: false }).limit(1),
 supabase.from('alerts').select('ingested_at', { count: 'exact', head: false })
 .gte('ingested_at', oneDayAgo).order('ingested_at', { ascending: false }).limit(1),
 supabase.from('reports').select('created_at', { count: 'exact', head: false })
 .gte('created_at', oneDayAgo).order('created_at', { ascending: false }).limit(1),
 supabase.from('cves').select('created_at', { count: 'exact', head: false })
 .gte('created_at', oneDayAgo).order('created_at', { ascending: false }).limit(1),
 ]);

 const timeAgo = (iso: string | null) => {
 if (!iso) return 'Never';
 const ms = now.getTime() - new Date(iso).getTime();
 const mins = Math.floor(ms / 60000);
 if (mins < 1) return 'Just now';
 if (mins < 60) return `${mins}m ago`;
 const hrs = Math.floor(mins / 60);
 if (hrs < 24) return `${hrs}h ago`;
 return `${Math.floor(hrs / 24)}d ago`;
 };

 setAgentActivity([
 {
 agent: 'Sentinel',
 icon: '🛰️',
 lastRun: timeAgo(intelRes.data?.[0]?.created_at || null),
 status: (intelRes.count || 0) > 0 ? 'active' : 'idle',
 metric: String(intelRes.count || 0),
 metricLabel: 'reports/24h',
 },
 {
 agent: 'Alerter',
 icon: '🚨',
 lastRun: timeAgo(alertsRes.data?.[0]?.ingested_at || null),
 status: (alertsRes.count || 0) > 0 ? 'active' : 'idle',
 metric: String(alertsRes.count || 0),
 metricLabel: 'alerts/24h',
 },
 {
 agent: 'Classifier',
 icon: '🧬',
 lastRun: timeAgo(cveRes.data?.[0]?.created_at || null),
 status: (cveRes.count || 0) > 0 ? 'active' : 'idle',
 metric: String(cveRes.count || 0),
 metricLabel: 'CVEs/24h',
 },
 {
 agent: 'Reporter',
 icon: '📊',
 lastRun: timeAgo(reportsRes.data?.[0]?.created_at || null),
 status: (reportsRes.count || 0) > 0 ? 'active' : 'idle',
 metric: String(reportsRes.count || 0),
 metricLabel: 'reports/24h',
 },
 ]);
 } catch (err) {
 console.error('Agent activity fetch failed:', err);
 }
 };

 useEffect(() => {
 fetchAgentActivity();
 const interval = setInterval(fetchAgentActivity, 120000); // refresh every 2 min
 return () => clearInterval(interval);
 }, []);

 // Real system health monitoring from registered endpoint
 useEffect(() => {
 const fetchSystemMetrics = async () => {
 try {
 // First check if we have a registered endpoint
 const endpoint = await endpointService.findCurrentDevice();
 setCurrentEndpoint(endpoint);
 setHasEndpoint(endpoint !== null);

 if (endpoint) {
 // Use endpoint data from database
 setSystemHealth({
 cpu: Math.round(endpoint.cpu_usage),
 memory: Math.round(endpoint.memory_usage),
 disk: Math.round(endpoint.disk_usage),
 network: 0, // Network speed not tracked
 });
 }

 // Also get real-time metrics directly
 const metrics = await systemMonitor.getMetrics();
 setRealMetrics(metrics);

 // Update system health with real metrics
 setSystemHealth({
 cpu: Math.round(metrics.cpuUsage),
 memory: Math.round(metrics.memoryUsage),
 disk: Math.round(metrics.diskUsage),
 network: 0,
 });
 } catch (error) {
 console.error('Failed to fetch system metrics:', error);
 // Fallback to simulated values if metrics fail
 setHasEndpoint(false);
 }
 };

 fetchSystemMetrics();
 const interval = setInterval(fetchSystemMetrics, 5000); // Update every 5 seconds
 return () => clearInterval(interval);
 }, []);

 // Set default daily insight
 useEffect(() => {
 setDailyInsight("CrowByte AI connected to OpenClaw agent swarm. 9 agents ready. NVIDIA free inference active.");
 }, []);

 // OpenClaw + Supabase health checks
 useEffect(() => {
 const checkHealth = async () => {
 // Check VPS health — try renderer fetch first, fallback to Electron curl
 let vpsOk = false;
 let vpsLatency = 0;
 try {
 const result = await openClaw.healthCheck();
 vpsOk = result.ok;
 vpsLatency = result.latencyMs;
 } catch { /* renderer fetch failed */ }

 const openClawHost = import.meta.env.VITE_OPENCLAW_HOSTNAME;
 if (!vpsOk && openClawHost && openClawHost !== 'localhost' && openClawHost !== '127.0.0.1' && window.electronAPI?.executeCommand) {
 try {
 const start = Date.now();
 const output = await window.electronAPI.executeCommand(
 `curl -sk -o /dev/null -w %{http_code} https://${openClawHost}/nvidia/v1/models --connect-timeout 5`
 );
 vpsLatency = Date.now() - start;
 // Output may contain "Exit code: N\n..." prefix if non-zero exit, or just "200"
 vpsOk = output.includes('200');
 } catch { /* curl failed too */ }
 }
 setOpenClawStatus({ ok: vpsOk, latencyMs: vpsLatency });
 try {
 const { supabase } = await import('@/lib/supabase');
 const { error } = await supabase.from('conversations').select('id', { count: 'exact', head: true });
 setSupabaseOk(!error);
 } catch {
 setSupabaseOk(false);
 }
 };
 checkHealth();
 const interval = setInterval(checkHealth, 30000);
 return () => clearInterval(interval);
 }, []);

 // Supabase Realtime — live updates for endpoints, CVEs, conversations
 useEffect(() => {
 const channels: any[] = [];

 const parseVpsEndpoint = (row: any) => {
 if (!row) return;
 const memTotalGb = row.total_memory_gb || 16;
 const memPct = Math.round(row.memory_usage || 0);
 const memUsedMb = Math.round(memTotalGb * (memPct / 100) * 1024);
 setVpsMetrics({
 cpu: Math.round(row.cpu_usage || 0),
 memory: memPct,
 memoryUsed: memUsedMb,
 memoryTotal: Math.round(memTotalGb * 1024),
 disk: Math.round(row.disk_usage || 0),
 diskUsed: `${Math.round((row.total_disk_gb || 193) * (row.disk_usage || 0) / 100)}G`,
 diskTotal: `${Math.round(row.total_disk_gb || 193)}G`,
 uptime: row.last_seen_at ? 'Live' : '--',
 hostname: row.hostname || import.meta.env.VITE_VPS_HOSTNAME_ID || 'vps',
 cores: row.cpu_cores || 4,
 });
 };

 const setupRealtime = async () => {
 try {
 const { supabase } = await import('@/lib/supabase');

 // Initial VPS fetch
 const { data: vpsData } = await supabase
 .from('endpoints')
 .select('*')
 .eq('hostname', import.meta.env.VITE_VPS_HOSTNAME_ID || 'vps')
 .maybeSingle();
 if (vpsData) parseVpsEndpoint(vpsData);

 // Channel 1: Endpoints (VPS metrics + Kali device updates)
 const endpointsChannel = supabase
 .channel('dashboard-endpoints')
 .on('postgres_changes', {
 event: '*',
 schema: 'public',
 table: 'endpoints',
 }, (payload: any) => {
 const row = payload.new;
 if (!row) return;
 // VPS endpoint
 if (row.hostname === (import.meta.env.VITE_VPS_HOSTNAME_ID || 'vps')) {
 parseVpsEndpoint(row);
 }
 // Kali endpoint — update system health
 if (row.is_current_device) {
 setSystemHealth({
 cpu: Math.round(row.cpu_usage || 0),
 memory: Math.round(row.memory_usage || 0),
 disk: Math.round(row.disk_usage || 0),
 network: 0,
 });
 }
 })
 .subscribe((status: string) => {
 void 0; // [Realtime] endpoints:', status);
 });
 channels.push(endpointsChannel);

 // Channel 2: CVEs — auto-refresh when new CVEs are inserted
 const cvesChannel = supabase
 .channel('dashboard-cves')
 .on('postgres_changes', {
 event: 'INSERT',
 schema: 'public',
 table: 'cves',
 }, () => {
 void 0; // [Realtime] New CVE detected, refreshing...');
 fetchCVEs();
 })
 .subscribe((status: string) => {
 void 0; // [Realtime] cves:', status);
 });
 channels.push(cvesChannel);

 // Channel 3: News feed — auto-refresh when new articles are inserted
 const newsChannel = supabase
 .channel('dashboard-news')
 .on('postgres_changes', {
 event: 'INSERT',
 schema: 'public',
 table: 'knowledge_base',
 }, () => {
 void 0; // [Realtime] New news article, refreshing feed...');
 fetchNews();
 })
 .subscribe((status: string) => {
 void 0; // [Realtime] news:', status);
 });
 channels.push(newsChannel);

 // Channel 4: Conversations — activity tracking
 const convoChannel = supabase
 .channel('dashboard-conversations')
 .on('postgres_changes', {
 event: 'INSERT',
 schema: 'public',
 table: 'conversations',
 }, () => {
 void 0; // [Realtime] New conversation');
 })
 .on('postgres_changes', {
 event: 'INSERT',
 schema: 'public',
 table: 'messages',
 }, () => {
 void 0; // [Realtime] New message');
 })
 .subscribe((status: string) => {
 void 0; // [Realtime] conversations:', status);
 });
 channels.push(convoChannel);

 } catch (e) {
 console.error('Realtime setup failed:', e);
 }
 };

 setupRealtime();

 // Minimal polling fallback — only VPS metrics every 30s (realtime handles the rest)
 const fallbackInterval = setInterval(async () => {
 try {
 const { supabase } = await import('@/lib/supabase');
 const { data } = await supabase
 .from('endpoints')
 .select('*')
 .eq('hostname', import.meta.env.VITE_VPS_HOSTNAME_ID || 'vps')
 .maybeSingle();
 if (data) parseVpsEndpoint(data);
 } catch {}
 }, 30000);

 return () => {
 clearInterval(fallbackInterval);
 import('@/lib/supabase').then(({ supabase }) => {
 channels.forEach(ch => supabase.removeChannel(ch));
 });
 };
 }, []);

 const getSeverityColor = (severity: string) => {
 switch (severity.toUpperCase()) {
 case"CRITICAL":
 return"bg-transparent text-red-500";
 case"HIGH":
 return"bg-transparent text-orange-500";
 case"MEDIUM":
 return"bg-transparent text-amber-500";
 case"LOW":
 return"bg-transparent text-emerald-500";
 default:
 return"bg-zinc-600/15 text-zinc-500";
 }
 };

 const getHealthColor = (value: number, type: string) => {
 if (type ==="cpu" || type ==="memory") {
 if (value > 80) return"text-red-500";
 if (value > 60) return"text-amber-500";
 return"text-emerald-500";
 }
 return"text-primary";
 };


 return (
 <div className="space-y-6 p-6">
 <CommandCenterHeader news={news} />

 {/* Network Status Card - Compact */}
 <motion.div
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ duration: 0.4, delay: 0.1 }}
 >
 <Card className="bg-card/50 backdrop-blur">
 <CardContent className="p-3">
 <div className="flex items-center justify-between gap-2">
 {/* Title */}
 <div className="flex items-center gap-2 min-w-[120px]">
 <WifiHigh size={16} weight="bold" className="text-primary" />
 <span className="text-xs font-semibold text-primary">Network Status</span>
 </div>

 {loadingIPStatus && !ipStatus ? (
 <div className="flex items-center gap-2 text-xs text-muted-foreground">
 <ArrowsClockwise size={12} weight="bold" className="animate-spin" />
 <span>Loading...</span>
 </div>
 ) : ipStatus ? (
 <>
 {/* Compact Info Row */}
 <div className="flex items-center gap-2 flex-1 flex-wrap">
 {/* Protection Status */}
 <span className="flex items-center gap-1.5 text-xs">
 <span className={`w-1.5 h-1.5 rounded-full ${
 ipStatus.error || ipStatus.ip === 'Unavailable'
 ? 'bg-red-500'
 : ipStatus.isVPN || ipStatus.isTor
 ? 'bg-emerald-500'
 : 'bg-blue-500'
 }`} />
 <span className={
 ipStatus.error || ipStatus.ip === 'Unavailable'
 ? 'text-red-500'
 : ipStatus.isVPN || ipStatus.isTor
 ? 'text-emerald-500'
 : 'text-blue-500'
 }>
 {ipStatus.error || ipStatus.ip === 'Unavailable' ? 'Offline' : ipStatus.isVPN || ipStatus.isTor ? 'Protected' : 'Connected'}
 </span>
 </span>

 <Separator orientation="vertical" className="h-4" />

 {/* IP Address */}
 {ipStatus.error || ipStatus.ip === 'Unavailable' ? (
 <span className="flex items-center gap-1 text-xs text-red-500 font-mono">
 <Warning size={12} weight="bold" />
 {ipStatus.ip}
 </span>
 ) : (
 <>
 <span className="text-xs text-muted-foreground">
 {ipStatus.isVPN ? 'VPN' : ipStatus.isTor ? 'Tor' : 'IP'}:
 </span>
 <span className="text-xs font-mono font-semibold text-primary">{ipStatus.ip}</span>
 {ipStatus.country && (
 <span className="text-xs text-muted-foreground">({ipStatus.country})</span>
 )}
 </>
 )}

 <Separator orientation="vertical" className="h-4" />

 {/* Connection Type */}
 {ipStatus.networkConnection && (
 <>
 <span className="text-xs text-blue-500">
 {ipStatus.networkConnection.type === 'wifi' && 'WiFi'}
 {ipStatus.networkConnection.type === 'ethernet' && 'Ethernet'}
 {ipStatus.networkConnection.type === 'cellular' && 'Cellular'}
 {ipStatus.networkConnection.type === 'unknown' && 'Unknown'}
 </span>
 <Separator orientation="vertical" className="h-4" />
 </>
 )}

 {/* VPN Status */}
 <span className="flex items-center gap-1.5 text-xs">
 <span className={`w-1.5 h-1.5 rounded-full ${ipStatus.isVPN ? 'bg-emerald-500' : 'bg-zinc-600'}`} />
 <span className={ipStatus.isVPN ? 'text-emerald-500' : 'text-zinc-500'}>
 {ipStatus.isVPN ? 'VPN' : 'No VPN'}
 </span>
 </span>

 {/* Tor Status */}
 <span className="flex items-center gap-1.5 text-xs">
 <span className={`w-1.5 h-1.5 rounded-full ${ipStatus.isTor ? 'bg-violet-500' : 'bg-zinc-600'}`} />
 <span className={ipStatus.isTor ? 'text-violet-500' : 'text-zinc-500'}>
 {ipStatus.isTor ? 'Tor' : 'No Tor'}
 </span>
 </span>

 {/* VPN Provider */}
 {ipStatus.vpnProvider && (
 <>
 <Separator orientation="vertical" className="h-4" />
 <span className="text-xs text-emerald-500 font-semibold">🔒 {ipStatus.vpnProvider}</span>
 </>
 )}

 {/* Local/WiFi IP */}
 {ipStatus.localIP && (
 <>
 <Separator orientation="vertical" className="h-4" />
 <span className="text-xs text-muted-foreground">LAN:</span>
 <span className="text-xs font-mono text-amber-500">{ipStatus.localIP}</span>
 </>
 )}

 {/* ISP */}
 {ipStatus.isp && !ipStatus.isVPN && !ipStatus.isTor && (
 <>
 <Separator orientation="vertical" className="h-4" />
 <span className="text-xs text-muted-foreground">ISP: {ipStatus.isp}</span>
 </>
 )}

 {/* DNS Servers */}
 {ipStatus.dnsInfo && ipStatus.dnsInfo.servers.length > 0 && (
 <>
 <Separator orientation="vertical" className="h-4" />
 <span className="text-xs text-cyan-500">
 DNS: {ipStatus.dnsInfo.primaryDNS}
 {ipStatus.dnsInfo.secondaryDNS && `, ${ipStatus.dnsInfo.secondaryDNS}`}
 </span>
 </>
 )}

 {/* DNS Leak Warning */}
 {ipStatus.dnsInfo?.isDNSLeak && (
 <>
 <Separator orientation="vertical" className="h-4" />
 <span className="flex items-center gap-1 text-xs text-red-500 animate-pulse">
 <Warning size={12} weight="bold" />
 DNS LEAK!
 </span>
 </>
 )}
 </div>
 </>
 ) : (
 <div className="flex items-center gap-2">
 <span className="flex items-center gap-1 text-xs text-red-500">
 <Globe size={12} weight="bold" />
 Unavailable
 </span>
 <Button
 variant="ghost"
 size="sm"
 onClick={refreshIPStatus}
 className="h-6 px-2 text-xs"
 >
 <ArrowsClockwise size={12} weight="bold" />
 </Button>
 </div>
 )}

 {/* Subsystem Status (compact) */}
 <div className="flex items-center gap-3 ml-auto">
 <span className="flex items-center gap-1.5 text-xs">
 <span className={`w-1.5 h-1.5 rounded-full ${openClawStatus?.ok ? 'bg-emerald-500' : 'bg-red-500'}`} />
 <span className={openClawStatus?.ok ? 'text-emerald-500' : 'text-red-500'}>
 VPS {openClawStatus?.ok ? `${openClawStatus.latencyMs}ms` : 'Off'}
 </span>
 </span>
 <span className="flex items-center gap-1.5 text-xs">
 <span className={`w-1.5 h-1.5 rounded-full ${supabaseOk ? 'bg-emerald-500' : 'bg-red-500'}`} />
 <span className={supabaseOk ? 'text-emerald-500' : 'text-red-500'}>DB</span>
 </span>
 </div>

 {/* Refresh Button */}
 <Button
 variant="ghost"
 size="sm"
 onClick={refreshIPStatus}
 disabled={loadingIPStatus}
 className="h-6 px-2"
 >
 <ArrowsClockwise size={12} weight="bold" className={`${loadingIPStatus ? 'animate-spin' : ''}`} />
 </Button>
 </div>
 </CardContent>
 </Card>
 </motion.div>

 {/* Quick Actions Row */}
 <div className="flex items-center gap-6">
 <motion.div
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ duration: 0.3, delay: 0.2 }}
 >
 <div
 className="flex items-center gap-2.5 cursor-pointer group"
 onClick={() => navigate('/chat')}
 >
 <ChatDots size={18} weight="fill" className="text-violet-500" />
 <span className="text-sm text-zinc-400 group-hover:text-white transition-colors">CrowByte AI</span>
 </div>
 </motion.div>

 <motion.div
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ duration: 0.3, delay: 0.25 }}
 >
 <div
 className="flex items-center gap-2.5 cursor-pointer group"
 onClick={() => navigate('/terminal')}
 >
 <Terminal size={18} weight="fill" className="text-emerald-500" />
 <span className="text-sm text-zinc-400 group-hover:text-white transition-colors">Terminal</span>
 </div>
 </motion.div>

 <motion.div
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ duration: 0.3, delay: 0.3 }}
 >
 <div
 className="flex items-center gap-2.5 cursor-pointer group"
 onClick={() => navigate('/redteam')}
 >
 <Sword size={18} weight="fill" className="text-red-500" />
 <span className="text-sm text-zinc-400 group-hover:text-white transition-colors">Red Team</span>
 </div>
 </motion.div>

 <motion.div
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ duration: 0.3, delay: 0.35 }}
 >
 <div
 className="flex items-center gap-2.5 cursor-pointer group"
 onClick={() => navigate('/network-scanner')}
 >
 <WifiHigh size={18} weight="fill" className="text-blue-500" />
 <span className="text-sm text-zinc-400 group-hover:text-white transition-colors">Network Scan</span>
 </div>
 </motion.div>
 </div>

 {/* System Health — Kali + OpenClaw side by side */}
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
 {/* Kali System Health */}
 <motion.div
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ duration: 0.3, delay: 0.2 }}
 >
 <Card className="bg-card/50 backdrop-blur h-full">
 <CardHeader className="pb-3">
 <div className="flex items-center justify-between">
 <CardTitle className="flex items-center gap-2 text-sm">
 <Monitor size={16} weight="bold" className="text-primary" />
 Kali System
 {realMetrics && (
 <span className="text-[10px] text-zinc-500 ml-1">{realMetrics.hostname}</span>
 )}
 </CardTitle>
 <Button
 variant="ghost"
 size="sm"
 onClick={() => navigate('/fleet')}
 className="text-xs h-7 px-2"
 >
 View Fleet
 <ArrowRight size={12} weight="bold" className="ml-1" />
 </Button>
 </div>
 {realMetrics && (
 <CardDescription className="text-[10px]">
 {realMetrics.platform} {realMetrics.osVersion} | {realMetrics.cpuModel} ({realMetrics.cpuCores} cores)
 </CardDescription>
 )}
 </CardHeader>
 <CardContent>
 <div className="grid grid-cols-2 gap-4">
 {/* CPU */}
 <div className="space-y-1.5">
 <div className="flex items-center justify-between text-xs">
 <div className="flex items-center gap-1.5">
 <Cpu size={14} weight="bold" className="text-primary" />
 <span>CPU</span>
 </div>
 <span className="font-bold" style={{ color: getHealthColor(systemHealth.cpu,"cpu") }}>
 {systemHealth.cpu}%
 </span>
 </div>
 <div className="h-1.5 bg-muted rounded-full overflow-hidden">
 <div className="h-full bg-primary transition-all duration-500" style={{ width: `${systemHealth.cpu}%` }} />
 </div>
 </div>
 {/* Memory */}
 <div className="space-y-1.5">
 <div className="flex items-center justify-between text-xs">
 <div className="flex items-center gap-1.5">
 <Pulse size={14} weight="bold" className="text-blue-500" />
 <span>Memory</span>
 </div>
 <span className="font-bold" style={{ color: getHealthColor(systemHealth.memory,"memory") }}>
 {systemHealth.memory}%
 </span>
 </div>
 <div className="h-1.5 bg-muted rounded-full overflow-hidden">
 <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${systemHealth.memory}%` }} />
 </div>
 {realMetrics && (
 <p className="text-[10px] text-muted-foreground">{realMetrics.memoryUsed.toFixed(1)} / {realMetrics.memoryTotal.toFixed(1)} GB</p>
 )}
 </div>
 {/* Disk */}
 <div className="space-y-1.5">
 <div className="flex items-center justify-between text-xs">
 <div className="flex items-center gap-1.5">
 <HardDrives size={14} weight="bold" className="text-amber-500" />
 <span>Disk</span>
 </div>
 <span className="font-bold text-amber-500">{systemHealth.disk}%</span>
 </div>
 <div className="h-1.5 bg-muted rounded-full overflow-hidden">
 <div className="h-full bg-amber-500 transition-all duration-500" style={{ width: `${systemHealth.disk}%` }} />
 </div>
 {realMetrics && realMetrics.diskTotal > 0 && (
 <p className="text-[10px] text-muted-foreground">{realMetrics.diskUsed.toFixed(0)} / {realMetrics.diskTotal.toFixed(0)} GB</p>
 )}
 </div>
 {/* Uptime */}
 <div className="space-y-1.5">
 <div className="flex items-center gap-1.5 text-xs">
 <Clock size={14} weight="bold" className="text-emerald-500" />
 <span>Uptime</span>
 </div>
 {realMetrics && (
 <div className="text-lg font-bold text-emerald-500">
 {Math.floor(realMetrics.uptime / 3600)}h {Math.floor((realMetrics.uptime % 3600) / 60)}m
 </div>
 )}
 {realMetrics && (
 <p className="text-[10px] text-muted-foreground">IP: {realMetrics.ipAddress}</p>
 )}
 </div>
 </div>
 {/* GPU */}
 {realMetrics?.gpu && (
 <div className="mt-4 pt-3 border-t border-white/[0.04]">
 <div className="grid grid-cols-2 gap-4">
 <div className="space-y-1.5">
 <div className="flex items-center justify-between text-xs">
 <div className="flex items-center gap-1.5">
 <Lightning size={14} weight="bold" className="text-violet-500" />
 <span>GPU</span>
 </div>
 <span className="font-bold" style={{ color: realMetrics.gpu.utilization > 80 ? '#f87171' : realMetrics.gpu.utilization > 60 ? '#facc15' : '#a78bfa' }}>
 {realMetrics.gpu.utilization}%
 </span>
 </div>
 <div className="h-1.5 bg-muted rounded-full overflow-hidden">
 <div className="h-full bg-violet-500 transition-all duration-500" style={{ width: `${realMetrics.gpu.utilization}%` }} />
 </div>
 <p className="text-[10px] text-muted-foreground">{realMetrics.gpu.name}</p>
 </div>
 <div className="space-y-1.5">
 <div className="flex items-center justify-between text-xs">
 <div className="flex items-center gap-1.5">
 <Pulse size={14} weight="bold" className="text-violet-500" />
 <span>VRAM</span>
 </div>
 <span className="font-bold text-violet-500">
 {Math.round(realMetrics.gpu.memoryUsed / realMetrics.gpu.memoryTotal * 100)}%
 </span>
 </div>
 <div className="h-1.5 bg-muted rounded-full overflow-hidden">
 <div className="h-full bg-violet-500/70 transition-all duration-500" style={{ width: `${Math.round(realMetrics.gpu.memoryUsed / realMetrics.gpu.memoryTotal * 100)}%` }} />
 </div>
 <p className="text-[10px] text-muted-foreground">
 {realMetrics.gpu.memoryUsed} / {realMetrics.gpu.memoryTotal} MiB · {realMetrics.gpu.temperature}°C · {realMetrics.gpu.powerDraw.toFixed(0)}W
 </p>
 </div>
 </div>
 </div>
 )}
 </CardContent>
 </Card>
 </motion.div>

 {/* OpenClaw VPS Health */}
 <motion.div
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ duration: 0.3, delay: 0.3 }}
 >
 <Card className="bg-card/50 backdrop-blur h-full">
 <CardHeader className="pb-3">
 <div className="flex items-center justify-between">
 <CardTitle className="flex items-center gap-2 text-sm">
 <Globe size={16} weight="bold" className="text-emerald-500" />
 OpenClaw VPS
 <span className="flex items-center gap-1.5 ml-1">
 <span className={`w-1.5 h-1.5 rounded-full ${openClawStatus?.ok ? 'bg-emerald-500' : openClawStatus === null ? 'bg-amber-500 animate-pulse' : 'bg-red-500'}`} />
 <span className={`text-[10px] ${openClawStatus?.ok ? 'text-emerald-500' : openClawStatus === null ? 'text-amber-500' : 'text-red-500'}`}>
 {openClawStatus?.ok ? 'Online' : openClawStatus === null ? 'Checking...' : 'Offline'}
 </span>
 </span>
 </CardTitle>
 <Button
 variant="ghost"
 size="sm"
 onClick={() => navigate('/settings')}
 className="text-xs h-7 px-2"
 >
 Settings
 <ArrowRight size={12} weight="bold" className="ml-1" />
 </Button>
 </div>
 <CardDescription className="text-[10px]">
 {vpsMetrics ? `${vpsMetrics.hostname} — ${vpsMetrics.cores} cores — NVIDIA Free Inference` : 'OpenClaw VPS — NVIDIA Free Inference'}
 </CardDescription>
 </CardHeader>
 <CardContent>
 <div className="grid grid-cols-2 gap-4">
 {/* CPU */}
 <div className="space-y-1.5">
 <div className="flex items-center justify-between text-xs">
 <div className="flex items-center gap-1.5">
 <Cpu size={14} weight="bold" className="text-emerald-500" />
 <span>CPU</span>
 </div>
 <span className="font-bold" style={{ color: vpsMetrics ? (vpsMetrics.cpu > 80 ? '#f87171' : vpsMetrics.cpu > 60 ? '#facc15' : '#4ade80') : '#4ade80' }}>
 {vpsMetrics ? `${vpsMetrics.cpu}%` : '--'}
 </span>
 </div>
 <div className="h-1.5 bg-muted rounded-full overflow-hidden">
 <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${vpsMetrics?.cpu || 0}%` }} />
 </div>
 {vpsMetrics && <p className="text-[10px] text-muted-foreground">{vpsMetrics.cores} cores</p>}
 </div>
 {/* Memory */}
 <div className="space-y-1.5">
 <div className="flex items-center justify-between text-xs">
 <div className="flex items-center gap-1.5">
 <Pulse size={14} weight="bold" className="text-blue-500" />
 <span>Memory</span>
 </div>
 <span className="font-bold" style={{ color: vpsMetrics ? (vpsMetrics.memory > 80 ? '#f87171' : vpsMetrics.memory > 60 ? '#facc15' : '#4ade80') : '#4ade80' }}>
 {vpsMetrics ? `${vpsMetrics.memory}%` : '--'}
 </span>
 </div>
 <div className="h-1.5 bg-muted rounded-full overflow-hidden">
 <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${vpsMetrics?.memory || 0}%` }} />
 </div>
 {vpsMetrics && <p className="text-[10px] text-muted-foreground">{(vpsMetrics.memoryUsed / 1024).toFixed(1)} / {(vpsMetrics.memoryTotal / 1024).toFixed(1)} GB</p>}
 </div>
 {/* Disk */}
 <div className="space-y-1.5">
 <div className="flex items-center justify-between text-xs">
 <div className="flex items-center gap-1.5">
 <HardDrives size={14} weight="bold" className="text-amber-500" />
 <span>Disk</span>
 </div>
 <span className="font-bold text-amber-500">{vpsMetrics ? `${vpsMetrics.disk}%` : '--'}</span>
 </div>
 <div className="h-1.5 bg-muted rounded-full overflow-hidden">
 <div className="h-full bg-amber-500 transition-all duration-500" style={{ width: `${vpsMetrics?.disk || 0}%` }} />
 </div>
 {vpsMetrics && <p className="text-[10px] text-muted-foreground">{vpsMetrics.diskUsed} / {vpsMetrics.diskTotal}</p>}
 </div>
 {/* Uptime */}
 <div className="space-y-1.5">
 <div className="flex items-center gap-1.5 text-xs">
 <Clock size={14} weight="bold" className="text-emerald-500" />
 <span>Uptime</span>
 </div>
 <div className="text-lg font-bold text-emerald-500">
 {vpsMetrics?.uptime || (openClawStatus?.ok ? `${openClawStatus.latencyMs}ms` : '--')}
 </div>
 <p className="text-[10px] text-muted-foreground">
 {openClawStatus?.ok ? `Gateway ${openClawStatus.latencyMs}ms` : 'Gateway offline'}
 </p>
 </div>
 </div>
 {/* Footer: Agents + Supabase + D3bugr */}
 <div className="mt-4 pt-3 border-t border-white/[0.04] flex items-center justify-between flex-wrap gap-2">
 <div className="flex items-center gap-2 text-xs">
 <Robot size={12} weight="bold" className="text-emerald-500" />
 <span className="text-muted-foreground">9 Agents</span>
 <span className="text-muted-foreground">·</span>
 <span className="text-muted-foreground">10 Models</span>
 <span className="text-[10px] text-emerald-500">$0/tok</span>
 </div>
 <div className="flex items-center gap-3 text-xs">
 <div className="flex items-center gap-1.5">
 <div className={`w-2 h-2 rounded-full ${supabaseOk ? 'bg-emerald-500' : supabaseOk === null ? 'bg-amber-500 animate-pulse' : 'bg-red-500'}`} />
 <span className={supabaseOk ? 'text-emerald-500' : 'text-red-500'}>{supabaseOk ? 'Supabase' : 'DB Off'}</span>
 </div>
 <div className="flex items-center gap-1.5">
 <div className={`w-2 h-2 rounded-full ${openClawStatus?.ok ? 'bg-emerald-500' : 'bg-red-500'}`} />
 <span className={openClawStatus?.ok ? 'text-emerald-500' : 'text-red-500'}>{openClawStatus?.ok ? 'D3bugr' : 'MCP Off'}</span>
 </div>
 </div>
 </div>
 </CardContent>
 </Card>
 </motion.div>
 </div>

 {/* Your Feed — personalized security intelligence from CrowByte agents */}
 <FeedPanel />

 {/* Main Content Grid */}
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 {/* CVE Alerts */}
 <motion.div
 initial={{ opacity: 0, x: -20 }}
 animate={{ opacity: 1, x: 0 }}
 transition={{ duration: 0.4, delay: 0.4 }}
 >
 <Card className="bg-card/50 backdrop-blur h-full">
 <CardHeader>
 <div className="flex items-center justify-between">
 <div>
 <CardTitle className="flex items-center gap-2 text-red-500">
 <Warning size={20} weight="duotone" className="animate-pulse" />
 Latest CVE Alerts
 </CardTitle>
 <CardDescription>Top CVEs tracked by CrowByte Sentinel</CardDescription>
 </div>
 <Button
 variant="ghost"
 size="sm"
 onClick={refreshCVEs}
 disabled={loadingCVEs}
 className="h-8 px-3"
 >
 <ArrowsClockwise size={16} weight="bold" className={`mr-2 ${loadingCVEs ? 'animate-spin' : ''}`} />
 Refresh
 </Button>
 </div>
 </CardHeader>
 <CardContent>
 <ScrollArea className="h-[400px] pr-4">
 <div className="space-y-4">
 {cveAlerts.map((cve, idx) => (
 <motion.div
 key={cve.id}
 initial={{ opacity: 0, y: 10 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ duration: 0.3, delay: 0.5 + idx * 0.1 }}
 className="rounded-lg p-4 ring-1 ring-white/[0.06] transition-all hover:bg-primary/5 hover:ring-white/[0.1]"
 >
 <div className="flex items-start justify-between mb-2">
 <div className="flex items-center gap-2">
 <span className="font-mono font-bold text-primary">{cve.id}</span>
 <span className={`text-xs px-1.5 py-0.5 ${getSeverityColor(cve.severity)}`}>
 {cve.severity}
 </span>
 </div>
 <span className="text-lg font-bold text-primary">{cve.cvssScore.toFixed(1)}</span>
 </div>
 <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{cve.description}</p>
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2 text-xs text-muted-foreground">
 <Clock size={12} weight="bold" />
 {new Date(cve.publishedDate).toLocaleDateString()}
 </div>
 <Button
 variant="ghost"
 size="sm"
 className="h-7 px-2 text-xs"
 onClick={() => window.open(`https://nvd.nist.gov/vuln/detail/${cve.id}`, '_blank')}
 >
 <ArrowSquareOut size={12} weight="bold" className="mr-1" />
 View Details
 </Button>
 </div>
 </motion.div>
 ))}
 </div>
 </ScrollArea>
 </CardContent>
 </Card>
 </motion.div>

 {/* Cyber Security News */}
 <motion.div
 initial={{ opacity: 0, x: 20 }}
 animate={{ opacity: 1, x: 0 }}
 transition={{ duration: 0.4, delay: 0.4 }}
 >
 <Card className="bg-card/50 backdrop-blur h-full">
 <CardHeader>
 <div className="flex items-center justify-between">
 <div>
 <CardTitle className="flex items-center gap-2 text-blue-500">
 <Broadcast size={20} weight="duotone" />
 Cyber Threat Intelligence
 </CardTitle>
 <CardDescription>Live intel from Sentinel — RSS feeds analyzed by GLM5</CardDescription>
 </div>
 <Button
 variant="ghost"
 size="sm"
 onClick={refreshNews}
 disabled={loadingNews}
 className="h-8 px-3"
 >
 <ArrowsClockwise size={16} weight="bold" className={`mr-2 ${loadingNews ? 'animate-spin' : ''}`} />
 Refresh
 </Button>
 </div>
 </CardHeader>
 <CardContent>
 <ScrollArea className="h-[400px] pr-4">
 <div className="space-y-4">
 {news.map((item, idx) => (
 <motion.div
 key={idx}
 initial={{ opacity: 0, y: 10 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ duration: 0.3, delay: 0.5 + idx * 0.1 }}
 className="rounded-lg p-4 ring-1 ring-white/[0.06] transition-all hover:bg-primary/5 hover:ring-white/[0.1]"
 >
 <div className="flex items-start justify-between mb-2">
 <span className="text-xs text-muted-foreground">
 {item.category}
 </span>
 <span className="text-xs text-muted-foreground">{item.time}</span>
 </div>
 <h3 className="font-semibold text-sm leading-tight mb-3">{item.title}</h3>
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2 text-xs text-muted-foreground">
 <Eye size={12} weight="bold" />
 {item.source}
 </div>
 <Button
 variant="ghost"
 size="sm"
 className="h-7 px-2 text-xs"
 onClick={() => window.open(item.url, '_blank')}
 >
 <ArrowSquareOut size={12} weight="bold" className="mr-1" />
 Read Article
 </Button>
 </div>
 </motion.div>
 ))}
 </div>
 </ScrollArea>
 </CardContent>
 </Card>
 </motion.div>
 </div>

 {/* AI Agent Activity */}
 <motion.div
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ duration: 0.4, delay: 0.5 }}
 >
 <Card className="bg-card/50 backdrop-blur">
 <CardHeader className="pb-3">
 <div className="flex items-center justify-between">
 <div>
 <CardTitle className="flex items-center gap-2 text-emerald-500">
 <Robot size={20} weight="duotone" />
 AI Agent Swarm
 </CardTitle>
 <CardDescription>VPS autonomous agents — Sentinel, Alerter, Classifier, Reporter</CardDescription>
 </div>
 <Button
 variant="ghost"
 size="sm"
 onClick={fetchAgentActivity}
 className="h-8 px-3"
 >
 <ArrowsClockwise size={16} weight="bold" className="mr-2" />
 Refresh
 </Button>
 </div>
 </CardHeader>
 <CardContent>
 <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
 {agentActivity.map((agent) => (
 <div
 key={agent.agent}
 className="rounded-lg p-4 ring-1 ring-white/[0.06] transition-all hover:bg-primary/5 hover:ring-white/[0.1]"
 >
 <div className="flex items-center justify-between mb-3">
 <div className="flex items-center gap-2">
 <span className="text-lg">{agent.icon}</span>
 <span className="font-semibold text-sm text-zinc-100">{agent.agent}</span>
 </div>
 <div className={`h-2 w-2 rounded-full ${
 agent.status === 'active' ? 'bg-emerald-500 animate-pulse' :
 agent.status === 'error' ? 'bg-red-500' : 'bg-zinc-600'
 }`} />
 </div>
 <div className="space-y-1.5">
 <div className="flex items-center justify-between">
 <span className="text-xs text-muted-foreground">Last run</span>
 <span className="text-xs font-mono text-zinc-300">{agent.lastRun}</span>
 </div>
 <div className="flex items-center justify-between">
 <span className="text-xs text-muted-foreground">{agent.metricLabel}</span>
 <span className={`text-sm font-bold ${
 parseInt(agent.metric) > 0 ? 'text-emerald-400' : 'text-zinc-500'
 }`}>{agent.metric}</span>
 </div>
 </div>
 </div>
 ))}
 </div>
 {agentActivity.length === 0 && (
 <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
 <ArrowsClockwise size={16} weight="bold" className="mr-2 animate-spin" />
 Loading agent activity...
 </div>
 )}
 </CardContent>
 </Card>
 </motion.div>

 {/* Status Footer — Unified system bar */}
 <motion.div
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ duration: 0.4, delay: 0.6 }}
 className="flex items-center justify-between text-sm text-muted-foreground border-t border-white/[0.04] pt-4"
 >
 {/* Left: System status + Version */}
 <div className="flex items-center gap-4">
 <div className="flex items-center gap-2">
 <div className={`h-2 w-2 rounded-full animate-pulse ${
 openClawStatus?.ok && supabaseOk && window.electronAPI ? 'bg-emerald-500' : 'bg-yellow-500'
 }`} />
 <span>
 {openClawStatus?.ok && supabaseOk && window.electronAPI
 ? 'All Systems Operational'
 : 'Partial — check subsystem status'}
 </span>
 </div>
 <Separator orientation="vertical" className="h-4" />
 <div className="flex items-center gap-2">
 <Lightning size={16} weight="bold" className="text-primary" />
 <span>CrowByte v1.0</span>
 </div>
 </div>

 {/* Right: Subsystem status indicators */}
 <div className="flex items-center gap-3 text-xs">
 {/* OpenClaw VPS */}
 <span className="flex items-center gap-1.5">
 <span className={`w-1.5 h-1.5 rounded-full ${
 openClawStatus?.ok ? 'bg-emerald-500' : openClawStatus === null ? 'bg-amber-500 animate-pulse' : 'bg-red-500'
 }`} />
 <span className={openClawStatus?.ok ? 'text-emerald-500' : openClawStatus === null ? 'text-amber-500' : 'text-red-500'}>
 OpenClaw
 </span>
 {openClawStatus?.ok && (
 <span className="text-muted-foreground">{openClawStatus.latencyMs}ms</span>
 )}
 </span>
 <span className="text-zinc-700">|</span>

 {/* VPS agents + model */}
 {openClawStatus?.ok && (
 <>
 <span className="text-cyan-500">9 Agents</span>
 <span className="text-zinc-700">|</span>
 <span className="text-muted-foreground font-mono">
 {openClaw.getModels().find(m => m.id === openClaw.getCurrentModel())?.name || 'GLM5'}
 </span>
 <span className="text-emerald-500">NVIDIA</span>
 <span className="text-zinc-700">|</span>
 </>
 )}

 {/* Supabase */}
 <span className="flex items-center gap-1.5">
 <span className={`w-1.5 h-1.5 rounded-full ${
 supabaseOk ? 'bg-emerald-500' : supabaseOk === null ? 'bg-amber-500 animate-pulse' : 'bg-red-500'
 }`} />
 <span className={supabaseOk ? 'text-emerald-500' : supabaseOk === null ? 'text-amber-500' : 'text-red-500'}>
 Supabase
 </span>
 </span>
 <span className="text-zinc-700">|</span>

 {/* Electron */}
 <span className="flex items-center gap-1.5">
 <span className={`w-1.5 h-1.5 rounded-full ${window.electronAPI ? 'bg-emerald-500' : 'bg-red-500'}`} />
 <span className={window.electronAPI ? 'text-emerald-500' : 'text-red-500'}>Electron</span>
 </span>
 <span className="text-zinc-700">|</span>

 {/* Network */}
 <span className="flex items-center gap-1.5">
 <span className={`w-1.5 h-1.5 rounded-full ${ipStatus && !ipStatus.error ? 'bg-emerald-500' : 'bg-red-500'}`} />
 <span className={ipStatus && !ipStatus.error ? 'text-emerald-500' : 'text-red-500'}>Network</span>
 </span>
 </div>
 </motion.div>
 </div>
 );
};

export default Dashboard;
