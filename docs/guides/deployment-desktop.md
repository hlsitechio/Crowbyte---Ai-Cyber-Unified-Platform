# CrowByte Terminal -- Desktop (Electron) Installation Guide

Install CrowByte Terminal as a native desktop application on Linux, Windows, or macOS. The desktop app runs as an Electron application with a React frontend, connecting to Supabase for cloud data and optionally to a VPS agent swarm for remote operations.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Architecture](#architecture)
3. [Build from Source](#build-from-source)
4. [Pre-Built Packages](#pre-built-packages)
5. [Linux Installer Script](#linux-installer-script)
6. [Environment Variables](#environment-variables)
7. [Supabase Setup](#supabase-setup)
8. [Electron Configuration](#electron-configuration)
9. [CI/CD Release Pipeline](#cicd-release-pipeline)
10. [Development Mode](#development-mode)
11. [Troubleshooting](#troubleshooting)

---

## Quick Start

### From Source (All Platforms)

```bash
git clone https://github.com/hlsitechio/crowbyte.git
cd crowbyte/apps/desktop
npm install --legacy-peer-deps
cp .env.example .env
# Edit .env with your Supabase credentials

npx vite build
npx electron electron/main.cjs
```

### From Package (Linux)

```bash
# AppImage (universal)
chmod +x CrowByte-2.0.0-x86_64.AppImage
./CrowByte-2.0.0-x86_64.AppImage

# .deb (Debian/Ubuntu)
sudo dpkg -i crowbyte_2.0.0_amd64.deb

# install.sh (auto-detects best method)
curl -fsSL https://crowbyte.io/install.sh | sudo bash
```

---

## Architecture

```
+--------------------------------------------------+
|  Electron Main Process (main.cjs)                |
|                                                   |
|  BrowserWindow --> Vite Build (dist/index.html)  |
|                                                   |
|  IPC Handlers:                                    |
|    claude-send  --> claude -p (CLI subprocess)   |
|    pty-spawn    --> node-pty (terminal)           |
|    fs-read      --> Node.js fs                    |
+--------------------------------------------------+
        |
        v
+--------------------------------------------------+
|  React SPA (Renderer Process)                     |
|                                                   |
|  Pages:                                           |
|    Dashboard, Chat, CVE, Terminal, RedTeam,       |
|    CyberOps, NetworkScanner, SecurityMonitor,     |
|    Fleet, AIAgent, AgentBuilder, MissionPlanner,  |
|    Knowledge, Bookmarks, Documentation,           |
|    Settings, Logs                                 |
|                                                   |
|  Services:                                        |
|    Supabase (PostgreSQL, Auth, Storage)            |
|    OpenClaw (VPS agent swarm via NVIDIA proxy)    |
|    Claude Code CLI (local AI via IPC)             |
|    Monitoring Agent (AI security monitoring)       |
+--------------------------------------------------+
        |
        v
+--------------------------------------------------+
|  External Services                                |
|                                                   |
|  Supabase     --> Cloud database, auth, storage  |
|  NVD API      --> CVE data                       |
|  Shodan API   --> Network intelligence           |
|  Tavily API   --> AI-powered search              |
|  OpenClaw VPS --> AI agent swarm (8 agents)      |
+--------------------------------------------------+
```

---

## Build from Source

### Prerequisites

| Requirement | Version | Purpose |
|-------------|---------|---------|
| Node.js | >= 20 | Runtime and build tooling |
| npm | >= 10 | Package manager |
| Git | any | Clone repository |
| Python 3 | >= 3.8 | node-pty native module build |
| C++ compiler | GCC/MSVC/clang | node-pty native module build |

**Platform-specific build dependencies**:

Linux (Debian/Ubuntu):
```bash
sudo apt-get install -y build-essential python3 libx11-dev libxkbfile-dev
```

macOS:
```bash
xcode-select --install
```

Windows:
```bash
# Install Visual Studio Build Tools (C++ workload)
# Or: npm install -g windows-build-tools
```

### Step 1: Clone and Install

```bash
git clone https://github.com/hlsitechio/crowbyte.git
cd crowbyte/apps/desktop

npm install --legacy-peer-deps
```

The `--legacy-peer-deps` flag is needed because some packages have conflicting peer dependency ranges. If this fails, fall back to `npm install` without the flag.

**node-pty note**: The `node-pty` package requires native compilation. If the install fails on this step, ensure you have build tools installed (see prerequisites above).

### Step 2: Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your credentials. At minimum, set the Supabase variables:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

See the [Environment Variables](#environment-variables) section for the full list.

### Step 3: Build the Frontend

```bash
npx vite build
```

This compiles the React SPA to the `dist/` directory. The build uses Vite 7 with the React SWC plugin for fast compilation.

Output:
```
dist/
  index.html
  assets/
    index-[hash].js
    index-[hash].css
    ...
```

### Step 4: Launch Electron

```bash
npx electron electron/main.cjs
```

The `main.cjs` file is the Electron main process entry point. It:

1. Creates a `BrowserWindow` loading `dist/index.html`
2. Sets up IPC handlers for Claude CLI, terminal (node-pty), and filesystem
3. Configures the preload script (`electron/preload.js`) for secure IPC bridging

#### Launch Flags

For headless/VPS environments (e.g., CrowByte OS):

```bash
npx electron electron/main.cjs \
  --no-sandbox \
  --disable-gpu-sandbox \
  --enable-features=UseOzonePlatform \
  --ozone-platform=x11
```

For kiosk mode (fullscreen, no chrome):

```bash
npx electron electron/main.cjs \
  --no-sandbox \
  --disable-gpu-sandbox \
  --kiosk
```

---

## Pre-Built Packages

Pre-built packages are generated by the CI/CD pipeline and attached to GitHub Releases.

### Linux

| Format | File | Installation |
|--------|------|-------------|
| AppImage | `CrowByte-2.0.0-x86_64.AppImage` | `chmod +x && ./CrowByte-*.AppImage` |
| .deb | `crowbyte_2.0.0_amd64.deb` | `sudo dpkg -i crowbyte_*.deb` |

**AppImage** is the universal Linux format -- no installation required, runs on any distro. FUSE is required (installed by default on most systems).

**.deb** packages integrate with the system package manager and install a desktop entry.

### Windows

| Format | File | Installation |
|--------|------|-------------|
| NSIS Installer | `CrowByte Setup 2.0.0.exe` | Double-click, follow wizard |

The NSIS installer provides:
- Custom installation directory
- Desktop shortcut
- Start Menu shortcut
- Uninstaller
- Per-user installation (no admin required)

### macOS

| Format | File | Installation |
|--------|------|-------------|
| DMG | `CrowByte-2.0.0.dmg` | Open DMG, drag to Applications |

### Download

Pre-built packages are available from:
- [GitHub Releases](https://github.com/hlsitechio/crowbyte/releases)

---

## Linux Installer Script

The `install.sh` script provides an interactive installer for Linux systems.

### Usage

```bash
# Auto-detect best installation method
curl -fsSL https://crowbyte.io/install.sh | sudo bash

# Force a specific method
sudo ./install.sh --docker      # Docker container
sudo ./install.sh --appimage    # AppImage download
sudo ./install.sh --deb         # .deb package
```

### What It Does

1. **Detects OS**: Debian/Ubuntu, RHEL/Fedora, Arch, or fallback
2. **Shows EULA**: Requires acceptance (auto-accepted in non-interactive mode)
3. **Auto-selects method**:
   - Docker installed? Use Docker (recommended)
   - Debian/Ubuntu? Use .deb package
   - Otherwise? Use AppImage
4. **Installs dependencies**: nmap, curl, git, GTK3, NSS, etc.
5. **Downloads/installs** the selected package
6. **Creates desktop entry** (for AppImage)
7. **Creates CLI launcher** at `/usr/local/bin/crowbyte`

### Docker Installation via install.sh

When Docker is detected (or `--docker` is specified), the script:

1. Pulls `hlsitech/crowbyte:latest`
2. Creates `/opt/crowbyte/.env` with configuration template
3. Creates `/opt/crowbyte/docker-compose.yml`
4. Creates `/usr/local/bin/crowbyte` CLI wrapper

```bash
crowbyte start     # docker compose up -d
crowbyte stop      # docker compose down
crowbyte restart   # docker compose restart
crowbyte logs      # docker compose logs -f
crowbyte update    # docker compose pull && up -d
crowbyte config    # edit .env
crowbyte status    # docker compose ps
crowbyte shell     # exec into container
```

### AppImage Installation via install.sh

1. Downloads `CrowByte-2.0.0-<arch>.AppImage` to `/opt/crowbyte/`
2. Creates symlink `/usr/local/bin/crowbyte` -> AppImage
3. Creates `/usr/share/applications/crowbyte.desktop` entry

---

## Environment Variables

Create a `.env` file in the `apps/desktop/` directory (or set these as system environment variables).

### Required

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Supabase project URL (e.g., `https://xxx.supabase.co`) |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous/public key |

### Optional -- Cloud Services

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_SERVICE_KEY` | Supabase service role key (admin operations) |
| `VITE_SUPABASE_PROJECT_REF` | Supabase project reference ID |

### Optional -- VPS Agent Swarm (OpenClaw)

| Variable | Description |
|----------|-------------|
| `VITE_OPENCLAW_HOST` | OpenClaw VPS IP address |
| `VITE_OPENCLAW_HOSTNAME` | VPS hostname (FQDN) |
| `VITE_VPS_IP` | VPS IP (may be same as OPENCLAW_HOST) |
| `VITE_VPS_HOSTNAME_ID` | VPS hostname identifier |
| `VITE_OPENCLAW_GATEWAY_PASSWORD` | Gateway authentication password |
| `VITE_OPENCLAW_GATEWAY_TOKEN` | Gateway auth token |
| `VITE_OPENCLAW_SSH_PASSWORD` | SSH password for VPS |
| `VITE_NVIDIA_API_KEY` | NVIDIA API key (for AI model access) |
| `VITE_NVIDIA_PROXY_PORT` | NVIDIA proxy port (default: `19990`) |

### Optional -- VNC Remote Desktop

| Variable | Description |
|----------|-------------|
| `VITE_VNC_WS_URL` | VNC WebSocket URL (e.g., `wss://vps:18790`) |
| `VITE_VNC_PASSWORD` | VNC authentication password |

### Optional -- External APIs

| Variable | Description |
|----------|-------------|
| `VITE_SHODAN_API_KEY` | Shodan API key (IP/device lookups) |
| `VITE_NVD_API_KEY` | NVD API key (CVE data, higher rate limit) |
| `VITE_TAVILY_API_KEY` | Tavily API key (AI-powered search) |
| `TAVILY_API_KEY` | Tavily API key (non-VITE prefix, for server-side) |
| `VITE_VENICE_API_KEY` | Venice AI API key |

### Optional -- MCP Cloud

| Variable | Description |
|----------|-------------|
| `VITE_MCP_CLOUD_URL` | MCP cloud server URL |
| `VITE_MCP_CLOUD_AUTH` | MCP cloud auth token |

### Docker-Specific

| Variable | Description |
|----------|-------------|
| `VNC_PASSWORD` | VNC access password (Docker/noVNC mode) |
| `NOVNC_PORT` | noVNC port (default: `6080`) |
| `RESOLUTION` | Display resolution (default: `1920x1080x24`) |

---

## Supabase Setup

CrowByte uses Supabase as its cloud backend for authentication, database, and storage.

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Note the **Project URL** and **anon/public key** from Settings > API

### 2. Database Tables

CrowByte requires these tables:

| Table | Purpose |
|-------|---------|
| `cves` | CVE tracking -- ID, severity, CVSS, description, products, refs |
| `knowledge_base` | Research entries -- title, content, category, priority, tags |
| `bookmarks` | Saved URLs -- title, URL, description, category, tags |
| `bookmark_categories` | Custom bookmark categories -- name, icon, color |
| `custom_agents` | Agent Builder configs -- name, instructions, model, capabilities |
| `red_team_ops` | Red team operations -- name, target, type, status, findings |
| `user_settings` | User preferences -- profile picture, workspace name |
| `profiles` | Auth-linked user profiles |
| `endpoints` | Fleet device registry |
| `analytics` | Tool usage statistics |

The app's setup wizard will guide you through database initialization on first run. Alternatively, apply the migrations from `/mnt/bounty/Claude/crowbyte/supabase/`.

### 3. Configure the App

Set the environment variables in your `.env` file:

```bash
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 4. Authentication

CrowByte uses Supabase Auth for user management. The app supports:
- Email/password registration and login
- Session persistence via Supabase tokens
- Role-based access (configured in Supabase dashboard)

---

## Electron Configuration

### Main Process (`electron/main.cjs`)

The main process creates the application window and sets up IPC communication between the renderer (React app) and native Node.js APIs.

Key features:
- **BrowserWindow**: Loads `dist/index.html` in production, `http://localhost:8081` in development
- **Preload script**: `electron/preload.js` -- exposes safe IPC bridge to the renderer
- **IPC handlers**: Claude CLI execution, node-pty terminal, filesystem operations

### Build Configuration (`package.json`)

electron-builder is configured in the `build` section of `apps/desktop/package.json`:

```json
{
  "build": {
    "appId": "com.hlsitech.crowbyte",
    "productName": "CrowByte",
    "copyright": "Copyright 2025 HLSITech",
    "directories": {
      "output": "release"
    },
    "files": [
      "dist/**/*",
      "dist-electron/**/*",
      "node_modules/**/*"
    ],
    "win": {
      "target": [{"target": "nsis", "arch": ["x64"]}],
      "icon": "public/icon.ico"
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true,
      "createDesktopShortcut": true,
      "createStartMenuShortcut": true,
      "shortcutName": "CrowByte"
    },
    "mac": {
      "target": ["dmg"],
      "icon": "public/icon.icns",
      "category": "public.app-category.productivity"
    },
    "linux": {
      "target": ["AppImage"],
      "icon": "public/icon.png",
      "category": "Utility"
    }
  }
}
```

### Building Packages Locally

```bash
cd apps/desktop

# Build the Vite frontend first
npx vite build

# Linux AppImage
npx electron-builder --linux AppImage

# Linux .deb
npx electron-builder --linux deb

# Windows NSIS installer
npx electron-builder --win nsis

# macOS DMG
npx electron-builder --mac dmg

# Output directory: apps/desktop/release/
```

---

## CI/CD Release Pipeline

### Workflow (`.github/workflows/release.yml`)

**Triggers**:
- Push version tags (`v*`)
- Manual dispatch with version number input

**Build Matrix**:

| Runner | Platform | Artifacts |
|--------|----------|-----------|
| `ubuntu-latest` | Linux | `.AppImage`, `.deb` |
| `windows-latest` | Windows | `.exe` (NSIS) |
| `macos-latest` | macOS | `.dmg` |

**Steps per platform**:

1. Checkout code
2. Setup Node.js 20 with npm cache
3. Install dependencies (`npm install --legacy-peer-deps`)
4. Build Vite frontend (`npx vite build`)
5. Build Electron package (`npx electron-builder --<platform>`)
6. Upload build artifacts

**Release job** (runs after all builds complete):

1. Downloads all artifacts from the build matrix
2. Creates a GitHub Release using the tag name
3. Attaches all artifacts (`.AppImage`, `.deb`, `.exe`, `.dmg`, auto-update `.yml`)
4. Auto-generates release notes from commit history

### Creating a Release

```bash
# Tag a new version
git tag v2.0.0
git push origin v2.0.0

# The CI/CD pipeline automatically:
# 1. Builds for Linux, Windows, macOS
# 2. Creates a GitHub Release
# 3. Uploads all packages
```

### Manual Dispatch

Go to the repository's Actions tab, select "Desktop Release", and click "Run workflow". Enter the version number (e.g., `2.0.0`).

---

## Development Mode

### Vite Dev Server (Frontend Only)

```bash
cd apps/desktop
npm run dev
```

This starts the Vite dev server on `http://localhost:8081` with hot module replacement. Changes to React components are reflected instantly.

### Electron + Vite (Full Desktop)

```bash
cd apps/desktop
npm start
```

This uses `concurrently` to:
1. Start the Vite dev server
2. Wait for it to be ready (`wait-on http://localhost:8081`)
3. Launch Electron pointing at the dev server

### Electron Dev Launch

```bash
cd apps/desktop
node electron/launch.cjs
```

The `launch.cjs` script provides development-specific Electron launch configuration.

### npm Scripts Reference

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `cross-env NODE_ENV=development vite` | Vite dev server only |
| `start` | `concurrently "dev" "wait-on + electron:dev"` | Full Electron + Vite dev |
| `electron:dev` | `node electron/launch.cjs` | Launch Electron in dev mode |
| `build` | `npx vite build` | Production frontend build |
| `build:electron` | `electron-builder` | Package Electron app |
| `build:electron:win` | `electron-builder --win` | Windows package |
| `build:electron:mac` | `electron-builder --mac` | macOS package |
| `build:electron:linux` | `electron-builder --linux` | Linux package |
| `lint` | `eslint .` | Run ESLint |
| `lint:fix` | `eslint . --fix` | Auto-fix lint issues |
| `format` | `prettier --write ...` | Format code |
| `type-check` | `tsc --noEmit` | TypeScript type checking |
| `errors:check` | `lint + type-check` | Full quality check |
| `errors:fix` | `lint:fix + format` | Auto-fix all issues |
| `preview` | `vite preview` | Preview production build locally |

---

## Troubleshooting

### `npm install` fails on node-pty

node-pty requires native compilation. Install build tools:

```bash
# Linux
sudo apt-get install -y build-essential python3

# macOS
xcode-select --install

# Windows
npm install -g windows-build-tools
```

If the error persists, try rebuilding:

```bash
cd apps/desktop
npm rebuild node-pty
```

### Electron fails to start: "Cannot find module"

Ensure the Vite build completed successfully:

```bash
cd apps/desktop
npx vite build
ls -la dist/index.html   # Should exist
```

### Blank white screen after launch

The app may be trying to connect to the Vite dev server instead of loading the built files. Check `electron/main.cjs` and ensure it loads from `dist/` in production.

Alternatively, environment variables may be missing:

```bash
cp .env.example .env
# Verify VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set
```

### "GPU process isn't usable" or GPU errors

On headless Linux (VPS, WSL, containers):

```bash
npx electron electron/main.cjs --no-sandbox --disable-gpu
```

On Wayland systems:

```bash
npx electron electron/main.cjs --enable-features=UseOzonePlatform --ozone-platform=x11
```

### AppImage fails to run

```bash
# Check FUSE
fusermount --version

# If FUSE not installed
sudo apt-get install -y fuse libfuse2

# Or extract and run without FUSE
./CrowByte-2.0.0-x86_64.AppImage --appimage-extract
./squashfs-root/crowbyte
```

### .deb package missing dependencies

```bash
sudo apt-get install -f   # Fix broken dependencies
# Or install manually:
sudo apt-get install -y libgtk-3-0 libnss3 libxss1 libgbm1 libasound2
```

### Windows: app blocked by SmartScreen

Right-click the installer -> Properties -> Check "Unblock" -> Apply. Or click "More info" -> "Run anyway" when SmartScreen appears.

### Supabase connection failed

1. Verify `VITE_SUPABASE_URL` is correct (should end in `.supabase.co`)
2. Verify `VITE_SUPABASE_ANON_KEY` is the anonymous/public key (not the service key)
3. Check if the Supabase project is active (not paused due to inactivity)
4. Ensure the database tables exist (run the setup wizard)

### Permission denied on Linux

```bash
# AppImage
chmod +x CrowByte-*.AppImage

# Electron from source
chmod +x electron/main.cjs
```
