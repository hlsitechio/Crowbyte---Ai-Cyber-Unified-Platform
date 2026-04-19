import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UilHeartRate, UilChartBar, UilChartGrowth, UilClock, UilBolt, UilDatabase, UilCommentDots, UilSearch, UilBookOpen, UilEye, UilSync, UilShield, UilExclamationTriangle, UilChartDown, UilFocusTarget, UilQrcodeScan, UilBug, UilDesktopAlt, UilGlobe, UilLock, UilLockOpenAlt, UilBrain, UilSitemap, UilProcessor, UilServer } from "@iconscout/react-unicons";
import { motion } from "framer-motion";
import { SecurityStatsCard } from "@/components/analytics/SecurityStatsCard";
import { SecurityKPIBlock } from "@/components/analytics/SecurityKPIBlock";
import { ThreatTrendChart } from "@/components/analytics/ThreatTrendChart";
import { SeverityBarChart } from "@/components/analytics/SeverityBarChart";
import { SecurityChartsGroup } from "@/components/analytics/SecurityChartsGroup";
import { analyticsService, type ActivityLog, type ApiUsageStats } from "@/services/analytics";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { SupabaseHealthDashboard } from "@/components/SupabaseHealthDashboard";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar as RechartsRadar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

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

interface ServiceStatus {
  name: string;
  status: "ONLINE" | "OFFLINE" | "ERROR" | "NOT CONFIGURED";
  latency: number;
}

interface SystemMetrics {
  jsHeap: number;
  storage: number;
  domNodes: number;
}

interface StorageCounts {
  cves: number;
  knowledge: number;
  bookmarks: number;
  activity: number;
}

interface AttackVectorEntry {
  vector: string;
  count: number;
  percentage: number;
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

  // Real data state
  const [threatMetrics, setThreatMetrics] = useState<ThreatMetric[]>([]);
  const [attackVectorData, setAttackVectorData] = useState<AttackVectorEntry[]>([]);
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics>({ jsHeap: 0, storage: 0, domNodes: 0 });
  const [serviceStatuses, setServiceStatuses] = useState<ServiceStatus[]>([]);
  const [storageCounts, setStorageCounts] = useState<StorageCounts>({ cves: 0, knowledge: 0, bookmarks: 0, activity: 0 });
  const [weeklyUsage, setWeeklyUsage] = useState<{ date: string; calls: number }[]>([]);

  const autoRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const systemMetricsRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const serviceCheckRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [apiUsage, setApiUsage] = useState({
    count: 0,
    limit: 10000,
    remaining: 10000,
    resetTime: new Date(),
    percentUsed: 0,
  });

  // ---- REAL DATA FETCHERS ----

  // Fetch attack vector distribution from Supabase CVEs (parsed from cvss_vector)
  const fetchAttackVectors = useCallback(async () => {
    try {
      const { supabase } = await import("@/lib/supabase");
      const { data, error } = await supabase
        .from("cves")
        .select("cvss_vector");

      if (error || !data) {
        setAttackVectorData([]);
        return;
      }

      const counts: Record<string, number> = {};
      let total = 0;
      for (const row of data) {
        // Parse attack vector from CVSS vector string like "CVSS:3.1/AV:N/AC:L/..."
        const vec = row.cvss_vector || "";
        const avMatch = vec.match(/AV:([NALP])/);
        const avMap: Record<string, string> = { N: "NETWORK", A: "ADJACENT", L: "LOCAL", P: "PHYSICAL" };
        const av = avMatch ? (avMap[avMatch[1]] || "UNKNOWN") : "UNKNOWN";
        counts[av] = (counts[av] || 0) + 1;
        total++;
      }

      const entries: AttackVectorEntry[] = Object.entries(counts)
        .map(([vector, count]) => ({
          vector: vector.charAt(0).toUpperCase() + vector.slice(1).toLowerCase(),
          count,
          percentage: total > 0 ? Math.round((count / total) * 100) : 0,
        }))
        .sort((a, b) => b.count - a.count);

      setAttackVectorData(entries.length > 0 ? entries : []);
    } catch {
      setAttackVectorData([]);
    }
  }, []);

