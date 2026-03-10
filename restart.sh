#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# GameHost Platform — Safe Restart
# Usage: bash restart.sh [--force] [--service <name>] [--rebuild]
#                        [--no-cache] [--quick]
#
# Options:
#   --force           Skip confirmation prompt
#   --service <name>  Restart only a specific service
#                     (postgres, redis, backend, frontend, nginx)
#   --rebuild         Force rebuild images (picks up code changes)
#   --no-cache        Full rebuild from scratch (clears Docker layer cache)
#   --quick           Quick restart, skip change detection & rebuild
#
# By default, restart.sh detects if source code has changed since the
# last build and auto-rebuilds. This ensures every user always sees
# the latest version — no stale browser cache.
# ============================================================

# ─── Build log (captured so errors are never lost) ────────
BUILD_LOG="/tmp/gamehost-restart-$(date +%s).log"

# ─── Global error trap — ensures set -e never dies silently ─
on_error() {
  local exit_code=$? lineno=${BASH_LINENO[0]:-0}
  echo "" >&2
  echo -e "\033[31m\033[1m   ══════════════════════════════════════════════════════════\033[0m" >&2
  echo -e "\033[31m\033[1m    ✘  Restart failed unexpectedly  (line ${lineno}, exit ${exit_code})\033[0m" >&2
  echo -e "\033[31m\033[1m   ══════════════════════════════════════════════════════════\033[0m" >&2
  if [ -s "$BUILD_LOG" ]; then
    echo -e "\033[33m   Last 30 lines of log ($BUILD_LOG):\033[0m" >&2
    echo -e "\033[90m   ────────────────────────────────────────────\033[0m" >&2
    tail -30 "$BUILD_LOG" | sed 's/^/   /' >&2
    echo -e "\033[90m   ────────────────────────────────────────────\033[0m" >&2
  fi
  echo -e "\033[33m   Debug commands:\033[0m" >&2
  echo -e "\033[90m     docker compose logs --tail=50 backend\033[0m" >&2
  echo -e "\033[90m     docker compose logs --tail=50 frontend\033[0m" >&2
  echo -e "\033[90m     cat $BUILD_LOG\033[0m" >&2
  echo "" >&2
  exit "$exit_code"
}
trap on_error ERR

# ─── Colors & Formatting ──────────────────────────────────
BOLD='\033[1m'
DIM='\033[2m'
CYAN='\033[36m'
GREEN='\033[32m'
YELLOW='\033[33m'
RED='\033[31m'
BLUE='\033[34m'
MAGENTA='\033[35m'
GRAY='\033[90m'
WHITE='\033[97m'
NC='\033[0m'

# ─── Logging Helpers ──────────────────────────────────────
section() {
  echo ""
  echo -e "${GRAY}   ┌─────────────────────────────────────────────────────────────${NC}"
  echo -e "${GRAY}   │${NC}  ${BLUE}${BOLD}▶ $1${NC}"
  echo -e "${GRAY}   ├─────────────────────────────────────────────────────────────${NC}"
}

ok() {
  echo -e "${GRAY}   │${NC}  ${GREEN}✔${NC}  ${WHITE}$1${NC}"
}

info() {
  echo -e "${GRAY}   │${NC}  ${CYAN}→${NC}  ${WHITE}$1${NC}"
}

detail() {
  echo -e "${GRAY}   │${NC}     ${DIM}$1${NC}"
}

warn() {
  echo -e "${GRAY}   │${NC}  ${YELLOW}⚠${NC}  ${YELLOW}$1${NC}"
}

fail() {
  echo -e "${GRAY}   │${NC}  ${RED}✘${NC}  ${RED}${BOLD}$1${NC}"
  section_end
  exit 1
}

step_time() {
  local start=$1 label=$2
  local elapsed=$(( $(date +%s) - start ))
  echo -e "${GRAY}   │${NC}  ${GREEN}✔${NC}  ${WHITE}${label}${NC} ${DIM}(${elapsed}s)${NC}"
}

section_end() {
  echo -e "${GRAY}   └─────────────────────────────────────────────────────────────${NC}"
}

