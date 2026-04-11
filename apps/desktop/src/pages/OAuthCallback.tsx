/**
 * OAuth Callback — handles the redirect from Claude's OAuth authorize endpoint.
 * Extracts code + state, exchanges for tokens, then redirects to /terminal.
 */

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { handleOAuthCallback } from '@/services/claude-engine';

export default function OAuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const errorParam = searchParams.get('error');

    if (errorParam) {
      setStatus('error');
      setError(`OAuth error: ${errorParam} — ${searchParams.get('error_description') || ''}`);
      return;
    }

    if (!code || !state) {
      setStatus('error');
      setError('Missing code or state parameter');
      return;
    }

    handleOAuthCallback(code, state)
      .then(() => {
        setStatus('success');
        // Redirect to terminal after brief success display
        setTimeout(() => navigate('/terminal'), 1500);
      })
      .catch((err) => {
        setStatus('error');
        setError(err.message);
      });
  }, [searchParams, navigate]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center space-y-4">
        {status === 'processing' && (
          <>
            <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-zinc-400 text-sm">Exchanging authorization code...</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div className="text-4xl">✓</div>
            <p className="text-emerald-400 text-sm font-medium">Authenticated! Redirecting to terminal...</p>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="text-4xl">✕</div>
            <p className="text-red-400 text-sm">{error}</p>
            <button
              onClick={() => navigate('/terminal')}
              className="text-xs text-cyan-400 hover:underline mt-2"
            >
              Back to Terminal
            </button>
          </>
        )}
      </div>
    </div>
  );
}
