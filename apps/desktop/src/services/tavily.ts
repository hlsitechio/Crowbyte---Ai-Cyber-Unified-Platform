/**
 * Tavily CyberSecurity Search Service
 *
 * Provides AI-powered search capabilities focused on cybersecurity research
 * Uses Tavily MCP for advanced search, Q&A, and content extraction
 * Includes intelligent caching for search results
 */

import { supabase } from '@/lib/supabase';
import { analyticsService } from '@/services/analytics';
import { cacheService } from './cache';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export interface TavilySearchRequest {
  query: string;
  search_depth?: 'basic' | 'advanced';
  topic?: 'general' | 'news';
  max_results?: number;
  include_domains?: string[];
  exclude_domains?: string[];
  include_answer?: boolean;
  include_raw_content?: boolean;
  include_images?: boolean;
}

export interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
  published_date?: string;
}

export interface TavilySearchResponse {
  success: boolean;
  action: string;
  data: {
    answer?: string;
    query: string;
    results: TavilySearchResult[];
    images?: Array<{ url: string; description?: string }>;
    response_time: number;
  };
  cybersec_enhanced: boolean;
}

export interface TavilyQnARequest {
  query: string;
  search_depth?: 'basic' | 'advanced';
}

export interface TavilyQnAResponse {
  success: boolean;
  action: string;
  data: {
    answer: string;
    query: string;
    response_time: number;
  };
  cybersec_enhanced: boolean;
}

export interface TavilyExtractRequest {
  urls: string[];
}

export interface TavilyExtractResponse {
  success: boolean;
  action: string;
  data: {
    results: Array<{
      url: string;
      raw_content: string;
    }>;
    failed_results: Array<{
      url: string;
      error: string;
    }>;
  };
}

class TavilyService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = `${SUPABASE_URL}/functions/v1/tavily-cybersec-search`;
  }

  /**
   * Get auth headers for API requests
   */
  private async getHeaders(): Promise<HeadersInit> {
    const { data: { session } } = await supabase.auth.getSession();

    return {
      'Authorization': `Bearer ${session?.access_token || SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Perform a cybersecurity-focused search (with caching)
   * Automatically enhances queries with cybersecurity context
   */
  async search(params: TavilySearchRequest): Promise<TavilySearchResponse> {
    // Use cache with automatic key generation
    return cacheService.cacheWithInput(
      {
        query: params.query,
        search_depth: params.search_depth || 'advanced',
        topic: params.topic || 'general',
        max_results: params.max_results || 10,
        include_domains: params.include_domains || [],
        exclude_domains: params.exclude_domains || [],
        endpoint: 'search',
      },
      async () => {
        const startTime = Date.now();
        const headers = await this.getHeaders();

        try {
          const response = await fetch(`${this.baseUrl}?action=search`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              query: params.query,
              search_depth: params.search_depth || 'advanced',
              topic: params.topic || 'general',
              max_results: params.max_results || 10,
              include_domains: params.include_domains || [],
              exclude_domains: params.exclude_domains || [],
              include_answer: params.include_answer !== false,
              include_raw_content: params.include_raw_content || false,
              include_images: params.include_images || false,
            }),
          });

          const responseTime = Date.now() - startTime;

          if (!response.ok) {
            const error = await response.json();

            // Log failed search
            await analyticsService.logSearch({
              service: 'tavily',
              query: params.query,
              resultsCount: 0,
              responseTimeMs: responseTime,
              status: 'error',
              error: error.error || 'Tavily search failed',
            });

            throw new Error(error.error || 'Tavily search failed');
          }

          const result: TavilySearchResponse = await response.json();

          // Log successful search
          await analyticsService.logSearch({
            service: 'tavily',
            query: params.query,
            resultsCount: result.data.results?.length || 0,
            responseTimeMs: responseTime,
            status: 'success',
          });

          return result;
        } catch (error) {
          const responseTime = Date.now() - startTime;

          // Log error
          await analyticsService.logSearch({
            service: 'tavily',
            query: params.query,
            resultsCount: 0,
            responseTimeMs: responseTime,
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error',
          });

          throw error;
        }
      },
      'search',
      {
        ttl: 3600 * 12, // Cache search results for 12 hours
        namespace: 'tavily_search',
        userSpecific: true,
        metadata: {
          query: params.query,
          search_depth: params.search_depth || 'advanced',
          service: 'tavily',
        },
      }
    );
  }

  /**
   * Get a direct answer to a cybersecurity question
   * Uses Tavily's Q&A mode for concise answers
   */
  async askQuestion(params: TavilyQnARequest): Promise<TavilyQnAResponse> {
    const startTime = Date.now();
    const headers = await this.getHeaders();

    try {
      const response = await fetch(`${this.baseUrl}?action=qna`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          query: params.query,
          search_depth: params.search_depth || 'advanced',
        }),
      });

      const responseTime = Date.now() - startTime;

      if (!response.ok) {
        const error = await response.json();

        // Log failed Q&A
        await analyticsService.logApiCall({
          service: 'tavily',
          action: 'qna',
          responseTimeMs: responseTime,
          status: 'error',
          error: error.error || 'Tavily Q&A failed',
          details: { query: params.query },
        });

        throw new Error(error.error || 'Tavily Q&A failed');
      }

      const result: TavilyQnAResponse = await response.json();

      // Log successful Q&A
      await analyticsService.logApiCall({
        service: 'tavily',
        action: 'qna',
        responseTimeMs: responseTime,
        status: 'success',
        details: { query: params.query },
      });

      return result;
    } catch (error) {
      const responseTime = Date.now() - startTime;

      // Log error
      await analyticsService.logApiCall({
        service: 'tavily',
        action: 'qna',
        responseTimeMs: responseTime,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        details: { query: params.query },
      });

      throw error;
    }
  }

  /**
   * Extract content from specific URLs
   * Useful for analyzing security advisories, blog posts, etc.
   */
  async extractContent(params: TavilyExtractRequest): Promise<TavilyExtractResponse> {
    const headers = await this.getHeaders();

    const response = await fetch(`${this.baseUrl}?action=extract`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        urls: params.urls,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Tavily extract failed');
    }

    return response.json();
  }

  /**
   * Search for recent cybersecurity news
   */
  async searchNews(query: string, maxResults: number = 10): Promise<TavilySearchResponse> {
    return this.search({
      query,
      topic: 'news',
      search_depth: 'advanced',
      max_results: maxResults,
      include_answer: true,
      include_images: true,
    });
  }

  /**
   * Search for CVE information
   */
  async searchCVE(cveId: string): Promise<TavilySearchResponse> {
    return this.search({
      query: `${cveId} vulnerability details exploit proof of concept`,
      search_depth: 'advanced',
      max_results: 15,
      include_answer: true,
      include_domains: [
        'nvd.nist.gov',
        'cve.mitre.org',
        'github.com',
        'exploit-db.com',
      ],
    });
  }

  /**
   * Search for threat intelligence
   */
  async searchThreatIntel(query: string): Promise<TavilySearchResponse> {
    return this.search({
      query: `${query} threat intelligence IoC indicators of compromise`,
      search_depth: 'advanced',
      max_results: 10,
      include_answer: true,
    });
  }

  /**
   * Search for security tools and techniques
   */
  async searchTools(query: string): Promise<TavilySearchResponse> {
    return this.search({
      query: `${query} security tool pentesting red team`,
      search_depth: 'advanced',
      max_results: 10,
      include_answer: true,
      include_domains: [
        'github.com',
        'kali.org',
        'metasploit.com',
      ],
    });
  }
}

// Export singleton instance
export const tavilyService = new TavilyService();
export default tavilyService;