spinner() {
  local pid=$1 label=$2
  local frames=("⠋" "⠙" "⠹" "⠸" "⠼" "⠴" "⠦" "⠧" "⠇" "⠏")
  local i=0
  while kill -0 "$pid" 2>/dev/null; do
    printf "\r${GRAY}   │${NC}  ${CYAN}${frames[$i]}${NC}  ${WHITE}${label}${NC}  "
    i=$(( (i+1) % ${#frames[@]} ))
    sleep 0.1
  done
  printf "\r"
}

env_get() {
  local file=$1 key=$2
  grep -E "^${key}=" "$file" 2>/dev/null | head -1 | cut -d'=' -f2- | tr -d '"' | tr -d "'"
}

# ─── URL Resolution (same logic as install.sh) ───────────
resolve_base_url() {
  # Priority 1: APP_URL from .env
  local app_url=$(env_get .env APP_URL 2>/dev/null)
  if [ -n "$app_url" ] && [[ "$app_url" != *"localhost"* ]]; then
    BASE_URL=$(echo "${app_url%/}" | sed -E 's|:[0-9]+$||')
    URL_SOURCE="domain (.env APP_URL)"
    return 0
  fi

  # Priority 2: VPS public IP
  local public_ip=""
  if command -v curl >/dev/null 2>&1; then
    public_ip=$(curl -s --max-time 3 https://api.ipify.org 2>/dev/null || \
                curl -s --max-time 3 https://ifconfig.me 2>/dev/null || \
                curl -s --max-time 3 https://icanhazip.com 2>/dev/null || true)
  fi
  if [ -n "$public_ip" ] && [[ "$public_ip" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    BASE_URL="http://${public_ip}"
    URL_SOURCE="VPS public IP"
    return 0
  fi

  # Priority 3: hostname -I
  local host_ip=$(hostname -I 2>/dev/null | awk '{print $1}' || true)
  if [ -n "$host_ip" ] && [ "$host_ip" != "127.0.0.1" ]; then
    BASE_URL="http://${host_ip}"
    URL_SOURCE="server IP"
    return 0
  fi

  # Priority 4: localhost fallback
  BASE_URL="http://localhost"
  URL_SOURCE="localhost (fallback)"
  return 0
}

# ─── Parse Arguments ──────────────────────────────────────
FORCE=false
TARGET_SERVICE=""
REBUILD=false
NO_CACHE=false
QUICK=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --force|-f)
      FORCE=true
      shift
      ;;
    --service|-s)
      TARGET_SERVICE="$2"
      shift 2
      ;;
    --rebuild|-r)
      REBUILD=true
      shift
      ;;
    --no-cache)
      NO_CACHE=true
      REBUILD=true
      shift
      ;;
    --quick|-q)
      QUICK=true
      shift
      ;;
    --help|-h)
      echo "Usage: bash restart.sh [--force] [--service <name>] [--rebuild] [--no-cache] [--quick]"
      echo ""
      echo "Options:"
      echo "  --force, -f           Skip confirmation prompt"
      echo "  --service, -s <name>  Restart only a specific service"
      echo "                        (postgres, redis, backend, frontend, nginx)"
      echo "  --rebuild, -r         Force rebuild images (picks up code changes)"
      echo "  --no-cache            Full rebuild from scratch (clears Docker layer cache)"
      echo "  --quick, -q           Quick restart, skip change detection & rebuild"
      echo "  --help, -h            Show this help"
      echo ""
      echo "By default, the script auto-detects code changes since the last build"
      echo "and triggers a rebuild automatically.  Use --quick to skip this."
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      echo "Run 'bash restart.sh --help' for usage"
      exit 1
      ;;
  esac
done

# ─── Source Change Detection ──────────────────────────────
# Computes a hash of all source files. If it differs from the last
# build, we auto-set REBUILD=true so users always see fresh code.
HASH_FILE=".build-hash"

