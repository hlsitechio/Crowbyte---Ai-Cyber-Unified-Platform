/**
 * Security Monitor - CrowByte Security Monitor
 * Dedicated page for AI-powered security monitoring and threat analysis
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Shield,
  AlertTriangle,
  Activity,
  Brain,
  Radio,
  Eye,
  RefreshCw,
  CheckCircle,
  XCircle,
  Info,
} from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { monitoringAgent, type MonitoringReport } from "@/services/monitoring-agent";

const SecurityMonitor = () => {
  const { toast } = useToast();
  const [monitoringReport, setMonitoringReport] = useState<MonitoringReport | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [autoMonitoringEnabled, setAutoMonitoringEnabled] = useState(false);
  const [isElectron, setIsElectron] = useState(false);

  // Check if running in Electron
  useEffect(() => {
    const checkElectron = () => {
      // @ts-ignore - window.electron is added by preload script
      return typeof window !== 'undefined' && window.electron !== undefined;
    };
    setIsElectron(checkElectron());
  }, []);

  // Auto-monitoring interval
  useEffect(() => {
    if (!autoMonitoringEnabled) return;

    const interval = setInterval(() => {
      handleManualScan();
    }, 5 * 60 * 1000); // Every 5 minutes

    return () => clearInterval(interval);
  }, [autoMonitoringEnabled]);

  const handleManualScan = async () => {
    try {
      setIsScanning(true);
      toast({
        title: "🔍 Starting AI Security Scan",
        description: "DeepSeek V3.1 (671B) is analyzing your PC...",
      });

      const report = await monitoringAgent.performMonitoringScan();
      setMonitoringReport(report);

      toast({
        title: "✅ Security Scan Complete",
        description: `Status: ${report.status.toUpperCase()}`,
        variant: report.status === 'critical' ? 'destructive' : 'default',
      });
    } catch (error) {
      console.error('Security scan failed:', error);
      toast({
        title: "❌ Scan Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsScanning(false);
    }
  };

  const toggleAutoMonitoring = () => {
    setAutoMonitoringEnabled(!autoMonitoringEnabled);
    toast({
      title: autoMonitoringEnabled ? "Auto-Monitoring Disabled" : "Auto-Monitoring Enabled",
      description: autoMonitoringEnabled
        ? "Automatic scans have been stopped"
        : "Scanning every 5 minutes",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-500/20 border-green-500/50 text-green-400';
      case 'warning':
        return 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400';
      case 'critical':
        return 'bg-red-500/20 border-red-500/50 text-red-400';
      default:
        return 'bg-muted border-muted-foreground/50';
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-primary/20 animate-pulse">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                CrowByte Security Monitor
                <Badge variant="outline" className="text-sm bg-primary/10 border-primary/30">
                  DeepSeek V3.1 • 671B
                </Badge>
              </h1>
              <p className="text-muted-foreground mt-1">
                AI-powered security monitoring & threat analysis
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleManualScan}
              disabled={isScanning || !isElectron}
              size="lg"
              className="bg-primary/20 hover:bg-primary/30 border border-primary/50"
            >
              {isScanning ? (
                <>
                  <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                  Scanning...
                </>
              ) : (
                <>
                  <Eye className="h-5 w-5 mr-2" />
                  Scan Now
                </>
              )}
            </Button>
            <Button
              onClick={toggleAutoMonitoring}
              disabled={!isElectron}
              size="lg"
              variant={autoMonitoringEnabled ? "default" : "outline"}
              className={autoMonitoringEnabled ? "bg-green-500/20 hover:bg-green-500/30 border-green-500/50" : ""}
            >
              <Radio className={`h-5 w-5 mr-2 ${autoMonitoringEnabled ? 'animate-pulse' : ''}`} />
              {autoMonitoringEnabled ? 'Auto ON' : 'Auto OFF'}
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Browser Mode Warning */}
      {!isElectron && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card className="border-yellow-500/30 bg-yellow-500/5">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Info className="h-5 w-5 text-yellow-400" />
                <div>
                  <CardTitle className="text-yellow-400">Browser Mode Detected</CardTitle>
                  <CardDescription>
                    PC monitoring requires the Electron desktop application
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                Real-time system monitoring with <code className="text-xs bg-black/30 px-2 py-1 rounded">mcp-monitor</code> is only available when running the CrowByte Terminal as a desktop application.
              </p>
              <div className="bg-black/30 rounded-lg p-3 border border-yellow-500/20">
                <p className="text-xs text-yellow-300 mb-2">To enable full security monitoring:</p>
                <ol className="text-xs text-muted-foreground space-y-1 ml-4 list-decimal">
                  <li>Close this browser tab</li>
                  <li>Run <code className="bg-black/30 px-1 rounded">npm run electron:dev</code> in your terminal</li>
                  <li>The desktop application will launch with full PC monitoring capabilities</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Main Security Terminal */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-background backdrop-blur">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Brain className="h-6 w-6 text-primary" />
                <div>
                  <CardTitle className="text-xl">AI Security Analysis</CardTitle>
                  <CardDescription>
                    {isElectron
                      ? "Real-time threat detection and system monitoring"
                      : "Desktop mode required for live monitoring"}
                  </CardDescription>
                </div>
              </div>
              {monitoringReport && (
                <Badge className={`text-lg px-4 py-1 ${getStatusColor(monitoringReport.status)}`}>
                  {monitoringReport.status === 'healthy' && <CheckCircle className="h-4 w-4 mr-1 inline" />}
                  {monitoringReport.status === 'warning' && <AlertTriangle className="h-4 w-4 mr-1 inline" />}
                  {monitoringReport.status === 'critical' && <XCircle className="h-4 w-4 mr-1 inline" />}
                  {monitoringReport.status.toUpperCase()}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {monitoringReport ? (
              <div className="space-y-6">
                {/* Timestamp */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Activity className="h-3 w-3" />
                  Last scan: {monitoringReport.timestamp.toLocaleString()}
                </div>

                {/* AI Analysis Output */}
                <div className="bg-black/40 rounded-lg p-4 border border-primary/20">
                  <ScrollArea className="h-[300px]">
                    <pre className="text-sm text-muted-foreground whitespace-pre-wrap terminal-text font-mono">
                      {monitoringReport.aiAnalysis}
                    </pre>
                  </ScrollArea>
                </div>

                {/* Security Threats & Anomalies */}
                {(monitoringReport.securityThreats.length > 0 || monitoringReport.anomalies.length > 0) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {monitoringReport.securityThreats.length > 0 && (
                      <Card className="border-red-500/30 bg-red-500/5">
                        <CardHeader className="pb-3">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-red-400" />
                            <CardTitle className="text-sm text-red-400">Security Threats</CardTitle>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <ul className="text-xs text-red-300 space-y-2">
                            {monitoringReport.securityThreats.map((threat, i) => (
                              <li key={i} className="flex items-start gap-2">
                                <span className="text-red-500">•</span>
                                <span>{threat}</span>
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    )}
                    {monitoringReport.anomalies.length > 0 && (
                      <Card className="border-yellow-500/30 bg-yellow-500/5">
                        <CardHeader className="pb-3">
                          <div className="flex items-center gap-2">
                            <Activity className="h-5 w-5 text-yellow-400" />
                            <CardTitle className="text-sm text-yellow-400">Anomalies Detected</CardTitle>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <ul className="text-xs text-yellow-300 space-y-2">
                            {monitoringReport.anomalies.map((anomaly, i) => (
                              <li key={i} className="flex items-start gap-2">
                                <span className="text-yellow-500">•</span>
                                <span>{anomaly}</span>
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <Brain className="h-16 w-16 mx-auto mb-4 text-primary/50 animate-pulse" />
                <p className="text-lg font-semibold mb-2">No recent scan data</p>
                <p className="text-sm text-muted-foreground mb-4">
                  {isElectron
                    ? 'Click "Scan Now" to start an AI security analysis'
                    : 'Desktop mode required to perform security scans'}
                </p>
                {autoMonitoringEnabled && isElectron && (
                  <div className="inline-flex items-center gap-2 text-sm text-green-400 bg-green-500/10 px-4 py-2 rounded-lg border border-green-500/30">
                    <Radio className="h-4 w-4 animate-pulse" />
                    Auto-monitoring active (every 5 minutes)
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Features Info */}
      {isElectron && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-primary/20 bg-card/50 backdrop-blur">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  <CardTitle className="text-sm">Real-time Monitoring</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Continuous system health checks with AI-powered threat detection
                </p>
              </CardContent>
            </Card>
            <Card className="border-primary/20 bg-card/50 backdrop-blur">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-primary" />
                  <CardTitle className="text-sm">DeepSeek V3.1 Analysis</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  671B parameter AI model for advanced security insights
                </p>
              </CardContent>
            </Card>
            <Card className="border-primary/20 bg-card/50 backdrop-blur">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  <CardTitle className="text-sm">Anomaly Detection</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Identifies unusual patterns and potential security risks
                </p>
              </CardContent>
            </Card>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default SecurityMonitor;
