// Adapted from shadcnblocks chart-card3 — severity distribution bar chart
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";
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

const SEVERITY_FILL: Record<string, string> = {
  Critical: "#ef4444",
  High: "#f97316",
  Medium: "#eab308",
  Low: "#22c55e",
  Info: "#64748b",
};

interface SeverityBarChartProps {
  title?: string;
  description?: string;
  data?: { name: string; value: number; color?: string }[];
  height?: number;
  className?: string;
}

const chartConfig: ChartConfig = {
  value: {
    label: "Count",
    color: "var(--chart-1)",
  },
};

const SeverityBarChart = ({
  title = "Severity Distribution",
  description = "CVEs by severity level",
  data = [],
  height = 200,
  className,
}: SeverityBarChartProps) => {
  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <CardDescription className="text-xs">{description}</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <ChartContainer config={chartConfig} className="w-full" style={{ height }}>
          <BarChart
            data={data}
            margin={{ top: 4, right: 4, left: -16, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" strokeOpacity={0.5} />
            <XAxis
              dataKey="name"
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
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {data.map((entry, idx) => (
                <Cell
                  key={idx}
                  fill={entry.color ?? SEVERITY_FILL[entry.name] ?? "var(--chart-1)"}
                  fillOpacity={0.9}
                />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};

export { SeverityBarChart };
