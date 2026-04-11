/**
 * Preferences Wizard — Post-signup onboarding for SaaS users.
 * 5 steps: Welcome → Security UilLayerGroup → Threat Intel → News & Alerts → Monitoring → Done
 * Saves to user_preferences table in Supabase.
 */

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  UilShield,
  UilCheck,
  UilArrowRight,
  UilArrowLeft,
  UilSearch,
  UilTimes,
  UilGlobe,
  UilExclamationTriangle,
  UilBolt,
  UilAngleDown,
  UilNewspaper,
  UilFocusTarget,
} from "@iconscout/react-unicons";
import {
  getSubscription,
  getPreferences,
  updatePreferences,
  PRODUCT_CATALOG,
  THREAT_FEEDS,
  NEWS_SOURCES,
  TIER_LIMITS,
  type Tier,
  type UserPreferences,
} from "@/services/subscription";

// ─── Types ──────────────────────────────────────────────────────────────────

type WizardStep = "welcome" | "stack" | "threats" | "news" | "monitoring" | "done";

const STEPS: WizardStep[] = ["welcome", "stack", "threats", "news", "monitoring", "done"];

// ─── Helpers ────────────────────────────────────────────────────────────────

function StepDots({ current }: { current: number }) {
  return (
    <div className="flex gap-1.5 justify-center">
      {STEPS.map((_, i) => (
        <div
          key={i}
          className={`h-1 rounded-full transition-all duration-300 ${
            i <= current ? "w-6 bg-blue-500" : "w-1.5 bg-white/10"
          }`}
        />
      ))}
    </div>
  );
}

function NavButtons({
  step,
  onBack,
  onNext,
  nextLabel = "Continue",
  nextDisabled = false,
  loading = false,
}: {
  step: WizardStep;
  onBack: () => void;
  onNext: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  loading?: boolean;
}) {
  return (
    <div className="flex gap-3 w-full max-w-lg">
      {step !== "welcome" && step !== "done" && (
        <button
          onClick={onBack}
          className="h-11 px-5 rounded-xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.06] text-zinc-400 text-sm font-medium transition-all flex items-center gap-2"
        >
          <UilArrowLeft size={14} /> Back
        </button>
      )}
      <button
        onClick={onNext}
        disabled={nextDisabled || loading}
        className="flex-1 h-11 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white text-sm font-medium transition-all flex items-center justify-center gap-2"
      >
        {loading ? (
          <motion.div
            className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
          />
        ) : (
          <>{nextLabel} <UilArrowRight size={14} /></>
        )}
      </button>
    </div>
  );
}

// ─── Step 1: Welcome ────────────────────────────────────────────────────────

function WelcomeStep({ tier, onNext }: { tier: Tier; onNext: () => void }) {
  const tierName = tier.charAt(0).toUpperCase() + tier.slice(1);
  const tierColor =
    tier === "enterprise" ? "text-amber-400" :
    tier === "team" ? "text-violet-400" :
    tier === "pro" ? "text-blue-400" : "text-zinc-400";

  return (
    <div className="flex flex-col items-center gap-8 text-center">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
        className="w-20 h-20 rounded-2xl bg-blue-500/10 flex items-center justify-center"
      >
        <UilShield size={36} className="text-blue-400" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-3"
      >
        <h1 className="text-3xl font-bold text-white">
          Welcome to CrowByte <span className={tierColor}>{tierName}</span>
        </h1>
        <p className="text-zinc-400 text-sm max-w-md leading-relaxed">
          Let's configure your dashboard. Our AI agents will work 24/7 to deliver
          security intelligence tailored to your stack.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="grid grid-cols-2 gap-3 w-full max-w-sm text-left"
      >
        {[
          { icon: UilExclamationTriangle, label: "CVE monitoring", desc: "Track vulns in your stack" },
          { icon: UilGlobe, label: "Threat intel", desc: "Live malware & IOC feeds" },
          { icon: UilNewspaper, label: "Security news", desc: "Curated daily digest" },
          { icon: UilFocusTarget, label: "Attack surface", desc: "Domain & port monitoring" },
        ].map(({ icon: Icon, label, desc }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 + i * 0.08 }}
            className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.02]"
          >
            <Icon size={16} className="text-blue-400 mb-1.5" />
            <div className="text-xs font-medium text-white">{label}</div>
            <div className="text-[10px] text-zinc-500">{desc}</div>
          </motion.div>
        ))}
      </motion.div>

      <NavButtons step="welcome" onBack={() => {}} onNext={onNext} nextLabel="Let's Go" />
    </div>
  );
}

