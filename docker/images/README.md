# CrowByte Docker Images

All Dockerfiles must be built from the **repo root** (build context = repo root).

## Images

| File | Base | Target |
|------|------|--------|
| `Dockerfile.debian` | `node:20-bookworm` | Linux (Debian) — default |
| `Dockerfile.ubuntu` | `ubuntu:24.04` | Linux (Ubuntu) — WSL2, Hostinger VPS |
| `Dockerfile.windows` | `servercore:ltsc2022` | Windows Server |

## Build

```bash
# From repo root:
cd /path/to/crowbyte

# Debian (default)
docker build -t raindock6/crowbyte:debian -f docker/images/Dockerfile.debian .

# Ubuntu
docker build -t raindock6/crowbyte:ubuntu -f docker/images/Dockerfile.ubuntu .

# Windows (requires Windows Docker host)
docker build -t raindock6/crowbyte:windows -f docker/images/Dockerfile.windows .
```

## Run

```bash
docker run -d -p 6080:6080 --shm-size=2g --env-file .env --name crowbyte raindock6/crowbyte:ubuntu
# Open http://localhost:6080
```

## Docker Compose

```bash
# Debian (default)
docker compose up -d

# Ubuntu
docker compose --profile ubuntu up -d
```

## Entrypoints

| File | Platform |
|------|----------|
| `entrypoint.sh` | Linux (Debian + Ubuntu) |
| `entrypoint.ps1` | Windows |

## Registry

- Docker Hub: `raindock6/crowbyte`
- GHCR: `ghcr.io/hlsitechio/crowbyte`
