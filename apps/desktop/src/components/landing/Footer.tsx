import { motion, useInView } from "framer-motion";
import { useRef } from "react";

export default function Footer() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-20px" });

  return (
    <motion.footer
      ref={ref}
      initial={{ opacity: 0 }}
      animate={inView ? { opacity: 1 } : {}}
      transition={{ duration: 0.6 }}
      className="px-6"
    >
      <div className="mx-auto max-w-5xl py-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div>
          <span className="font-['JetBrains_Mono'] text-sm font-semibold">
            <span className="text-white">Crow</span>
            <span className="text-blue-400">Byte</span>
          </span>
          <p className="font-['JetBrains_Mono'] text-sm text-zinc-500 mt-1">
            Offensive security platform.
          </p>
        </div>
        <div className="flex items-center gap-6">
          <button
            onClick={() => {
              window.open("https://github.com/hlsitechio/crowbyte", "_blank", "noopener");
            }}
            className="font-['JetBrains_Mono'] text-sm text-zinc-500 hover:text-zinc-300 transition-colors duration-200 cursor-pointer"
          >
            GitHub
          </button>
          <button
            onClick={() => {
              document.querySelector("#pricing")?.scrollIntoView({ behavior: "smooth" }) ||
                (window.location.href = "/#pricing");
            }}
            className="font-['JetBrains_Mono'] text-sm text-zinc-500 hover:text-zinc-300 transition-colors duration-200 cursor-pointer"
          >
            Pricing
          </button>
          <button
            onClick={() => {
              window.location.href = "/contact";
            }}
            className="font-['JetBrains_Mono'] text-sm text-zinc-500 hover:text-zinc-300 transition-colors duration-200 cursor-pointer"
          >
            Contact
          </button>
        </div>
      </div>
      <div className="mx-auto max-w-5xl border-t border-white/[0.06] py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <span className="font-['JetBrains_Mono'] text-sm text-zinc-600">
          &copy; 2026 CrowByte
        </span>
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              window.location.href = "/privacy";
            }}
            className="font-['JetBrains_Mono'] text-xs text-zinc-600 hover:text-zinc-400 transition-colors duration-200 cursor-pointer"
          >
            Privacy Policy
          </button>
          <span className="text-zinc-700">&middot;</span>
          <button
            onClick={() => {
              window.location.href = "/terms";
            }}
            className="font-['JetBrains_Mono'] text-xs text-zinc-600 hover:text-zinc-400 transition-colors duration-200 cursor-pointer"
          >
            Terms of Service
          </button>
          <span className="text-zinc-700">&middot;</span>
          <button
            onClick={() => {
              window.location.href = "/refund";
            }}
            className="font-['JetBrains_Mono'] text-xs text-zinc-600 hover:text-zinc-400 transition-colors duration-200 cursor-pointer"
          >
            Refund Policy
          </button>
        </div>
      </div>
    </motion.footer>
  );
}
