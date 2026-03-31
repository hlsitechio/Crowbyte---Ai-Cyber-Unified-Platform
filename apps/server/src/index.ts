import 'dotenv/config';

import express from 'express';
import { createServer as createHttpServer } from 'node:http';
import { createServer as createHttpsServer } from 'node:https';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { WebSocketServer, WebSocket } from 'ws';
import helmet from 'helmet';
import compression from 'compression';
import cors from 'cors';
import { URL } from 'node:url';

import rateLimit from 'express-rate-limit';
import { authMiddleware, verifyToken } from './middleware/auth.js';
import authRoutes from './routes/auth.js';
import systemRoutes from './routes/system.js';
import toolsRoutes from './routes/tools.js';
import dockerRoutes from './routes/docker.js';
import memoryRoutes from './routes/memory.js';
import fleetRoutes from './routes/fleet.js';
import agentRoutes from './routes/agents.js';
import { handleTerminalConnection, getActiveSessions } from './ws/terminal.js';
import { handleMetricsConnection, getConnectedClientsCount } from './ws/metrics.js';
import { activeExecutions } from './routes/tools.js';

const PORT = parseInt(process.env.PORT ?? '3000', 10);
const STATIC_DIR = resolve(new URL('.', import.meta.url).pathname, '../../desktop/dist');

// ─── Express App ─────────────────────────────────────────────────────────────

const app = express();

// Security headers — relaxed CSP for SPA (allows inline styles/scripts needed by Vite-built app)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
      connectSrc: ["'self'", 'wss:', 'ws:', 'https:'],
      fontSrc: ["'self'", 'data:', 'https:'],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'", 'blob:'],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

app.use(compression());

