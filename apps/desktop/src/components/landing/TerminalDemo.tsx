import { useState, useEffect, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Brain, Wrench, Robot, Eye } from "@phosphor-icons/react";

/* ------------------------------------------------------------------ */
/*  Terminal line data                                                  */
/* ------------------------------------------------------------------ */

interface DemoLine {
  text: string;
  indent?: boolean;
  color: string;
}

const demoLines: DemoLine[] = [
  {
    text: "crowbyte@kali ~/bounty $ crowbyte recon --target example.com",
    color: "text-zinc-300",
  },
  { text: "", color: "" },
  {
    text: "[*] Initializing recon pipeline...",
    color: "text-zinc-400",
  },
  {
    text: "[*] Running subfinder + httpx + nuclei chain",
    color: "text-zinc-400",
  },
  { text: "", color: "" },
  {
    text: "[+] Phase 1: Subdomain Enumeration",
    color: "text-emerald-400",
  },
  {
    text: "Found 47 subdomains (12 new)",
    color: "text-zinc-400",
    indent: true,
  },
  { text: "", color: "" },
  {
    text: "[+] Phase 2: HTTP Probing",
    color: "text-emerald-400",
  },
  {
    text: "23 live hosts detected",
    color: "text-zinc-400",
    indent: true,
  },
  {
    text: "8 running outdated software",
    color: "text-zinc-400",
    indent: true,
  },
  { text: "", color: "" },
  {
    text: "[!] Phase 3: Vulnerability Scan",
    color: "text-red-400",
  },
  {
    text: "CRITICAL: CVE-2024-21762 on 10.0.1.5:443 (FortiOS)",
    color: "text-red-400",
    indent: true,
  },
  {
    text: "HIGH: Open admin panel at admin.example.com (no auth)",
    color: "text-amber-400",
    indent: true,
  },
  {
    text: "MEDIUM: Missing CSP headers on 5 hosts",
    color: "text-amber-400",
    indent: true,
  },
  {
    text: "LOW: Server version disclosure on 12 hosts",
    color: "text-zinc-400",
    indent: true,
  },
  { text: "", color: "" },
  {
    text: "[>] Phase 4: Report Generation",
    color: "text-violet-400",
  },
  {
    text: "Report saved: ~/bounty/reports/example-com-2026-03-24.pdf",
    color: "text-zinc-400",
    indent: true,
  },
  {
    text: "Findings synced to CrowByte Cloud",
    color: "text-zinc-400",
    indent: true,
  },
  { text: "", color: "" },
  {
    text: "[+] Recon complete. 4 findings, 1 critical.",
    color: "text-emerald-400",
  },
  {
    text: "Time elapsed: 3m 42s",
    color: "text-zinc-500",
    indent: true,
  },
];

/* ------------------------------------------------------------------ */
/*  Typing animation hook                                              */
/* ------------------------------------------------------------------ */

function useTypingDemo(lines: DemoLine[], active: boolean) {
  const [displayedLines, setDisplayedLines] = useState<string[]>([]);
  const [lineIndex, setLineIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!active || done) return;

    if (lineIndex >= lines.length) {
      setDone(true);
      return;
    }

    const line = lines[lineIndex].text;

    // Empty lines appear instantly
    if (line === "") {
      setDisplayedLines((prev) => {
        const copy = [...prev];
        copy[lineIndex] = "";
        return copy;
      });
      const t = setTimeout(() => {
        setLineIndex((l) => l + 1);
        setCharIndex(0);
      }, 120);
      return () => clearTimeout(t);
    }

    if (charIndex < line.length) {
      const t = setTimeout(
        () => {
          setDisplayedLines((prev) => {
            const copy = [...prev];
            copy[lineIndex] = line.slice(0, charIndex + 1);
            return copy;
          });
          setCharIndex((c) => c + 1);
        },
        40
      );
      return () => clearTimeout(t);
    }

    // Line complete, pause before next
    const t = setTimeout(() => {
      setLineIndex((l) => l + 1);
      setCharIndex(0);
      // Initialize next line slot
      setDisplayedLines((prev) => [...prev, ""]);
    }, 500);
    return () => clearTimeout(t);
  }, [active, lineIndex, charIndex, lines, done]);

  // Initialize first slot
  useEffect(() => {
    if (active && displayedLines.length === 0) {
      setDisplayedLines([""]);
    }
  }, [active]);

  return { displayedLines, done };
}

