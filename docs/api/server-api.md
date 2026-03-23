# CrowByte Server API Reference

> **Version:** 1.0.0
> **Source:** `apps/server/src/`
> **Transport:** HTTP/HTTPS + WebSocket (same port)
> **Default port:** 3000 (configurable via `PORT` env var)

---

## Overview

The CrowByte Server is an Express.js application that provides system monitoring, security tool execution, Docker management, and remote terminal access. It serves the desktop frontend as static files and exposes a JSON REST API alongside a WebSocket interface.

**Base URL:**

```
http://<host>:3000   (default, no SSL)
https://<host>:3000  (when SSL_CERT and SSL_KEY env vars are set)
```

**Content-Type:** All request and response bodies are `application/json` unless noted otherwise. Request body size limit is 10 MB.

**CORS:** Enabled. Origin is controlled by `CORS_ORIGIN` env var (defaults to permissive).

---

## Authentication

The server uses JWT Bearer tokens. Tokens are issued via `/api/auth/login` and expire after 24 hours. Refresh tokens expire after 7 days.

### Auth Header Format

```
Authorization: Bearer <token>
```

### Public Endpoints (no auth required)

The following routes skip JWT verification entirely:

| Route | Reason |
|-------|--------|
| `POST /api/auth/login` | Login endpoint |
| `/api/system/*` | System metrics (read-only) |
| `/api/docker/*` | Docker status (read-only) |
| `GET /api/tools/available` | Tool listing (read-only) |
| `GET /api/health` | Health check |

All other `/api/*` routes require a valid `Authorization: Bearer <token>` header. Failure returns:

```json
{ "error": "Missing or invalid Authorization header" }
```

### Token Errors

| Status | Response |
|--------|----------|
| `401` | `{ "error": "Token expired" }` |
| `401` | `{ "error": "Invalid token" }` |

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server listen port |
| `JWT_SECRET` | Random 64-byte hex | Secret for signing JWTs. Auto-generated if not set. |
| `CROWBYTE_USER` | `admin` | Login username |
| `CROWBYTE_PASS` | `crowbyte` | Login password (plaintext, hashed at startup with bcrypt) |
| `CROWBYTE_PASS_HASH` | — | Pre-hashed bcrypt password (takes priority over `CROWBYTE_PASS`) |
| `SSL_CERT` | — | Path to SSL certificate file |
| `SSL_KEY` | — | Path to SSL private key file |
| `CORS_ORIGIN` | `true` (permissive) | Allowed CORS origin |

---

## Endpoints

### Health Check

#### `GET /api/health`

Returns server health and active connection counts. No authentication required.

**Response:**

```json
{
  "status": "ok",
  "uptime": 3421.52,
  "timestamp": 1711180200000,
  "version": "1.0.0",
  "metricsClients": 2,
  "terminalSessions": 1,
  "activeExecutions": 0
}
```

**Example:**

```bash
curl http://localhost:3000/api/health
```

---

### Authentication (`/api/auth`)

#### `POST /api/auth/login`

Authenticate with username and password. Rate-limited to 10 attempts per 15 minutes per IP.

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `username` | string | yes | Account username |
| `password` | string | yes | Account password |

**Request:**

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "crowbyte"}'
```

**Success Response (200):**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "username": "admin"
  },
  "expiresIn": 86400
}
```

| Field | Description |
|-------|-------------|
| `token` | JWT access token, expires in 24 hours |
| `refreshToken` | JWT refresh token, expires in 7 days |
| `expiresIn` | Token lifetime in seconds (86400 = 24h) |

**Error Responses:**

| Status | Body | Condition |
|--------|------|-----------|
| `400` | `{ "error": "Username and password are required" }` | Missing fields |
| `401` | `{ "error": "Invalid credentials" }` | Wrong username or password |
| `429` | `{ "error": "Too many login attempts. Try again in 15 minutes." }` | Rate limit exceeded |
| `500` | `{ "error": "Internal server error" }` | Server-side failure |

---

#### `POST /api/auth/refresh`

Exchange a valid refresh token for a new access token and refresh token pair.

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `refreshToken` | string | yes | A valid refresh token from login or a previous refresh |

**Request:**

```bash
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "eyJhbGciOiJIUzI1NiIs..."}'
```

**Success Response (200):**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": 86400
}
```

**Error Responses:**

| Status | Body | Condition |
|--------|------|-----------|
| `400` | `{ "error": "Refresh token required" }` | Missing body field |
| `401` | `{ "error": "Refresh token expired, please login again" }` | Token expired |
| `401` | `{ "error": "Invalid refresh token" }` | Malformed or wrong type |

---

#### `GET /api/auth/me`

Return the authenticated user's JWT payload. Requires `Authorization: Bearer <token>` header.

**Request:**

```bash
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

**Success Response (200):**

```json
{
  "username": "admin",
  "iat": 1711180200,
  "exp": 1711266600
}
```

