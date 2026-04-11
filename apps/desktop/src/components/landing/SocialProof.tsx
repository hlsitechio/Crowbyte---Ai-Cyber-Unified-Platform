import { motion, useInView } from "framer-motion";
import { useRef, useEffect, useState } from "react";

/* ── Animated counter ── */
function Counter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    const duration = 1500;
    const steps = 40;
    const increment = target / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [inView, target]);

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

/* ── Dual marquee with logos — row 1 left, row 2 right ── */

/* Google Favicon API: reliable 64px icons from any domain */
const fav = (domain: string) => `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
/* GitHub org avatars (only for orgs with real logos) */
const gh = (id: number) => `https://avatars.githubusercontent.com/u/${id}?s=64`;

/* Row 1: Built-in scanning & recon tools (runs via d3bugr) */
const row1: { name: string; logo: string }[] = [
  { name: "Nmap", logo: fav("nmap.org") },
  { name: "Nuclei", logo: gh(50994705) },  // ProjectDiscovery
  { name: "SQLMap", logo: fav("sqlmap.org") },
  { name: "Subfinder", logo: gh(50994705) },  // ProjectDiscovery
  { name: "httpx", logo: gh(50994705) },  // ProjectDiscovery
  { name: "ffuf", logo: fav("github.com/ffuf") },
  { name: "Dalfox", logo: fav("github.com/hahwul") },
  { name: "Nikto", logo: fav("github.com/sullo") },
  { name: "WhatWeb", logo: fav("github.com/urbanadventurer") },
  { name: "Amass", logo: fav("owasp.org") },
];

/* Row 2: API integrations & AI models */
const row2: { name: string; logo: string }[] = [
  { name: "Shodan", logo: fav("shodan.io") },
  { name: "Claude", logo: fav("anthropic.com") },
  { name: "DeepSeek", logo: fav("deepseek.com") },
  { name: "Qwen", logo: fav("qwen.ai") },
  { name: "Gemini", logo: fav("gemini.google.com") },
  { name: "Supabase", logo: fav("supabase.com") },
  { name: "NVD", logo: fav("nvd.nist.gov") },
  { name: "theHarvester", logo: fav("github.com/laramies") },
  { name: "Katana", logo: gh(50994705) },  // ProjectDiscovery
  { name: "Masscan", logo: fav("github.com/robertdavidgraham") },
];

function ToolChip({ tool }: { tool: { name: string; logo: string } }) {
  return (
    <div className="shrink-0 flex items-center gap-2.5 px-4 py-2 cursor-default group/chip">
      <img
        src={tool.logo}
        alt={tool.name}
        className="w-6 h-6 rounded-full object-cover opacity-40 group-hover/chip:opacity-70 transition-opacity grayscale group-hover/chip:grayscale-0"
        loading="lazy"
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
      />
      <span className="font-['JetBrains_Mono'] text-xs text-zinc-600 group-hover/chip:text-zinc-400 transition-colors whitespace-nowrap">
        {tool.name}
      </span>
    </div>
  );
}

function MarqueeRow({ tools: items, direction = "left" }: { tools: typeof row1; direction?: "left" | "right" }) {
  const tripled = [...items, ...items, ...items];
  return (
    <div className="relative overflow-hidden">
      <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-background to-transparent z-10" />
      <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-background to-transparent z-10" />
      <div className={`flex gap-1 items-center ${direction === "left" ? "animate-marquee-left" : "animate-marquee-right"}`}>
        {tripled.map((tool, i) => (
          <ToolChip key={`${tool.name}-${i}`} tool={tool} />
        ))}
      </div>
    </div>
  );
}

function Marquee() {
  return (
    <div className="space-y-1">
      <MarqueeRow tools={row1} direction="left" />
      <MarqueeRow tools={row2} direction="right" />

      <style>{`
        @keyframes marquee-left {
          0% { transform: translateX(0); }
          100% { transform: translateX(-33.333%); }
        }
        @keyframes marquee-right {
          0% { transform: translateX(-33.333%); }
          100% { transform: translateX(0); }
        }
        .animate-marquee-left {
          animation: marquee-left 35s linear infinite;
        }
        .animate-marquee-right {
          animation: marquee-right 35s linear infinite;
        }
        .animate-marquee-left:hover,
        .animate-marquee-right:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
}

const stats = [
  { label: "One platform", sub: "replaces your entire toolkit" },
  { label: "Fully autonomous", sub: "agents do the work for you" },
  { label: "Seconds, not hours", sub: "from scan to submitted report" },
  { label: "Privacy first", sub: "your data never leaves your infra" },
];

export default function SocialProof() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });

  return (
    <section ref={ref} className="py-8 px-6 border-y border-white/[0.04]">
      <div className="max-w-5xl mx-auto">
        {/* Stats with animated counters */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-4"
        >
          {stats.map(stat => (
            <div key={stat.label} className="text-center">
              <div className="font-sans text-sm md:text-base font-semibold text-white">
                {stat.label}
              </div>
              <div className="font-sans text-[11px] text-zinc-500 mt-0.5">{stat.sub}</div>
            </div>
          ))}
        </motion.div>

        {/* Infinite marquee of tools */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Marquee />
        </motion.div>
      </div>
    </section>
  );
}
