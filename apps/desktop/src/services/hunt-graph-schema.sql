-- Hunt Graph Schema
-- Tables: hunts, hunt_entities, hunt_edges, hunt_events
-- Run this in Supabase SQL Editor

-- ─── Hunts ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS hunts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  program TEXT,
  scope TEXT[] DEFAULT '{}',
  exclude_scope TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'archived')),
  stats JSONB NOT NULL DEFAULT '{"entities":0,"edges":0,"events":0,"findings":0,"triage_pending":0,"last_activity":null}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE hunts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own hunts"
  ON hunts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_hunts_user_status ON hunts(user_id, status);

-- ─── Hunt Entities ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS hunt_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hunt_id UUID NOT NULL REFERENCES hunts(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  value TEXT NOT NULL,
  raw_value TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  severity TEXT NOT NULL DEFAULT 'none' CHECK (severity IN ('critical', 'high', 'medium', 'low', 'info', 'none')),
  triage_status TEXT NOT NULL DEFAULT 'new' CHECK (triage_status IN ('new', 'interesting', 'investigating', 'confirmed', 'false_positive', 'reported', 'dismissed')),
  triage_notes TEXT,
  tags TEXT[] DEFAULT '{}',
  first_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
  hit_count INTEGER NOT NULL DEFAULT 1,
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('proxy', 'terminal', 'browser', 'manual', 'ai')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE hunt_entities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage entities in their hunts"
  ON hunt_entities FOR ALL
  USING (EXISTS (SELECT 1 FROM hunts WHERE hunts.id = hunt_entities.hunt_id AND hunts.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM hunts WHERE hunts.id = hunt_entities.hunt_id AND hunts.user_id = auth.uid()));

-- Unique constraint for dedup: (hunt_id, type, value)
CREATE UNIQUE INDEX idx_hunt_entities_dedup ON hunt_entities(hunt_id, type, value);

-- Query indexes
CREATE INDEX idx_hunt_entities_hunt ON hunt_entities(hunt_id);
CREATE INDEX idx_hunt_entities_type ON hunt_entities(hunt_id, type);
CREATE INDEX idx_hunt_entities_severity ON hunt_entities(hunt_id, severity);
CREATE INDEX idx_hunt_entities_triage ON hunt_entities(hunt_id, triage_status);
CREATE INDEX idx_hunt_entities_tags ON hunt_entities USING GIN(tags);
CREATE INDEX idx_hunt_entities_last_seen ON hunt_entities(hunt_id, last_seen DESC);
CREATE INDEX idx_hunt_entities_value_search ON hunt_entities(hunt_id, value text_pattern_ops);

-- ─── Hunt Edges ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS hunt_edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hunt_id UUID NOT NULL REFERENCES hunts(id) ON DELETE CASCADE,
  source_id UUID NOT NULL REFERENCES hunt_entities(id) ON DELETE CASCADE,
  target_id UUID NOT NULL REFERENCES hunt_entities(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  weight INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE hunt_edges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage edges in their hunts"
  ON hunt_edges FOR ALL
  USING (EXISTS (SELECT 1 FROM hunts WHERE hunts.id = hunt_edges.hunt_id AND hunts.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM hunts WHERE hunts.id = hunt_edges.hunt_id AND hunts.user_id = auth.uid()));

-- Unique constraint for dedup: (hunt_id, source_id, target_id, type)
CREATE UNIQUE INDEX idx_hunt_edges_dedup ON hunt_edges(hunt_id, source_id, target_id, type);

CREATE INDEX idx_hunt_edges_hunt ON hunt_edges(hunt_id);
CREATE INDEX idx_hunt_edges_source ON hunt_edges(source_id);
CREATE INDEX idx_hunt_edges_target ON hunt_edges(target_id);

-- ─── Hunt Events (Timeline) ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS hunt_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hunt_id UUID NOT NULL REFERENCES hunts(id) ON DELETE CASCADE,
  entity_id UUID REFERENCES hunt_entities(id) ON DELETE SET NULL,
  source TEXT NOT NULL CHECK (source IN ('proxy', 'terminal', 'browser', 'manual', 'ai')),
  event_type TEXT NOT NULL,
  raw_data TEXT NOT NULL DEFAULT '',
  extracted JSONB NOT NULL DEFAULT '{}',
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE hunt_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage events in their hunts"
  ON hunt_events FOR ALL
  USING (EXISTS (SELECT 1 FROM hunts WHERE hunts.id = hunt_events.hunt_id AND hunts.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM hunts WHERE hunts.id = hunt_events.hunt_id AND hunts.user_id = auth.uid()));

CREATE INDEX idx_hunt_events_hunt ON hunt_events(hunt_id);
CREATE INDEX idx_hunt_events_timestamp ON hunt_events(hunt_id, timestamp DESC);
CREATE INDEX idx_hunt_events_source ON hunt_events(hunt_id, source);
CREATE INDEX idx_hunt_events_entity ON hunt_events(entity_id);

-- ─── Helper Views ───────────────────────────────────────────────────────────

-- Triage queue: critical/high/medium entities that are new or interesting
CREATE OR REPLACE VIEW hunt_triage_queue AS
SELECT e.*, h.name AS hunt_name, h.program
FROM hunt_entities e
JOIN hunts h ON h.id = e.hunt_id
WHERE e.triage_status IN ('new', 'interesting')
  AND e.severity IN ('critical', 'high', 'medium')
ORDER BY
  CASE e.severity
    WHEN 'critical' THEN 1
    WHEN 'high' THEN 2
    WHEN 'medium' THEN 3
  END,
  e.last_seen DESC;

-- Entity type summary per hunt
CREATE OR REPLACE VIEW hunt_entity_summary AS
SELECT
  hunt_id,
  type,
  COUNT(*) AS count,
  COUNT(*) FILTER (WHERE severity IN ('critical', 'high')) AS high_sev_count,
  COUNT(*) FILTER (WHERE triage_status = 'new') AS untriaged_count,
  MAX(last_seen) AS latest_seen
FROM hunt_entities
GROUP BY hunt_id, type
ORDER BY count DESC;

-- ─── Functions ──────────────────────────────────────────────────────────────

-- Refresh hunt stats (call periodically or after bulk operations)
CREATE OR REPLACE FUNCTION refresh_hunt_stats(p_hunt_id UUID)
RETURNS VOID AS $$
DECLARE
  v_stats JSONB;
BEGIN
  SELECT jsonb_build_object(
    'entities', (SELECT COUNT(*) FROM hunt_entities WHERE hunt_id = p_hunt_id),
    'edges', (SELECT COUNT(*) FROM hunt_edges WHERE hunt_id = p_hunt_id),
    'events', (SELECT COUNT(*) FROM hunt_events WHERE hunt_id = p_hunt_id),
    'findings', (SELECT COUNT(*) FROM hunt_entities WHERE hunt_id = p_hunt_id AND type = 'finding'),
    'triage_pending', (SELECT COUNT(*) FROM hunt_entities WHERE hunt_id = p_hunt_id AND triage_status IN ('new', 'interesting') AND severity IN ('critical', 'high', 'medium')),
    'last_activity', now()
  ) INTO v_stats;

  UPDATE hunts SET stats = v_stats, updated_at = now() WHERE id = p_hunt_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
