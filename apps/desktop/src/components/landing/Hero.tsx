import { useState, useEffect, useRef, useCallback } from "react";
import { motion, useInView } from "framer-motion";
import { DownloadSimple } from "@phosphor-icons/react";
import LaunchAppButton from "./LaunchAppButton";

/* ------------------------------------------------------------------ */
/*  Framer Motion variants                                             */
/* ------------------------------------------------------------------ */

const container = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.2 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.95, y: 30 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] },
  },
};

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
    // STORY: Scanning GitHub repos, finds leaked API keys, validates them
    name: "RECON",
    statusCycle: [
      { text: "scanning repos", color: "text-blue-400" },
      { text: "scraping secrets", color: "text-yellow-400" },
      { text: "validating keys", color: "text-violet-400" },
    ],
    outputPool: [
      { text: "$ github-dorker -d acme.com", color: "text-zinc-500" },
      { text: "[*] Scanning 847 public repos...", color: "text-zinc-400" },
      { text: "[+] acme/backend-api — 2.3k stars", color: "text-blue-400" },
      { text: "[+] acme/deploy-scripts — 89 stars", color: "text-blue-400" },
      { text: "[!] .env found in commit history", color: "text-red-400" },
      { text: "    AWS_SECRET_KEY=AKIA3E...", color: "text-red-400" },
      { text: "[*] Testing API key validity...", color: "text-zinc-500" },
      { text: "$ aws sts get-caller-identity", color: "text-zinc-500" },
      { text: "[!] KEY IS VALID — arn:aws:iam::", color: "text-red-400" },
      { text: "    Account: 491823017442", color: "text-orange-400" },
      { text: "[+] Role: deploy-admin (FULL S3)", color: "text-red-400" },
      { text: "[*] Enumerating S3 buckets...", color: "text-zinc-500" },
      { text: "[+] acme-prod-backups (public!)", color: "text-red-400" },
      { text: "[+] acme-user-uploads (writable)", color: "text-yellow-400" },
      { text: "[!] 14GB database dump in bucket", color: "text-red-400" },
      { text: "[*] Saving to findings vault...", color: "text-zinc-500" },
      { text: "[+] CRITICAL: AWS key → full S3", color: "text-blue-400" },
      { text: "[>] Forwarding to analyst agent", color: "text-violet-400" },
    ],
  },
  {
    // STORY: Shodan finds Windows Server, scans it, exploits RDP vuln
    name: "HUNTER",
    statusCycle: [
      { text: "exploiting", color: "text-red-400" },
      { text: "pivoting", color: "text-orange-400" },
      { text: "pwning", color: "text-red-400" },
    ],
    outputPool: [
      { text: "$ shodan search org:acme port:3389", color: "text-zinc-500" },
      { text: "[+] 10.42.1.87 — Windows Server 2019", color: "text-blue-400" },
      { text: "[+] RDP open, NLA disabled", color: "text-yellow-400" },
      { text: "[!] BlueKeep candidate detected", color: "text-red-400" },
      { text: "$ nmap -sV -p 3389,445,135", color: "text-zinc-500" },
      { text: "[+] 445/tcp SMBv1 enabled", color: "text-orange-400" },
      { text: "[!] MS17-010 EternalBlue vuln!", color: "text-red-400" },
      { text: "[*] AI says: chain RDP + SMB...", color: "text-cyan-400" },
      { text: "$ msfconsole -x 'use eternalblue'", color: "text-zinc-500" },
      { text: "[+] Session 1 opened (meterpreter)", color: "text-blue-400" },
      { text: "[+] SYSTEM shell acquired", color: "text-red-400" },
      { text: "$ hashdump", color: "text-zinc-500" },
      { text: "[+] Admin:500:aad3b...:7ce21...", color: "text-red-400" },
      { text: "[*] Pivoting to internal network", color: "text-zinc-500" },
      { text: "[+] Found DC at 10.42.1.1", color: "text-blue-400" },
      { text: "[!] Domain Admin hash captured", color: "text-red-400" },
      { text: "[+] Full domain compromise PoC", color: "text-blue-400" },
      { text: "[>] Handing off to analyst...", color: "text-violet-400" },
    ],
  },
  {
    // STORY: d3bugr browser automation, takes control of Chrome, steals session
    name: "INTEL",
    statusCycle: [
      { text: "browser hijack", color: "text-violet-400" },
      { text: "session theft", color: "text-red-400" },
      { text: "cookie extract", color: "text-cyan-400" },
    ],
    outputPool: [
      { text: "$ d3bugr cdp connect :9222", color: "text-zinc-500" },
      { text: "[+] Chrome DevTools connected", color: "text-blue-400" },
      { text: "[+] 7 tabs open in target browser", color: "text-blue-400" },
      { text: "[*] Navigating to admin panel...", color: "text-zinc-500" },
      { text: "$ d3bugr navigate admin.acme.com", color: "text-zinc-500" },
      { text: "[+] Admin dashboard loaded", color: "text-blue-400" },
      { text: "[*] Extracting session cookies...", color: "text-zinc-500" },
      { text: "[!] SESSION_TOKEN=eyJhbGciOi...", color: "text-red-400" },
      { text: "[!] CSRF_TOKEN=a8f2e91b...", color: "text-red-400" },
      { text: "[+] JWT decoded: role=superadmin", color: "text-yellow-400" },
      { text: "[*] Injecting JS keylogger...", color: "text-zinc-500" },
      { text: "$ d3bugr exec 'document.forms'", color: "text-zinc-500" },
      { text: "[+] 3 forms with password fields", color: "text-blue-400" },
      { text: "[!] Autofill leaked: root@acme", color: "text-red-400" },
      { text: "[*] Screenshotting evidence...", color: "text-zinc-500" },
      { text: "[+] admin-panel-poc.png saved", color: "text-blue-400" },
      { text: "[+] Full admin takeover via CDP", color: "text-red-400" },
      { text: "[>] PoC chain ready for report", color: "text-violet-400" },
    ],
  },
  {
    // STORY: Finds exposed GraphQL, introspects, dumps PII
    name: "SENTINEL",
    statusCycle: [
      { text: "API hunting", color: "text-blue-400" },
      { text: "introspecting", color: "text-yellow-400" },
      { text: "data exfil", color: "text-red-400" },
    ],
    outputPool: [
      { text: "$ ffuf -u acme.com/FUZZ -w api.txt", color: "text-zinc-500" },
      { text: "[+] /graphql [200] 892 bytes", color: "text-blue-400" },
      { text: "[!] Introspection is ENABLED", color: "text-red-400" },
      { text: "[*] Dumping full schema...", color: "text-zinc-500" },
      { text: "[+] 47 types, 213 fields found", color: "text-blue-400" },
      { text: "[!] Query: allUsers (no auth!)", color: "text-red-400" },
      { text: "[!] Mutation: deleteUser (IDOR)", color: "text-red-400" },
      { text: "$ gqlmap -e acme.com/graphql", color: "text-zinc-500" },
      { text: "[+] allUsers returned 12,847 rows", color: "text-blue-400" },
      { text: "[!] PII exposed: email, SSN, DOB", color: "text-red-400" },
      { text: "[+] Admin emails in response", color: "text-yellow-400" },
      { text: "[*] Testing deleteUser mutation...", color: "text-zinc-500" },
      { text: "[!] User id=1 deleted (no auth)", color: "text-red-400" },
      { text: "[*] AI says: mass PII + IDOR", color: "text-cyan-400" },
      { text: "[+] Impact: 12k users PII leaked", color: "text-red-400" },
      { text: "[>] P1 critical — flagging now", color: "text-violet-400" },
    ],
  },
  {
    // STORY: Writes the full bounty report, calculates payout
    name: "ANALYST",
    statusCycle: [
      { text: "writing report", color: "text-amber-400" },
      { text: "calculating $", color: "text-blue-400" },
      { text: "final review", color: "text-violet-400" },
    ],
    outputPool: [
      { text: "$ crowbyte report --format h1", color: "text-zinc-500" },
      { text: "[+] Compiling 4 agent findings...", color: "text-blue-400" },
      { text: "", color: "text-zinc-600" },
      { text: "  #1 AWS Key Leak via GitHub", color: "text-white" },
      { text: "     CVSS: 9.8 | $5,000-$15,000", color: "text-red-400" },
      { text: "  #2 Domain Compromise (RDP+SMB)", color: "text-white" },
      { text: "     CVSS: 10.0 | $10,000-$25,000", color: "text-red-400" },
      { text: "  #3 Admin Takeover via CDP", color: "text-white" },
      { text: "     CVSS: 9.1 | $3,000-$8,000", color: "text-orange-400" },
      { text: "  #4 GraphQL PII + Mass IDOR", color: "text-white" },
      { text: "     CVSS: 9.6 | $5,000-$12,000", color: "text-red-400" },
      { text: "", color: "text-zinc-600" },
      { text: "[+] 4 PoC videos attached", color: "text-blue-400" },
      { text: "[+] Report: acme-bounty-2025.pdf", color: "text-blue-400" },
      { text: "[*] Estimated total payout:", color: "text-zinc-400" },
      { text: "[!] $23,000 - $60,000", color: "text-blue-400" },
      { text: "[>] Ready to submit on HackerOne", color: "text-violet-400" },
    ],
  },
];

