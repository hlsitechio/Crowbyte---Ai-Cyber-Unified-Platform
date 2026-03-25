import { useState, useEffect, useRef, useCallback } from "react";
import { motion, useInView } from "framer-motion";
import { ArrowRight, Play } from "@phosphor-icons/react";

/* ------------------------------------------------------------------ */
/*  Terminal typing data                                               */
/* ------------------------------------------------------------------ */

interface TerminalLine {
  text: string;
  prefix?: "[*]" | "[+]" | "[!]" | "[>]";
}

const terminalLines: TerminalLine[] = [
  { text: "$ crowbyte scan --target example.com --mode aggressive" },
  { text: "" },
  { text: "[*] Initializing scan pipeline...", prefix: "[*]" },
  { text: "[+] 47 subdomains discovered", prefix: "[+]" },
  { text: "[+] 23 live hosts detected", prefix: "[+]" },
  { text: "[!] CRITICAL: CVE-2024-21762 on 10.0.1.5:443", prefix: "[!]" },
  { text: "[!] HIGH: Open admin panel (no auth)", prefix: "[!]" },
  {
    text: "[+] Report saved: example-com-2025-03-24.pdf",
    prefix: "[+]",
  },
];

function colorizePrefix(prefix?: string): string {
  switch (prefix) {
    case "[*]":
      return "text-zinc-400";
    case "[+]":
      return "text-emerald-400";
    case "[!]":
      return "text-red-400";
    case "[>]":
      return "text-violet-400";
    default:
      return "text-zinc-300";
  }
}

/* ------------------------------------------------------------------ */
/*  Stagger animation variants                                         */
/* ------------------------------------------------------------------ */

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" },
  },
};

/* ------------------------------------------------------------------ */
/*  Typing animation hook                                              */
/* ------------------------------------------------------------------ */

