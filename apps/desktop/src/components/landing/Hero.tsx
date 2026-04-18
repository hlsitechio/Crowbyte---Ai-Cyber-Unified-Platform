import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import LaunchAppButton from "./LaunchAppButton";
import TerminalDemo from "./TerminalDemo";

/* ── Rotating words with blur transition ── */
const words = ["Hunt", "Exploit", "Report"];

function RotatingWord() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % words.length), 2800);
    return () => clearInterval(t);
  }, []);

  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={words[idx]}
        initial={{ y: 24, opacity: 0, filter: "blur(12px)" }}
        animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
        exit={{ y: -24, opacity: 0, filter: "blur(12px)" }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="inline-block bg-clip-text text-transparent"
        style={{
          backgroundImage: "linear-gradient(135deg, #f97316 0%, #fb923c 50%, #fbbf24 100%)",
        }}
      >
        {words[idx]}
      </motion.span>
    </AnimatePresence>
  );
}

/* ── OS tab definitions ── */
const OS_TABS = [
  {
    id: "unix",
    label: "macOS / Linux",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"/>
      </svg>
    ),
    command: "npx crowbyte",
    hint: "Requires Node 18+",
  },
  {
    id: "windows",
    label: "Windows",
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
        <path d="M3 3h8v8H3zm10 0h8v8h-8zM3 13h8v8H3zm10 0h8v8h-8z"/>
      </svg>
    ),
    command: "irm https://crowbyte.io | iex",
    hint: "PowerShell",
    prompt: ">",
  },
];

