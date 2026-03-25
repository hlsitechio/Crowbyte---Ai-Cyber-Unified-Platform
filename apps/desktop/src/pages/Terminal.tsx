import React, { useEffect, useRef, useState, useCallback } from"react";
import { Card } from"@/components/ui/card";
import { Button } from"@/components/ui/button";
import { Terminal as TerminalIcon, Plus, X, CaretDown, Brain, DesktopTower, Code, Sword, Pulse, MagnifyingGlass, ArrowsOut, ArrowsIn, Columns, Rows, GridFour, CaretRight, CaretLeft, ArrowUp, ArrowDown, ArrowCounterClockwise, SplitHorizontal, SplitVertical, ArrowsClockwise, TextT } from "@phosphor-icons/react";
import {
 DropdownMenu,
 DropdownMenuContent,
 DropdownMenuItem,
 DropdownMenuSeparator,
 DropdownMenuTrigger,
} from"@/components/ui/dropdown-menu";
import {
 ContextMenu,
 ContextMenuContent,
 ContextMenuItem,
 ContextMenuTrigger,
 ContextMenuSeparator,
 ContextMenuShortcut,
} from"@/components/ui/context-menu";
import { Terminal as XTerm } from"@xterm/xterm";
import { FitAddon } from"@xterm/addon-fit";
import { WebLinksAddon } from"@xterm/addon-web-links";
import { SearchAddon } from"@xterm/addon-search";
import"@xterm/xterm/css/xterm.css";
import { useToast } from"@/hooks/use-toast";

interface ShellType {
 id: string;
 name: string;
 path: string;
 icon?: string;
 preset?: boolean;
}

interface TerminalInstance {
 id: string;
 name: string;
 shellType: string;
 xterm: XTerm;
 fitAddon: FitAddon;
 searchAddon: SearchAddon;
 containerRef: React.RefObject<HTMLDivElement>;
 alive: boolean;
}

const ICON_MAP: Record<string, React.ReactNode> = {
 brain: <Brain size={14} weight="bold" className="text-violet-500" />,
 server: <DesktopTower size={14} weight="bold" className="text-blue-500" />,
 code: <Code size={14} weight="bold" className="text-emerald-500" />,
 swords: <Sword size={14} weight="bold" className="text-red-500" />,
 activity: <Pulse size={14} weight="bold" className="text-amber-500" />,
 terminal: <TerminalIcon size={14} weight="bold" className="text-primary" />,
};

const TAB_ICON_MAP: Record<string, React.ReactNode> = {
 claude: <Brain size={12} weight="bold" className="text-violet-500" />,
 'ssh-vps': <DesktopTower size={12} weight="bold" className="text-blue-500" />,
 python: <Code size={12} weight="bold" className="text-emerald-500" />,
 node: <Code size={12} weight="bold" className="text-amber-500" />,
 msf: <Sword size={12} weight="bold" className="text-red-500" />,
 htop: <Pulse size={12} weight="bold" className="text-cyan-500" />,
 tmux: <TerminalIcon size={12} weight="bold" className="text-emerald-500" />,
};