compute_source_hash() {
  # Hash all source files (backend + frontend + nginx config + docker configs)
  # Excludes node_modules, .next, dist, .git
  local hash=""
  if command -v git >/dev/null 2>&1 && [ -d .git ]; then
    # Prefer git — fast, ignores untracked noise
    hash=$(git diff HEAD --stat 2>/dev/null; git log -1 --format='%H' 2>/dev/null; \
           find backend/src backend/prisma frontend/src frontend/next.config.mjs \
                nginx/nginx.conf docker-compose.yml \
                backend/Dockerfile frontend/Dockerfile \
                -type f 2>/dev/null | sort | xargs md5sum 2>/dev/null | md5sum | awk '{print $1}')
  else
    hash=$(find backend/src backend/prisma frontend/src frontend/next.config.mjs \
                nginx/nginx.conf docker-compose.yml \
                backend/Dockerfile frontend/Dockerfile \
                -type f 2>/dev/null | sort | xargs md5sum 2>/dev/null | md5sum | awk '{print $1}')
  fi
  echo "$hash"
}

auto_detect_changes() {
  if $QUICK || $REBUILD || $NO_CACHE; then
    return  # Skip detection if user explicitly chose a mode
  fi

  info "Checking for source code changes since last build..."

  local current_hash
  current_hash=$(compute_source_hash)

  if [ -f "$HASH_FILE" ]; then
    local previous_hash
    previous_hash=$(cat "$HASH_FILE" 2>/dev/null || echo "")
    if [ "$current_hash" != "$previous_hash" ]; then
      ok "Code changes detected — auto-rebuild enabled"
      detail "Previous: ${previous_hash:0:12}…  Current: ${current_hash:0:12}…"
      REBUILD=true
    else
      ok "No source changes detected — using cached images"
      detail "Hash: ${current_hash:0:12}…"
    fi
  else
    ok "First build detected — rebuild enabled"
    REBUILD=true
  fi
}

save_build_hash() {
  local current_hash
  current_hash=$(compute_source_hash)
  echo "$current_hash" > "$HASH_FILE"
}

# ─── Start ─────────────────────────────────────────────────
START_TIME=$(date +%s)

echo ""
echo -e "${GRAY}   ══════════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}${BOLD}   ↻  GameHost Platform — Safe Restart${NC}"
echo -e "${DIM}${GRAY}      $(date '+%Y-%m-%d %H:%M:%S %Z')${NC}"
echo -e "${GRAY}   ══════════════════════════════════════════════════════════════════${NC}"

# ─── Pre-flight Checks ───────────────────────────────────
section "Pre-flight Checks"

command -v docker >/dev/null 2>&1 || fail "Docker is not installed."
DOCKER_VER=$(docker --version 2>/dev/null | awk '{print $3}' | tr -d ',')
ok "Docker ${DIM}v${DOCKER_VER}${NC}"

command -v docker compose >/dev/null 2>&1 && COMPOSE="docker compose" || {
  command -v docker-compose >/dev/null 2>&1 && COMPOSE="docker-compose" || fail "Docker Compose not found."
}
COMPOSE_VER=$($COMPOSE version --short 2>/dev/null || $COMPOSE version 2>/dev/null | awk '{print $NF}')
ok "Docker Compose ${DIM}v${COMPOSE_VER}${NC}"

[ -f .env ] || fail ".env not found — run install.sh first"
ok ".env exists"

# Auto-detect source changes (sets REBUILD=true if code changed)
auto_detect_changes

# Validate Dockerfiles (needed for rebuild)
if $REBUILD; then
  for df in backend/Dockerfile frontend/Dockerfile; do
    [ -f "$df" ] || fail "${df} is missing — required for Docker build"
  done
  [ -f backend/prisma.config.ts ] || fail "backend/prisma.config.ts is missing — required for Prisma 7"
  ok "Build files verified ${DIM}(Dockerfiles + prisma.config.ts)${NC}"
fi

# Show current state
RUNNING_CONTAINERS=$($COMPOSE ps --format '{{.Name}} {{.Status}}' 2>/dev/null || true)
RUNNING_COUNT=$(echo "$RUNNING_CONTAINERS" | grep -c "Up" 2>/dev/null || echo "0")
detail "${RUNNING_COUNT} container(s) currently running"

if [ -n "$TARGET_SERVICE" ]; then
  info "Target: ${BOLD}${TARGET_SERVICE}${NC} (single service restart)"
fi

