import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  Shield,
  AlertTriangle,
  Activity,
  Cpu,
  HardDrive,
  Wifi,
  TrendingUp,
  Clock,
  Zap,
  Brain,
  Radio,
  Eye,
  ExternalLink,
  RefreshCw,
  Globe,
  ShieldCheck,
  WifiOff,
  BarChart3,
  ArrowRight,
  Monitor,
  Plus,
  Terminal,
  MessageSquare,
  Server,
  Swords,
  Database,
  Bot,
  CircleCheck,
  CircleX,
  Loader2,
} from "lucide-react";
import { motion } from "framer-motion";
import CommandCenterHeader from "@/components/CommandCenterHeader";
import { useToast } from "@/hooks/use-toast";
import { ipStatusService, type IPStatusData } from "@/services/ip-status";
import { systemMonitor, SystemMetrics } from "@/services/systemMonitor";
import { endpointService, Endpoint } from "@/services/endpointService";
import { openClaw } from "@/services/openclaw";

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
        console.log('🔍 Fetching IP status...');
        const status = await ipStatusService.getIPStatus();
        console.log('✅ IP status fetched:', status);
        setIpStatus(status);

        // Show error toast if there was a problem
        if (status.error) {
          console.warn('⚠️ IP status has error:', status.error);
          toast({
            title: "IP Fetch Issue",
            description: status.ip === 'Unavailable'
              ? "Unable to fetch your IP address. Network may be offline."
              : "Partial IP data retrieved. Some features may be unavailable.",
            variant: status.ip === 'Unavailable' ? "destructive" : "default",
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
          title: "Network Error",
          description: "Failed to check network status. Please check your connection.",
          variant: "destructive",
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
        title: "IP Status Refreshed",
        description: `Your IP: ${status.ip}`,
      });
    } catch (error) {
      console.error('❌ Failed to refresh IP status:', error);
      toast({
        title: "Error",
        description: "Failed to fetch IP address. Check console for details.",
        variant: "destructive",
      });
    } finally {
      setLoadingIPStatus(false);
    }
  };

  // Fetch CVE alerts from Supabase
  const fetchCVEs = async () => {
    try {
      setLoadingCVEs(true);

      console.log('📊 Fetching recent CVEs from Supabase...');

      const { supabase } = await import('@/lib/supabase');

      // Get top 5 most critical recent CVEs
      const { data, error } = await supabase
        .from('cves')
        .select('*')
        .order('cvss_score', { ascending: false })
        .order('published_date', { ascending: false })
        .limit(5);

      if (error || !data || data.length === 0) {
        if (error) {
          console.warn('⚠️ Supabase error, using mock data:', error);
        } else {
          console.warn('⚠️ No CVEs in database, using mock data');
        }

        // Fall back to mock data if Supabase fails or no data
        setCveAlerts([
          {
            id: "CVE-2025-XXXX",
            description: "Critical remote code execution vulnerability discovered in widely-used framework",
            severity: "CRITICAL",
            publishedDate: new Date().toISOString(),
            cvssScore: 9.8,
          },
          {
            id: "CVE-2025-YYYY",
            description: "SQL injection vulnerability affecting enterprise database systems",
            severity: "HIGH",
            publishedDate: new Date().toISOString(),
            cvssScore: 8.1,
          },
        ]);
      } else {
        // Successfully fetched from Supabase
        console.log(`✅ Loaded ${data.length} CVEs from Supabase`);

        const cves: CVE[] = data.map((item: any) => ({
          id: item.cve_id || item.id,
          description: item.description || "No description available",
          severity: item.severity || "UNKNOWN",
          publishedDate: item.published_date,
          cvssScore: item.cvss_score || 0,
        }));

        setCveAlerts(cves);
      }
    } catch (error) {
      console.error("❌ Error fetching CVEs:", error);

      // Fallback mock data
      setCveAlerts([
        {
          id: "CVE-2025-XXXX",
          description: "Critical remote code execution vulnerability discovered in widely-used framework",
          severity: "CRITICAL",
          publishedDate: new Date().toISOString(),
          cvssScore: 9.8,
        },
        {
          id: "CVE-2025-YYYY",
          description: "SQL injection vulnerability affecting enterprise database systems",
          severity: "HIGH",
          publishedDate: new Date().toISOString(),
          cvssScore: 8.1,
        },
      ]);
    } finally {
      setLoadingCVEs(false);
    }
  };

  // Manual refresh function for CVEs
  const refreshCVEs = async () => {
    await fetchCVEs();
    toast({
      title: "CVE Alerts Refreshed",
      description: `Updated with latest ${new Date().getFullYear()} vulnerabilities`,
    });
  };

  useEffect(() => {
    fetchCVEs();
  }, []);

  // Fetch news from Supabase (ingested by VPS service every 3 min)
  const fetchNews = async () => {
    try {
      setLoadingNews(true);
      const { supabase } = await import('@/lib/supabase');
      const { data, error } = await supabase
        .from('knowledge_base')
        .select('title, source_url, author, published_date, subcategory')
        .eq('category', 'news')
        .order('published_date', { ascending: false })
        .limit(40);

      if (error || !data || data.length === 0) throw new Error('No news');

      const items: NewsItem[] = data.map((item: any) => {
        const pubDate = item.published_date ? new Date(item.published_date) : new Date();
        const hoursAgo = Math.floor((Date.now() - pubDate.getTime()) / 3600000);
        const timeText = hoursAgo < 1 ? 'Just now' : hoursAgo < 24 ? `${hoursAgo}h ago` : `${Math.floor(hoursAgo / 24)}d ago`;
        return {
          title: item.title,
          source: item.author || 'Unknown',
          time: timeText,
          category: item.subcategory || 'Security News',
          url: item.source_url || '#',
        };
      });
      setNews(items);
    } catch {
      setNews([
        { title: "Waiting for feed ingestion from VPS...", source: "CrowByte", time: "now", category: "System", url: "#" },
      ]);
    } finally {
      setLoadingNews(false);
    }
  };

  // Manual refresh function for news
  const refreshNews = async () => {
    await fetchNews();
    toast({
      title: "Threat Intelligence Refreshed",
      description: "Updated with latest security news from Supabase",
    });
  };

  useEffect(() => {
    fetchNews();
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

      if (!vpsOk && window.electronAPI?.executeCommand) {
        try {
          const start = Date.now();
          const output = await window.electronAPI.executeCommand(
            `curl -sk -o /dev/null -w %{http_code} https://${import.meta.env.VITE_OPENCLAW_HOSTNAME || 'localhost'}/nvidia/v1/models --connect-timeout 5`
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
          .single();
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
            console.log('[Realtime] endpoints:', status);
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
            console.log('[Realtime] New CVE detected, refreshing...');
            fetchCVEs();
          })
          .subscribe((status: string) => {
            console.log('[Realtime] cves:', status);
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
            console.log('[Realtime] New news article, refreshing feed...');
            fetchNews();
          })
          .subscribe((status: string) => {
            console.log('[Realtime] news:', status);
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
            console.log('[Realtime] New conversation');
          })
          .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
          }, () => {
            console.log('[Realtime] New message');
          })
          .subscribe((status: string) => {
            console.log('[Realtime] conversations:', status);
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
          .single();
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
      case "CRITICAL":
        return "bg-red-500/20 text-red-400 border-red-500/50";
      case "HIGH":
        return "bg-orange-500/20 text-orange-400 border-orange-500/50";
      case "MEDIUM":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/50";
      case "LOW":
        return "bg-green-500/20 text-green-400 border-green-500/50";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/50";
    }
  };

  const getHealthColor = (value: number, type: string) => {
    if (type === "cpu" || type === "memory") {
      if (value > 80) return "text-red-400";
      if (value > 60) return "text-yellow-400";
      return "text-green-400";
    }
    return "text-primary";
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
        <Card className="border-primary/30 bg-card/50 backdrop-blur">
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-2">
              {/* Title */}
              <div className="flex items-center gap-2 min-w-[120px]">
                <Wifi className="h-4 w-4 text-primary" />
                <span className="text-xs font-semibold text-primary">Network Status</span>
              </div>

              {loadingIPStatus && !ipStatus ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  <span>Loading...</span>
                </div>
              ) : ipStatus ? (
                <>
                  {/* Compact Info Row */}
                  <div className="flex items-center gap-2 flex-1 flex-wrap">
                    {/* Protection Badge */}
                    <Badge
                      variant="outline"
                      className={`text-xs px-2 py-0 h-5 ${
                        ipStatus.error || ipStatus.ip === 'Unavailable'
                          ? 'border-red-500/30 bg-red-500/10 text-red-400'
                          : ipStatus.isVPN || ipStatus.isTor
                            ? 'border-green-500/30 bg-green-500/10 text-green-400'
                            : 'border-blue-500/30 bg-blue-500/10 text-blue-400'
                      }`}
                    >
                      {ipStatus.error || ipStatus.ip === 'Unavailable' ? (
                        <>
                          <WifiOff className="h-3 w-3 mr-1" />
                          Offline
                        </>
                      ) : ipStatus.isVPN || ipStatus.isTor ? (
                        <>
                          <ShieldCheck className="h-3 w-3 mr-1" />
                          Protected
                        </>
                      ) : (
                        <>
                          <Wifi className="h-3 w-3 mr-1" />
                          Connected
                        </>
                      )}
                    </Badge>

                    <Separator orientation="vertical" className="h-4" />

                    {/* IP Address */}
                    {ipStatus.error || ipStatus.ip === 'Unavailable' ? (
                      <Badge variant="outline" className="text-xs px-2 py-0 h-5 border-red-500/30 bg-red-500/10 text-red-400 font-mono">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        {ipStatus.ip}
                      </Badge>
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
                        <Badge variant="outline" className="text-xs px-2 py-0 h-5 border-blue-500/30 bg-blue-500/10 text-blue-400">
                          {ipStatus.networkConnection.type === 'wifi' && 'WiFi'}
                          {ipStatus.networkConnection.type === 'ethernet' && 'Ethernet'}
                          {ipStatus.networkConnection.type === 'cellular' && 'Cellular'}
                          {ipStatus.networkConnection.type === 'unknown' && 'Unknown'}
                        </Badge>
                        <Separator orientation="vertical" className="h-4" />
                      </>
                    )}

                    {/* VPN Status */}
                    <Badge
                      variant="outline"
                      className={`text-xs px-2 py-0 h-5 ${
                        ipStatus.isVPN
                          ? 'border-green-500/30 bg-green-500/10 text-green-400'
                          : 'border-gray-500/30 bg-gray-500/10 text-gray-400'
                      }`}
                    >
                      {ipStatus.isVPN ? (
                        <>
                          <ShieldCheck className="h-3 w-3 mr-1" />
                          VPN
                        </>
                      ) : (
                        'No VPN'
                      )}
                    </Badge>

                    {/* Tor Status */}
                    <Badge
                      variant="outline"
                      className={`text-xs px-2 py-0 h-5 ${
                        ipStatus.isTor
                          ? 'border-purple-500/30 bg-purple-500/10 text-purple-400'
                          : 'border-gray-500/30 bg-gray-500/10 text-gray-400'
                      }`}
                    >
                      {ipStatus.isTor ? 'Tor' : 'No Tor'}
                    </Badge>

                    {/* VPN Provider */}
                    {ipStatus.vpnProvider && (
                      <>
                        <Separator orientation="vertical" className="h-4" />
                        <span className="text-xs text-green-400 font-semibold">🔒 {ipStatus.vpnProvider}</span>
                      </>
                    )}

                    {/* Local/WiFi IP */}
                    {ipStatus.localIP && (
                      <>
                        <Separator orientation="vertical" className="h-4" />
                        <span className="text-xs text-muted-foreground">LAN:</span>
                        <span className="text-xs font-mono text-yellow-400">{ipStatus.localIP}</span>
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
                        <Badge variant="outline" className="text-xs px-2 py-0 h-5 border-cyan-500/30 bg-cyan-500/10 text-cyan-400">
                          DNS: {ipStatus.dnsInfo.primaryDNS}
                          {ipStatus.dnsInfo.secondaryDNS && `, ${ipStatus.dnsInfo.secondaryDNS}`}
                        </Badge>
                      </>
                    )}

                    {/* DNS Leak Warning */}
                    {ipStatus.dnsInfo?.isDNSLeak && (
                      <>
                        <Separator orientation="vertical" className="h-4" />
                        <Badge variant="outline" className="text-xs px-2 py-0 h-5 border-red-500/30 bg-red-500/10 text-red-400 animate-pulse">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          DNS LEAK!
                        </Badge>
                      </>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs px-2 py-0 h-5 border-red-500/30 bg-red-500/10 text-red-400">
                    <Globe className="h-3 w-3 mr-1" />
                    Unavailable
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={refreshIPStatus}
                    className="h-6 px-2 text-xs"
                  >
                    <RefreshCw className="h-3 w-3" />
                  </Button>
                </div>
              )}

              {/* Subsystem Status (compact) */}
              <div className="flex items-center gap-1.5 ml-auto">
                <Badge
                  variant="outline"
                  className={`text-xs px-1.5 py-0 h-5 ${
                    openClawStatus?.ok
                      ? 'border-green-500/30 bg-green-500/10 text-green-400'
                      : 'border-red-500/30 bg-red-500/10 text-red-400'
                  }`}
                >
                  <Server className="h-3 w-3 mr-1" />
                  VPS {openClawStatus?.ok ? `${openClawStatus.latencyMs}ms` : 'Off'}
                </Badge>
                <Badge
                  variant="outline"
                  className={`text-xs px-1.5 py-0 h-5 ${
                    supabaseOk
                      ? 'border-green-500/30 bg-green-500/10 text-green-400'
                      : 'border-red-500/30 bg-red-500/10 text-red-400'
                  }`}
                >
                  <Database className="h-3 w-3 mr-1" />
                  DB
                </Badge>
              </div>

              {/* Refresh Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={refreshIPStatus}
                disabled={loadingIPStatus}
                className="h-6 px-2"
              >
                <RefreshCw className={`h-3 w-3 ${loadingIPStatus ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* OpenClaw Agent Swarm Status */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
      >
        <Card className="border-primary/30 bg-card/50 backdrop-blur">
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-[140px]">
                <Server className="h-4 w-4 text-primary" />
                <span className="text-xs font-semibold text-primary">OpenClaw Swarm</span>
              </div>
              <div className="flex items-center gap-2 flex-1 flex-wrap">
                {/* VPS Connection */}
                <Badge
                  variant="outline"
                  className={`text-xs px-2 py-0 h-5 ${
                    openClawStatus?.ok
                      ? 'border-green-500/30 bg-green-500/10 text-green-400'
                      : openClawStatus === null
                        ? 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400'
                        : 'border-red-500/30 bg-red-500/10 text-red-400'
                  }`}
                >
                  {openClawStatus?.ok ? (
                    <><CircleCheck className="h-3 w-3 mr-1" />VPS Online</>
                  ) : openClawStatus === null ? (
                    <><Loader2 className="h-3 w-3 mr-1 animate-spin" />Checking...</>
                  ) : (
                    <><CircleX className="h-3 w-3 mr-1" />VPS Offline</>
                  )}
                </Badge>

                {openClawStatus?.ok && (
                  <>
                    <Separator orientation="vertical" className="h-4" />
                    <span className="text-xs text-muted-foreground">{openClawStatus.latencyMs}ms</span>
                    <Separator orientation="vertical" className="h-4" />
                    <Badge variant="outline" className="text-xs px-2 py-0 h-5 border-cyan-500/30 bg-cyan-500/10 text-cyan-400">
                      <Bot className="h-3 w-3 mr-1" />
                      9 Agents
                    </Badge>
                    <Separator orientation="vertical" className="h-4" />
                    <span className="text-xs text-muted-foreground font-mono">
                      {openClaw.getModels().find(m => m.id === openClaw.getCurrentModel())?.name || 'GLM5'}
                    </span>
                    <Badge variant="outline" className="text-xs px-2 py-0 h-5 border-green-500/30 bg-green-500/10 text-green-400">
                      NVIDIA Free
                    </Badge>
                  </>
                )}

                <Separator orientation="vertical" className="h-4" />

                {/* Supabase Status */}
                <Badge
                  variant="outline"
                  className={`text-xs px-2 py-0 h-5 ${
                    supabaseOk
                      ? 'border-green-500/30 bg-green-500/10 text-green-400'
                      : supabaseOk === null
                        ? 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400'
                        : 'border-red-500/30 bg-red-500/10 text-red-400'
                  }`}
                >
                  <Database className="h-3 w-3 mr-1" />
                  {supabaseOk ? 'Supabase' : supabaseOk === null ? 'Checking...' : 'DB Offline'}
                </Badge>

                {/* Electron Status */}
                <Badge
                  variant="outline"
                  className={`text-xs px-2 py-0 h-5 ${
                    window.electronAPI
                      ? 'border-green-500/30 bg-green-500/10 text-green-400'
                      : 'border-red-500/30 bg-red-500/10 text-red-400'
                  }`}
                >
                  <Monitor className="h-3 w-3 mr-1" />
                  {window.electronAPI ? 'Electron IPC' : 'No IPC'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Quick Actions Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <Card
            className="border-primary/30 bg-card/50 backdrop-blur hover:border-primary/50 transition-all cursor-pointer group"
            onClick={() => navigate('/chat')}
          >
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-primary/20 group-hover:bg-primary/30 transition-colors">
                    <MessageSquare className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">CrowByte AI</h3>
                    <p className="text-xs text-muted-foreground">Agentic Chat</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-primary group-hover:translate-x-1 transition-transform" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.25 }}
        >
          <Card
            className="border-green-500/30 bg-card/50 backdrop-blur hover:border-green-500/50 transition-all cursor-pointer group"
            onClick={() => navigate('/terminal')}
          >
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-green-500/20 group-hover:bg-green-500/30 transition-colors">
                    <Terminal className="h-5 w-5 text-green-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">Terminal</h3>
                    <p className="text-xs text-muted-foreground">Shell Access</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-green-400 group-hover:translate-x-1 transition-transform" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <Card
            className="border-red-500/30 bg-card/50 backdrop-blur hover:border-red-500/50 transition-all cursor-pointer group"
            onClick={() => navigate('/redteam')}
          >
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-red-500/20 group-hover:bg-red-500/30 transition-colors">
                    <Swords className="h-5 w-5 text-red-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">Red Team</h3>
                    <p className="text-xs text-muted-foreground">Operations</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-red-400 group-hover:translate-x-1 transition-transform" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.35 }}
        >
          <Card
            className="border-blue-500/30 bg-card/50 backdrop-blur hover:border-blue-500/50 transition-all cursor-pointer group"
            onClick={() => navigate('/network-scanner')}
          >
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-blue-500/20 group-hover:bg-blue-500/30 transition-colors">
                    <Wifi className="h-5 w-5 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">Network Scan</h3>
                    <p className="text-xs text-muted-foreground">Nmap Recon</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-blue-400 group-hover:translate-x-1 transition-transform" />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* CrowByte AI - Quick Access */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <Card
          className="border-primary/30 bg-gradient-to-br from-primary/5 to-background backdrop-blur cursor-pointer hover:border-primary/50 transition-all group"
          onClick={() => navigate('/chat')}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-primary/20 animate-pulse group-hover:scale-110 transition-transform">
                  <Brain className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-semibold">CrowByte AI</h3>
                    <Badge variant="outline" className="text-xs bg-primary/10 border-primary/30">
                      OpenClaw • {openClaw.getModels().find(m => m.id === openClaw.getCurrentModel())?.name || 'GLM5'}
                    </Badge>
                    <Badge variant="outline" className="text-xs bg-green-500/10 border-green-500/30 text-green-400">
                      NVIDIA Free
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">Agentic AI with terminal execution • 9 agents • 7 models</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-xs text-muted-foreground mb-1">
                    {openClawStatus?.ok ? `${openClawStatus.latencyMs}ms latency` : 'Connecting...'}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-primary/10 hover:bg-primary/20 border-primary/30"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate('/chat');
                    }}
                  >
                    Open Chat
                    <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* System Health — Kali + OpenClaw side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Kali System Health */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <Card className="border-primary/30 bg-card/50 backdrop-blur h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Monitor className="h-4 w-4 text-primary" />
                  Kali System
                  {realMetrics && (
                    <Badge variant="outline" className="ml-1 text-[10px]">
                      {realMetrics.hostname}
                    </Badge>
                  )}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/fleet')}
                  className="text-xs h-7 px-2"
                >
                  View Fleet
                  <ArrowRight className="h-3 w-3 ml-1" />
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
                      <Cpu className="h-3.5 w-3.5 text-primary" />
                      <span>CPU</span>
                    </div>
                    <span className="font-bold" style={{ color: getHealthColor(systemHealth.cpu, "cpu") }}>
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
                      <Activity className="h-3.5 w-3.5 text-blue-400" />
                      <span>Memory</span>
                    </div>
                    <span className="font-bold" style={{ color: getHealthColor(systemHealth.memory, "memory") }}>
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
                      <HardDrive className="h-3.5 w-3.5 text-amber-400" />
                      <span>Disk</span>
                    </div>
                    <span className="font-bold text-amber-400">{systemHealth.disk}%</span>
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
                    <Clock className="h-3.5 w-3.5 text-green-400" />
                    <span>Uptime</span>
                  </div>
                  {realMetrics && (
                    <div className="text-lg font-bold text-green-400">
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
                <div className="mt-4 pt-3 border-t border-border/30">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <Zap className="h-3.5 w-3.5 text-purple-400" />
                          <span>GPU</span>
                        </div>
                        <span className="font-bold" style={{ color: realMetrics.gpu.utilization > 80 ? '#f87171' : realMetrics.gpu.utilization > 60 ? '#facc15' : '#a78bfa' }}>
                          {realMetrics.gpu.utilization}%
                        </span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-purple-500 transition-all duration-500" style={{ width: `${realMetrics.gpu.utilization}%` }} />
                      </div>
                      <p className="text-[10px] text-muted-foreground">{realMetrics.gpu.name}</p>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <Activity className="h-3.5 w-3.5 text-purple-400" />
                          <span>VRAM</span>
                        </div>
                        <span className="font-bold text-purple-400">
                          {Math.round(realMetrics.gpu.memoryUsed / realMetrics.gpu.memoryTotal * 100)}%
                        </span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-purple-500/70 transition-all duration-500" style={{ width: `${Math.round(realMetrics.gpu.memoryUsed / realMetrics.gpu.memoryTotal * 100)}%` }} />
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
          <Card className="border-green-500/30 bg-card/50 backdrop-blur h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Globe className="h-4 w-4 text-green-400" />
                  OpenClaw VPS
                  <Badge variant="outline" className={`ml-1 text-[10px] ${openClawStatus?.ok ? 'border-green-500/50 text-green-400' : 'border-red-500/50 text-red-400'}`}>
                    {openClawStatus?.ok ? 'Online' : openClawStatus === null ? 'Checking...' : 'Offline'}
                  </Badge>
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/settings')}
                  className="text-xs h-7 px-2"
                >
                  Settings
                  <ArrowRight className="h-3 w-3 ml-1" />
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
                      <Cpu className="h-3.5 w-3.5 text-green-400" />
                      <span>CPU</span>
                    </div>
                    <span className="font-bold" style={{ color: vpsMetrics ? (vpsMetrics.cpu > 80 ? '#f87171' : vpsMetrics.cpu > 60 ? '#facc15' : '#4ade80') : '#4ade80' }}>
                      {vpsMetrics ? `${vpsMetrics.cpu}%` : '--'}
                    </span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 transition-all duration-500" style={{ width: `${vpsMetrics?.cpu || 0}%` }} />
                  </div>
                  {vpsMetrics && <p className="text-[10px] text-muted-foreground">{vpsMetrics.cores} cores</p>}
                </div>
                {/* Memory */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <Activity className="h-3.5 w-3.5 text-blue-400" />
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
                      <HardDrive className="h-3.5 w-3.5 text-amber-400" />
                      <span>Disk</span>
                    </div>
                    <span className="font-bold text-amber-400">{vpsMetrics ? `${vpsMetrics.disk}%` : '--'}</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 transition-all duration-500" style={{ width: `${vpsMetrics?.disk || 0}%` }} />
                  </div>
                  {vpsMetrics && <p className="text-[10px] text-muted-foreground">{vpsMetrics.diskUsed} / {vpsMetrics.diskTotal}</p>}
                </div>
                {/* Uptime */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs">
                    <Clock className="h-3.5 w-3.5 text-green-400" />
                    <span>Uptime</span>
                  </div>
                  <div className="text-lg font-bold text-green-400">
                    {vpsMetrics?.uptime || (openClawStatus?.ok ? `${openClawStatus.latencyMs}ms` : '--')}
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {openClawStatus?.ok ? `Gateway ${openClawStatus.latencyMs}ms` : 'Gateway offline'}
                  </p>
                </div>
              </div>
              {/* Footer: Agents + Supabase + D3bugr */}
              <div className="mt-4 pt-3 border-t border-border/30 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 text-xs">
                  <Bot className="h-3 w-3 text-green-400" />
                  <span className="text-muted-foreground">9 Agents</span>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-muted-foreground">10 Models</span>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-green-500/30 bg-green-500/10 text-green-400">$0/tok</Badge>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${supabaseOk ? 'bg-green-400' : supabaseOk === null ? 'bg-yellow-400 animate-pulse' : 'bg-red-400'}`} />
                    <span className={supabaseOk ? 'text-green-400' : 'text-red-400'}>{supabaseOk ? 'Supabase' : 'DB Off'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${openClawStatus?.ok ? 'bg-green-400' : 'bg-red-400'}`} />
                    <span className={openClawStatus?.ok ? 'text-green-400' : 'text-red-400'}>{openClawStatus?.ok ? 'D3bugr' : 'MCP Off'}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CVE Alerts */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
        >
          <Card className="border-red-500/30 bg-card/50 backdrop-blur h-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-red-400">
                    <AlertTriangle className="h-5 w-5 animate-pulse" />
                    Latest CVE Alerts
                  </CardTitle>
                  <CardDescription>Recent {new Date().getFullYear()} vulnerabilities from NVD NIST</CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={refreshCVEs}
                  disabled={loadingCVEs}
                  className="h-8 px-3"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loadingCVEs ? 'animate-spin' : ''}`} />
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
                      className="border border-border/50 rounded-lg p-4 hover:border-primary/50 transition-all hover:bg-primary/5"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-primary">{cve.id}</span>
                          <Badge className={`text-xs ${getSeverityColor(cve.severity)}`}>
                            {cve.severity}
                          </Badge>
                        </div>
                        <span className="text-lg font-bold text-primary">{cve.cvssScore.toFixed(1)}</span>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{cve.description}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {new Date(cve.publishedDate).toLocaleDateString()}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => window.open(`https://nvd.nist.gov/vuln/detail/${cve.id}`, '_blank')}
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
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
          <Card className="border-blue-500/30 bg-card/50 backdrop-blur h-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-blue-400">
                    <Radio className="h-5 w-5" />
                    Cyber Threat Intelligence
                  </CardTitle>
                  <CardDescription>Latest security news from r/netsec</CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={refreshNews}
                  disabled={loadingNews}
                  className="h-8 px-3"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loadingNews ? 'animate-spin' : ''}`} />
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
                      className="border border-border/50 rounded-lg p-4 hover:border-primary/50 transition-all hover:bg-primary/5"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <Badge variant="secondary" className="text-xs">
                          {item.category}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{item.time}</span>
                      </div>
                      <h3 className="font-semibold text-sm leading-tight mb-3">{item.title}</h3>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Eye className="h-3 w-3" />
                          {item.source}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => window.open(item.url, '_blank')}
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
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

      {/* Status Footer */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.6 }}
        className="flex items-center justify-between text-sm text-muted-foreground border-t border-border/50 pt-4"
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full animate-pulse ${
              openClawStatus?.ok && supabaseOk && window.electronAPI ? 'bg-green-500' : 'bg-yellow-500'
            }`} />
            <span>
              {openClawStatus?.ok && supabaseOk && window.electronAPI
                ? 'All Systems Operational'
                : 'Partial — check subsystem status'}
            </span>
          </div>
          <Separator orientation="vertical" className="h-4" />
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            <span>CrowByte v1.0</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className={openClawStatus?.ok ? 'text-green-400' : 'text-red-400'}>OpenClaw</span>
          <span className="text-muted-foreground">|</span>
          <span className={supabaseOk ? 'text-green-400' : 'text-red-400'}>Supabase</span>
          <span className="text-muted-foreground">|</span>
          <span className={window.electronAPI ? 'text-green-400' : 'text-red-400'}>Electron</span>
          <span className="text-muted-foreground">|</span>
          <span className={ipStatus && !ipStatus.error ? 'text-green-400' : 'text-red-400'}>Network</span>
        </div>
      </motion.div>
    </div>
  );
};

export default Dashboard;
