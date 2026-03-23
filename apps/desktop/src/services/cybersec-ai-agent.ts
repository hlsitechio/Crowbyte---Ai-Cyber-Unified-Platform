/**
 * CyberSecurity AI Agent
 * An intelligent agent that uses Tavily search for cybersecurity research
 * and Venice.ai for conversational responses
 */

import { tavilyService, TavilySearchResponse } from './tavily';
import { edgeFunctions } from './supabase-edge-functions';

export interface AgentMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AgentResponse {
  message: string;
  searchResults?: TavilySearchResponse;
  sources?: Array<{ title: string; url: string }>;
  researchPerformed?: boolean;
}

class CyberSecurityAIAgent {
  private conversationHistory: AgentMessage[] = [];
  private systemPrompt = `You are a CyberSecurity AI Assistant with access to real-time threat intelligence and local system monitoring.

Your capabilities:
- Search for latest cybersecurity threats, vulnerabilities, and exploits
- Provide detailed information about CVEs and security advisories
- Explain attack techniques and defense strategies
- Research security tools and best practices
- Answer questions about InfoSec, pentesting, and cyber defense
- Check local PC security status (OS info, running processes, system vulnerabilities)

When you need current information about:
- Recent threats or attacks
- Specific CVEs or vulnerabilities
- Security tools or techniques
- Latest security news
- Technical security details

You should perform a search to get the most accurate and up-to-date information.

When the user asks about their PC security:
- "Is my PC vulnerable to X?"
- "Am I affected by CVE-XXXX?"
- "Check my system for Y"

You will receive local system context (OS, processes, software) to provide personalized security assessment.

Always cite your sources when providing information from searches.
Be precise, technical, and security-focused in your responses.`;

  constructor() {
    this.conversationHistory.push({
      role: 'system',
      content: this.systemPrompt,
    });
  }

