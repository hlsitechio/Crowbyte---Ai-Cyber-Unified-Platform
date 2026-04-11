import { useRef, useCallback } from "react";
import { motion, useInView, useMotionValue, useTransform } from "framer-motion";
import { UilTimes, UilCheck, UilClock, UilBolt } from "@iconscout/react-unicons";

/* ── Data ── */

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
  { label: "Before", value: "Hours of copying between tools", accent: false },
  { label: "After", value: "One command. Walk away.", accent: true },
  { label: "How", value: "Agents work in parallel, not you", accent: false },
  { label: "Result", value: "Report lands in your inbox", accent: true },
];

/* ── Spotlight panel ── */
function SpotlightPanel({
  children,
  className = "",
  glowColor = "rgba(59,130,246,0.06)",
}: {
  children: React.ReactNode;
  className?: string;
  glowColor?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const rect = ref.current?.getBoundingClientRect();
      if (rect) {
        mouseX.set(e.clientX - rect.left);
        mouseY.set(e.clientY - rect.top);
      }
    },
    [mouseX, mouseY],
  );

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      className={`relative group overflow-hidden ${className}`}
    >
      <motion.div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{
          background: useTransform(
            [mouseX, mouseY],
            ([x, y]) =>
              `radial-gradient(350px circle at ${x}px ${y}px, ${glowColor}, transparent 60%)`,
          ),
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

/* ── Animated progress bar ── */
function ProgressBar({ percent, color, delay }: { percent: number; color: string; delay: number }) {
  return (
    <div className="h-1 w-full rounded-full bg-white/[0.04] overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        whileInView={{ width: `${percent}%` }}
        viewport={{ once: true }}
        transition={{ duration: 1.2, delay, ease: [0.22, 1, 0.36, 1] }}
        className={`h-full rounded-full ${color}`}
      />
    </div>
  );
}

/* ── Animation variants ── */

const container = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.15 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16, filter: "blur(6px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

const statPop = {
  hidden: { opacity: 0, scale: 0.8, filter: "blur(8px)" },
  visible: (i: number) => ({
    opacity: 1,
    scale: 1,
    filter: "blur(0px)",
    transition: { delay: 0.3 + i * 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  }),
};

/* ── Component ── */

export default function TerminalDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <section id="demo" ref={ref} className="py-24 px-6">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16, filter: "blur(8px)" }}
          animate={inView ? { opacity: 1, y: 0, filter: "blur(0px)" } : {}}
          transition={{ duration: 0.6 }}
          className="mb-14 text-center"
        >
          <h2 className="font-sans text-3xl md:text-4xl font-bold text-white tracking-tight">
            why CrowByte
          </h2>
          <p className="font-sans text-zinc-500 text-sm mt-3">
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
          <motion.div variants={fadeUp}>
            <SpotlightPanel
              className="rounded-2xl border border-white/[0.06] bg-white/[0.02] h-full inner-highlight"
              glowColor="rgba(239,68,68,0.04)"
            >
              <div className="flex items-center gap-2 px-5 py-3 border-b border-white/[0.06] bg-white/[0.02]">
                <UilClock size={14} className="text-zinc-500" />
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
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/[0.02] transition-colors duration-200"
                  >
                    <UilTimes size={14} className="text-red-400/60 flex-shrink-0" />
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
                {/* Time bar */}
                <div className="pt-3 px-3">
                  <ProgressBar percent={100} color="bg-red-500/40" delay={0.5} />
                  <p className="font-['JetBrains_Mono'] text-[10px] text-zinc-600 mt-1.5">
                    Total: ~4 hours of context-switching
                  </p>
                </div>
              </div>
            </SpotlightPanel>
          </motion.div>

          {/* AFTER — CrowByte */}
          <motion.div variants={fadeUp}>
            <SpotlightPanel
              className="rounded-2xl bg-blue-500/[0.03] h-full inner-highlight"
              glowColor="rgba(59,130,246,0.08)"
            >
              {/* Animated top border */}
              <div className="absolute top-0 left-0 right-0 h-[1px] overflow-hidden z-20">
                <motion.div
                  animate={{ x: ["-100%", "100%"] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  className="h-full w-1/2"
                  style={{
                    background:
                      "linear-gradient(90deg, transparent, rgba(59,130,246,0.5), transparent)",
                  }}
                />
              </div>

              <div className="flex items-center gap-2 px-5 py-3 border-b border-blue-500/10 bg-blue-500/[0.03]">
                <UilBolt size={14} className="text-blue-400" />
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
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-blue-500/[0.04] transition-colors duration-200"
                  >
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      whileInView={{ scale: 1, opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.4 + i * 0.15, type: "spring", stiffness: 300 }}
                    >
                      <UilCheck size={14} className="text-blue-400 flex-shrink-0" />
                    </motion.div>
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

                {/* Time bar */}
                <div className="pt-3 px-3">
                  <ProgressBar percent={10} color="bg-blue-500" delay={0.5} />
                  <p className="font-['JetBrains_Mono'] text-[10px] text-zinc-500 mt-1.5">
                    Total: 25 seconds — all agents run simultaneously
                  </p>
                </div>

                <div className="pt-3 mt-2 border-t border-blue-500/10">
                  <div className="flex items-center gap-2 px-3">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75 animate-ping" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500" />
                    </span>
                    <span className="font-['JetBrains_Mono'] text-xs text-zinc-500">
                      Parallel execution — not sequential
                    </span>
                  </div>
                </div>
              </div>
            </SpotlightPanel>
          </motion.div>
        </motion.div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              custom={i}
              variants={statPop}
              initial="hidden"
              animate={inView ? "visible" : "hidden"}
              whileHover={{ scale: 1.04, transition: { duration: 0.2 } }}
              className={`text-center py-5 px-3 rounded-xl border transition-colors duration-300 cursor-default ${
                (stat as any).accent
                  ? "border-blue-500/15 bg-blue-500/[0.03] hover:border-blue-500/25"
                  : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12]"
              }`}
            >
              <div className={`font-['JetBrains_Mono'] text-[10px] uppercase tracking-widest mb-2 ${
                (stat as any).accent ? "text-blue-400/70" : "text-zinc-600"
              }`}>
                {stat.label}
              </div>
              <div className="font-sans text-xs text-zinc-300 leading-relaxed">
                {stat.value}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
