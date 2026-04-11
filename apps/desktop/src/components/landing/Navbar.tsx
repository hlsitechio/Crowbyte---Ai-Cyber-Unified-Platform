import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UilListUl, UilTimes } from "@iconscout/react-unicons";
interface NavLink {
  label: string;
  href: string;
  isRoute?: boolean;
  external?: boolean;
}

const navLinks: NavLink[] = [
  { label: "Features", href: "#features" },
  { label: "Solutions", href: "#solutions" },
  { label: "Pricing", href: "#pricing" },
  { label: "GitHub", href: "https://github.com/hlsitechio/crowbyte", external: true },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 50);
      if (y > 200) {
        setHidden(y > lastY);
      } else {
        setHidden(false);
      }
      lastY = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleNav = (link: NavLink) => {
    if (link.external) {
      window.open(link.href, "_blank", "noopener");
    } else if (link.isRoute) {
      window.location.href = link.href;
    } else {
      document.querySelector(link.href)?.scrollIntoView({ behavior: "smooth" });
    }
    setMobileOpen(false);
  };

  return (
    <>
      {/* Floating glassmorphic pill navbar */}
      <motion.nav
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: hidden ? -80 : 0, opacity: hidden ? 0 : 1 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="fixed top-0 left-0 right-0 z-50 flex justify-center px-4 pt-4 pointer-events-none"
      >
        <motion.div
          animate={{
            backgroundColor: scrolled ? "rgba(10, 10, 10, 0.65)" : "rgba(10, 10, 10, 0.35)",
            borderColor: scrolled ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.06)",
          }}
          transition={{ duration: 0.4 }}
          className="pointer-events-auto flex items-center justify-between gap-2 px-2 h-12 rounded-full border backdrop-blur-2xl"
          style={{
            boxShadow: scrolled
              ? "0 10px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)"
              : "0 4px 20px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.03)",
            maxWidth: "680px",
            width: "100%",
          }}
        >
          {/* Logo */}
          <button
            onClick={() =>
              document.querySelector("#hero")?.scrollIntoView({ behavior: "smooth" })
            }
            className="font-['JetBrains_Mono'] text-sm font-bold tracking-tight flex items-center gap-1 px-3 shrink-0"
          >
            <span className="text-white">Crow</span>
            <span className="text-blue-400">Byte</span>
          </button>

          {/* Center links — desktop */}
          <div className="hidden md:flex items-center gap-0.5">
            {navLinks.map((link) => (
              <button
                key={link.label}
                onClick={() => handleNav(link)}
                className="font-['JetBrains_Mono'] text-[12px] text-zinc-400 hover:text-white transition-colors duration-200 px-3 py-1.5 rounded-full hover:bg-white/[0.06]"
              >
                {link.label}
              </button>
            ))}
          </div>

          {/* Right — CTA pill */}
          <a
            href="/auth"
            className="hidden md:inline-flex relative font-['JetBrains_Mono'] text-[12px] font-semibold text-black bg-orange-500 hover:bg-orange-400 px-4 py-1.5 rounded-full transition-all duration-200 cursor-pointer hover:scale-[1.03] active:scale-[0.97] overflow-hidden group/btn no-underline shrink-0"
            style={{
              boxShadow: "0 0 16px rgba(249,115,22,0.3)",
            }}
          >
            <span className="absolute inset-0 bg-gradient-to-r from-orange-400/0 via-white/20 to-orange-400/0 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-700" />
            <span className="relative z-10">Launch App</span>
          </a>

          {/* Hamburger — mobile */}
          <button
            className="md:hidden text-zinc-400 hover:text-white transition-colors pr-2"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <UilTimes size={20} /> : <UilListUl size={20} />}
          </button>
        </motion.div>
      </motion.nav>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/95 backdrop-blur-2xl flex flex-col items-center justify-center"
          >
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-5 right-6 text-zinc-400 hover:text-white transition-colors"
              aria-label="Close menu"
            >
              <UilTimes size={24} />
            </button>

            <nav className="flex flex-col items-center gap-4">
              {navLinks.map((link, i) => (
                <motion.button
                  key={link.label}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06, duration: 0.25 }}
                  onClick={() => handleNav(link)}
                  className="font-['JetBrains_Mono'] text-xl text-zinc-300 hover:text-white transition-colors"
                >
                  {link.label}
                </motion.button>
              ))}
              <a
                href="/auth"
                onClick={() => setMobileOpen(false)}
                className="mt-6 font-['JetBrains_Mono'] text-sm font-semibold text-black bg-orange-500 hover:bg-orange-400 px-6 py-2.5 rounded-full transition-all cursor-pointer no-underline"
              >
                Launch App
              </a>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