if $REBUILD; then
  ok "Rebuild mode: ${YELLOW}images will be rebuilt${NC}"
fi
if $NO_CACHE; then
  ok "No-cache mode: ${YELLOW}Docker layer cache will be cleared${NC}"
fi

section_end

# ─── Confirmation ─────────────────────────────────────────
if ! $FORCE; then
  echo ""
  if [ -n "$TARGET_SERVICE" ]; then
    echo -e "   ${YELLOW}This will restart the ${BOLD}${TARGET_SERVICE}${NC}${YELLOW} service.${NC}"
  else
    echo -e "   ${YELLOW}This will restart ${BOLD}all${NC}${YELLOW} GameHost services.${NC}"
  fi
  echo -e "   ${DIM}Database volumes and .env will be preserved.${NC}"
  echo ""
  read -p "   Continue? [Y/n] " -n 1 -r
  echo ""
  if [[ ! $REPLY =~ ^[Yy]$ ]] && [[ -n "$REPLY" ]]; then
    echo -e "   ${DIM}Cancelled.${NC}"
    exit 0
  fi
fi

# ─── Single Service Restart ──────────────────────────────
if [ -n "$TARGET_SERVICE" ]; then
  section "Restarting ${TARGET_SERVICE}"

  RESTART_START=$(date +%s)

  # Validate service name
  VALID_SERVICES=("postgres" "redis" "backend" "frontend" "nginx")
  FOUND=false
  for svc in "${VALID_SERVICES[@]}"; do
    if [[ "$TARGET_SERVICE" == "$svc" ]]; then
      FOUND=true
      break
    fi
  done
  $FOUND || fail "Unknown service '${TARGET_SERVICE}'. Valid: ${VALID_SERVICES[*]}"

  info "Stopping ${TARGET_SERVICE}..."
  $COMPOSE stop "$TARGET_SERVICE" >> "$BUILD_LOG" 2>&1 || true
  $COMPOSE rm -f "$TARGET_SERVICE" >> "$BUILD_LOG" 2>&1 || true
  ok "Stopped ${TARGET_SERVICE}"

  # Rebuild if requested
  if $REBUILD; then
    info "Rebuilding ${TARGET_SERVICE} image..."
    BUILD_FLAGS=""
    $NO_CACHE && BUILD_FLAGS="--no-cache"
    if ! $COMPOSE build $BUILD_FLAGS "$TARGET_SERVICE" >> "$BUILD_LOG" 2>&1; then
      fail "Failed to build ${TARGET_SERVICE} — check: cat ${BUILD_LOG}"
    fi
    ok "Rebuilt ${TARGET_SERVICE} image"
  fi

  info "Starting ${TARGET_SERVICE}..."
  if ! $COMPOSE up -d "$TARGET_SERVICE" >> "$BUILD_LOG" 2>&1; then
    fail "Failed to start ${TARGET_SERVICE} — check: docker compose logs ${TARGET_SERVICE}"
  fi
  ok "Started ${TARGET_SERVICE}"

  # If restarting backend, wait for it and run health check
  if [[ "$TARGET_SERVICE" == "backend" ]]; then
    BE_PORT=$(env_get .env BACKEND_PORT)
    BE_PORT=${BE_PORT:-4000}

    info "Waiting for backend to become healthy..."
    for attempt in $(seq 1 20); do
      HEALTH_BODY=$(curl -s --max-time 3 "http://localhost:${BE_PORT}/api/health" 2>/dev/null || true)
      if echo "$HEALTH_BODY" | grep -q '"status"' 2>/dev/null; then
        step_time $RESTART_START "Backend is healthy"
        break
      fi
      [ "$attempt" -eq 20 ] && warn "Backend did not respond in time — check logs"
      sleep 2
    done
  fi

  # If restarting postgres, wait for readiness
  if [[ "$TARGET_SERVICE" == "postgres" ]]; then
    DB_USER_VAL=$(env_get .env DB_USER)
    DB_USER_VAL=${DB_USER_VAL:-gamehost}
    info "Waiting for PostgreSQL to become ready..."
    for i in $(seq 1 20); do
      if $COMPOSE exec -T postgres pg_isready -U "${DB_USER_VAL}" >/dev/null 2>&1; then
        step_time $RESTART_START "PostgreSQL is ready"
        break
      fi
      [ "$i" -eq 20 ] && warn "PostgreSQL did not respond in time"
      sleep 2
    done
  fi

  step_time $RESTART_START "${TARGET_SERVICE} restarted"
  section_end

