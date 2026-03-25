import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Check, X } from "@phosphor-icons/react";

/* ------------------------------------------------------------------ */
/*  Animation variants                                                 */
/* ------------------------------------------------------------------ */

const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: "easeOut" },
  }),
};

/* ------------------------------------------------------------------ */
/*  Table data                                                         */
/* ------------------------------------------------------------------ */

type CellValue = string | boolean | null;

interface ComparisonRow {
  feature: string;
  crowbyte: CellValue;
  burp: CellValue;
  cobalt: CellValue;
}

const rows: ComparisonRow[] = [
  {
    feature: "Price",
    crowbyte: "$299/yr",
    burp: "$449/yr",
    cobalt: "~$5,500/yr",
  },
  {
    feature: "AI Integration",
    crowbyte: "7+ models",
    burp: false,
    cobalt: false,
  },
  {
    feature: "Built-in Terminal",
    crowbyte: true,
    burp: false,
    cobalt: "Limited",
  },
  {
    feature: "CVE Database",
    crowbyte: "Real-time",
    burp: false,
    cobalt: false,
  },
  {
    feature: "Threat Intel Feeds",
    crowbyte: "10+ OSINT",
    burp: false,
    cobalt: "Limited",
  },
  {
    feature: "Custom AI Agents",
    crowbyte: true,
    burp: false,
    cobalt: false,
  },
  {
    feature: "MCP Tools",
    crowbyte: "142",
    burp: "Extensions",
    cobalt: "Malleable C2",
  },
  {
    feature: "Mission Planning",
    crowbyte: "AI-generated",
    burp: false,
    cobalt: "Manual",
  },
  {
    feature: "Open Architecture",
    crowbyte: "MCP + API",
    burp: "Closed",
    cobalt: "Closed",
  },
];

/* ------------------------------------------------------------------ */
/*  Cell renderer                                                      */
/* ------------------------------------------------------------------ */

function CellContent({
  value,
  isCrowByte,
}: {
  value: CellValue;
  isCrowByte?: boolean;
}) {
  if (value === true) {
    return (
      <Check size={18} weight="bold" className="text-emerald-400 mx-auto" />
    );
  }
  if (value === false) {
    return <X size={18} weight="bold" className="text-red-400 mx-auto" />;
  }
  return (
    <span
      className={`text-sm font-['Inter'] ${isCrowByte ? "text-emerald-400 font-medium" : "text-zinc-400"}`}
    >
      {value}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function Comparison() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const inView = useInView(sectionRef, { once: true, margin: "-80px" });

  return (
    <section ref={sectionRef} className="py-28 px-6">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <motion.div
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          className="text-center mb-14"
        >
          <motion.h2
            variants={fadeUp}
            custom={0}
            className="text-3xl md:text-4xl font-bold text-white font-['JetBrains_Mono']"
          >
            Why CrowByte?
          </motion.h2>
          <motion.p
            variants={fadeUp}
            custom={1}
            className="mt-4 text-zinc-400 max-w-xl mx-auto font-['Inter']"
          >
            See how CrowByte stacks up against traditional security tools.
          </motion.p>
        </motion.div>

        {/* Table */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              {/* Header */}
              <thead>
                <tr className="bg-white/5">
                  <th className="text-left px-6 py-4 text-zinc-400 font-['JetBrains_Mono'] text-sm uppercase tracking-wider font-medium">
                    Feature
                  </th>
                  <th className="text-center px-6 py-4 font-['JetBrains_Mono'] text-sm uppercase tracking-wider font-medium">
                    <span className="text-emerald-400">CrowByte Pro</span>
                  </th>
                  <th className="text-center px-6 py-4 text-zinc-400 font-['JetBrains_Mono'] text-sm uppercase tracking-wider font-medium">
                    Burp Suite Pro
                  </th>
                  <th className="text-center px-6 py-4 text-zinc-400 font-['JetBrains_Mono'] text-sm uppercase tracking-wider font-medium">
                    Cobalt Strike
                  </th>
                </tr>
              </thead>

              {/* Body */}
              <tbody>
                {rows.map((row, i) => (
                  <motion.tr
                    key={row.feature}
                    initial={{ opacity: 0 }}
                    animate={inView ? { opacity: 1 } : { opacity: 0 }}
                    transition={{ duration: 0.3, delay: 0.3 + i * 0.05 }}
                    className="border-b border-white/[0.04] last:border-b-0 hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-6 py-4 text-sm text-zinc-300 font-['Inter'] font-medium">
                      {row.feature}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <CellContent value={row.crowbyte} isCrowByte />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <CellContent value={row.burp} />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <CellContent value={row.cobalt} />
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
