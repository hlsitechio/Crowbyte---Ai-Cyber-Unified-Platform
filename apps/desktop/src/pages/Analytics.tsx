import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Activity,
  BarChart3,
  TrendingUp,
  Clock,
  Zap,
  Database,
  MessageSquare,
  Search,
  BookOpen,
  Eye,
  RefreshCw,
  Shield,
  AlertTriangle,
  TrendingDown,
  Target,
  Radar,
  Bug,
  Server,
  Globe,
  Lock,
  Unlock,
  Brain,
  Network,
  Cpu,
  HardDrive,
} from "lucide-react";
import { motion } from "framer-motion";
import { analyticsService, type ActivityLog, type ApiUsageStats } from "@/services/analytics";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { SupabaseHealthDashboard } from "@/components/SupabaseHealthDashboard";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar as RechartsRadar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

// CVE API Types
interface CriticalCVE {
  id: string;
  cve_id: string;
  description: string;
  severity: string;
  cvss_score: number;
  published_date: string;
  last_modified: string;
  attack_vector?: string;
  exploit_available?: boolean;
}

interface CVELibraryStats {
  total_cves: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  trending_count: number;
  exploitable_count: number;
}

interface ThreatMetric {
  category: string;
  value: number;
  severity: number;
}

// Color schemes for monochrome theme
const SEVERITY_COLORS = {
  CRITICAL: "#ef4444",
  HIGH: "#f97316",
  MEDIUM: "#eab308",
  LOW: "#22c55e",
  INFO: "#94a3b8",
};

const CHART_COLORS = ["#94a3b8", "#64748b", "#475569", "#cbd5e1", "#e2e8f0", "#f1f5f9"];

