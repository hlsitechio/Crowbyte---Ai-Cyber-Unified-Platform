/**
 * Settings → Intel Connectors
 * Global feed catalog — users toggle feeds, add API keys, manage notifications
 */
import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import {
  UilBolt, UilSync, UilShield, UilBug, UilGlobe, UilSearch,
  UilDatabase, UilLock, UilLink, UilCheckCircle, UilTimesCircle,
  UilBell, UilEnvelope, UilKeySkeleton, UilExclamationTriangle,
  UilEye, UilSpinner, UilFilter, UilHeartRate,
} from "@iconscout/react-unicons";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth";
import {
  getConnectorsWithUserState,
  toggleConnectorPref,
  saveUserApiKey,
  deleteUserApiKey,
  getNotificationPrefs,
  saveNotificationPrefs,
  type ConnectorWithUserState,
  type NotificationPrefs,
} from "@/services/intel-connectors";

// ─── Icon mapping ───────────────────────────────────────────────────────────

const CATEGORY_ICONS: Record<string, typeof UilShield> = {
  "Malware URLs": UilBug,
  "C2 Servers": UilGlobe,
  "IOCs": UilExclamationTriangle,
  "Phishing": UilLink,
  "Brute Force": UilShield,
  "Compromised IPs": UilExclamationTriangle,
  "Vulnerabilities": UilDatabase,
  "Certificates": UilLock,
  "IP Reputation": UilEye,
  "IOC Pivot": UilSearch,
  "Email Reputation": UilEnvelope,
  "GeoIP": UilGlobe,
  "ASN/BGP": UilGlobe,
  "OSS Vulns": UilDatabase,
  "Hash Lookup": UilSearch,
  "TTPs": UilBolt,
  "TLS Analysis": UilLock,
  "URL Archive": UilLink,
  "Blocklist": UilShield,
  "Threat Intel": UilHeartRate,
  "Asset Recon": UilSearch,
  "DNS Intel": UilGlobe,
  "Email Intel": UilEnvelope,
  "Malware": UilBug,
  "IP/Geo": UilGlobe,
  "Leaks": UilDatabase,
  "Network": UilGlobe,
};

const TIER_COLORS: Record<string, string> = {
  free: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  freemium: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  paid: "bg-amber-500/10 text-amber-400 border-amber-500/20",
};

// ─── Component ──────────────────────────────────────────────────────────────

