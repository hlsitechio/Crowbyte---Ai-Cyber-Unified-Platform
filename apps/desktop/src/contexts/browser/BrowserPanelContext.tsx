import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";

interface BrowserPanelState {
  isOpen: boolean;
  url: string;
  panelWidth: number; // percentage 20-80
  history: string[];
  historyIndex: number;
  side: 'left' | 'right';
}

interface BrowserPanelContextType extends BrowserPanelState {
  toggle: () => void;
  open: (url?: string) => void;
  close: () => void;
  navigate: (url: string) => void;
  goBack: () => void;
  goForward: () => void;
  setPanelWidth: (width: number) => void;
  setSide: (side: 'left' | 'right') => void;
  canGoBack: boolean;
  canGoForward: boolean;
}

const BrowserPanelContext = createContext<BrowserPanelContextType | null>(null);

// eslint-disable-next-line react-refresh/only-export-components
export function useBrowserPanel() {
  const ctx = useContext(BrowserPanelContext);
  if (!ctx) throw new Error("useBrowserPanel must be used within BrowserPanelProvider");
  return ctx;
}

// Safe version that returns null if not within provider
// eslint-disable-next-line react-refresh/only-export-components
export function useBrowserPanelSafe() {
  return useContext(BrowserPanelContext);
}

const DEFAULT_URL = "https://www.google.com";
const STORAGE_KEY = "crowbyte-browser-panel";

function loadState(): Partial<BrowserPanelState> {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch { /* empty */ }
  return {};
}

function saveState(state: Partial<BrowserPanelState>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      url: state.url,
      panelWidth: state.panelWidth,
      isOpen: state.isOpen,
      side: state.side,
    }));
  } catch { /* empty */ }
}

export function BrowserPanelProvider({ children }: { children: ReactNode }) {
  const saved = loadState();
  const [isOpen, setIsOpen] = useState(saved.isOpen ?? false);
  const [url, setUrl] = useState(saved.url ?? DEFAULT_URL);
  const [panelWidth, setPanelWidthState] = useState(saved.panelWidth ?? 45);
  const [history, setHistory] = useState<string[]>([saved.url ?? DEFAULT_URL]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [side, setSideState] = useState<'left' | 'right'>(saved.side ?? 'right');

  // Persist state
  useEffect(() => {
    saveState({ url, panelWidth, isOpen, side });
  }, [url, panelWidth, isOpen, side]);

  // Global keyboard shortcut: Ctrl+B
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "b" && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const navigate = useCallback((newUrl: string) => {
    // Add protocol if missing
    let normalizedUrl = newUrl.trim();
    if (normalizedUrl && !normalizedUrl.match(/^https?:\/\//i) && !normalizedUrl.startsWith("about:")) {
      if (normalizedUrl.includes(".") && !normalizedUrl.includes(" ")) {
        normalizedUrl = "https://" + normalizedUrl;
      } else {
        normalizedUrl = `https://www.google.com/search?q=${encodeURIComponent(normalizedUrl)}`;
      }
    }
    setUrl(normalizedUrl);
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(normalizedUrl);
      return newHistory;
    });
    setHistoryIndex(prev => prev + 1);
  }, [historyIndex]);

  const toggle = useCallback(() => setIsOpen(prev => !prev), []);
  const open = useCallback((openUrl?: string) => {
    if (openUrl) navigate(openUrl);
    setIsOpen(true);
  }, [navigate]);
  const close = useCallback(() => setIsOpen(false), []);

  const goBack = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setUrl(history[newIndex]);
    }
  }, [history, historyIndex]);

  const goForward = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setUrl(history[newIndex]);
    }
  }, [history, historyIndex]);

  const setPanelWidth = useCallback((width: number) => {
    setPanelWidthState(Math.max(20, Math.min(80, width)));
  }, []);

  const setSide = useCallback((s: 'left' | 'right') => {
    setSideState(s);
  }, []);

  return (
    <BrowserPanelContext.Provider value={{
      isOpen, url, panelWidth, history, historyIndex, side,
      toggle, open, close, navigate, goBack, goForward, setPanelWidth, setSide,
      canGoBack: historyIndex > 0,
      canGoForward: historyIndex < history.length - 1,
    }}>
      {children}
    </BrowserPanelContext.Provider>
  );
}
