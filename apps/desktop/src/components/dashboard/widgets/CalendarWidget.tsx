import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { UilCalendarAlt } from "@iconscout/react-unicons";
import { getUserTimezone, getUserLocale, onTimezoneChange } from "@/services/timezone";
import type { WidgetProps } from "../types";

export default function CalendarWidget(_props: WidgetProps) {
  const [now, setNow] = useState(new Date());
  const [locale, setLocale] = useState(getUserLocale());
  const [tz, setTz] = useState(getUserTimezone());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Listen for timezone/locale changes from Settings
  useEffect(() => {
    const handler = () => {
      setLocale(getUserLocale());
      setTz(getUserTimezone());
    };
    window.addEventListener("crowbyte-timezone-changed", handler);
    return () => window.removeEventListener("crowbyte-timezone-changed", handler);
  }, []);

  const formatted = now.toLocaleDateString(locale, {
    timeZone: tz,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <Card className="border-primary/30 bg-card/50 backdrop-blur">
      <CardContent className="p-3">
        <div className="flex items-center gap-2">
          <UilCalendarAlt size={14} className="text-primary shrink-0" />
          <span className="text-xs text-zinc-200 truncate">{formatted}</span>
        </div>
      </CardContent>
    </Card>
  );
}