| Field | Description |
|-------|-------------|
| `username` | Authenticated username |
| `iat` | Token issued-at timestamp (Unix seconds) |
| `exp` | Token expiration timestamp (Unix seconds) |

**Error Response:**

| Status | Body |
|--------|------|
| `401` | `{ "error": "Not authenticated" }` |

---

### System Metrics (`/api/system`)

All system endpoints are **public** (no auth required). Data is read from `/proc` filesystem and the `systeminformation` library.

---

#### `GET /api/system/overview`

Returns hostname, OS info, uptime, and load averages.

**Request:**

```bash
curl http://localhost:3000/api/system/overview
```

**Response (200):**

```json
{
  "hostname": "kali-workstation",
  "platform": "linux",
  "distro": "Kali GNU/Linux",
  "release": "2025.1",
  "kernel": "6.18.12+kali-amd64",
  "arch": "x64",
  "uptimeSeconds": 345621.42,
  "uptimeFormatted": "3d 23h 57m",
  "loadAvg": {
    "load1": 1.23,
    "load5": 0.98,
    "load15": 0.76,
    "runningProcesses": 3,
    "totalProcesses": 412
  }
}
```

---

#### `GET /api/system/cpu`

Returns CPU model info, core counts, speeds, per-core usage percentages, and temperature.

**Request:**

```bash
curl http://localhost:3000/api/system/cpu
```

**Response (200):**

