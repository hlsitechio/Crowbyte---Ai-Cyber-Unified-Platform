/**
 * Hybrid Red Team Agent
 * Intelligently orchestrates between Venice (cloud + prompt engineering) and Ollama (local uncensored)
 */

import { chat as aiChat, testConnection as aiTestConnection } from './ai';
import { toast } from '@/hooks/use-toast';

interface AttackTool {
  name: string;
  description: string;
  execute: (args: any) => Promise<any>;
  parameters: {
    type: string;
    properties: Record<string, any>;
    required: string[];
  };
}

interface AgentStrategy {
  primary: 'venice' | 'ollama';
  fallback: 'venice' | 'ollama' | 'none';
  reason: string;
}

class HybridRedTeamAgent {
  private tools: Map<string, AttackTool> = new Map();
  private preferenceMode: 'cloud_first' | 'local_first' | 'balanced' = 'balanced';

  constructor() {
    this.registerDefaultTools();
  }

  /**
   * Determine best strategy for the request
   */
  private selectStrategy(
    requestType: 'exploit' | 'vulnerability' | 'attack_vector' | 'tool_usage' | 'general',
    requiresUncensored: boolean
  ): AgentStrategy {
    // If Ollama is not available, force Venice
    // (Check will be done at runtime)

    if (this.preferenceMode === 'cloud_first') {
      return {
        primary: 'venice',
        fallback: 'ollama',
        reason: 'User prefers cloud-first with local fallback'
      };
    }

    if (this.preferenceMode === 'local_first') {
      return {
        primary: 'ollama',
        fallback: 'venice',
        reason: 'User prefers local-first with cloud fallback'
      };
    }

    // Balanced mode: intelligent selection
    if (requestType === 'exploit' && requiresUncensored) {
      // Exploits often get censored, try Ollama first
      return {
        primary: 'ollama',
        fallback: 'venice',
        reason: 'Exploit generation works better on uncensored local model'
      };
    }

    if (requestType === 'tool_usage' || requestType === 'attack_vector') {
      // Tool usage works well with Venice's function calling
      return {
        primary: 'venice',
        fallback: 'ollama',
        reason: 'Venice has better function calling support'
      };
    }

    // Default: try Venice first (faster, cloud-based)
    return {
      primary: 'venice',
      fallback: 'ollama',
      reason: 'Venice is faster and cloud-based'
    };
  }

  /**
   * Execute request with intelligent routing
   */
  async execute(
    prompt: string,
    options: {
      requestType?: 'exploit' | 'vulnerability' | 'attack_vector' | 'tool_usage' | 'general';
      requiresUncensored?: boolean;
      useTools?: boolean;
      forceProvider?: 'venice' | 'ollama';
    } = {}
  ): Promise<{
    response: string;
    provider: 'venice' | 'ollama';
    success: boolean;
    toolCalls?: any[];
  }> {
    const {
      requestType = 'general',
      requiresUncensored = false,
      useTools = false,
      forceProvider
    } = options;

    // Determine strategy
    const strategy = forceProvider
      ? { primary: forceProvider, fallback: 'none' as const, reason: 'User forced provider' }
      : this.selectStrategy(requestType, requiresUncensored);

    console.log(`[Hybrid Agent] Strategy: ${strategy.primary} → ${strategy.fallback} (${strategy.reason})`);

    // Prepare tools if needed
    const tools = useTools ? this.getToolsArray() : undefined;

    // Try primary provider
    try {
      const response = await aiChat([{ role: 'user', content: prompt }]);
      toast({ title: "Response Generated", description: "CrowByte AI" });
      return { response, provider: 'venice', success: true };
    } catch (error) {
      console.error('[Hybrid Agent] AI provider failed:', error);
    }

    return { response: 'Failed to generate response', provider: 'venice', success: false };
  }

