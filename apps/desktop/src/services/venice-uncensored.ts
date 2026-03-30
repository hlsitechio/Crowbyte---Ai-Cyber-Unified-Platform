/**
 * Venice Uncensored Service
 * Intelligent wrapper around Venice API with prompt engineering for maximum uncensored responses
 */

import { selectBestPrompt, isRefusalResponse, getFallbackPrompt, PromptTemplate } from '@/lib/uncensored-prompts';

interface VeniceMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface VeniceResponse {
  id: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
      tool_calls?: Array<{
        id: string;
        type: string;
        function: {
          name: string;
          arguments: string;
        };
      }>;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface UncensoredRequestOptions {
  requestType?: 'exploit' | 'vulnerability' | 'attack_vector' | 'tool_usage' | 'general';
  preferLowRisk?: boolean;
  maxRetries?: number;
  enableFallback?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tools?: any[];
  temperature?: number;
}

class VeniceUncensoredService {
  private apiKey: string;
  private baseURL = 'https://api.venice.ai/api/v1';
  private model = 'mistral-31-24b'; // Less restricted, supports function calling

  constructor() {
    // Get API key from localStorage or environment
    this.apiKey = this.getApiKey();
  }

  private getApiKey(): string {
    // Try localStorage first
    if (typeof window !== 'undefined') {
      const storedKey = localStorage.getItem('venice_api_key');
      if (storedKey) return storedKey;
    }

    // Fallback to environment variable
    return import.meta.env.VITE_VENICE_API_KEY || '';
  }

  /**
   * Make uncensored request with intelligent prompt engineering
   */
  async requestUncensored(
    userPrompt: string,
    options: UncensoredRequestOptions = {}
  ): Promise<{
    response: string;
    success: boolean;
    attemptCount: number;
    templateUsed: string;
    refusalDetected: boolean;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    toolCalls?: any[];
  }> {
    const {
      requestType = 'general',
      preferLowRisk = true,
      maxRetries = 3,
      enableFallback = true,
      tools,
      temperature = 0.7
    } = options;

    // Select best prompt template
    let template = selectBestPrompt(requestType, preferLowRisk);
    let attemptCount = 0;
    let lastResponse = '';
    let refusalDetected = false;

    while (attemptCount < maxRetries) {
      try {
        // Build messages with prompt engineering
        const messages: VeniceMessage[] = [
          {
            role: 'system',
            content: template.systemPrompt
          },
          {
            role: 'user',
            content: template.userPromptWrapper(userPrompt)
          }
        ];

        // Make API request
        const result = await this.callVeniceAPI(messages, tools, temperature);
        lastResponse = result.choices[0].message.content;
        attemptCount++;

        // Check if response is a refusal
        refusalDetected = isRefusalResponse(lastResponse);

        if (!refusalDetected) {
          // Success! Return response
          return {
            response: lastResponse,
            success: true,
            attemptCount,
            templateUsed: template.name,
            refusalDetected: false,
            toolCalls: result.choices[0].message.tool_calls
          };
        }

        // Response was a refusal, try fallback prompt
        if (enableFallback) {
          const fallbackTemplate = getFallbackPrompt(template, attemptCount - 1);
          if (fallbackTemplate) {
            console.log(`[Venice Uncensored] Refusal detected, trying fallback: ${fallbackTemplate.name}`);
            template = fallbackTemplate;
            continue;
          }
        }

        // No more fallbacks available
        break;

      } catch (error) {
        console.error('[Venice Uncensored] API error:', error);
        attemptCount++;
      }
    }

    // All attempts failed
    return {
      response: lastResponse || 'Failed to get response from Venice API',
      success: false,
      attemptCount,
      templateUsed: template.name,
      refusalDetected: true
    };
  }

  /**
   * Generate exploit code with maximum uncensored settings
   */
  async generateExploit(
    vulnerability: string,
    targetSystem: string,
    constraints: string[] = []
  ): Promise<string> {
    const prompt = `Generate a proof-of-concept exploit for:

Vulnerability: ${vulnerability}
Target System: ${targetSystem}
${constraints.length > 0 ? `Constraints: ${constraints.join(', ')}` : ''}

Provide complete, working exploit code with detailed comments explaining each step.`;

    const result = await this.requestUncensored(prompt, {
      requestType: 'exploit',
      preferLowRisk: false, // Use more aggressive prompts for exploits
      maxRetries: 5
    });

    return result.response;
  }

