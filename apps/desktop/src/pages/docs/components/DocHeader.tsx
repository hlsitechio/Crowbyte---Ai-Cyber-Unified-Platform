import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, Clock, Warning } from "@phosphor-icons/react";
import type { Icon as PhosphorIcon } from "@phosphor-icons/react";

function StatusBadge({ status }: { status: "ready" | "beta" | "dev" }) {
  const config = {
    ready: { bg: "bg-transparent text-emerald-500 border-transparent", icon: CheckCircle, label: "READY" },
    beta: { bg: "bg-transparent text-yellow-500 border-transparent", icon: Clock, label: "BETA" },
    dev: { bg: "bg-transparent text-orange-500 border-transparent", icon: Warning, label: "DEV" },
  }[status];
  return (
    <Badge className={config.bg}>
      <config.icon size={12} weight="bold" className="mr-1" />{config.label}
    </Badge>
  );
}

export { StatusBadge };

export function DocHeader({ icon: Icon, title, description, status }: {
  icon: PhosphorIcon;
  title: string;
  description: string;
  status?: "ready" | "beta" | "dev";
}) {
  return (
    <div className="space-y-2 mb-6">
      <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
        <Icon size={32} weight="duotone" className="text-primary" />
        {title}
        {status && <StatusBadge status={status} />}
      </h1>
      <p className="text-muted-foreground">{description}</p>
      <Separator />
    </div>
  );
}
