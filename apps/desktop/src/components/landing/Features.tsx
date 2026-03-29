import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import {
  MessageSquare,
  Radar,
  ShieldAlert,
  Network,
  Swords,
  Globe,
  TerminalSquare,
  Bot,
  Radio,
} from "lucide-react";

const features = [
  {
    icon: MessageSquare,
    name: "AI Chat",
    desc: "Multi-model conversations with full MCP tool access. Analyze CVEs, write exploits, generate reports.",
    accent: "blue" as const,
  },
  {
    icon: Radar,
    name: "Recon Pipeline",
    desc: "Subfinder, httpx, nuclei — chained automatically. From domain to vulns in under 30 seconds.",
    accent: "blue" as const,
  },
  {
    icon: ShieldAlert,
    name: "CVE Database",
    desc: "Real-time NVD tracking with Shodan enrichment. CVSS scoring, exploit status, CISA KEV alerts.",
    accent: "orange" as const,
  },
  {
    icon: Network,
    name: "Fleet Management",
    desc: "Distributed AI agent swarm across your infrastructure. 9 agents. One command.",
    accent: "blue" as const,
  },
  {
    icon: Swords,
    name: "Red Team Ops",
    desc: "Track operations, phases, and findings. Chain vulns for maximum impact. Auto-generate PoCs.",
    accent: "orange" as const,
  },
  {
    icon: Globe,
    name: "Browser Automation",
    desc: "Chrome DevTools Protocol. Hijack sessions, extract cookies, screenshot evidence. All automated.",
    accent: "blue" as const,
  },
  {
    icon: TerminalSquare,
    name: "Integrated Terminal",
    desc: "Full xterm.js terminal with tmux. Every Kali tool at your fingertips, no context switching.",
    accent: "orange" as const,
  },
  {
    icon: Bot,
    name: "Agent Builder",
    desc: "Create custom AI agents with specific instructions, models, and capabilities. Your rules.",
    accent: "blue" as const,
  },
  {
    icon: Radio,
    name: "Threat Intel",
    desc: "Live feeds from abuse.ch, blocklist.de, emerging threats. IOCs, detection rules, auto-correlation.",
    accent: "orange" as const,
  },
];

const accentMap = {
  blue: "text-blue-400",
  orange: "text-orange-400",
};

const container = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

export default function Features() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <section id="features" ref={ref} className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="mb-14"
        >
          <h2 className="font-['JetBrains_Mono'] text-3xl md:text-4xl font-bold text-white">
            the toolkit.
          </h2>
          <p className="font-['JetBrains_Mono'] text-zinc-500 text-sm mt-3">
            everything you need to hunt, exploit, and report
          </p>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {features.map((f) => {
            const iconColor = accentMap[f.accent];
            return (
              <motion.div
                key={f.name}
                variants={item}
                className="group relative p-5 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.1] transition-all duration-300"
              >
                <f.icon
                  size={20}
                  strokeWidth={1.5}
                  className={`${iconColor} mb-4`}
                />
                <h3 className="font-['JetBrains_Mono'] text-sm font-bold text-white mb-1.5">
                  {f.name}
                </h3>
                <p className="font-['JetBrains_Mono'] text-xs text-zinc-500 leading-relaxed">
                  {f.desc}
                </p>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
