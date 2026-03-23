/**
 * AI Agent Testing Dashboard
 * Comprehensive testing interface for all AI agents
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { agentTester } from '@/services/agent-tester';
import {
  PlayCircle,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  TrendingUp,
  Clock,
  Download,
  RefreshCw,
  Settings as SettingsIcon
} from 'lucide-react';

interface TestProgress {
  current: number;
  total: number;
  currentAgent: string;
  status: 'idle' | 'running' | 'completed' | 'error';
}

export default function AgentTesting() {
  const [testResults, setTestResults] = useState<any>(null);
  const [progress, setProgress] = useState<TestProgress>({
    current: 0,
    total: 0,
    currentAgent: '',
    status: 'idle'
  });
  const [selectedAgent, setSelectedAgent] = useState<string>('all');

  // Agent Configuration State
  const [agentConfig, setAgentConfig] = useState({
    search: {
      maxResults: 5,
      tavilyApiKey: localStorage.getItem('tavily_api_key') || '',
    },
    openclaw: {
      model: 'llama-3.3-70b',
      temperature: 0.7,
      maxTokens: 2048,
      requestType: 'general' as 'exploit' | 'vulnerability' | 'attack_vector' | 'tool_usage' | 'general',
      preferLowRisk: true,
      enableFallback: true,
    },
    ollama: {
      model: 'hermes3:8b',
      temperature: 0.7,
      endpoint: localStorage.getItem('ollama_endpoint') || 'http://localhost:11434',
    },
    redTeam: {
      enableOpenClaw: true,
      enableOllama: true,
      maxRetries: 3,
      timeout: 30000,
    },
    general: {
      cacheEnabled: true,
      loggingLevel: 'info' as 'debug' | 'info' | 'warn' | 'error',
      maxConcurrentTests: 1,
    }
  });

  /**
   * Run all agent tests
   */
  const runAllTests = async () => {
    setProgress({
      current: 0,
      total: 6,
      currentAgent: 'Starting tests...',
      status: 'running'
    });
    setTestResults(null);

    try {
      toast({
        title: "Testing Started",
        description: "Running comprehensive tests on all agents...",
      });

      const results = await agentTester.testAllAgents();

      setTestResults(results);
      setProgress(prev => ({ ...prev, status: 'completed' }));

      toast({
        title: "Testing Complete",
        description: `Average Score: ${results.summary.averageScore.toFixed(1)}/100`,
      });
    } catch (error) {
      console.error('Test execution failed:', error);
      setProgress(prev => ({ ...prev, status: 'error' }));
      toast({
        title: "Testing Failed",
        description: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    }
  };

  /**
   * Run individual agent test
   */
  const runAgentTest = async (agentName: string) => {
    console.log(`\n========================================`);
    console.log(`🧪 TESTING INDIVIDUAL AGENT: ${agentName}`);
    console.log(`========================================\n`);

    setProgress({
      current: 0,
      total: 1,
      currentAgent: agentName,
      status: 'running'
    });

    try {
      let report;
      switch (agentName) {
        case 'CyberSec AI Agent':
          report = await agentTester.testCyberSecAgent();
          break;
        case 'Mission Planner':
          report = await agentTester.testMissionPlannerAgent();
          break;
        case 'Search Agent':
          report = await agentTester.testSearchAgent();
          break;
        case 'Hybrid Red Team':
          report = await agentTester.testHybridRedTeamAgent();
          break;
        case 'OpenClaw Free':
          report = await agentTester.testOpenClawFree();
          break;
        case 'Ollama Hermes':
          report = await agentTester.testOllamaHermes();
          break;
        default:
          throw new Error('Unknown agent');
      }

      setTestResults({
        timestamp: new Date().toISOString(),
        reports: [report],
        summary: {
          totalAgents: 1,
          healthyAgents: report.overallScore >= 75 ? 1 : 0,
          failingAgents: report.overallScore < 50 ? 1 : 0,
          averageScore: report.overallScore
        }
      });

      setProgress(prev => ({ ...prev, status: 'completed' }));

      console.log(`\n✅ ${agentName} test completed successfully!`);
      console.log(`📊 Score: ${report.overallScore.toFixed(1)}/100\n`);

      toast({
        title: "Test Complete",
        description: `${agentName} - Score: ${report.overallScore.toFixed(1)}/100`,
      });
    } catch (error) {
      console.error(`\n❌ ${agentName} test FAILED:`, error);
      console.error('Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : 'No stack'
      });
      console.error('Test failed:', error);
      setProgress(prev => ({ ...prev, status: 'error' }));
      toast({
        title: "Test Failed",
        description: `Error testing ${agentName}`,
        variant: "destructive"
      });
    }
  };

  /**
   * Export results as JSON
   */
  const exportResults = () => {
    if (!testResults) return;

    const dataStr = JSON.stringify(testResults, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = `agent-test-results-${new Date().toISOString()}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();

    toast({
      title: "Results Exported",
      description: "Test results downloaded as JSON",
    });
  };

  /**
   * Get score badge color
   */
  const getScoreBadge = (score: number) => {
    if (score >= 90) return { variant: "default" as const, label: "Excellent" };
    if (score >= 75) return { variant: "secondary" as const, label: "Good" };
    if (score >= 50) return { variant: "outline" as const, label: "Fair" };
    return { variant: "destructive" as const, label: "Poor" };
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">AI Agent Testing</h2>
          <p className="text-muted-foreground">
            Comprehensive testing and validation of all AI agents
          </p>
        </div>
        <div className="flex gap-2">
          {testResults && (
            <Button variant="outline" onClick={exportResults}>
              <Download className="mr-2 h-4 w-4" />
              Export Results
            </Button>
          )}
          <Button onClick={runAllTests} disabled={progress.status === 'running'}>
            {progress.status === 'running' ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <PlayCircle className="mr-2 h-4 w-4" />
                Run All Tests
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Test Progress */}
      {progress.status === 'running' && (
        <Card>
          <CardHeader>
            <CardTitle>Testing in Progress</CardTitle>
            <CardDescription>{progress.currentAgent}</CardDescription>
          </CardHeader>
          <CardContent>
            <Progress value={(progress.current / progress.total) * 100} className="mb-2" />
            <p className="text-sm text-muted-foreground">
              {progress.current} of {progress.total} agents tested
            </p>
          </CardContent>
        </Card>
      )}

      {/* Agent Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <SettingsIcon className="h-5 w-5" />
            Agent Configuration
          </CardTitle>
          <CardDescription className="text-base">
            Configure parameters for all agents before running tests
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="openclaw" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="openclaw">OpenClaw</TabsTrigger>
              <TabsTrigger value="ollama">Ollama</TabsTrigger>
              <TabsTrigger value="search">Search</TabsTrigger>
              <TabsTrigger value="redteam">Red Team</TabsTrigger>
              <TabsTrigger value="general">General</TabsTrigger>
            </TabsList>

            {/* OpenClaw Configuration */}
            <TabsContent value="openclaw" className="space-y-4 mt-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Model</Label>
                  <Input
                    value={agentConfig.openclaw.model}
                    onChange={(e) => setAgentConfig({
                      ...agentConfig,
                      openclaw: { ...agentConfig.openclaw, model: e.target.value }
                    })}
                    placeholder="llama-3.3-70b"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Request Type</Label>
                  <select
                    className="w-full p-2 border rounded-md"
                    value={agentConfig.openclaw.requestType}
                    onChange={(e) => setAgentConfig({
                      ...agentConfig,
                      openclaw: { ...agentConfig.openclaw, requestType: e.target.value as any }
                    })}
                  >
                    <option value="general">General</option>
                    <option value="exploit">Exploit</option>
                    <option value="vulnerability">Vulnerability</option>
                    <option value="attack_vector">Attack Vector</option>
                    <option value="tool_usage">Tool Usage</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Temperature: {agentConfig.openclaw.temperature}</Label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={agentConfig.openclaw.temperature}
                    onChange={(e) => setAgentConfig({
                      ...agentConfig,
                      openclaw: { ...agentConfig.openclaw, temperature: parseFloat(e.target.value) }
                    })}
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Max Tokens</Label>
                  <Input
                    type="number"
                    value={agentConfig.openclaw.maxTokens}
                    onChange={(e) => setAgentConfig({
                      ...agentConfig,
                      openclaw: { ...agentConfig.openclaw, maxTokens: parseInt(e.target.value) }
                    })}
                  />
                </div>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label>Prefer Low Risk</Label>
                  <p className="text-sm text-muted-foreground">Use safer models when possible</p>
                </div>
                <Switch
                  checked={agentConfig.openclaw.preferLowRisk}
                  onCheckedChange={(checked) => setAgentConfig({
                    ...agentConfig,
                    openclaw: { ...agentConfig.openclaw, preferLowRisk: checked }
                  })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Enable Fallback</Label>
                  <p className="text-sm text-muted-foreground">Use alternative models if primary fails</p>
                </div>
                <Switch
                  checked={agentConfig.openclaw.enableFallback}
                  onCheckedChange={(checked) => setAgentConfig({
                    ...agentConfig,
                    openclaw: { ...agentConfig.openclaw, enableFallback: checked }
                  })}
                />
              </div>
            </TabsContent>

            {/* Ollama Configuration */}
            <TabsContent value="ollama" className="space-y-4 mt-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Model</Label>
                  <Input
                    value={agentConfig.ollama.model}
                    onChange={(e) => setAgentConfig({
                      ...agentConfig,
                      ollama: { ...agentConfig.ollama, model: e.target.value }
                    })}
                    placeholder="hermes3:8b"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Endpoint</Label>
                  <Input
                    value={agentConfig.ollama.endpoint}
                    onChange={(e) => setAgentConfig({
                      ...agentConfig,
                      ollama: { ...agentConfig.ollama, endpoint: e.target.value }
                    })}
                    placeholder="http://localhost:11434"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Temperature: {agentConfig.ollama.temperature}</Label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={agentConfig.ollama.temperature}
                    onChange={(e) => setAgentConfig({
                      ...agentConfig,
                      ollama: { ...agentConfig.ollama, temperature: parseFloat(e.target.value) }
                    })}
                    className="w-full"
                  />
                </div>
              </div>
            </TabsContent>

            {/* Search Agent Configuration */}
            <TabsContent value="search" className="space-y-4 mt-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Tavily API Key</Label>
                  <Input
                    type="password"
                    value={agentConfig.search.tavilyApiKey}
                    onChange={(e) => setAgentConfig({
                      ...agentConfig,
                      search: { ...agentConfig.search, tavilyApiKey: e.target.value }
                    })}
                    placeholder="Enter Tavily API key"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Max Results</Label>
                  <Input
                    type="number"
                    value={agentConfig.search.maxResults}
                    onChange={(e) => setAgentConfig({
                      ...agentConfig,
                      search: { ...agentConfig.search, maxResults: parseInt(e.target.value) }
                    })}
                  />
                </div>
              </div>
            </TabsContent>

            {/* Red Team Configuration */}
            <TabsContent value="redteam" className="space-y-4 mt-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Max Retries</Label>
                  <Input
                    type="number"
                    value={agentConfig.redTeam.maxRetries}
                    onChange={(e) => setAgentConfig({
                      ...agentConfig,
                      redTeam: { ...agentConfig.redTeam, maxRetries: parseInt(e.target.value) }
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Timeout (ms)</Label>
                  <Input
                    type="number"
                    value={agentConfig.redTeam.timeout}
                    onChange={(e) => setAgentConfig({
                      ...agentConfig,
                      redTeam: { ...agentConfig.redTeam, timeout: parseInt(e.target.value) }
                    })}
                  />
                </div>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label>Enable OpenClaw</Label>
                  <p className="text-sm text-muted-foreground">Use OpenClaw in hybrid mode</p>
                </div>
                <Switch
                  checked={agentConfig.redTeam.enableOpenClaw}
                  onCheckedChange={(checked) => setAgentConfig({
                    ...agentConfig,
                    redTeam: { ...agentConfig.redTeam, enableOpenClaw: checked }
                  })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Enable Ollama</Label>
                  <p className="text-sm text-muted-foreground">Use Ollama in hybrid mode</p>
                </div>
                <Switch
                  checked={agentConfig.redTeam.enableOllama}
                  onCheckedChange={(checked) => setAgentConfig({
                    ...agentConfig,
                    redTeam: { ...agentConfig.redTeam, enableOllama: checked }
                  })}
                />
              </div>
            </TabsContent>

            {/* General Configuration */}
            <TabsContent value="general" className="space-y-4 mt-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Logging Level</Label>
                  <select
                    className="w-full p-2 border rounded-md"
                    value={agentConfig.general.loggingLevel}
                    onChange={(e) => setAgentConfig({
                      ...agentConfig,
                      general: { ...agentConfig.general, loggingLevel: e.target.value as any }
                    })}
                  >
                    <option value="debug">Debug</option>
                    <option value="info">Info</option>
                    <option value="warn">Warn</option>
                    <option value="error">Error</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Max Concurrent Tests</Label>
                  <Input
                    type="number"
                    value={agentConfig.general.maxConcurrentTests}
                    onChange={(e) => setAgentConfig({
                      ...agentConfig,
                      general: { ...agentConfig.general, maxConcurrentTests: parseInt(e.target.value) }
                    })}
                  />
                </div>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label>Cache Enabled</Label>
                  <p className="text-sm text-muted-foreground">Use caching for API responses</p>
                </div>
                <Switch
                  checked={agentConfig.general.cacheEnabled}
                  onCheckedChange={(checked) => setAgentConfig({
                    ...agentConfig,
                    general: { ...agentConfig.general, cacheEnabled: checked }
                  })}
                />
              </div>
            </TabsContent>
          </Tabs>

          <Separator className="my-4" />

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                localStorage.setItem('agent_config', JSON.stringify(agentConfig));
                toast({
                  title: "Configuration Saved",
                  description: "Agent parameters have been saved to local storage",
                });
              }}
            >
              Save Configuration
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                const saved = localStorage.getItem('agent_config');
                if (saved) {
                  setAgentConfig(JSON.parse(saved));
                  toast({
                    title: "Configuration Loaded",
                    description: "Agent parameters have been restored",
                  });
                }
              }}
            >
              Load Saved
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Individual Agent Tests */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Individual Agent Tests</CardTitle>
          <CardDescription className="text-base">
            Test specific agents one at a time (recommended to avoid crashes)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { name: 'CyberSec AI Agent', icon: '🔐', tests: 4 },
              { name: 'Mission Planner', icon: '🎯', tests: 4 },
              { name: 'Search Agent', icon: '🔍', tests: 3 },
              { name: 'Hybrid Red Team', icon: '⚔️', tests: 3 },
              { name: 'OpenClaw Free', icon: '☁️', tests: 2 },
              { name: 'Ollama Hermes', icon: '🐬', tests: 2 }
            ].map((agent) => (
              <Button
                key={agent.name}
                variant="outline"
                size="lg"
                onClick={() => runAgentTest(agent.name)}
                disabled={progress.status === 'running'}
                className="h-auto py-4 px-4 flex flex-col items-start gap-1 hover:bg-primary/5"
              >
                <div className="flex items-center gap-2 w-full">
                  <span className="text-2xl">{agent.icon}</span>
                  <span className="font-semibold text-left flex-1">{agent.name}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {agent.tests} test cases
                </span>
              </Button>
            ))}
          </div>
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              💡 <strong>Tip:</strong> Testing agents individually is more stable and helps identify specific issues. Click any agent button above to test it.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Test Results */}
      {testResults && (
        <>
          {/* Summary */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Agents</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{testResults.summary.totalAgents}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Healthy</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-500">
                  {testResults.summary.healthyAgents}
                </div>
                <p className="text-xs text-muted-foreground">Score ≥ 75</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Failing</CardTitle>
                <XCircle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-500">
                  {testResults.summary.failingAgents}
                </div>
                <p className="text-xs text-muted-foreground">Score &lt; 50</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Score</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {testResults.summary.averageScore.toFixed(1)}
                </div>
                <p className="text-xs text-muted-foreground">Out of 100</p>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Results */}
          <Card>
            <CardHeader>
              <CardTitle>Test Reports</CardTitle>
              <CardDescription>
                Detailed results for each agent - {new Date(testResults.timestamp).toLocaleString()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px] pr-4">
                <div className="space-y-4">
                  {testResults.reports.map((report: any, idx: number) => {
                    const scoreBadge = getScoreBadge(report.overallScore);

                    return (
                      <Card key={idx} className="overflow-hidden">
                        <CardHeader className="bg-muted/50">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <CardTitle className="text-lg">{report.agentName}</CardTitle>
                              <Badge variant={scoreBadge.variant}>{scoreBadge.label}</Badge>
                            </div>
                            <div className="text-2xl font-bold">
                              {report.overallScore.toFixed(1)}
                              <span className="text-sm text-muted-foreground">/100</span>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-4">
                          <Tabs defaultValue="summary">
                            <TabsList className="grid w-full grid-cols-4">
                              <TabsTrigger value="summary">Summary</TabsTrigger>
                              <TabsTrigger value="tests">Tests</TabsTrigger>
                              <TabsTrigger value="recommendations">
                                Recommendations
                                {report.recommendations.length > 0 && (
                                  <Badge variant="secondary" className="ml-2">
                                    {report.recommendations.length}
                                  </Badge>
                                )}
                              </TabsTrigger>
                              <TabsTrigger value="issues">
                                Issues
                                {report.criticalIssues.length > 0 && (
                                  <Badge variant="destructive" className="ml-2">
                                    {report.criticalIssues.length}
                                  </Badge>
                                )}
                              </TabsTrigger>
                            </TabsList>

                            <TabsContent value="summary" className="space-y-3">
                              <div className="grid grid-cols-3 gap-3">
                                <div className="flex items-center gap-2">
                                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                                  <span className="text-sm">
                                    Passed: {report.testResults.filter((t: any) => t.passed).length}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <XCircle className="h-4 w-4 text-red-500" />
                                  <span className="text-sm">
                                    Failed: {report.testResults.filter((t: any) => !t.passed).length}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Clock className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm">
                                    Avg: {report.averageTestDuration.toFixed(0)}ms
                                  </span>
                                </div>
                              </div>
                            </TabsContent>

                            <TabsContent value="tests" className="space-y-3">
                              {report.testResults.map((test: any, testIdx: number) => (
                                <div
                                  key={testIdx}
                                  className="border rounded-lg p-3 space-y-2"
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      {test.passed ? (
                                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                                      ) : (
                                        <XCircle className="h-4 w-4 text-red-500" />
                                      )}
                                      <span className="font-medium text-sm">{test.testName}</span>
                                    </div>
                                    <Badge variant="outline">{test.score}/100</Badge>
                                  </div>

                                  {/* Validation Results */}
                                  <div className="space-y-1 text-xs">
                                    {test.validationResults.map((validation: any, vIdx: number) => (
                                      <div
                                        key={vIdx}
                                        className="flex items-start gap-2 text-muted-foreground"
                                      >
                                        {validation.passed ? (
                                          <CheckCircle2 className="h-3 w-3 text-green-500 mt-0.5" />
                                        ) : (
                                          <XCircle className="h-3 w-3 text-red-500 mt-0.5" />
                                        )}
                                        <span>{validation.criterion}</span>
                                      </div>
                                    ))}
                                  </div>

                                  {/* Errors */}
                                  {test.errors.length > 0 && (
                                    <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded p-2">
                                      <p className="text-xs font-medium text-red-600 dark:text-red-400 mb-1">
                                        Errors:
                                      </p>
                                      {test.errors.map((error: string, eIdx: number) => (
                                        <p key={eIdx} className="text-xs text-red-600 dark:text-red-400">
                                          • {error}
                                        </p>
                                      ))}
                                    </div>
                                  )}

                                  {/* Duration */}
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Clock className="h-3 w-3" />
                                    <span>{test.duration}ms</span>
                                  </div>
                                </div>
                              ))}
                            </TabsContent>

                            <TabsContent value="recommendations" className="space-y-2">
                              {report.recommendations.length === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                  No recommendations - agent is performing well!
                                </p>
                              ) : (
                                report.recommendations.map((rec: string, recIdx: number) => (
                                  <div
                                    key={recIdx}
                                    className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded"
                                  >
                                    <TrendingUp className="h-4 w-4 text-blue-500 mt-0.5" />
                                    <p className="text-sm text-blue-900 dark:text-blue-100">
                                      {rec}
                                    </p>
                                  </div>
                                ))
                              )}
                            </TabsContent>

                            <TabsContent value="issues" className="space-y-2">
                              {report.criticalIssues.length === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                  No critical issues detected!
                                </p>
                              ) : (
                                report.criticalIssues.map((issue: string, issueIdx: number) => (
                                  <div
                                    key={issueIdx}
                                    className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded"
                                  >
                                    <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5" />
                                    <p className="text-sm text-red-900 dark:text-red-100">
                                      {issue}
                                    </p>
                                  </div>
                                ))
                              )}
                            </TabsContent>
                          </Tabs>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </>
      )}

      {/* Empty State */}
      {!testResults && progress.status === 'idle' && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <PlayCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Tests Run Yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Click "Run All Tests" to start comprehensive agent testing
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