```json
{
  "model": "AMD Ryzen 9 7950X",
  "cores": 16,
  "threads": 32,
  "speed": 4.5,
  "speedMin": 3.0,
  "speedMax": 5.7,
  "usage": {
    "total": 12.45,
    "perCore": [8.2, 15.1, 3.4, 22.0],
    "user": 7.83,
    "system": 3.21,
    "idle": 87.55,
    "iowait": 1.41
  },
  "temperature": {
    "main": 52,
    "max": 68,
    "cores": [50, 53, 48, 55]
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `usage.total` | number | Overall CPU usage percentage |
| `usage.perCore` | number[] | Usage percentage per logical core |
| `usage.user` | number | Time spent in user space (%) |
| `usage.system` | number | Time spent in kernel space (%) |
| `usage.idle` | number | Idle time (%) |
| `usage.iowait` | number | I/O wait time (%) |
| `temperature` | object\|null | Null if no temperature sensor available |

Note: The first call after server start returns instantaneous estimates. Subsequent calls return delta-based percentages (more accurate).

---

#### `GET /api/system/memory`

Returns RAM and swap usage in bytes, with human-readable formatted values.

**Request:**

```bash
curl http://localhost:3000/api/system/memory
```

**Response (200):**

```json
{
  "total": 33554432000,
  "used": 12884901888,
  "free": 8589934592,
  "available": 20669530112,
  "buffers": 524288000,
  "cached": 4294967296,
  "usedPercent": 38.41,
  "swap": {
    "total": 8589934592,
    "used": 0,
    "free": 8589934592
  },
  "formatted": {
    "total": "31.25 GB",
    "used": "12.00 GB",
    "free": "8.00 GB",
    "available": "19.25 GB"
  }
}
```

All numeric values are in bytes (converted from KB as read from `/proc/meminfo`).

---

#### `GET /api/system/disk`

Returns mounted filesystem sizes and disk I/O statistics.

**Request:**

```bash
curl http://localhost:3000/api/system/disk
```

**Response (200):**

```json
{
  "filesystems": [
    {
      "fs": "/dev/sda2",
      "type": "ext4",
      "mount": "/",
      "size": 512110190592,
      "used": 234881024000,
      "available": 277229166592,
      "usedPercent": 45.87,
      "formatted": {
        "size": "476.94 GB",
        "used": "218.73 GB",
        "available": "258.21 GB"
      }
    }
  ],
  "io": [
    {
      "device": "sda",
      "readsCompleted": 1548234,
      "writesCompleted": 982341,
      "sectorsRead": 48234112,
      "sectorsWritten": 31209472,
      "ioInProgress": 0,
      "ioTimeMs": 1234567
    }
  ]
}
```

The `io` array is read from `/proc/diskstats` and only includes whole-disk devices (filters out partition entries like `sda1`, except for `dm-*` and `nvme*` devices).

---

#### `GET /api/system/network`

Returns network interfaces with addresses, link state, and traffic counters.

**Request:**

```bash
curl http://localhost:3000/api/system/network
```

**Response (200):**

```json
{
  "interfaces": [
    {
      "iface": "eth0",
      "ip4": "192.168.1.100",
      "ip6": "fe80::1",
      "mac": "00:11:22:33:44:55",
      "type": "wired",
      "speed": 1000,
      "operstate": "up",
      "rx": {
        "bytes": 1073741824,
        "packets": 812345,
        "errors": 0,
        "formatted": "1.00 GB"
      },
      "tx": {
        "bytes": 536870912,
        "packets": 456123,
        "errors": 0,
        "formatted": "512.00 MB"
      }
    }
  ],
  "connectionCount": 142
}
```

| Field | Description |
|-------|-------------|
| `rx` / `tx` | Receive and transmit stats from `/proc/net/dev`. Null if no proc stats found for the interface. |
| `connectionCount` | Total active network connections (from `systeminformation`) |

---

#### `GET /api/system/processes`

Returns top 25 processes sorted by CPU usage and top 25 sorted by memory usage.

**Request:**

```bash
curl http://localhost:3000/api/system/processes
```

**Response (200):**

```json
{
  "total": 312,
  "running": 3,
  "sleeping": 298,
  "blocked": 0,
  "byCpu": [
    {
      "pid": 1234,
      "name": "node",
      "command": "/usr/bin/node /opt/crowbyte/server.js",
      "cpu": 12.5,
      "mem": 3.2,
      "memRss": 167772160,
      "state": "running",
      "user": "root",
      "started": "2025-01-15T10:30:00.000Z"
    }
  ],
  "byMem": [
    {
      "pid": 5678,
      "name": "chrome",
      "command": "/opt/google/chrome/chrome --type=renderer",
      "cpu": 2.1,
      "mem": 8.7,
      "memRss": 456789012,
      "state": "sleeping",
      "user": "rainkode",
      "started": "2025-01-15T09:00:00.000Z"
    }
  ]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `command` | string | Truncated to 200 characters |
| `cpu` | number | CPU usage percentage |
| `mem` | number | Memory usage percentage |
| `memRss` | number | Resident set size in bytes |

---

#### `GET /api/system/gpu`

Returns GPU information. Tries `nvidia-smi` first for NVIDIA cards, falls back to `systeminformation` for generic detection.

**Request:**

```bash
curl http://localhost:3000/api/system/gpu
```

**Response (200) -- NVIDIA GPU detected:**

```json
{
  "available": true,
  "driver": "nvidia",
  "gpus": [
    {
      "name": "NVIDIA GeForce RTX 4090",
      "temperatureC": 45,
      "gpuUtilization": 12,
      "memoryUtilization": 8,
      "memoryTotal": 24564,
      "memoryUsed": 1024,
      "memoryFree": 23540,
      "powerDraw": 85.5,
      "fanSpeed": 30
    }
  ]
}
```

**Response (200) -- Generic GPU:**

```json
{
  "available": true,
  "driver": "generic",
  "gpus": [
    {
      "name": "AMD Radeon RX 7900 XTX",
      "vendor": "Advanced Micro Devices, Inc.",
      "vram": 24576,
      "temperatureC": 42,
      "bus": "PCI"
    }
  ]
}
```

**Response (200) -- No GPU:**

```json
{
  "available": false,
  "gpus": []
}
```

---

#### `GET /api/system/docker`

Returns Docker daemon summary including container and image counts. Uses the Docker socket at `/var/run/docker.sock`.

**Request:**

```bash
curl http://localhost:3000/api/system/docker
```

**Response (200):**

```json
{
  "running": 3,
  "paused": 0,
  "stopped": 1,
  "totalImages": 12,
  "serverVersion": "24.0.7",
  "containers": [
    {
      "id": "a1b2c3d4e5f6",
      "names": ["/my-container"],
      "image": "nginx:latest",
      "state": "running",
      "status": "Up 2 hours",
      "created": 1711093800,
      "ports": [
        { "IP": "0.0.0.0", "PrivatePort": 80, "PublicPort": 8080, "Type": "tcp" }
      ]
    }
  ],
  "images": [
    {
      "id": "sha256:abc123",
      "repoTags": ["nginx:latest"],
      "size": 142000000,
      "created": 1710000000,
      "formatted": { "size": "132.18 MB" }
    }
  ]
}
```

Images are capped at 50 entries.

**Response (200) -- Docker not available:**

```json
{
  "available": false,
  "error": "Docker socket not accessible"
}
```

---

#### `GET /api/system/services`

Returns the `systemctl is-active` status for a predefined list of common services.

**Request:**

```bash
curl http://localhost:3000/api/system/services
```

**Monitored services:** `docker`, `nginx`, `apache2`, `sshd`, `postgresql`, `mysql`, `redis-server`, `mongod`, `ufw`, `fail2ban`, `cron`, `NetworkManager`, `tailscaled`

**Response (200):**

```json
{
  "services": [
    { "name": "docker", "status": "active" },
    { "name": "nginx", "status": "inactive" },
    { "name": "sshd", "status": "active" },
    { "name": "postgresql", "status": "active" },
    { "name": "ufw", "status": "active" },
    { "name": "fail2ban", "status": "active" },
    { "name": "cron", "status": "active" },
    { "name": "tailscaled", "status": "active" }
  ]
}
```

Status values: `active`, `inactive`, `failed`, `unknown`

---

### Tool Execution (`/api/tools`)

Security tool execution endpoints. Tools are spawned as child processes with output capture.

---

#### `GET /api/tools/available`

List all whitelisted security tools with their install paths and versions. Results are cached for 5 minutes. **No auth required.**

**Request:**

```bash
curl http://localhost:3000/api/tools/available
```

**Response (200):**

```json
{
  "total": 24,
  "available": 18,
  "tools": [
    {
      "name": "nmap",
      "path": "/usr/bin/nmap",
      "version": "Nmap 7.95 ( https://nmap.org )",
      "available": true
    },
    {
      "name": "masscan",
      "path": null,
      "version": null,
      "available": false
    }
  ]
}
```

**Whitelisted Tools (24):**

| Tool | Category |
|------|----------|
| `nmap` | Port scanning |
| `nuclei` | Vulnerability scanning |
| `httpx` | HTTP probing |
| `subfinder` | Subdomain enumeration |
| `ffuf` | Fuzzing / directory brute-force |
| `sqlmap` | SQL injection |
| `nikto` | Web server scanning |
| `masscan` | Mass port scanning |
| `katana` | Web crawling |
| `dnsx` | DNS resolution |
| `naabu` | Port scanning (fast) |
| `waybackurls` | Wayback Machine URL extraction |
| `dalfox` | XSS scanning |
| `gau` | URL fetching (AlienVault, Wayback, etc.) |
| `whois` | Domain WHOIS lookup |
| `dig` | DNS query |
| `curl` | HTTP requests |
| `ping` | ICMP ping |
| `traceroute` | Network path tracing |
| `gobuster` | Directory/DNS brute-force |
| `feroxbuster` | Recursive content discovery |
| `wfuzz` | Web fuzzer |
| `arjun` | HTTP parameter discovery |
| `amass` | Attack surface mapping |

---

#### `POST /api/tools/execute`

Execute a whitelisted tool with arguments. **Requires auth.** Supports synchronous (wait for completion) and streaming (WebSocket) modes.

**Request Body:**

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `command` | string | yes | — | Tool binary name (must be in whitelist) |
| `args` | string[] | no | `[]` | Command-line arguments |
| `timeout` | number | no | `300000` | Max execution time in ms (capped at 600000 / 10 min) |

**Query Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `stream` | string | Set to `"true"` to return immediately with an `executionId` for WebSocket streaming |

**Security:** Arguments are sanitized -- shell metacharacters (`;`, `&`, `|`, `` ` ``, `$`, `(`, `)`, `{`, `}`) are rejected in non-flag arguments.

##### Synchronous Mode (default)

Waits for the process to complete, then returns all output.

**Request:**

```bash
curl -X POST http://localhost:3000/api/tools/execute \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "command": "nmap",
    "args": ["-sV", "--top-ports", "100", "scanme.nmap.org"],
    "timeout": 60000
  }'
```

**Response (200):**

```json
{
  "command": "nmap",
  "args": ["-sV", "--top-ports", "100", "scanme.nmap.org"],
  "exitCode": 0,
  "output": "Starting Nmap 7.95 ...\nNmap scan report for scanme.nmap.org (45.33.32.156)\n...",
  "duration": 12543
}
```

##### Streaming Mode

Returns immediately with an `executionId`. Connect to the WebSocket `exec` channel to receive output in real time.

**Request:**

```bash
curl -X POST "http://localhost:3000/api/tools/execute?stream=true" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "command": "nuclei",
    "args": ["-u", "https://target.com", "-severity", "critical,high"]
  }'