function InstallCommand() {
  const [tab, setTab] = useState(0);
  const [copied, setCopied] = useState(false);

  const copy = useCallback(() => {
    navigator.clipboard.writeText(OS_TABS[tab].command).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [tab]);

  return (
    <section
      className="relative py-14 px-6 overflow-hidden"
      style={{ backgroundColor: "#030308" }}
    >
      {/* Subtle grid lines */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      {/* Blue ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 60% 80% at 50% 50%, rgba(59,130,246,0.05) 0%, transparent 70%)",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 mx-auto max-w-xl text-center"
      >
        {/* Label */}
        <p className="font-['JetBrains_Mono'] text-[11px] tracking-[0.3em] uppercase text-blue-400/60 mb-3">
          install
        </p>
        <h2 className="font-['JetBrains_Mono'] text-2xl font-bold text-white mb-1">
          one command. every platform
        </h2>
        <p className="text-zinc-500 text-sm mb-8">
          Install in one command. Sign in to access your workspace.
        </p>

        {/* OS Tab switcher */}
        <div className="flex items-center justify-center gap-1 mb-4">
          {OS_TABS.map((t, i) => (
            <button
              key={t.id}
              onClick={() => setTab(i)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-['JetBrains_Mono'] text-[11px] transition-all duration-150 ${
                tab === i
                  ? "bg-blue-500/20 text-blue-300 ring-1 ring-blue-500/30"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* Command box */}
        <div
          className="relative flex items-center gap-3 px-5 py-4 rounded-xl font-['JetBrains_Mono'] text-sm"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.09)",
            boxShadow: "0 0 40px rgba(59,130,246,0.06), inset 0 1px 0 rgba(255,255,255,0.04)",
          }}
        >
          {/* Prompt */}
          <span className="text-blue-400/70 select-none shrink-0">{(OS_TABS[tab] as any).prompt ?? "$"}</span>
          {/* Command text */}
          <span className="flex-1 text-left text-zinc-100 tracking-tight overflow-hidden text-ellipsis whitespace-nowrap">
            {OS_TABS[tab].command}
          </span>
          {/* Copy button */}
          <button
            onClick={copy}
            className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] transition-all duration-150"
            style={{
              background: copied ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.06)",
              border: copied ? "1px solid rgba(34,197,94,0.3)" : "1px solid rgba(255,255,255,0.08)",
              color: copied ? "#86efac" : "#a1a1aa",
            }}
          >
            {copied ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
            )}
            {copied ? "copied" : "copy"}
          </button>
        </div>

        {/* Hint + web fallback */}
        <div className="mt-4 flex items-center justify-center gap-4 text-[11px] text-zinc-600 font-['JetBrains_Mono']">
          <span>{OS_TABS[tab].hint}</span>
          <span className="text-zinc-700">·</span>
          <a href="/auth/signup" className="text-zinc-500 hover:text-blue-400 transition-colors">
            or use the web app — no install needed
          </a>
        </div>
      </motion.div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════
   HERO SECTION — Earth image background with text overlay
   ══════════════════════════════════════════════════════════════ */
export default function Hero() {
  return (
    <>
      {/* ── Hero: Earth background + text ── */}
      <section
        id="hero"
        className="relative min-h-[92vh] flex flex-col items-center justify-center px-6 pt-20 pb-16 overflow-hidden"
        style={{ backgroundColor: "#030308" }}
      >
        {/* Earth background image */}
        <div className="absolute inset-0 z-0">
          <img
            src="/hero-earth.jpg"
            alt=""
            className="w-full h-full object-cover object-center"
            style={{ opacity: 0.35 }}
          />
          <div
            className="absolute inset-0"
            style={{
              background: "linear-gradient(to bottom, rgba(3,3,8,0.7) 0%, rgba(3,3,8,0.2) 30%, rgba(3,3,8,0.2) 60%, rgba(3,3,8,0.95) 100%)",
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background: "radial-gradient(ellipse 70% 60% at 50% 50%, transparent 30%, rgba(3,3,8,0.85) 100%)",
            }}
          />
        </div>

        {/* Subtle blue/orange glow overlay */}
        <div
          className="absolute inset-0 z-[1] pointer-events-none"
          style={{
            background: "radial-gradient(ellipse 50% 40% at 50% 45%, rgba(59,130,246,0.06) 0%, transparent 70%)",
          }}
        />

        {/* Content */}
        <div className="relative z-10 mx-auto max-w-4xl w-full text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 10, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="relative inline-flex items-center gap-2.5 px-4 py-2 rounded-full mb-8 backdrop-blur-md overflow-hidden"
            style={{
              background: "linear-gradient(135deg, rgba(59,130,246,0.15), rgba(249,115,22,0.08), rgba(168,85,247,0.06))",
              border: "1px solid rgba(255,255,255,0.12)",
              boxShadow: "0 0 30px rgba(59,130,246,0.1), inset 0 1px 0 rgba(255,255,255,0.08)",
            }}
          >
            <motion.div
              animate={{ x: ["-100%", "200%"] }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear", repeatDelay: 2 }}
              className="absolute inset-0 pointer-events-none"
              style={{
                background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)",
                width: "50%",
              }}
            />
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" style={{ boxShadow: "0 0 6px rgba(52,211,153,0.5)" }} />
            </span>
            <span className="font-['JetBrains_Mono'] text-[12px] tracking-widest uppercase relative">
              <span className="text-orange-400/90 font-medium">Live</span>
              <span className="text-zinc-500 mx-1.5">&middot;</span>
              <span className="text-zinc-200">Autonomous Pentesting</span>
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="relative font-['Saira_Stencil_One',sans-serif] text-[clamp(3rem,7vw,96px)] font-normal italic leading-[1.2] tracking-tight overflow-visible py-2"
          >
            <span
              className="hero-shimmer bg-clip-text text-transparent inline-block overflow-visible"
              style={{
                filter: "drop-shadow(0 0 30px rgba(239,68,68,0.2)) drop-shadow(0 4px 20px rgba(0,0,0,0.5))",
              }}
            >
              The Unified AI Platform
              <br />
              for Security Teams<span className="inline-block w-4" />
            </span>
            <style>{`
              .hero-shimmer {
                background-image: linear-gradient(
                  90deg,
                  #dc2626 0%,
                  #ef4444 20%,
                  #f97316 35%,
                  #fbbf24 45%,
                  #ff6b6b 50%,
                  #fbbf24 55%,
                  #f97316 65%,
                  #ef4444 80%,
                  #dc2626 100%
                );
                background-size: 200% 100%;
                -webkit-background-clip: text;
                background-clip: text;
                animation: hero-shimmer-sweep 6s ease-in-out infinite;
              }
              @keyframes hero-shimmer-sweep {
                0% { background-position: 100% 0; }
                100% { background-position: -100% 0; }
              }
            `}</style>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 16, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="font-sans text-[17px] text-zinc-300/80 max-w-2xl mx-auto mt-8 leading-relaxed"
            style={{ textShadow: "0 2px 20px rgba(0,0,0,0.8)" }}
          >
            Replace your 20+ browser tabs and terminal windows with one AI-powered
            platform for pentesting, threat detection, and security operations — from recon to report.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.55 }}
            className="mt-9 flex items-center justify-center gap-4"
          >
            <LaunchAppButton className="btn-conic font-['JetBrains_Mono'] text-[15px] font-semibold text-white px-8 py-3.5 rounded-full cursor-pointer hover:scale-[1.03] active:scale-[0.97] transition-transform duration-200">
              <span className="shimmer-sweep" />
              <span className="relative z-10">Start Hunting Free</span>
            </LaunchAppButton>
            <a
              href="https://github.com/hlsitechio/crowbyte"
              target="_blank"
              rel="noopener"
              className="font-['JetBrains_Mono'] text-[15px] text-zinc-200 border border-white/[0.15] hover:border-white/[0.25] hover:bg-white/[0.06] px-7 py-3.5 rounded-full transition-all duration-200 cursor-pointer hover:scale-[1.03] active:scale-[0.97] backdrop-blur-md"
            >
              View on GitHub
            </a>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="font-['JetBrains_Mono'] text-[12px] text-zinc-500 mt-4"
          >
            Free tier &middot; No credit card &middot; Start in your browser
          </motion.p>
        </div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
          className="absolute bottom-6 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            className="w-5 h-8 rounded-full border border-white/[0.15] flex items-start justify-center p-1"
          >
            <motion.div className="w-1 h-1.5 rounded-full bg-white/40" />
          </motion.div>
        </motion.div>
      </section>

      {/* ── Install Command Section ── */}
      <InstallCommand />

      {/* ── Terminal Section — below hero ── */}
      <section className="relative px-6 py-20 overflow-hidden" style={{ backgroundColor: "#030308" }}>
        {/* Seamless blend from hero */}
        <div
          className="absolute top-0 left-0 right-0 h-32 pointer-events-none z-10"
          style={{ background: "linear-gradient(to bottom, #030308, transparent)" }}
        />

        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10 relative z-10"
        >
          <h2 className="font-['JetBrains_Mono'] text-xs tracking-[0.3em] uppercase text-blue-400/70 mb-3">
            See it in action
          </h2>
          <p className="text-zinc-500 text-sm max-w-lg mx-auto">
            12 AI agents working together — recon, exploit, chain, report — all in one terminal.
          </p>
        </motion.div>

        {/* Terminal — new cinematic demo */}
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.96 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10"
        >
          <TerminalDemo />
        </motion.div>

        {/* Ambient glow below terminal */}
        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[60%] h-[100px] pointer-events-none z-0"
          style={{
            background: "radial-gradient(ellipse, rgba(59,130,246,0.08) 0%, transparent 70%)",
            filter: "blur(30px)",
          }}
        />
      </section>
    </>
  );
}
