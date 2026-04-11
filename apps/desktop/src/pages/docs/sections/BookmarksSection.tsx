import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UilBookmark } from "@iconscout/react-unicons";
import { DocHeader, FeatureList, CodeBlock } from "../components";

export function BookmarksSection() {
  return (
    <div className="space-y-6">
      <DocHeader icon={UilBookmark} title="Bookmarks" description="Save and organize URLs, resources, and references with categories and tags" status="ready" />

      <Card><CardHeader><CardTitle>How it works</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>The Bookmarks page stores URLs in the Supabase <code className="text-primary">bookmarks</code> table,
            organized by user-customizable categories. New users get 7 default categories and starter bookmarks.</p>
          <p>Each bookmark has a title, URL, optional description, category, tags, and auto-fetched favicon
            via Google's S2 favicon service.</p>
        </CardContent></Card>

      <Card><CardHeader><CardTitle>Features</CardTitle></CardHeader>
        <CardContent><FeatureList items={[
          { text: "Card-based display with title, URL, description, category badge", status: "done" },
          { text: "7 default categories: Tools, CVEs, News, Cyber, Research, Documentation, General", status: "done" },
          { text: "Custom category creation with icon and color picker", status: "done" },
          { text: "Category filter tabs", status: "done" },
          { text: "Tag support for cross-category search", status: "done" },
          { text: "Search by title, URL, or description (ilike on 3 fields)", status: "done" },
          { text: "Auto-fetched favicons via Google S2", status: "done" },
          { text: "External link button — opens URL in browser", status: "done" },
          { text: "Edit and delete bookmarks", status: "done" },
          { text: "Default starter bookmarks for new users", status: "done" },
          { text: "Cloud sync via Supabase", status: "done" },
        ]} /></CardContent></Card>

      <Card><CardHeader><CardTitle>Supabase Schema</CardTitle></CardHeader>
        <CardContent>
          <CodeBlock>
            <div className="text-zinc-500"># bookmarks table</div>
            <div><span className="text-primary">title</span>        <span className="text-zinc-500">TEXT     — Bookmark title</span></div>
            <div><span className="text-primary">url</span>          <span className="text-zinc-500">TEXT     — Full URL</span></div>
            <div><span className="text-primary">description</span>  <span className="text-zinc-500">TEXT     — Optional description</span></div>
            <div><span className="text-primary">category</span>     <span className="text-zinc-500">TEXT     — Category name</span></div>
            <div><span className="text-primary">tags</span>         <span className="text-zinc-500">TEXT[]   — Searchable tags</span></div>
            <div><span className="text-primary">favicon_url</span>  <span className="text-zinc-500">TEXT     — Auto-fetched favicon</span></div>
            <div>&nbsp;</div>
            <div className="text-zinc-500"># bookmark_categories table</div>
            <div><span className="text-primary">name</span>         <span className="text-zinc-500">TEXT     — Category name</span></div>
            <div><span className="text-primary">icon</span>         <span className="text-zinc-500">TEXT     — Lucide icon name</span></div>
            <div><span className="text-primary">color</span>        <span className="text-zinc-500">TEXT     — Hex color code</span></div>
          </CodeBlock>
        </CardContent></Card>
    </div>
  );
}
