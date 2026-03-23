/**
 * Supabase Health Monitoring Service
 * Monitors edge functions, database, and API usage
 */

import { edgeFunctions } from './supabase-edge-functions';
import { supabase } from '@/lib/supabase';

export interface ServiceHealthStatus {
  name: string;
  status: 'healthy' | 'degraded' | 'down' | 'unknown';
  responseTime?: number;
  lastChecked: Date;
  error?: string;
  usage?: {
    current: number;
    limit: number;
    remaining: number;
    percentUsed: number;
  };
}

export interface SupabaseHealth {
  overall: 'healthy' | 'degraded' | 'down';
  services: {
    database: ServiceHealthStatus;
    edgeFunctions: ServiceHealthStatus;
    veniceAPI: ServiceHealthStatus;
    inoreaderAPI: ServiceHealthStatus;
    tavilyAPI: ServiceHealthStatus;
  };
  apiUsage: {
    venice: {
      count: number;
      limit: number;
      remaining: number;
      resetTime: Date;
      percentUsed: number;
    };
    inoreader: {
      count: number;
      limit: number;
      remaining: number;
      resetTime: Date;
      percentUsed: number;
    };
    tavily: {
      count: number;
      limit: number;
      remaining: number;
      resetTime: Date;
      percentUsed: number;
    };
  };
  lastUpdate: Date;
}

class SupabaseHealthMonitor {
  private healthData: SupabaseHealth | null = null;
  private updateInterval: number = 60000; // 1 minute
  private intervalId: NodeJS.Timeout | null = null;

