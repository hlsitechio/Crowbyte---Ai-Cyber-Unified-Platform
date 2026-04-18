/**
 * Custom Agent Executor Service
 */

import { CustomAgent } from './custom-agents';

interface ToolFunction {
  type: string;
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

interface AgentMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ExecuteOptions {
  stream?: boolean;
  onChunk?: (chunk: string) => void;
}

export class CustomAgentExecutor {
  /**
   * Build tools array based on agent feature flags
   */
  private async buildTools(agent: CustomAgent): Promise<ToolFunction[]> {
    const tools: ToolFunction[] = [];

    if (agent.enable_web_search) {
      tools.push({
        type: 'function',
        function: {
          description: 'Search the web for current information, research topics, or find specific resources.',
          parameters: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Search query'
              },
              search_depth: {
                type: 'string',
                enum: ['basic', 'advanced'],
                default: 'advanced',
                description: 'Search depth'
              },
              max_results: {
                type: 'number',
                default: 5,
                description: 'Maximum results to return'
              }
            },
            required: ['query']
          }
        }
      });
    }

    // Add MCP monitoring tools if enabled
    if (agent.enable_mcp) {
      // Only available in Electron
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
    }

    // Add file access tools if enabled
    if (agent.enable_file_access) {
      // File access uses MCP filesystem tools, which are available when MCP is enabled
      console.log('File access enabled (uses MCP filesystem tools)');
    }

    // UilBracketsCurly execution would be added here if implemented
    if (agent.enable_code_execution) {
      console.warn('UilBracketsCurly execution is not yet implemented for custom agents');
    }

    return tools;
  }

  /**
   * Execute agent with streaming response
   */
  async* executeStream(
    agent: CustomAgent,
    userMessage: string,
    conversationHistory: AgentMessage[] = []
  ): AsyncGenerator<string, void, unknown> {
    try {
      // Build conversation messages
      const systemMessage: AgentMessage = {
        role: 'system',
        content: agent.system_prompt
      };

      const messages: AgentMessage[] = [
        systemMessage,
        ...conversationHistory,
        { role: 'user', content: userMessage }
      ];

      // Check if we should use MCP (enables all MCP tools automatically)
      if (agent.enable_mcp) {
          yield chunk;
        }
      } else if (agent.enable_web_search) {
        // If only web search is enabled, do preprocessing
        const needsSearch = /latest|recent|new|current|find|search|research|what is|tell me about/i.test(userMessage);

        if (needsSearch) {
          yield '\n\n🔍 **Searching web...**\n\n';

          try {
            const searchResults = null;

            if (searchResults.data.answer) {
              yield `**Search Summary**: ${searchResults.data.answer}\n\n`;
            }

            // Add search context to messages
            if (searchResults.data.results && searchResults.data.results.length > 0) {
              let searchContext = '\n\n## Web Search Results\n\n';
              searchResults.data.results.slice(0, 3).forEach((result, idx) => {
                searchContext += `${idx + 1}. [${result.title}](${result.url})\n   ${result.content.substring(0, 200)}...\n\n`;
              });

              messages[messages.length - 1].content += searchContext;
            }

            yield '**Generating response...**\n\n';
          } catch (error) {
            console.error('Search error:', error);
            yield '⚠️ Search failed, generating response without web results...\n\n';
          }
        }

          yield chunk;
        }
      } else {
          yield chunk;
        }
      }
    } catch (error) {
      console.error('Custom agent execution error:', error);
      yield `\n\n❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  /**
   * Execute agent with non-streaming response
   */
  async execute(
    agent: CustomAgent,
    userMessage: string,
    conversationHistory: AgentMessage[] = []
  ): Promise<string> {
    let fullResponse = '';

    for await (const chunk of this.executeStream(agent, userMessage, conversationHistory)) {
      fullResponse += chunk;
    }

    return fullResponse;
  }

  /**
   * Get available tools for an agent (for display purposes)
   */
  async getAvailableTools(agent: CustomAgent): Promise<string[]> {
    const tools: string[] = [];

    if (agent.enable_web_search) {
    }

    if (agent.enable_mcp) {
      tools.push('System Monitoring (MCP)');
      tools.push('Process Info (MCP)');
      tools.push('Network Info (MCP)');
      tools.push('Disk Info (MCP)');
      tools.push('CPU Info (MCP)');
      tools.push('Memory Info (MCP)');
    }

    if (agent.enable_file_access) {
      tools.push('File Access (MCP Filesystem)');
    }

    if (agent.enable_code_execution) {
      tools.push('UilBracketsCurly Execution (Not Implemented)');
    }

    return tools;
  }
}

// Export singleton instance
export const customAgentExecutor = new CustomAgentExecutor();
export default customAgentExecutor;
