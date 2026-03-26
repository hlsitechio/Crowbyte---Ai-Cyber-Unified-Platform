import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { List, X } from "@phosphor-icons/react";
import LaunchAppButton from "./LaunchAppButton";

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
  { label: "Docs", href: "#docs" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = (id: string) => {
    document.querySelector(id)?.scrollIntoView({ behavior: "smooth" });
    setMobileOpen(false);
  };

  return (
    <>
      <motion.nav
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-black/80 backdrop-blur-md border-b border-white/[0.06]"
            : "bg-transparent"
        }`}
      >
        <div className="mx-auto max-w-6xl flex items-center justify-between px-6 h-14">
          {/* Logo — text only */}
          <button
            onClick={() => scrollTo("#hero")}
            className="font-['JetBrains_Mono'] text-lg font-bold tracking-tight"
          >
            <span className="text-white">Crow</span>
            <span className="text-emerald-500">Byte</span>
          </button>

          {/* Center links — desktop */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <button
                key={link.label}
                onClick={() => scrollTo(link.href)}
                className="font-['JetBrains_Mono'] text-xs tracking-wide text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                {link.label}
              </button>
            ))}
          </div>

          {/* Right — desktop */}
          <LaunchAppButton className="hidden md:inline-block font-['JetBrains_Mono'] text-sm text-zinc-300 border border-white/20 hover:bg-white/5 px-4 py-1.5 rounded transition-colors cursor-pointer" />

          {/* Hamburger — mobile */}
          <button
            className="md:hidden text-zinc-400 hover:text-white transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={22} /> : <List size={22} />}
          </button>
        </div>
      </motion.nav>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center"
          >
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-6 text-zinc-400 hover:text-white transition-colors"
              aria-label="Close menu"
            >
              <X size={24} />
            </button>

            <nav className="flex flex-col items-center gap-6">
              {navLinks.map((link, i) => (
                <motion.button
                  key={link.label}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06, duration: 0.25 }}
                  onClick={() => scrollTo(link.href)}
                  className="font-['JetBrains_Mono'] text-xl text-zinc-300 hover:text-white transition-colors"
                >
                  {link.label}
                </motion.button>
              ))}
              <LaunchAppButton className="mt-4 font-['JetBrains_Mono'] text-sm text-zinc-300 border border-white/20 hover:bg-white/5 px-6 py-2 rounded transition-colors cursor-pointer" />
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
