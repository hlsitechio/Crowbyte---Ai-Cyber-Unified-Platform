"use client";

import { TrendingDown, TrendingUp } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";

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

interface Stat {
  title: string;
  value: string;
  change: number;
  sparklineData: { day: string; value: number }[];
}

interface ChartGroup3Props {
  stats?: Stat[];
  className?: string;
}

const defaultStats: Stat[] = [
  {
    title: "Total Revenue",
    value: "$45,231",
    change: 20.1,
    sparklineData: [
      { day: "Mon", value: 6200 },
      { day: "Tue", value: 5800 },
      { day: "Wed", value: 7100 },
      { day: "Thu", value: 6900 },
      { day: "Fri", value: 8200 },
      { day: "Sat", value: 5400 },
      { day: "Sun", value: 5631 },
    ],
  },
  {
    title: "Avg Order Value",
    value: "$142",
    change: 8.5,
    sparklineData: [
      { day: "Mon", value: 128 },
      { day: "Tue", value: 135 },
      { day: "Wed", value: 142 },
      { day: "Thu", value: 138 },
      { day: "Fri", value: 155 },
      { day: "Sat", value: 148 },
      { day: "Sun", value: 142 },
    ],
  },
  {
    title: "Conversion Rate",
    value: "3.2%",
    change: -2.4,
    sparklineData: [
      { day: "Mon", value: 3.8 },
      { day: "Tue", value: 3.5 },
      { day: "Wed", value: 3.4 },
      { day: "Thu", value: 3.6 },
      { day: "Fri", value: 3.1 },
      { day: "Sat", value: 2.9 },
      { day: "Sun", value: 3.2 },
    ],
  },
];

const chartData = [
  { month: "Jan", value: 18600 },
  { month: "Feb", value: 30500 },
  { month: "Mar", value: 23700 },
  { month: "Apr", value: 27300 },
  { month: "May", value: 20900 },
  { month: "Jun", value: 31400 },
];

const chartConfig = {
  value: { label: "Revenue", color: "var(--chart-1)" },
} satisfies ChartConfig;

const ChartGroup3 = ({ stats = defaultStats, className }: ChartGroup3Props) => {
  return (
    <section className={cn("py-32", className)}>
      <div className="container space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Revenue Trend</CardTitle>
            <CardDescription>Monthly revenue over time</CardDescription>
          </CardHeader>
          <CardContent className="pb-4">
            <ChartContainer config={chartConfig} className="h-64 w-full">
              <AreaChart
                data={chartData}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient
                    id="chartGradient3"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor="var(--color-value)"
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="100%"
                      stopColor="var(--color-value)"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tickMargin={8}
                  fontSize={12}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tickMargin={8}
                  fontSize={12}
                  tickFormatter={(v) => `$${v / 1000}k`}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="var(--color-value)"
                  strokeWidth={2}
                  fill="url(#chartGradient3)"
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-3">
          {stats.map((stat, index) => {
            const isPositive = stat.change >= 0;
            const sparklineColor = isPositive ? "#22c55e" : "#ef4444";
            return (
              <Card key={index} className="overflow-hidden">
                <CardHeader className="pb-0">
                  <CardDescription>Last 7 days</CardDescription>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{stat.title}</CardTitle>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold">{stat.value}</span>
                      <div className="flex items-center gap-1 text-sm">
                        {isPositive ? (
                          <TrendingUp className="size-4 text-green-500" />
                        ) : (
                          <TrendingDown className="size-4 text-red-500" />
                        )}
                        <span
                          className={
                            isPositive ? "text-green-500" : "text-red-500"
                          }
                        >
                          {isPositive ? "+" : ""}
                          {stat.change}%
                        </span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pb-0">
                  <div className="h-16 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={stat.sparklineData}
                        margin={{ top: 8, right: 0, left: 0, bottom: 0 }}
                      >
                        <XAxis
                          dataKey="day"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 10 }}
                          tickMargin={4}
                        />
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke={sparklineColor}
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export { ChartGroup3 };
