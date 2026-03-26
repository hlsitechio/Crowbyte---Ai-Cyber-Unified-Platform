import { useState, useEffect, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { BookOpen } from "@phosphor-icons/react";
import LaunchAppButton from "./LaunchAppButton";

/* ------------------------------------------------------------------ */
/*  Terminal typing data                                               */
/* ------------------------------------------------------------------ */

interface TerminalLine {
  text: string;
  color?: string;
}

const terminalLines: TerminalLine[] = [
  { text: "$ crowbyte recon --target acme.com --deep" },
  { text: "" },
  { text: "[*] Resolving subdomains via passive sources...", color: "text-zinc-500" },
  { text: "[+] 142 subdomains found", color: "text-emerald-400" },
  { text: "[+] 38 live hosts (HTTP 200/301/403)", color: "text-emerald-400" },
  { text: "[*] Running nuclei templates (critical+high)...", color: "text-zinc-500" },
  { text: "" },
  { text: "[!] CVE-2024-21762  FortiOS out-of-bound write  10.0.1.5:443", color: "text-red-400" },
  { text: "[!] CVE-2024-3400   PAN-OS command injection     10.0.2.11:443", color: "text-red-400" },
  { text: "[+] Open admin panel (no auth) at 10.0.3.7:8080", color: "text-yellow-400" },
  { text: "" },
  { text: "[*] Dispatching hunter agent for exploit verification...", color: "text-zinc-500" },
  { text: "[+] 2 confirmed critical, 1 high — report generated", color: "text-emerald-400" },
  { text: "[>] Saved: ./reports/acme-com-2025-03-24.md", color: "text-zinc-400" },
];

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

    if (line === "") {
      setDisplayedLines((prev) => [...prev, ""]);
      const t = setTimeout(() => {
        setCurrentLine((l) => l + 1);
        setCurrentChar(0);
      }, 80);
      return () => clearTimeout(t);
    }

    if (currentChar < line.length) {
      const speed = currentLine === 0 ? 30 : 18;
      const t = setTimeout(() => {
        setDisplayedLines((prev) => {
          const copy = [...prev];
          copy[currentLine] = line.slice(0, currentChar + 1);
          return copy;
        });
        setCurrentChar((c) => c + 1);
      }, speed);
      return () => clearTimeout(t);
    }

    const t = setTimeout(() => {
      setCurrentLine((l) => l + 1);
      setCurrentChar(0);
      setDisplayedLines((prev) => [...prev, ""]);
    }, 300);
    return () => clearTimeout(t);
  }, [active, currentLine, currentChar, lines, done]);

  return { displayedLines, done };
}

/* ------------------------------------------------------------------ */
/*  Animation variants                                                 */
/* ------------------------------------------------------------------ */

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function Hero() {
  const termRef = useRef<HTMLDivElement>(null);
  const termInView = useInView(termRef, { once: true, margin: "-60px" });
  const { displayedLines, done } = useTypingAnimation(terminalLines, termInView);

  return (
    <section
      id="hero"
      className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-28 pb-16 overflow-hidden"
    >
      {/* Background grid */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255,255,255,0.02) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.02) 1px, transparent 1px)
          `,
          backgroundSize: "48px 48px",
          maskImage:
            "radial-gradient(ellipse 60% 50% at 50% 40%, black 30%, transparent 100%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 60% 50% at 50% 40%, black 30%, transparent 100%)",
        }}
      />

      {/* Content */}
      <motion.div
        className="relative z-10 mx-auto max-w-5xl w-full"
        variants={stagger}
        initial="hidden"
        animate="visible"
      >
        {/* Text block */}
        <div className="text-center mb-12">
          <motion.h1
            variants={fadeUp}
            className="font-['JetBrains_Mono'] text-4xl sm:text-5xl md:text-6xl font-bold text-white leading-[1.1] tracking-tight"
          >
            Recon. Exploit. Report.
            <br />
            <span className="text-zinc-500">One terminal.</span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="font-['JetBrains_Mono'] text-sm md:text-base text-zinc-500 max-w-2xl mx-auto mt-6 leading-relaxed"
          >
            Finds subdomains. Scans for vulns. Writes the report.
            <br />
            <span className="text-zinc-400">AI does the hunting, you collect the bounty.</span>
          </motion.p>

          {/* CTAs */}
          <motion.div
            variants={fadeUp}
            className="mt-8 flex items-center justify-center gap-3"
          >
            <LaunchAppButton className="font-['JetBrains_Mono'] text-sm font-semibold bg-emerald-500 hover:bg-emerald-400 text-black px-6 py-2.5 rounded transition-colors cursor-pointer" />
            <button
              onClick={() => { window.location.hash = '#/documentation'; }}
              className="font-['JetBrains_Mono'] text-sm text-zinc-400 border border-white/20 hover:bg-white/5 px-5 py-2.5 rounded transition-colors inline-flex items-center gap-2 cursor-pointer"
            >
              <BookOpen size={16} weight="bold" />
              Docs
            </button>
          </motion.div>
        </div>

        {/* Terminal — the hero */}
        <motion.div ref={termRef} variants={fadeUp} className="w-full">
          <div className="rounded-lg border border-white/[0.06] overflow-hidden bg-white/[0.03]">
            {/* Window chrome */}
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/[0.06]">
              <span className="h-2.5 w-2.5 rounded-full bg-[#EF4444]/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#EAB308]/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#22C55E]/80" />
              <span className="ml-3 font-['JetBrains_Mono'] text-[11px] text-zinc-600">
                crowbyte@kali ~/bounty
              </span>
            </div>

            {/* Terminal body */}
            <div className="px-5 py-4 font-['JetBrains_Mono'] text-[12.5px] md:text-[13px] leading-[1.7] min-h-[280px] md:min-h-[340px]">
              {displayedLines.map((text, i) => {
                if (text === "" && i < displayedLines.length - 1) {
                  return <div key={i} className="h-3" />;
                }
                const lineData = terminalLines[i];
                return (
                  <div key={i} className={lineData?.color || "text-zinc-300"}>
                    {text}
                  </div>
                );
              })}
              {/* Cursor */}
              <span className="inline-block w-[7px] h-[14px] bg-emerald-500/80 animate-pulse mt-0.5" />
            </div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
