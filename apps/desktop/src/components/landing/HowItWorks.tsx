import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { DownloadSimple, PlugsConnected, Target } from '@phosphor-icons/react';

interface Step {
  number: string;
  icon: React.ElementType;
  title: string;
  description: string;
  color: 'emerald' | 'violet';
  code?: string;
}

const steps: Step[] = [
  {
    number: '01',
    icon: DownloadSimple,
    title: 'Install',
    description: 'Download for Linux or deploy via Docker. One command setup.',
    color: 'emerald',
    code: 'curl -fsSL https://crowbyte.io/install.sh | bash',
  },
  {
    number: '02',
    icon: PlugsConnected,
    title: 'Connect',
    description:
      'Link your AI providers, tools, and data sources. CrowByte handles the rest.',
    color: 'violet',
  },
  {
    number: '03',
    icon: Target,
    title: 'Hunt',
    description:
      'Use AI agents, automated scanners, and threat intel to find vulnerabilities faster.',
    color: 'emerald',
  },
];

const techBadges = [
  'Electron',
  'React',
  'TypeScript',
  'Supabase',
  'MCP Protocol',
  'xterm.js',
];

const colorMap = {
  emerald: {
    number: 'text-emerald-500/20',
    iconBg: 'bg-emerald-500/10',
    iconText: 'text-emerald-400',
  },
  violet: {
    number: 'text-violet-500/20',
    iconBg: 'bg-violet-500/10',
    iconText: 'text-violet-400',
  },
};

const stepVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.15,
      duration: 0.5,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  }),
};

const headerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

const badgeVariants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: (i: number) => ({
    opacity: 1,
    scale: 1,
    transition: {
      delay: 0.5 + i * 0.05,
      duration: 0.3,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  }),
};

export default function HowItWorks() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section className="relative py-24 px-4 sm:px-6 lg:px-8" ref={ref}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          className="text-center"
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={headerVariants}
        >
          <h2 className="font-['JetBrains_Mono'] text-4xl md:text-5xl font-bold text-white">
            How It Works
          </h2>
          <p className="text-zinc-400 font-['Inter'] text-lg text-center max-w-2xl mx-auto mt-4">
            Three steps to your security command center.
          </p>
        </motion.div>

        {/* Steps */}
        <div className="flex flex-col md:flex-row gap-8 items-center justify-center mt-12">
          {steps.map((step, i) => {
            const colors = colorMap[step.color];
            const Icon = step.icon;

            return (
              <div key={step.number} className="flex items-center gap-0">
                {/* Step Card */}
                <motion.div
                  custom={i}
                  initial="hidden"
                  animate={isInView ? 'visible' : 'hidden'}
                  variants={stepVariants}
                  className="relative bg-white/[0.03] border border-white/[0.06] rounded-2xl p-8 text-center w-full md:w-72 hover:border-white/[0.1] transition-all duration-300"
                >
                  {/* Large Number */}
                  <span
                    className={`text-6xl font-bold ${colors.number} font-['JetBrains_Mono'] select-none`}
                  >
                    {step.number}
                  </span>

                  {/* Icon */}
                  <div
                    className={`w-12 h-12 rounded-xl ${colors.iconBg} flex items-center justify-center mx-auto mt-4`}
                  >
                    <Icon size={24} weight="duotone" className={colors.iconText} />
                  </div>

                  {/* Title */}
                  <h3 className="font-['JetBrains_Mono'] text-xl font-semibold text-white mt-4">
                    {step.title}
                  </h3>

                  {/* Description */}
                  <p className="font-['Inter'] text-sm text-zinc-400 mt-2 leading-relaxed">
                    {step.description}
                  </p>

                  {/* Code Block */}
                  {step.code && (
                    <div className="mt-4 bg-black/60 border border-white/[0.06] rounded-lg px-4 py-2.5 overflow-x-auto">
                      <code className="font-['JetBrains_Mono'] text-xs text-emerald-400 whitespace-nowrap">
                        {step.code}
                      </code>
                    </div>
                  )}
                </motion.div>

                {/* Connecting Dashed Line (between cards, hidden on mobile and after last card) */}
                {i < steps.length - 1 && (
                  <div className="hidden md:block w-8 border-t-2 border-dashed border-white/10 shrink-0" />
                )}
              </div>
            );
          })}
        </div>

        {/* Tech Badges */}
        <div className="flex flex-wrap items-center justify-center gap-3 mt-16">
          {techBadges.map((badge, i) => (
            <motion.span
              key={badge}
              custom={i}
              initial="hidden"
              animate={isInView ? 'visible' : 'hidden'}
              variants={badgeVariants}
              className="bg-white/5 border border-white/10 rounded-full px-4 py-1 text-zinc-400 text-xs font-['JetBrains_Mono']"
            >
              {badge}
            </motion.span>
          ))}
        </div>
      </div>
    </section>
  );
}
