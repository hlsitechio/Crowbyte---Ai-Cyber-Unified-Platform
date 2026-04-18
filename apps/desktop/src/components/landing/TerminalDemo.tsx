import { useRef, useState, useEffect, useCallback, type MouseEvent } from "react";
import {
  motion,
  useMotionValue,
  useTransform,
  AnimatePresence,
} from "framer-motion";

/* ── Types ── */
type TerminalLine = {
  type: "command" | "output" | "ascii" | "progress" | "blank" | "phase" | "spinner";
  prefix?: string;
  text?: string;
  prefixColor?: string;
  textColor?: string;
  typingSpeed?: number;
  delay?: number;
  glow?: boolean;
  flash?: boolean;
  label?: string;
};

/* ── Cinematic pentest script ── */
const script: TerminalLine[] = [
  { type: "command", prefix: "\u26A1", text: "crowbyte launch --target apex-corp.io --mode full-auto --ai-agents 12", prefixColor: "text-violet-400", textColor: "text-violet-300", typingSpeed: 18, delay: 100 },
  { type: "blank", delay: 100 },
  { type: "ascii", delay: 80 },
  { type: "blank", delay: 60 },
  { type: "output", prefix: "\u25C9", text: "CrowByte AI Engine v3.0 online \u2014 12 autonomous agents deployed", prefixColor: "text-cyan-400", textColor: "text-cyan-300/90", delay: 200, glow: true },
  { type: "output", prefix: "\u25C9", text: "Neural recon model loaded \u00B7 adversarial mode active", prefixColor: "text-cyan-400", textColor: "text-cyan-300/70", delay: 150 },
  { type: "spinner", label: "Initializing attack vectors", delay: 700, prefixColor: "text-violet-400", textColor: "text-violet-300/60" },
  { type: "blank", delay: 150 },
  { type: "phase", text: "PHASE 1 \u2014 ATTACK SURFACE MAPPING", delay: 350 },
  { type: "output", prefix: " ", text: "  Enumerating apex-corp.io via passive + active recon\u2026", prefixColor: "text-white/10", textColor: "text-white/40", delay: 200 },
  { type: "progress", label: "DNS enumeration", delay: 80, prefixColor: "text-emerald-500/70", textColor: "text-emerald-400/60" },
  { type: "spinner", label: "Fingerprinting services", delay: 1000, prefixColor: "text-emerald-400", textColor: "text-emerald-300/60" },
  { type: "output", prefix: "\u2726", text: "87 assets discovered across 4 cloud providers", prefixColor: "text-emerald-400", textColor: "text-emerald-300/90", delay: 700, glow: true },
  { type: "output", prefix: " ", text: "  \u251C\u2500 api.apex-corp.io        AWS us-east-1    nginx/1.25", prefixColor: "text-white/10", textColor: "text-white/40", delay: 60 },
  { type: "output", prefix: " ", text: "  \u251C\u2500 dashboard.apex-corp.io  GCP europe-west   next/14.2", prefixColor: "text-white/10", textColor: "text-white/40", delay: 60 },
  { type: "output", prefix: " ", text: "  \u251C\u2500 vault.apex-corp.io      Azure eastus      vault/1.15", prefixColor: "text-white/10", textColor: "text-white/40", delay: 60 },
  { type: "output", prefix: " ", text: "  \u251C\u2500 legacy-admin.apex-corp  bare-metal        apache/2.4", prefixColor: "text-white/10", textColor: "text-orange-400/70", delay: 60 },
  { type: "output", prefix: " ", text: "  \u2514\u2500 \u2026 83 more endpoints classified", prefixColor: "text-white/10", textColor: "text-white/30", delay: 60 },
  { type: "blank", delay: 200 },
  { type: "phase", text: "PHASE 2 \u2014 VULNERABILITY INTELLIGENCE", delay: 350 },
  { type: "output", prefix: " ", text: "  Running nuclei + custom AI signatures on 87 targets\u2026", prefixColor: "text-white/10", textColor: "text-white/40", delay: 200 },
  { type: "progress", label: "Vuln scanning", delay: 80, prefixColor: "text-red-500/70", textColor: "text-red-400/60" },
  { type: "spinner", label: "Cross-referencing NVD database", delay: 900, prefixColor: "text-orange-400", textColor: "text-orange-300/60" },
  { type: "output", prefix: "\u2620", text: "CRITICAL  CVE-2024-3094   XZ backdoor in SSH endpoint", prefixColor: "text-red-500", textColor: "text-red-400", delay: 400, flash: true },
  { type: "output", prefix: "\u2620", text: "CRITICAL  CVE-2024-21762  FortiOS RCE \u2014 pre-auth overflow", prefixColor: "text-red-500", textColor: "text-red-400", delay: 250, flash: true },
  { type: "output", prefix: "\u26A0", text: "HIGH      CVE-2023-44487  HTTP/2 Rapid Reset on nginx", prefixColor: "text-orange-500", textColor: "text-orange-400/90", delay: 200 },
  { type: "output", prefix: "\u26A0", text: "HIGH      IDOR on /api/v2/users/{id} \u2014 auth bypass", prefixColor: "text-orange-500", textColor: "text-orange-400/90", delay: 200 },
  { type: "output", prefix: "\u26A0", text: "HIGH      .env exposed on legacy-admin \u2014 DB creds leaked", prefixColor: "text-orange-500", textColor: "text-orange-400/90", delay: 200 },
  { type: "blank", delay: 200 },
  { type: "phase", text: "PHASE 3 \u2014 AI EXPLOIT CHAIN ANALYSIS", delay: 350 },
  { type: "spinner", label: "Building attack graph", delay: 1100, prefixColor: "text-yellow-400", textColor: "text-yellow-300/60" },
  { type: "progress", label: "Exploit simulation", delay: 80, prefixColor: "text-yellow-500/70", textColor: "text-yellow-400/60" },
  { type: "output", prefix: "\u27C1", text: "Chain #1: .env leak \u2192 DB creds \u2192 full data exfil", prefixColor: "text-yellow-400", textColor: "text-yellow-300/80", delay: 300 },
  { type: "output", prefix: "\u27C1", text: "Chain #2: IDOR \u2192 admin takeover \u2192 lateral to vault", prefixColor: "text-yellow-400", textColor: "text-yellow-300/80", delay: 250 },
  { type: "output", prefix: "\u27C1", text: "Chain #3: XZ backdoor \u2192 persistent SSH access \u2192 pivot", prefixColor: "text-yellow-400", textColor: "text-yellow-300/80", delay: 250 },
  { type: "blank", delay: 200 },
  { type: "phase", text: "PHASE 4 \u2014 REPORT GENERATION", delay: 350 },
  { type: "spinner", label: "Compiling findings", delay: 800, prefixColor: "text-cyan-400", textColor: "text-cyan-300/60" },
  { type: "progress", label: "PDF export", delay: 80, prefixColor: "text-cyan-500/70", textColor: "text-cyan-400/60" },
  { type: "output", prefix: "\u2501", text: "\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501", prefixColor: "text-white/10", textColor: "text-white/10", delay: 100 },
  { type: "output", prefix: "\u2713", text: "SCAN COMPLETE \u2014 6 critical \u00B7 14 high \u00B7 31 medium", prefixColor: "text-emerald-400", textColor: "text-emerald-300 font-semibold", delay: 400, glow: true },
  { type: "output", prefix: "\u25C9", text: "AI report generated \u2192 /reports/apex-corp_20260411.pdf", prefixColor: "text-cyan-400", textColor: "text-cyan-300/70", delay: 250 },
  { type: "output", prefix: "\u25C9", text: "Time elapsed: 4m 23s \u00B7 Risk score: 9.4 / 10", prefixColor: "text-cyan-400", textColor: "text-cyan-300/70", delay: 200, glow: true },
  { type: "blank", delay: 300 },
  { type: "output", prefix: "\u25C9", text: "Report delivered successfully.", prefixColor: "text-emerald-400", textColor: "text-emerald-300/90", delay: 400, glow: true },
  { type: "blank", delay: 400 },
  { type: "output", prefix: "\u27F3", text: "Shutting down 12 agents\u2026", prefixColor: "text-violet-400", textColor: "text-violet-300/60", delay: 300 },
  { type: "output", prefix: "\u00B7", text: "  agent-recon-01      \u25A0 offline", prefixColor: "text-white/10", textColor: "text-white/30", delay: 80 },
  { type: "output", prefix: "\u00B7", text: "  agent-vuln-02       \u25A0 offline", prefixColor: "text-white/10", textColor: "text-white/30", delay: 60 },
  { type: "output", prefix: "\u00B7", text: "  agent-exploit-03    \u25A0 offline", prefixColor: "text-white/10", textColor: "text-white/30", delay: 60 },
  { type: "output", prefix: "\u00B7", text: "  agent-graph-04      \u25A0 offline", prefixColor: "text-white/10", textColor: "text-white/30", delay: 50 },
  { type: "output", prefix: "\u00B7", text: "  agent-lateral-05    \u25A0 offline", prefixColor: "text-white/10", textColor: "text-white/30", delay: 50 },
  { type: "output", prefix: "\u00B7", text: "  agent-enum-06       \u25A0 offline", prefixColor: "text-white/10", textColor: "text-white/30", delay: 40 },
  { type: "output", prefix: "\u00B7", text: "  agent-fuzz-07       \u25A0 offline", prefixColor: "text-white/10", textColor: "text-white/30", delay: 40 },
  { type: "output", prefix: "\u00B7", text: "  agent-osint-08      \u25A0 offline", prefixColor: "text-white/10", textColor: "text-white/30", delay: 30 },
  { type: "output", prefix: "\u00B7", text: "  agent-cloud-09      \u25A0 offline", prefixColor: "text-white/10", textColor: "text-white/30", delay: 30 },
  { type: "output", prefix: "\u00B7", text: "  agent-creds-10      \u25A0 offline", prefixColor: "text-white/10", textColor: "text-white/30", delay: 30 },
  { type: "output", prefix: "\u00B7", text: "  agent-report-11     \u25A0 offline", prefixColor: "text-white/10", textColor: "text-white/30", delay: 30 },
  { type: "output", prefix: "\u00B7", text: "  agent-monitor-12    \u25A0 offline", prefixColor: "text-white/10", textColor: "text-white/30", delay: 30 },
  { type: "blank", delay: 200 },
  { type: "output", prefix: "\u2713", text: "All agents terminated \u00B7 session closed", prefixColor: "text-emerald-400", textColor: "text-emerald-300/70", delay: 300 },
  { type: "output", prefix: "\u2501", text: "\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501", prefixColor: "text-white/10", textColor: "text-white/10", delay: 100 },
];

