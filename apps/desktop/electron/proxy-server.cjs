/**
 * CrowByte Intercepting Proxy
 *
 * Built-in HTTP/HTTPS proxy server for passive traffic capture.
 * Replaces Caido/Burp — runs inside Electron main process.
 *
 * Features:
 * - HTTP forward proxy (full request/response capture)
 * - HTTPS CONNECT tunneling with optional MITM interception
 * - Auto-generated CA cert (first run)
 * - Scope filtering (only capture in-scope domains)
 * - IPC bridge to renderer (hunt-graph integration)
 * - Request replay/repeat
 *
 * Usage:
 *   const proxy = require('./proxy-server.cjs');
 *   proxy.start({ port: 8888 });
 *   proxy.on('request', (req) => { ... });
 *   proxy.stop();
 */

const http = require('http');
const https = require('https');
const net = require('net');
const tls = require('tls');
const { URL } = require('url');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { EventEmitter } = require('events');
const { execFileSync } = require('child_process');

// ─── CA Certificate Generation ─────────────────────────────────────────────

function getCADir() {
  const appData = process.env.APPDATA
    || (process.platform === 'darwin' ? path.join(require('os').homedir(), 'Library', 'Application Support') : path.join(require('os').homedir(), '.config'));
  const dir = path.join(appData, 'CrowByte', 'proxy-ca');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function generateCA() {
  const caDir = getCADir();
  const keyPath = path.join(caDir, 'ca-key.pem');
  const certPath = path.join(caDir, 'ca-cert.pem');

  if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
    return {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath),
      path: caDir,
    };
  }

  try {
    // Generate CA private key (no shell — execFileSync is safe)
    execFileSync('openssl', ['genrsa', '-out', keyPath, '2048'], { stdio: 'pipe' });

    // Generate self-signed CA certificate
    execFileSync('openssl', [
      'req', '-new', '-x509',
      '-key', keyPath,
      '-out', certPath,
      '-days', '3650',
      '-subj', '/C=US/ST=Security/L=CrowByte/O=CrowByte Proxy/CN=CrowByte CA',
    ], { stdio: 'pipe' });

    console.log('[+] CrowByte CA generated at', caDir);
  } catch (err) {
    console.warn('[!] Failed to generate CA (openssl not available):', err.message);
    console.warn('[i] HTTPS interception will be disabled — tunnel mode only');
    return null;
  }

  return {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath),
    path: caDir,
  };
}

function generateHostCert(hostname, ca) {
  if (!ca) return null;

  const caDir = getCADir();
  const hostDir = path.join(caDir, 'hosts');
  if (!fs.existsSync(hostDir)) fs.mkdirSync(hostDir, { recursive: true });

  const safe = hostname.replace(/[^a-zA-Z0-9.-]/g, '_');
  const keyPath = path.join(hostDir, `${safe}-key.pem`);
  const certPath = path.join(hostDir, `${safe}-cert.pem`);

  // Cache: reuse existing cert if less than 30 days old
  if (fs.existsSync(certPath)) {
    const stat = fs.statSync(certPath);
    const age = Date.now() - stat.mtimeMs;
    if (age < 30 * 24 * 60 * 60 * 1000) {
      return { key: fs.readFileSync(keyPath), cert: fs.readFileSync(certPath) };
    }
  }

  try {
    // Generate host key
    execFileSync('openssl', ['genrsa', '-out', keyPath, '2048'], { stdio: 'pipe' });

    // Generate CSR
    const csrPath = path.join(hostDir, `${safe}-csr.pem`);
    execFileSync('openssl', ['req', '-new', '-key', keyPath, '-out', csrPath, '-subj', `/CN=${hostname}`], { stdio: 'pipe' });

    // Create ext file for SAN
    const extPath = path.join(hostDir, `${safe}-ext.cnf`);
    const isIp = /^\d+\.\d+\.\d+\.\d+$/.test(hostname);
    const san = isIp ? `IP:${hostname}` : `DNS:${hostname},DNS:*.${hostname}`;
    fs.writeFileSync(extPath, `subjectAltName=${san}\n`);

    // Sign with CA
    execFileSync('openssl', [
      'x509', '-req',
      '-in', csrPath,
      '-CA', path.join(caDir, 'ca-cert.pem'),
      '-CAkey', path.join(caDir, 'ca-key.pem'),
      '-CAcreateserial',
      '-out', certPath,
      '-days', '365',
      '-extfile', extPath,
    ], { stdio: 'pipe' });

    // Cleanup temp files
    try { fs.unlinkSync(csrPath); } catch {}
    try { fs.unlinkSync(extPath); } catch {}

    return { key: fs.readFileSync(keyPath), cert: fs.readFileSync(certPath) };
  } catch (err) {
    console.warn(`[!] Failed to generate cert for ${hostname}:`, err.message);
    return null;
  }
}

