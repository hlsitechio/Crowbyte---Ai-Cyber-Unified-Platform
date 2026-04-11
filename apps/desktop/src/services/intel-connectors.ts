/**
 * Intel Connectors Service
 * Manages global feed catalog + per-user API keys + notification prefs
 */
import { supabase } from "@/lib/supabase";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface IntelConnector {
  id: string;
  name: string;
  slug: string;
  api_url: string;
  auth_type: "none" | "api_key" | "bearer" | "basic" | "post";
  category: string;
  tier: "free" | "freemium" | "paid";
  requires_key: boolean;
  default_enabled: boolean;
  rate_limit: string | null;
  description: string | null;
  docs_url: string | null;
  icon: string | null;
  free_limit: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserApiKey {
  id: string;
  user_id: string;
  connector_id: string;
  api_key: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserConnectorPref {
  id: string;
  user_id: string;
  connector_id: string;
  enabled: boolean;
}

export interface NotificationPrefs {
  user_id: string;
  threat_level_change: boolean;
  critical_iocs: boolean;
  new_cves: boolean;
  feed_errors: boolean;
  email_enabled: boolean;
  push_enabled: boolean;
}

export type ConnectorWithUserState = IntelConnector & {
  user_enabled: boolean; // from user_connector_prefs or default_enabled
  has_key: boolean;      // user has saved an API key
  key_enabled: boolean;  // the saved key is enabled
};

// ─── Connector Catalog ──────────────────────────────────────────────────────

export async function getConnectors(): Promise<IntelConnector[]> {
  const { data, error } = await supabase
    .from("intel_connectors")
    .select("*")
    .order("tier", { ascending: true })
    .order("category", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getConnectorsByCategory(): Promise<Record<string, IntelConnector[]>> {
  const connectors = await getConnectors();
  return connectors.reduce((acc, c) => {
    (acc[c.category] = acc[c.category] || []).push(c);
    return acc;
  }, {} as Record<string, IntelConnector[]>);
}

// ─── User API Keys ──────────────────────────────────────────────────────────

export async function getUserApiKeys(userId: string): Promise<UserApiKey[]> {
  const { data, error } = await supabase
    .from("user_api_keys")
    .select("*")
    .eq("user_id", userId);

  if (error) throw error;
  return data || [];
}

export async function saveUserApiKey(
  userId: string,
  connectorId: string,
  apiKey: string
): Promise<void> {
  const { error } = await supabase
    .from("user_api_keys")
    .upsert(
      {
        user_id: userId,
        connector_id: connectorId,
        api_key: apiKey,
        enabled: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,connector_id" }
    );

  if (error) throw error;
}

export async function deleteUserApiKey(
  userId: string,
  connectorId: string
): Promise<void> {
  const { error } = await supabase
    .from("user_api_keys")
    .delete()
    .eq("user_id", userId)
    .eq("connector_id", connectorId);

  if (error) throw error;
}

export async function toggleUserApiKey(
  userId: string,
  connectorId: string,
  enabled: boolean
): Promise<void> {
  const { error } = await supabase
    .from("user_api_keys")
    .update({ enabled, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("connector_id", connectorId);

  if (error) throw error;
}

// ─── User Connector Preferences ─────────────────────────────────────────────

export async function getUserConnectorPrefs(userId: string): Promise<UserConnectorPref[]> {
  const { data, error } = await supabase
    .from("user_connector_prefs")
    .select("*")
    .eq("user_id", userId);

  if (error) throw error;
  return data || [];
}

export async function toggleConnectorPref(
  userId: string,
  connectorId: string,
  enabled: boolean
): Promise<void> {
  const { error } = await supabase
    .from("user_connector_prefs")
    .upsert(
      { user_id: userId, connector_id: connectorId, enabled },
      { onConflict: "user_id,connector_id" }
    );

  if (error) throw error;
}

// ─── Notification Preferences ────────────────────────────────────────────────

export async function getNotificationPrefs(userId: string): Promise<NotificationPrefs | null> {
  const { data, error } = await supabase
    .from("notification_prefs")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function saveNotificationPrefs(prefs: NotificationPrefs): Promise<void> {
  const { error } = await supabase
    .from("notification_prefs")
    .upsert(
      { ...prefs, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );

  if (error) throw error;
}

// ─── Merged View — connectors + user state ───────────────────────────────────

export async function getConnectorsWithUserState(
  userId: string
): Promise<ConnectorWithUserState[]> {
  const [connectors, keys, prefs] = await Promise.all([
    getConnectors(),
    getUserApiKeys(userId),
    getUserConnectorPrefs(userId),
  ]);

  const keyMap = new Map(keys.map((k) => [k.connector_id, k]));
  const prefMap = new Map(prefs.map((p) => [p.connector_id, p]));

  return connectors.map((c) => {
    const key = keyMap.get(c.id);
    const pref = prefMap.get(c.id);
    return {
      ...c,
      user_enabled: pref ? pref.enabled : c.default_enabled,
      has_key: !!key,
      key_enabled: key ? key.enabled : false,
    };
  });
}
