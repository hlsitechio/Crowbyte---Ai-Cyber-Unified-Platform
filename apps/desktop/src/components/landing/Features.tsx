import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import {
  ChatCircleDots,
  Robot,
  MapTrifold,
  Terminal,
  WifiHigh,
  ShieldCheck,
  Bug,
  Eye,
  Broadcast,
} from '@phosphor-icons/react';

interface FeatureCard {
  icon: React.ElementType;
  title: string;
  description: string;
  color: 'emerald' | 'violet';
}

const features: FeatureCard[] = [
  {
    icon: ChatCircleDots,
    title: 'Multi-Model AI Chat',
    description:
      '7+ AI models with full tool access. Claude, DeepSeek, Qwen, Mistral, Kimi — context-aware with MCP integration.',
    color: 'emerald',
  },
  {
    icon: Robot,
    title: 'AI Agent Builder',
    description:
      'Create custom AI agents with specific personas. Choose model, temperature, capabilities. Agents execute commands and write reports.',
    color: 'violet',
  },
  {
    icon: MapTrifold,
    title: 'AI Mission Planner',
    description:
      'AI-generated penetration test plans with phases, tasks, timelines. Optimize, reduce risk, or go stealth.',
    color: 'emerald',
  },
  {
    icon: Terminal,
    title: 'Integrated Terminal',
    description:
      'Full xterm.js terminal with tmux. Run any Kali tool directly. Split panes, tabs, session persistence.',
    color: 'violet',
  },
  {
    icon: WifiHigh,
    title: 'Network Scanner',
    description:
      'Visual Nmap GUI with parsed results. Port scanning, service detection, OS fingerprinting. Quick, Full, Stealth, Aggressive profiles.',
    color: 'emerald',
  },
  {
    icon: ShieldCheck,
    title: 'CyberOps Toolkit',
    description:
      '142 MCP-integrated security tools. Subdomain enum, vuln scanning, web fuzzing, SQLi, XSS, SSRF/SSTI/LFI scanners.',
    color: 'violet',
  },
  {
    icon: Bug,
    title: 'CVE Database',
    description:
      'Real-time CVE tracking from NVD + Shodan. CVSS scoring, exploit status, bookmarks and tags. Cloud-synced.',
    color: 'emerald',
  },
  {
    icon: Eye,
    title: 'Threat Intel Feeds',
    description:
      'Auto-syncing from 7+ OSINT feeds: URLhaus, FeodoTracker, ThreatFox, Blocklist.de, CINSscore. IOC management.',
    color: 'violet',
  },
  {
    icon: Broadcast,
    title: 'Fleet Management',
    description:
      'Monitor all endpoints and VPS agents. 9 specialized agents for parallel operations. Centralized logging.',
    color: 'emerald',
  },
];

const colorMap = {
  emerald: {
    iconBg: 'bg-emerald-500/10',
    iconText: 'text-emerald-400',
    hoverShadow: 'hover:shadow-emerald-500/5',
  },
  violet: {
    iconBg: 'bg-violet-500/10',
    iconText: 'text-violet-400',
    hoverShadow: 'hover:shadow-violet-500/5',
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.05,
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

export default function Features() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section id="features" className="relative py-24 px-4 sm:px-6 lg:px-8" ref={ref}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          className="text-center"
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={headerVariants}
        >
          <h2 className="font-['JetBrains_Mono'] text-4xl md:text-5xl font-bold text-white">
            Everything You Need
          </h2>
          <p className="text-zinc-400 font-['Inter'] text-lg text-center max-w-2xl mx-auto mt-4">
            One platform. Every offensive security capability.
          </p>
        </motion.div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-16">
          {features.map((feature, i) => {
            const colors = colorMap[feature.color];
            const Icon = feature.icon;

            return (
              <motion.div
                key={feature.title}
                custom={i}
                initial="hidden"
                animate={isInView ? 'visible' : 'hidden'}
                variants={cardVariants}
                className={`bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 group hover:bg-white/[0.06] hover:border-white/[0.1] transition-all duration-300 hover:shadow-lg ${colors.hoverShadow}`}
              >
                <div
                  className={`w-12 h-12 rounded-xl ${colors.iconBg} flex items-center justify-center mb-4`}
                >
                  <Icon size={24} weight="duotone" className={colors.iconText} />
                </div>
                <h3 className="font-['JetBrains_Mono'] text-lg font-semibold text-white mt-2">
                  {feature.title}
                </h3>
                <p className="font-['Inter'] text-sm text-zinc-400 mt-2 leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