// ─── Request/Response Capture ───────────────────────────────────────────────

let requestCounter = 0;

function captureId() {
  return `req_${Date.now()}_${++requestCounter}`;
}

function parseHeaders(rawHeaders) {
  const headers = {};
  if (Array.isArray(rawHeaders)) {
    for (let i = 0; i < rawHeaders.length; i += 2) {
      const key = rawHeaders[i]?.toLowerCase();
      if (key) headers[key] = rawHeaders[i + 1];
    }
  } else if (typeof rawHeaders === 'object') {
    for (const [k, v] of Object.entries(rawHeaders)) {
      headers[k.toLowerCase()] = v;
    }
  }
  return headers;
}

function collectBody(stream, maxSize = 2 * 1024 * 1024) {
  return new Promise((resolve) => {
    const chunks = [];
    let size = 0;
    let truncated = false;

    stream.on('data', (chunk) => {
      size += chunk.length;
      if (size <= maxSize) {
        chunks.push(chunk);
      } else {
        truncated = true;
      }
    });

    stream.on('end', () => {
      const body = Buffer.concat(chunks).toString('utf-8');
      resolve({ body, size, truncated });
    });

    stream.on('error', () => resolve({ body: '', size: 0, truncated: false }));

    // Timeout after 30s
    setTimeout(() => resolve({ body: Buffer.concat(chunks).toString('utf-8'), size, truncated }), 30000);
  });
}

// ─── Proxy Server ───────────────────────────────────────────────────────────

