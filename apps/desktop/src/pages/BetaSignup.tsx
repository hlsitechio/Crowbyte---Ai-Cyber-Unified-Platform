/**
 * /beta — Public beta signup page (no auth required)
 * Collects email for desktop beta + early bird pricing ($15/mo)
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { UilCheck, UilRocket, UilShield, UilWindow, UilBrain, UilUsersAlt, UilBolt, UilArrowRight, UilLock } from "@iconscout/react-unicons";
const API_BASE = import.meta.env.VITE_APP_URL || '';

const BETA_PERKS = [
  { icon: UilBolt, text: 'All 7 AI models — unlimited messages' },
  { icon: UilWindow, text: 'Desktop app — Linux, Windows, macOS' },
  { icon: UilBrain, text: '3 custom AI agents' },
  { icon: UilShield, text: 'Fleet management & network scanner' },
  { icon: UilUsersAlt, text: 'Priority support' },
  { icon: UilLock, text: 'Locked-in $15/mo — forever (regular $19)' },
];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  }),
};

export default function BetaSignup() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [useCase, setUseCase] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [count, setCount] = useState<number | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE}/api/beta-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          reason: useCase || null,
          name: name || null,
          source: 'beta-page',
          promo: 'early-bird-15',
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Request failed');
      }

      const data = await res.json();
      if (data.count) setCount(data.count);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-background text-white font-['JetBrains_Mono'] overflow-x-hidden">
      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/[0.06] bg-background/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-3">
          <a href="/" className="text-lg font-bold text-white">
            Crow<span className="text-orange-500">Byte</span>
          </a>
          <a
            href="/auth"
            className="text-xs text-zinc-400 hover:text-white border border-white/[0.1] hover:border-white/[0.2] px-4 py-2 rounded-full transition-all"
          >
            Sign in
          </a>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 pt-28 pb-20">
        <div className="grid lg:grid-cols-2 gap-16 items-start">

          {/* Left — Value prop */}
          <motion.div
            initial="hidden"
            animate="visible"
            className="space-y-8"
          >
            <motion.div variants={fadeUp} custom={0}>
              <span className="inline-flex items-center gap-2 text-[11px] text-orange-400 bg-orange-500/10 rounded-full px-3 py-1 mb-6">
                <UilRocket size={12} />
                EARLY ACCESS — LIMITED SPOTS
              </span>

              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-[1.1] mt-4">
                <span className="text-white">CrowByte</span>{' '}
                <span className="text-blue-400">Pro</span>
                <br />
                <span className="text-zinc-500 text-2xl sm:text-3xl">Desktop Beta</span>
              </h1>
            </motion.div>

            <motion.p variants={fadeUp} custom={1} className="text-sm text-zinc-400 leading-relaxed max-w-md">
              Get early access to the full CrowByte desktop app — integrated terminal, fleet management,
              network scanner, and all AI models. Lock in the early bird price forever.
            </motion.p>

            {/* Pricing callout */}
            <motion.div variants={fadeUp} custom={2} className="flex items-baseline gap-3">
              <span className="text-4xl font-bold text-white">$15</span>
              <span className="text-sm text-zinc-500">/mo</span>
              <span className="text-sm text-zinc-600 line-through ml-2">$19/mo</span>
              <span className="text-[10px] text-orange-400 bg-orange-500/10 rounded px-2 py-0.5 ml-1">
                EARLY BIRD
              </span>
            </motion.div>

            {/* Perks */}
            <motion.ul variants={fadeUp} custom={3} className="space-y-3">
              {BETA_PERKS.map((perk) => (
                <li key={perk.text} className="flex items-center gap-3">
                  <div className="p-1.5 rounded-md bg-blue-500/10 border border-blue-500/10">
                    <perk.icon size={14} className="text-blue-400" />
                  </div>
                  <span className="text-xs text-zinc-300">{perk.text}</span>
                </li>
              ))}
            </motion.ul>

            {/* Social proof / counter */}
            <motion.div variants={fadeUp} custom={4} className="flex items-center gap-3 pt-2">
              <div className="flex -space-x-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="w-7 h-7 rounded-full bg-zinc-800 border-2 border-[#0a0a0a] flex items-center justify-center">
                    <span className="text-[9px] text-zinc-500">{['🔒', '💀', '🐛', '⚡'][i]}</span>
                  </div>
                ))}
              </div>
              <span className="text-[11px] text-zinc-500">
                Join security professionals on the waitlist
              </span>
            </motion.div>
          </motion.div>

          {/* Right — Signup form */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            {done ? (
              <div className="rounded-xl bg-emerald-500/5 p-8 text-center">
                <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-5">
                  <UilCheck size={28} className="text-emerald-400" />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">You're on the list!</h2>
                <p className="text-sm text-zinc-400 mb-4">
                  We'll email <span className="text-zinc-200">{email}</span> when your beta spot opens.
                </p>
                <p className="text-xs text-zinc-500 mb-6">
                  Your early bird price of <span className="text-orange-400 font-bold">$15/mo</span> is locked in.
                </p>
                {count && (
                  <div className="inline-flex items-center gap-2 text-[11px] text-blue-400 bg-blue-500/10 rounded-full px-4 py-1.5">
                    <UilUsersAlt size={12} />
                    #{count} on the waitlist
                  </div>
                )}
                <div className="mt-8">
                  <a
                    href="/"
                    className="text-xs text-zinc-500 hover:text-zinc-300 underline underline-offset-4 transition-colors"
                  >
                    ← Back to crowbyte.io
                  </a>
                </div>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-6 sm:p-8 space-y-5"
              >
                <div>
                  <h2 className="text-lg font-bold text-white mb-1">Request Beta Access</h2>
                  <p className="text-xs text-zinc-500">Get notified when a spot opens. No payment now.</p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] text-zinc-500 uppercase tracking-wider mb-1.5">
                      Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="hunter@example.com"
                      className="w-full bg-zinc-900/60 border border-white/[0.08] rounded-lg px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/40 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-zinc-500 uppercase tracking-wider mb-1.5">
                      Name
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Optional"
                      className="w-full bg-zinc-900/60 border border-white/[0.08] rounded-lg px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/40 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-zinc-500 uppercase tracking-wider mb-1.5">
                      What will you use CrowByte for?
                    </label>
                    <textarea
                      value={useCase}
                      onChange={(e) => setUseCase(e.target.value)}
                      placeholder="UilBug bounty, pentesting, red team, CTFs..."
                      rows={3}
                      className="w-full bg-zinc-900/60 border border-white/[0.08] rounded-lg px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/40 transition-colors resize-none"
                    />
                  </div>
                </div>

                {error && (
                  <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/10 rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submitting || !email}
                  className="w-full bg-orange-500 hover:bg-orange-400 disabled:opacity-50 disabled:hover:bg-orange-500 text-black font-semibold text-sm py-3.5 rounded-full transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <span className="animate-pulse">Submitting...</span>
                  ) : (
                    <>
                      Join the Beta Waitlist
                      <UilArrowRight size={16} />
                    </>
                  )}
                </button>

                <p className="text-[10px] text-zinc-600 text-center">
                  No spam. We'll only email you about beta access.
                  <br />
                  Early bird pricing ($15/mo) locked for all waitlist members.
                </p>
              </form>
            )}
          </motion.div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] py-6 text-center">
        <p className="text-[11px] text-zinc-600">
          © 2026 HLSITech Inc. — <a href="/" className="hover:text-zinc-400 transition-colors">crowbyte.io</a>
        </p>
      </footer>
    </div>
  );
}
