import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UilBookmark, UilFolderOpen, UilCheckCircle } from "@iconscout/react-unicons";
function Feature({ text }: { text: string }) {
  return (
    <li className="text-sm flex items-start gap-2 text-emerald-500">
      <UilCheckCircle size={14} className="mt-0.5 shrink-0" /> {text}
    </li>
  );
}

export function BookmarksSection() {
  return (
    <div className="space-y-6">
      <div className="space-y-2 mb-6">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <UilBookmark size={32} className="text-primary" />
          Bookmarks
        </h1>
        <p className="text-muted-foreground">Save, categorize, and manage security resource links</p>
        <div className="h-px bg-border" />
      </div>

      <Card className="border-primary/30 bg-card/50 backdrop-blur">
        <CardHeader><CardTitle className="flex items-center gap-2"><UilFolderOpen size={20} className="text-blue-500" /> Organized Bookmarks</CardTitle></CardHeader>
        <CardContent>
          <ul className="space-y-1.5">
            <Feature text="Save URLs with title, description, and tags" />
            <Feature text="Custom categories with icons and colors" />
            <Feature text="Automatic favicon fetching" />
            <Feature text="Full-text search across all bookmarks" />
            <Feature text="Tag-based filtering" />
            <Feature text="Cloud-synced across devices" />
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
