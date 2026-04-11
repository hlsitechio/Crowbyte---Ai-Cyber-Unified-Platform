import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UilLayerGroup } from "@iconscout/react-unicons";
import { DocHeader, CodeBlock } from "../components";

export function TechStackSection() {
  return (
    <div className="space-y-6">
      <DocHeader icon={UilLayerGroup} title="Tech Stack" description="Technologies powering CrowByte Terminal" />
      <Card><CardHeader><CardTitle>Frontend</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {[
              ["Framework", "React 18 + TypeScript"],
              ["Desktop Runtime", "Electron 39"],
              ["Build Tool", "Vite 7"],
              ["UI Components", "Radix UI (shadcn/ui)"],
              ["Styling", "Tailwind CSS v3"],
              ["Animation", "Framer Motion"],
              ["Charts", "Recharts"],
              ["Terminal", "xterm.js + node-pty"],
              ["Markdown", "ReactMarkdown + remark-gfm"],
              ["State", "React Query + useState"],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between p-2 rounded border border-border/30 bg-card/30">
                <span className="text-muted-foreground">{k}</span>
                <span className="font-medium">{v}</span>
              </div>
            ))}
          </div>
        </CardContent></Card>
      <Card><CardHeader><CardTitle>Backend & Infrastructure</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {[
              ["UilDatabase", "Supabase (PostgreSQL)"],
              ["Auth", "Supabase Auth (email + GitHub)"],
              ["Storage", "Supabase Storage (50MB)"],
              ["AI (Local)", "Claude UilBracketsCurly CLI via IPC"],
              ["AI (Remote)", "OpenClaw + NVIDIA Cloud"],
              ["AI (Privacy)", "Venice AI + Ollama"],
              ["VPS", "Hostinger (Ubuntu, Docker)"],
              ["Proxy", "NVIDIA Proxy (port 19990)"],
              ["MCP Bridge", "mcporter (stdio)"],
              ["Host OS", "Kali Linux 2025"],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between p-2 rounded border border-border/30 bg-card/30">
                <span className="text-muted-foreground">{k}</span>
                <span className="font-medium">{v}</span>
              </div>
            ))}
          </div>
        </CardContent></Card>
      <Card><CardHeader><CardTitle>Build Commands</CardTitle></CardHeader>
        <CardContent>
          <CodeBlock>
            <div><span className="text-emerald-500">npm run dev</span>                <span className="text-zinc-500"># Vite dev server (hot reload)</span></div>
            <div><span className="text-emerald-500">npm run build</span>              <span className="text-zinc-500"># Production web build</span></div>
            <div><span className="text-emerald-500">npm run build:electron:win</span> <span className="text-zinc-500"># Windows Electron installer</span></div>
            <div><span className="text-emerald-500">npm run build:electron:linux</span> <span className="text-zinc-500"># Linux Electron package</span></div>
          </CodeBlock>
        </CardContent></Card>
    </div>
  );
}
