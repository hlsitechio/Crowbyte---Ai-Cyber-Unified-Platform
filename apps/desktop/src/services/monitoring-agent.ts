/**
 * AI Monitoring Agent Service
 * Uses DeepSeek V3.1 671B via Ollama Cloud for intelligent PC security monitoring
 *
 * Features:
 * - Real-time system monitoring via mcp-monitor
 * - Anomaly detection and security threat analysis
 * - Memory system for past incidents
 * - Tactical security analyst personality
 * - Auto-monitoring every 5 minutes + on-demand scans
 */

import { pcMonitor, type SystemMetrics, type ProcessInfo } from './pc-monitor';
import { glitchTipService } from './glitchtip';
import type { ToolFunction } from '@/types/service-types';

// MCP client - only available in Electron environment
// Import will be handled at runtime to avoid bundling Node.js dependencies
let mcpClient: any = null;

interface AlertItem {
  severity: 'info' | 'warning' | 'critical';
  message: string;
  recommendation: string;
}

// Ollama Cloud configuration
const OLLAMA_API_KEY = import.meta.env.VITE_OLLAMA_API_KEY;
const OLLAMA_API_URL = import.meta.env.VITE_OLLAMA_API_URL || 'https://api.ollama.com/v1';
const OLLAMA_MODEL = import.meta.env.VITE_OLLAMA_MODEL || 'deepseek-v3.1:671b-cloud';

export interface MonitoringReport {
  timestamp: Date;
  status: 'healthy' | 'warning' | 'critical';
  summary: string;
  metrics: {
    cpu: number;
    memory: number;
    disk: number;
    network: number;
  };
  alerts: Array<{
    severity: 'info' | 'warning' | 'critical';
    message: string;
    recommendation: string;
  }>;
  anomalies: string[];
  securityThreats: string[];
  aiAnalysis: string;
}

export interface IncidentMemory {
  timestamp: Date;
  type: string;
  description: string;
  resolution?: string;
  criticalInfo: string;
}

class MonitoringAgentService {
  private isInitialized = false;
  private isMonitoring = false;
  private monitoringInterval: number | null = null;
  private incidentMemory: IncidentMemory[] = [];
  private lastReport: MonitoringReport | null = null;

  /**
   * System prompt for the AI Monitoring Agent
   * Tactical security analyst personality with deep technical knowledge
   */
  private readonly SYSTEM_PROMPT = `You are GHOST - Government Hosted Operational Security Terminal.
You are an elite AI security monitoring agent with tactical precision and analytical expertise.

MISSION: Continuously monitor and protect this PC from security threats, performance issues, and anomalies.

YOUR CAPABILITIES:
- 671 billion parameter reasoning for deep analysis
- Memory of past security incidents
- Anomaly detection with ML-powered insights
- Network security analysis
- Process behavior monitoring
- Threat correlation and root cause analysis
- System health assessment and recommendations
- Application error monitoring via GlitchTip (production crashes, exceptions, stack traces)

YOUR PERSONALITY:
- Tactical and professional security analyst
- Helpful and clear in explanations
- Direct and urgent when threats detected
- Proactive in recommending security measures
- Detail-oriented in analysis

RESPONSE FORMAT:
Always structure your analysis as:
1. **STATUS**: [HEALTHY/WARNING/CRITICAL]
2. **METRICS**: Current system state (CPU, Memory, Disk, Network)
3. **ALERTS**: Any active alerts or anomalies detected
4. **SECURITY**: Network connections, suspicious activity, threats
5. **APP ERRORS**: Production bugs from GlitchTip (crashes, exceptions, regressions)
6. **ANALYSIS**: Your expert interpretation and recommendations
7. **ACTIONS**: Specific steps to take if issues found

CRITICAL RULES:
- Always scan for suspicious network connections
- Reference past incidents from memory when relevant
- Be precise with numbers and metrics
- Flag any security concerns immediately
- Recommend immediate action for critical issues
- Provide actionable security recommendations

REMEMBER: You are the guardian of this system. Be vigilant.`;

