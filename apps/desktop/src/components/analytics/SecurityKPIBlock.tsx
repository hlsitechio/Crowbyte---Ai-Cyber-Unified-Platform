// Adapted from shadcnblocks stats8 — security KPI hero block
import { cn } from "@/lib/utils";

interface KPIStat {
  id: string;
  value: string;
  label: string;
  color?: string;
}

interface SecurityKPIBlockProps {
  heading?: string;
  description?: string;
  stats?: KPIStat[];
  className?: string;
}

const SecurityKPIBlock = ({
  heading = "Security Operations at a Glance",
  description = "Real-time metrics from your infrastructure and threat intelligence pipeline",
  stats = [],
  className,
}: SecurityKPIBlockProps) => {
  return (
    <div className={cn("w-full", className)}>
      <div className="flex flex-col gap-1 mb-8">
        <h2 className="text-xl font-bold text-foreground">{heading}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="grid gap-x-6 gap-y-8 grid-cols-2 md:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.id} className="flex flex-col gap-2">
            <div
              className={cn(
                "text-5xl font-bold font-mono tracking-tight",
                stat.color ?? "text-foreground"
              )}
            >
              {stat.value}
            </div>
            <p className="text-sm text-muted-foreground leading-snug">
              {stat.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export { SecurityKPIBlock };