/* ── ASCII art logo ── */
const asciiLogo = [
  "  ####  #####   ####  ##   ## #####  ##  ## ###### ######      ###   ####",
  " ##  ## ##  ## ##  ## ##   ## ##  ##  ####    ##   ##         ## ##   ##",
  " ##     #####  ##  ## ## # ## #####    ##     ##   #####     ##   ##  ##",
  " ##  ## ##  ## ##  ## ####### ##  ##   ##     ##   ##        #######  ##",
  "  ####  ##  ##  ####   ## ##  #####    ##     ##   ######    ##   ## ####",
];

/* ── Typing hook ── */
function useTypingAnimation(text: string, speed: number, startDelay: number, shouldStart: boolean) {
  const [charIndex, setCharIndex] = useState(0);
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!shouldStart) return;
    const timeout = setTimeout(() => setStarted(true), startDelay);
    return () => clearTimeout(timeout);
  }, [shouldStart, startDelay]);

  useEffect(() => {
    if (!started || done) return;
    const interval = setInterval(() => {
      setCharIndex((prev) => {
        const next = prev + 1;
        if (next >= text.length) { clearInterval(interval); setDone(true); }
        return next;
      });
    }, speed);
    return () => clearInterval(interval);
  }, [started, done, text, speed]);

  return { charIndex, started, done };
}

