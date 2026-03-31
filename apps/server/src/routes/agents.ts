/**
 * Agent Routes — Relay agent tasks to OpenClaw VPS
 *
 * POST /api/agents/dispatch   — Execute an agent task on the VPS
 * GET  /api/agents/status     — Check VPS agent health
 * POST /api/agents/batch      — Submit multiple tasks
 */

import { Router, Request, Response } from 'express';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);
const router = Router();

// OpenClaw VPS config
const VPS_HOST = process.env.OPENCLAW_VPS_HOST || '187.124.85.249';
const VPS_USER = process.env.OPENCLAW_VPS_USER || 'root';
const SSH_TIMEOUT = 10; // seconds
const AGENT_TIMEOUT = parseInt(process.env.AGENT_TIMEOUT || '300', 10); // 5 min default

// Track active dispatches to enforce concurrency
const activeDispatches = new Map<string, { startedAt: number; agentType: string }>();
const MAX_CONCURRENT_DISPATCHES = 10;

/**
 * POST /api/agents/dispatch
 * Execute an agent command on the OpenClaw VPS via SSH.
 */
router.post('/dispatch', async (req: Request, res: Response): Promise<void> => {
  const { agent_type, command, timeout_seconds, session_id } = req.body;

  if (!agent_type || !command) {
    res.status(400).json({ error: 'agent_type and command are required' });
    return;
  }

  if (activeDispatches.size >= MAX_CONCURRENT_DISPATCHES) {
    res.status(429).json({ error: 'Too many concurrent agent dispatches', active: activeDispatches.size });
    return;
  }

  // Map CrowByte agent types to OpenClaw agent names
  const agentMap: Record<string, string> = {
    recon: 'recon',
    hunter: 'hunter',
    triage: 'analyst',
    sentinel: 'sentinel',
    intel: 'intel',
    'bug-watcher': 'intel',
    coder: 'gpt',
    reviewer: 'analyst',
    tester: 'gpt',
    debugger: 'gpt',
    docs: 'gpt',
    cicd: 'commander',
    deployer: 'commander',
    monitor: 'sentinel',
    incident: 'commander',
    support: 'obsidian',
    onboard: 'obsidian',
    escalation: 'commander',
  };

  const openclawAgent = agentMap[agent_type] || 'main';
  const taskTimeout = timeout_seconds || AGENT_TIMEOUT;
  const dispatchId = `${agent_type}-${Date.now()}`;

  activeDispatches.set(dispatchId, { startedAt: Date.now(), agentType: agent_type });

  try {
    // Escape the command for SSH
    const escapedCommand = command
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "'\\''")
      .replace(/"/g, '\\"')
      .replace(/\$/g, '\\$')
      .replace(/`/g, '\\`');

    // Build the openclaw command — merge stderr into stdout (openclaw outputs JSON on stderr)
    const sessionFlag = session_id ? `--session-id "${session_id}"` : '';
    const openclawCmd = `openclaw agent --agent ${openclawAgent} --local --json --timeout ${taskTimeout} ${sessionFlag} -m '${escapedCommand}' 2>&1`;

    const sshCmd = `ssh -o ConnectTimeout=${SSH_TIMEOUT} -o StrictHostKeyChecking=no ${VPS_USER}@${VPS_HOST} "${openclawCmd}"`;

    console.log(`[agents] Dispatching to ${openclawAgent}: ${command.slice(0, 100)}...`);

    const { stdout, stderr } = await execAsync(sshCmd, {
      timeout: (taskTimeout + SSH_TIMEOUT + 5) * 1000,
      maxBuffer: 10 * 1024 * 1024, // 10MB
    });

    // Extract the JSON output from stdout
    // OpenClaw --json outputs a JSON object with payloads[] and meta{}
    let output: unknown;
    let agentText = '';

    // Try to find the JSON payload in the output
    const rawOutput = stdout.trim();

    // Strategy 1: Find { "payloads" pattern
    let jsonStr = '';
    const payloadsIdx = rawOutput.indexOf('{"payloads"');
    const payloadsIdx2 = rawOutput.indexOf('{\n  "payloads"');
    const bestIdx = payloadsIdx2 >= 0 ? payloadsIdx2 : payloadsIdx;

    if (bestIdx >= 0) {
      jsonStr = rawOutput.slice(bestIdx);
    } else {
      // Strategy 2: Find the last valid JSON object in the output
      const lastBrace = rawOutput.lastIndexOf('}');
      if (lastBrace >= 0) {
        // Walk backwards to find matching opening brace
        let depth = 0;
        for (let i = lastBrace; i >= 0; i--) {
          if (rawOutput[i] === '}') depth++;
          if (rawOutput[i] === '{') depth--;
          if (depth === 0) {
            jsonStr = rawOutput.slice(i, lastBrace + 1);
            break;
          }
        }
      }
    }

    try {
      const parsed = JSON.parse(jsonStr || rawOutput);
      output = parsed;

      // Extract text from payloads
      if (parsed?.payloads?.[0]?.text) {
        agentText = parsed.payloads[0].text;
      }
    } catch {
      // If JSON parsing fails entirely, return raw output as text
      output = rawOutput;
      agentText = rawOutput;
    }

    const durationMs = Date.now() - (activeDispatches.get(dispatchId)?.startedAt || Date.now());

    const result = {
      success: true,
      agent: openclawAgent,
      agent_type,
      text: agentText, // Convenience — the agent's actual response text
      output,
      model: ((output as Record<string, Record<string, Record<string, unknown>>>)?.meta?.agentMeta?.model as string) || null,
      duration_ms: durationMs,
      timestamp: new Date().toISOString(),
    };

    console.log(`[agents] ${openclawAgent} completed in ${result.duration_ms}ms`);
    res.json(result);

  } catch (err: unknown) {
    const error = err as Error & { killed?: boolean; code?: number; signal?: string; stderr?: string };
    const errorResult = {
      success: false,
      agent: openclawAgent,
      agent_type,
      error: error.message,
      stderr: error.stderr?.trim() || null,
      killed: error.killed || false,
      exit_code: error.code || null,
      signal: error.signal || null,
      duration_ms: Date.now() - (activeDispatches.get(dispatchId)?.startedAt || Date.now()),
      timestamp: new Date().toISOString(),
    };

    console.error(`[agents] ${openclawAgent} failed:`, error.message?.slice(0, 200));
    res.status(500).json(errorResult);

  } finally {
    activeDispatches.delete(dispatchId);
  }
});

/**
 * GET /api/agents/status
 * Check VPS connectivity and agent health.
 */
router.get('/status', async (_req: Request, res: Response): Promise<void> => {
  try {
    const { stdout } = await execAsync(
      `ssh -o ConnectTimeout=5 -o StrictHostKeyChecking=no ${VPS_USER}@${VPS_HOST} "openclaw --version 2>&1; echo '---'; docker ps --format '{{.Names}} {{.Status}}' 2>/dev/null | head -15"`,
      { timeout: 15000 }
    );

    const parts = stdout.split('---');
    const version = parts[0]?.trim() || 'unknown';
    const containers = (parts[1]?.trim() || '')
      .split('\n')
      .filter(Boolean)
      .map((line: string) => {
        const [name, ...statusParts] = line.split(' ');
        return { name, status: statusParts.join(' ') };
      });

    res.json({
      online: true,
      version,
      containers,
      active_dispatches: activeDispatches.size,
      max_concurrent: MAX_CONCURRENT_DISPATCHES,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.json({
      online: false,
      error: (err as Error).message,
      active_dispatches: activeDispatches.size,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /api/agents/batch
 * Submit multiple agent commands. Returns results as they complete.
 */
router.post('/batch', async (req: Request, res: Response): Promise<void> => {
  const { tasks } = req.body;

  if (!Array.isArray(tasks) || tasks.length === 0) {
    res.status(400).json({ error: 'tasks array is required' });
    return;
  }

  if (tasks.length > 5) {
    res.status(400).json({ error: 'Maximum 5 tasks per batch' });
    return;
  }

  const results = await Promise.allSettled(
    tasks.map(async (task: { agent_type: string; command: string; timeout_seconds?: number }) => {
      // Re-use the dispatch logic by making an internal call
      const agentMap: Record<string, string> = {
        recon: 'recon', hunter: 'hunter', triage: 'analyst',
        sentinel: 'sentinel', intel: 'intel', 'bug-watcher': 'intel',
        coder: 'gpt', reviewer: 'analyst', tester: 'gpt',
        debugger: 'gpt', docs: 'gpt', cicd: 'commander',
        deployer: 'commander', monitor: 'sentinel', incident: 'commander',
        support: 'obsidian', onboard: 'obsidian', escalation: 'commander',
      };

      const openclawAgent = agentMap[task.agent_type] || 'main';
      const escapedCommand = task.command.replace(/'/g, "'\\''").replace(/"/g, '\\"').replace(/\$/g, '\\$');
      const timeout = task.timeout_seconds || AGENT_TIMEOUT;

      const { stdout } = await execAsync(
        `ssh -o ConnectTimeout=${SSH_TIMEOUT} -o StrictHostKeyChecking=no ${VPS_USER}@${VPS_HOST} "openclaw agent --agent ${openclawAgent} --local --json --timeout ${timeout} -m '${escapedCommand}'"`,
        { timeout: (timeout + SSH_TIMEOUT + 5) * 1000, maxBuffer: 10 * 1024 * 1024 }
      );

      let output: unknown;
      try { output = JSON.parse(stdout); } catch { output = stdout.trim(); }
      return { success: true, agent: openclawAgent, agent_type: task.agent_type, output };
    })
  );

  const formatted = results.map((r, i) => {
    if (r.status === 'fulfilled') return r.value;
    return { success: false, agent_type: tasks[i].agent_type, error: (r.reason as Error).message };
  });

  res.json({ results: formatted, timestamp: new Date().toISOString() });
});

export default router;