```

**Response (200):**

```json
{
  "executionId": "exec_1711180200000_a3f2k1",
  "command": "nuclei",
  "args": ["-u", "https://target.com", "-severity", "critical,high"],
  "message": "Execution started. Connect to WebSocket with this executionId for streaming output."
}
```

**Error Responses:**

| Status | Body | Condition |
|--------|------|-----------|
| `400` | `{ "error": "command is required and must be a string" }` | Missing or invalid command |
| `400` | `{ "error": "args must be an array of strings" }` | Invalid args type |
| `403` | `{ "error": "Command 'evil' is not in the allowed tools whitelist", "allowed": [...] }` | Tool not whitelisted |
| `500` | `{ "error": "Unsafe argument rejected: ; rm -rf /" }` | Blocked shell metachar |

---

#### `POST /api/tools/scan`

Run a predefined scan preset against a target. Always returns immediately with an `executionId` (asynchronous). **Requires auth.**

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `preset` | string | yes | Scan preset name |
| `target` | string | yes | Target host, URL, or domain (max 500 chars) |

**Available Presets:**

| Preset | Tool | Arguments | Description |
|--------|------|-----------|-------------|
| `port-scan` | `nmap` | `-sV -sC --top-ports 1000 -T4 <target>` | Top 1000 ports with service/version detection |
| `vuln-scan` | `nuclei` | `-severity critical,high,medium -silent -u <target>` | Nuclei vulnerability scan |
| `web-scan` | `nikto` | `-Tuning 123bde -timeout 10 -h <target>` | Nikto web server scan |
| `subdomain-enum` | `subfinder` | `-silent -d <target>` | Passive subdomain enumeration |
| `dir-brute` | `ffuf` | `-w /usr/share/seclists/Discovery/Web-Content/common.txt -mc 200,204,301,302,307,401,403 -u <target>/FUZZ` | Directory brute-force |

**Request:**

```bash
curl -X POST http://localhost:3000/api/tools/scan \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"preset": "port-scan", "target": "scanme.nmap.org"}'
```

**Response (200):**

```json
{
  "executionId": "scan_1711180200000_b7x3m9",
  "preset": "port-scan",
  "command": "nmap",
  "args": ["-sV", "-sC", "--top-ports", "1000", "-T4", "scanme.nmap.org"],
  "description": "Top 1000 ports with service/version detection",
  "target": "scanme.nmap.org",
  "message": "Scan started. Poll /api/tools/execution/:id or connect via WebSocket for streaming."
}
```

**Error Responses:**

| Status | Body | Condition |
|--------|------|-----------|
| `400` | `{ "error": "preset and target are required", "availablePresets": [...] }` | Missing fields |
| `400` | `{ "error": "Invalid target" }` | Target too long or wrong type |
| `400` | `{ "error": "Unknown preset 'foo'", "availablePresets": [...] }` | Invalid preset name |
| `404` | `{ "error": "Tool 'nikto' is not installed on this system" }` | Required tool missing |

---

#### `GET /api/tools/execution/:id`

Poll the status and output of a running or completed tool execution. **Requires auth.**

**Path Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `id` | string | Execution ID from `/execute` or `/scan` |

**Request:**

```bash
curl http://localhost:3000/api/tools/execution/exec_1711180200000_a3f2k1 \
  -H "Authorization: Bearer <token>"
