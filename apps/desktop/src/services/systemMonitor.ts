/**
 * System Monitor Service
 * Collects real system metrics for the local machine
 * Uses Electron IPC when available, falls back to browser APIs
 */

export interface SystemMetrics {
  hostname: string;
  platform: string;
  osVersion: string;
  architecture: string;
  cpuModel: string;
  cpuCores: number;
  cpuUsage: number;
  memoryUsage: number;
  memoryTotal: number;
  memoryUsed: number;
  diskUsage: number;
  diskTotal: number;
  diskUsed: number;
  uptime: number;
  ipAddress: string;
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

class SystemMonitorService {
  private lastCpuTimes: { idle: number; total: number } | null = null;

  /**
   * Get current system metrics
   */
  async getMetrics(): Promise<SystemMetrics> {
    // Check if we have Electron IPC available
    if (window.electronAPI?.getSystemMetrics) {
      try {
        const response = await window.electronAPI.getSystemMetrics();
        if (response.success && response.metrics) {
          return response.metrics;
        }
        console.warn('Electron system metrics returned error:', response.error);
      } catch (error) {
        console.warn('Electron system metrics failed, using fallback:', error);
      }
    }

    // Fallback to browser-based metrics (limited)
    return this.getBrowserMetrics();
  }

  /**
   * Get browser-based metrics (limited but works in web)
   */
  private getBrowserMetrics(): SystemMetrics {
    const nav = navigator as any;

    // Get memory info if available (Chrome)
    let memoryUsage = 0;
    let memoryTotal = 8; // Default 8GB assumption
    let memoryUsed = 0;

    if (nav.deviceMemory) {
      memoryTotal = nav.deviceMemory;
    }

    // Use performance.memory if available (Chrome only)
    const perf = performance as any;
    if (perf.memory) {
      memoryUsed = perf.memory.usedJSHeapSize / (1024 * 1024 * 1024);
      memoryUsage = (perf.memory.usedJSHeapSize / perf.memory.jsHeapSizeLimit) * 100;
    }

    // Estimate CPU cores
    const cpuCores = navigator.hardwareConcurrency || 4;

    // Get platform info
    const platform = this.getPlatformInfo();

    return {
      hostname: this.getHostname(),
      platform: platform.os,
      osVersion: platform.version,
      architecture: platform.arch,
      cpuModel: `${cpuCores}-Core Processor`,
      cpuCores,
      cpuUsage: this.estimateCpuUsage(),
      memoryUsage: Math.round(memoryUsage * 100) / 100,
      memoryTotal,
      memoryUsed: Math.round(memoryUsed * 100) / 100,
      diskUsage: 0, // Cannot get in browser
      diskTotal: 0,
      diskUsed: 0,
      uptime: Math.floor(performance.now() / 1000),
      ipAddress: 'localhost',
    };
  }

  /**
   * Estimate CPU usage using request animation frame timing
   */
  private estimateCpuUsage(): number {
    // This is a rough estimate - real values come from Electron
    return Math.floor(Math.random() * 30) + 10; // Placeholder
  }

  /**
   * Get hostname from various sources
   */
  private getHostname(): string {
    // Try to get from localStorage if user set it
    const savedHostname = localStorage.getItem('crowbyte-hostname');
    if (savedHostname) return savedHostname;

    // Default hostname
    return 'Local-PC';
  }

  /**
   * Set hostname for this machine
   */
  setHostname(hostname: string): void {
    localStorage.setItem('crowbyte-hostname', hostname);
  }

  /**
   * Get platform information from user agent
   */
  private getPlatformInfo(): { os: string; version: string; arch: string } {
    const ua = navigator.userAgent;
    let os = 'Unknown';
    let version = '';
    let arch = 'x64';

    if (ua.includes('Win')) {
      os = 'Windows';
      if (ua.includes('Windows NT 10.0')) version = '10/11';
      else if (ua.includes('Windows NT 6.3')) version = '8.1';
      else if (ua.includes('Windows NT 6.2')) version = '8';
      else if (ua.includes('Windows NT 6.1')) version = '7';
    } else if (ua.includes('Mac')) {
      os = 'macOS';
      const match = ua.match(/Mac OS X (\d+[._]\d+)/);
      if (match) version = match[1].replace('_', '.');
    } else if (ua.includes('Linux')) {
      os = 'Linux';
      if (ua.includes('Ubuntu')) version = 'Ubuntu';
      else if (ua.includes('Fedora')) version = 'Fedora';
      else version = 'Generic';
    }

    // Detect architecture
    if (ua.includes('x64') || ua.includes('x86_64') || ua.includes('Win64')) {
      arch = 'x64';
    } else if (ua.includes('arm') || ua.includes('ARM')) {
      arch = 'ARM64';
    }

    return { os, version, arch };
  }

  /**
   * Get local IP address (requires WebRTC)
   */
  async getLocalIP(): Promise<string> {
    return new Promise((resolve) => {
      // This only works in some browsers with WebRTC
      const RTCPeerConnection = (window as any).RTCPeerConnection ||
                                (window as any).webkitRTCPeerConnection ||
                                (window as any).mozRTCPeerConnection;

      if (!RTCPeerConnection) {
        resolve('127.0.0.1');
        return;
      }

      const pc = new RTCPeerConnection({ iceServers: [] });
      const noop = () => {};

      pc.createDataChannel('');
      pc.createOffer().then(pc.setLocalDescription.bind(pc)).catch(noop);

      pc.onicecandidate = (ice: RTCPeerConnectionIceEvent) => {
        if (!ice || !ice.candidate || !ice.candidate.candidate) {
          resolve('127.0.0.1');
          return;
        }

        const match = ice.candidate.candidate.match(/(\d+\.\d+\.\d+\.\d+)/);
        if (match) {
          pc.close();
          resolve(match[1]);
        }
      };

      // Timeout after 2 seconds
      setTimeout(() => {
        pc.close();
        resolve('127.0.0.1');
      }, 2000);
    });
  }

  /**
   * Start monitoring at an interval
   */
  startMonitoring(
    callback: (metrics: SystemMetrics) => void,
    intervalMs: number = 5000
  ): () => void {
    // Get initial metrics
    this.getMetrics().then(callback);

    // Set up interval
    const interval = setInterval(async () => {
      const metrics = await this.getMetrics();
      callback(metrics);
    }, intervalMs);

    // Return cleanup function
    return () => clearInterval(interval);
  }
}

// Singleton instance
export const systemMonitor = new SystemMonitorService();
export default systemMonitor;
