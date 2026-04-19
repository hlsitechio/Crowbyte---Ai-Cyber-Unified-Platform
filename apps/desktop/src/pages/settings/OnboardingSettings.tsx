/**
 * Onboarding Settings — Guided workspace setup within Settings.
 * Wraps PreferencesWizard steps as inline settings panels.
 * Accessible via /settings/onboarding (linked from Onboarding "Ready" step).
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
  UilRocket,
  UilCog,
  UilKeySkeleton,
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

type Step = "stack" | "threats" | "news" | "monitoring" | "done";
const STEPS: Step[] = ["stack", "threats", "news", "monitoring", "done"];

const STEP_META: Record<Step, { title: string; desc: string; icon: React.ElementType }> = {
  stack: { title: "Security UilLayerGroup", desc: "Select the products and technologies you want to monitor for vulnerabilities.", icon: UilShield },
  threats: { title: "Threat Intel Feeds", desc: "Choose which threat intelligence feeds to subscribe to.", icon: UilGlobe },
  news: { title: "News & Alerts", desc: "Select security news sources for your daily digest.", icon: UilNewspaper },
  monitoring: { title: "Attack Surface Monitoring", desc: "Configure domains and assets for continuous monitoring.", icon: UilFocusTarget },
  done: { title: "Setup Complete", desc: "Your workspace is configured and ready.", icon: UilCheck },
};

// ─── Progress Bar ───────────────────────────────────────────────────────────

function ProgressBar({ current }: { current: number }) {
  const pct = ((current + 1) / STEPS.length) * 100;
  return (
    <div className="w-full h-1 bg-white/[0.06] rounded-full overflow-hidden">
      <motion.div
        className="h-full bg-blue-500 rounded-full"
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.4 }}
      />
    </div>
  );
}

// ─── Selectable Card Grid ───────────────────────────────────────────────────

function SelectableGrid({
  items,
  selected,
  onToggle,
  searchable = false,
}: {
  items: { id: string; name: string; description?: string; category?: string }[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  searchable?: boolean;
}) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search) return items;
    const q = search.toLowerCase();
    return items.filter(
      (i) => i.name.toLowerCase().includes(q) || i.description?.toLowerCase().includes(q) || i.category?.toLowerCase().includes(q)
    );
  }, [items, search]);

  return (
    <div className="space-y-3">
      {searchable && (
        <div className="relative">
          <UilSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="w-full h-9 pl-9 pr-8 bg-white/[0.03] border border-white/[0.08] rounded-lg text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/50"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white">
              <UilTimes size={12} />
            </button>
          )}
        </div>
      )}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 max-h-[360px] overflow-y-auto pr-1">
        {filtered.map((item) => {
          const active = selected.has(item.id);
          return (
            <button
              key={item.id}
              onClick={() => onToggle(item.id)}
              className={`text-left p-3 rounded-lg border transition-all ${
                active
                  ? "border-blue-500/40 bg-blue-500/[0.08]"
                  : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-medium ${active ? "text-blue-300" : "text-white"}`}>{item.name}</span>
                {active && <UilCheck size={12} className="text-blue-400" />}
              </div>
              {item.description && <div className="text-[10px] text-zinc-500 line-clamp-2">{item.description}</div>}
            </button>
          );
        })}
      </div>
      <div className="text-xs text-zinc-600">{selected.size} selected</div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function OnboardingSettings() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("stack");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tier, setTier] = useState<Tier>("free");

  // Selections
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [selectedFeeds, setSelectedFeeds] = useState<Set<string>>(new Set());
  const [selectedNews, setSelectedNews] = useState<Set<string>>(new Set());
  const [monitorDomains, setMonitorDomains] = useState("");
  const [monitorPorts, setMonitorPorts] = useState("80,443,8080,8443");

  // Load existing preferences
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const sub = await getSubscription();
        if (sub?.tier) setTier(sub.tier);
        const prefs = await getPreferences();
        if (prefs) {
          if (prefs.products?.length) setSelectedProducts(new Set(prefs.products));
          if (prefs.threat_feeds?.length) setSelectedFeeds(new Set(prefs.threat_feeds));
          if (prefs.news_sources?.length) setSelectedNews(new Set(prefs.news_sources));
          if (prefs.monitor_domains) setMonitorDomains(prefs.monitor_domains.join("\n"));
          if (prefs.monitor_ports) setMonitorPorts(prefs.monitor_ports);
        }
      } catch { /* empty */ }
      setLoading(false);
    })();
  }, []);

  const stepIdx = STEPS.indexOf(step);
  const meta = STEP_META[step];

  const goNext = () => {
    const next = STEPS[stepIdx + 1];
    if (next) setStep(next);
  };

  const goBack = () => {
    const prev = STEPS[stepIdx - 1];
    if (prev) setStep(prev);
  };

  const toggleItem = (set: Set<string>, setter: (s: Set<string>) => void) => (id: string) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setter(next);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const domains = monitorDomains
        .split("\n")
        .map((d) => d.trim())
        .filter(Boolean);

      await updatePreferences({
        products: Array.from(selectedProducts),
        threat_feeds: Array.from(selectedFeeds),
        news_sources: Array.from(selectedNews),
        monitor_domains: domains,
        monitor_ports: monitorPorts,
        onboarding_complete: true,
      });

      setStep("done");
    } catch (err) {
      console.error("[OnboardingSettings] Save failed:", err);
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <motion.div
          className="w-6 h-6 border-2 border-t-blue-500 rounded-full"
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
          <UilRocket size={18} className="text-blue-400" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">Workspace Setup</h2>
          <p className="text-xs text-zinc-500">Configure your security monitoring and intelligence preferences</p>
        </div>
      </div>

      {/* Progress */}
      <div className="space-y-2">
        <ProgressBar current={stepIdx} />
        <div className="flex justify-between text-[10px] text-zinc-600">
          {STEPS.map((s, i) => (
            <span key={s} className={i <= stepIdx ? "text-blue-400" : ""}>
              {STEP_META[s].title}
            </span>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          className="p-6 rounded-xl border border-white/[0.06] bg-white/[0.02]"
        >
          {step !== "done" && (
            <div className="flex items-center gap-2 mb-4">
              <meta.icon size={16} className="text-blue-400" />
              <h3 className="text-sm font-semibold text-white">{meta.title}</h3>
              <span className="text-[10px] text-zinc-500 ml-auto">Step {stepIdx + 1} of {STEPS.length - 1}</span>
            </div>
          )}

          {step === "stack" && (
            <SelectableGrid
              items={PRODUCT_CATALOG.map((p) => ({ id: p.id, name: p.name, description: p.vendor, category: p.category }))}
              selected={selectedProducts}
              onToggle={toggleItem(selectedProducts, setSelectedProducts)}
              searchable
            />
          )}

          {step === "threats" && (
            <SelectableGrid
              items={THREAT_FEEDS.map((f) => ({ id: f.id, name: f.name, description: f.description, category: f.category }))}
              selected={selectedFeeds}
              onToggle={toggleItem(selectedFeeds, setSelectedFeeds)}
              searchable
            />
          )}

          {step === "news" && (
            <SelectableGrid
              items={NEWS_SOURCES.map((n) => ({ id: n.id, name: n.name, description: n.description }))}
              selected={selectedNews}
              onToggle={toggleItem(selectedNews, setSelectedNews)}
            />
          )}

          {step === "monitoring" && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-zinc-400 block mb-1.5">Domains to Monitor</label>
                <textarea
                  value={monitorDomains}
                  onChange={(e) => setMonitorDomains(e.target.value)}
                  placeholder={"example.com\napi.example.com\nstaging.example.com"}
                  rows={4}
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg p-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/50 resize-none font-mono"
                />
                <p className="text-[10px] text-zinc-600 mt-1">One domain per line. These will be monitored for changes, new subdomains, and exposed ports.</p>
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-400 block mb-1.5">Port Scan Range</label>
                <input
                  type="text"
                  value={monitorPorts}
                  onChange={(e) => setMonitorPorts(e.target.value)}
                  placeholder="80,443,8080,8443"
                  className="w-full h-9 bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/50 font-mono"
                />
              </div>
            </div>
          )}

          {step === "done" && (
            <div className="text-center py-8 space-y-4">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto"
              >
                <UilCheck size={28} className="text-green-400" />
              </motion.div>
              <h3 className="text-xl font-bold text-white">Workspace Configured</h3>
              <p className="text-sm text-zinc-400 max-w-md mx-auto">
                Your security monitoring preferences have been saved. AI agents will start collecting intelligence based on your selections.
              </p>
              <button
                onClick={() => navigate("/dashboard")}
                className="mt-4 h-10 px-6 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-all inline-flex items-center gap-2"
              >
                Go to Dashboard <UilArrowRight size={14} />
              </button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      {step !== "done" && (
        <div className="flex gap-3">
          {stepIdx > 0 && (
            <button
              onClick={goBack}
              className="h-10 px-5 rounded-xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.06] text-zinc-400 text-sm font-medium transition-all flex items-center gap-2"
            >
              <UilArrowLeft size={14} /> Back
            </button>
          )}
          <button
            onClick={step === "monitoring" ? handleSave : goNext}
            disabled={saving}
            className="flex-1 h-10 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white text-sm font-medium transition-all flex items-center justify-center gap-2"
          >
            {saving ? (
              <motion.div
                className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
              />
            ) : step === "monitoring" ? (
              <>Save & Finish <UilCheck size={14} /></>
            ) : (
              <>Continue <UilArrowRight size={14} /></>
            )}
          </button>
        </div>
      )}

      {/* Skip option */}
      {step !== "done" && (
        <p className="text-center text-xs text-zinc-600">
          <button onClick={() => navigate("/dashboard")} className="hover:text-zinc-400 transition-colors underline underline-offset-2">
            Skip setup — I'll configure later
          </button>
        </p>
      )}
    </div>
  );
}
