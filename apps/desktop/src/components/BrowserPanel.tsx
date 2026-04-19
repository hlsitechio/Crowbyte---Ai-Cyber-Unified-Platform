import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UilArrowLeft, UilArrowRight, UilSync, UilTimes, UilGlobe, UilLock, UilExternalLinkAlt, UilDraggabledots, UilExpandArrows, UilCompressArrows, UilShield, UilCopy, UilLeftArrowFromLeft, UilPlus, UilHome } from "@iconscout/react-unicons";
import { useBrowserPanel } from "@/contexts/browser";
import { IS_WEB } from "@/lib/platform";
import { cn } from "@/lib/utils";

interface TabState {
 id: string;
 url: string;
 title: string;
 favicon: string;
 isLoading: boolean;
 isSecure: boolean;
 canGoBack: boolean;
 canGoForward: boolean;
}

const api = () => window.electronAPI?.browserMgr;

// ─── Web Browser Panel (proxy-based iframe) ─────────────────────────────────

interface WebTab {
  id: string;
  url: string;
  title: string;
  isLoading: boolean;
}

let webTabCounter = 0;
function createWebTabId(): string { return `web-tab-${++webTabCounter}`; }

function normalizeUrl(input: string): string {
  let url = input.trim();
  if (!url) url = "https://www.google.com";
  else if (!url.match(/^https?:\/\//i)) {
    url = url.includes(".") && !url.includes(" ")
      ? "https://" + url
      : `https://www.google.com/search?q=${encodeURIComponent(url)}`;
  }
  return url;
}

/** Route URL through server-side proxy to bypass X-Frame-Options / CSP */
function proxyUrl(url: string): string {
  if (url.includes('/api/proxy/browse')) return url;
  try {
    const u = new URL(url);
    // Only allow http/https schemes to prevent javascript: or data: XSS via iframe src
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return 'about:blank';
    if (u.hostname === window.location.hostname) return url;
    return `/api/proxy/browse?url=${encodeURIComponent(u.href)}`;
  } catch {
    return 'about:blank';
  }
}

function WebBrowserPanel() {
  const { isOpen, panelWidth, close, setPanelWidth, side, setSide } = useBrowserPanel();
  const [tabs, setTabs] = useState<WebTab[]>([{ id: createWebTabId(), url: "https://www.google.com", title: "New Tab", isLoading: false }]);
  const [activeTabId, setActiveTabId] = useState(tabs[0].id);
  const [addressBar, setAddressBar] = useState("https://www.google.com");
  const [isMaximized, setIsMaximized] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const isDraggingRef = useRef(false);
  const iframeRefs = useRef<Record<string, HTMLIFrameElement | null>>({});

  const activeTab = tabs.find(t => t.id === activeTabId);

  const createTab = useCallback((url?: string) => {
    const id = createWebTabId();
    const tabUrl = url || "https://www.google.com";
    setTabs(prev => [...prev, { id, url: tabUrl, title: "New Tab", isLoading: true }]);
    setActiveTabId(id);
    setAddressBar(tabUrl);
  }, []);

  const closeTab = useCallback((tabId: string) => {
    setTabs(prev => {
      const filtered = prev.filter(t => t.id !== tabId);
      if (filtered.length === 0) { close(); return prev; }
      if (tabId === activeTabId) {
        const idx = prev.findIndex(t => t.id === tabId);
        const nextId = filtered[Math.min(idx, filtered.length - 1)]?.id;
        setActiveTabId(nextId);
        const nextTab = filtered.find(t => t.id === nextId);
        if (nextTab) setAddressBar(nextTab.url);
      }
      return filtered;
    });
  }, [activeTabId, close]);

  const switchTab = useCallback((tabId: string) => {
    setActiveTabId(tabId);
    const tab = tabs.find(t => t.id === tabId);
    if (tab) setAddressBar(tab.url);
  }, [tabs]);

  const handleNavigate = (e: React.FormEvent) => {
    e.preventDefault();
    const url = normalizeUrl(addressBar);
    setAddressBar(url);
    setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, url, isLoading: true } : t));
  };

  const handleReload = () => {
    const iframe = iframeRefs.current[activeTabId];
    if (iframe) { try { iframe.contentWindow?.location.reload(); } catch {} }
  };

  const handleHome = () => {
    const url = "https://www.google.com";
    setAddressBar(url);
    setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, url, isLoading: true } : t));
  };

  const handleIframeLoad = (tabId: string) => {
    setTabs(prev => prev.map(t => {
      if (t.id !== tabId) return t;
      let title = "New Tab";
      try { title = new URL(t.url).hostname; } catch {}
      return { ...t, isLoading: false, title };
    }));
  };

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;
    setIsDragging(true);
    const startX = e.clientX;
    const startWidth = panelWidth;
    const totalWidth = window.innerWidth;
    const onMouseMove = (ev: MouseEvent) => {
      if (!isDraggingRef.current) return;
      ev.preventDefault();
      // Right panel: drag left = bigger. Left panel: drag right = bigger.
      const delta = side === 'left'
        ? ((ev.clientX - startX) / totalWidth) * 100
        : ((startX - ev.clientX) / totalWidth) * 100;
      setPanelWidth(startWidth + delta);
    };
    const onMouseUp = () => {
      isDraggingRef.current = false;
      setIsDragging(false);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }, [panelWidth, setPanelWidth, side]);

  const toggleMaximize = () => {
    setPanelWidth(isMaximized ? 45 : 80);
    setIsMaximized(!isMaximized);
  };

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "t" && !e.shiftKey) { e.preventDefault(); createTab(); }
      else if (e.ctrlKey && e.key === "w" && !e.shiftKey && (e.target as HTMLElement).closest('[data-browser-panel]')) { e.preventDefault(); if (activeTabId) closeTab(activeTabId); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, activeTabId, createTab, closeTab]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          data-browser-panel
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: `${panelWidth}%`, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className={cn("relative flex flex-row bg-background overflow-hidden isolate", side === 'left' ? "border-r border-zinc-800" : "border-l border-zinc-800")}
          style={{ minWidth: "300px", height: "100%", maxHeight: "100%" }}
        >
          {/* Resize handle — left edge when panel is on right, right edge when on left */}
          {side === 'right' && (
            <div onMouseDown={handleResizeStart} className={cn("shrink-0 w-[6px] cursor-col-resize z-50 group transition-colors flex items-center justify-center", isDragging ? "bg-primary/40" : "hover:bg-primary/20")}>
              <div className={cn("transition-opacity", isDragging ? "opacity-100" : "opacity-0 group-hover:opacity-100")}>
                <UilDraggabledots size={12} className="text-zinc-500" />
              </div>
            </div>
          )}

          <div className="flex-1 flex flex-col min-w-0 min-h-0">
            {/* Tab bar */}
            <div className="flex items-center bg-zinc-900 border-b border-white/[0.06] shrink-0">
              <div className="flex-1 flex items-end overflow-x-auto scrollbar-none" style={{ minHeight: 32 }}>
                {tabs.map((tab) => (
                  <div
                    key={tab.id}
                    className={cn(
                      "group relative flex items-center gap-1.5 min-w-0 max-w-[180px] px-2.5 py-1.5 cursor-pointer transition-all text-[11px] select-none border-r border-white/[0.06]/50",
                      tab.id === activeTabId ? "bg-card text-zinc-200 rounded-t-md border-t border-t-primary/60" : "bg-zinc-900 text-zinc-500 hover:bg-zinc-800/60 hover:text-zinc-400"
                    )}
                    onClick={() => switchTab(tab.id)}
                    title={tab.title || tab.url}
                  >
                    <div className="shrink-0 w-3.5 h-3.5 flex items-center justify-center">
                      {tab.isLoading ? <UilSync size={12} className="animate-spin text-primary" /> : <UilGlobe size={12} className="text-zinc-600" />}
                    </div>
                    <span className="truncate flex-1 min-w-0">{tab.title || "New Tab"}</span>
                    <button onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }} className={cn("shrink-0 p-0.5 rounded transition-all", tab.id === activeTabId ? "opacity-60 hover:opacity-100 hover:text-red-500" : "opacity-0 group-hover:opacity-60 hover:!opacity-100 hover:text-red-500")}>
                      <UilTimes size={10} />
                    </button>
                  </div>
                ))}
              </div>
              <button onClick={() => createTab()} className="shrink-0 p-1.5 mx-0.5 rounded-md hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors" title="New Tab (Ctrl+T)">
                <UilPlus size={14} />
              </button>
              <button onClick={() => setSide(side === 'left' ? 'right' : 'left')} className="shrink-0 p-1.5 rounded-md hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors" title={side === 'left' ? 'Move to right' : 'Move to left'}>
                <UilLeftArrowFromLeft size={14} className={cn("transition-transform", side === 'left' && "rotate-180")} />
              </button>
              <button onClick={close} className="shrink-0 p-1.5 mr-1 rounded-md hover:bg-transparent text-zinc-500 hover:text-red-500 transition-colors" title="Close panel (Ctrl+B)">
                <UilTimes size={14} />
              </button>
            </div>

            {/* Toolbar */}
            <div className="flex items-center gap-1 px-2 py-1 bg-zinc-900/80 border-b border-white/[0.06]/50 shrink-0">
              <button onClick={handleReload} className="p-1 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors" title="Reload"><UilSync size={14} /></button>
              <button onClick={handleHome} className="p-1 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors" title="Home"><UilHome size={14} /></button>
              <form onSubmit={handleNavigate} className="flex-1 min-w-0">
                <div className="relative flex items-center">
                  <div className="absolute left-2 flex items-center pointer-events-none"><UilGlobe size={12} className="text-zinc-500" /></div>
                  <input
                    data-browser-address type="text" value={addressBar}
                    onChange={(e) => setAddressBar(e.target.value)}
                    onFocus={(e) => e.target.select()}
                    placeholder="Search or enter URL"
                    className="w-full h-7 pl-7 pr-8 rounded-md text-xs bg-zinc-800/80 border border-zinc-700/50 text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all"
                  />
                  <button type="button" onClick={() => navigator.clipboard.writeText(activeTab?.url || "")} className="absolute right-2 p-0.5 rounded text-zinc-500 hover:text-zinc-300 transition-colors" title="Copy URL"><UilCopy size={12} /></button>
                </div>
              </form>
              <button onClick={() => { try { window.open(activeTab?.url, '_blank'); } catch {} }} className="p-1 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors" title="Open in new window"><UilExternalLinkAlt size={14} /></button>
              <button onClick={toggleMaximize} className="p-1 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors" title={isMaximized ? "Restore" : "Maximize"}>
                {isMaximized ? <UilCompressArrows size={14} /> : <UilExpandArrows size={14} />}
              </button>
            </div>

            {/* Loading bar */}
            {activeTab?.isLoading && (
              <div className="h-0.5 bg-zinc-800 shrink-0">
                <motion.div initial={{ width: "0%" }} animate={{ width: "80%" }} transition={{ duration: 2, ease: "easeOut" }} className="h-full bg-primary" />
              </div>
            )}

            {/* Content — proxied iframes */}
            <div className="flex-1 min-h-0 relative bg-background">
              {isDragging && <div className="absolute inset-0 z-40 cursor-col-resize" />}
              {tabs.map((tab) => (
                <iframe
                  key={tab.id}
                  ref={(el) => { iframeRefs.current[tab.id] = el; }}
                  src={proxyUrl(tab.url)}
                  title={tab.title}
                  onLoad={() => handleIframeLoad(tab.id)}
                  className={cn("absolute inset-0 w-full h-full border-0", tab.id === activeTabId ? "block" : "hidden")}
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
                  referrerPolicy="no-referrer"
                  allow="clipboard-write"
                />
              ))}
            </div>
          </div>

          {/* Resize handle — right edge when panel is on left */}
          {side === 'left' && (
            <div onMouseDown={handleResizeStart} className={cn("shrink-0 w-[6px] cursor-col-resize z-50 group transition-colors flex items-center justify-center", isDragging ? "bg-primary/40" : "hover:bg-primary/20")}>
              <div className={cn("transition-opacity", isDragging ? "opacity-100" : "opacity-0 group-hover:opacity-100")}>
                <UilDraggabledots size={12} className="text-zinc-500" />
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Desktop Browser Panel (Electron WebContentsView) ────────────────────────

function DesktopBrowserPanel() {
 const {
 isOpen, panelWidth, close, setPanelWidth, side, setSide
 } = useBrowserPanel();

 const [tabs, setTabs] = useState<TabState[]>([]);
 const [activeTabId, setActiveTabId] = useState<string | null>(null);
 const [addressBar, setAddressBar] = useState("https://www.google.com");
 const [isMaximized, setIsMaximized] = useState(false);
 const [isDragging, setIsDragging] = useState(false);
 const isDraggingRef = useRef(false);
 const contentRef = useRef<HTMLDivElement>(null);
 const tabBarRef = useRef<HTMLDivElement>(null);
 const boundsTimer = useRef<ReturnType<typeof setTimeout>>();
 const initialized = useRef(false);

 const activeTab = tabs.find(t => t.id === activeTabId);

 // Report content area bounds to main process
 const reportBounds = useCallback(() => {
 if (!contentRef.current || !isOpen) return;
 const rect = contentRef.current.getBoundingClientRect();
 const bounds = {
 x: Math.round(rect.left),
 y: Math.round(rect.top),
 width: Math.round(rect.width),
 height: Math.round(rect.height),
 };
 if (bounds.width > 0 && bounds.height > 0) {
 api()?.setBounds(bounds);
 }
 }, [isOpen]);

 const debouncedBounds = useCallback(() => {
 if (boundsTimer.current) clearTimeout(boundsTimer.current);
 boundsTimer.current = setTimeout(reportBounds, 16);
 }, [reportBounds]);

 useEffect(() => {
 if (!isOpen || initialized.current) return;
 const init = async () => {
 const mgr = api();
 if (!mgr) return;
 const state = await mgr.getState();
 if (state.tabs.length === 0) {
 const result = await mgr.createTab({ url: "https://www.google.com" });
 setTabs(result.tabs);
 setActiveTabId(result.activeTabId);
 if (result.tabs.length > 0) setAddressBar(result.tabs[0].url);
 } else {
 setTabs(state.tabs);
 setActiveTabId(state.activeTabId);
 const active = state.tabs.find((t: TabState) => t.id === state.activeTabId);
 if (active) setAddressBar(active.url);
 }
 initialized.current = true;
 };
 init();
 }, [isOpen]);

 useEffect(() => {
 api()?.setVisible(isOpen);
 if (isOpen) {
 requestAnimationFrame(() => {
 requestAnimationFrame(reportBounds);
 });
 }
 }, [isOpen, reportBounds]);

 useEffect(() => {
 const mgr = api();
 if (!mgr) return;

 mgr.onEvent((data: any) => {
 switch (data.event) {
 case 'tab-updated':
 setTabs(prev => prev.map(t => t.id === data.tab.id ? data.tab : t));
 setActiveTabId(cur => {
 if (cur === data.tab.id) {
 setAddressBar(data.tab.url);
 }
 return cur;
 });
 break;
 case 'tab-created':
 setTabs(prev => {
 if (prev.find(t => t.id === data.tab.id)) return prev;
 return [...prev, data.tab];
 });
 if (data.activeTabId) {
 setActiveTabId(data.activeTabId);
 setAddressBar(data.tab.url);
 }
 break;
 case 'tab-closed':
 setTabs(prev => prev.filter(t => t.id !== data.tabId));
 if (data.activeTabId) setActiveTabId(data.activeTabId);
 break;
 case 'tab-switched':
 setActiveTabId(data.activeTabId);
 if (data.tab) setAddressBar(data.tab.url);
 break;
 }
 });

 return () => {
 mgr.removeEventListeners();
 };
 }, []);

 useEffect(() => {
 if (!contentRef.current || !isOpen) return;
 const observer = new ResizeObserver(debouncedBounds);
 observer.observe(contentRef.current);
 window.addEventListener("resize", debouncedBounds);
 return () => {
 observer.disconnect();
 window.removeEventListener("resize", debouncedBounds);
 };
 }, [isOpen, debouncedBounds]);

 useEffect(() => {
 if (isOpen) debouncedBounds();
 }, [panelWidth, isOpen, side, debouncedBounds]);

 const createTab = useCallback(async (url?: string) => {
 const result = await api()?.createTab({ url, makeActive: true });
 if (result) {
 setTabs(result.tabs);
 setActiveTabId(result.activeTabId);
 }
 }, []);

 const closeTab = useCallback(async (tabId: string) => {
 const result = await api()?.closeTab(tabId);
 if (result) {
 setTabs(result.tabs);
 setActiveTabId(result.activeTabId);
 if (result.tabs.length === 0) {
 close();
 }
 }
 }, [close]);

 const switchTab = useCallback(async (tabId: string) => {
 const result = await api()?.switchTab(tabId);
 if (result) {
 setActiveTabId(result.activeTabId);
 if (result.tab) setAddressBar(result.tab.url);
 }
 }, []);

 useEffect(() => {
 if (!isOpen) return;
 const handler = (e: KeyboardEvent) => {
 const target = e.target as HTMLElement;
 const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA";

 if (e.ctrlKey && e.key === "t" && !e.shiftKey) {
 e.preventDefault();
 createTab();
 } else if (e.ctrlKey && e.key === "w" && !e.shiftKey && target.closest('[data-browser-panel]')) {
 e.preventDefault();
 if (activeTabId) closeTab(activeTabId);
 } else if (e.ctrlKey && e.key === "Tab") {
 e.preventDefault();
 const idx = tabs.findIndex(t => t.id === activeTabId);
 const next = (idx + (e.shiftKey ? -1 : 1) + tabs.length) % tabs.length;
 switchTab(tabs[next].id);
 } else if (e.ctrlKey && !isInput && e.key === "l") {
 e.preventDefault();
 const input = document.querySelector('[data-browser-address]') as HTMLInputElement;
 input?.focus();
 input?.select();
 }
 };
 window.addEventListener("keydown", handler);
 return () => window.removeEventListener("keydown", handler);
 }, [isOpen, activeTabId, tabs, createTab, closeTab, switchTab]);

 const handleNavigate = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!addressBar.trim()) return;
 await api()?.navigate(addressBar.trim());
 };

 const handleBack = () => api()?.back();
 const handleForward = () => api()?.forward();
 const handleReload = () => activeTab?.isLoading ? api()?.stop() : api()?.reload();
 const handleHome = () => api()?.navigate("https://www.google.com");
 const handleCopyUrl = () => navigator.clipboard.writeText(activeTab?.url || "");
 const handleDevTools = () => api()?.devtools();

 const handleResizeStart = useCallback((e: React.MouseEvent) => {
 e.preventDefault();
 isDraggingRef.current = true;
 setIsDragging(true);
 const startX = e.clientX;
 const startWidth = panelWidth;
 const totalWidth = window.innerWidth;
 const onMouseMove = (ev: MouseEvent) => {
 if (!isDraggingRef.current) return;
 ev.preventDefault();
 // Right panel: drag left = bigger. Left panel: drag right = bigger.
 const deltaPercent = side === 'left'
   ? ((ev.clientX - startX) / totalWidth) * 100
   : ((startX - ev.clientX) / totalWidth) * 100;
 setPanelWidth(startWidth + deltaPercent);
 };
 const onMouseUp = () => {
 isDraggingRef.current = false;
 setIsDragging(false);
 document.removeEventListener("mousemove", onMouseMove);
 document.removeEventListener("mouseup", onMouseUp);
 document.body.style.cursor = "";
 document.body.style.userSelect = "";
 requestAnimationFrame(reportBounds);
 };
 document.body.style.cursor = "col-resize";
 document.body.style.userSelect = "none";
 document.addEventListener("mousemove", onMouseMove);
 document.addEventListener("mouseup", onMouseUp);
 }, [panelWidth, setPanelWidth, reportBounds, side]);

 const toggleMaximize = () => {
 setPanelWidth(isMaximized ? 45 : 80);
 setIsMaximized(!isMaximized);
 };

 const handleTabBarWheel = useCallback((e: React.WheelEvent) => {
 e.stopPropagation();
 if (tabBarRef.current) tabBarRef.current.scrollLeft += e.deltaY;
 }, []);

 if (!isOpen) return null;

 return (
 <AnimatePresence>
 {isOpen && (
 <motion.div
 data-browser-panel
 initial={{ width: 0, opacity: 0 }}
 animate={{ width: `${panelWidth}%`, opacity: 1 }}
 exit={{ width: 0, opacity: 0 }}
 transition={{ type: "spring", stiffness: 300, damping: 30 }}
 className={cn("relative flex flex-row bg-background overflow-hidden isolate", side === 'left' ? "border-r border-zinc-800" : "border-l border-zinc-800")}
 style={{ minWidth: "300px", height: "100%", maxHeight: "100%", overscrollBehavior: "contain" }}
 onWheel={(e) => e.stopPropagation()}
 >
 {/* Resize handle — left edge for right panel */}
 {side === 'right' && (
 <div
 onMouseDown={handleResizeStart}
 className={cn(
 "shrink-0 w-[6px] cursor-col-resize z-50 group transition-colors flex items-center justify-center",
 isDragging ? "bg-primary/40" : "hover:bg-primary/20"
 )}
 >
 <div className={cn("transition-opacity", isDragging ? "opacity-100" : "opacity-0 group-hover:opacity-100")}>
 <UilDraggabledots size={12} className="text-zinc-500" />
 </div>
 </div>
 )}

 <div className="flex-1 flex flex-col min-w-0 min-h-0">
 {/* Tab bar */}
 <div className="flex items-center bg-zinc-900 border-b border-white/[0.06] shrink-0">
 <div
 ref={tabBarRef}
 className="flex-1 flex items-end overflow-x-auto scrollbar-none"
 onWheel={handleTabBarWheel}
 style={{ minHeight: 32 }}
 >
 {tabs.map((tab) => (
 <div
 key={tab.id}
 className={cn(
 "group relative flex items-center gap-1.5 min-w-0 max-w-[180px] px-2.5 py-1.5 cursor-pointer transition-all text-[11px] select-none border-r border-white/[0.06]/50",
 tab.id === activeTabId
 ? "bg-card text-zinc-200 rounded-t-md border-t border-t-primary/60"
 : "bg-zinc-900 text-zinc-500 hover:bg-zinc-800/60 hover:text-zinc-400"
 )}
 onClick={() => switchTab(tab.id)}
 onMouseDown={(e) => { if (e.button === 1) { e.preventDefault(); closeTab(tab.id); } }}
 title={tab.title || tab.url}
 >
 <div className="shrink-0 w-3.5 h-3.5 flex items-center justify-center">
 {tab.isLoading ? (
 <UilSync size={12} className="animate-spin text-primary" />
 ) : tab.favicon ? (
 <img src={tab.favicon} className="h-3.5 w-3.5 rounded-sm" alt=""
 onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
 ) : (
 <UilGlobe size={12} className="text-zinc-600" />
 )}
 </div>
 <span className="truncate flex-1 min-w-0">
 {tab.title || (() => { try { return new URL(tab.url).hostname; } catch { return "New Tab"; } })()}
 </span>
 <button
 onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }}
 className={cn(
 "shrink-0 p-0.5 rounded transition-all",
 tab.id === activeTabId
 ? "opacity-60 hover:opacity-100 hover:bg-white/[0.03] hover:text-red-500"
 : "opacity-0 group-hover:opacity-60 hover:!opacity-100 hover:bg-white/[0.03] hover:text-red-500"
 )}
 >
 <UilTimes size={10} />
 </button>
 </div>
 ))}
 </div>
 <button onClick={() => createTab()} className="shrink-0 p-1.5 mx-0.5 rounded-md hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors" title="New Tab (Ctrl+T)">
 <UilPlus size={14} />
 </button>
 <button onClick={() => setSide(side === 'left' ? 'right' : 'left')} className="shrink-0 p-1.5 rounded-md hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors" title={side === 'left' ? 'Move to right' : 'Move to left'}>
 <UilLeftArrowFromLeft size={14} className={cn("transition-transform", side === 'left' && "rotate-180")} />
 </button>
 <button onClick={close} className="shrink-0 p-1.5 mr-1 rounded-md hover:bg-transparent text-zinc-500 hover:text-red-500 transition-colors" title="Close panel (Ctrl+B)">
 <UilTimes size={14} />
 </button>
 </div>

 {/* Toolbar */}
 <div className="flex items-center gap-1 px-2 py-1 bg-zinc-900/80 border-b border-white/[0.06]/50 shrink-0">
 <div className="flex items-center gap-0.5">
 <button onClick={handleBack} disabled={!activeTab?.canGoBack}
 className={cn("p-1 rounded-md transition-colors hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed")} title="Back">
 <UilArrowLeft size={14} />
 </button>
 <button onClick={handleForward} disabled={!activeTab?.canGoForward}
 className={cn("p-1 rounded-md transition-colors hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed")} title="Forward">
 <UilArrowRight size={14} />
 </button>
 <button onClick={handleReload} className="p-1 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors" title={activeTab?.isLoading ? "Stop" : "Reload"}>
 <UilSync className={cn(activeTab?.isLoading && "animate-spin")} size={14} />
 </button>
 <button onClick={handleHome} className="p-1 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors" title="Home">
 <UilHome size={14} />
 </button>
 </div>

 <form onSubmit={handleNavigate} className="flex-1 min-w-0">
 <div className="relative flex items-center">
 <div className="absolute left-2 flex items-center pointer-events-none">
 {activeTab?.isSecure ? <UilLock size={12} className="text-emerald-500" /> : <UilGlobe size={12} className="text-zinc-500" />}
 </div>
 <input
 data-browser-address
 type="text"
 value={addressBar}
 onChange={(e) => setAddressBar(e.target.value)}
 onFocus={(e) => e.target.select()}
 placeholder="Search or enter URL"
 className={cn(
 "w-full h-7 pl-7 pr-8 rounded-md text-xs",
 "bg-zinc-800/80 border border-zinc-700/50",
 "text-zinc-200 placeholder:text-zinc-500",
 "focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition-all"
 )}
 />
 <button type="button" onClick={handleCopyUrl}
 className="absolute right-2 p-0.5 rounded hover:bg-white/[0.03] text-zinc-500 hover:text-zinc-300 transition-colors" title="Copy URL">
 <UilCopy size={12} />
 </button>
 </div>
 </form>

 <div className="flex items-center gap-0.5">
 <button onClick={handleDevTools} className="p-1 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors" title="DevTools">
 <UilShield size={14} />
 </button>
 <button onClick={() => { try { window.open(activeTab?.url, '_blank'); } catch {} }}
 className="p-1 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors" title="Open in external browser">
 <UilExternalLinkAlt size={14} />
 </button>
 <button onClick={toggleMaximize} className="p-1 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors" title={isMaximized ? "Restore" : "Maximize"}>
 {isMaximized ? <UilCompressArrows size={14} /> : <UilExpandArrows size={14} />}
 </button>
 </div>
 </div>

 {/* Loading bar */}
 {activeTab?.isLoading && (
 <div className="h-0.5 bg-zinc-800 shrink-0">
 <motion.div initial={{ width: "0%" }} animate={{ width: "80%" }} transition={{ duration: 2, ease: "easeOut" }} className="h-full bg-primary" />
 </div>
 )}

 {/* Content area — WebContentsView renders here */}
 <div
 ref={contentRef}
 className="flex-1 min-h-0 relative bg-background"
 >
 {isDragging && <div className="absolute inset-0 z-40 cursor-col-resize" />}
 {tabs.length === 0 && (
 <div className="absolute inset-0 flex items-center justify-center">
 <button onClick={() => createTab()} className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-md text-xs transition-colors">
 <UilPlus size={14} /> New Tab
 </button>
 </div>
 )}
 </div>
 </div>

 {/* Resize handle — right edge for left panel */}
 {side === 'left' && (
 <div
 onMouseDown={handleResizeStart}
 className={cn(
 "shrink-0 w-[6px] cursor-col-resize z-50 group transition-colors flex items-center justify-center",
 isDragging ? "bg-primary/40" : "hover:bg-primary/20"
 )}
 >
 <div className={cn("transition-opacity", isDragging ? "opacity-100" : "opacity-0 group-hover:opacity-100")}>
 <UilDraggabledots size={12} className="text-zinc-500" />
 </div>
 </div>
 )}
 </motion.div>
 )}
 </AnimatePresence>
 );
}

// ─── Export: auto-select based on platform ───────────────────────────────────

export function BrowserPanel() {
  return IS_WEB ? <WebBrowserPanel /> : <DesktopBrowserPanel />;
}
