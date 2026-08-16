#!/usr/bin/env bash
#
# start-hosting.sh - Host the ARVR app on your LAN (and optionally HTTPS tunnel)
#
# Usage (run from git bash):
#   ./start-hosting.sh             # start backend + Vite, print phone URL
#   ./start-hosting.sh --tunnel    # also start a cloudflared HTTPS tunnel (for WebXR AR on phone)
#   ./start-hosting.sh --stop      # stop servers started by this script
#
# Why HTTPS matters: WebXR "immersive-ar" only works in a secure context.
# A plain http://<LAN-IP>:5173 URL will NOT show AR on your Android phone
# (it will fall back to the 3D preview). Use --tunnel to get a public HTTPS URL.

set -u

# Enforce UTF-8 so Node/Vite write logs (incl. emoji) correctly on Windows
export LANG=en_US.UTF-8
export LC_ALL=en_US.UTF-8

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="$SCRIPT_DIR/.host-logs"
VITE_LOG="$LOG_DIR/vite.log"
BACKEND_LOG="$LOG_DIR/backend.log"
PID_FILE="$LOG_DIR/pids.txt"

VITE_PORT=5173
BACKEND_PORT=3001

mkdir -p "$LOG_DIR"

log() { printf '\033[1;34m[host]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[host]\033[0m %s\n' "$*"; }
ok()   { printf '\033[1;32m[host]\033[0m %s\n' "$*"; }

kill_tree() {
  local pid="$1"
  if command -v taskkill >/dev/null 2>&1; then
    # Windows (git bash): kill the process tree
    taskkill //F //T //PID "$pid" >/dev/null 2>&1
  else
    kill "$pid" >/dev/null 2>&1
  fi
}

stop_all() {
  if [ -f "$PID_FILE" ]; then
    while IFS= read -r pid; do
      [ -n "$pid" ] && kill_tree "$pid"
    done < "$PID_FILE"
    rm -f "$PID_FILE"
  fi
  ok "Stopped. Logs kept in $LOG_DIR"
}

if [ "${1:-}" = "--stop" ]; then
  stop_all
  exit 0
fi

# --- Preflight checks ----------------------------------------------------------
if ! command -v node >/dev/null 2>&1; then
  warn "Node.js not found on PATH. Install it first: https://nodejs.org"
  exit 1
fi
if [ ! -f "$SCRIPT_DIR/.env" ]; then
  warn ".env not found - AI chat will fail. Create it with: OPENAI_API_KEY=sk-..."
elif ! grep -q "OPENAI_API_KEY=.\+" "$SCRIPT_DIR/.env"; then
  warn ".env exists but OPENAI_API_KEY looks empty - AI chat will fail."
fi

# --- Stop anything already running from a previous run -------------------------
stop_all

trap 'echo; log "Shutting down..."; stop_all; exit 0' INT TERM

# --- Start backend (Express on :3001) -----------------------------------------
log "Starting backend on :$BACKEND_PORT ..."
(
  cd "$SCRIPT_DIR/server" || exit 1
  npm run dev
) >"$BACKEND_LOG" 2>&1 &
BACKEND_PID=$!
echo "$BACKEND_PID" > "$PID_FILE"

# Wait for backend health
for _ in $(seq 1 30); do
  if curl -sf "http://localhost:$BACKEND_PORT/api/health" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done
if ! curl -sf "http://localhost:$BACKEND_PORT/api/health" >/dev/null 2>&1; then
  warn "Backend did not come up. Check $BACKEND_LOG"
fi

# --- Start Vite (frontend on :5173, host:true already in vite.config) ---------
log "Starting Vite on :$VITE_PORT ..."
(
  cd "$SCRIPT_DIR" || exit 1
  npm run dev
) >"$VITE_LOG" 2>&1 &
VITE_PID=$!
echo "$VITE_PID" >> "$PID_FILE"

# Wait for Vite
for _ in $(seq 1 30); do
  if curl -sf "http://localhost:$VITE_PORT" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done
if ! curl -sf "http://localhost:$VITE_PORT" >/dev/null 2>&1; then
  warn "Vite did not come up. Check $VITE_LOG"
fi

# --- Detect LAN IP --------------------------------------------------------------
LAN_IP=""
if command -v ipconfig >/dev/null 2>&1; then
  # Windows (git bash)
  LAN_IP="$(ipconfig | grep -E 'IPv4' | grep -oE '[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+' | head -1)"
elif command -v hostname >/dev/null 2>&1; then
  LAN_IP="$(hostname -I 2>/dev/null | awk '{print $1}')"
fi
[ -z "$LAN_IP" ] && LAN_IP="<your-LAN-IP>"

# --- Print results ---------------------------------------------------------------
ok "Servers running:"
ok "  Local:     http://localhost:$VITE_PORT"
ok "  Phone URL: http://$LAN_IP:$VITE_PORT   (same WiFi - try this first)"
warn "  AR (WebXR) on your phone needs HTTPS. For AR, use the tunnel below."
warn "  Without HTTPS the app still works, but shows the 3D preview (no camera)."

# --- Optional HTTPS tunnel -------------------------------------------------------
if [ "${1:-}" = "--tunnel" ]; then
  if command -v cloudflared >/dev/null 2>&1; then
    log "Starting cloudflared HTTPS tunnel (public URL below)..."
    cloudflared tunnel --url "http://localhost:$VITE_PORT" 2>&1
  else
    warn "cloudflared not installed. Options:"
    warn "  1) Install cloudflared: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/"
    warn "  2) Or use npx:  npx localtunnel --port $VITE_PORT   (gives an https:// URL)"
    warn "Tunnel skipped. Servers still running on LAN."
  fi
fi

log "Press Ctrl+C to stop both servers."
wait