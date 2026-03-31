/**
 * Analytics Service — Lightweight usage tracking via Supabase
 *
 * Tracks page views, tool usage, and API calls for the Analytics dashboard.
 * Data stays in your own Supabase instance — no external telemetry.
 */

import { supabase } from '@/lib/supabase';

export interface ActivityLog {
  id?: string;
  user_id?: string;
  activity_type: string;
  service_name: string;
  action: string;
  details?: Record<string, unknown>;
  query?: string;
  results_count?: number;
  response_time_ms?: number;
  status?: 'success' | 'error' | 'pending';
  error_message?: string;
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
  private userId: string | null = null;

  private async getUserId(): Promise<string | null> {
    if (this.userId) return this.userId;
    try {
      const { data } = await supabase.auth.getUser();
      this.userId = data.user?.id || null;
      return this.userId;
    } catch {
      return null;
    }
  }

  async logActivity(activity: Partial<ActivityLog>): Promise<void> {
    try {
      const userId = await this.getUserId();
      if (!userId) return;
      await supabase.from('analytics').insert({
        user_id: userId,
        event_type: activity.activity_type || 'activity',
        page: activity.service_name || null,
        tool: activity.action || null,
        duration_ms: activity.response_time_ms || null,
        event_data: activity.details || {},
      });
    } catch { /* silent — analytics should never break the app */ }
  }

  async logSearch(params: { query: string; service: string; resultsCount?: number; responseTime?: number }): Promise<void> {
    return this.logActivity({
      activity_type: 'search',
      service_name: params.service,
      action: 'search',
      query: params.query,
      results_count: params.resultsCount,
      response_time_ms: params.responseTime,
      status: 'success',
    });
  }

  async logApiCall(params: { service: string; endpoint?: string; responseTime?: number; status?: 'success' | 'error'; error?: string }): Promise<void> {
    return this.logActivity({
      activity_type: 'api_call',
      service_name: params.service,
      action: params.endpoint || 'api_call',
      response_time_ms: params.responseTime,
      status: params.status || 'success',
      error_message: params.error,
    });
  }

  async logChat(params: { provider: string; model?: string; responseTime?: number }): Promise<void> {
    return this.logActivity({
      activity_type: 'chat',
      service_name: params.provider,
      action: params.model || 'chat',
      response_time_ms: params.responseTime,
      status: 'success',
    });
  }

  async getRecentActivity(limit = 50): Promise<ActivityLog[]> {
    try {
      const userId = await this.getUserId();
      if (!userId) return [];
      const { data } = await supabase
        .from('analytics')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);
      return (data || []).map((r: any) => ({
        id: r.id,
        user_id: r.user_id,
        activity_type: r.event_type,
        service_name: r.page || '',
        action: r.tool || '',
        response_time_ms: r.duration_ms,
        details: r.event_data,
        created_at: r.created_at,
      }));
    } catch {
      return [];
    }
  }

  async getTodayUsageStats(): Promise<ApiUsageStats[]> { return []; }
  async getServiceUsageStats(_service: string, _days?: number): Promise<ApiUsageStats[]> { return []; }
  async getActivitySummary(_days?: number): Promise<Record<string, number>> { return {}; }
  subscribeToActivityUpdates(_callback: any): () => void { return () => {}; }
  subscribeToUsageStatsUpdates(_callback: any): () => void { return () => {}; }
}

export const analyticsService = new AnalyticsService();
export default analyticsService;
