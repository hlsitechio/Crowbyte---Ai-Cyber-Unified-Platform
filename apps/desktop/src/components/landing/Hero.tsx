import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import LaunchAppButton from "./LaunchAppButton";

/* ── Rotating words with blur transition ── */
const words = ["Hunt", "Exploit", "Report"];

function RotatingWord() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % words.length), 2800);
    return () => clearInterval(t);
  }, []);

  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={words[idx]}
        initial={{ y: 24, opacity: 0, filter: "blur(12px)" }}
        animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
        exit={{ y: -24, opacity: 0, filter: "blur(12px)" }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="inline-block bg-clip-text text-transparent"
        style={{
          backgroundImage: "linear-gradient(135deg, #f97316 0%, #fb923c 50%, #fbbf24 100%)",
        }}
      >
        {words[idx]}
      </motion.span>
    </AnimatePresence>
  );
}

/* ── CRT Scanlines overlay ── */
function Scanlines() {
  return (
    <div
      className="absolute inset-0 pointer-events-none z-30"
      style={{
        backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(0,0,0,0.15) 1px, rgba(0,0,0,0.15) 2px)",
        backgroundSize: "100% 2px",
      }}
    />
  );
}

/* ── Glitch text component ── */
function GlitchText({ text, color, isGlitch }: { text: string; color: string; isGlitch: boolean }) {
  const [glitching, setGlitching] = useState(false);

  useEffect(() => {
    if (!isGlitch) return;
    const t1 = setTimeout(() => setGlitching(true), 100);
    const t2 = setTimeout(() => setGlitching(false), 350);
    const interval = setInterval(() => {
      if (Math.random() > 0.85) {
        setGlitching(true);
        setTimeout(() => setGlitching(false), 150 + Math.random() * 200);
      }
    }, 3000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearInterval(interval); };
  }, [isGlitch]);

  if (!isGlitch || !glitching) {
    return <span className={color}>{text}</span>;
  }

  return (
    <span className="relative inline">
      <span className={`${color} relative z-10`}>{text}</span>
      <span
        className="absolute top-0 left-[1px] z-20 text-red-500/60"
        style={{ clipPath: `inset(${Math.random() * 40}% 0 ${Math.random() * 40}% 0)` }}
      >
        {text}
      </span>
      <span
        className="absolute top-0 left-[-1px] z-20 text-cyan-400/60"
        style={{ clipPath: `inset(${Math.random() * 40}% 0 ${Math.random() * 40}% 0)` }}
      >
        {text}
      </span>
    </span>
  );
}

/* ── Typewriter line ── */
function TypewriterLine({
  text,
  color,
  speed = 20,
  onDone,
  isGlitch = false,
}: {
  text: string;
  color: string;
  speed?: number;
  onDone?: () => void;
  isGlitch?: boolean;
}) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    let i = 0;
    const t = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(t);
        setDone(true);
        onDone?.();
      }
    }, speed);
    return () => clearInterval(t);
  }, [text, speed, onDone]);

  return (
    <div className="whitespace-nowrap overflow-hidden text-ellipsis">
      {done && isGlitch ? (
        <GlitchText text={displayed} color={color} isGlitch />
      ) : (
        <span className={color}>{displayed}</span>
      )}
      {!done && (
        <motion.span
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.4, repeat: Infinity, repeatType: "reverse" }}
          className="inline-block w-[6px] h-[11px] bg-blue-500 ml-[1px] rounded-[1px] align-middle"
        />
      )}
    </div>
  );
}

/* ── Cinematic terminal sequence ── */
type TermLine = {
  text: string;
  color: string;
  delay: number;
  speed: number;
  isGlitch?: boolean;
  flash?: string;
  isBanner?: boolean;
  isProgress?: boolean;
  progressLabel?: string;
};