app.use(cors({
  origin: process.env.CORS_ORIGIN ?? true,
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// JWT auth for API routes
app.use(authMiddleware);

// ─── API Routes ──────────────────────────────────────────────────────────────

app.use('/api/auth', authRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/tools', toolsRoutes);
app.use('/api/docker', dockerRoutes);
app.use('/api/memory', memoryRoutes);
app.use('/api/fleet', fleetRoutes);
app.use('/api/agents', agentRoutes);

// ─── Error Monitoring (in-memory store) ─────────────────────────────────────

interface ErrorEntry {
  id: string;
  timestamp: string;
  type: 'console' | 'uncaught' | 'promise' | 'network';
  severity: 'critical' | 'warning' | 'info';
  message: string;
  stack?: string;
  url?: string;
  status?: number;
  statusText?: string;
  method?: string;
  page: string;
  userAgent: string;
}

interface NetworkEntry {
  id: string;
  timestamp: string;
  method: string;
  url: string;
  status: number;
  statusText: string;
  duration: number;
  size?: number;
  ok: boolean;
  page: string;
}

interface NavigationEntry {
  timestamp: string;
  page: string;
  duration?: number;
}

const MAX_ERROR_STORE = 500;
const MAX_NETWORK_STORE = 500;
const MAX_NAVIGATION_STORE = 200;
const SLOW_REQUEST_THRESHOLD_MS = 500;

let errorStore: ErrorEntry[] = [];
let networkStore: NetworkEntry[] = [];
let navigationStore: NavigationEntry[] = [];

// Rate limit error telemetry to prevent abuse (60 requests per minute per IP)
const errorTelemetryLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { error: 'Too many error reports. Slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// POST /api/errors -- receive errors, network entries, and navigation from the client
app.post('/api/errors', errorTelemetryLimiter, (req, res) => {
  const { errors, network, navigation } = req.body;

  let storedErrors = 0;
  let storedNetwork = 0;
  let storedNavigation = 0;

  if (Array.isArray(errors)) {
    for (const entry of errors) {
      errorStore.push(entry);
    }
    while (errorStore.length > MAX_ERROR_STORE) {
      errorStore.shift();
    }
    storedErrors = errors.length;
  }

  if (Array.isArray(network)) {
    for (const entry of network) {
      networkStore.push(entry);
    }
    while (networkStore.length > MAX_NETWORK_STORE) {
      networkStore.shift();
    }
    storedNetwork = network.length;
  }

  if (Array.isArray(navigation)) {
    for (const entry of navigation) {
      navigationStore.push(entry);
    }
    while (navigationStore.length > MAX_NAVIGATION_STORE) {
      navigationStore.shift();
    }
    storedNavigation = navigation.length;
  }

  if (storedErrors === 0 && storedNetwork === 0 && storedNavigation === 0) {
    res.status(400).json({ error: 'Expected at least one of: errors[], network[], navigation[]' });
    return;
  }

  res.json({
    ok: true,
    stored: { errors: storedErrors, network: storedNetwork, navigation: storedNavigation },
    totals: { errors: errorStore.length, network: networkStore.length, navigation: navigationStore.length },
  });
});

// GET /api/errors -- return all stored errors (latest first)
app.get('/api/errors', (_req, res) => {
  const sorted = [...errorStore].reverse();
  res.json({ count: sorted.length, errors: sorted });
});

// GET /api/errors/summary -- grouped summary with network stats and navigation trail
app.get('/api/errors/summary', (_req, res) => {
  const byType: Record<string, number> = {};
  const byPage: Record<string, number> = {};
  const byMessage: Record<string, number> = {};

  for (const entry of errorStore) {
    byType[entry.type] = (byType[entry.type] || 0) + 1;
    byPage[entry.page] = (byPage[entry.page] || 0) + 1;
    byMessage[entry.message] = (byMessage[entry.message] || 0) + 1;
  }

  // Most frequent errors (top 20)
  const mostFrequent = Object.entries(byMessage)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([message, count]) => ({ message, count }));

  // Network stats
  let networkFailed = 0;
  let networkSlow = 0;
  let networkTotalDuration = 0;

  // Aggregate endpoint durations for slowEndpoints calculation
  const endpointAgg: Record<string, { totalDuration: number; count: number }> = {};

  for (const entry of networkStore) {
    if (!entry.ok) networkFailed++;
    if (entry.duration > SLOW_REQUEST_THRESHOLD_MS) networkSlow++;
    networkTotalDuration += entry.duration;

    // Aggregate by URL (strip query params for grouping)
    let endpointKey: string;
    try {
      const parsed = new URL(entry.url, 'http://localhost');
      endpointKey = `${entry.method} ${parsed.pathname}`;
    } catch {
      endpointKey = `${entry.method} ${entry.url}`;
    }

    if (!endpointAgg[endpointKey]) {
      endpointAgg[endpointKey] = { totalDuration: 0, count: 0 };
    }
    endpointAgg[endpointKey].totalDuration += entry.duration;
    endpointAgg[endpointKey].count++;
  }

  const networkAvgLatency = networkStore.length > 0
    ? Math.round(networkTotalDuration / networkStore.length)
    : 0;

  // Top 10 slowest endpoints by average duration
  const slowEndpoints = Object.entries(endpointAgg)
    .map(([url, agg]) => ({
      url,
      avgDuration: Math.round(agg.totalDuration / agg.count),
      count: agg.count,
    }))
    .sort((a, b) => b.avgDuration - a.avgDuration)
    .slice(0, 10);

  res.json({
    total: errorStore.length,
    byType,
    byPage,
    mostFrequent,
    networkStats: {
      total: networkStore.length,
      failed: networkFailed,
      slow: networkSlow,
      avgLatency: networkAvgLatency,
    },
    slowEndpoints,
    navigation: [...navigationStore],
    performance: {
      slowRequests: networkSlow,
      totalRequests: networkStore.length,
      avgLatency: networkAvgLatency,
    },
  });
});

// DELETE /api/errors -- clear all stored errors, network, and navigation logs
app.delete('/api/errors', (_req, res) => {
  const cleared = {
    errors: errorStore.length,
    network: networkStore.length,
    navigation: navigationStore.length,
  };
  errorStore = [];
  networkStore = [];
  navigationStore = [];
  res.json({ ok: true, cleared });
});

// ─── Setup Status (server-side persistence) ────────────────────────────────

const SETUP_FILE = resolve(new URL('.', import.meta.url).pathname, '../../.setup-complete.json');

app.get('/api/setup/status', (_req, res) => {
  try {
    if (existsSync(SETUP_FILE)) {
      const data = JSON.parse(readFileSync(SETUP_FILE, 'utf-8'));
      res.json({ setupComplete: true, ...data });
    } else {
      res.json({ setupComplete: false });
    }
  } catch {
    res.json({ setupComplete: false });
  }
});

app.post('/api/setup/complete', (req, res) => {
  // Setup requires auth now (removed from PUBLIC_PREFIXES)
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  try {
    const { setupComplete, licenseTier, supabaseUrl, supabaseAnonKey, completedAt } = req.body;
    if (!setupComplete) {
      res.status(400).json({ error: 'Invalid setup data' });
      return;
    }
    writeFileSync(SETUP_FILE, JSON.stringify({
      setupComplete: true,
      licenseTier: licenseTier || 'community',
      supabaseUrl: supabaseUrl || '',
      supabaseAnonKey: supabaseAnonKey || '',
      completedAt: completedAt || new Date().toISOString(),
    }, null, 2));
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save setup status' });
  }
});

// Health check (no auth)
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: Date.now(),
    version: '1.0.0',
    metricsClients: getConnectedClientsCount(),
    terminalSessions: getActiveSessions().length,
    activeExecutions: activeExecutions.size,
  });
});

