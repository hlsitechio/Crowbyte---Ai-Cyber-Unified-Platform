import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UilDatabase } from "@iconscout/react-unicons";
import { DocHeader, FeatureList, CodeBlock } from "../components";

export function SupabaseSection() {
  return (
    <div className="space-y-6">
      <DocHeader icon={UilDatabase} title="Supabase Backend" description="Cloud PostgreSQL database, auth, real-time subscriptions, and storage" status="ready" />

      <Card><CardHeader><CardTitle>How it works</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>Supabase is the backbone of CrowByte's persistence layer. Every page that stores data uses Supabase as the single source of truth.
            Multiple CrowByte instances and CLI tools (<code className="text-primary">cve-db</code>, <code className="text-primary">kb</code>)
            share the same data in real-time.</p>
        </CardContent></Card>

      <Card><CardHeader><CardTitle>Full Table Schema</CardTitle></CardHeader>
        <CardContent>
          <CodeBlock>
            <div className="text-zinc-500"># Core data tables</div>
            <div><span className="text-primary">cves</span>              <span className="text-zinc-500">CVE tracking (cve_id UNIQUE, severity, cvss, vector, CWE, CPE, refs, exploit_status, bookmarked)</span></div>
            <div><span className="text-primary">knowledge_base</span>    <span className="text-zinc-500">Research entries (title, content, category, priority, tags, file_url)</span></div>
            <div><span className="text-primary">custom_agents</span>     <span className="text-zinc-500">Agent configs (name, instructions, model, category, capabilities JSONB, starters)</span></div>
            <div><span className="text-primary">red_team_ops</span>      <span className="text-zinc-500">Operations (name, target, type, status, findings JSONB[], progress)</span></div>
            <div><span className="text-primary">bookmarks</span>         <span className="text-zinc-500">URLs (title, url, description, category, tags, favicon_url)</span></div>
            <div><span className="text-primary">bookmark_categories</span> <span className="text-zinc-500">Categories (name, icon, color)</span></div>
            <div>&nbsp;</div>
            <div className="text-zinc-500"># User tables</div>
            <div><span className="text-primary">profiles</span>          <span className="text-zinc-500">User profiles (linked to auth.users)</span></div>
            <div><span className="text-primary">user_settings</span>     <span className="text-zinc-500">Preferences (workspace_name, profile_picture, default_model, theme)</span></div>
            <div>&nbsp;</div>
            <div className="text-zinc-500"># System tables</div>
            <div><span className="text-primary">endpoints</span>         <span className="text-zinc-500">Fleet devices (hostname, os, ip, type, status, metrics JSONB)</span></div>
            <div><span className="text-primary">analytics</span>         <span className="text-zinc-500">Usage stats (action, tool, target, timestamp, success)</span></div>
            <div><span className="text-primary">memory_facts</span>      <span className="text-zinc-500">Memory page (key, value, user_id, timestamps)</span></div>
            <div>&nbsp;</div>
            <div className="text-zinc-500"># Threat Intel tables</div>
            <div><span className="text-primary">threat_iocs</span>       <span className="text-zinc-500">IOC entries (ioc_type, value, feed_name, confidence, severity, tags, metadata)</span></div>
            <div><span className="text-primary">threat_feeds</span>      <span className="text-zinc-500">Feed configs (name, url, feed_type, format, enabled, refresh_interval)</span></div>
            <div>&nbsp;</div>
            <div className="text-zinc-500"># Tool tables</div>
            <div><span className="text-primary">tools</span>             <span className="text-zinc-500">Custom tools (name, category, tool_type, endpoint_url, description)</span></div>
          </CodeBlock>
        </CardContent></Card>

      <Card><CardHeader><CardTitle>Row Level Security (RLS)</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>All tables have RLS policies that scope data to the authenticated user via <code className="text-primary">auth.uid()</code>.
            This means each user only sees their own data, even though all instances share the same Supabase project.</p>
          <CodeBlock>
            <div className="text-zinc-500"># Example RLS policy (all tables follow this pattern)</div>
            <div><span className="text-emerald-500">CREATE POLICY</span> "Users can only see own data"</div>
            <div>  ON cves FOR SELECT</div>
            <div>  USING (auth.uid() = user_id);</div>
          </CodeBlock>
        </CardContent></Card>

      <Card><CardHeader><CardTitle>Realtime Subscriptions</CardTitle></CardHeader>
        <CardContent>
          <CodeBlock>
            <div className="text-zinc-500"># Dashboard subscribes to 4 channels</div>
            <div><span className="text-emerald-500">cves</span>           <span className="text-zinc-500">INSERT → show new CVE alert</span></div>
            <div><span className="text-emerald-500">knowledge_base</span> <span className="text-zinc-500">INSERT → show new entry notification</span></div>
            <div><span className="text-emerald-500">red_team_ops</span>   <span className="text-zinc-500">UPDATE → refresh operation status</span></div>
            <div><span className="text-emerald-500">bookmarks</span>      <span className="text-zinc-500">INSERT → update bookmark count</span></div>
          </CodeBlock>
        </CardContent></Card>

      <Card><CardContent className="pt-6"><FeatureList items={[
        { text: "PostgreSQL with Row Level Security (RLS) on all tables", status: "done" },
        { text: "Real-time subscriptions for live data sync (4 channels)", status: "done" },
        { text: "Edge Functions for serverless logic", status: "done" },
        { text: "Storage buckets for file uploads (50MB)", status: "done" },
        { text: "Email/password + GitHub OAuth authentication", status: "done" },
        { text: "Shared across all CrowByte instances and CLI tools", status: "done" },
        { text: "Health dashboard in Analytics page", status: "done" },
      ]} /></CardContent></Card>
    </div>
  );
}
