/**
 * IP Address & Connection Status Service
 * Detects current IP, VPN status, and Tor connection
 */

// Debug logging — disabled in production to prevent leaking IP/VPN/ISP data to console
const IP_DEBUG = import.meta.env.DEV;
const debugLog = (...args: unknown[]) => { if (IP_DEBUG) console.debug('[IP]', ...args); };
const debugWarn = (...args: unknown[]) => { if (IP_DEBUG) console.warn('[IP]', ...args); };

export interface DNSInfo {
  servers: string[]; // DNS server IP addresses
  primaryDNS?: string; // Primary DNS server
  secondaryDNS?: string; // Secondary DNS server
  isDNSLeak?: boolean; // true if DNS requests leak outside VPN
  leakServers?: string[]; // DNS servers that leaked (ISP DNS when VPN is on)
  source?: 'Windows DNS Client' | 'PC Monitor MCP' | 'Linux' | 'unavailable';
}

export interface NetworkConnectionInfo {
  type?: 'wifi' | 'ethernet' | 'cellular' | 'unknown';
  effectiveType?: '4g' | '3g' | '2g' | 'slow-2g' | 'unknown';
  downlink?: number; // Mbps
  rtt?: number; // Round-trip time in ms
  saveData?: boolean;
  source?: 'PC Monitor MCP' | 'Network Information API' | 'unavailable' | 'error'; // Data source
  interfaceName?: string; // Interface name from MCP (e.g., "Wi-Fi", "Ethernet")
}

export interface IPStatusData {
  ip: string;
  country?: string;
  city?: string;
  region?: string;
  isp?: string;
  org?: string;
  timezone?: string;
  isVPN: boolean;
  isTor: boolean;
  isProxy: boolean;
  vpnProvider?: string;
  connectionType: 'direct' | 'vpn' | 'tor' | 'proxy' | 'unknown';
  networkConnection?: NetworkConnectionInfo;
  dnsInfo?: DNSInfo; // DNS servers and leak detection
  localIP?: string; // Local/WiFi IP (e.g. 192.168.x.x)
  lastChecked: Date;
  error?: string;
}

export interface TorCheckResult {
  isTor: boolean;
  isExitNode?: boolean;
}

class IPStatusService {
  private cachedStatus: IPStatusData | null = null;
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes
  private lastCheck: Date | null = null;

  /**
   * Fetch IP information from ipinfo.io (free, CORS-friendly)
   */
  private async fetchIPInfo(): Promise<Partial<IPStatusData>> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch('https://ipinfo.io/json', {
        method: 'GET',
        signal: controller.signal,
        headers: { 'Accept': 'application/json' },
      });

      clearTimeout(timeoutId);

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();