// Terminal sessions management
app.get('/api/terminal/sessions', (_req, res) => {
  res.json({ sessions: getActiveSessions() });
});

// ─── Agent Files (static download for fleet installer) ──────────────────────

const AGENT_DIR = process.env.AGENT_DIR || resolve(new URL('.', import.meta.url).pathname, '../../agent');
if (existsSync(AGENT_DIR)) {
  app.use('/agent', express.static(AGENT_DIR, { maxAge: 0, etag: true }));
  console.log(`[+] Serving agent files from ${AGENT_DIR}`);
}

// ─── Static Files + SPA Fallback ─────────────────────────────────────────────

if (existsSync(STATIC_DIR)) {
  app.use(express.static(STATIC_DIR, {
    maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0,
    etag: true,
    index: 'index.html',
  }));

  // SPA fallback: serve index.html for all non-API routes
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
      res.status(404).json({ error: 'API endpoint not found' });
      return;
    }
    res.sendFile(join(STATIC_DIR, 'index.html'));
  });
} else {
  console.warn(`[warn] Static directory not found: ${STATIC_DIR}`);
  console.warn('[warn] Build the desktop app first: cd apps/desktop && npx vite build');

  app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
      res.status(404).json({ error: 'API endpoint not found' });
      return;
    }
    res.status(503).json({
      error: 'Frontend not built',
      hint: 'Run: cd apps/desktop && npx vite build',
    });
  });
}

// ─── HTTP/HTTPS Server ───────────────────────────────────────────────────────

let server: ReturnType<typeof createHttpServer>;

if (process.env.SSL_CERT && process.env.SSL_KEY) {
  try {
    const cert = readFileSync(process.env.SSL_CERT);
    const key = readFileSync(process.env.SSL_KEY);
    server = createHttpsServer({ cert, key }, app);
    console.log('[+] HTTPS enabled');
  } catch (err) {
    console.error('[-] Failed to load SSL cert/key, falling back to HTTP:', err);
    server = createHttpServer(app);
  }
} else {
  server = createHttpServer(app);
}

// ─── WebSocket Server ────────────────────────────────────────────────────────

const wss = new WebSocketServer({ server });

