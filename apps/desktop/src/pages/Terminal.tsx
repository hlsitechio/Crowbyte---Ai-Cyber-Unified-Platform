import React, { useEffect, useRef, useState, useCallback } from"react";
import { useLocation } from "react-router-dom";
import { IS_WEB } from "@/lib/platform";
import { Card } from"@/components/ui/card";
import { Button } from"@/components/ui/button";
import { UilWindow, UilPlus, UilTimes, UilAngleDown, UilBrain, UilDesktopAlt, UilBracketsCurly, UilBoltAlt, UilHeartRate, UilSearch, UilExpandArrows, UilCompressArrows, UilColumns, UilSubject, UilGrid, UilAngleRight, UilAngleLeft, UilArrowUp, UilArrowDown, UilHistory, UilSync, UilText, UilBolt, UilCog } from "@iconscout/react-unicons";
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
 brain: <UilBrain size={14} className="text-violet-500" />,
 server: <UilDesktopAlt size={14} className="text-blue-500" />,
 code: <UilBracketsCurly size={14} className="text-emerald-500" />,
 swords: <UilBoltAlt size={14} className="text-red-500" />,
 activity: <UilHeartRate size={14} className="text-amber-500" />,
 terminal: <UilWindow size={14} className="text-primary" />,
};

const TAB_ICON_MAP: Record<string, React.ReactNode> = {
 claude: <UilBrain size={12} className="text-violet-500" />,
 qwenhacker: <UilBoltAlt size={12} className="text-orange-500" />,
 'ssh-vps': <UilDesktopAlt size={12} className="text-blue-500" />,
 python: <UilBracketsCurly size={12} className="text-emerald-500" />,
 node: <UilBracketsCurly size={12} className="text-amber-500" />,
 msf: <UilBoltAlt size={12} className="text-red-500" />,
 htop: <UilHeartRate size={12} className="text-cyan-500" />,
 tmux: <UilWindow size={12} className="text-emerald-500" />,
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
 <UilWindow size={16} className="text-primary" />
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
 <UilSearch size={14} />
 </Button>

 <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setIsFullscreen(f => !f)} title="Fullscreen">
 {isFullscreen ? <UilCompressArrows size={14} /> : <UilExpandArrows size={14} />}
 </Button>

 <DropdownMenu>
 <DropdownMenuTrigger asChild>
 <Button variant="default" size="sm" className="h-6 gap-1 text-[11px] px-2">
 <UilPlus size={12} /> New <UilAngleDown size={10} />
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
 <UilSearch size={12} className="text-muted-foreground" />
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
 <button className="text-muted-foreground hover:text-white" onClick={() => setSearchVisible(false)}><UilTimes size={12} /></button>
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
 {TAB_ICON_MAP[t.shellType] || <UilWindow size={12} />}
 <span className="whitespace-nowrap">{t.name}</span>
 {!t.alive && <span className="text-[9px] text-red-500/70">✕</span>}
 <button
 onClick={(e) => { e.stopPropagation(); closeTerminal(t.id); }}
 className="ml-0.5 opacity-0 group-hover:opacity-100 hover:bg-white/[0.03] rounded p-0.5"
 style={{ opacity: activeTerminalId === t.id ? 0.5 : 0 }}
 onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
 onMouseLeave={e => (e.currentTarget.style.opacity = activeTerminalId === t.id ? '0.5' : '0')}
 >
 <UilTimes size={10} />
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
 <UilWindow size={48} className="mx-auto text-primary/15" />
 <p className="text-xs text-muted-foreground/60">No sessions</p>
 <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => createTerminal()}>
 <UilPlus size={12} className="mr-1" /> Open Terminal
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
 <UilColumns size={14} className="text-blue-500" /> Split Left / Right
 </ContextMenuItem>
 <ContextMenuItem onClick={() => runTmuxCommand('split-window -v')} className="gap-2">
 <UilSubject size={14} className="text-emerald-500" /> Split Top / Bottom
 </ContextMenuItem>
 <ContextMenuItem onClick={() => runTmuxCommand('split-window -h \\; split-window -v \\; select-pane -t 0 \\; split-window -v')} className="gap-2">
 <UilGrid size={14} className="text-violet-500" /> 4 Panes (Grid)
 </ContextMenuItem>
 <ContextMenuItem onClick={() => runTmuxCommand('select-layout even-horizontal')} className="gap-2">
 <UilColumns size={14} className="text-cyan-500" /> Even Horizontal
 </ContextMenuItem>
 <ContextMenuItem onClick={() => runTmuxCommand('select-layout even-vertical')} className="gap-2">
 <UilSubject size={14} className="text-cyan-500" /> Even Vertical
 </ContextMenuItem>
 <ContextMenuSeparator />

 {/* Pane Navigation */}
 <div className="px-2 py-1 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Panes</div>
 <ContextMenuItem onClick={() => runTmuxCommand('select-pane -t :.+')} className="gap-2">
 <UilAngleRight size={14} /> Next Pane
 <ContextMenuShortcut>Ctrl+B o</ContextMenuShortcut>
 </ContextMenuItem>
 <ContextMenuItem onClick={() => runTmuxCommand('select-pane -t :.-')} className="gap-2">
 <UilAngleLeft size={14} /> Previous Pane
 </ContextMenuItem>
 <ContextMenuItem onClick={() => runTmuxCommand('swap-pane -U')} className="gap-2">
 <UilArrowUp size={14} className="text-amber-500" /> Swap Up
 </ContextMenuItem>
 <ContextMenuItem onClick={() => runTmuxCommand('swap-pane -D')} className="gap-2">
 <UilArrowDown size={14} className="text-amber-500" /> Swap Down
 </ContextMenuItem>
 <ContextMenuItem onClick={() => runTmuxCommand('rotate-window')} className="gap-2">
 <UilHistory size={14} className="text-amber-500" /> Rotate Panes
 </ContextMenuItem>
 <ContextMenuItem onClick={() => runTmuxCommand('resize-pane -Z')} className="gap-2">
 <UilExpandArrows size={14} /> Zoom Pane
 <ContextMenuShortcut>Ctrl+B z</ContextMenuShortcut>
 </ContextMenuItem>
 <ContextMenuItem onClick={() => runTmuxCommand('respawn-pane -k')} className="gap-2">
 <UilSync size={14} className="text-teal-500" /> Respawn Pane
 </ContextMenuItem>
 <ContextMenuItem onClick={() => runTmuxCommand('kill-pane')} className="gap-2 text-orange-500">
 <UilTimes size={14} /> Kill Pane
 <ContextMenuShortcut>Ctrl+B x</ContextMenuShortcut>
 </ContextMenuItem>
 <ContextMenuSeparator />

 {/* Terminal actions */}
 <ContextMenuItem onClick={() => { const t = terminalsRef.current.find(t => t.id === activeTerminalId); if (t) t.xterm.clear(); }} className="gap-2">
 Clear <ContextMenuShortcut>Ctrl+Shift+K</ContextMenuShortcut>
 </ContextMenuItem>
 <ContextMenuItem onClick={() => setSearchVisible(v => !v)} className="gap-2">
 <UilSearch size={14} /> Search <ContextMenuShortcut>Ctrl+Shift+F</ContextMenuShortcut>
 </ContextMenuItem>
 <ContextMenuSeparator />

 {/* New terminals & presets */}
 <div className="px-2 py-1 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">New</div>
 <ContextMenuItem onClick={() => createTerminal()} className="gap-2">
 <UilWindow size={14} /> New tmux
 </ContextMenuItem>
 <ContextMenuItem onClick={() => createTerminal('zsh')} className="gap-2">
 <UilWindow size={14} /> New Zsh
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
 <UilTimes size={14} /> Close Terminal
 </ContextMenuItem>
 </ContextMenuContent>
 </ContextMenu>
 </div>
 </div>
 );
};