```

**Response (200) -- Running:**

```json
{
  "id": "exec_1711180200000_a3f2k1",
  "running": true,
  "exitCode": null,
  "output": "Starting Nmap 7.95...\nScanning 1000 ports...\n",
  "duration": 5432
}
```

**Response (200) -- Completed:**

```json
{
  "id": "exec_1711180200000_a3f2k1",
  "running": false,
  "exitCode": 0,
  "output": "Starting Nmap 7.95...\n...\nNmap done: 1 IP address scanned in 12.34 seconds\n",
  "duration": 12340
}
```

**Error Response:**

| Status | Body |
|--------|------|
| `404` | `{ "error": "Execution not found or expired" }` |

Execution records are automatically cleaned up 5 minutes after the process exits.

---

### Terminal Sessions

#### `GET /api/terminal/sessions`

List active terminal WebSocket sessions. No auth required (informational).

**Request:**

```bash
curl http://localhost:3000/api/terminal/sessions
```

**Response (200):**

```json
{
  "sessions": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "pid": 12345,
      "createdAt": 1711180200000
    }
  ]
}
```

---

### Docker Management (`/api/docker`)

Full Docker container and image management via the Docker socket. All endpoints are **public** (no auth required) as the prefix `/api/docker/` is in the public prefixes list. A middleware check verifies Docker availability before each request.

**Docker Unavailable Response (503):**

```json
{ "error": "Docker socket not found at /var/run/docker.sock" }
```
```json
{ "error": "Permission denied accessing Docker socket" }
```
```json
{ "error": "Docker daemon is not running" }
```

---

#### `GET /api/docker/containers`

List Docker containers.

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `all` | string | `"true"` | Show all containers (including stopped). Set to `"false"` for running only. |

**Request:**

```bash
curl http://localhost:3000/api/docker/containers
curl "http://localhost:3000/api/docker/containers?all=false"
```

**Response (200):**

```json
{
  "count": 4,
  "containers": [
    {
      "id": "a1b2c3d4e5f6",
      "fullId": "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2",
      "names": ["my-nginx"],
      "image": "nginx:latest",
      "imageId": "sha256:abc123",
      "command": "nginx -g 'daemon off;'",
      "created": 1711093800,
      "state": "running",
      "status": "Up 2 hours",
      "ports": [
        {
          "ip": "0.0.0.0",
          "privatePort": 80,
          "publicPort": 8080,
          "type": "tcp"
        }
      ],
      "labels": { "maintainer": "NGINX Docker Maintainers" },
      "mounts": [
        {
          "type": "bind",
          "source": "/data/nginx/html",
          "destination": "/usr/share/nginx/html",
          "mode": "ro",
          "rw": false
        }
      ],
      "networkMode": ["bridge"]
    }
  ]
}
```

---

#### `POST /api/docker/containers`

Create a new Docker container.

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `image` | string | yes | Docker image (e.g., `"nginx:latest"`) |
| `name` | string | no | Container name |
| `env` | string[] | no | Environment variables (e.g., `["FOO=bar"]`) |
| `ports` | object | no | Port mappings: `{ "containerPort/proto": "hostPort" }` |
| `volumes` | string[] | no | Volume binds (e.g., `["/host/path:/container/path:ro"]`) |
| `command` | string\|string[] | no | Override CMD (string is split by spaces) |
| `restart` | string | no | Restart policy: `"no"`, `"always"`, `"unless-stopped"`, `"on-failure"` |

**Request:**

```bash
curl -X POST http://localhost:3000/api/docker/containers \
  -H "Content-Type: application/json" \
  -d '{
    "image": "nginx:latest",
    "name": "web-server",
    "ports": {"80/tcp": "8080"},
    "volumes": ["/data/html:/usr/share/nginx/html:ro"],
    "restart": "unless-stopped"
  }'
