import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Skull, List, X } from "@phosphor-icons/react";

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
    const el = document.querySelector(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
    setMobileOpen(false);
  };

  return (
    <>
      <motion.nav
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "backdrop-blur-xl bg-black/80 border-b border-white/5"
            : "bg-transparent"
        }`}
      >
        <div className="mx-auto max-w-7xl flex items-center justify-between px-6 h-16 md:h-20">
          {/* Logo */}
          <button
            onClick={() => scrollTo("#hero")}
            className="flex items-center gap-2.5 group"
          >
            <Skull
              size={28}
              weight="duotone"
              className="text-emerald-500 group-hover:text-emerald-400 transition-colors"
            />
            <span className="text-xl font-bold tracking-tight font-['JetBrains_Mono']">
              <span className="text-white">Crow</span>
              <span className="text-emerald-500">Byte</span>
            </span>
          </button>

          {/* Center nav links — desktop */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <button
                key={link.label}
                onClick={() => scrollTo(link.href)}
                className="text-sm text-zinc-400 hover:text-white transition-colors font-['Inter']"
              >
                {link.label}
              </button>
            ))}
          </div>

          {/* Right buttons — desktop */}
          <div className="hidden md:flex items-center gap-3">
            <a
              href="/#/auth"
              className="text-sm text-zinc-400 hover:text-white transition-colors px-4 py-2 rounded-lg border border-transparent hover:border-white/20 font-['Inter']"
            >
              Login
            </a>
            <a
              href="/#/auth"
              className="text-sm font-semibold bg-emerald-500 hover:bg-emerald-400 text-black px-5 py-2 rounded-lg transition-colors font-['Inter']"
            >
              Get Started Free
            </a>
          </div>

          {/* Hamburger — mobile */}
          <button
            className="md:hidden text-zinc-400 hover:text-white transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={24} /> : <List size={24} />}
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
            {/* Close button */}
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-5 right-6 text-zinc-400 hover:text-white transition-colors"
              aria-label="Close menu"
            >
              <X size={28} />
            </button>

            <nav className="flex flex-col items-center gap-8">
              {navLinks.map((link, i) => (
                <motion.button
                  key={link.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08, duration: 0.3 }}
                  onClick={() => scrollTo(link.href)}
                  className="text-2xl font-medium text-zinc-300 hover:text-white transition-colors font-['JetBrains_Mono']"
                >
                  {link.label}
                </motion.button>
              ))}

              <div className="flex flex-col items-center gap-4 mt-6">
                <a
                  href="/#/auth"
                  onClick={() => setMobileOpen(false)}
                  className="text-base text-zinc-400 hover:text-white transition-colors px-6 py-2.5 rounded-lg border border-white/20 font-['Inter']"
                >
                  Login
                </a>
                <a
                  href="/#/auth"
                  onClick={() => setMobileOpen(false)}
                  className="text-base font-semibold bg-emerald-500 hover:bg-emerald-400 text-black px-8 py-2.5 rounded-lg transition-colors font-['Inter']"
                >
                  Get Started Free
                </a>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
