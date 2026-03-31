/**
 * Billing & Subscription Settings
 * Shows current tier, usage stats, upgrade options, beta access request
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
  Crown, Lightning, Rocket, Check, X, Lock, ArrowRight,
  CircleNotch, ChartBar, Brain, Robot, Key, Infinity,
  Envelope, Desktop, Flask,
} from '@phosphor-icons/react';
import { getTierInfo, getUsage, getModels, type TierInfo, type UsageInfo, type AiModel } from '@/services/web-ai-chat';
import { useAuth } from '@/contexts/auth';
import { toast } from 'sonner';

const TIER_COLORS: Record<string, { bg: string; text: string; border: string; icon: typeof Lightning }> = {
  free: { bg: 'bg-zinc-500/10', text: 'text-zinc-300', border: 'border-zinc-500/20', icon: Lightning },
  pro: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20', icon: Crown },
  enterprise: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20', icon: Rocket },
};

const TIER_FEATURES = [
  { label: 'Messages / day', free: '50', pro: 'Unlimited', enterprise: 'Unlimited' },
  { label: 'AI Models', free: '3', pro: '7 (all)', enterprise: '7 (all)' },
  { label: 'Max tokens / msg', free: '2,048', pro: '8,192', enterprise: '16,384' },
  { label: 'Custom Agents', free: '0', pro: '3', enterprise: 'Unlimited' },
  { label: 'Knowledge Entries', free: '50', pro: 'Unlimited', enterprise: 'Unlimited' },
  { label: 'Desktop App', free: 'No', pro: 'Beta Access', enterprise: 'Yes' },
  { label: 'API Access', free: 'No', pro: 'No', enterprise: 'Yes' },
];

export default function BillingSettings() {
  const { user } = useAuth();
  const [tierInfo, setTierInfo] = useState<TierInfo | null>(null);
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [models, setModels] = useState<AiModel[]>([]);
  const [loading, setLoading] = useState(true);

  // Beta access form
  const [betaEmail, setBetaEmail] = useState('');
  const [betaReason, setBetaReason] = useState('');
  const [betaSending, setBetaSending] = useState(false);
  const [betaSent, setBetaSent] = useState(false);

  useEffect(() => {
    loadData();
    if (user?.email) setBetaEmail(user.email);
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [tier, usageData, modelsData] = await Promise.all([
        getTierInfo(),
        getUsage(),
        getModels(),
      ]);
      setTierInfo(tier);
      setUsage(usageData);
      setModels(modelsData.models);
    } catch {
      toast.error('Failed to load billing info');
    }
    setLoading(false);
  };

  const handleBetaRequest = async () => {
    if (!betaEmail) { toast.error('Email required'); return; }
    setBetaSending(true);
    try {
      const res = await fetch('/api/beta-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: betaEmail, reason: betaReason, user_id: user?.id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Request failed');
      }
      setBetaSent(true);
      toast.success('Beta access request submitted!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit request');
    }
    setBetaSending(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <CircleNotch size={32} weight="bold" className="animate-spin text-blue-500" />
      </div>
    );
  }

  const currentTier = tierInfo?.tier || 'free';
  const tierColor = TIER_COLORS[currentTier] || TIER_COLORS.free;
  const TierIcon = tierColor.icon;
  const usagePercent = usage && usage.limit ? Math.round((usage.current / usage.limit) * 100) : 0;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Current Plan Card */}
      <Card className={`${tierColor.border} border bg-zinc-950/50`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${tierColor.bg}`}>
                <TierIcon size={24} weight="fill" className={tierColor.text} />
              </div>
              <div>
                <CardTitle className="text-lg text-zinc-100">
                  {currentTier.charAt(0).toUpperCase() + currentTier.slice(1)} Plan
                  {currentTier === 'pro' && (
                    <Badge className="ml-2 bg-blue-500/10 text-blue-400 border-blue-500/20 text-[9px]">BETA</Badge>
                  )}
                </CardTitle>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {currentTier === 'free' ? 'Get started with AI-powered security' :
                   currentTier === 'pro' ? 'Unlimited power for security professionals' :
                   'Full platform access for teams'}
                </p>
              </div>
            </div>
            <Badge variant="outline" className={`${tierColor.text} ${tierColor.border} uppercase text-xs px-3`}>
              {currentTier}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {usage && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400 flex items-center gap-1.5">
                  <ChartBar size={13} weight="bold" />
                  Today's Usage
                </span>
                <span className="text-zinc-300 font-mono">
                  {usage.current} / {usage.limit === null ? '∞' : usage.limit} messages
                </span>
              </div>
              {usage.limit !== null ? (
                <Progress value={usagePercent} className="h-2" />
              ) : (
                <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full w-full bg-gradient-to-r from-blue-600/30 to-blue-400/10 animate-pulse" />
                </div>
              )}
              {usage.remaining !== null && usage.remaining <= 10 && (
                <p className="text-[11px] text-amber-400">
                  {usage.remaining === 0 ? 'Daily limit reached. Upgrade to Pro for unlimited.' : `${usage.remaining} messages remaining today.`}
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-4 gap-3">
            {[
              { icon: Brain, label: 'Models', value: models.filter(m => m.available).length.toString(), total: models.length.toString() },
              { icon: Robot, label: 'Agents', value: tierInfo?.limits.agents === -1 ? '∞' : String(tierInfo?.limits.agents || 0) },
              { icon: Lightning, label: 'Max Tokens', value: tierInfo?.limits.maxTokens ? `${(tierInfo.limits.maxTokens / 1024).toFixed(0)}K` : '2K' },
              { icon: Key, label: 'API', value: tierInfo?.limits.apiAccess ? 'Yes' : 'No' },
            ].map(stat => (
              <Card key={stat.label} className="p-3 bg-zinc-900/30 border-white/[0.04]">
                <div className="flex items-center gap-2 mb-1">
                  <stat.icon size={13} weight="bold" className="text-zinc-500" />
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider">{stat.label}</span>
                </div>
                <span className="text-sm font-medium text-zinc-200">
                  {stat.value}{stat.total ? `/${stat.total}` : ''}
                </span>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Desktop Beta Access Request */}
      <Card className="bg-zinc-950/50 border-blue-500/20">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Desktop size={18} weight="bold" className="text-blue-400" />
            <CardTitle className="text-base text-zinc-200">Desktop App — Beta Access</CardTitle>
            <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-[9px]">INVITE ONLY</Badge>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            The CrowByte desktop app (Linux, Windows, macOS) is currently in closed beta.
            Request access below and we'll email you when a spot opens up.
          </p>
        </CardHeader>
        <CardContent>
          {betaSent ? (
            <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-lg p-4 text-center">
              <Check size={24} weight="bold" className="mx-auto text-emerald-400 mb-2" />
              <p className="text-sm text-emerald-400 font-medium">Request submitted!</p>
              <p className="text-xs text-zinc-400 mt-1">
                We'll email <span className="text-zinc-300">{betaEmail}</span> when access is available.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <Input
                type="email"
                placeholder="your@email.com"
                value={betaEmail}
                onChange={(e) => setBetaEmail(e.target.value)}
                className="bg-zinc-900/50 border-white/[0.06] text-sm"
              />
              <Textarea
                placeholder="What do you want to use CrowByte for? (optional)"
                value={betaReason}
                onChange={(e) => setBetaReason(e.target.value)}
                className="bg-zinc-900/50 border-white/[0.06] text-sm resize-none h-20"
              />
              <Button
                onClick={handleBetaRequest}
                disabled={betaSending || !betaEmail}
                className="w-full bg-blue-600 hover:bg-blue-500"
              >
                {betaSending ? (
                  <><CircleNotch size={14} weight="bold" className="mr-2 animate-spin" /> Submitting...</>
                ) : (
                  <><Flask size={14} weight="bold" className="mr-2" /> Request Beta Access</>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Available Models */}
      <Card className="bg-zinc-950/50 border-white/[0.06]">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-zinc-200">Available Models</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2">
            {models.map(model => (
              <div
                key={model.id}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  model.available
                    ? 'border-white/[0.06] bg-zinc-900/30'
                    : 'border-zinc-800/50 bg-zinc-900/10 opacity-60'
                }`}
              >
                <div className="flex items-center gap-3">
                  {model.locked ? (
                    <Lock size={14} weight="bold" className="text-zinc-600" />
                  ) : (
                    <Check size={14} weight="bold" className="text-emerald-400" />
                  )}
                  <div>
                    <span className="text-sm text-zinc-200">{model.name}</span>
                    <p className="text-[11px] text-zinc-500">{model.desc}</p>
                  </div>
                </div>
                <Badge variant="outline" className={`text-[10px] ${
                  model.tier === 'free' ? 'text-zinc-400 border-zinc-700' : 'text-blue-400 border-blue-500/20'
                }`}>
                  {model.tier}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Plan Comparison */}
      <Card className="bg-zinc-950/50 border-white/[0.06]">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-zinc-200">Plan Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left py-2 px-3 text-zinc-500 font-medium text-xs">Feature</th>
                  {['free', 'pro', 'enterprise'].map(tier => {
                    const color = TIER_COLORS[tier];
                    return (
                      <th key={tier} className={`text-center py-2 px-3 text-xs font-medium ${color.text}`}>
                        <div className="flex flex-col items-center gap-1">
                          <span className="uppercase">
                            {tier}{tier === 'pro' ? ' Beta' : tier === 'enterprise' ? ' (Soon)' : ''}
                          </span>
                          <span className="text-[10px] text-zinc-500 font-normal">
                            {tier === 'free' ? '$0' : tier === 'pro' ? '$19/mo' : 'Coming Soon'}
                          </span>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {TIER_FEATURES.map(feature => (
                  <tr key={feature.label} className="border-b border-white/[0.03]">
                    <td className="py-2.5 px-3 text-zinc-400 text-xs">{feature.label}</td>
                    {(['free', 'pro', 'enterprise'] as const).map(tier => {
                      const val = feature[tier];
                      const isUnlimited = val === 'Unlimited' || val === '∞';
                      const isYes = val === 'Yes' || val === 'Beta Access';
                      const isNo = val === 'No';
                      return (
                        <td key={tier} className="text-center py-2.5 px-3">
                          {isUnlimited ? (
                            <Infinity size={16} weight="bold" className="mx-auto text-emerald-400" />
                          ) : isYes ? (
                            <Check size={14} weight="bold" className="mx-auto text-emerald-400" />
                          ) : isNo ? (
                            <X size={14} weight="bold" className="mx-auto text-zinc-600" />
                          ) : (
                            <span className={`text-xs font-mono ${
                              tier === currentTier ? 'text-zinc-200' : 'text-zinc-500'
                            }`}>
                              {val}
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {currentTier === 'free' && (
            <div className="flex gap-3 mt-6">
              <Button
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white"
                onClick={() => toast.info('Pro Beta launching soon — join the waitlist above!')}
              >
                <Crown size={16} weight="fill" className="mr-2" />
                Upgrade to Pro Beta — $19/mo
                <ArrowRight size={14} weight="bold" className="ml-2" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
