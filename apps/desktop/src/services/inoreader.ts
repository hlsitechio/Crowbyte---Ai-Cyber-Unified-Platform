/**
 * Inoreader API Service
 * OAuth 2.0 integration for cyber security news aggregation via Supabase Edge Functions
 * API Documentation: https://www.inoreader.com/developers/
 */

import { edgeFunctions } from './supabase-edge-functions';

interface InoreaderConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

interface InoreaderArticle {
  id: string;
  title: string;
  summary: string;
  author: string;
  published: number;
  updated: number;
  canonical: Array<{ href: string }>;
  origin: {
    streamId: string;
    title: string;
    htmlUrl: string;
  };
  categories: string[];
  keywords?: string[];
}

interface InoreaderStreamResponse {
  id: string;
  title: string;
  continuation?: string;
  items: InoreaderArticle[];
}

interface InoreaderSubscription {
  id: string;
  title: string;
  categories: Array<{ id: string; label: string }>;
  url: string;
  htmlUrl: string;
  iconUrl: string;
}

interface APIUsage {
  count: number;
  resetTime: number; // Timestamp when count resets
  lastCall: number;
}

class InoreaderService {
  private config: InoreaderConfig;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private tokenExpiry: number | null = null;

  private readonly API_BASE = 'https://www.inoreader.com/reader/api/0';
  private readonly AUTH_BASE = 'https://www.inoreader.com/oauth2';

  // Rate limiting
  private readonly DAILY_LIMIT = 5000; // Inoreader free tier limit
  private readonly SAFE_LIMIT = 4500; // Safety margin (90% of limit)
  private readonly HOURLY_LIMIT = 200; // Conservative hourly limit
  private apiUsage: APIUsage = {
    count: 0,
    resetTime: 0,
    lastCall: 0,
  };

  constructor(clientId: string, clientSecret: string) {
    this.config = {
      clientId,
      clientSecret,
      redirectUri: 'http://localhost:5173/auth/inoreader/callback', // For Electron
    };

    // Load tokens from localStorage if available
    this.loadTokens();
    // Load API usage from localStorage
    this.loadAPIUsage();
  }

  /**
   * Load stored tokens from localStorage
   */
  private loadTokens(): void {
    try {
      const stored = localStorage.getItem('inoreader_tokens');
      if (stored) {
        const tokens = JSON.parse(stored);
        this.accessToken = tokens.accessToken;
        this.refreshToken = tokens.refreshToken;
        this.tokenExpiry = tokens.tokenExpiry;
      }
    } catch (error) {
      console.error('Failed to load Inoreader tokens:', error);
    }
  }

  /**
   * Save tokens to localStorage
   */
  private saveTokens(): void {
    try {
      localStorage.setItem(
        'inoreader_tokens',
        JSON.stringify({
          accessToken: this.accessToken,
          refreshToken: this.refreshToken,
          tokenExpiry: this.tokenExpiry,
        })
      );
    } catch (error) {
      console.error('Failed to save Inoreader tokens:', error);
    }
  }

  /**
   * Load API usage from localStorage
   */
  private loadAPIUsage(): void {
    try {
      const stored = localStorage.getItem('inoreader_api_usage');
      if (stored) {
        const usage = JSON.parse(stored);

        // Check if we need to reset (24 hours passed)
        const now = Date.now();
        if (now >= usage.resetTime) {
          this.resetAPIUsage();
        } else {
          this.apiUsage = usage;
        }
      } else {
        this.resetAPIUsage();
      }
    } catch (error) {
      console.error('Failed to load API usage:', error);
      this.resetAPIUsage();
    }
  }

  /**
   * Save API usage to localStorage
   */
  private saveAPIUsage(): void {
    try {
      localStorage.setItem('inoreader_api_usage', JSON.stringify(this.apiUsage));
    } catch (error) {
      console.error('Failed to save API usage:', error);
    }
  }

  /**
   * Reset API usage counter (every 24 hours)
   */
  private resetAPIUsage(): void {
    const now = Date.now();
    this.apiUsage = {
      count: 0,
      resetTime: now + (24 * 60 * 60 * 1000), // 24 hours from now
      lastCall: 0,
    };
    this.saveAPIUsage();
  }

  /**
   * Track an API call
   */
  private trackAPICall(): void {
    this.apiUsage.count++;
    this.apiUsage.lastCall = Date.now();
    this.saveAPIUsage();

    // Log warning if approaching limit
    if (this.apiUsage.count >= this.SAFE_LIMIT) {
      console.warn(`⚠️ Inoreader API: Approaching daily limit (${this.apiUsage.count}/${this.DAILY_LIMIT})`);
    }
  }