else
  # ─── Full Restart ────────────────────────────────────────

  # ── Graceful Shutdown ──────────────────────────────────
  section "Graceful Shutdown"

  STOP_START=$(date +%s)

  info "Bringing all services down cleanly..."
  # docker compose down = stop + rm + network cleanup, volumes preserved
  $COMPOSE down --timeout 15 >> "$BUILD_LOG" 2>&1 && ok "All containers stopped & removed" || detail "No containers were running"
  detail "Volumes preserved (pgdata, redisdata)"

  step_time $STOP_START "Clean shutdown completed"
  section_end

  # ── Clear Build Caches ─────────────────────────────────
  if $REBUILD; then
    section "Clearing Build Caches"

    CACHE_START=$(date +%s)

    # Clear Next.js .next cache so stale CSS/JS is never served
    if [ -d "./frontend/.next" ]; then
      rm -rf ./frontend/.next
      ok "Cleared Next.js .next cache"
    else
      detail "No .next cache found (clean build)"
    fi

    # Clear backend dist cache
    if [ -d "./backend/dist" ]; then
      rm -rf ./backend/dist
      ok "Cleared backend dist cache"
    else
      detail "No backend dist cache found"
    fi

    step_time $CACHE_START "Caches cleared"
    section_end
  fi

  # ── Build Images ────────────────────────────────────────
  section "Building Images"

  BUILD_START=$(date +%s)

  BUILD_FLAGS=""
  if $REBUILD; then
    BUILD_FLAGS="--build"
  fi
  if $NO_CACHE; then
    BUILD_FLAGS="--build --no-cache"
  fi
  if [ -n "$BUILD_FLAGS" ]; then
    info "Rebuilding with flags: ${BOLD}${BUILD_FLAGS}${NC}"
  else
    info "Using cached images (pass --rebuild to force rebuild)"
  fi

  step_time $BUILD_START "Build preparation ready"
  section_end

  # ── Start Services ─────────────────────────────────────
  section "Starting Services"

  UP_START=$(date +%s)

  # Build images if rebuild was requested
  if [ "$NO_CACHE" = true ]; then
    info "Building images (no cache)..."
    if ! $COMPOSE build --no-cache >> "$BUILD_LOG" 2>&1; then
      fail "docker compose build --no-cache failed — check: cat ${BUILD_LOG}"
    fi
  elif [ -n "$BUILD_FLAGS" ]; then
    info "Building images..."
    if ! $COMPOSE build >> "$BUILD_LOG" 2>&1; then
      fail "docker compose build failed — check: cat ${BUILD_LOG}"
    fi
  fi

  info "Starting all containers..."
  if ! $COMPOSE up -d >> "$BUILD_LOG" 2>&1; then
    fail "docker compose up -d failed! Check: docker compose logs --tail=50\n   Full log: ${BUILD_LOG}"
  fi
  ok "PostgreSQL 16           ${DIM}(gamehost-db)${NC}"
  ok "Redis 7                 ${DIM}(gamehost-redis)${NC}"
  ok "Backend — NestJS        ${DIM}(gamehost-backend)${NC}"
  ok "Frontend — Next.js      ${DIM}(gamehost-frontend)${NC}"
  ok "Nginx — Reverse Proxy   ${DIM}(gamehost-nginx)${NC}"

  step_time $UP_START "All services started"
  section_end

  # ── Database Health Check ──────────────────────────────
  section "Database Readiness"

  DB_USER_VAL=$(env_get .env DB_USER)
  DB_USER_VAL=${DB_USER_VAL:-gamehost}

  info "Waiting for PostgreSQL..."

  DB_WAIT_START=$(date +%s)
  DB_READY=false
  for i in $(seq 1 30); do
    if $COMPOSE exec -T postgres pg_isready -U "${DB_USER_VAL}" >/dev/null 2>&1; then
      step_time $DB_WAIT_START "PostgreSQL is accepting connections"
      DB_READY=true
      break
    fi
    [ "$i" -eq 30 ] && warn "PostgreSQL not ready after 60s — check logs"
    sleep 2
  done

  # Verify Redis
  REDIS_PW=$(env_get .env REDIS_PASSWORD)
  REDIS_PW=${REDIS_PW:-gamehost_redis}
  if $COMPOSE exec -T redis redis-cli -a "$REDIS_PW" ping 2>/dev/null | grep -q "PONG"; then
    ok "Redis is responding"
  else
    warn "Redis did not respond to PING"
  fi

  section_end

  # ── Backend Health Check ───────────────────────────────
  section "Backend Health Check"

  BE_PORT=$(env_get .env BACKEND_PORT)
  BE_PORT=${BE_PORT:-4000}

  HEALTH_OK=false

  if command -v curl >/dev/null 2>&1; then
    info "Waiting for backend API..."

    HEALTH_START=$(date +%s)
    for attempt in $(seq 1 20); do
      HEALTH_BODY=$(curl -s --max-time 5 "http://localhost:${BE_PORT}/api/health" 2>/dev/null || true)
      if echo "$HEALTH_BODY" | grep -q '"status"' 2>/dev/null; then
        HEALTH_OK=true
        step_time $HEALTH_START "Backend API is healthy"

        STATUS=$(echo "$HEALTH_BODY" | grep -oP '"status"\s*:\s*"[^"]*"' | head -1 | grep -oP '"[^"]*"$' | tr -d '"' || true)
        if [[ "$STATUS" == "ok" || "$STATUS" == "healthy" ]]; then
          ok "Health status: ${GREEN}${BOLD}${STATUS}${NC}"
        else
          warn "Health status: ${YELLOW}${STATUS}${NC}"
        fi

        # Response time
        RESP_TIME=$(curl -s -o /dev/null -w "%{time_total}" --max-time 5 "http://localhost:${BE_PORT}/api/health" 2>/dev/null || echo "N/A")
        if [ "$RESP_TIME" != "N/A" ]; then
          RESP_MS=$(echo "$RESP_TIME" | awk '{printf "%.0f", $1 * 1000}')
          ok "Response time: ${DIM}${RESP_MS}ms${NC}"
        fi
        break
      fi
      if (( attempt % 5 == 0 )); then
        detail "Attempt ${attempt}/20 — backend still starting..."
      fi
      sleep 2
    done

    if ! $HEALTH_OK; then
      warn "Backend did not respond within 40 seconds"
      detail "Check logs: docker compose logs -f backend"
    fi
  else
    warn "curl not available — skipping health check"
  fi

  section_end