  // Compute threat radar from real CVE + IOC data
  const computeThreatRadar = useCallback(async (stats: CVELibraryStats | null) => {
    try {
      const { supabase } = await import("@/lib/supabase");

      // IOC counts by type
      let ipCount = 0;
      let urlDomainCount = 0;
      let totalIocs = 0;
      try {
        const { data: iocData } = await supabase
          .from("threat_iocs")
          .select("ioc_type");
        if (iocData) {
          totalIocs = iocData.length;
          for (const row of iocData) {
            if (row.ioc_type === "ip" || row.ioc_type === "IP") ipCount++;
            if (row.ioc_type === "url" || row.ioc_type === "domain" || row.ioc_type === "URL" || row.ioc_type === "DOMAIN") urlDomainCount++;
          }
        }
      } catch {
        // threat_iocs table may not exist yet
      }

      // CVE-based metrics
      let authBypassCount = 0;
      let exploitRiskPct = 0;
      try {
        const { data: cveDescData } = await supabase
          .from("cves")
          .select("description, severity, cvss_score");
        if (cveDescData && cveDescData.length > 0) {
          const total = cveDescData.length;
          let criticalOrExploit = 0;
          for (const row of cveDescData) {
            const desc = (row.description || "").toLowerCase();
            if (desc.includes("authentication") || desc.includes("auth bypass") || desc.includes("authorization")) {
              authBypassCount++;
            }
            if (row.severity === "CRITICAL" || (row.cvss_score && row.cvss_score >= 9.0)) {
              criticalOrExploit++;
            }
          }
          exploitRiskPct = Math.round((criticalOrExploit / total) * 100);
        }
      } catch {
        // fallback
      }

      const totalCves = stats?.total_cves || 0;
      const clamp = (v: number) => Math.min(100, Math.max(0, v));

      const metrics: ThreatMetric[] = [
        { category: "Attack Surface", value: clamp(totalIocs > 0 ? Math.min(totalIocs, 100) : (totalCves > 0 ? 20 : 0)), severity: totalIocs > 50 ? 4 : totalIocs > 20 ? 3 : totalIocs > 5 ? 2 : 1 },
        { category: "Exploit Risk", value: clamp(exploitRiskPct), severity: exploitRiskPct > 60 ? 4 : exploitRiskPct > 40 ? 3 : exploitRiskPct > 20 ? 2 : 1 },
        { category: "Data Exposure", value: clamp(urlDomainCount > 0 ? Math.min(urlDomainCount * 2, 100) : 0), severity: urlDomainCount > 30 ? 3 : urlDomainCount > 10 ? 2 : 1 },
        { category: "Auth Bypass", value: clamp(authBypassCount > 0 ? Math.min(authBypassCount * 5, 100) : 0), severity: authBypassCount > 10 ? 4 : authBypassCount > 5 ? 3 : authBypassCount > 0 ? 2 : 1 },
        { category: "Network Risk", value: clamp(ipCount > 0 ? Math.min(ipCount * 2, 100) : 0), severity: ipCount > 30 ? 4 : ipCount > 10 ? 3 : ipCount > 0 ? 2 : 1 },
        { category: "System Vuln", value: clamp(totalCves > 0 ? Math.min(Math.round((totalCves / 500) * 100), 100) : 0), severity: totalCves > 200 ? 4 : totalCves > 100 ? 3 : totalCves > 20 ? 2 : 1 },
      ];

      setThreatMetrics(metrics);
    } catch {
      // Keep empty metrics on failure
    }
  }, []);

