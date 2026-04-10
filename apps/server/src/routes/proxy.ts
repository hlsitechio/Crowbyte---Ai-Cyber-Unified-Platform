/**
 * Proxy Routes — CORS bypass for web client
 *
 * /api/proxy/ip              → ipinfo.io/json
 * /api/proxy/openclaw/*      → OpenClaw VPS gateway
 */

import { Router, Request, Response } from 'express';

const router = Router();

// Use Traefik hostname (not raw IP+port) — gateway binds to 127.0.0.1 so direct access fails
const OPENCLAW_BASE = process.env.OPENCLAW_VPS_URL || 'https://srv1459982.hstgr.cloud';
const OPENCLAW_PASSWORD = process.env.OPENCLAW_GATEWAY_PASSWORD || '';

/**
 * GET /api/proxy/ip
 * Proxy to ipinfo.io for IP/VPN detection (avoids CORS on web)
 */
router.get('/ip', async (_req: Request, res: Response): Promise<void> => {
  try {
    const response = await fetch('https://ipinfo.io/json', {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      res.status(response.status).json({ error: `ipinfo returned ${response.status}` });
      return;
    }

    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(502).json({ error: 'Failed to reach ipinfo.io', detail: (err as Error).message });
  }
});

/**
 * GET /api/proxy/nvd/*
 * Proxy to NVD API (avoids CORS on web)
 */
router.get('/nvd/*', async (req: Request, res: Response): Promise<void> => {
  const downstreamPath = req.originalUrl.replace(/^\/api\/proxy\/nvd/, '');

  // Validate: only allow NVD REST API paths (prevent SSRF to internal services)
  if (!/^\/rest\/json\//.test(downstreamPath)) {
    res.status(400).json({ error: 'Invalid NVD API path' });
    return;
  }

  // Block path traversal and protocol smuggling
  if (downstreamPath.includes('..') || downstreamPath.includes('\\') || downstreamPath.includes('\r') || downstreamPath.includes('\n')) {
    res.status(400).json({ error: 'Invalid characters in path' });
    return;
  }

  const target = `https://services.nvd.nist.gov${downstreamPath}`;

  try {
    const response = await fetch(target, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(10000),
    });

    const data = await response.text();
    res.status(response.status);
    res.setHeader('Content-Type', response.headers.get('content-type') || 'application/json');
    res.send(data);
  } catch (err) {
    res.status(502).json({ error: 'Failed to reach NVD API', detail: (err as Error).message });
  }
});

/**
 * ALL /api/proxy/openclaw/*
 * Proxy to OpenClaw VPS gateway (NVIDIA proxy, gateway API)
 * Preserves method, headers, and body.
 */
router.all('/openclaw/*', async (req: Request, res: Response): Promise<void> => {
  // Strip the /api/proxy/openclaw prefix to get the downstream path
  const downstreamPath = req.originalUrl.replace(/^\/api\/proxy\/openclaw/, '');
  const target = `${OPENCLAW_BASE}${downstreamPath}`;

  try {
    const headers: Record<string, string> = {
      'Content-Type': req.headers['content-type'] || 'application/json',
      Accept: req.headers['accept'] as string || 'application/json',
    };

    // Forward auth if present
    if (req.headers['authorization']) {
      headers['Authorization'] = req.headers['authorization'] as string;
    }

    // Add OpenClaw gateway password if configured
    if (OPENCLAW_PASSWORD) {
      headers['X-Gateway-Password'] = OPENCLAW_PASSWORD;
    }

    const fetchOptions: RequestInit = {
      method: req.method,
      headers,
      signal: AbortSignal.timeout(30000),
    };

    // Forward body for non-GET requests
    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
      fetchOptions.body = JSON.stringify(req.body);
    }

    const response = await fetch(target, fetchOptions);

    // Check if this is a streaming response (SSE)
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('text/event-stream')) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      if (response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        const pump = async () => {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            res.write(decoder.decode(value, { stream: true }));
          }
          res.end();
        };

        pump().catch(() => res.end());

        req.on('close', () => {
          reader.cancel().catch(() => {});
        });
      } else {
        res.end();
      }
      return;
    }

    // Regular JSON response
    const data = await response.text();
    res.status(response.status);

    // Forward content-type
    if (contentType) {
      res.setHeader('Content-Type', contentType);
    }

    res.send(data);
  } catch (err) {
    const message = (err as Error).message || 'Proxy error';
    if (message.includes('timeout') || message.includes('abort')) {
      res.status(504).json({ error: 'OpenClaw gateway timeout', detail: message });
    } else {
      res.status(502).json({ error: 'Failed to reach OpenClaw gateway', detail: message });
    }
  }
});

export default router;
