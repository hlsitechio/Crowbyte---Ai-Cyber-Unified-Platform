/**
 * Subscription & Preferences Service
 * Manages user tiers, preferences, feed items, and usage tracking via Supabase.
 */

import { supabase } from "@/lib/supabase";

// ─── Types ──────────────────────────────────────────────────────────────────

export type Tier = "free" | "pro" | "team" | "enterprise";
export type SubStatus = "active" | "past_due" | "cancelled" | "trialing";

export interface UserSubscription {
  id: string;
  user_id: string;
  tier: Tier;
  status: SubStatus;
  paypal_email: string | null;
  started_at: string;
  expires_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserPreferences {
  id: string;
  user_id: string;
  cve_enabled: boolean;
  cve_products: string[];
  cve_min_severity: string;
  cve_keywords: string[];
  threat_intel_enabled: boolean;
  threat_feeds: string[];
  news_enabled: boolean;
  news_sources: string[];
  news_keywords: string[];
  monitoring_enabled: boolean;
  monitored_domains: string[];
  monitor_subdomains: boolean;
  monitor_ports: boolean;
  monitor_certs: boolean;
  email_digest: string;
  push_critical: boolean;
  created_at: string;
  updated_at: string;
}

export interface FeedItem {
  id: string;
  user_id: string;
  type: string;
  severity: string;
  title: string;
  summary: string | null;
  data: Record<string, unknown>;
  source: string | null;
  reference_url: string | null;
  read: boolean;
  archived: boolean;
  delivered_at: string;
  read_at: string | null;
  created_at: string;
}

export interface UsageRecord {
  id: string;
  user_id: string;
  resource: string;
  period: string;
  count: number;
  limit_value: number | null;
  created_at: string;
  updated_at: string;
}

// ─── Tier Limits ────────────────────────────────────────────────────────────

export const TIER_LIMITS: Record<Tier, Record<string, number | null>> = {
  free: {
    feed_items: 5,        // per day
    chat_messages: 0,     // no AI chat
    agent_tasks: 0,       // no agent tasks
    monitored_domains: 0, // no monitoring
    cve_products: 3,
    threat_feeds: 1,
  },
  pro: {
    feed_items: null,     // unlimited
    chat_messages: 50,
    agent_tasks: 5,
    monitored_domains: 3,
    cve_products: 20,
    threat_feeds: null,   // all feeds
  },
  team: {
    feed_items: null,
    chat_messages: 500,
    agent_tasks: 50,
    monitored_domains: 20,
    cve_products: null,   // unlimited
    threat_feeds: null,
  },
  enterprise: {
    feed_items: null,
    chat_messages: null,
    agent_tasks: null,
    monitored_domains: null,
    cve_products: null,
    threat_feeds: null,
  },
};

// ─── Subscription ───────────────────────────────────────────────────────────

export async function getSubscription(): Promise<UserSubscription | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("user_subscriptions")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (error) {
    console.error("[subscription] fetch error:", error.message);
    return null;
  }
  return data;
}

export async function updateSubscription(
  updates: Partial<Pick<UserSubscription, "tier" | "status" | "paypal_email" | "expires_at">>
): Promise<UserSubscription | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("user_subscriptions")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    console.error("[subscription] update error:", error.message);
    return null;
  }
  return data;
}

// ─── Preferences ────────────────────────────────────────────────────────────

export async function getPreferences(): Promise<UserPreferences | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("user_preferences")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (error) {
    console.error("[preferences] fetch error:", error.message);
    return null;
  }
  return data;
}

export async function updatePreferences(
  updates: Partial<Omit<UserPreferences, "id" | "user_id" | "created_at" | "updated_at">>
): Promise<UserPreferences | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("user_preferences")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    console.error("[preferences] update error:", error.message);
    return null;
  }
  return data;
}

// ─── Feed Items ─────────────────────────────────────────────────────────────

export async function getFeedItems(opts?: {
  type?: string;
  unreadOnly?: boolean;
  limit?: number;
  offset?: number;
}): Promise<FeedItem[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  let query = supabase
    .from("user_feed_items")
    .select("*")
    .eq("user_id", user.id)
    .eq("archived", false)
    .order("delivered_at", { ascending: false });

  if (opts?.type) query = query.eq("type", opts.type);
  if (opts?.unreadOnly) query = query.eq("read", false);
  if (opts?.limit) query = query.limit(opts.limit);
  if (opts?.offset) query = query.range(opts.offset, opts.offset + (opts.limit || 50) - 1);

  const { data, error } = await query;
  if (error) {
    console.error("[feed] fetch error:", error.message);
    return [];
  }
  return data || [];
}

export async function getUnreadCount(): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;

  const { count, error } = await supabase
    .from("user_feed_items")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("read", false)
    .eq("archived", false);

  if (error) return 0;
  return count || 0;
}

export async function markFeedRead(itemId: string): Promise<void> {
  await supabase
    .from("user_feed_items")
    .update({ read: true, read_at: new Date().toISOString() })
    .eq("id", itemId);
}

