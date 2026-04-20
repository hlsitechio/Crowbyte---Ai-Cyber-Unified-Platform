import { safeRedirect } from '@/lib/safe-redirect';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  UilArrowLeft, UilShield, UilLock, UilCheckCircle, UilBolt,
  UilSync, UilCreditCard, UilStar, UilCoins, UilShieldCheck as UilFingerprint,
} from '@iconscout/react-unicons';
import { supabase } from '@/integrations/supabase/client';
import { getPacks, purchasePack, type CreditPack } from '@/services/credits';

// Anti-clickjacking
if (window.top !== window.self) {
  window.top!.location = window.self.location;
}

const API_BASE = import.meta.env.VITE_API_URL || 'https://crowbyte.io';

interface Plan {
  id: string;
  name: string;
  price: number;
  period: 'monthly' | 'annual';
  monthlyEquiv: number;
  features: string[];
  badge?: string;
  color: 'blue' | 'orange';
}

const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    period: 'monthly',
    monthlyEquiv: 0,
    color: 'blue',
    features: [
      '50 AI credits/day',
      '3 models included',
      'Unlimited messages',
      'CVE Database: Full access',
      'Knowledge Base: 50 entries',
      'Mission Planner: 3 missions',
      'Bookmarks: Unlimited',
    ],
  },
  {
    id: 'pro-monthly',
    name: 'Pro',
    price: 19,
    period: 'monthly',
    monthlyEquiv: 19,
    color: 'blue',
    features: [
      '1,000 AI credits/month',
      'Web + Desktop App',
      'Multiple AI Models',
      'Red Team Ops',
      'Cyber Ops Toolkit',
      'Network Scanner',
      'Agent Builder',
      'Priority email support',
    ],
  },
  {
    id: 'pro-annual',
    name: 'Pro',
    price: 190,
    period: 'annual',
    monthlyEquiv: 15.83,
    color: 'blue',
    badge: 'Save 17%',
    features: [
      '1,000 AI credits/month',
      'Web + Desktop App',
      'Multiple AI Models',
      'Red Team Ops',
      'Cyber Ops Toolkit',
      'Network Scanner',
      'Agent Builder',
      'Priority email support',
    ],
  },
  {
    id: 'elite-monthly',
    name: 'Elite',
    price: 49,
    period: 'monthly',
    monthlyEquiv: 49,
    color: 'orange',
    features: [
      '5,000 AI credits/month',
      'Everything in Pro',
      'Priority AI access',
      'Early access to new features',
      'Higher rate limits',
      'Fleet Management',
      'Security Monitor',
      'Dedicated support',
    ],
  },
  {
    id: 'elite-annual',
    name: 'Elite',
    price: 490,
    period: 'annual',
    monthlyEquiv: 40.83,
    color: 'orange',
    badge: 'Save 17%',
    features: [
      '5,000 AI credits/month',
      'Everything in Pro',
      'Priority AI access',
      'Early access to new features',
      'Higher rate limits',
      'Fleet Management',
      'Security Monitor',
      'Dedicated support',
    ],
  },
];

