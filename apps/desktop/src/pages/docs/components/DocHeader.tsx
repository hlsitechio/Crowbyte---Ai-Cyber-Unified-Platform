import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import type { LucideIcon } from "lucide-react";

function StatusBadge({ status }: { status: "ready" | "beta" | "dev" }) {
  const config = {
    ready: { bg: "bg-green-500/20 text-green-500 border-green-500/30", icon: CheckCircle2, label: "READY" },
    beta: { bg: "bg-yellow-500/20 text-yellow-500 border-yellow-500/30", icon: Clock, label: "BETA" },
    dev: { bg: "bg-orange-500/20 text-orange-500 border-orange-500/30", icon: AlertTriangle, label: "DEV" },
  }[status];
  return (
    <Badge className={config.bg}>
      <config.icon className="h-3 w-3 mr-1" />{config.label}
    </Badge>
  );
}

export { StatusBadge };

export function DocHeader({ icon: Icon, title, description, status }: {
  icon: LucideIcon;
  title: string;
  description: string;
  status?: "ready" | "beta" | "dev";
}) {
  return (
    <div className="space-y-2 mb-6">
      <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
        <Icon className="h-8 w-8 text-primary" />
        {title}
        {status && <StatusBadge status={status} />}
      </h1>
      <p className="text-muted-foreground">{description}</p>
      <Separator />
    </div>
  );
}
