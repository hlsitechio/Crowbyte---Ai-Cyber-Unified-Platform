import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Desktop, Globe, X, DownloadSimple } from "@phosphor-icons/react";

interface LaunchAppButtonProps {
  className?: string;
  children?: React.ReactNode;
}

export default function LaunchAppButton({ className, children }: LaunchAppButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [showNotInstalled, setShowNotInstalled] = useState(false);

  const handleClick = useCallback(() => {
    // In Electron, skip the modal — navigate directly
    if (window.navigator.userAgent.includes("Electron")) {
      window.location.hash = "#/dashboard";
      return;
    }

    setShowModal(true);
    setShowNotInstalled(false);
  }, []);

  const openWebApp = useCallback(() => {
    setShowModal(false);
    window.location.hash = "#/auth";
  }, []);

  return (
    <>
      <button onClick={handleClick} className={className}>
        {children || "Launch App"}
      </button>

      {/* Launch Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-sm mx-4 rounded-lg border border-white/10 bg-zinc-950 p-6 shadow-2xl"
            >
              {/* Close */}
              <button
                onClick={() => setShowModal(false)}
                className="absolute top-3 right-3 text-zinc-500 hover:text-white transition-colors"
                aria-label="Close"
              >
                <X size={18} />
              </button>

              {/* Header */}
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-3">
                  <Desktop size={24} weight="duotone" className="text-emerald-500" />
                </div>
                <h3 className="font-['JetBrains_Mono'] text-lg font-bold text-white">
                  Open CrowByte
                </h3>
                <p className="font-['JetBrains_Mono'] text-xs text-zinc-500 mt-1">
                  Choose how to launch
                </p>
              </div>

              {/* Options */}
              <div className="space-y-2">
                {/* Desktop App Option */}
                <button
                  onClick={() => setShowNotInstalled(true)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-md border border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 transition-colors text-left group"
                >
                  <Desktop size={20} weight="duotone" className="text-emerald-500 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="font-['JetBrains_Mono'] text-sm font-semibold text-white group-hover:text-emerald-400 transition-colors">
                      Desktop App
                    </div>
                    <div className="font-['JetBrains_Mono'] text-[10px] text-zinc-500">
                      Full Electron experience
                    </div>
                  </div>
                </button>

                {/* Not installed message */}
                <AnimatePresence>
                  {showNotInstalled && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 py-3 rounded-md bg-amber-500/5 border border-amber-500/20 text-center">
                        <p className="font-['JetBrains_Mono'] text-xs text-amber-400">
                          Desktop app not detected
                        </p>
                        <p className="font-['JetBrains_Mono'] text-[10px] text-zinc-500 mt-1">
                          Download it below or continue in browser
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Web App Option */}
                <button
                  onClick={openWebApp}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-md border border-white/10 hover:bg-white/5 transition-colors text-left group"
                >
                  <Globe size={20} weight="duotone" className="text-zinc-400 flex-shrink-0" />
                  <div>
                    <div className="font-['JetBrains_Mono'] text-sm font-medium text-zinc-300 group-hover:text-white transition-colors">
                      Continue in Browser
                    </div>
                    <div className="font-['JetBrains_Mono'] text-[10px] text-zinc-500">
                      Web app — no install needed
                    </div>
                  </div>
                </button>

                {/* Download */}
                <div className="pt-2 border-t border-white/5">
                  <a
                    href="https://github.com/hlsitechio/crowbyte/releases"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center gap-3 px-4 py-2 rounded-md hover:bg-white/5 transition-colors text-left group"
                  >
                    <DownloadSimple size={18} weight="duotone" className="text-zinc-500 flex-shrink-0" />
                    <div className="font-['JetBrains_Mono'] text-[11px] text-zinc-500 group-hover:text-zinc-300 transition-colors">
                      Download Desktop App
                    </div>
                  </a>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
