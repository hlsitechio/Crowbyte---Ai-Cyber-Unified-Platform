# CrowByte Terminal -- Docker Deployment Guide

Run CrowByte Terminal as a Docker container accessible through your browser via noVNC. The container packages the full Electron application with Xvfb (virtual framebuffer), a VNC server, and a noVNC WebSocket proxy, giving you the complete desktop experience without any native installation.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Architecture](#architecture)
3. [Build from Source](#build-from-source)
4. [Pull from Registry](#pull-from-registry)
5. [Docker Compose](#docker-compose)
6. [Configuration](#configuration)
7. [Multi-Architecture Builds](#multi-architecture-builds)
8. [Windows Containers](#windows-containers)
9. [CI/CD Pipeline](#cicd-pipeline)
10. [Volumes and Persistence](#volumes-and-persistence)
11. [Resource Limits](#resource-limits)
12. [Networking](#networking)
13. [Troubleshooting](#troubleshooting)

---

## Quick Start

```bash
# Pull and run (one command)
docker run -d \
  -p 6080:6080 \
  --shm-size=2g \
  --name crowbyte \
  hlsitech/crowbyte:latest

# Open in browser
open http://localhost:6080
```

That is it. CrowByte Terminal is now running in your browser.

---

## Architecture

```
+-----------------------------------------------------------+
|  Docker Container                                          |
|                                                            |
|  Xvfb (:99)          Virtual framebuffer (1920x1080x24)  |
|     |                                                      |
|     +-- Fluxbox       Lightweight window manager           |
|     |                                                      |
|     +-- Electron      CrowByte Terminal (React SPA)        |
|     |                                                      |
|     +-- x11vnc        VNC server (port 5900 internal)      |
|            |                                               |
|            +-- websockify   noVNC proxy (port 6080)        |
|                                                            |
|  Security Tools: nmap, nuclei, httpx, subfinder, ffuf,    |
|                  sqlmap, katana, dnsx, naabu               |
+-----------------------------------------------------------+
         |
         v
   Browser --> http://localhost:6080 --> noVNC --> VNC --> Xvfb
```

### Container Stack

| Component | Purpose |
|-----------|---------|
| **Xvfb** | Virtual X11 display (`:99`) at configurable resolution |
| **Fluxbox** | Lightweight window manager for Electron |
| **Electron** | CrowByte Terminal desktop app (React + TypeScript) |
| **x11vnc** | VNC server exposing the virtual display |
| **websockify + noVNC** | WebSocket proxy for browser-based VNC access |
| **Go tools** | nuclei, httpx, subfinder, ffuf (ProjectDiscovery) |
| **Python** | sqlmap |
| **nmap** | Network scanning |

---

## Build from Source

### Standard Build

```bash
git clone https://github.com/hlsitechio/crowbyte.git
cd crowbyte

docker build -t crowbyte .
```

The Dockerfile uses a multi-stage build:

**Stage 1 (builder)**: Node.js 20 on Debian Bookworm
- Copies `package.json` files for dependency caching
- Runs `npm install --legacy-peer-deps`
- Runs `npx vite build` to compile the React SPA

**Stage 2 (runtime)**: Node.js 20 on Debian Bookworm
- Installs display stack: Xvfb, x11vnc, noVNC, websockify, Fluxbox
- Installs Electron dependencies: GTK3, NSS, ALSA, etc.
- Installs Go 1.23 and compiles ProjectDiscovery tools (multi-arch aware)
- Installs Python 3 + sqlmap
- Installs nmap, curl, git, procps, iproute2, dnsutils
- Copies built app from Stage 1
- Sets up entrypoint and healthcheck

### Build with Custom Tag

```bash
docker build -t crowbyte:dev .
docker build -t crowbyte:v2.0.0 .
```

### Build Arguments

The Dockerfile uses the `TARGETARCH` build argument (auto-populated by Docker Buildx) to install the correct Go binary for the target platform:

```bash
# Explicit architecture
docker build --platform linux/amd64 -t crowbyte:amd64 .
docker build --platform linux/arm64 -t crowbyte:arm64 .
```

---

## Pull from Registry

### Docker Hub

```bash
docker pull hlsitech/crowbyte:latest
docker pull hlsitech/crowbyte:v2.0.0
docker pull hlsitech/crowbyte:main
docker pull hlsitech/crowbyte:windows    # Windows Server Core image
```

### GitHub Container Registry (GHCR)

```bash
docker pull ghcr.io/hlsitechio/crowbyte:latest
docker pull ghcr.io/hlsitechio/crowbyte:v2.0.0
```

### Available Tags

| Tag | Description |
|-----|-------------|
| `latest` | Latest build from `main` branch |
| `v2.0.0`, `v2.0` | Semantic version tags |
| `main` | Branch-tracking tag |
| `<sha>` | Git commit SHA |
| `windows` | Windows Server Core LTSC 2022 image |

---

## Docker Compose

### Basic Setup

```bash
# Copy the compose file and create .env
cd /opt/crowbyte   # or wherever you want
curl -fsSL https://raw.githubusercontent.com/hlsitechio/crowbyte/main/docker-compose.yml -o docker-compose.yml

# Create environment file
cat > .env << 'EOF'
# CrowByte Terminal -- Environment Configuration

# Display
RESOLUTION=1920x1080x24
VNC_PASSWORD=

# noVNC port
NOVNC_PORT=6080

# Supabase (Required for cloud sync)
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=

# VPS Agent Swarm (Optional)
VITE_OPENCLAW_HOST=
VITE_VPS_IP=
VITE_OPENCLAW_GATEWAY_PASSWORD=
VITE_NVIDIA_API_KEY=
VITE_NVIDIA_PROXY_PORT=19990

# External APIs (Optional)
VITE_SHODAN_API_KEY=
VITE_NVD_API_KEY=
VITE_TAVILY_API_KEY=
EOF

# Start
docker compose up -d

# View logs
docker compose logs -f

# Stop
docker compose down
```

### docker-compose.yml Reference

```yaml
version: '3.8'

services:
  crowbyte:
    build: .
    image: hlsitech/crowbyte:latest
    container_name: crowbyte
    restart: unless-stopped

    ports:
      - "${NOVNC_PORT:-6080}:6080"     # noVNC web UI

    environment:
      - DISPLAY=:99
      - RESOLUTION=${RESOLUTION:-1920x1080x24}
      - VNC_PASSWORD=${VNC_PASSWORD:-}
      - NODE_ENV=production
      - VITE_SUPABASE_URL=${VITE_SUPABASE_URL:-}
      - VITE_SUPABASE_ANON_KEY=${VITE_SUPABASE_ANON_KEY:-}
      - VITE_SUPABASE_SERVICE_KEY=${VITE_SUPABASE_SERVICE_KEY:-}
      - VITE_OPENCLAW_HOST=${VITE_OPENCLAW_HOST:-}
      - VITE_VPS_IP=${VITE_VPS_IP:-}
      - VITE_OPENCLAW_GATEWAY_PASSWORD=${VITE_OPENCLAW_GATEWAY_PASSWORD:-}
      - VITE_NVIDIA_API_KEY=${VITE_NVIDIA_API_KEY:-}
      - VITE_NVIDIA_PROXY_PORT=${VITE_NVIDIA_PROXY_PORT:-19990}
      - VITE_VNC_WS_URL=${VITE_VNC_WS_URL:-}
      - VITE_VNC_PASSWORD=${VITE_VNC_PASSWORD:-}
      - VITE_SHODAN_API_KEY=${VITE_SHODAN_API_KEY:-}
      - VITE_NVD_API_KEY=${VITE_NVD_API_KEY:-}
      - VITE_TAVILY_API_KEY=${VITE_TAVILY_API_KEY:-}
      - VITE_MCP_CLOUD_URL=${VITE_MCP_CLOUD_URL:-}
      - VITE_MCP_CLOUD_AUTH=${VITE_MCP_CLOUD_AUTH:-}

    volumes:
      - crowbyte-data:/root/.config/crowbyte
      - crowbyte-scans:/root/scans

    shm_size: '2gb'

    deploy:
      resources:
        limits:
          cpus: '4'
          memory: 4G
        reservations:
          cpus: '1'
          memory: 1G

    healthcheck:
      test: ["CMD", "curl", "-sf", "http://localhost:6080/"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 15s

volumes:
  crowbyte-data:
    name: crowbyte-data
  crowbyte-scans:
    name: crowbyte-scans
```

### Docker Compose Commands

```bash
docker compose up -d          # Start in background
docker compose down           # Stop and remove containers
docker compose restart        # Restart
docker compose logs -f        # Follow logs
docker compose pull           # Pull latest image
docker compose ps             # List running services
docker compose exec crowbyte bash   # Shell into container
```

### Using the install.sh Wrapper

The `install.sh` script provides a simpler interface:

```bash
curl -fsSL https://crowbyte.io/install.sh | sudo bash -- --docker
```

This creates:
- `/opt/crowbyte/.env` -- configuration file
- `/opt/crowbyte/docker-compose.yml` -- compose file
- `/usr/local/bin/crowbyte` -- CLI wrapper

CLI wrapper commands:

```bash
crowbyte start     # docker compose up -d
crowbyte stop      # docker compose down
crowbyte restart   # docker compose restart
crowbyte logs      # docker compose logs -f
crowbyte update    # docker compose pull && up -d
crowbyte config    # edit .env file
crowbyte status    # docker compose ps
crowbyte shell     # exec into container
```

---

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DISPLAY` | `:99` | X11 display number |
| `RESOLUTION` | `1920x1080x24` | Virtual display resolution (WxHxDepth) |
| `VNC_PORT` | `5900` | Internal VNC port |
| `NOVNC_PORT` | `6080` | noVNC WebSocket port (exposed to host) |
| `VNC_PASSWORD` | (empty) | VNC password (empty = no password) |
| `NODE_ENV` | `production` | Node environment |
| `VITE_SUPABASE_URL` | (empty) | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | (empty) | Supabase anonymous key |
| `VITE_SUPABASE_SERVICE_KEY` | (empty) | Supabase service role key |
| `VITE_OPENCLAW_HOST` | (empty) | OpenClaw VPS gateway host |
| `VITE_VPS_IP` | (empty) | VPS IP address |
| `VITE_OPENCLAW_GATEWAY_PASSWORD` | (empty) | OpenClaw gateway password |
| `VITE_NVIDIA_API_KEY` | (empty) | NVIDIA API key (for AI models) |
| `VITE_NVIDIA_PROXY_PORT` | `19990` | NVIDIA proxy port |
| `VITE_SHODAN_API_KEY` | (empty) | Shodan API key |
| `VITE_NVD_API_KEY` | (empty) | NVD API key for CVE lookups |
| `VITE_TAVILY_API_KEY` | (empty) | Tavily search API key |
| `VITE_MCP_CLOUD_URL` | (empty) | MCP cloud server URL |
| `VITE_MCP_CLOUD_AUTH` | (empty) | MCP cloud auth token |

### Passing Environment Variables

```bash
# Via command line
docker run -d -p 6080:6080 --shm-size=2g \
  -e VNC_PASSWORD=mysecret \
  -e RESOLUTION=2560x1440x24 \
  -e VITE_SUPABASE_URL=https://xxx.supabase.co \
  -e VITE_SUPABASE_ANON_KEY=eyJ... \
  --name crowbyte hlsitech/crowbyte

# Via env file
docker run -d -p 6080:6080 --shm-size=2g \
  --env-file .env \
  --name crowbyte hlsitech/crowbyte
```

---

## Multi-Architecture Builds

The CI/CD pipeline builds for both `linux/amd64` and `linux/arm64` using Docker Buildx with QEMU emulation.

### Build Locally for Multiple Architectures

```bash
# Create a multi-platform builder
docker buildx create --name crowbyte-builder --use
docker buildx inspect --bootstrap

# Build and push for both architectures
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --tag hlsitech/crowbyte:latest \
  --push \
  .
```

### Build for a Specific Architecture

```bash
# ARM64 (e.g., AWS Graviton, Apple Silicon)
docker buildx build --platform linux/arm64 -t crowbyte:arm64 --load .

# AMD64
docker buildx build --platform linux/amd64 -t crowbyte:amd64 --load .
```

The Go security tools are installed using the `TARGETARCH` build argument, which Docker sets automatically to match the target platform (e.g., `amd64` or `arm64`).

---

## Windows Containers

CrowByte supports Windows Server containers via `Dockerfile.windows`.

### Build

```bash
docker build -t crowbyte:windows -f Dockerfile.windows .
```

### Run

```bash
docker run -d -p 6080:6080 --name crowbyte-win crowbyte:windows
```

### Windows Container Stack

| Component | Windows Equivalent |
|-----------|--------------------|
| Xvfb | Not needed (native display) |
| Fluxbox | Not needed |
| x11vnc | TightVNC Server |
| websockify | Python websockify |
| noVNC | noVNC v1.5.0 |

### Base Image

- `mcr.microsoft.com/windows/servercore:ltsc2022`
- Node.js 20 (MSI installer)
- Chocolatey package manager for tools (git, nmap, python3, curl)
- TightVNC 2.8.84 for VNC access

### Limitations

- Windows containers require a Windows host (or Windows Server with Hyper-V)
- ARM64 is not supported for Windows containers
- Fewer security tools available compared to Linux image
- Image size is significantly larger than the Linux image

---

## CI/CD Pipeline

### Docker Build Workflow (`.github/workflows/docker.yml`)

**Triggers**:
- Push to `main` branch
- Version tags (`v*`)
- Manual dispatch with platform selection (linux/windows/all)

**Linux Build Job**:
1. Checkout code
2. Generate Docker metadata (tags: latest, version, sha)
3. Set up QEMU (for cross-platform builds)
4. Set up Docker Buildx
5. Login to Docker Hub (`hlsitech/crowbyte`)
6. Login to GHCR (`ghcr.io/hlsitechio/crowbyte`)
7. Build and push for `linux/amd64` + `linux/arm64`
8. Update Docker Hub description

**Windows Build Job**:
- Runs on `windows-2022` runner
- Triggered only on version tags or manual dispatch
- Builds and pushes `hlsitech/crowbyte:windows` and `ghcr.io/hlsitechio/crowbyte:windows`

### Required Secrets

| Secret | Used For |
|--------|----------|
| `DOCKERHUB_USERNAME` | Docker Hub login |
| `DOCKERHUB_TOKEN` | Docker Hub access token |
| `GITHUB_TOKEN` | GHCR login (auto-provided) |

### Tag Strategy

| Trigger | Tags Produced |
|---------|---------------|
| Push to `main` | `latest`, `main`, `<sha>` |
| Tag `v2.0.0` | `2.0.0`, `2.0`, `<sha>` |
| Tag `v2.1.0-beta` | `2.1.0-beta`, `<sha>` |

---

## Volumes and Persistence

The container defines one persistent volume:

| Volume | Mount Point | Purpose |
|--------|-------------|---------|
| `crowbyte-data` | `/root/.config/crowbyte` | User config, cache, preferences |
| `crowbyte-scans` | `/root/scans` | Scan results and output files |

### Custom Volume Mounts

```bash
# Mount custom wordlists
docker run -d -p 6080:6080 --shm-size=2g \
  -v /path/to/wordlists:/root/wordlists:ro \
  -v crowbyte-data:/root/.config/crowbyte \
  --name crowbyte hlsitech/crowbyte

# Mount host tools directory
docker run -d -p 6080:6080 --shm-size=2g \
  -v /opt/tools:/opt/tools:ro \
  --name crowbyte hlsitech/crowbyte
```

### Backup Volumes

```bash
# Backup user data
docker run --rm -v crowbyte-data:/data -v $(pwd):/backup alpine \
  tar czf /backup/crowbyte-data-backup.tar.gz -C /data .

# Restore
docker run --rm -v crowbyte-data:/data -v $(pwd):/backup alpine \
  tar xzf /backup/crowbyte-data-backup.tar.gz -C /data
```

---

## Resource Limits

### Shared Memory

Electron/Chromium requires shared memory for rendering. The `--shm-size=2g` flag is mandatory. Without it, the app will crash with out-of-memory errors.

```bash
# Minimum: 1g for basic usage
# Recommended: 2g for standard usage
# Heavy scanning: 4g
docker run -d -p 6080:6080 --shm-size=2g --name crowbyte hlsitech/crowbyte
```

### CPU and Memory

The docker-compose file sets default resource limits:

```yaml
deploy:
  resources:
    limits:
      cpus: '4'
      memory: 4G
    reservations:
      cpus: '1'
      memory: 1G
```

Adjust based on workload:

| Workload | CPUs | Memory |
|----------|------|--------|
| Light (browsing, basic scans) | 2 | 2G |
| Standard (multiple scans, terminal) | 4 | 4G |
| Heavy (nuclei full scan, many tabs) | 8 | 8G |

---

## Networking

### Port Mapping

```bash
# Default: noVNC on 6080
docker run -d -p 6080:6080 --shm-size=2g --name crowbyte hlsitech/crowbyte

# Custom port
docker run -d -p 8080:6080 --shm-size=2g --name crowbyte hlsitech/crowbyte

# Bind to specific interface
docker run -d -p 127.0.0.1:6080:6080 --shm-size=2g --name crowbyte hlsitech/crowbyte
```

### Behind a Reverse Proxy

If running behind nginx or Caddy on the host:

```nginx
# nginx reverse proxy for containerized CrowByte
location / {
    proxy_pass http://127.0.0.1:6080;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_read_timeout 86400s;
}
```

### Network Mode

```bash
# Default bridge (recommended)
docker run -d -p 6080:6080 --shm-size=2g --name crowbyte hlsitech/crowbyte

# Host network (no port mapping needed, all ports exposed)
docker run -d --network host --shm-size=2g --name crowbyte hlsitech/crowbyte

# Custom network
docker network create crowbyte-net
docker run -d --network crowbyte-net -p 6080:6080 --shm-size=2g --name crowbyte hlsitech/crowbyte
```

---

## Troubleshooting

### Container exits immediately

```bash
# Check logs
docker logs crowbyte

# Common causes:
# - Missing --shm-size (Electron crashes)
# - Port 6080 already in use
docker run -d -p 6080:6080 --shm-size=2g --name crowbyte hlsitech/crowbyte
```

### Black screen in noVNC

```bash
# Electron may not have started yet -- wait 10-15 seconds
# Check if Xvfb is running
docker exec crowbyte ps aux | grep Xvfb

# Check if Electron started
docker exec crowbyte ps aux | grep electron

# Check Electron errors
docker logs crowbyte 2>&1 | grep "\[electron\]"
```

### noVNC shows "Connection closed" or "Disconnected"

```bash
# Check x11vnc is running
docker exec crowbyte ps aux | grep x11vnc

# Check websockify is running
docker exec crowbyte ps aux | grep websockify

# Restart the container
docker restart crowbyte
```

### Security tools not found

```bash
# Check installed tools
docker exec crowbyte which nmap nuclei httpx subfinder ffuf

# If missing, the Go build may have failed during image build
# Rebuild with verbose output
docker build --progress=plain -t crowbyte .
```

### High memory usage

```bash
# Check container stats
docker stats crowbyte

# Increase shm-size if needed
docker run -d -p 6080:6080 --shm-size=4g --name crowbyte hlsitech/crowbyte
```

### Healthcheck failing

```bash
# Check healthcheck status
docker inspect --format='{{.State.Health.Status}}' crowbyte

# View healthcheck logs
docker inspect --format='{{range .State.Health.Log}}{{.Output}}{{end}}' crowbyte

# The healthcheck runs: curl -sf http://localhost:6080/
# If noVNC hasn't started yet, it will fail during start_period (15s)
```
