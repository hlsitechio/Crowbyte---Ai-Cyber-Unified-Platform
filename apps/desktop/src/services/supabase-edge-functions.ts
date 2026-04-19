/**
 * Supabase Edge Functions Service
 * Wrapper for Ghost AI Terminal Supabase Edge Functions
 */

import { supabase } from '@/lib/supabase';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Supabase configuration missing in environment variables');
}

export interface EdgeFunctionResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
}

export interface ApiUsageStats {
  call_count: number;
  daily_limit: number;
  remaining: number;
  reset_time: string;
  percent_used: number;
}

class SupabaseEdgeFunctionsService {
  private baseUrl = `${SUPABASE_URL}/functions/v1`;

  /**
   * Make authenticated request to edge function
   */
  private async callFunction<T = unknown>(
    functionName: string,
    options: RequestInit = {}
  ): Promise<EdgeFunctionResponse<T>> {
    const url = `${this.baseUrl}/${functionName}`;

    // Get user's session token for authenticated requests
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session) {
      console.error('No active session for edge function call:', sessionError);
      return { error: 'Authentication required' };
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(`Edge function ${functionName} error:`, data);
      return { error: data.error || 'Unknown error' };
    }

    return data;
  }

  /**
   * API Keys Manager
   */
  apiKeys = {
    /**
     * Get all API keys
     */
    getAll: async () => {
      return this.callFunction('api-keys-manager', {
        method: 'GET',
      });
    },

    /**
     * Get API keys for a specific service
     */
    getByService: async (serviceName: string) => {
      return this.callFunction(`api-keys-manager?service=${serviceName}`, {
        method: 'GET',
      });
    },

    /**
     * Create or update API key
     */
    upsert: async (params: {
      service_name: string;
      key_name: string;
      key_value: string;
      endpoint_url?: string;
    }) => {
      return this.callFunction('api-keys-manager', {
        method: 'POST',
        body: JSON.stringify(params),
      });
    },

    /**
     * Deactivate API key
     */
    deactivate: async (serviceName: string, keyName: string) => {
      return this.callFunction(
        `api-keys-manager?service=${serviceName}&key=${keyName}`,
        { method: 'DELETE' }
      );
    },
  };

  /**
   * User Settings Manager
   */
  settings = {
    /**
     * Get user settings (auto-creates if not exists)
     */
    get: async () => {
      return this.callFunction('user-settings-manager', {
        method: 'GET',
      });
    },

    /**
     * Update all user settings
     */
    update: async (settings: Record<string, unknown>) => {
      return this.callFunction('user-settings-manager', {
        method: 'POST',
        body: JSON.stringify(settings),
      });
    },

    /**
     * Partial update user settings
     */
    patch: async (settings: Record<string, unknown>) => {
      return this.callFunction('user-settings-manager', {
        method: 'PATCH',
        body: JSON.stringify(settings),
      });
    },
  };

}

// Export singleton instance
export const edgeFunctions = new SupabaseEdgeFunctionsService();
export default edgeFunctions;
