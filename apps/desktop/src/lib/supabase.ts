/**
 * Supabase Client Configuration
 * AI_Ghost Project - Centralized backend for API keys and data storage
 */

import { createClient } from '@supabase/supabase-js';

// Ensure environment variables are loaded
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
// Service role key bypasses RLS — safe in local Electron app
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase environment variables. Some features may not work.');
}

// Create Supabase client — use service key if available (bypasses RLS), else anon key
export const supabase = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Database types for TypeScript
export interface ApiKey {
  id: string;
  service_name: string;
  key_name: string;
  key_value: string;
  endpoint_url?: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export interface UserSettings {
  id: string;
  user_id: string;
  venice_api_key?: string;
  inoreader_client_id?: string;
  inoreader_client_secret?: string;
  inoreader_access_token?: string;
  inoreader_refresh_token?: string;
  profile_picture_url?: string;
  created_at: string;
  updated_at: string;
}

// Helper functions for API key management
export const apiKeyService = {
  /**
   * Get all API keys
   */
  async getAll(): Promise<ApiKey[]> {
    const { data, error } = await supabase
      .from('api_keys')
      .select('*')
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching API keys:', error);
      throw error;
    }

    return data || [];
  },

  /**
   * Get API key by service name
   */
  async getByService(serviceName: string): Promise<ApiKey | null> {
    const { data, error } = await supabase
      .from('api_keys')
      .select('*')
      .eq('service_name', serviceName)
      .eq('is_active', true)
      .single();

    if (error) {
      console.error(`Error fetching API key for ${serviceName}:`, error);
      return null;
    }

    return data;
  },

  /**
   * Update API key
   */
  async update(id: string, keyValue: string): Promise<void> {
    const { error } = await supabase
      .from('api_keys')
      .update({
        key_value: keyValue,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      console.error('Error updating API key:', error);
      throw error;
    }
  },

  /**
   * Create new API key
   */
  async create(apiKey: Omit<ApiKey, 'id' | 'created_at' | 'updated_at'>): Promise<ApiKey> {
    const { data, error } = await supabase
      .from('api_keys')
      .insert([{
        ...apiKey,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating API key:', error);
      throw error;
    }

    return data;
  },
};

// User settings service
export const settingsService = {
  /**
   * Get user settings
   */
  async get(userId: string): Promise<UserSettings | null> {
    const { data, error} = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error fetching user settings:', error);
      return null;
    }

    return data;
  },

  /**
   * Update user settings
   */
  async update(userId: string, settings: Partial<UserSettings>): Promise<void> {
    const { error } = await supabase
      .from('user_settings')
      .upsert({
        user_id: userId,
        ...settings,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      console.error('Error updating user settings:', error);
      throw error;
    }
  },
};

export default supabase;
