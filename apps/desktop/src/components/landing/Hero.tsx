import { useState, useEffect, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { BookOpen } from "@phosphor-icons/react";
import LaunchAppButton from "./LaunchAppButton";

/* ------------------------------------------------------------------ */
/*  Agent output pools — each agent cycles through these endlessly     */
/* ------------------------------------------------------------------ */

interface AgentConfig {
  name: string;
  statusCycle: { text: string; color: string }[];
  outputPool: { text: string; color: string }[];
}

const agents: AgentConfig[] = [
  {
    name: "RECON",
    statusCycle: [
      { text: "scanning", color: "text-emerald-400" },
      { text: "enumerating", color: "text-blue-400" },
      { text: "probing", color: "text-violet-400" },
    ],
    outputPool: [
      { text: "$ subfinder -d acme.com -silent", color: "text-zinc-500" },
      { text: "[+] api.acme.com", color: "text-emerald-400" },
      { text: "[+] staging.acme.com", color: "text-emerald-400" },
      { text: "[+] dev-portal.acme.com", color: "text-emerald-400" },
      { text: "[+] admin.acme.com", color: "text-yellow-400" },
      { text: "[*] 142 subdomains found", color: "text-zinc-400" },
      { text: "$ httpx -silent -sc -title", color: "text-zinc-500" },
      { text: "[200] api.acme.com [API Gateway]", color: "text-emerald-400" },
      { text: "[403] admin.acme.com [Forbidden]", color: "text-orange-400" },
      { text: "[301] staging.acme.com -> prod", color: "text-zinc-400" },
      { text: "[+] 38 live hosts responding", color: "text-emerald-400" },
      { text: "$ nmap -sV -p- --top-ports 1000", color: "text-zinc-500" },
      { text: "[+] 22/tcp ssh OpenSSH 8.9", color: "text-emerald-400" },
      { text: "[+] 443/tcp https nginx/1.18", color: "text-emerald-400" },
      { text: "[+] 8080/tcp http-proxy open", color: "text-yellow-400" },
      { text: "[+] 3306/tcp mysql 8.0.32", color: "text-orange-400" },
      { text: "[*] Feeding 38 targets to hunter", color: "text-zinc-500" },
      { text: "$ nuclei -t dns/ -silent", color: "text-zinc-500" },
      { text: "[+] Zone transfer possible!", color: "text-red-400" },
      { text: "[+] CNAME dangling: old.acme.com", color: "text-yellow-400" },
    ],
  },
  {
    name: "HUNTER",
    statusCycle: [
      { text: "exploiting", color: "text-red-400" },
      { text: "verifying", color: "text-orange-400" },
      { text: "chaining", color: "text-red-400" },
    ],
    outputPool: [
      { text: "$ nuclei -severity critical,high", color: "text-zinc-500" },
      { text: "[!] CVE-2024-21762 FortiOS RCE", color: "text-red-400" },
      { text: "    CVSS: 9.8 | RCE confirmed", color: "text-red-400" },
      { text: "[!] CVE-2024-3400 PAN-OS cmdi", color: "text-red-400" },
      { text: "    CVSS: 10.0 | Auth bypass", color: "text-red-400" },
      { text: "[+] 2 confirmed critical vulns", color: "text-emerald-400" },
      { text: "$ sqlmap -u /api/users?id=1", color: "text-zinc-500" },
      { text: "[!] SQLi found: boolean-based", color: "text-red-400" },
      { text: "[+] Backend: MySQL 8.0.32", color: "text-emerald-400" },
      { text: "[+] 14 databases enumerated", color: "text-emerald-400" },
      { text: "$ dalfox url /search?q=test", color: "text-zinc-500" },
      { text: "[!] Reflected XSS confirmed", color: "text-red-400" },
      { text: "    Payload: <img/src=x onerror>", color: "text-orange-400" },
      { text: "[+] DOM sink: innerHTML", color: "text-yellow-400" },
      { text: "$ ffuf -w seclists -u /FUZZ", color: "text-zinc-500" },
      { text: "[+] /admin [200] 4832 bytes", color: "text-emerald-400" },
      { text: "[+] /.env [200] 1204 bytes", color: "text-red-400" },
      { text: "[!] AWS keys exposed in .env", color: "text-red-400" },
      { text: "[*] Chaining SQLi + IDOR...", color: "text-zinc-500" },
      { text: "[!] Full account takeover PoC", color: "text-red-400" },
    ],
  },
  {
    name: "INTEL",
    statusCycle: [
      { text: "enriching", color: "text-violet-400" },
      { text: "correlating", color: "text-blue-400" },
      { text: "mapping", color: "text-cyan-400" },
    ],
    outputPool: [
      { text: "$ shodan search ssl:acme.com", color: "text-zinc-500" },
      { text: "[+] 47,312 exposed instances", color: "text-emerald-400" },
      { text: "[+] CISA KEV: yes | EPSS: 0.97", color: "text-orange-400" },
      { text: "[*] Cross-referencing NVD...", color: "text-zinc-500" },
      { text: "[+] CVE linked to APT-29", color: "text-red-400" },
      { text: "$ whois acme.com", color: "text-zinc-500" },
      { text: "[+] Registrar: Cloudflare", color: "text-emerald-400" },
      { text: "[+] NS: ns1.cloudflare.com", color: "text-zinc-400" },
      { text: "$ crt.sh %.acme.com", color: "text-zinc-500" },
      { text: "[+] 89 certificates found", color: "text-emerald-400" },
      { text: "[+] Wildcard: *.dev.acme.com", color: "text-yellow-400" },
      { text: "[+] Expired cert on staging", color: "text-orange-400" },
      { text: "$ amass intel -d acme.com", color: "text-zinc-500" },
      { text: "[+] ASN: AS13335 Cloudflare", color: "text-emerald-400" },
      { text: "[+] CIDR: 104.16.0.0/12", color: "text-zinc-400" },
      { text: "[*] Building attack graph...", color: "text-zinc-500" },
      { text: "[+] 3 attack paths identified", color: "text-violet-400" },
      { text: "[+] Shortest: 2 hops to RCE", color: "text-red-400" },
    ],
  },
  {
    name: "SENTINEL",
    statusCycle: [
      { text: "monitoring", color: "text-blue-400" },
      { text: "alerting", color: "text-yellow-400" },
      { text: "watching", color: "text-blue-400" },
    ],
    outputPool: [
      { text: "$ crowbyte monitor --live", color: "text-zinc-500" },
      { text: "[+] 12 endpoints tracked", color: "text-emerald-400" },
      { text: "[!] New port 8080 on 10.0.3.7", color: "text-yellow-400" },
      { text: "[!] Admin panel \u2014 no auth!", color: "text-red-400" },
      { text: "[+] WAF detected: Cloudflare", color: "text-zinc-400" },
      { text: "[*] Bypass attempt #3...", color: "text-zinc-500" },
      { text: "[+] WAF bypassed via H2 smuggle", color: "text-emerald-400" },
      { text: "[!] Rate limit disabled on /api", color: "text-yellow-400" },
      { text: "[+] Response time: 12ms avg", color: "text-emerald-400" },
      { text: "[!] SSL cert expires in 3 days", color: "text-orange-400" },
      { text: "[+] New subdomain detected", color: "text-emerald-400" },
      { text: "    beta.acme.com [200]", color: "text-zinc-400" },
      { text: "[*] Scanning new target...", color: "text-zinc-500" },
      { text: "[!] Debug mode enabled on beta", color: "text-red-400" },
      { text: "[+] Stack trace leaking paths", color: "text-yellow-400" },
      { text: "[*] Alerting hunter agent...", color: "text-zinc-500" },
    ],
  },
  {
    name: "ANALYST",
    statusCycle: [
      { text: "reporting", color: "text-amber-400" },
      { text: "triaging", color: "text-emerald-400" },
      { text: "scoring", color: "text-violet-400" },
    ],
    outputPool: [
      { text: "$ crowbyte report --format h1", color: "text-zinc-500" },
      { text: "[+] Finding: FortiOS RCE", color: "text-emerald-400" },
      { text: "    Severity: CRITICAL (9.8)", color: "text-red-400" },
      { text: "    Impact: Full server control", color: "text-red-400" },
      { text: "[+] Finding: SQL Injection", color: "text-emerald-400" },
      { text: "    Severity: HIGH (8.6)", color: "text-orange-400" },
      { text: "    Impact: Database dump", color: "text-orange-400" },
      { text: "[+] Finding: Stored XSS", color: "text-emerald-400" },
      { text: "    Severity: HIGH (7.4)", color: "text-orange-400" },
      { text: "[+] Finding: IDOR on /api/user", color: "text-emerald-400" },
      { text: "    Severity: HIGH (7.1)", color: "text-orange-400" },
      { text: "[*] Generating PoC videos...", color: "text-zinc-500" },
      { text: "[+] 4 PoCs recorded", color: "text-emerald-400" },
      { text: "[+] Report: acme-2025-03.pdf", color: "text-emerald-400" },
      { text: "[>] Ready for submission", color: "text-violet-400" },
      { text: "[+] Estimated payout: $12,500", color: "text-emerald-400" },
    ],
  },
  {
    name: "COMMANDER",
    statusCycle: [
      { text: "orchestrating", color: "text-emerald-400" },
      { text: "dispatching", color: "text-cyan-400" },
      { text: "coordinating", color: "text-emerald-400" },
    ],
    outputPool: [
      { text: "$ crowbyte fleet status", color: "text-zinc-500" },
      { text: "[+] 6/6 agents online", color: "text-emerald-400" },
      { text: "[+] recon    scanning  acme.com", color: "text-emerald-400" },
      { text: "[+] hunter   exploiting target", color: "text-red-400" },
      { text: "[+] intel    enriching  CVEs", color: "text-violet-400" },
      { text: "[+] sentinel monitoring fleet", color: "text-blue-400" },
      { text: "[+] analyst  writing    report", color: "text-amber-400" },
      { text: "[>] Mission progress: 73%", color: "text-violet-400" },
      { text: "[*] Dispatching to new target", color: "text-zinc-500" },
      { text: "[+] Queue: 3 targets remaining", color: "text-zinc-400" },
      { text: "[>] Mission progress: 87%", color: "text-violet-400" },
      { text: "[+] 4 critical vulns confirmed", color: "text-red-400" },
      { text: "[+] 7 high vulns confirmed", color: "text-orange-400" },
      { text: "[>] Mission progress: 94%", color: "text-violet-400" },
      { text: "[+] All agents reporting done", color: "text-emerald-400" },
      { text: "[>] Mission COMPLETE \u2014 100%", color: "text-emerald-400" },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Streaming agent pane                                               */
/* ------------------------------------------------------------------ */

const MAX_VISIBLE = 6;

function AgentPane({ config, active, startDelay }: { config: AgentConfig; active: boolean; startDelay: number }) {
  const [lines, setLines] = useState<{ text: string; color: string; id: number }[]>([]);
  const [statusIdx, setStatusIdx] = useState(0);
  const counter = useRef(0);
  const poolIdx = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!active) return;

    const initTimer = setTimeout(() => {
      const stream = () => {
        const line = config.outputPool[poolIdx.current % config.outputPool.length];
        poolIdx.current++;

        setLines((prev) => {
          const next = [...prev, { ...line, id: counter.current++ }];
          return next.slice(-MAX_VISIBLE);
        });

        timerRef.current = setTimeout(stream, 300 + Math.random() * 700);
      };

      stream();
    }, startDelay);

    return () => {
      clearTimeout(initTimer);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [active, config, startDelay]);

  // Cycle status
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => {
      setStatusIdx((i) => (i + 1) % config.statusCycle.length);
    }, 2500 + Math.random() * 2000);
    return () => clearInterval(t);
  }, [active, config]);

  const status = config.statusCycle[statusIdx];

  return (
    <div className="flex flex-col border border-white/[0.06] rounded-md overflow-hidden bg-black/60">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-white/[0.03] border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <span className={`h-1.5 w-1.5 rounded-full ${status.color.replace("text-", "bg-")} animate-pulse`} />
          <span className="font-['JetBrains_Mono'] text-[10px] font-bold text-zinc-300 uppercase tracking-wider">
            {config.name}
          </span>
        </div>
        <span className={`font-['JetBrains_Mono'] text-[9px] ${status.color} transition-colors duration-500`}>
          {status.text}
        </span>
      </div>

      {/* Output */}
      <div className="px-3 py-2 font-['JetBrains_Mono'] text-[10px] md:text-[11px] leading-[1.55] h-[110px] overflow-hidden relative">
        <div className="absolute top-0 left-0 right-0 h-3 bg-gradient-to-b from-black/60 to-transparent z-10 pointer-events-none" />
        <div className="flex flex-col justify-end h-full">
          {lines.map((line) => (
            <motion.div
              key={line.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15 }}
              className={`${line.color} whitespace-nowrap overflow-hidden text-ellipsis`}
            >
              {line.text}
            </motion.div>
          ))}
        </div>
        <span className="inline-block w-[6px] h-[11px] bg-emerald-500/70 animate-pulse" />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Variants                                                           */
/* ------------------------------------------------------------------ */

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

/* ------------------------------------------------------------------ */
/*  Hero                                                               */
/* ------------------------------------------------------------------ */

export default function Hero() {
  const termRef = useRef<HTMLDivElement>(null);
  const termInView = useInView(termRef, { once: true, margin: "-60px" });

  return (
    <section
      id="hero"
      className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-28 pb-16 overflow-hidden"
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255,255,255,0.02) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.02) 1px, transparent 1px)
          `,
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(ellipse 60% 50% at 50% 40%, black 30%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(ellipse 60% 50% at 50% 40%, black 30%, transparent 100%)",
        }}
      />

      <motion.div
        className="relative z-10 mx-auto max-w-5xl w-full"
        variants={stagger}
        initial="hidden"
        animate="visible"
      >
        <div className="text-center mb-12">
          <motion.p
            variants={fadeUp}
            className="font-['JetBrains_Mono'] text-[11px] md:text-xs text-emerald-500/80 uppercase tracking-[0.3em] mb-4"
          >
            A New Era of Cyber Warfare
          </motion.p>

          <motion.h1
            variants={fadeUp}
            className="font-['JetBrains_Mono'] text-4xl sm:text-5xl md:text-6xl font-bold text-white leading-[1.1] tracking-tight"
          >
            Recon. Exploit. Defense.
            <br />
            <span className="text-emerald-400">One Terminal.</span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="font-['JetBrains_Mono'] text-sm md:text-lg text-zinc-400 max-w-2xl mx-auto mt-6 leading-relaxed"
          >
            15 AI agents running simultaneously. Every Kali Linux tool.
            <br />
            <span className="text-zinc-500">One command. Full attack surface covered.</span>
          </motion.p>

          <motion.div
            variants={fadeUp}
            className="mt-8 flex items-center justify-center gap-3"
          >
            <LaunchAppButton className="font-['JetBrains_Mono'] text-sm font-semibold bg-emerald-500 hover:bg-emerald-400 text-black px-6 py-2.5 rounded transition-colors cursor-pointer" />
            <button
              onClick={() => { window.location.hash = "#/documentation"; }}
              className="font-['JetBrains_Mono'] text-sm text-zinc-400 border border-white/20 hover:bg-white/5 px-5 py-2.5 rounded transition-colors inline-flex items-center gap-2 cursor-pointer"
            >
              <BookOpen size={16} weight="bold" />
              Docs
            </button>
          </motion.div>
        </div>

        <motion.div ref={termRef} variants={fadeUp} className="w-full">
          <div className="rounded-lg border border-white/[0.08] overflow-hidden bg-black/80 backdrop-blur-sm shadow-2xl shadow-emerald-500/5">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06] bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[#EF4444]/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#EAB308]/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#22C55E]/80" />
              </div>
              <span className="font-['JetBrains_Mono'] text-[11px] text-zinc-600">
                crowbyte@kali ~/bounty — 6 agents active
              </span>
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-['JetBrains_Mono'] text-[9px] text-emerald-500 font-bold">LIVE</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[1px] bg-white/[0.03] p-1.5">
              {agents.map((agent, i) => (
                <AgentPane
                  key={agent.name}
                  config={agent}
                  active={termInView}
                  startDelay={i * 400 + Math.random() * 300}
                />
              ))}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