class CrowByteProxy extends EventEmitter {
  constructor() {
    super();
    this.server = null;
    this.port = 8888;
    this.running = false;
    this.interceptEnabled = false;  // MITM HTTPS interception
    this.ca = null;
    this.scope = [];                // empty = capture all
    this.excludeScope = [];
    this.history = [];              // in-memory request history (capped)
    this.maxHistory = 5000;
    this.paused = false;
    this.stats = { total: 0, captured: 0, filtered: 0, errors: 0 };
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────

  async start(opts = {}) {
    if (this.running) return { port: this.port, running: true };

    this.port = opts.port || 8888;
    this.interceptEnabled = opts.intercept !== false;
    this.scope = opts.scope || [];
    this.excludeScope = opts.excludeScope || [];

    // Generate/load CA for HTTPS interception
    if (this.interceptEnabled) {
      this.ca = generateCA();
      if (!this.ca) {
        console.warn('[i] HTTPS interception disabled — no CA');
        this.interceptEnabled = false;
      }
    }

    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => this._handleHttp(req, res));
      this.server.on('connect', (req, clientSocket, head) => this._handleConnect(req, clientSocket, head));
      this.server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          reject(new Error(`Port ${this.port} already in use`));
          return;
        }
        console.error('[Proxy] Server error:', err);
        this.stats.errors++;
        this.emit('error', err);
      });

      this.server.listen(this.port, '127.0.0.1', () => {
        this.running = true;
        console.log(`[+] CrowByte Proxy listening on 127.0.0.1:${this.port}`);
        if (this.ca) {
          console.log(`[+] CA cert: ${this.ca.path}/ca-cert.pem`);
          console.log('[i] Install CA cert in your browser for HTTPS interception');
        }
        resolve({
          port: this.port,
          running: true,
          intercept: this.interceptEnabled,
          caPath: this.ca?.path,
        });
      });
    });
  }

  stop() {
    if (this.server) {
      this.server.close();
      this.server = null;
    }
    this.running = false;
    console.log('[*] CrowByte Proxy stopped');
    return { running: false };
  }

  // ── HTTP Request Handler ──────────────────────────────────────────────

  async _handleHttp(clientReq, clientRes) {
    const id = captureId();
    const startTime = Date.now();
    this.stats.total++;

    let targetUrl;
    try {
      if (clientReq.url.startsWith('http')) {
        targetUrl = new URL(clientReq.url);
      } else {
        const host = clientReq.headers.host;
        targetUrl = new URL(`http://${host}${clientReq.url}`);
      }
    } catch (err) {
      clientRes.writeHead(400);
      clientRes.end('Bad Request');
      return;
    }

    // Scope check
    if (!this._isInScope(targetUrl.hostname)) {
      this.stats.filtered++;
      this._forwardHttp(clientReq, clientRes, targetUrl);
      return;
    }

    // Collect request body
    const { body: reqBody } = await collectBody(clientReq);

    const capture = {
      id,
      timestamp: new Date().toISOString(),
      method: clientReq.method,
      url: targetUrl.href,
      hostname: targetUrl.hostname,
      path: targetUrl.pathname + targetUrl.search,
      protocol: 'http',
      request: {
        headers: parseHeaders(clientReq.rawHeaders),
        body: reqBody,
        size: Buffer.byteLength(reqBody),
      },
      response: null,
      duration: 0,
      flags: [],
      tags: [],
    };

    // Forward request to target
    const proxyOpts = {
      hostname: targetUrl.hostname,
      port: targetUrl.port || 80,
      path: targetUrl.pathname + targetUrl.search,
      method: clientReq.method,
      headers: { ...clientReq.headers },
    };
    delete proxyOpts.headers['proxy-connection'];
    delete proxyOpts.headers['proxy-authorization'];

    const proxyReq = http.request(proxyOpts, async (proxyRes) => {
      const { body: resBody, size: resSize, truncated } = await collectBody(proxyRes);

      capture.response = {
        status: proxyRes.statusCode,
        statusText: proxyRes.statusMessage,
        headers: parseHeaders(proxyRes.rawHeaders),
        body: resBody,
        size: resSize,
        truncated,
      };
      capture.duration = Date.now() - startTime;

      clientRes.writeHead(proxyRes.statusCode, proxyRes.headers);
      clientRes.end(resBody);

      this._captureComplete(capture);
    });

    proxyReq.on('error', (err) => {
      capture.response = { status: 502, statusText: 'Bad Gateway', headers: {}, body: err.message, size: 0, truncated: false };
      capture.duration = Date.now() - startTime;
      capture.flags.push('proxy_error');
      clientRes.writeHead(502);
      clientRes.end(`Proxy error: ${err.message}`);
      this._captureComplete(capture);
      this.stats.errors++;
    });

    if (reqBody) proxyReq.write(reqBody);
    proxyReq.end();
  }

  _forwardHttp(clientReq, clientRes, targetUrl) {
    const proxyOpts = {
      hostname: targetUrl.hostname,
      port: targetUrl.port || 80,
      path: targetUrl.pathname + targetUrl.search,
      method: clientReq.method,
      headers: { ...clientReq.headers },
    };
    delete proxyOpts.headers['proxy-connection'];

    const proxyReq = http.request(proxyOpts, (proxyRes) => {
      clientRes.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(clientRes);
    });

    proxyReq.on('error', () => {
      clientRes.writeHead(502);
      clientRes.end('Proxy error');
    });

    clientReq.pipe(proxyReq);
  }

  // ── HTTPS CONNECT Handler ─────────────────────────────────────────────

  _handleConnect(clientReq, clientSocket, head) {
    const [hostname, port] = clientReq.url.split(':');
    const targetPort = parseInt(port) || 443;
    this.stats.total++;

    const inScope = this._isInScope(hostname);

    if (!inScope) {
      this.stats.filtered++;
      this._tunnelConnect(hostname, targetPort, clientSocket, head);
      return;
    }

    if (this.interceptEnabled && this.ca) {
      this._mitmConnect(hostname, targetPort, clientSocket, head);
    } else {
      this._tunnelConnect(hostname, targetPort, clientSocket, head);
      this._captureComplete({
        id: captureId(),
        timestamp: new Date().toISOString(),
        method: 'CONNECT',
        url: `https://${hostname}:${targetPort}`,
        hostname,
        path: '/',
        protocol: 'https',
        request: { headers: parseHeaders(clientReq.rawHeaders), body: '', size: 0 },
        response: { status: 200, statusText: 'Connection Established', headers: {}, body: '', size: 0, truncated: false },
        duration: 0,
        flags: ['tunnel_only'],
        tags: ['https'],
      });
    }
  }

  _tunnelConnect(hostname, port, clientSocket, head) {
    const serverSocket = net.connect(port, hostname, () => {
      clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
      serverSocket.write(head);
      serverSocket.pipe(clientSocket);
      clientSocket.pipe(serverSocket);
    });

    serverSocket.on('error', () => {
      clientSocket.end();
      this.stats.errors++;
    });

    clientSocket.on('error', () => {
      serverSocket.end();
    });
  }

  _mitmConnect(hostname, targetPort, clientSocket, head) {
    const hostCert = generateHostCert(hostname, this.ca);
    if (!hostCert) {
      this._tunnelConnect(hostname, targetPort, clientSocket, head);
      return;
    }

    clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');

    const mitmServer = new tls.TLSSocket(clientSocket, {
      isServer: true,
      key: hostCert.key,
      cert: hostCert.cert,
      ca: [this.ca.cert],
    });

    const fakeServer = http.createServer((req, res) => {
      this._handleMitmRequest(hostname, targetPort, req, res);
    });

    mitmServer.on('error', (err) => {
      if (err.code === 'ERR_SSL_SSLV3_ALERT_CERTIFICATE_UNKNOWN') return;
      this.stats.errors++;
    });

    fakeServer.emit('connection', mitmServer);
  }

  async _handleMitmRequest(hostname, port, clientReq, clientRes) {
    const id = captureId();
    const startTime = Date.now();
    const fullUrl = `https://${hostname}${port !== 443 ? ':' + port : ''}${clientReq.url}`;

    const { body: reqBody } = await collectBody(clientReq);

    const capture = {
      id,
      timestamp: new Date().toISOString(),
      method: clientReq.method,
      url: fullUrl,
      hostname,
      path: clientReq.url,
      protocol: 'https',
      request: {
        headers: parseHeaders(clientReq.rawHeaders),
        body: reqBody,
        size: Buffer.byteLength(reqBody),
      },
      response: null,
      duration: 0,
      flags: ['mitm'],
      tags: ['https', 'intercepted'],
    };

    const proxyOpts = {
      hostname,
      port,
      path: clientReq.url,
      method: clientReq.method,
      headers: { ...clientReq.headers, host: hostname },
      rejectUnauthorized: true, // CodeQL[js/disabling-certificate-validation] — re-enabled; proxy captures traffic for security testing only
    };

    const proxyReq = https.request(proxyOpts, async (proxyRes) => {
      const { body: resBody, size: resSize, truncated } = await collectBody(proxyRes);

      capture.response = {
        status: proxyRes.statusCode,
        statusText: proxyRes.statusMessage,
        headers: parseHeaders(proxyRes.rawHeaders),
        body: resBody,
        size: resSize,
        truncated,
      };
      capture.duration = Date.now() - startTime;

      clientRes.writeHead(proxyRes.statusCode, proxyRes.headers);
      clientRes.end(resBody);

      this._captureComplete(capture);
    });

    proxyReq.on('error', (err) => {
      capture.response = { status: 502, statusText: 'Bad Gateway', headers: {}, body: err.message, size: 0, truncated: false };
      capture.duration = Date.now() - startTime;
      clientRes.writeHead(502);
      clientRes.end(`Proxy error: ${err.message}`);
      this._captureComplete(capture);
      this.stats.errors++;
    });

    if (reqBody) proxyReq.write(reqBody);
    proxyReq.end();
  }

  // ── Capture Processing ────────────────────────────────────────────────

  _captureComplete(capture) {
    if (this.paused) return;
    this.stats.captured++;

    // Ring buffer
    this.history.push(capture);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    this.emit('capture', capture);
  }

  // ── Scope ─────────────────────────────────────────────────────────────

  _isInScope(hostname) {
    hostname = hostname.toLowerCase();

    for (const pattern of this.excludeScope) {
      if (this._matchPattern(hostname, pattern)) return false;
    }

    if (this.scope.length === 0) return true;

    for (const pattern of this.scope) {
      if (this._matchPattern(hostname, pattern)) return true;
    }

    return false;
  }

  _matchPattern(hostname, pattern) {
    pattern = pattern.toLowerCase();
    if (pattern.startsWith('*.')) {
      const base = pattern.slice(2);
      return hostname === base || hostname.endsWith('.' + base);
    }
    return hostname === pattern;
  }

  setScope(scope, excludeScope) {
    this.scope = scope || [];
    this.excludeScope = excludeScope || [];
  }

  // ── Request Replay ────────────────────────────────────────────────────

  async replay(captureId, modifications = {}) {
    const original = this.history.find(c => c.id === captureId);
    if (!original) throw new Error('Request not found in history');

    const method = modifications.method || original.method;
    const url = new URL(modifications.url || original.url);
    const headers = { ...original.request.headers, ...(modifications.headers || {}) };
    const body = modifications.body !== undefined ? modifications.body : original.request.body;

    const isHttps = url.protocol === 'https:';
    const httpModule = isHttps ? https : http;

    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const opts = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + url.search,
        method,
        headers,
        rejectUnauthorized: true, // CodeQL[js/disabling-certificate-validation] — re-enabled; proxy is for local traffic capture only
      };

      const req = httpModule.request(opts, async (res) => {
        const { body: resBody, size, truncated } = await collectBody(res);

        const capture = {
          id: captureId(),
          timestamp: new Date().toISOString(),
          method,
          url: url.href,
          hostname: url.hostname,
          path: url.pathname + url.search,
          protocol: url.protocol.replace(':', ''),
          request: { headers, body, size: Buffer.byteLength(body || '') },
          response: {
            status: res.statusCode,
            statusText: res.statusMessage,
            headers: parseHeaders(res.rawHeaders),
            body: resBody,
            size,
            truncated,
          },
          duration: Date.now() - startTime,
          flags: ['replayed'],
          tags: ['replay'],
        };

        this._captureComplete(capture);
        resolve(capture);
      });

      req.on('error', (err) => reject(err));
      if (body) req.write(body);
      req.end();
    });
  }

  // ── History & Stats ───────────────────────────────────────────────────

  getHistory(filters = {}) {
    let items = [...this.history];

    if (filters.hostname) {
      items = items.filter(c => c.hostname?.includes(filters.hostname));
    }
    if (filters.method) {
      items = items.filter(c => c.method === filters.method);
    }
    if (filters.status) {
      items = items.filter(c => c.response?.status === filters.status);
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      items = items.filter(c =>
        c.url.toLowerCase().includes(q) ||
        c.request?.body?.toLowerCase().includes(q) ||
        c.response?.body?.toLowerCase().includes(q)
      );
    }
    if (filters.flags) {
      items = items.filter(c => c.flags?.some(f => filters.flags.includes(f)));
    }

    const offset = filters.offset || 0;
    const limit = filters.limit || 100;
    return {
      items: items.slice(offset, offset + limit),
      total: items.length,
    };
  }

  getCapture(id) {
    return this.history.find(c => c.id === id) || null;
  }

  getStats() {
    return {
      running: this.running,
      port: this.port,
      intercept: this.interceptEnabled,
      paused: this.paused,
      scope: this.scope,
      caPath: this.ca?.path,
      ...this.stats,
      historySize: this.history.length,
    };
  }

  clearHistory() {
    this.history = [];
    this.stats = { total: 0, captured: 0, filtered: 0, errors: 0 };
  }

  pause() { this.paused = true; }
  resume() { this.paused = false; }
}

