/**
 * Billing & Subscription Settings
 * Shows current tier, usage stats, upgrade options
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import {
  Crown, Lightning, Rocket, Check, X, Lock, ArrowRight,
  CircleNotch, ChartBar, Brain, Robot, Key, Infinity,
} from '@phosphor-icons/react';
import { getTierInfo, getUsage, getModels, type TierInfo, type UsageInfo, type AiModel } from '@/services/web-ai-chat';
import { toast } from 'sonner';

const TIER_COLORS: Record<string, { bg: string; text: string; border: string; icon: typeof Lightning }> = {
  free: { bg: 'bg-zinc-500/10', text: 'text-zinc-300', border: 'border-zinc-500/20', icon: Lightning },
  pro: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20', icon: Crown },
  enterprise: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20', icon: Rocket },
};

const TIER_FEATURES: Record<string, { label: string; free: string; pro: string; enterprise: string }[]> = {
  core: [
    { label: 'Messages / day', free: '50', pro: 'Unlimited', enterprise: 'Unlimited' },
    { label: 'AI Models', free: '3', pro: '7 (all)', enterprise: '7 (all)' },
    { label: 'Max tokens / msg', free: '2,048', pro: '8,192', enterprise: '16,384' },
    { label: 'Custom Agents', free: '0', pro: '3', enterprise: 'Unlimited' },
    { label: 'Knowledge Entries', free: '50', pro: 'Unlimited', enterprise: 'Unlimited' },
    { label: 'API Access', free: 'No', pro: 'No', enterprise: 'Yes' },
  ],
};

export default function BillingSettings() {
  const [tierInfo, setTierInfo] = useState<TierInfo | null>(null);
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [models, setModels] = useState<AiModel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

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
          {/* Usage bar */}
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

          {/* Quick stats */}
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
                          <span className="uppercase">{tier}</span>
                          <span className="text-[10px] text-zinc-500 font-normal">
                            {tier === 'free' ? '$0' : tier === 'pro' ? '$19/mo' : '$99/mo'}
                          </span>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {TIER_FEATURES.core.map(feature => (
                  <tr key={feature.label} className="border-b border-white/[0.03]">
                    <td className="py-2.5 px-3 text-zinc-400 text-xs">{feature.label}</td>
                    {(['free', 'pro', 'enterprise'] as const).map(tier => {
                      const val = feature[tier];
                      const isUnlimited = val === 'Unlimited' || val === '∞';
                      const isYes = val === 'Yes';
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

          {/* Upgrade buttons */}
          {currentTier === 'free' && (
            <div className="flex gap-3 mt-6">
              <Button
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white"
                onClick={() => toast.info('Stripe checkout coming soon')}
              >
                <Crown size={16} weight="fill" className="mr-2" />
                Upgrade to Pro — $19/mo
                <ArrowRight size={14} weight="bold" className="ml-2" />
              </Button>
            </div>
          )}
          {currentTier === 'pro' && (
            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                className="flex-1 border-amber-500/20 text-amber-400 hover:bg-amber-500/10"
                onClick={() => toast.info('Stripe checkout coming soon')}
              >
                <Rocket size={16} weight="fill" className="mr-2" />
                Upgrade to Enterprise — $99/mo
                <ArrowRight size={14} weight="bold" className="ml-2" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