function useTypingAnimation(lines: TerminalLine[], active: boolean) {
  const [displayedLines, setDisplayedLines] = useState<string[]>([]);
  const [currentLine, setCurrentLine] = useState(0);
  const [currentChar, setCurrentChar] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!active || done) return;

    if (currentLine >= lines.length) {
      setDone(true);
      return;
    }

    const line = lines[currentLine].text;

    // Empty lines appear instantly
    if (line === "") {
      setDisplayedLines((prev) => [...prev, ""]);
      const t = setTimeout(() => {
        setCurrentLine((l) => l + 1);
        setCurrentChar(0);
      }, 100);
      return () => clearTimeout(t);
    }

    if (currentChar < line.length) {
      const t = setTimeout(() => {
        setDisplayedLines((prev) => {
          const copy = [...prev];
          copy[currentLine] = line.slice(0, currentChar + 1);
          return copy;
        });
        setCurrentChar((c) => c + 1);
      }, 25);
      return () => clearTimeout(t);
    }

    // Line complete — pause then move to next
    const t = setTimeout(() => {
      setCurrentLine((l) => l + 1);
      setCurrentChar(0);
      setDisplayedLines((prev) => [...prev, ""]);
    }, 400);
    return () => clearTimeout(t);
  }, [active, currentLine, currentChar, lines, done]);

  return { displayedLines, done };
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function Hero() {
  const termRef = useRef<HTMLDivElement>(null);
  const termInView = useInView(termRef, { once: true, margin: "-100px" });
  const { displayedLines, done } = useTypingAnimation(
    terminalLines,
    termInView
  );

  return (
    <section
      id="hero"
      className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-24 pb-20 overflow-hidden"
    >
      {/* ---- Background grid ---- */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
          maskImage:
            "radial-gradient(ellipse 70% 60% at 50% 40%, black 20%, transparent 100%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 70% 60% at 50% 40%, black 20%, transparent 100%)",
        }}
      />

      {/* ---- Ambient glow ---- */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[500px] rounded-full bg-emerald-500/[0.07] blur-[120px]" />
        <div className="absolute top-32 right-0 w-[400px] h-[400px] rounded-full bg-violet-500/[0.04] blur-[100px]" />
      </div>

      {/* ---- Content ---- */}
      <motion.div
        className="relative z-10 mx-auto max-w-5xl text-center"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Badge */}
        <motion.div variants={itemVariants} className="mb-8 inline-block">
          <motion.div
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full px-4 py-1.5 text-sm font-['Inter']"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            Now in Public Beta
          </motion.div>
        </motion.div>

        {/* Headline */}
        <motion.h1
          variants={itemVariants}
          className="font-['JetBrains_Mono'] text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-tight"
        >
          The Offensive Security
          <br />
          Platform, Powered by{" "}
          <span className="bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent">
            AI
          </span>
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          variants={itemVariants}
          className="font-['Inter'] text-lg md:text-xl text-zinc-400 max-w-3xl mx-auto mt-6 leading-relaxed"
        >
          Stop juggling 20 tools. CrowByte unifies AI agents, vulnerability
          scanning, threat intelligence, red team ops, fleet management, and
          exploit development — in one platform built by hackers, for hackers.
        </motion.p>

        {/* CTAs */}
        <motion.div
          variants={itemVariants}
          className="mt-10 flex flex-wrap items-center justify-center gap-4"
        >
          <a
            href="/#/auth"
            className="group inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold px-8 py-3 rounded-lg transition-all shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 font-['Inter']"
          >
            Get Started Free
            <ArrowRight
              size={18}
              weight="bold"
              className="transition-transform group-hover:translate-x-0.5"
            />
          </a>
          <a
            href="#demo"
            onClick={(e) => {
              e.preventDefault();
              document
                .getElementById("demo")
                ?.scrollIntoView({ behavior: "smooth" });
            }}
            className="inline-flex items-center gap-2 border border-white/20 hover:bg-white/5 text-white px-8 py-3 rounded-lg transition-all font-['Inter']"
          >
            <Play size={18} weight="fill" />
            Watch Demo
          </a>
        </motion.div>

        {/* Trust badges */}
        <motion.div variants={itemVariants} className="mt-8">
          <p className="text-zinc-500 text-sm font-['Inter']">
            Works on{" "}
            <span className="text-zinc-400">Kali</span>
            <span className="mx-2 text-zinc-700">&bull;</span>
            <span className="text-zinc-400">Ubuntu</span>
            <span className="mx-2 text-zinc-700">&bull;</span>
            <span className="text-zinc-400">Debian</span>
            <span className="mx-2 text-zinc-700">&bull;</span>
            <span className="text-zinc-400">Docker</span>
          </p>
          <p className="text-zinc-600 text-xs font-['Inter'] mt-2">
            No credit card required. Free tier available.
          </p>
        </motion.div>

        {/* Terminal mockup */}
        <motion.div
          ref={termRef}
          variants={itemVariants}
          className="mx-auto mt-16 max-w-3xl"
        >
          <div className="rounded-xl border border-white/10 overflow-hidden bg-black">
            {/* Window chrome */}
            <div className="flex items-center gap-2 px-4 py-3 bg-white/[0.03] border-b border-white/5">
              <span className="h-3 w-3 rounded-full bg-[#EF4444]" />
              <span className="h-3 w-3 rounded-full bg-[#EAB308]" />
              <span className="h-3 w-3 rounded-full bg-[#22C55E]" />
              <span className="ml-3 text-xs text-zinc-500 font-['JetBrains_Mono']">
                crowbyte@kali ~/bounty
              </span>
            </div>

            {/* Terminal content */}
            <div className="px-5 py-5 font-['JetBrains_Mono'] text-[13px] leading-relaxed min-h-[220px]">
              {displayedLines.map((text, i) => {
                if (text === "" && i < displayedLines.length - 1) {
                  return <div key={i} className="h-4" />;
                }
                const lineData = terminalLines[i];
                return (
                  <div key={i} className={colorizePrefix(lineData?.prefix)}>
                    {text}
                  </div>
                );
              })}

              {/* Blinking cursor */}
              {!done && (
                <span className="inline-block w-[8px] h-[16px] bg-emerald-500 animate-pulse ml-0.5 align-middle" />
              )}
              {done && (
                <span className="inline-block w-[8px] h-[16px] bg-emerald-500 animate-pulse ml-0.5 align-middle mt-1" />
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