const termSequence: TermLine[] = [
  { text: "$ crowbyte hunt acme.com --agents all --stealth", color: "text-emerald-400", delay: 600, speed: 30 },
  { text: "", color: "", delay: 200, speed: 0, isBanner: true },
  { text: "[*] Initializing CrowByte v2.0 — 6 agents armed", color: "text-blue-400", delay: 300, speed: 15 },
  { text: "[*] Target locked: acme.com (34 subdomains found)", color: "text-blue-400", delay: 200, speed: 15 },
  { text: "", color: "", delay: 100, speed: 0, isProgress: true, progressLabel: "SCANNING" },
  { text: "[>] RECON  → subfinder + httpx + 847 repos", color: "text-zinc-500", delay: 400, speed: 12 },
  { text: "[>] HUNTER → shodan org:acme | nmap -sV -p-", color: "text-zinc-500", delay: 200, speed: 12 },
  { text: "[>] INTEL  → nuclei -severity critical,high", color: "text-zinc-500", delay: 200, speed: 12 },
  { text: "[!] CRITICAL — AWS_SECRET_KEY in commit a3f29b1", color: "text-red-400", delay: 600, speed: 18, isGlitch: true, flash: "red" },
  { text: "[!] CRITICAL — EternalBlue MS17-010 → shell opened", color: "text-red-400", delay: 400, speed: 18, isGlitch: true, flash: "red" },
  { text: "[!] HIGH — GraphQL introspection → 12k PII records", color: "text-orange-400", delay: 300, speed: 18, isGlitch: true, flash: "orange" },
  { text: "[!] HIGH — SSRF via /api/proxy → cloud metadata", color: "text-orange-400", delay: 300, speed: 18, isGlitch: true, flash: "orange" },
  { text: "[+] 4 criticals chained. PoC exploit generated.", color: "text-blue-400", delay: 500, speed: 15 },
  { text: "[+] Report auto-submitted to HackerOne.", color: "text-blue-400", delay: 200, speed: 15 },
  { text: "[+] Estimated bounty: $23,000 — $60,000", color: "text-emerald-400", delay: 400, speed: 25, flash: "green" },
];

/* ── ASCII banner ── */
function AsciiBanner() {
  const lines = [
    "  ██████╗██████╗  ██████╗ ██╗    ██╗██████╗ ██╗   ██╗████████╗███████╗",
    " ██╔════╝██╔══██╗██╔═══██╗██║    ██║██╔══██╗╚██╗ ██╔╝╚══██╔══╝██╔════╝",
    " ██║     ██████╔╝██║   ██║██║ █╗ ██║██████╔╝ ╚████╔╝    ██║   █████╗  ",
    " ██║     ██╔══██╗██║   ██║██║███╗██║██╔══██╗  ╚██╔╝     ██║   ██╔══╝  ",
    " ╚██████╗██║  ██║╚██████╔╝╚███╔███╔╝██████╔╝   ██║      ██║   ███████╗",
    "  ╚═════╝╚═╝  ╚═╝ ╚═════╝  ╚══╝╚══╝ ╚═════╝    ╚═╝      ╚═╝   ╚══════╝",
  ];

  return (
    <div className="overflow-hidden">
      {lines.map((line, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05, duration: 0.3 }}
          className="text-blue-500/30 whitespace-pre leading-none"
          style={{ fontSize: "5px", letterSpacing: "0.5px" }}
        >
          {line}
        </motion.div>
      ))}
    </div>
  );
}

/* ── Animated progress bar ── */
function TermProgress({ label }: { label: string }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setProgress(p => {
        if (p >= 100) { clearInterval(t); return 100; }
        return p + 2 + Math.floor(Math.random() * 5);
      });
    }, 60);
    return () => clearInterval(t);
  }, []);

  const barWidth = 20;
  const filled = Math.round((Math.min(progress, 100) / 100) * barWidth);
  const bar = "█".repeat(filled) + "░".repeat(barWidth - filled);

  return (
    <div className="text-blue-400/80 whitespace-pre">
      <span className="text-zinc-600">[</span>
      <span className="text-blue-400">{bar}</span>
      <span className="text-zinc-600">]</span>
      <span className="text-zinc-500 ml-2">{Math.min(progress, 100)}%</span>
      <span className="text-zinc-600 ml-2">{label}</span>
      {progress < 100 && (
        <motion.span
          animate={{ opacity: [1, 0.3] }}
          transition={{ duration: 0.3, repeat: Infinity, repeatType: "reverse" }}
          className="text-blue-400 ml-1"
        >
          ...
        </motion.span>
      )}
    </div>
  );
}

