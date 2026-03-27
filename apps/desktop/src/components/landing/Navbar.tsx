import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { List, X } from "@phosphor-icons/react";
import LaunchAppButton from "./LaunchAppButton";

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "Solutions", href: "#solutions" },
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
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled
            ? "bg-black/60 backdrop-blur-xl border-b border-white/[0.06]"
            : "bg-transparent"
        }`}
      >
        <div className="mx-auto max-w-6xl flex items-center justify-between px-6 h-16">
          {/* Logo */}
          <button
            onClick={() => scrollTo("#hero")}
            className="font-['JetBrains_Mono'] text-lg font-bold tracking-tight flex items-center gap-2"
          >
            <span className="text-white">Crow</span>
            <span className="text-blue-400">Byte</span>
          </button>

          {/* Center links — desktop */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <button
                key={link.label}
                onClick={() => scrollTo(link.href)}
                className="font-['JetBrains_Mono'] text-[13px] text-zinc-500 hover:text-white transition-colors duration-200 px-4 py-2 rounded-full hover:bg-white/[0.05]"
              >
                {link.label}
              </button>
            ))}
          </div>

          {/* Right — CTA pill with glow */}
          <LaunchAppButton className="hidden md:inline-flex relative font-['JetBrains_Mono'] text-[13px] font-medium text-white px-5 py-2 rounded-full border border-white/[0.15] bg-white/[0.05] hover:bg-white/[0.08] transition-all duration-300 cursor-pointer overflow-hidden group">
            {/* Glow streak on top edge */}
            <span className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-[1px] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
            <span className="relative z-10">Launch App</span>
          </LaunchAppButton>

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
              className="absolute top-5 right-6 text-zinc-400 hover:text-white transition-colors"
              aria-label="Close menu"
            >
              <X size={24} />
            </button>

            <nav className="flex flex-col items-center gap-4">
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
              <LaunchAppButton className="mt-6 relative font-['JetBrains_Mono'] text-sm font-medium text-white px-6 py-2.5 rounded-full border border-white/[0.15] bg-white/[0.05] transition-all cursor-pointer overflow-hidden">
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-[1px] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
                <span className="relative z-10">Launch App</span>
              </LaunchAppButton>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