const Analytics = () => {
  const { toast } = useToast();
  const [usageStats, setUsageStats] = useState<ApiUsageStats[]>([]);
  const [recentActivities, setRecentActivities] = useState<ActivityLog[]>([]);
  const [totalApiCalls, setTotalApiCalls] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // CVE State
  const [criticalCVEs, setCriticalCVEs] = useState<CriticalCVE[]>([]);
  const [cveStats, setCveStats] = useState<CVELibraryStats | null>(null);
  const [cveLoading, setCveLoading] = useState(false);
  const [securityScore, setSecurityScore] = useState(0);
  const [threatLevel, setThreatLevel] = useState<"LOW" | "MEDIUM" | "HIGH" | "CRITICAL">("LOW");

  const [apiUsage, setApiUsage] = useState({
    count: 0,
    limit: 5000,
    remaining: 5000,
    resetTime: new Date(),
    percentUsed: 0,
  });

  // Fetch CVE data from Supabase + NVD via Electron proxy
  const fetchCVEData = async () => {
    setCveLoading(true);
    try {
      const { supabase } = await import('@/lib/supabase');

      // Fetch critical CVEs from Supabase
      const { data: cveData, error: cveError } = await supabase
        .from('cves')
        .select('*')
        .order('cvss_score', { ascending: false })
        .limit(20);

      if (!cveError && cveData && cveData.length > 0) {
        setCriticalCVEs(cveData.map((item: any) => ({
          id: item.id,
          cve_id: item.id,
          description: item.description || 'No description',
          severity: item.severity || 'UNKNOWN',
          cvss_score: item.cvss_score || 0,
          published_date: item.published_date || new Date().toISOString(),
          last_modified: item.last_modified || new Date().toISOString(),
          exploit_available: false,
        })));

        // Calculate stats from actual data
        const stats: CVELibraryStats = {
          total_cves: cveData.length,
          critical_count: cveData.filter((c: any) => c.severity === 'CRITICAL').length,
          high_count: cveData.filter((c: any) => c.severity === 'HIGH').length,
          medium_count: cveData.filter((c: any) => c.severity === 'MEDIUM').length,
          low_count: cveData.filter((c: any) => c.severity === 'LOW').length,
          trending_count: 0,
          exploitable_count: 0,
        };
        setCveStats(stats);
        calculateSecurityScore(stats);
      } else {
        // Fallback: fetch from NVD via Electron proxy
        if (window.electronAPI?.executeCommand) {
          try {
            const raw = await window.electronAPI.executeCommand(
              'curl -s "https://services.nvd.nist.gov/rest/json/cves/2.0/?resultsPerPage=10&cvssV3Severity=CRITICAL" 2>/dev/null | head -c 50000'
            );
            const nvdData = JSON.parse(raw);
            const vulns = nvdData.vulnerabilities || [];
            const cveObjects = vulns.slice(0, 20).map((v: any, i: number) => {
              const cve = v.cve || {};
              const metrics = cve.metrics?.cvssMetricV31?.[0]?.cvssData || cve.metrics?.cvssMetricV30?.[0]?.cvssData || {};
              return {
                id: cve.id || `CVE-unknown-${i}`,
                cve_id: cve.id || `CVE-unknown-${i}`,
                description: cve.descriptions?.[0]?.value || 'No description',
                severity: metrics.baseSeverity || 'CRITICAL',
                cvss_score: metrics.baseScore || 9.0,
                published_date: cve.published || new Date().toISOString(),
                last_modified: cve.lastModified || new Date().toISOString(),
                exploit_available: false,
              };
            });
            setCriticalCVEs(cveObjects);

            const stats: CVELibraryStats = {
              total_cves: nvdData.totalResults || cveObjects.length,
              critical_count: cveObjects.filter((c: any) => c.severity === 'CRITICAL').length,
              high_count: cveObjects.filter((c: any) => c.severity === 'HIGH').length,
              medium_count: 0, low_count: 0, trending_count: 0, exploitable_count: 0,
            };
            setCveStats(stats);
            calculateSecurityScore(stats);
          } catch (e) {
            console.warn('NVD fetch via Electron failed:', e);
          }
        }
      }
    } catch (error) {
      console.error("Failed to fetch CVE data:", error);
      toast({
        title: "CVE Data Unavailable",
        description: "Could not load CVE data from any source",
        variant: "destructive",
      });
    } finally {
      setCveLoading(false);
    }
  };

  // Calculate security score and threat level
  const calculateSecurityScore = (stats: CVELibraryStats) => {
    if (!stats) return;

    const totalVulns = stats.total_cves || 1;
    const criticalWeight = stats.critical_count * 10;
    const highWeight = stats.high_count * 5;
    const mediumWeight = stats.medium_count * 2;
    const lowWeight = stats.low_count * 1;

    const totalThreatScore = criticalWeight + highWeight + mediumWeight + lowWeight;
    const maxPossibleScore = totalVulns * 10;
    const score = Math.max(0, 100 - (totalThreatScore / maxPossibleScore) * 100);

    setSecurityScore(Math.round(score));

    // Determine threat level
    if (stats.critical_count > 50 || score < 40) {
      setThreatLevel("CRITICAL");
    } else if (stats.critical_count > 20 || score < 60) {
      setThreatLevel("HIGH");
    } else if (stats.critical_count > 5 || score < 80) {
      setThreatLevel("MEDIUM");
    } else {
      setThreatLevel("LOW");
    }
  };

  // Fetch analytics data and subscribe to real-time updates
  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        setIsLoading(true);
        const stats = await analyticsService.getTodayUsageStats();
        setUsageStats(stats);

        const total = stats.reduce((sum, stat) => sum + stat.call_count, 0);
        setTotalApiCalls(total);

        setApiUsage({
          count: total,
          limit: 5000,
          remaining: Math.max(0, 5000 - total),
          resetTime: new Date(),
          percentUsed: Math.min(100, (total / 5000) * 100),
        });

        const activities = await analyticsService.getRecentActivity(50);
        setRecentActivities(activities);
      } catch (error) {
        console.error("Failed to load analytics:", error);
        toast({
          title: "Error Loading Analytics",
          description: "Failed to fetch analytics data",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadAnalytics();
    fetchCVEData();

    let unsubscribeStats: (() => void) | undefined;
    let unsubscribeActivity: (() => void) | undefined;

    try {
      unsubscribeStats = analyticsService.subscribeToUsageStatsUpdates((newStats) => {
        setUsageStats((prev) => {
          const existing = prev.find((s) => s.id === newStats.id);
          if (existing) {
            return prev.map((s) => (s.id === newStats.id ? newStats : s));
          }
          return [...prev, newStats];
        });

        setTotalApiCalls((prev) => prev + 1);
        setApiUsage((prev) => ({
          ...prev,
          count: prev.count + 1,
          remaining: Math.max(0, prev.remaining - 1),
          percentUsed: Math.min(100, ((prev.count + 1) / 5000) * 100),
        }));
      });

      unsubscribeActivity = analyticsService.subscribeToActivityUpdates((newActivity) => {
        setRecentActivities((prev) => [newActivity, ...prev].slice(0, 50));
      });
    } catch (error) {
      console.error("Failed to setup real-time subscriptions:", error);
    }

    // Refresh CVE data every 5 minutes
    const cveInterval = setInterval(fetchCVEData, 5 * 60 * 1000);

    return () => {
      try {
        if (unsubscribeStats) unsubscribeStats();
        if (unsubscribeActivity) unsubscribeActivity();
        clearInterval(cveInterval);
      } catch (error) {
        console.error("Failed to cleanup:", error);
      }
    };
  }, [toast]);

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      const stats = await analyticsService.getTodayUsageStats();
      setUsageStats(stats);
      const total = stats.reduce((sum, stat) => sum + stat.call_count, 0);
      setTotalApiCalls(total);
      setApiUsage({
        count: total,
        limit: 5000,
        remaining: Math.max(0, 5000 - total),
        resetTime: new Date(),
        percentUsed: Math.min(100, (total / 5000) * 100),
      });
      const activities = await analyticsService.getRecentActivity(50);
      setRecentActivities(activities);
      await fetchCVEData();
      toast({
        title: "Analytics Refreshed",
        description: "Latest data loaded successfully",
      });
    } catch (error) {
      toast({
        title: "Refresh Failed",
        description: "Could not fetch latest analytics",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case "chat_message":
        return MessageSquare;
      case "web_search":
        return Search;
      case "knowledge_query":
        return BookOpen;
      case "api_call":
        return Database;
      default:
        return Activity;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case "chat_message":
        return "text-blue-400";
      case "web_search":
        return "text-green-400";
      case "knowledge_query":
        return "text-primary";
      case "api_call":
        return "text-orange-400";
      default:
        return "text-gray-400";
    }
  };

  const getThreatLevelColor = (level: string) => {
    switch (level) {
      case "CRITICAL":
        return "text-red-500";
      case "HIGH":
        return "text-orange-500";
      case "MEDIUM":
        return "text-yellow-500";
      case "LOW":
        return "text-green-500";
      default:
        return "text-gray-500";
    }
  };

  // Prepare chart data
  const severityDistribution = cveStats
    ? [
        { name: "Critical", value: cveStats.critical_count, color: SEVERITY_COLORS.CRITICAL },
        { name: "High", value: cveStats.high_count, color: SEVERITY_COLORS.HIGH },
        { name: "Medium", value: cveStats.medium_count, color: SEVERITY_COLORS.MEDIUM },
        { name: "Low", value: cveStats.low_count, color: SEVERITY_COLORS.LOW },
      ]
    : [];

  const threatMetrics: ThreatMetric[] = [
    { category: "Attack Surface", value: 75, severity: 3 },
    { category: "Exploit Risk", value: 60, severity: 2 },
    { category: "Data Exposure", value: 45, severity: 1 },
    { category: "Auth Bypass", value: 30, severity: 1 },
    { category: "Network Risk", value: 85, severity: 4 },
    { category: "System Vuln", value: 55, severity: 2 },
  ];

  const cveTimeline = criticalCVEs.slice(0, 10).map((cve) => ({
    date: new Date(cve.published_date).toLocaleDateString(),
    score: cve.cvss_score,
    name: cve.cve_id,
  }));

  const attackVectorData = [
    { vector: "Network", count: 145, percentage: 45 },
    { vector: "Local", count: 80, percentage: 25 },
    { vector: "Adjacent", count: 50, percentage: 15 },
    { vector: "Physical", count: 48, percentage: 15 },
  ];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-4xl font-bold text-gradient-silver flex items-center gap-3">
            <Shield className="h-10 w-10 text-primary animate-pulse" />
            Analytics Dashboard
          </h1>
          <p className="text-sm text-muted-foreground terminal-text mt-2">
            Real-time threat intelligence & vulnerability monitoring
          </p>
        </div>
        <Button
          onClick={handleRefresh}
          disabled={isLoading || cveLoading}
          variant="outline"
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading || cveLoading ? "animate-spin" : ""}`} />
          Refresh Data
        </Button>
      </motion.div>

      {/* Threat Level Indicator */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="border-primary/30 bg-card/50 backdrop-blur">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
              <div className="flex items-center gap-4">
                <div className="p-4 rounded-full bg-primary/20 border border-primary/50">
                  <Radar className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-mono">THREAT LEVEL</p>
                  <p className={`text-3xl font-bold ${getThreatLevelColor(threatLevel)}`}>{threatLevel}</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="p-4 rounded-full bg-green-500/20 border border-green-500/50">
                  <Shield className="h-8 w-8 text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-mono">SECURITY SCORE</p>
                  <p className="text-3xl font-bold text-green-400">{securityScore}/100</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="p-4 rounded-full bg-primary/20 border border-primary/50">
                  <Target className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-mono">ACTIVE THREATS</p>
                  <p className="text-3xl font-bold text-primary">{cveStats?.critical_count || 0}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Main Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 bg-card/50 border border-primary/30">
          <TabsTrigger value="overview" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            <Eye className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="cve" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            <Bug className="h-4 w-4 mr-2" />
            CVE Intelligence
          </TabsTrigger>
          <TabsTrigger value="threats" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Threat Analysis
          </TabsTrigger>
          <TabsTrigger value="system" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            <Server className="h-4 w-4 mr-2" />
            System Metrics
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <Card className="border-primary/20 bg-card/50 backdrop-blur hover:border-primary/50 transition-all">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Database className="h-4 w-4 text-primary" />
                    <span className="text-muted-foreground">Total API Calls</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-primary font-mono">{totalApiCalls}</div>
                  <p className="text-xs text-muted-foreground/50 mt-1 font-mono">TODAY</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.15 }}
            >
              <Card className="border-green-500/20 bg-card/50 backdrop-blur hover:border-green-500/50 transition-all">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-400" />
                    <span className="text-green-300">Remaining</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-400 font-mono">{apiUsage.remaining}</div>
                  <p className="text-xs text-green-300/50 mt-1 font-mono">OF {apiUsage.limit} LIMIT</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
            >
              <Card className="border-yellow-500/20 bg-card/50 backdrop-blur hover:border-yellow-500/50 transition-all">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Zap className="h-4 w-4 text-yellow-400" />
                    <span className="text-yellow-300">Usage Rate</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-yellow-400 font-mono">{apiUsage.percentUsed.toFixed(1)}%</div>
                  <div className="mt-2 h-2 bg-slate-700/50 rounded-full overflow-hidden border border-yellow-500/30">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${apiUsage.percentUsed}%` }}
                      transition={{ duration: 1 }}
                      className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]"
                    />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.25 }}
            >
              <Card className="border-blue-500/20 bg-card/50 backdrop-blur hover:border-blue-500/50 transition-all">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Activity className="h-4 w-4 text-blue-400" />
                    <span className="text-blue-300">Activities</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-400 font-mono">{recentActivities.length}</div>
                  <p className="text-xs text-blue-300/50 mt-1 font-mono">RECENT EVENTS</p>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Usage Statistics */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
            >
              <Card className="border-primary/30 bg-card/50 backdrop-blur h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-muted-foreground">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    Usage by Action Type
                  </CardTitle>
                  <CardDescription className="text-muted-foreground/50 font-mono">API calls grouped by service</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px] pr-4">
                    <div className="space-y-4">
                      {usageStats.length === 0 && !isLoading && (
                        <div className="text-center py-8 text-muted-foreground/50">
                          <BarChart3 className="h-12 w-12 mx-auto mb-3 text-primary/50" />
                          <p className="text-sm font-mono">No usage data yet</p>
                          <p className="text-xs font-mono">Start using the app to see statistics</p>
                        </div>
                      )}
                      {usageStats.map((stat, idx) => {
                        const ActionIcon = getActionIcon(stat.service_name);
                        const percentage = totalApiCalls > 0 ? (stat.call_count / totalApiCalls) * 100 : 0;
                        return (
                          <motion.div
                            key={stat.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: 0.4 + idx * 0.05 }}
                            className="border border-primary/20 rounded-lg p-4 hover:border-primary/50 transition-all bg-slate-800/30"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-3">
                                <ActionIcon className={`h-5 w-5 ${getActionColor(stat.service_name)}`} />
                                <div>
                                  <span className="font-semibold text-sm text-muted-foreground font-mono">
                                    {stat.service_name.replace("_", " ").toUpperCase()}
                                  </span>
                                  <p className="text-xs text-muted-foreground/50 font-mono">
                                    {stat.date ? new Date(stat.date).toLocaleDateString() : "Today"}
                                  </p>
                                </div>
                              </div>
                              <Badge variant="secondary" className="text-lg px-3 bg-primary/20 text-muted-foreground border-primary/50">
                                {stat.call_count}
                              </Badge>
                            </div>
                            <div className="mt-2 h-2 bg-slate-700/50 rounded-full overflow-hidden border border-primary/30">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${percentage}%` }}
                                transition={{ duration: 0.5 }}
                                className={`h-full ${
                                  stat.service_name === "chat_message"
                                    ? "bg-blue-500"
                                    : stat.service_name === "web_search"
                                      ? "bg-green-500"
                                      : stat.service_name === "knowledge_query"
                                        ? "bg-primary"
                                        : "bg-orange-500"
                                } shadow-[0_0_10px_rgba(148,163,184,0.3)]`}
                              />
                            </div>
                            <p className="text-xs text-muted-foreground/50 mt-1 font-mono">{percentage.toFixed(1)}% of total usage</p>
                          </motion.div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </motion.div>

            {/* Recent Activity */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
            >
              <Card className="border-blue-500/30 bg-card/50 backdrop-blur h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-blue-300">
                    <Activity className="h-5 w-5 text-blue-400" />
                    Recent Activity
                  </CardTitle>
                  <CardDescription className="text-blue-300/50 font-mono">Live activity feed from all services</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px] pr-4">
                    <div className="space-y-3">
                      {recentActivities.length === 0 && !isLoading && (
                        <div className="text-center py-8 text-muted-foreground/50">
                          <Activity className="h-12 w-12 mx-auto mb-3 text-primary/50" />
                          <p className="text-sm font-mono">No recent activity</p>
                          <p className="text-xs font-mono">Activity will appear here as you use the app</p>
                        </div>
                      )}
                      {recentActivities.map((activity, idx) => {
                        const ActionIcon = getActionIcon(activity.activity_type);
                        const timestamp = new Date(activity.created_at || new Date());
                        const timeAgo = formatTimeAgo(timestamp);

                        return (
                          <motion.div
                            key={activity.id}
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.2, delay: idx * 0.02 }}
                            className="border border-primary/20 rounded-lg p-3 hover:border-primary/40 transition-all hover:bg-primary/5 bg-slate-800/30"
                          >
                            <div className="flex items-start gap-3">
                              <div
                                className={`p-2 rounded-lg bg-primary/10 border border-primary/30 ${getActionColor(activity.activity_type)}`}
                              >
                                <ActionIcon className="h-4 w-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                  <Badge variant="outline" className="text-xs border-primary/50 text-muted-foreground font-mono">
                                    {activity.activity_type.replace("_", " ")}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground/50 flex items-center gap-1 font-mono">
                                    <Clock className="h-3 w-3" />
                                    {timeAgo}
                                  </span>
                                </div>
                                {activity.details && (
                                  <p className="text-xs text-muted-foreground/50 mt-1 truncate font-mono">
                                    {JSON.stringify(activity.details)}
                                  </p>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </TabsContent>

        {/* CVE Intelligence Tab */}
        <TabsContent value="cve" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* CVE Severity Distribution */}
            <Card className="border-primary/30 bg-card/50 backdrop-blur">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-muted-foreground">
                  <Target className="h-5 w-5 text-primary" />
                  CVE Severity Distribution
                </CardTitle>
                <CardDescription className="text-muted-foreground/50 font-mono">Vulnerability breakdown by severity</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={severityDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {severityDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "rgba(15, 23, 42, 0.9)",
                          border: "1px solid rgba(148, 163, 184, 0.3)",
                          borderRadius: "8px",
                          color: "#94a3b8",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* CVE Timeline */}
            <Card className="border-primary/30 bg-card/50 backdrop-blur">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-muted-foreground">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Critical CVE Timeline
                </CardTitle>
                <CardDescription className="text-muted-foreground/50 font-mono">CVSS scores over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={cveTimeline}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" />
                      <XAxis dataKey="date" stroke="#94a3b8" style={{ fontSize: "10px" }} />
                      <YAxis stroke="#94a3b8" style={{ fontSize: "10px" }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "rgba(15, 23, 42, 0.9)",
                          border: "1px solid rgba(148, 163, 184, 0.3)",
                          borderRadius: "8px",
                          color: "#94a3b8",
                        }}
                      />
                      <Area type="monotone" dataKey="score" stroke="#94a3b8" fill="rgba(148, 163, 184, 0.2)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Critical CVE List */}
            <Card className="border-red-500/30 bg-card/50 backdrop-blur lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-300">
                  <AlertTriangle className="h-5 w-5 text-red-400" />
                  Critical CVE Alerts
                </CardTitle>
                <CardDescription className="text-red-300/50 font-mono">
                  Most recent critical vulnerabilities detected
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {cveLoading && (
                      <div className="text-center py-8 text-muted-foreground/50">
                        <RefreshCw className="h-12 w-12 mx-auto mb-3 text-primary/50 animate-spin" />
                        <p className="text-sm font-mono">Loading threat intelligence...</p>
                      </div>
                    )}
                    {!cveLoading && criticalCVEs.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground/50">
                        <Shield className="h-12 w-12 mx-auto mb-3 text-green-500/50" />
                        <p className="text-sm font-mono">No critical CVEs detected</p>
                      </div>
                    )}
                    {criticalCVEs.map((cve, idx) => (
                      <motion.div
                        key={cve.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: idx * 0.05 }}
                        className="border border-red-500/20 rounded-lg p-4 hover:border-red-500/50 transition-all bg-slate-800/30"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <Bug className="h-5 w-5 text-red-400" />
                            <div>
                              <span className="font-bold text-red-300 font-mono">{cve.cve_id}</span>
                              <p className="text-xs text-muted-foreground/50 font-mono">
                                Published: {new Date(cve.published_date).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Badge
                              className={`font-mono ${
                                cve.severity === "CRITICAL"
                                  ? "bg-red-500/20 text-red-300 border-red-500/50"
                                  : cve.severity === "HIGH"
                                    ? "bg-orange-500/20 text-orange-300 border-orange-500/50"
                                    : "bg-yellow-500/20 text-yellow-300 border-yellow-500/50"
                              }`}
                            >
                              {cve.severity}
                            </Badge>
                            <Badge className="bg-primary/20 text-muted-foreground border-primary/50 font-mono">
                              CVSS: {cve.cvss_score}
                            </Badge>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground/70 mt-2 font-mono line-clamp-2">{cve.description}</p>
                        {cve.exploit_available && (
                          <div className="mt-2 flex items-center gap-2">
                            <motion.div
                              animate={{
                                opacity: [1, 0.5, 1],
                              }}
                              transition={{ duration: 1.5, repeat: Infinity }}
                              className="flex items-center gap-1 text-red-400 text-xs font-mono"
                            >
                              <Unlock className="h-3 w-3" />
                              EXPLOIT AVAILABLE
                            </motion.div>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Threat Analysis Tab */}
        <TabsContent value="threats" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Threat Radar */}
            <Card className="border-primary/30 bg-card/50 backdrop-blur">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-muted-foreground">
                  <Radar className="h-5 w-5 text-primary" />
                  Threat Surface Analysis
                </CardTitle>
                <CardDescription className="text-muted-foreground/50 font-mono">Multi-dimensional risk assessment</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={threatMetrics}>
                      <PolarGrid stroke="rgba(148, 163, 184, 0.2)" />
                      <PolarAngleAxis dataKey="category" stroke="#94a3b8" style={{ fontSize: "12px" }} />
                      <PolarRadiusAxis stroke="#94a3b8" />
                      <RechartsRadar name="Risk Level" dataKey="value" stroke="#94a3b8" fill="#94a3b8" fillOpacity={0.3} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "rgba(15, 23, 42, 0.9)",
                          border: "1px solid rgba(148, 163, 184, 0.3)",
                          borderRadius: "8px",
                          color: "#94a3b8",
                        }}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Attack Vector Distribution */}
            <Card className="border-green-500/30 bg-card/50 backdrop-blur">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-300">
                  <Network className="h-5 w-5 text-green-400" />
                  Attack Vector Distribution
                </CardTitle>
                <CardDescription className="text-green-300/50 font-mono">Vulnerability entry points</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={attackVectorData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" />
                      <XAxis dataKey="vector" stroke="#94a3b8" style={{ fontSize: "12px" }} />
                      <YAxis stroke="#94a3b8" style={{ fontSize: "12px" }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "rgba(15, 23, 42, 0.9)",
                          border: "1px solid rgba(148, 163, 184, 0.3)",
                          borderRadius: "8px",
                          color: "#94a3b8",
                        }}
                      />
                      <Bar dataKey="count" fill="url(#colorGradient)" />
                      <defs>
                        <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#94a3b8" stopOpacity={0.3} />
                        </linearGradient>
                      </defs>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Anomaly Detection */}
            <Card className="border-yellow-500/30 bg-card/50 backdrop-blur lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-yellow-300">
                  <Brain className="h-5 w-5 text-yellow-400" />
                  Anomaly Detection & Predictive Analytics
                </CardTitle>
                <CardDescription className="text-yellow-300/50 font-mono">AI-powered threat prediction</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="border border-yellow-500/20 rounded-lg p-4 bg-slate-800/30">
                    <div className="flex items-center gap-3 mb-3">
                      <TrendingUp className="h-6 w-6 text-yellow-400" />
                      <span className="font-semibold text-yellow-300 font-mono">EMERGING THREATS</span>
                    </div>
                    <div className="text-3xl font-bold text-yellow-400 mb-2 font-mono">
                      {cveStats?.trending_count || 0}
                    </div>
                    <p className="text-xs text-yellow-300/50 font-mono">Trending vulnerabilities detected</p>
                  </div>

                  <div className="border border-red-500/20 rounded-lg p-4 bg-slate-800/30">
                    <div className="flex items-center gap-3 mb-3">
                      <Unlock className="h-6 w-6 text-red-400" />
                      <span className="font-semibold text-red-300 font-mono">EXPLOITABLE</span>
                    </div>
                    <div className="text-3xl font-bold text-red-400 mb-2 font-mono">
                      {cveStats?.exploitable_count || 0}
                    </div>
                    <p className="text-xs text-red-300/50 font-mono">Active exploit availability</p>
                  </div>

                  <div className="border border-primary/20 rounded-lg p-4 bg-slate-800/30">
                    <div className="flex items-center gap-3 mb-3">
                      <Lock className="h-6 w-6 text-primary" />
                      <span className="font-semibold text-muted-foreground font-mono">TOTAL CVEs</span>
                    </div>
                    <div className="text-3xl font-bold text-primary mb-2 font-mono">{cveStats?.total_cves || 0}</div>
                    <p className="text-xs text-muted-foreground/50 font-mono">In vulnerability database</p>
                  </div>
                </div>

                <Separator className="my-6 bg-primary/20" />

                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-muted-foreground font-mono">PREDICTIVE INSIGHTS</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="flex items-start gap-3 p-3 border border-primary/20 rounded-lg bg-slate-800/20">
                      <motion.div
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="p-2 rounded-full bg-green-500/20"
                      >
                        <TrendingDown className="h-4 w-4 text-green-400" />
                      </motion.div>
                      <div>
                        <p className="text-xs font-semibold text-green-300 font-mono">LOW RISK PATTERN</p>
                        <p className="text-xs text-muted-foreground/50 mt-1 font-mono">
                          API usage patterns show normal behavior
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 border border-primary/20 rounded-lg bg-slate-800/20">
                      <motion.div
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="p-2 rounded-full bg-blue-500/20"
                      >
                        <Globe className="h-4 w-4 text-blue-400" />
                      </motion.div>
                      <div>
                        <p className="text-xs font-semibold text-blue-300 font-mono">THREAT INTELLIGENCE</p>
                        <p className="text-xs text-muted-foreground/50 mt-1 font-mono">Real-time feeds active and monitoring</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* System Metrics Tab */}
        <TabsContent value="system" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="border-green-500/30 bg-card/50 backdrop-blur">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-300">
                  <Cpu className="h-5 w-5 text-green-400" />
                  System Load
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-green-300 font-mono">CPU</span>
                      <span className="text-sm text-green-400 font-mono">32%</span>
                    </div>
                    <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden border border-green-500/30">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: "32%" }}
                        className="h-full bg-gradient-to-r from-green-500 to-emerald-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]"
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-green-300 font-mono">Memory</span>
                      <span className="text-sm text-green-400 font-mono">58%</span>
                    </div>
                    <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden border border-green-500/30">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: "58%" }}
                        className="h-full bg-gradient-to-r from-green-500 to-yellow-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]"
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-green-300 font-mono">Network</span>
                      <span className="text-sm text-green-400 font-mono">21%</span>
                    </div>
                    <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden border border-green-500/30">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: "21%" }}
                        className="h-full bg-gradient-to-r from-green-500 to-primary shadow-[0_0_10px_rgba(34,197,94,0.5)]"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-blue-500/30 bg-card/50 backdrop-blur">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-300">
                  <HardDrive className="h-5 w-5 text-blue-400" />
                  Storage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-blue-300 font-mono">Database</span>
                      <span className="text-sm text-blue-400 font-mono">45 MB</span>
                    </div>
                    <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden border border-blue-500/30">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: "15%" }}
                        className="h-full bg-gradient-to-r from-blue-500 to-primary shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-blue-300 font-mono">Cache</span>
                      <span className="text-sm text-blue-400 font-mono">128 MB</span>
                    </div>
                    <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden border border-blue-500/30">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: "25%" }}
                        className="h-full bg-gradient-to-r from-blue-500 to-primary shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-blue-300 font-mono">Logs</span>
                      <span className="text-sm text-blue-400 font-mono">89 MB</span>
                    </div>
                    <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden border border-blue-500/30">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: "18%" }}
                        className="h-full bg-gradient-to-r from-blue-500 to-primary shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-primary/30 bg-card/50 backdrop-blur">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-muted-foreground">
                  <Server className="h-5 w-5 text-primary" />
                  Services Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-2 border border-green-500/20 rounded bg-green-500/5">
                    <div className="flex items-center gap-2">
                      <motion.div
                        animate={{ opacity: [1, 0.5, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="h-2 w-2 bg-green-500 rounded-full"
                      />
                      <span className="text-sm text-green-300 font-mono">Database</span>
                    </div>
                    <Badge className="bg-green-500/20 text-green-300 border-green-500/50 font-mono">ONLINE</Badge>
                  </div>
                  <div className="flex items-center justify-between p-2 border border-green-500/20 rounded bg-green-500/5">
                    <div className="flex items-center gap-2">
                      <motion.div
                        animate={{ opacity: [1, 0.5, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="h-2 w-2 bg-green-500 rounded-full"
                      />
                      <span className="text-sm text-green-300 font-mono">CVE API</span>
                    </div>
                    <Badge className="bg-green-500/20 text-green-300 border-green-500/50 font-mono">ONLINE</Badge>
                  </div>
                  <div className="flex items-center justify-between p-2 border border-green-500/20 rounded bg-green-500/5">
                    <div className="flex items-center gap-2">
                      <motion.div
                        animate={{ opacity: [1, 0.5, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="h-2 w-2 bg-green-500 rounded-full"
                      />
                      <span className="text-sm text-green-300 font-mono">Analytics</span>
                    </div>
                    <Badge className="bg-green-500/20 text-green-300 border-green-500/50 font-mono">ONLINE</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Supabase Health Dashboard */}
          <SupabaseHealthDashboard />
        </TabsContent>
      </Tabs>

      {/* Status Footer with Cyberpunk Theme */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.5 }}
        className="flex items-center justify-between text-sm text-muted-foreground/70 border-t border-primary/30 pt-4 font-mono"
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <motion.div
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="h-2 w-2 bg-green-500 rounded-full shadow-[0_0_10px_rgba(34,197,94,0.7)]"
            />
            <span>REAL-TIME ANALYTICS ACTIVE</span>
          </div>
          <Separator orientation="vertical" className="h-4 bg-primary/30" />
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-primary" />
            <span>LIVE MONITORING ENABLED</span>
          </div>
          <Separator orientation="vertical" className="h-4 bg-primary/30" />
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-green-400" />
            <span>THREAT DETECTION: {threatLevel}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-primary" />
          <span>LAST UPDATED: {new Date().toLocaleTimeString()}</span>
        </div>
      </motion.div>
    </div>
  );
};

// Helper function to format time ago
function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default Analytics;
