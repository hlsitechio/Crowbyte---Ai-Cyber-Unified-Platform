import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Pulse, ChatDots, Crosshair, Terminal, BookOpen, Monitor, MagnifyingGlass, Target, Brain, Lightning, TreeStructure } from "@phosphor-icons/react";
import { DocHeader, StatusBadge, CodeBlock } from "../components";

export function OverviewSection() {
  return (
    <div className="space-y-6">
      <DocHeader icon={Shield} title="CrowByte Terminal" description="AI-powered offensive security command center built on Electron" />

      <Card className="border-primary/30 bg-card/50 backdrop-blur">
        <CardHeader><CardTitle>What is CrowByte?</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            CrowByte Terminal is a desktop Electron application designed for professional bug bounty hunters and security operators.
            It runs on Kali Linux 2025 and provides a unified command center for offensive and defensive security operations.
          </p>
          <p>
            The app integrates two AI backends: <strong className="text-foreground">Claude Code CLI</strong> (Anthropic's Opus/Sonnet/Haiku models
            running locally via Electron IPC) and <strong className="text-foreground">OpenClaw</strong> (a remote VPS agent swarm
            running NVIDIA Cloud models like DeepSeek V3.2, Qwen3 Coder 480B, Mistral Large 675B, and more).
          </p>
          <p>
            All persistent data (CVEs, knowledge base, agents, bookmarks, red team operations) is stored in <strong className="text-foreground">Supabase</strong> (cloud PostgreSQL),
            so every instance of CrowByte shares the same data in real-time.
          </p>
        </CardContent>
      </Card>

      <Card className="border-primary/30 bg-card/50 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Pulse size={20} weight="duotone" /> Status Legend</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="flex items-center gap-3"><StatusBadge status="ready" /><span className="text-sm">Fully implemented and tested</span></div>
          <div className="flex items-center gap-3"><StatusBadge status="beta" /><span className="text-sm">Functional but may have rough edges</span></div>
          <div className="flex items-center gap-3"><StatusBadge status="dev" /><span className="text-sm">Under active development</span></div>
        </CardContent>
      </Card>

      <Card className="border-primary/30 bg-card/50 backdrop-blur">
        <CardHeader>
          <CardTitle>Architecture</CardTitle>
          <CardDescription>How the pieces fit together</CardDescription>
        </CardHeader>
        <CardContent>
          <CodeBlock>
            <div className="text-zinc-500"># CrowByte Architecture</div>
            <div>&nbsp;</div>
            <div><span className="text-primary">Electron App</span> (React + TypeScript + Vite)</div>
            <div>  |</div>
            <div>  +-- <span className="text-blue-500">Claude Code CLI</span> <span className="text-zinc-500">--- Electron IPC --- claude -p --output-format stream-json</span></div>
            <div>  |     Opus 4.6 / Sonnet 4.6 / Haiku 4.5</div>
            <div>  |     Full MCP servers, tools, plugins from .env-unfiltered</div>
            <div>  |</div>
            <div>  +-- <span className="text-emerald-500">OpenClaw Gateway</span> <span className="text-zinc-500">--- HTTPS --- VPS your-vps-ip:18789</span></div>
            <div>  |     NVIDIA Cloud models (DeepSeek, Qwen, Mistral, Kimi, GLM5)</div>
            <div>  |     9 specialized agents (recon, hunter, intel, analyst...)</div>
            <div>  |     D3bugr MCP (nmap, nuclei, sqlmap, browser automation)</div>
            <div>  |</div>
            <div>  +-- <span className="text-violet-500">Supabase</span> <span className="text-zinc-500">--- HTTPS --- Cloud PostgreSQL</span></div>
            <div>  |     CVEs, knowledge base, agents, bookmarks, auth, settings</div>
            <div>  |</div>
            <div>  +-- <span className="text-amber-500">Kali Linux Host</span> <span className="text-zinc-500">--- Local --- 7000+ security tools</span></div>
            <div>        nmap, nuclei, sqlmap, ffuf, burp, metasploit, etc.</div>
            <div>        xterm.js terminal with tmux integration</div>
          </CodeBlock>
        </CardContent>
      </Card>

      <Card className="border-primary/30 bg-card/50 backdrop-blur">
        <CardHeader><CardTitle>Feature Map</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "AI Chat", desc: "Claude CLI + OpenClaw dual-provider streaming", icon: ChatDots, status: "ready" as const },
              { label: "Red Team", desc: "Operation tracking, findings, Supabase-backed", icon: Crosshair, status: "ready" as const },
              { label: "Blue Team", desc: "Security monitor, CVE database, threat intel", icon: Shield, status: "ready" as const },
              { label: "Terminal", desc: "xterm.js + tmux, multi-tab, shell presets", icon: Terminal, status: "ready" as const },
              { label: "Knowledge Base", desc: "Cloud-synced entries with file uploads", icon: BookOpen, status: "ready" as const },
              { label: "Fleet", desc: "VPS agent swarm + endpoint monitoring", icon: Monitor, status: "beta" as const },
              { label: "NVD + Shodan", desc: "Parallel CVE lookup, auto-save to Supabase", icon: MagnifyingGlass, status: "ready" as const },
              { label: "Mission Planner", desc: "Phase-based operation planning", icon: Target, status: "beta" as const },
              { label: "Threat Intel", desc: "IOC feeds, enrichment, STIX correlation", icon: Shield, status: "beta" as const },
              { label: "Analytics", desc: "Usage metrics, CVE stats, Supabase health", icon: Pulse, status: "ready" as const },
              { label: "AI Agents", desc: "Custom agent builder + testing lab", icon: Brain, status: "beta" as const },
              { label: "Network Scanner", desc: "10 nmap profiles, parsed results", icon: TreeStructure, status: "ready" as const },
            ].map((f) => (
              <div key={f.label} className="flex items-start gap-3 p-3 rounded-lg border border-border/50 bg-card/30">
                <f.icon size={20} weight="duotone" className="text-primary mt-0.5 shrink-0" />
                <div>
                  <div className="text-sm font-medium flex items-center gap-2">{f.label} <StatusBadge status={f.status} /></div>
                  <div className="text-xs text-muted-foreground">{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-primary/30 bg-card/50 backdrop-blur">
        <CardHeader><CardTitle>Quick Navigation</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>Use the sidebar to navigate between sections. The documentation covers:</p>
          <ul className="space-y-1 ml-4">
            <li>- <strong className="text-foreground">34 sections</strong> covering every page, service, and integration</li>
            <li>- <strong className="text-foreground">Supabase schemas</strong> for all database tables</li>
            <li>- <strong className="text-foreground">CLI tool references</strong> for cve-db and kb</li>
            <li>- <strong className="text-foreground">AI provider configs</strong> for Claude, OpenClaw, Venice, Ollama</li>
            <li>- <strong className="text-foreground">Electron architecture</strong> including IPC, node-pty, cache manager</li>
            <li>- <strong className="text-foreground">Security layer</strong> — AES-256-GCM encryption, credential vault, device fingerprinting</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
