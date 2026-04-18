// CrowByte Central — heartbeat receiver + agent orchestrator
// Receives Sentinel heartbeats, runs threshold check, triggers NemoClaw agent via NVIDIA API
// Node.js — runs on VPS alongside NemoClaw

import express from 'express';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const app = express();
app.use(express.json({ limit: '1mb' }));

// ─── Config ───────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 7890;
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://gvskdopsigtflbbylyto.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const NVIDIA_KEY = process.env.NVIDIA_KEY || 'REDACTED_NVIDIA_KEY';
const AGENT_MODEL = process.env.AGENT_MODEL || 'deepseek-ai/deepseek-v3-2';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// NVIDIA inference via proxy (handles model prefix stripping fix)
const nvidia = new OpenAI({
  apiKey: NVIDIA_KEY,
  baseURL: 'http://127.0.0.1:19990/v1', // nvidia-proxy.service
});

// ─── Heartbeat endpoint ───────────────────────────────────────────────────────

app.post('/heartbeat', async (req, res) => {
  const hb = req.body;

  if (!hb?.org_token) {
    return res.status(401).json({ error: 'missing org_token' });
  }

  // Load org context + policy from Supabase
  const { data: org, error } = await supabase
    .from('org_context')
    .select('*')
    .eq('token', hb.org_token)
    .single();

  if (error || !org) {
    return res.status(403).json({ error: 'unknown org token' });
  }

  // Log heartbeat
  await supabase.from('heartbeat_log').insert({
    org_id: org.id,
    timestamp: new Date(hb.timestamp * 1000).toISOString(),
    signal_count: hb.signals?.length || 0,
    infra_snapshot: hb.infra,
  });

  // Threshold check — only wake agent if signals above noise floor
  const highSeveritySignals = (hb.signals || []).filter(s => s.severity >= 5.0);

  if (highSeveritySignals.length === 0) {
    // Nothing actionable — agent stays dormant
    return res.json({ actions: [], report: 'no actionable signals', agent_id: null });
  }

  console.log(`[CENTRAL] org:${org.name} — ${highSeveritySignals.length} signal(s) above threshold — waking agent`);

  // Wake agent — call NVIDIA inference
  const result = await runAgent(org, hb.infra, highSeveritySignals);

  // Audit log
  await supabase.from('audit_log').insert({
    org_id: org.id,
    timestamp: new Date().toISOString(),
    signals: highSeveritySignals,
    actions: result.actions,
    reasoning: result.reasoning,
    confidence: result.confidence,
    agent_model: AGENT_MODEL,
  });

  return res.json({
    actions: result.actions,
    report: result.report,
    agent_id: result.agent_id,
  });
});

// ─── Agent — NVIDIA inference ─────────────────────────────────────────────────

async function runAgent(org, infra, signals) {
  const systemPrompt = `You are CrowByte's security agent for ${org.name}.

ORGANIZATIONAL CONTEXT:
${JSON.stringify(org.context, null, 2)}

POLICY:
- Confidence threshold for autonomous action: ${org.policy?.threshold ?? 0.92}
- Action mode: ${org.policy?.action_mode ?? 'quarantine_and_block'}
- Escalation contact: ${org.policy?.escalation_contact ?? 'security@' + org.name}

PLATFORM INVARIANTS (non-negotiable):
- All actions are reversible within 24 hours
- Every decision must include full reasoning
- Human is always notified after autonomous action
- Scope is limited to this org's known infrastructure

Respond ONLY with valid JSON matching this schema:
{
  "confidence": <0.0-1.0>,
  "actions": [
    {
      "type": "block_ip|quarantine_file|alert|log",
      "target": "<ip, file path, or identifier>",
      "params": {},
      "reason": "<specific reason>",
      "confidence": <0.0-1.0>
    }
  ],
  "reasoning": "<full chain of reasoning>",
  "report": "<human-readable summary for audit>",
  "what_i_need": "<what additional context would increase confidence>",
  "agent_id": "crowbyte-agent-v1"
}`;

  const userPrompt = `Signals received at ${new Date().toISOString()}:
${JSON.stringify(signals, null, 2)}

Infrastructure context:
${JSON.stringify(infra, null, 2)}

Analyze these signals against the organizational context and policy. Decide what actions to take.`;

  try {
    const completion = await nvidia.chat.completions.create({
      model: AGENT_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.1, // low temp for consistent decisions
      max_tokens: 1024,
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) throw new Error('empty response from model');

    const decision = JSON.parse(content);

    // Enforce threshold — only send actions above org's confidence threshold
    const threshold = org.policy?.threshold ?? 0.92;
    const approvedActions = (decision.actions || []).filter(a => a.confidence >= threshold);

    // Below-threshold → escalate as precise question, not just an alert
    if (decision.confidence < threshold && approvedActions.length === 0) {
      await escalate(org, signals, decision);
    }

    console.log(`[AGENT] confidence:${decision.confidence} actions:${approvedActions.length} — sleeping`);

    return {
      ...decision,
      actions: approvedActions,
      agent_id: 'crowbyte-agent-v1',
    };
  } catch (err) {
    console.error(`[AGENT] inference error: ${err.message}`);
    return { actions: [], report: `agent error: ${err.message}`, agent_id: null };
  }
}

// ─── Escalation — precise question to human ───────────────────────────────────

async function escalate(org, signals, decision) {
  const question = decision.what_i_need || 'Additional context needed to act with confidence.';

  await supabase.from('escalations').insert({
    org_id: org.id,
    timestamp: new Date().toISOString(),
    signals,
    question,
    reasoning: decision.reasoning,
    confidence: decision.confidence,
    status: 'pending',
  });

  console.log(`[CENTRAL] escalation created for org:${org.name} — "${question}"`);
  // TODO: email/webhook to org.policy.escalation_contact
}

// ─── Health check ─────────────────────────────────────────────────────────────

app.get('/health', (_, res) => res.json({
  status: 'ok',
  version: '0.1.0',
  model: AGENT_MODEL,
  timestamp: new Date().toISOString(),
}));

app.listen(PORT, () => {
  console.log(`[CENTRAL] CrowByte Central v0.1.0 listening on :${PORT}`);
  console.log(`[CENTRAL] model: ${AGENT_MODEL} via nvidia-proxy`);
});