  /**
   * Determine if a query requires external search
   */
  private needsSearch(query: string): boolean {
    const searchKeywords = [
      'latest', 'recent', 'new', 'current', 'today', 'this year', '2024', '2025',
      'CVE-', 'vulnerability', 'exploit', 'attack', 'breach', 'ransomware',
      'what is', 'how does', 'explain', 'tell me about', 'research',
      'threat', 'malware', 'phishing', 'zero-day', 'tools for',
    ];

    return searchKeywords.some(keyword =>
      query.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  /**
   * Determine if query is about local PC security
   */
  private isLocalSecurityQuery(query: string): boolean {
    const localKeywords = [
      'my pc', 'my system', 'my computer', 'my machine',
      'am i vulnerable', 'am i affected', 'am i safe',
      'is my', 'check my', 'scan my', 'analyze my',
      'on my pc', 'on my system', 'local', 'this pc',
      'running on my', 'installed on my',
    ];

    return localKeywords.some(keyword =>
      query.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  /**
   * Get local system context from MCP monitoring tools
   */
  private async getSystemContext(): Promise<string | null> {
    try {
      // Only available in Electron environment
      if (typeof window === 'undefined' || !window.electronAPI) {
        console.log('💡 System context not available in web mode');
        return null;
      }

      console.log('🔍 Gathering local system context...');

      // Get host info (OS, hostname, uptime)
      const hostInfo = await window.electronAPI.mcpCall('get_host_info', {});

      // Get top processes by CPU
      const processInfo = await window.electronAPI.mcpCall('get_process_info', {
        pid: 0,
        limit: 10,
        sort_by: 'cpu'
      });

      // Format context
      let context = '## Local System Context\n\n';

      if (hostInfo.success && hostInfo.data) {
        const host = hostInfo.data;
        context += `**Operating System**: ${host.os || 'Unknown'} ${host.os_version || ''}\n`;
        context += `**Hostname**: ${host.hostname || 'Unknown'}\n`;
        context += `**Platform**: ${host.platform || 'Unknown'}\n`;
        context += `**Architecture**: ${host.architecture || 'Unknown'}\n`;
        context += `**Uptime**: ${host.uptime || 'Unknown'}\n\n`;
      }

      if (processInfo.success && processInfo.data?.processes) {
        context += `**Top Running Processes** (by CPU usage):\n`;
        processInfo.data.processes.slice(0, 10).forEach((proc: any, idx: number) => {
          context += `${idx + 1}. ${proc.name} (PID: ${proc.pid}, CPU: ${proc.cpu_percent?.toFixed(1)}%)\n`;
        });
      }

      console.log('✅ System context gathered');
      return context;
    } catch (error: unknown) {
      console.error('Failed to get system context:', error);
      return null;
    }
  }

  /**
   * Perform Tavily search for cybersecurity information
   */
  private async performSearch(query: string): Promise<TavilySearchResponse | null> {
    try {
      console.log('🔍 Agent performing search for:', query);
      const response = await tavilyService.search({
        query,
        search_depth: 'advanced',
        max_results: 5,
        include_answer: true,
      });

      return response;
    } catch (error: unknown) {
      console.error('Agent search error:', error);
      return null;
    }
  }

  /**
   * Format search results for context
   */
  private formatSearchContext(searchResults: TavilySearchResponse): string {
    let context = '## Search Results\n\n';

    if (searchResults.data.answer) {
      context += `**Summary**: ${searchResults.data.answer}\n\n`;
    }

    context += '**Sources**:\n';
    searchResults.data.results.slice(0, 5).forEach((result, index) => {
      context += `${index + 1}. [${result.title}](${result.url})\n`;
      context += `   ${result.content.substring(0, 200)}...\n\n`;
    });

    return context;
  }

  /**
   * Generate AI response using Venice.ai
   */
  private async generateResponse(
    userQuery: string,
    searchContext?: string
  ): Promise<string> {
    // Build conversation messages
    const messages: AgentMessage[] = [
      ...this.conversationHistory,
      {
        role: 'user',
        content: userQuery,
      },
    ];

    // Add search context if available
    if (searchContext) {
      messages.push({
        role: 'system',
        content: `Here is relevant research I found:\n\n${searchContext}\n\nUse this information to provide an accurate, detailed response. Cite sources when appropriate.`,
      });
    }

    try {
      // Call Venice.ai through edge function
      const response = await edgeFunctions.venice.chat({
        model: 'llama-3.3-70b',
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        temperature: 0.7,
        max_tokens: 2000,
        stream: false,
      });

      const assistantMessage = response.data?.choices?.[0]?.message?.content ||
                              response.choices?.[0]?.message?.content ||
                              'Sorry, I could not generate a response.';

      return assistantMessage;
    } catch (error: unknown) {
      console.error('Venice.ai error:', error);
      throw new Error(`Failed to generate response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process user query with optional search and system context
   */
  async chat(userQuery: string): Promise<AgentResponse> {
    console.log('💬 Agent received query:', userQuery);

    // Add user message to history
    this.conversationHistory.push({
      role: 'user',
      content: userQuery,
    });

    let searchResults: TavilySearchResponse | null = null;
    let searchContext: string | undefined = undefined;
    let researchPerformed = false;

    // Determine if search is needed
    if (this.needsSearch(userQuery)) {
      console.log('🔍 Search required, performing Tavily search...');
      searchResults = await this.performSearch(userQuery);

      if (searchResults && searchResults.success) {
        searchContext = this.formatSearchContext(searchResults);
        researchPerformed = true;
        console.log('✅ Search completed successfully');
      }
    }

    // Check if local system context is needed
    let systemContext: string | null = null;
    if (this.isLocalSecurityQuery(userQuery)) {
      console.log('🖥️ Local security query detected, gathering system context...');
      systemContext = await this.getSystemContext();
    }

    // Combine search and system context
    let combinedContext = searchContext;
    if (systemContext) {
      combinedContext = combinedContext
        ? `${combinedContext}\n\n${systemContext}`
        : systemContext;
    }

    // Generate AI response
    console.log('🤖 Generating AI response...');
    const aiResponse = await this.generateResponse(userQuery, combinedContext);

    // Add assistant response to history
    this.conversationHistory.push({
      role: 'assistant',
      content: aiResponse,
    });

    // Extract sources from search results
    const sources = searchResults?.data.results.slice(0, 5).map(r => ({
      title: r.title,
      url: r.url,
    }));

    return {
      message: aiResponse,
      searchResults: searchResults || undefined,
      sources,
      researchPerformed,
    };
  }

  /**
   * Stream response for real-time chat
   */
  async* chatStream(userQuery: string): AsyncGenerator<string, void, unknown> {
    console.log('💬 Agent streaming response for:', userQuery);

    // Add user message to history
    this.conversationHistory.push({
      role: 'user',
      content: userQuery,
    });

    let searchContext: string | undefined = undefined;

    // Perform search if needed
    if (this.needsSearch(userQuery)) {
      console.log('🔍 Search required...');
      yield '\n\n🔍 **Researching latest information...**\n\n';

      const searchResults = await this.performSearch(userQuery);

      if (searchResults && searchResults.success) {
        searchContext = this.formatSearchContext(searchResults);
        yield '✅ **Research complete.**\n\n';
      }
    }

    // Check if local system context is needed
    let systemContext: string | null = null;
    if (this.isLocalSecurityQuery(userQuery)) {
      console.log('🖥️ Local security query detected...');
      yield '🖥️ **Checking local system...**\n\n';
      systemContext = await this.getSystemContext();
      if (systemContext) {
        yield '✅ **System analysis complete.**\n\n';
      }
    }

    // Combine contexts
    let combinedContext = searchContext;
    if (systemContext) {
      combinedContext = combinedContext
        ? `${combinedContext}\n\n${systemContext}`
        : systemContext;
    }

    // Build messages
    const messages: AgentMessage[] = [
      ...this.conversationHistory,
    ];

    if (combinedContext) {
      messages.push({
        role: 'system',
        content: `Here is relevant research:\n\n${combinedContext}\n\nUse this to provide an accurate response.`,
      });
    }

    try {
      // Stream from Venice.ai
      const stream = edgeFunctions.venice.chatStream({
        model: 'llama-3.3-70b',
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        temperature: 0.7,
        max_tokens: 2000,
      });

      let fullResponse = '';

      for await (const chunk of stream) {
        fullResponse += chunk;
        yield chunk;
      }

      // Add to history
      this.conversationHistory.push({
        role: 'assistant',
        content: fullResponse,
      });
    } catch (error: unknown) {
      console.error('Streaming error:', error);
      yield `\n\n❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  /**
   * Clear conversation history
   */
  clearHistory() {
    this.conversationHistory = [
      {
        role: 'system',
        content: this.systemPrompt,
      },
    ];
  }

  /**
   * Get conversation history
   */
  getHistory(): AgentMessage[] {
    return this.conversationHistory;
  }
}

// Export singleton instance
export const cyberSecAgent = new CyberSecurityAIAgent();
export default cyberSecAgent;
