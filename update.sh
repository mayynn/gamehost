#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# GameHost Platform — Production-Safe Update
# Usage: bash update.sh [--skip-backup] [--skip-build-cache]
#
# This script safely updates your GameHost installation:
#   1. Pre-flight validation
#   2. Auto-backup database before any changes
#   3. Preserve .env, stash local changes
#   4. Git pull latest code
#   5. Merge new .env keys from .env.example (without overwriting)
#   6. Re-sync OAuth redirect URLs based on resolved base URL
#   7. Rebuild containers
#   8. Rolling restart (data services stay up during build)
#   9. Run Prisma migrate deploy (safe for production)
#  10. Health check & rollback guidance on failure
# ============================================================

# ─── Build log (captured so errors are never lost) ────────
BUILD_LOG="/tmp/gamehost-update-$(date +%s).log"

# ─── Global error trap — ensures set -e never dies silently ─
on_error() {
  local exit_code=$? lineno=${BASH_LINENO[0]:-0}
  echo "" >&2
  echo -e "\033[31m\033[1m   ══════════════════════════════════════════════════════════\033[0m" >&2
  echo -e "\033[31m\033[1m    ✘  Update failed unexpectedly  (line ${lineno}, exit ${exit_code})\033[0m" >&2
  echo -e "\033[31m\033[1m   ══════════════════════════════════════════════════════════\033[0m" >&2
  if [ -s "$BUILD_LOG" ]; then
    echo -e "\033[33m   Last 30 lines of build log ($BUILD_LOG):\033[0m" >&2
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
  echo ""
  echo -e "   ${RED}${BOLD}Update failed.${NC}"
  if [ "${BACKUP_FILE:-}" != "" ] && [ -f "${BACKUP_FILE:-}" ]; then
    echo -e "   ${YELLOW}A database backup was saved at: ${BOLD}${BACKUP_FILE}${NC}"
    echo -e "   ${DIM}To restore: gunzip -c ${BACKUP_FILE} | docker compose exec -T postgres psql -U \${DB_USER} -d \${DB_NAME}${NC}"
  fi
  echo ""
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

env_set() {
  local file=$1 key=$2 value=$3
  if grep -qE "^${key}=" "$file" 2>/dev/null; then
    sed -i "s|^${key}=.*|${key}=${value}|" "$file"
  else
    echo "${key}=${value}" >> "$file"
  fi
}

resolve_base_url() {
  local fe_port=${1:-3000}
  local be_port=${2:-4000}

  local app_url=$(env_get .env APP_URL 2>/dev/null)
  if [ -n "$app_url" ] && [[ "$app_url" != *"localhost"* ]]; then
    BASE_URL=$(echo "${app_url%/}" | sed -E 's|:[0-9]+$||')
    URL_SOURCE="domain (.env APP_URL)"
    return 0
  fi

  local public_ip=""
  if command -v curl >/dev/null 2>&1; then
    public_ip=$(curl -s --max-time 3 https://api.ipify.org 2>/dev/null || \
                curl -s --max-time 3 https://ifconfig.me 2>/dev/null || true)
  fi

  if [ -n "$public_ip" ] && [[ "$public_ip" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    BASE_URL="http://${public_ip}"
    URL_SOURCE="VPS public IP"
    return 0
  fi

  local host_ip=$(hostname -I 2>/dev/null | awk '{print $1}' || true)
  if [ -n "$host_ip" ] && [ "$host_ip" != "127.0.0.1" ]; then
    BASE_URL="http://${host_ip}"
    URL_SOURCE="server IP (hostname)"
    return 0
  fi

  BASE_URL="http://localhost"
  URL_SOURCE="localhost (fallback)"
  return 0
}

# ─── Parse Arguments ──────────────────────────────────────
SKIP_BACKUP=false
BUILD_NO_CACHE="--no-cache"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-backup)  SKIP_BACKUP=true; shift ;;
    --skip-build-cache) BUILD_NO_CACHE=""; shift ;;
    --help|-h)
      echo "Usage: bash update.sh [--skip-backup] [--skip-build-cache]"
      echo ""
      echo "Options:"
      echo "  --skip-backup       Skip pre-update database backup"
      echo "  --skip-build-cache  Use Docker build cache (faster but may use stale layers)"
      echo "  --help, -h          Show this help"
      exit 0
      ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

# ═══════════════════════════════════════════════════════════
#                        BEGIN UPDATE
# ═══════════════════════════════════════════════════════════
START_TIME=$(date +%s)
BACKUP_FILE=""
GIT_PREV_COMMIT=""

echo ""
echo -e "${GRAY}   ══════════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}${BOLD}   ⟳  GameHost Platform — Production Update${NC}"
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

# Verify critical .env values
DB_USER_VAL=$(env_get .env DB_USER)
DB_USER_VAL=${DB_USER_VAL:-gamehost}
DB_NAME_VAL=$(env_get .env DB_NAME)
DB_NAME_VAL=${DB_NAME_VAL:-gamehost}

# Disk space check (need at least 1GB free)
DISK_AVAIL_KB=$(df -k . 2>/dev/null | awk 'NR==2{print $4}' || echo "0")
if [ "$DISK_AVAIL_KB" -lt 1048576 ] 2>/dev/null; then
  warn "Low disk space: $(df -h . | awk 'NR==2{print $4}') free — recommend at least 1GB"
else
  ok "Disk space ${DIM}$(df -h . | awk 'NR==2{print $4}') free${NC}"
fi

# Show current running containers
RUNNING=$($COMPOSE ps --format '{{.Name}}' 2>/dev/null | wc -l || echo "0")
detail "${RUNNING} container(s) currently running"

section_end

# ─── Pre-Update Backup ───────────────────────────────────
if ! $SKIP_BACKUP; then
  section "Pre-Update Database Backup"

  mkdir -p backups
  TIMESTAMP=$(date +%Y%m%d_%H%M%S)
  BACKUP_FILE="backups/pre_update_${TIMESTAMP}.sql.gz"

  # Check if postgres is running
  if $COMPOSE exec -T postgres pg_isready -U "${DB_USER_VAL}" >/dev/null 2>&1; then
    BACKUP_START=$(date +%s)
    info "Dumping database before update..."

    $COMPOSE exec -T postgres pg_dump \
      -U "${DB_USER_VAL}" \
      -d "${DB_NAME_VAL}" \
      --clean \
      --if-exists \
      --no-owner \
      2>/dev/null | gzip > "$BACKUP_FILE"

    if [ -s "$BACKUP_FILE" ]; then
      BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
      step_time $BACKUP_START "Database backed up (${BACKUP_SIZE})"
      detail "Location: ${BACKUP_FILE}"
    else
      rm -f "$BACKUP_FILE"
      BACKUP_FILE=""
      warn "Backup file was empty — continuing without backup"
    fi
  else
    warn "PostgreSQL not running — skipping backup"
    detail "If this is a fresh install, this is expected"
    BACKUP_FILE=""
  fi

  # Also backup .env
  cp .env "backups/.env.pre_update_${TIMESTAMP}"
  ok ".env backed up"

  section_end
else
  info "Skipping pre-update backup (--skip-backup)"
fi

# ─── Preserve .env ────────────────────────────────────────
section "Preserving Configuration"

# Save .env to temp location (belt and suspenders)
cp .env .env.update_preserve
ok ".env preserved"

# Record current commit for rollback info
if command -v git >/dev/null 2>&1 && [ -d .git ]; then
  GIT_PREV_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
  detail "Current commit: ${GIT_PREV_COMMIT}"
fi

section_end

# ─── Pull Latest Code ────────────────────────────────────
section "Source Code"

if command -v git >/dev/null 2>&1 && [ -d .git ]; then
  GIT_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
  info "Branch: ${BOLD}${GIT_BRANCH}${NC}"

  # Check for local modifications
  LOCAL_CHANGES=$(git status --porcelain 2>/dev/null | grep -v '\.env' | grep -v 'backups/' | grep -v 'nginx/ssl/' || true)
  if [ -n "$LOCAL_CHANGES" ]; then
    warn "Local modifications detected — stashing"
    git stash push -m "gamehost-update-$(date +%s)" -- $(git diff --name-only | grep -v '\.env' | grep -v 'backups/' | grep -v 'nginx/ssl/' || true) > /dev/null 2>&1 || true
    ok "Local changes stashed"
    detail "Restore later with: git stash pop"
  fi

  # Pull latest
  PULL_START=$(date +%s)
  info "Pulling latest changes..."

  if git pull --rebase 2>&1 | tail -5; then
    step_time $PULL_START "Git pull successful"
    NEW_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
    if [ "$NEW_COMMIT" != "$GIT_PREV_COMMIT" ]; then
      ok "Updated: ${DIM}${GIT_PREV_COMMIT} → ${NEW_COMMIT}${NC}"
      # Show brief changelog
      CHANGES=$(git log --oneline "${GIT_PREV_COMMIT}..${NEW_COMMIT}" 2>/dev/null | head -5 || true)
      if [ -n "$CHANGES" ]; then
        echo -e "${GRAY}   │${NC}"
        info "Recent changes:"
        while IFS= read -r change; do
          detail "  ${change}"
        done <<< "$CHANGES"
      fi
    else
      ok "Already up to date"
    fi
  else
    warn "Git pull failed — using local files"
  fi
else
  warn "No git repo — using local files"
fi

# Restore .env (in case git pull overwrote it somehow)
if [ -f .env.update_preserve ]; then
  cp .env.update_preserve .env
  ok ".env restored after git pull"
fi

section_end

# ─── Merge New .env Keys ─────────────────────────────────
section "Environment Sync"

ADDED_KEYS=0
if [ -f .env.example ]; then
  info "Checking for new configuration keys..."
  while IFS= read -r line; do
    [[ "$line" =~ ^#.*$ || -z "$line" ]] && continue
    KEY=$(echo "$line" | cut -d'=' -f1)
    if ! grep -qE "^${KEY}=" .env 2>/dev/null; then
      echo "$line" >> .env
      ADDED_KEYS=$((ADDED_KEYS + 1))
      detail "Added new key: ${KEY}"
    fi
  done < .env.example

  if [ "$ADDED_KEYS" -gt 0 ]; then
    ok "Merged ${ADDED_KEYS} new key(s) from .env.example"
  else
    ok "All keys present — no merge needed"
  fi
else
  warn ".env.example not found — skipping key merge"
fi

# ── Re-sync OAuth Redirect URLs ──────────────────────────
echo -e "${GRAY}   │${NC}"
info "Syncing OAuth redirect URLs..."

FE_PORT_VAL=$(env_get .env FRONTEND_PORT)
BE_PORT_VAL=$(env_get .env BACKEND_PORT)
FE_PORT_VAL=${FE_PORT_VAL:-3000}
BE_PORT_VAL=${BE_PORT_VAL:-4000}

resolve_base_url "$FE_PORT_VAL" "$BE_PORT_VAL"

IS_DOMAIN=false
if [[ "$URL_SOURCE" == "domain"* ]]; then
  IS_DOMAIN=true
fi

if $IS_DOMAIN; then
  CALLBACK_BASE="${BASE_URL}"
  RESOLVED_APP_URL="${BASE_URL}"

  # Validate HTTPS + nginx SSL alignment
  if [[ "$BASE_URL" == https://* ]]; then
    if [ -f nginx/nginx.conf ]; then
      if ! grep -q '^[[:space:]]*listen.*443' nginx/nginx.conf 2>/dev/null; then
        warn "APP_URL uses HTTPS but nginx SSL is not enabled!"
        detail "OAuth redirects may fail if HTTPS is not reachable."
      fi
    fi
  fi
else
  CALLBACK_BASE="${BASE_URL}"
  RESOLVED_APP_URL="${BASE_URL}"
fi

GOOGLE_REDIRECT="${CALLBACK_BASE}/api/auth/google/callback"
DISCORD_REDIRECT="${CALLBACK_BASE}/api/auth/discord/callback"

# Detect IP-based callback (Google rejects these)
CALLBACK_HOST=$(echo "$CALLBACK_BASE" | sed -E 's|^https?://||' | cut -d: -f1)
IS_IP_BASED=false
if [[ "$CALLBACK_HOST" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  IS_IP_BASED=true
fi

GOOGLE_OAUTH_BLOCKED=false
if $IS_IP_BASED; then
  GOOGLE_OAUTH_BLOCKED=true
  warn "${RED}${BOLD}Google OAuth will NOT work with IP-based URLs!${NC}"
  detail "Point a domain to ${CALLBACK_HOST} and set APP_URL in .env"
fi

# Sync URLs
CURRENT_APP_URL=$(env_get .env APP_URL)
if [[ -z "$CURRENT_APP_URL" || "$CURRENT_APP_URL" == "http://localhost"* ]]; then
  env_set .env APP_URL "$RESOLVED_APP_URL"
  ok "APP_URL synced → ${RESOLVED_APP_URL}"
else
  ok "APP_URL preserved → ${CURRENT_APP_URL}"
fi

IS_NGINX_PROXIED=false
if [[ "$URL_SOURCE" != "localhost"* ]]; then
  IS_NGINX_PROXIED=true
fi

if $IS_DOMAIN || $IS_NGINX_PROXIED; then
  env_set .env BACKEND_URL "$CALLBACK_BASE"
  ok "BACKEND_URL synced → ${CALLBACK_BASE} ${DIM}(nginx proxied)${NC}"
  env_set .env NEXT_PUBLIC_API_URL ""
  ok "NEXT_PUBLIC_API_URL  ${DIM}empty (nginx proxied)${NC}"
else
  env_set .env BACKEND_URL "${CALLBACK_BASE}:${BE_PORT_VAL}"
  ok "BACKEND_URL synced → ${CALLBACK_BASE}:${BE_PORT_VAL}"
  env_set .env NEXT_PUBLIC_API_URL "${CALLBACK_BASE}:${BE_PORT_VAL}"
  ok "NEXT_PUBLIC_API_URL  synced → ${CALLBACK_BASE}:${BE_PORT_VAL}"
fi

# Sync OAuth callbacks
CURRENT_GOOGLE_CB=$(env_get .env GOOGLE_CALLBACK_URL)
if [[ "$CURRENT_GOOGLE_CB" != "$GOOGLE_REDIRECT" ]]; then
  env_set .env GOOGLE_CALLBACK_URL "$GOOGLE_REDIRECT"
  ok "GOOGLE_CALLBACK_URL  ${GREEN}${BOLD}synced${NC}"
else
  ok "GOOGLE_CALLBACK_URL  ${DIM}preserved${NC}"
fi

CURRENT_DISCORD_CB=$(env_get .env DISCORD_CALLBACK_URL)
if [[ "$CURRENT_DISCORD_CB" != "$DISCORD_REDIRECT" ]]; then
  env_set .env DISCORD_CALLBACK_URL "$DISCORD_REDIRECT"
  ok "DISCORD_CALLBACK_URL ${GREEN}${BOLD}synced${NC}"
else
  ok "DISCORD_CALLBACK_URL ${DIM}preserved${NC}"
fi

# Display OAuth URLs
echo -e "${GRAY}   │${NC}"
echo -e "${GRAY}   │${NC}  ${MAGENTA}${BOLD}── Active OAuth Redirect URLs ──${NC}"
if $GOOGLE_OAUTH_BLOCKED; then
  echo -e "${GRAY}   │${NC}  ${RED}Google${NC}   ${RED}✘ BLOCKED (IP) — needs domain${NC}"
else
  echo -e "${GRAY}   │${NC}  ${CYAN}Google${NC}   ${WHITE}${GOOGLE_REDIRECT}${NC}"
fi
echo -e "${GRAY}   │${NC}  ${CYAN}Discord${NC}  ${WHITE}${DISCORD_REDIRECT}${NC}"

section_end

# ─── Rebuild ──────────────────────────────────────────────
section "Rebuilding"

info "Building new container images..."
if [ -n "$BUILD_NO_CACHE" ]; then
  detail "Using --no-cache for clean build"
else
  detail "Using Docker cache (faster)"
fi

BUILD_START=$(date +%s)

$COMPOSE build $BUILD_NO_CACHE >> "$BUILD_LOG" 2>&1 &
BUILD_PID=$!
spinner $BUILD_PID "Building images"

if ! wait $BUILD_PID; then
  echo ""
  fail "Docker build failed — previous version still running. Last 25 lines:

$(tail -25 "$BUILD_LOG" | sed 's/^/         /')

   Full log: ${BUILD_LOG}
   Re-run:   docker compose build --no-cache 2>&1 | tee build.log"
fi

step_time $BUILD_START "All images rebuilt"

section_end

# ─── Restart ──────────────────────────────────────────────
section "Restarting Services"

SERVICE_START=$(date +%s)

# Graceful stop — reverse dependency order
info "Stopping services gracefully..."
$COMPOSE stop nginx > /dev/null 2>&1 || true
$COMPOSE stop frontend > /dev/null 2>&1 || true
$COMPOSE stop -t 10 backend > /dev/null 2>&1 || true
ok "Application containers stopped"
detail "Database and Redis remain running (data preserved)"

# Recreate application containers with new images
info "Starting updated containers..."
if ! $COMPOSE up -d >> "$BUILD_LOG" 2>&1; then
  fail "docker compose up -d failed! Check: docker compose logs --tail=50
   Full log: ${BUILD_LOG}"
fi
ok "PostgreSQL 16           ${DIM}(gamehost-db)${NC}"
ok "Redis 7                 ${DIM}(gamehost-redis)${NC}"
ok "Backend — NestJS        ${DIM}(gamehost-backend)${NC}"
ok "Frontend — Next.js      ${DIM}(gamehost-frontend)${NC}"
ok "Nginx — Reverse Proxy   ${DIM}(gamehost-nginx)${NC}"

step_time $SERVICE_START "All services restarted"

section_end

# ─── Database Migrations ─────────────────────────────────
section "Database Migrations"

info "Waiting for PostgreSQL..."

DB_WAIT_START=$(date +%s)
for i in $(seq 1 30); do
  if $COMPOSE exec -T postgres pg_isready -U "${DB_USER_VAL}" >/dev/null 2>&1; then
    step_time $DB_WAIT_START "PostgreSQL is ready"
    break
  fi
  [ "$i" -eq 30 ] && fail "PostgreSQL did not start in time"
  sleep 2
done

MIGRATE_START=$(date +%s)
info "Running Prisma migrate deploy (production-safe)..."

MIGRATE_OUTPUT=$($COMPOSE exec -T backend npx prisma migrate deploy 2>&1) || {
  warn "Migration output:"
  echo "$MIGRATE_OUTPUT" | while IFS= read -r line; do
    detail "  $line"
  done
  fail "Database migration failed! Your database backup is at: ${BACKUP_FILE:-N/A}"
}

# Count applied migrations
APPLIED=$(echo "$MIGRATE_OUTPUT" | grep -c "applied" 2>/dev/null || echo "0")
if [ "$APPLIED" -gt 0 ]; then
  step_time $MIGRATE_START "${APPLIED} migration(s) applied"
else
  step_time $MIGRATE_START "No pending migrations"
fi

section_end

# ─── Health Check ─────────────────────────────────────────
section "Health Check"

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
        ok "Health: ${GREEN}${BOLD}HEALTHY${NC}"
      else
        warn "Health: ${YELLOW}${STATUS}${NC}"
      fi

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
    warn "Backend did not respond within 40s"
    detail "This may be normal on first boot — check logs:"
    detail "  docker compose logs -f backend"
  fi
else
  warn "curl not available — skipping health check"
fi

section_end

# ─── Cleanup ─────────────────────────────────────────────
# Remove temp .env preserve file
rm -f .env.update_preserve

# Prune dangling images from old builds
section "Cleanup"
DANGLING=$(docker images -q --filter "dangling=true" 2>/dev/null | wc -l || echo "0")
if [ "$DANGLING" -gt 0 ]; then
  docker image prune -f > /dev/null 2>&1
  ok "Pruned ${DANGLING} dangling image(s)"
else
  ok "No dangling images to clean"
fi
section_end

# ─── Done ─────────────────────────────────────────────────
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

echo ""
echo -e "${GRAY}   ╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GRAY}   ║${NC}                                                              ${GRAY}║${NC}"
echo -e "${GRAY}   ║${NC}   ${GREEN}${BOLD}✔  Update complete!${NC}                                        ${GRAY}║${NC}"
echo -e "${GRAY}   ║${NC}   ${DIM}Completed in ${ELAPSED_FMT}${NC}                                          ${GRAY}║${NC}"
echo -e "${GRAY}   ║${NC}                                                              ${GRAY}║${NC}"
echo -e "${GRAY}   ╠══════════════════════════════════════════════════════════════╣${NC}"
echo -e "${GRAY}   ║${NC}                                                              ${GRAY}║${NC}"
# Resolve real accessible URLs
resolve_base_url "$FE_PORT" "$BE_PORT"

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

echo -e "${GRAY}   ║${NC}   ${CYAN}Website${NC}      ${FRONTEND_URL}${NC}${GRAY}║${NC}"
echo -e "${GRAY}   ║${NC}   ${CYAN}API${NC}          ${BACKEND_URL}${NC}${GRAY}║${NC}"
echo -e "${GRAY}   ║${NC}   ${CYAN}Health${NC}       ${HEALTH_URL}${NC}${GRAY}║${NC}"
echo -e "${GRAY}   ║${NC}                                                              ${GRAY}║${NC}"
echo -e "${GRAY}   ╠══════════════════════════════════════════════════════════════╣${NC}"
echo -e "${GRAY}   ║${NC}                                                              ${GRAY}║${NC}"
echo -e "${GRAY}   ║${NC}   ${WHITE}${BOLD}Preserved${NC}                                                  ${GRAY}║${NC}"
echo -e "${GRAY}   ║${NC}   ${GREEN}✔${NC} .env configuration (secrets, OAuth, keys)                 ${GRAY}║${NC}"
echo -e "${GRAY}   ║${NC}   ${GREEN}✔${NC} PostgreSQL data (Docker volume: pgdata)                   ${GRAY}║${NC}"
echo -e "${GRAY}   ║${NC}   ${GREEN}✔${NC} Redis data (Docker volume: redisdata)                     ${GRAY}║${NC}"
if [ -n "$BACKUP_FILE" ] && [ -f "$BACKUP_FILE" ]; then
echo -e "${GRAY}   ║${NC}   ${GREEN}✔${NC} Pre-update backup: ${DIM}${BACKUP_FILE}${NC}              ${GRAY}║${NC}"
fi
echo -e "${GRAY}   ║${NC}                                                              ${GRAY}║${NC}"
echo -e "${GRAY}   ║${NC}   ${WHITE}${BOLD}Post-Update Checklist${NC}                                       ${GRAY}║${NC}"
echo -e "${GRAY}   ║${NC}   ${DIM}• If VPS plans changed: Admin → VPS Plans → Sync${NC}           ${GRAY}║${NC}"
echo -e "${GRAY}   ║${NC}   ${DIM}• View logs: docker compose logs -f backend${NC}                 ${GRAY}║${NC}"
echo -e "${GRAY}   ║${NC}                                                              ${GRAY}║${NC}"
echo -e "${GRAY}   ╚══════════════════════════════════════════════════════════════╝${NC}"

# Show OAuth redirect URLs outside box for readability
echo ""
echo -e "${GRAY}   ┌─────────────────────────────────────────────────────────────${NC}"
echo -e "${GRAY}   │${NC}  ${MAGENTA}${BOLD}⚡ Active OAuth Redirect URLs${NC}"
echo -e "${GRAY}   ├─────────────────────────────────────────────────────────────${NC}"
if $GOOGLE_OAUTH_BLOCKED; then
  echo -e "${GRAY}   │${NC}  ${RED}Google${NC}   ${RED}${BOLD}✘ BLOCKED — IP-based URL rejected by Google${NC}"
  echo -e "${GRAY}   │${NC}  ${DIM}         Fix: Point a domain → ${CALLBACK_HOST}, set APP_URL, re-run${NC}"
else
  echo -e "${GRAY}   │${NC}  ${CYAN}Google${NC}   ${WHITE}${BOLD}${GOOGLE_REDIRECT}${NC}"
fi
echo -e "${GRAY}   │${NC}  ${CYAN}Discord${NC}  ${WHITE}${BOLD}${DISCORD_REDIRECT}${NC}"
echo -e "${GRAY}   └─────────────────────────────────────────────────────────────${NC}"

if [ -n "$GIT_PREV_COMMIT" ] && [ "$GIT_PREV_COMMIT" != "unknown" ]; then
  echo ""
  echo -e "   ${DIM}Rollback: git checkout ${GIT_PREV_COMMIT} && bash update.sh --skip-backup${NC}"
fi
echo ""
