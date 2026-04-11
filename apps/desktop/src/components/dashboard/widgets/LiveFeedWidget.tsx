import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { UilSignalAlt, UilTachometerFast } from "@iconscout/react-unicons";
import type { WidgetProps } from "../types";

interface NewsItem {
  title: string;
  source: string;
  time: string;
  category: string;
  url: string;
}

const SPEED_PRESETS = [
  { label: "Slow", seconds: 300 },
  { label: "Normal", seconds: 180 },
  { label: "Fast", seconds: 60 },
] as const;

const getStoredSpeed = (): number => {
  try {
    const stored = localStorage.getItem("crowbyte-ticker-speed");
    if (stored) return parseInt(stored, 10);
  } catch {}
  return 300;
};

export default function LiveFeedWidget(_props: WidgetProps) {
  const [tickerPaused, setTickerPaused] = useState(false);
  const [tickerSpeed, setTickerSpeed] = useState(getStoredSpeed);
  const [news, setNews] = useState<NewsItem[]>([]);

  const cycleSpeed = () => {
    const currentIdx = SPEED_PRESETS.findIndex(p => p.seconds === tickerSpeed);
    const nextIdx = (currentIdx + 1) % SPEED_PRESETS.length;
    const next = SPEED_PRESETS[nextIdx].seconds;
    setTickerSpeed(next);
    localStorage.setItem("crowbyte-ticker-speed", String(next));
  };

  const currentPreset = SPEED_PRESETS.find(p => p.seconds === tickerSpeed) || SPEED_PRESETS[0];

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const { supabase } = await import("@/lib/supabase");
        const { data } = await supabase
          .from("intel_reports")
          .select("title, source_url, source, category, severity, processed_at, created_at")
          .order("created_at", { ascending: false })
          .limit(20);

        if (data && data.length > 0) {
          setNews(data.map((item: any) => {
            const pubDate = item.processed_at ? new Date(item.processed_at) : new Date(item.created_at);
            const hoursAgo = Math.floor((Date.now() - pubDate.getTime()) / 3600000);
            const timeText = hoursAgo < 1 ? "Just now" : hoursAgo < 24 ? `${hoursAgo}h ago` : `${Math.floor(hoursAgo / 24)}d ago`;
            return {
              title: item.title,
              source: item.source || "Unknown",
              time: timeText,
              category: (item.category || "other").replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
              url: item.source_url || "#",
            };
          }));
        }
      } catch {}
    };
    fetchNews();
    const interval = setInterval(fetchNews, 120000);
    return () => clearInterval(interval);
  }, []);

  if (news.length === 0) return null;

  return (
    <Card className="border-primary/30 bg-card/50 backdrop-blur">
      <CardContent className="p-3 py-1.5">
        <div
          className="flex items-center gap-3"
          onMouseEnter={() => setTickerPaused(true)}
          onMouseLeave={() => setTickerPaused(false)}
        >
          <div className="flex items-center gap-2 shrink-0">
            <UilSignalAlt size={16} className="text-red-500 animate-pulse-glow" style={{ filter: 'drop-shadow(0 0 4px rgba(239, 68, 68, 0.7))' }} />
            <span className="text-xs font-semibold text-red-500" style={{ textShadow: '0 0 8px rgba(239, 68, 68, 0.5)' }}>Live Feed</span>
            <button
              onClick={(e) => { e.stopPropagation(); cycleSpeed(); }}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-colors"
              title={`Speed: ${currentPreset.label} (click to change)`}
            >
              <UilTachometerFast size={12} />
              <span className="hidden sm:inline">{currentPreset.label}</span>
            </button>
          </div>
          <div className="relative flex-1 overflow-hidden h-5">
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 24, background: 'linear-gradient(to right, hsl(var(--card)), transparent)', zIndex: 2, pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 24, background: 'linear-gradient(to left, hsl(var(--card)), transparent)', zIndex: 2, pointerEvents: 'none' }} />
            <div
              className="flex items-center gap-6 whitespace-nowrap h-full"
              style={{
                animation: `ticker-scroll ${tickerSpeed}s linear infinite`,
                animationPlayState: tickerPaused ? 'paused' : 'running',
              }}
            >
              {[...news, ...news].map((item, i) => (
                <a
                  key={i}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-xs hover:text-primary transition-colors shrink-0 group cursor-pointer"
                  title={`${item.title} — ${item.source}`}
                >
                  <span className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${
                    item.category?.toLowerCase().includes('vuln') || item.category?.toLowerCase().includes('cve') ? 'bg-red-500' :
                    item.category?.toLowerCase().includes('breach') || item.category?.toLowerCase().includes('ransom') ? 'bg-orange-500' :
                    item.category?.toLowerCase().includes('apt') || item.category?.toLowerCase().includes('threat') ? 'bg-amber-500' :
                    'bg-primary/60'
                  }`} />
                  <span className="text-gray-200 group-hover:text-white transition-colors">{item.title}</span>
                  <span className="text-[10px] text-zinc-500">{item.source} · {item.time}</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
