// Adapted from shadcnblocks chart-card1 — threat trend area chart
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";

interface ThreatTrendChartProps {
  title?: string;
  description?: string;
  data?: { label: string; value: number; secondary?: number }[];
  dataKey?: string;
  secondaryKey?: string;
  valueLabel?: string;
  secondaryLabel?: string;
  height?: number;
  className?: string;
}

const chartConfig: ChartConfig = {
  value: {
    label: "Threats",
    color: "var(--chart-1)",
  },
  secondary: {
    label: "Resolved",
    color: "var(--chart-2)",
  },
};

const ThreatTrendChart = ({
  title = "Threat Activity",
  description = "New threats detected over time",
  data = [],
  valueLabel = "Threats",
  secondaryLabel = "Resolved",
  height = 200,
  className,
}: ThreatTrendChartProps) => {
  const cfg: ChartConfig = {
    value: { label: valueLabel, color: "var(--chart-1)" },
    secondary: { label: secondaryLabel, color: "var(--chart-2)" },
  };

  const hasSecondary = data.some((d) => d.secondary !== undefined);

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <CardDescription className="text-xs">{description}</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <ChartContainer config={cfg} className={`h-[${height}px] w-full`} style={{ height }}>
          <AreaChart
            data={data.map((d) => ({ month: d.label, ...d }))}
            margin={{ top: 4, right: 4, left: -16, bottom: 0 }}
          >
            <defs>
              <linearGradient id="threatGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-value)" stopOpacity={0.25} />
                <stop offset="100%" stopColor="var(--color-value)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="resolvedGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-secondary)" stopOpacity={0.2} />
                <stop offset="100%" stopColor="var(--color-secondary)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" strokeOpacity={0.5} />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tickMargin={8}
              fontSize={11}
              tick={{ fill: "var(--muted-foreground)" }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tickMargin={4}
              fontSize={11}
              tick={{ fill: "var(--muted-foreground)" }}
            />
            <ChartTooltip
              content={<ChartTooltipContent />}
              cursor={{ stroke: "var(--border)", strokeDasharray: "4 4" }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="var(--color-value)"
              strokeWidth={2}
              fill="url(#threatGradient)"
            />
            {hasSecondary && (
              <Area
                type="monotone"
                dataKey="secondary"
                stroke="var(--color-secondary)"
                strokeWidth={1.5}
                fill="url(#resolvedGradient)"
                strokeDasharray="4 2"
              />
            )}
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};

export { ThreatTrendChart };
