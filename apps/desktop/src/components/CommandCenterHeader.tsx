import { useState, useEffect } from "react";
import { Shield, Broadcast } from "@phosphor-icons/react";
import { Card, CardContent } from "@/components/ui/card";

interface NewsItem {
 title: string;
 source: string;
 time: string;
 category: string;
 url: string;
}

interface CommandCenterHeaderProps {
 news: NewsItem[];
}

const CommandCenterHeader = ({ news }: CommandCenterHeaderProps) => {
 const [tickerPaused, setTickerPaused] = useState(false);
 const [currentTime, setCurrentTime] = useState(new Date());

 useEffect(() => {
 const timer = setInterval(() => setCurrentTime(new Date()), 1000);
 return () => clearInterval(timer);
 }, []);

 const date = currentTime.toLocaleDateString("en-US", {
 weekday: "long",
 year: "numeric",
 month: "long",
 day: "numeric",
 });

 const time = currentTime.toLocaleTimeString();

 return (
 <div className="space-y-2">
 {/* Row 1: Command Center + Clock — same style as Network Status card */}
 <Card className="border-primary/30 bg-card/50 backdrop-blur">
 <CardContent className="p-3">
 <div className="flex items-center justify-between gap-2">
 <div className="flex items-center gap-2">
 <Shield size={16} weight="bold" className="text-primary" />
 <span className="text-xs font-semibold text-primary">Command Center</span>
 </div>
 <div className="flex items-center gap-3">
 <span className="text-xs text-zinc-500">{date}</span>
 <span className="text-sm font-mono font-bold text-primary">{time}</span>
 </div>
 </div>
 </CardContent>
 </Card>

 {/* Row 2: News Ticker — same card style */}
 {news.length > 0 && (
 <Card className="border-primary/30 bg-card/50 backdrop-blur">
 <CardContent className="p-3 py-1.5">
 <div
 className="flex items-center gap-3"
 onMouseEnter={() => setTickerPaused(true)}
 onMouseLeave={() => setTickerPaused(false)}
 >
 <div className="flex items-center gap-2 shrink-0">
 <Broadcast size={16} weight="bold" className="text-red-500 animate-pulse-glow" style={{ filter: 'drop-shadow(0 0 4px rgba(239, 68, 68, 0.7))' }} />
 <span className="text-xs font-semibold text-red-500" style={{ textShadow: '0 0 8px rgba(239, 68, 68, 0.5)' }}>Live Feed</span>
 </div>
 <div className="relative flex-1 overflow-hidden h-5">
 <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 24, background: 'linear-gradient(to right, hsl(var(--card)), transparent)', zIndex: 2, pointerEvents: 'none' }} />
 <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 24, background: 'linear-gradient(to left, hsl(var(--card)), transparent)', zIndex: 2, pointerEvents: 'none' }} />
 <div
 className="flex items-center gap-6 whitespace-nowrap h-full"
 style={{
 animation: 'ticker-scroll 20s linear infinite',
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
 )}
 </div>
 );
};

export default CommandCenterHeader;
