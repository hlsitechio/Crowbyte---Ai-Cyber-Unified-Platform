import { useState, useEffect, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { BookOpen } from "@phosphor-icons/react";
import LaunchAppButton from "./LaunchAppButton";

/* ------------------------------------------------------------------ */
/*  Agent pane data — each pane is an agent doing its thing            */
/* ------------------------------------------------------------------ */

interface AgentLine {
  text: string;
  color: string;
}

interface AgentPane {
  name: string;
  status: string;
  statusColor: string;
  lines: AgentLine[];
}

const agentPanes: AgentPane[] = [
  {
    name: "recon",
    status: "scanning",
    statusColor: "text-emerald-400",
    lines: [
      { text: "$ subfinder -d acme.com -silent", color: "text-zinc-400" },
      { text: "[+] 142 subdomains found", color: "text-emerald-400" },
      { text: "[+] 38 live hosts responding", color: "text-emerald-400" },
      { text: "[*] Feeding targets to hunter...", color: "text-zinc-500" },
    ],
  },
  {
    name: "hunter",
    status: "exploiting",
    statusColor: "text-red-400",
    lines: [
      { text: "$ nuclei -severity critical,high", color: "text-zinc-400" },
      { text: "[!] CVE-2024-21762 FortiOS RCE", color: "text-red-400" },
      { text: "[!] CVE-2024-3400 PAN-OS cmdi", color: "text-red-400" },
      { text: "[+] 2 confirmed critical", color: "text-emerald-400" },
    ],
  },
  {
    name: "intel",
    status: "enriching",
    statusColor: "text-violet-400",
    lines: [
      { text: "$ shodan search ssl.cert.subject", color: "text-zinc-400" },
      { text: "[+] 47,312 exposed instances", color: "text-emerald-400" },
      { text: "[+] CISA KEV: yes | EPSS: 0.97", color: "text-orange-400" },
      { text: "[*] Cross-referencing NVD...", color: "text-zinc-500" },
    ],
  },
  {
    name: "sentinel",
    status: "monitoring",
    statusColor: "text-blue-400",
    lines: [
      { text: "$ crowbyte monitor --live", color: "text-zinc-400" },
      { text: "[+] 12 endpoints tracked", color: "text-emerald-400" },
      { text: "[!] New port 8080 on 10.0.3.7", color: "text-yellow-400" },
      { text: "[+] Admin panel — no auth!", color: "text-red-400" },
    ],
  },
  {
    name: "analyst",
    status: "reporting",
    statusColor: "text-amber-400",
    lines: [
      { text: "$ crowbyte report --format h1", color: "text-zinc-400" },
      { text: "[+] 4 findings triaged", color: "text-emerald-400" },
      { text: "[+] Report: acme-2025-03.pdf", color: "text-emerald-400" },
      { text: "[>] Ready for submission", color: "text-violet-400" },
    ],
  },
  {
    name: "commander",
    status: "orchestrating",
    statusColor: "text-emerald-400",
    lines: [
      { text: "$ crowbyte fleet status", color: "text-zinc-400" },
      { text: "[+] 6/6 agents online", color: "text-emerald-400" },
      { text: "[+] 3 active | 2 idle | 1 reporting", color: "text-emerald-400" },
      { text: "[>] Mission 87% complete", color: "text-violet-400" },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Staggered line reveal per pane                                     */
/* ------------------------------------------------------------------ */

function useStaggeredReveal(totalLines: number, active: boolean, delay: number) {
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    if (!active) return;

    const startDelay = setTimeout(() => {
      const interval = setInterval(() => {
        setVisibleCount((c) => {
          if (c >= totalLines) {
            clearInterval(interval);
            return c;
          }
          return c + 1;
        });
      }, 400 + Math.random() * 300);

      return () => clearInterval(interval);
    }, delay);

    return () => clearTimeout(startDelay);
  }, [active, totalLines, delay]);

  return visibleCount;
}

function AgentPaneComponent({ pane, active, delay }: { pane: AgentPane; active: boolean; delay: number }) {
  const visibleCount = useStaggeredReveal(pane.lines.length, active, delay);

  return (
    <div className="flex flex-col border border-white/[0.06] rounded-md overflow-hidden bg-black/40">
      {/* Pane header — agent name + status */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-white/[0.03] border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <span className={`h-1.5 w-1.5 rounded-full ${pane.statusColor.replace('text-', 'bg-')} animate-pulse`} />
          <span className="font-['JetBrains_Mono'] text-[10px] font-bold text-zinc-300 uppercase tracking-wider">
            {pane.name}
          </span>
        </div>
        <span className={`font-['JetBrains_Mono'] text-[9px] ${pane.statusColor}`}>
          {pane.status}
        </span>
      </div>

      {/* Pane content */}
      <div className="px-3 py-2.5 font-['JetBrains_Mono'] text-[10px] md:text-[11px] leading-[1.6] min-h-[90px] flex flex-col justify-start">
        {pane.lines.map((line, i) => (
          <div
            key={i}
            className={`transition-all duration-300 ${
              i < visibleCount
                ? `${line.color} opacity-100 translate-y-0`
                : "opacity-0 translate-y-1"
            }`}
          >
            {line.text}
          </div>
        ))}
        {visibleCount < pane.lines.length && (
          <span className="inline-block w-[6px] h-[11px] bg-emerald-500/60 animate-pulse mt-0.5" />
        )}
      </div>
    </div>
  );
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
          <motion.p
            variants={fadeUp}
            className="font-['JetBrains_Mono'] text-[11px] md:text-xs text-emerald-500/80 uppercase tracking-[0.3em] mb-4"
          >
            A New Era of Cyber Warfare
          </motion.p>

          <motion.h1
            variants={fadeUp}
            className="font-['JetBrains_Mono'] text-4xl sm:text-5xl md:text-6xl font-bold text-white leading-[1.1] tracking-tight"
          >
            Recon. Exploit. Defense.
            <br />
            <span className="text-emerald-400">One Terminal.</span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="font-['JetBrains_Mono'] text-sm md:text-lg text-zinc-400 max-w-2xl mx-auto mt-6 leading-relaxed"
          >
            15 AI agents running simultaneously. Every Kali Linux tool.
            <br />
            <span className="text-zinc-500">One command. Full attack surface covered.</span>
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

        {/* Multi-Agent Terminal — tmux-style split panes */}
        <motion.div ref={termRef} variants={fadeUp} className="w-full">
          <div className="rounded-lg border border-white/[0.08] overflow-hidden bg-black/60 backdrop-blur-sm">
            {/* Window chrome */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06] bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[#EF4444]/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#EAB308]/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#22C55E]/80" />
              </div>
              <span className="font-['JetBrains_Mono'] text-[11px] text-zinc-600">
                crowbyte@kali ~/bounty — 6 agents active
              </span>
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-['JetBrains_Mono'] text-[9px] text-emerald-500">LIVE</span>
              </div>
            </div>

            {/* Agent grid — 2x3 on desktop, 1 col on mobile */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-white/[0.04] p-2">
              {agentPanes.map((pane, i) => (
                <AgentPaneComponent
                  key={pane.name}
                  pane={pane}
                  active={termInView}
                  delay={i * 600}
                />
              ))}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
