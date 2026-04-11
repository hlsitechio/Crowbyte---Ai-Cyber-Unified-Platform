import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { UilPlus, UilTimes } from "@iconscout/react-unicons";
import { getUserTimezone } from "@/services/timezone";
import type { WidgetProps } from "../types";

interface ClockZone {
  label: string;
  timezone: string;
}

const STORAGE_KEY = "crowbyte-clock-zones";

function getDefaultZones(): ClockZone[] {
  return [
    { label: "Local", timezone: getUserTimezone() },
    { label: "UTC", timezone: "UTC" },
    { label: "PST", timezone: "America/Los_Angeles" },
    { label: "London", timezone: "Europe/London" },
  ];
}

const COMMON_TIMEZONES = [
  { label: "UTC", tz: "UTC" },
  { label: "EST", tz: "America/New_York" },
  { label: "CST", tz: "America/Chicago" },
  { label: "MST", tz: "America/Denver" },
  { label: "PST", tz: "America/Los_Angeles" },
  { label: "London", tz: "Europe/London" },
  { label: "Paris", tz: "Europe/Paris" },
  { label: "Berlin", tz: "Europe/Berlin" },
  { label: "Moscow", tz: "Europe/Moscow" },
  { label: "Dubai", tz: "Asia/Dubai" },
  { label: "Mumbai", tz: "Asia/Kolkata" },
  { label: "Singapore", tz: "Asia/Singapore" },
  { label: "Tokyo", tz: "Asia/Tokyo" },
  { label: "Sydney", tz: "Australia/Sydney" },
  { label: "Auckland", tz: "Pacific/Auckland" },
  { label: "Sao Paulo", tz: "America/Sao_Paulo" },
  { label: "Toronto", tz: "America/Toronto" },
  { label: "Hawaii", tz: "Pacific/Honolulu" },
];

function loadZones(): ClockZone[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return getDefaultZones();
}

function saveZones(zones: ClockZone[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(zones));
}

export default function ClockWidget({ editMode }: WidgetProps) {
  const [now, setNow] = useState(new Date());
  const [zones, setZones] = useState<ClockZone[]>(loadZones);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Close add dropdown when leaving edit mode
  useEffect(() => {
    if (!editMode) setShowAdd(false);
  }, [editMode]);

  // Sync "Local" clock when user changes timezone in Settings
  useEffect(() => {
    const handler = () => {
      const newTz = getUserTimezone();
      setZones(prev => {
        const updated = prev.map(z => z.label === "Local" ? { ...z, timezone: newTz } : z);
        saveZones(updated);
        return updated;
      });
    };
    window.addEventListener("crowbyte-timezone-changed", handler);
    return () => window.removeEventListener("crowbyte-timezone-changed", handler);
  }, []);

  const addZone = (label: string, timezone: string) => {
    if (zones.some(z => z.timezone === timezone)) return;
    const updated = [...zones, { label, timezone }];
    setZones(updated);
    saveZones(updated);
  };

  const removeZone = (timezone: string) => {
    if (zones.length <= 1) return;
    const updated = zones.filter(z => z.timezone !== timezone);
    setZones(updated);
    saveZones(updated);
  };

  const formatTime = (tz: string) => {
    try {
      return now.toLocaleTimeString("en-US", {
        timeZone: tz,
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    } catch {
      return "--:--";
    }
  };

  const formatSeconds = () => {
    return `:${now.getSeconds().toString().padStart(2, "0")}`;
  };

  const available = COMMON_TIMEZONES.filter(t => !zones.some(z => z.timezone === t.tz));

  return (
    <Card className="border-primary/30 bg-card/50 backdrop-blur">
      <CardContent className="p-3">
        <div className="flex items-center">
          {/* Clocks */}
          <div className="flex items-center justify-center gap-5 flex-1">
            {zones.map((zone, i) => (
              <div key={zone.timezone} className="flex items-center gap-0 shrink-0">
                {i > 0 && <div className="w-px h-6 bg-zinc-700/40 mr-5" />}

                <div className="relative text-center min-w-[48px] group/clock">
                  {/* Remove — only in dashboard edit mode, on hover */}
                  {editMode && zones.length > 1 && (
                    <button
                      onClick={() => removeZone(zone.timezone)}
                      className="absolute -top-2.5 -right-2 z-10 w-4 h-4 rounded-full bg-red-500/80 items-center justify-center hover:bg-red-500 transition-all hidden group-hover/clock:flex"
                    >
                      <UilTimes size={8} className="text-white" />
                    </button>
                  )}
                  <div className="text-sm font-mono font-bold text-primary leading-none tracking-tight">
                    {formatTime(zone.timezone)}
                    <span className="text-primary/40 text-[10px]">{formatSeconds()}</span>
                  </div>
                  <div className="text-[9px] text-zinc-300 mt-0.5 leading-none">
                    {zone.label}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Right: add button — only in dashboard edit mode */}
          {editMode && available.length > 0 && (
            <div className="shrink-0 ml-4 relative">
              <button
                onClick={() => setShowAdd(!showAdd)}
                className={`p-1 rounded transition-colors ${showAdd ? "text-blue-400 bg-blue-500/10" : "text-zinc-600 hover:text-zinc-400"}`}
                title="Add timezone"
              >
                <UilPlus size={12} />
              </button>

              {/* Dropdown */}
              {showAdd && (
                <div className="absolute right-0 top-full mt-1 z-50 bg-zinc-900 border border-white/10 rounded-lg p-2 shadow-xl max-h-48 overflow-y-auto w-36">
                  {available.map((tz) => (
                    <button
                      key={tz.tz}
                      onClick={() => { addZone(tz.label, tz.tz); setShowAdd(false); }}
                      className="w-full text-left px-2 py-1 text-[11px] text-zinc-400 hover:text-white hover:bg-white/5 rounded transition-colors"
                    >
                      {tz.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
