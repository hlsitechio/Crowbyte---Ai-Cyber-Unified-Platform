/**
 * OAuth Consent Screen
 * Required by Supabase OAuth Server (BETA) — handles third-party app authorization.
 * Route: /oauth/consent
 * Supabase passes: client_id, redirect_uri, scope, state, response_type
 */

import { safeRedirect } from '@/lib/safe-redirect';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { UilShieldCheck, UilTimes, UilCheck, UilExclamationTriangle } from '@iconscout/react-unicons';
import { supabase } from '@/integrations/supabase/client';

interface ConsentParams {
  client_id: string;
  redirect_uri: string;
  scope: string;
  state: string;
  response_type: string;
}

const SCOPE_DESCRIPTIONS: Record<string, string> = {
  openid: 'Verify your identity',
  email: 'Access your email address',
  profile: 'Access your profile information',
  offline_access: 'Access data while you\'re not signed in',
};

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const [user, setUser] = useState<{ email?: string; id?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const consentParams: ConsentParams = {
    client_id: params.get('client_id') || '',
    redirect_uri: params.get('redirect_uri') || '',
    scope: params.get('scope') || 'openid',
    state: params.get('state') || '',
    response_type: params.get('response_type') || 'code',
  };

  const scopes = consentParams.scope.split(/[\s,]+/).filter(Boolean);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const data = { user: session?.user ?? null };
      setUser(data.user ? { email: data.user.email, id: data.user.id } : null);
      setLoading(false);
    });
  }, []);

  const handleDecision = async (allow: boolean) => {
    setSubmitting(true);
    try {
      // Call Supabase OAuth consent endpoint
      const { data, error: authError } = await (supabase.auth as any).exchangeCodeForSession
        ? await fetch(`${import.meta.env.VITE_SUPABASE_URL}/auth/v1/oauth/authorize`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            },
            body: JSON.stringify({
              ...consentParams,
              decision: allow ? 'allow' : 'deny',
            }),
          }).then(r => r.json())
        : { data: null, error: null };

      if (!allow) {
        // Deny — redirect back with error
        const denyUrl = new URL(consentParams.redirect_uri);
        denyUrl.searchParams.set('error', 'access_denied');
        denyUrl.searchParams.set('error_description', 'User denied access');
        if (consentParams.state) denyUrl.searchParams.set('state', consentParams.state);
        window.location.href = denyUrl.toString();
        return;
      }

      if (data?.redirect_to) {
        safeRedirect(data.redirect_to);
      } else {
        setError('Authorization failed. Please try again.');
      }
    } catch (e) {
      setError('An error occurred during authorization.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    // Not signed in — redirect to auth with return URL
    const returnUrl = encodeURIComponent(window.location.href);
    window.location.href = `/auth?redirect=${returnUrl}`;
    return null;
  }

  if (!consentParams.client_id || !consentParams.redirect_uri) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-2">
          <UilExclamationTriangle size={40} className="text-red-400 mx-auto" />
          <p className="text-white font-semibold">Invalid authorization request</p>
          <p className="text-zinc-500 text-sm">Missing required parameters.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080808] flex flex-col items-center justify-center p-6">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-[100px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative z-10 w-full max-w-sm bg-zinc-900/80 border border-white/[0.08] rounded-2xl p-6 shadow-2xl"
      >
        {/* Header */}
        <div className="flex flex-col items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-blue-500/15 border border-blue-500/20 flex items-center justify-center">
            <UilShieldCheck size={24} className="text-blue-400" />
          </div>
          <div className="text-center">
            <h1 className="text-lg font-bold text-white">Authorization Request</h1>
            <p className="text-xs text-zinc-500 mt-0.5">
              An application wants to access your CrowByte account
            </p>
          </div>
        </div>

        {/* App info */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 mb-4 text-center">
          <p className="text-xs text-zinc-500">App ID</p>
          <p className="text-sm font-mono text-zinc-300 mt-0.5 break-all">{consentParams.client_id}</p>
        </div>

        {/* Signed in as */}
        <p className="text-xs text-zinc-600 text-center mb-4">
          Signed in as <span className="text-zinc-400">{user.email}</span>
        </p>

        {/* Permissions */}
        <div className="mb-5">
          <p className="text-xs font-semibold text-zinc-400 mb-2 uppercase tracking-wide">This app will be able to:</p>
          <ul className="space-y-1.5">
            {scopes.map(scope => (
              <li key={scope} className="flex items-center gap-2 text-sm text-zinc-300">
                <div className="w-4 h-4 rounded-full bg-blue-500/15 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                </div>
                {SCOPE_DESCRIPTIONS[scope] || scope}
              </li>
            ))}
          </ul>
        </div>

        {error && (
          <div className="mb-4 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={() => handleDecision(false)}
            disabled={submitting}
            className="flex-1 h-10 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] text-zinc-300 text-sm font-medium transition-all flex items-center justify-center gap-1.5 disabled:opacity-40"
          >
            <UilTimes size={14} />
            Deny
          </button>
          <button
            onClick={() => handleDecision(true)}
            disabled={submitting}
            className="flex-1 h-10 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-all flex items-center justify-center gap-1.5 disabled:opacity-40"
          >
            {submitting ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <><UilCheck size={14} />Allow</>
            )}
          </button>
        </div>

        <p className="text-[10px] text-zinc-700 text-center mt-4">
          By clicking Allow, you authorize this application to use your account.
        </p>
      </motion.div>
    </div>
  );
}