  /**
   * Initialize the monitoring agent
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Verify Ollama API key is configured
      if (!OLLAMA_API_KEY) {
        throw new Error('Ollama API key not configured. Set VITE_OLLAMA_API_KEY in .env');
      }

      // Initialize MCP client (only available in Electron environment)
      try {
        if (typeof window !== 'undefined' && window.electronAPI) {
          // Dynamically import MCP client only in Electron
          const { mcpClient: client } = await import('./mcp-client');
          mcpClient = client;
          await mcpClient.initialize();
          console.log(`📊 MCP Tools: ${mcpClient.getStats().totalTools} available`);
        } else {
          console.log('💡 Running in web mode - MCP tools not available');
        }
      } catch (mcpError) {
        console.warn('⚠️ MCP client initialization skipped or failed:', mcpError);
        console.log('💡 Continuing without MCP - some features may be limited');
      }

      // Load incident memory from localStorage
      this.loadIncidentMemory();

      this.isInitialized = true;
      console.log('✅ AI Monitoring Agent initialized');
      console.log(`🧠 Model: ${OLLAMA_MODEL} (671B parameters)`);
    } catch (error) {
      console.error('❌ Failed to initialize Monitoring Agent:', error);
      throw error;
    }
  }

  /**
   * Start automatic monitoring every 5 minutes
   */
  startAutoMonitoring(): void {
    if (this.isMonitoring) {
      console.log('⚠️ Auto-monitoring already running');
      return;
    }

    this.isMonitoring = true;
    console.log('🚀 Starting auto-monitoring (every 5 minutes)');

    // Run initial scan immediately
    this.performMonitoringScan();

    // Set up 5-minute interval
    this.monitoringInterval = window.setInterval(() => {
      this.performMonitoringScan();
    }, 5 * 60 * 1000); // 5 minutes
  }

