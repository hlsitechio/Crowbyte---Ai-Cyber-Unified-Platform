import { useRef } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { Rocket, Crosshair, Search, FileText } from "lucide-react";
import { GlowingEffect } from "@/components/ui/glowing-effect";

type Step = {
  num: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  title: string;
  desc: string;
  image?: string;
};

const steps: Step[] = [
  {
    num: "01",
    icon: Rocket,
    title: "Deploy",
    desc: "Launch CrowByte in your browser — free. Pro unlocks the desktop app for Linux, Windows, and macOS with full local tooling.",
    image: "/hiw-deploy-satellite.jpg",
  },
  {
    num: "02",
    icon: Crosshair,
    title: "Target",
    desc: "Point it at a domain. CrowByte deploys 12 autonomous agents across the attack surface — DNS, ports, endpoints, cloud assets.",
    image: "/hiw-target-city.jpg",
  },
  {
    num: "03",
    icon: Search,
    title: "Hunt",
    desc: "AI agents chain vulns, build exploit paths, and verify findings autonomously. You oversee the operation from the command center.",
    image: "/hiw-command-center.jpg",
  },
  {
    num: "04",
    icon: FileText,
    title: "Collect",
    desc: "Auto-generated pentest report with CVSS scores, PoC evidence, and remediation steps. Submit to the platform. Get paid.",
    image: "/hiw-collect-handshake.jpg",
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

export default function HowItWorks() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <section ref={ref} className="py-24 px-6">
      <div className="mx-auto w-full max-w-5xl space-y-8">
        <AnimatedContainer className="mx-auto max-w-3xl text-center">
          <h2 className="font-['JetBrains_Mono'] text-3xl font-bold tracking-wide text-balance text-white md:text-4xl">
            how it works
          </h2>
          <p className="text-zinc-500 mt-4 text-sm tracking-wide text-balance font-['JetBrains_Mono']">
            from first scan to full report in four steps
          </p>
        </AnimatedContainer>

        <AnimatedContainer
          delay={0.4}
          className="grid grid-cols-1 sm:grid-cols-2 gap-4"
        >
          {steps.map((step) => (
            <div
              key={step.num}
              className="relative min-h-[14rem] list-none rounded-2xl border border-white/[0.04] p-[3px]"
            >
              <GlowingEffect
                spread={40}
                glow
                disabled={false}
                proximity={64}
                inactiveZone={0.01}
                borderWidth={1}
                blur={4}
              />
              <div className="relative flex h-full flex-col justify-between gap-6 overflow-hidden rounded-xl bg-white/[0.02] backdrop-blur-sm p-6 shadow-[0px_0px_27px_0px_#2D2D2D]">
                {/* Background image — faded */}
                {step.image && (
                  <>
                    <img
                      src={step.image}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover object-center"
                      style={{ opacity: 0.45 }}
                      loading="lazy"
                    />
                    {/* Gradient overlay to keep text readable */}
                    <div
                      className="absolute inset-0"
                      style={{
                        background: "linear-gradient(to top, rgba(3,3,8,0.9) 15%, rgba(3,3,8,0.3) 55%, rgba(3,3,8,0.4) 100%)",
                      }}
                    />
                  </>
                )}

                <div className="relative flex flex-1 flex-col justify-between gap-3">
                  {/* Icon */}
                  <div className="w-fit rounded-lg border border-zinc-700 p-2">
                    <step.icon className="h-4 w-4 text-zinc-400" strokeWidth={1.5} />
                  </div>

                  {/* Content */}
                  <div className="space-y-3">
                    <h3 className="font-sans text-xl font-semibold leading-tight text-white">
                      {step.title}
                    </h3>
                    <p className="font-sans text-sm text-zinc-400 leading-relaxed">
                      {step.desc}
                    </p>
                  </div>
                </div>
              </div>

              {/* Step number — subtle top-right */}
              <span className="absolute top-4 right-4 font-['JetBrains_Mono'] text-[11px] text-zinc-700 font-medium z-10">
                {step.num}
              </span>
            </div>
          ))}
        </AnimatedContainer>
      </div>
    </section>
  );
}