/* ── Flowing character span ── */
function FlowChar({ char }: { char: string }) {
  return (
    <motion.span
      className="inline-block"
      initial={{ opacity: 0, filter: "blur(6px)", y: 2 }}
      animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
      transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
      style={{ display: char === " " ? "inline" : undefined }}
    >
      {char === " " ? "\u00A0" : char}
    </motion.span>
  );
}

/* ── Blinking cursor ── */
function BlinkingCursor() {
  return (
    <motion.span
      className="inline-block h-4 w-2 rounded-sm bg-emerald-400/90 shadow-[0_0_8px_rgba(52,211,153,0.5)]"
      animate={{ opacity: [1, 0.2] }}
      transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
    />
  );
}

/* ── Typed command line ── */
function TypedCommand({ line, onDone, shouldStart }: { line: TerminalLine; onDone: () => void; startDelay: number; shouldStart: boolean }) {
  const text = line.text || "";
  const { charIndex, started, done } = useTypingAnimation(text, line.typingSpeed || 35, 0, shouldStart);

  useEffect(() => { if (done) onDone(); }, [done, onDone]);

  return (
    <motion.div className="flex gap-2 text-sm font-mono" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.15 }}>
      <motion.span className={`select-none ${line.prefixColor}`} initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3, type: "spring", stiffness: 300 }}>
        {line.prefix}
      </motion.span>
      <span className={line.textColor}>
        {text.slice(0, charIndex).split("").map((char, i) => (<FlowChar key={i} char={char} />))}
        {!done && started && <BlinkingCursor />}
      </span>
    </motion.div>
  );
}

