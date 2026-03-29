/**
 * Analytics Service
 * Tracks user activity and API usage with real-time updates
 */

import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface ActivityLog {
  id?: string;
  user_id?: string;
  activity_type: 'search' | 'chat' | 'api_call' | 'cve_lookup' | 'bookmark' | 'knowledge_add' | 'memory_add' | 'login' | 'settings_change';
  service_name: string;
  action: string;
  details?: Record<string, unknown>;
  query?: string;
  results_count?: number;
  response_time_ms?: number;
  status?: 'success' | 'error' | 'pending';
  error_message?: string;
  ip_address?: string;
  user_agent?: string;
  created_at?: string;
}

export interface ApiUsageStats {
  id?: string;
  user_id?: string;
  service_name: string;
  date?: string;
  call_count: number;
  success_count: number;
  error_count: number;
  total_response_time_ms: number;
  avg_response_time_ms: number;
  created_at?: string;
  updated_at?: string;
}

class AnalyticsService {
  private realtimeChannel: RealtimeChannel | null = null;

  /**
   * Log an activity
   */
  async logActivity(_activity: Omit<ActivityLog, 'id' | 'user_id' | 'created_at'>): Promise<void> {
    // activity_logs table does not exist in Supabase yet — skip insert to avoid 400 spam
    // TODO: create activity_logs table in Supabase, then re-enable
    return;
  }

  /**
   * Log a search activity
   */
  async logSearch(params: {
    service: string;
    query: string;
    resultsCount: number;
    responseTimeMs: number;
    status?: 'success' | 'error';
    error?: string;
  }): Promise<void> {
    await this.logActivity({
      activity_type: 'search',
      service_name: params.service,
      action: 'search',
      query: params.query,
      results_count: params.resultsCount,
      response_time_ms: params.responseTimeMs,
      status: params.status || 'success',
      error_message: params.error,
    });
  }

  /**
   * Log an API call
   */
  async logApiCall(params: {
    service: string;
    action: string;
    responseTimeMs: number;
    status?: 'success' | 'error';
    error?: string;
    details?: Record<string, unknown>;
  }): Promise<void> {
    await this.logActivity({
      activity_type: 'api_call',
      service_name: params.service,
      action: params.action,
      response_time_ms: params.responseTimeMs,
      status: params.status || 'success',
      error_message: params.error,
      details: params.details,
    });
  }

  /**
   * Log a chat message
   */
  async logChat(params: {
    model: string;
    messageLength: number;
    responseTimeMs: number;
    status?: 'success' | 'error';
  }): Promise<void> {
    await this.logActivity({
      activity_type: 'chat',
      service_name: 'venice-ai',
      action: 'chat_message',
      details: { model: params.model, message_length: params.messageLength },
      response_time_ms: params.responseTimeMs,
      status: params.status || 'success',
    });
  }

  /**
   * Get recent activity logs
   */
  async getRecentActivity(limit: number = 50): Promise<ActivityLog[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Failed to fetch activity logs:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get API usage stats for today
   */
  async getTodayUsageStats(): Promise<ApiUsageStats[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('api_usage_stats')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', today);

    if (error) {
      console.error('Failed to fetch usage stats:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get API usage stats for a specific service
   */
  async getServiceUsageStats(serviceName: string, days: number = 7): Promise<ApiUsageStats[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('api_usage_stats')
      .select('*')
      .eq('user_id', user.id)
      .eq('service_name', serviceName)
      .gte('date', startDate.toISOString().split('T')[0])
      .order('date', { ascending: false });

    if (error) {
      console.error('Failed to fetch service usage stats:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Subscribe to real-time activity updates
   */
  subscribeToActivityUpdates(callback: (activity: ActivityLog) => void): () => void {
    this.realtimeChannel = supabase
      .channel('activity_logs_channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_logs',
        },
        (payload) => {
          callback(payload.new as ActivityLog);
        }
      )
      .subscribe();

    // Return unsubscribe function
    return () => {
      if (this.realtimeChannel) {
        supabase.removeChannel(this.realtimeChannel);
        this.realtimeChannel = null;
      }
    };
  }

  /**
   * Subscribe to real-time usage stats updates
   */
  subscribeToUsageStatsUpdates(callback: (stats: ApiUsageStats) => void): () => void {
    const channel = supabase
      .channel('usage_stats_channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'api_usage_stats',
        },
        (payload) => {
          callback(payload.new as ApiUsageStats);
        }
      )
      .subscribe();

    // Return unsubscribe function
    return () => {
      supabase.removeChannel(channel);
    };
  }

  /**
   * Get activity summary by type
   */
  async getActivitySummary(days: number = 7): Promise<Record<string, number>> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return {};

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('activity_logs')
      .select('activity_type')
      .eq('user_id', user.id)
      .gte('created_at', startDate.toISOString());

    if (error) {
      console.error('Failed to fetch activity summary:', error);
      return {};
    }

    // Count by type
    const summary: Record<string, number> = {};
    data?.forEach((log: ActivityLog) => {
      summary[log.activity_type] = (summary[log.activity_type] || 0) + 1;
    });

    return summary;
  }
}

// Export singleton instance
export const analyticsService = new AnalyticsService();
export default analyticsService;
