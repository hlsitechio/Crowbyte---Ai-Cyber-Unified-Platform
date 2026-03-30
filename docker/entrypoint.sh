#!/bin/bash
###############################################################################
# CrowByte Terminal — Docker Entrypoint
#
# Starts: Xvfb → Fluxbox → Electron → x11vnc → noVNC (websockify)
# Access via browser at http://localhost:6080
###############################################################################

set -e

DISPLAY="${DISPLAY:-:99}"
RESOLUTION="${RESOLUTION:-1920x1080x24}"
VNC_PORT="${VNC_PORT:-5900}"
NOVNC_PORT="${NOVNC_PORT:-6080}"
VNC_PASSWORD="${VNC_PASSWORD:-}"

echo "=========================================="
echo "  CrowByte Terminal v2.0.0"
echo "  HLSITech — Offensive Security Platform"
echo "=========================================="
echo "[*] Display: ${DISPLAY} @ ${RESOLUTION}"
echo "[*] noVNC:   http://0.0.0.0:${NOVNC_PORT}"
echo "[*] VNC:     localhost:${VNC_PORT}"
echo ""

# ─── Xvfb (virtual framebuffer) ──────────────────────────────────────────────

echo "[*] Starting Xvfb..."
Xvfb ${DISPLAY} -screen 0 ${RESOLUTION} -ac +extension GLX +render -noreset &
sleep 1

# Wait for X to be ready
for i in $(seq 1 10); do
  if xdpyinfo -display ${DISPLAY} >/dev/null 2>&1; then
    echo "[+] Xvfb ready"
    break
  fi
  sleep 0.5
done

# ─── Window Manager ─────────────────────────────────────────────────────────

echo "[*] Starting Fluxbox..."
fluxbox -display ${DISPLAY} &
sleep 1

# ─── Electron App ────────────────────────────────────────────────────────────

echo "[*] Starting CrowByte Terminal..."
cd /app

# Pass through all VITE_* env vars to Electron
export NODE_ENV=production
export ELECTRON_DISABLE_SECURITY_WARNINGS=true
export ELECTRON_NO_ATTACH_CONSOLE=true

npx electron electron/main.cjs \
  --no-sandbox \
  --disable-gpu \
  --disable-dev-shm-usage \
  --display=${DISPLAY} \
  2>&1 | sed 's/^/[electron] /' &

sleep 3

# ─── VNC Server ──────────────────────────────────────────────────────────────

echo "[*] Starting x11vnc..."
VNC_ARGS="-display ${DISPLAY} -forever -shared -rfbport ${VNC_PORT} -noxrecord -noxfixes -noxdamage"

if [ -n "${VNC_PASSWORD}" ]; then
  mkdir -p /root/.vnc
  x11vnc -storepasswd "${VNC_PASSWORD}" /root/.vnc/passwd
  VNC_ARGS="${VNC_ARGS} -rfbauth /root/.vnc/passwd"
else
  VNC_ARGS="${VNC_ARGS} -nopw"
fi

x11vnc ${VNC_ARGS} 2>&1 | sed 's/^/[vnc] /' &
sleep 1

# ─── noVNC (WebSocket proxy) ────────────────────────────────────────────────

echo "[*] Starting noVNC on port ${NOVNC_PORT}..."
websockify --web /usr/share/novnc ${NOVNC_PORT} localhost:${VNC_PORT} 2>&1 | sed 's/^/[novnc] /' &

echo ""
echo "=========================================="
echo "[+] CrowByte Terminal is READY"
echo "[+] Open: http://localhost:${NOVNC_PORT}"
echo "=========================================="
echo ""

# Keep container alive
wait -n