```

**Response (201):**

```json
{
  "id": "a1b2c3d4e5f6",
  "fullId": "a1b2c3d4e5f6...",
  "name": "web-server",
  "state": "created",
  "image": "nginx:latest"
}
```

**Error Response:**

| Status | Body |
|--------|------|
| `400` | `{ "error": "image is required" }` |
| `500` | `{ "error": "<docker error message>" }` |

---

#### `POST /api/docker/containers/:id/start`

Start a stopped container.

**Path Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `id` | string | Container ID (short or full) or name |

**Request:**

```bash
curl -X POST http://localhost:3000/api/docker/containers/a1b2c3d4e5f6/start
```

**Response (200):**

```json
{ "message": "Container started", "id": "a1b2c3d4e5f6" }
```

Already running:

```json
{ "message": "Container already running", "id": "a1b2c3d4e5f6" }
```

**Error:** `404` if container not found.

---

#### `POST /api/docker/containers/:id/stop`

Stop a running container.

**Path Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `id` | string | Container ID or name |

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `timeout` | number | `10` | Seconds to wait before killing |

**Request:**

```bash
curl -X POST "http://localhost:3000/api/docker/containers/a1b2c3d4e5f6/stop?timeout=30"
```

**Response (200):**

```json
{ "message": "Container stopped", "id": "a1b2c3d4e5f6" }
```

Already stopped:

```json
{ "message": "Container already stopped", "id": "a1b2c3d4e5f6" }
```

---

#### `DELETE /api/docker/containers/:id`

Remove a container.

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `force` | string | `"false"` | Force remove running container |
| `v` | string | `"false"` | Remove associated anonymous volumes |

**Request:**

```bash
curl -X DELETE "http://localhost:3000/api/docker/containers/a1b2c3d4e5f6?force=true&v=true"
```

**Response (200):**

```json
{ "message": "Container removed", "id": "a1b2c3d4e5f6" }
```

---

#### `GET /api/docker/containers/:id/logs`

Retrieve container logs.

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `tail` | number | `100` | Number of log lines from the end |
| `since` | number | `0` | Unix timestamp to start from |

**Request:**

```bash
curl "http://localhost:3000/api/docker/containers/a1b2c3d4e5f6/logs?tail=50"
```

**Response (200):**

```json
{
  "id": "a1b2c3d4e5f6",
  "lines": 50,
  "logs": [
    "2025-01-15T10:30:00.000Z 192.168.1.1 - - [15/Jan/2025:10:30:00 +0000] \"GET / HTTP/1.1\" 200 612",
    "2025-01-15T10:30:01.000Z 192.168.1.1 - - [15/Jan/2025:10:30:01 +0000] \"GET /favicon.ico HTTP/1.1\" 404 555"
  ]
}
```

Docker multiplexed stream headers (8-byte frame headers) are automatically stripped from log output.

---

#### `GET /api/docker/containers/:id/stats`

Get a real-time resource usage snapshot for a running container.

**Request:**

```bash
curl http://localhost:3000/api/docker/containers/a1b2c3d4e5f6/stats
```

**Response (200):**

```json
{
  "id": "a1b2c3d4e5f6",
  "cpu": {
    "percent": 2.45,
    "numCpus": 8
  },
  "memory": {
    "usage": 52428800,
    "limit": 8589934592,
    "percent": 0.61,
    "formatted": {
      "usage": "50.00 MB",
      "limit": "8.00 GB"
    }
  },
  "network": {
    "rxBytes": 1048576,
    "txBytes": 524288,
    "formatted": {
      "rx": "1.00 MB",
      "tx": "512.00 KB"
    }
  },
  "blockIo": {
    "readBytes": 4194304,
    "writeBytes": 2097152,
    "formatted": {
      "read": "4.00 MB",
      "write": "2.00 MB"
    }
  },
  "pids": 5
}
```

| Field | Description |
|-------|-------------|
| `cpu.percent` | CPU usage as percentage of all available cores |
| `memory.usage` | Memory usage minus cache (bytes) |
| `memory.limit` | Memory limit (bytes), typically total host RAM if no limit set |
| `pids` | Number of processes inside the container |

---

#### `GET /api/docker/images`

List all Docker images.

**Request:**

```bash
curl http://localhost:3000/api/docker/images
```

**Response (200):**

```json
{
  "count": 12,
  "images": [
    {
      "id": "abc123def456",
      "fullId": "sha256:abc123def456...",
      "repoTags": ["nginx:latest"],
      "repoDigests": ["nginx@sha256:..."],
      "size": 142000000,
      "virtualSize": 142000000,
      "created": 1710000000,
      "formatted": {
        "size": "132.18 MB"
      }
    }
  ]
}
```

If an image has no tags: `"repoTags": ["<none>:<none>"]`

---

#### `POST /api/docker/images/pull`

Pull a Docker image from a registry. Blocks until the pull is complete.

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `image` | string | yes | Image reference (e.g., `"nginx:latest"`, `"ghcr.io/org/repo:tag"`) |

Image name is validated against the pattern `[\w.\-/:@]+`.

**Request:**

```bash
curl -X POST http://localhost:3000/api/docker/images/pull \
  -H "Content-Type: application/json" \
  -d '{"image": "nginx:latest"}'
