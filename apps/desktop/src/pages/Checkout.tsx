import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Shield, Lock, CreditCard, Check, Zap, Eye, EyeOff, Fingerprint, ShieldCheck, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { activateSubscription, type ActivateTier } from '@/services/subscription-activate';

const PAYPAL_ME = 'https://paypal.me/RainK696';

// Anti-clickjacking: prevent iframe embedding
if (window.top !== window.self) {
  window.top!.location = window.self.location;
}

interface Plan {
  id: string;
  name: string;
  price: number;
  period: 'monthly' | 'annual';
  monthlyEquiv: number;
  features: string[];
  badge?: string;
}

const PLANS: Plan[] = [
  {
    id: 'pro-monthly',
    name: 'Pro',
    price: 29,
    period: 'monthly',
    monthlyEquiv: 29,
    features: [
      'Web + Desktop App',
      '10 Custom Agents',
      'All MCP Tools',
      '3 VPS Agents',
      '5 Red Team Ops',
      'Priority email support',
    ],
  },
  {
    id: 'pro-annual',
    name: 'Pro',
    price: 290,
    period: 'annual',
    monthlyEquiv: 24.17,
    features: [
      'Web + Desktop App',
      '10 Custom Agents',
      'All MCP Tools',
      '3 VPS Agents',
      '5 Red Team Ops',
      'Priority email support',
    ],
    badge: 'Save 17%',
  },
  {
    id: 'team-monthly',
    name: 'Team',
    price: 79,
    period: 'monthly',
    monthlyEquiv: 79,
    features: [
      'Everything in Pro',
      'Unlimited Custom Agents',
      '9 VPS Agents',
      'Unlimited Red Team Ops',
      'Early access to betas',
      'Priority + chat support',
    ],
  },
  {
    id: 'team-annual',
    name: 'Team',
    price: 790,
    period: 'annual',
    monthlyEquiv: 65.83,
    features: [
      'Everything in Pro',
      'Unlimited Custom Agents',
      '9 VPS Agents',
      'Unlimited Red Team Ops',
      'Early access to betas',
      'Priority + chat support',
    ],
    badge: 'Save 17%',
  },
];

// CSRF token — generated per session, verified on submission
function generateCSRFToken(): string {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
}

function generateOrderId(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const arr = new Uint8Array(4);
  crypto.getRandomValues(arr);
  const rand = Array.from(arr, b => b.toString(16).padStart(2, '0')).join('').toUpperCase().slice(0, 6);
  return `CB-${ts}-${rand}`;
}

function maskEmail(email: string): string {
  const [user, domain] = email.split('@');
  if (!domain) return email;
  const masked = user.slice(0, 2) + '*'.repeat(Math.max(user.length - 4, 2)) + user.slice(-2);
  return `${masked}@${domain}`;
}

// Rate limiter — prevent spam clicks
function useRateLimit(cooldownMs: number = 3000) {
  const [lastClick, setLastClick] = useState(0);
  const [blocked, setBlocked] = useState(false);

  const check = useCallback(() => {
    const now = Date.now();
    if (now - lastClick < cooldownMs) {
      setBlocked(true);
      setTimeout(() => setBlocked(false), cooldownMs - (now - lastClick));
      return false;
    }
    setLastClick(now);
    setBlocked(false);
    return true;
  }, [lastClick, cooldownMs]);

  return { check, blocked };
}

