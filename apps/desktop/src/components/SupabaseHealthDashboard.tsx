/**
 * Supabase Health Dashboard Component
 * Displays real-time health status and analytics for Supabase services
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
  Activity,
  Database,
  Zap,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Clock,
  Search,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { healthMonitor, type SupabaseHealth, type ServiceHealthStatus } from '@/services/supabase-health';

export const SupabaseHealthDashboard = () => {
  const [health, setHealth] = useState<SupabaseHealth | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Load initial health data and start monitoring
  useEffect(() => {
    const loadHealth = async () => {
      const data = await healthMonitor.checkHealth();
      setHealth(data);
      setLastUpdate(new Date());
    };

    loadHealth();
    healthMonitor.startMonitoring(60000); // Check every minute

    // Set up interval to update UI with cached data
    const interval = setInterval(() => {
      const cachedHealth = healthMonitor.getHealth();
      if (cachedHealth) {
        setHealth(cachedHealth);
        setLastUpdate(cachedHealth.lastUpdate);
      }
    }, 5000); // Update UI every 5 seconds

    return () => {
      clearInterval(interval);
      healthMonitor.stopMonitoring();
    };
  }, []);

  // Manual refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const data = await healthMonitor.checkHealth();
      setHealth(data);
      setLastUpdate(new Date());
    } finally {
      setIsRefreshing(false);
    }
  };

  // Get overall status icon
  const getOverallStatusIcon = () => {
    if (!health) return <Activity className="h-5 w-5 text-gray-500 animate-pulse" />;

    switch (health.overall) {
      case 'healthy':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'degraded':
        return <AlertTriangle className="h-5 w-5 text-yellow-500 animate-pulse" />;
      case 'down':
        return <XCircle className="h-5 w-5 text-red-500 animate-pulse" />;
      default:
        return <Activity className="h-5 w-5 text-gray-500" />;
    }
  };

  // Get service status badge
  const getStatusBadge = (status: ServiceHealthStatus['status']) => {
    const styles = {
      healthy: 'bg-green-500/20 text-green-400 border-green-500/50',
      degraded: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
      down: 'bg-red-500/20 text-red-400 border-red-500/50',
      unknown: 'bg-gray-500/20 text-gray-400 border-gray-500/50',
    };

    return (
      <Badge className={styles[status]}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  // Render service card
  const renderServiceCard = (service: ServiceHealthStatus, icon: React.ReactNode) => (
    <Card className="border-primary/20 bg-card/50 backdrop-blur">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {icon}
            <CardTitle className="text-sm font-medium">{service.name}</CardTitle>
          </div>
          {getStatusBadge(service.status)}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {service.responseTime !== undefined && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Response Time</span>
            <span className="font-mono font-bold">{service.responseTime}ms</span>
          </div>
        )}

        {service.usage && (
          <>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Usage</span>
              <span className="font-mono font-bold">
                {service.usage.current}/{service.usage.limit}
              </span>
            </div>
            <Progress value={service.usage.percentUsed} className="h-2" />
            <div className="flex items-center justify-between text-xs">
              <span className={healthMonitor.getUsageColor(service.usage.percentUsed)}>
                {service.usage.percentUsed.toFixed(1)}% used
              </span>
              <span className="text-muted-foreground">
                {service.usage.remaining} remaining
              </span>
            </div>
          </>
        )}

        {service.error && (
          <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded p-2 mt-2">
            Error: {service.error}
          </div>
        )}

        <div className="flex items-center gap-1 text-xs text-muted-foreground pt-2 border-t border-border/50">
          <Clock className="h-3 w-3" />
          {service.lastChecked.toLocaleTimeString()}
        </div>
      </CardContent>
    </Card>
  );

  // Render API usage analytics
  const renderAPIUsageCard = (service: 'openclaw' | 'inoreader' | 'tavily') => {
    if (!health) return null;

    const usage = health.apiUsage[service];
    const title = service === 'openclaw' ? 'OpenClaw VPS' : service === 'inoreader' ? 'Inoreader API' : 'Tavily Search API';
    const icon = service === 'openclaw' ? <Zap className="h-4 w-4 text-purple-400" /> :
                 service === 'inoreader' ? <Activity className="h-4 w-4 text-blue-400" /> :
                 <Activity className="h-4 w-4 text-cyan-400" />;

    const percentUsed = usage.percentUsed;
    const isNearLimit = percentUsed >= 70;
    const isAtLimit = usage.remaining <= 0;

    return (
      <Card className={`border-primary/20 bg-card/50 backdrop-blur ${isAtLimit ? 'border-red-500/50' : isNearLimit ? 'border-yellow-500/50' : ''}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {icon}
              <CardTitle className="text-sm font-medium">{title}</CardTitle>
            </div>
            {isAtLimit ? (
              <Badge className="bg-red-500/20 text-red-400 border-red-500/50 animate-pulse">
                LIMIT REACHED
              </Badge>
            ) : isNearLimit ? (
              <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50">
                NEAR LIMIT
              </Badge>
            ) : (
              <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                HEALTHY
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-muted-foreground">Daily Usage</span>
              <span className="font-mono font-bold">
                {usage.count.toLocaleString()}/{usage.limit.toLocaleString()}
              </span>
            </div>
            <Progress value={percentUsed} className="h-3" />
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground">Remaining</span>
              <div className="flex items-center gap-1">
                {usage.remaining > usage.limit * 0.3 ? (
                  <TrendingUp className="h-3 w-3 text-green-400" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-400" />
                )}
                <span className={`font-mono font-bold ${healthMonitor.getUsageColor(percentUsed)}`}>
                  {usage.remaining.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground">Percent Used</span>
              <span className={`font-mono font-bold ${healthMonitor.getUsageColor(percentUsed)}`}>
                {percentUsed.toFixed(1)}%
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t border-border/50">
            <Clock className="h-3 w-3" />
            <span>Resets at {usage.resetTime.toLocaleTimeString()}</span>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (!health) {
    return (
      <Card className="border-primary/20 bg-card/50 backdrop-blur">
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <RefreshCw className="h-12 w-12 mx-auto mb-4 text-primary animate-spin" />
            <p className="text-muted-foreground">Loading Supabase health status...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-4"
    >
      {/* Overall Status Card */}
      <Card className={`border-2 ${health.overall === 'healthy' ? 'border-green-500/50' : health.overall === 'degraded' ? 'border-yellow-500/50' : 'border-red-500/50'} bg-card/50 backdrop-blur`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getOverallStatusIcon()}
              <div>
                <CardTitle className="text-lg">Supabase Infrastructure Health</CardTitle>
                <CardDescription>
                  Real-time monitoring of backend services and API usage
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Overall Status:</span>
              <span className={`font-bold uppercase ${health.overall === 'healthy' ? 'text-green-400' : health.overall === 'degraded' ? 'text-yellow-400' : 'text-red-400'}`}>
                {health.overall}
              </span>
            </div>
            {lastUpdate && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <Clock className="h-3 w-3" />
                Last updated: {lastUpdate.toLocaleTimeString()}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Service Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {renderServiceCard(health.services.database, <Database className="h-4 w-4 text-blue-400" />)}
        {renderServiceCard(health.services.edgeFunctions, <Zap className="h-4 w-4 text-purple-400" />)}
        {renderServiceCard(health.services.openClaw || { status: 'unknown' }, <Activity className="h-4 w-4 text-green-400" />)}
        {renderServiceCard(health.services.inoreaderAPI, <Activity className="h-4 w-4 text-orange-400" />)}
        {renderServiceCard(health.services.tavilyAPI, <Search className="h-4 w-4 text-cyan-400" />)}
      </div>

      {/* API Usage Analytics */}
      <Card className="border-primary/20 bg-card/50 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            API Usage Analytics
          </CardTitle>
          <CardDescription>
            Daily API call limits and usage statistics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {renderAPIUsageCard('openclaw')}
            {renderAPIUsageCard('inoreader')}
            {renderAPIUsageCard('tavily')}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default SupabaseHealthDashboard;
