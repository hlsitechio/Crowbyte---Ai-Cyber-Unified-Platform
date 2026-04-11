import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UilChartBar, UilCheckCircle } from "@iconscout/react-unicons";
function Feature({ text }: { text: string }) {
  return (
    <li className="text-sm flex items-start gap-2 text-emerald-500">
      <UilCheckCircle size={14} className="mt-0.5 shrink-0" /> {text}
    </li>
  );
}

export function AnalyticsSection() {
  return (
    <div className="space-y-6">
      <div className="space-y-2 mb-6">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <UilChartBar size={32} className="text-primary" />
          Analytics
        </h1>
        <p className="text-muted-foreground">Usage metrics, activity tracking, and performance insights</p>
        <div className="h-px bg-border" />
      </div>

      <Card className="border-primary/30 bg-card/50 backdrop-blur">
        <CardHeader><CardTitle>Dashboard Metrics</CardTitle></CardHeader>
        <CardContent>
          <ul className="space-y-1.5">
            <Feature text="Tool usage statistics — most used tools and categories" />
            <Feature text="CVE tracking metrics — saved, bookmarked, by severity" />
            <Feature text="Activity timeline — daily operations and findings" />
            <Feature text="Knowledge base growth over time" />
            <Feature text="AI chat usage — messages, tokens, model distribution" />
            <Feature text="Interactive charts with Recharts visualizations" />
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