/* ── Phase header ── */
function PhaseHeader({ text }: { text: string }) {
  return (
    <motion.div className="flex items-center gap-2 font-mono text-sm" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, ease: "easeOut" }}>
      <motion.span className="text-fuchsia-400" animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 0.15, times: [0, 0.5, 1] }}>{"\u25B8"}</motion.span>
      <motion.span className="text-fuchsia-300/90 font-semibold tracking-wide" initial={{ filter: "blur(4px)" }} animate={{ filter: "blur(0px)" }} transition={{ duration: 0.4 }}>{text}</motion.span>
      <motion.div className="flex-1 h-px bg-gradient-to-r from-fuchsia-500/40 to-transparent" initial={{ scaleX: 0, originX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.6, delay: 0.1 }} />
    </motion.div>
  );
}

/* ── Progress bar ── */
function ScanProgressBar({ shouldStart, label = "SCANNING", barColor = "from-sky-500/70 to-cyan-400/70", labelColor = "text-sky-400/60" }: { shouldStart: boolean; label?: string; barColor?: string; labelColor?: string }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!shouldStart) return;
    let p = 0;
    const interval = setInterval(() => {
      p += 2 + Math.random() * 5;
      if (p >= 100) { p = 100; clearInterval(interval); }
      setProgress(Math.min(100, Math.round(p)));
    }, 60);
    return () => clearInterval(interval);
  }, [shouldStart]);

  return (
    <motion.div className="flex items-center gap-3 font-mono text-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <span className="text-white/30">[</span>
      <div className="relative h-3 w-48 overflow-hidden rounded-sm bg-white/[0.06]">
        <motion.div className={`absolute inset-y-0 left-0 rounded-sm bg-gradient-to-r ${barColor}`} style={{ width: `${progress}%` }} transition={{ duration: 0.1 }} />
        <motion.div className="absolute inset-y-0 w-8 bg-gradient-to-r from-transparent via-white/20 to-transparent" animate={{ x: [0, 192] }} transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }} />
      </div>
      <span className="text-white/40">{progress}%</span>
      <motion.span className={`${labelColor} text-xs tracking-widest`} animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity }}>{label}</motion.span>
    </motion.div>
  );
}

/* ── Spinner ── */
function ScanSpinner({ label, spinnerColor = "text-sky-400", textColor = "text-white/50", doneColor = "text-emerald-400/60" }: { label: string; spinnerColor?: string; textColor?: string; doneColor?: string }) {
  const [dots, setDots] = useState("");

  useEffect(() => {
    let count = 0;
    const interval = setInterval(() => { count = (count + 1) % 4; setDots(".".repeat(count)); }, 300);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div className="flex items-center gap-2 font-mono text-sm" initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
      <motion.span className={spinnerColor} animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>{"\u27F3"}</motion.span>
      <span className={textColor}>{label}{dots}</span>
      <motion.span className={`${doneColor} text-xs`} animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity }}>{"\u2713"} done</motion.span>
    </motion.div>
  );
}