wss.on('connection', (ws: WebSocket, req) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
  const params = Object.fromEntries(url.searchParams.entries());
  const connectionType = params.type ?? 'unknown';

  // Authenticate WebSocket connections via token query param
  const token = params.token;
  if (!token) {
    ws.send(JSON.stringify({ type: 'error', message: 'Authentication required. Pass ?token=JWT' }));
    ws.close(4001, 'Unauthorized');
    return;
  }

  try {
    verifyToken(token);
  } catch {
    ws.send(JSON.stringify({ type: 'error', message: 'Invalid or expired token' }));
    ws.close(4001, 'Unauthorized');
    return;
  }

  switch (connectionType) {
    case 'terminal':
      handleTerminalConnection(ws, params);
      break;

    case 'metrics':
      handleMetricsConnection(ws, params);
      break;

    case 'exec': {
      // Stream output from a running tool execution
      const execId = params.executionId;
      if (!execId) {
        ws.send(JSON.stringify({ type: 'error', message: 'executionId required' }));
        ws.close();
        return;
      }

      handleExecutionStream(ws, execId);
      break;
    }

    default:
      ws.send(JSON.stringify({ type: 'error', message: `Unknown connection type: ${connectionType}` }));
      ws.close();
  }
});

function handleExecutionStream(ws: WebSocket, execId: string): void {
  const execution = activeExecutions.get(execId);
  if (!execution) {
    ws.send(JSON.stringify({ type: 'error', message: 'Execution not found' }));
    ws.close();
    return;
  }

  // Send buffered output first
  if (execution.output.length > 0) {
    ws.send(JSON.stringify({
      type: 'output',
      data: execution.output.join(''),
    }));
  }

  // Track what we've already sent
  let sentIndex = execution.output.length;

  const streamInterval = setInterval(() => {
    if (ws.readyState !== ws.OPEN) {
      clearInterval(streamInterval);
      return;
    }

    // Send any new output
    if (execution.output.length > sentIndex) {
      const newData = execution.output.slice(sentIndex).join('');
      sentIndex = execution.output.length;
      ws.send(JSON.stringify({ type: 'output', data: newData }));
    }

    // Check if execution finished
    if (execution.exitCode !== null) {
      ws.send(JSON.stringify({
        type: 'exit',
        exitCode: execution.exitCode,
        duration: Date.now() - execution.startedAt,
      }));
      clearInterval(streamInterval);
      ws.close();
    }
  }, 100); // Check every 100ms for new output

  ws.on('close', () => clearInterval(streamInterval));
  ws.on('error', () => clearInterval(streamInterval));
}

// ─── Start ───────────────────────────────────────────────────────────────────

server.listen(PORT, '0.0.0.0', () => {
  const protocol = process.env.SSL_CERT ? 'https' : 'http';
  console.log('');
  console.log('  ╔══════════════════════════════════════════╗');
  console.log('  ║         CrowByte Server v1.0.0           ║');
  console.log('  ╠══════════════════════════════════════════╣');
  console.log(`  ║  ${protocol}://0.0.0.0:${PORT}`.padEnd(45) + '║');
  console.log('  ║  WebSocket: same port                    ║');
  console.log(`  ║  Static: ${existsSync(STATIC_DIR) ? 'serving' : 'NOT BUILT'}`.padEnd(45) + '║');
  console.log('  ╚══════════════════════════════════════════╝');
  console.log('');
});

// Graceful shutdown
function shutdown(signal: string): void {
  console.log(`\n[*] ${signal} received. Shutting down...`);

  wss.clients.forEach(client => {
    client.send(JSON.stringify({ type: 'shutdown', message: 'Server shutting down' }));
    client.close();
  });

  server.close(() => {
    console.log('[+] Server closed');
    process.exit(0);
  });

  // Force exit after 10 seconds
  setTimeout(() => {
    console.error('[-] Forced exit after timeout');
    process.exit(1);
  }, 10_000);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

export default app;
