/**
 * Device Fingerprint Service
 * Creates a unique identifier for each machine to enable "Remember Me" functionality
 */

export interface DeviceInfo {
  deviceId: string;
  platform: string;
  userAgent: string;
  screenResolution: string;
  timezone: string;
  language: string;
  timestamp: number;
}

class DeviceFingerprint {
  private storageKey = 'ghost-ai-device-id';

  /**
   * Generate a unique device fingerprint based on browser/system characteristics
   */
  async generateFingerprint(): Promise<string> {
    const components = [
      navigator.userAgent,
      navigator.language,
      Intl.DateTimeFormat().resolvedOptions().timeZone,
      `${screen.width}x${screen.height}x${screen.colorDepth}`,
      navigator.hardwareConcurrency?.toString() || '',
      navigator.platform,
    ];

    // Create a hash-like identifier
    const fingerprintString = components.join('|');
    const hash = await this.simpleHash(fingerprintString);

    return hash;
  }

  /**
   * Simple hash function for fingerprinting
   */
  private async simpleHash(str: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex.substring(0, 32); // Use first 32 characters
  }

  /**
   * Get or create device ID
   */
  async getDeviceId(): Promise<string> {
    // Check if device ID already exists
    let deviceId = localStorage.getItem(this.storageKey);

    if (!deviceId) {
      // Generate new device ID
      deviceId = await this.generateFingerprint();
      localStorage.setItem(this.storageKey, deviceId);
    }

    return deviceId;
  }

  /**
   * Get full device info
   */
  async getDeviceInfo(): Promise<DeviceInfo> {
    const deviceId = await this.getDeviceId();

    return {
      deviceId,
      platform: navigator.platform,
      userAgent: navigator.userAgent,
      screenResolution: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,
      timestamp: Date.now(),
    };
  }

  /**
   * Check if device is recognized (has stored credentials)
   */
  isDeviceRecognized(): boolean {
    return !!localStorage.getItem(this.storageKey);
  }

  /**
   * Clear device fingerprint (for testing or logout)
   */
  clearDeviceId(): void {
    localStorage.removeItem(this.storageKey);
  }
}

export const deviceFingerprint = new DeviceFingerprint();
