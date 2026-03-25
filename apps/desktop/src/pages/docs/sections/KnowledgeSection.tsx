import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen } from "@phosphor-icons/react";
import { DocHeader, FeatureList, CodeBlock } from "../components";

export function KnowledgeSection() {
  return (
    <div className="space-y-6">
      <DocHeader icon={BookOpen} title="Knowledge Base" description="Cloud-synced documentation, findings, and research storage" status="ready" />

      <Card><CardHeader><CardTitle>How it works</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>The Knowledge Base stores entries in the Supabase <code className="text-primary">knowledge_base</code> table,
            shared in real-time across all CrowByte instances and Claude Code CLI sessions.</p>
          <p>Entries can be created from the UI, from the <code className="text-primary">kb</code> CLI tool in any terminal,
            or by asking the AI in Chat. File attachments are stored in Supabase Storage (50MB limit).</p>
        </CardContent></Card>

      <Card><CardHeader><CardTitle>UI Features</CardTitle></CardHeader>
        <CardContent><FeatureList items={[
          { text: "Card-based entry display with title, content preview, category badge, priority", status: "done" },
          { text: "Categories: research, vulnerabilities, tools, documentation, news", status: "done" },
          { text: "Priority levels: P1 (critical) through P5 (low) with auto-detection", status: "done" },
          { text: "File upload via drag-and-drop or button (50MB, Supabase Storage)", status: "done" },
          { text: "Multi-select with checkboxes + bulk delete", status: "done" },
          { text: "Search bar: filter by title, content, or tags", status: "done" },
          { text: "Category filter tabs", status: "done" },
          { text: "Expandable entries with full content view", status: "done" },
          { text: "Edit entries inline", status: "done" },
          { text: "Cloud sync — edits appear on all instances immediately", status: "done" },
        ]} /></CardContent></Card>

      <Card><CardHeader><CardTitle>Supabase Schema: knowledge_base</CardTitle></CardHeader>
        <CardContent>
          <CodeBlock>
            <div><span className="text-primary">title</span>       <span className="text-zinc-500">TEXT     — Entry title</span></div>
            <div><span className="text-primary">content</span>     <span className="text-zinc-500">TEXT     — Full content (markdown)</span></div>
            <div><span className="text-primary">category</span>    <span className="text-zinc-500">TEXT     — research / vulnerabilities / tools / documentation / news</span></div>
            <div><span className="text-primary">priority</span>    <span className="text-zinc-500">TEXT     — P1 (critical) through P5 (low)</span></div>
            <div><span className="text-primary">tags</span>        <span className="text-zinc-500">TEXT[]   — Array of searchable tags</span></div>
            <div><span className="text-primary">file_url</span>    <span className="text-zinc-500">TEXT     — Supabase Storage URL</span></div>
            <div><span className="text-primary">user_id</span>     <span className="text-zinc-500">UUID     — Owner (RLS enforced)</span></div>
          </CodeBlock>
        </CardContent></Card>

      <Card><CardHeader><CardTitle>CLI: kb</CardTitle><CardDescription>/usr/local/bin/kb</CardDescription></CardHeader>
        <CardContent>
          <CodeBlock>
            <div className="text-zinc-500"># Save an entry</div>
            <div><span className="text-emerald-500">kb save</span> "PAN-OS RCE Analysis" \</div>
            <div>  --content "CVE-2024-3400 allows unauthenticated RCE..." \</div>
            <div>  --category vulnerabilities --priority P1 \</div>
            <div>  --tags "paloalto,rce,critical"</div>
            <div>&nbsp;</div>
            <div className="text-zinc-500"># Pipe command output</div>
            <div>nmap -sV -sC target.com | <span className="text-emerald-500">kb pipe</span> "Target.com Full Scan" \</div>
            <div>  --category research --priority P3</div>
            <div>&nbsp;</div>
            <div className="text-zinc-500"># Search and list</div>
            <div><span className="text-emerald-500">kb search</span> "RCE"</div>
            <div><span className="text-emerald-500">kb recent</span> -n 10</div>
            <div><span className="text-emerald-500">kb list</span> --category tools</div>
          </CodeBlock>
        </CardContent></Card>
    </div>
  );
}