```

**Response (200):**

```json
{
  "message": "Image 'nginx:latest' pulled successfully",
  "image": "nginx:latest",
  "progress": [
    "Pulling from library/nginx",
    "Digest: sha256:abc123...",
    "Status: Downloaded newer image for nginx:latest"
  ]
}
```

The `progress` array contains the last 10 pull progress lines.

**Error Responses:**

| Status | Body |
|--------|------|
| `400` | `{ "error": "image is required (e.g., \"nginx:latest\")" }` |
| `400` | `{ "error": "Invalid image name format" }` |
| `500` | `{ "error": "<docker pull error message>" }` |

---

## WebSocket Protocol

Connect to the WebSocket server on the same port as the HTTP server.

**URL Format:**

```
ws://<host>:3000/?type=<type>&token=<jwt>&<params>
wss://<host>:3000/?type=<type>&token=<jwt>&<params>
```

**Authentication:** All WebSocket connections require a valid JWT passed as the `token` query parameter.

**Auth Failure:**

```json
{ "type": "error", "message": "Authentication required. Pass ?token=JWT" }
```

Connection is closed with code `4001` ("Unauthorized").

**Connection Types:**

| `type` param | Description |
|--------------|-------------|
| `terminal` | Interactive shell session |
| `metrics` | Real-time system metrics stream |
| `exec` | Stream output from a tool execution |

**Server Shutdown:** All connected clients receive before disconnect:

```json
{ "type": "shutdown", "message": "Server shutting down" }
```

---

### Terminal WebSocket (`type=terminal`)

Spawns a PTY shell (using `node-pty`) and relays stdin/stdout over the WebSocket.

**Connection URL:**

```
ws://localhost:3000/?type=terminal&token=<jwt>&cols=120&rows=40&sessionId=<optional-uuid>
```

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `token` | string | required | JWT token |
| `cols` | number | `120` | Initial terminal columns |
| `rows` | number | `40` | Initial terminal rows |
| `sessionId` | string | auto-generated UUID | Custom session identifier |

**Connection Flow:**

1. Client connects with params
2. Server spawns PTY shell (uses `$SHELL` or `/bin/bash`)
3. Server sends session info:

```json
{
  "type": "session",
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "shell": "/bin/zsh",
  "pid": 12345
}
```

4. Bidirectional data flow begins

**Client-to-Server Messages:**

| Message | Description |
|---------|-------------|
| `{ "type": "input", "data": "ls -la\r" }` | Keyboard input relayed to PTY |
| `{ "type": "resize", "cols": 200, "rows": 50 }` | Resize PTY (cols: 1-500, rows: 1-200) |
| `{ "type": "ping" }` | Keepalive ping |
| Raw text (non-JSON) | Treated as raw PTY input |

**Server-to-Client Messages:**

| Message | Description |
|---------|-------------|
| `{ "type": "session", "sessionId": "...", "shell": "...", "pid": N }` | Initial session info |
| `{ "type": "output", "data": "..." }` | Terminal output (may contain ANSI escape codes) |
| `{ "type": "exit", "exitCode": 0, "signal": null }` | Shell process exited |
| `{ "type": "pong", "timestamp": 1711180200000 }` | Pong reply |
| `{ "type": "error", "message": "..." }` | Error (e.g., failed to spawn shell) |

**Example (JavaScript):**

```javascript
const ws = new WebSocket('ws://localhost:3000/?type=terminal&token=MY_JWT&cols=120&rows=40');

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  if (msg.type === 'output') {
    terminal.write(msg.data); // xterm.js
  }
};

// Send keystrokes
terminal.onData((data) => {
  ws.send(JSON.stringify({ type: 'input', data }));
});