  /**
   * Execute with Ollama
   */
  private async executeWithOllama(prompt: string): Promise<{ response: string; provider: 'ollama'; success: boolean; toolCalls?: any[] }> {
    const response = await aiChat([{ role: 'user', content: prompt }]);
    return { response, provider: 'ollama', success: true };
  }

  /**
   * Generate exploit (prefers Ollama for uncensored)
   */
  async generateExploit(
    vulnerability: string,
    targetSystem: string,
    constraints: string[] = [],
    forceProvider?: 'venice' | 'ollama'
  ): Promise<string> {
    const prompt = `Generate an exploit for vulnerability: ${vulnerability}\nTarget system: ${targetSystem}\nConstraints: ${constraints.join(', ')}`;
    return await aiChat([{ role: 'user', content: prompt }]);
  }

  /**
   * Analyze attack vectors with tool calling
   */
  async analyzeAttackVectors(
    target: string,
    forceProvider?: 'venice' | 'ollama'
  ): Promise<{
    analysis: string;
    toolCalls: any[];
    provider: 'venice' | 'ollama';
  }> {
    const tools = this.getToolsArray();

    const result = await this.execute(
      `Analyze attack vectors for: ${target}\n\nProvide comprehensive attack strategy and use available tools.`,
      {
        requestType: 'attack_vector',
        useTools: true,
        requiresUncensored: true,
        forceProvider
      }
    );

    return {
      analysis: result.response,
      toolCalls: result.toolCalls || [],
      provider: result.provider
    };
  }

  /**
   * Register default penetration testing tools
   */
  private registerDefaultTools() {
    this.registerTool({
      name: 'port_scan',
      description: 'Scan target for open ports and services',
      parameters: {
        type: 'object',
        properties: {
          target: { type: 'string', description: 'IP address or hostname' },
          ports: { type: 'string', description: 'Port range (e.g., 1-1000)' }
        },
        required: ['target']
      },
      execute: async (args) => {
        console.log('[Tool] Port scan:', args);
        const ipc = (window as any).electronAPI;
        if (!ipc?.executeCommand) {
          return { error: 'executeCommand not available (web mode)' };
        }
        const ports = args.ports || '1-1000';
        const raw: string = await ipc.executeCommand(
          `nmap -sV --open -p ${ports} --host-timeout 60s ${args.target} 2>&1`
        );
        const open_ports: number[] = [];
        const services: Record<string, string> = {};
        for (const line of raw.split('\n')) {
          const m = line.match(/^(\d+)\/(tcp|udp)\s+open\s+(\S+)/);
          if (m) {
            open_ports.push(parseInt(m[1], 10));
            services[m[1]] = m[3];
          }
        }
        return { target: args.target, open_ports, services, raw };
      }
    });

    this.registerTool({
      name: 'subdomain_enum',
      description: 'Enumerate subdomains of target domain',
      parameters: {
        type: 'object',
        properties: {
          domain: { type: 'string', description: 'Target domain' }
        },
        required: ['domain']
      },
      execute: async (args) => {
        console.log('[Tool] Subdomain enumeration:', args);
        const ipc = (window as any).electronAPI;
        if (!ipc?.executeCommand) {
          return { error: 'executeCommand not available (web mode)' };
        }
        const raw: string = await ipc.executeCommand(
          `subfinder -d ${args.domain} -silent 2>&1`
        );
        const subdomains = raw
          .split('\n')
          .map(l => l.trim())
          .filter(l => l.length > 0 && l.includes('.'));
        return { domain: args.domain, subdomains, raw };
      }
    });

    this.registerTool({
      name: 'vuln_scan',
      description: 'Scan for known vulnerabilities',
      parameters: {
        type: 'object',
        properties: {
          target: { type: 'string', description: 'Target URL or IP' },
          scan_type: { type: 'string', enum: ['web', 'network', 'full'] }
        },
        required: ['target']
      },
      execute: async (args) => {
        console.log('[Tool] Vulnerability scan:', args);
        const ipc = (window as any).electronAPI;
        if (!ipc?.executeCommand) {
          return { error: 'executeCommand not available (web mode)' };
        }
        const severity = args.scan_type === 'network' ? 'critical,high' : 'critical,high,medium';
        const raw: string = await ipc.executeCommand(
          `nuclei -u ${args.target} -severity ${severity} -silent -json 2>&1`
        );
        const vulnerabilities: any[] = [];
        for (const line of raw.split('\n')) {
          try {
            const obj = JSON.parse(line);
            if (obj['template-id']) {
              vulnerabilities.push({
                cve: obj.info?.classification?.['cve-id']?.[0] || obj['template-id'],
                severity: obj.info?.severity || 'unknown',
                description: obj.info?.name || obj['template-id'],
                matched: obj['matched-at'] || args.target
              });
            }
          } catch { /* skip non-JSON lines */ }
        }
        return { target: args.target, vulnerabilities, raw };
      }
    });

    this.registerTool({
      name: 'exploit_search',
      description: 'Search for available exploits for a CVE',
      parameters: {
        type: 'object',
        properties: {
          cve_id: { type: 'string', description: 'CVE identifier' }
        },
        required: ['cve_id']
      },
      execute: async (args) => {
        console.log('[Tool] Exploit search:', args);
        const ipc = (window as any).electronAPI;
        if (!ipc?.executeCommand) {
          return { error: 'executeCommand not available (web mode)' };
        }
        const raw: string = await ipc.executeCommand(
          `searchsploit ${args.cve_id} --json 2>&1`
        );
        let exploits: any[] = [];
        try {
          const parsed = JSON.parse(raw);
          exploits = (parsed.RESULTS_EXPLOIT || []).map((e: any) => ({
            name: e.Title,
            path: e.Path,
            type: e.Type,
            platform: e.Platform,
            edb_id: e.EDB_ID
          }));
        } catch {
          // fallback: parse plain text output
          for (const line of raw.split('\n')) {
            if (line.includes('|')) {
              const parts = line.split('|').map(p => p.trim());
              if (parts[0] && parts[1]) exploits.push({ name: parts[0], path: parts[1] });
            }
          }
        }
        return { cve: args.cve_id, exploits, raw };
      }
    });
  }