  /**
   * Check if we can make an API call (rate limiting)
   */
  private canMakeAPICall(): { allowed: boolean; reason?: string } {
    const now = Date.now();

    // Check if daily limit reached
    if (this.apiUsage.count >= this.DAILY_LIMIT) {
      const resetIn = Math.ceil((this.apiUsage.resetTime - now) / 1000 / 60); // minutes
      return {
        allowed: false,
        reason: `Daily API limit reached (${this.DAILY_LIMIT} calls). Resets in ${resetIn} minutes.`,
      };
    }

    // Check if approaching limit (safety margin)
    if (this.apiUsage.count >= this.SAFE_LIMIT) {
      return {
        allowed: false,
        reason: `Approaching daily API limit (${this.apiUsage.count}/${this.DAILY_LIMIT}). Conserving calls.`,
      };
    }

    // Check hourly rate limit (prevent bursts)
    if (this.apiUsage.lastCall) {
      const timeSinceLastCall = now - this.apiUsage.lastCall;
      const minInterval = 60000; // 1 minute minimum between calls

      if (timeSinceLastCall < minInterval) {
        const waitTime = Math.ceil((minInterval - timeSinceLastCall) / 1000);
        return {
          allowed: false,
          reason: `Rate limited. Please wait ${waitTime} seconds before next request.`,
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Get current API usage statistics
   */
  getAPIUsage(): {
    count: number;
    limit: number;
    remaining: number;
    resetTime: Date;
    percentUsed: number;
  } {
    const remaining = this.DAILY_LIMIT - this.apiUsage.count;
    const percentUsed = (this.apiUsage.count / this.DAILY_LIMIT) * 100;

    return {
      count: this.apiUsage.count,
      limit: this.DAILY_LIMIT,
      remaining: remaining > 0 ? remaining : 0,
      resetTime: new Date(this.apiUsage.resetTime),
      percentUsed: Math.min(percentUsed, 100),
    };
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    if (!this.accessToken || !this.tokenExpiry) return false;
    return Date.now() < this.tokenExpiry;
  }

  /**
   * Get OAuth authorization URL via Supabase Edge Function
   */
  async getAuthUrl(): Promise<string> {
    try {
      const response = await edgeFunctions.inoreader.getAuthUrl(
        this.config.redirectUri,
        'read write'
      );

      if (response.error) {
        throw new Error(response.error);
      }

      return response.data?.authorization_url || '';
    } catch (error) {
      console.error('Failed to get Inoreader auth URL:', error);
      throw error;
    }
  }

  /**
   * Exchange authorization code for access token via Supabase Edge Function
   */
  async authenticate(code: string): Promise<void> {
    try {
      const response = await edgeFunctions.inoreader.exchangeToken(
        code,
        this.config.redirectUri
      );

      if (response.error) {
        throw new Error(response.error);
      }

      // Tokens are now stored in Supabase user_settings table
      // We just need to mark as authenticated locally
      this.accessToken = 'managed-by-supabase';
      this.refreshToken = 'managed-by-supabase';
      this.tokenExpiry = Date.now() + (3600 * 1000); // 1 hour

      this.saveTokens();
      console.log('✅ Inoreader authentication successful (managed by Supabase)');
    } catch (error) {
      console.error('Inoreader authentication error:', error);
      throw error;
    }
  }

  /**
   * Refresh access token via Supabase Edge Function
   */
  async refreshAccessToken(): Promise<void> {
    try {
      const response = await edgeFunctions.inoreader.refreshToken();

      if (response.error) {
        throw new Error(response.error);
      }

      // Token refreshed and stored in Supabase
      this.tokenExpiry = Date.now() + (3600 * 1000); // 1 hour
      this.saveTokens();
      console.log('✅ Inoreader token refreshed (managed by Supabase)');
    } catch (error) {
      console.error('Token refresh error:', error);
      throw error;
    }
  }

  /**
   * Make authenticated API request via Supabase Edge Function
   * Rate limiting and usage tracking are handled by Supabase
   */
  private async apiRequest(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<unknown> {
    try {
      // Use Supabase edge function proxy (handles auth, rate limiting, and tracking)
      const response = await edgeFunctions.inoreader.proxy(
        endpoint,
        (options.method as 'GET' | 'POST') || 'GET',
        options.body ? JSON.parse(options.body as string) : undefined
      );

      if (response.error) {
        // Check for auth errors
        if (response.error.includes('Not authorized') || response.error.includes('Token expired')) {
          // Try to refresh token
          await this.refreshAccessToken();
          // Retry the request
          const retryResponse = await edgeFunctions.inoreader.proxy(
            endpoint,
            (options.method as 'GET' | 'POST') || 'GET',
            options.body ? JSON.parse(options.body as string) : undefined
          );

          if (retryResponse.error) {
            throw new Error(retryResponse.error);
          }
          return retryResponse.data || retryResponse;
        }

        throw new Error(response.error);
      }

      console.log(`📡 Inoreader API call via Supabase: ${endpoint}`);
      return response.data || response;
    } catch (error: unknown) {
      console.error('Inoreader API request failed:', error);
      throw error;
    }
  }

  /**
   * Get user information
   */
  async getUserInfo(): Promise<unknown> {
    return this.apiRequest('/user-info');
  }

  /**
   * Get subscriptions (feeds) list
   */
  async getSubscriptions(): Promise<InoreaderSubscription[]> {
    const data = await this.apiRequest('/subscription/list');
    return data.subscriptions || [];
  }

  /**
   * Get stream contents (articles from a feed/folder/tag)
   */
  async getStreamContents(
    streamId: string,
    options: {
      count?: number;
      continuation?: string;
      newerThan?: number;
      excludeRead?: boolean;
    } = {}
  ): Promise<InoreaderStreamResponse> {
    const params = new URLSearchParams({
      n: (options.count || 20).toString(),
    });

    if (options.continuation) params.append('c', options.continuation);
    if (options.newerThan) params.append('nt', options.newerThan.toString());
    if (options.excludeRead) params.append('xt', 'user/-/state/com.google/read');

    return this.apiRequest(`/stream/contents/${encodeURIComponent(streamId)}?${params.toString()}`);
  }

  /**
   * Get cyber security news from all subscriptions
   */
  async getCyberSecurityNews(count: number = 20): Promise<InoreaderArticle[]> {
    try {
      // Get all items from "reading list" (all subscriptions)
      const stream = await this.getStreamContents('user/-/state/com.google/reading-list', {
        count,
        excludeRead: false,
      });

      return stream.items || [];
    } catch (error) {
      console.error('Failed to fetch cyber security news:', error);
      return [];
    }
  }

  /**
   * Get CVE-related articles
   */
  async getCVENews(count: number = 10): Promise<InoreaderArticle[]> {
    try {
      const allNews = await this.getCyberSecurityNews(50);

      // Filter for CVE-related content
      return allNews
        .filter(
          (article) =>
            article.title.toLowerCase().includes('cve') ||
            article.summary.toLowerCase().includes('cve') ||
            article.title.toLowerCase().includes('vulnerability') ||
            article.title.toLowerCase().includes('exploit')
        )
        .slice(0, count);
    } catch (error) {
      console.error('Failed to fetch CVE news:', error);
      return [];
    }
  }

  /**
   * Get unread counts
   */
  async getUnreadCounts(): Promise<unknown> {
    return this.apiRequest('/unread-count');
  }

  /**
   * Mark article as read
   */
  async markAsRead(itemId: string): Promise<void> {
    await this.apiRequest('/edit-tag', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        i: itemId,
        a: 'user/-/state/com.google/read',
      }).toString(),
    });
  }

  /**
   * Mark all as read in a stream
   */
  async markAllAsRead(streamId: string, timestamp: number): Promise<void> {
    await this.apiRequest('/mark-all-as-read', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        s: streamId,
        ts: (timestamp * 1000000).toString(), // Convert to microseconds
      }).toString(),
    });
  }

  /**
   * Subscribe to a feed
   */
  async subscribeFeed(feedUrl: string, title?: string): Promise<void> {
    const params = new URLSearchParams({
      quickadd: feedUrl,
    });

    if (title) params.append('t', title);

    await this.apiRequest('/subscription/quickadd', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });
  }

  /**
   * Generate report from articles
   */
  generateReport(articles: InoreaderArticle[]): {
    total: number;
    bySource: Record<string, number>;
    byCategory: Record<string, number>;
    critical: InoreaderArticle[];
    latest: InoreaderArticle[];
  } {
    const bySource: Record<string, number> = {};
    const byCategory: Record<string, number> = {};
    const critical: InoreaderArticle[] = [];

    articles.forEach((article) => {
      // Count by source
      const source = article.origin.title;
      bySource[source] = (bySource[source] || 0) + 1;

      // Count by category
      article.categories.forEach((cat) => {
        byCategory[cat] = (byCategory[cat] || 0) + 1;
      });

      // Identify critical articles (CVE, vulnerability, breach, ransomware, etc.)
      const criticalKeywords = ['cve', 'critical', 'zero-day', 'breach', 'ransomware', 'exploit'];
      const isCritical = criticalKeywords.some(
        (keyword) =>
          article.title.toLowerCase().includes(keyword) ||
          article.summary.toLowerCase().includes(keyword)
      );

      if (isCritical) {
        critical.push(article);
      }
    });

    return {
      total: articles.length,
      bySource,
      byCategory,
      critical: critical.slice(0, 10),
      latest: articles.slice(0, 10),
    };
  }

  /**
   * Logout and clear tokens
   */
  logout(): void {
    this.accessToken = null;
    this.refreshToken = null;
    this.tokenExpiry = null;
    localStorage.removeItem('inoreader_tokens');
  }
}

// Singleton instance
export const inoreaderService = new InoreaderService(
  import.meta.env.VITE_INOREADER_CLIENT_ID || '1000003037',
  import.meta.env.VITE_INOREADER_CLIENT_SECRET || ''
);

export default inoreaderService;
