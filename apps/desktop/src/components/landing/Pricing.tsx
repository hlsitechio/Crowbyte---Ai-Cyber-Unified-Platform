import { useRef } from "react";
import { motion, useInView } from "framer-motion";

interface PlanTier {
  name: string;
  price: string;
  features: string[];
  cta: string;
  href: string;
  highlight?: boolean;
}

const plans: PlanTier[] = [
  {
    name: "Free",
    price: "$0",
    features: [
      "3 AI models",
      "50 queries/day",
      "Basic recon tools",
      "Community support",
    ],
    cta: "Launch Free",
    href: "/#/auth",
  },
  {
    name: "Pro",
    price: "$29",
    features: [
      "All 7+ AI models",
      "Unlimited queries",
      "142 MCP tools",
      "3 VPS agents",
      "Priority support",
    ],
    cta: "Start Pro",
    href: "/#/auth",
    highlight: true,
  },
  {
    name: "Team",
    price: "$79",
    features: [
      "Everything in Pro",
      "9 VPS agents",
      "Fleet management",
      "Shared findings",
      "RBAC + audit logs",
    ],
    cta: "Start Team",
    href: "/#/auth",
  },
];

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.1,
      duration: 0.5,
      ease: "easeOut",
    },
  }),
};

export default function Pricing() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const inView = useInView(sectionRef, { once: true, margin: "-80px" });

  return (
    <section id="pricing" ref={sectionRef} className="py-28 px-6">
      <div className="mx-auto max-w-5xl">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="font-['JetBrains_Mono'] text-4xl md:text-5xl font-bold text-white mb-14"
        >
          Pricing
        </motion.h2>

        <motion.div
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              variants={cardVariants}
              custom={i}
              className={`rounded-2xl p-6 flex flex-col ${
                plan.highlight
                  ? "bg-white/[0.03] border border-emerald-500/30"
                  : "bg-white/[0.03] border border-white/[0.06]"
              }`}
            >
              <h3 className="font-['JetBrains_Mono'] text-lg font-semibold text-white">
                {plan.name}
              </h3>

              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-bold text-white font-['JetBrains_Mono']">
                  {plan.price}
                </span>
                <span className="text-sm text-zinc-500 font-['JetBrains_Mono']">
                  /mo
                </span>
              </div>

              <ul className="mt-6 space-y-3 flex-1">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className="text-sm text-zinc-400 font-['JetBrains_Mono']"
                  >
                    {feature}
                  </li>
                ))}
              </ul>

              <a
                href={plan.href}
                className={`mt-8 w-full rounded-lg py-2.5 text-sm text-center block font-['JetBrains_Mono'] font-medium transition-colors ${
                  plan.highlight
                    ? "bg-emerald-500 hover:bg-emerald-400 text-black"
                    : "border border-white/20 hover:bg-white/5 text-white"
                }`}
              >
                {plan.cta}
              </a>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
