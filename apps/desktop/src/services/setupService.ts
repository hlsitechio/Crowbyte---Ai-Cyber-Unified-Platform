/**
 * Setup Service — First-Run Configuration & Onboarding
 *
 * Manages the initial setup wizard state and persists config.
 * Checks if CrowByte has been configured on this machine.
 * Validates connections to Supabase, VPS, and license server.
 */

export interface SetupConfig {
  // Meta
  setupComplete: boolean;
  setupVersion: number;        // Bump to re-trigger setup on breaking changes
  completedAt: string | null;  // ISO timestamp
  eulaAcceptedAt: string | null;
  eulaVersion: string | null;

  // License
  licenseKey: string;
  licenseTier: 'community' | 'professional' | 'team' | 'enterprise';
  licenseValidUntil: string | null;
  machineId: string;

  // Infrastructure
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseProjectRef: string;

  // VPS (optional)
  vpsEnabled: boolean;
  vpsHost: string;
  vpsIp: string;
  vpsGatewayPort: number;
  vpsSshUser: string;

  // Workspace
  workspaceName: string;
  adminEmail: string;

  // Feature flags per tier
  features: {
    maxTargets: number;         // -1 = unlimited
    maxEndpoints: number;       // -1 = unlimited
    aiChat: boolean;
    vpsAgents: boolean;
    fleetManagement: boolean;
    remoteDesktop: boolean;
    apiAccess: boolean;
    customAgents: boolean;
    teamCollaboration: boolean;
    exportReports: boolean;
    prioritySupport: boolean;
  };
}

const SETUP_STORAGE_KEY = 'crowbyte_setup_config';
const CURRENT_SETUP_VERSION = 1;

// Feature limits per tier
const TIER_FEATURES: Record<SetupConfig['licenseTier'], SetupConfig['features']> = {
  community: {
    maxTargets: 3,
    maxEndpoints: 3,
    aiChat: true,
    vpsAgents: false,
    fleetManagement: false,
    remoteDesktop: false,
    apiAccess: false,
    customAgents: false,
    teamCollaboration: false,
    exportReports: false,
    prioritySupport: false,
  },
  professional: {
    maxTargets: -1,
    maxEndpoints: 25,
    aiChat: true,
    vpsAgents: true,
    fleetManagement: true,
    remoteDesktop: true,
    apiAccess: true,
    customAgents: true,
    teamCollaboration: false,
    exportReports: true,
    prioritySupport: false,
  },
  team: {
    maxTargets: -1,
    maxEndpoints: -1,
    aiChat: true,
    vpsAgents: true,
    fleetManagement: true,
    remoteDesktop: true,
    apiAccess: true,
    customAgents: true,
    teamCollaboration: true,
    exportReports: true,
    prioritySupport: true,
  },
  enterprise: {
    maxTargets: -1,
    maxEndpoints: -1,
    aiChat: true,
    vpsAgents: true,
    fleetManagement: true,
    remoteDesktop: true,
    apiAccess: true,
    customAgents: true,
    teamCollaboration: true,
    exportReports: true,
    prioritySupport: true,
  },
};

function getDefaultConfig(): SetupConfig {
  return {
    setupComplete: false,
    setupVersion: CURRENT_SETUP_VERSION,
    completedAt: null,
    eulaAcceptedAt: null,
    eulaVersion: null,
    licenseKey: '',
    licenseTier: 'community',
    licenseValidUntil: null,
    machineId: generateMachineId(),
    supabaseUrl: '',
    supabaseAnonKey: '',
    supabaseProjectRef: '',
    vpsEnabled: false,
    vpsHost: '',
    vpsIp: '',
    vpsGatewayPort: 18789,
    vpsSshUser: 'root',
    workspaceName: '',
    adminEmail: '',
    features: TIER_FEATURES.community,
  };
}

/** Generate a deterministic machine fingerprint */
function generateMachineId(): string {
  const nav = typeof navigator !== 'undefined' ? navigator : null;
  const parts = [
    nav?.userAgent || 'unknown',
    nav?.language || 'en',
    typeof screen !== 'undefined' ? `${screen.width}x${screen.height}x${screen.colorDepth}` : '0x0x0',
    Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    nav?.hardwareConcurrency?.toString() || '0',
  ];
  // Simple hash — production should use crypto.subtle.digest
  let hash = 0;
  const str = parts.join('|');
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return `cb-${Math.abs(hash).toString(36)}-${Date.now().toString(36)}`;
}

