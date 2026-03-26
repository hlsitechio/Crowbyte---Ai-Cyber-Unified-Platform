import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Lightning } from "@phosphor-icons/react";
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
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-6">
          <Lightning size={28} weight="duotone" className="text-emerald-400" />
        </div>

        <h2 className="font-['JetBrains_Mono'] text-3xl md:text-4xl font-bold text-white mb-4">
          ready to hunt?
        </h2>

        <p className="font-['JetBrains_Mono'] text-sm text-zinc-500 mb-8 max-w-lg mx-auto">
          Download CrowByte. Point it at a target. Let AI find what humans miss.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <LaunchAppButton className="font-['JetBrains_Mono'] text-sm font-semibold bg-emerald-500 hover:bg-emerald-400 text-black px-8 py-3 rounded transition-colors cursor-pointer">
            Get Started Free
          </LaunchAppButton>
          <a
            href="https://github.com/hlsitechio/crowbyte/releases/latest"
            target="_blank"
            rel="noopener noreferrer"
            className="font-['JetBrains_Mono'] text-sm text-zinc-400 border border-white/20 hover:bg-white/5 px-8 py-3 rounded transition-colors inline-flex items-center gap-2"
          >
            Download Desktop
          </a>
        </div>

        <p className="font-['JetBrains_Mono'] text-[10px] text-zinc-600 mt-4">
          Free tier. No credit card. Linux / Windows / macOS.
        </p>
      </motion.div>
    </section>
  );
}
