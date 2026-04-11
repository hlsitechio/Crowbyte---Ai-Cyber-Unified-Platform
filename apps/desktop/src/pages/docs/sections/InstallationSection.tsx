import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UilDownloadAlt } from "@iconscout/react-unicons";
import { DocHeader, FeatureList, CodeBlock } from "../components";

export function InstallationSection() {
  return (
    <div className="space-y-6">
      <DocHeader icon={UilDownloadAlt} title="Installation & Setup" description="Prerequisites, build from source, environment variables, and first run" />

      <Card><CardHeader><CardTitle>Prerequisites</CardTitle></CardHeader>
        <CardContent><FeatureList items={[
          { text: "Kali Linux 2025 (or any Linux with Node.js 20+)", status: "info" },
          { text: "Node.js 20+ and npm 10+", status: "info" },
          { text: "Electron 39 (installed via npm)", status: "info" },
          { text: "Claude UilBracketsCurly CLI (for Claude provider)", status: "info" },
          { text: "Supabase project (free tier works)", status: "info" },
          { text: "Tavily API key (optional, for Search Agent)", status: "info" },
        ]} /></CardContent></Card>

      <Card><CardHeader><CardTitle>Build from Source</CardTitle></CardHeader>
        <CardContent>
          <CodeBlock>
            <div className="text-zinc-500"># Clone and install</div>
            <div><span className="text-emerald-500">cd</span> /mnt/bounty/Claude/crowbyte/apps/desktop</div>
            <div><span className="text-emerald-500">npm install</span></div>
            <div>&nbsp;</div>
            <div className="text-zinc-500"># Development (hot reload)</div>
            <div><span className="text-emerald-500">npm run dev</span></div>
            <div>&nbsp;</div>
            <div className="text-zinc-500"># Production build</div>
            <div><span className="text-emerald-500">npm run build</span>              <span className="text-zinc-500"># Web build (Vite)</span></div>
            <div><span className="text-emerald-500">npm run build:electron:linux</span> <span className="text-zinc-500"># Linux Electron package</span></div>
            <div><span className="text-emerald-500">npm run build:electron:win</span>   <span className="text-zinc-500"># Windows Electron installer</span></div>
          </CodeBlock>
        </CardContent></Card>

      <Card><CardHeader><CardTitle>Environment Variables</CardTitle></CardHeader>
        <CardContent>
          <CodeBlock>
            <div className="text-zinc-500"># .env (create in apps/desktop/)</div>
            <div>&nbsp;</div>
            <div className="text-zinc-500"># Supabase (required)</div>
            <div><span className="text-primary">VITE_SUPABASE_URL</span>=https://your-project.supabase.co</div>
            <div><span className="text-primary">VITE_SUPABASE_ANON_KEY</span>=eyJ...</div>
            <div>&nbsp;</div>
            <div className="text-zinc-500"># Tavily (optional — for Search Agent)</div>
            <div><span className="text-primary">VITE_TAVILY_API_KEY</span>=your-tavily-key</div>
            <div>&nbsp;</div>
            <div className="text-zinc-500"># OpenClaw VPS (optional — for remote AI)</div>
            <div><span className="text-primary">VITE_OPENCLAW_HOST</span>=your-vps-ip</div>
            <div><span className="text-primary">VITE_OPENCLAW_PORT</span>=18789</div>
            <div>&nbsp;</div>
            <div className="text-zinc-500"># Venice AI (optional)</div>
            <div><span className="text-primary">VITE_VENICE_API_KEY</span>=...</div>
          </CodeBlock>
        </CardContent></Card>

      <Card><CardHeader><CardTitle>First Run</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>On first launch, CrowByte will:</p>
          <FeatureList items={[
            { text: "Show intro animation (can be disabled in Settings)", status: "info" },
            { text: "Redirect to Auth page for login/signup", status: "info" },
            { text: "Create default bookmark categories and starter bookmarks", status: "info" },
            { text: "Auto-register current device in Fleet (if Electron)", status: "info" },
            { text: "Check OpenClaw VPS connectivity", status: "info" },
            { text: "Initialize Supabase Realtime subscriptions", status: "info" },
          ]} />
        </CardContent></Card>
    </div>
  );
}