/* ── Animated prefix icon variants ── */
function AnimatedPrefix({ prefix, color, flash }: { prefix: string; color?: string; flash?: boolean; glow?: boolean }) {
  if (prefix === "\u2620") {
    return (<motion.span className={`select-none ${color}`} initial={{ scale: 2, opacity: 0, rotate: -20 }} animate={{ scale: [1, 1.2, 1], opacity: 1, rotate: [0, 5, -5, 0] }}
      transition={{ scale: { duration: 0.6, repeat: Infinity, repeatDelay: 2 }, rotate: { duration: 0.4, repeat: Infinity, repeatDelay: 2.5 }, opacity: { duration: 0.2 } }}>{prefix}</motion.span>);
  }
  if (prefix === "\u26A0") {
    return (<motion.span className={`select-none ${color}`} initial={{ opacity: 0, y: -6 }} animate={{ opacity: [1, 0.6, 1], y: 0 }}
      transition={{ opacity: { duration: 1.5, repeat: Infinity, ease: "easeInOut" }, y: { duration: 0.3 } }}>{prefix}</motion.span>);
  }
  if (prefix === "\u2713" || prefix === "\u2726") {
    return (<motion.span className={`select-none ${color}`} initial={{ scale: 0, opacity: 0 }} animate={{ scale: [0, 1.4, 1], opacity: 1 }} transition={{ duration: 0.5, ease: "easeOut" }}>{prefix}</motion.span>);
  }
  if (prefix === "\u27C1") {
    return (<motion.span className={`select-none ${color}`} initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0.3, 1], x: [0, 2, -2, 0] }} transition={{ duration: 0.6, ease: "easeOut" }}>{prefix}</motion.span>);
  }
  if (prefix === "\u25C9") {
    return (<motion.span className={`select-none ${color} relative`} initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3, type: "spring", stiffness: 400 }}>{prefix}</motion.span>);
  }
  if (prefix === "\u26A1") {
    return (<motion.span className={`select-none ${color}`} initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: [1, 0.3, 1], scale: 1 }}
      transition={{ opacity: { duration: 0.8, repeat: 2 }, scale: { duration: 0.3, type: "spring" } }}>{prefix}</motion.span>);
  }
  if (prefix === "\u2501") {
    return (<motion.span className={`select-none ${color}`} initial={{ opacity: 0, scaleX: 0 }} animate={{ opacity: 1, scaleX: 1 }} transition={{ duration: 0.8, ease: "easeOut" }} style={{ originX: 0, display: "inline-block" }}>{prefix}</motion.span>);
  }
  if (flash) {
    return (<motion.span className={`select-none ${color}`} initial={{ scale: 1.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.3, ease: "easeOut" }}>{prefix}</motion.span>);
  }
  return (<motion.span className={`select-none ${color}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>{prefix}</motion.span>);
}

/* ── Output line ── */
function OutputLine({ line }: { line: TerminalLine }) {
  return (
    <motion.div
      className={`flex gap-2 text-sm font-mono ${line.glow ? "terminal-glow" : ""} ${line.flash ? "terminal-flash" : ""}`}
      initial={{ opacity: 0, x: -8, filter: "blur(4px)" }}
      animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      {line.prefix && line.prefix.trim() && (
        <AnimatedPrefix prefix={line.prefix} color={line.prefixColor} flash={line.flash} glow={line.glow} />
      )}
      <motion.span className={line.textColor} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.05 }}>
        {line.text}
      </motion.span>
    </motion.div>
  );
}

/* ── Cumulative delays ── */
function getCumulativeDelays() {
  const delays: number[] = [];
  let cumulative = 100;
  for (const line of script) {
    delays.push(cumulative);
    if (line.type === "command") {
      cumulative += (line.delay || 0) + (line.text || "").length * (line.typingSpeed || 35) + 200;
    } else if (line.type === "progress") {
      cumulative += 1800;
    } else if (line.type === "spinner") {
      cumulative += line.delay || 1200;
    } else {
      cumulative += line.delay || 200;
    }
  }
  return { delays, totalDuration: cumulative };
}

const { delays: cumulativeDelays } = getCumulativeDelays();

/* ── Delayed line wrapper ── */
function DelayedLine({ delay, children }: { delay: number; children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(false);
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  if (!visible) return null;
  return <>{children}</>;
}

/* ── Report fields ── */
const reportFields = [
  { label: "Target", value: "apex-corp.io", color: "text-cyan-300" },
  { label: "Risk Score", value: "9.4 / 10 \u2014 CRITICAL", color: "text-red-400" },
  { label: "Critical Vulns", value: "6", color: "text-red-500" },
  { label: "High Vulns", value: "14", color: "text-orange-400" },
  { label: "Medium Vulns", value: "31", color: "text-yellow-400" },
  { label: "Assets Scanned", value: "87 endpoints across 4 providers", color: "text-emerald-300" },
  { label: "Exploit Chains", value: "3 viable attack paths identified", color: "text-yellow-300" },
  { label: "Top Chain", value: ".env leak \u2192 DB creds \u2192 full exfil", color: "text-red-300" },
  { label: "Compliance", value: "SOC2 \u2717  |  ISO27001 \u2717  |  PCI-DSS \u2717", color: "text-orange-300" },
  { label: "Remediation", value: "42 actions auto-prioritized by AI", color: "text-violet-300" },
];

/* ── Report field with typing ── */
function ReportField({ label, value, color, delay, onAppear }: { label: string; value: string; color: string; delay: number; onAppear?: () => void }) {
  const [charIndex, setCharIndex] = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => { setStarted(true); onAppear?.(); }, delay);
    return () => clearTimeout(t);
  }, [delay, onAppear]);

  useEffect(() => {
    if (!started || charIndex >= value.length) return;
    const t = setTimeout(() => setCharIndex((p) => p + 1), 15 + Math.random() * 20);
    return () => clearTimeout(t);
  }, [started, charIndex, value.length]);

  if (!started) return null;

  return (
    <motion.div className="flex justify-between items-center py-1.5 border-b border-white/[0.04] font-mono text-xs" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25 }}>
      <span className="text-white/40 w-28 shrink-0">{label}</span>
      <span className={`${color} text-right`}>
        {value.slice(0, charIndex)}
        {charIndex < value.length && (
          <motion.span className="inline-block w-1.5 h-3 bg-violet-400/80 ml-px rounded-sm" animate={{ opacity: [1, 0.2] }} transition={{ duration: 0.4, repeat: Infinity, repeatType: "reverse" }} />
        )}
      </span>
    </motion.div>
  );
}

/* ── AI Send animation ── */
function AISendAnimation({ delay, onSent }: { delay: number; onSent?: () => void }) {
  const [stage, setStage] = useState<"hidden" | "preparing" | "sending" | "sent">("hidden");

  useEffect(() => {
    const t1 = setTimeout(() => setStage("preparing"), delay);
    const t2 = setTimeout(() => setStage("sending"), delay + 1200);
    const t3 = setTimeout(() => setStage("sent"), delay + 2800);
    const t4 = setTimeout(() => onSent?.(), delay + 4500);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [delay, onSent]);

  if (stage === "hidden") return null;

  return (
    <motion.div className="mt-3 pt-3 border-t border-white/[0.06]" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {stage === "preparing" && (
        <motion.div className="flex items-center gap-2 text-xs font-mono text-violet-400" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>{"\u27F3"}</motion.span>
          <span>AI preparing executive summary{"\u2026"}</span>
        </motion.div>
      )}
      {stage === "sending" && (
        <motion.div className="flex flex-col gap-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
            <motion.span animate={{ x: [0, 4, 0] }} transition={{ duration: 0.6, repeat: Infinity }}>{"\u26A1"}</motion.span>
            <span>Sending report to stakeholders{"\u2026"}</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
            <motion.div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400" initial={{ width: "0%" }} animate={{ width: "100%" }} transition={{ duration: 1.5, ease: "easeInOut" }} />
          </div>
        </motion.div>
      )}
      {stage === "sent" && (
        <motion.div className="flex flex-col gap-1.5" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3, type: "spring" }}>
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-400">
            <motion.span initial={{ scale: 0 }} animate={{ scale: [0, 1.4, 1] }} transition={{ duration: 0.5 }}>{"\u2713"}</motion.span>
            <span className="font-semibold">Report delivered successfully</span>
          </div>
          <div className="text-[10px] font-mono text-white/30 pl-5 space-y-0.5">
            <div>{"\u2192"} cto@apex-corp.io</div>
            <div>{"\u2192"} security-team@apex-corp.io</div>
            <div>{"\u2192"} compliance@apex-corp.io</div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

/* ── Report Panel ── */
function ReportPanel({ onComplete }: { onComplete?: () => void }) {
  const reportScrollRef = useRef<HTMLDivElement>(null);
  const [fieldCount, setFieldCount] = useState(0);
  const fieldBaseDelay = 400;
  const fieldStagger = 350;
  const totalFieldTime = fieldBaseDelay + reportFields.length * fieldStagger + 800;

  useEffect(() => {
    if (reportScrollRef.current) reportScrollRef.current.scrollTo({ top: reportScrollRef.current.scrollHeight, behavior: "smooth" });
  }, [fieldCount]);

  return (
    <motion.div className="flex flex-col h-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3, duration: 0.4 }}>
      <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <motion.span className="text-violet-400 text-sm" animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 2, repeat: Infinity }}>{"\u25C8"}</motion.span>
          <span className="text-xs font-mono text-white/60 font-semibold tracking-wider">AI REPORT</span>
        </div>
        <motion.span className="text-[10px] font-mono text-emerald-400/60 px-2 py-0.5 rounded border border-emerald-400/20 bg-emerald-400/5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
          AUTO-GENERATED
        </motion.span>
      </div>
      <div ref={reportScrollRef} className="flex-1 p-4 overflow-y-auto scrollbar-hide">
        <motion.div className="mb-3" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="text-xs font-mono text-white/25 mb-0.5">PENTEST REPORT</div>
          <div className="text-sm font-mono text-white/80 font-semibold">Apex Corp {"\u2014"} Full Engagement</div>
          <div className="text-[10px] font-mono text-white/25 mt-0.5">2026-04-11 {"\u00B7"} CrowByte AI Engine v3.0</div>
        </motion.div>
        <div className="h-px bg-gradient-to-r from-violet-500/30 via-cyan-500/20 to-transparent mb-3" />
        {reportFields.map((field, i) => (
          <ReportField key={field.label} label={field.label} value={field.value} color={field.color} delay={fieldBaseDelay + i * fieldStagger} onAppear={() => setFieldCount((c) => c + 1)} />
        ))}
        <AISendAnimation delay={totalFieldTime} onSent={onComplete} />
      </div>
    </motion.div>
  );
}

/* ── Line appear notifier ── */
function LineAppearNotifier({ index, onAppear }: { index: number; onAppear: (i: number) => void }) {
  useEffect(() => { onAppear(index); }, [index, onAppear]);
  return null;
}

/* ══════════════════════════════════════════════════════════════
   MAIN — exported as default, no section wrapper
   ══════════════════════════════════════════════════════════════ */
export default function TerminalDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [lastVisible, setLastVisible] = useState(-1);
  const [loopKey, setLoopKey] = useState(0);
  const [showReport, setShowReport] = useState(false);

  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const spotlight = useTransform(
    [mx, my],
    ([x, y]: number[]) =>
      `radial-gradient(700px circle at ${x * 100}% ${y * 100}%, rgba(56,189,248,0.06), transparent 60%)`
  );

  function handleMove(e: MouseEvent<HTMLDivElement>) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    mx.set((e.clientX - rect.left) / rect.width);
    my.set((e.clientY - rect.top) / rect.height);
  }

  const handleLineAppear = useCallback((index: number) => {
    setLastVisible((prev) => Math.max(prev, index));
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [lastVisible]);

  const isFinished = lastVisible >= script.length - 1;

  useEffect(() => {
    if (!isFinished) return;
    const t = setTimeout(() => setShowReport(true), 1500);
    return () => clearTimeout(t);
  }, [isFinished]);

  const handleReportComplete = useCallback(() => {
    setTimeout(() => {
      setShowReport(false);
      setTimeout(() => { setLastVisible(-1); setLoopKey((k) => k + 1); }, 800);
    }, 1500);
  }, []);

  function renderLine(line: TerminalLine, index: number) {
    const lineContent = (() => {
      if (line.type === "blank") return <div className="h-2" />;

      if (line.type === "ascii") {
        return (
          <motion.div className="py-1 flex flex-col items-center overflow-hidden" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, ease: "easeOut" }}>
            {asciiLogo.map((row, ri) => (
              <motion.div key={ri} className="font-mono text-[5.5px] xs:text-[7px] sm:text-[10px] leading-tight whitespace-pre text-center"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3, delay: ri * 0.05 }}
                style={{ background: "linear-gradient(90deg, #38bdf8, #a78bfa, #f472b6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                {row}
              </motion.div>
            ))}
          </motion.div>
        );
      }

      if (line.type === "progress") {
        const barColors: Record<string, string> = {
          "text-emerald-500/70": "from-emerald-500/70 to-emerald-400/70",
          "text-red-500/70": "from-red-500/70 to-orange-400/70",
          "text-yellow-500/70": "from-yellow-500/70 to-amber-400/70",
          "text-cyan-500/70": "from-cyan-500/70 to-sky-400/70",
        };
        return <ScanProgressBar shouldStart={true} label={line.label?.toUpperCase()} barColor={barColors[line.prefixColor || ""] || undefined} labelColor={line.textColor} />;
      }

      if (line.type === "spinner") return <ScanSpinner label={line.label || "Processing"} spinnerColor={line.prefixColor} textColor={line.textColor} />;
      if (line.type === "phase") return <PhaseHeader text={line.text || ""} />;
      if (line.type === "command") return <TypedCommand line={line} onDone={() => {}} startDelay={0} shouldStart={true} />;

      return <OutputLine line={line} />;
    })();

    return (
      <DelayedLine key={index} delay={cumulativeDelays[index]}>
        <LineAppearNotifier index={index} onAppear={handleLineAppear} />
        {lineContent}
      </DelayedLine>
    );
  }

  return (
    <div className="relative mx-auto max-w-[52rem]">
      {/* RGB border glow */}
      <div
        className="absolute -inset-[1.5px] z-0 rounded-[17px] animate-rgb-spin pointer-events-none"
        style={{
          background: "conic-gradient(from var(--glow-angle, 0deg), #ff454580, #00ff8760, #00d4ff70, #b249f870, #ff454580)",
          mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          maskComposite: "exclude",
          padding: "1.5px",
          WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          WebkitMaskComposite: "xor",
        }}
      />

      <motion.div ref={ref} onMouseMove={handleMove} className="relative z-10 rounded-2xl bg-[#0d1117]/85 backdrop-blur-md overflow-hidden" style={{ backgroundImage: spotlight }}>
        {/* Scanlines */}
        <div className="absolute inset-0 z-20 pointer-events-none opacity-[0.03] bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(255,255,255,0.1)_2px,rgba(255,255,255,0.1)_4px)]" />

        {/* Title bar */}
        <div className="relative z-10 flex items-center justify-between px-5 py-3 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
            <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
            <span className="h-3 w-3 rounded-full bg-[#28c840]" />
          </div>
          <span className="text-sm font-mono text-white/40">crowbyte@kali:~ &nbsp;|&nbsp; 12 agents</span>
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </span>
            <span className="text-sm font-mono font-semibold text-white/70 tracking-wider">LIVE</span>
          </div>
        </div>

        {/* Content — split view */}
        <div className="relative z-10 flex h-[340px]">
          <motion.div className="min-w-0 overflow-hidden" animate={{ flex: showReport ? "0 0 55%" : "1 1 100%" }} transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}>
            <div ref={scrollRef} className="p-4 space-y-1 h-full overflow-y-auto scrollbar-hide">
              <div key={loopKey}>
                {script.map((line, i) => renderLine(line, i))}
              </div>
              {isFinished && (
                <motion.div className="pt-2 flex gap-2 text-sm font-mono" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
                  <span className="text-emerald-400 select-none">$</span>
                  <BlinkingCursor />
                </motion.div>
              )}
            </div>
          </motion.div>

          <AnimatePresence>
            {showReport && (
              <motion.div className="flex flex-col border-l border-white/[0.06] overflow-hidden"
                initial={{ flex: "0 0 0%", opacity: 0 }} animate={{ flex: "0 0 45%", opacity: 1 }} exit={{ flex: "0 0 0%", opacity: 0 }}
                transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}>
                <ReportPanel onComplete={handleReportComplete} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