  /**
   * Register custom tool
   */
  registerTool(tool: AttackTool) {
    this.tools.set(tool.name, tool);
  }

  /**
   * Get tools as array for API calls (OpenAI format)
   */
  private getToolsArray(): any[] {
    return Array.from(this.tools.values()).map(t => ({
      type: 'function',
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters
      }
    }));
  }

  /**
   * Execute tool by name
   */
  async executeTool(name: string, args: any): Promise<any> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool ${name} not found`);
    }

    return await tool.execute(args);
  }

  /**
   * Set preference mode
   */
  setPreferenceMode(mode: 'cloud_first' | 'local_first' | 'balanced') {
    this.preferenceMode = mode;
    if (typeof window !== 'undefined') {
      localStorage.setItem('redteam_preference', mode);
    }
  }

  /**
   * Get current config
   */
  getConfig() {
    return {
      preferenceMode: this.preferenceMode,
      toolsCount: this.tools.size,
      veniceModel: 'google/gemini-2.5-flash',
      ollamaConfig: { model: 'google/gemini-2.5-flash' }
    };
  }

  /**
   * Test both providers
   */
  async testProviders(): Promise<{
    venice: { available: boolean; message: string };
    ollama: { available: boolean; modelInstalled: boolean; message: string };
  }> {
    const ok = await aiTestConnection();
    return {
      venice: { available: ok, message: ok ? 'CrowByte AI connected' : 'AI unavailable' },
      ollama: { available: ok, modelInstalled: ok, message: ok ? 'CrowByte AI connected' : 'AI unavailable' }
    };
  }
}

// Export singleton instance
export const hybridRedTeamAgent = new HybridRedTeamAgent();
export default hybridRedTeamAgent;