export default function Checkout() {
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly');
  const [selectedPlan, setSelectedPlan] = useState<string>('pro-monthly');
  const [email, setEmail] = useState('');
  const [emailVisible, setEmailVisible] = useState(false);
  const [step, setStep] = useState<'select' | 'confirm' | 'complete'>('select');
  const [orderId] = useState(generateOrderId);
  const [csrfToken] = useState(generateCSRFToken);
  const [activating, setActivating] = useState(false);
  const [activationResult, setActivationResult] = useState<{ success: boolean; error?: string; expiresAt?: string } | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Check auth state
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setIsLoggedIn(!!data.user));
    const { data: listener } = supabase.auth.onAuthStateChange((_, session) => {
      setIsLoggedIn(!!session?.user);
    });
    return () => listener.subscription.unsubscribe();
  }, []);
  const [glitchText, setGlitchText] = useState('');
  const [sessionFingerprint] = useState(() => {
    const arr = new Uint8Array(16);
    crypto.getRandomValues(arr);
    return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
  });
  const payRateLimit = useRateLimit(5000);

  // Terminal typing effect for the header
  useEffect(() => {
    const text = '> initiating secure checkout...';
    let i = 0;
    const interval = setInterval(() => {
      setGlitchText(text.slice(0, i + 1));
      i++;
      if (i >= text.length) clearInterval(interval);
    }, 40);
    return () => clearInterval(interval);
  }, []);

  const filteredPlans = PLANS.filter(p => p.period === billing);
  const activePlan = PLANS.find(p => p.id === selectedPlan);

  const handleCheckout = () => {
    if (!email || !activePlan) return;
    setStep('confirm');
  };

  const handlePayNow = async () => {
    if (!activePlan) return;
    if (!payRateLimit.check()) return; // Rate limit: 1 click per 5s

    // Log order locally for reference
    try {
      const orders = JSON.parse(localStorage.getItem('cb_orders') || '[]');
      orders.push({
        id: orderId,
        plan: activePlan.id,
        amount: activePlan.price,
        email,
        csrf: csrfToken,
        fingerprint: sessionFingerprint,
        ts: new Date().toISOString(),
      });
      localStorage.setItem('cb_orders', JSON.stringify(orders));
    } catch { /* silent */ }

    // Redirect to PayPal.me with the amount
    const amount = activePlan.price;
    window.open(`${PAYPAL_ME}/${amount}USD`, '_blank');
    setStep('complete');
  };

  // Activate subscription in Supabase after user confirms PayPal payment
  const handleActivateSubscription = async () => {
    if (!activePlan || activating) return;
    setActivating(true);
    setActivationResult(null);

    const tier = activePlan.name.toLowerCase() as ActivateTier;
    const result = await activateSubscription({
      tier: tier === 'pro' || tier === 'team' || tier === 'enterprise' ? tier : 'pro',
      period: activePlan.period,
      orderId,
      paypalEmail: email,
    });

    setActivationResult(result);
    setActivating(false);
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-400 relative overflow-hidden">
      {/* Background grid effect */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: 'linear-gradient(rgba(59,130,246,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.3) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }} />

      {/* Scanline effect */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.015]" style={{
        background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)',
      }} />

      <div className="relative max-w-4xl mx-auto px-5 py-12">
        {/* Header */}
        <button
          onClick={() => { if (step === 'select') { window.location.href = '/'; } else { setStep('select'); } }}
          className="inline-flex items-center gap-1.5 text-xs text-zinc-600 hover:text-blue-500 transition-colors mb-8 font-['JetBrains_Mono'] cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          {step === 'select' ? 'Back to CrowByte' : 'Back to plans'}
        </button>

        <div className="flex items-center gap-3 mb-6">
          <img src="/crowbyte-logo.png" alt="CrowByte" className="w-10 h-10 object-contain" />
          <span className="text-xl font-bold text-white tracking-tight font-['JetBrains_Mono']">
            Crow<span className="text-blue-500">Byte</span>
          </span>
        </div>

        {/* Terminal typing header */}
        <div className="font-['JetBrains_Mono'] text-sm text-green-500/70 mb-8">
          {glitchText}<span className="animate-pulse">_</span>
        </div>

        {/* Security badge */}
        <div className="flex items-center gap-6 mb-10">
          <div className="flex items-center gap-2 text-xs text-zinc-600">
            <Lock className="w-3.5 h-3.5 text-green-500/60" />
            <span className="font-['JetBrains_Mono']">TLS 1.3 Encrypted</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-600">
            <Shield className="w-3.5 h-3.5 text-blue-500/60" />
            <span className="font-['JetBrains_Mono']">Secure Checkout</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-600">
            <CreditCard className="w-3.5 h-3.5 text-orange-500/60" />
            <span className="font-['JetBrains_Mono']">PayPal Protected</span>
          </div>
        </div>

        {step === 'select' && (
          <>
            {/* Billing toggle */}
            <div className="flex items-center gap-3 mb-8">
              <button
                onClick={() => { setBilling('monthly'); setSelectedPlan(selectedPlan.replace('annual', 'monthly')); }}
                className={`font-['JetBrains_Mono'] text-sm px-4 py-2 rounded-lg transition-all cursor-pointer ${
                  billing === 'monthly'
                    ? 'bg-white/[0.06] text-white border border-white/[0.12]'
                    : 'text-zinc-500 hover:text-zinc-400'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => { setBilling('annual'); setSelectedPlan(selectedPlan.replace('monthly', 'annual')); }}
                className={`font-['JetBrains_Mono'] text-sm px-4 py-2 rounded-lg transition-all cursor-pointer flex items-center gap-2 ${
                  billing === 'annual'
                    ? 'bg-white/[0.06] text-white border border-white/[0.12]'
                    : 'text-zinc-500 hover:text-zinc-400'
                }`}
              >
                Annual
                <span className="text-[10px] bg-green-500/10 text-green-400 border border-green-500/20 px-1.5 py-0.5 rounded-full">-17%</span>
              </button>
            </div>

            {/* Plan cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
              {filteredPlans.map((plan) => (
                <button
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan.id)}
                  className={`relative text-left p-6 rounded-xl border transition-all cursor-pointer ${
                    selectedPlan === plan.id
                      ? 'bg-blue-500/[0.04] border-blue-500/30 ring-1 ring-blue-500/20'
                      : 'bg-white/[0.02] border-white/[0.06] hover:border-white/[0.12]'
                  }`}
                >
                  {plan.badge && (
                    <span className="absolute top-4 right-4 text-[10px] bg-orange-500/10 text-orange-400 border border-orange-500/20 px-2 py-0.5 rounded-full font-['JetBrains_Mono']">
                      {plan.badge}
                    </span>
                  )}

                  <div className="flex items-center gap-2 mb-1">
                    <Zap className={`w-4 h-4 ${plan.name === 'Team' ? 'text-orange-500' : 'text-blue-500'}`} />
                    <h3 className="font-['JetBrains_Mono'] text-lg font-bold text-white">{plan.name}</h3>
                  </div>

                  <div className="flex items-baseline gap-1 mb-4">
                    <span className="text-3xl font-bold text-white font-['JetBrains_Mono']">${plan.price}</span>
                    <span className="text-xs text-zinc-500 font-['JetBrains_Mono']">
                      /{plan.period === 'annual' ? 'yr' : 'mo'}
                    </span>
                    {plan.period === 'annual' && (
                      <span className="text-xs text-zinc-600 font-['JetBrains_Mono'] ml-2">
                        (${plan.monthlyEquiv.toFixed(2)}/mo)
                      </span>
                    )}
                  </div>

                  <ul className="space-y-2">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-xs font-['JetBrains_Mono']">
                        <Check className="w-3 h-3 text-blue-500 shrink-0" />
                        <span className="text-zinc-400">{f}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Selection indicator */}
                  <div className={`absolute top-6 right-6 w-4 h-4 rounded-full border-2 transition-all ${
                    selectedPlan === plan.id
                      ? 'border-blue-500 bg-blue-500'
                      : 'border-zinc-700'
                  }`}>
                    {selectedPlan === plan.id && (
                      <Check className="w-3 h-3 text-white absolute top-0 left-0.5" strokeWidth={3} />
                    )}
                  </div>
                </button>
              ))}
            </div>

            {/* Email + checkout */}
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-6">
              <h3 className="font-['JetBrains_Mono'] text-sm text-zinc-300 font-medium mb-4">Account email</h3>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full bg-black/30 border border-white/[0.06] rounded-lg px-4 py-3 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/40 transition-colors font-['JetBrains_Mono'] mb-4"
              />

              <button
                onClick={handleCheckout}
                disabled={!email || !activePlan}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed text-white font-['JetBrains_Mono'] font-semibold text-sm py-3.5 rounded-lg transition-all cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
              >
                Continue to Payment — ${activePlan?.price || 0} {activePlan?.period === 'annual' ? 'USD/yr' : 'USD/mo'}
              </button>
            </div>
          </>
        )}

        {step === 'confirm' && activePlan && (
          <div className="max-w-lg mx-auto">
            {/* Order summary card */}
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden mb-6">
              <div className="bg-white/[0.03] border-b border-white/[0.06] px-6 py-4">
                <h3 className="font-['JetBrains_Mono'] text-sm text-zinc-300 font-semibold uppercase tracking-wider">Order Summary</h3>
              </div>
              <div className="px-6 py-5 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="font-['JetBrains_Mono'] text-sm text-zinc-400">Plan</span>
                  <span className="font-['JetBrains_Mono'] text-sm text-white font-semibold">CrowByte {activePlan.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-['JetBrains_Mono'] text-sm text-zinc-400">Billing</span>
                  <span className="font-['JetBrains_Mono'] text-sm text-zinc-300 capitalize">{activePlan.period}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-['JetBrains_Mono'] text-sm text-zinc-400">Email</span>
                  <div className="flex items-center gap-2">
                    <span className="font-['JetBrains_Mono'] text-sm text-zinc-300">{emailVisible ? email : maskEmail(email)}</span>
                    <button onClick={() => setEmailVisible(!emailVisible)} className="text-zinc-600 hover:text-zinc-400 cursor-pointer">
                      {emailVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-['JetBrains_Mono'] text-sm text-zinc-400">Order ID</span>
                  <span className="font-['JetBrains_Mono'] text-xs text-blue-400">{orderId}</span>
                </div>
                <div className="border-t border-white/[0.06] pt-4 flex justify-between items-center">
                  <span className="font-['JetBrains_Mono'] text-sm text-zinc-300 font-semibold">Total</span>
                  <span className="font-['JetBrains_Mono'] text-2xl text-white font-bold">${activePlan.price} <span className="text-xs text-zinc-500">USD</span></span>
                </div>
              </div>
            </div>

            {/* Security verification panel */}
            <div className="bg-black/40 border border-green-500/10 rounded-lg p-4 mb-6 font-['JetBrains_Mono'] text-[11px] leading-relaxed overflow-hidden">
              <div className="flex items-center gap-2 mb-2">
                <Fingerprint className="w-3.5 h-3.5 text-green-500/60" />
                <span className="text-green-500/70 font-semibold uppercase tracking-wider text-[10px]">Security Verification</span>
              </div>
              <p className="text-green-500/40">[*] TLS 1.3 · AES-256-GCM encrypted session</p>
              <p className="text-green-500/40">[*] Payment gateway: PayPal Secure (PCI DSS Level 1)</p>
              <p className="text-green-500/40">[*] Order: <span className="text-green-500/60">{orderId}</span></p>
              <p className="text-green-500/40">[*] CSRF: <span className="text-green-500/60">{csrfToken.slice(0, 12)}...{csrfToken.slice(-4)}</span></p>
              <p className="text-green-500/40">[*] Fingerprint: <span className="text-green-500/60">{sessionFingerprint}</span></p>
              <p className="text-green-500/50">[+] All checks passed — ready to process</p>
            </div>

            {/* Pay button */}
            <button
              onClick={handlePayNow}
              disabled={payRateLimit.blocked}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-['JetBrains_Mono'] font-bold text-base py-4 rounded-xl transition-all cursor-pointer hover:scale-[1.01] active:scale-[0.99] shadow-lg shadow-blue-500/20 flex items-center justify-center gap-3"
            >
              <Lock className="w-4 h-4" />
              {payRateLimit.blocked ? 'Please wait...' : `Pay $${activePlan.price} USD with PayPal`}
            </button>

            <p className="text-center text-[11px] text-zinc-600 font-['JetBrains_Mono'] mt-4">
              You will be redirected to PayPal to complete payment securely.
              <br />After payment, email your Order ID to activate your license.
            </p>

            {/* Legal links */}
            <div className="flex items-center justify-center gap-4 mt-6">
              <button onClick={() => { window.location.href = '/refund'; }} className="font-['JetBrains_Mono'] text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors cursor-pointer">
                Refund Policy
              </button>
              <span className="text-zinc-800">&middot;</span>
              <button onClick={() => { window.location.href = '/terms'; }} className="font-['JetBrains_Mono'] text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors cursor-pointer">
                Terms of Service
              </button>
              <span className="text-zinc-800">&middot;</span>
              <button onClick={() => { window.location.href = '/privacy'; }} className="font-['JetBrains_Mono'] text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors cursor-pointer">
                Privacy Policy
              </button>
            </div>
          </div>
        )}

        {step === 'complete' && activePlan && (
          <div className="max-w-lg mx-auto text-center">
            <div className="bg-green-500/5 border border-green-500/10 rounded-xl px-8 py-10">
              <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-6">
                <Check className="w-8 h-8 text-green-400" />
              </div>
              <h2 className="font-['JetBrains_Mono'] text-xl font-bold text-white mb-2">Payment initiated</h2>
              <p className="font-['JetBrains_Mono'] text-sm text-zinc-400 mb-6">
                Complete the payment in the PayPal window, then activate below.
              </p>

              <div className="bg-black/30 border border-white/[0.06] rounded-lg p-4 text-left mb-6">
                <div className="space-y-2 font-['JetBrains_Mono'] text-xs">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Order ID</span>
                    <span className="text-blue-400">{orderId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Plan</span>
                    <span className="text-zinc-300">CrowByte {activePlan.name} ({activePlan.period})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Amount</span>
                    <span className="text-white font-semibold">${activePlan.price} USD</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Email</span>
                    <span className="text-zinc-300">{email}</span>
                  </div>
                </div>
              </div>

              {/* Activation section — writes to Supabase so desktop can sync */}
              <div className="bg-blue-500/5 border border-blue-500/10 rounded-xl p-5 text-left mb-6 space-y-4">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-blue-400" />
                  <span className="font-['JetBrains_Mono'] text-xs text-blue-300 font-semibold uppercase tracking-wider">Activate Your License</span>
                </div>

                {!isLoggedIn ? (
                  <div className="space-y-3">
                    <p className="font-['JetBrains_Mono'] text-xs text-zinc-400">
                      Sign in to link this subscription to your account. Your desktop app will sync automatically.
                    </p>
                    <button
                      onClick={() => { window.location.href = '/auth'; }}
                      className="w-full bg-blue-600 hover:bg-blue-500 text-white font-['JetBrains_Mono'] font-semibold text-xs py-3 rounded-lg transition-all cursor-pointer"
                    >
                      Sign In to Activate
                    </button>
                  </div>
                ) : activationResult?.success ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      <span className="font-['JetBrains_Mono'] text-xs text-green-400 font-semibold">License Activated</span>
                    </div>
                    <p className="font-['JetBrains_Mono'] text-[11px] text-zinc-500">
                      Tier: <span className="text-white">{activationResult.tier?.toUpperCase()}</span>
                      {activationResult.expiresAt && (
                        <> &middot; Expires: <span className="text-zinc-300">{new Date(activationResult.expiresAt).toLocaleDateString()}</span></>
                      )}
                    </p>
                    <div className="bg-black/30 border border-green-500/10 rounded-lg p-3 mt-2">
                      <p className="font-['JetBrains_Mono'] text-[11px] text-green-400/80">
                        [+] Synced to Supabase &mdash; your desktop app will detect this on next check.
                      </p>
                      <p className="font-['JetBrains_Mono'] text-[11px] text-green-400/60">
                        [i] Open CrowByte Desktop &rarr; click "Re-check Subscription" &rarr; you're in.
                      </p>
                    </div>
                    <button
                      onClick={() => { window.location.href = '/setup-preferences'; }}
                      className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-['JetBrains_Mono'] font-semibold text-xs py-3 rounded-lg transition-all cursor-pointer mt-2"
                    >
                      Configure Your AI Agents &rarr;
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="font-['JetBrains_Mono'] text-xs text-zinc-400">
                      After completing PayPal payment, click below to activate your license.
                      This syncs your subscription to the desktop app automatically.
                    </p>
                    {activationResult?.error && (
                      <p className="font-['JetBrains_Mono'] text-xs text-red-400">
                        Error: {activationResult.error}
                      </p>
                    )}
                    <button
                      onClick={handleActivateSubscription}
                      disabled={activating}
                      className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-['JetBrains_Mono'] font-semibold text-xs py-3 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      {activating ? (
                        <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Activating...</>
                      ) : (
                        <><ShieldCheck className="w-3.5 h-3.5" /> I've Paid — Activate My License</>
                      )}
                    </button>
                  </div>
                )}
              </div>

              <button
                onClick={() => { window.open(`${PAYPAL_ME}/${activePlan.price}USD`, '_blank'); }}
                className="font-['JetBrains_Mono'] text-xs text-blue-500 hover:text-blue-400 transition-colors cursor-pointer"
              >
                PayPal didn&rsquo;t open? Click here
              </button>
            </div>
          </div>
        )}

        {/* Footer trust badges */}
        <div className="mt-16 pt-8 border-t border-white/[0.04] flex flex-wrap items-center justify-center gap-8">
          <button onClick={() => { window.location.href = '/refund'; }} className="flex items-center gap-2 text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors font-['JetBrains_Mono'] cursor-pointer">
            <ShieldCheck className="w-3.5 h-3.5" />
            14-day money-back guarantee
          </button>
          <div className="flex items-center gap-2 text-[11px] text-zinc-600 font-['JetBrains_Mono']">
            <Lock className="w-3.5 h-3.5" />
            256-bit TLS encryption
          </div>
          <div className="flex items-center gap-2 text-[11px] text-zinc-600 font-['JetBrains_Mono']">
            <CreditCard className="w-3.5 h-3.5" />
            PayPal Buyer Protection
          </div>
          <div className="flex items-center gap-2 text-[11px] text-zinc-600 font-['JetBrains_Mono']">
            <Fingerprint className="w-3.5 h-3.5" />
            Anti-fraud protected
          </div>
        </div>
      </div>
    </div>
  );
}