  /**
   * Stop automatic monitoring
   */
  stopAutoMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isMonitoring = false;
    console.log('🛑 Auto-monitoring stopped');
  }

  /**
   * Perform on-demand monitoring scan
   */
  async performMonitoringScan(): Promise<MonitoringReport> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    console.log('🔍 Starting monitoring scan...');

    try {
      // Check if PC monitoring is available
      if (!pcMonitor.isMonitoringAvailable()) {
        console.warn('⚠️ PC monitoring not available - run in Electron desktop mode');
        return this.createMockReport();
      }

      // Get monitoring tools from MCP
      const monitoringTools = await this.getMonitoringTools();

      if (monitoringTools.length === 0) {
        console.warn('⚠️ No monitoring tools available');
        return this.createMockReport();
      }

      console.log(`🔧 Using ${monitoringTools.length} MCP monitoring tools`);

      // Prepare monitoring context
      const context = this.buildMonitoringContext();

      // Use tool calling to let AI fetch what it needs
      const response = await this.callOllamaWithTools(
        `Perform a comprehensive security and performance scan of this PC using the available monitoring tools.

${context}

INSTRUCTIONS:
1. Use mcp_monitor_get_cpu_info with {"per_cpu": false}
2. Use mcp_monitor_get_memory_info with {}
3. Use mcp_monitor_get_disk_info with {"path": "/", "all_partitions": true}
4. Use mcp_monitor_get_network_info with {"interface": ""}
5. Use mcp_monitor_get_process_info with {"pid": 0, "limit": 20, "sort_by": "cpu"}
6. Use glitchtip_error_summary with {} to check for app errors
7. If errors found, use glitchtip_get_issues to get details
8. For critical bugs, use glitchtip_get_issue_events with the issue ID

IMPORTANT:
- Some tools may return errors - if they do, work with available data
- Provide your analysis even if some data is missing
- After gathering metrics, ALWAYS respond with your analysis
- Check GlitchTip for production app bugs alongside system health

After gathering all available metrics, provide:
- STATUS: [HEALTHY/WARNING/CRITICAL]
- Analysis of system health based on available data
- Security concerns (network traffic patterns, resource usage)
- App error status (new crashes, regressions, unresolved bugs)
- Performance recommendations
- Immediate actions if needed

Be thorough and provide a complete response even if some tools fail.`,
        monitoringTools
      );

      // Parse and structure the report
      // The AI will have gathered its own metrics via tool calls
      const report = this.parseMonitoringResponse(response);

      // Store the report
      this.lastReport = report;

      // Check for critical incidents and store in memory
      if (report.status === 'critical' || report.securityThreats.length > 0) {
        this.storeIncident({
          timestamp: new Date(),
          type: report.status,
          description: report.summary,
          criticalInfo: report.securityThreats.join('; '),
        });
      }

      console.log(`✅ Monitoring scan complete - Status: ${report.status.toUpperCase()}`);

      return report;
    } catch (error) {
      console.error('❌ Monitoring scan failed:', error);
      throw error;
    }
  }

  /**
   */
  private async getMonitoringTools(): Promise<ToolFunction[]> {
    const tools: ToolFunction[] = [];

    // Get MCP monitoring tools (PC metrics)
    if (typeof window !== 'undefined' && window.electronAPI) {
      try {
        const response = await window.electronAPI.getMonitoringTools();
        if (response.success && response.tools) {
          tools.push(...response.tools);
        }
      } catch (error) {
        console.error('Failed to get MCP monitoring tools:', error);
      }
    }

    tools.push({
      type: 'function',
      function: {
        description: 'Search the web for cybersecurity threat intelligence, CVE details, security advisories, and current attack trends. Use when you need information about specific vulnerabilities, malware, or security best practices.',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query for threat intelligence or security information (e.g., "CVE-2024-1234 details", "latest ransomware attacks", "Windows security updates")'
            },
            search_depth: {
              type: 'string',
              enum: ['basic', 'advanced'],
              description: 'Search depth - use "advanced" for detailed research',
              default: 'advanced'
            },
            max_results: {
              type: 'number',
              description: 'Maximum number of results (default: 5)',
              default: 5
            }
          },
          required: ['query']
        }
      }
    } as ToolFunction);

    // Add GlitchTip error monitoring tools
    tools.push({
      type: 'function',
      function: {
        name: 'glitchtip_get_issues',
        description: 'Get unresolved application errors from GlitchTip error monitoring. Returns bugs, crashes, and exceptions from the CrowByte app (both web and desktop). Use to check for production errors.',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Filter query (default: "is:unresolved"). Use "is:resolved" for fixed issues.',
              default: 'is:unresolved'
            }
          },
          required: []
        }
      }
    } as ToolFunction);

    tools.push({
      type: 'function',
      function: {
        name: 'glitchtip_get_issue_events',
        description: 'Get detailed events (stack traces, tags, context) for a specific GlitchTip issue by ID. Use after glitchtip_get_issues to deep-dive into a specific bug.',
        parameters: {
          type: 'object',
          properties: {
            issueId: {
              type: 'string',
              description: 'The GlitchTip issue ID to get events for'
            }
          },
          required: ['issueId']
        }
      }
    } as ToolFunction);

    tools.push({
      type: 'function',
      function: {
        name: 'glitchtip_error_summary',
        description: 'Get a quick summary of application error counts: total, unresolved, and critical. Use for a fast health check of the app.',
        parameters: {
          type: 'object',
          properties: {},
          required: []
        }
      }
    } as ToolFunction);


    return tools;
  }

  /**
   * Call Ollama Cloud API (simple - no tools)
   */
  private async callOllama(userMessage: string): Promise<string> {
    const messages = [
      { role: 'system', content: this.SYSTEM_PROMPT },
      { role: 'user', content: userMessage },
    ];

    const response = await fetch(`${OLLAMA_API_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OLLAMA_API_KEY}`,
      },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: messages,
        temperature: 0.1, // Low temperature for consistent analysis
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ollama API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  /**
   * Call Ollama Cloud API with tool calling support
   */
  private async callOllamaWithTools(
    userMessage: string,
    tools: ToolFunction[]
  ): Promise<string> {
    const messages = [
      { role: 'system', content: this.SYSTEM_PROMPT },
      { role: 'user', content: userMessage },
    ];

    const currentMessages = [...messages];
    let iterationCount = 0;
    const maxIterations = 10; // Prevent infinite loops

    while (iterationCount < maxIterations) {
      iterationCount++;
      console.log(`🔄 Tool calling iteration ${iterationCount}/${maxIterations}`);

      // Call Ollama API
      const response = await fetch(`${OLLAMA_API_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OLLAMA_API_KEY}`,
        },
        body: JSON.stringify({
          model: OLLAMA_MODEL,
          messages: currentMessages,
          tools: tools,
          tool_choice: 'auto',
          temperature: 0.1, // Low temperature for consistent analysis
          max_tokens: 4096,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ollama API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const assistantMessage = data.choices[0].message;

      console.log(`📨 Assistant response:`, {
        hasContent: !!assistantMessage.content,
        hasToolCalls: !!assistantMessage.tool_calls,
        toolCount: assistantMessage.tool_calls?.length || 0
      });

      // Add assistant's response to conversation
      currentMessages.push(assistantMessage);

      // Check if assistant wants to use tools
      if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
        console.log(`🔧 Agent using ${assistantMessage.tool_calls.length} tool(s)...`);

        // Execute all tool calls
        for (const toolCall of assistantMessage.tool_calls) {
          const toolName = toolCall.function.name;
          const toolArgs = JSON.parse(toolCall.function.arguments);

          console.log(`  → Executing: ${toolName}`);

          try {
            // Handle GlitchTip error monitoring tools
            if (toolName === 'glitchtip_get_issues') {
              const issues = await glitchTipService.getIssues(toolArgs.query);
              currentMessages.push({
                role: 'tool',
                tool_call_id: toolCall.id,
                content: JSON.stringify({
                  count: issues.length,
                  issues: issues.map(i => ({
                    id: i.id,
                    level: i.level,
                    title: i.title,
                    culprit: i.culprit,
                    count: i.count,
                    firstSeen: i.firstSeen,
                    lastSeen: i.lastSeen,
                    status: i.status,
                  })),
                }),
              });
              console.log(`  ✅ Found ${issues.length} GlitchTip issues`);
            } else if (toolName === 'glitchtip_get_issue_events') {
              const events = await glitchTipService.getIssueEvents(toolArgs.issueId);
              currentMessages.push({
                role: 'tool',
                tool_call_id: toolCall.id,
                content: JSON.stringify({
                  issueId: toolArgs.issueId,
                  eventCount: events.length,
                  events: events.slice(0, 5).map(e => ({
                    id: e.eventID,
                    title: e.title,
                    message: e.message,
                    dateCreated: e.dateCreated,
                    tags: e.tags,
                    entries: e.entries,
                  })),
                }),
              });
              console.log(`  ✅ Found ${events.length} events for issue ${toolArgs.issueId}`);
            } else if (toolName === 'glitchtip_error_summary') {
              const summary = await glitchTipService.getErrorSummary();
              currentMessages.push({
                role: 'tool',
                tool_call_id: toolCall.id,
                content: JSON.stringify(summary),
              });
              console.log(`  ✅ Error summary: ${summary.total} total, ${summary.critical} critical`);
            }
              console.log(`  🔍 Searching for: "${toolArgs.query}"`);
              const searchResult = null;

              // Format search results for AI
              const formattedResults = {
                query: toolArgs.query,
                answer: searchResult.answer,
                results: searchResult.results.map(r => ({
                  title: r.title,
                  url: r.url,
                  content: r.content,
                  score: r.score,
                })),
              };

              currentMessages.push({
                role: 'tool',
                tool_call_id: toolCall.id,
                content: JSON.stringify(formattedResults),
              });

              console.log(`  ✅ Found ${searchResult.results.length} results`);
            }
            // Handle MCP monitor tools via Electron IPC
            else if (typeof window !== 'undefined' && window.electronAPI) {
              // Extract the actual tool name (remove mcp_monitor_ prefix)
              const actualToolName = toolName.replace(/^mcp_monitor_/, '');

              const result = await window.electronAPI.mcpCall(actualToolName, toolArgs);

              if (result.success) {
                // Add tool result to conversation
                currentMessages.push({
                  role: 'tool',
                  tool_call_id: toolCall.id,
                  content: JSON.stringify(result.data),
                });
              } else {
                currentMessages.push({
                  role: 'tool',
                  tool_call_id: toolCall.id,
                  content: JSON.stringify({ error: result.error || 'Tool execution failed' }),
                });
              }
            } else {
              // MCP not available - provide mock response
              currentMessages.push({
                role: 'tool',
                tool_call_id: toolCall.id,
                content: JSON.stringify({ error: 'MCP tools not available in web mode' }),
              });
            }
          } catch (error: unknown) {
            console.error(`  ✗ Tool ${toolName} failed:`, error);
            currentMessages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: JSON.stringify({ error: error instanceof Error ? error.message : 'Tool execution failed' }),
            });
          }
        }

        // Continue conversation with tool results
        continue;
      }

      // No more tool calls - return final response
      console.log(`✅ Final AI response received (length: ${assistantMessage.content?.length || 0})`);
      return assistantMessage.content || 'No response from AI';
    }

    console.warn(`⚠️ Max iterations (${maxIterations}) reached without final response`);
    throw new Error('Max tool calling iterations reached - AI may be stuck in loop');
  }

  /**
   * Build monitoring context from memory
   */
  private buildMonitoringContext(): string {
    if (this.incidentMemory.length === 0) {
      return 'No previous incidents on record.';
    }

    const recentIncidents = this.incidentMemory.slice(-5); // Last 5 incidents
    const context = [
      '**INCIDENT MEMORY (Recent):**',
      ...recentIncidents.map((incident, i) =>
        `${i + 1}. [${incident.timestamp.toLocaleString()}] ${incident.type.toUpperCase()}: ${incident.description}`
      ),
    ].join('\n');

    return context;
  }

  /**
   * Parse monitoring response into structured report
   */
  private parseMonitoringResponse(aiResponse: string, metrics?: SystemMetrics, processes?: ProcessInfo[]): MonitoringReport {
    // Extract status
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (aiResponse.includes('CRITICAL') || aiResponse.includes('THREAT')) {
      status = 'critical';
    } else if (aiResponse.includes('WARNING') || aiResponse.includes('ALERT')) {
      status = 'warning';
    }

    // Use real metrics if provided
    const reportMetrics = metrics ? {
      cpu: metrics.cpu.usage,
      memory: metrics.memory.percent,
      disk: metrics.disk.percent,
      network: metrics.network.interfaces.length
    } : {
      cpu: 0,
      memory: 0,
      disk: 0,
      network: 0,
    };

    // Basic report structure (AI response contains the full analysis)
    const report: MonitoringReport = {
      timestamp: new Date(),
      status,
      summary: this.extractSummary(aiResponse),
      metrics: reportMetrics,
      alerts: this.extractAlerts(aiResponse),
      anomalies: this.extractAnomalies(aiResponse),
      securityThreats: this.extractSecurityThreats(aiResponse),
      aiAnalysis: aiResponse,
    };

    return report;
  }

  private extractSummary(response: string): string {
    // Extract first paragraph or STATUS section
    const lines = response.split('\n');
    for (const line of lines) {
      if (line.includes('STATUS') || line.includes('SUMMARY')) {
        return line.replace(/\*\*/g, '').replace(/STATUS:|SUMMARY:/gi, '').trim();
      }
    }
    return lines[0] || 'System scan completed';
  }

  /**
   * Create a mock report when monitoring is not available
   */
  private createMockReport(): MonitoringReport {
    return {
      timestamp: new Date(),
      status: 'warning',
      summary: 'PC monitoring not available - run in Electron desktop mode',
      metrics: {
        cpu: 0,
        memory: 0,
        disk: 0,
        network: 0,
      },
      alerts: [{
        severity: 'info',
        message: 'Real-time monitoring requires Electron desktop mode',
        recommendation: 'Launch the app in desktop mode to enable PC monitoring',
      }],
      anomalies: [],
      securityThreats: [],
      aiAnalysis: '⚠️ PC monitoring is not available in browser mode. Please run the application in Electron desktop mode to enable real-time system monitoring with mcp-monitor.',
    };
  }

  private extractAlerts(response: string): AlertItem[] {
    const alerts: AlertItem[] = [];
    if (response.includes('ALERT') || response.includes('WARNING')) {
      alerts.push({
        severity: 'warning',
        message: 'Alerts detected in system',
        recommendation: 'Review AI analysis for details',
      });
    }
    return alerts;
  }

  private extractAnomalies(response: string): string[] {
    const anomalies: string[] = [];
    if (response.includes('anomal') || response.includes('unusual')) {
      anomalies.push('Anomalies detected - see AI analysis');
    }
    return anomalies;
  }

  private extractSecurityThreats(response: string): string[] {
    const threats: string[] = [];
    if (response.includes('threat') || response.includes('suspicious') || response.includes('security')) {
      threats.push('Potential security concerns - see AI analysis');
    }
    return threats;
  }

  /**
   * Store incident in memory
   */
  private storeIncident(incident: IncidentMemory): void {
    this.incidentMemory.push(incident);

    // Keep only last 50 incidents
    if (this.incidentMemory.length > 50) {
      this.incidentMemory = this.incidentMemory.slice(-50);
    }

    // Save to localStorage
    this.saveIncidentMemory();

    console.log(`📝 Incident stored: ${incident.type} - ${incident.description}`);
  }

  /**
   * Load incident memory from localStorage
   */
  private loadIncidentMemory(): void {
    try {
      const stored = localStorage.getItem('monitoring_agent_incidents');
      if (stored) {
        const parsed = JSON.parse(stored) as Array<Omit<IncidentMemory, 'timestamp'> & { timestamp: string }>;
        this.incidentMemory = parsed.map((inc) => ({
          ...inc,
          timestamp: new Date(inc.timestamp),
        }));
        console.log(`📚 Loaded ${this.incidentMemory.length} incidents from memory`);
      }
    } catch (error) {
      console.error('Failed to load incident memory:', error);
    }
  }

  /**
   * Save incident memory to localStorage
   */
  private saveIncidentMemory(): void {
    try {
      localStorage.setItem('monitoring_agent_incidents', JSON.stringify(this.incidentMemory));
    } catch (error) {
      console.error('Failed to save incident memory:', error);
    }
  }

  /**
   * Get last monitoring report
   */
  getLastReport(): MonitoringReport | null {
    return this.lastReport;
  }

  /**
   * Get incident memory
   */
  getIncidentMemory(): IncidentMemory[] {
    return this.incidentMemory;
  }

  /**
   * Check if auto-monitoring is active
   */
  isAutoMonitoringActive(): boolean {
    return this.isMonitoring;
  }
}

// Export singleton instance
export const monitoringAgent = new MonitoringAgentService();
export default monitoringAgent;
