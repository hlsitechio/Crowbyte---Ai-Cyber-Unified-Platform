"use client";

import { Bar, BarChart, XAxis, YAxis } from "recharts";

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

interface ChartCard4Props {
  title?: string;
  description?: string;
  className?: string;
}

const chartData = [
  { name: "Chrome", value: 4520 },
  { name: "Safari", value: 3210 },
  { name: "Firefox", value: 1890 },
  { name: "Edge", value: 1240 },
  { name: "Other", value: 680 },
];

const chartConfig = {
  value: {
    label: "Users",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

const ChartCard4 = ({
  title = "Browser Usage",
  description = "Users by browser type",
  className,
}: ChartCard4Props) => {
  return (
    <Card className={cn("w-full max-w-2xl", className)}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-64 w-full">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 0, right: 10, left: 0, bottom: 0 }}
          >
            <XAxis
              type="number"
              axisLine={false}
              tickLine={false}
              fontSize={12}
            />
            <YAxis
              type="category"
              dataKey="name"
              axisLine={false}
              tickLine={false}
              fontSize={12}
              width={80}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar
              dataKey="value"
              fill="var(--color-value)"
              radius={[0, 4, 4, 0]}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};

export { ChartCard4 };
