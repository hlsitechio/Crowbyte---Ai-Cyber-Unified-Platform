/**
 * PC Monitoring Service
 * Uses mcp-monitor for real-time system metrics via Electron IPC
 */

export interface CPUInfo {
  usage: number;
  cores: number;
  perCore?: number[];
  model?: string;
  speed?: number;
}

export interface MemoryInfo {
  total: number;      // bytes
  used: number;       // bytes
  free: number;       // bytes
  available: number;  // bytes
  percent: number;    // 0-100
  swapTotal?: number;
  swapUsed?: number;
}

export interface DiskInfo {
  total: number;      // bytes
  used: number;       // bytes
  free: number;       // bytes
  percent: number;    // 0-100
  partitions?: Array<{
    device: string;
    mountpoint: string;
    fstype: string;
    total: number;
    used: number;
    free: number;
    percent: number;
  }>;
}

export interface NetworkInfo {
  interfaces: Array<{
    name: string;
    address: string;
    bytesSent: number;
    bytesRecv: number;
    packetsSent: number;
    packetsRecv: number;
    errIn: number;
    errOut: number;
    dropIn: number;
    dropOut: number;
  }>;
  connections?: Array<{
    fd: number;
    family: string;
    type: string;
    localAddr: string;
    remoteAddr: string;
    status: string;
    pid: number;
  }>;
}

export interface HostInfo {
  hostname: string;
  platform: string;
  platformVersion: string;
  os: string;
  uptime: number;         // seconds
  bootTime: number;       // unix timestamp
  procs: number;          // number of processes
  kernelVersion?: string;
  kernelArch?: string;
}

export interface ProcessInfo {
  pid: number;
  name: string;
  username: string;
  cpu: number;           // percentage
  memory: number;        // percentage
  memoryMB: number;      // MB
  status: string;
  createTime: number;    // unix timestamp
  cmdline?: string;
}

export interface SystemMetrics {
  cpu: CPUInfo;
  memory: MemoryInfo;
  disk: DiskInfo;
  network: NetworkInfo;
  host: HostInfo;
  timestamp: Date;
}

class PCMonitorService {
  private isAvailable = false;

  constructor() {
    this.checkAvailability();
  }

  /**
   * Check if MCP monitoring is available (running in Electron)
   */
  private checkAvailability() {
    this.isAvailable = typeof window !== 'undefined' &&
                       window.electronAPI?.mcpCall !== undefined;

    // Silent in web/server mode — PC Monitor only works in Electron desktop
    // No warning needed; callers check isMonitoringAvailable() before use
  }

