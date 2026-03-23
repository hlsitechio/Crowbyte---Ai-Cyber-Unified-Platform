import 'dotenv/config';

import express from 'express';
import { createServer as createHttpServer } from 'node:http';
import { createServer as createHttpsServer } from 'node:https';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { WebSocketServer, WebSocket } from 'ws';
import helmet from 'helmet';
import compression from 'compression';
import cors from 'cors';
import { URL } from 'node:url';

import { authMiddleware, verifyToken } from './middleware/auth.js';
import authRoutes from './routes/auth.js';
import systemRoutes from './routes/system.js';
import toolsRoutes from './routes/tools.js';
import dockerRoutes from './routes/docker.js';
import { handleTerminalConnection, getActiveSessions } from './ws/terminal.js';
import { handleMetricsConnection, getConnectedClientsCount } from './ws/metrics.js';
import { activeExecutions } from './routes/tools.js';

const PORT = parseInt(process.env.PORT ?? '3000', 10);
const STATIC_DIR = resolve(new URL('.', import.meta.url).pathname, '../../desktop/dist');

// ─── Express App ─────────────────────────────────────────────────────────────

const app = express();

// Security headers — relaxed CSP for SPA
app.use(helmet({
  contentSecurityPolicy: false,
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