export default function ConnectorsSettings() {
  const { toast } = useToast();
  const { user } = useAuth();

  const [connectors, setConnectors] = useState<ConnectorWithUserState[]>([]);
  const [loading, setLoading] = useState(true);
  const [notifPrefs, setNotifPrefs] = useState<NotificationPrefs | null>(null);
  const [filter, setFilter] = useState("");
  const [tierFilter, setTierFilter] = useState<string>("all");
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [keyInput, setKeyInput] = useState("");
  const [savingKey, setSavingKey] = useState(false);

  // Load data
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const [conns, notifs] = await Promise.all([
          getConnectorsWithUserState(user.id),
          getNotificationPrefs(user.id),
        ]);
        setConnectors(conns);
        setNotifPrefs(
          notifs || {
            user_id: user.id,
            threat_level_change: true,
            critical_iocs: true,
            new_cves: true,
            feed_errors: false,
            email_enabled: false,
            push_enabled: true,
          }
        );
      } catch (err) {
        toast({ title: "Failed to load connectors", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  // Group by category
  const grouped = useMemo(() => {
    let filtered = connectors;
    if (filter) {
      const q = filter.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.category.toLowerCase().includes(q) ||
          c.slug.includes(q) ||
          (c.description || "").toLowerCase().includes(q)
      );
    }
    if (tierFilter !== "all") {
      filtered = filtered.filter((c) => c.tier === tierFilter);
    }
    return filtered.reduce((acc, c) => {
      (acc[c.category] = acc[c.category] || []).push(c);
      return acc;
    }, {} as Record<string, ConnectorWithUserState[]>);
  }, [connectors, filter, tierFilter]);

  const categories = Object.keys(grouped).sort();

  // Toggle connector on/off
  const handleToggle = async (c: ConnectorWithUserState, enabled: boolean) => {
    if (!user) return;
    try {
      await toggleConnectorPref(user.id, c.id, enabled);
      setConnectors((prev) =>
        prev.map((x) => (x.id === c.id ? { ...x, user_enabled: enabled } : x))
      );
    } catch {
      toast({ title: "Failed to toggle", variant: "destructive" });
    }
  };

  // Save API key
  const handleSaveKey = async (connectorId: string) => {
    if (!user || !keyInput.trim()) return;
    setSavingKey(true);
    try {
      await saveUserApiKey(user.id, connectorId, keyInput.trim());
      setConnectors((prev) =>
        prev.map((x) =>
          x.id === connectorId ? { ...x, has_key: true, key_enabled: true } : x
        )
      );
      setEditingKey(null);
      setKeyInput("");
      toast({ title: "API key saved" });
    } catch {
      toast({ title: "Failed to save key", variant: "destructive" });
    } finally {
      setSavingKey(false);
    }
  };

  // Delete API key
  const handleDeleteKey = async (connectorId: string) => {
    if (!user) return;
    try {
      await deleteUserApiKey(user.id, connectorId);
      setConnectors((prev) =>
        prev.map((x) =>
          x.id === connectorId ? { ...x, has_key: false, key_enabled: false } : x
        )
      );
      toast({ title: "API key removed" });
    } catch {
      toast({ title: "Failed to remove key", variant: "destructive" });
    }
  };

  // Save notification prefs
  const handleSaveNotifs = async () => {
    if (!notifPrefs) return;
    try {
      await saveNotificationPrefs(notifPrefs);
      toast({ title: "Notification preferences saved" });
    } catch {
      toast({ title: "Failed to save notifications", variant: "destructive" });
    }
  };

  // Stats
  const totalEnabled = connectors.filter((c) => c.user_enabled).length;
  const totalKeyed = connectors.filter((c) => c.has_key).length;
  const totalFree = connectors.filter((c) => !c.requires_key).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <UilSpinner size={24} className="animate-spin text-zinc-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Stats Bar ── */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total Feeds", value: connectors.length, color: "text-zinc-300" },
          { label: "Active", value: totalEnabled, color: "text-emerald-400" },
          { label: "API Keys Set", value: totalKeyed, color: "text-blue-400" },
          { label: "Free (No Key)", value: totalFree, color: "text-purple-400" },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-3 text-center"
          >
            <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-[10px] text-zinc-500">{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <UilSearch size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <Input
            placeholder="Search feeds..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="h-8 text-xs pl-8 font-mono"
          />
        </div>
        <div className="flex items-center gap-1">
          <UilFilter size={14} className="text-zinc-500" />
          {["all", "free", "freemium"].map((t) => (
            <Button
              key={t}
              variant={tierFilter === t ? "default" : "outline"}
              size="sm"
              onClick={() => setTierFilter(t)}
              className="h-7 text-[10px] px-2"
            >
              {t === "all" ? "All" : t.charAt(0).toUpperCase() + t.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {/* ── Connector Cards by Category ── */}
      {categories.map((category) => {
        const CategoryIcon = CATEGORY_ICONS[category] || UilGlobe;
        const items = grouped[category];

        return (
          <Card key={category}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <CategoryIcon size={16} className="text-primary" />
                {category}
                <Badge variant="outline" className="ml-auto text-[10px]">
                  {items.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {items.map((c, idx) => (
                <div key={c.id}>
                  {idx > 0 && <Separator className="my-2" />}
                  <div className="flex items-start gap-3">
                    {/* Toggle */}
                    <Switch
                      checked={c.user_enabled}
                      onCheckedChange={(v) => handleToggle(c, v)}
                      className="mt-0.5"
                    />

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-zinc-200">{c.name}</span>
                        <Badge
                          variant="outline"
                          className={`text-[9px] px-1.5 py-0 ${TIER_COLORS[c.tier]}`}
                        >
                          {c.tier}
                        </Badge>
                        {c.has_key && (
                          <span className="flex items-center gap-1 text-[9px] text-emerald-400">
                            <UilCheckCircle size={10} />
                            Key set
                          </span>
                        )}
                        {c.requires_key && !c.has_key && (
                          <span className="flex items-center gap-1 text-[9px] text-amber-400">
                            <UilKeySkeleton size={10} />
                            Key required
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-500 mt-0.5">{c.description}</p>
                      <div className="flex items-center gap-3 mt-1">
                        {c.free_limit && (
                          <span className="text-[9px] text-zinc-600">
                            Limit: {c.free_limit}
                          </span>
                        )}
                        {c.docs_url && (
                          <a
                            href={c.docs_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[9px] text-blue-400/60 hover:text-blue-400 transition-colors"
                          >
                            Docs
                          </a>
                        )}
                      </div>

                      {/* API Key Input (when requires_key) */}
                      {c.requires_key && editingKey === c.id && (
                        <div className="flex items-center gap-2 mt-2">
                          <Input
                            type="password"
                            placeholder={`${c.name} API key`}
                            value={keyInput}
                            onChange={(e) => setKeyInput(e.target.value)}
                            className="h-7 text-xs font-mono flex-1"
                            autoFocus
                          />
                          <Button
                            size="sm"
                            onClick={() => handleSaveKey(c.id)}
                            disabled={savingKey || !keyInput.trim()}
                            className="h-7 text-xs px-3"
                          >
                            {savingKey ? (
                              <UilSpinner size={12} className="animate-spin" />
                            ) : (
                              "Save"
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingKey(null);
                              setKeyInput("");
                            }}
                            className="h-7 text-xs px-2"
                          >
                            Cancel
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      {c.requires_key && editingKey !== c.id && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingKey(c.id);
                              setKeyInput("");
                            }}
                            className="h-7 text-xs gap-1"
                          >
                            <UilKeySkeleton size={12} />
                            {c.has_key ? "Update" : "Add"} Key
                          </Button>
                          {c.has_key && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteKey(c.id)}
                              className="h-7 text-xs text-red-400 hover:text-red-300"
                            >
                              <UilTimesCircle size={12} />
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        );
      })}

      {categories.length === 0 && (
        <div className="text-center py-12 text-zinc-500 text-sm">
          No connectors match your search.
        </div>
      )}

      {/* ── Notification Preferences ── */}
      {notifPrefs && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <UilBell size={16} className="text-amber-400" />
              Notification Preferences
            </CardTitle>
            <CardDescription className="text-xs">
              Choose what intel alerts you want to receive
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              {
                key: "threat_level_change" as const,
                label: "Threat Level Changes",
                desc: "Alert when global threat level shifts (e.g. ELEVATED → HIGH)",
              },
              {
                key: "critical_iocs" as const,
                label: "Critical IOCs",
                desc: "Alert on high-severity indicators of compromise",
              },
              {
                key: "new_cves" as const,
                label: "New CVEs",
                desc: "Alert on newly published critical vulnerabilities",
              },
              {
                key: "feed_errors" as const,
                label: "Feed Errors",
                desc: "Alert when an intel feed goes offline or returns errors",
              },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between">
                <div>
                  <Label className="text-sm">{item.label}</Label>
                  <p className="text-[11px] text-zinc-500">{item.desc}</p>
                </div>
                <Switch
                  checked={notifPrefs[item.key]}
                  onCheckedChange={(v) =>
                    setNotifPrefs((p) => (p ? { ...p, [item.key]: v } : p))
                  }
                />
              </div>
            ))}

            <Separator />

            <div className="space-y-3">
              <Label className="text-xs text-zinc-400 uppercase tracking-wider">
                Delivery Methods
              </Label>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UilBell size={14} className="text-zinc-400" />
                  <Label className="text-sm">In-App Push</Label>
                </div>
                <Switch
                  checked={notifPrefs.push_enabled}
                  onCheckedChange={(v) =>
                    setNotifPrefs((p) => (p ? { ...p, push_enabled: v } : p))
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UilEnvelope size={14} className="text-zinc-400" />
                  <Label className="text-sm">Email Digest</Label>
                </div>
                <Switch
                  checked={notifPrefs.email_enabled}
                  onCheckedChange={(v) =>
                    setNotifPrefs((p) => (p ? { ...p, email_enabled: v } : p))
                  }
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={handleSaveNotifs} size="sm" className="h-8 text-xs gap-1.5">
                <UilSync size={12} />
                Save Notifications
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
