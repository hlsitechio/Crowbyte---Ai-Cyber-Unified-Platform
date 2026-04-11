/**
 * CreditsBadge — Shows current credit balance in sidebar/header.
 * Compact display with balance number + lightning icon.
 * Clicks through to /settings/billing.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UilBolt, UilSpinner } from "@iconscout/react-unicons";
import { getBalance, onBalanceChange, type CreditBalance } from '@/services/credits';
import { useAuth } from '@/contexts/auth';

export function CreditsBadge() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [balance, setBalance] = useState<CreditBalance | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    let mounted = true;

    const load = async () => {
      const b = await getBalance();
      if (mounted) {
        setBalance(b);
        setLoading(false);
      }
    };

    load();

    // Listen for balance updates from credit usage
    const unsub = onBalanceChange((b) => {
      if (mounted) setBalance(b);
    });

    // Refresh every 60s
    const interval = setInterval(load, 60000);

    return () => {
      mounted = false;
      unsub();
      clearInterval(interval);
    };
  }, [user]);

  if (!user || loading) return null;

  const bal = balance?.balance ?? 0;
  const isLow = bal < 10;
  const isEmpty = bal <= 0;

  return (
    <button
      onClick={() => navigate('/settings/billing')}
      className={`
        flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-medium
        transition-colors cursor-pointer
        ${isEmpty
          ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
          : isLow
            ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
            : 'bg-zinc-800/50 text-zinc-300 hover:bg-zinc-700/50'
        }
      `}
      title={`${bal} credits remaining${balance?.tier ? ` (${balance.tier})` : ''}`}
    >
      <UilBolt size={12} className={isEmpty ? 'text-red-400' : isLow ? 'text-amber-400' : 'text-cyan-400'} />
      {loading ? (
        <UilSpinner size={12} className="animate-spin" />
      ) : (
        <span>{bal.toLocaleString()}</span>
      )}
    </button>
  );
}