      return {
        ip: data.ip,
        country: data.country,
        city: data.city,
        region: data.region,
        isp: data.org,
        org: data.org,
        timezone: data.timezone,
        isVPN: data.org?.toLowerCase().includes('vpn') || data.org?.toLowerCase().includes('hosting') || false,
        isProxy: false,
        hostname: data.hostname,
      };
    } catch (error: unknown) {
      clearTimeout(timeoutId);
      console.error('IP info fetch failed:', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  /**
   * Fallback: Fetch IP from ipify.org (simple, reliable)
   */
  private async fetchIPFromIpify(): Promise<string> {
    try {
      debugLog('📡 Trying ipify.org...');
      const response = await fetch('https://api.ipify.org?format=json', {
        signal: AbortSignal.timeout(5000),
      });
      const data = await response.json();
      debugLog('✅ ipify.org response:', data);
      return data.ip;
    } catch (error: unknown) {
      console.error('❌ ipify.org fetch error:', error instanceof Error ? error.message : 'Unknown error');
      // Last resort: try api64.ipify.org (IPv4 only)
      try {
        debugLog('📡 Trying api64.ipify.org...');
        const response = await fetch('https://api64.ipify.org?format=json', {
          signal: AbortSignal.timeout(5000),
        });
        const data = await response.json();
        debugLog('✅ api64.ipify.org response:', data);
        return data.ip;
      } catch (lastError: unknown) {
        console.error('❌ api64.ipify.org error:', lastError instanceof Error ? lastError.message : 'Unknown error');
        throw error;
      }
    }
  }

  /**
   * Try a single service with retry logic
   */
  private async tryServiceWithRetry(
    service: { name: string; url: string; isJSON?: boolean; isText?: boolean; extract: (data: any) => string },
    maxRetries = 2
  ): Promise<string | null> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        debugLog(`📡 [${attempt}/${maxRetries}] Trying ${service.name}...`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        try {
          const response = await fetch(service.url, {
            method: 'GET',
            signal: controller.signal,
            // Simplified fetch options for better compatibility
            headers: {
              'Accept': service.isJSON ? 'application/json' : 'text/plain',
            },
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            debugWarn(`⚠️ ${service.name} returned HTTP ${response.status}`);
            if (attempt < maxRetries) {
              await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
              continue;
            }
            return null;
          }

          let data: any;
          let ip: string;

          if (service.isJSON) {
            const text = await response.text();
            try {
              data = JSON.parse(text);
              ip = service.extract(data);
            } catch (parseError) {
              console.error(`❌ ${service.name} JSON parse error:`, parseError);
              return null;
            }
          } else {
            data = await response.text();
            ip = service.extract(data);
          }

          // Validate IP
          if (ip && this.isValidIP(ip)) {
            debugLog(`✅ ${service.name} returned valid IP: ${ip}`);
            return ip;
          } else {
            debugWarn(`⚠️ ${service.name} returned invalid IP: ${ip}`);
            return null;
          }
        } catch (fetchError: unknown) {
          clearTimeout(timeoutId);

          const errorMsg = fetchError instanceof Error ? fetchError.message : 'Unknown error';
          debugWarn(`⚠️ ${service.name} fetch error (attempt ${attempt}): ${errorMsg}`);

          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            continue;
          }
          return null;
        }
      } catch (error: unknown) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error(`❌ ${service.name} error (attempt ${attempt}): ${errorMsg}`);
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          continue;
        }
        return null;
      }
    }

    return null;
  }

  /**
   * Try multiple IP services in sequence until one works
   * Enhanced with retry logic and better error boundaries
   */
  private async fetchIPWithFallbacks(): Promise<string> {
    debugLog('🔄 === STARTING IP FETCH WITH FALLBACKS ===');

    const services = [
      // High reliability JSON services
      {
        name: 'api.ipify.org',
        url: 'https://api.ipify.org?format=json',
        extract: (data: { ip: string }) => data.ip,
        isJSON: true,
      },
      {
        name: 'api64.ipify.org',
        url: 'https://api64.ipify.org?format=json',
        extract: (data: { ip: string }) => data.ip,
        isJSON: true,
      },
      // Alternative JSON services
      {
        name: 'ipinfo.io',
        url: 'https://ipinfo.io/json',
        extract: (data: { ip: string }) => data.ip,
        isJSON: true,
      },
      {
        name: 'api.my-ip.io',
        url: 'https://api.my-ip.io/v2/ip.json',
        extract: (data: { ip: string }) => data.ip,
        isJSON: true,
      },
      // Text-based fallbacks (simpler, less likely to fail)
      {
        name: 'icanhazip.com',
        url: 'https://icanhazip.com',
        extract: (data: string) => data.trim(),
        isText: true,
      },
      {
        name: 'ipecho.net',
        url: 'https://ipecho.net/plain',
        extract: (data: string) => data.trim(),
        isText: true,
      },
      {
        name: 'ifconfig.me',
        url: 'https://ifconfig.me/ip',
        extract: (data: string) => data.trim(),
        isText: true,
      },
      {
        name: 'ident.me',
        url: 'https://ident.me',
        extract: (data: string) => data.trim(),
        isText: true,
      },
      {
        name: 'wtfismyip.com',
        url: 'https://wtfismyip.com/text',
        extract: (data: string) => data.trim(),
        isText: true,
      },
    ];

    const errors: Array<{ service: string; error: string }> = [];

    // Try each service with retry logic
    for (const service of services) {
      try {
        const ip = await this.tryServiceWithRetry(service, 2);

        if (ip) {
          debugLog(`✅ === IP FETCH SUCCESSFUL: ${ip} from ${service.name} ===`);
          return ip;
        } else {
          errors.push({ service: service.name, error: 'Failed after retries' });
        }
      } catch (error: unknown) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error(`❌ ${service.name} completely failed: ${errorMsg}`);
        errors.push({ service: service.name, error: errorMsg });
      }
    }

    // All services failed - log comprehensive error
    console.error('❌ === ALL IP SERVICES FAILED ===');
    console.error('Failed services:', errors);
    console.error('Total services tried:', services.length);
    console.error('Network may be offline or all IP services are blocked');

    // Provide detailed error message
    const errorSummary = errors.map(e => `${e.service}: ${e.error}`).join('\n');
    throw new Error(
      `Failed to fetch IP address after trying ${services.length} services with retries.\n\n` +
      `This could mean:\n` +
      `1. Network connection is offline\n` +
      `2. Firewall is blocking IP lookup services\n` +
      `3. All IP services are temporarily unavailable\n\n` +
      `Errors:\n${errorSummary}`
    );
  }

  /**
   * Validate IP address format (IPv4 or IPv6)
   */
  private isValidIP(ip: string): boolean {
    if (!ip || ip.length === 0) return false;

    // IPv4 regex
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

    // IPv6 regex (simplified)
    const ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;

    return ipv4Regex.test(ip) || ipv6Regex.test(ip);
  }

  /**
   * Check if IP is a Tor exit node
   * Uses Tor Project's bulk exit list or check service
   */
  private async checkTorStatus(ip: string): Promise<TorCheckResult> {
    try {
      debugLog('🧅 Checking Tor status for IP:', ip);

      // PRIMARY: Use Electron proxy to avoid CORS
      if (typeof window !== 'undefined' && window.electronAPI) {
        debugLog('🔌 Using Electron proxy for Tor check...');

        const result = await window.electronAPI.checkTor();

        if (result.success && result.data) {
          debugLog('✅ Tor check response:', result.data);
          return {
            isTor: result.data.IsTor === true,
            isExitNode: result.data.IsTor === true,
          };
        } else {
          debugWarn('⚠️ Tor check via Electron failed:', result.error);
        }
      }

      // No Electron proxy available — skip direct fetch (CORS-blocked in browser)
      // Fall back to indicator-based detection
      return this.checkTorIndicators(ip);
    } catch (error: any) {
      // Tor check failed — use indicator-based detection
      return this.checkTorIndicators(ip);
    }
  }

  /**
   * Fallback Tor detection using common indicators
   */
  private async checkTorIndicators(ip: string): Promise<TorCheckResult> {
    try {
      // Check if we can reach Tor check endpoint
      const response = await fetch('https://check.torproject.org/', {
        method: 'HEAD',
        mode: 'no-cors',
      });

      // If we can reach Tor check, we might be on Tor
      // This is a weak indicator, but better than nothing
      return { isTor: false }; // Conservative default
    } catch (error) {
      return { isTor: false };
    }
  }

  /**
   * Enhanced VPN detection with ASN-based detection
   */
  private detectVPN(ipInfo: Partial<IPStatusData>): { isVPN: boolean; provider?: string } {
    const indicators: string[] = [];
    let vpnProvider: string | undefined;

    const org = (ipInfo.org || ipInfo.isp || '').toLowerCase();
    // @ts-ignore - hostname might exist from some IP APIs
    const hostname = ((ipInfo as any).hostname || '').toLowerCase();

    debugLog('🔍 ===== VPN DETECTION DEBUG =====');
    debugLog('🔍 Checking VPN for org/ISP:', org);
    debugLog('🔍 Hostname (if available):', hostname || 'none');
    debugLog('🔍 Full ipInfo received:', JSON.stringify(ipInfo, null, 2));

    // Known VPN ASN patterns (Autonomous System Numbers)
    const vpnASNPatterns = [
      // NordVPN
      /AS202795|AS61493|AS43350|tesonet|packethub/i,
      // ExpressVPN
      /AS396303|AS393406|express/i,
      // ProtonVPN (expanded - uses many ASNs across regions)
      /AS51167|AS202425|AS213253|AS62371|AS59414|AS206236|proton/i,
      // Surfshark
      /AS202425|surfshark/i,
      // Mullvad
      /AS199524|AS207021|mullvad|aeza/i,
      // PIA
      /AS46562|AS53340|private internet|london trust media/i,
      // CyberGhost
      /AS9009|AS8796|cyberghost|kape/i,
      // IPVanish
      /AS35476|AS35913|AS12386|ipvanish|datacamp|highwinds|stackpath/i,
      // VyprVPN
      /AS27715|AS27716|vyprvpn|golden frog/i,
      // Windscribe
      /AS54290|AS26496|windscribe|serverel/i,
      // TunnelBear (owned by McAfee)
      /AS13335|tunnelbear/i,
      // Generic VPN/hosting indicators
      /AS396982|AS136787|AS397702|AS63949|AS400304/i,
      // Common VPN hosting providers
      /choopa|vultr|ovh sas|digitalocean|hetzner|leaseweb|quadranet|m247/i,
    ];

    // Check ASN patterns first
    for (const asnPattern of vpnASNPatterns) {
      if (asnPattern.test(org)) {
        indicators.push('ASN match');
        debugLog(`✅ VPN detected by ASN pattern: ${asnPattern}`);

        // Try to identify provider from ASN
        if (/nord|tesonet|packethub/i.test(org)) vpnProvider = 'NordVPN';
        else if (/express/i.test(org)) vpnProvider = 'ExpressVPN';
        else if (/proton/i.test(org)) vpnProvider = 'ProtonVPN';
        else if (/surfshark/i.test(org)) vpnProvider = 'Surfshark';
        else if (/mullvad|aeza/i.test(org)) vpnProvider = 'Mullvad VPN';
        else if (/private internet|pia|london trust/i.test(org)) vpnProvider = 'Private Internet Access';
        else if (/cyberghost|kape/i.test(org)) vpnProvider = 'CyberGhost';
        else if (/ipvanish|datacamp|highwinds|stackpath/i.test(org)) vpnProvider = 'IPVanish';
        else if (/vypr|golden frog/i.test(org)) vpnProvider = 'VyprVPN';
        else if (/windscribe|serverel/i.test(org)) vpnProvider = 'Windscribe';

        break;
      }
    }

    // VPN-specific keywords (more comprehensive)
    const vpnKeywords = [
      'vpn', 'virtual private network', 'virtual private', 'proxy', 'tunnel',
      'anonymizer', 'privacy', 'secure connection', 'encrypted',
      // Data center indicators (strong VPN signal)
      'datacenter', 'data center', 'hosting', 'colocation', 'colo',
      'cloud', 'server hosting', 'virtual server', 'vps', 'dedicated server',
    ];

    // Extensive VPN provider list with ASN info
    const vpnProviders = [
      { keywords: ['nordvpn', 'nord vpn', 'tesonet', 'packethub', 'packet hub', 'as202795', 'as61493', 'as43350'], name: 'NordVPN' },
      { keywords: ['expressvpn', 'express vpn', 'as396303'], name: 'ExpressVPN' },
      { keywords: ['protonvpn', 'proton vpn', 'proton ag', 'proton technologies', 'as51167', 'as202425', 'as213253', 'as62371', 'as59414', 'as206236'], name: 'ProtonVPN' },
      { keywords: ['mullvad', 'aeza', 'as199524'], name: 'Mullvad VPN' },
      { keywords: ['surfshark', 'as202425'], name: 'Surfshark' },
      { keywords: ['cyberghost', 'kape technologies', 'as9009'], name: 'CyberGhost' },
      { keywords: ['private internet access', 'pia vpn', 'london trust media', 'as46562'], name: 'Private Internet Access' },
      { keywords: ['ipvanish', 'stackpath', 'highwinds', 'datacamp', 'as35476'], name: 'IPVanish' },
      { keywords: ['vyprvpn', 'golden frog', 'as27715'], name: 'VyprVPN' },
      { keywords: ['windscribe', 'serverel', 'as54290'], name: 'Windscribe' },
      { keywords: ['tunnelbear'], name: 'TunnelBear' },
      { keywords: ['purevpn', 'gaditek'], name: 'PureVPN' },
      { keywords: ['hotspot shield', 'anchorfree', 'pango'], name: 'Hotspot Shield' },
      { keywords: ['hide.me', 'hideme', 'evenprivacy'], name: 'Hide.me' },
      { keywords: ['torguard'], name: 'TorGuard' },
      { keywords: ['perfect privacy'], name: 'Perfect Privacy' },
      { keywords: ['airvpn', 'air vpn'], name: 'AirVPN' },
      { keywords: ['ivpn'], name: 'IVPN' },
      { keywords: ['fastly'], name: 'Fastly VPN' },
      { keywords: ['ovpn'], name: 'OVPN' },
      { keywords: ['boleh vpn', 'bolehvpn'], name: 'BolehVPN' },
      { keywords: ['anonine'], name: 'AnonineVPN' },
      { keywords: ['zenmate'], name: 'ZenMate' },
      { keywords: ['betternet'], name: 'Betternet' },
      // Common hosting providers often used by VPNs
      { keywords: ['digitalocean', 'do llc'], name: 'DigitalOcean VPN' },
      { keywords: ['vultr'], name: 'Vultr VPN' },
      { keywords: ['linode', 'akamai'], name: 'Linode VPN' },
      { keywords: ['ovh sas', 'ovh hosting'], name: 'OVH VPN' },
      { keywords: ['hetzner'], name: 'Hetzner VPN' },
      { keywords: ['m247'], name: 'M247 VPN' },
      { keywords: ['choopa'], name: 'Choopa VPN' },
      { keywords: ['quadranet'], name: 'QuadraNet VPN' },
      { keywords: ['leaseweb'], name: 'LeaseWeb VPN' },
    ];

    // Check for VPN provider names
    for (const provider of vpnProviders) {
      for (const keyword of provider.keywords) {
        if (org.includes(keyword.toLowerCase())) {
          vpnProvider = provider.name;
          indicators.push(keyword);
          debugLog(`✅ VPN Provider detected: ${vpnProvider} (matched: ${keyword})`);
          break;
        }
      }
      if (vpnProvider) break;
    }

    // Check for general VPN keywords (secondary check)
    if (!vpnProvider) {
      for (const keyword of vpnKeywords) {
        if (org.includes(keyword.toLowerCase())) {
          indicators.push(keyword);
        }
      }
    }

    // Check hostname for VPN indicators (if available)
    if (hostname) {
      debugLog('🔍 Checking hostname for VPN patterns:', hostname);

      // Check for ProtonVPN hostname patterns
      if (hostname.includes('protonvpn') || hostname.includes('proton-vpn') || hostname.includes('protonmail')) {
        vpnProvider = 'ProtonVPN';
        indicators.push('hostname:proton');
        debugLog('✅ ProtonVPN detected from hostname');
      }

      // Check for other VPN providers in hostname
      for (const provider of vpnProviders) {
        for (const keyword of provider.keywords) {
          if (hostname.includes(keyword)) {
            vpnProvider = provider.name;
            indicators.push(`hostname:${keyword}`);
            debugLog(`✅ ${provider.name} detected from hostname`);
            break;
          }
        }
        if (vpnProvider) break;
      }

      // Check for datacenter/cloud patterns in hostname (common for VPNs)
      const datacenterPatterns = ['cloud', 'server', 'host', 'vps', 'datacenter', 'dc-'];
      for (const pattern of datacenterPatterns) {
        if (hostname.includes(pattern)) {
          indicators.push(`hostname:${pattern}`);
        }
      }
    }

    // If already marked as VPN by API
    if (ipInfo.isVPN) {
      debugLog('✅ VPN detected by API flag');
      return { isVPN: true, provider: vpnProvider || 'Unknown VPN' };
    }

    // If we found VPN indicators
    if (indicators.length > 0) {
      debugLog(`✅ VPN detected by indicators: ${indicators.join(', ')}`);
      return { isVPN: true, provider: vpnProvider || 'VPN Service' };
    }

    debugLog('❌ No VPN detected');
    return { isVPN: false };
  }

  /**
   * Get network connection information (WiFi, Ethernet, etc.)
   * Uses Linux commands via Electron IPC, falls back to Network Information API
   */
  private async getNetworkConnectionInfo(): Promise<NetworkConnectionInfo> {
    // ========================================
    // PRIMARY: Use Linux commands via Electron IPC
    // ========================================
    if (typeof window !== 'undefined' && window.electronAPI?.executeCommand) {
      try {
        debugLog('🐧 PRIMARY: Detecting network via Linux commands...');

        // Get default route interface
        const routeOutput = await window.electronAPI.executeCommand(
          "ip route show default 2>/dev/null | head -1 | awk '{print $5}'"
        );
        const defaultIface = routeOutput.trim();

        if (defaultIface) {
          debugLog(`🔍 Default route interface: ${defaultIface}`);
          const name = defaultIface.toLowerCase();

          let type: NetworkConnectionInfo['type'] = 'unknown';

          // Linux interface naming conventions
          if (name.startsWith('eth') || name.startsWith('en') || name.startsWith('eno') || name.startsWith('enp') || name.startsWith('ens')) {
            type = 'ethernet';
          } else if (name.startsWith('wl') || name.startsWith('wlan') || name.startsWith('wifi')) {
            type = 'wifi';
          } else if (name.startsWith('wwan') || name.startsWith('rmnet') || name.startsWith('usb')) {
            type = 'cellular';
          } else if (name.startsWith('tun') || name.startsWith('wg') || name.startsWith('nordlynx') || name.startsWith('proton') || name.startsWith('mullvad')) {
            // VPN tunnel interface — look for underlying physical interface
            type = 'ethernet'; // Assume ethernet underneath VPN
          }

          // Try to get link speed
          let downlink: number | undefined;
          try {
            const speedOutput = await window.electronAPI.executeCommand(
              `cat /sys/class/net/${defaultIface}/speed 2>/dev/null || echo "0"`
            );
            const speed = parseInt(speedOutput.trim(), 10);
            if (speed > 0) downlink = speed;
          } catch { /* ignore */ }

          debugLog(`✅ Linux network: ${type} (${defaultIface}), speed: ${downlink || 'unknown'} Mbps`);

          return {
            type,
            effectiveType: type === 'ethernet' ? '4g' : type === 'wifi' ? '4g' : 'unknown',
            downlink,
            source: 'Network Information API',
            interfaceName: defaultIface,
          };
        }
      } catch (err) {
        console.error('❌ Linux network detection failed:', err);
      }
    }

    // ========================================
    // FALLBACK: Network Information API (Chromium)
    // ========================================
    debugLog('🔄 FALLBACK: Using Network Information API...');

    const nav: any = navigator;
    const connection = nav.connection || nav.mozConnection || nav.webkitConnection;

    if (!connection) {
      debugLog('❌ Network Information API not available');
      return {
        type: 'unknown',
        source: 'unavailable',
      };
    }

    try {
      const info: NetworkConnectionInfo = {
        effectiveType: connection.effectiveType || 'unknown',
        downlink: connection.downlink,
        rtt: connection.rtt,
        saveData: connection.saveData,
      };

      if (connection.type) {
        info.type = connection.type;
      } else if (connection.downlink && connection.downlink > 100) {
        info.type = 'ethernet';
      } else if (connection.downlink && connection.downlink > 10) {
        info.type = 'wifi';
      } else {
        info.type = 'unknown';
      }

      debugLog(`✅ Network from API: ${info.type}, Speed: ${connection.effectiveType}, Downlink: ${info.downlink} Mbps`);

      return {
        ...info,
        source: 'Network Information API',
      };
    } catch (error) {
      console.error('❌ Failed to get network info from API:', error);
      return {
        type: 'unknown',
        source: 'error',
      };
    }
  }

  /**
   * Get DNS server information
   * Uses Linux commands (resolvectl / resolv.conf) via Electron IPC
   */
  private async getDNSInfo(isVPN: boolean, isp?: string): Promise<DNSInfo> {
    if (typeof window !== 'undefined' && window.electronAPI?.executeCommand) {
      try {
        debugLog('🐧 Fetching DNS info via Linux commands...');

        // Try resolvectl first (systemd-resolved)
        let servers: string[] = [];

        try {
          const resolvectlOutput = await window.electronAPI.executeCommand(
            "resolvectl dns 2>/dev/null | grep -oP '\\d+\\.\\d+\\.\\d+\\.\\d+' || true"
          );
          const resolvectlServers = resolvectlOutput.trim().split('\n').filter((s: string) => s && this.isValidIP(s));
          if (resolvectlServers.length > 0) {
            servers = [...new Set(resolvectlServers)]; // dedupe
            debugLog(`✅ resolvectl: Found ${servers.length} DNS servers`);
          }
        } catch { /* resolvectl not available */ }

        // Fallback to /etc/resolv.conf
        if (servers.length === 0) {
          try {
            const resolvConfOutput = await window.electronAPI.executeCommand(
              "grep -oP 'nameserver\\s+\\K\\S+' /etc/resolv.conf 2>/dev/null || true"
            );
            const resolvServers = resolvConfOutput.trim().split('\n').filter((s: string) => s && this.isValidIP(s));
            if (resolvServers.length > 0) {
              servers = [...new Set(resolvServers)];
              debugLog(`✅ resolv.conf: Found ${servers.length} DNS servers`);
            }
          } catch { /* resolv.conf not readable */ }
        }

        if (servers.length > 0) {
          const leakInfo = this.detectDNSLeak(servers, isVPN, isp);

          return {
            servers,
            primaryDNS: servers[0],
            secondaryDNS: servers[1],
            isDNSLeak: leakInfo.isLeak,
            leakServers: leakInfo.leakServers,
            source: 'Windows DNS Client', // Keep type compatibility
          };
        }

        debugWarn('⚠️  No DNS servers found via Linux commands');
      } catch (err) {
        console.error('❌ Linux DNS detection failed:', err);
      }
    }

    // ========================================
    // FINAL FALLBACK: Unavailable
    // ========================================
    debugWarn('❌ All DNS detection methods failed');
    return {
      servers: [],
      source: 'unavailable',
    };
  }

  /**
   * Detect DNS leaks (DNS requests going to ISP servers while VPN is active)
   */
  private detectDNSLeak(
    dnsServers: string[],
    isVPN: boolean,
    isp?: string
  ): { isLeak: boolean; leakServers?: string[] } {
    // No leak detection if VPN is not active
    if (!isVPN) {
      return { isLeak: false };
    }

    debugLog('🔍 Checking for DNS leaks...');
    debugLog(`🔍 VPN Active: ${isVPN}, ISP: ${isp || 'unknown'}`);
    debugLog(`🔍 DNS Servers: ${dnsServers.join(', ')}`);

    // Common ISP DNS patterns
    const ispDNSPatterns = [
      // Common ISP DNS servers
      /^8\.8\.8\.8$/, // Google DNS (often default, not a leak)
      /^8\.8\.4\.4$/, // Google DNS (often default, not a leak)
      /^1\.1\.1\.1$/, // Cloudflare DNS (often default, not a leak)
      /^1\.0\.0\.1$/, // Cloudflare DNS (often default, not a leak)
      // ISP-specific patterns (add more as needed)
      /^75\.75\./, // Comcast
      /^68\.94\./, // Comcast
      /^205\.171\./, // AT&T
      /^12\.127\./, // AT&T
      /^192\.168\.1\.1$/, // Router default (likely ISP)
      /^192\.168\.0\.1$/, // Router default (likely ISP)
      /^10\.0\.0\.1$/, // Router default (likely ISP)
    ];

    // Common VPN DNS servers (these are GOOD when VPN is on)
    const vpnDNSPatterns = [
      /^10\./, // Private range often used by VPNs
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // Private range often used by VPNs
      /^169\./, // Some VPN providers
      /^198\./, // Some VPN providers
      /^162\./, // Some VPN providers
    ];

    const leakServers: string[] = [];

    for (const dnsServer of dnsServers) {
      // Skip public DNS (Google, Cloudflare) - these are neutral
      if (dnsServer === '8.8.8.8' || dnsServer === '8.8.4.4' ||
          dnsServer === '1.1.1.1' || dnsServer === '1.0.0.1') {
        debugLog(`ℹ️  ${dnsServer} - Public DNS (neutral)`);
        continue;
      }

      // Check if it matches VPN DNS pattern (GOOD)
      const isVPNDNS = vpnDNSPatterns.some(pattern => pattern.test(dnsServer));
      if (isVPNDNS) {
        debugLog(`✅ ${dnsServer} - VPN DNS (secure)`);
        continue;
      }

      // Check if it matches ISP DNS pattern (LEAK)
      const isISPDNS = ispDNSPatterns.some(pattern => pattern.test(dnsServer));
      if (isISPDNS) {
        debugWarn(`🚨 ${dnsServer} - ISP DNS detected (LEAK!)`);
        leakServers.push(dnsServer);
        continue;
      }

      // If ISP name is available, check if DNS owner matches ISP
      if (isp) {
        // This would require reverse DNS lookup or ASN lookup
        // For now, we'll mark unknown DNS as potential leak
        debugWarn(`⚠️  ${dnsServer} - Unknown DNS (possible leak)`);
      }
    }

    if (leakServers.length > 0) {
      console.error(`🚨 DNS LEAK DETECTED: ${leakServers.length} server(s) leaking to ISP!`);
      return { isLeak: true, leakServers };
    }

    debugLog('✅ No DNS leaks detected');
    return { isLeak: false };
  }

  /**
   * Determine connection type
   */
  private determineConnectionType(
    isVPN: boolean,
    isTor: boolean,
    isProxy: boolean
  ): IPStatusData['connectionType'] {
    if (isTor) return 'tor';
    if (isVPN) return 'vpn';
    if (isProxy) return 'proxy';
    return 'direct';
  }

  /**
   * Get current IP status with VPN and Tor detection
   * Enhanced with comprehensive error boundaries
   */
  private _fetching = false;

  async getIPStatus(forceRefresh = false): Promise<IPStatusData> {
    // Recursion guard — prevent stack overflow
    if (this._fetching) {
      return this.cachedStatus ?? {
        ip: 'Unavailable',
        isVPN: false,
        isTor: false,
        isProxy: false,
        connectionType: 'unknown' as const,
        lastChecked: new Date(),
        error: 'Recursive call blocked',
      };
    }

    // Error boundary wrapper
    try {
      this._fetching = true;

      // Return cached data if available and fresh
      if (
        !forceRefresh &&
        this.cachedStatus &&
        this.lastCheck &&
        Date.now() - this.lastCheck.getTime() < this.cacheTimeout
      ) {
        debugLog('📡 Returning cached IP status');
        return this.cachedStatus;
      }

      debugLog('🔄 === STARTING FULL IP STATUS FETCH ===');

      let ipInfo: Partial<IPStatusData>;

      // Phase 1: Try to get full IP info with location data
      try {
        debugLog('📡 Phase 1: Attempting detailed IP info fetch...');
        ipInfo = await this.fetchIPInfo();

        if (!ipInfo.ip) {
          debugWarn('⚠️ No IP in detailed fetch, moving to Phase 2...');
          throw new Error('No IP returned from detailed fetch');
        }

        debugLog('✅ Phase 1 successful: Got detailed IP info');
      } catch (phase1Error: any) {
        debugWarn('⚠️ Phase 1 failed:', phase1Error.message);

        // Phase 2: Fallback to simple IP fetch
        try {
          debugLog('📡 Phase 2: Attempting simple IP fetch...');
          const simpleIP = await this.fetchIPWithFallbacks();
          ipInfo = { ip: simpleIP };
          debugLog('✅ Phase 2 successful: Got simple IP');
        } catch (phase2Error: any) {
          console.error('❌ Phase 2 failed:', phase2Error.message);

          // Phase 3: Final emergency fallback
          debugLog('📡 Phase 3: Emergency fallback...');
          return await this.createEmergencyFallbackStatus(phase2Error.message);
        }
      }

      // Phase 4: Enrich with Tor/VPN detection (best effort)
      try {
        debugLog('📡 Phase 4: Enriching with Tor/VPN detection...');

        let torStatus: TorCheckResult;
        let vpnStatus: { isVPN: boolean; provider?: string };

        try {
          torStatus = await this.checkTorStatus(ipInfo.ip!);
        } catch (torError) {
          debugWarn('⚠️ Tor check failed, assuming not Tor');
          torStatus = { isTor: false };
        }

        try {
          vpnStatus = this.detectVPN(ipInfo);
        } catch (vpnError) {
          debugWarn('⚠️ VPN detection failed, assuming direct connection');
          vpnStatus = { isVPN: false };
        }

        const connectionType = this.determineConnectionType(
          vpnStatus.isVPN,
          torStatus.isTor,
          ipInfo.isProxy || false
        );

        let networkConnection: NetworkConnectionInfo;
        try {
          networkConnection = await this.getNetworkConnectionInfo();
        } catch (netError) {
          debugWarn('⚠️ Network info failed');
          networkConnection = { type: 'unknown' };
        }

        let dnsInfo: DNSInfo;
        try {
          dnsInfo = await this.getDNSInfo(vpnStatus.isVPN, ipInfo.isp);
        } catch (dnsError) {
          debugWarn('⚠️ DNS info failed');
          dnsInfo = { servers: [], source: 'unavailable' };
        }

        // Get local/WiFi IP
        let localIP: string | undefined;
        try {
          if (window.electronAPI?.executeCommand) {
            const out = await window.electronAPI.executeCommand(
              "ip -4 route get 1.1.1.1 2>/dev/null | grep -oP 'src \\K[0-9.]+' || hostname -I 2>/dev/null | awk '{print $1}'"
            );
            const ip = out?.trim().split('\n')[0]?.trim();
            if (ip && /^\d+\.\d+\.\d+\.\d+$/.test(ip) && !ip.startsWith('127.')) {
              localIP = ip;
            }
          }
        } catch {}

        const status: IPStatusData = {
          ip: ipInfo.ip!,
          country: ipInfo.country,
          city: ipInfo.city,
          region: ipInfo.region,
          isp: ipInfo.isp,
          org: ipInfo.org,
          timezone: ipInfo.timezone,
          isVPN: vpnStatus.isVPN,
          isTor: torStatus.isTor,
          isProxy: ipInfo.isProxy || false,
          vpnProvider: vpnStatus.provider,
          connectionType,
          networkConnection,
          dnsInfo,
          localIP,
          lastChecked: new Date(),
        };

        // Cache the result
        this.cachedStatus = status;
        this.lastCheck = new Date();

        debugLog(`✅ === IP STATUS COMPLETE: ${status.ip} (${status.connectionType}) ===`);
        if (status.isVPN) debugLog(`🔒 VPN: ${status.vpnProvider || 'Unknown Provider'}`);
        if (status.isTor) debugLog('🧅 Tor Connection Detected');
        if (status.dnsInfo && status.dnsInfo.servers.length > 0) {
          debugLog(`🌐 DNS: ${status.dnsInfo.servers.join(', ')} (${status.dnsInfo.source})`);
          if (status.dnsInfo.isDNSLeak) {
            console.error(`🚨 DNS LEAK: ${status.dnsInfo.leakServers?.join(', ')}`);
          }
        }

        return status;
      } catch (enrichmentError: any) {
        debugWarn('⚠️ Enrichment failed, returning basic status:', enrichmentError.message);

        // Return basic status without enrichment
        const basicStatus: IPStatusData = {
          ip: ipInfo.ip!,
          country: ipInfo.country,
          city: ipInfo.city,
          region: ipInfo.region,
          isp: ipInfo.isp,
          org: ipInfo.org,
          timezone: ipInfo.timezone,
          isVPN: false,
          isTor: false,
          isProxy: false,
          connectionType: 'unknown',
          lastChecked: new Date(),
          error: `Partial data: ${enrichmentError.message}`,
        };

        this.cachedStatus = basicStatus;
        this.lastCheck = new Date();

        return basicStatus;
      }
    } catch (outerError: any) {
      // Final fallback — suppress noisy logs, just debug
      console.debug('[IP] Fetch failed:', outerError?.message || 'unknown');

      // Don't call createEmergencyFallbackStatus if it was a stack overflow
      // — any further calls might re-trigger it
      const isStackOverflow = outerError?.message?.includes('call stack');
      if (isStackOverflow) {
        const safe: IPStatusData = {
          ip: 'Unavailable',
          isVPN: false,
          isTor: false,
          isProxy: false,
          connectionType: 'unknown',
          lastChecked: new Date(),
          error: 'Network unavailable',
        };
        this.cachedStatus = safe;
        this.lastCheck = new Date();
        return safe;
      }

      const fallback = await this.createEmergencyFallbackStatus(
        outerError.message || 'Complete IP fetch failure'
      );
      return fallback;
    } finally {
      this._fetching = false;
    }
  }

  /**
   * Get local network info from PC Monitor MCP (fallback when public IP fetch fails)
   */
  private async getLocalNetworkInfo(): Promise<string | null> {
    try {
      // Only available in Electron with PC Monitor MCP
      if (typeof window === 'undefined' || !window.electronAPI) {
        debugLog('ℹ️  Electron API not available for local IP fetch');
        return null;
      }

      debugLog('🖥️  Fetching local IP from PC Monitor MCP...');

      const networkInfo = await window.electronAPI.mcpCall('get_network_info', {});

      if (networkInfo.success && networkInfo.data) {
        let data = networkInfo.data;

        // Parse MCP response format: { content: [{ type: 'text', text: '{"interfaces": [...]}' }] }
        if (data.content && Array.isArray(data.content) && data.content[0]) {
          const textContent = data.content[0].text;
          if (textContent) {
            try {
              data = JSON.parse(textContent);
              debugLog('✅ PC Monitor MCP response parsed for local IP');
            } catch (parseError) {
              console.error('❌ Failed to parse PC Monitor MCP response:', parseError);
              return null;
            }
          }
        }

        const interfaces = data.interfaces || [];
        debugLog(`🔍 Analyzing ${interfaces.length} interfaces for local IP`);

        // Prioritize Ethernet > WiFi > Cellular for local IP
        const priorityOrder = ['ethernet', 'wifi', 'cellular', 'other'];

        for (const priority of priorityOrder) {
          for (const iface of interfaces) {
            const isUp = iface.flags && iface.flags.includes('up');
            const isLoopback = iface.flags && iface.flags.includes('loopback');

            if (!isUp || isLoopback || !iface.addrs) continue;

            const name = (iface.name || '').toLowerCase();
            let matchesPriority = false;

            // Match priority
            if (priority === 'ethernet' && (name.includes('ethernet') || name.includes('eth') || name.includes('local area'))) {
              matchesPriority = true;
            } else if (priority === 'wifi' && (name.includes('wi-fi') || name.includes('wifi') || name.includes('wlan'))) {
              matchesPriority = true;
            } else if (priority === 'cellular' && (name.includes('cellular') || name.includes('wwan') || name.includes('mobile'))) {
              matchesPriority = true;
            } else if (priority === 'other') {
              matchesPriority = true; // Accept any interface as last resort
            }

            if (!matchesPriority) continue;

            // Find IPv4 address
            for (const addrObj of iface.addrs) {
              const addr = addrObj.addr;

              // Skip IPv6, loopback, and APIPA addresses
              if (!addr || addr.includes(':') || addr.startsWith('127.') || addr.startsWith('169.254.')) {
                continue;
              }

              // Extract IP without CIDR notation (e.g., "192.168.1.100/24" → "192.168.1.100")
              const ip = addr.split('/')[0];

              // Validate IP format
              if (this.isValidIP(ip)) {
                debugLog(`✅ PC Monitor MCP: Local IP ${ip} (${iface.name}, Priority: ${priority})`);
                return ip;
              }
            }
          }
        }

        debugWarn('⚠️  PC Monitor MCP found no suitable local IP in any interface');
      } else {
        debugWarn('⚠️  PC Monitor MCP returned no network data');
      }

      return null;
    } catch (error) {
      console.debug('[IP] Local network info unavailable');
      return null;
    }
  }

  /**
   * Create emergency fallback status when everything fails
   * Try to get local IP from MCP as last resort
   */
  private async createEmergencyFallbackStatus(errorMessage: string): Promise<IPStatusData> {
    console.debug('[IP] Emergency fallback — network unavailable');

    // Skip MCP call here — it can cause stack overflow when electronAPI is broken
    let localIP: string | null = null;
    try {
      if (typeof window !== 'undefined' && window.electronAPI?.executeCommand) {
        const out = await window.electronAPI.executeCommand(
          "ip -4 route get 1.1.1.1 2>/dev/null | grep -oP 'src \\K[0-9.]+' || hostname -I 2>/dev/null | awk '{print $1}'"
        );
        const ip = out?.trim().split('\n')[0]?.trim();
        if (ip && /^\d+\.\d+\.\d+\.\d+$/.test(ip) && !ip.startsWith('127.')) {
          localIP = ip;
        }
      }
    } catch { /* no local IP available */ }

    const emergencyStatus: IPStatusData = {
      ip: localIP || 'Unavailable',
      isVPN: false,
      isTor: false,
      isProxy: false,
      connectionType: 'unknown',
      lastChecked: new Date(),
      error: localIP
        ? `Public IP unavailable. Showing local IP: ${errorMessage}`
        : `Network Error: ${errorMessage}`,
    };

    // Cache even the error state to prevent repeated failures
    this.cachedStatus = emergencyStatus;
    this.lastCheck = new Date();

    if (localIP) {
      debugLog(`⚠️ Returning local IP fallback: ${localIP}`);
    } else {
      debugLog('⚠️ Returning emergency fallback status');
    }

    return emergencyStatus;
  }

  /**
   * Check only if VPN is connected (quick check)
   */
  async isVPNConnected(): Promise<boolean> {
    const status = await this.getIPStatus();
    return status.isVPN;
  }

  /**
   * Check only if Tor is connected (quick check)
   */
  async isTorConnected(): Promise<boolean> {
    const status = await this.getIPStatus();
    return status.isTor;
  }

  /**
   * Get cached status without fetching
   */
  getCachedStatus(): IPStatusData | null {
    return this.cachedStatus;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cachedStatus = null;
    this.lastCheck = null;
  }

  /**
   * Get connection status color for UI
   */
  getConnectionColor(connectionType: IPStatusData['connectionType']): string {
    switch (connectionType) {
      case 'tor':
        return 'text-purple-500'; // Purple for Tor
      case 'vpn':
        return 'text-emerald-500'; // Green for VPN
      case 'proxy':
        return 'text-blue-500'; // Blue for Proxy
      case 'direct':
        return 'text-red-500'; // Red for direct (not protected)
      case 'unknown':
      default:
        return 'text-gray-500'; // Gray for unknown
    }
  }

  /**
   * Get connection status badge color
   */
  getBadgeColor(connectionType: IPStatusData['connectionType']): string {
    switch (connectionType) {
      case 'tor':
        return 'bg-purple-500/15 text-violet-500 border-transparent';
      case 'vpn':
        return 'bg-emerald-500/15 text-emerald-500 border-transparent';
      case 'proxy':
        return 'bg-blue-500/15 text-blue-500 border-transparent';
      case 'direct':
        return 'bg-red-500/15 text-red-500 border-transparent';
      case 'unknown':
      default:
        return 'bg-gray-500/15 text-zinc-500 border-transparent';
    }
  }
}

// Export singleton instance
export const ipStatusService = new IPStatusService();
export default ipStatusService;

// Debug helper - expose to window for console debugging
if (typeof window !== 'undefined') {
  (window as any).debugIPStatus = async () => {
    debugLog('🔧 === IP STATUS DEBUG ===');
    try {
      const status = await ipStatusService.getIPStatus(true);
      debugLog('📊 Full Status:', status);
      debugLog('🌍 IP:', status.ip);
      debugLog('🏢 ISP/Org:', status.isp, '/', status.org);
      debugLog('🔒 VPN:', status.isVPN, status.vpnProvider);
      debugLog('🧅 Tor:', status.isTor);
      debugLog('📡 Network:', status.networkConnection?.type);
      debugLog('🗺️ Location:', status.city, status.region, status.country);
      return status;
    } catch (error: any) {
      console.error('❌ Debug Error:', error);
      console.error('Error details:', error.message);
      console.error('Stack:', error.stack);
      throw error;
    }
  };
}
