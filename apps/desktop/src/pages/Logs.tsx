import { useState, useEffect } from 'react';
import { useLogs, LogLevel, LogTag } from '@/contexts/logs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, CheckCircle2, Info, XCircle, AlertTriangle, Filter, RefreshCw, ScrollText, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

const levelIcons: Record<LogLevel, React.ReactNode> = {
  info: <Info className="h-4 w-4 text-blue-400" />,
  success: <CheckCircle2 className="h-4 w-4 text-green-400" />,
  warning: <AlertTriangle className="h-4 w-4 text-yellow-400" />,
  error: <XCircle className="h-4 w-4 text-red-400" />,
  system: <AlertCircle className="h-4 w-4 text-purple-400" />,
};

const levelColors: Record<LogLevel, string> = {
  info: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  success: 'bg-green-500/10 text-green-400 border-green-500/30',
  warning: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  error: 'bg-red-500/10 text-red-400 border-red-500/30',
  system: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
};

const tagColors: Record<LogTag, string> = {
  auth: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
  api: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
  navigation: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  database: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  security: 'bg-red-500/10 text-red-400 border-red-500/30',
  user: 'bg-violet-500/10 text-violet-400 border-violet-500/30',
  system: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
  network: 'bg-teal-500/10 text-teal-400 border-teal-500/30',
  ai: 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/30',
  terminal: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
  settings: 'bg-gray-500/10 text-gray-400 border-gray-500/30',
};

export default function Logs() {
  const { logs, getFilteredLogs, clearLogs, markErrorsAsRead } = useLogs();
  const { toast } = useToast();
  const [selectedTag, setSelectedTag] = useState<LogTag | 'all'>('all');
  const [selectedLevel, setSelectedLevel] = useState<LogLevel | 'all'>('all');
  const [viewMode, setViewMode] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [refreshKey, setRefreshKey] = useState(0);

  // Mark errors as read when viewing the Logs page
  useEffect(() => {
    markErrorsAsRead();
  }, [markErrorsAsRead]);

  const filteredLogs = getFilteredLogs(
    selectedTag === 'all' ? undefined : selectedTag,
    selectedLevel === 'all' ? undefined : selectedLevel
  ).filter((log) => {
    // Apply time-based filtering
    if (viewMode === 'all') return true;

    const now = new Date();
    const logDate = new Date(log.timestamp);
    const diffInHours = (now.getTime() - logDate.getTime()) / (1000 * 60 * 60);

    if (viewMode === 'today') return diffInHours <= 24;
    if (viewMode === 'week') return diffInHours <= 24 * 7;
    if (viewMode === 'month') return diffInHours <= 24 * 30;

    return true;
  });

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const handleResetFilters = () => {
    setSelectedTag('all');
    setSelectedLevel('all');
    setViewMode('all');
  };

  const handleDeleteAll = () => {
    if (logs.length === 0) return;

    clearLogs();
    toast({
      title: "Logs cleared",
      description: `${logs.length} log entries have been permanently deleted.`,
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-primary/40 bg-primary/10">
            <ScrollText className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gradient-silver">System Logs</h1>
            <p className="text-muted-foreground">Track all system and user activities</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
            {filteredLogs.length} {filteredLogs.length === 1 ? 'Entry' : 'Entries'}
          </Badge>
          <Select value={viewMode} onValueChange={(value) => setViewMode(value as 'all' | 'today' | 'week' | 'month')}>
            <SelectTrigger className="w-[180px] bg-background border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">Last 7 Days</SelectItem>
              <SelectItem value="month">Last 30 Days</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDeleteAll}
            disabled={logs.length === 0}
            className="gap-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30"
          >
            <Trash2 className="h-4 w-4" />
            Delete All
          </Button>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <Card className="border-primary/20 bg-card/50 backdrop-blur">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-primary" />
                <CardTitle>Filters</CardTitle>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="text-muted-foreground hover:text-primary"
              >
                Reset Filters
              </Button>
            </div>
            <CardDescription>Filter logs by tag or severity level</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-4">
            {/* Tag Filter */}
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Tag</label>
              <Select value={selectedTag} onValueChange={(value) => setSelectedTag(value as LogTag | 'all')}>
                <SelectTrigger>
                  <SelectValue placeholder="All Tags" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tags</SelectItem>
                  <SelectItem value="auth">Auth</SelectItem>
                  <SelectItem value="api">API</SelectItem>
                  <SelectItem value="navigation">Navigation</SelectItem>
                  <SelectItem value="database">Database</SelectItem>
                  <SelectItem value="security">Security</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                  <SelectItem value="network">Network</SelectItem>
                  <SelectItem value="ai">AI</SelectItem>
                  <SelectItem value="terminal">Terminal</SelectItem>
                  <SelectItem value="settings">Settings</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Level Filter */}
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Level</label>
              <Select value={selectedLevel} onValueChange={(value) => setSelectedLevel(value as LogLevel | 'all')}>
                <SelectTrigger>
                  <SelectValue placeholder="All Levels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Logs List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        key={refreshKey}
      >
        <Card className="border-primary/20 bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle>Activity Log</CardTitle>
            <CardDescription>Recent system and user activities</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px] pr-4">
              {filteredLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
                  <ScrollText className="h-16 w-16 mb-4 opacity-20" />
                  <p className="text-lg font-medium">No logs found</p>
                  <p className="text-sm">
                    {selectedTag !== 'all' || selectedLevel !== 'all'
                      ? 'Try adjusting your filters'
                      : 'Activity will appear here as you use the application'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredLogs.map((log, index) => (
                    <motion.div
                      key={log.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.02 }}
                      className="group border border-border/50 rounded-lg p-4 hover:border-primary/30 hover:bg-primary/5 transition-all duration-200"
                    >
                      <div className="flex items-start gap-3">
                        {/* Icon */}
                        <div className="mt-1">{levelIcons[log.level]}</div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" className={levelColors[log.level]}>
                                {log.level}
                              </Badge>
                              <Badge variant="outline" className={tagColors[log.tag]}>
                                {log.tag}
                              </Badge>
                            </div>
                            <div className="text-xs text-muted-foreground whitespace-nowrap">
                              {format(log.timestamp, 'MMM dd, yyyy HH:mm:ss')}
                            </div>
                          </div>
                          <p className="font-medium text-foreground mb-1">{log.action}</p>
                          {log.details && (
                            <p className="text-sm text-muted-foreground">{log.details}</p>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
