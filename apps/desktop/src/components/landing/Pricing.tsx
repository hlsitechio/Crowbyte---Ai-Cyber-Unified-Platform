import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Check, X } from "@phosphor-icons/react";

interface Feature {
  label: string;
  value: string | boolean;
}

interface PlanTier {
  name: string;
  price: string;
  subtitle: string;
  features: Feature[];
  cta: string;
  href: string;
  highlight?: boolean;
}

const plans: PlanTier[] = [
  {
    name: "Free",
    price: "$0",
    subtitle: "Get started — forever free",
    features: [
      { label: "AI Models", value: "3 models" },
      { label: "Messages", value: "50/day" },
      { label: "Max Tokens", value: "2,048" },
      { label: "Knowledge Base", value: "50 entries" },
      { label: "Custom Agents", value: false },
      { label: "Desktop App", value: false },
      { label: "API Access", value: false },
    ],
    cta: "Launch Free",
    href: "/auth",
  },
  {
    name: "Pro Beta",
    price: "$19",
    subtitle: "For serious hunters",
    features: [
      { label: "AI Models", value: "All 7 models" },
      { label: "Messages", value: "Unlimited" },
      { label: "Max Tokens", value: "8,192" },
      { label: "Knowledge Base", value: "Unlimited" },
      { label: "Custom Agents", value: "3 agents" },
      { label: "Desktop App", value: "Beta access" },
      { label: "Support", value: "Priority email" },
    ],
    cta: "Join Pro Beta",
    href: "/auth",
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "Soon",
    subtitle: "Teams & on-prem",
    features: [
      { label: "AI Models", value: "All + custom" },
      { label: "Messages", value: "Unlimited" },
      { label: "Max Tokens", value: "16,384" },
      { label: "Knowledge Base", value: "Unlimited" },
      { label: "Custom Agents", value: "Unlimited" },
      { label: "Fleet Mgmt", value: "Unlimited" },
      { label: "API Access", value: "Full REST API" },
      { label: "Support", value: "Dedicated SLA" },
    ],
    cta: "Join Waitlist",
    href: "/contact",
  },
];

function FeatureRow({ feature }: { feature: Feature }) {
  const isFalse = feature.value === false;
  return (
    <li className="flex items-center gap-2.5 py-1.5">
      {isFalse ? (
        <X size={14} weight="bold" className="text-zinc-600 shrink-0" />
      ) : (
        <Check size={14} weight="bold" className="text-blue-500 shrink-0" />
      )}
      <span
        className={`font-['JetBrains_Mono'] text-xs ${
          isFalse ? "text-zinc-600" : "text-zinc-400"
        }`}
      >
        {feature.label}:{" "}
        <span className={isFalse ? "text-zinc-600" : "text-zinc-300"}>
          {isFalse ? "—" : feature.value}
        </span>
      </span>
    </li>
  );
}

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.08,
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
      <div className="mx-auto max-w-6xl">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="font-['JetBrains_Mono'] text-3xl md:text-4xl font-bold text-white mb-14"
        >
          pricing.
        </motion.h2>

        <motion.div
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-4xl mx-auto"
        >
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              variants={cardVariants}
              custom={i}
              className={`rounded-xl p-5 flex flex-col ${
                plan.highlight
                  ? "bg-white/[0.04] border border-blue-500/30"
                  : "bg-white/[0.03] border border-white/[0.06]"
              }`}
            >
              <h3 className="font-['JetBrains_Mono'] text-base font-semibold text-white">
                {plan.name}
              </h3>
              <p className="font-['JetBrains_Mono'] text-xs text-zinc-500 mt-0.5">
                {plan.subtitle}
              </p>

              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-3xl font-bold text-white font-['JetBrains_Mono']">
                  {plan.price}
                </span>
                {plan.price !== "Custom" && (
                  <span className="text-xs text-zinc-500 font-['JetBrains_Mono']">
                    /mo
                  </span>
                )}
              </div>

              <ul className="mt-5 flex-1">
                {plan.features.map((feature) => (
                  <FeatureRow key={feature.label} feature={feature} />
                ))}
              </ul>

              <button
                onClick={() => { window.location.href = plan.href; }}
                className={`mt-6 w-full rounded-full py-3 text-sm text-center block font-['JetBrains_Mono'] font-medium transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98] ${
                  plan.highlight
                    ? "bg-orange-500 hover:bg-orange-400 text-black"
                    : "border border-white/[0.12] hover:border-white/[0.2] hover:bg-white/[0.04] text-white"
                }`}
              >
                {plan.cta}
              </button>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
