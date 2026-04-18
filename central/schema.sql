-- CrowByte Central — Supabase Schema
-- Run once via Supabase SQL editor or REST RPC

-- Orgs
CREATE TABLE IF NOT EXISTS org_context (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token       TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),

  -- Org context layer (populated during onboarding)
  context     JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Expected structure:
  -- {
  --   "cloud_services": ["AWS", "O365"],
  --   "email_domains": ["acme.com"],
  --   "tech_stack": ["nginx", "postgres"],
  --   "ip_ranges": ["10.0.0.0/8"],
  --   "expected_countries": ["CA", "US"]
  -- }

  -- Org policy (configurable by org)
  policy      JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- {
  --   "threshold": 0.92,
  --   "action_mode": "quarantine_and_block",
  --   "escalation_contact": "security@acme.com",
  --   "heartbeat_interval_seconds": 30
  -- }

  -- CrowByte invariants (read-only from org side)
  invariants  JSONB NOT NULL DEFAULT '{
    "recovery_window_hours": 24,
    "audit_log": true,
    "human_notification_after_action": true,
    "scope_validation_enforced": true,
    "exploit_requires_token": true
  }'::jsonb,

  -- Tier
  tier        TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'elite'))
);

-- Heartbeat log (raw, rolling 7-day retention)
CREATE TABLE IF NOT EXISTS heartbeat_log (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id         UUID REFERENCES org_context(id) ON DELETE CASCADE,
  timestamp      TIMESTAMPTZ NOT NULL,
  signal_count   INT DEFAULT 0,
  infra_snapshot JSONB,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Audit log (permanent — every agent decision)
CREATE TABLE IF NOT EXISTS audit_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       UUID REFERENCES org_context(id) ON DELETE CASCADE,
  timestamp    TIMESTAMPTZ NOT NULL,
  signals      JSONB,
  actions      JSONB,
  reasoning    TEXT,
  confidence   FLOAT,
  agent_model  TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Escalations (below-threshold — precise questions to human)
CREATE TABLE IF NOT EXISTS escalations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     UUID REFERENCES org_context(id) ON DELETE CASCADE,
  timestamp  TIMESTAMPTZ NOT NULL,
  signals    JSONB,
  question   TEXT,        -- the precise question to the human
  reasoning  TEXT,
  confidence FLOAT,
  status     TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'answered', 'dismissed')),
  answer     TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Blocked IPs (for recovery within 24h window)
CREATE TABLE IF NOT EXISTS blocked_ips (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID REFERENCES org_context(id) ON DELETE CASCADE,
  ip          TEXT NOT NULL,
  reason      TEXT,
  confidence  FLOAT,
  blocked_at  TIMESTAMPTZ DEFAULT NOW(),
  expires_at  TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours',
  unblocked   BOOLEAN DEFAULT FALSE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_heartbeat_org_ts ON heartbeat_log(org_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_org_ts ON audit_log(org_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_escalations_org_status ON escalations(org_id, status);

-- Test org (for local dev/testing)
INSERT INTO org_context (token, name, context, policy, tier)
VALUES (
  'crowbyte-test-token-local',
  'Test Org (Local)',
  '{
    "cloud_services": [],
    "email_domains": ["test.local"],
    "tech_stack": ["linux"],
    "ip_ranges": ["127.0.0.0/8", "10.0.0.0/8"],
    "expected_countries": ["CA"]
  }',
  '{
    "threshold": 0.85,
    "action_mode": "alert",
    "escalation_contact": "admin@test.local",
    "heartbeat_interval_seconds": 30
  }',
  'pro'
) ON CONFLICT (token) DO NOTHING;