class SetupService {
  private config: SetupConfig;

  constructor() {
    this.config = this.loadConfig();
  }

  // ─── State Checks ────────────────────────────────────────────────

  /** Has the setup wizard been completed? */
  isSetupComplete(): boolean {
    return this.config.setupComplete && this.config.setupVersion === CURRENT_SETUP_VERSION;
  }

  /** Check server-side setup status and sync to localStorage */
  async checkServerSetup(): Promise<boolean> {
    try {
      const res = await fetch(`${window.location.origin}/api/setup/status`);
      if (res.ok) {
        const data = await res.json();
        if (data.setupComplete && !this.config.setupComplete) {
          // Server says setup is done — sync to this browser
          this.config.setupComplete = true;
          this.config.setupVersion = CURRENT_SETUP_VERSION;
          this.config.licenseTier = data.licenseTier || this.config.licenseTier;
          this.config.supabaseUrl = data.supabaseUrl || this.config.supabaseUrl;
          this.config.supabaseAnonKey = data.supabaseAnonKey || this.config.supabaseAnonKey;
          this.config.completedAt = data.completedAt || new Date().toISOString();
          this.saveConfig();
          return true;
        }
        return data.setupComplete;
      }
    } catch { /* server API not available — Electron/offline mode */ }
    return this.isSetupComplete();
  }

  /** Has the EULA been accepted? */
  isEulaAccepted(): boolean {
    return this.config.eulaAcceptedAt !== null;
  }

  /** Get current config */
  getConfig(): Readonly<SetupConfig> {
    return { ...this.config };
  }

  /** Get current tier */
  getTier(): SetupConfig['licenseTier'] {
    return this.config.licenseTier;
  }

  /** Get features for current tier */
  getFeatures(): SetupConfig['features'] {
    return { ...this.config.features };
  }

  /** Check if a specific feature is enabled */
  hasFeature(feature: keyof SetupConfig['features']): boolean {
    const val = this.config.features[feature];
    if (typeof val === 'boolean') return val;
    if (typeof val === 'number') return val !== 0;
    return false;
  }

  // ─── Setup Wizard Steps ─────────────────────────────────────────

  /** Step 1: Accept EULA */
  acceptEula(version: string): void {
    this.config.eulaAcceptedAt = new Date().toISOString();
    this.config.eulaVersion = version;
    this.saveConfig();
  }

  /** Step 2: Activate license key */
  async activateLicense(key: string): Promise<{ valid: boolean; tier: SetupConfig['licenseTier']; error?: string }> {
    // Community tier — no key needed
    if (!key || key.trim() === '' || key.toLowerCase() === 'community') {
      this.config.licenseKey = '';
      this.config.licenseTier = 'community';
      this.config.features = TIER_FEATURES.community;
      this.saveConfig();
      return { valid: true, tier: 'community' };
    }

    // TODO: Replace with Keygen.sh API call in production
    // For now, validate key format and accept
    const keyPattern = /^CB-(PRO|TEAM|ENT)-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
    if (!keyPattern.test(key.toUpperCase())) {
      return { valid: false, tier: 'community', error: 'Invalid license key format. Expected: CB-PRO-XXXX-XXXX-XXXX-XXXX' };
    }

    // Determine tier from key prefix
    const prefix = key.toUpperCase().split('-')[1];
    const tierMap: Record<string, SetupConfig['licenseTier']> = {
      'PRO': 'professional',
      'TEAM': 'team',
      'ENT': 'enterprise',
    };
    const tier = tierMap[prefix] || 'community';

    // TODO: Call license server to validate
    // const response = await fetch('https://api.keygen.sh/v1/accounts/{id}/licenses/actions/validate-key', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ meta: { key, scope: { fingerprint: this.config.machineId } } }),
    // });

    this.config.licenseKey = key.toUpperCase();
    this.config.licenseTier = tier;
    this.config.licenseValidUntil = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
    this.config.features = TIER_FEATURES[tier];
    this.saveConfig();
    return { valid: true, tier };
  }

