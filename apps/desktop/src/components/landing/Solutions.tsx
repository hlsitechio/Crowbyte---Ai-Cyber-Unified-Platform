import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import {
  Brain, FileText, Shield, Crosshair, Radio, Cloud,
  TerminalSquare, Bug, Network
} from "lucide-react";

const modules = [
  { icon: Brain, name: "AI Triage", desc: "Auto-classify severity + exploitability" },
  { icon: FileText, name: "Report Gen", desc: "HackerOne / Bugcrowd / custom PDF" },
  { icon: Shield, name: "Detection Lab", desc: "SIGMA, YARA, Snort, KQL rules" },
  { icon: Crosshair, name: "Mission Pipeline", desc: "Recon to report, phase tracking" },
  { icon: Radio, name: "Alert Center", desc: "SIEM bridge, 8 source normalizers" },
  { icon: Cloud, name: "Cloud Security", desc: "CSPM, SBOM, CIS compliance" },
  { icon: TerminalSquare, name: "Built-in Terminal", desc: "Embedded shell, session management" },
  { icon: Bug, name: "CVE Database", desc: "NVD + Shodan enriched tracking" },
  { icon: Network, name: "Network Scanner", desc: "Visual nmap with parsed results" },
];

export default function Solutions() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <section ref={ref} className="py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="mb-14"
        >
          <h2 className="font-['JetBrains_Mono'] text-3xl md:text-4xl font-bold text-white">
            everything else.
          </h2>
          <p className="font-['JetBrains_Mono'] text-zinc-500 text-sm mt-3">
            modules that ship with every install
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {modules.map((mod, i) => (
            <motion.div
              key={mod.name}
              initial={{ opacity: 0, y: 12 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.05, duration: 0.4 }}
              className="group flex items-start gap-4 p-5 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.1] transition-all"
            >
              <mod.icon size={20} strokeWidth={1.5} className="text-blue-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-['JetBrains_Mono'] text-sm font-semibold text-white">
                  {mod.name}
                </h3>
                <p className="font-['JetBrains_Mono'] text-xs text-zinc-500 mt-0.5">
                  {mod.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
