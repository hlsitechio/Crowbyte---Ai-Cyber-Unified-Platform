/**
 * Official Status Page RSS Feeds Configuration
 * Real-time health status monitoring from official service status pages
 */

export interface StatusFeedConfig {
  name: string;
  statusPageUrl: string;
  rssUrl: string;
  atomUrl: string;
  enabled: boolean;
}

/**
 * Status feed URLs for all monitored services
 */
export const STATUS_FEEDS: Record<string, StatusFeedConfig> = {
  venice: {
    name: 'Venice.ai',
    statusPageUrl: 'https://veniceai-status.com/',
    rssUrl: 'https://veniceai-status.com/history.rss',
    atomUrl: 'https://veniceai-status.com/history.atom',
    enabled: true,
  },
  supabase: {
    name: 'Supabase',
    statusPageUrl: 'https://status.supabase.com/',
    rssUrl: 'https://status.supabase.com/history.rss',
    atomUrl: 'https://status.supabase.com/history.atom',
    enabled: true,
  },
  tavily: {
    name: 'Tavily AI',
    statusPageUrl: 'https://status.tavily.com/',
    rssUrl: 'https://status.tavily.com/feed.rss',
    atomUrl: 'https://status.tavily.com/feed.atom',
    enabled: true,
  },
  inoreader: {
    name: 'Inoreader',
    statusPageUrl: 'https://status.inoreader.com/',
    // Note: RSS feed not explicitly available, fallback to status page
    rssUrl: 'https://status.inoreader.com/history.rss', // Try common pattern
    atomUrl: 'https://status.inoreader.com/history.atom', // Try common pattern
    enabled: false, // Disabled until RSS feed confirmed
  },
};

/**
 * Get enabled status feeds
 */
export function getEnabledFeeds(): StatusFeedConfig[] {
  return Object.values(STATUS_FEEDS).filter(feed => feed.enabled);
}

/**
 * Get status feed by service name
 */
export function getStatusFeed(serviceName: string): StatusFeedConfig | undefined {
  return STATUS_FEEDS[serviceName.toLowerCase()];
}
