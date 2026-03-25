import { useState, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Check } from "@phosphor-icons/react";

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

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

/* ------------------------------------------------------------------ */
/*  Plan data                                                          */
/* ------------------------------------------------------------------ */

interface PlanTier {
  name: string;
  monthlyPrice: string;
  annualPrice: string;
  subtitle: string;
  features: string[];
  cta: string;
  highlight?: boolean;
  titleColor: string;
  ctaStyle: string;
}

const plans: PlanTier[] = [
  {
    name: "Free",
    monthlyPrice: "$0",
    annualPrice: "$0",
    subtitle: "Get started at no cost",
    features: [
      "1 Workspace",
      "50 AI queries/day",
      "3 AI Models",
      "Basic MCP Tools",
      "100 CVE Tracking",
      "3 Threat Feeds",
      "Quick Network Scan",
      "Community Support",
    ],
    cta: "Get Started Free",
    titleColor: "text-white",
    ctaStyle:
      "border border-white/20 hover:bg-white/5 text-zinc-200 transition-colors",
  },
  {
    name: "Pro",
    monthlyPrice: "$29",
    annualPrice: "$299",
    subtitle: "For serious hunters",
    features: [
      "Unlimited Workspaces",
      "Unlimited AI Queries",
      "All 7+ AI Models",
      "All 142 MCP Tools",
      "Unlimited CVEs",
      "All 10+ Threat Feeds",
      "3 VPS Agents",
      "All Scan Profiles",
      "5 Red Team Ops",
      "Priority Email Support",
    ],
    cta: "Start Pro Trial",
    highlight: true,
    titleColor: "text-emerald-400",
    ctaStyle:
      "bg-emerald-500 hover:bg-emerald-400 text-black font-semibold transition-colors",
  },
  {
    name: "Team",
    monthlyPrice: "$79",
    annualPrice: "$799",
    subtitle: "Collaborate at scale",
    features: [
      "Everything in Pro, plus:",
      "9 VPS Agents",
      "Unlimited Red Team Ops",
      "50 Fleet Endpoints",
      "Shared Findings",
      "Admin Controls",
      "Audit Logs",
      "RBAC",
      "Priority + Chat Support",
      "Cloud + Self-hosted",
    ],
    cta: "Start Team Trial",
    titleColor: "text-violet-400",
    ctaStyle:
      "border border-white/20 hover:bg-violet-500/10 hover:border-violet-500/30 text-zinc-200 transition-colors",
  },
  {
    name: "Enterprise",
    monthlyPrice: "Custom",
    annualPrice: "Custom",
    subtitle: "For large organizations",
    features: [
      "Everything in Team, plus:",
      "Unlimited VPS Agents",
      "Unlimited Fleet",
      "Custom AI Models",
      "Custom Threat Feeds",
      "SSO / SAML",
      "Dedicated Support + SLA",
      "On-prem + Air-gapped",
    ],
    cta: "Contact Sales",
    titleColor: "text-white",
    ctaStyle:
      "border border-white/20 hover:bg-white/5 text-zinc-200 transition-colors",
  },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function Pricing() {
  const [isAnnual, setIsAnnual] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);
  const inView = useInView(sectionRef, { once: true, margin: "-80px" });

  return (
    <section id="pricing" ref={sectionRef} className="py-28 px-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <motion.div
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          variants={containerVariants}
          className="text-center mb-8"
        >
          <motion.h2
            variants={fadeUp}
            custom={0}
            className="text-3xl md:text-4xl font-bold text-white font-['JetBrains_Mono']"
          >
            Simple, Transparent Pricing
          </motion.h2>
          <motion.p
            variants={fadeUp}
            custom={1}
            className="mt-4 text-zinc-400 max-w-xl mx-auto font-['Inter']"
          >
            No hidden fees. No sales calls for basic plans.
          </motion.p>
        </motion.div>

        {/* Billing toggle */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex items-center justify-center gap-3 mb-12"
        >
          <div className="bg-white/5 rounded-full p-1 flex items-center">
            <button
              onClick={() => setIsAnnual(false)}
              className={`rounded-full px-4 py-1 text-sm font-medium transition-all font-['Inter'] ${
                !isAnnual
                  ? "bg-emerald-500 text-black"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setIsAnnual(true)}
              className={`rounded-full px-4 py-1 text-sm font-medium transition-all font-['Inter'] ${
                isAnnual
                  ? "bg-emerald-500 text-black"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Annual
            </button>
          </div>
          {isAnnual && (
            <motion.span
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-['Inter']"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Save up to 16%
            </motion.span>
          )}
        </motion.div>

        {/* Cards */}
        <motion.div
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          variants={containerVariants}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              variants={fadeUp}
              custom={i + 2}
              className={`relative rounded-2xl p-6 flex flex-col ${
                plan.highlight
                  ? "bg-emerald-500/[0.03] border border-emerald-500/30 ring-1 ring-emerald-500/20"
                  : "bg-white/[0.03] border border-white/[0.06]"
              }`}
            >
              {/* Most Popular label */}
              {plan.highlight && (
                <div className="absolute -top-3 left-6">
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-emerald-400 font-['Inter']">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    Most Popular
                  </span>
                </div>
              )}

              {/* Title */}
              <h3
                className={`text-lg font-semibold font-['JetBrains_Mono'] ${plan.titleColor}`}
              >
                {plan.name}
              </h3>

              {/* Price */}
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-bold text-white font-['JetBrains_Mono']">
                  {plan.monthlyPrice === "Custom"
                    ? "Custom"
                    : isAnnual
                      ? plan.annualPrice
                      : plan.monthlyPrice}
                </span>
                {plan.monthlyPrice !== "Custom" && (
                  <span className="text-sm text-zinc-500 font-['Inter']">
                    {isAnnual ? "/yr" : "/mo"}
                  </span>
                )}
              </div>

              {/* Subtitle */}
              <p className="text-sm text-zinc-400 mt-2 mb-6 font-['Inter']">
                {plan.subtitle}
              </p>

              {/* Features */}
              <ul className="space-y-3 flex-1">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2.5 text-sm text-zinc-300 font-['Inter']"
                  >
                    <Check
                      size={16}
                      weight="bold"
                      className="text-emerald-500 mt-0.5 shrink-0"
                    />
                    {feature}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <a
                href="/#/auth"
                className={`mt-8 w-full rounded-lg py-2.5 text-sm text-center block ${plan.ctaStyle}`}
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