/* ── Matrix rain columns ── */
function MatrixRain() {
  const cols = useMemo(() => {
    const chars = "01アイウエオカキクケコサシスセソ>_{}<|/\\$#@!%&*+=~^";
    return Array.from({ length: 30 }, (_, i) => ({
      id: i,
      left: `${(i / 30) * 100}%`,
      delay: Math.random() * 8,
      duration: 4 + Math.random() * 6,
      chars: Array.from({ length: 12 + Math.floor(Math.random() * 8) }, () =>
        chars[Math.floor(Math.random() * chars.length)]
      ),
      opacity: 0.03 + Math.random() * 0.06,
      fontSize: 9 + Math.floor(Math.random() * 3),
    }));
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {cols.map(col => (
        <motion.div
          key={col.id}
          initial={{ y: "-100%" }}
          animate={{ y: "100%" }}
          transition={{ duration: col.duration, delay: col.delay, repeat: Infinity, ease: "linear" }}
          className="absolute top-0 font-['JetBrains_Mono'] leading-tight whitespace-pre select-none"
          style={{
            left: col.left,
            opacity: col.opacity,
            fontSize: `${col.fontSize}px`,
            color: "#3b82f6",
            textShadow: "0 0 8px rgba(59,130,246,0.3)",
          }}
        >
          {col.chars.map((c, j) => (
            <div key={j} style={{ opacity: j === 0 ? 1 : 0.3 + (j / col.chars.length) * 0.7 }}>{c}</div>
          ))}
        </motion.div>
      ))}
    </div>
  );
}

/* ── The cinematic terminal ── */
function TerminalFeed() {
  const [visibleLines, setVisibleLines] = useState<number[]>([]);
  const [flashColor, setFlashColor] = useState<string | null>(null);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      mouseX.set(e.clientX - rect.left);
      mouseY.set(e.clientY - rect.top);
    }
  }, [mouseX, mouseY]);

  useEffect(() => {
    let totalDelay = 800;

    termSequence.forEach((line, i) => {
      totalDelay += line.delay;
      const charTime = line.text.length * line.speed;

      const t = setTimeout(() => {
        setVisibleLines(prev => [...prev, i]);

        if (line.flash) {
          setFlashColor(line.flash);
          setTimeout(() => setFlashColor(null), 150);
        }
      }, totalDelay);

      timeoutsRef.current.push(t);
      totalDelay += charTime + 100;
    });

    const restartT = setTimeout(() => {
      setVisibleLines([]);
      setTimeout(() => {
        timeoutsRef.current.forEach(clearTimeout);
        timeoutsRef.current = [];
      }, 500);
    }, totalDelay + 3000);

    timeoutsRef.current.push(restartT);

    return () => {
      timeoutsRef.current.forEach(clearTimeout);
      timeoutsRef.current = [];
    };
  }, []);

  const flashMap: Record<string, string> = {
    red: "rgba(239,68,68,0.08)",
    orange: "rgba(249,115,22,0.06)",
    green: "rgba(16,185,129,0.08)",
  };

  return (
    <motion.div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="relative rounded-xl border border-white/[0.08] bg-[#050505] overflow-hidden shadow-2xl shadow-blue-500/[0.1] group"
    >
      <MatrixRain />
      <Scanlines />

      <AnimatePresence>
        {flashColor && (
          <motion.div
            key={flashColor}
            initial={{ opacity: 0.15 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="absolute inset-0 z-20 pointer-events-none"
            style={{ backgroundColor: flashMap[flashColor] || "transparent" }}
          />
        )}
      </AnimatePresence>

      <motion.div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none z-10"
        style={{
          background: useTransform(
            [mouseX, mouseY],
            ([x, y]) => `radial-gradient(350px circle at ${x}px ${y}px, rgba(59,130,246,0.05), transparent 60%)`
          ),
        }}
      />

      <div className="absolute top-0 left-0 right-0 h-[1px] overflow-hidden z-30">
        <motion.div
          animate={{ x: ["-100%", "100%"] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
          className="h-full w-1/3"
          style={{ background: "linear-gradient(90deg, transparent, rgba(59,130,246,0.6), rgba(249,115,22,0.4), transparent)" }}
        />
      </div>

      {/* Title bar */}
      <div className="relative z-20 flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06] bg-black/40 backdrop-blur-sm">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        </div>
        <div className="flex items-center gap-2">
          <span className="font-['JetBrains_Mono'] text-[10px] text-zinc-600">crowbyte@kali:~</span>
          <span className="font-['JetBrains_Mono'] text-[10px] text-zinc-700">|</span>
          <span className="font-['JetBrains_Mono'] text-[10px] text-zinc-600">6 agents</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          <span className="font-['JetBrains_Mono'] text-[10px] text-emerald-400 font-bold tracking-wider">LIVE</span>
        </div>
      </div>

      {/* Terminal output */}
      <div className="relative z-20 px-4 py-3 font-['JetBrains_Mono'] text-[11px] leading-[1.7] min-h-[280px] flex flex-col justify-end">
        <div className="absolute top-0 left-0 right-0 h-10 bg-gradient-to-b from-[#050505] to-transparent z-30 pointer-events-none" />

        {visibleLines.map(lineIdx => {
          const line = termSequence[lineIdx];

          if (line.isBanner) return <AsciiBanner key={`banner-${lineIdx}`} />;
          if (line.isProgress) return <TermProgress key={`prog-${lineIdx}`} label={line.progressLabel || ""} />;

          return (
            <motion.div
              key={`line-${lineIdx}`}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.15 }}
            >
              <TypewriterLine text={line.text} color={line.color} speed={line.speed} isGlitch={line.isGlitch} />
            </motion.div>
          );
        })}

        <motion.span
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.6, repeat: Infinity, repeatType: "reverse" }}
          className="inline-block w-[7px] h-[13px] bg-blue-500 mt-1 rounded-[1px]"
          style={{ boxShadow: "0 0 8px rgba(59,130,246,0.5)" }}
        />
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-[1px] overflow-hidden z-30">
        <motion.div
          animate={{ x: ["100%", "-100%"] }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          className="h-full w-1/3"
          style={{ background: "linear-gradient(90deg, transparent, rgba(249,115,22,0.3), transparent)" }}
        />
      </div>
    </motion.div>
  );
}

