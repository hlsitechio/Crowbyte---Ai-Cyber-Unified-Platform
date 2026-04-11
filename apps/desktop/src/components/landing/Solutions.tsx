import { useRef, useCallback } from "react";
import { motion, useInView, useMotionValue, useTransform } from "framer-motion";
import { UilCrosshair, UilShield, UilBug } from "@iconscout/react-unicons";

/* ── Spotlight card ── */
function SpotlightCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
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
      className={`relative group rounded-2xl overflow-hidden transition-all duration-500 ${className}`}
    >
      <motion.div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
        style={{
          background: useTransform(
            [mouseX, mouseY],
            ([x, y]) =>
              `radial-gradient(400px circle at ${x}px ${y}px, rgba(255,255,255,0.03), transparent 60%)`,
          ),
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

/* ── Data ── */

const useCases = [
  {
    icon: UilCrosshair,
    role: "Red Teams & Pentesters",
    problem: "Context-switching between 15 tools, losing findings across terminal tabs.",
    solution:
      "One platform. Terminal, AI chat, CVE lookup, exploit chains, and report generation — all connected. AI agents run recon, find vulns, and chain exploits automatically.",
    result: "Full pentest workflow — recon to report — in one place.",
    iconColor: "#f97316",
    metric: { value: "1 tool", label: "vs 15 tools", color: "text-orange-400" },
  },
  {
    icon: UilShield,
    role: "Blue Teams & SOC",
    problem: "New CVEs drop daily. Manual triage can't keep up. Blind spots everywhere.",
    solution:
      "Real-time CVE database with Shodan enrichment. AI auto-triages based on your infrastructure. Custom agents monitor 24/7, detect threats, and alert before attackers strike.",
    result: "From reactive to proactive — protect your org around the clock.",
    iconColor: "#3b82f6",
    metric: { value: "24/7", label: "auto-triage", color: "text-blue-400" },
  },
  {
    icon: UilBug,
    role: "UilBug Bounty Hunters",
    problem: "Spending 4+ hours on manual recon before finding a single vuln.",
    solution:
      "Deploy AI agents on a target. They scan repos, probe APIs, test for SQLi/XSS/IDOR — and compile a HackerOne-ready report with PoCs. You collect the bounty.",
    result: "What took a full day now takes 30 minutes.",
    iconColor: "#a855f7",
    metric: { value: "30min", label: "vs 8 hours", color: "text-purple-400" },
  },
];

const cardReveal = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  }),
};

export default function Solutions() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <section id="solutions" ref={ref} className="py-28 px-6">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="mb-16 text-center"
        >
          <h2 className="font-sans text-3xl md:text-4xl font-bold text-white tracking-tight">
            built for security teams
          </h2>
          <p className="font-sans text-zinc-500 text-sm mt-3">
            red team, blue team, purple team — one platform
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {useCases.map((uc, i) => (
            <motion.div
              key={uc.role}
              custom={i}
              variants={cardReveal}
              initial="hidden"
              animate={inView ? "visible" : "hidden"}
            >
              <SpotlightCard className="border border-white/[0.06] bg-white/[0.015] h-full hover:border-white/[0.1]">
                <div className="p-6 flex flex-col h-full">
                  {/* Header — icon without box */}
                  <div className="flex items-center gap-3 mb-5">
                    <uc.icon size={22} style={{ color: uc.iconColor }} />
                    <h3 className="font-sans text-[15px] font-semibold text-white">
                      {uc.role}
                    </h3>
                  </div>

                  {/* Problem / Solution */}
                  <div className="space-y-4 flex-1">
                    <div>
                      <span className="font-['JetBrains_Mono'] text-[10px] text-zinc-600 uppercase tracking-wider">
                        Problem
                      </span>
                      <p className="font-sans text-[13px] text-zinc-400 mt-1 leading-relaxed">
                        {uc.problem}
                      </p>
                    </div>
                    <div>
                      <span className="font-['JetBrains_Mono'] text-[10px] text-zinc-600 uppercase tracking-wider">
                        Solution
                      </span>
                      <p className="font-sans text-[13px] text-zinc-400 mt-1 leading-relaxed">
                        {uc.solution}
                      </p>
                    </div>
                  </div>

                  {/* Result bar */}
                  <div className="mt-5 pt-4 border-t border-white/[0.06] flex items-center justify-between gap-3">
                    <p className="font-sans text-[13px] text-white font-medium flex-1">
                      {uc.result}
                    </p>
                    <div className="shrink-0 text-right">
                      <span className={`font-['JetBrains_Mono'] text-lg font-bold ${uc.metric.color}`}>
                        {uc.metric.value}
                      </span>
                      <span className="font-['JetBrains_Mono'] text-[10px] text-zinc-600 block">
                        {uc.metric.label}
                      </span>
                    </div>
                  </div>
                </div>
              </SpotlightCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