export async function markAllFeedRead(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("user_feed_items")
    .update({ read: true, read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .eq("read", false);
}

export async function archiveFeedItem(itemId: string): Promise<void> {
  await supabase
    .from("user_feed_items")
    .update({ archived: true })
    .eq("id", itemId);
}

// ─── Usage Tracking ─────────────────────────────────────────────────────────

export async function getUsage(resource: string): Promise<UsageRecord | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const today = new Date().toISOString().slice(0, 10); // 2026-03-28

  const { data, error } = await supabase
    .from("usage_tracking")
    .select("*")
    .eq("user_id", user.id)
    .eq("resource", resource)
    .eq("period", today)
    .single();

  if (error) return null;
  return data;
}

export async function checkLimit(resource: string, tier: Tier): Promise<{ allowed: boolean; current: number; limit: number | null }> {
  const limit = TIER_LIMITS[tier]?.[resource] ?? null;
  if (limit === null) return { allowed: true, current: 0, limit: null };

  const usage = await getUsage(resource);
  const current = usage?.count || 0;

  return {
    allowed: current < limit,
    current,
    limit,
  };
}

// ─── Realtime Subscription ──────────────────────────────────────────────────

export function subscribeFeedRealtime(
  userId: string,
  onInsert: (item: FeedItem) => void
) {
  const channel = supabase
    .channel(`feed:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "user_feed_items",
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        onInsert(payload.new as FeedItem);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// ─── Upgrade Detection ──────────────────────────────────────────────────────

/**
 * Check if a Pro+ user needs to go through the preferences wizard.
 * Returns true if: user has active paid sub + hasn't completed prefs wizard yet.
 */
export async function needsPreferencesSetup(): Promise<boolean> {
  // Already completed?
  if (localStorage.getItem("crowbyte_prefs_wizard_done") === "true") return false;

  const sub = await getSubscription();
  if (!sub) return false;
  if (sub.status !== "active") return false;
  if (sub.tier === "free") return false;

  // Pro/Team/Enterprise with no wizard completion → needs setup
  const prefs = await getPreferences();
  if (!prefs) return true; // No prefs row = definitely needs setup

  // If they have prefs but everything is empty/default, they skipped it
  const hasConfig = (prefs.cve_products?.length > 0) ||
                    (prefs.threat_feeds?.length > 0) ||
                    (prefs.monitored_domains?.length > 0) ||
                    prefs.news_enabled;

  if (!hasConfig) return true;

  // They have config — mark as done so we don't re-check
  localStorage.setItem("crowbyte_prefs_wizard_done", "true");
  return false;
}

/**
 * Clear the wizard completion flag (e.g. on tier change so user can reconfigure).
 */
export function resetPreferencesWizard(): void {
  localStorage.removeItem("crowbyte_prefs_wizard_done");
}

// ─── Available Products (for onboarding) ────────────────────────────────────

export const PRODUCT_CATALOG = [
  // Web Servers
  "nginx", "apache", "caddy", "iis", "lighttpd", "tomcat",
  // Languages/Runtimes
  "node.js", "python", "php", "java", "ruby", "go", "rust", ".net",
  // Frameworks
  "react", "next.js", "django", "flask", "laravel", "spring", "express",
  // Databases
  "postgresql", "mysql", "mongodb", "redis", "elasticsearch", "sqlite",
  // CMS/Platforms
  "wordpress", "drupal", "joomla", "shopify", "magento",
  // Cloud
  "aws", "gcp", "azure", "cloudflare", "vercel", "netlify",
  // Containers/Orchestration
  "docker", "kubernetes", "podman",
  // OS
  "linux", "windows", "macos", "ubuntu", "debian", "centos",
  // Networking
  "openssh", "openssl", "wireguard", "openvpn",
  // Security Tools
  "crowdstrike", "sentinelone", "splunk", "elastic-siem",
  // Other
  "git", "jenkins", "gitlab", "github", "ansible", "terraform",
] as const;

export const THREAT_FEEDS = [
  { id: "urlhaus-recent", name: "URLhaus (Malware URLs)", desc: "Recently submitted malware URLs" },
  { id: "threatfox", name: "ThreatFox IOCs", desc: "Indicators of Compromise from abuse.ch" },
  { id: "feodo-ipblocklist", name: "Feodo (Botnet C2)", desc: "Botnet C2 IP blocklist" },
  { id: "blocklist-ssh", name: "SSH Bruteforce IPs", desc: "IPs brute-forcing SSH services" },
  { id: "blocklist-brute", name: "Login Bruteforce IPs", desc: "IPs brute-forcing login forms" },
  { id: "ci-badguys", name: "CINS Bad Actors", desc: "Known malicious IP addresses" },
  { id: "et-compromised", name: "ET Compromised IPs", desc: "Emerging Threats compromised hosts" },
] as const;

export const NEWS_SOURCES = [
  { id: "bleepingcomputer", name: "BleepingComputer" },
  { id: "hackernews", name: "The Hacker News" },
  { id: "krebs", name: "Krebs on Security" },
  { id: "darknet", name: "Dark Reading" },
  { id: "securityweek", name: "SecurityWeek" },
  { id: "threatpost", name: "Threatpost" },
] as const;
