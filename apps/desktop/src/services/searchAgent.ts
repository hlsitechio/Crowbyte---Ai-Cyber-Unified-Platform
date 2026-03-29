/**
 * Search AI Agent Service
 * Intelligent web search agent powered by Tavily
 * Simplified implementation without full LangChain agent framework
 */

import { analyticsService } from './analytics';
import { tavilyService } from './tavily';
import { openClaw } from './openclaw';

export interface SearchAgentConfig {
  tavilyApiKey: string;
  maxResults?: number;
}

export interface SearchAgentQuery {
  query: string;
  context?: string;
  maxIterations?: number;
}

export interface SearchAgentResponse {
  answer: string;
  sources: Array<{
    title: string;
    url: string;
    content: string;
    score?: number;
  }>;
  steps: Array<{
    action: string;
    observation: string;
  }>;
  totalTime: number;
}

class SearchAgentService {
  private config: SearchAgentConfig | null = null;
  private initialized: boolean = false;

  /**
   * Initialize the Search AI Agent
   */
  async initialize(config: SearchAgentConfig): Promise<void> {
    this.config = config;
    this.initialized = true;
    console.log('✅ Search AI Agent initialized successfully');
  }

  /**
   * Execute a search query using the AI agent
   */
  async search(query: SearchAgentQuery): Promise<SearchAgentResponse> {
    if (!this.initialized) {
      throw new Error('Agent not initialized. Call initialize() first.');
    }

    const startTime = Date.now();
    const steps: Array<{ action: string; observation: string }> = [];

    try {
      // Step 1: Web search via Tavily
      steps.push({
        action: 'web_search',
        observation: `Searching the web for: "${query.query}"`,
      });

      const searchResults = await tavilyService.search({
        query: query.query,
        max_results: this.config?.maxResults || 5,
        search_depth: 'advanced',
        include_answer: true,
        include_raw_content: false,
      });

      const sources = (searchResults.data.results || []).map((result) => ({
        title: result.title,
        url: result.url,
        content: result.content || '',
        score: result.score,
      }));

      steps.push({
        action: 'sources_found',
        observation: `Retrieved ${sources.length} sources: ${sources.slice(0, 3).map(s => s.title).join(', ')}`,
      });

      // Step 2: AI synthesis via OpenClaw GLM5
      let answer = searchResults.data.answer || '';

      try {
        steps.push({
          action: 'ai_analysis',
          observation: 'Synthesizing intel with GLM5...',
        });

        const sourceContext = sources.slice(0, 5).map((s, i) =>
          `[${i + 1}] ${s.title}\n${s.content.slice(0, 400)}`
        ).join('\n\n');

        const aiPrompt = `You are a cybersecurity intelligence analyst. Analyze the following web search results for the query: "${query.query}"

SOURCES:
${sourceContext}

Provide a concise, actionable intelligence briefing:
- Summarize key findings (2-3 sentences max)
- Highlight any CVEs, threat actors, or IOCs mentioned
- Note actionable items for a security team
- Be direct and technical — no fluff

Format with markdown. Do NOT repeat source titles or URLs.`;

        const aiResponse = await openClaw.chat(
          [{ role: 'user', content: aiPrompt }],
          undefined,
          0.3,
        );

        if (aiResponse && aiResponse.length > 50) {
          answer = aiResponse;
          steps.push({
            action: 'synthesis_complete',
            observation: `GLM5 analysis complete (${aiResponse.length} chars)`,
          });
        } else {
          steps.push({
            action: 'synthesis_fallback',
            observation: 'GLM5 unavailable — using Tavily summary',
          });
        }
      } catch {
        // GLM5 failed — fall back to Tavily answer
        steps.push({
          action: 'synthesis_fallback',
          observation: 'OpenClaw offline — using Tavily summary',
        });
        if (!answer) {
          answer = this.synthesizeAnswer(sources, query.query);
        }
      }

      if (query.context) {
        answer = `**Context:** ${query.context}\n\n${answer}`;
      }

      const totalTime = Date.now() - startTime;

      await analyticsService.logSearch({
        service: 'search-agent',
        query: query.query,
        resultsCount: sources.length,
        responseTimeMs: totalTime,
        status: 'success',
      });

      return { answer, sources, steps, totalTime };
    } catch (error) {
      const totalTime = Date.now() - startTime;

      await analyticsService.logSearch({
        service: 'search-agent',
        query: query.query,
        resultsCount: 0,
        responseTimeMs: totalTime,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  }

  /**
   * Synthesize an answer from search results
   */
  private synthesizeAnswer(sources: Array<{ title: string; url: string; content: string }>, query: string): string {
    if (sources.length === 0) {
      return `I couldn't find specific information about "${query}". Please try rephrasing your query or check if you're looking for something specific.`;
    }

    const topSource = sources[0];
    let answer = `Based on current web research:\n\n`;
    answer += `**${topSource.title}**\n\n`;
    answer += topSource.content.substring(0, 500);

    if (sources.length > 1) {
      answer += `\n\n**Additional insights from ${sources.length - 1} more sources:**\n\n`;
      for (let i = 1; i < Math.min(sources.length, 3); i++) {
        answer += `• ${sources[i].title}\n`;
      }
    }

    answer += `\n\n💡 *Tip: Click on the sources below for detailed information.*`;

    return answer;
  }

  /**
   * Research a cybersecurity topic in depth
   */
  async research(topic: string): Promise<SearchAgentResponse> {
    return this.search({
      query: `Comprehensive cybersecurity research: ${topic}. Include recent developments, technical details, and security implications.`,
      context: 'Deep dive into all aspects of this security topic',
    });
  }

  /**
   * Analyze a CVE
   */
  async analyzeCVE(cveId: string): Promise<SearchAgentResponse> {
    return this.search({
      query: `${cveId} vulnerability analysis: description, affected products, CVSS score, exploitation status, patches, and mitigation`,
      context: 'Comprehensive CVE analysis for security assessment',
    });
  }

  /**
   * Find security tools
   */
  async findTools(category: string): Promise<SearchAgentResponse> {
    return this.search({
      query: `Best ${category} cybersecurity tools: features, comparisons, recommendations, and usage examples`,
      context: 'Tool discovery for security professionals',
    });
  }

  /**
   * Get threat intelligence
   */
  async getThreatIntel(threat: string): Promise<SearchAgentResponse> {
    return this.search({
      query: `Threat intelligence on ${threat}: TTPs, IOCs, attribution, recent activity, and defensive measures`,
      context: 'Actionable threat intelligence for defense',
    });
  }

  /**
   * Check if agent is ready
   */
  isReady(): boolean {
    return this.initialized;
  }
}

// Export singleton instance
export const searchAgent = new SearchAgentService();
export default searchAgent;