/* ── Looping terminal wrapper ── */
function LoopingTerminal() {
  const [key, setKey] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setKey(k => k + 1);
    }, 22000);
    return () => clearInterval(interval);
  }, []);

  return <TerminalFeed key={key} />;
}

/* ══════════════════════════════════════════════════════════════
   HERO SECTION — Earth image background with text overlay
   ══════════════════════════════════════════════════════════════ */
export default function Hero() {
  return (
    <>
      {/* ── Hero: Earth background + text ── */}
      <section
        id="hero"
        className="relative min-h-[92vh] flex flex-col items-center justify-center px-6 pt-20 pb-16 overflow-hidden"
        style={{ backgroundColor: "#030308" }}
      >
        {/* Earth background image */}
        <div className="absolute inset-0 z-0">
          <img
            src="/hero-earth.jpg"
            alt=""
            className="w-full h-full object-cover object-center"
            style={{ opacity: 0.35 }}
          />
          {/* Top fade to bg */}
          <div
            className="absolute inset-0"
            style={{
              background: "linear-gradient(to bottom, rgba(3,3,8,0.7) 0%, rgba(3,3,8,0.2) 30%, rgba(3,3,8,0.2) 60%, rgba(3,3,8,0.95) 100%)",
            }}
          />
          {/* Radial vignette */}
          <div
            className="absolute inset-0"
            style={{
              background: "radial-gradient(ellipse 70% 60% at 50% 50%, transparent 30%, rgba(3,3,8,0.85) 100%)",
            }}
          />
        </div>

        {/* Subtle blue/orange glow overlay */}
        <div
          className="absolute inset-0 z-[1] pointer-events-none"
          style={{
            background: "radial-gradient(ellipse 50% 40% at 50% 45%, rgba(59,130,246,0.06) 0%, transparent 70%)",
          }}
        />

        {/* Content */}
        <div className="relative z-10 mx-auto max-w-4xl w-full text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 10, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="relative inline-flex items-center gap-2.5 px-4 py-2 rounded-full mb-8 backdrop-blur-md overflow-hidden"
            style={{
              background: "linear-gradient(135deg, rgba(59,130,246,0.15), rgba(249,115,22,0.08), rgba(168,85,247,0.06))",
              border: "1px solid rgba(255,255,255,0.12)",
              boxShadow: "0 0 30px rgba(59,130,246,0.1), inset 0 1px 0 rgba(255,255,255,0.08)",
            }}
          >
            <motion.div
              animate={{ x: ["-100%", "200%"] }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear", repeatDelay: 2 }}
              className="absolute inset-0 pointer-events-none"
              style={{
                background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)",
                width: "50%",
              }}
            />
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" style={{ boxShadow: "0 0 6px rgba(52,211,153,0.5)" }} />
            </span>
            <span className="font-['JetBrains_Mono'] text-[12px] tracking-widest uppercase relative">
              <span className="text-orange-400/90 font-medium">Live</span>
              <span className="text-zinc-500 mx-1.5">·</span>
              <span className="text-zinc-200">Autonomous Pentesting</span>
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="relative font-['Inter',system-ui,sans-serif] text-6xl sm:text-7xl md:text-[84px] font-bold leading-[1.05] tracking-tight"
          >
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage: "linear-gradient(135deg, #dc2626 0%, #ef4444 30%, #f97316 60%, #fbbf24 100%)",
                filter: "drop-shadow(0 0 40px rgba(239,68,68,0.3))",
              }}
            >
              The Unified AI Platform
            </span>
            <br />
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage: "linear-gradient(135deg, #dc2626 0%, #ef4444 30%, #f97316 60%, #fbbf24 100%)",
                filter: "drop-shadow(0 0 40px rgba(239,68,68,0.3))",
              }}
            >
              for{" "}
            </span>
            <span
              className="italic bg-clip-text text-transparent pr-2"
              style={{
                backgroundImage: "linear-gradient(135deg, #dc2626 0%, #ef4444 30%, #f97316 60%, #fbbf24 100%)",
                filter: "drop-shadow(0 0 40px rgba(239,68,68,0.3))",
              }}
            >
              Security Teams
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 16, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="font-sans text-[17px] text-zinc-300/80 max-w-2xl mx-auto mt-8 leading-relaxed"
            style={{ textShadow: "0 2px 20px rgba(0,0,0,0.8)" }}
          >
            Replace your 20+ browser tabs and terminal windows with one AI-powered
            platform for pentesting, threat detection, and security operations — from recon to report.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.55 }}
            className="mt-9 flex items-center justify-center gap-4"
          >
            <LaunchAppButton className="btn-conic font-['JetBrains_Mono'] text-[15px] font-semibold text-white px-8 py-3.5 rounded-full cursor-pointer hover:scale-[1.03] active:scale-[0.97] transition-transform duration-200">
              <span className="shimmer-sweep" />
              <span className="relative z-10">Start Hunting Free</span>
            </LaunchAppButton>
            <a
              href="https://github.com/hlsitechio/crowbyte"
              target="_blank"
              rel="noopener"
              className="font-['JetBrains_Mono'] text-[15px] text-zinc-200 border border-white/[0.15] hover:border-white/[0.25] hover:bg-white/[0.06] px-7 py-3.5 rounded-full transition-all duration-200 cursor-pointer hover:scale-[1.03] active:scale-[0.97] backdrop-blur-md"
            >
              View on GitHub
            </a>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="font-['JetBrains_Mono'] text-[12px] text-zinc-500 mt-4"
          >
            Free tier &middot; No credit card &middot; Start in your browser
          </motion.p>
        </div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
          className="absolute bottom-6 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            className="w-5 h-8 rounded-full border border-white/[0.15] flex items-start justify-center p-1"
          >
            <motion.div className="w-1 h-1.5 rounded-full bg-white/40" />
          </motion.div>
        </motion.div>
      </section>

      {/* ── Terminal Section — below hero ── */}
      <section className="relative px-6 py-20 overflow-hidden" style={{ backgroundColor: "#030308" }}>
        {/* Seamless blend from hero */}
        <div
          className="absolute top-0 left-0 right-0 h-32 pointer-events-none z-10"
          style={{ background: "linear-gradient(to bottom, #030308, transparent)" }}
        />

        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10 relative z-10"
        >
          <h2 className="font-['JetBrains_Mono'] text-xs tracking-[0.3em] uppercase text-blue-400/70 mb-3">
            See it in action
          </h2>
          <p className="text-zinc-500 text-sm max-w-lg mx-auto">
            6 AI agents working together — recon, exploit, chain, report — all in one terminal.
          </p>
        </motion.div>

        {/* Terminal */}
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.96 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-3xl mx-auto relative z-10"
        >
          <LoopingTerminal />
        </motion.div>

        {/* Ambient glow below terminal */}
        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[60%] h-[100px] pointer-events-none z-0"
          style={{
            background: "radial-gradient(ellipse, rgba(59,130,246,0.08) 0%, transparent 70%)",
            filter: "blur(30px)",
          }}
        />
      </section>
    </>
  );
}
