import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { UilExclamationTriangle, UilClock, UilExternalLinkAlt, UilSync } from "@iconscout/react-unicons";
import { NumberTicker } from "@/components/ui/number-ticker";
import { useToast } from "@/hooks/use-toast";
import type { WidgetProps } from "../types";

interface CVE {
  id: string;
  description: string;
  severity: string;
  publishedDate: string;
  cvssScore: number;
}

const getSeverityColor = (severity: string) => {
  switch (severity.toUpperCase()) {
    case "CRITICAL": return "bg-transparent text-red-500";
    case "HIGH": return "bg-transparent text-orange-500";
    case "MEDIUM": return "bg-transparent text-amber-500";
    case "LOW": return "bg-transparent text-emerald-500";
    default: return "bg-zinc-600/15 text-zinc-500";
  }
};

export default function CVEAlertsWidget(_props: WidgetProps) {
  const { toast } = useToast();
  const [cves, setCves] = useState<CVE[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchCVEs = async () => {
    try {
      setLoading(true);
      const { supabase } = await import("@/lib/supabase");
      const { data, error } = await supabase
        .from("cves")
        .select("*")
        .order("cvss_score", { ascending: false })
        .order("published_date", { ascending: false })
        .limit(5);

      if (error || !data || data.length === 0) {
        setCves([]);
      } else {
        setCves(data.map((item: any) => ({
          id: item.cve_id || item.id,
          description: item.description || "No description available",
          severity: item.severity || "UNKNOWN",
          publishedDate: item.published_date,
          cvssScore: item.cvss_score || 0,
        })));
      }
    } catch {
      setCves([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCVEs(); }, []);

  return (
    <Card className="bg-card/50 backdrop-blur h-full overflow-hidden">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-red-500">
              <UilExclamationTriangle size={20} className="animate-pulse" />
              Latest CVE Alerts
            </CardTitle>
            <CardDescription>Top CVEs tracked by CrowByte Sentinel</CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={fetchCVEs} disabled={loading} className="h-8 px-3">
            <UilSync size={16} className={`mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {cves.map((cve, idx) => (
              <div
                key={cve.id}
                className="rounded-lg p-4 ring-1 ring-white/[0.06] transition-all hover:bg-primary/5 hover:ring-white/[0.1] cursor-pointer active:scale-[0.98] animate-in fade-in-0 slide-in-from-bottom-2 duration-300 fill-mode-both"
                style={{ animationDelay: `${idx * 60}ms` }}
                onClick={() => {
                  const text = `${cve.id} | ${cve.severity} | CVSS ${cve.cvssScore}\n${cve.description}\nPublished: ${new Date(cve.publishedDate).toLocaleDateString()}\nhttps://nvd.nist.gov/vuln/detail/${cve.id}`;
                  navigator.clipboard.writeText(text);
                  toast({ title: "Copied", description: `${cve.id} details copied to clipboard` });
                }}
              >
                <div className="flex items-start justify-between mb-2 min-w-0 gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono font-bold text-primary text-xs truncate">{cve.id}</span>
                    <span className={`text-xs px-1.5 py-0.5 ${getSeverityColor(cve.severity)}`}>{cve.severity}</span>
                  </div>
                  <span className="text-lg font-bold text-primary">
                    <NumberTicker value={cve.cvssScore} decimalPlaces={1} className="text-inherit tabular-nums" />
                  </span>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{cve.description}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <UilClock size={12} />
                    {new Date(cve.publishedDate).toLocaleDateString()}
                  </div>
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs"
                    onClick={(e) => { e.stopPropagation(); window.open(`https://nvd.nist.gov/vuln/detail/${cve.id}`, "_blank"); }}>
                    <UilExternalLinkAlt size={12} className="mr-1" /> View
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
