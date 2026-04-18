// Adapted from shadcnblocks stats-card1 — security themed
import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface SecurityStatsCardProps {
  title?: string;
  value?: string;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  accentColor?: string;
  className?: string;
}

const SecurityStatsCard = ({
  title = "Total Threats",
  value = "0",
  change,
  changeLabel = "from last scan",
  icon,
  accentColor = "text-primary",
  className,
}: SecurityStatsCardProps) => {
  const hasChange = change !== undefined;
  const isPositive = hasChange && change >= 0;
  const isNeutral = change === 0;

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          {title}
        </CardTitle>
        {icon && (
          <div className={cn("opacity-70", accentColor)}>{icon}</div>
        )}
      </CardHeader>
      <CardContent>
        <div className={cn("text-3xl font-bold font-mono", accentColor)}>
          {value}
        </div>
        {hasChange && (
          <div className="mt-1.5 flex items-center gap-1 text-xs">
            {isNeutral ? (
              <Minus className="size-3.5 text-muted-foreground" />
            ) : isPositive ? (
              <TrendingUp className="size-3.5 text-emerald-500" />
            ) : (
              <TrendingDown className="size-3.5 text-red-500" />
            )}
            <span
              className={
                isNeutral
                  ? "text-muted-foreground"
                  : isPositive
                  ? "text-emerald-500"
                  : "text-red-500"
              }
            >
              {isNeutral ? "No change" : `${isPositive ? "+" : ""}${change}%`}
            </span>
            <span className="text-muted-foreground">{changeLabel}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export { SecurityStatsCard };
