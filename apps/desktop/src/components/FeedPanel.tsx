/**
 * FeedPanel — Real-time personalized security feed from CrowByte agents.
 * Displays user_feed_items from Supabase with filtering, read/archive, and realtime updates.
 */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowsClockwise,
  Check,
  Eye,
  Archive,
  ArrowSquareOut,
  Warning,
  Shield,
  Globe,
  Newspaper,
  Broadcast,
  Lightning,
  FunnelSimple,
  CheckCircle,
} from "@phosphor-icons/react";
import { useAuth } from "@/contexts/auth";
import {
  getFeedItems,
  getUnreadCount,
  markFeedRead,
  markAllFeedRead,
  archiveFeedItem,
  subscribeFeedRealtime,
  type FeedItem,
} from "@/services/subscription";

// ─── Helpers ────────────────────────────────────────────────────────────────

const FEED_TYPES = [
  { id: "all", label: "All", icon: Lightning },
  { id: "cve", label: "CVE", icon: Warning },
  { id: "threat_ioc", label: "Threats", icon: Shield },
  { id: "news", label: "News", icon: Newspaper },
  { id: "monitor_alert", label: "Monitor", icon: Broadcast },
] as const;

function severityColor(s: string): string {
  switch (s) {
    case "critical": return "bg-red-500/15 text-red-400 border-red-500/30";
    case "high": return "bg-orange-500/15 text-orange-400 border-orange-500/30";
    case "medium": return "bg-yellow-500/15 text-yellow-400 border-yellow-500/30";
    case "low": return "bg-blue-500/15 text-blue-400 border-blue-500/30";
    default: return "bg-zinc-500/15 text-zinc-400 border-zinc-500/30";
  }
}

function severityDot(s: string): string {
  switch (s) {
    case "critical": return "bg-red-500";
    case "high": return "bg-orange-500";
    case "medium": return "bg-yellow-500";
    case "low": return "bg-blue-500";
    default: return "bg-zinc-500";
  }
}

