import { cn } from "@/lib/utils";

interface BorderBeamProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: number;
  duration?: number;
  delay?: number;
  colorFrom?: string;
  colorTo?: string;
}

export function BorderBeam({
  className,
  size = 200,
  duration = 15,
  delay = 0,
  colorFrom = "#3b82f6",
  colorTo = "#f97316",
  ...props
}: BorderBeamProps) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 rounded-[inherit] [border:1px_solid_transparent]",
        className
      )}
      style={{
        maskClip: "padding-box, border-box",
        WebkitMaskClip: "padding-box, border-box",
        maskComposite: "intersect",
        WebkitMaskComposite: "source-in",
        maskImage: `linear-gradient(transparent, transparent), conic-gradient(from calc(var(--border-beam-start, 0) * 1turn), ${colorFrom}, ${colorTo}, transparent 25%)`,
        WebkitMaskImage: `linear-gradient(transparent, transparent), conic-gradient(from calc(var(--border-beam-start, 0) * 1turn), ${colorFrom}, ${colorTo}, transparent 25%)`,
        animation: `border-beam-spin ${duration}s linear ${delay}s infinite`,
      }}
      {...props}
    >
      <style>{`
        @keyframes border-beam-spin {
          from { --border-beam-start: 0; }
          to { --border-beam-start: 1; }
        }
        @property --border-beam-start {
          syntax: "<number>";
          inherits: false;
          initial-value: 0;
        }
      `}</style>
    </div>
  );
}
