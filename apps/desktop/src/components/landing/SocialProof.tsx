import { motion, useInView } from "framer-motion";
import { useRef } from "react";

const stats = [
  { value: "15", label: "AI Agents" },
  { value: "142", label: "MCP Tools" },
  { value: "7000+", label: "Kali Binaries" },
  { value: "<30s", label: "Full Recon" },
];

export default function SocialProof() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });

  return (
    <section ref={ref} className="py-12 px-6 border-y border-white/[0.04]">
      <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 12 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: i * 0.1, duration: 0.4 }}
            className="text-center"
          >
            <div className="font-['JetBrains_Mono'] text-2xl md:text-3xl font-bold text-blue-400">
              {stat.value}
            </div>
            <div className="font-['JetBrains_Mono'] text-xs text-zinc-500 mt-1 uppercase tracking-wider">
              {stat.label}
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