fi

# ── Save Build Hash (so next restart detects changes) ──────
if $REBUILD || $NO_CACHE; then
  save_build_hash
fi

# ── CDN / Cloudflare Cache Purge ─────────────────────────
# If Cloudflare API credentials are in .env, purge CDN cache so every
# user worldwide immediately gets the fresh build (no stale edge cache).
purge_cdn_cache() {
  local cf_zone cf_token
  cf_zone=$(env_get .env CF_ZONE_ID 2>/dev/null || true)
  cf_token=$(env_get .env CF_API_TOKEN 2>/dev/null || true)

  if [ -z "$cf_zone" ] || [ -z "$cf_token" ]; then
    return 1  # Not configured
  fi

  local response
  response=$(curl -s -X POST \
    "https://api.cloudflare.com/client/v4/zones/${cf_zone}/purge_cache" \
    -H "Authorization: Bearer ${cf_token}" \
    -H "Content-Type: application/json" \
    --data '{"purge_everything":true}' \
    --max-time 10 2>/dev/null || echo '{"success":false}')

  if echo "$response" | grep -q '"success":true'; then
    return 0
  else
    return 1
  fi
}

if $REBUILD || $NO_CACHE; then
  section "Cache Busting"

  ok "Next.js build uses content-hashed filenames"
  detail "New JS/CSS chunks get unique hashes → browsers auto-fetch fresh assets"
  ok "HTML served with no-cache headers via nginx"
  detail "Every page load fetches fresh HTML → references new asset hashes"

  # Try Cloudflare CDN purge
  if command -v curl >/dev/null 2>&1; then
    CF_ZONE_ID=$(env_get .env CF_ZONE_ID 2>/dev/null || true)
    if [ -n "$CF_ZONE_ID" ]; then
      info "Purging Cloudflare CDN cache..."
      if purge_cdn_cache; then
        ok "Cloudflare CDN cache purged globally"
      else
        warn "Cloudflare cache purge failed — check CF_ZONE_ID and CF_API_TOKEN in .env"
      fi
    else
      detail "Cloudflare not configured — skipping CDN purge"
      detail "To enable: add CF_ZONE_ID and CF_API_TOKEN to .env"
    fi
  fi

  section_end