  /**
   * Get comprehensive system metrics
   */
  async getSystemMetrics(): Promise<SystemMetrics> {
    if (!this.isAvailable) {
      throw new Error('PC Monitor not available - run in Electron desktop mode');
    }

    try {
      // Fetch all metrics in parallel for speed
      const [cpu, memory, disk, network, host] = await Promise.all([
        this.getCPUInfo(),
        this.getMemoryInfo(),
        this.getDiskInfo(),
        this.getNetworkInfo(),
        this.getHostInfo()
      ]);

      return {
        cpu,
        memory,
        disk,
        network,
        host,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Failed to fetch system metrics:', error);
      throw error;
    }
  }

  /**
   * Get CPU information
   */
  async getCPUInfo(perCpu = false): Promise<CPUInfo> {
    if (!this.isAvailable) {
      throw new Error('PC Monitor not available');
    }

    const result = await window.electronAPI.mcpCall('get_cpu_info', { per_cpu: perCpu });
    return this.parseCPUInfo(result);
  }

  /**
   * Get memory information
   */
  async getMemoryInfo(): Promise<MemoryInfo> {
    if (!this.isAvailable) {
      throw new Error('PC Monitor not available');
    }

    const result = await window.electronAPI.mcpCall('get_memory_info', {});
    return this.parseMemoryInfo(result);
  }

  /**
   * Get disk information
   */
  async getDiskInfo(path = '', allPartitions = true): Promise<DiskInfo> {
    if (!this.isAvailable) {
      throw new Error('PC Monitor not available');
    }

    const result = await window.electronAPI.mcpCall('get_disk_info', {
      path,
      all_partitions: allPartitions
    });
    return this.parseDiskInfo(result);
  }

  /**
   * Get network information
   */
  async getNetworkInfo(interfaceName = ''): Promise<NetworkInfo> {
    if (!this.isAvailable) {
      throw new Error('PC Monitor not available');
    }

    const result = await window.electronAPI.mcpCall('get_network_info', {
      interface: interfaceName
    });
    return this.parseNetworkInfo(result);
  }

  /**
   * Get host/system information
   */
  async getHostInfo(): Promise<HostInfo> {
    if (!this.isAvailable) {
      throw new Error('PC Monitor not available');
    }

    const result = await window.electronAPI.mcpCall('get_host_info', {});
    return this.parseHostInfo(result);
  }

  /**
   * Get process list
   */
  async getProcesses(limit = 10, sortBy: 'cpu' | 'memory' = 'cpu', pid = 0): Promise<ProcessInfo[]> {
    if (!this.isAvailable) {
      throw new Error('PC Monitor not available');
    }

    const result = await window.electronAPI.mcpCall('get_process_info', {
      pid,
      limit,
      sort_by: sortBy
    });
    return this.parseProcessInfo(result);
  }

  /**
   * Parse CPU info from MCP response
   */
  private parseCPUInfo(data: any): CPUInfo {
    // Handle different response formats
    if (data.content && Array.isArray(data.content)) {
      const textContent = data.content.find((c: any) => c.type === 'text');
      if (textContent?.text) {
        try {
          const parsed = JSON.parse(textContent.text);
          return {
            usage: parsed.usage_percent || parsed.usage || 0,
            cores: parsed.cores || parsed.count || 0,
            perCore: parsed.per_core || parsed.perCore,
            model: parsed.model || parsed.model_name,
            speed: parsed.speed || parsed.mhz
          };
        } catch (e) {
          console.error('Failed to parse CPU info:', e);
        }
      }
    }

    // Fallback to direct object
    return {
      usage: data.usage_percent || data.usage || 0,
      cores: data.cores || data.count || 0,
      perCore: data.per_core || data.perCore,
      model: data.model || data.model_name,
      speed: data.speed || data.mhz
    };
  }

  /**
   * Parse memory info from MCP response
   */
  private parseMemoryInfo(data: any): MemoryInfo {
    if (data.content && Array.isArray(data.content)) {
      const textContent = data.content.find((c: any) => c.type === 'text');
      if (textContent?.text) {
        try {
          const parsed = JSON.parse(textContent.text);
          return {
            total: parsed.total || 0,
            used: parsed.used || 0,
            free: parsed.free || parsed.available || 0,
            available: parsed.available || parsed.free || 0,
            percent: parsed.used_percent || parsed.percent || 0,
            swapTotal: parsed.swap_total || parsed.swapTotal,
            swapUsed: parsed.swap_used || parsed.swapUsed
          };
        } catch (e) {
          console.error('Failed to parse memory info:', e);
        }
      }
    }

    return {
      total: data.total || 0,
      used: data.used || 0,
      free: data.free || data.available || 0,
      available: data.available || data.free || 0,
      percent: data.used_percent || data.percent || 0,
      swapTotal: data.swap_total || data.swapTotal,
      swapUsed: data.swap_used || data.swapUsed
    };
  }

  /**
   * Parse disk info from MCP response
   */
  private parseDiskInfo(data: any): DiskInfo {
    if (data.content && Array.isArray(data.content)) {
      const textContent = data.content.find((c: any) => c.type === 'text');
      if (textContent?.text) {
        try {
          const parsed = JSON.parse(textContent.text);
          return {
            total: parsed.total || 0,
            used: parsed.used || 0,
            free: parsed.free || 0,
            percent: parsed.used_percent || parsed.percent || 0,
            partitions: parsed.partitions
          };
        } catch (e) {
          console.error('Failed to parse disk info:', e);
        }
      }
    }

    return {
      total: data.total || 0,
      used: data.used || 0,
      free: data.free || 0,
      percent: data.used_percent || data.percent || 0,
      partitions: data.partitions
    };
  }

  /**
   * Parse network info from MCP response
   */
  private parseNetworkInfo(data: any): NetworkInfo {
    if (data.content && Array.isArray(data.content)) {
      const textContent = data.content.find((c: any) => c.type === 'text');
      if (textContent?.text) {
        try {
          const parsed = JSON.parse(textContent.text);
          return {
            interfaces: parsed.interfaces || [],
            connections: parsed.connections
          };
        } catch (e) {
          console.error('Failed to parse network info:', e);
        }
      }
    }

    return {
      interfaces: data.interfaces || [],
      connections: data.connections
    };
  }

  /**
   * Parse host info from MCP response
   */
  private parseHostInfo(data: any): HostInfo {
    if (data.content && Array.isArray(data.content)) {
      const textContent = data.content.find((c: any) => c.type === 'text');
      if (textContent?.text) {
        try {
          const parsed = JSON.parse(textContent.text);
          return {
            hostname: parsed.hostname || '',
            platform: parsed.platform || parsed.os || '',
            platformVersion: parsed.platform_version || parsed.platformVersion || '',
            os: parsed.os || parsed.platform || '',
            uptime: parsed.uptime || 0,
            bootTime: parsed.boot_time || parsed.bootTime || 0,
            procs: parsed.procs || 0,
            kernelVersion: parsed.kernel_version || parsed.kernelVersion,
            kernelArch: parsed.kernel_arch || parsed.kernelArch
          };
        } catch (e) {
          console.error('Failed to parse host info:', e);
        }
      }
    }

    return {
      hostname: data.hostname || '',
      platform: data.platform || data.os || '',
      platformVersion: data.platform_version || data.platformVersion || '',
      os: data.os || data.platform || '',
      uptime: data.uptime || 0,
      bootTime: data.boot_time || data.bootTime || 0,
      procs: data.procs || 0,
      kernelVersion: data.kernel_version || data.kernelVersion,
      kernelArch: data.kernel_arch || data.kernelArch
    };
  }

  /**
   * Parse process info from MCP response
   */
  private parseProcessInfo(data: any): ProcessInfo[] {
    if (data.content && Array.isArray(data.content)) {
      const textContent = data.content.find((c: any) => c.type === 'text');
      if (textContent?.text) {
        try {
          const parsed = JSON.parse(textContent.text);
          const processes = parsed.processes || parsed;
          return Array.isArray(processes) ? processes : [];
        } catch (e) {
          console.error('Failed to parse process info:', e);
        }
      }
    }

    const processes = data.processes || data;
    return Array.isArray(processes) ? processes : [];
  }

  /**
   * Check if PC monitoring is available
   */
  isMonitoringAvailable(): boolean {
    return this.isAvailable;
  }

  /**
   * Format bytes to human readable
   */
  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  }

  /**
   * Format uptime to human readable
   */
  formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);

    return parts.join(' ') || '0m';
  }
}

// Export singleton instance
export const pcMonitor = new PCMonitorService();
export default pcMonitor;
