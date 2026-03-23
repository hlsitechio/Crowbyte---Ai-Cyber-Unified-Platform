###############################################################################
# CrowByte Terminal — Production Docker Image
#
# Multi-stage build: compile → runtime
# Runs Electron in Xvfb, accessible via noVNC in browser
#
# Build:  docker build -t crowbyte .
# Run:    docker run -d -p 6080:6080 --shm-size=2g --name crowbyte crowbyte
# Access: http://localhost:6080
#
# With env file:
#   docker run -d -p 6080:6080 --shm-size=2g --env-file .env --name crowbyte crowbyte
###############################################################################

# ─── Stage 1: Build ──────────────────────────────────────────────────────────

FROM node:20-bookworm AS builder

WORKDIR /build

# Install build deps
COPY package.json bun.lock* ./
COPY apps/desktop/package.json apps/desktop/
RUN npm install --legacy-peer-deps 2>/dev/null || npm install

# Copy source and build
COPY apps/desktop/ apps/desktop/
WORKDIR /build/apps/desktop
RUN npx vite build

# ─── Stage 2: Runtime ────────────────────────────────────────────────────────

FROM node:20-bookworm-slim

LABEL maintainer="HLSITech <engineering@crowbyte.io>"
LABEL description="CrowByte Terminal — Offensive Security Command Center"
LABEL version="2.0.0"

ENV DEBIAN_FRONTEND=noninteractive

# Display stack: Xvfb + x11vnc + noVNC + window manager
RUN apt-get update && apt-get install -y --no-install-recommends \
    xvfb x11vnc novnc websockify fluxbox \
    x11-utils xauth dbus-x11 \
    && rm -rf /var/lib/apt/lists/*

# Electron/Chromium runtime deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgtk-3-0 libnotify4 libnss3 libxss1 libxtst6 xdg-utils \
    libatspi2.0-0 libdrm2 libgbm1 libasound2 libcups2 \
    libxcomposite1 libxdamage1 libxrandr2 libpango-1.0-0 \
    libcairo2 fonts-liberation2 fonts-noto-color-emoji \
    && rm -rf /var/lib/apt/lists/*

# Security tools (scanner integrations)
RUN apt-get update && apt-get install -y --no-install-recommends \
    nmap curl git procps iproute2 \
    dnsutils whois net-tools ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Go + ProjectDiscovery tools (multi-arch)
ARG TARGETARCH
RUN curl -sL "https://go.dev/dl/go1.23.6.linux-${TARGETARCH}.tar.gz" | tar xz -C /usr/local
ENV PATH="/usr/local/go/bin:/root/go/bin:${PATH}"
RUN go install github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest 2>/dev/null || true && \
    go install github.com/projectdiscovery/httpx/cmd/httpx@latest 2>/dev/null || true && \
    go install github.com/projectdiscovery/subfinder/v2/cmd/subfinder@latest 2>/dev/null || true && \
    go install github.com/ffuf/ffuf/v2@latest 2>/dev/null || true && \
    rm -rf /root/go/pkg /usr/local/go/pkg /tmp/*

# Python tools
RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-pip && \
    pip3 install --break-system-packages sqlmap 2>/dev/null || true && \
    rm -rf /var/lib/apt/lists/*

# App files
WORKDIR /app
COPY --from=builder /build/apps/desktop/dist ./dist
COPY --from=builder /build/apps/desktop/electron ./electron
COPY --from=builder /build/apps/desktop/package.json ./
COPY --from=builder /build/apps/desktop/node_modules ./node_modules

# Entrypoint
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Display config
ENV DISPLAY=:99
ENV RESOLUTION=1920x1080x24
ENV NOVNC_PORT=6080
ENV VNC_PORT=5900

# CrowByte config — all from env vars, no hardcoded secrets
ENV NODE_ENV=production
ENV ELECTRON_DISABLE_SECURITY_WARNINGS=true

# Persistent volume for user data
VOLUME ["/root/.config/crowbyte"]

EXPOSE 6080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD curl -sf http://localhost:6080/ || exit 1

ENTRYPOINT ["/entrypoint.sh"]