export default function Checkout() {
  const [searchParams] = useSearchParams();
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly');
  const [selectedPlan, setSelectedPlan] = useState('pro-monthly');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [glitchText, setGlitchText] = useState('');
  const [creditPacks, setCreditPacks] = useState<CreditPack[]>([]);
  const [purchasingPack, setPurchasingPack] = useState<string | null>(null);

  // Check for return from Stripe
  const status = searchParams.get('status');
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    const text = '> initiating secure checkout...';
    let i = 0;
    const iv = setInterval(() => { setGlitchText(text.slice(0, ++i)); if (i >= text.length) clearInterval(iv); }, 40);
    getPacks().then(setCreditPacks);
    return () => clearInterval(iv);
  }, []);

  const handleBuyPack = async (pack: CreditPack) => {
    setPurchasingPack(pack.id);
    const url = await purchasePack(pack.id);
    if (url) safeRedirect(url);
    else { setError('Failed to create checkout'); setPurchasingPack(null); }
  };

  const filteredPlans = PLANS.filter(p => p.id === 'free' || p.period === billing);
  const activePlan = PLANS.find(p => p.id === selectedPlan);

  const handleCheckout = async () => {
    if (!activePlan) return;

    // Free plan → redirect to auth (no Stripe)
    if (activePlan.id === 'free') {
      window.location.href = '/auth';
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data: { session: _authSession } } = await supabase.auth.getSession();
      const user = _authSession?.user ?? null;

      const res = await fetch(`${API_BASE}/api/stripe/create-checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: activePlan.id,
          userId: user?.id || null,
          userEmail: user?.email || null,
        }),
      });

      const data = await res.json();
      if (!data.url) throw new Error(data.error || 'Failed to create checkout session');

      // Redirect to Stripe Checkout
      safeRedirect(data.url);
    } catch (e: any) {
      setError(e.message || 'Checkout failed');
      setLoading(false);
    }
  };

  // ── Success state ──
  if (status === 'success') {
    return (
      <div className="min-h-screen bg-[#09090b] text-zinc-400 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'linear-gradient(rgba(59,130,246,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.3) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }} />
        <div className="relative max-w-lg mx-auto px-5 py-24 text-center">
          <div className="rounded-xl bg-green-500/5 border border-green-500/10 px-8 py-10">
            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-6">
              <UilCheckCircle className="w-8 h-8 text-green-400" />
            </div>
            <h2 className="font-['JetBrains_Mono'] text-xl font-bold text-white mb-2">Payment complete</h2>
            <p className="font-['JetBrains_Mono'] text-sm text-zinc-400 mb-6">
              Your subscription is now active. Welcome to CrowByte.
            </p>
            {sessionId && (
              <div className="bg-black/30 border border-white/[0.06] rounded-lg p-4 text-left mb-6 font-['JetBrains_Mono'] text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Session</span>
                  <span className="text-blue-400 truncate ml-4 max-w-[240px]">{sessionId}</span>
                </div>
              </div>
            )}
            <button
              onClick={() => { window.location.href = '/settings/onboarding'; }}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-['JetBrains_Mono'] font-semibold text-sm py-3 rounded-lg transition-all cursor-pointer"
            >
              Set Up Your Workspace
            </button>
            <button
              onClick={() => { window.location.href = '/dashboard'; }}
              className="w-full mt-3 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] text-zinc-400 font-['JetBrains_Mono'] text-sm py-3 rounded-lg transition-all cursor-pointer"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Cancelled state ──
  if (status === 'cancelled') {
    return (
      <div className="min-h-screen bg-[#09090b] text-zinc-400 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'linear-gradient(rgba(59,130,246,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.3) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }} />
        <div className="relative max-w-lg mx-auto px-5 py-24 text-center">
          <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] px-8 py-10">
            <h2 className="font-['JetBrains_Mono'] text-xl font-bold text-white mb-2">Payment cancelled</h2>
            <p className="font-['JetBrains_Mono'] text-sm text-zinc-400 mb-6">No charges were made. You can try again anytime.</p>
            <button
              onClick={() => { window.location.href = '/payments'; }}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-['JetBrains_Mono'] font-semibold text-sm py-3 rounded-lg transition-all cursor-pointer"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Plan selection ──
  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-400 relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: 'linear-gradient(rgba(59,130,246,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.3) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }} />

      <div className="relative max-w-4xl mx-auto px-5 py-12">
        {/* Back */}
        <button onClick={() => { window.location.href = '/'; }}
          className="inline-flex items-center gap-1.5 text-xs text-zinc-600 hover:text-blue-500 transition-colors mb-8 font-['JetBrains_Mono'] cursor-pointer">
          <UilArrowLeft className="w-3.5 h-3.5" />
          Back to CrowByte
        </button>

        {/* Logo */}
        <div className="flex items-center gap-3 mb-4">
          <img src="/crowbyte-logo.png" alt="CrowByte" className="w-10 h-10 object-contain" />
          <span className="text-xl font-bold text-white tracking-tight font-['JetBrains_Mono']">Crow<span className="text-blue-500">Byte</span></span>
        </div>

        <div className="font-['JetBrains_Mono'] text-sm text-green-500/70 mb-8">{glitchText}<span className="animate-pulse">_</span></div>

        {/* Trust badges */}
        <div className="flex items-center gap-6 mb-10">
          <div className="flex items-center gap-2 text-xs text-zinc-600"><UilLock className="w-3.5 h-3.5 text-green-500/60" /><span className="font-['JetBrains_Mono']">TLS 1.3</span></div>
          <div className="flex items-center gap-2 text-xs text-zinc-600"><UilShield className="w-3.5 h-3.5 text-blue-500/60" /><span className="font-['JetBrains_Mono']">Stripe Secured</span></div>
          <div className="flex items-center gap-2 text-xs text-zinc-600"><UilShield className="w-3.5 h-3.5 text-orange-500/60" /><span className="font-['JetBrains_Mono']">PCI DSS Level 1</span></div>
        </div>

        {/* Billing toggle */}
        <div className="flex items-center gap-3 mb-8">
          {(['monthly', 'annual'] as const).map(b => (
            <button key={b} onClick={() => { setBilling(b); if (selectedPlan !== 'free') setSelectedPlan(selectedPlan.replace(b === 'monthly' ? 'annual' : 'monthly', b)); }}
              className={`font-['JetBrains_Mono'] text-sm px-4 py-2 rounded-lg transition-all cursor-pointer flex items-center gap-2 ${billing === b ? 'bg-white/[0.06] text-white border border-white/[0.12]' : 'text-zinc-500 hover:text-zinc-400'}`}>
              {b.charAt(0).toUpperCase() + b.slice(1)}
              {b === 'annual' && <span className="text-[10px] bg-green-500/10 text-green-400 px-1.5 py-0.5 rounded-full">-17%</span>}
            </button>
          ))}
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          {filteredPlans.map((plan) => (
            <button key={plan.id} onClick={() => setSelectedPlan(plan.id)}
              className={`relative text-left p-6 rounded-xl border transition-all cursor-pointer ${selectedPlan === plan.id
                ? plan.color === 'orange' ? 'bg-orange-500/[0.04] ring-1 ring-orange-500/20' : 'bg-blue-500/[0.04] ring-1 ring-blue-500/20'
                : 'bg-white/[0.02] border-white/[0.06] hover:border-white/[0.12]'}`}>
              {plan.badge && <span className="absolute top-4 right-4 text-[10px] bg-orange-500/10 text-orange-400 px-2 py-0.5 rounded-full font-['JetBrains_Mono']">{plan.badge}</span>}
              <div className="flex items-center gap-2 mb-1">
                <UilBolt className={`w-4 h-4 ${plan.color === 'orange' ? 'text-orange-500' : 'text-blue-500'}`} />
                <h3 className="font-['JetBrains_Mono'] text-lg font-bold text-white">{plan.name}</h3>
              </div>
              <div className="flex items-baseline gap-1 mb-4">
                {plan.id === 'free' ? (
                  <span className="text-3xl font-bold text-white font-['JetBrains_Mono']">Free</span>
                ) : (
                  <>
                    <span className="text-3xl font-bold text-white font-['JetBrains_Mono']">${plan.price}</span>
                    <span className="text-xs text-zinc-500 font-['JetBrains_Mono']">/{plan.period === 'annual' ? 'yr' : 'mo'}</span>
                    {plan.period === 'annual' && <span className="text-xs text-zinc-600 font-['JetBrains_Mono'] ml-2">(${plan.monthlyEquiv.toFixed(2)}/mo)</span>}
                  </>
                )}
              </div>
              <ul className="space-y-2">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-xs font-['JetBrains_Mono']">
                    <UilCheckCircle className={`w-3 h-3 shrink-0 mt-0.5 ${plan.color === 'orange' ? 'text-orange-500' : 'text-blue-500'}`} />
                    <span className="text-zinc-400">{f}</span>
                  </li>
                ))}
              </ul>
            </button>
          ))}
        </div>

        {error && <p className="text-red-400 font-['JetBrains_Mono'] text-xs mb-4 text-center">{error}</p>}

        {/* Checkout CTA */}
        <button onClick={handleCheckout} disabled={!activePlan || loading}
          className="w-full h-11 flex items-center justify-center gap-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-['JetBrains_Mono'] font-semibold text-sm rounded-lg transition-colors duration-150 cursor-pointer border">
          {loading ? (
            <UilSync className="w-4 h-4 animate-spin" />
          ) : (
            <span>{activePlan?.id === 'free' ? 'Subscribe — Free' : `Subscribe — $${activePlan?.price || 0}/${activePlan?.period === 'annual' ? 'yr' : 'mo'}`}</span>
          )}
        </button>

        <p className="text-center font-['JetBrains_Mono'] text-[10px] text-zinc-600 mt-4">
          {activePlan?.id === 'free' ? 'Create your free account to get started.' : "You'll be redirected to Stripe's secure checkout page."}
        </p>

        {/* ── Credit Packs ── */}
        {creditPacks.length > 0 && (
          <div className="mt-14">
            <div className="flex items-center gap-2 mb-6">
              <UilCoins className="w-5 h-5 text-cyan-500" />
              <h2 className="font-['JetBrains_Mono'] text-lg font-bold text-white">AI Credit Packs</h2>
            </div>
            <p className="font-['JetBrains_Mono'] text-xs text-zinc-500 mb-6 -mt-4">
              Top up your wallet. Credits never expire. Works with any plan.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {creditPacks.map((pack, idx) => {
                const perCredit = (pack.price_usd / pack.credits * 100).toFixed(1);
                const isBest = idx === 2;
                return (
                  <button
                    key={pack.id}
                    onClick={() => handleBuyPack(pack)}
                    disabled={purchasingPack === pack.id}
                    className={`relative rounded-xl p-4 flex flex-col items-center text-center transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98] ${
                      isBest
                        ? 'bg-cyan-500/[0.06] border hover:border-cyan-500/50'
                        : 'bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12]'
                    }`}
                  >
                    {isBest && (
                      <span className="absolute -top-2.5 bg-cyan-500 text-white text-[9px] font-['JetBrains_Mono'] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                        <UilStar className="w-2.5 h-2.5" /> BEST VALUE
                      </span>
                    )}
                    <span className="font-['JetBrains_Mono'] text-sm font-semibold text-zinc-200 mt-1">{pack.name}</span>
                    <span className="font-['JetBrains_Mono'] text-2xl font-bold text-white mt-2">{pack.credits.toLocaleString()}</span>
                    <span className="font-['JetBrains_Mono'] text-[10px] text-zinc-500 uppercase tracking-wider">credits</span>
                    <span className="font-['JetBrains_Mono'] text-lg font-bold text-zinc-200 mt-3">${pack.price_usd}</span>
                    <span className="font-['JetBrains_Mono'] text-[10px] text-zinc-500">{perCredit}¢ / credit</span>
                    <span className={`mt-3 w-full py-2 rounded-lg font-['JetBrains_Mono'] text-xs font-medium transition-colors ${
                      purchasingPack === pack.id
                        ? 'bg-zinc-800 text-zinc-500'
                        : isBest
                          ? 'bg-cyan-600 hover:bg-cyan-500 text-white'
                          : 'bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 border border-white/[0.08]'
                    }`}>
                      {purchasingPack === pack.id ? (
                        <UilSync className="w-3 h-3 animate-spin mx-auto" />
                      ) : 'Buy'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Security info */}
        <div className="bg-black/40 border border-green-500/10 rounded-lg p-4 mt-6 font-['JetBrains_Mono'] text-[11px] leading-relaxed">
          <div className="flex items-center gap-2 mb-2"><UilFingerprint className="w-3.5 h-3.5 text-green-500/60" /><span className="text-green-500/70 font-semibold uppercase tracking-wider text-[10px]">Security</span></div>
          <p className="text-green-500/40">[*] Payment processed by Stripe (PCI DSS Level 1)</p>
          <p className="text-green-500/40">[*] CrowByte never sees or stores your card details</p>
          <p className="text-green-500/50">[+] Cancel anytime from your account settings</p>
        </div>

        {/* Legal links */}
        <div className="flex items-center justify-center gap-4 mt-6">
          {[['Refund Policy', '/refund'], ['Terms of Service', '/terms'], ['Privacy Policy', '/privacy']].map(([label, href], i) => (
            <span key={label as string}>
              <button onClick={() => { safeRedirect(href as string); }} className="font-['JetBrains_Mono'] text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors cursor-pointer">{label}</button>
              {i < 2 && <span className="text-zinc-800 ml-4">&middot;</span>}
            </span>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-white/[0.04] flex flex-wrap items-center justify-center gap-8">
          <button onClick={() => { window.location.href = '/refund'; }} className="flex items-center gap-2 text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors font-['JetBrains_Mono'] cursor-pointer"><UilShield className="w-3.5 h-3.5" />14-day money-back guarantee</button>
          <div className="flex items-center gap-2 text-[11px] text-zinc-600 font-['JetBrains_Mono']"><UilLock className="w-3.5 h-3.5" />256-bit TLS encryption</div>
          <div className="flex items-center gap-2 text-[11px] text-zinc-600 font-['JetBrains_Mono']"><UilCreditCard className="w-3.5 h-3.5" />Stripe Checkout</div>
        </div>
      </div>
    </div>
  );
}