// ─── Singleton ──────────────────────────────────────────────────────────────

const proxy = new CrowByteProxy();

// ─── IPC Registration (called from main.cjs) ───────────────────────────────

function registerProxyIPC(ipcMain, mainWindow) {
  ipcMain.handle('proxy:start', async (_event, opts) => {
    try {
      const result = await proxy.start(opts);
      return { success: true, ...result };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('proxy:stop', () => {
    proxy.stop();
    return { success: true };
  });

  ipcMain.handle('proxy:status', () => proxy.getStats());

  ipcMain.handle('proxy:set-scope', (_event, { scope, excludeScope }) => {
    proxy.setScope(scope, excludeScope);
    return { success: true };
  });

  ipcMain.handle('proxy:history', (_event, filters) => proxy.getHistory(filters));

  ipcMain.handle('proxy:get-capture', (_event, id) => proxy.getCapture(id));

  ipcMain.handle('proxy:replay', async (_event, { id, modifications }) => {
    try {
      const result = await proxy.replay(id, modifications);
      return { success: true, capture: result };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('proxy:pause', () => { proxy.pause(); return { success: true }; });
  ipcMain.handle('proxy:resume', () => { proxy.resume(); return { success: true }; });
  ipcMain.handle('proxy:clear', () => { proxy.clearHistory(); return { success: true }; });

  ipcMain.handle('proxy:ca-path', () => {
    const caDir = getCADir();
    const certPath = path.join(caDir, 'ca-cert.pem');
    return fs.existsSync(certPath) ? certPath : null;
  });

  // Forward captures to renderer in real-time
  proxy.on('capture', (capture) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      const light = {
        id: capture.id,
        timestamp: capture.timestamp,
        method: capture.method,
        url: capture.url,
        hostname: capture.hostname,
        path: capture.path,
        protocol: capture.protocol,
        status: capture.response?.status,
        duration: capture.duration,
        requestSize: capture.request?.size || 0,
        responseSize: capture.response?.size || 0,
        contentType: capture.response?.headers?.['content-type'],
        flags: capture.flags,
        tags: capture.tags,
      };
      mainWindow.webContents.send('proxy:capture', light);
    }
  });

  proxy.on('error', (err) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('proxy:error', err.message);
    }
  });
}

module.exports = { proxy, registerProxyIPC, getCADir };
