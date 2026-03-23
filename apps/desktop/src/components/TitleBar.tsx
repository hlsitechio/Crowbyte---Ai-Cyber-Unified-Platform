import { useState, useEffect, useRef } from "react";
import { Minus, Square, X, Pin, PinOff, PanelRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useBrowserPanelSafe } from "@/contexts/browser";

export function TitleBar() {
  const [isPinned, setIsPinned] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const browserPanel = useBrowserPanelSafe();

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

  const handleMouseEnter = () => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    // Wait 5 seconds before hiding
    hideTimeoutRef.current = setTimeout(() => {
      setIsHovered(false);
    }, 5000);
  };

  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, []);

  const shouldShow = isPinned || isHovered;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-40"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Hover trigger area */}
      <div className="absolute top-0 left-0 right-0 h-4" />

      <AnimatePresence>
        {shouldShow && (
          <motion.div
            initial={{ y: -32, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -32, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="relative"
          >
            {/* Draggable area */}
            <div
              className="h-8 bg-black/95 backdrop-blur-md border-b border-primary/20 flex items-center justify-between px-4"
              style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
            >
              {/* Left side - App title */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gradient-silver tracking-wider">
                  CROWBYTE TERMINAL
                </span>
              </div>

              {/* Right side - Window controls */}
              <div className="flex items-center gap-1" style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}>
                {/* Pin button */}
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsPinned(!isPinned)}
                  className={`w-6 h-6 rounded flex items-center justify-center transition-all duration-200 ${
                    isPinned
                      ? "bg-primary/20 text-primary"
                      : "hover:bg-white/10 text-silver-muted hover:text-white"
                  }`}
                  title={isPinned ? "Unpin" : "Pin"}
                >
                  {isPinned ? <Pin className="h-3 w-3" /> : <PinOff className="h-3 w-3" />}
                </motion.button>

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
                    <PanelRight className="h-3 w-3" />
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
                  <Minus className="h-3 w-3" />
                </motion.button>

                {/* Maximize/Restore */}
                <motion.button
                  whileHover={{ scale: 1.1, backgroundColor: "rgba(192, 192, 192, 0.1)" }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleMaximize}
                  className="w-6 h-6 rounded flex items-center justify-center hover:bg-white/10 text-silver-muted hover:text-white transition-all duration-200"
                  title="Maximize"
                >
                  <Square className="h-3 w-3" />
                </motion.button>

                {/* Close */}
                <motion.button
                  whileHover={{ scale: 1.1, backgroundColor: "rgba(239, 68, 68, 0.2)" }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleClose}
                  className="w-6 h-6 rounded flex items-center justify-center hover:bg-red-500/20 text-silver-muted hover:text-red-400 transition-all duration-200"
                  title="Close"
                >
                  <X className="h-3 w-3" />
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
