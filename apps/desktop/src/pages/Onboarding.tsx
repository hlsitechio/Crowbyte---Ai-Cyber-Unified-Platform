/**
 * CrowByte Onboarding — Discord-style first-run experience
 *
 * Frameless window, branded UI, zero stock Windows chrome.
 * Shown on first launch after silent NSIS install.
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  Zap,
  Check,
  ArrowRight,
  Terminal,
  Globe,
  Lock,
  User,
  Eye,
  EyeOff,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

type Step = "install" | "welcome" | "account" | "tier" | "provision" | "ready";

const ONBOARD_API = "https://srv1459982.hstgr.cloud:18795";

interface TierOption {
  id: string;
  name: string;
  price: string;
  features: string[];
  color: string;
  popular?: boolean;
}

// ─── Data ───────────────────────────────────────────────────────────────────

const tiers: TierOption[] = [
  {
    id: "community",
    name: "Community",
    price: "Free",
    features: ["3 targets", "AI chat", "CVE database", "Core scanning"],
    color: "text-zinc-400",
  },
  {
    id: "professional",
    name: "Professional",
    price: "$29/mo",
    features: ["Unlimited targets", "VPS agents", "Fleet mgmt", "API access"],
    color: "text-blue-400",
    popular: true,
  },
  {
    id: "team",
    name: "Team",
    price: "$79/mo",
    features: ["Everything in Pro", "Team collab", "Custom agents", "Priority support"],
    color: "text-violet-400",
  },
];

const installSteps = [
  "Verifying system requirements...",
  "Extracting security toolkit...",
  "Configuring AI providers...",
  "Setting up local database...",
  "Initializing MCP servers...",
  "Ready.",
];

// ─── Components ─────────────────────────────────────────────────────────────

function WindowControls() {
  return (
    <div className="absolute top-3 right-3 z-50 flex gap-1.5">
      <button
        onClick={() => window.electronAPI?.minimizeWindow?.()}
        className="w-3 h-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
      />
      <button
        onClick={() => window.electronAPI?.closeWindow?.()}
        className="w-3 h-3 rounded-full bg-white/10 hover:bg-red-500/80 transition-colors"
      />
    </div>
  );
}

function InstallStep({ onComplete }: { onComplete: () => void }) {
  const [currentLine, setCurrentLine] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const lineInterval = setInterval(() => {
      setCurrentLine((prev) => {
        if (prev >= installSteps.length - 1) {
          clearInterval(lineInterval);
          setTimeout(onComplete, 800);
          return prev;
        }
        return prev + 1;
      });
    }, 600);

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 2;
      });
    }, 50);

    return () => {
      clearInterval(lineInterval);
      clearInterval(progressInterval);
    };
  }, [onComplete]);

  return (
    <div className="flex flex-col items-center justify-center h-full px-10 gap-8">
      {/* Crow logo */}
      <motion.img
        src="./crowbyte-crow.png"
        alt="CrowByte"
        className="w-20 h-20 drop-shadow-2xl"
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
      />

      {/* Terminal output */}
      <div className="w-full max-w-sm space-y-1 font-mono text-xs">
        {installSteps.slice(0, currentLine + 1).map((line, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className={`flex items-center gap-2 ${
              i === currentLine && i < installSteps.length - 1
                ? "text-zinc-400"
                : i === installSteps.length - 1
                ? "text-blue-400 font-semibold"
                : "text-zinc-600"
            }`}
          >
            {i < currentLine ? (
              <Check size={12} className="text-blue-400 flex-shrink-0" />
            ) : i === currentLine && i < installSteps.length - 1 ? (
              <motion.div
                className="w-3 h-3 border border-zinc-500 border-t-blue-400 rounded-full flex-shrink-0"
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
              />
            ) : (
              <Zap size={12} className="text-blue-400 flex-shrink-0" />
            )}
            {line}
          </motion.div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-sm">
        <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full"
            style={{ width: `${progress}%` }}
            transition={{ duration: 0.1 }}
          />
        </div>
      </div>
    </div>
  );
}

function WelcomeStep({ onNext }: { onNext: () => void }) {
  const [eulaAccepted, setEulaAccepted] = useState(false);

  return (
    <div className="flex flex-col items-center justify-center h-full px-10 gap-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-3"
      >
        <h1 className="text-2xl font-bold text-white">
          Welcome to CrowByte
        </h1>
        <p className="text-sm text-zinc-400 max-w-xs mx-auto leading-relaxed">
          AI-powered offensive security terminal. Built for bug bounty hunters and red teams.
        </p>
      </motion.div>

      {/* Disclosure summary */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="w-full max-w-sm space-y-2"
      >
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 space-y-2">
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <Globe size={12} />
            <span>Connects to Shodan, NVD, Supabase APIs</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <Terminal size={12} />
            <span>Runs automated scans and AI agents</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <Lock size={12} />
            <span>Full shell access and browser automation</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <Shield size={12} />
            <span>Only use on authorized targets</span>
          </div>
        </div>

        <label className="flex items-center gap-2.5 cursor-pointer group px-1">
          <input
            type="checkbox"
            checked={eulaAccepted}
            onChange={(e) => setEulaAccepted(e.target.checked)}
            className="w-3.5 h-3.5 rounded border-zinc-600 bg-transparent accent-blue-500"
          />
          <span className="text-xs text-zinc-400 group-hover:text-zinc-300 transition-colors">
            I accept the{" "}
            <span className="text-blue-400">EULA</span> and{" "}
            <span className="text-blue-400">Acceptable Use Policy</span>
          </span>
        </label>
      </motion.div>

      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        disabled={!eulaAccepted}
        onClick={onNext}
        className="w-full max-w-sm h-10 rounded-full bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white text-sm font-medium transition-all flex items-center justify-center gap-2"
      >
        Get Started <ArrowRight size={14} />
      </motion.button>
    </div>
  );
}

function AccountStep({ onNext }: { onNext: (data?: Record<string, unknown>) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async () => {
    if (!email || !password) return;
    if (password.length < 8) { setError("Password must be at least 8 characters"); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${ONBOARD_API}/api/onboard`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Account creation failed");
        setLoading(false);
        return;
      }
      // Store config locally
      localStorage.setItem("crowbyte_onboard", JSON.stringify(data));
      if (data.supabase?.url) localStorage.setItem("supabase_url", data.supabase.url);
      if (data.supabase?.anon_key) localStorage.setItem("supabase_anon_key", data.supabase.anon_key);
      setLoading(false);
      onNext(data);
    } catch {
      setError("Can't reach server. Check your connection.");
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    try {
      const res = await fetch(`${ONBOARD_API}/api/onboard/skip`, { method: "POST" });
      const data = await res.json();
      localStorage.setItem("crowbyte_onboard", JSON.stringify(data));
      if (data.supabase?.url) localStorage.setItem("supabase_url", data.supabase.url);
      if (data.supabase?.anon_key) localStorage.setItem("supabase_anon_key", data.supabase.anon_key);
    } catch { /* offline — skip silently */ }
    onNext();
  };

  return (
    <div className="flex flex-col items-center justify-center h-full px-10 gap-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-2"
      >
        <div className="mx-auto w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-3">
          <User size={22} className="text-blue-400" />
        </div>
        <h2 className="text-xl font-bold text-white">Create Your Account</h2>
        <p className="text-xs text-zinc-500">Syncs CVEs, findings, and settings across devices</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="w-full max-w-sm space-y-3"
      >
        <div className="space-y-1.5">
          <label className="text-xs text-zinc-400">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="operator@example.com"
            className="w-full h-9 px-3 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/50 font-mono"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-zinc-400">Password</label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 8 characters"
              className="w-full h-9 px-3 pr-9 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/50 font-mono"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
            >
              {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>

        <button
          onClick={handleCreate}
          disabled={!email || !password || loading}
          className="w-full h-10 rounded-full bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white text-sm font-medium transition-all flex items-center justify-center gap-2"
        >
          {loading ? (
            <motion.div
              className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
            />
          ) : (
            <>Create Account <ArrowRight size={14} /></>
          )}
        </button>

        {error && (
          <div className="text-xs text-red-400 text-center px-2">{error}</div>
        )}

        <button
          onClick={handleSkip}
          className="w-full text-xs text-zinc-600 hover:text-zinc-400 transition-colors py-1"
        >
          Skip — I'll set this up later
        </button>
      </motion.div>
    </div>
  );
}

function TierStep({ onNext }: { onNext: () => void }) {
  const [selected, setSelected] = useState("community");

  return (
    <div className="flex flex-col items-center justify-center h-full px-8 gap-5">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-1"
      >
        <h2 className="text-xl font-bold text-white">Choose Your Plan</h2>
        <p className="text-xs text-zinc-500">You can upgrade anytime</p>
      </motion.div>

      <div className="w-full max-w-md grid grid-cols-3 gap-2">
        {tiers.map((tier, i) => (
          <motion.button
            key={tier.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            onClick={() => setSelected(tier.id)}
            className={`relative p-3 rounded-xl border text-left transition-all ${
              selected === tier.id
                ? "border-blue-500/40 bg-blue-500/[0.06]"
                : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]"
            }`}
          >
            {tier.popular && (
              <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[9px] bg-blue-500 text-white px-2 py-0.5 rounded-full font-medium">
                Popular
              </span>
            )}
            <div className={`text-sm font-semibold ${tier.color}`}>{tier.name}</div>
            <div className="text-xs text-zinc-300 font-mono mt-0.5">{tier.price}</div>
            <div className="mt-2 space-y-1">
              {tier.features.map((f) => (
                <div key={f} className="flex items-center gap-1.5 text-[10px] text-zinc-500">
                  <Check size={9} className="text-blue-400 flex-shrink-0" />
                  {f}
                </div>
              ))}
            </div>
          </motion.button>
        ))}
      </div>

      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        onClick={onNext}
        className="w-full max-w-md h-10 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-all flex items-center justify-center gap-2"
      >
        Continue with {tiers.find((t) => t.id === selected)?.name} <ArrowRight size={14} />
      </motion.button>
    </div>
  );
}

function ProvisionStep({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const steps = [
    "Creating your workspace...",
    "Provisioning database...",
    "Generating API keys...",
    "Configuring AI models...",
    "Done!",
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setStep((prev) => {
        if (prev >= steps.length - 1) {
          clearInterval(interval);
          setTimeout(onComplete, 1000);
          return prev;
        }
        return prev + 1;
      });
    }, 800);
    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div className="flex flex-col items-center justify-center h-full px-10 gap-8">
      <motion.div
        animate={{ rotate: step < steps.length - 1 ? 360 : 0 }}
        transition={{ repeat: step < steps.length - 1 ? Infinity : 0, duration: 2, ease: "linear" }}
        className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center"
      >
        {step >= steps.length - 1 ? (
          <Check size={28} className="text-blue-400" />
        ) : (
          <Zap size={28} className="text-blue-400" />
        )}
      </motion.div>

      <div className="w-full max-w-xs space-y-1.5 font-mono text-xs">
        {steps.slice(0, step + 1).map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className={`flex items-center gap-2 ${
              i < step ? "text-zinc-600" : i === step && step < steps.length - 1 ? "text-zinc-300" : "text-blue-400 font-semibold"
            }`}
          >
            {i < step ? (
              <Check size={11} className="text-blue-400/60" />
            ) : (
              <motion.div
                className="w-2.5 h-2.5 border border-blue-400 border-t-transparent rounded-full"
                animate={i === step && step < steps.length - 1 ? { rotate: 360 } : {}}
                transition={{ repeat: Infinity, duration: 0.6, ease: "linear" }}
              />
            )}
            {s}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function ReadyStep() {
  const handleLaunch = async () => {
    try {
      await window.electronAPI?.onboardingComplete?.();
    } catch {
      // Fallback: navigate to dashboard
      window.location.hash = "/dashboard";
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full px-10 gap-6">
      <motion.img
        src="./crowbyte-crow.png"
        alt="CrowByte"
        className="w-16 h-16 drop-shadow-2xl"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-center space-y-2"
      >
        <h2 className="text-2xl font-bold text-white">You're All Set</h2>
        <p className="text-sm text-zinc-400">CrowByte is ready. Time to hunt.</p>
      </motion.div>

      <motion.button
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        onClick={handleLaunch}
        className="w-full max-w-sm h-11 rounded-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white text-sm font-semibold transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
      >
        Launch CrowByte <ArrowRight size={14} />
      </motion.button>
    </div>
  );
}

// ─── Main Onboarding Page ───────────────────────────────────────────────────

export default function Onboarding() {
  const [step, setStep] = useState<Step>("install");

  const stepOrder: Step[] = ["install", "welcome", "account", "tier", "provision", "ready"];
  const currentIndex = stepOrder.indexOf(step);

  return (
    <div
      className="w-screen h-screen bg-[#0a0a0a] rounded-2xl overflow-hidden relative select-none"
      style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
    >
      <WindowControls />

      {/* Progress dots */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
        {stepOrder.map((_, i) => (
          <div
            key={i}
            className={`h-1 rounded-full transition-all duration-300 ${
              i <= currentIndex ? "w-5 bg-blue-500" : "w-1.5 bg-white/10"
            }`}
          />
        ))}
      </div>

      {/* Subtle background glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(59,130,246,0.04),transparent_60%)]" />

      {/* Step content */}
      <div
        className="relative h-full"
        style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.25 }}
            className="h-full"
          >
            {step === "install" && <InstallStep onComplete={() => setStep("welcome")} />}
            {step === "welcome" && <WelcomeStep onNext={() => setStep("account")} />}
            {step === "account" && <AccountStep onNext={() => setStep("tier")} />}
            {step === "tier" && <TierStep onNext={() => setStep("provision")} />}
            {step === "provision" && <ProvisionStep onComplete={() => setStep("ready")} />}
            {step === "ready" && <ReadyStep />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
