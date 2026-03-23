import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Shield, Search, RefreshCw, AlertTriangle, TrendingUp, Database, Rss,
  Activity, Globe, Hash, Link2, Server, Eye, Clock, Zap, CheckCircle2,
  XCircle, Wifi, Bug, Skull, ExternalLink
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { motion, AnimatePresence } from "framer-motion";

// ── Types ──

interface ThreatIOC {
  id: string;
  ioc_type: string;
  value: string;
  feed_name: string;
  confidence: number;
  severity: string;
  tags: string[];
  first_seen: string;
  last_seen: string;
  description?: string;
  metadata: Record<string, unknown>;
}

interface ThreatFeed {
  id: string;
  name: string;
  url: string;
  feed_type: string;
  format: string;
  enabled: boolean;
  refresh_interval_min: number;
  last_fetched?: string;
  last_count: number;
  last_error?: string;
}

interface IOCStats {
  total: number;
  by_type: Record<string, number>;
  by_severity: Record<string, number>;
  by_feed: Record<string, number>;
  new_today: number;
}

// ── Constants ──

const severityColors: Record<string, string> = {
  critical: '#dc2626',
  high: '#f97316',
  medium: '#eab308',
  low: '#22c55e',
  info: '#6b7280',
};

const severityBg: Record<string, string> = {
  critical: 'bg-red-500/10 border-red-500/30',
  high: 'bg-orange-500/10 border-orange-500/30',
  medium: 'bg-yellow-500/10 border-yellow-500/30',
  low: 'bg-green-500/10 border-green-500/30',
  info: 'bg-zinc-500/10 border-zinc-500/30',
};

const iocTypeIcons: Record<string, typeof Globe> = {
  ipv4: Server,
  ipv6: Server,
  domain: Globe,
  url: Link2,
  md5: Hash,
  sha1: Hash,
  sha256: Hash,
  cidr: Wifi,
  cve: Bug,
  email: Zap,
};

const CHART_COLORS = ['#dc2626', '#f97316', '#eab308', '#22c55e', '#6b7280', '#3b82f6', '#8b5cf6', '#ec4899'];

// ── Component ──

