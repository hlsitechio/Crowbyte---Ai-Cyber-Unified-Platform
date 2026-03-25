import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Terminal } from "@phosphor-icons/react";
import { DocHeader, FeatureList, CodeBlock } from "../components";

export function TerminalSection() {
  return (
    <div className="space-y-6">
      <DocHeader icon={Terminal} title="Terminal" description="Full xterm.js terminal with tmux integration, multi-tab support, and 50K scrollback" status="ready" />

      <Card><CardHeader><CardTitle>How it works</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>The Terminal page provides a full terminal emulator using <strong className="text-foreground">xterm.js</strong> with
            FitAddon (auto-resize), WebLinksAddon (clickable URLs), and SearchAddon (Ctrl+F search).
            Each tab spawns an independent shell via Electron's <code className="text-primary">node-pty</code>.</p>
          <p>Shell presets include <strong className="text-foreground">tmux</strong> (default), zsh, bash, and fish.
            Tmux sessions are independent per tab with 50,000 line scrollback buffer.</p>
        </CardContent></Card>

      <Card><CardHeader><CardTitle>xterm.js Configuration</CardTitle></CardHeader>
        <CardContent>
          <CodeBlock>
            <div className="text-zinc-500"># Terminal.tsx — xterm config</div>
            <div>&nbsp;</div>
            <div><span className="text-primary">fontFamily</span>:    "JetBrains Mono", monospace</div>
            <div><span className="text-primary">fontSize</span>:      14</div>
            <div><span className="text-primary">scrollback</span>:    50000</div>
            <div><span className="text-primary">cursorBlink</span>:   true</div>
            <div><span className="text-primary">cursorStyle</span>:   "bar"</div>
            <div><span className="text-primary">renderer</span>:      WebGL (fallback: canvas)</div>
            <div>&nbsp;</div>
            <div className="text-zinc-500"># Addons loaded</div>
            <div><span className="text-emerald-500">FitAddon</span>     <span className="text-zinc-500">Auto-resize to container</span></div>
            <div><span className="text-emerald-500">WebLinksAddon</span> <span className="text-zinc-500">Clickable URLs in output</span></div>
            <div><span className="text-emerald-500">SearchAddon</span>  <span className="text-zinc-500">Ctrl+F text search</span></div>
            <div>&nbsp;</div>
            <div className="text-zinc-500"># IPC bridge (Electron main process)</div>
            <div><span className="text-primary">terminal:create</span>   <span className="text-zinc-500">Spawn node-pty process</span></div>
            <div><span className="text-primary">terminal:write</span>    <span className="text-zinc-500">Send input to pty</span></div>
            <div><span className="text-primary">terminal:resize</span>   <span className="text-zinc-500">Resize pty dimensions</span></div>
            <div><span className="text-primary">terminal:destroy</span>  <span className="text-zinc-500">Kill pty process</span></div>
          </CodeBlock>
        </CardContent></Card>

      <Card><CardHeader><CardTitle>Tmux Controls</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>When using tmux, the context menu (right-click) provides:</p>
          <FeatureList items={[
            { text: "Split horizontal (Ctrl+B, %)", status: "done" },
            { text: "Split vertical (Ctrl+B, \")", status: "done" },
            { text: "Navigate panes (Ctrl+B, arrow keys)", status: "done" },
            { text: "Zoom pane (Ctrl+B, z)", status: "done" },
            { text: "Tab key cycles tmux panes (intercepted by app)", status: "done" },
            { text: "Reset terminal (clear + new session)", status: "done" },
          ]} />
        </CardContent></Card>

      <Card><CardContent className="pt-6"><FeatureList items={[
        { text: "xterm.js terminal with full ANSI/VT100 support", status: "done" },
        { text: "tmux default shell with per-tab sessions", status: "done" },
        { text: "Multiple terminal tabs with shell type indicators", status: "done" },
        { text: "Shell presets: tmux, zsh, bash, fish", status: "done" },
        { text: "50,000 line scrollback buffer", status: "done" },
        { text: "Search within terminal (Ctrl+F)", status: "done" },
        { text: "Clickable web links in output", status: "done" },
        { text: "JetBrains Mono font, WebGL renderer", status: "done" },
        { text: "Full access to Kali Linux 7000+ tools", status: "done" },
        { text: "Copy/paste (Ctrl+Shift+C/V)", status: "done" },
      ]} /></CardContent></Card>
    </div>
  );
}