// Orchestrator — full-width command pane above the grid
const orchestrator: AgentConfig = {
  name: "CROWBYTE ORCHESTRATOR",
  statusCycle: [
    { text: "commanding 6 agents", color: "text-blue-400" },
    { text: "dispatching tasks", color: "text-cyan-400" },
    { text: "mission control", color: "text-blue-400" },
    { text: "coordinating swarm", color: "text-violet-400" },
  ],
  outputPool: [
    { text: "$ crowbyte hunt acme.com --agents all --mode aggressive", color: "text-zinc-500" },
    { text: "[+] Deploying 6 AI agents to target: acme.com", color: "text-blue-400" },
    { text: "[>] RECON    → github-dorker acme.com (scanning repos for secrets)", color: "text-zinc-400" },
    { text: "[>] HUNTER   → shodan search org:acme port:3389 (find Windows hosts)", color: "text-zinc-400" },
    { text: "[>] INTEL    → d3bugr cdp connect :9222 (hijack browser session)", color: "text-zinc-400" },
    { text: "[>] SENTINEL → ffuf -u acme.com/FUZZ (hunt exposed APIs)", color: "text-zinc-400" },
    { text: "[>] ANALYST  → standing by for findings...", color: "text-zinc-400" },
    { text: "", color: "text-zinc-600" },
    { text: "[!] RECON reports: AWS_SECRET_KEY found in GitHub commit history!", color: "text-red-400" },
    { text: "[*] Commanding RECON: validate key with aws sts get-caller-identity", color: "text-cyan-400" },
    { text: "[!] HUNTER reports: Windows Server 2019 — EternalBlue vulnerable!", color: "text-red-400" },
    { text: "[*] Commanding HUNTER: exploit and pivot to domain controller", color: "text-cyan-400" },
    { text: "[!] INTEL reports: admin session token stolen via Chrome DevTools!", color: "text-red-400" },
    { text: "[*] Commanding INTEL: extract all cookies + screenshot admin panel", color: "text-cyan-400" },
    { text: "[!] SENTINEL reports: GraphQL introspection enabled — 12k users PII!", color: "text-red-400" },
    { text: "[*] Commanding SENTINEL: test IDOR on deleteUser mutation", color: "text-cyan-400" },
    { text: "", color: "text-zinc-600" },
    { text: "[+] All 4 attack chains verified. Commanding ANALYST: compile report.", color: "text-blue-400" },
    { text: "[>] Mission progress: ████████████████████░░ 94%", color: "text-violet-400" },
    { text: "[+] ANALYST: report generated — 4 criticals, $23k-$60k estimated", color: "text-amber-400" },
    { text: "[>] ██████████████████████ MISSION COMPLETE — acme.com fully owned", color: "text-blue-400" },
    { text: "[*] Rotating to next target in queue...", color: "text-zinc-500" },
  ],
};

