import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Crosshair, Sword, MagnifyingGlass } from '@phosphor-icons/react';

interface SolutionCard {
  icon: React.ElementType;
  title: string;
  color: 'emerald' | 'violet';
  bullets: string[];
  quote: string;
}

const solutions: SolutionCard[] = [
  {
    icon: Crosshair,
    title: 'Bug Bounty Hunters',
    color: 'emerald',
    bullets: [
      'Automated recon pipelines',
      'CVE tracking with exploit status',
      'Report generation (H1/Bugcrowd format)',
      'Bookmark and organize targets',
    ],
    quote: 'From recon to report in one tool.',
  },
  {
    icon: Sword,
    title: 'Red Team Operators',
    color: 'violet',
    bullets: [
      'Operation planning with AI phases',
      'Finding management with CVSS',
      'Rules of engagement tracking',
      'Evidence collection & chain docs',
    ],
    quote: 'Plan, execute, and report — all in CrowByte.',
  },
  {
    icon: MagnifyingGlass,
    title: 'Security Researchers',
    color: 'emerald',
    bullets: [
      'Threat intelligence aggregation',
      'Knowledge base for research notes',
      'CVE database with deep analysis',
      'Custom AI agents for specialized research',
    ],
    quote: 'Your research command center.',
  },
];

const colorMap = {
  emerald: {
    iconBg: 'bg-emerald-500/10',
    iconText: 'text-emerald-400',
    dot: 'bg-emerald-400',
    quote: 'text-emerald-400/80',
  },
  violet: {
    iconBg: 'bg-violet-500/10',
    iconText: 'text-violet-400',
    dot: 'bg-violet-400',
    quote: 'text-violet-400/80',
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.1,
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

export default function Solutions() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section id="solutions" className="relative py-24 px-4 sm:px-6 lg:px-8" ref={ref}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          className="text-center"
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={headerVariants}
        >
          <h2 className="font-['JetBrains_Mono'] text-4xl md:text-5xl font-bold text-white">
            Built For
          </h2>
          <p className="text-zinc-400 font-['Inter'] text-lg text-center max-w-2xl mx-auto mt-4">
            Whether you're hunting bugs, running ops, or doing research.
          </p>
        </motion.div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
          {solutions.map((solution, i) => {
            const colors = colorMap[solution.color];
            const Icon = solution.icon;

            return (
              <motion.div
                key={solution.title}
                custom={i}
                initial="hidden"
                animate={isInView ? 'visible' : 'hidden'}
                variants={cardVariants}
                className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-8 hover:border-white/[0.1] transition-all duration-300"
              >
                {/* Icon */}
                <div
                  className={`w-14 h-14 rounded-xl ${colors.iconBg} flex items-center justify-center mb-5`}
                >
                  <Icon size={32} weight="duotone" className={colors.iconText} />
                </div>

                {/* Title */}
                <h3 className="font-['JetBrains_Mono'] text-xl font-semibold text-white">
                  {solution.title}
                </h3>

                {/* Bullets */}
                <ul className="mt-5 space-y-3">
                  {solution.bullets.map((bullet) => (
                    <li key={bullet} className="flex items-start gap-3">
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${colors.dot} mt-1.5 shrink-0`}
                      />
                      <span className="text-zinc-300 text-sm font-['Inter']">{bullet}</span>
                    </li>
                  ))}
                </ul>

                {/* Quote */}
                <p className={`italic ${colors.quote} text-sm mt-6 font-['Inter']`}>
                  "{solution.quote}"
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
