/**
 * Supabase Health Dashboard Component
 * Displays real-time health status and analytics for Supabase services
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { UilHeartRate, UilDatabase, UilBolt, UilExclamationTriangle, UilCheckCircle, UilTimesCircle, UilSync, UilChartGrowth, UilChartDown, UilClock, UilSearch } from "@iconscout/react-unicons";
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
 if (!health) return <UilHeartRate size={20} className="text-gray-500 animate-pulse" />;

 switch (health.overall) {
 case 'healthy':
 return <UilCheckCircle size={20} className="text-emerald-500" />;
 case 'degraded':
 return <UilExclamationTriangle size={20} className="text-yellow-500 animate-pulse" />;
 case 'down':
 return <UilTimesCircle size={20} className="text-red-500 animate-pulse" />;
 default:
 return <UilHeartRate size={20} className="text-gray-500" />;
 }
 };

 // Get service status badge
 const getStatusBadge = (status: ServiceHealthStatus['status']) => {
 const dotColors = {
 healthy: 'bg-emerald-500',
 degraded: 'bg-amber-500',
 down: 'bg-red-500',
 unknown: 'bg-zinc-500',
 };
 const textColors = {
 healthy: 'text-emerald-500',
 degraded: 'text-amber-500',
 down: 'text-red-500',
 unknown: 'text-zinc-500',
 };

 return (
 <span className="flex items-center gap-1.5 text-xs">
 <span className={`w-1.5 h-1.5 rounded-full ${dotColors[status]}`} />
 <span className={textColors[status]}>{status.toUpperCase()}</span>
 </span>
 );
 };

 // Render service card
 const renderServiceCard = (service: ServiceHealthStatus, icon: React.ReactNode) => (
 <Card className="bg-card/50 backdrop-blur">
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
 <div className="text-xs text-red-500 bg-transparent rounded p-2 ring-1 ring-red-500/10 mt-2">
 Error: {service.error}
 </div>
 )}

 <div className="flex items-center gap-1 text-xs text-muted-foreground pt-2 border-t border-white/[0.04]">
 <UilClock size={12} />
 {service.lastChecked ? new Date(service.lastChecked).toLocaleTimeString() : 'Checking...'}
 </div>
 </CardContent>
 </Card>
 );

 const renderAPIUsageCard = (service: string) => {
 // Render API usage analytics
 if (!health) return null;

 const usage = health.apiUsage[service];
 const title = service.charAt(0).toUpperCase() + service.slice(1);
 const icon = service === 'openclaw' ? <UilBolt size={16} className="text-violet-500" /> :
 <UilHeartRate size={16} className="text-cyan-500" />;

 const percentUsed = usage.percentUsed;
 const isNearLimit = percentUsed >= 70;
 const isAtLimit = usage.remaining <= 0;

 return (
 <Card className={`bg-card/50 backdrop-blur ${isAtLimit ? 'ring-1 ring-red-500/20' : isNearLimit ? 'ring-1 ring-yellow-500/20' : ''}`}>
 <CardHeader className="pb-3">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2">
 {icon}
 <CardTitle className="text-sm font-medium">{title}</CardTitle>
 </div>
 {isAtLimit ? (
 <span className="flex items-center gap-1.5 text-xs">
 <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
 <span className="text-red-500">LIMIT REACHED</span>
 </span>
 ) : isNearLimit ? (
 <span className="flex items-center gap-1.5 text-xs">
 <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
 <span className="text-amber-500">NEAR LIMIT</span>
 </span>
 ) : (
 <span className="flex items-center gap-1.5 text-xs">
 <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
 <span className="text-emerald-500">HEALTHY</span>
 </span>
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
 <UilChartGrowth size={12} className="text-emerald-500" />
 ) : (
 <UilChartDown size={12} className="text-red-500" />
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

 <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t border-white/[0.04]">
 <UilClock size={12} />
 <span>Resets at {usage.resetTime ? new Date(usage.resetTime).toLocaleTimeString() : 'N/A'}</span>
 </div>
 </CardContent>
 </Card>
 );
 };

 if (!health) {
 return (
 <Card className="bg-card/50 backdrop-blur">
 <CardContent className="flex items-center justify-center h-64">
 <div className="text-center">
 <UilSync size={48} className="mx-auto mb-4 text-primary animate-spin" />
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
 <Card className={`ring-1 ${health.overall === 'healthy' ? 'ring-emerald-500/20' : health.overall === 'degraded' ? 'ring-yellow-500/20' : 'ring-red-500/20'} bg-card/50 backdrop-blur`}>
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
 <UilSync size={16} className={isRefreshing ? 'animate-spin' : ''} />
 Refresh
 </Button>
 </div>
 </div>
 </CardHeader>
 <CardContent>
 <div className="flex items-center justify-between text-sm">
 <div className="flex items-center gap-2">
 <span className="text-muted-foreground">Overall Status:</span>
 <span className={`font-bold uppercase ${health.overall === 'healthy' ? 'text-emerald-500' : health.overall === 'degraded' ? 'text-amber-500' : 'text-red-500'}`}>
 {health.overall}
 </span>
 </div>
 {lastUpdate && (
 <div className="flex items-center gap-1 text-muted-foreground">
 <UilClock size={12} />
 Last updated: {lastUpdate.toLocaleTimeString()}
 </div>
 )}
 </div>
 </CardContent>
 </Card>

 {/* Service Status Grid */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
 {renderServiceCard(health.services.database, <UilDatabase size={16} className="text-blue-500" />)}
 {renderServiceCard(health.services.edgeFunctions, <UilBolt size={16} className="text-violet-500" />)}
 {renderServiceCard(health.services.openClaw || { status: 'unknown' }, <UilHeartRate size={16} className="text-emerald-500" />)}
 </div>

 {/* API Usage Analytics */}
 <Card className="bg-card/50 backdrop-blur">
 <CardHeader>
 <CardTitle className="flex items-center gap-2">
 <UilChartGrowth size={20} className="text-primary" />
 API Usage Analytics
 </CardTitle>
 <CardDescription>
 Daily API call limits and usage statistics
 </CardDescription>
 </CardHeader>
 <CardContent>
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 {renderAPIUsageCard('openclaw')}
  </div>
 </CardContent>
 </Card>
 </motion.div>
 );
};

export default SupabaseHealthDashboard;
