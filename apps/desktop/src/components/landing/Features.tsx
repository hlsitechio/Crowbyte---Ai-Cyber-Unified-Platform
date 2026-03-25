import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

interface Feature {
  name: string;
  description: string;
  lines: { text: string; color: string }[];
}

const features: Feature[] = [
  {
    name: 'AI Chat',
    description: 'Multi-model conversations with full tool access.',
    lines: [
      { text: '> analyze CVE-2024-21762 for FortiGate', color: 'text-zinc-300' },
      { text: '', color: '' },
      { text: '[*] Querying NVD + Shodan...', color: 'text-zinc-500' },
      { text: '[!] CRITICAL — FortiOS SSL VPN RCE (CVSS 9.8)', color: 'text-red-400' },
      { text: '[+] Exploit public: yes | CISA KEV: yes', color: 'text-emerald-400' },
      { text: '[>] 47,312 exposed instances on Shodan', color: 'text-violet-400' },
    ],
  },
  {
    name: 'Recon Pipeline',
    description: 'Chained reconnaissance from subdomains to vulns.',
    lines: [
      { text: '$ crowbyte recon --target example.com', color: 'text-zinc-300' },
      { text: '', color: '' },
      { text: '[+] Subdomains: 47 discovered (12 new)', color: 'text-emerald-400' },
      { text: '[+] Live hosts: 23 responding', color: 'text-emerald-400' },
      { text: '[+] Open ports: 156 across 23 hosts', color: 'text-emerald-400' },
      { text: '[!] 3 critical findings flagged', color: 'text-red-400' },
    ],
  },
  {
    name: 'CVE Database',
    description: 'Real-time tracking from NVD with Shodan enrichment.',
    lines: [
      { text: 'CVE-2024-21762  CRIT  9.8  FortiOS SSL VPN', color: 'text-red-400' },
      { text: 'CVE-2024-3400   CRIT  10.0 PAN-OS GlobalProtect', color: 'text-red-400' },
      { text: 'CVE-2024-27198  CRIT  9.8  JetBrains TeamCity', color: 'text-red-400' },
      { text: 'CVE-2024-1709   HIGH  8.4  ConnectWise ScreenConnect', color: 'text-orange-400' },
      { text: '', color: '' },
      { text: '4 tracked | 3 critical | 1 high | 2 exploited', color: 'text-zinc-500' },
    ],
  },
  {
    name: 'Fleet Management',
    description: 'Distributed agent swarm across your infrastructure.',
    lines: [
      { text: '$ crowbyte fleet status', color: 'text-zinc-300' },
      { text: '', color: '' },
      { text: 'recon     online   scanning target-3.com', color: 'text-emerald-400' },
      { text: 'hunter    online   idle', color: 'text-emerald-400' },
      { text: 'intel     online   enriching CVE batch', color: 'text-emerald-400' },
      { text: 'sentinel  online   monitoring 12 endpoints', color: 'text-emerald-400' },
      { text: '', color: '' },
      { text: '[+] 9 agents online | 3 active tasks', color: 'text-emerald-400' },
    ],
  },
  {
    name: 'Red Team Ops',
    description: 'Track operations, phases, and findings in one place.',
    lines: [
      { text: 'Operation SUNRISE', color: 'text-white' },
      { text: 'target   : corp.vulnerable.app', color: 'text-zinc-500' },
      { text: 'status   : active — phase 3/5', color: 'text-emerald-400' },
      { text: 'findings : 12 (4 crit, 5 high, 3 med)', color: 'text-orange-400' },
      { text: 'agents   : recon, hunter, intel', color: 'text-zinc-500' },
      { text: 'elapsed  : 2d 14h', color: 'text-zinc-500' },
    ],
  },
];

const rowVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.08,
      duration: 0.5,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  }),
};

const headerVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

export default function Features() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section id="features" className="relative py-24 px-4 sm:px-6 lg:px-8" ref={ref}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={headerVariants}
          className="mb-16"
        >
          <h2 className="font-['JetBrains_Mono'] text-3xl md:text-4xl font-bold text-white">
            the toolkit.
          </h2>
          <p className="font-['JetBrains_Mono'] text-zinc-500 text-sm mt-3">
            what you get out of the box
          </p>
        </motion.div>

        {/* Feature rows */}
        <div className="flex flex-col">
          {features.map((feature, i) => (
            <motion.div
              key={feature.name}
              custom={i}
              initial="hidden"
              animate={isInView ? 'visible' : 'hidden'}
              variants={rowVariants}
              className={`grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6 md:gap-10 py-8 ${
                i < features.length - 1 ? 'border-b border-white/[0.06]' : ''
              }`}
            >
              {/* Left — name + description */}
              <div className="flex flex-col justify-center">
                <h3 className="font-['JetBrains_Mono'] text-base font-semibold text-white">
                  {feature.name}
                </h3>
                <p className="font-['JetBrains_Mono'] text-xs text-zinc-500 mt-1 leading-relaxed">
                  {feature.description}
                </p>
              </div>

              {/* Right — terminal snippet */}
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg overflow-hidden">
                <div className="px-4 py-3 font-['JetBrains_Mono'] text-[12px] leading-[1.7]">
                  {feature.lines.map((line, j) => {
                    if (line.text === '') {
                      return <div key={j} className="h-2" />;
                    }
                    return (
                      <div key={j} className={`${line.color} whitespace-pre`}>
                        {line.text}
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
