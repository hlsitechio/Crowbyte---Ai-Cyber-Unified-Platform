export function FeatureList({ items }: { items: { text: string; status?: "done" | "warn" | "info" }[] }) {
  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className={`text-sm flex items-start gap-2 ${
          item.status === "done" ? "text-green-500" : item.status === "warn" ? "text-yellow-500" : "text-muted-foreground"
        }`}>
          {item.status === "done" ? "+" : item.status === "warn" ? "~" : "-"} {item.text}
        </li>
      ))}
    </ul>
  );
}
