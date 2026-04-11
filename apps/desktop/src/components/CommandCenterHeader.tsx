import { useState, useEffect } from "react";
import { UilShield } from "@iconscout/react-unicons";
import { Card, CardContent } from "@/components/ui/card";

const CommandCenterHeader = () => {
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
    <Card className="border-primary/30 bg-card/50 backdrop-blur">
      <CardContent className="p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <UilShield size={16} className="text-primary" />
            <span className="text-xs font-semibold text-primary">Command Center</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-500">{date}</span>
            <span className="text-sm font-mono font-bold text-primary">{time}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CommandCenterHeader;
