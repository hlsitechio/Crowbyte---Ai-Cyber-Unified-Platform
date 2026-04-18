/**
 * Billing & Credits Settings
 * Shows credit balance, purchase packs, manage subscription, transaction history.
 */

import { safeRedirect } from '@/lib/safe-redirect';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { UilAward, UilBolt, UilRocket, UilCheck, UilArrowRight, UilSpinner, UilChartBar, UilCreditCard, UilClock, UilArrowUp, UilArrowDown, UilBox, UilStar, UilCoins, UilReceipt } from "@iconscout/react-unicons";
import { useAuth } from '@/contexts/auth';
import { toast } from 'sonner';
import {
  getBalance, getPacks, getHistory, purchasePack, refreshBalance,
  type CreditBalance, type CreditPack, type CreditTransaction,
} from '@/services/credits';

const TIER_CONFIG: Record<string, { color: string; bg: string; border: string; icon: typeof UilBolt; label: string; price: string; credits: string }> = {
  free:  { color: 'text-zinc-300',  bg: 'bg-zinc-500/10',  border: 'border-zinc-500/20',  icon: UilBolt, label: 'Free',  price: '$0',     credits: '50/day' },
  pro:   { color: 'text-blue-400',  bg: 'bg-blue-500/10',  border: 'border-blue-500/20',  icon: UilAward,    label: 'Pro',   price: '$19/mo', credits: '1,000/mo' },
  elite: { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', icon: UilRocket,   label: 'Elite', price: '$49/mo', credits: '5,000/mo' },
};

export default function BillingSettings() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState<CreditBalance | null>(null);
  const [packs, setPacks] = useState<CreditPack[]>([]);
  const [history, setHistory] = useState<CreditTransaction[]>([]);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    loadAll();
  }, [user]);

  // Handle return from Stripe credit pack purchase
  useEffect(() => {
    const creditsStatus = searchParams.get('credits');
    if (creditsStatus === 'success') {
      toast.success('Credits added to your account!');
      setTimeout(() => refreshBalance().then(b => { if (b) setBalance(b); }), 2000);
    } else if (creditsStatus === 'cancelled') {
      toast.info('Credit purchase cancelled');
    }
  }, [searchParams]);

  const loadAll = async () => {
    setLoading(true);
    const [b, p, h] = await Promise.all([getBalance(), getPacks(), getHistory()]);
    setBalance(b);
    setPacks(p);
    setHistory(h);
    setLoading(false);
  };

  const handlePurchasePack = async (pack: CreditPack) => {
    setPurchasing(pack.id);
    const url = await purchasePack(pack.id);
    if (url) {
      window.location.href = url;
    } else {
      toast.error('Failed to create checkout');
      setPurchasing(null);
    }
  };

  const handleManageSubscription = async () => {
    if (!user) return;
    setPortalLoading(true);
    try {
      const { data: { session } } = await (await import('@/integrations/supabase/client')).supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_APP_URL || 'https://crowbyte.io'}/api/stripe/portal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`,
        },
        body: JSON.stringify({ userId: user.id }),
      });
      const data = await res.json();
      if (data.url) safeRedirect(data.url);
      else toast.error('Could not open billing portal');
    } catch {
      toast.error('Failed to open billing portal');
    }
    setPortalLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <UilSpinner size={32} className="animate-spin text-blue-500" />
      </div>
    );
  }

  const tier = balance?.tier || 'free';
  const config = TIER_CONFIG[tier] || TIER_CONFIG.free;
  const TierIcon = config.icon;
  const usagePercent = balance ? Math.round((balance.monthly_used / Math.max(balance.monthly_allowance, 1)) * 100) : 0;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* ── Credit Balance Card ── */}
      <Card className={`${config.border} border bg-zinc-900/50`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-lg ${config.bg}`}>
                <TierIcon size={24} className={config.color} />
              </div>
              <div>
                <CardTitle className="text-lg text-zinc-100 flex items-center gap-2">
                  {config.label} Plan
                  <Badge variant="outline" className={`${config.color} ${config.border} uppercase text-[10px] px-2`}>
                    {tier}
                  </Badge>
                </CardTitle>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {config.credits} included credits &middot; {config.price}
                </p>
              </div>
            </div>
            {tier !== 'free' && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleManageSubscription}
                disabled={portalLoading}
                className="text-xs gap-1.5"
              >
                {portalLoading ? <UilSpinner size={12} className="animate-spin" /> : <UilCreditCard size={14} />}
                Manage Subscription
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Balance display */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-zinc-900/50 border border-white/[0.04] rounded-lg p-4 text-center">
              <UilCoins size={20} className="mx-auto text-cyan-400 mb-2" />
              <p className="text-2xl font-bold text-zinc-100 font-mono">{(balance?.balance || 0).toLocaleString()}</p>
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-1">Total Credits</p>
            </div>
            <div className="bg-zinc-900/50 border border-white/[0.04] rounded-lg p-4 text-center">
              <UilChartBar size={20} className="mx-auto text-blue-400 mb-2" />
              <p className="text-2xl font-bold text-zinc-100 font-mono">{(balance?.monthly_used || 0).toLocaleString()}</p>
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-1">Used {tier === 'free' ? 'Today' : 'This Month'}</p>
            </div>
            <div className="bg-zinc-900/50 border border-white/[0.04] rounded-lg p-4 text-center">
              <UilBox size={20} className="mx-auto text-emerald-400 mb-2" />
              <p className="text-2xl font-bold text-zinc-100 font-mono">{(balance?.pack_balance || 0).toLocaleString()}</p>
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-1">Pack Credits</p>
            </div>
          </div>

          {/* Usage progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400">{tier === 'free' ? 'Daily' : 'Monthly'} Allowance Usage</span>
              <span className="text-zinc-300 font-mono">
                {balance?.monthly_used || 0} / {balance?.monthly_allowance || 0}
              </span>
            </div>
            <Progress value={Math.min(usagePercent, 100)} className="h-2" />
            {usagePercent >= 80 && (
              <p className="text-[11px] text-amber-400">
                {usagePercent >= 100
                  ? 'Allowance depleted. Pack credits or purchase more below.'
                  : `${100 - usagePercent}% remaining. Consider buying a credit pack.`}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Credit Packs ── */}
      <Card className="bg-zinc-900/50 border-white/[0.06]">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-zinc-200 flex items-center gap-2">
            <UilCoins size={18} className="text-cyan-400" />
            Buy Credit Packs
          </CardTitle>
          <CardDescription>
            Credits never expire. Use them for any AI model in CrowByte.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {packs.map((pack, idx) => {
              const perCredit = (pack.price_usd / pack.credits * 100).toFixed(1);
              const isBest = idx === 2; // Power pack = best value
              return (
                <div
                  key={pack.id}
                  className={`relative rounded-lg border p-4 flex flex-col items-center text-center transition-colors hover:border-cyan-500/30 ${
                    isBest ? 'border-cyan-500/30 bg-cyan-500/5' : 'border-white/[0.06] bg-zinc-900/30'
                  }`}
                >
                  {isBest && (
                    <Badge className="absolute -top-2 bg-cyan-500 text-white text-[9px] px-2">
                      <UilStar size={10} className="mr-1" /> BEST VALUE
                    </Badge>
                  )}
                  <p className="text-sm font-semibold text-zinc-200 mt-1">{pack.name}</p>
                  <p className="text-2xl font-bold text-zinc-100 mt-2 font-mono">
                    {pack.credits.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider">credits</p>
                  <p className="text-lg font-bold text-zinc-200 mt-3">${pack.price_usd}</p>
                  <p className="text-[10px] text-zinc-500">{perCredit}¢ / credit</p>
                  <Button
                    size="sm"
                    onClick={() => handlePurchasePack(pack)}
                    disabled={purchasing === pack.id}
                    className={`w-full mt-3 text-xs ${
                      isBest
                        ? 'bg-cyan-600 hover:bg-cyan-500 text-white'
                        : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
                    }`}
                  >
                    {purchasing === pack.id ? (
                      <UilSpinner size={12} className="animate-spin" />
                    ) : (
                      <>Buy</>
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ── Subscription Plans ── */}
      <Card className="bg-zinc-900/50 border-white/[0.06]">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-zinc-200 flex items-center gap-2">
            <UilAward size={18} className="text-blue-400" />
            Subscription Plans
          </CardTitle>
          <CardDescription>
            Subscribe for monthly credits + full platform access.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {[
              { key: 'free', price: '$0', period: 'forever', credits: '50 credits/day', features: ['Basic AI models', 'CVE UilDatabase', 'Knowledge Base'] },
              { key: 'pro', price: '$19', period: '/month', credits: '1,000 credits/mo', features: ['All AI models', 'Red Team ops', 'Network Scanner', 'Agent Builder', 'Priority support'] },
              { key: 'elite', price: '$49', period: '/month', credits: '5,000 credits/mo', features: ['Everything in Pro', 'Higher rate limits', 'Early access features', 'Dedicated support', 'API access'] },
            ].map(plan => {
              const c = TIER_CONFIG[plan.key];
              const isCurrent = tier === plan.key;
              return (
                <div key={plan.key} className={`rounded-lg border p-5 ${isCurrent ? `${c.border} ${c.bg}` : 'border-white/[0.06] bg-zinc-900/20'}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <c.icon size={18} className={c.color} />
                    <span className={`font-semibold ${c.color}`}>{c.label}</span>
                    {isCurrent && <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[9px]">CURRENT</Badge>}
                  </div>
                  <div className="mb-3">
                    <span className="text-2xl font-bold text-zinc-100">{plan.price}</span>
                    <span className="text-xs text-zinc-500 ml-1">{plan.period}</span>
                  </div>
                  <p className="text-xs text-cyan-400 font-medium mb-3">{plan.credits} included</p>
                  <ul className="space-y-1.5 mb-4">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-center gap-2 text-xs text-zinc-400">
                        <UilCheck size={12} className="text-emerald-400 flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  {!isCurrent && plan.key !== 'free' && (
                    <Button
                      size="sm"
                      className="w-full text-xs bg-blue-600 hover:bg-blue-500"
                      onClick={() => safeRedirect(`/checkout?plan=${plan.key}-monthly`)}
                    >
                      Upgrade <UilArrowRight size={12} className="ml-1" />
                    </Button>
                  )}
                  {isCurrent && plan.key !== 'free' && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs"
                      onClick={handleManageSubscription}
                    >
                      Manage
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ── Transaction History ── */}
      {history.length > 0 && (
        <Card className="bg-zinc-900/50 border-white/[0.06]">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-zinc-200 flex items-center gap-2">
              <UilReceipt size={18} className="text-zinc-400" />
              Recent Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {history.slice(0, 20).map(tx => {
                const isPositive = tx.amount > 0;
                return (
                  <div key={tx.id} className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-zinc-900/30">
                    <div className="flex items-center gap-3">
                      <div className={`p-1.5 rounded-md ${isPositive ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                        {isPositive ? (
                          <UilArrowDown size={12} className="text-emerald-400" />
                        ) : (
                          <UilArrowUp size={12} className="text-red-400" />
                        )}
                      </div>
                      <div>
                        <p className="text-xs text-zinc-300">{tx.description || tx.type}</p>
                        {tx.model && <p className="text-[10px] text-zinc-500 font-mono">{tx.model}</p>}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-xs font-mono font-medium ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                        {isPositive ? '+' : ''}{tx.amount}
                      </p>
                      <p className="text-[10px] text-zinc-600">
                        <UilClock size={10} className="inline mr-1" />
                        {new Date(tx.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
