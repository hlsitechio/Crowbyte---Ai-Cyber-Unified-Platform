import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CircuitBoard } from "lucide-react";
import { DocHeader, FeatureList, CodeBlock } from "../components";

export function ElectronArchSection() {
  return (
    <div className="space-y-6">
      <DocHeader icon={CircuitBoard} title="Electron Architecture" description="Main process, IPC handlers, node-pty, window management, and cache" status="ready" />

      <Card><CardHeader><CardTitle>Main Process (electron/main.ts)</CardTitle></CardHeader>
        <CardContent>
          <CodeBlock>
            <div className="text-zinc-500"># Electron main process responsibilities</div>
            <div>&nbsp;</div>
            <div><span className="text-primary">BrowserWindow</span>    <span className="text-zinc-500">Create app window (frameless, custom titlebar)</span></div>
            <div><span className="text-primary">node-pty</span>         <span className="text-zinc-500">Spawn terminal processes for Terminal page</span></div>
            <div><span className="text-primary">Claude IPC</span>       <span className="text-zinc-500">Spawn claude -p child process, stream JSON</span></div>
            <div><span className="text-primary">Venice IPC</span>       <span className="text-zinc-500">Proxy Venice API calls (bypass CORS)</span></div>
            <div><span className="text-primary">System Info</span>      <span className="text-zinc-500">CPU, RAM, disk metrics via os/fs modules</span></div>
            <div><span className="text-primary">Cache Manager</span>    <span className="text-zinc-500">SQLite-based cache for scan results</span></div>
          </CodeBlock>
        </CardContent></Card>

      <Card><CardHeader><CardTitle>IPC Channels</CardTitle></CardHeader>
        <CardContent>
          <CodeBlock>
            <div className="text-zinc-500"># Terminal IPC</div>
            <div><span className="text-green-400">terminal:create</span>   <span className="text-zinc-500">Spawn node-pty (shell, cols, rows)</span></div>
            <div><span className="text-green-400">terminal:write</span>    <span className="text-zinc-500">Send input to pty stdin</span></div>
            <div><span className="text-green-400">terminal:resize</span>   <span className="text-zinc-500">Resize pty (cols, rows)</span></div>
            <div><span className="text-green-400">terminal:destroy</span>  <span className="text-zinc-500">Kill pty process</span></div>
            <div><span className="text-green-400">terminal:data</span>     <span className="text-zinc-500">Pty output → renderer (callback)</span></div>
            <div>&nbsp;</div>
            <div className="text-zinc-500"># Claude IPC</div>
            <div><span className="text-green-400">claude:chat</span>       <span className="text-zinc-500">Send prompt, receive stream-json events</span></div>
            <div><span className="text-green-400">claude:abort</span>      <span className="text-zinc-500">Kill claude process (stop generation)</span></div>
            <div>&nbsp;</div>
            <div className="text-zinc-500"># Venice IPC</div>
            <div><span className="text-green-400">venice:chat</span>       <span className="text-zinc-500">Proxy Venice API (bypass CORS)</span></div>
            <div>&nbsp;</div>
            <div className="text-zinc-500"># System IPC</div>
            <div><span className="text-green-400">system:metrics</span>    <span className="text-zinc-500">CPU, RAM, disk, network stats</span></div>
            <div><span className="text-green-400">system:processes</span>  <span className="text-zinc-500">Running process list</span></div>
            <div><span className="text-green-400">window:minimize</span>   <span className="text-zinc-500">Minimize window</span></div>
            <div><span className="text-green-400">window:maximize</span>   <span className="text-zinc-500">Toggle maximize</span></div>
            <div><span className="text-green-400">window:close</span>      <span className="text-zinc-500">Close window</span></div>
          </CodeBlock>
        </CardContent></Card>

      <Card><CardHeader><CardTitle>Cache Manager (electron/cache-manager.ts)</CardTitle></CardHeader>
        <CardContent>
          <CodeBlock>
            <div className="text-zinc-500"># SQLite-based cache for scan results and API responses</div>
            <div>&nbsp;</div>
            <div><span className="text-primary">CacheService</span> (singleton)</div>
            <div>  <span className="text-green-400">get(key)</span>              <span className="text-zinc-500">Retrieve cached item (check TTL)</span></div>
            <div>  <span className="text-green-400">set(key, value, opts)</span> <span className="text-zinc-500">Store with TTL, content hash</span></div>
            <div>  <span className="text-green-400">invalidate(key)</span>       <span className="text-zinc-500">Remove specific entry</span></div>
            <div>  <span className="text-green-400">cleanup()</span>             <span className="text-zinc-500">Remove expired entries</span></div>
            <div>  <span className="text-green-400">stats()</span>               <span className="text-zinc-500">Hit count, size, expired count</span></div>
            <div>&nbsp;</div>
            <div className="text-zinc-500"># Cache entry fields</div>
            <div><span className="text-primary">key</span>             <span className="text-zinc-500">Cache key (tool:target hash)</span></div>
            <div><span className="text-primary">value</span>           <span className="text-zinc-500">Cached result (compressed)</span></div>
            <div><span className="text-primary">content_hash</span>    <span className="text-zinc-500">SHA-256 of value</span></div>
            <div><span className="text-primary">ttl_seconds</span>     <span className="text-zinc-500">Time to live</span></div>
            <div><span className="text-primary">expires_at</span>      <span className="text-zinc-500">Expiration timestamp</span></div>
            <div><span className="text-primary">hit_count</span>       <span className="text-zinc-500">Number of cache hits</span></div>
          </CodeBlock>
        </CardContent></Card>

      <Card><CardContent className="pt-6"><FeatureList items={[
        { text: "Frameless window with custom titlebar (TitleBar.tsx)", status: "done" },
        { text: "node-pty terminal spawning with tmux default", status: "done" },
        { text: "Claude Code CLI integration via IPC", status: "done" },
        { text: "Venice AI CORS proxy via IPC", status: "done" },
        { text: "System metrics collection (CPU/RAM/disk/net)", status: "done" },
        { text: "SQLite cache manager with TTL and content hashing", status: "done" },
        { text: "Window controls: minimize, maximize, close", status: "done" },
        { text: "Preload script for secure IPC bridge", status: "done" },
      ]} /></CardContent></Card>
    </div>
  );
}