  /**
   * Check database health
   */
  private async checkDatabase(): Promise<ServiceHealthStatus> {
    const startTime = Date.now();

    try {
      const { data, error } = await supabase
        .from('api_keys')
        .select('id')
        .limit(1);

      const responseTime = Date.now() - startTime;

      if (error) {
        return {
          name: 'Database',
          status: 'down',
          responseTime,
          lastChecked: new Date(),
          error: error.message,
        };
      }

      return {
        name: 'Database',
        status: responseTime < 1000 ? 'healthy' : 'degraded',
        responseTime,
        lastChecked: new Date(),
      };
    } catch (error: unknown) {
      return {
        name: 'Database',
        status: 'down',
        responseTime: Date.now() - startTime,
        lastChecked: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Check edge functions health
   */
  private async checkEdgeFunctions(): Promise<ServiceHealthStatus> {
    const startTime = Date.now();

    try {
      // Check if user is authenticated first
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        return {
          name: 'Edge Functions',
          status: 'unknown',
          responseTime: Date.now() - startTime,
          lastChecked: new Date(),
          error: 'Not authenticated - login required to check edge functions',
        };
      }

      const response = await edgeFunctions.apiKeys.getAll();
      const responseTime = Date.now() - startTime;

      if (response.error) {
        return {
          name: 'Edge Functions',
          status: 'degraded',
          responseTime,
          lastChecked: new Date(),
          error: response.error,
        };
      }

      return {
        name: 'Edge Functions',
        status: responseTime < 2000 ? 'healthy' : 'degraded',
        responseTime,
        lastChecked: new Date(),
      };
    } catch (error: unknown) {
      return {
        name: 'Edge Functions',
        status: 'degraded',
        responseTime: Date.now() - startTime,
        lastChecked: new Date(),
        error: error.message,
      };
    }
  }

  /**
   * Check Venice.ai API health
   */
  private async checkVeniceAPI(): Promise<ServiceHealthStatus> {
    try {
      // Get usage stats from database
      const { data, error } = await supabase.rpc('get_api_usage', {
        p_service_name: 'venice',
      });

      if (error) {
        console.error('Venice API usage check error:', error);
        return {
          name: 'Venice.ai API',
          status: 'healthy',
          lastChecked: new Date(),
          usage: {
            current: 0,
            limit: 5000,
            remaining: 5000,
            percentUsed: 0,
          },
        };
      }

      const usage = data?.[0];
      if (!usage) {
        return {
          name: 'Venice.ai API',
          status: 'healthy',
          lastChecked: new Date(),
          usage: {
            current: 0,
            limit: 5000,
            remaining: 5000,
            percentUsed: 0,
          },
        };
      }

      // Determine status based on usage
      let status: 'healthy' | 'degraded' | 'down' = 'healthy';
      if (usage.percent_used >= 90) {
        status = 'degraded';
      }
      if (usage.remaining <= 0) {
        status = 'down';
      }

      return {
        name: 'Venice.ai API',
        status,
        lastChecked: new Date(),
        usage: {
          current: usage.call_count,
          limit: usage.daily_limit,
          remaining: usage.remaining,
          percentUsed: usage.percent_used,
        },
      };
    } catch (error: unknown) {
      console.error('Venice API health check error:', error);
      return {
        name: 'Venice.ai API',
        status: 'healthy',
        lastChecked: new Date(),
        usage: {
          current: 0,
          limit: 5000,
          remaining: 5000,
          percentUsed: 0,
        },
      };
    }
  }

  /**
   * Check Inoreader API health
   */
  private async checkInoreaderAPI(): Promise<ServiceHealthStatus> {
    try {
      // Get usage stats from database
      const { data, error } = await supabase.rpc('get_api_usage', {
        p_service_name: 'inoreader',
      });

      if (error) {
        console.error('Inoreader API usage check error:', error);
        return {
          name: 'Inoreader API',
          status: 'healthy',
          lastChecked: new Date(),
          usage: {
            current: 0,
            limit: 5000,
            remaining: 5000,
            percentUsed: 0,
          },
        };
      }

      const usage = data?.[0];
      if (!usage) {
        return {
          name: 'Inoreader API',
          status: 'healthy',
          lastChecked: new Date(),
          usage: {
            current: 0,
            limit: 5000,
            remaining: 5000,
            percentUsed: 0,
          },
        };
      }

      // Determine status based on usage
      let status: 'healthy' | 'degraded' | 'down' = 'healthy';
      if (usage.percent_used >= 90) {
        status = 'degraded';
      }
      if (usage.remaining <= 0) {
        status = 'down';
      }

      return {
        name: 'Inoreader API',
        status,
        lastChecked: new Date(),
        usage: {
          current: usage.call_count,
          limit: usage.daily_limit,
          remaining: usage.remaining,
          percentUsed: usage.percent_used,
        },
      };
    } catch (error: unknown) {
      console.error('Inoreader API health check error:', error);
      return {
        name: 'Inoreader API',
        status: 'healthy',
        lastChecked: new Date(),
        usage: {
          current: 0,
          limit: 5000,
          remaining: 5000,
          percentUsed: 0,
        },
      };
    }
  }

  /**
   * Check Tavily API health
   */
  private async checkTavilyAPI(): Promise<ServiceHealthStatus> {
    try {
      // Get usage stats from database
      const { data, error } = await supabase.rpc('get_api_usage', {
        p_service_name: 'tavily',
      });

      if (error) {
        console.error('Tavily API usage check error:', error);
        return {
          name: 'Tavily API',
          status: 'healthy',
          lastChecked: new Date(),
          usage: {
            current: 0,
            limit: 1000,
            remaining: 1000,
            percentUsed: 0,
          },
        };
      }

      const usage = data?.[0];
      if (!usage) {
        return {
          name: 'Tavily API',
          status: 'healthy',
          lastChecked: new Date(),
          usage: {
            current: 0,
            limit: 1000,
            remaining: 1000,
            percentUsed: 0,
          },
        };
      }

      // Determine status based on usage
      let status: 'healthy' | 'degraded' | 'down' = 'healthy';
      if (usage.percent_used >= 90) {
        status = 'degraded';
      }
      if (usage.remaining <= 0) {
        status = 'down';
      }

      return {
        name: 'Tavily API',
        status,
        lastChecked: new Date(),
        usage: {
          current: usage.call_count,
          limit: usage.daily_limit,
          remaining: usage.remaining,
          percentUsed: usage.percent_used,
        },
      };
    } catch (error: unknown) {
      console.error('Tavily API health check error:', error);
      return {
        name: 'Tavily API',
        status: 'healthy',
        lastChecked: new Date(),
        usage: {
          current: 0,
          limit: 1000,
          remaining: 1000,
          percentUsed: 0,
        },
      };
    }
  }

  /**
   * Get API usage statistics
   */
  private async getAPIUsage() {
    const defaultUsage = {
      call_count: 0,
      daily_limit: 5000,
      remaining: 5000,
      reset_time: new Date(Date.now() + 86400000).toISOString(),
      percent_used: 0,
    };

    try {
      const [veniceData, inoreaderData, tavilyData] = await Promise.all([
        supabase.rpc('get_api_usage', { p_service_name: 'venice' }),
        supabase.rpc('get_api_usage', { p_service_name: 'inoreader' }),
        supabase.rpc('get_api_usage', { p_service_name: 'tavily' }),
      ]);

      // Log errors if any
      if (veniceData.error) {
        console.error('Venice usage fetch error:', veniceData.error);
      }
      if (inoreaderData.error) {
        console.error('Inoreader usage fetch error:', inoreaderData.error);
      }
      if (tavilyData.error) {
        console.error('Tavily usage fetch error:', tavilyData.error);
      }

      const veniceUsage = veniceData.data?.[0] || defaultUsage;
      const inoreaderUsage = inoreaderData.data?.[0] || defaultUsage;
      const tavilyUsage = tavilyData.data?.[0] || { ...defaultUsage, daily_limit: 1000 };

      return {
        venice: {
          count: veniceUsage.call_count || 0,
          limit: veniceUsage.daily_limit || 5000,
          remaining: veniceUsage.remaining || 5000,
          resetTime: new Date(veniceUsage.reset_time),
          percentUsed: veniceUsage.percent_used || 0,
        },
        inoreader: {
          count: inoreaderUsage.call_count || 0,
          limit: inoreaderUsage.daily_limit || 5000,
          remaining: inoreaderUsage.remaining || 5000,
          resetTime: new Date(inoreaderUsage.reset_time),
          percentUsed: inoreaderUsage.percent_used || 0,
        },
        tavily: {
          count: tavilyUsage.call_count || 0,
          limit: tavilyUsage.daily_limit || 1000,
          remaining: tavilyUsage.remaining || 1000,
          resetTime: new Date(tavilyUsage.reset_time),
          percentUsed: tavilyUsage.percent_used || 0,
        },
      };
    } catch (error) {
      console.error('Failed to get API usage:', error);
      const defaultResetTime = new Date(Date.now() + 86400000);
      return {
        venice: {
          count: 0,
          limit: 5000,
          remaining: 5000,
          resetTime: defaultResetTime,
          percentUsed: 0,
        },
        inoreader: {
          count: 0,
          limit: 5000,
          remaining: 5000,
          resetTime: defaultResetTime,
          percentUsed: 0,
        },
        tavily: {
          count: 0,
          limit: 1000,
          remaining: 1000,
          resetTime: defaultResetTime,
          percentUsed: 0,
        },
      };
    }
  }

  /**
   * Perform full health check
   */
  async checkHealth(): Promise<SupabaseHealth> {
    console.log('🏥 Running Supabase health check...');

    const [database, edgeFunctions, veniceAPI, inoreaderAPI, tavilyAPI, apiUsage] = await Promise.all([
      this.checkDatabase(),
      this.checkEdgeFunctions(),
      this.checkVeniceAPI(),
      this.checkInoreaderAPI(),
      this.checkTavilyAPI(),
      this.getAPIUsage(),
    ]);

    // Determine overall health
    const statuses = [database.status, edgeFunctions.status, veniceAPI.status, inoreaderAPI.status, tavilyAPI.status];
    let overall: 'healthy' | 'degraded' | 'down' = 'healthy';

    if (statuses.includes('down')) {
      overall = 'down';
    } else if (statuses.includes('degraded')) {
      overall = 'degraded';
    }

    this.healthData = {
      overall,
      services: {
        database,
        edgeFunctions,
        veniceAPI,
        inoreaderAPI,
        tavilyAPI,
      },
      apiUsage,
      lastUpdate: new Date(),
    };

    console.log(`🏥 Health check complete - Overall status: ${overall}`);
    return this.healthData;
  }

  /**
   * Get cached health data
   */
  getHealth(): SupabaseHealth | null {
    return this.healthData;
  }

  /**
   * Start automatic health monitoring
   */
  startMonitoring(intervalMs: number = 60000): void {
    if (this.intervalId) {
      console.warn('Health monitoring already running');
      return;
    }

    this.updateInterval = intervalMs;
    console.log(`🏥 Starting health monitoring (interval: ${intervalMs}ms)`);

    // Initial check
    this.checkHealth();

    // Set up interval
    this.intervalId = setInterval(() => {
      this.checkHealth();
    }, intervalMs);
  }

  /**
   * Stop automatic health monitoring
   */
  stopMonitoring(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('🏥 Health monitoring stopped');
    }
  }

  /**
   * Get service status color for UI
   */
  getStatusColor(status: 'healthy' | 'degraded' | 'down' | 'unknown'): string {
    switch (status) {
      case 'healthy':
        return 'text-green-500';
      case 'degraded':
        return 'text-yellow-500';
      case 'down':
        return 'text-red-500';
      case 'unknown':
      default:
        return 'text-gray-500';
    }
  }

  /**
   * Get usage color for UI
   */
  getUsageColor(percentUsed: number): string {
    if (percentUsed >= 90) return 'text-red-500';
    if (percentUsed >= 70) return 'text-yellow-500';
    return 'text-green-500';
  }
}

// Export singleton instance
export const healthMonitor = new SupabaseHealthMonitor();
export default healthMonitor;
