/**
 * Status RSS Feed Fetcher
 * Fetches and parses RSS/Atom feeds from service status pages
 */

import { STATUS_FEEDS, getEnabledFeeds, type StatusFeedConfig } from '@/config/status-feeds';

export interface StatusIncident {
  id: string;
  title: string;
  description: string;
  pubDate: Date;
  link: string;
  status: 'resolved' | 'monitoring' | 'identified' | 'investigating' | 'scheduled';
  severity: 'critical' | 'major' | 'minor' | 'maintenance';
}

export interface ServiceStatusFromRSS {
  serviceName: string;
  overallStatus: 'operational' | 'degraded' | 'partial_outage' | 'major_outage' | 'unknown';
  latestIncident?: StatusIncident;
  recentIncidents: StatusIncident[];
  lastChecked: Date;
  error?: string;
}

class StatusRSSFetcher {
  /**
   * Parse RSS/Atom XML to extract incidents
   */
  private parseRSSFeed(xmlText: string): StatusIncident[] {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

    // Check for parsing errors
    const parserError = xmlDoc.querySelector('parsererror');
    if (parserError) {
      console.error('RSS parsing error:', parserError.textContent);
      return [];
    }

    const incidents: StatusIncident[] = [];

    // Try RSS format first
    let items = xmlDoc.querySelectorAll('item');

    // If no RSS items, try Atom format
    if (items.length === 0) {
      items = xmlDoc.querySelectorAll('entry');
    }

    items.forEach((item, index) => {
      try {
        // Get title
        const titleEl = item.querySelector('title');
        const title = titleEl?.textContent || 'Unknown incident';

        // Get description (RSS: description, Atom: content or summary)
        const descEl = item.querySelector('description, content, summary');
        const description = descEl?.textContent || '';

        // Get publication date (RSS: pubDate, Atom: updated or published)
        const dateEl = item.querySelector('pubDate, updated, published');
        const dateText = dateEl?.textContent || new Date().toISOString();
        const pubDate = new Date(dateText);

        // Get link (RSS: link, Atom: link href attribute)
        const linkEl = item.querySelector('link');
        const link = linkEl?.getAttribute('href') || linkEl?.textContent || '';

        // Determine status from title/description
        const status = this.extractStatus(title + ' ' + description);

        // Determine severity from title/description
        const severity = this.extractSeverity(title + ' ' + description);

        incidents.push({
          id: `incident-${index}-${pubDate.getTime()}`,
          title,
          description: description.substring(0, 500), // Limit description length
          pubDate,
          link,
          status,
          severity,
        });
      } catch (error) {
        console.error('Error parsing RSS item:', error);
      }
    });

    // Sort by date, newest first
    return incidents.sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime());
  }

  /**
   * Extract status from incident text
   */
  private extractStatus(text: string): StatusIncident['status'] {
    const lowerText = text.toLowerCase();

    if (lowerText.includes('resolved') || lowerText.includes('completed')) {
      return 'resolved';
    }
    if (lowerText.includes('monitoring')) {
      return 'monitoring';
    }
    if (lowerText.includes('identified')) {
      return 'identified';
    }
    if (lowerText.includes('scheduled') || lowerText.includes('maintenance')) {
      return 'scheduled';
    }
    if (lowerText.includes('investigating')) {
      return 'investigating';
    }

    return 'resolved'; // Default to resolved for old incidents
  }

  /**
   * Extract severity from incident text
   */
  private extractSeverity(text: string): StatusIncident['severity'] {
    const lowerText = text.toLowerCase();

    if (lowerText.includes('critical') || lowerText.includes('outage')) {
      return 'critical';
    }
    if (lowerText.includes('major') || lowerText.includes('degraded')) {
      return 'major';
    }
    if (lowerText.includes('maintenance') || lowerText.includes('scheduled')) {
      return 'maintenance';
    }

    return 'minor'; // Default to minor
  }

  /**
   * Determine overall service status from recent incidents
   */
  private determineOverallStatus(incidents: StatusIncident[]): ServiceStatusFromRSS['overallStatus'] {
    if (incidents.length === 0) {
      return 'operational';
    }

    // Check last 5 incidents
    const recentIncidents = incidents.slice(0, 5);

    // If any critical unresolved incidents
    const criticalUnresolved = recentIncidents.find(
      i => i.severity === 'critical' && i.status !== 'resolved'
    );
    if (criticalUnresolved) {
      return 'major_outage';
    }

    // If any major unresolved incidents
    const majorUnresolved = recentIncidents.find(
      i => i.severity === 'major' && i.status !== 'resolved'
    );
    if (majorUnresolved) {
      return 'partial_outage';
    }

    // If any minor unresolved incidents
    const minorUnresolved = recentIncidents.find(
      i => i.severity === 'minor' && i.status !== 'resolved'
    );
    if (minorUnresolved) {
      return 'degraded';
    }

    return 'operational';
  }

  /**
   * Fetch status from RSS feed
   */
  async fetchServiceStatus(feedConfig: StatusFeedConfig): Promise<ServiceStatusFromRSS> {
    try {
      console.log(`📡 Fetching RSS feed for ${feedConfig.name}...`);

      const response = await fetch(feedConfig.rssUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/rss+xml, application/xml, text/xml',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const xmlText = await response.text();
      const incidents = this.parseRSSFeed(xmlText);
      const overallStatus = this.determineOverallStatus(incidents);

      console.log(`✅ ${feedConfig.name} status: ${overallStatus} (${incidents.length} incidents found)`);

      return {
        serviceName: feedConfig.name,
        overallStatus,
        latestIncident: incidents[0],
        recentIncidents: incidents.slice(0, 10), // Keep last 10 incidents
        lastChecked: new Date(),
      };
    } catch (error: unknown) {
      console.error(`❌ Failed to fetch RSS for ${feedConfig.name}:`, error instanceof Error ? error.message : 'Unknown error');

      return {
        serviceName: feedConfig.name,
        overallStatus: 'unknown',
        recentIncidents: [],
        lastChecked: new Date(),
        error: error.message,
      };
    }
  }

  /**
   * Fetch all enabled service statuses
   */
  async fetchAllStatuses(): Promise<Map<string, ServiceStatusFromRSS>> {
    const enabledFeeds = getEnabledFeeds();

    console.log(`📡 Fetching status for ${enabledFeeds.length} services...`);

    const results = await Promise.allSettled(
      enabledFeeds.map(feed => this.fetchServiceStatus(feed))
    );

    const statusMap = new Map<string, ServiceStatusFromRSS>();

    results.forEach((result, index) => {
      const feedConfig = enabledFeeds[index];
      const serviceName = feedConfig.name.toLowerCase().replace(/[^a-z0-9]/g, '');

      if (result.status === 'fulfilled') {
        statusMap.set(serviceName, result.value);
      } else {
        console.error(`Failed to fetch ${feedConfig.name}:`, result.reason);
        statusMap.set(serviceName, {
          serviceName: feedConfig.name,
          overallStatus: 'unknown',
          recentIncidents: [],
          lastChecked: new Date(),
          error: result.reason?.message || 'Unknown error',
        });
      }
    });

    return statusMap;
  }

  /**
   * Get status for specific service
   */
  async getServiceStatus(serviceName: string): Promise<ServiceStatusFromRSS | null> {
    const feedConfig = STATUS_FEEDS[serviceName.toLowerCase()];

    if (!feedConfig) {
      console.error(`No status feed configured for service: ${serviceName}`);
      return null;
    }

    if (!feedConfig.enabled) {
      console.warn(`Status feed disabled for service: ${serviceName}`);
      return null;
    }

    return this.fetchServiceStatus(feedConfig);
  }
}

// Export singleton instance
export const statusRSSFetcher = new StatusRSSFetcher();
export default statusRSSFetcher;