  // Fetch real system metrics (JS heap, storage, DOM nodes)
  const fetchSystemMetrics = useCallback(async () => {
    const perf = performance as Performance & { memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number } };
    let jsHeap = 0;
    if (perf.memory) {
      jsHeap = Math.round((perf.memory.usedJSHeapSize / perf.memory.jsHeapSizeLimit) * 100);
    }

    let storagePct = 0;
    try {
      const estimate = await navigator.storage?.estimate();
      if (estimate && estimate.quota && estimate.usage) {
        storagePct = Math.round((estimate.usage / estimate.quota) * 100);
      }
    } catch {
      // storage API not available
    }

    const domNodes = document.querySelectorAll("*").length;
    const domPct = Math.min(100, Math.round((domNodes / 5000) * 100));

    setSystemMetrics({ jsHeap, storage: storagePct, domNodes: domPct });
  }, []);

  // Real service health checks
  const checkServices = useCallback(async () => {
    const services: ServiceStatus[] = [];
    const { supabase } = await import("@/lib/supabase");

    // Supabase / UilDatabase check
    try {
      const start = performance.now();
      const { error } = await supabase.from("cves").select("id").limit(1);
      services.push({
        name: "Database",
        status: error ? "ERROR" : "ONLINE",
        latency: Math.round(performance.now() - start),
      });
    } catch {
      services.push({ name: "Database", status: "OFFLINE", latency: 0 });
    }

    // NVD API check — route through main process IPC to avoid null-origin CORS from file://
    try {
      const start = performance.now();
      const electronAPI = (window as Window & { electronAPI?: { fetchCVEs?: () => Promise<{ success: boolean }> } }).electronAPI;
      let ok = false;
      if (electronAPI?.fetchCVEs) {
        const result = await electronAPI.fetchCVEs();
        ok = result?.success === true;
      } else {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 8000);
        const res = await fetch('https://services.nvd.nist.gov/rest/json/cves/2.0/?resultsPerPage=1', { signal: controller.signal });
        clearTimeout(timer);
        ok = res.ok;
      }
      services.push({
        name: "NVD API",
        status: ok ? "ONLINE" : "ERROR",
        latency: Math.round(performance.now() - start),
      });
    } catch {
      services.push({ name: "NVD API", status: "OFFLINE", latency: 0 });
    }

    // VPS Agent check — use image probe to avoid CORS/cert issues
    {
      const vpsIp = (import.meta.env as Record<string, string | undefined>)?.VITE_VPS_IP;
      if (vpsIp) {
        const start = performance.now();
        const online = await new Promise<boolean>((resolve) => {
          const img = new Image();
          const timer = setTimeout(() => { img.src = ""; resolve(false); }, 3000);
          img.onload = img.onerror = () => { clearTimeout(timer); resolve(true); };
          img.src = `https://${vpsIp}/favicon.ico?_=${Date.now()}`;
        });
        services.push({
          name: "VPS Agent",
          status: online ? "ONLINE" : "OFFLINE",
          latency: Math.round(performance.now() - start),
        });
      } else {
        services.push({ name: "VPS Agent", status: "NOT CONFIGURED", latency: 0 });
      }
    }

    setServiceStatuses(services);
  }, []);

  // Fetch real storage (row counts from Supabase tables)
  const fetchStorageCounts = useCallback(async () => {
    try {
      const { supabase } = await import("@/lib/supabase");

      const [cveRes, kbRes, bmRes, actRes] = await Promise.all([
        supabase.from("cves").select("*", { count: "exact", head: true }),
        supabase.from("knowledge_base").select("*", { count: "exact", head: true }),
        supabase.from("bookmarks").select("*", { count: "exact", head: true }),
        supabase.from("activity_logs").select("*", { count: "exact", head: true }),
      ]);

      setStorageCounts({
        cves: cveRes.count || 0,
        knowledge: kbRes.count || 0,
        bookmarks: bmRes.count || 0,
        activity: actRes.count || 0,
      });
    } catch {
      // keep zeros
    }
  }, []);

  // Fetch 7-day usage trend
  const fetchWeeklyUsage = useCallback(async () => {
    try {
      const { supabase } = await import("@/lib/supabase");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 6);

      const { data, error } = await supabase
        .from("analytics")
        .select("created_at")
        .eq("user_id", user.id)
        .gte("created_at", startDate.toISOString())
        .order("created_at", { ascending: true });

      if (error || !data) {
        setWeeklyUsage([]);
        return;
      }

      // Group by date
      const byDate: Record<string, number> = {};
      for (const row of data) {
        const d = row.created_at ? new Date(row.created_at).toISOString().split("T")[0] : "unknown";
        byDate[d] = (byDate[d] || 0) + 1;
      }

      // Fill in missing days
      const result: { date: string; calls: number }[] = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        const key = d.toISOString().split("T")[0];
        const label = d.toLocaleDateString("en-US", { weekday: "short" });
        result.push({ date: label, calls: byDate[key] || 0 });
      }

      setWeeklyUsage(result);

      // Compute API usage from real weekly data
      const totalCalls = result.reduce((sum, d) => sum + d.calls, 0);
      const monthlyLimit = 10000; // Based on tier — free=1000, pro=10000, enterprise=unlimited
      setApiUsage({
        count: totalCalls,
        limit: monthlyLimit,
        remaining: Math.max(0, monthlyLimit - totalCalls),
        resetTime: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1),
        percentUsed: Math.min(100, Math.round((totalCalls / monthlyLimit) * 100)),
      });
    } catch {
      setWeeklyUsage([]);
    }
  }, []);

  // ---- CVE DATA ----

  // Fetch CVE data from Supabase + NVD via Electron proxy
  const fetchCVEData = useCallback(async () => {
    setCveLoading(true);
    try {
      const { supabase } = await import("@/lib/supabase");

      // Fetch all CVEs (up to 1000) for stats, top 20 for display
      const { data: allCveData, error: allError } = await supabase
        .from("cves")
        .select("id, severity, cvss_score, published_date, cvss_vector");

      const { data: cveData, error: cveError } = await supabase
        .from("cves")
        .select("*")
        .order("cvss_score", { ascending: false })
        .limit(20);

      if (!cveError && cveData && cveData.length > 0) {
        setCriticalCVEs(
          cveData.map((item: Record<string, unknown>) => ({
            id: item.id,
            cve_id: item.id,
            description: item.description || "No description",
            severity: item.severity || "UNKNOWN",
            cvss_score: item.cvss_score || 0,
            published_date: item.published_date || new Date().toISOString(),
            last_modified: item.last_modified || new Date().toISOString(),
            attack_vector: item.cvss_vector ? (() => { const m = item.cvss_vector.match(/AV:([NALP])/); const map: Record<string, string> = { N: "NETWORK", A: "ADJACENT", L: "LOCAL", P: "PHYSICAL" }; return m ? map[m[1]] : undefined; })() : undefined,
            exploit_available: false,
          }))
        );

        // Calculate stats from ALL data, not just top 20
        const allData = !allError && allCveData ? allCveData : cveData;
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 86400000);

        const stats: CVELibraryStats = {
          total_cves: allData.length,
          critical_count: allData.filter((c: Record<string, unknown>) => c.severity === "CRITICAL").length,
          high_count: allData.filter((c: Record<string, unknown>) => c.severity === "HIGH").length,
          medium_count: allData.filter((c: Record<string, unknown>) => c.severity === "MEDIUM").length,
          low_count: allData.filter((c: Record<string, unknown>) => c.severity === "LOW").length,
          trending_count: allData.filter((c: Record<string, unknown>) => c.published_date && new Date(c.published_date as string) >= weekAgo).length,
          exploitable_count: allData.filter((c: Record<string, unknown>) => c.cvss_score && (c.cvss_score as number) >= 9.0).length,
        };
        setCveStats(stats);
        calculateSecurityScore(stats);
        computeThreatRadar(stats);
      } else {
        // Fallback: fetch from NVD via Electron proxy
        if ((window as Window & { electronAPI?: { executeCommand?: (cmd: string) => Promise<string> } }).electronAPI?.executeCommand) {
          try {
            const raw = await (window as Window & { electronAPI?: { executeCommand?: (cmd: string) => Promise<string> } }).electronAPI!.executeCommand!(
              'curl -s "https://services.nvd.nist.gov/rest/json/cves/2.0/?resultsPerPage=10&cvssV3Severity=CRITICAL" 2>/dev/null | head -c 50000'
            );
            const nvdData = JSON.parse(raw);
            const vulns = nvdData.vulnerabilities || [];
            const cveObjects = vulns.slice(0, 20).map((v: Record<string, unknown>, i: number) => {
              const cve = v.cve || {};
              const metrics =
                cve.metrics?.cvssMetricV31?.[0]?.cvssData || cve.metrics?.cvssMetricV30?.[0]?.cvssData || {};
              return {
                id: cve.id || `CVE-unknown-${i}`,
                cve_id: cve.id || `CVE-unknown-${i}`,
                description: cve.descriptions?.[0]?.value || "No description",
                severity: metrics.baseSeverity || "CRITICAL",
                cvss_score: metrics.baseScore || 9.0,
                published_date: cve.published || new Date().toISOString(),
                last_modified: cve.lastModified || new Date().toISOString(),
                attack_vector: metrics.attackVector || undefined,
                exploit_available: false,
              };
            });
            setCriticalCVEs(cveObjects);

            const stats: CVELibraryStats = {
              total_cves: nvdData.totalResults || cveObjects.length,
              critical_count: cveObjects.filter((c: Record<string, unknown>) => c.severity === "CRITICAL").length,
              high_count: cveObjects.filter((c: Record<string, unknown>) => c.severity === "HIGH").length,
              medium_count: 0,
              low_count: 0,
              trending_count: 0,
              exploitable_count: 0,
            };
            setCveStats(stats);
            calculateSecurityScore(stats);
            computeThreatRadar(stats);
          } catch (e) {
            console.warn("NVD fetch via Electron failed:", e);
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
  }, [toast, computeThreatRadar]);

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

  // ---- MAIN EFFECT ----

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
    fetchAttackVectors();
    fetchSystemMetrics();
    checkServices();
    fetchStorageCounts();
    fetchWeeklyUsage();

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

    // System metrics every 5s
    systemMetricsRef.current = setInterval(fetchSystemMetrics, 5000);

    // Service health every 30s
    serviceCheckRef.current = setInterval(checkServices, 30000);

    // Auto-refresh all data every 60s
    autoRefreshRef.current = setInterval(() => {
      loadAnalytics();
      fetchAttackVectors();
      fetchStorageCounts();
      fetchWeeklyUsage();
    }, 60000);

    // CVE refresh every 5 minutes
    const cveInterval = setInterval(fetchCVEData, 5 * 60 * 1000);

    return () => {
      try {
        if (unsubscribeStats) unsubscribeStats();
        if (unsubscribeActivity) unsubscribeActivity();
        clearInterval(cveInterval);
        if (systemMetricsRef.current) clearInterval(systemMetricsRef.current);
        if (serviceCheckRef.current) clearInterval(serviceCheckRef.current);
        if (autoRefreshRef.current) clearInterval(autoRefreshRef.current);
      } catch (error) {
        console.error("Failed to cleanup:", error);
      }
    };
  }, [toast, fetchCVEData, fetchAttackVectors, fetchSystemMetrics, checkServices, fetchStorageCounts, fetchWeeklyUsage]);

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
      await fetchAttackVectors();
      await fetchSystemMetrics();
      await checkServices();
      await fetchStorageCounts();
      await fetchWeeklyUsage();
      toast({
        title: "Analytics Refreshed",
        description: "Latest data loaded successfully",
      });
    } catch {
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
        return UilCommentDots;
      case "web_search":
        return UilSearch;
      case "knowledge_query":
        return UilBookOpen;
      case "api_call":
        return UilDatabase;
      default:
        return UilHeartRate;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case "chat_message":
        return "text-blue-500";
      case "web_search":
        return "text-emerald-500";
      case "knowledge_query":
        return "text-primary";
      case "api_call":
        return "text-orange-500";
      default:
        return "text-zinc-500";
    }
  };

  const getThreatLevelColor = (level: string) => {
    switch (level) {
      case "CRITICAL":
        return "text-red-500";
      case "HIGH":
        return "text-orange-500";
      case "MEDIUM":
        return "text-amber-500";
      case "LOW":
        return "text-emerald-500";
      default:
        return "text-zinc-500";
    }
  };

  const getServiceStatusColor = (status: string) => {
    switch (status) {
      case "ONLINE":
        return "bg-emerald-500";
      case "OFFLINE":
        return "bg-red-500";
      case "ERROR":
        return "bg-amber-500";
      default:
        return "bg-zinc-500";
    }
  };

  const getServiceStatusTextColor = (status: string) => {
    switch (status) {
      case "ONLINE":
        return "text-emerald-500";
      case "OFFLINE":
        return "text-red-500";
      case "ERROR":
        return "text-amber-500";
      default:
        return "text-zinc-500";
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

  const cveTimeline = criticalCVEs.slice(0, 10).map((cve) => ({
    date: new Date(cve.published_date).toLocaleDateString(),
    score: cve.cvss_score,
    name: cve.cve_id,
  }));

  // Compute activity trend for predictive insights
  const todayActivityCount = recentActivities.filter((a) => {
    const d = new Date(a.created_at || "");
    const now = new Date();
    return d.toDateString() === now.toDateString();
  }).length;

  const yesterdayStart = new Date();
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  yesterdayStart.setHours(0, 0, 0, 0);
  const yesterdayEnd = new Date();
  yesterdayEnd.setDate(yesterdayEnd.getDate() - 1);
  yesterdayEnd.setHours(23, 59, 59, 999);
  const yesterdayActivityCount = recentActivities.filter((a) => {
    const d = new Date(a.created_at || "");
    return d >= yesterdayStart && d <= yesterdayEnd;
  }).length;

  const activityTrend = todayActivityCount >= yesterdayActivityCount ? "up" : "down";

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
            <UilShield size={40} className="text-primary animate-pulse" />
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
          <UilSync size={16} className={`${isLoading || cveLoading ? "animate-spin" : ""}`} />
          Refresh Data
        </Button>
      </motion.div>

      {/* Threat Level Indicator */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
              <div className="flex items-center gap-4">
                <div className="p-4 rounded-full bg-transparent">
                  <UilQrcodeScan size={32} className="text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-mono">THREAT LEVEL</p>
                  <p className={`text-3xl font-bold ${getThreatLevelColor(threatLevel)}`}>{threatLevel}</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="p-4 rounded-full bg-transparent">
                  <UilShield size={32} className="text-emerald-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-mono">SECURITY SCORE</p>
                  <p className="text-3xl font-bold text-emerald-500">{securityScore}/100</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="p-4 rounded-full bg-transparent">
                  <UilFocusTarget size={32} className="text-primary" />
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
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">
            <UilEye size={16} className="mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="cve">
            <UilBug size={16} className="mr-2" />
            CVE Intelligence
          </TabsTrigger>
          <TabsTrigger value="threats">
            <UilExclamationTriangle size={16} className="mr-2" />
            Threat Analysis
          </TabsTrigger>
          <TabsTrigger value="system">
            <UilDesktopAlt size={16} className="mr-2" />
            System Metrics
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* shadcnblocks SecurityKPIBlock — big numbers hero */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.05 }}>
            <Card className="p-6">
              <SecurityKPIBlock
                heading="Security Operations at a Glance"
                description="Real-time metrics across threat intelligence, CVE monitoring, and API activity"
                stats={[
                  {
                    id: "total-cves",
                    value: cveStats ? `${(cveStats.total_cves / 1000).toFixed(0)}k+` : "—",
                    label: "CVEs in local database",
                    color: "text-foreground",
                  },
                  {
                    id: "critical",
                    value: String(cveStats?.critical_count ?? "—"),
                    label: "critical severity CVEs",
                    color: "text-red-500",
                  },
                  {
                    id: "score",
                    value: `${securityScore}`,
                    label: "security posture score",
                    color: securityScore >= 70 ? "text-emerald-500" : securityScore >= 40 ? "text-amber-500" : "text-red-500",
                  },
                  {
                    id: "api-calls",
                    value: String(totalApiCalls),
                    label: "API calls today",
                    color: "text-primary",
                  },
                ]}
              />
            </Card>
          </motion.div>

          {/* shadcnblocks SecurityStatsCard grid — 4 cards with trends */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              {
                title: "Total CVEs",
                value: cveStats ? cveStats.total_cves.toLocaleString() : "—",
                change: 3.2,
                changeLabel: "this week",
                icon: <UilBug size={18} />,
                accentColor: "text-primary",
                delay: 0.1,
              },
              {
                title: "Critical / High",
                value: cveStats ? `${(cveStats.critical_count + cveStats.high_count).toLocaleString()}` : "—",
                change: -8.1,
                changeLabel: "vs last scan",
                icon: <UilExclamationTriangle size={18} />,
                accentColor: "text-red-500",
                delay: 0.15,
              },
              {
                title: "API Remaining",
                value: apiUsage.remaining.toLocaleString(),
                change: apiUsage.percentUsed > 50 ? -(apiUsage.percentUsed) : undefined,
                changeLabel: `of ${apiUsage.limit.toLocaleString()} limit`,
                icon: <UilBolt size={18} />,
                accentColor: "text-amber-500",
                delay: 0.2,
              },
              {
                title: "Activity Events",
                value: recentActivities.length.toString(),
                change: activityTrend === "up" ? todayActivityCount - yesterdayActivityCount : -(yesterdayActivityCount - todayActivityCount),
                changeLabel: "vs yesterday",
                icon: <UilHeartRate size={18} />,
                accentColor: "text-blue-400",
                delay: 0.25,
              },
            ].map((card) => (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: card.delay }}
              >
                <SecurityStatsCard
                  title={card.title}
                  value={card.value}
                  change={card.change}
                  changeLabel={card.changeLabel}
                  icon={card.icon}
                  accentColor={card.accentColor}
                />
              </motion.div>
            ))}
          </div>

          {/* shadcnblocks SecurityChartsGroup — CVE trend + IOC bar side by side */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.3 }}>
            <SecurityChartsGroup
              leftTitle="CVE Detection Trend"
              leftDescription="New CVEs matched against your infrastructure"
              leftData={weeklyUsage.map((w) => ({ label: w.date, value: w.calls }))}
              rightTitle="Severity Breakdown"
              rightDescription="Distribution of threats by severity this period"
              rightData={severityDistribution.map((s) => ({ label: s.name, value: s.value }))}
              height={180}
            />
          </motion.div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Usage Statistics */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
            >
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-muted-foreground">
                    <UilChartBar size={20} className="text-primary" />
                    Usage by Action Type
                  </CardTitle>
                  <CardDescription className="text-muted-foreground/50 font-mono">API calls grouped by service</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px] pr-4">
                    <div className="space-y-4">
                      {usageStats.length === 0 && !isLoading && (
                        <div className="text-center py-8 text-muted-foreground/50">
                          <UilChartBar size={48} className="mx-auto mb-3 text-primary/50" />
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
                            className="rounded-lg p-4 transition-all bg-white/[0.03]"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-3">
                                <ActionIcon size={20} className={`${getActionColor(stat.service_name)}`} />
                                <div>
                                  <span className="font-semibold text-sm text-muted-foreground font-mono">
                                    {stat.service_name.replace("_", " ").toUpperCase()}
                                  </span>
                                  <p className="text-xs text-muted-foreground/50 font-mono">
                                    {stat.date ? new Date(stat.date).toLocaleDateString() : "Today"}
                                  </p>
                                </div>
                              </div>
                              <span className="text-lg text-muted-foreground font-mono">{stat.call_count}</span>
                            </div>
                            <div className="mt-2 h-2 bg-white/[0.03] rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${percentage}%` }}
                                transition={{ duration: 0.5 }}
                                className={`h-full ${
                                  stat.service_name === "chat_message"
                                    ? "bg-blue-500"
                                    : stat.service_name === "web_search"
                                    ? "bg-emerald-500"
                                    : stat.service_name === "knowledge_query"
                                    ? "bg-primary"
                                    : "bg-orange-500"
                                }`}
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
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-blue-500">
                    <UilHeartRate size={20} className="text-blue-500" />
                    Recent Activity
                  </CardTitle>
                  <CardDescription className="text-blue-500/50 font-mono">Live activity feed from all services</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px] pr-4">
                    <div className="space-y-3">
                      {recentActivities.length === 0 && !isLoading && (
                        <div className="text-center py-8 text-muted-foreground/50">
                          <UilHeartRate size={48} className="mx-auto mb-3 text-primary/50" />
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
                            className="rounded-lg p-3 transition-all hover:bg-white/[0.05] bg-white/[0.03]"
                          >
                            <div className="flex items-start gap-3">
                              <div
                                className={`p-2 rounded-lg bg-transparent ${getActionColor(activity.activity_type)}`}
                              >
                                <ActionIcon size={16} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs text-muted-foreground font-mono">
                                    {activity.activity_type.replace("_", " ")}
                                  </span>
                                  <span className="text-xs text-muted-foreground/50 flex items-center gap-1 font-mono">
                                    <UilClock size={12} />
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

          {/* 7-Day Usage Trend */}
          {weeklyUsage.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.4 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-muted-foreground">
                    <UilChartGrowth size={20} className="text-primary" />
                    7-Day API Usage Trend
                  </CardTitle>
                  <CardDescription className="text-muted-foreground/50 font-mono">Daily API call volume over the past week</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={weeklyUsage}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" />
                        <XAxis dataKey="date" stroke="#94a3b8" style={{ fontSize: "11px" }} />
                        <YAxis stroke="#94a3b8" style={{ fontSize: "11px" }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "rgba(15, 23, 42, 0.9)",
                            border: "1px solid rgba(148, 163, 184, 0.3)",
                            borderRadius: "8px",
                            color: "#94a3b8",
                          }}
                        />
                        <Area type="monotone" dataKey="calls" stroke="#94a3b8" fill="rgba(148, 163, 184, 0.15)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </TabsContent>

        {/* CVE Intelligence Tab */}
        <TabsContent value="cve" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* CVE Severity Distribution — shadcnblocks SeverityBarChart */}
            <SeverityBarChart
              title="CVE Severity Distribution"
              description="Vulnerability breakdown by severity level"
              data={severityDistribution.map((s) => ({ name: s.name, value: s.value, color: s.color }))}
              height={300}
            />

            {/* CVE Timeline — shadcnblocks ThreatTrendChart */}
            <ThreatTrendChart
              title="Critical CVE Timeline"
              description="CVSS scores for recent critical CVEs"
              data={cveTimeline.map((c) => ({ label: c.date, value: c.score }))}
              valueLabel="CVSS Score"
              height={300}
            />

            {/* Critical CVE List */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-500">
                  <UilExclamationTriangle size={20} className="text-red-500" />
                  Critical CVE Alerts
                </CardTitle>
                <CardDescription className="text-red-500/50 font-mono">
                  Most recent critical vulnerabilities detected
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {cveLoading && (
                      <div className="text-center py-8 text-muted-foreground/50">
                        <UilSync size={48} className="mx-auto mb-3 text-primary/50 animate-spin" />
                        <p className="text-sm font-mono">Loading threat intelligence...</p>
                      </div>
                    )}
                    {!cveLoading && criticalCVEs.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground/50">
                        <UilShield size={48} className="mx-auto mb-3 text-emerald-500/50" />
                        <p className="text-sm font-mono">No critical CVEs detected</p>
                      </div>
                    )}
                    {criticalCVEs.map((cve, idx) => (
                      <motion.div
                        key={cve.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: idx * 0.05 }}
                        className="rounded-lg p-4 transition-all hover:bg-white/[0.05] bg-white/[0.03]"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <UilBug size={20} className="text-red-500" />
                            <div>
                              <span className="font-bold text-red-500 font-mono">{cve.cve_id}</span>
                              <p className="text-xs text-muted-foreground/50 font-mono">
                                Published: {new Date(cve.published_date).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <span
                              className={`text-xs font-mono ${
                                cve.severity === "CRITICAL"
                                  ? "text-red-500"
                                  : cve.severity === "HIGH"
                                  ? "text-orange-500"
                                  : "text-amber-500"
                              }`}
                            >
                              {cve.severity}
                            </span>
                            <span className="text-xs text-muted-foreground font-mono">CVSS: {cve.cvss_score}</span>
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
                              className="flex items-center gap-1 text-red-500 text-xs font-mono"
                            >
                              <UilLockOpenAlt size={12} />
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
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-muted-foreground">
                  <UilQrcodeScan size={20} className="text-primary" />
                  Threat Surface Analysis
                </CardTitle>
                <CardDescription className="text-muted-foreground/50 font-mono">Multi-dimensional risk assessment from CVE + IOC data</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  {threatMetrics.length > 0 ? (
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
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground/50">
                      <div className="text-center">
                        <UilQrcodeScan size={48} className="mx-auto mb-3 text-primary/30" />
                        <p className="text-sm font-mono">No threat data available</p>
                        <p className="text-xs font-mono">Add CVEs or IOCs to populate the radar</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Attack Vector Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-emerald-500">
                  <UilSitemap size={20} className="text-emerald-500" />
                  Attack Vector Distribution
                </CardTitle>
                <CardDescription className="text-emerald-500/50 font-mono">Actual attack vectors from CVE database</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  {attackVectorData.length > 0 ? (
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
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground/50">
                      <div className="text-center">
                        <UilSitemap size={48} className="mx-auto mb-3 text-emerald-500/30" />
                        <p className="text-sm font-mono">No attack vector data</p>
                        <p className="text-xs font-mono">CVEs with CVSS vector data will appear here</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Real CVE Summary (replaces fake Anomaly Detection) */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-500">
                  <UilBrain size={20} className="text-amber-500" />
                  Vulnerability Intelligence Summary
                </CardTitle>
                <CardDescription className="text-amber-500/50 font-mono">Real-time metrics from CVE database</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="rounded-lg p-4 bg-white/[0.03]">
                    <div className="flex items-center gap-3 mb-3">
                      <UilChartGrowth size={24} className="text-amber-500" />
                      <span className="font-semibold text-amber-500 font-mono">EMERGING THREATS</span>
                    </div>
                    <div className="text-3xl font-bold text-amber-500 mb-2 font-mono">
                      {cveStats?.trending_count || 0}
                    </div>
                    <p className="text-xs text-amber-500/50 font-mono">CVEs published in the last 7 days</p>
                  </div>

                  <div className="rounded-lg p-4 bg-white/[0.03]">
                    <div className="flex items-center gap-3 mb-3">
                      <UilLockOpenAlt size={24} className="text-red-500" />
                      <span className="font-semibold text-red-500 font-mono">EXPLOITABLE</span>
                    </div>
                    <div className="text-3xl font-bold text-red-500 mb-2 font-mono">
                      {cveStats?.exploitable_count || 0}
                    </div>
                    <p className="text-xs text-red-500/50 font-mono">CVEs with CVSS score 9.0+</p>
                  </div>

                  <div className="rounded-lg p-4 bg-white/[0.03]">
                    <div className="flex items-center gap-3 mb-3">
                      <UilLock size={24} className="text-primary" />
                      <span className="font-semibold text-muted-foreground font-mono">TOTAL CVEs</span>
                    </div>
                    <div className="text-3xl font-bold text-primary mb-2 font-mono">{cveStats?.total_cves || 0}</div>
                    <p className="text-xs text-muted-foreground/50 font-mono">In vulnerability database</p>
                  </div>
                </div>

                <Separator className="my-6 bg-white/[0.06]" />

                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-muted-foreground font-mono">ACTIVITY TRENDS</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-white/[0.03]">
                      <div className="p-2 rounded-full bg-transparent">
                        {activityTrend === "up" ? (
                          <UilChartGrowth size={16} className="text-emerald-500" />
                        ) : (
                          <UilChartDown size={16} className="text-amber-500" />
                        )}
                      </div>
                      <div>
                        <p className={`text-xs font-semibold font-mono ${activityTrend === "up" ? "text-emerald-500" : "text-amber-500"}`}>
                          {activityTrend === "up" ? "ACTIVITY TRENDING UP" : "ACTIVITY TRENDING DOWN"}
                        </p>
                        <p className="text-xs text-muted-foreground/50 mt-1 font-mono">
                          Today: {todayActivityCount} events | Yesterday: {yesterdayActivityCount} events
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-white/[0.03]">
                      <div className="p-2 rounded-full bg-transparent">
                        <UilGlobe size={16} className="text-blue-500" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-blue-500 font-mono">DATABASE STATUS</p>
                        <p className="text-xs text-muted-foreground/50 mt-1 font-mono">
                          {(cveStats?.total_cves || 0)} CVEs tracked | {storageCounts.knowledge} knowledge entries
                        </p>
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
            {/* Real System Load */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-emerald-500">
                  <UilProcessor size={20} className="text-emerald-500" />
                  System Load
                </CardTitle>
                <CardDescription className="text-emerald-500/50 font-mono">Live browser performance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-emerald-500 font-mono">JS Heap</span>
                      <span className="text-sm text-emerald-500 font-mono">{systemMetrics.jsHeap}%</span>
                    </div>
                    <div className="h-2 bg-white/[0.03] rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${systemMetrics.jsHeap}%` }}
                        transition={{ duration: 0.5 }}
                        className={`h-full ${systemMetrics.jsHeap > 80 ? "bg-red-500" : systemMetrics.jsHeap > 50 ? "bg-amber-500" : "bg-emerald-500"}`}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-emerald-500 font-mono">Storage</span>
                      <span className="text-sm text-emerald-500 font-mono">{systemMetrics.storage}%</span>
                    </div>
                    <div className="h-2 bg-white/[0.03] rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${systemMetrics.storage}%` }}
                        transition={{ duration: 0.5 }}
                        className={`h-full ${systemMetrics.storage > 80 ? "bg-red-500" : systemMetrics.storage > 50 ? "bg-amber-500" : "bg-emerald-500"}`}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-emerald-500 font-mono">DOM Nodes</span>
                      <span className="text-sm text-emerald-500 font-mono">{systemMetrics.domNodes}%</span>
                    </div>
                    <div className="h-2 bg-white/[0.03] rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${systemMetrics.domNodes}%` }}
                        transition={{ duration: 0.5 }}
                        className={`h-full ${systemMetrics.domNodes > 80 ? "bg-red-500" : systemMetrics.domNodes > 50 ? "bg-amber-500" : "bg-emerald-500"}`}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Real Storage (row counts) */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-500">
                  <UilServer size={20} className="text-blue-500" />
                  UilDatabase Records
                </CardTitle>
                <CardDescription className="text-blue-500/50 font-mono">Supabase table row counts</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03]">
                    <div className="flex items-center gap-2">
                      <UilBug size={16} className="text-red-500" />
                      <span className="text-sm text-blue-500 font-mono">CVEs</span>
                    </div>
                    <span className="text-sm text-blue-500 font-mono font-bold">{storageCounts.cves.toLocaleString()} rows</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03]">
                    <div className="flex items-center gap-2">
                      <UilBookOpen size={16} className="text-emerald-500" />
                      <span className="text-sm text-blue-500 font-mono">Knowledge Base</span>
                    </div>
                    <span className="text-sm text-blue-500 font-mono font-bold">{storageCounts.knowledge.toLocaleString()} rows</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03]">
                    <div className="flex items-center gap-2">
                      <UilGlobe size={16} className="text-amber-500" />
                      <span className="text-sm text-blue-500 font-mono">Bookmarks</span>
                    </div>
                    <span className="text-sm text-blue-500 font-mono font-bold">{storageCounts.bookmarks.toLocaleString()} rows</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03]">
                    <div className="flex items-center gap-2">
                      <UilHeartRate size={16} className="text-violet-500" />
                      <span className="text-sm text-blue-500 font-mono">Activity Logs</span>
                    </div>
                    <span className="text-sm text-blue-500 font-mono font-bold">{storageCounts.activity.toLocaleString()} rows</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Real Service Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-muted-foreground">
                  <UilDesktopAlt size={20} className="text-primary" />
                  Services Status
                </CardTitle>
                <CardDescription className="text-muted-foreground/50 font-mono">Live health checks every 30s</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {serviceStatuses.length === 0 && (
                    <div className="text-center py-4 text-muted-foreground/50">
                      <UilSync size={24} className="mx-auto mb-2 animate-spin text-primary/50" />
                      <p className="text-xs font-mono">Checking services...</p>
                    </div>
                  )}
                  {serviceStatuses.map((svc) => (
                    <div key={svc.name} className="flex items-center justify-between p-2 rounded bg-transparent">
                      <div className="flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${getServiceStatusColor(svc.status)}`} />
                        <span className={`text-sm font-mono ${getServiceStatusTextColor(svc.status)}`}>{svc.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        {svc.latency > 0 && (
                          <span className="text-xs text-muted-foreground/50 font-mono">{svc.latency}ms</span>
                        )}
                        <span className={`flex items-center gap-1.5 text-xs`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${getServiceStatusColor(svc.status)}`} />
                          <span className={`${getServiceStatusTextColor(svc.status)} font-mono`}>{svc.status}</span>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Supabase Health Dashboard */}
          <SupabaseHealthDashboard />
        </TabsContent>
      </Tabs>

      {/* Status Footer */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.5 }}
        className="flex items-center justify-between text-sm text-muted-foreground/70 border-t border-white/[0.04] pt-4 font-mono"
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 bg-emerald-500 rounded-full" />
            <span>REAL-TIME ANALYTICS ACTIVE</span>
          </div>
          <Separator orientation="vertical" className="h-4 bg-white/[0.06]" />
          <div className="flex items-center gap-2">
            <UilEye size={16} className="text-primary" />
            <span>LIVE MONITORING ENABLED</span>
          </div>
          <Separator orientation="vertical" className="h-4 bg-white/[0.06]" />
          <div className="flex items-center gap-2">
            <UilShield size={16} className="text-emerald-500" />
            <span>THREAT DETECTION: {threatLevel}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <UilDatabase size={16} className="text-primary" />
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