/* ------------------------------------------------------------------ */
/*  Stat cards data                                                    */
/* ------------------------------------------------------------------ */

const statCards = [
  {
    value: "7+ AI Models",
    label: "Multi-provider intelligence",
    Icon: Brain,
    iconColor: "text-emerald-400",
  },
  {
    value: "142 MCP Tools",
    label: "Security automation suite",
    Icon: Wrench,
    iconColor: "text-violet-400",
  },
  {
    value: "9 VPS Agents",
    label: "Distributed agent swarm",
    Icon: Robot,
    iconColor: "text-emerald-400",
  },
  {
    value: "10+ Threat Feeds",
    label: "Real-time intelligence",
    Icon: Eye,
    iconColor: "text-violet-400",
  },
];

/* ------------------------------------------------------------------ */
/*  Animation variants                                                 */
/* ------------------------------------------------------------------ */

const cardContainerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" },
  },
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function TerminalDemo() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<HTMLDivElement>(null);
  const sectionInView = useInView(sectionRef, { once: true, margin: "-80px" });
  const termInView = useInView(termRef, { once: true, margin: "-60px" });
  const cardsRef = useRef<HTMLDivElement>(null);
  const cardsInView = useInView(cardsRef, { once: true, margin: "-40px" });

  const { displayedLines, done } = useTypingDemo(demoLines, termInView);

  return (
    <section
      id="demo"
      ref={sectionRef}
      className="py-28 px-6"
    >
      <div className="mx-auto max-w-5xl">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={sectionInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white font-['JetBrains_Mono']">
            See It In Action
            <div className="mx-auto mt-3 h-1 w-16 rounded-full bg-emerald-500" />
          </h2>
          <p className="mt-6 text-zinc-400 max-w-xl mx-auto font-['Inter']">
            From reconnaissance to report generation, CrowByte orchestrates your
            entire workflow in a single interface.
          </p>
        </motion.div>

        {/* Terminal window */}
        <motion.div
          ref={termRef}
          initial={{ opacity: 0, y: 30 }}
          animate={termInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="mx-auto"
          style={{ maxWidth: "70%" }}
        >
          <div className="rounded-xl border border-white/10 overflow-hidden bg-black backdrop-blur-sm">
            {/* Window chrome */}
            <div className="flex items-center justify-between px-4 py-3 bg-white/[0.03] border-b border-white/5">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-[#EF4444]" />
                <span className="h-3 w-3 rounded-full bg-[#EAB308]" />
                <span className="h-3 w-3 rounded-full bg-[#22C55E]" />
              </div>
              <span className="text-xs text-zinc-500 font-['JetBrains_Mono']">
                CrowByte Terminal v1.0.0
              </span>
              <div className="w-14" />
            </div>

            {/* Terminal content */}
            <div className="px-6 py-6 font-['JetBrains_Mono'] text-[13px] leading-[1.8] min-h-[400px] overflow-x-auto">
              {displayedLines.map((text, i) => {
                const lineData = demoLines[i];
                if (!lineData) return null;

                if (text === "" && lineData.text === "") {
                  return <div key={i} className="h-3" />;
                }

                return (
                  <div
                    key={i}
                    className={`${lineData.color} ${
                      lineData.indent ? "ml-6" : ""
                    }`}
                  >
                    {text}
                  </div>
                );
              })}

              {/* Blinking cursor */}
              <span className="inline-block w-[8px] h-[16px] bg-emerald-500 animate-pulse ml-0.5 align-middle mt-1">
                |
              </span>
            </div>
          </div>
        </motion.div>

        {/* Stat cards */}
        <motion.div
          ref={cardsRef}
          variants={cardContainerVariants}
          initial="hidden"
          animate={cardsInView ? "visible" : "hidden"}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12"
        >
          {statCards.map((card) => (
            <motion.div
              key={card.value}
              variants={cardVariants}
              className="bg-white/5 border border-white/10 rounded-xl p-6 text-center backdrop-blur-sm hover:bg-white/[0.07] transition-colors"
            >
              <card.Icon
                size={32}
                weight="duotone"
                className={`${card.iconColor} mx-auto mb-3`}
              />
              <div className="text-2xl font-bold text-white font-['JetBrains_Mono']">
                {card.value.split(" ")[0]}
              </div>
              <div className="text-zinc-400 text-sm font-['Inter'] mt-1">
                {card.value.split(" ").slice(1).join(" ")}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
