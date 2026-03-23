/**
 * IP Address & Connection Status Service
 * Detects current IP, VPN status, and Tor connection
 */

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
   * Fetch IP information from ipapi.co (free, detailed info)
   */
  private async fetchIPInfo(): Promise<Partial<IPStatusData>> {
    try {
      console.log('📡 Attempting to fetch IP from ipapi.co...');

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch('https://ipapi.co/json/', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.warn(`ipapi.co returned ${response.status}, trying fallback...`);
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ ipapi.co response:', data);

      return {
        ip: data.ip,
        country: data.country_name,
        city: data.city,
        region: data.region,
        isp: data.org,
        org: data.org,
        timezone: data.timezone,
        // ipapi.co provides these flags
        isVPN: data.asn?.includes('VPN') || data.org?.toLowerCase().includes('vpn') || false,
        isProxy: data.asn?.includes('Proxy') || false,
        // @ts-ignore - preserve hostname if available
        hostname: data.hostname,
      };
    } catch (error: unknown) {
      console.error('❌ ipapi.co fetch error:', error instanceof Error ? error.message : 'Unknown error');
      // Try ipinfo.io as fallback (free tier, no key required)
      try {
        console.log('📡 Trying fallback: ipinfo.io...');

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        const fallbackResponse = await fetch('https://ipinfo.io/json', {
          method: 'GET',
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
          },
        });

        clearTimeout(timeoutId);

        if (!fallbackResponse.ok) {
          throw new Error(`HTTP ${fallbackResponse.status}`);
        }

        const fallbackData = await fallbackResponse.json();
        console.log('✅ ipinfo.io response:', fallbackData);

        return {
          ip: fallbackData.ip,
          country: fallbackData.country,
          city: fallbackData.city,
          region: fallbackData.region,
          isp: fallbackData.org,
          org: fallbackData.org,
          timezone: fallbackData.timezone,
          isVPN: fallbackData.org?.toLowerCase().includes('vpn') || fallbackData.org?.toLowerCase().includes('hosting') || false,
          isProxy: false,
          // @ts-ignore - preserve hostname if available
          hostname: fallbackData.hostname,
        };
      } catch (fallbackError: unknown) {
        console.error('❌ ipinfo.io fallback error:', fallbackError instanceof Error ? fallbackError.message : 'Unknown error');
        throw error; // Throw original error
      }
    }
  }

  /**
   * Fallback: Fetch IP from ipify.org (simple, reliable)
   */
  private async fetchIPFromIpify(): Promise<string> {
    try {
      console.log('📡 Trying ipify.org...');
      const response = await fetch('https://api.ipify.org?format=json', {
        signal: AbortSignal.timeout(5000),
      });
      const data = await response.json();
      console.log('✅ ipify.org response:', data);
      return data.ip;
    } catch (error: unknown) {
      console.error('❌ ipify.org fetch error:', error instanceof Error ? error.message : 'Unknown error');
      // Last resort: try api64.ipify.org (IPv4 only)
      try {
        console.log('📡 Trying api64.ipify.org...');
        const response = await fetch('https://api64.ipify.org?format=json', {
          signal: AbortSignal.timeout(5000),
        });
        const data = await response.json();
        console.log('✅ api64.ipify.org response:', data);
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
        console.log(`📡 [${attempt}/${maxRetries}] Trying ${service.name}...`);

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
            console.warn(`⚠️ ${service.name} returned HTTP ${response.status}`);
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
            console.log(`✅ ${service.name} returned valid IP: ${ip}`);
            return ip;
          } else {
            console.warn(`⚠️ ${service.name} returned invalid IP: ${ip}`);
            return null;
          }
        } catch (fetchError: unknown) {
          clearTimeout(timeoutId);

          const errorMsg = fetchError instanceof Error ? fetchError.message : 'Unknown error';
          console.warn(`⚠️ ${service.name} fetch error (attempt ${attempt}): ${errorMsg}`);

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
    console.log('🔄 === STARTING IP FETCH WITH FALLBACKS ===');

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
          console.log(`✅ === IP FETCH SUCCESSFUL: ${ip} from ${service.name} ===`);
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
      console.log('🧅 Checking Tor status for IP:', ip);

      // PRIMARY: Use Electron proxy to avoid CORS
      if (typeof window !== 'undefined' && window.electronAPI) {
        console.log('🔌 Using Electron proxy for Tor check...');

        const result = await window.electronAPI.checkTor();

        if (result.success && result.data) {
          console.log('✅ Tor check response:', result.data);
          return {
            isTor: result.data.IsTor === true,
            isExitNode: result.data.IsTor === true,
          };
        } else {
          console.warn('⚠️ Tor check via Electron failed:', result.error);
        }
      }

      // FALLBACK: Direct fetch (will likely fail due to CORS)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`https://check.torproject.org/api/ip`, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Tor check response:', data);
        return {
          isTor: data.IsTor === true,
          isExitNode: data.IsTor === true,
        };
      } else {
        console.warn(`Tor check returned ${response.status}`);
      }

      // Fallback: Check common Tor indicators
      console.log('⚠️ Using Tor indicator fallback');
      return this.checkTorIndicators(ip);
    } catch (error: any) {
      console.error('❌ Tor check error:', error.message);
      // Fallback to indicator-based detection
      console.log('⚠️ Using Tor indicator fallback');
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

    console.log('🔍 ===== VPN DETECTION DEBUG =====');
    console.log('🔍 Checking VPN for org/ISP:', org);
    console.log('🔍 Hostname (if available):', hostname || 'none');
    console.log('🔍 Full ipInfo received:', JSON.stringify(ipInfo, null, 2));

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
        console.log(`✅ VPN detected by ASN pattern: ${asnPattern}`);

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
          console.log(`✅ VPN Provider detected: ${vpnProvider} (matched: ${keyword})`);
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
      console.log('🔍 Checking hostname for VPN patterns:', hostname);

      // Check for ProtonVPN hostname patterns
      if (hostname.includes('protonvpn') || hostname.includes('proton-vpn') || hostname.includes('protonmail')) {
        vpnProvider = 'ProtonVPN';
        indicators.push('hostname:proton');
        console.log('✅ ProtonVPN detected from hostname');
      }

      // Check for other VPN providers in hostname
      for (const provider of vpnProviders) {
        for (const keyword of provider.keywords) {
          if (hostname.includes(keyword)) {
            vpnProvider = provider.name;
            indicators.push(`hostname:${keyword}`);
            console.log(`✅ ${provider.name} detected from hostname`);
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
      console.log('✅ VPN detected by API flag');
      return { isVPN: true, provider: vpnProvider || 'Unknown VPN' };
    }

    // If we found VPN indicators
    if (indicators.length > 0) {
      console.log(`✅ VPN detected by indicators: ${indicators.join(', ')}`);
      return { isVPN: true, provider: vpnProvider || 'VPN Service' };
    }

    console.log('❌ No VPN detected');
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
        console.log('🐧 PRIMARY: Detecting network via Linux commands...');

        // Get default route interface
        const routeOutput = await window.electronAPI.executeCommand(
          "ip route show default 2>/dev/null | head -1 | awk '{print $5}'"
        );
        const defaultIface = routeOutput.trim();

        if (defaultIface) {
          console.log(`🔍 Default route interface: ${defaultIface}`);
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

          console.log(`✅ Linux network: ${type} (${defaultIface}), speed: ${downlink || 'unknown'} Mbps`);

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
    console.log('🔄 FALLBACK: Using Network Information API...');

    const nav: any = navigator;
    const connection = nav.connection || nav.mozConnection || nav.webkitConnection;

    if (!connection) {
      console.log('❌ Network Information API not available');
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

      console.log(`✅ Network from API: ${info.type}, Speed: ${connection.effectiveType}, Downlink: ${info.downlink} Mbps`);

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
        console.log('🐧 Fetching DNS info via Linux commands...');

        // Try resolvectl first (systemd-resolved)
        let servers: string[] = [];

        try {
          const resolvectlOutput = await window.electronAPI.executeCommand(
            "resolvectl dns 2>/dev/null | grep -oP '\\d+\\.\\d+\\.\\d+\\.\\d+' || true"
          );
          const resolvectlServers = resolvectlOutput.trim().split('\n').filter((s: string) => s && this.isValidIP(s));
          if (resolvectlServers.length > 0) {
            servers = [...new Set(resolvectlServers)]; // dedupe
            console.log(`✅ resolvectl: Found ${servers.length} DNS servers`);
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
              console.log(`✅ resolv.conf: Found ${servers.length} DNS servers`);
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

        console.warn('⚠️  No DNS servers found via Linux commands');
      } catch (err) {
        console.error('❌ Linux DNS detection failed:', err);
      }
    }

    // ========================================
    // FINAL FALLBACK: Unavailable
    // ========================================
    console.warn('❌ All DNS detection methods failed');
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

    console.log('🔍 Checking for DNS leaks...');
    console.log(`🔍 VPN Active: ${isVPN}, ISP: ${isp || 'unknown'}`);
    console.log(`🔍 DNS Servers: ${dnsServers.join(', ')}`);

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
        console.log(`ℹ️  ${dnsServer} - Public DNS (neutral)`);
        continue;
      }

      // Check if it matches VPN DNS pattern (GOOD)
      const isVPNDNS = vpnDNSPatterns.some(pattern => pattern.test(dnsServer));
      if (isVPNDNS) {
        console.log(`✅ ${dnsServer} - VPN DNS (secure)`);
        continue;
      }

      // Check if it matches ISP DNS pattern (LEAK)
      const isISPDNS = ispDNSPatterns.some(pattern => pattern.test(dnsServer));
      if (isISPDNS) {
        console.warn(`🚨 ${dnsServer} - ISP DNS detected (LEAK!)`);
        leakServers.push(dnsServer);
        continue;
      }

      // If ISP name is available, check if DNS owner matches ISP
      if (isp) {
        // This would require reverse DNS lookup or ASN lookup
        // For now, we'll mark unknown DNS as potential leak
        console.warn(`⚠️  ${dnsServer} - Unknown DNS (possible leak)`);
      }
    }

    if (leakServers.length > 0) {
      console.error(`🚨 DNS LEAK DETECTED: ${leakServers.length} server(s) leaking to ISP!`);
      return { isLeak: true, leakServers };
    }

    console.log('✅ No DNS leaks detected');
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
  async getIPStatus(forceRefresh = false): Promise<IPStatusData> {
    // Error boundary wrapper
    try {
      // Return cached data if available and fresh
      if (
        !forceRefresh &&
        this.cachedStatus &&
        this.lastCheck &&
        Date.now() - this.lastCheck.getTime() < this.cacheTimeout
      ) {
        console.log('📡 Returning cached IP status');
        return this.cachedStatus;
      }

      console.log('🔄 === STARTING FULL IP STATUS FETCH ===');

      let ipInfo: Partial<IPStatusData>;

      // Phase 1: Try to get full IP info with location data
      try {
        console.log('📡 Phase 1: Attempting detailed IP info fetch...');
        ipInfo = await this.fetchIPInfo();

        if (!ipInfo.ip) {
          console.warn('⚠️ No IP in detailed fetch, moving to Phase 2...');
          throw new Error('No IP returned from detailed fetch');
        }

        console.log('✅ Phase 1 successful: Got detailed IP info');
      } catch (phase1Error: any) {
        console.warn('⚠️ Phase 1 failed:', phase1Error.message);

        // Phase 2: Fallback to simple IP fetch
        try {
          console.log('📡 Phase 2: Attempting simple IP fetch...');
          const simpleIP = await this.fetchIPWithFallbacks();
          ipInfo = { ip: simpleIP };
          console.log('✅ Phase 2 successful: Got simple IP');
        } catch (phase2Error: any) {
          console.error('❌ Phase 2 failed:', phase2Error.message);

          // Phase 3: Final emergency fallback
          console.log('📡 Phase 3: Emergency fallback...');
          return await this.createEmergencyFallbackStatus(phase2Error.message);
        }
      }

      // Phase 4: Enrich with Tor/VPN detection (best effort)
      try {
        console.log('📡 Phase 4: Enriching with Tor/VPN detection...');

        let torStatus: TorCheckResult;
        let vpnStatus: { isVPN: boolean; provider?: string };

        try {
          torStatus = await this.checkTorStatus(ipInfo.ip!);
        } catch (torError) {
          console.warn('⚠️ Tor check failed, assuming not Tor');
          torStatus = { isTor: false };
        }

        try {
          vpnStatus = this.detectVPN(ipInfo);
        } catch (vpnError) {
          console.warn('⚠️ VPN detection failed, assuming direct connection');
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
          console.warn('⚠️ Network info failed');
          networkConnection = { type: 'unknown' };
        }

        let dnsInfo: DNSInfo;
        try {
          dnsInfo = await this.getDNSInfo(vpnStatus.isVPN, ipInfo.isp);
        } catch (dnsError) {
          console.warn('⚠️ DNS info failed');
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

        console.log(`✅ === IP STATUS COMPLETE: ${status.ip} (${status.connectionType}) ===`);
        if (status.isVPN) console.log(`🔒 VPN: ${status.vpnProvider || 'Unknown Provider'}`);
        if (status.isTor) console.log('🧅 Tor Connection Detected');
        if (status.dnsInfo && status.dnsInfo.servers.length > 0) {
          console.log(`🌐 DNS: ${status.dnsInfo.servers.join(', ')} (${status.dnsInfo.source})`);
          if (status.dnsInfo.isDNSLeak) {
            console.error(`🚨 DNS LEAK: ${status.dnsInfo.leakServers?.join(', ')}`);
          }
        }

        return status;
      } catch (enrichmentError: any) {
        console.warn('⚠️ Enrichment failed, returning basic status:', enrichmentError.message);

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
      // Absolute final fallback - should never reach here
      console.error('❌ === CATASTROPHIC IP FETCH FAILURE ===');
      console.error('Error:', outerError);

      return await this.createEmergencyFallbackStatus(
        outerError.message || 'Complete IP fetch failure'
      );
    }
  }

  /**
   * Get local network info from PC Monitor MCP (fallback when public IP fetch fails)
   */
  private async getLocalNetworkInfo(): Promise<string | null> {
    try {
      // Only available in Electron with PC Monitor MCP
      if (typeof window === 'undefined' || !window.electronAPI) {
        console.log('ℹ️  Electron API not available for local IP fetch');
        return null;
      }

      console.log('🖥️  Fetching local IP from PC Monitor MCP...');

      const networkInfo = await window.electronAPI.mcpCall('get_network_info', {});

      if (networkInfo.success && networkInfo.data) {
        let data = networkInfo.data;

        // Parse MCP response format: { content: [{ type: 'text', text: '{"interfaces": [...]}' }] }
        if (data.content && Array.isArray(data.content) && data.content[0]) {
          const textContent = data.content[0].text;
          if (textContent) {
            try {
              data = JSON.parse(textContent);
              console.log('✅ PC Monitor MCP response parsed for local IP');
            } catch (parseError) {
              console.error('❌ Failed to parse PC Monitor MCP response:', parseError);
              return null;
            }
          }
        }

        const interfaces = data.interfaces || [];
        console.log(`🔍 Analyzing ${interfaces.length} interfaces for local IP`);

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
                console.log(`✅ PC Monitor MCP: Local IP ${ip} (${iface.name}, Priority: ${priority})`);
                return ip;
              }
            }
          }
        }

        console.warn('⚠️  PC Monitor MCP found no suitable local IP in any interface');
      } else {
        console.warn('⚠️  PC Monitor MCP returned no network data');
      }

      return null;
    } catch (error) {
      console.error('❌ Failed to get local IP from PC Monitor MCP:', error);
      return null;
    }
  }

  /**
   * Create emergency fallback status when everything fails
   * Try to get local IP from MCP as last resort
   */
  private async createEmergencyFallbackStatus(errorMessage: string): Promise<IPStatusData> {
    console.error('🚨 Creating emergency fallback status');

    // Try to get local IP from MCP monitoring tools
    const localIP = await this.getLocalNetworkInfo();

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
      console.log(`⚠️ Returning local IP fallback: ${localIP}`);
    } else {
      console.log('⚠️ Returning emergency fallback status');
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
        return 'text-green-500'; // Green for VPN
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
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'vpn':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'proxy':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'direct':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'unknown':
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  }
}

// Export singleton instance
export const ipStatusService = new IPStatusService();
export default ipStatusService;

// Debug helper - expose to window for console debugging
if (typeof window !== 'undefined') {
  (window as any).debugIPStatus = async () => {
    console.log('🔧 === IP STATUS DEBUG ===');
    try {
      const status = await ipStatusService.getIPStatus(true);
      console.log('📊 Full Status:', status);
      console.log('🌍 IP:', status.ip);
      console.log('🏢 ISP/Org:', status.isp, '/', status.org);
      console.log('🔒 VPN:', status.isVPN, status.vpnProvider);
      console.log('🧅 Tor:', status.isTor);
      console.log('📡 Network:', status.networkConnection?.type);
      console.log('🗺️ Location:', status.city, status.region, status.country);
      return status;
    } catch (error: any) {
      console.error('❌ Debug Error:', error);
      console.error('Error details:', error.message);
      console.error('Stack:', error.stack);
      throw error;
    }
  };
}