// ─── Step 2: Security UilLayerGroup ─────────────────────────────────────────────────

function StackStep({
  products,
  setProducts,
  severity,
  setSeverity,
  keywords,
  setKeywords,
  tier,
  onBack,
  onNext,
}: {
  products: string[];
  setProducts: (p: string[]) => void;
  severity: string;
  setSeverity: (s: string) => void;
  keywords: string[];
  setKeywords: (k: string[]) => void;
  tier: Tier;
  onBack: () => void;
  onNext: () => void;
}) {
  const [search, setSearch] = useState("");
  const [customInput, setCustomInput] = useState("");
  const maxProducts = TIER_LIMITS[tier].cve_products;

  const filtered = useMemo(() => {
    if (!search) return PRODUCT_CATALOG.slice(0, 24);
    const q = search.toLowerCase();
    return PRODUCT_CATALOG.filter((p) => p.includes(q));
  }, [search]);

  const toggleProduct = (p: string) => {
    if (products.includes(p)) {
      setProducts(products.filter((x) => x !== p));
    } else {
      if (maxProducts !== null && products.length >= maxProducts) return;
      setProducts([...products, p]);
    }
  };

  const addCustom = () => {
    const val = customInput.trim().toLowerCase();
    if (val && !products.includes(val)) {
      if (maxProducts !== null && products.length >= maxProducts) return;
      setProducts([...products, val]);
    }
    setCustomInput("");
  };

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-lg">
      <div className="text-center space-y-2">
        <div className="mx-auto w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center">
          <UilExclamationTriangle size={22} className="text-orange-400" />
        </div>
        <h2 className="text-xl font-bold text-white">Your Security UilLayerGroup</h2>
        <p className="text-xs text-zinc-500">
          Select products you use. We'll track CVEs for them.
          {maxProducts !== null && (
            <span className="text-zinc-600"> ({products.length}/{maxProducts} max on {tier})</span>
          )}
        </p>
      </div>

      {/* Search */}
      <div className="relative w-full">
        <UilSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products..."
          className="w-full h-9 pl-9 pr-3 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/50"
        />
      </div>

      {/* Selected chips */}
      {products.length > 0 && (
        <div className="flex flex-wrap gap-1.5 w-full">
          {products.map((p) => (
            <button
              key={p}
              onClick={() => toggleProduct(p)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-500/15 text-xs text-blue-300 hover:bg-red-500/15 hover:border-red-500/30 hover:text-red-300 transition-all"
            >
              {p} <UilTimes size={10} />
            </button>
          ))}
        </div>
      )}

      {/* Product grid */}
      <div className="grid grid-cols-4 gap-1.5 w-full max-h-[180px] overflow-y-auto pr-1">
        {filtered.map((p) => {
          const selected = products.includes(p);
          const disabled = !selected && maxProducts !== null && products.length >= maxProducts;
          return (
            <button
              key={p}
              onClick={() => toggleProduct(p)}
              disabled={disabled}
              className={`px-2 py-1.5 rounded-lg text-xs transition-all ${
                selected
                  ? "bg-blue-500/15 text-blue-300"
                  : disabled
                  ? "bg-white/[0.01] border border-white/[0.04] text-zinc-700 cursor-not-allowed"
                  : "bg-white/[0.02] border border-white/[0.06] text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-200"
              }`}
            >
              {selected && <UilCheck size={10} className="inline mr-1" />}
              {p}
            </button>
          );
        })}
      </div>

      {/* Custom product */}
      <div className="flex gap-2 w-full">
        <input
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addCustom()}
          placeholder="Add custom product..."
          className="flex-1 h-8 px-3 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/50"
        />
        <button
          onClick={addCustom}
          className="px-3 h-8 rounded-lg bg-white/[0.06] border border-white/[0.08] text-xs text-zinc-400 hover:text-white transition-colors"
        >
          Add
        </button>
      </div>

      {/* Min severity */}
      <div className="flex items-center gap-3 w-full">
        <span className="text-xs text-zinc-500 whitespace-nowrap">Min severity:</span>
        <div className="flex gap-1.5">
          {["critical", "high", "medium", "low"].map((s) => (
            <button
              key={s}
              onClick={() => setSeverity(s)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                severity === s
                  ? s === "critical" ? "bg-red-500/20 text-red-300 border border-red-500/40"
                  : s === "high" ? "bg-orange-500/20 text-orange-300 border border-orange-500/40"
                  : s === "medium" ? "bg-yellow-500/20 text-yellow-300 border border-yellow-500/40"
                  : "bg-blue-500/20 text-blue-300 border border-blue-500/40"
                  : "bg-white/[0.02] border border-white/[0.06] text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* CVE keywords */}
      <div className="w-full space-y-1">
        <span className="text-xs text-zinc-500">CVE keywords (optional):</span>
        <input
          value={keywords.join(", ")}
          onChange={(e) => setKeywords(e.target.value.split(",").map((k) => k.trim()).filter(Boolean))}
          placeholder="rce, sqli, ssrf, xss..."
          className="w-full h-8 px-3 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/50"
        />
      </div>

      <NavButtons step="stack" onBack={onBack} onNext={onNext} />
    </div>
  );
}

// ─── Step 3: Threat Intel ───────────────────────────────────────────────────

function ThreatsStep({
  feeds,
  setFeeds,
  tier,
  onBack,
  onNext,
}: {
  feeds: string[];
  setFeeds: (f: string[]) => void;
  tier: Tier;
  onBack: () => void;
  onNext: () => void;
}) {
  const maxFeeds = TIER_LIMITS[tier].threat_feeds;

  const toggleFeed = (id: string) => {
    if (feeds.includes(id)) {
      setFeeds(feeds.filter((f) => f !== id));
    } else {
      if (maxFeeds !== null && feeds.length >= maxFeeds) return;
      setFeeds([...feeds, id]);
    }
  };

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-lg">
      <div className="text-center space-y-2">
        <div className="mx-auto w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center">
          <UilGlobe size={22} className="text-red-400" />
        </div>
        <h2 className="text-xl font-bold text-white">Threat Intelligence</h2>
        <p className="text-xs text-zinc-500">
          Choose which threat feeds to subscribe to.
          {maxFeeds !== null && (
            <span className="text-zinc-600"> ({feeds.length}/{maxFeeds} on {tier})</span>
          )}
        </p>
      </div>

      <div className="w-full space-y-2">
        {THREAT_FEEDS.map((feed) => {
          const selected = feeds.includes(feed.id);
          const disabled = !selected && maxFeeds !== null && feeds.length >= maxFeeds;
          return (
            <button
              key={feed.id}
              onClick={() => toggleFeed(feed.id)}
              disabled={disabled}
              className={`w-full p-3 rounded-xl border text-left transition-all ${
                selected
                  ? "border-red-500/30 bg-red-500/[0.06]"
                  : disabled
                  ? "border-white/[0.04] bg-white/[0.01] opacity-40 cursor-not-allowed"
                  : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-white">{feed.name}</div>
                  <div className="text-[11px] text-zinc-500 mt-0.5">{feed.desc}</div>
                </div>
                {selected && (
                  <div className="w-5 h-5 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center">
                    <UilCheck size={12} className="text-red-300" />
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <NavButtons step="threats" onBack={onBack} onNext={onNext} />
    </div>
  );
}

// ─── Step 4: News & Alerts ──────────────────────────────────────────────────

function NewsStep({
  newsEnabled,
  setNewsEnabled,
  sources,
  setSources,
  digest,
  setDigest,
  onBack,
  onNext,
}: {
  newsEnabled: boolean;
  setNewsEnabled: (b: boolean) => void;
  sources: string[];
  setSources: (s: string[]) => void;
  digest: string;
  setDigest: (d: string) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const toggleSource = (id: string) => {
    if (sources.includes(id)) {
      setSources(sources.filter((s) => s !== id));
    } else {
      setSources([...sources, id]);
    }
  };

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-lg">
      <div className="text-center space-y-2">
        <div className="mx-auto w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center">
          <UilNewspaper size={22} className="text-violet-400" />
        </div>
        <h2 className="text-xl font-bold text-white">News & Alerts</h2>
        <p className="text-xs text-zinc-500">Stay informed with curated security news.</p>
      </div>

      {/* Toggle */}
      <button
        onClick={() => setNewsEnabled(!newsEnabled)}
        className={`w-full p-3 rounded-xl border text-left transition-all ${
          newsEnabled
            ? "border-violet-500/30 bg-violet-500/[0.06]"
            : "border-white/[0.06] bg-white/[0.02]"
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-white">Enable security news digest</span>
          <div className={`w-10 h-5 rounded-full transition-all relative ${
            newsEnabled ? "bg-violet-500" : "bg-zinc-700"
          }`}>
            <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${
              newsEnabled ? "left-[22px]" : "left-0.5"
            }`} />
          </div>
        </div>
      </button>

      {newsEnabled && (
        <>
          {/* Sources */}
          <div className="w-full space-y-2">
            <span className="text-xs text-zinc-500">News sources:</span>
            <div className="grid grid-cols-2 gap-1.5">
              {NEWS_SOURCES.map((src) => {
                const selected = sources.includes(src.id);
                return (
                  <button
                    key={src.id}
                    onClick={() => toggleSource(src.id)}
                    className={`px-3 py-2 rounded-lg text-xs transition-all ${
                      selected
                        ? "bg-violet-500/15 text-violet-300"
                        : "bg-white/[0.02] border border-white/[0.06] text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    {selected && <UilCheck size={10} className="inline mr-1" />}
                    {src.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Digest frequency */}
          <div className="w-full space-y-2">
            <span className="text-xs text-zinc-500">Email digest frequency:</span>
            <div className="flex gap-2">
              {["none", "daily", "weekly", "realtime"].map((freq) => (
                <button
                  key={freq}
                  onClick={() => setDigest(freq)}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                    digest === freq
                      ? "bg-violet-500/20 border border-violet-500/40 text-violet-300"
                      : "bg-white/[0.02] border border-white/[0.06] text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {freq === "none" ? "Off" : freq.charAt(0).toUpperCase() + freq.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      <NavButtons step="news" onBack={onBack} onNext={onNext} />
    </div>
  );
}

// ─── Step 5: Monitoring ─────────────────────────────────────────────────────

function MonitoringStep({
  domains,
  setDomains,
  subdomains,
  setSubdomains,
  ports,
  setPorts,
  certs,
  setCerts,
  tier,
  onBack,
  onNext,
}: {
  domains: string[];
  setDomains: (d: string[]) => void;
  subdomains: boolean;
  setSubdomains: (b: boolean) => void;
  ports: boolean;
  setPorts: (b: boolean) => void;
  certs: boolean;
  setCerts: (b: boolean) => void;
  tier: Tier;
  onBack: () => void;
  onNext: () => void;
}) {
  const [input, setInput] = useState("");
  const maxDomains = TIER_LIMITS[tier].monitored_domains;
  const canMonitor = tier !== "free";

  const addDomain = () => {
    const val = input.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    if (val && !domains.includes(val)) {
      if (maxDomains !== null && domains.length >= maxDomains) return;
      setDomains([...domains, val]);
    }
    setInput("");
  };

  const removeDomain = (d: string) => {
    setDomains(domains.filter((x) => x !== d));
  };

  if (!canMonitor) {
    return (
      <div className="flex flex-col items-center gap-6 w-full max-w-lg">
        <div className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-xl bg-zinc-500/10 flex items-center justify-center">
            <UilFocusTarget size={22} className="text-zinc-500" />
          </div>
          <h2 className="text-xl font-bold text-white">Attack Surface Monitoring</h2>
          <p className="text-xs text-zinc-500">Available on Pro, Team, and Enterprise plans.</p>
          <p className="text-[11px] text-blue-400 cursor-pointer hover:underline"
             onClick={() => window.location.href = "/payments"}>
            Upgrade to Pro to unlock
          </p>
        </div>
        <NavButtons step="monitoring" onBack={onBack} onNext={onNext} nextLabel="Skip & Finish" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-lg">
      <div className="text-center space-y-2">
        <div className="mx-auto w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
          <UilFocusTarget size={22} className="text-emerald-400" />
        </div>
        <h2 className="text-xl font-bold text-white">Attack Surface Monitoring</h2>
        <p className="text-xs text-zinc-500">
          Add domains to monitor for changes.
          {maxDomains !== null && (
            <span className="text-zinc-600"> ({domains.length}/{maxDomains} on {tier})</span>
          )}
        </p>
      </div>

      {/* Domain input */}
      <div className="flex gap-2 w-full">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addDomain()}
          placeholder="example.com"
          className="flex-1 h-9 px-3 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50 font-mono"
        />
        <button
          onClick={addDomain}
          disabled={maxDomains !== null && domains.length >= maxDomains}
          className="px-4 h-9 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white text-sm font-medium transition-all"
        >
          Add
        </button>
      </div>

      {/* Domain list */}
      {domains.length > 0 && (
        <div className="w-full space-y-1.5">
          {domains.map((d) => (
            <div
              key={d}
              className="flex items-center justify-between px-3 py-2 rounded-lg border border-white/[0.06] bg-white/[0.02]"
            >
              <span className="text-sm font-mono text-white">{d}</span>
              <button
                onClick={() => removeDomain(d)}
                className="text-zinc-500 hover:text-red-400 transition-colors"
              >
                <UilTimes size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Monitor options */}
      <div className="w-full space-y-2">
        <span className="text-xs text-zinc-500">What to monitor:</span>
        {[
          { label: "New subdomains", value: subdomains, set: setSubdomains },
          { label: "Port changes", value: ports, set: setPorts },
          { label: "Certificate expiry", value: certs, set: setCerts },
        ].map(({ label, value, set }) => (
          <button
            key={label}
            onClick={() => set(!value)}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border transition-all ${
              value
                ? "border-emerald-500/30 bg-emerald-500/[0.06]"
                : "border-white/[0.06] bg-white/[0.02]"
            }`}
          >
            <span className="text-xs text-white">{label}</span>
            <div className={`w-4 h-4 rounded border flex items-center justify-center ${
              value ? "border-emerald-500 bg-emerald-500/20" : "border-zinc-600"
            }`}>
              {value && <UilCheck size={10} className="text-emerald-300" />}
            </div>
          </button>
        ))}
      </div>

      <NavButtons step="monitoring" onBack={onBack} onNext={onNext} nextLabel="Finish Setup" />
    </div>
  );
}

// ─── Step 6: Done ───────────────────────────────────────────────────────────

function DoneStep() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center gap-8 text-center">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
        className="w-20 h-20 rounded-2xl bg-emerald-500/10 flex items-center justify-center"
      >
        <UilBolt size={36} className="text-emerald-400" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-3"
      >
        <h1 className="text-3xl font-bold text-white">You're All Set</h1>
        <p className="text-zinc-400 text-sm max-w-sm leading-relaxed">
          Your AI agents are now configured and working. Security intelligence
          will start appearing on your dashboard within minutes.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="w-full max-w-sm space-y-3"
      >
        <button
          onClick={() => navigate("/dashboard")}
          className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-all flex items-center justify-center gap-2"
        >
          Go to Dashboard <UilArrowRight size={14} />
        </button>
        <button
          onClick={() => navigate("/settings/profile")}
          className="w-full text-xs text-zinc-500 hover:text-zinc-300 transition-colors py-1"
        >
          Edit preferences in Settings
        </button>
      </motion.div>
    </div>
  );
}

// ─── Main Wizard ────────────────────────────────────────────────────────────

export default function PreferencesWizard() {
  const navigate = useNavigate();
  const [step, setStep] = useState<WizardStep>("welcome");
  const [tier, setTier] = useState<Tier>("free");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Preferences state
  const [products, setProducts] = useState<string[]>([]);
  const [severity, setSeverity] = useState("high");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [feeds, setFeeds] = useState<string[]>([]);
  const [newsEnabled, setNewsEnabled] = useState(false);
  const [newsSources, setNewsSources] = useState<string[]>([]);
  const [digest, setDigest] = useState("none");
  const [domains, setDomains] = useState<string[]>([]);
  const [subdomains, setSubdomains] = useState(true);
  const [ports, setPorts] = useState(true);
  const [certs, setCerts] = useState(true);

  // Load existing data
  useEffect(() => {
    (async () => {
      const [sub, prefs] = await Promise.all([getSubscription(), getPreferences()]);
      if (sub) setTier(sub.tier);
      if (prefs) {
        setProducts(prefs.cve_products || []);
        setSeverity(prefs.cve_min_severity || "high");
        setKeywords(prefs.cve_keywords || []);
        setFeeds(prefs.threat_feeds || []);
        setNewsEnabled(prefs.news_enabled);
        setNewsSources(prefs.news_sources || []);
        setDigest(prefs.email_digest || "none");
        setDomains(prefs.monitored_domains || []);
        setSubdomains(prefs.monitor_subdomains);
        setPorts(prefs.monitor_ports);
        setCerts(prefs.monitor_certs);
      }
      setLoading(false);
    })();
  }, []);

  const currentIndex = STEPS.indexOf(step);

  const goBack = () => {
    const idx = STEPS.indexOf(step);
    if (idx > 0) setStep(STEPS[idx - 1]);
  };

  const goNext = async () => {
    const idx = STEPS.indexOf(step);

    // Save at the end (monitoring → done transition)
    if (step === "monitoring") {
      setSaving(true);
      await updatePreferences({
        cve_enabled: products.length > 0,
        cve_products: products,
        cve_min_severity: severity,
        cve_keywords: keywords,
        threat_intel_enabled: feeds.length > 0,
        threat_feeds: feeds,
        news_enabled: newsEnabled,
        news_sources: newsSources,
        news_keywords: [],
        monitoring_enabled: domains.length > 0,
        monitored_domains: domains,
        monitor_subdomains: subdomains,
        monitor_ports: ports,
        monitor_certs: certs,
        email_digest: digest,
      });
      // Cache onboarding flag locally (Supabase updated_at is source of truth)
      localStorage.setItem("crowbyte_prefs_wizard_done", "true");
      setSaving(false);
    }

    if (idx < STEPS.length - 1) {
      setStep(STEPS[idx + 1]);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div
          className="w-8 h-8 border-2 border-t-blue-500 rounded-full"
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8 relative">
      {/* Background glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(59,130,246,0.04),transparent_60%)]" />

      {/* Skip button */}
      {step !== "done" && (
        <button
          onClick={() => {
            localStorage.setItem("crowbyte_prefs_wizard_done", "true");
            // Touch updated_at in Supabase so it differs from created_at (marks onboarding done)
            updatePreferences({ email_digest: "none" }).catch(() => {});
            navigate("/dashboard");
          }}
          className="absolute top-6 right-6 text-xs text-zinc-600 hover:text-zinc-400 transition-colors z-10"
        >
          Skip for now
        </button>
      )}

      {/* Progress */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10">
        <StepDots current={currentIndex} />
      </div>

      {/* Step content */}
      <div className="relative z-10 w-full max-w-xl flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.2 }}
            className="w-full flex justify-center"
          >
            {step === "welcome" && <WelcomeStep tier={tier} onNext={goNext} />}
            {step === "stack" && (
              <StackStep
                products={products} setProducts={setProducts}
                severity={severity} setSeverity={setSeverity}
                keywords={keywords} setKeywords={setKeywords}
                tier={tier} onBack={goBack} onNext={goNext}
              />
            )}
            {step === "threats" && (
              <ThreatsStep
                feeds={feeds} setFeeds={setFeeds}
                tier={tier} onBack={goBack} onNext={goNext}
              />
            )}
            {step === "news" && (
              <NewsStep
                newsEnabled={newsEnabled} setNewsEnabled={setNewsEnabled}
                sources={newsSources} setSources={setNewsSources}
                digest={digest} setDigest={setDigest}
                onBack={goBack} onNext={goNext}
              />
            )}
            {step === "monitoring" && (
              <MonitoringStep
                domains={domains} setDomains={setDomains}
                subdomains={subdomains} setSubdomains={setSubdomains}
                ports={ports} setPorts={setPorts}
                certs={certs} setCerts={setCerts}
                tier={tier} onBack={goBack} onNext={goNext}
              />
            )}
            {step === "done" && <DoneStep />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
