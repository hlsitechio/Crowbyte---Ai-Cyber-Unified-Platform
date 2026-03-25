import { useRef, useEffect, useState } from "react";
import { motion, useInView } from "framer-motion";

/* ------------------------------------------------------------------ */
/*  Animated counter hook                                              */
/* ------------------------------------------------------------------ */

function useCountUp(
  target: number,
  duration: number,
  active: boolean
): number {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!active) return;

    let start = 0;
    const startTime = performance.now();

    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(eased * target);
      setValue(current);
      if (progress < 1) {
        requestAnimationFrame(tick);
      }
    }

    requestAnimationFrame(tick);
  }, [active, target, duration]);

  return value;
}

/* ------------------------------------------------------------------ */
/*  Marquee logos                                                       */
/* ------------------------------------------------------------------ */

const logos = [
  "HackerOne",
  "Bugcrowd",
  "Intigriti",
  "Synack",
  "OWASP",
];

function MarqueeRow() {
  // Duplicate twice for seamless loop
  const items = [...logos, ...logos, ...logos, ...logos];

  return (
    <div
      className="overflow-hidden mt-8"
      style={{
        maskImage:
          "linear-gradient(to right, transparent, black 20%, black 80%, transparent)",
        WebkitMaskImage:
          "linear-gradient(to right, transparent, black 20%, black 80%, transparent)",
      }}
    >
      <div className="flex items-center gap-12 animate-marquee whitespace-nowrap">
        {items.map((name, i) => (
          <span
            key={`${name}-${i}`}
            className="text-zinc-600 font-['JetBrains_Mono'] text-lg font-medium flex items-center gap-4 shrink-0"
          >
            {name}
            {i < items.length - 1 && (
              <span className="text-zinc-700">&bull;</span>
            )}
          </span>
        ))}
      </div>

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 30s linear infinite;
        }
      `}</style>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Stats                                                              */
/* ------------------------------------------------------------------ */

interface Stat {
  value: number;
  suffix: string;
  label: string;
}

const stats: Stat[] = [
  { value: 500, suffix: "+", label: "Security Researchers" },
  { value: 10000, suffix: "+", label: "Scans Completed" },
  { value: 1200, suffix: "+", label: "CVEs Tracked" },
];

function StatCard({ stat, active }: { stat: Stat; active: boolean }) {
  const count = useCountUp(stat.value, 2000, active);

  return (
    <div className="text-center px-8">
      <div className="text-3xl font-bold text-white font-['JetBrains_Mono']">
        {count.toLocaleString()}
        {stat.suffix}
      </div>
      <div className="text-zinc-500 text-sm font-['Inter'] mt-1">
        {stat.label}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function SocialProof() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section
      ref={ref}
      className="bg-white/[0.02] border-y border-white/5 py-12"
    >
      <div className="mx-auto max-w-7xl px-6">
        {/* Title */}
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center text-zinc-500 text-sm tracking-widest uppercase font-['Inter']"
        >
          Trusted by security professionals worldwide
        </motion.p>

        {/* Marquee */}
        <MarqueeRow />

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-0 sm:divide-x sm:divide-white/5"
        >
          {stats.map((stat) => (
            <StatCard key={stat.label} stat={stat} active={inView} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}