const Terminal = () => {
 const [terminals, setTerminals] = useState<TerminalInstance[]>([]);
 const [activeTerminalId, setActiveTerminalId] = useState<string | null>(null);
 const [availableShells, setAvailableShells] = useState<ShellType[]>([]);
 const [isFullscreen, setIsFullscreen] = useState(false);
 const [searchVisible, setSearchVisible] = useState(false);
 const [searchQuery, setSearchQuery] = useState('');
 const { toast } = useToast();
 const terminalsRef = useRef<TerminalInstance[]>([]);
 const terminalAreaRef = useRef<HTMLDivElement>(null);

 useEffect(() => { terminalsRef.current = terminals; }, [terminals]);

 // Clipboard
 const copyToClipboard = useCallback(async () => {
 const terminal = terminalsRef.current.find(t => t.id === activeTerminalId);
 if (!terminal) return;
 const selection = terminal.xterm.getSelection();
 if (selection) {
 await navigator.clipboard.writeText(selection);
 toast({ title:"Copied", description: `${selection.length} chars` });
 }
 }, [activeTerminalId, toast]);

 const pasteFromClipboard = useCallback(async () => {
 const terminal = terminalsRef.current.find(t => t.id === activeTerminalId);
 if (!terminal) return;
 const text = await navigator.clipboard.readText();
 if (text && window.electronAPI?.terminalInput) {
 await window.electronAPI.terminalInput({ terminalId: terminal.id, data: text });
 }
 }, [activeTerminalId]);

 // Search
 const doSearch = useCallback((query: string, direction: 'next' | 'prev' = 'next') => {
 const terminal = terminalsRef.current.find(t => t.id === activeTerminalId);
 if (!terminal || !query) return;
 if (direction === 'next') terminal.searchAddon.findNext(query);
 else terminal.searchAddon.findPrevious(query);
 }, [activeTerminalId]);

 // Fetch shells
 useEffect(() => {
 const fetchShells = async () => {
 if (window.electronAPI?.getAvailableShells) {
 const shells = await window.electronAPI.getAvailableShells();
 setAvailableShells(shells);
 }
 };
 fetchShells();
 }, []);

 // Terminal output/exit listeners
 useEffect(() => {
 if (!window.electronAPI) return;

 const handleTerminalOutput = ({ terminalId, data }: { terminalId: string; data: string }) => {
 const terminal = terminalsRef.current.find(t => t.id === terminalId);
 if (terminal) terminal.xterm.write(data);
 };

 const handleTerminalExit = ({ terminalId, code }: { terminalId: string; code: number }) => {
 const terminal = terminalsRef.current.find(t => t.id === terminalId);
 if (terminal) {
 terminal.alive = false;
 terminal.xterm.writeln(`\r\n\x1b[90m[process exited with code ${code}]\x1b[0m`);
 setTerminals(prev => prev.map(t => t.id === terminalId ? { ...t, alive: false } : t));
 }
 };

 window.electronAPI.onTerminalOutput(handleTerminalOutput);
 window.electronAPI.onTerminalExit(handleTerminalExit);

 return () => {
 if (window.electronAPI?.removeTerminalListeners) {
 window.electronAPI.removeTerminalListeners();
 }
 };
 }, []);

 // Create terminal
 const createTerminal = useCallback(async (shellType?: string) => {
 if (!window.electronAPI) return;

 const shell = shellType || 'tmux';
 const shellInfo = availableShells.find(s => s.id === shell);
 const terminalId = `term-${Date.now()}`;
 const terminalName = shellInfo?.name || shell;

 const containerRef = React.createRef<HTMLDivElement>();

 const xterm = new XTerm({
 cursorBlink: true,
 cursorStyle: 'bar',
 cursorWidth: 2,
 fontSize: 14,
 fontFamily: '"JetBrains Mono","Cascadia Code","Fira Code","SF Mono", Menlo, Monaco, monospace',
 fontWeight: '400',
 fontWeightBold: '600',
 lineHeight: 1.15,
 theme: {
 background:"#0c0c0c",
 foreground:"#d4d4d4",
 cursor:"#00ff41",
 cursorAccent:"#0c0c0c",
 selectionBackground:"rgba(0, 255, 65, 0.15)",
 selectionForeground:"#ffffff",
 black:"#1e1e1e",
 red:"#f44747",
 green:"#6a9955",
 yellow:"#dcdcaa",
 blue:"#569cd6",
 magenta:"#c586c0",
 cyan:"#4ec9b0",
 white:"#d4d4d4",
 brightBlack:"#808080",
 brightRed:"#f44747",
 brightGreen:"#6a9955",
 brightYellow:"#dcdcaa",
 brightBlue:"#9cdcfe",
 brightMagenta:"#c586c0",
 brightCyan:"#4ec9b0",
 brightWhite:"#ffffff",
 },
 allowTransparency: true,
 scrollback: 50000,
 smoothScrollDuration: 100,
 macOptionIsMeta: true,
 allowProposedApi: true,
 rightClickSelectsWord: true,
 });

 const fitAddon = new FitAddon();
 const webLinksAddon = new WebLinksAddon();
 const searchAddon = new SearchAddon();

 xterm.loadAddon(fitAddon);
 xterm.loadAddon(webLinksAddon);
 xterm.loadAddon(searchAddon);

 // Keyboard shortcuts — only intercept our app shortcuts, let everything else through to PTY
 xterm.attachCustomKeyEventHandler((event) => {
 if (event.type !== 'keydown') return true;

 // Ctrl+Shift+C — copy
 if (event.ctrlKey && event.shiftKey && event.code === 'KeyC') {
 const sel = xterm.getSelection();
 if (sel) navigator.clipboard.writeText(sel);
 return false;
 }
 // Ctrl+Shift+V — paste
 if (event.ctrlKey && event.shiftKey && event.code === 'KeyV') {
 navigator.clipboard.readText().then(text => {
 if (text && window.electronAPI?.terminalInput) {
 window.electronAPI.terminalInput({ terminalId, data: text });
 }
 });
 return false;
 }
 // Ctrl+Shift+F — search
 if (event.ctrlKey && event.shiftKey && event.code === 'KeyF') {
 setSearchVisible(v => !v);
 return false;
 }
 // Ctrl+Shift+K — clear scrollback
 if (event.ctrlKey && event.shiftKey && event.code === 'KeyK') {
 xterm.clear();
 return false;
 }
 // Everything else goes to PTY (including Ctrl+B for tmux)
 return true;
 });

 // User input → PTY
 xterm.onData(async (data) => {
 if (window.electronAPI?.terminalInput) {
 await window.electronAPI.terminalInput({ terminalId, data });
 }
 });

 xterm.onBinary(async (data) => {
 if (window.electronAPI?.terminalInput) {
 await window.electronAPI.terminalInput({ terminalId, data });
 }
 });

 const newTerminal: TerminalInstance = {
 id: terminalId,
 name: terminalName,
 shellType: shell,
 xterm,
 fitAddon,
 searchAddon,
 containerRef,
 alive: true,
 };

 setTerminals(prev => [...prev, newTerminal]);
 setActiveTerminalId(terminalId);

 // Mount and create backend
 setTimeout(async () => {
 if (containerRef.current) {
 xterm.open(containerRef.current);
 fitAddon.fit();

 const result = await window.electronAPI.createTerminal({
 terminalId,
 shellType: shell,
 cwd: undefined,
 cols: xterm.cols,
 rows: xterm.rows,
 });

 if (!result.success) {
 xterm.writeln(`\x1b[31mFailed: ${result.error}\x1b[0m`);
 }

 // Resize events → PTY
 xterm.onResize(({ cols, rows }) => {
 if (window.electronAPI?.terminalResize) {
 window.electronAPI.terminalResize({ terminalId, cols, rows });
 }
 });

 xterm.focus();
 }
 }, 80);

 }, [availableShells, toast]);

 // Close terminal
 const closeTerminal = useCallback(async (terminalId: string) => {
 const terminal = terminalsRef.current.find(t => t.id === terminalId);
 if (!terminal) return;

 if (window.electronAPI?.closeTerminal) {
 await window.electronAPI.closeTerminal({ terminalId });
 }
 terminal.xterm.dispose();

 setTerminals(prev => {
 const remaining = prev.filter(t => t.id !== terminalId);
 if (activeTerminalId === terminalId) {
 setActiveTerminalId(remaining.length > 0 ? remaining[remaining.length - 1].id : null);
 }
 return remaining;
 });
 }, [activeTerminalId]);

 // Auto-create initial terminal
 useEffect(() => {
 if (terminals.length === 0 && availableShells.length > 0) {
 createTerminal();
 }
 }, [availableShells, terminals.length, createTerminal]);

 // Resize handler
 useEffect(() => {
 const handleResize = () => {
 const active = terminalsRef.current.find(t => t.id === activeTerminalId);
 if (active) {
 try { active.fitAddon.fit(); } catch {}
 }
 };
 window.addEventListener('resize', handleResize);
 const timer = setTimeout(handleResize, 150);
 return () => {
 window.removeEventListener('resize', handleResize);
 clearTimeout(timer);
 };
 }, [activeTerminalId, isFullscreen]);

 // ResizeObserver — re-fit terminal when container dimensions change
 // Fires on: browser panel open/close/resize, sidebar toggle, window resize
 useEffect(() => {
 if (!terminalAreaRef.current) return;

 const observer = new ResizeObserver(() => {
 const active = terminalsRef.current.find(t => t.id === activeTerminalId);
 if (active) {
 try { active.fitAddon.fit(); } catch {}
 }
 });

 observer.observe(terminalAreaRef.current);
 return () => observer.disconnect();
 }, [activeTerminalId]);

 // Re-fit when switching tabs
 const switchTab = useCallback((id: string) => {
 setActiveTerminalId(id);
 setTimeout(() => {
 const t = terminalsRef.current.find(t => t.id === id);
 if (t) {
 try { t.fitAddon.fit(); } catch {}
 t.xterm.focus();
 }
 }, 50);
 }, []);

 // Run a tmux command silently via executeCommand (outside the PTY, no prompt pollution)
 const runTmuxCommand = useCallback(async (cmd: string) => {
 const terminal = terminalsRef.current.find(t => t.id === activeTerminalId);
 if (!terminal) return;
 if (window.electronAPI?.executeCommand) {
 // Execute tmux command server-side — doesn't show in shell prompt or history
 await window.electronAPI.executeCommand(`tmux ${cmd}`);
 } else if (window.electronAPI?.terminalInput) {
 // Fallback: type into shell if executeCommand unavailable
 await window.electronAPI.terminalInput({ terminalId: terminal.id, data: `tmux ${cmd}\n` });
 }
 setTimeout(() => terminal.xterm.focus(), 100);
 }, [activeTerminalId]);

 // Send tmux prefix + key (Ctrl+B then key) as rapid sequence
 const sendTmuxKeys = useCallback(async (keys: string) => {
 const terminal = terminalsRef.current.find(t => t.id === activeTerminalId);
 if (!terminal || !window.electronAPI?.terminalInput) return;
 // Send Ctrl+B prefix
 await window.electronAPI.terminalInput({ terminalId: terminal.id, data: '\x02' });
 // Send the key after a brief pause for tmux to register the prefix
 await new Promise(r => setTimeout(r, 80));
 await window.electronAPI.terminalInput({ terminalId: terminal.id, data: keys });
 setTimeout(() => terminal.xterm.focus(), 100);
 }, [activeTerminalId]);

 const shells = availableShells.filter(s => !s.preset);
 const presets = availableShells.filter(s => s.preset);

 return (
 <div className={`animate-fade-in flex flex-col ${isFullscreen ? 'fixed inset-0 z-50 bg-[#0c0c0c]' : 'h-[calc(100vh-8rem)]'}`}>
 {/* Header bar */}
 <div className={`flex items-center justify-between shrink-0 ${isFullscreen ? 'px-3 py-1.5 bg-[#181818] border-b border-white/[0.04]/20' : 'pb-2'}`}>
 <div className="flex items-center gap-2">
 <TerminalIcon size={16} weight="bold" className="text-primary" />
 <span className="text-sm font-semibold text-white">Terminal</span>
 {terminals.length > 0 && (
 <span className="text-[10px] text-muted-foreground bg-muted/20 px-1.5 py-0.5 rounded">
 {terminals.filter(t => t.alive).length} active
 </span>
 )}
 </div>

 <div className="flex items-center gap-1">
 {/* Quick-launch presets */}
 {presets.length > 0 && (
 <div className="flex items-center gap-0.5 mr-1.5 border-r border-border/20 pr-1.5">
 {presets.map((p) => (
 <Button
 key={p.id}
 variant="ghost"
 size="sm"
 className="h-6 px-1.5 gap-1 text-[11px] hover:bg-primary/10"
 onClick={() => createTerminal(p.id)}
 title={p.name}
 >
 {ICON_MAP[p.icon || 'terminal']}
 <span className="hidden xl:inline">{p.name}</span>
 </Button>
 ))}
 </div>
 )}

 <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setSearchVisible(v => !v)} title="Search (Ctrl+Shift+F)">
 <MagnifyingGlass size={14} weight="bold" />
 </Button>

 <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setIsFullscreen(f => !f)} title="Fullscreen">
 {isFullscreen ? <ArrowsIn size={14} weight="bold" /> : <ArrowsOut size={14} weight="bold" />}
 </Button>

 <DropdownMenu>
 <DropdownMenuTrigger asChild>
 <Button variant="default" size="sm" className="h-6 gap-1 text-[11px] px-2">
 <Plus size={12} weight="bold" /> New <CaretDown size={10} weight="bold" />
 </Button>
 </DropdownMenuTrigger>
 <DropdownMenuContent align="end" className="w-44">
 {shells.map((s) => (
 <DropdownMenuItem key={s.id} onClick={() => createTerminal(s.id)} className="gap-2 text-xs">
 {ICON_MAP[s.icon || 'terminal']} {s.name}
 </DropdownMenuItem>
 ))}
 {presets.length > 0 && <DropdownMenuSeparator />}
 {presets.map((p) => (
 <DropdownMenuItem key={p.id} onClick={() => createTerminal(p.id)} className="gap-2 text-xs">
 {ICON_MAP[p.icon || 'terminal']} {p.name}
 </DropdownMenuItem>
 ))}
 </DropdownMenuContent>
 </DropdownMenu>
 </div>
 </div>

 {/* Search bar */}
 {searchVisible && (
 <div className="flex items-center gap-2 px-3 py-1 bg-[#181818] border-b border-white/[0.04]/20 shrink-0">
 <MagnifyingGlass size={12} weight="bold" className="text-muted-foreground" />
 <input
 type="text"
 className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
 placeholder="Search..."
 value={searchQuery}
 onChange={e => { setSearchQuery(e.target.value); doSearch(e.target.value); }}
 onKeyDown={e => {
 if (e.key === 'Enter') doSearch(searchQuery, e.shiftKey ? 'prev' : 'next');
 if (e.key === 'Escape') setSearchVisible(false);
 }}
 autoFocus
 />
 <button className="text-[10px] text-muted-foreground hover:text-white px-1" onClick={() => doSearch(searchQuery, 'prev')}>▲</button>
 <button className="text-[10px] text-muted-foreground hover:text-white px-1" onClick={() => doSearch(searchQuery, 'next')}>▼</button>
 <button className="text-muted-foreground hover:text-white" onClick={() => setSearchVisible(false)}><X size={12} weight="bold" /></button>
 </div>
 )}

 {/* Terminal area */}
 <div className="flex-1 flex flex-col overflow-hidden bg-[#0c0c0c] rounded-md">
 {/* Tabs */}
 {terminals.length > 1 && (
 <div className="flex items-center bg-[#181818] border-b border-white/[0.04]/15 overflow-x-auto shrink-0" style={{ minHeight: 28 }}>
 {terminals.map((t) => (
 <div
 key={t.id}
 className={`flex items-center gap-1.5 px-3 py-1 cursor-pointer transition-all text-[11px] ${
 activeTerminalId === t.id
 ? 'bg-[#0c0c0c] text-white border-b border-b-emerald-500'
 : 'hover:bg-[#252525] text-muted-foreground'
 }`}
 onClick={() => switchTab(t.id)}
 >
 {TAB_ICON_MAP[t.shellType] || <TerminalIcon size={12} weight="bold" />}
 <span className="whitespace-nowrap">{t.name}</span>
 {!t.alive && <span className="text-[9px] text-red-500/70">✕</span>}
 <button
 onClick={(e) => { e.stopPropagation(); closeTerminal(t.id); }}
 className="ml-0.5 opacity-0 group-hover:opacity-100 hover:bg-white/[0.03] rounded p-0.5"
 style={{ opacity: activeTerminalId === t.id ? 0.5 : 0 }}
 onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
 onMouseLeave={e => (e.currentTarget.style.opacity = activeTerminalId === t.id ? '0.5' : '0')}
 >
 <X size={10} weight="bold" />
 </button>
 </div>
 ))}
 </div>
 )}

 {/* Terminal container */}
 <ContextMenu>
 <ContextMenuTrigger asChild>
 <div ref={terminalAreaRef} className="flex-1 relative">
 {terminals.length === 0 ? (
 <div className="absolute inset-0 flex items-center justify-center">
 <div className="text-center space-y-3">
 <TerminalIcon size={48} weight="duotone" className="mx-auto text-primary/15" />
 <p className="text-xs text-muted-foreground/60">No sessions</p>
 <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => createTerminal()}>
 <Plus size={12} weight="bold" className="mr-1" /> Open Terminal
 </Button>
 </div>
 </div>
 ) : (
 terminals.map((t) => (
 <div
 key={t.id}
 ref={t.containerRef}
 className="absolute inset-0"
 style={{ display: t.id === activeTerminalId ? 'block' : 'none' }}
 />
 ))
 )}
 </div>
 </ContextMenuTrigger>
 <ContextMenuContent className="w-60">
 {/* Clipboard */}
 <ContextMenuItem onClick={copyToClipboard} className="gap-2">
 Copy <ContextMenuShortcut>Ctrl+Shift+C</ContextMenuShortcut>
 </ContextMenuItem>
 <ContextMenuItem onClick={pasteFromClipboard} className="gap-2">
 Paste <ContextMenuShortcut>Ctrl+Shift+V</ContextMenuShortcut>
 </ContextMenuItem>
 <ContextMenuSeparator />

 {/* Pane Splits */}
 <div className="px-2 py-1 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Splits</div>
 <ContextMenuItem onClick={() => runTmuxCommand('split-window -h')} className="gap-2">
 <Columns size={14} weight="bold" className="text-blue-500" /> Split Left / Right
 </ContextMenuItem>
 <ContextMenuItem onClick={() => runTmuxCommand('split-window -v')} className="gap-2">
 <Rows size={14} weight="bold" className="text-emerald-500" /> Split Top / Bottom
 </ContextMenuItem>
 <ContextMenuItem onClick={() => runTmuxCommand('split-window -h \\; split-window -v \\; select-pane -t 0 \\; split-window -v')} className="gap-2">
 <GridFour size={14} weight="bold" className="text-violet-500" /> 4 Panes (Grid)
 </ContextMenuItem>
 <ContextMenuItem onClick={() => runTmuxCommand('select-layout even-horizontal')} className="gap-2">
 <SplitHorizontal size={14} weight="bold" className="text-cyan-500" /> Even Horizontal
 </ContextMenuItem>
 <ContextMenuItem onClick={() => runTmuxCommand('select-layout even-vertical')} className="gap-2">
 <SplitVertical size={14} weight="bold" className="text-cyan-500" /> Even Vertical
 </ContextMenuItem>
 <ContextMenuSeparator />

 {/* Pane Navigation */}
 <div className="px-2 py-1 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Panes</div>
 <ContextMenuItem onClick={() => runTmuxCommand('select-pane -t :.+')} className="gap-2">
 <CaretRight size={14} weight="bold" /> Next Pane
 <ContextMenuShortcut>Ctrl+B o</ContextMenuShortcut>
 </ContextMenuItem>
 <ContextMenuItem onClick={() => runTmuxCommand('select-pane -t :.-')} className="gap-2">
 <CaretLeft size={14} weight="bold" /> Previous Pane
 </ContextMenuItem>
 <ContextMenuItem onClick={() => runTmuxCommand('swap-pane -U')} className="gap-2">
 <ArrowUp size={14} weight="bold" className="text-amber-500" /> Swap Up
 </ContextMenuItem>
 <ContextMenuItem onClick={() => runTmuxCommand('swap-pane -D')} className="gap-2">
 <ArrowDown size={14} weight="bold" className="text-amber-500" /> Swap Down
 </ContextMenuItem>
 <ContextMenuItem onClick={() => runTmuxCommand('rotate-window')} className="gap-2">
 <ArrowCounterClockwise size={14} weight="bold" className="text-amber-500" /> Rotate Panes
 </ContextMenuItem>
 <ContextMenuItem onClick={() => runTmuxCommand('resize-pane -Z')} className="gap-2">
 <ArrowsOut size={14} weight="bold" /> Zoom Pane
 <ContextMenuShortcut>Ctrl+B z</ContextMenuShortcut>
 </ContextMenuItem>
 <ContextMenuItem onClick={() => runTmuxCommand('respawn-pane -k')} className="gap-2">
 <ArrowsClockwise size={14} weight="bold" className="text-teal-500" /> Respawn Pane
 </ContextMenuItem>
 <ContextMenuItem onClick={() => runTmuxCommand('kill-pane')} className="gap-2 text-orange-500">
 <X size={14} weight="bold" /> Kill Pane
 <ContextMenuShortcut>Ctrl+B x</ContextMenuShortcut>
 </ContextMenuItem>
 <ContextMenuSeparator />

 {/* Terminal actions */}
 <ContextMenuItem onClick={() => { const t = terminalsRef.current.find(t => t.id === activeTerminalId); if (t) t.xterm.clear(); }} className="gap-2">
 Clear <ContextMenuShortcut>Ctrl+Shift+K</ContextMenuShortcut>
 </ContextMenuItem>
 <ContextMenuItem onClick={() => setSearchVisible(v => !v)} className="gap-2">
 <MagnifyingGlass size={14} weight="bold" /> Search <ContextMenuShortcut>Ctrl+Shift+F</ContextMenuShortcut>
 </ContextMenuItem>
 <ContextMenuSeparator />

 {/* New terminals & presets */}
 <div className="px-2 py-1 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">New</div>
 <ContextMenuItem onClick={() => createTerminal()} className="gap-2">
 <TerminalIcon size={14} weight="bold" /> New tmux
 </ContextMenuItem>
 <ContextMenuItem onClick={() => createTerminal('zsh')} className="gap-2">
 <TerminalIcon size={14} weight="bold" /> New Zsh
 </ContextMenuItem>
 {presets.map(p => (
 <ContextMenuItem key={p.id} onClick={() => createTerminal(p.id)} className="gap-2">
 {ICON_MAP[p.icon || 'terminal']} {p.name}
 </ContextMenuItem>
 ))}
 <ContextMenuSeparator />
 <ContextMenuItem
 onClick={() => activeTerminalId && closeTerminal(activeTerminalId)}
 className="text-red-500 gap-2"
 >
 <X size={14} weight="bold" /> Close Terminal
 </ContextMenuItem>
 </ContextMenuContent>
 </ContextMenu>
 </div>
 </div>
 );
};

export default Terminal;