fi

# ── Container Status ───────────────────────────────────────
section "Container Status"

# Show all containers with status
while IFS= read -r line; do
  CNAME=$(echo "$line" | awk '{print $1}')
  CSTATUS=$(echo "$line" | cut -d' ' -f2-)
  if echo "$CSTATUS" | grep -qi "up"; then
    ok "${CNAME}  ${GREEN}${BOLD}UP${NC}  ${DIM}${CSTATUS}${NC}"
  else
    warn "${CNAME}  ${RED}DOWN${NC}  ${DIM}${CSTATUS}${NC}"
  fi
done < <($COMPOSE ps --format '{{.Name}} {{.Status}}' 2>/dev/null || true)

section_end

# ── Summary ───────────────────────────────────────────────
END_TIME=$(date +%s)
TOTAL_ELAPSED=$(( END_TIME - START_TIME ))

if [ "$TOTAL_ELAPSED" -ge 60 ]; then
  ELAPSED_FMT="$(( TOTAL_ELAPSED / 60 ))m $(( TOTAL_ELAPSED % 60 ))s"
else
  ELAPSED_FMT="${TOTAL_ELAPSED}s"
fi

FE_PORT=$(env_get .env FRONTEND_PORT)
BE_PORT=$(env_get .env BACKEND_PORT)
FE_PORT=${FE_PORT:-3000}
BE_PORT=${BE_PORT:-4000}

# Resolve real accessible URLs
resolve_base_url

IS_NGINX_PROXIED=false
if [[ "$URL_SOURCE" != "localhost"* ]]; then
  IS_NGINX_PROXIED=true
fi

if $IS_NGINX_PROXIED; then
  FRONTEND_URL="${BASE_URL}"
  BACKEND_URL="${BASE_URL}/api"
  HEALTH_URL="${BASE_URL}/api/health"
else
  FRONTEND_URL="${BASE_URL}:${FE_PORT}"
  BACKEND_URL="${BASE_URL}:${BE_PORT}"
  HEALTH_URL="${BASE_URL}:${BE_PORT}/api/health"
fi

# Build OAuth callback URLs
if $IS_NGINX_PROXIED; then
  CALLBACK_BASE="${BASE_URL}"
else
  CALLBACK_BASE="${BASE_URL}:${BE_PORT}"
fi
GOOGLE_REDIRECT="${CALLBACK_BASE}/api/auth/google/callback"
DISCORD_REDIRECT="${CALLBACK_BASE}/api/auth/discord/callback"

