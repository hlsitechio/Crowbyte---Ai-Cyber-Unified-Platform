import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { ArrowRight } from "@phosphor-icons/react";

/* ------------------------------------------------------------------ */
/*  Animation variants                                                 */
/* ------------------------------------------------------------------ */

const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" },
  }),
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function CTABanner() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const inView = useInView(sectionRef, { once: true, margin: "-80px" });

  return (
    <section
      ref={sectionRef}
      className="py-28 px-6 bg-gradient-to-b from-transparent via-emerald-500/5 to-transparent border-y border-emerald-500/10"
    >
      <motion.div
        initial="hidden"
        animate={inView ? "visible" : "hidden"}
        className="mx-auto max-w-3xl text-center"
      >
        <motion.h2
          variants={fadeUp}
          custom={0}
          className="text-3xl md:text-4xl font-bold text-white font-['JetBrains_Mono']"
        >
          Ready to level up your security workflow?
        </motion.h2>

        <motion.p
          variants={fadeUp}
          custom={1}
          className="mt-5 text-zinc-400 max-w-lg mx-auto font-['Inter'] text-base leading-relaxed"
        >
          Join hundreds of security professionals using CrowByte to find
          vulnerabilities faster.
        </motion.p>

        <motion.div variants={fadeUp} custom={2} className="mt-10">
          <a
            href="/#/auth"
            className="group inline-flex items-center gap-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-semibold px-8 py-3.5 text-sm transition-all shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 font-['Inter']"
          >
            Get Started Free
            <ArrowRight
              size={18}
              weight="bold"
              className="transition-transform group-hover:translate-x-0.5"
            />
          </a>
        </motion.div>

        <motion.p
          variants={fadeUp}
          custom={3}
          className="mt-4 text-zinc-600 text-xs font-['Inter']"
        >
          Free forever. No credit card required.
        </motion.p>
      </motion.div>
    </section>
  );
}
