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
    openClaw: ServiceHealthStatus;
  };
  apiUsage: {
    openclaw: {
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
          name: 'UilDatabase',
          status: 'down',
          responseTime,
          lastChecked: new Date(),
          error: error.message,
        };
      }

      return {
        name: 'UilDatabase',
        status: responseTime < 1000 ? 'healthy' : 'degraded',
        responseTime,
        lastChecked: new Date(),
      };
    } catch (error: unknown) {
      return {
        name: 'UilDatabase',
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
   * Get API usage statistics
   */
  private async getAPIUsage(): Promise<SupabaseHealth['apiUsage']> {
    const defaultResetTime = new Date(Date.now() + 86400000);
    const defaultUsage = {
      count: 0,
      limit: 5000,
      remaining: 5000,
      resetTime: defaultResetTime,
      percentUsed: 0,
    };

    try {
      const { data } = await supabase.rpc('get_api_usage', {});
      const usage = data?.[0];
      if (!usage) return { openclaw: defaultUsage };
      return {
        openclaw: {
          count: usage.call_count ?? 0,
          limit: usage.daily_limit ?? 5000,
          remaining: usage.remaining ?? 5000,
          resetTime: new Date(usage.reset_time ?? defaultResetTime),
          percentUsed: usage.percent_used ?? 0,
        },
      };
    } catch (error) {
      console.error('Failed to get API usage:', error);
      return { openclaw: defaultUsage };
    }
  }

  /**
   * Perform full health check
   */
  async checkHealth(): Promise<SupabaseHealth> {

    const [dbStatus, edgeFunctionsStatus, apiUsage] = await Promise.all([
      this.checkDatabase(),
      this.checkEdgeFunctions(),
      this.getAPIUsage(),
    ]);

    const statuses = [dbStatus.status, edgeFunctionsStatus.status];
    let overall: 'healthy' | 'degraded' | 'down' = 'healthy';
    if (statuses.includes('down')) {
      overall = 'down';
    } else if (statuses.includes('degraded')) {
      overall = 'degraded';
    }

    this.healthData = {
      overall,
      services: {
        database: dbStatus,
        edgeFunctions: edgeFunctionsStatus,
        openClaw: { name: 'OpenClaw', status: 'unknown', lastChecked: new Date() },
      },
      apiUsage,
      lastUpdate: new Date(),
    };

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
    }
  }

  /**
   * Get service status color for UI
   */
  getStatusColor(status: 'healthy' | 'degraded' | 'down' | 'unknown'): string {
    switch (status) {
      case 'healthy':
        return 'text-emerald-500';
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
    return 'text-emerald-500';
  }
}

// Export singleton instance
export const healthMonitor = new SupabaseHealthMonitor();
export default healthMonitor;
