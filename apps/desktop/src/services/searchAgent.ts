/**
 * Search AI Agent Service
 * Intelligent web search agent powered by Tavily
 * Simplified implementation without full LangChain agent framework
 */

import { analyticsService } from './analytics';
import { tavilyService } from './tavily';

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
      // Step 1: Analyze the query
      steps.push({
        action: 'analyze_query',
        observation: `Processing query: "${query.query}"`,
      });

      // Step 2: Perform web search
      steps.push({
        action: 'tavily_search',
        observation: 'Executing Tavily web search...',
      });

      const searchResults = await tavilyService.search({
        query: query.query,
        max_results: this.config?.maxResults || 5,
        search_depth: 'advanced',
        include_answer: true,
        include_raw_content: false,
      });

      steps.push({
        action: 'process_results',
        observation: `Found ${searchResults.data.results?.length || 0} relevant sources`,
      });

      // Step 3: Extract sources
      const sources = (searchResults.data.results || []).map((result) => ({
        title: result.title,
        url: result.url,
        content: result.content || '',
        score: result.score,
      }));

      // Step 4: Generate answer
      let answer = searchResults.data.answer || this.synthesizeAnswer(sources, query.query);

      if (query.context) {
        answer = `**Context:** ${query.context}\n\n${answer}`;
      }

      steps.push({
        action: 'synthesize_answer',
        observation: 'Generated comprehensive answer from sources',
      });

      const totalTime = Date.now() - startTime;

      // Log to analytics
      await analyticsService.logSearch({
        service: 'search-agent',
        query: query.query,
        resultsCount: sources.length,
        responseTimeMs: totalTime,
        status: 'success',
      });

      return {
        answer,
        sources,
        steps,
        totalTime,
      };
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
