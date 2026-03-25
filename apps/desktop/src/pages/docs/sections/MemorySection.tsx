import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HardDrives } from "@phosphor-icons/react";
import { DocHeader, FeatureList, CodeBlock } from "../components";

export function MemorySection() {
  return (
    <div className="space-y-6">
      <DocHeader icon={HardDrives} title="Memory" description="Key-value fact storage for persistent AI memory across sessions" status="beta" />

      <Card><CardHeader><CardTitle>How it works</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>The Memory page provides a simple key-value fact store backed by Supabase (<code className="text-primary">memory_facts</code> table).
            Each fact has a key (label) and value (content), associated with the authenticated user.</p>
          <p>This is separate from Claude Code's memory system (.mci files, state.md). It's designed for
            <strong className="text-foreground">user-facing persistent facts</strong> that the AI agents can reference.</p>
        </CardContent></Card>

      <Card><CardHeader><CardTitle>Supabase Schema: memory_facts</CardTitle></CardHeader>
        <CardContent>
          <CodeBlock>
            <div><span className="text-primary">id</span>          <span className="text-zinc-500">UUID     — Primary key</span></div>
            <div><span className="text-primary">key</span>         <span className="text-zinc-500">TEXT     — Fact label (e.g., "preferred_tools")</span></div>
            <div><span className="text-primary">value</span>       <span className="text-zinc-500">TEXT     — Fact content (e.g., "nuclei, ffuf, sqlmap")</span></div>
            <div><span className="text-primary">user_id</span>     <span className="text-zinc-500">UUID     — Owner (RLS enforced)</span></div>
            <div><span className="text-primary">created_at</span>  <span className="text-zinc-500">TIMESTAMPTZ</span></div>
            <div><span className="text-primary">updated_at</span>  <span className="text-zinc-500">TIMESTAMPTZ</span></div>
          </CodeBlock>
        </CardContent></Card>

      <Card><CardContent className="pt-6"><FeatureList items={[
        { text: "CRUD operations: create, read, update, delete memory facts", status: "done" },
        { text: "Key-value pairs with timestamps", status: "done" },
        { text: "Inline editing for both key and value", status: "done" },
        { text: "Confirmation dialog for deletions", status: "done" },
        { text: "Sorted by updated_at (most recent first)", status: "done" },
        { text: "Auth-required — facts scoped to user", status: "done" },
        { text: "Supabase-backed persistence", status: "done" },
      ]} /></CardContent></Card>
    </div>
  );
}
