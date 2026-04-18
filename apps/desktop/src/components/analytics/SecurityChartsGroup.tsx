// Adapted from shadcnblocks chart-group1 — CVE + IOC dual chart group
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
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

interface ChartDataPoint {
  label: string;
  value: number;
}

interface SecurityChartsGroupProps {
  leftTitle?: string;
  leftDescription?: string;
  leftData?: ChartDataPoint[];
  leftYFormat?: (v: number) => string;
  rightTitle?: string;
  rightDescription?: string;
  rightData?: ChartDataPoint[];
  height?: number;
  className?: string;
}

const leftConfig: ChartConfig = {
  value: { label: "CVEs", color: "var(--chart-1)" },
};

const rightConfig: ChartConfig = {
  value: { label: "IOCs", color: "var(--chart-2)" },
};

const SecurityChartsGroup = ({
  leftTitle = "CVE Ingestion",
  leftDescription = "New CVEs ingested per day",
  leftData = [],
  leftYFormat,
  rightTitle = "Threat IOCs",
  rightDescription = "IOCs detected per day",
  rightData = [],
  height = 200,
  className,
}: SecurityChartsGroupProps) => {
  return (
    <div className={cn("grid gap-4 md:grid-cols-2", className)}>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">{leftTitle}</CardTitle>
          <CardDescription className="text-xs">{leftDescription}</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <ChartContainer config={leftConfig} className="w-full" style={{ height }}>
            <AreaChart
              data={leftData.map((d) => ({ month: d.label, value: d.value }))}
              margin={{ top: 4, right: 4, left: -16, bottom: 0 }}
            >
              <defs>
                <linearGradient id="cveGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-value)" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="var(--color-value)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" strokeOpacity={0.5} />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tickMargin={8} fontSize={11} tick={{ fill: "var(--muted-foreground)" }} />
              <YAxis
                axisLine={false}
                tickLine={false}
                tickMargin={4}
                fontSize={11}
                tick={{ fill: "var(--muted-foreground)" }}
                tickFormatter={leftYFormat}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area type="monotone" dataKey="value" stroke="var(--color-value)" strokeWidth={2} fill="url(#cveGradient)" />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">{rightTitle}</CardTitle>
          <CardDescription className="text-xs">{rightDescription}</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <ChartContainer config={rightConfig} className="w-full" style={{ height }}>
            <BarChart
              data={rightData.map((d) => ({ month: d.label, value: d.value }))}
              margin={{ top: 4, right: 4, left: -16, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" strokeOpacity={0.5} />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tickMargin={8} fontSize={11} tick={{ fill: "var(--muted-foreground)" }} />
              <YAxis axisLine={false} tickLine={false} tickMargin={4} fontSize={11} tick={{ fill: "var(--muted-foreground)" }} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="value" fill="var(--color-value)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export { SecurityChartsGroup };
