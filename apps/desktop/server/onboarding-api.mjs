/**
 * CrowByte Onboarding API
 * Runs on VPS — handles account creation + provisioning for new users
 *
 * Endpoints:
 *   POST /api/onboard     — Create account, provision DB, return config
 *   POST /api/onboard/skip — Skip account, get community config
 *   GET  /api/health       — Health check
 *
 * Deploy: node onboarding-api.mjs
 * Port: 18790
 */

import http from 'node:http';
import crypto from 'node:crypto';

// ─── Config ─────────────────────────────────────────────────────────────────

const PORT = process.env.ONBOARD_PORT || 18790;
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://gvskdopsigtflbbylyto.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const CORS_ORIGIN = '*'; // Allow Electron app

// ─── Helpers ────────────────────────────────────────────────────────────────

function json(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': CORS_ORIGIN,
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  });
  res.end(JSON.stringify(data));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try { resolve(JSON.parse(body || '{}')); }
      catch { resolve({}); }
    });
    req.on('error', reject);
  });
}

async function supabaseAdmin(endpoint, method = 'GET', body = null) {
  const url = `${SUPABASE_URL}${endpoint}`;
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
    },
  };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(url, opts);
  const text = await res.text();
  try { return { ok: res.ok, status: res.status, data: JSON.parse(text) }; }
  catch { return { ok: res.ok, status: res.status, data: text }; }
}

// ─── Onboarding Logic ───────────────────────────────────────────────────────

async function handleOnboard(body) {
  const { email, password, tier = 'community', workspace = 'CrowByte Ops' } = body;

  if (!email || !password) {
    return { error: 'Email and password required', status: 400 };
  }

  if (password.length < 8) {
    return { error: 'Password must be at least 8 characters', status: 400 };
  }

  // 1. Create Supabase auth user
  const authResult = await supabaseAdmin('/auth/v1/admin/users', 'POST', {
    email,
    password,
    email_confirm: true, // Auto-confirm for onboarding flow
    user_metadata: {
      workspace_name: workspace,
      tier,
      onboarded_at: new Date().toISOString(),
      onboarded_via: 'desktop-installer',
    },
  });

  if (!authResult.ok) {
    // Check if user already exists
    if (authResult.status === 422 || authResult.data?.msg?.includes('already')) {
      return { error: 'Account already exists. Try signing in.', status: 409 };
    }
    return { error: authResult.data?.msg || 'Failed to create account', status: 500 };
  }

  const userId = authResult.data?.id;
  if (!userId) {
    return { error: 'Account created but no user ID returned', status: 500 };
  }

  // 2. Create user_settings row
  await supabaseAdmin('/rest/v1/user_settings', 'POST', {
    user_id: userId,
    workspace_name: workspace,
    default_model: 'claude-sonnet-4-6',
    theme: 'dark',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  // 3. Generate API token for the tier
  const apiToken = `cb_${tier}_${crypto.randomBytes(24).toString('hex')}`;

  // 4. Return config bundle
  return {
    status: 200,
    data: {
      success: true,
      user_id: userId,
      email,
      tier,
      workspace,
      supabase: {
        url: SUPABASE_URL,
        anon_key: process.env.SUPABASE_ANON_KEY || '',
      },
      api_token: apiToken,
      features: getTierFeatures(tier),
    },
  };
}

function handleSkip() {
  return {
    status: 200,
    data: {
      success: true,
      tier: 'community',
      workspace: 'CrowByte Ops',
      supabase: {
        url: SUPABASE_URL,
        anon_key: process.env.SUPABASE_ANON_KEY || '',
      },
      features: getTierFeatures('community'),
    },
  };
}

function getTierFeatures(tier) {
  const features = {
    community: {
      max_targets: 3,
      max_endpoints: 3,
      ai_chat: true,
      vps_agents: false,
      fleet_mgmt: false,
      api_access: false,
      export_reports: false,
      custom_agents: false,
    },
    professional: {
      max_targets: -1, // unlimited
      max_endpoints: 25,
      ai_chat: true,
      vps_agents: true,
      fleet_mgmt: true,
      api_access: true,
      export_reports: true,
      custom_agents: false,
    },
    team: {
      max_targets: -1,
      max_endpoints: -1,
      ai_chat: true,
      vps_agents: true,
      fleet_mgmt: true,
      api_access: true,
      export_reports: true,
      custom_agents: true,
    },
  };
  return features[tier] || features.community;
}

// ─── HTTP Server ────────────────────────────────────────────────────────────

const server = http.createServer(async (req, res) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': CORS_ORIGIN,
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    });
    return res.end();
  }

  const url = req.url?.split('?')[0];

  // Health check
  if (url === '/api/health' && req.method === 'GET') {
    return json(res, 200, {
      status: 'ok',
      service: 'crowbyte-onboarding',
      version: '1.0.0',
      uptime: process.uptime(),
    });
  }

  // Create account + provision
  if (url === '/api/onboard' && req.method === 'POST') {
    try {
      const body = await parseBody(req);
      const result = await handleOnboard(body);
      return json(res, result.status || 200, result.data || { error: result.error });
    } catch (err) {
      console.error('[!] Onboard error:', err);
      return json(res, 500, { error: 'Internal server error' });
    }
  }

  // Skip account — community tier with defaults
  if (url === '/api/onboard/skip' && req.method === 'POST') {
    const result = handleSkip();
    return json(res, 200, result.data);
  }

  // 404
  json(res, 404, { error: 'Not found' });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[+] CrowByte Onboarding API running on port ${PORT}`);
  console.log(`[i] Supabase: ${SUPABASE_URL}`);
  console.log(`[i] Health: http://localhost:${PORT}/api/health`);
});
