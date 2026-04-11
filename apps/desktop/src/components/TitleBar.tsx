import { UilMinus, UilSquare, UilTimes, UilLeftArrowFromLeft } from "@iconscout/react-unicons";
import { motion } from "framer-motion";
import { useBrowserPanelSafe } from "@/contexts/browser";
import { IS_ELECTRON } from "@/lib/platform";

export function TitleBar() {
 const browserPanel = useBrowserPanelSafe();

 // Only render in Electron — web users see the browser's native chrome
 if (!IS_ELECTRON) return null;

 const handleMinimize = async () => {
 if (window.electronAPI?.minimizeWindow) {
 await window.electronAPI.minimizeWindow();
 }
 };

 const handleMaximize = async () => {
 if (window.electronAPI?.maximizeWindow) {
 await window.electronAPI.maximizeWindow();
 }
 };

 const handleClose = async () => {
 if (window.electronAPI?.closeWindow) {
 await window.electronAPI.closeWindow();
 }
 };

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

 {/* Right side - Window controls */}
 <div className="flex items-center gap-1" style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}>
 {/* Browser panel toggle */}
 {browserPanel && (
 <motion.button
 whileHover={{ scale: 1.1 }}
 whileTap={{ scale: 0.95 }}
 onClick={browserPanel.toggle}
 className={`w-6 h-6 rounded flex items-center justify-center transition-all duration-200 ${
 browserPanel.isOpen
 ? "bg-primary/20 text-primary"
 : "hover:bg-white/10 text-silver-muted hover:text-white"
 }`}
 title={browserPanel.isOpen ? "Close Browser (Ctrl+B)" : "Open Browser (Ctrl+B)"}
 >
 <UilLeftArrowFromLeft size={12} />
 </motion.button>
 )}

 {/* Minimize */}
 <motion.button
 whileHover={{ scale: 1.1, backgroundColor: "rgba(192, 192, 192, 0.1)" }}
 whileTap={{ scale: 0.95 }}
 onClick={handleMinimize}
 className="w-6 h-6 rounded flex items-center justify-center hover:bg-white/10 text-silver-muted hover:text-white transition-all duration-200"
 title="Minimize"
 >
 <UilMinus size={12} />
 </motion.button>

 {/* Maximize/Restore */}
 <motion.button
 whileHover={{ scale: 1.1, backgroundColor: "rgba(192, 192, 192, 0.1)" }}
 whileTap={{ scale: 0.95 }}
 onClick={handleMaximize}
 className="w-6 h-6 rounded flex items-center justify-center hover:bg-white/10 text-silver-muted hover:text-white transition-all duration-200"
 title="Maximize"
 >
 <UilSquare size={12} />
 </motion.button>

 {/* Close */}
 <motion.button
 whileHover={{ scale: 1.1, backgroundColor: "rgba(239, 68, 68, 0.2)" }}
 whileTap={{ scale: 0.95 }}
 onClick={handleClose}
 className="w-6 h-6 rounded flex items-center justify-center hover:bg-white/[0.03] text-silver-muted hover:text-red-500 transition-all duration-200"
 title="Close"
 >
 <UilTimes size={12} />
 </motion.button>
 </div>
 </div>
 </div>
 );
}
