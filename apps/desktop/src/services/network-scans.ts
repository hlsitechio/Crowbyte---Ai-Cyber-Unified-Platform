/**
 * Network Scans Service
 * Manages network scanning operations and results
 */

import { supabase } from '@/lib/supabase';

export interface NetworkScan {
  id: string;
  user_id: string;
  name: string;
  target: string;
  scan_type: 'port_scan' | 'service_detection' | 'vuln_scan' | 'full_scan';
  description?: string;
  ports?: string;
  scan_options: Record<string, unknown>;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  results: Record<string, unknown>;
  hosts_found: number;
  ports_found: number;
  services_found: number;
  vulnerabilities_found: number;
  duration_seconds?: number;
  packets_sent?: number;
  packets_received?: number;
  open_ports: unknown[];
  closed_ports: unknown[];
  filtered_ports: unknown[];
  detected_services: unknown[];
  detected_os?: string;
  started_at?: string;
  completed_at?: string;
  error_message?: string;
  tags: string[];
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ScanHost {
  id: string;
  scan_id: string;
  user_id: string;
  ip_address: string;
  hostname?: string;
  mac_address?: string;
  status: 'up' | 'down' | 'unknown';
  open_ports: unknown[];
  services: unknown[];
  os_guess?: string;
  os_accuracy?: number;
  latency_ms?: number;
  ttl?: number;
  created_at: string;
}

export interface ScanPort {
  id: string;
  scan_id: string;
  host_id?: string;
  user_id: string;
  port: number;
  protocol: 'tcp' | 'udp';
  state: 'open' | 'closed' | 'filtered';
  service_name?: string;
  service_version?: string;
  service_product?: string;
  banner?: string;
  cve_references: string[];
  is_vulnerable: boolean;
  created_at: string;
}

export interface CreateScanData {
  name: string;
  target: string;
  scan_type: NetworkScan['scan_type'];
  description?: string;
  ports?: string;
  scan_options?: Record<string, unknown>;
  tags?: string[];
  notes?: string;
}

class NetworkScansService {
  /**
   * Get all scans for current user
   */
  async getScans(): Promise<NetworkScan[]> {
    const { data, error } = await supabase
      .from('network_scans')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch scans:', error);
      throw new Error(`Failed to fetch scans: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get scans by status
   */
  async getScansByStatus(status: NetworkScan['status']): Promise<NetworkScan[]> {
    const { data, error } = await supabase
      .from('network_scans')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch scans by status:', error);
      throw new Error(`Failed to fetch scans: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get single scan by ID
   */
  async getScan(id: string): Promise<NetworkScan> {
    const { data, error } = await supabase
      .from('network_scans')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Failed to fetch scan:', error);
      throw new Error(`Failed to fetch scan: ${error.message}`);
    }

    return data;
  }

  /**
   * Create a new scan
   */
  async createScan(scanData: CreateScanData): Promise<NetworkScan> {
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('network_scans')
      .insert({
        user_id: user.id,
        ...scanData,
        scan_options: scanData.scan_options || {},
        tags: scanData.tags || [],
        status: 'queued',
        progress: 0,
        results: {},
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create scan:', error);
      throw new Error(`Failed to create scan: ${error.message}`);
    }

    return data;
  }

  /**
   * Update a scan
   */
  async updateScan(id: string, updates: Partial<NetworkScan>): Promise<NetworkScan> {
    const { data, error } = await supabase
      .from('network_scans')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Failed to update scan:', error);
      throw new Error(`Failed to update scan: ${error.message}`);
    }

    return data;
  }

  /**
   * Update scan status and progress
   */
  async updateScanStatus(
    id: string,
    status: NetworkScan['status'],
    progress?: number,
    errorMessage?: string
  ): Promise<NetworkScan> {
    const updates: Record<string, unknown> = { status };

    if (progress !== undefined) {
      updates.progress = progress;
    }

    if (errorMessage) {
      updates.error_message = errorMessage;
    }

    // Set timestamps based on status
    if (status === 'running' && !updates.started_at) {
      updates.started_at = new Date().toISOString();
    } else if ((status === 'completed' || status === 'failed') && !updates.completed_at) {
      updates.completed_at = new Date().toISOString();

      // Calculate duration if we have both start and end times
      const scan = await this.getScan(id);
      if (scan.started_at) {
        const start = new Date(scan.started_at).getTime();
        const end = new Date().getTime();
        updates.duration_seconds = Math.floor((end - start) / 1000);
      }
    }

    return this.updateScan(id, updates);
  }

  /**
   * Delete a scan
   */
  async deleteScan(id: string): Promise<void> {
    const { error } = await supabase
      .from('network_scans')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Failed to delete scan:', error);
      throw new Error(`Failed to delete scan: ${error.message}`);
    }
  }

  /**
   * Get scan statistics
   */
  async getScanStats(): Promise<{
    totalScans: number;
    activeScans: number;
    completedScans: number;
    totalHosts: number;
    totalPorts: number;
    totalVulnerabilities: number;
  }> {
    const scans = await this.getScans();

    const totalScans = scans.length;
    const activeScans = scans.filter(
      s => s.status === 'running' || s.status === 'queued'
    ).length;
    const completedScans = scans.filter(s => s.status === 'completed').length;
    const totalHosts = scans.reduce((sum, s) => sum + s.hosts_found, 0);
    const totalPorts = scans.reduce((sum, s) => sum + s.ports_found, 0);
    const totalVulnerabilities = scans.reduce((sum, s) => sum + s.vulnerabilities_found, 0);

    return {
      totalScans,
      activeScans,
      completedScans,
      totalHosts,
      totalPorts,
      totalVulnerabilities,
    };
  }

  /**
   * Get hosts for a scan
   */
  async getScanHosts(scanId: string): Promise<ScanHost[]> {
    const { data, error } = await supabase
      .from('scan_hosts')
      .select('*')
      .eq('scan_id', scanId);

    if (error) {
      console.error('Failed to fetch scan hosts:', error);
      throw new Error(`Failed to fetch hosts: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get ports for a scan
   */
  async getScanPorts(scanId: string, hostId?: string): Promise<ScanPort[]> {
    let query = supabase
      .from('scan_ports')
      .select('*')
      .eq('scan_id', scanId);

    if (hostId) {
      query = query.eq('host_id', hostId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Failed to fetch scan ports:', error);
      throw new Error(`Failed to fetch ports: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Start a scan (mock implementation - in production this would trigger actual scanning)
   */
  async startScan(id: string): Promise<NetworkScan> {
    // Update status to running
    const scan = await this.updateScanStatus(id, 'running', 0);

    // In a real implementation, this would:
    // 1. Send scan request to scanning engine/edge function
    // 2. Poll for progress updates
    // 3. Update scan results as they come in

    // For now, just return the updated scan
    return scan;
  }

  /**
   * Cancel a running scan
   */
  async cancelScan(id: string): Promise<NetworkScan> {
    return this.updateScanStatus(id, 'cancelled');
  }
}

// Export singleton instance
export const networkScansService = new NetworkScansService();
export default networkScansService;
