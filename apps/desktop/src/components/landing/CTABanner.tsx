import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import LaunchAppButton from "./LaunchAppButton";

export default function CTABanner() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <section ref={ref} className="py-24 px-6 relative overflow-hidden">
      {/* Subtle gradient orb */}
      <motion.div
        animate={{
          x: [0, 20, -10, 0],
          y: [0, -10, 15, 0],
          scale: [1, 1.05, 0.98, 1],
        }}
        transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
        animate={inView ? { opacity: 1, y: 0, filter: "blur(0px)" } : {}}
        transition={{ duration: 0.6 }}
        className="relative z-10 max-w-3xl mx-auto text-center"
      >
        <h2 className="font-sans text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight">
          stop switching tools
        </h2>

        <p className="font-sans text-sm text-zinc-500 mb-8 max-w-lg mx-auto">
          142 security tools. 9 AI agents. One platform.
          <br />
          Offense, defense, and everything in between.
        </p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3"
        >
          <LaunchAppButton className="btn-conic font-['JetBrains_Mono'] text-sm font-semibold text-white px-8 py-3 rounded-full cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-transform duration-200">
            <span className="shimmer-sweep" />
            <span className="relative z-10">Start Hunting Free</span>
          </LaunchAppButton>
          <a
            href="/payments"
            className="font-['JetBrains_Mono'] text-sm text-zinc-300 border border-white/[0.1] hover:border-white/[0.2] hover:bg-white/[0.03] px-8 py-3 rounded-full transition-all inline-flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
          >
            Get Pro — $19/mo
          </a>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ delay: 0.5 }}
          className="font-['JetBrains_Mono'] text-xs text-zinc-600 mt-4"
        >
          50 free credits daily. No credit card required.
        </motion.p>
      </motion.div>
    </section>
  );
}