// ─── Web Terminal ─────────────────────────────────────────────────────────────
// xterm.js + WebSocket PTY — real zsh shell on VPS via crowbyte.io/terminal/ws
// On desktop: full Electron terminal (tmux, node-pty) — unchanged.

// xterm imports shared with Electron Terminal above (XTerm, FitAddon, WebLinksAddon, SearchAddon)

const TERM_WS_URL = 'wss://crowbyte.io/terminal/ws';
const TERM_TOKEN = 'cb-term-2026-r41n';
const TERM_MODE = 'shell'; // 'shell' for zsh, 'cb' for CrowByte CLI (requires crowbyte-cli installed)

const WebTerminalInner = ({ connectKey }: { connectKey: number }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const termContainerRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const searchAddonRef = useRef<SearchAddon | null>(null);

  // Initialize xterm + WebSocket
  useEffect(() => {
    if (!termContainerRef.current) return;

    const xterm = new XTerm({
      cursorBlink: true,
      cursorStyle: 'bar',
      cursorWidth: 2,
      fontSize: 14,
      fontFamily: '"JetBrains Mono", "Cascadia Code", "Fira Code", "SF Mono", Menlo, Monaco, monospace',
      fontWeight: '400',
      fontWeightBold: '600',
      lineHeight: 1.15,
      theme: {
        background: '#0c0c0c',
        foreground: '#d4d4d4',
        cursor: '#00ff41',
        cursorAccent: '#0c0c0c',
        selectionBackground: 'rgba(0, 255, 65, 0.15)',
        selectionForeground: '#ffffff',
        black: '#1e1e1e',
        red: '#f44747',
        green: '#6a9955',
        yellow: '#dcdcaa',
        blue: '#569cd6',
        magenta: '#c586c0',
        cyan: '#4ec9b0',
        white: '#d4d4d4',
        brightBlack: '#808080',
        brightRed: '#f44747',
        brightGreen: '#6a9955',
        brightYellow: '#dcdcaa',
        brightBlue: '#9cdcfe',
        brightMagenta: '#c586c0',
        brightCyan: '#4ec9b0',
        brightWhite: '#ffffff',
      },
      allowTransparency: true,
      scrollback: 50000,
      smoothScrollDuration: 100,
      allowProposedApi: true,
      rightClickSelectsWord: true,
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();
    const searchAddon = new SearchAddon();

    xterm.loadAddon(fitAddon);
    xterm.loadAddon(webLinksAddon);
    xterm.loadAddon(searchAddon);

    xtermRef.current = xterm;
    fitAddonRef.current = fitAddon;
    searchAddonRef.current = searchAddon;

    xterm.open(termContainerRef.current);
    fitAddon.fit();

    // Keyboard shortcuts
    xterm.attachCustomKeyEventHandler((event) => {
      if (event.type !== 'keydown') return true;
      if (event.ctrlKey && event.shiftKey && event.code === 'KeyC') {
        const sel = xterm.getSelection();
        if (sel) navigator.clipboard.writeText(sel);
        return false;
      }
      if (event.ctrlKey && event.shiftKey && event.code === 'KeyV') {
        navigator.clipboard.readText().then(text => {
          if (text && wsRef.current?.readyState === 1) wsRef.current.send(text);
        });
        return false;
      }
      if (event.ctrlKey && event.shiftKey && event.code === 'KeyF') {
        setSearchVisible(v => !v);
        return false;
      }
      if (event.ctrlKey && event.shiftKey && event.code === 'KeyK') {
        xterm.clear();
        return false;
      }
      return true;
    });

    // Connect WebSocket
    const wsUrl = `${TERM_WS_URL}?token=${encodeURIComponent(TERM_TOKEN)}&cols=${xterm.cols}&rows=${xterm.rows}&mode=${TERM_MODE}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    // Heartbeat: send text-based ping every 15s to keep WS alive
    let pingInterval: ReturnType<typeof setInterval> | null = null;

    ws.onopen = () => {
      setConnected(true);
      setError(null);
      xterm.focus();
      pingInterval = setInterval(() => {
        if (ws.readyState === 1) ws.send('{"type":"ping"}');
      }, 15000);
    };

    ws.onmessage = (event) => {
      // Filter out server pong responses
      if (event.data === '{"type":"pong"}') return;
      xterm.write(event.data);
    };

    ws.onclose = (event) => {
      if (pingInterval) clearInterval(pingInterval);
      setConnected(false);
      if (event.code !== 1000) {
        setError(event.code === 4001 ? 'Authentication failed' : `Disconnected (${event.code})`);
        xterm.writeln('\r\n\x1b[90m[connection closed]\x1b[0m');
      }
    };

    ws.onerror = () => {
      if (pingInterval) clearInterval(pingInterval);
      setError('Connection failed');
      setConnected(false);
    };

    // User input → WebSocket
    xterm.onData((data) => {
      if (ws.readyState === 1) ws.send(data);
    });

    xterm.onBinary((data) => {
      if (ws.readyState === 1) ws.send(data);
    });

    // Resize → WebSocket
    xterm.onResize(({ cols, rows }) => {
      if (ws.readyState === 1) {
        ws.send(JSON.stringify({ type: 'resize', cols, rows }));
      }
    });

    // Window resize → fit
    const handleResize = () => { try { fitAddon.fit(); } catch {} };
    window.addEventListener('resize', handleResize);

    const resizeObserver = new ResizeObserver(handleResize);
    if (termContainerRef.current) resizeObserver.observe(termContainerRef.current);

    return () => {
      if (pingInterval) clearInterval(pingInterval);
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
      ws.close();
      xterm.dispose();
    };
  }, []);

  // Search
  const doSearch = useCallback((query: string, direction: 'next' | 'prev' = 'next') => {
    const sa = searchAddonRef.current;
    if (!sa || !query) return;
    if (direction === 'next') sa.findNext(query);
    else sa.findPrevious(query);
  }, []);

  // Reconnect
  const reconnect = useCallback(() => {
    const xterm = xtermRef.current;
    if (!xterm) return;

    setError(null);
    xterm.clear();
    xterm.writeln('\x1b[90m[reconnecting...]\x1b[0m');

    const wsUrl = `${TERM_WS_URL}?token=${encodeURIComponent(TERM_TOKEN)}&cols=${xterm.cols}&rows=${xterm.rows}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    let rPing: ReturnType<typeof setInterval> | null = null;
    ws.onopen = () => {
      setConnected(true); setError(null); xterm.focus();
      rPing = setInterval(() => { if (ws.readyState === 1) ws.send('{"type":"ping"}'); }, 15000);
    };
    ws.onmessage = (event) => { if (event.data === '{"type":"pong"}') return; xterm.write(event.data); };
    ws.onclose = (event) => {
      if (rPing) clearInterval(rPing);
      setConnected(false);
      if (event.code !== 1000) {
        setError(`Disconnected (${event.code})`);
        xterm.writeln('\r\n\x1b[90m[connection closed]\x1b[0m');
      }
    };
    ws.onerror = () => { if (rPing) clearInterval(rPing); setError('Connection failed'); setConnected(false); };
    xterm.onData((data) => { if (ws.readyState === 1) ws.send(data); });
    xterm.onBinary((data) => { if (ws.readyState === 1) ws.send(data); });
    xterm.onResize(({ cols, rows }) => {
      if (ws.readyState === 1) ws.send(JSON.stringify({ type: 'resize', cols, rows }));
    });
  }, []);

  return (
    <div className={`animate-fade-in flex flex-col ${isFullscreen ? 'fixed inset-0 z-50 bg-[#0c0c0c]' : 'h-[calc(100vh-6rem)]'}`}>
      {/* Header bar */}
      <div className={`flex items-center justify-between shrink-0 ${isFullscreen ? 'px-3 py-1.5 bg-[#181818] border-b border-white/[0.04]' : 'pb-2'}`}>
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10">
            <UilWindow size={14} className="text-emerald-400" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-zinc-100">Terminal</span>
            {connected && (
              <span className="flex items-center gap-1 text-[10px] text-emerald-500">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                zsh
              </span>
            )}
            {!connected && !error && (
              <span className="flex items-center gap-1 text-[10px] text-amber-500">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                Connecting...
              </span>
            )}
            {error && (
              <span className="flex items-center gap-1 text-[10px] text-red-500">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                {error}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Reconnect */}
          {!connected && (
            <button
              onClick={reconnect}
              title="Reconnect"
              className="flex items-center justify-center gap-1.5 h-7 px-2.5 rounded-md transition-all duration-150 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 text-xs font-medium"
            >
              <UilSync size={14} />
              <span className="hidden sm:inline">Reconnect</span>
            </button>
          )}

          {/* Search */}
          <button
            onClick={() => setSearchVisible(v => !v)}
            title="Search (Ctrl+Shift+F)"
            className="flex items-center justify-center w-7 h-7 rounded-md transition-all duration-150 bg-zinc-800/60 text-zinc-500 hover:bg-zinc-700/60 hover:text-zinc-300 backdrop-blur-sm border border-zinc-700/40"
          >
            <UilSearch size={14} />
          </button>

          <button
            onClick={() => setIsFullscreen(f => !f)}
            title="Fullscreen"
            className="flex items-center justify-center w-7 h-7 rounded-md transition-all duration-150 bg-zinc-800/60 text-zinc-500 hover:bg-zinc-700/60 hover:text-zinc-300 backdrop-blur-sm border border-zinc-700/40"
          >
            {isFullscreen ? <UilCompressArrows size={14} /> : <UilExpandArrows size={14} />}
          </button>
        </div>
      </div>

      {/* Search bar */}
      {searchVisible && (
        <div className="flex items-center gap-2 px-3 py-1 bg-[#181818] border-b border-zinc-800/50 shrink-0">
          <UilSearch size={12} className="text-muted-foreground" />
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
          <button className="text-muted-foreground hover:text-white" onClick={() => setSearchVisible(false)}><UilTimes size={12} /></button>
        </div>
      )}

      {/* Terminal */}
      <div className="flex-1 overflow-hidden rounded-lg border border-zinc-800 bg-[#0c0c0c]">
        <div ref={termContainerRef} className="h-full w-full" />
      </div>
    </div>
  );
};

// Wrapper that remounts the terminal on every sidebar click (location.key changes)
const WebTerminalPage = () => {
  const location = useLocation();
  return <WebTerminalInner key={location.key} connectKey={0} />;
};

export default IS_WEB ? WebTerminalPage : Terminal;
