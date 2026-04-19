import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { UilSave, UilTrashAlt, UilSync, UilWrench, UilDatabase } from "@iconscout/react-unicons";
import { useToast } from "@/hooks/use-toast";
import { useLogs } from "@/contexts/logs";
import { cacheService, type CacheStats } from "@/services/cache";

export default function AdvancedSettings() {
  const { toast } = useToast();
  const { clearLogs, logs } = useLogs();
  const [debugMode, setDebugMode] = useState(localStorage.getItem('debug_mode') === 'true' || false);
  const [experimentalFeatures, setExperimentalFeatures] = useState(localStorage.getItem('experimental_features') === 'true' || false);
  const [maxConcurrentOps, setMaxConcurrentOps] = useState(parseInt(localStorage.getItem('max_concurrent_ops') || '10'));

  // Cache Management State
  const [cacheStats, setCacheStats] = useState<CacheStats[]>([]);
  const [cacheSize, setCacheSize] = useState(0);
  const [loadingCache, setLoadingCache] = useState(false);
  const [clearingCache, setClearingCache] = useState(false);

  useEffect(() => {
    loadCacheStats();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSaveAdvanced = () => {
    localStorage.setItem('debug_mode', String(debugMode));
    localStorage.setItem('experimental_features', String(experimentalFeatures));
    localStorage.setItem('max_concurrent_ops', String(maxConcurrentOps));
    toast({
      title: "Advanced Settings Saved",
      description: "Advanced preferences have been updated successfully.",
    });
  };

  const handleClearLogs = () => {
    clearLogs();
    toast({
      title: "Logs cleared",
      description: "All system logs have been permanently deleted.",
    });
  };

  const loadCacheStats = async () => {
    setLoadingCache(true);
    try {
      const stats = await cacheService.getStats(true);
      const totalSize = await cacheService.getTotalSize(true);
      setCacheStats(stats);
      setCacheSize(totalSize);
    } catch (error) {
      console.error('Failed to load cache stats:', error);
      toast({
        title: "Error",
        description: "Failed to load cache statistics",
        variant: "destructive",
      });
    } finally {
      setLoadingCache(false);
    }
  };

  const handleClearCache = async () => {
    setClearingCache(true);
    try {
      const results = await Promise.all([
        cacheService.clearByType('conversation', { userSpecific: true }),
        cacheService.clearByType('api_response', { userSpecific: true }),
        cacheService.clearByType('search', { userSpecific: true }),
        cacheService.clearByType('embedding', { userSpecific: true }),
        cacheService.clearByType('tool_result', { userSpecific: true }),
      ]);

      const success = results.every(r => r);

      if (success) {
        toast({
          title: "Cache Cleared",
          description: "All cache data has been cleared successfully",
        });
        await loadCacheStats();
      } else {
        throw new Error('Some cache types failed to clear');
      }
    } catch (error) {
      console.error('Failed to clear cache:', error);
      toast({
        title: "Error",
        description: "Failed to clear cache data",
        variant: "destructive",
      });
    } finally {
      setClearingCache(false);
    }
  };

  const handleCleanupCache = async () => {
    try {
      const cleaned = await cacheService.cleanupExpired();
      toast({
        title: "Cache Cleanup Complete",
        description: `Removed ${cleaned} expired cache entries`,
      });
      await loadCacheStats();
    } catch (error) {
      console.error('Failed to cleanup cache:', error);
      toast({
        title: "Error",
        description: "Failed to cleanup expired cache",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Advanced Settings</CardTitle>
          <CardDescription>Fine-tune system behavior</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Debug Mode</Label>
              <p className="text-sm text-muted-foreground">Enable verbose logging</p>
            </div>
            <Switch
              checked={debugMode}
              onCheckedChange={setDebugMode}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Experimental Features</Label>
              <p className="text-sm text-muted-foreground">Access beta functionality</p>
            </div>
            <Switch
              checked={experimentalFeatures}
              onCheckedChange={setExperimentalFeatures}
            />
          </div>
          <Separator />
          <div className="space-y-2">
            <Label>Max Concurrent Operations</Label>
            <Input
              type="number"
              value={maxConcurrentOps}
              onChange={(e) => setMaxConcurrentOps(parseInt(e.target.value) || 10)}
              className="terminal-text"
            />
          </div>
          <Separator />
          <div className="flex justify-end">
            <Button
              onClick={handleSaveAdvanced}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <UilSave size={16} className="mr-2" />
              Save Advanced Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>System Logs</CardTitle>
          <CardDescription>Manage system activity logs</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Total Log Entries</Label>
              <p className="text-sm text-muted-foreground">{logs.length} entries stored locally</p>
            </div>
            <span className="text-xs text-zinc-400 font-medium">{logs.length}</span>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Clear All Logs</Label>
              <p className="text-sm text-muted-foreground">Permanently delete all system logs</p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleClearLogs}
              disabled={logs.length === 0}
              className="bg-transparent hover:bg-white/[0.03] border border-transparent"
            >
              <UilTrashAlt size={16} className="mr-2" />
              Clear Logs
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Cache Management Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UilDatabase size={20} />
            Cache Management
          </CardTitle>
          <CardDescription>Monitor and manage Supabase cache for API responses and conversations</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loadingCache ? (
            <div className="flex items-center justify-center py-8">
              <UilSync size={32} className="animate-spin text-primary" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Total Entries</p>
                  <p className="text-2xl font-bold text-primary">
                    {cacheStats.reduce((sum, stat) => sum + stat.total_entries, 0)}
                  </p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Cache Size</p>
                  <p className="text-2xl font-bold text-primary">
                    {(cacheSize / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>

              {cacheStats.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <Label>Cache Breakdown by Type</Label>
                    <div className="space-y-2">
                      {cacheStats.map((stat) => (
                        <div key={stat.cache_type} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                          <div>
                            <p className="text-sm font-medium capitalize">{stat.cache_type.replace('_', ' ')}</p>
                            <p className="text-xs text-muted-foreground">
                              {stat.valid_entries} valid &#183; {stat.expired_entries} expired
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold">{stat.total_entries}</p>
                            <p className="text-xs text-muted-foreground">
                              {stat.total_size_mb.toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <Separator />

              {/* Cache Actions */}
              <div className="flex gap-2">
                <Button
                  onClick={loadCacheStats}
                  variant="outline"
                  size="sm"
                  disabled={loadingCache}
                  className="flex-1"
                >
                  <UilSync size={16} className={`mr-2 ${loadingCache ? 'animate-spin' : ''}`} />
                  Refresh Stats
                </Button>
                <Button
                  onClick={handleCleanupCache}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  <UilWrench size={16} className="mr-2" />
                  Cleanup Expired
                </Button>
                <Button
                  onClick={handleClearCache}
                  variant="destructive"
                  size="sm"
                  disabled={clearingCache || cacheStats.length === 0}
                  className="flex-1 bg-transparent hover:bg-white/[0.03] border border-transparent"
                >
                  <UilTrashAlt size={16} className="mr-2" />
                  Clear All Cache
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