function typeIcon(t: string) {
  switch (t) {
    case "cve": return Warning;
    case "threat_ioc": return Shield;
    case "news": return Newspaper;
    case "monitor_alert": return Broadcast;
    default: return Globe;
  }
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function FeedPanel() {
  const { user } = useAuth();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadFeed = useCallback(async () => {
    setLoading(true);
    const opts: { type?: string; limit: number } = { limit: 50 };
    if (filter !== "all") opts.type = filter;
    const [feedItems, count] = await Promise.all([
      getFeedItems(opts),
      getUnreadCount(),
    ]);
    setItems(feedItems);
    setUnreadCount(count);
    setLoading(false);
  }, [filter]);

  // Initial load + filter change
  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  // Realtime subscription
  useEffect(() => {
    if (!user?.id) return;
    const unsub = subscribeFeedRealtime(user.id, (newItem) => {
      setItems((prev) => [newItem, ...prev]);
      setUnreadCount((prev) => prev + 1);
    });
    return unsub;
  }, [user?.id]);

  const handleMarkRead = async (item: FeedItem) => {
    await markFeedRead(item.id);
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, read: true, read_at: new Date().toISOString() } : i))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const handleArchive = async (item: FeedItem) => {
    await archiveFeedItem(item.id);
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    if (!item.read) setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const handleMarkAllRead = async () => {
    await markAllFeedRead();
    setItems((prev) => prev.map((i) => ({ ...i, read: true, read_at: new Date().toISOString() })));
    setUnreadCount(0);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
    >
      <Card className="bg-card/50 backdrop-blur">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CardTitle className="flex items-center gap-2 text-blue-500">
                <Lightning size={20} weight="duotone" />
                Your Feed
              </CardTitle>
              {unreadCount > 0 && (
                <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-blue-500 text-white text-[10px] font-bold">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMarkAllRead}
                  className="h-7 px-2 text-xs text-zinc-400"
                >
                  <CheckCircle size={14} weight="bold" className="mr-1" />
                  Mark all read
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={loadFeed}
                disabled={loading}
                className="h-7 px-2"
              >
                <ArrowsClockwise
                  size={14}
                  weight="bold"
                  className={loading ? "animate-spin" : ""}
                />
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-1 mt-2">
            {FEED_TYPES.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setFilter(id)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  filter === id
                    ? "bg-blue-500/15 text-blue-400 border border-blue-500/30"
                    : "text-zinc-500 hover:text-zinc-300 border border-transparent"
                }`}
              >
                <Icon size={12} weight="bold" />
                {label}
              </button>
            ))}
          </div>
        </CardHeader>

        <CardContent>
          <ScrollArea className="h-[420px] pr-2">
            {loading && items.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-zinc-500 text-sm">
                <ArrowsClockwise size={16} className="animate-spin mr-2" />
                Loading feed...
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-zinc-500 text-sm gap-2">
                <FunnelSimple size={24} />
                <span>No items yet. Configure your preferences to start receiving intel.</span>
              </div>
            ) : (
              <div className="space-y-1.5">
                <AnimatePresence initial={false}>
                  {items.map((item) => {
                    const Icon = typeIcon(item.type);
                    const isExpanded = expandedId === item.id;

                    return (
                      <motion.div
                        key={item.id}
                        layout
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: 100 }}
                        transition={{ duration: 0.2 }}
                        onClick={() => {
                          setExpandedId(isExpanded ? null : item.id);
                          if (!item.read) handleMarkRead(item);
                        }}
                        className={`rounded-lg p-3 ring-1 cursor-pointer transition-all ${
                          item.read
                            ? "ring-white/[0.04] hover:ring-white/[0.08]"
                            : "ring-blue-500/20 bg-blue-500/[0.02] hover:ring-blue-500/30"
                        }`}
                      >
                        {/* Header row */}
                        <div className="flex items-start gap-2.5">
                          {/* Unread dot */}
                          <div className="mt-1.5 flex-shrink-0">
                            {!item.read ? (
                              <div className={`w-2 h-2 rounded-full ${severityDot(item.severity)}`} />
                            ) : (
                              <div className="w-2 h-2 rounded-full bg-zinc-700" />
                            )}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border ${severityColor(item.severity)}`}>
                                {item.severity.toUpperCase()}
                              </span>
                              <Icon size={12} className="text-zinc-500" weight="bold" />
                              <span className="text-[10px] text-zinc-600">{timeAgo(item.delivered_at)}</span>
                            </div>
                            <h4 className={`text-sm leading-tight ${item.read ? "text-zinc-400" : "text-zinc-200 font-medium"}`}>
                              {item.title}
                            </h4>
                          </div>
                        </div>

                        {/* Expanded details */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="mt-2 ml-[18px] space-y-2">
                                {item.summary && (
                                  <p className="text-xs text-zinc-500 leading-relaxed">
                                    {item.summary}
                                  </p>
                                )}

                                {/* Data fields */}
                                {item.data && Object.keys(item.data).length > 0 && (
                                  <div className="flex flex-wrap gap-1.5">
                                    {Object.entries(item.data).slice(0, 6).map(([key, val]) => {
                                      if (!val || key === "cve_id") return null;
                                      const display = typeof val === "object" ? JSON.stringify(val) : String(val);
                                      if (display.length > 60) return null;
                                      return (
                                        <span
                                          key={key}
                                          className="px-1.5 py-0.5 rounded bg-white/[0.04] text-[10px] text-zinc-500 font-mono"
                                        >
                                          {key}: {display}
                                        </span>
                                      );
                                    })}
                                  </div>
                                )}

                                {/* Actions */}
                                <div className="flex items-center gap-2 pt-1">
                                  {item.reference_url && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 px-2 text-[10px] text-blue-400"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        window.open(item.reference_url!, "_blank");
                                      }}
                                    >
                                      <ArrowSquareOut size={10} className="mr-1" />
                                      Source
                                    </Button>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 px-2 text-[10px] text-zinc-500"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleArchive(item);
                                    }}
                                  >
                                    <Archive size={10} className="mr-1" />
                                    Archive
                                  </Button>
                                  {item.source && (
                                    <span className="text-[10px] text-zinc-700 ml-auto">
                                      via {item.source}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </motion.div>
  );
}