# Detect IP-based callback
CALLBACK_HOST=$(echo "$CALLBACK_BASE" | sed -E 's|^https?://||' | cut -d: -f1)
IS_IP_BASED=false
if [[ "$CALLBACK_HOST" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  IS_IP_BASED=true
fi

echo ""
echo -e "${GRAY}   ╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GRAY}   ║${NC}                                                              ${GRAY}║${NC}"
if [ -n "$TARGET_SERVICE" ]; then
  echo -e "${GRAY}   ║${NC}   ${GREEN}${BOLD}✔  ${TARGET_SERVICE} restarted successfully!${NC}                       ${GRAY}║${NC}"
else
  echo -e "${GRAY}   ║${NC}   ${GREEN}${BOLD}✔  All services restarted successfully!${NC}                     ${GRAY}║${NC}"
fi
echo -e "${GRAY}   ║${NC}   ${DIM}Completed in ${ELAPSED_FMT} · via ${URL_SOURCE}${NC}                  ${GRAY}║${NC}"
echo -e "${GRAY}   ║${NC}                                                              ${GRAY}║${NC}"
echo -e "${GRAY}   ╠══════════════════════════════════════════════════════════════╣${NC}"
echo -e "${GRAY}   ║${NC}                                                              ${GRAY}║${NC}"
echo -e "${GRAY}   ║${NC}   ${WHITE}${BOLD}Access Points${NC}                                               ${GRAY}║${NC}"
echo -e "${GRAY}   ║${NC}   ${CYAN}Website${NC}      ${FRONTEND_URL}${NC}${GRAY}║${NC}"
echo -e "${GRAY}   ║${NC}   ${CYAN}API${NC}          ${BACKEND_URL}${NC}${GRAY}║${NC}"
echo -e "${GRAY}   ║${NC}   ${CYAN}Health${NC}       ${HEALTH_URL}${NC}${GRAY}║${NC}"
echo -e "${GRAY}   ║${NC}                                                              ${GRAY}║${NC}"
echo -e "${GRAY}   ║${NC}   ${DIM}Logs: docker compose logs -f${NC}                                ${GRAY}║${NC}"
echo -e "${GRAY}   ║${NC}                                                              ${GRAY}║${NC}"
echo -e "${GRAY}   ╚══════════════════════════════════════════════════════════════╝${NC}"

# ── OAuth URLs Quick Reference ───────────────────────────
echo ""
echo -e "${GRAY}   ┌─────────────────────────────────────────────────────────────${NC}"
echo -e "${GRAY}   │${NC}  ${MAGENTA}${BOLD}⚡ OAuth Redirect URLs${NC}"
echo -e "${GRAY}   ├─────────────────────────────────────────────────────────────${NC}"
echo -e "${GRAY}   │${NC}"
if $IS_IP_BASED; then
  echo -e "${GRAY}   │${NC}  ${YELLOW}⚠ Google OAuth${NC} — ${RED}requires a domain (IP not allowed)${NC}"
  echo -e "${GRAY}   │${NC}    ${DIM}Set APP_URL to your domain in .env, then re-run install.sh${NC}"
else
  echo -e "${GRAY}   │${NC}  ${CYAN}Google${NC}   ${WHITE}${BOLD}${GOOGLE_REDIRECT}${NC}"
fi
echo -e "${GRAY}   │${NC}  ${CYAN}Discord${NC}  ${WHITE}${BOLD}${DISCORD_REDIRECT}${NC}"
echo -e "${GRAY}   │${NC}"

# Show .env sync status for OAuth URLs
CURRENT_GOOGLE_CB=$(env_get .env GOOGLE_CALLBACK_URL)
CURRENT_DISCORD_CB=$(env_get .env DISCORD_CALLBACK_URL)
OAUTH_SYNCED=true
if [[ "$CURRENT_GOOGLE_CB" != "$GOOGLE_REDIRECT" ]] || [[ "$CURRENT_DISCORD_CB" != "$DISCORD_REDIRECT" ]]; then
  OAUTH_SYNCED=false
  echo -e "${GRAY}   │${NC}  ${YELLOW}⚠ .env callback URLs are out of sync${NC}"
  echo -e "${GRAY}   │${NC}    ${DIM}Run ${BOLD}bash install.sh${NC}${DIM} to re-sync, or update .env manually:${NC}"
  if [[ "$CURRENT_GOOGLE_CB" != "$GOOGLE_REDIRECT" ]]; then
    echo -e "${GRAY}   │${NC}    ${DIM}GOOGLE_CALLBACK_URL=${GOOGLE_REDIRECT}${NC}"
  fi
  if [[ "$CURRENT_DISCORD_CB" != "$DISCORD_REDIRECT" ]]; then
    echo -e "${GRAY}   │${NC}    ${DIM}DISCORD_CALLBACK_URL=${DISCORD_REDIRECT}${NC}"
  fi
  echo -e "${GRAY}   │${NC}"
fi

echo -e "${GRAY}   └─────────────────────────────────────────────────────────────${NC}"
echo ""
