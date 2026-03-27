import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Zap } from "lucide-react";
import LaunchAppButton from "./LaunchAppButton";

export default function CTABanner() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <section ref={ref} className="py-24 px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6 }}
        className="max-w-3xl mx-auto text-center"
      >
        <Zap size={28} strokeWidth={1.5} className="text-blue-400 mx-auto mb-6" />

        <h2 className="font-['JetBrains_Mono'] text-3xl md:text-4xl font-bold text-white mb-4">
          stop switching tools.
        </h2>

        <p className="font-['JetBrains_Mono'] text-sm text-zinc-500 mb-8 max-w-lg mx-auto">
          One terminal. 15 AI agents. Every tool you need.
          <br />
          Your next bounty is waiting.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <LaunchAppButton className="font-['JetBrains_Mono'] text-sm font-semibold bg-orange-500 hover:bg-orange-400 text-black px-8 py-3 rounded-full transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]">
            Get Started Free
          </LaunchAppButton>
          <a
            href="https://github.com/hlsitechio/crowbyte/releases/latest"
            target="_blank"
            rel="noopener noreferrer"
            className="font-['JetBrains_Mono'] text-sm text-zinc-300 border border-white/[0.12] hover:border-white/[0.2] hover:bg-white/[0.04] px-8 py-3 rounded-full transition-all inline-flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
          >
            Download Desktop
          </a>
        </div>

        <p className="font-['JetBrains_Mono'] text-xs text-zinc-600 mt-4">
          Free tier. No credit card. Linux / Windows / macOS.
        </p>
      </motion.div>
    </section>
  );
}
