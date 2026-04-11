import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { UilWifi, UilExclamationTriangle, UilSync, UilGlobe } from "@iconscout/react-unicons";
import { ipStatusService, type IPStatusData } from "@/services/ip-status";
import { useToast } from "@/hooks/use-toast";
import type { WidgetProps } from "../types";

export default function NetworkStatusWidget(_props: WidgetProps) {
  const { toast } = useToast();
  const [ip, setIp] = useState<IPStatusData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchIP = async (force = false) => {
    try {
      setLoading(true);
      const status = await ipStatusService.getIPStatus(force);
      setIp(status);
    } catch {
      setIp({ ip: "Unavailable", isVPN: false, isProxy: false, connectionType: "unknown", lastChecked: new Date(), error: "Failed" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIP();
    const interval = setInterval(() => fetchIP(), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const refresh = async () => {
    await fetchIP(true);
    toast({ title: "IP Status Refreshed", description: `Your IP: ${ip?.ip}` });
  };

  if (loading && !ip) {
    return (
      <Card className="bg-card/50 backdrop-blur overflow-hidden">
        <CardContent className="p-3 flex items-center gap-2 text-xs text-muted-foreground">
          <UilSync size={12} className="animate-spin" /> Loading network status...
        </CardContent>
      </Card>
    );
  }

  if (!ip) return null;

  const isError = ip.error || ip.ip === "Unavailable";

  return (
    <Card className="bg-card/50 backdrop-blur overflow-hidden">
      <CardContent className="p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-[120px]">
            <UilWifi size={16} className="text-primary" />
            <span className="text-xs font-semibold text-primary">Network Status</span>
          </div>

          <div className="flex items-center gap-2 flex-1 flex-wrap">
            <span className="flex items-center gap-1.5 text-xs">
              <span className={`w-1.5 h-1.5 rounded-full ${isError ? "bg-red-500" : ip.isVPN ? "bg-emerald-500" : "bg-blue-500"}`} />
              <span className={isError ? "text-red-500" : ip.isVPN ? "text-emerald-500" : "text-blue-500"}>
                {isError ? "Offline" : ip.isVPN ? "Protected" : "Connected"}
              </span>
            </span>

            <Separator orientation="vertical" className="h-4" />

            {isError ? (
              <span className="flex items-center gap-1 text-xs text-red-500 font-mono">
                <UilExclamationTriangle size={12} /> {ip.ip}
              </span>
            ) : (
              <>
                <span className="text-xs text-muted-foreground">{ip.isVPN ? "VPN" : "IP"}:</span>
                <span className="text-xs font-mono font-semibold text-primary">{ip.ip}</span>
                {ip.country && <span className="text-xs text-muted-foreground">({ip.country})</span>}
              </>
            )}

            <Separator orientation="vertical" className="h-4" />

            <span className="flex items-center gap-1.5 text-xs">
              <span className={`w-1.5 h-1.5 rounded-full ${ip.isVPN ? "bg-emerald-500" : "bg-zinc-600"}`} />
              <span className={ip.isVPN ? "text-emerald-500" : "text-zinc-500"}>{ip.isVPN ? "VPN" : "No VPN"}</span>
            </span>

            {ip.vpnProvider && (
              <>
                <Separator orientation="vertical" className="h-4" />
                <span className="text-xs text-emerald-500 font-semibold">{"🔒"} {ip.vpnProvider}</span>
              </>
            )}

            {ip.localIP && (
              <>
                <Separator orientation="vertical" className="h-4" />
                <span className="text-xs text-muted-foreground">LAN:</span>
                <span className="text-xs font-mono text-amber-500">{ip.localIP}</span>
              </>
            )}

            {ip.dnsInfo?.isDNSLeak && (
              <>
                <Separator orientation="vertical" className="h-4" />
                <span className="flex items-center gap-1 text-xs text-red-500 animate-pulse">
                  <UilExclamationTriangle size={12} /> DNS LEAK!
                </span>
              </>
            )}
          </div>

          <Button variant="ghost" size="sm" onClick={refresh} disabled={loading} className="h-6 px-2">
            <UilSync size={12} className={loading ? "animate-spin" : ""} />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
