/**
 * Endpoint Management Service
 * Handles CRUD operations for fleet endpoints in Supabase
 */

import { supabase } from '@/lib/supabase';
import { systemMonitor, SystemMetrics } from './systemMonitor';

export interface Endpoint {
  id: string;
  user_id: string;
  hostname: string;
  ip_address: string;
  mac_address?: string;
  os_name: string;
  os_version: string;
  architecture: string;
  status: 'online' | 'offline' | 'warning' | 'critical';
  cpu_usage: number;
  memory_usage: number;
  disk_usage: number;
  total_memory_gb: number;
  total_disk_gb: number;
  cpu_model: string;
  cpu_cores: number;
  threats_detected: number;
  last_scan_at?: string;
  agent_version: string;
  location?: string;
  tags?: string[];
  is_current_device: boolean;
  last_seen_at: string;
  created_at: string;
  updated_at: string;
  // Local-only GPU metrics (not stored in Supabase)
  gpu?: {
    name: string;
    temperature: number;
    utilization: number;
    memoryUsed: number;
    memoryTotal: number;
    powerDraw: number;
    powerLimit: number;
  } | null;
}

export type EndpointCreate = Omit<Endpoint, 'id' | 'created_at' | 'updated_at' | 'last_seen_at'>;
export type EndpointUpdate = Partial<Omit<Endpoint, 'id' | 'user_id' | 'created_at'>>;

class EndpointService {
  private updateInterval: NodeJS.Timeout | null = null;
  private currentEndpointId: string | null = null;

  /**
   * Get all endpoints for current user
   */
  async getAll(): Promise<Endpoint[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.warn('No user logged in');
      return [];
    }

    const { data, error } = await supabase
      .from('endpoints')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching endpoints:', error);
      throw error;
    }

    const endpoints: Endpoint[] = data || [];

    // Enrich current device with local GPU metrics
    try {
      const metrics = await systemMonitor.getMetrics();
      if (metrics.gpu) {
        const currentDevice = endpoints.find(e => e.is_current_device);
        if (currentDevice) {
          currentDevice.gpu = metrics.gpu;
        }
      }
    } catch { /* ignore */ }

    return endpoints;
  }

  /**
   * Get endpoint by ID
   */
  async getById(id: string): Promise<Endpoint | null> {
    const { data, error } = await supabase
      .from('endpoints')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching endpoint:', error);
      return null;
    }

    return data;
  }

  /**
   * Create endpoint from current machine
   */
  async createFromCurrentMachine(customName?: string): Promise<Endpoint> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Get current system metrics
    const metrics = await systemMonitor.getMetrics();

    const endpoint: EndpointCreate = {
      user_id: user.id,
      hostname: customName || metrics.hostname,
      ip_address: metrics.ipAddress,
      os_name: metrics.platform,
      os_version: metrics.osVersion,
      architecture: metrics.architecture,
      status: 'online',
      cpu_usage: metrics.cpuUsage,
      memory_usage: metrics.memoryUsage,
      disk_usage: metrics.diskUsage,
      total_memory_gb: metrics.memoryTotal,
      total_disk_gb: metrics.diskTotal,
      cpu_model: metrics.cpuModel,
      cpu_cores: metrics.cpuCores,
      threats_detected: 0,
      agent_version: '1.0.0',
      is_current_device: true,
      tags: ['primary'],
    };

    return this.create(endpoint);
  }

  /**
   * Create new endpoint
   */
  async create(endpoint: EndpointCreate): Promise<Endpoint> {
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('endpoints')
      .insert([{
        ...endpoint,
        last_seen_at: now,
        created_at: now,
        updated_at: now,
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating endpoint:', error);
      throw error;
    }

    // If this is the current device, store the ID and start updating
    if (endpoint.is_current_device) {
      this.currentEndpointId = data.id;
      this.startAutoUpdate();
    }

    return data;
  }

  /**
   * Update endpoint
   */
  async update(id: string, updates: EndpointUpdate): Promise<Endpoint> {
    const { data, error } = await supabase
      .from('endpoints')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating endpoint:', error);
      throw error;
    }

    return data;
  }

  /**
   * Update endpoint metrics from current system
   */
  async updateMetrics(id: string): Promise<void> {
    const metrics = await systemMonitor.getMetrics();

    await this.update(id, {
      cpu_usage: metrics.cpuUsage,
      memory_usage: metrics.memoryUsage,
      disk_usage: metrics.diskUsage,
      ip_address: metrics.ipAddress,
      status: this.determineStatus(metrics),
      last_seen_at: new Date().toISOString(),
    });
  }

  /**
   * Determine endpoint status based on metrics
   */
  private determineStatus(metrics: SystemMetrics): 'online' | 'offline' | 'warning' | 'critical' {
    if (metrics.cpuUsage > 90 || metrics.memoryUsage > 95 || metrics.diskUsage > 95) {
      return 'critical';
    }
    if (metrics.cpuUsage > 70 || metrics.memoryUsage > 80 || metrics.diskUsage > 85) {
      return 'warning';
    }
    return 'online';
  }

  /**
   * Delete endpoint
   */
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('endpoints')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting endpoint:', error);
      throw error;
    }

    // Stop auto-update if deleting current device
    if (id === this.currentEndpointId) {
      this.stopAutoUpdate();
      this.currentEndpointId = null;
    }
  }

  /**
   * Find current device endpoint
   */
  async findCurrentDevice(): Promise<Endpoint | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('endpoints')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_current_device', true)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    this.currentEndpointId = data.id;
    return data;
  }

  /**
   * Start automatic metrics updates
   */
  startAutoUpdate(intervalMs: number = 30000): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    this.updateInterval = setInterval(async () => {
      if (this.currentEndpointId) {
        try {
          await this.updateMetrics(this.currentEndpointId);
        } catch (error) {
          console.error('Failed to update metrics:', error);
        }
      }
    }, intervalMs);
  }

  /**
   * Stop automatic metrics updates
   */
  stopAutoUpdate(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  /**
   * Get fleet overview stats
   */
  async getFleetStats(): Promise<{
    total: number;
    online: number;
    warning: number;
    critical: number;
    offline: number;
    avgCpuUsage: number;
    avgMemoryUsage: number;
  }> {
    const endpoints = await this.getAll();

    const stats = {
      total: endpoints.length,
      online: endpoints.filter(e => e.status === 'online').length,
      warning: endpoints.filter(e => e.status === 'warning').length,
      critical: endpoints.filter(e => e.status === 'critical').length,
      offline: endpoints.filter(e => e.status === 'offline').length,
      avgCpuUsage: 0,
      avgMemoryUsage: 0,
    };

    if (endpoints.length > 0) {
      stats.avgCpuUsage = Math.round(
        endpoints.reduce((sum, e) => sum + e.cpu_usage, 0) / endpoints.length
      );
      stats.avgMemoryUsage = Math.round(
        endpoints.reduce((sum, e) => sum + e.memory_usage, 0) / endpoints.length
      );
    }

    return stats;
  }

  /**
   * Check if current device is registered
   */
  async isCurrentDeviceRegistered(): Promise<boolean> {
    const device = await this.findCurrentDevice();
    return device !== null;
  }
}

// Singleton instance
export const endpointService = new EndpointService();
export default endpointService;
