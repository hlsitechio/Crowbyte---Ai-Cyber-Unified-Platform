import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UilCog } from "@iconscout/react-unicons";
import { DocHeader, FeatureList, CodeBlock } from "../components";

export function SettingsSection() {
  return (
    <div className="space-y-6">
      <DocHeader icon={UilCog} title="Settings" description="Application configuration, API keys, profile management, and preferences" status="ready" />

      <Card><CardHeader><CardTitle>Settings Categories</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { name: "Profile", items: "Display name, profile picture (Supabase Storage), workspace name (shown in sidebar header)" },
              { name: "AI Configuration", items: "Default LLM model selection, Claude budget limits, OpenClaw model preference, temperature settings" },
              { name: "API Keys", items: "Tavily API key, Ollama endpoint, custom API endpoints" },
              { name: "MCP Servers", items: "Server connection status, endpoint URLs, tool browser" },
              { name: "Appearance", items: "Intro animation toggle (splash screen on/off), theme customization (planned)" },
              { name: "Supabase", items: "Connection URL, anon key, project ID, health check" },
              { name: "VPS / OpenClaw", items: "VPS host, gateway port, agent configuration" },
            ].map((cat) => (
              <div key={cat.name} className="p-3 rounded-lg border border-border/50 bg-card/30">
                <div className="text-sm font-medium mb-1">{cat.name}</div>
                <div className="text-xs text-muted-foreground">{cat.items}</div>
              </div>
            ))}
          </div>
        </CardContent></Card>

      <Card><CardHeader><CardTitle>Supabase Schema: user_settings</CardTitle></CardHeader>
        <CardContent>
          <CodeBlock>
            <div><span className="text-primary">workspace_name</span>    <span className="text-zinc-500">TEXT     — Shown in sidebar header</span></div>
            <div><span className="text-primary">profile_picture</span>   <span className="text-zinc-500">TEXT     — Supabase Storage URL</span></div>
            <div><span className="text-primary">default_model</span>     <span className="text-zinc-500">TEXT     — Preferred AI model</span></div>
            <div><span className="text-primary">intro_animation</span>   <span className="text-zinc-500">BOOLEAN  — Show splash screen</span></div>
            <div><span className="text-primary">theme</span>             <span className="text-zinc-500">TEXT     — dark (only option currently)</span></div>
            <div><span className="text-primary">tavily_api_key</span>    <span className="text-zinc-500">TEXT     — Encrypted at rest</span></div>
            <div><span className="text-primary">user_id</span>           <span className="text-zinc-500">UUID     — Owner (RLS enforced)</span></div>
          </CodeBlock>
        </CardContent></Card>

      <Card><CardContent className="pt-6"><FeatureList items={[
        { text: "LLM model selection (Claude + OpenClaw models)", status: "done" },
        { text: "API key management (Tavily, Ollama, custom)", status: "done" },
        { text: "MCP server configuration", status: "done" },
        { text: "Workspace naming (shown in sidebar header)", status: "done" },
        { text: "Profile picture upload (Supabase Storage)", status: "done" },
        { text: "Intro animation toggle (splash screen on/off)", status: "done" },
        { text: "Import/export settings (planned)", status: "warn" },
        { text: "Theme customization (planned)", status: "warn" },
      ]} /></CardContent></Card>
    </div>
  );
}
