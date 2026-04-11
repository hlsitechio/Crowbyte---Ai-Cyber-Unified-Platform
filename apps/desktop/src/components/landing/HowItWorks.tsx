import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { UilUserPlus, UilWindow, UilCrosshair, UilFileAlt } from "@iconscout/react-unicons";

const steps = [
  {
    icon: UilUserPlus,
    num: "01",
    title: "Sign Up",
    desc: "Free in your browser. Pro unlocks desktop apps for Linux, Windows, macOS.",
    color: "#3b82f6",
  },
  {
    icon: UilWindow,
    num: "02",
    title: "Target",
    desc: "Give it a domain. CrowByte spawns 9 agents across your attack surface.",
    color: "#f97316",
  },
  {
    icon: UilCrosshair,
    num: "03",
    title: "Hunt",
    desc: "Agents find vulns, chain exploits, verify everything. You watch.",
    color: "#a855f7",
  },
  {
    icon: UilFileAlt,
    num: "04",
    title: "Collect",
    desc: "Auto-generated report. Submit. Get paid.",
    color: "#10b981",
  },
];

const stepReveal = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.15 + i * 0.12, duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  }),
};

const lineGrow = {
  hidden: { scaleX: 0 },
  visible: (i: number) => ({
    scaleX: 1,
    transition: { delay: 0.4 + i * 0.12, duration: 0.8, ease: [0.22, 1, 0.36, 1] },
  }),
};

export default function HowItWorks() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <section ref={ref} className="py-28 px-6 border-y border-white/[0.04]">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="mb-16 text-center"
        >
          <h2 className="font-sans text-3xl md:text-4xl font-bold text-white tracking-tight">
            how it works
          </h2>
          <p className="font-sans text-zinc-500 text-sm mt-3">
            from first scan to full report in four steps
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {steps.map((step, i) => (
            <motion.div
              key={step.num}
              custom={i}
              variants={stepReveal}
              initial="hidden"
              animate={inView ? "visible" : "hidden"}
              className="relative"
            >
              {/* Connector line */}
              {i < steps.length - 1 && (
                <motion.div
                  custom={i}
                  variants={lineGrow}
                  initial="hidden"
                  animate={inView ? "visible" : "hidden"}
                  className="hidden md:block absolute top-5 left-[calc(100%+8px)] w-[calc(100%-32px)] h-[1px] origin-left"
                  style={{
                    background: `linear-gradient(90deg, ${step.color}40, transparent)`,
                  }}
                />
              )}

              {/* Step number */}
              <div
                className="font-['JetBrains_Mono'] text-xs font-bold tracking-widest mb-4"
                style={{ color: step.color }}
              >
                {step.num}
              </div>

              {/* Icon + Title — no box */}
              <div className="flex items-center gap-3 mb-3">
                <step.icon size={20} style={{ color: step.color }} />
                <h3 className="font-sans text-[15px] font-semibold text-white">
                  {step.title}
                </h3>
              </div>

              <p className="font-sans text-[13px] text-zinc-500 leading-relaxed">
                {step.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
