/**
 * Analytics Service — DISABLED
 *
 * All methods are no-ops. CrowByte does not collect telemetry, usage data,
 * or tracking information. This service exists only to satisfy imports from
 * legacy code. All activity logging is handled locally by logging.ts.
 *
 * No data is sent to any external service. No Supabase tables are queried.
 */

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
  // All methods are intentionally no-ops — no telemetry collected
  async logActivity(_activity: any): Promise<void> { return; }
  async logSearch(_params: any): Promise<void> { return; }
  async logApiCall(_params: any): Promise<void> { return; }
  async logChat(_params: any): Promise<void> { return; }
  async getRecentActivity(_limit?: number): Promise<ActivityLog[]> { return []; }
  async getTodayUsageStats(): Promise<ApiUsageStats[]> { return []; }
  async getServiceUsageStats(_service: string, _days?: number): Promise<ApiUsageStats[]> { return []; }
  async getActivitySummary(_days?: number): Promise<Record<string, number>> { return {}; }
  subscribeToActivityUpdates(_callback: any): () => void { return () => {}; }
  subscribeToUsageStatsUpdates(_callback: any): () => void { return () => {}; }
}

export const analyticsService = new AnalyticsService();
export default analyticsService;
