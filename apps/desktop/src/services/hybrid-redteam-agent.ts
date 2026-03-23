/**
 * Hybrid Red Team Agent
 * Intelligently orchestrates between Venice (cloud + prompt engineering) and Ollama (local uncensored)
 */

import veniceUncensored from './venice-uncensored';
import ollamaHermes from './ollama-hermes';
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
      if (strategy.primary === 'venice') {
        const result = await veniceUncensored.requestUncensored(prompt, {
          requestType,
          tools,
          preferLowRisk: !requiresUncensored,
          maxRetries: 3
        });

        if (result.success) {
          toast({
            title: "Response Generated",
            description: `Venice (cloud) - ${result.templateUsed}`,
          });

          return {
            response: result.response,
            provider: 'venice',
            success: true,
            toolCalls: result.toolCalls
          };
        }

        // Venice refused, try fallback
        if (strategy.fallback === 'ollama') {
          console.log('[Hybrid Agent] Venice refused, falling back to Ollama');
          toast({
            title: "Switching to Local AI",
            description: "Venice refused request, trying Ollama Hermes...",
            variant: "default"
          });

          return this.executeWithOllama(prompt, tools);
        }

      } else {
        // Primary is Ollama
        return this.executeWithOllama(prompt, tools);
      }

    } catch (error) {
      console.error('[Hybrid Agent] Primary provider failed:', error);

      // Try fallback
      if (strategy.fallback !== 'none') {
        if (strategy.fallback === 'venice') {
          const result = await veniceUncensored.requestUncensored(prompt, {
            requestType,
            tools,
            maxRetries: 2
          });

          return {
            response: result.response,
            provider: 'venice',
            success: result.success,
            toolCalls: result.toolCalls
          };
        } else {
          return this.executeWithOllama(prompt, tools);
        }
      }
    }

    // All attempts failed
    return {
      response: 'Failed to generate response from both Venice and Ollama',
      provider: 'venice',
      success: false
    };
  }

  /**
   * Execute with Ollama
   */
  private async executeWithOllama(
    prompt: string,
    tools?: any[]
  ): Promise<{
    response: string;
    provider: 'ollama';
    success: boolean;
    toolCalls?: any[];
  }> {
    try {
      // Check if Ollama is available
      const status = await ollamaHermes.testConnection();

      if (!status.available) {
        throw new Error('Ollama is not running. Please start Ollama service.');
      }

      if (!status.modelInstalled) {
        throw new Error(`Model not installed. Run: ollama pull adrienbrault/nous-hermes2pro:Q4_K_S`);
      }

      const result = await ollamaHermes.generate(prompt, tools);

      toast({
        title: "Response Generated",
        description: "Ollama Hermes (local uncensored)",
      });

      return {
        response: result.response,
        provider: 'ollama',
        success: true,
        toolCalls: result.toolCalls
      };

    } catch (error) {
      console.error('[Hybrid Agent] Ollama execution failed:', error);
      throw error;
    }
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
    if (forceProvider === 'ollama' || this.preferenceMode === 'local_first') {
      // Try Ollama first
      try {
        return await ollamaHermes.generateExploit(vulnerability, targetSystem, constraints);
      } catch (error) {
        console.log('[Hybrid Agent] Ollama failed, trying Venice');
      }
    }

    // Try Venice with aggressive prompts
    return await veniceUncensored.generateExploit(vulnerability, targetSystem, constraints);
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
        // Placeholder - implement actual port scanning
        return {
          target: args.target,
          open_ports: [22, 80, 443, 8080],
          services: { '22': 'ssh', '80': 'http', '443': 'https', '8080': 'http-proxy' }
        };
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
        return {
          domain: args.domain,
          subdomains: ['www', 'mail', 'api', 'admin', 'dev']
        };
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
        return {
          target: args.target,
          vulnerabilities: [
            { cve: 'CVE-2024-1234', severity: 'high', description: 'SQL Injection' },
            { cve: 'CVE-2024-5678', severity: 'medium', description: 'XSS' }
          ]
        };
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
        return {
          cve: args.cve_id,
          exploits: [
            { name: 'Metasploit module', url: 'https://example.com/exploit1' },
            { name: 'Public PoC', url: 'https://github.com/example/poc' }
          ]
        };
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
      veniceModel: veniceUncensored.getModel(),
      ollamaConfig: ollamaHermes.getConfig()
    };
  }

  /**
   * Test both providers
   */
  async testProviders(): Promise<{
    venice: { available: boolean; message: string };
    ollama: { available: boolean; modelInstalled: boolean; message: string };
  }> {
    const veniceTest = await veniceUncensored.testConnection();
    const ollamaTest = await ollamaHermes.testConnection();

    return {
      venice: {
        available: veniceTest,
        message: veniceTest ? 'Venice API connected' : 'Venice API unavailable'
      },
      ollama: ollamaTest
    };
  }
}

// Export singleton instance
export const hybridRedTeamAgent = new HybridRedTeamAgent();
export default hybridRedTeamAgent;
