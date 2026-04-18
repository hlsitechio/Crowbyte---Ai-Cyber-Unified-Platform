import { useRef } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import {
  MessageSquare,
  TerminalSquare,
  Radar,
  ShieldAlert,
  Swords,
  Bot,
} from "lucide-react";
import { FeatureCard } from "@/components/ui/grid-feature-cards";

const features = [
  {
    title: "AI Chat",
    icon: MessageSquare,
    description:
      "Multi-model AI assistant with a growing arsenal of integrated security tools. CVE lookups, payload crafting, report writing — without leaving the chat.",
  },
  {
    title: "Integrated Terminal",
    icon: TerminalSquare,
    description:
      "Full shell with AI copilot. It reads your terminal output and suggests next moves. You run the tools, it helps you think.",
  },
  {
    title: "Recon Pipeline",
    icon: Radar,
    description:
      "Automated recon chains: subdomain discovery → live host check → vulnerability scan. Configure once, run on any target.",
  },
  {
    title: "CVE Database",
    icon: ShieldAlert,
    description:
      "NVD-synced CVE database with Shodan enrichment. CVSS scores, exploit availability, CISA KEV status — searchable and filterable.",
  },
  {
    title: "Red Team Ops",
    icon: Swords,
    description:
      "Plan and track engagements. Log findings, link evidence, chain vulns into attack paths. Export to report format.",
  },
  {
    title: "Agent Builder",
    icon: Bot,
    description:
      "Build custom AI agents with scoped tools and system prompts. Assign to targets or schedule for continuous monitoring.",
  },
];

function AnimatedContainer({
  className,
  delay = 0.1,
  children,
}: {
  className?: string;
  delay?: number;
  children: React.ReactNode;
}) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ filter: "blur(4px)", translateY: -8, opacity: 0 }}
      whileInView={{ filter: "blur(0px)", translateY: 0, opacity: 1 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.8 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export default function Features() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <section id="features" ref={ref} className="py-24 px-6">
      <div className="mx-auto w-full max-w-5xl space-y-8">
        <AnimatedContainer className="mx-auto max-w-3xl text-center">
          <h2 className="font-['JetBrains_Mono'] text-3xl font-bold tracking-wide text-balance text-white md:text-4xl">
            everything you need
          </h2>
          <p className="text-zinc-500 mt-4 text-sm tracking-wide text-balance font-['JetBrains_Mono']">
            offense, defense, and everything in between
          </p>
        </AnimatedContainer>

        <AnimatedContainer
          delay={0.4}
          className="grid grid-cols-1 divide-x divide-y divide-dashed border border-dashed border-white/[0.08] divide-white/[0.08] sm:grid-cols-2 md:grid-cols-3"
        >
          {features.map((feature, i) => (
            <FeatureCard key={i} feature={feature} />
          ))}
        </AnimatedContainer>
      </div>
    </section>
  );
}