/* ------------------------------------------------------------------ */
/*  Streaming agent pane                                               */
/* ------------------------------------------------------------------ */

const MAX_VISIBLE = 9;

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
    <div className="flex flex-col border border-white/[0.06] rounded-md overflow-hidden bg-zinc-950/60">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-white/[0.03] border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${status.color.replace("text-", "bg-")} animate-pulse`} />
          <span className="font-['JetBrains_Mono'] text-[11px] font-bold text-zinc-300 uppercase tracking-wider">
            {config.name}
          </span>
        </div>
        <span className={`font-['JetBrains_Mono'] text-[10px] ${status.color} transition-colors duration-500`}>
          {status.text}
        </span>
      </div>

      {/* Output */}
      <div className="px-3 py-3 font-['JetBrains_Mono'] text-[11px] md:text-[12px] leading-[1.6] h-[180px] overflow-hidden relative">
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
        <span className="inline-block w-[6px] h-[11px] bg-blue-500/70 animate-pulse" />
      </div>
    </div>
  );
}

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
      {/* Background grid */}
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

      {/* Ambient glows */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 2.5, delay: 0.3 }}
        className="absolute top-[15%] left-1/2 -translate-x-1/2 w-[900px] h-[700px] bg-blue-500/[0.05] rounded-full blur-[140px] pointer-events-none"
      />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 2.5, delay: 0.8 }}
        className="absolute top-[20%] left-[40%] w-[400px] h-[400px] bg-orange-500/[0.03] rounded-full blur-[100px] pointer-events-none"
      />

      {/* Staggered content */}
      <motion.div
        className="relative z-10 mx-auto max-w-7xl w-full"
        variants={container}
        initial="hidden"
        animate="visible"
      >
        <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12 mb-14">
          {/* Crow logo — left */}
          <motion.div variants={fadeUp} className="flex-shrink-0">
            <motion.img
              src="/crowbyte-crow.png"
              alt="CrowByte"
              className="w-[200px] sm:w-[260px] md:w-[320px] lg:w-[380px] drop-shadow-[0_0_40px_rgba(59,130,246,0.3)]"
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            />
          </motion.div>

          {/* Text — right */}
          <div className="text-center md:text-left">
            {/* Badge pill */}
            <motion.div variants={fadeUp} className="flex justify-center md:justify-start mb-6">
              <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-white/[0.06] border border-white/[0.1] backdrop-blur-sm">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75 animate-ping" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-orange-500" />
                </span>
                <span className="font-['JetBrains_Mono'] text-xs text-zinc-300 tracking-wide">
                  15 AI Agents. One Command.
                </span>
              </div>
            </motion.div>

            {/* Main headline — gradient text */}
            <motion.h1
              variants={fadeUp}
              className="font-['JetBrains_Mono'] text-4xl sm:text-5xl md:text-[56px] font-bold leading-[1.08] tracking-tight bg-clip-text text-transparent"
              style={{
                backgroundImage: "linear-gradient(135deg, #3b82f6 0%, #60a5fa 20%, #a78bfa 35%, #c084fc 45%, #f59e0b 60%, #f97316 80%, #ea580c 100%)",
              }}
            >
              CrowByte
              <br />
              A New Era of
              <br />
              CyberWarfare.
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              variants={fadeUp}
              className="font-['JetBrains_Mono'] text-[14px] md:text-[15px] text-white/70 max-w-lg mt-6 leading-[1.8]"
            >
              Deploy autonomous agent swarms across your attack surface.
              Recon, exploit, and report — simultaneously.
            </motion.p>

            {/* CTA buttons */}
            <motion.div
              variants={fadeUp}
              className="mt-8 flex items-center justify-center md:justify-start gap-3"
            >
              {/* Primary CTA — orange pill with glow */}
              <LaunchAppButton className="relative font-['JetBrains_Mono'] text-sm font-semibold bg-orange-500 hover:bg-orange-400 text-black px-7 py-3 rounded-full transition-all duration-300 cursor-pointer shadow-[0_0_20px_rgba(249,115,22,0.3)] hover:shadow-[0_0_30px_rgba(249,115,22,0.5)] hover:scale-[1.02] active:scale-[0.98] overflow-hidden group">
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-[1px] bg-gradient-to-r from-transparent via-white/80 to-transparent" />
                <span className="relative z-10">Get Started</span>
              </LaunchAppButton>

              {/* Secondary CTA — ghost pill */}
              <a
                href="https://crowbyte.io/download"
                target="_blank"
                rel="noopener noreferrer"
                className="relative font-['JetBrains_Mono'] text-sm text-zinc-300 border border-white/[0.12] hover:border-white/[0.2] hover:bg-white/[0.04] px-6 py-3 rounded-full transition-all duration-300 inline-flex items-center gap-2 cursor-pointer hover:scale-[1.02] active:scale-[0.98] overflow-hidden"
              >
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                <DownloadSimple size={16} weight="bold" />
                <span>Download Now</span>
              </a>
            </motion.div>
          </div>
        </div>

        {/* Terminal — scale + fade in */}
        <motion.div
          ref={termRef}
          variants={scaleIn}
          className="w-full"
        >
          <div className="rounded-lg border border-white/[0.08] overflow-hidden bg-zinc-950/80 backdrop-blur-sm shadow-2xl shadow-blue-500/[0.08] hover:shadow-blue-500/[0.15] transition-shadow duration-500">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06] bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[#EF4444]/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#EAB308]/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#22C55E]/80" />
              </div>
              <span className="font-['JetBrains_Mono'] text-[11px] text-zinc-600">
                crowbyte@kali ~/bounty — 7 agents active
              </span>
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                <span className="font-['JetBrains_Mono'] text-[11px] text-blue-500 font-bold">LIVE</span>
              </div>
            </div>

            <div className="bg-white/[0.03] p-1.5 space-y-[1px]">
              {/* Orchestrator — full width command pane */}
              <AgentPane
                config={orchestrator}
                active={termInView}
                startDelay={0}
              />

              {/* Agent grid — 5 agents below */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-[1px]">
                {agents.map((agent, i) => (
                  <AgentPane
                    key={agent.name}
                    config={agent}
                    active={termInView}
                    startDelay={800 + i * 400 + Math.random() * 300}
                  />
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
