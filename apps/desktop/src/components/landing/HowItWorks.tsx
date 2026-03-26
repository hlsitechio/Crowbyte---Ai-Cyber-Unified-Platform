import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { DownloadSimple, Terminal, Crosshair, FileText } from "@phosphor-icons/react";

const steps = [
  {
    icon: DownloadSimple,
    num: "01",
    title: "Install",
    desc: "Download for Linux, Windows, or macOS. One binary, zero config.",
  },
  {
    icon: Terminal,
    num: "02",
    title: "Point",
    desc: "Enter your target. CrowByte chains subdomain enum, port scan, tech detect.",
  },
  {
    icon: Crosshair,
    num: "03",
    title: "Hunt",
    desc: "AI agents scan for vulns, verify exploits, flag critical findings.",
  },
  {
    icon: FileText,
    num: "04",
    title: "Report",
    desc: "One click. Professional report. Submit to HackerOne or Bugcrowd.",
  },
];

export default function HowItWorks() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <section ref={ref} className="py-24 px-6 border-y border-white/[0.04]">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="mb-14"
        >
          <h2 className="font-['JetBrains_Mono'] text-3xl md:text-4xl font-bold text-white">
            how it works.
          </h2>
          <p className="font-['JetBrains_Mono'] text-zinc-500 text-sm mt-3">
            target to report in four steps
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {steps.map((step, i) => (
            <motion.div
              key={step.num}
              initial={{ opacity: 0, y: 16 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="relative"
            >
              {/* Connector line */}
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-5 left-[calc(100%+2px)] w-[calc(100%-20px)] h-px bg-white/[0.06]" />
              )}

              <div className="font-['JetBrains_Mono'] text-[10px] text-emerald-500 font-bold tracking-widest mb-3">
                {step.num}
              </div>
              <div className="flex items-center gap-3 mb-2">
                <step.icon size={20} weight="duotone" className="text-emerald-400" />
                <h3 className="font-['JetBrains_Mono'] text-base font-bold text-white">
                  {step.title}
                </h3>
              </div>
              <p className="font-['JetBrains_Mono'] text-[12px] text-zinc-500 leading-relaxed">
                {step.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