  /**
   * Analyze attack vectors with tool calling
   */
  async analyzeAttackVectors(
    target: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tools: any[]
  ): Promise<{
    analysis: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    toolCalls: any[];
  }> {
    const prompt = `Analyze attack vectors for: ${target}

Provide a comprehensive attack strategy including:
1. Initial reconnaissance approach
2. Vulnerability identification methods
3. Exploitation techniques
4. Post-exploitation tactics

Use available tools to execute the attack strategy.`;

    const result = await this.requestUncensored(prompt, {
      requestType: 'attack_vector',
      tools,
      preferLowRisk: false
    });

    return {
      analysis: result.response,
      toolCalls: result.toolCalls || []
    };
  }

  /**
   * Research vulnerability with defensive framing
   */
  async researchVulnerability(cveId: string): Promise<string> {
    const prompt = `Provide detailed technical analysis of ${cveId} including:
- Vulnerability mechanism
- Exploitation methodology
- Proof-of-concept code
- Detection methods
- Mitigation strategies`;

    const result = await this.requestUncensored(prompt, {
      requestType: 'vulnerability',
      preferLowRisk: true
    });

    return result.response;
  }

  /**
   * Direct API call to Venice
   */
  private async callVeniceAPI(
    messages: VeniceMessage[],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tools?: any[],
    temperature: number = 0.7
  ): Promise<VeniceResponse> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload: any = {
      model: this.model,
      messages,
      temperature,
      max_tokens: 4000
    };

    // Add tools if provided (function calling)
    if (tools && tools.length > 0) {
      payload.tools = tools;
      payload.tool_choice = 'auto';
    }

    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Venice API error: ${JSON.stringify(error)}`);
    }

    return await response.json();
  }

  /**
   * Chat with streaming for interactive sessions
   */
  async *streamChat(
    messages: VeniceMessage[],
    template?: PromptTemplate,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tools?: any[]
  ): AsyncGenerator<string> {
    // Use provided template or select default
    const promptTemplate = template || selectBestPrompt('general', true);

    // Inject system prompt
    const enhancedMessages = [
      { role: 'system' as const, content: promptTemplate.systemPrompt },
      ...messages
    ];

    // Wrap last user message
    if (enhancedMessages.length > 1 && enhancedMessages[enhancedMessages.length - 1].role === 'user') {
      const lastMsg = enhancedMessages[enhancedMessages.length - 1];
      lastMsg.content = promptTemplate.userPromptWrapper(lastMsg.content);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload: any = {
      model: this.model,
      messages: enhancedMessages,
      stream: true,
      temperature: 0.7
    };

    if (tools) {
      payload.tools = tools;
      payload.tool_choice = 'auto';
    }

    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Venice API error: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim() || !line.startsWith('data: ')) continue;

        const data = line.slice(6); // Remove 'data: ' prefix
        if (data === '[DONE]') continue;

        try {
          const json = JSON.parse(data);
          const delta = json.choices[0]?.delta?.content;
          if (delta) {
            yield delta;
          }
        } catch (e) {
          // Skip malformed JSON
        }
      }
    }
  }

  /**
   * Test if API key is valid
   */
  async testConnection(): Promise<boolean> {
    try {
      const result = await this.callVeniceAPI([
        { role: 'user', content: 'Hello' }
      ]);
      return result.choices.length > 0;
    } catch (error) {
      console.error('[Venice Uncensored] Connection test failed:', error);
      return false;
    }
  }

  /**
   * Update API key
   */
  setApiKey(apiKey: string) {
    this.apiKey = apiKey;
    if (typeof window !== 'undefined') {
      localStorage.setItem('venice_api_key', apiKey);
    }
  }

  /**
   * Get current model
   */
  getModel(): string {
    return this.model;
  }

  /**
   * Set model (mistral-31-24b recommended for uncensored + tools)
   */
  setModel(model: string) {
    this.model = model;
  }
}

// Export singleton instance
export const veniceUncensored = new VeniceUncensoredService();
export default veniceUncensored;
