/**
 * Intel Category Widget — Shows live IOCs for a specific threat category
 * Responsive: works in 2x1, 4x1, or any grid span
 */
import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  UilSync, UilExclamationTriangle, UilBug, UilShield, UilGlobe,
  UilLink, UilDatabase, UilServer, UilLock, UilSearch, UilEnvelope,
  UilBolt,
} from "@iconscout/react-unicons";
import type { WidgetProps } from "../types";

interface IOCItem {
  ioc_value: string;
  ioc_type: string;
  category: string;
  feed_name: string;
  severity: string;
  last_seen: string;
}

const CATEGORY_CONFIGS: Record<string, { label: string; color: string; bgColor: string }> = {
  malware_urls: { label: "Malware URLs", color: "text-red-400", bgColor: "bg-red-500/10" },
  phishing: { label: "Phishing", color: "text-orange-400", bgColor: "bg-orange-500/10" },
  c2_servers: { label: "C2 Servers", color: "text-pink-400", bgColor: "bg-pink-500/10" },
  brute_force: { label: "Brute Force", color: "text-yellow-400", bgColor: "bg-yellow-500/10" },
  compromised_ips: { label: "Compromised IPs", color: "text-cyan-400", bgColor: "bg-cyan-500/10" },
  vulnerabilities: { label: "Vulnerabilities", color: "text-purple-400", bgColor: "bg-purple-500/10" },
  iocs: { label: "IOCs", color: "text-red-300", bgColor: "bg-red-500/10" },
  ip_reputation: { label: "IP Reputation", color: "text-blue-400", bgColor: "bg-blue-500/10" },
  web_attacks: { label: "Web Attacks", color: "text-amber-400", bgColor: "bg-amber-500/10" },
  spam: { label: "Spam", color: "text-zinc-400", bgColor: "bg-zinc-500/10" },
  oss_vulns: { label: "OSS Vulns", color: "text-violet-400", bgColor: "bg-violet-500/10" },
  network_intel: { label: "Network Intel", color: "text-teal-400", bgColor: "bg-teal-500/10" },
};

const CATEGORY_ICONS: Record<string, typeof UilBug> = {
  malware_urls: UilBug,
  phishing: UilLink,
  c2_servers: UilServer,
  brute_force: UilShield,
  compromised_ips: UilExclamationTriangle,
  vulnerabilities: UilDatabase,
  iocs: UilBolt,
  ip_reputation: UilSearch,
  web_attacks: UilGlobe,
  spam: UilEnvelope,
  oss_vulns: UilLock,
  network_intel: UilGlobe,
};

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return "now";
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  return `${Math.floor(hr / 24)}d`;
}

export default function IntelCategoryWidget({ config }: WidgetProps) {
  const categoryKey = config?.category || "malware_urls";
  const cfg = CATEGORY_CONFIGS[categoryKey] || {
    label: categoryKey.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
    color: "text-zinc-400",
    bgColor: "bg-zinc-500/10",
  };
  const Icon = CATEGORY_ICONS[categoryKey] || UilGlobe;

  const [items, setItems] = useState<IOCItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const fetchData = async () => {
    try {
      const resp = await fetch(`/api/intel/iocs/${categoryKey}?limit=20`);
      if (!resp.ok) return;
      const data = await resp.json();
      setItems(data.data || []);
      setTotal(data.total || 0);
    } catch { /* empty */ } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(fetchData, 5 * 60 * 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [categoryKey]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <Card className="bg-card/50 backdrop-blur h-full overflow-hidden">
        <CardContent className="flex items-center justify-center h-full">
          <UilSync size={16} className="animate-spin text-zinc-500" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/50 backdrop-blur h-full overflow-hidden">
      <CardContent className="p-3 h-full flex flex-col gap-2 min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className={`w-6 h-6 rounded-md ${cfg.bgColor} flex items-center justify-center shrink-0`}>
              <Icon size={14} className={cfg.color} />
            </div>
            <span className={`text-xs font-semibold ${cfg.color} truncate`}>{cfg.label}</span>
          </div>
          <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 shrink-0">
            {total.toLocaleString()}
          </Badge>
        </div>

        {/* IOC List */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="space-y-0.5">
            {items.length === 0 ? (
              <div className="flex items-center justify-center h-16 text-zinc-600 text-xs">
                No data
              </div>
            ) : (
              items.map((item, i) => (
                <div
                  key={`${item.ioc_value}-${i}`}
                  className="flex items-center gap-1.5 px-1.5 py-1 rounded hover:bg-zinc-800/50 transition-colors group min-w-0 animate-in fade-in-0 duration-200 fill-mode-both"
                  style={{ animationDelay: `${i * 20}ms` }}
                >
                  <div className={`w-1 h-1 rounded-full shrink-0 ${
                    item.severity === "high" ? "bg-red-500" :
                    item.severity === "medium" ? "bg-yellow-500" : "bg-zinc-500"
                  }`} />
                  <span
                    className="text-[10px] font-mono text-zinc-300 truncate min-w-0 flex-1"
                    title={item.ioc_value}
                  >
                    {item.ioc_value}
                  </span>
                  <span className="text-[9px] text-zinc-700 shrink-0 tabular-nums">
                    {timeAgo(item.last_seen)}
                  </span>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
