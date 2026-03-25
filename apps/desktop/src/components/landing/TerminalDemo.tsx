import { useState, useEffect, useRef } from 'react';
import { motion, useInView } from 'framer-motion';

/* ------------------------------------------------------------------ */
/*  Terminal line data                                                  */
/* ------------------------------------------------------------------ */

interface DemoLine {
  text: string;
  indent?: boolean;
  color: string;
}

const demoLines: DemoLine[] = [
  {
    text: 'crowbyte@kali ~/bounty $ crowbyte scan --target vulnerable.app --profile full',
    color: 'text-zinc-300',
  },
  { text: '', color: '' },
  {
    text: '[*] Loading scan profile: full',
    color: 'text-zinc-400',
  },
  {
    text: '[*] Initializing 6 modules...',
    color: 'text-zinc-400',
  },
  { text: '', color: '' },
  {
    text: '[+] Subdomain enumeration: 47 discovered',
    color: 'text-emerald-400',
  },
  {
    text: '[+] HTTP probe: 23 live hosts',
    color: 'text-emerald-400',
  },
  {
    text: '[+] Port scan: 156 open ports across 23 hosts',
    color: 'text-emerald-400',
  },
  {
    text: '[+] Tech detection: nginx/1.18, Apache/2.4, Node.js',
    color: 'text-emerald-400',
  },
  { text: '', color: '' },
  {
    text: '[!] CRITICAL: CVE-2024-21762 \u2014 FortiOS RCE (10.0.1.5:443)',
    color: 'text-red-400',
  },
  {
    text: '[!] HIGH: Exposed admin panel \u2014 no authentication (10.0.1.12:8080)',
    color: 'text-orange-400',
  },
  {
    text: '[!] HIGH: SQL injection \u2014 /api/users?id=1 (10.0.1.8:443)',
    color: 'text-orange-400',
  },
  {
    text: '[!] MEDIUM: Missing CSP headers (*.vulnerable.app)',
    color: 'text-amber-400',
  },
  { text: '', color: '' },
  {
    text: '[>] 4 findings | 1 critical | 2 high | 1 medium',
    color: 'text-violet-400',
  },
  {
    text: '[+] Report generated: vulnerable-app-2025-03-24.pdf',
    color: 'text-emerald-400',
  },
  {
    text: '[+] Findings synced to CrowByte dashboard',
    color: 'text-emerald-400',
  },
];

/* ------------------------------------------------------------------ */
/*  Typing animation hook                                              */
/* ------------------------------------------------------------------ */

function useTypingDemo(lines: DemoLine[], active: boolean) {
  const [displayedLines, setDisplayedLines] = useState<string[]>([]);
  const [lineIndex, setLineIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!active || done) return;

    if (lineIndex >= lines.length) {
      setDone(true);
      return;
    }

    const line = lines[lineIndex].text;

    // Empty lines appear instantly
    if (line === '') {
      setDisplayedLines((prev) => {
        const copy = [...prev];
        copy[lineIndex] = '';
        return copy;
      });
      const t = setTimeout(() => {
        setLineIndex((l) => l + 1);
        setCharIndex(0);
      }, 120);
      return () => clearTimeout(t);
    }

    if (charIndex < line.length) {
      const t = setTimeout(
        () => {
          setDisplayedLines((prev) => {
            const copy = [...prev];
            copy[lineIndex] = line.slice(0, charIndex + 1);
            return copy;
          });
          setCharIndex((c) => c + 1);
        },
        // First line (command) types slower, output prints faster
        lineIndex === 0 ? 30 : 12
      );
      return () => clearTimeout(t);
    }

    // Line complete, pause before next
    const t = setTimeout(
      () => {
        setLineIndex((l) => l + 1);
        setCharIndex(0);
        setDisplayedLines((prev) => [...prev, '']);
      },
      lineIndex === 0 ? 600 : 300
    );
    return () => clearTimeout(t);
  }, [active, lineIndex, charIndex, lines, done]);

  // Initialize first slot
  useEffect(() => {
    if (active && displayedLines.length === 0) {
      setDisplayedLines(['']);
    }
  }, [active]);

  return { displayedLines, done };
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function TerminalDemo() {
  const termRef = useRef<HTMLDivElement>(null);
  const termInView = useInView(termRef, { once: true, margin: '-60px' });

  const { displayedLines, done } = useTypingDemo(demoLines, termInView);

  return (
    <section id="demo" className="py-28 px-6">
      {/* Subtle divider */}
      <div className="mx-auto max-w-5xl mb-16">
        <div className="h-px bg-white/[0.06]" />
      </div>

      <div className="mx-auto max-w-5xl">
        {/* One-liner above terminal */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={termInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6 }}
          className="font-['JetBrains_Mono'] text-sm text-zinc-500 mb-6"
        >
          full recon pipeline in 30 seconds.
        </motion.p>

        {/* Terminal window */}
        <motion.div
          ref={termRef}
          initial={{ opacity: 0, y: 24 }}
          animate={termInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.1 }}
        >
          <div className="rounded-xl border border-white/[0.08] overflow-hidden bg-black">
            {/* Window chrome */}
            <div className="flex items-center justify-between px-4 py-3 bg-white/[0.03] border-b border-white/[0.05]">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-[#EF4444]" />
                <span className="h-3 w-3 rounded-full bg-[#EAB308]" />
                <span className="h-3 w-3 rounded-full bg-[#22C55E]" />
              </div>
              <span className="text-xs text-zinc-600 font-['JetBrains_Mono']">
                crowbyte@kali ~/bounty
              </span>
              <div className="w-14" />
            </div>

            {/* Terminal content */}
            <div className="px-6 py-6 font-['JetBrains_Mono'] text-[13px] leading-[1.8] min-h-[440px] overflow-x-auto">
              {displayedLines.map((text, i) => {
                const lineData = demoLines[i];
                if (!lineData) return null;

                if (text === '' && lineData.text === '') {
                  return <div key={i} className="h-3" />;
                }

                return (
                  <div key={i} className={lineData.color}>
                    {text}
                  </div>
                );
              })}

              {/* Blinking cursor */}
              <span
                className={`inline-block w-[8px] h-[15px] mt-1 align-middle ${
                  done ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-500 animate-pulse'
                }`}
              />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
