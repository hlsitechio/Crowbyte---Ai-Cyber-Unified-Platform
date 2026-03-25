/**
 * Memory Engine API Routes
 * Bridges CrowByte server to the Python memory-engine via bridge.py
 */

import { Router, Request, Response } from 'express';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { existsSync } from 'node:fs';

const execAsync = promisify(exec);
const router = Router();

// Path to memory-engine bridge script
const BRIDGE_PATH = process.env.MEMORY_BRIDGE_PATH || '/opt/crowbyte/memory-engine/bridge.py';
const PYTHON = process.env.PYTHON_PATH || 'python3';
const EXEC_TIMEOUT = 30_000; // 30s max per call

/**
 * Execute a bridge command and return parsed JSON
 */
async function callBridge(command: string, args: Record<string, unknown> = {}): Promise<any> {
  const jsonArgs = JSON.stringify(args).replace(/'/g, "'\\''"); // escape single quotes for shell
  const cmd = `${PYTHON} "${BRIDGE_PATH}" ${command} '${jsonArgs}'`;

  try {
    const { stdout, stderr } = await execAsync(cmd, {
      timeout: EXEC_TIMEOUT,
      env: { ...process.env, PYTHONPATH: BRIDGE_PATH.replace(/\/bridge\.py$/, '') },
    });

    if (stderr && !stdout) {
      console.error(`[memory] bridge stderr: ${stderr}`);
      return { error: stderr.trim() };
    }

    return JSON.parse(stdout.trim());
  } catch (err: any) {
    console.error(`[memory] bridge error (${command}):`, err.message);
    if (err.stdout) {
      try { return JSON.parse(err.stdout.trim()); } catch {}
    }
    throw new Error(`Memory bridge failed: ${err.message}`);
  }
}

// ─── Health check ──────────────────────────────────────────────────────────

router.get('/health', async (_req: Request, res: Response): Promise<void> => {
  const bridgeExists = existsSync(BRIDGE_PATH);
  if (!bridgeExists) {
    res.status(503).json({
      ok: false,
      error: `Bridge not found at ${BRIDGE_PATH}`,
      hint: 'Set MEMORY_BRIDGE_PATH env var or copy memory-engine to /opt/crowbyte/memory-engine/',
    });
    return;
  }

  try {
    const stats = await callBridge('stats');
    res.json({ ok: true, ...stats });
  } catch (err: any) {
    res.status(503).json({ ok: false, error: err.message });
  }
});

// ─── Stats ─────────────────────────────────────────────────────────────────

router.get('/stats', async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await callBridge('stats');
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Search (FTS) ──────────────────────────────────────────────────────────

router.get('/search', async (req: Request, res: Response): Promise<void> => {
  try {
    const { q, query, agent, role, days, limit } = req.query;
    const searchQuery = (q || query || '') as string;

    if (!searchQuery) {
      res.status(400).json({ error: 'q parameter required' });
      return;
    }

    const result = await callBridge('search', {
      query: searchQuery,
      agent: agent as string || '',
      role: role as string || '',
      days: days ? parseInt(days as string, 10) : 0,
      limit: limit ? parseInt(limit as string, 10) : 15,
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Semantic Search ───────────────────────────────────────────────────────

router.get('/semantic', async (req: Request, res: Response): Promise<void> => {
  try {
    const { q, query, role, mode, limit } = req.query;
    const searchQuery = (q || query || '') as string;

    if (!searchQuery) {
      res.status(400).json({ error: 'q parameter required' });
      return;
    }

    const result = await callBridge('semantic', {
      query: searchQuery,
      role: role as string || '',
      mode: (mode as string) || 'hybrid',
      limit: limit ? parseInt(limit as string, 10) : 15,
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Knowledge ─────────────────────────────────────────────────────────────

router.get('/knowledge', async (req: Request, res: Response): Promise<void> => {
  try {
    const { q, query, agent, status, limit } = req.query;
    const result = await callBridge('search_knowledge', {
      query: (q || query || '') as string,
      agent: agent as string || '',
      status: (status as string) || '',
      limit: limit ? parseInt(limit as string, 10) : 20,
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/knowledge', async (req: Request, res: Response): Promise<void> => {
  try {
    const { topic, summary, details, agent, tags, review_trigger } = req.body;

    if (!topic || !summary) {
      res.status(400).json({ error: 'topic and summary are required' });
      return;
    }

    const result = await callBridge('save_knowledge', {
      topic,
      summary,
      details: details || '',
      agent: agent || 'crowbyte-ui',
      tags: tags || '',
      review_trigger: review_trigger || '',
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/knowledge/:agent', async (req: Request, res: Response): Promise<void> => {
  try {
    const agent = req.params.agent;
    const { status } = req.query;

    const result = await callBridge('agent_knowledge', {
      agent,
      status: (status as string) || '',
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Topics ────────────────────────────────────────────────────────────────

router.get('/topics', async (req: Request, res: Response): Promise<void> => {
  try {
    const { min_hits, limit } = req.query;
    const result = await callBridge('topics', {
      min_hits: min_hits ? parseInt(min_hits as string, 10) : 10,
      limit: limit ? parseInt(limit as string, 10) : 60,
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/topic/:name', async (req: Request, res: Response): Promise<void> => {
  try {
    const name = decodeURIComponent(req.params.name as string);
    const { limit } = req.query;

    const result = await callBridge('topic', {
      name,
      limit: limit ? parseInt(limit as string, 10) : 200,
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Timeline ──────────────────────────────────────────────────────────────

router.get('/timeline', async (req: Request, res: Response): Promise<void> => {
  try {
    const { start, end, limit } = req.query;
    const result = await callBridge('timeline', {
      start: start as string || '',
      end: end as string || '',
      limit: limit ? parseInt(limit as string, 10) : 30,
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Sessions ──────────────────────────────────────────────────────────────

router.get('/sessions', async (req: Request, res: Response): Promise<void> => {
  try {
    const { limit, q, query } = req.query;
    const result = await callBridge('session_list', {
      limit: limit ? parseInt(limit as string, 10) : 20,
      query: (q || query || '') as string,
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/sessions/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { page, per_page } = req.query;
    const result = await callBridge('session_detail', {
      id: req.params.id,
      page: page ? parseInt(page as string, 10) : 1,
      per_page: per_page ? parseInt(per_page as string, 10) : 50,
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Observations ──────────────────────────────────────────────────────────

router.get('/observations', async (req: Request, res: Response): Promise<void> => {
  try {
    const { type, concept, session_id, min_confidence, limit } = req.query;
    const result = await callBridge('observations', {
      type: type as string || '',
      concept: concept as string || '',
      session_id: session_id as string || '',
      min_confidence: min_confidence ? parseFloat(min_confidence as string) : 0.3,
      limit: limit ? parseInt(limit as string, 10) : 20,
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Projects ──────────────────────────────────────────────────────────────

router.get('/projects', async (req: Request, res: Response): Promise<void> => {
  try {
    const { status } = req.query;
    const result = await callBridge('project_list', {
      status: (status as string) || 'active',
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/projects', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, description, tags, color } = req.body;

    if (!name) {
      res.status(400).json({ error: 'name is required' });
      return;
    }

    const result = await callBridge('project_create', {
      name,
      description: description || '',
      tags: tags || '',
      color: color || '#58a6ff',
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/projects/:name', async (req: Request, res: Response): Promise<void> => {
  try {
    const name = decodeURIComponent(req.params.name as string);
    const result = await callBridge('project_info', { name });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/projects/:name/search', async (req: Request, res: Response): Promise<void> => {
  try {
    const name = decodeURIComponent(req.params.name as string);
    const { q, query, role, limit } = req.query;
    const searchQuery = (q || query || '') as string;

    if (!searchQuery) {
      res.status(400).json({ error: 'q parameter required' });
      return;
    }

    const result = await callBridge('project_search', {
      name,
      query: searchQuery,
      role: role as string || '',
      limit: limit ? parseInt(limit as string, 10) : 15,
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Chat / Terminal Live Ingest ────────────────────────────────────────────

router.post('/chat', async (req: Request, res: Response): Promise<void> => {
  try {
    const { content, role, session_id, source, timestamp } = req.body;

    if (!content || !role) {
      res.status(400).json({ error: 'content and role are required' });
      return;
    }

    const result = await callBridge('chat_save', {
      content,
      role,
      session_id: session_id || `crowbyte-${Date.now()}`,
      source: source || 'chat',
      timestamp: timestamp || new Date().toISOString(),
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Lifecycle & Ingest ────────────────────────────────────────────────────

router.post('/lifecycle', async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await callBridge('lifecycle');
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/ingest', async (req: Request, res: Response): Promise<void> => {
  try {
    const { source } = req.body;
    const result = await callBridge('ingest', {
      source: source || 'latest',
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
