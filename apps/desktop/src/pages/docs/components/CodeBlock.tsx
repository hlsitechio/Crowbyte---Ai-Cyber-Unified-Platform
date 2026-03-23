export function CodeBlock({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-sm font-mono bg-zinc-900 p-4 rounded-lg border border-border/50 space-y-1">
      {children}
    </div>
  );
}
