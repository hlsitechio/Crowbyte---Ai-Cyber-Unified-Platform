import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { X, Check, Clock, Zap } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Data                                                                */
/* ------------------------------------------------------------------ */

const manualSteps = [
  { task: "Subdomain enumeration", time: "15 min", tools: "subfinder, amass, crt.sh" },
  { task: "HTTP probing", time: "8 min", tools: "httpx, manual curl" },
  { task: "Port scanning", time: "25 min", tools: "nmap, masscan" },
  { task: "Vulnerability scan", time: "40 min", tools: "nuclei, nikto" },
  { task: "Manual exploitation", time: "2+ hrs", tools: "burp, sqlmap, ffuf" },
  { task: "Report writing", time: "1+ hr", tools: "markdown, screenshots" },
];

const crowbyteSteps = [
  { task: "Full recon pipeline", time: "12s", agents: "RECON + SENTINEL" },
  { task: "Vuln detection + exploit", time: "8s", agents: "HUNTER + INTEL" },
  { task: "Evidence collection", time: "3s", agents: "INTEL (CDP)" },
  { task: "Report generation", time: "2s", agents: "ANALYST" },
];

const stats = [
  { label: "Faster", value: "180x", sub: "avg speed improvement" },
  { label: "Tools", value: "142", sub: "integrated via MCP" },
  { label: "Agents", value: "15", sub: "concurrent AI agents" },
  { label: "Coverage", value: "100%", sub: "automated pipeline" },
];

/* ------------------------------------------------------------------ */
/*  Animation variants                                                  */
/* ------------------------------------------------------------------ */

const container = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.2 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export default function TerminalDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <section id="demo" ref={ref} className="py-24 px-6">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="mb-14"
        >
          <h2 className="font-['JetBrains_Mono'] text-3xl md:text-4xl font-bold text-white">
            why CrowByte.
          </h2>
          <p className="font-['JetBrains_Mono'] text-zinc-500 text-sm mt-3">
            4 hours of manual work in under 30 seconds
          </p>
        </motion.div>

        {/* Before / After grid */}
        <motion.div
          variants={container}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          className="grid grid-cols-1 lg:grid-cols-2 gap-4"
        >
          {/* BEFORE — Manual */}
          <motion.div
            variants={fadeUp}
            className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden"
          >
            <div className="flex items-center gap-2 px-5 py-3 border-b border-white/[0.06] bg-white/[0.02]">
              <Clock size={14} className="text-zinc-500" />
              <span className="font-['JetBrains_Mono'] text-xs text-zinc-500 uppercase tracking-wider">
                Manual Workflow
              </span>
              <span className="ml-auto font-['JetBrains_Mono'] text-xs text-red-400/80">
                ~4 hours
              </span>
            </div>
            <div className="p-4 space-y-1">
              {manualSteps.map((step, i) => (
                <motion.div
                  key={i}
                  variants={fadeUp}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg"
                >
                  <X size={14} strokeWidth={2} className="text-red-400/60 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="font-['JetBrains_Mono'] text-xs text-zinc-400">
                      {step.task}
                    </span>
                    <span className="font-['JetBrains_Mono'] text-xs text-zinc-600 ml-2">
                      ({step.tools})
                    </span>
                  </div>
                  <span className="font-['JetBrains_Mono'] text-xs text-zinc-600 flex-shrink-0">
                    {step.time}
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* AFTER — CrowByte */}
          <motion.div
            variants={fadeUp}
            className="rounded-xl border border-blue-500/20 bg-blue-500/[0.03] overflow-hidden"
          >
            <div className="flex items-center gap-2 px-5 py-3 border-b border-blue-500/10 bg-blue-500/[0.03]">
              <Zap size={14} className="text-blue-400" />
              <span className="font-['JetBrains_Mono'] text-xs text-blue-400 uppercase tracking-wider">
                CrowByte
              </span>
              <span className="ml-auto font-['JetBrains_Mono'] text-xs text-blue-400">
                ~25 seconds
              </span>
            </div>
            <div className="p-4 space-y-1">
              {crowbyteSteps.map((step, i) => (
                <motion.div
                  key={i}
                  variants={fadeUp}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg"
                >
                  <Check size={14} strokeWidth={2.5} className="text-blue-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="font-['JetBrains_Mono'] text-xs text-zinc-300">
                      {step.task}
                    </span>
                    <span className="font-['JetBrains_Mono'] text-xs text-blue-400/60 ml-2">
                      {step.agents}
                    </span>
                  </div>
                  <span className="font-['JetBrains_Mono'] text-xs text-orange-400 flex-shrink-0">
                    {step.time}
                  </span>
                </motion.div>
              ))}

              {/* Visual spacer to balance height with left column */}
              <div className="pt-3 mt-3 border-t border-blue-500/10">
                <div className="flex items-center gap-2 px-3">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75 animate-ping" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500" />
                  </span>
                  <span className="font-['JetBrains_Mono'] text-xs text-zinc-500">
                    All agents run simultaneously — not sequentially
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Stats row */}
        <motion.div
          variants={container}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4"
        >
          {stats.map((stat) => (
            <motion.div
              key={stat.label}
              variants={fadeUp}
              className="text-center py-6 rounded-xl border border-white/[0.06] bg-white/[0.02]"
            >
              <div
                className="font-['JetBrains_Mono'] text-2xl md:text-3xl font-bold bg-clip-text text-transparent"
                style={{
                  backgroundImage: "linear-gradient(135deg, #3b82f6 0%, #60a5fa 40%, #f97316 100%)",
                }}
              >
                {stat.value}
              </div>
              <div className="font-['JetBrains_Mono'] text-xs text-zinc-500 mt-1">
                {stat.sub}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