const ThreatIntelligence = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<IOCStats>({ total: 0, by_type: {}, by_severity: {}, by_feed: {}, new_today: 0 });
  const [recentIOCs, setRecentIOCs] = useState<ThreatIOC[]>([]);
  const [feeds, setFeeds] = useState<ThreatFeed[]>([]);
  const [searchResults, setSearchResults] = useState<ThreatIOC[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState("all");
  const [searchSeverity, setSearchSeverity] = useState("all");
  const [searching, setSearching] = useState(false);
  const [searchCount, setSearchCount] = useState(0);
  const [checkResult, setCheckResult] = useState<ThreatIOC[] | null>(null);
  const [checkValue, setCheckValue] = useState("");

  // ── Data Fetching ──

  const fetchStats = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('threat_iocs')
        .select('ioc_type, severity, feed_name, created_at');

      if (error) throw error;

      const items = data || [];
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const by_type: Record<string, number> = {};
      const by_severity: Record<string, number> = {};
      const by_feed: Record<string, number> = {};
      let new_today = 0;

      for (const item of items) {
        by_type[item.ioc_type] = (by_type[item.ioc_type] || 0) + 1;
        by_severity[item.severity] = (by_severity[item.severity] || 0) + 1;
        by_feed[item.feed_name] = (by_feed[item.feed_name] || 0) + 1;
        if (new Date(item.created_at) >= todayStart) new_today++;
      }

      setStats({ total: items.length, by_type, by_severity, by_feed, new_today });
    } catch (err) {
      console.error('Failed to fetch stats:', err);
      toast.error("Failed to load threat stats");
    }
  }, []);

  const fetchRecent = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('threat_iocs')
        .select('*')
        .order('last_seen', { ascending: false })
        .limit(30);

      if (error) throw error;
      setRecentIOCs(data || []);
    } catch (err) {
      console.error('Failed to fetch recent IOCs:', err);
    }
  }, []);

  const fetchFeeds = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('threat_feeds')
        .select('*')
        .order('name');

      if (error) throw error;
      setFeeds(data || []);
    } catch (err) {
      console.error('Failed to fetch feeds:', err);
    }
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchStats(), fetchRecent(), fetchFeeds()]);
    setLoading(false);
  }, [fetchStats, fetchRecent, fetchFeeds]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ── Search ──

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      let query = supabase
        .from('threat_iocs')
        .select('*', { count: 'exact' })
        .ilike('value', `%${searchQuery}%`);

      if (searchType !== 'all') query = query.eq('ioc_type', searchType);
      if (searchSeverity !== 'all') query = query.eq('severity', searchSeverity);

      const { data, error, count } = await query
        .order('confidence', { ascending: false })
        .limit(100);

      if (error) throw error;
      setSearchResults(data || []);
      setSearchCount(count || 0);
      toast.success(`Found ${count || 0} matching IOCs`);
    } catch (err) {
      console.error('Search failed:', err);
      toast.error("Search failed");
    } finally {
      setSearching(false);
    }
  };

  // ── IOC Check ──

  const handleCheck = async () => {
    if (!checkValue.trim()) return;
    try {
      const { data, error } = await supabase
        .from('threat_iocs')
        .select('*')
        .eq('value', checkValue.trim())
        .order('confidence', { ascending: false });

      if (error) throw error;
      setCheckResult(data || []);

      if ((data || []).length === 0) {
        toast.success(`${checkValue} is CLEAN — not in any threat feed`);
      } else {
        toast.warning(`${checkValue} found in ${data?.length} threat feed(s)!`);
      }
    } catch (err) {
      toast.error("Check failed");
    }
  };

  // ── Feed Toggle ──

  const toggleFeed = async (id: string, enabled: boolean) => {
    try {
      const { error } = await supabase
        .from('threat_feeds')
        .update({ enabled })
        .eq('id', id);

      if (error) throw error;
      setFeeds(prev => prev.map(f => f.id === id ? { ...f, enabled } : f));
      toast.success(`Feed ${enabled ? 'enabled' : 'disabled'}`);
    } catch (err) {
      toast.error("Failed to update feed");
    }
  };

  // ── Chart Data ──

  const severityChartData = Object.entries(stats.by_severity)
    .map(([name, value]) => ({ name, value, color: severityColors[name] || '#888' }))
    .sort((a, b) => {
      const order = ['critical', 'high', 'medium', 'low', 'info'];
      return order.indexOf(a.name) - order.indexOf(b.name);
    });

  const typeChartData = Object.entries(stats.by_type)
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const feedChartData = Object.entries(stats.by_feed)
    .map(([feed, count]) => ({ feed: feed.replace(/_/g, ' '), count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);

  // ── Render Helpers ──

  const SeverityBadge = ({ severity }: { severity: string }) => (
    <Badge
      variant="outline"
      className="text-xs font-mono"
      style={{
        backgroundColor: `${severityColors[severity]}20`,
        borderColor: severityColors[severity],
        color: severityColors[severity],
      }}
    >
      {severity}
    </Badge>
  );

  const IOCTypeIcon = ({ type }: { type: string }) => {
    const Icon = iocTypeIcons[type] || Database;
    return <Icon className="h-4 w-4 text-muted-foreground" />;
  };

  const formatTimeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  // ── RENDER ──

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-[1800px] mx-auto space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                <Shield className="h-8 w-8 text-red-400" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Threat Intelligence</h1>
                <p className="text-muted-foreground">
                  {stats.total > 0 ? (
                    <>{stats.total.toLocaleString()} IOCs tracked across {Object.keys(stats.by_feed).length} feeds — {stats.new_today} new today</>
                  ) : (
                    <>IOC Aggregation Hub — Feed Dashboard, Search & Cross-Reference</>
                  )}
                </p>
              </div>
            </div>
            <Button onClick={loadAll} disabled={loading} variant="outline">
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </motion.div>

        {/* Quick Stats */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <Card className="border-border bg-card/50">
              <CardContent className="pt-4 pb-3 px-4">
                <div className="flex items-center gap-2 mb-1">
                  <Database className="h-4 w-4 text-blue-400" />
                  <span className="text-xs text-muted-foreground">Total IOCs</span>
                </div>
                <div className="text-2xl font-bold text-white">{stats.total.toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card className={`border ${severityBg.critical}`}>
              <CardContent className="pt-4 pb-3 px-4">
                <div className="flex items-center gap-2 mb-1">
                  <Skull className="h-4 w-4 text-red-400" />
                  <span className="text-xs text-muted-foreground">Critical</span>
                </div>
                <div className="text-2xl font-bold text-red-400">{(stats.by_severity.critical || 0).toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card className={`border ${severityBg.high}`}>
              <CardContent className="pt-4 pb-3 px-4">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="h-4 w-4 text-orange-400" />
                  <span className="text-xs text-muted-foreground">High</span>
                </div>
                <div className="text-2xl font-bold text-orange-400">{(stats.by_severity.high || 0).toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card className={`border ${severityBg.medium}`}>
              <CardContent className="pt-4 pb-3 px-4">
                <div className="flex items-center gap-2 mb-1">
                  <Activity className="h-4 w-4 text-yellow-400" />
                  <span className="text-xs text-muted-foreground">Medium</span>
                </div>
                <div className="text-2xl font-bold text-yellow-400">{(stats.by_severity.medium || 0).toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card className="border-border bg-card/50">
              <CardContent className="pt-4 pb-3 px-4">
                <div className="flex items-center gap-2 mb-1">
                  <Rss className="h-4 w-4 text-purple-400" />
                  <span className="text-xs text-muted-foreground">Active Feeds</span>
                </div>
                <div className="text-2xl font-bold text-purple-400">{feeds.filter(f => f.enabled).length}</div>
              </CardContent>
            </Card>
            <Card className="border-border bg-emerald-500/5 border-emerald-500/20">
              <CardContent className="pt-4 pb-3 px-4">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs text-muted-foreground">New Today</span>
                </div>
                <div className="text-2xl font-bold text-emerald-400">{stats.new_today.toLocaleString()}</div>
              </CardContent>
            </Card>
          </div>
        </motion.div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-zinc-900/50">
            <TabsTrigger value="dashboard" className="gap-2">
              <Activity className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="search" className="gap-2">
              <Search className="h-4 w-4" />
              IOC Search
            </TabsTrigger>
            <TabsTrigger value="check" className="gap-2">
              <Eye className="h-4 w-4" />
              IOC Check
            </TabsTrigger>
            <TabsTrigger value="feeds" className="gap-2">
              <Rss className="h-4 w-4" />
              Feed Manager
            </TabsTrigger>
          </TabsList>

          {/* ── DASHBOARD TAB ── */}
          <TabsContent value="dashboard" className="space-y-4 mt-4">
            {stats.total === 0 && !loading ? (
              <Card className="border-border">
                <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
                  <div className="bg-zinc-800 p-4 rounded-full">
                    <Database className="h-12 w-12 text-zinc-500" />
                  </div>
                  <div className="text-center">
                    <h3 className="text-xl font-bold text-white mb-2">No IOCs Yet</h3>
                    <p className="text-muted-foreground max-w-md">
                      Run <code className="bg-zinc-800 px-2 py-0.5 rounded text-emerald-400">ti-collector sync</code> from
                      the terminal to fetch IOCs from all 21 threat feeds. The data will appear here automatically.
                    </p>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="outline" className="text-xs">21 feeds configured</Badge>
                    <Badge variant="outline" className="text-xs">Supabase-backed</Badge>
                    <Badge variant="outline" className="text-xs">Real-time updates</Badge>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Severity Distribution */}
                <Card className="border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-white text-base">Severity Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={240}>
                      <PieChart>
                        <Pie
                          data={severityChartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={90}
                          paddingAngle={3}
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${value.toLocaleString()}`}
                        >
                          {severityChartData.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: 8 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* IOC Type Breakdown */}
                <Card className="border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-white text-base">IOC Type Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={typeChartData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                        <XAxis type="number" stroke="#666" />
                        <YAxis type="category" dataKey="type" stroke="#888" width={60} tick={{ fontSize: 12 }} />
                        <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: 8 }} />
                        <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Top Feeds */}
                <Card className="border-border lg:col-span-2">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-white text-base">IOCs by Feed Source</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={feedChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                        <XAxis dataKey="feed" stroke="#888" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={80} />
                        <YAxis stroke="#666" />
                        <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: 8 }} />
                        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                          {feedChartData.map((_, i) => (
                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Recent IOCs */}
                <Card className="border-border lg:col-span-2">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-white text-base">Recent IOCs</CardTitle>
                      <Badge variant="outline" className="text-xs">{recentIOCs.length} latest</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ScrollArea className="h-[400px]">
                      <div className="divide-y divide-border">
                        {recentIOCs.map((ioc) => (
                          <div key={ioc.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-800/50 transition-colors">
                            <IOCTypeIcon type={ioc.ioc_type} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-white font-mono text-sm truncate">{ioc.value}</span>
                                <SeverityBadge severity={ioc.severity} />
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                <span>{ioc.feed_name.replace(/_/g, ' ')}</span>
                                <span>·</span>
                                <span>{ioc.ioc_type}</span>
                                <span>·</span>
                                <span>conf {ioc.confidence}%</span>
                                {ioc.tags?.slice(0, 2).map(tag => (
                                  <Badge key={tag} variant="secondary" className="text-[10px] px-1 py-0">{tag}</Badge>
                                ))}
                              </div>
                            </div>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {formatTimeAgo(ioc.last_seen)}
                            </span>
                          </div>
                        ))}
                        {recentIOCs.length === 0 && (
                          <div className="py-12 text-center text-muted-foreground">
                            No IOCs yet. Run <code className="text-emerald-400">ti-collector sync</code> first.
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* ── SEARCH TAB ── */}
          <TabsContent value="search" className="space-y-4 mt-4">
            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-base">IOC Search</CardTitle>
                <CardDescription>Search across all threat feeds by IP, domain, URL, hash, or CVE</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <Input
                      placeholder="Search IP, domain, hash, URL, CVE..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                      className="font-mono"
                    />
                  </div>
                  <Select value={searchType} onValueChange={setSearchType}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="ipv4">IPv4</SelectItem>
                      <SelectItem value="domain">Domain</SelectItem>
                      <SelectItem value="url">URL</SelectItem>
                      <SelectItem value="sha256">SHA256</SelectItem>
                      <SelectItem value="md5">MD5</SelectItem>
                      <SelectItem value="cidr">CIDR</SelectItem>
                      <SelectItem value="cve">CVE</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={searchSeverity} onValueChange={setSearchSeverity}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Severity</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={handleSearch} disabled={searching || !searchQuery.trim()}>
                    {searching ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    <span className="ml-2">Search</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <Card className="border-border">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-white text-base">Results</CardTitle>
                    <Badge variant="outline">{searchCount} total matches</Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[500px]">
                    <div className="divide-y divide-border">
                      {searchResults.map((ioc) => (
                        <div key={ioc.id} className="px-4 py-3 hover:bg-zinc-800/50 transition-colors">
                          <div className="flex items-center gap-3">
                            <IOCTypeIcon type={ioc.ioc_type} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-white font-mono text-sm">{ioc.value}</span>
                                <SeverityBadge severity={ioc.severity} />
                                <Badge variant="secondary" className="text-xs">{ioc.ioc_type}</Badge>
                                <Badge variant="outline" className="text-xs">conf {ioc.confidence}%</Badge>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                <span className="font-medium">{ioc.feed_name.replace(/_/g, ' ')}</span>
                                <span>·</span>
                                <span>First: {new Date(ioc.first_seen).toLocaleDateString()}</span>
                                <span>·</span>
                                <span>Last: {formatTimeAgo(ioc.last_seen)}</span>
                                {ioc.tags?.map(tag => (
                                  <Badge key={tag} variant="secondary" className="text-[10px] px-1 py-0">{tag}</Badge>
                                ))}
                              </div>
                              {ioc.description && (
                                <p className="text-xs text-muted-foreground mt-1 truncate">{ioc.description}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ── IOC CHECK TAB ── */}
          <TabsContent value="check" className="space-y-4 mt-4">
            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-base">IOC Reputation Check</CardTitle>
                <CardDescription>Check if an IP, domain, hash, or URL appears in any threat feed</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-3">
                  <Input
                    placeholder="Enter exact IP, domain, hash, or URL to check..."
                    value={checkValue}
                    onChange={(e) => setCheckValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCheck()}
                    className="font-mono flex-1"
                  />
                  <Button onClick={handleCheck} disabled={!checkValue.trim()}>
                    <Eye className="h-4 w-4 mr-2" />
                    Check
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Check Result */}
            <AnimatePresence>
              {checkResult !== null && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  {checkResult.length === 0 ? (
                    <Card className="border-emerald-500/30 bg-emerald-500/5">
                      <CardContent className="flex items-center gap-4 py-8 justify-center">
                        <CheckCircle2 className="h-10 w-10 text-emerald-400" />
                        <div>
                          <h3 className="text-xl font-bold text-emerald-400">CLEAN</h3>
                          <p className="text-muted-foreground">
                            <code className="text-white font-mono">{checkValue}</code> was not found in any threat feed
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card className="border-red-500/30 bg-red-500/5">
                      <CardHeader className="pb-2">
                        <div className="flex items-center gap-3">
                          <XCircle className="h-6 w-6 text-red-400" />
                          <div>
                            <CardTitle className="text-red-400">MALICIOUS — Found in {checkResult.length} feed(s)</CardTitle>
                            <CardDescription className="font-mono">{checkValue}</CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {checkResult.map((ioc) => (
                            <div key={ioc.id} className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800">
                              <div className="flex items-center gap-2 mb-2">
                                <SeverityBadge severity={ioc.severity} />
                                <span className="text-white font-medium">{ioc.feed_name.replace(/_/g, ' ')}</span>
                                <Badge variant="outline" className="text-xs">conf {ioc.confidence}%</Badge>
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-muted-foreground">
                                <div><span className="text-zinc-500">Type:</span> {ioc.ioc_type}</div>
                                <div><span className="text-zinc-500">First:</span> {new Date(ioc.first_seen).toLocaleDateString()}</div>
                                <div><span className="text-zinc-500">Last:</span> {new Date(ioc.last_seen).toLocaleDateString()}</div>
                                <div><span className="text-zinc-500">Tags:</span> {ioc.tags?.join(', ')}</div>
                              </div>
                              {ioc.description && (
                                <p className="text-xs text-muted-foreground mt-2">{ioc.description}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </TabsContent>

          {/* ── FEED MANAGER TAB ── */}
          <TabsContent value="feeds" className="space-y-4 mt-4">
            {feeds.length === 0 ? (
              <Card className="border-border">
                <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
                  <Rss className="h-12 w-12 text-zinc-500" />
                  <div className="text-center">
                    <h3 className="text-xl font-bold text-white mb-2">No Feeds Registered</h3>
                    <p className="text-muted-foreground max-w-md">
                      Run <code className="bg-zinc-800 px-2 py-0.5 rounded text-emerald-400">ti-collector sync</code> to
                      fetch from all 21 feeds. Feed metadata will be auto-registered here.
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3">
                {feeds.map((feed) => (
                  <motion.div key={feed.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <Card className={`border-border hover:border-zinc-600 transition-colors ${!feed.enabled ? 'opacity-60' : ''}`}>
                      <CardContent className="py-3 px-4">
                        <div className="flex items-center gap-4">
                          <Switch
                            checked={feed.enabled}
                            onCheckedChange={(checked) => toggleFeed(feed.id, checked)}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-white font-medium">{feed.name.replace(/_/g, ' ')}</span>
                              <Badge variant="secondary" className="text-xs">{feed.feed_type}</Badge>
                              <Badge variant="outline" className="text-xs">{feed.format}</Badge>
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5 truncate">{feed.url}</div>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <div className="text-right">
                              <div className="text-white font-mono">{feed.last_count.toLocaleString()}</div>
                              <div>IOCs</div>
                            </div>
                            <div className="text-right">
                              {feed.last_fetched ? (
                                <>
                                  <div className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {formatTimeAgo(feed.last_fetched)}
                                  </div>
                                  <div>Last sync</div>
                                </>
                              ) : (
                                <span className="text-zinc-500">Never synced</span>
                              )}
                            </div>
                            {feed.last_error ? (
                              <XCircle className="h-4 w-4 text-red-400" title={feed.last_error} />
                            ) : feed.last_fetched ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                            ) : null}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ThreatIntelligence;