  /** Step 3: Configure Supabase connection */
  async configureSupabase(url: string, anonKey: string): Promise<{ connected: boolean; error?: string }> {
    try {
      // Test the connection
      const response = await fetch(`${url}/rest/v1/`, {
        method: 'GET',
        headers: {
          'apikey': anonKey,
          'Authorization': `Bearer ${anonKey}`,
        },
      });

      if (!response.ok && response.status !== 404) {
        return { connected: false, error: `Supabase responded with status ${response.status}` };
      }

      // Extract project ref from URL
      const match = url.match(/https:\/\/([^.]+)\.supabase\.co/);
      const projectRef = match ? match[1] : '';

      this.config.supabaseUrl = url;
      this.config.supabaseAnonKey = anonKey;
      this.config.supabaseProjectRef = projectRef;
      this.saveConfig();
      return { connected: true };
    } catch (err) {
      return { connected: false, error: `Connection failed: ${err instanceof Error ? err.message : 'Unknown error'}` };
    }
  }

  /** Step 4: Configure VPS (optional) */
  async configureVps(host: string, ip: string, port: number = 18789): Promise<{ reachable: boolean; error?: string }> {
    if (!host && !ip) {
      this.config.vpsEnabled = false;
      this.saveConfig();
      return { reachable: true }; // Skipped — that's OK
    }

    try {
      const gwUrl = `https://${host || ip}:${port}`;
      const response = await fetch(`${gwUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(10000),
      }).catch(() => null);

      this.config.vpsEnabled = true;
      this.config.vpsHost = host;
      this.config.vpsIp = ip;
      this.config.vpsGatewayPort = port;
      this.saveConfig();

      if (!response || !response.ok) {
        return { reachable: false, error: 'VPS gateway not reachable — config saved, you can test later' };
      }

      return { reachable: true };
    } catch (err) {
      this.config.vpsEnabled = true;
      this.config.vpsHost = host;
      this.config.vpsIp = ip;
      this.config.vpsGatewayPort = port;
      this.saveConfig();
      return { reachable: false, error: `VPS saved but unreachable: ${err instanceof Error ? err.message : 'Timeout'}` };
    }
  }

  /** Step 5: Set workspace name */
  setWorkspace(name: string, adminEmail: string): void {
    this.config.workspaceName = name;
    this.config.adminEmail = adminEmail;
    this.saveConfig();
  }

  /** Step 6: Complete setup */
  completeSetup(): void {
    this.config.setupComplete = true;
    this.config.completedAt = new Date().toISOString();
    this.saveConfig();

    // Persist to server so other browsers skip the wizard
    fetch(`${window.location.origin}/api/setup/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        setupComplete: true,
        licenseTier: this.config.licenseTier,
        supabaseUrl: this.config.supabaseUrl,
        supabaseAnonKey: this.config.supabaseAnonKey,
        completedAt: this.config.completedAt,
      }),
    }).catch(() => { /* server API not available — Electron/offline mode */ });
  }

  /** Reset setup (for testing or reconfiguration) */
  resetSetup(): void {
    this.config = getDefaultConfig();
    this.saveConfig();
  }

  // ─── Persistence ─────────────────────────────────────────────────

  private loadConfig(): SetupConfig {
    try {
      const stored = localStorage.getItem(SETUP_STORAGE_KEY);
      if (!stored) return getDefaultConfig();
      const parsed = JSON.parse(stored) as SetupConfig;
      // Version check — if setup version changed, re-run setup
      if (parsed.setupVersion !== CURRENT_SETUP_VERSION) {
        return { ...getDefaultConfig(), licenseKey: parsed.licenseKey, licenseTier: parsed.licenseTier };
      }
      return parsed;
    } catch {
      return getDefaultConfig();
    }
  }

  private saveConfig(): void {
    try {
      localStorage.setItem(SETUP_STORAGE_KEY, JSON.stringify(this.config));
    } catch (err) {
      console.error('[SetupService] Failed to save config:', err);
    }
  }

  /** Export config for backup/migration */
  exportConfig(): string {
    return JSON.stringify(this.config, null, 2);
  }

  /** Import config from backup */
  importConfig(json: string): boolean {
    try {
      const imported = JSON.parse(json) as SetupConfig;
      if (imported.setupVersion && imported.machineId) {
        this.config = imported;
        this.saveConfig();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }
}

// Singleton
export const setupService = new SetupService();
export default setupService;
