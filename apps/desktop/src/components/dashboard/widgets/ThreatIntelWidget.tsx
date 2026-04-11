import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { UilSignalAlt, UilEye, UilExternalLinkAlt, UilSync } from "@iconscout/react-unicons";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import type { WidgetProps } from "../types";

interface NewsItem {
  title: string;
  source: string;
  time: string;
  category: string;
  url: string;
}

export default function ThreatIntelWidget(_props: WidgetProps) {
  const { toast } = useToast();
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchNews = async () => {
    try {
      setLoading(true);
      const { supabase } = await import("@/lib/supabase");
      const { data, error } = await supabase
        .from("intel_reports")
        .select("title, source_url, source, category, severity, processed_at, created_at")
        .order("created_at", { ascending: false })
        .limit(20);

      if (error || !data || data.length === 0) throw new Error("No intel");

      setNews(data.map((item: any) => {
        const pubDate = item.processed_at ? new Date(item.processed_at) : new Date(item.created_at);
        const hoursAgo = Math.floor((Date.now() - pubDate.getTime()) / 3600000);
        const timeText = hoursAgo < 1 ? "Just now" : hoursAgo < 24 ? `${hoursAgo}h ago` : `${Math.floor(hoursAgo / 24)}d ago`;
        const categoryLabel = (item.category || "other").replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());
        return {
          title: item.title,
          source: item.source || "Unknown",
          time: timeText,
          category: item.severity === "critical" ? `CRITICAL \u2014 ${categoryLabel}` : categoryLabel,
          url: item.source_url || "#",
        };
      }));
    } catch {
      setNews([{ title: "Waiting for Sentinel agent to ingest feeds...", source: "CrowByte", time: "now", category: "System", url: "#" }]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchNews(); }, []);

  return (
    <Card className="bg-card/50 backdrop-blur h-full overflow-hidden">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-blue-500">
              <UilSignalAlt size={20} />
              Cyber Threat Intelligence
            </CardTitle>
            <CardDescription>Live intel from Sentinel — RSS feeds analyzed by GLM5</CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={fetchNews} disabled={loading} className="h-8 px-3">
            <UilSync size={16} className={`mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {news.map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: idx * 0.1 }}
                className="rounded-lg p-4 ring-1 ring-white/[0.06] transition-all hover:bg-primary/5 hover:ring-white/[0.1] cursor-pointer active:scale-[0.98]"
                onClick={() => {
                  const text = `${item.title}\nCategory: ${item.category}\nSource: ${item.source}\n${item.url}`;
                  navigator.clipboard.writeText(text);
                  toast({ title: "Copied", description: `"${item.title.slice(0, 50)}..." copied to clipboard` });
                }}
              >
                <div className="flex items-start justify-between mb-2 min-w-0 gap-2">
                  <span className="text-xs text-muted-foreground truncate min-w-0">{item.category}</span>
                  <span className="text-xs text-muted-foreground shrink-0">{item.time}</span>
                </div>
                <h3 className="font-semibold text-sm leading-tight mb-3 line-clamp-2">{item.title}</h3>
                <div className="flex items-center justify-between min-w-0 gap-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground min-w-0 truncate">
                    <UilEye size={12} className="shrink-0" />
                    <span className="truncate">{item.source}</span>
                  </div>
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs"
                    onClick={(e) => { e.stopPropagation(); window.open(item.url, "_blank"); }}>
                    <UilExternalLinkAlt size={12} className="mr-1" /> Read
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
