import { useRef, useCallback } from "react";
import { motion, useInView, useMotionValue, useTransform } from "framer-motion";
import { UilCheck, UilTimes } from "@iconscout/react-unicons";
/* ── Spotlight card ── */
function SpotlightCard({
  children,
  className = "",
  glowColor = "rgba(59,130,246,0.06)",
}: {
  children: React.ReactNode;
  className?: string;
  glowColor?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const rect = ref.current?.getBoundingClientRect();
      if (rect) {
        mouseX.set(e.clientX - rect.left);
        mouseY.set(e.clientY - rect.top);
      }
    },
    [mouseX, mouseY],
  );

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      className={`relative group rounded-2xl overflow-hidden transition-all duration-300 inner-highlight ${className}`}
    >
      <motion.div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{
          background: useTransform(
            [mouseX, mouseY],
            ([x, y]) =>
              `radial-gradient(280px circle at ${x}px ${y}px, ${glowColor}, transparent 60%)`,
          ),
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

/* ── Data ── */

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
  badge?: string;
}

const plans: PlanTier[] = [
  {
    name: "Free",
    price: "$0",
    subtitle: "Get started — forever free",
    features: [
      { label: "AI Credits", value: "50/day" },
      { label: "AI Models", value: "3 models included" },
      { label: "Messages", value: "Unlimited" },
      { label: "CVE UilDatabase", value: "Full access" },
      { label: "Knowledge Base", value: "50 entries" },
      { label: "Mission Planner", value: "3 missions" },
      { label: "Bookmarks", value: "Unlimited" },
      { label: "Desktop App", value: false },
    ],
    cta: "Get Started Free",
    href: "/auth",
  },
  {
    name: "Pro",
    price: "$19",
    subtitle: "Everything you need — $190/yr",
    badge: "Most Popular",
    features: [
      { label: "AI Credits", value: "1,000/month" },
      { label: "AI Models", value: "All providers" },
      { label: "Claude / DeepSeek / Qwen", value: "All included" },
      { label: "Red Team Ops", value: "Unlimited" },
      { label: "Cyber Ops", value: "95+ tools" },
      { label: "Network Scanner", value: "Desktop" },
      { label: "Agent Builder", value: "Unlimited" },
      { label: "Support", value: "Priority email" },
    ],
    cta: "Get Pro",
    href: "/payments",
    highlight: true,
  },
  {
    name: "Elite",
    price: "$49",
    subtitle: "Max power — $490/yr",
    features: [
      { label: "AI Credits", value: "5,000/month" },
      { label: "Everything in Pro", value: "Included" },
      { label: "Priority AI access", value: "Faster" },
      { label: "Rate limits", value: "10x higher" },
      { label: "Fleet Management", value: "Unlimited" },
      { label: "Security Monitor", value: "AI-powered" },
      { label: "Early access", value: "New features" },
      { label: "Support", value: "Dedicated" },
    ],
    cta: "Get Elite",
    href: "/payments",
  },
];

function FeatureRow({ feature }: { feature: Feature }) {
  const isFalse = feature.value === false;
  return (
    <li className="flex items-center gap-2.5 py-1.5">
      {isFalse ? (
        <UilTimes size={14} className="text-zinc-600 shrink-0" />
      ) : (
        <UilCheck size={14} className="text-blue-500 shrink-0" />
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

const cardReveal = {
  hidden: { opacity: 0, y: 24, filter: "blur(8px)" },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      delay: i * 0.1,
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1],
    },
  }),
};

export default function Pricing() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const inView = useInView(sectionRef, { once: true, margin: "-80px" });

  return (
    <section id="pricing" ref={sectionRef} className="py-28 px-6">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
          animate={inView ? { opacity: 1, y: 0, filter: "blur(0px)" } : {}}
          transition={{ duration: 0.6 }}
          className="mb-14 text-center"
        >
          <h2 className="font-sans text-3xl md:text-4xl font-bold text-white tracking-tight">
            pricing
          </h2>
          <p className="font-sans text-zinc-500 text-sm mt-2">
            start free, scale when ready
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-4xl mx-auto">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              custom={i}
              variants={cardReveal}
              initial="hidden"
              animate={inView ? "visible" : "hidden"}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
            >
              <SpotlightCard
                className={`h-full ${
                  plan.highlight
                    ? "border bg-white/[0.04]"
                    : "border border-white/[0.06] bg-white/[0.02]"
                }`}
                glowColor={
                  plan.highlight
                    ? "rgba(59,130,246,0.08)"
                    : "rgba(255,255,255,0.03)"
                }
              >
                {/* Animated top border for Pro */}
                {plan.highlight && (
                  <div className="absolute top-0 left-0 right-0 h-[1px] overflow-hidden z-20">
                    <motion.div
                      animate={{ x: ["-100%", "100%"] }}
                      transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                      className="h-full w-1/2"
                      style={{
                        background:
                          "linear-gradient(90deg, transparent, rgba(59,130,246,0.6), transparent)",
                      }}
                    />
                  </div>
                )}

                <div className="p-5 flex flex-col h-full">
                  {/* Badge */}
                  {plan.badge && (
                    <div className="mb-3">
                      <span className="font-['JetBrains_Mono'] text-[10px] font-medium uppercase tracking-wider text-blue-400/90 px-0 py-0">
                        {plan.badge}
                      </span>
                    </div>
                  )}

                  <h3 className="font-sans text-base font-semibold text-white">
                    {plan.name}
                  </h3>
                  <p className="font-sans text-xs text-zinc-500 mt-0.5">
                    {plan.subtitle}
                  </p>

                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-white font-sans">
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
                    onClick={() => {
                      window.location.href = plan.href;
                    }}
                    className={`mt-6 w-full rounded-full py-3 text-sm text-center block font-['JetBrains_Mono'] font-medium cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-transform duration-200 ${
                      plan.highlight
                        ? "btn-conic text-white"
                        : "relative border border-white/[0.12] hover:border-white/[0.2] hover:bg-white/[0.04] text-white"
                    }`}
                  >
                    {plan.highlight && <span className="shimmer-sweep" />}
                    <span className="relative z-10">{plan.cta}</span>
                  </button>
                </div>
              </SpotlightCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
