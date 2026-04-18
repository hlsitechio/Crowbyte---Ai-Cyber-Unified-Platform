import { motion } from "framer-motion";
import { useBrowserPanelSafe } from "@/contexts/browser";
import { IS_ELECTRON } from "@/lib/platform";

export function TitleBar() {
 const browserPanel = useBrowserPanelSafe();

 // Only render in Electron — web users see the browser's native chrome
 if (!IS_ELECTRON) return null;

 const handleMinimize = async (e: React.MouseEvent) => {
 e.stopPropagation();
 await window.electronAPI?.minimizeWindow?.();
 };

 const handleMaximize = async (e: React.MouseEvent) => {
 e.stopPropagation();
 await window.electronAPI?.maximizeWindow?.();
 };

 const handleClose = async (e: React.MouseEvent) => {
 e.stopPropagation();
 await window.electronAPI?.closeWindow?.();
 };

 const btnBase = "w-7 h-7 rounded flex items-center justify-center text-zinc-400 hover:text-white transition-colors duration-150 cursor-pointer";

 return (
 <div className="fixed top-0 left-0 right-0 z-40">
 {/* Draggable area — always visible */}
 <div
  className="h-8 bg-[hsl(0,0%,6%)]/95 backdrop-blur-md border-b border-white/[0.08] flex items-center justify-between px-4"
  style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
 >
  {/* Left side - App title */}
  <div className="flex items-center gap-2">
  <span className="text-xs font-bold text-gradient-silver tracking-wider">
   CROWBYTE
  </span>
  </div>

  {/* Right side - Window controls — must be no-drag for clicks to register */}
  <div
  className="flex items-center gap-0.5"
  style={{ WebkitAppRegion: "no-drag", pointerEvents: "all" } as React.CSSProperties}
  >
  {/* Browser panel toggle */}
  {browserPanel && (
   <button
   onClick={(e) => { e.stopPropagation(); browserPanel.toggle(); }}
   className={`${btnBase} ${browserPanel.isOpen ? "bg-primary/20 text-primary" : "hover:bg-white/10"}`}
   title={browserPanel.isOpen ? "Close Browser (Ctrl+B)" : "Open Browser (Ctrl+B)"}
   >
   <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10M21 12H9m6-4 4 4-4 4"/></svg>
   </button>
  )}

  {/* Minimize */}
  <button
   onClick={handleMinimize}
   className={`${btnBase} hover:bg-white/10`}
   title="Minimize"
  >
   <svg width="10" height="2" viewBox="0 0 10 2" fill="currentColor"><rect width="10" height="2" rx="1"/></svg>
  </button>

  {/* Maximize/Restore */}
  <button
   onClick={handleMaximize}
   className={`${btnBase} hover:bg-white/10`}
   title="Maximize"
  >
   <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="0.75" y="0.75" width="8.5" height="8.5" rx="0.5"/></svg>
  </button>

  {/* Close */}
  <button
   onClick={handleClose}
   className={`${btnBase} hover:bg-red-500/20 hover:text-red-400`}
   title="Close"
  >
   <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M1 1l8 8M9 1l-8 8"/></svg>
  </button>
  </div>
 </div>
 </div>
 );
}
