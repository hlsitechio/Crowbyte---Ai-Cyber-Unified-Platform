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
    subtitle: "Get started",
    features: [
      { label: "Custom Agents", value: "2 agents" },
      { label: "MCP Tools", value: "Basic set" },
      { label: "VPS Agents", value: false },
      { label: "Red Team Ops", value: false },
      { label: "Fleet Management", value: false },
      { label: "Support", value: "Community" },
    ],
    cta: "Launch Free",
    href: "#/auth",
  },
  {
    name: "Pro",
    price: "$29",
    subtitle: "For serious hunters",
    features: [
      { label: "Custom Agents", value: "10 agents" },
      { label: "MCP Tools", value: "All 142" },
      { label: "VPS Agents", value: "3 agents" },
      { label: "Red Team Ops", value: "5 ops" },
      { label: "Fleet Management", value: "5 endpoints" },
      { label: "Support", value: "Priority email" },
    ],
    cta: "Start Pro",
    href: "#/auth",
    highlight: true,
  },
  {
    name: "Team",
    price: "$79",
    subtitle: "Collaborate at scale",
    features: [
      { label: "Custom Agents", value: "Unlimited" },
      { label: "MCP Tools", value: "All 142" },
      { label: "VPS Agents", value: "9 agents" },
      { label: "Red Team Ops", value: "Unlimited" },
      { label: "Fleet Management", value: "50 endpoints" },
      { label: "Support", value: "Priority + chat" },
    ],
    cta: "Start Team",
    href: "#/auth",
  },
  {
    name: "Enterprise",
    price: "Custom",
    subtitle: "On-prem + air-gapped",
    features: [
      { label: "Custom Agents", value: "Unlimited" },
      { label: "MCP Tools", value: "All + custom" },
      { label: "VPS Agents", value: "Unlimited" },
      { label: "Red Team Ops", value: "Unlimited" },
      { label: "Fleet Management", value: "Unlimited" },
      { label: "Support", value: "Dedicated SLA" },
    ],
    cta: "Contact Sales",
    href: "mailto:support@crowbyte.io",
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
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
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
                onClick={() => { window.location.hash = plan.href; }}
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