// Handle resize
terminal.onResize(({ cols, rows }) => {
  ws.send(JSON.stringify({ type: 'resize', cols, rows }));
});
```

---

### Metrics WebSocket (`type=metrics`)

Streams real-time system metrics every 2 seconds.

**Connection URL:**

```
ws://localhost:3000/?type=metrics&token=<jwt>&cpu=true&memory=true&network=true&disk=true&load=true
```

**Query Parameters (Subscription):**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `token` | string | required | JWT token |
| `cpu` | string | `"true"` | Subscribe to CPU metrics |
| `memory` | string | `"true"` | Subscribe to memory metrics |
| `network` | string | `"true"` | Subscribe to network metrics |
| `disk` | string | `"true"` | Subscribe to disk I/O metrics |
| `load` | string | `"true"` | Subscribe to load average |

Set any to `"false"` to exclude that metric category.

**Connection Flow:**

1. Server sends connection confirmation:

```json
{
  "type": "connected",
  "subscription": {
    "cpu": true,
    "memory": true,
    "network": true,
    "disk": true,
    "load": true
  },
  "intervalMs": 2000
}
```

2. Immediate initial metrics snapshot is sent
3. Metrics are pushed every 2 seconds

**Server-to-Client Metrics Message:**

```json
{
  "type": "metrics",
  "timestamp": 1711180200000,
  "cpu": {
    "total": 12.45,
    "perCore": [8.2, 15.1, 3.4, 22.0],
    "user": 7.83,
    "system": 3.21,
    "idle": 87.55,
    "iowait": 1.41
  },
  "memory": {
    "totalBytes": 34359738368,
    "usedBytes": 13194139648,
    "freeBytes": 8800100352,
    "availableBytes": 21165498368,
    "usedPercent": 38.41,
    "swap": {
      "totalBytes": 8589934592,
      "usedBytes": 0,
      "freeBytes": 8589934592
    }
  },
  "network": [
    {
      "iface": "eth0",
      "rxBytes": 1073741824,
      "txBytes": 536870912,
      "rxBytesPerSec": 125000,
      "txBytesPerSec": 62500
    }
  ],
  "disk": [
    {
      "device": "sda",
      "readsCompleted": 1548234,
      "writesCompleted": 982341,
      "sectorsRead": 48234112,
      "sectorsWritten": 31209472,
      "ioInProgress": 0,
      "ioTimeMs": 1234567
    }
  ],
  "load": {
    "load1": 1.23,
    "load5": 0.98,
    "load15": 0.76,
    "runningProcesses": 3,
    "totalProcesses": 412
  }
}
```

Only subscribed categories are included in each message. The loopback interface (`lo`) is excluded from network metrics. Network rates (`rxBytesPerSec`, `txBytesPerSec`) are calculated as deltas between consecutive reads.

**Client-to-Server Messages:**

Update subscription at runtime:

```json
{
  "type": "subscribe",
  "cpu": true,
  "memory": true,
  "network": false,
  "disk": false,
  "load": true
}
```

Server confirms:

```json
{
  "type": "subscription_updated",
  "subscription": {
    "cpu": true,
    "memory": true,
    "network": false,
    "disk": false,
    "load": true
  }
}
```

Keepalive:

```json
{ "type": "ping" }
```

Reply:

```json
{ "type": "pong", "timestamp": 1711180200000 }
```

---

### Execution Stream WebSocket (`type=exec`)

Stream real-time output from a running tool execution (started via `POST /api/tools/execute?stream=true` or `POST /api/tools/scan`).

**Connection URL:**

```
ws://localhost:3000/?type=exec&token=<jwt>&executionId=<id>
```

**Query Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `token` | string | yes | JWT token |
| `executionId` | string | yes | Execution ID from the execute/scan endpoint |

**Connection Flow:**

1. Server sends any buffered output accumulated before the WebSocket connected:

```json
{
  "type": "output",
  "data": "Starting Nmap 7.95...\n"
}
```

2. New output chunks are sent as they arrive (polled every 100ms):

```json
{
  "type": "output",
  "data": "Scanning port 80/tcp...\n"
}
```

3. When the process exits:

```json
{
  "type": "exit",
  "exitCode": 0,
  "duration": 12543
}
```

The WebSocket is closed by the server after sending the exit message.

**Error Messages:**

```json
{ "type": "error", "message": "executionId required" }
```

```json
{ "type": "error", "message": "Execution not found" }
```

---

## Error Response Format

All API error responses follow a consistent format:

```json
{
  "error": "Human-readable error description"
}
```

Some error responses include additional context:

```json
{
  "error": "Command 'evil' is not in the allowed tools whitelist",
  "allowed": ["nmap", "nuclei", "httpx", "..."]
}
```

```json
{
  "error": "Unknown preset 'foo'",
  "availablePresets": [
    { "name": "port-scan", "description": "Top 1000 ports with service/version detection" },
    { "name": "vuln-scan", "description": "Nuclei vulnerability scan (critical/high/medium)" }
  ]
}
```

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| `200` | Success |
| `201` | Created (container creation) |
| `400` | Bad request (missing/invalid parameters) |
| `401` | Unauthorized (missing/expired/invalid token) |
| `403` | Forbidden (tool not whitelisted) |
| `404` | Not found (container, execution, endpoint) |
| `429` | Rate limited (login attempts) |
| `500` | Internal server error |
| `503` | Service unavailable (Docker not accessible, frontend not built) |
