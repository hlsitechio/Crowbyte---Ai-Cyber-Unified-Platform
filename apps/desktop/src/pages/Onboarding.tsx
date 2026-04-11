/**
 * CrowByte Onboarding — Minimal first-run experience
 *
 * 3 steps: Welcome → Account → Ready
 * Everything else lives in Settings.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  UilShield,
  UilCheck,
  UilArrowRight,
  UilUser,
  UilEye,
  UilEyeSlash,
  UilGithub,
  UilCog,
} from "@iconscout/react-unicons";
import { supabase } from "@/integrations/supabase/client";
import { verifyLicense } from "@/services/license-guard";

// ─── Types ──────────────────────────────────────────────────────────────────

type Step = "welcome" | "account" | "ready";
type AccountMode = "create" | "signin";

const ONBOARD_API = "https://srv1459982.hstgr.cloud:18795";

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

function WelcomeStep({ onNext }: { onNext: () => void }) {
  const [accepted, setAccepted] = useState(false);

  return (
    <div className="flex flex-col items-center justify-center h-full px-10 gap-6">
      <motion.img
        src="./crowbyte-crow.png"
        alt="CrowByte"
        className="w-20 h-20 drop-shadow-2xl"
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-3"
      >
        <h1 className="text-2xl font-bold text-white">
          Welcome to <span className="text-blue-400">Crow</span><span className="text-orange-400">Byte</span>
        </h1>
        <p className="text-sm text-zinc-400 max-w-xs mx-auto leading-relaxed">
          AI-powered cybersecurity platform for security teams and researchers.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="w-full max-w-sm"
      >
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 space-y-2 mb-4">
          {[
            "Real-time CVE monitoring & threat intelligence",
            "Multiple AI models for security analysis",
            "Fleet management & network scanning",
            "Built-in terminal & security toolkit",
          ].map((item) => (
            <div key={item} className="flex items-center gap-2 text-xs text-zinc-400">
              <UilCheck size={12} className="text-blue-400 flex-shrink-0" />
              <span>{item}</span>
            </div>
          ))}
        </div>

        <label className="flex items-center gap-2.5 cursor-pointer group px-1 mb-4">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            className="w-3.5 h-3.5 rounded border-zinc-600 bg-transparent accent-blue-500"
          />
          <span className="text-xs text-zinc-400 group-hover:text-zinc-300 transition-colors">
            I accept the{" "}
            <a href="https://crowbyte.io/terms" target="_blank" rel="noopener" className="text-blue-400 hover:underline">Terms of Service</a>
            {" "}and{" "}
            <a href="https://crowbyte.io/privacy" target="_blank" rel="noopener" className="text-blue-400 hover:underline">Privacy Policy</a>
          </span>
        </label>
      </motion.div>

      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        disabled={!accepted}
        onClick={onNext}
        className="w-full max-w-sm h-10 rounded-full bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white text-sm font-medium transition-all flex items-center justify-center gap-2"
      >
        Get Started <UilArrowRight size={14} />
      </motion.button>
    </div>
  );
}

function AccountStep({
  onNext,
  onSignInComplete,
}: {
  onNext: () => void;
  onSignInComplete: () => void;
}) {
  const [mode, setMode] = useState<AccountMode>("create");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [verifyingLicense, setVerifyingLicense] = useState(false);

  const handleSignIn = async () => {
    if (!email || !password) return;
    setLoading(true);
    setError("");
    try {
      const { error: authErr } = await supabase.auth.signInWithPassword({ email, password });
      if (authErr) {
        setError(authErr.message);
        setLoading(false);
        return;
      }
      setVerifyingLicense(true);
      const license = await verifyLicense();
      setVerifyingLicense(false);
      setLoading(false);
      // Signed in — go to ready or dashboard
      if (license.valid) {
        onSignInComplete();
      } else {
        onNext();
      }
    } catch {
      setError("Sign-in failed. Check your connection.");
      setLoading(false);
      setVerifyingLicense(false);
    }
  };

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
      localStorage.setItem("crowbyte_onboard", JSON.stringify(data));
      if (data.supabase?.url) localStorage.setItem("supabase_url", data.supabase.url);
      if (data.supabase?.anon_key) localStorage.setItem("supabase_anon_key", data.supabase.anon_key);
      setLoading(false);
      onNext();
    } catch {
      setError("Can't reach server. Check your connection.");
      setLoading(false);
    }
  };

  const handleGithubAuth = async () => {
    setLoading(true);
    setError("");
    try {
      const { error: oauthErr } = await supabase.auth.signInWithOAuth({
        provider: "github",
        options: { redirectTo: window.location.origin },
      });
      if (oauthErr) setError(oauthErr.message);
    } catch {
      setError("GitHub login failed");
    }
    setLoading(false);
  };

  const handleSkip = async () => {
    try {
      const res = await fetch(`${ONBOARD_API}/api/onboard/skip`, { method: "POST" });
      const data = await res.json();
      localStorage.setItem("crowbyte_onboard", JSON.stringify(data));
      if (data.supabase?.url) localStorage.setItem("supabase_url", data.supabase.url);
      if (data.supabase?.anon_key) localStorage.setItem("supabase_anon_key", data.supabase.anon_key);
    } catch { /* offline */ }
    onNext();
  };

  if (verifyingLicense) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-10 gap-6">
        <motion.div
          className="w-10 h-10 border-2 border-t-blue-500 rounded-full"
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
        />
        <p className="text-sm text-zinc-400">Signing in...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full px-10 gap-5">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-2"
      >
        <div className="mx-auto w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-3">
          <UilUser size={22} className="text-blue-400" />
        </div>
        <h2 className="text-xl font-bold text-white">
          {mode === "create" ? "Create Your Account" : "Welcome Back"}
        </h2>
        <p className="text-xs text-zinc-500">
          {mode === "create"
            ? "Syncs your data across devices"
            : "Sign in to link this device"}
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        {/* Mode toggle */}
        <div className="flex rounded-lg bg-white/[0.04] border border-white/[0.06] p-0.5 mb-4">
          <button
            onClick={() => { setMode("create"); setError(""); }}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
              mode === "create"
                ? "bg-blue-600/20 text-blue-400"
                : "text-zinc-500 hover:text-zinc-400 border border-transparent"
            }`}
          >
            New Account
          </button>
          <button
            onClick={() => { setMode("signin"); setError(""); }}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
              mode === "signin"
                ? "bg-blue-600/20 text-blue-400"
                : "text-zinc-500 hover:text-zinc-400 border border-transparent"
            }`}
          >
            Sign In
          </button>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs text-zinc-400">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              onKeyDown={(e) => e.key === "Enter" && (mode === "signin" ? handleSignIn() : handleCreate())}
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
                placeholder={mode === "create" ? "Min 8 characters" : "Your password"}
                onKeyDown={(e) => e.key === "Enter" && (mode === "signin" ? handleSignIn() : handleCreate())}
                className="w-full h-9 px-3 pr-9 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/50 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
              >
                {showPassword ? <UilEyeSlash size={14} /> : <UilEye size={14} />}
              </button>
            </div>
          </div>

          <button
            onClick={mode === "signin" ? handleSignIn : handleCreate}
            disabled={!email || !password || loading}
            className="w-full h-10 rounded-full bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white text-sm font-medium transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <motion.div
                className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
              />
            ) : mode === "signin" ? (
              <>Sign In <UilArrowRight size={14} /></>
            ) : (
              <>Create Account <UilArrowRight size={14} /></>
            )}
          </button>

          {error && (
            <div className="text-xs text-red-400 text-center px-2">{error}</div>
          )}

          <div className="flex items-center gap-3 my-1">
            <div className="flex-1 h-px bg-white/[0.06]" />
            <span className="text-[10px] text-zinc-600">or</span>
            <div className="flex-1 h-px bg-white/[0.06]" />
          </div>

          <button
            onClick={handleGithubAuth}
            disabled={loading}
            className="w-full h-10 rounded-full bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-white text-sm font-medium transition-all flex items-center justify-center gap-2"
          >
            <UilGithub size={16} /> Continue with GitHub
          </button>

          {mode === "create" && (
            <button
              onClick={handleSkip}
              className="w-full text-xs text-zinc-600 hover:text-zinc-400 transition-colors py-1"
            >
              Skip for now
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function ReadyStep() {
  const handleLaunch = async () => {
    try {
      await window.electronAPI?.onboardingComplete?.();
    } catch {
      window.location.href = "/dashboard";
    }
  };

  const handleGuidedSetup = async () => {
    try {
      await window.electronAPI?.onboardingComplete?.();
      // Small delay to let the main window load, then navigate
      setTimeout(() => {
        window.location.href = "/settings/onboarding";
      }, 100);
    } catch {
      window.location.href = "/settings/onboarding";
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
        <h2 className="text-2xl font-bold text-white">You're In</h2>
        <p className="text-sm text-zinc-400 max-w-xs mx-auto">
          CrowByte is ready. You can configure your security stack now or set it up later.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="w-full max-w-sm space-y-3"
      >
        {/* Primary: Guided setup */}
        <button
          onClick={handleGuidedSetup}
          className="w-full h-11 rounded-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white text-sm font-semibold transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
        >
          <UilCog size={16} /> Set Up My Workspace
        </button>

        {/* Secondary: Skip to dashboard */}
        <button
          onClick={handleLaunch}
          className="w-full h-10 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-zinc-300 text-sm font-medium transition-all flex items-center justify-center gap-2"
        >
          Skip to Dashboard <UilArrowRight size={14} />
        </button>

        <p className="text-[10px] text-zinc-600 text-center">
          You can always configure everything in Settings
        </p>
      </motion.div>
    </div>
  );
}

// ─── Main Onboarding Page ───────────────────────────────────────────────────

export default function Onboarding() {
  const [step, setStep] = useState<Step>("welcome");

  const stepOrder: Step[] = ["welcome", "account", "ready"];
  const currentIndex = stepOrder.indexOf(step);

  const handleSignInComplete = async () => {
    try {
      await window.electronAPI?.onboardingComplete?.();
    } catch {
      window.location.href = "/dashboard";
    }
  };

  return (
    <div className="w-screen h-screen bg-background rounded-2xl overflow-hidden relative select-none">
      {/* Drag region */}
      <div
        className="absolute top-0 left-0 right-0 h-8 z-40"
        style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
      />
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

      {/* Background glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(59,130,246,0.04),transparent_60%)]" />

      {/* Step content */}
      <div className="relative h-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.25 }}
            className="h-full"
          >
            {step === "welcome" && <WelcomeStep onNext={() => setStep("account")} />}
            {step === "account" && (
              <AccountStep
                onNext={() => setStep("ready")}
                onSignInComplete={handleSignInComplete}
              />
            )}
            {step === "ready" && <ReadyStep />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
