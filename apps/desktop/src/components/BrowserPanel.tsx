import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, ArrowRight, RotateCw, X, Globe, Lock, ExternalLink,
  Home, GripVertical, Maximize2, Minimize2, Shield, Copy,
  PanelRightClose, Plus, Volume2, VolumeX
} from "lucide-react";
import { useBrowserPanel } from "@/contexts/browser";
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

export function BrowserPanel() {
  const {
    isOpen, panelWidth, close, setPanelWidth
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
    // Account for window position (Electron uses window-relative coords)
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

  // Debounced bounds update
  const debouncedBounds = useCallback(() => {
    if (boundsTimer.current) clearTimeout(boundsTimer.current);
    boundsTimer.current = setTimeout(reportBounds, 16);
  }, [reportBounds]);

  // Initialize — create first tab, sync state
  useEffect(() => {
    if (!isOpen || initialized.current) return;
    const init = async () => {
      const mgr = api();
      if (!mgr) return;
      const state = await mgr.getState();
      if (state.tabs.length === 0) {
        // Create first tab
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

  // Show/hide WebContentsViews when panel visibility changes
  useEffect(() => {
    api()?.setVisible(isOpen);
    if (isOpen) {
      // Delay to let React render the panel, then report bounds
      requestAnimationFrame(() => {
        requestAnimationFrame(reportBounds);
      });
    }
  }, [isOpen, reportBounds]);

  // Listen for events from main process
  useEffect(() => {
    const mgr = api();
    if (!mgr) return;

    mgr.onEvent((data: any) => {
      switch (data.event) {
        case 'tab-updated':
          setTabs(prev => prev.map(t => t.id === data.tab.id ? data.tab : t));
          // Update address bar if active tab URL changed
          setActiveTabId(cur => {
            if (cur === data.tab.id) {
              setAddressBar(data.tab.url);
            }
            return cur;
          });
          break;
        case 'tab-created':
          setTabs(prev => {
            // Add if not exists
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
        case 'visibility-changed':
          // External toggle (e.g., from browser-ctl)
          break;
      }
    });

    return () => {
      mgr.removeEventListeners();
    };
  }, []);

  // ResizeObserver — update bounds when content area changes
  useEffect(() => {
    if (!contentRef.current || !isOpen) return;
    const observer = new ResizeObserver(debouncedBounds);
    observer.observe(contentRef.current);
    // Also report on window resize
    window.addEventListener("resize", debouncedBounds);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", debouncedBounds);
    };
  }, [isOpen, debouncedBounds]);

  // Also report bounds when panel width changes
  useEffect(() => {
    if (isOpen) debouncedBounds();
  }, [panelWidth, isOpen, debouncedBounds]);

  // --- Tab Management ---
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
        close(); // Close panel if no tabs left
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

  // --- Keyboard Shortcuts ---
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

  // --- Navigation ---
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

  // --- Resize ---
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
      const deltaPercent = ((startX - ev.clientX) / totalWidth) * 100;
      setPanelWidth(startWidth + deltaPercent);
    };
    const onMouseUp = () => {
      isDraggingRef.current = false;
      setIsDragging(false);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      // Final bounds report after resize
      requestAnimationFrame(reportBounds);
    };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }, [panelWidth, setPanelWidth, reportBounds]);

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
          className="relative flex flex-row border-l border-zinc-800 bg-zinc-950 overflow-hidden isolate"
          style={{ minWidth: "300px", height: "100%", maxHeight: "100%", overscrollBehavior: "contain" }}
          onWheel={(e) => e.stopPropagation()}
        >
          {/* Resize handle — in layout flow so WebContentsView can't cover it */}
          <div
            onMouseDown={handleResizeStart}
            className={cn(
              "shrink-0 w-[6px] cursor-col-resize z-50 group transition-colors flex items-center justify-center",
              isDragging ? "bg-primary/40" : "hover:bg-primary/20"
            )}
          >
            <div className={cn(
              "transition-opacity",
              isDragging ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            )}>
              <GripVertical className="h-8 w-3 text-zinc-500" />
            </div>
          </div>

          {/* Right side: tab bar + toolbar + content (column layout) */}
          <div className="flex-1 flex flex-col min-w-0 min-h-0">
            {/* Tab bar */}
            <div className="flex items-center bg-zinc-900 border-b border-zinc-800 shrink-0">
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
                      "group relative flex items-center gap-1.5 min-w-0 max-w-[180px] px-2.5 py-1.5 cursor-pointer transition-all text-[11px] select-none border-r border-zinc-800/50",
                      tab.id === activeTabId
                        ? "bg-zinc-950 text-zinc-200 rounded-t-md border-t border-t-primary/60"
                        : "bg-zinc-900 text-zinc-500 hover:bg-zinc-800/60 hover:text-zinc-400"
                    )}
                    onClick={() => switchTab(tab.id)}
                    onMouseDown={(e) => { if (e.button === 1) { e.preventDefault(); closeTab(tab.id); } }}
                    title={tab.title || tab.url}
                  >
                    <div className="shrink-0 w-3.5 h-3.5 flex items-center justify-center">
                      {tab.isLoading ? (
                        <RotateCw className="h-3 w-3 animate-spin text-primary" />
                      ) : tab.favicon ? (
                        <img src={tab.favicon} className="h-3.5 w-3.5 rounded-sm" alt=""
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      ) : (
                        <Globe className="h-3 w-3 text-zinc-600" />
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
                          ? "opacity-60 hover:opacity-100 hover:bg-red-500/20 hover:text-red-400"
                          : "opacity-0 group-hover:opacity-60 hover:!opacity-100 hover:bg-red-500/20 hover:text-red-400"
                      )}
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </div>
                ))}
              </div>
              <button onClick={() => createTab()} className="shrink-0 p-1.5 mx-0.5 rounded-md hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors" title="New Tab (Ctrl+T)">
                <Plus className="h-3.5 w-3.5" />
              </button>
              <button onClick={close} className="shrink-0 p-1.5 mr-1 rounded-md hover:bg-red-500/20 text-zinc-500 hover:text-red-400 transition-colors" title="Close panel (Ctrl+B)">
                <PanelRightClose className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Toolbar */}
            <div className="flex items-center gap-1 px-2 py-1 bg-zinc-900/80 border-b border-zinc-800/50 shrink-0">
              <div className="flex items-center gap-0.5">
                <button onClick={handleBack} disabled={!activeTab?.canGoBack}
                  className={cn("p-1 rounded-md transition-colors hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed")} title="Back">
                  <ArrowLeft className="h-3.5 w-3.5" />
                </button>
                <button onClick={handleForward} disabled={!activeTab?.canGoForward}
                  className={cn("p-1 rounded-md transition-colors hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed")} title="Forward">
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
                <button onClick={handleReload} className="p-1 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors" title={activeTab?.isLoading ? "Stop" : "Reload"}>
                  <RotateCw className={cn("h-3.5 w-3.5", activeTab?.isLoading && "animate-spin")} />
                </button>
                <button onClick={handleHome} className="p-1 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors" title="Home">
                  <Home className="h-3.5 w-3.5" />
                </button>
              </div>

              <form onSubmit={handleNavigate} className="flex-1 min-w-0">
                <div className="relative flex items-center">
                  <div className="absolute left-2 flex items-center pointer-events-none">
                    {activeTab?.isSecure ? <Lock className="h-3 w-3 text-green-500" /> : <Globe className="h-3 w-3 text-zinc-500" />}
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
                    className="absolute right-2 p-0.5 rounded hover:bg-zinc-700/50 text-zinc-500 hover:text-zinc-300 transition-colors" title="Copy URL">
                    <Copy className="h-3 w-3" />
                  </button>
                </div>
              </form>

              <div className="flex items-center gap-0.5">
                <button onClick={handleDevTools} className="p-1 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors" title="DevTools">
                  <Shield className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => { try { window.open(activeTab?.url, '_blank'); } catch {} }}
                  className="p-1 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors" title="Open in external browser">
                  <ExternalLink className="h-3.5 w-3.5" />
                </button>
                <button onClick={toggleMaximize} className="p-1 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors" title={isMaximized ? "Restore" : "Maximize"}>
                  {isMaximized ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            {/* Loading bar */}
            {activeTab?.isLoading && (
              <div className="h-0.5 bg-zinc-800 shrink-0">
                <motion.div initial={{ width: "0%" }} animate={{ width: "80%" }} transition={{ duration: 2, ease: "easeOut" }} className="h-full bg-primary" />
              </div>
            )}

            {/* Content area — WebContentsView renders here (positioned by main process) */}
            <div
              ref={contentRef}
              className="flex-1 min-h-0 relative bg-zinc-950"
            >
              {/* Drag overlay prevents WebContentsView from eating mouse during resize */}
              {isDragging && <div className="absolute inset-0 z-40 cursor-col-resize" />}
              {tabs.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <button onClick={() => createTab()} className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-md text-xs transition-colors">
                    <Plus className="h-3.5 w-3.5" /> New Tab
                  </button>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
