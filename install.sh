#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# GameHost Platform — One Command Install
# Usage: bash install.sh
# ============================================================

# ─── Build log (captured so errors are never lost) ────────
BUILD_LOG="/tmp/gamehost-install-$(date +%s).log"

# ─── Global error trap — ensures set -e never dies silently ─
on_error() {
  local exit_code=$? lineno=${BASH_LINENO[0]:-0}
  echo "" >&2
  echo -e "\033[31m\033[1m   ══════════════════════════════════════════════════════════\033[0m" >&2
  echo -e "\033[31m\033[1m    ✘  Install failed unexpectedly  (line ${lineno}, exit ${exit_code})\033[0m" >&2
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
ITALIC='\033[3m'
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
banner() {
  clear 2>/dev/null || true
  echo ""
  echo -e "${CYAN}${BOLD}"
  echo "    ██████╗  █████╗ ███╗   ███╗███████╗██╗  ██╗ ██████╗ ███████╗████████╗"
  echo "   ██╔════╝ ██╔══██╗████╗ ████║██╔════╝██║  ██║██╔═══██╗██╔════╝╚══██╔══╝"
  echo "   ██║  ███╗███████║██╔████╔██║█████╗  ███████║██║   ██║███████╗   ██║   "
  echo "   ██║   ██║██╔══██║██║╚██╔╝██║██╔══╝  ██╔══██║██║   ██║╚════██║   ██║   "
  echo "   ╚██████╔╝██║  ██║██║ ╚═╝ ██║███████╗██║  ██║╚██████╔╝███████║   ██║   "
  echo "    ╚═════╝ ╚═╝  ╚═╝╚═╝     ╚═╝╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚══════╝   ╚═╝   "
  echo -e "${NC}"
  echo -e "${GRAY}   ══════════════════════════════════════════════════════════════════${NC}"
  echo -e "${WHITE}${BOLD}                    Production Installation Script${NC}"
  echo -e "${DIM}${GRAY}                         $(date '+%Y-%m-%d %H:%M:%S %Z')${NC}"
  echo -e "${GRAY}   ══════════════════════════════════════════════════════════════════${NC}"
  echo ""
}

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

# ─── .env Helper: read a value from a key=value file ──────
env_get() {
  local file=$1 key=$2
  grep -E "^${key}=" "$file" 2>/dev/null | head -1 | cut -d'=' -f2-
}

# ─── .env Helper: set a value (insert or update) ─────────
env_set() {
  local file=$1 key=$2 value=$3
  if grep -qE "^${key}=" "$file" 2>/dev/null; then
    sed -i "s|^${key}=.*|${key}=${value}|" "$file"
  else
    echo "${key}=${value}" >> "$file"
  fi
}

# ─── .env Helper: check if value needs auto-config ───────
needs_autoconfig() {
  local value=$1
  # Empty, placeholder, or known weak defaults → need regeneration
  [[ -z "$value" \
    || "$value" == "CHANGE_ME_"* \
    || "$value" == "admin" \
    || "$value" == "password" \
    || "$value" == "secret" \
    || "$value" == "changeme" \
    || "$value" == "gamehost_secret" \
    || "$value" == "gamehost_redis" ]]
}

# ─── Secret Generator ────────────────────────────────────
generate_secret() {
  local length=${1:-64}
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -base64 $(( length * 2 )) | tr -d '\n/+=[:space:]' | head -c "$length"
  else
    cat /dev/urandom | tr -dc 'a-zA-Z0-9' | head -c "$length"
  fi
}

# ─── URL Resolution (Domain → VPS IP → localhost) ────────
# Determines the correct base URL for health checks & display
resolve_base_url() {
  local fe_port=${1:-3000}
  local be_port=${2:-4000}

  # Priority 1: APP_URL from .env (user-configured domain)
  local app_url=$(env_get .env APP_URL 2>/dev/null)
  if [ -n "$app_url" ] && [[ "$app_url" != *"localhost"* ]]; then
    # Strip trailing slash
    BASE_URL="${app_url%/}"
    URL_SOURCE="domain (.env APP_URL)"
    return 0
  fi

  # Priority 2: Detect VPS public IP
  local public_ip=""
  if command -v curl >/dev/null 2>&1; then
    public_ip=$(curl -s --max-time 3 https://api.ipify.org 2>/dev/null || \
                curl -s --max-time 3 https://ifconfig.me 2>/dev/null || \
                curl -s --max-time 3 https://icanhazip.com 2>/dev/null || true)
  fi

  # Validate it looks like an IP
  if [ -n "$public_ip" ] && [[ "$public_ip" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    BASE_URL="http://${public_ip}"
    URL_SOURCE="VPS public IP"
    return 0
  fi

  # Priority 3: Try hostname -I (first non-loopback IP)
  local host_ip=$(hostname -I 2>/dev/null | awk '{print $1}' || true)
  if [ -n "$host_ip" ] && [ "$host_ip" != "127.0.0.1" ]; then
    BASE_URL="http://${host_ip}"
    URL_SOURCE="server IP (hostname)"
    return 0
  fi

  # Priority 4: Fallback to localhost
  BASE_URL="http://localhost"
  URL_SOURCE="localhost (fallback)"
  return 0
}

# ── Pterodactyl Auto-Detection ─────────────────────────────
# Checks common installation paths and Docker containers for
# an existing Pterodactyl panel on the same machine.
# Sets: PTERO_DETECTED (bool), PTERO_PANEL_URL, PTERO_PANEL_PATH, PTERO_DETECT_METHOD

detect_pterodactyl() {
  PTERO_DETECTED=false
  PTERO_PANEL_URL=""
  PTERO_PANEL_PATH=""
  PTERO_DETECT_METHOD=""

  # 1. Check common file-system paths
  local COMMON_PATHS=(
    "/var/www/pterodactyl"
    "/opt/pterodactyl"
    "/srv/pterodactyl"
    "/var/www/pelican"
  )

  for p in "${COMMON_PATHS[@]}"; do
    if [ -f "${p}/.env" ]; then
      local url=$(grep -E '^APP_URL=' "${p}/.env" 2>/dev/null | head -1 | cut -d'=' -f2- | tr -d '"' | tr -d "'" | sed 's/[[:space:]]*$//')
      if [ -n "$url" ]; then
        PTERO_DETECTED=true
        PTERO_PANEL_URL="$url"
        PTERO_PANEL_PATH="$p"
        PTERO_DETECT_METHOD="filesystem (${p}/.env)"
        return 0
      fi
    fi
  done

  # 2. Check running Docker containers (pterodactyl/panel image)
  if command -v docker >/dev/null 2>&1; then
    local container_url=$(docker ps --format '{{.Image}} {{.Ports}}' 2>/dev/null | grep -i 'pterodactyl\|pelican' | head -1 || true)
    if [ -n "$container_url" ]; then
      # Try to extract the panel URL from the container's env
      local cname=$(docker ps --format '{{.Names}} {{.Image}}' 2>/dev/null | grep -i 'pterodactyl\|pelican' | head -1 | awk '{print $1}')
      if [ -n "$cname" ]; then
        local durl=$(docker exec "$cname" printenv APP_URL 2>/dev/null || true)
        if [ -n "$durl" ]; then
          PTERO_DETECTED=true
          PTERO_PANEL_URL="$durl"
          PTERO_PANEL_PATH="(Docker: ${cname})"
          PTERO_DETECT_METHOD="docker container (${cname})"
          return 0
        fi
      fi
      # Even if we can't get URL, mark as detected
      PTERO_DETECTED=true
      PTERO_DETECT_METHOD="docker container (could not read APP_URL)"
      return 0
    fi
  fi

  return 1
}

# ── Pterodactyl API Key Validation ─────────────────────────
# Tests if a Pterodactyl API key is valid by making a request.
# Usage: validate_ptero_key <url> <key> <type>
#   type: "app" for Application API, "client" for Client API
# Returns: 0 if valid, 1 if invalid. Sets PTERO_KEY_STATUS with message.

validate_ptero_key() {
  local url="$1" key="$2" type="$3"
  PTERO_KEY_STATUS=""

  if ! $HAS_CURL; then
    PTERO_KEY_STATUS="skipped (curl not available)"
    return 1
  fi

  if [ -z "$url" ] || [ -z "$key" ]; then
    PTERO_KEY_STATUS="skipped (empty URL or key)"
    return 1
  fi

  # Strip trailing slash from URL
  url="${url%/}"

  local endpoint=""
  if [ "$type" = "app" ]; then
    endpoint="${url}/api/application/servers?per_page=1"
  else
    endpoint="${url}/api/client"
  fi

  local http_code
  http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 \
    -H "Authorization: Bearer ${key}" \
    -H "Accept: application/json" \
    -H "Content-Type: application/json" \
    "$endpoint" 2>/dev/null || echo "000")

  case "$http_code" in
    200)
      PTERO_KEY_STATUS="valid (HTTP 200)"
      return 0
      ;;
    401|403)
      PTERO_KEY_STATUS="invalid key (HTTP ${http_code})"
      return 1
      ;;
    000)
      PTERO_KEY_STATUS="connection failed (is ${url} reachable?)"
      return 1
      ;;
    *)
      PTERO_KEY_STATUS="unexpected response (HTTP ${http_code})"
      return 1
      ;;
  esac
}


# ═══════════════════════════════════════════════════════════
#                        BEGIN INSTALL
# ═══════════════════════════════════════════════════════════

INSTALL_START=$(date +%s)
banner

# ─── System Information ───────────────────────────────────
section "System Information"

OS_NAME=$(. /etc/os-release 2>/dev/null && echo "$PRETTY_NAME" || uname -s)
KERNEL=$(uname -r)
ARCH=$(uname -m)
HOSTNAME_VAL=$(hostname 2>/dev/null || echo "unknown")
TOTAL_RAM=$(free -h 2>/dev/null | awk '/^Mem:/{print $2}' || echo "N/A")
DISK_FREE=$(df -h / 2>/dev/null | awk 'NR==2{print $4}' || echo "N/A")
CPU_CORES=$(nproc 2>/dev/null || sysctl -n hw.ncpu 2>/dev/null || echo "N/A")

info "Hostname       ${BOLD}${HOSTNAME_VAL}${NC}"
detail "OS             ${OS_NAME}"
detail "Kernel         ${KERNEL}"
detail "Architecture   ${ARCH}"
detail "CPU Cores      ${CPU_CORES}"
detail "Total RAM      ${TOTAL_RAM}"
detail "Free Disk      ${DISK_FREE}"
detail "Install Dir    $(pwd)"

section_end

# ─── Pre-flight Checks ───────────────────────────────────
section "Pre-flight Checks"

# Docker
command -v docker >/dev/null 2>&1 || fail "Docker is not installed. Run: curl -fsSL https://get.docker.com | sh"
DOCKER_VER=$(docker --version 2>/dev/null | awk '{print $3}' | tr -d ',')
ok "Docker ${DIM}v${DOCKER_VER}${NC}"

# Docker Compose
command -v docker compose >/dev/null 2>&1 && COMPOSE="docker compose" || {
  command -v docker-compose >/dev/null 2>&1 && COMPOSE="docker-compose" || fail "Docker Compose is not installed."
}
COMPOSE_VER=$($COMPOSE version --short 2>/dev/null || $COMPOSE version 2>/dev/null | awk '{print $NF}')
ok "Docker Compose ${DIM}v${COMPOSE_VER}${NC}"

# OpenSSL
if command -v openssl >/dev/null 2>&1; then
  OPENSSL_VER=$(openssl version 2>/dev/null | awk '{print $2}')
  ok "OpenSSL ${DIM}v${OPENSSL_VER}${NC}"
else
  warn "OpenSSL not found — using /dev/urandom fallback for secrets"
fi

# Git
if command -v git >/dev/null 2>&1; then
  GIT_VER=$(git --version 2>/dev/null | awk '{print $3}')
  ok "Git ${DIM}v${GIT_VER}${NC}"
else
  info "Git not installed ${DIM}(optional)${NC}"
fi

# curl (needed for health check)
if command -v curl >/dev/null 2>&1; then
  CURL_VER=$(curl --version 2>/dev/null | head -1 | awk '{print $2}')
  ok "curl ${DIM}v${CURL_VER}${NC}"
  HAS_CURL=true
else
  warn "curl not found — post-install health check will be skipped"
  HAS_CURL=false
fi

section_end

# ─── Directory Setup ─────────────────────────────────────
section "Directory Setup"

mkdir -p nginx/ssl backups
ok "nginx/ssl"
ok "backups"

section_end

# ═══════════════════════════════════════════════════════════
#              SMART .ENV CONFIGURATION
# ═══════════════════════════════════════════════════════════

section "Environment Configuration"

# Track what we did for the audit summary
declare -a ENV_GENERATED=()
declare -a ENV_UPDATED=()
declare -a ENV_PRESERVED=()
ENV_CREATED_NEW=false

if [ ! -f .env ]; then
  # ── Fresh install: create from template ──────────────────
  ENV_CREATED_NEW=true
  info "No .env found — creating from .env.example"
  cp .env.example .env
  ok "Copied .env.example → .env"
else
  info "Existing .env detected — running smart merge"

  # ── Merge missing keys from .env.example ─────────────────
  ADDED_KEYS=0
  if [ -f .env.example ]; then
    while IFS= read -r line; do
      # Skip comments and blank lines
      [[ "$line" =~ ^#.*$ || -z "$line" ]] && continue
      KEY=$(echo "$line" | cut -d'=' -f1)
      if ! grep -qE "^${KEY}=" .env 2>/dev/null; then
        echo "$line" >> .env
        ADDED_KEYS=$((ADDED_KEYS + 1))
        detail "Added missing key: ${KEY}"
      fi
    done < .env.example
  fi

  if [ "$ADDED_KEYS" -gt 0 ]; then
    ok "Merged ${ADDED_KEYS} new key(s) from .env.example"
  else
    ok "All keys present — no merge needed"
  fi
fi

# ── Auto-configure secrets ─────────────────────────────────
info "Auditing auto-configurable secrets..."
echo -e "${GRAY}   │${NC}"

# --- JWT_SECRET ---
CURRENT_JWT=$(env_get .env JWT_SECRET)
if needs_autoconfig "$CURRENT_JWT"; then
  NEW_JWT=$(generate_secret 64)
  env_set .env JWT_SECRET "$NEW_JWT"
  if $ENV_CREATED_NEW; then
    ENV_GENERATED+=("JWT_SECRET")
  else
    ENV_UPDATED+=("JWT_SECRET")
  fi
  ok "JWT_SECRET             ${GREEN}${BOLD}generated${NC}"
else
  ENV_PRESERVED+=("JWT_SECRET")
  ok "JWT_SECRET             ${DIM}preserved${NC}"
fi

# --- SESSION_SECRET ---
CURRENT_SESSION=$(env_get .env SESSION_SECRET)
if needs_autoconfig "$CURRENT_SESSION"; then
  NEW_SESSION=$(generate_secret 64)
  env_set .env SESSION_SECRET "$NEW_SESSION"
  if $ENV_CREATED_NEW; then
    ENV_GENERATED+=("SESSION_SECRET")
  else
    ENV_UPDATED+=("SESSION_SECRET")
  fi
  ok "SESSION_SECRET         ${GREEN}${BOLD}generated${NC}"
else
  ENV_PRESERVED+=("SESSION_SECRET")
  ok "SESSION_SECRET         ${DIM}preserved${NC}"
fi

# --- DB_PASSWORD ---
CURRENT_DBPW=$(env_get .env DB_PASSWORD)
if needs_autoconfig "$CURRENT_DBPW"; then
  NEW_DBPW=$(generate_secret 32)
  env_set .env DB_PASSWORD "$NEW_DBPW"
  if $ENV_CREATED_NEW; then
    ENV_GENERATED+=("DB_PASSWORD")
  else
    ENV_UPDATED+=("DB_PASSWORD")
  fi
  ok "DB_PASSWORD            ${GREEN}${BOLD}generated${NC}"
else
  NEW_DBPW="$CURRENT_DBPW"
  ENV_PRESERVED+=("DB_PASSWORD")
  ok "DB_PASSWORD            ${DIM}preserved${NC}"
fi

# --- REDIS_PASSWORD ---
CURRENT_REDISPW=$(env_get .env REDIS_PASSWORD)
if needs_autoconfig "$CURRENT_REDISPW"; then
  NEW_REDISPW=$(generate_secret 32)
  env_set .env REDIS_PASSWORD "$NEW_REDISPW"
  if $ENV_CREATED_NEW; then
    ENV_GENERATED+=("REDIS_PASSWORD")
  else
    ENV_UPDATED+=("REDIS_PASSWORD")
  fi
  ok "REDIS_PASSWORD         ${GREEN}${BOLD}generated${NC}"
else
  NEW_REDISPW="$CURRENT_REDISPW"
  ENV_PRESERVED+=("REDIS_PASSWORD")
  ok "REDIS_PASSWORD         ${DIM}preserved${NC}"
fi

# ── Synchronize connection strings ─────────────────────────
echo -e "${GRAY}   │${NC}"
info "Syncing connection strings..."

DB_USER_VAL=$(env_get .env DB_USER)
DB_NAME_VAL=$(env_get .env DB_NAME)
DB_PORT_VAL=$(env_get .env DB_PORT)
REDIS_PORT_VAL=$(env_get .env REDIS_PORT)

DB_USER_VAL=${DB_USER_VAL:-gamehost}
DB_NAME_VAL=${DB_NAME_VAL:-gamehost}
DB_PORT_VAL=${DB_PORT_VAL:-5432}
REDIS_PORT_VAL=${REDIS_PORT_VAL:-6379}

NEW_DB_URL="postgresql://${DB_USER_VAL}:${NEW_DBPW}@postgres:${DB_PORT_VAL}/${DB_NAME_VAL}?schema=public"
NEW_REDIS_URL="redis://:${NEW_REDISPW}@redis:${REDIS_PORT_VAL}"

env_set .env DATABASE_URL "$NEW_DB_URL"
env_set .env REDIS_URL "$NEW_REDIS_URL"
ok "DATABASE_URL synced with DB_PASSWORD"
ok "REDIS_URL synced with REDIS_PASSWORD"

# ── Sync OAuth Redirect URLs & App URLs ────────────────────
echo -e "${GRAY}   │${NC}"
info "Syncing OAuth redirect URLs & app URLs..."

# Resolve base URL early for OAuth callback computation
FE_PORT_EARLY=$(env_get .env FRONTEND_PORT)
BE_PORT_EARLY=$(env_get .env BACKEND_PORT)
FE_PORT_EARLY=${FE_PORT_EARLY:-3000}
BE_PORT_EARLY=${BE_PORT_EARLY:-4000}

resolve_base_url "$FE_PORT_EARLY" "$BE_PORT_EARLY"

# Determine the correct callback base
# Domain (nginx proxied): https://domain.com  → /api/auth/... via nginx
# IP/localhost:           http://ip:4000      → direct backend port
IS_DOMAIN=false
if [[ "$URL_SOURCE" == "domain"* ]]; then
  IS_DOMAIN=true
fi

if $IS_DOMAIN; then
  CALLBACK_BASE="${BASE_URL}"
  RESOLVED_APP_URL="${BASE_URL}"

  # Validate: if APP_URL is https://, warn if nginx SSL is not enabled
  if [[ "$BASE_URL" == https://* ]]; then
    if [ -f nginx/nginx.conf ]; then
      if ! grep -q '^[[:space:]]*listen.*443' nginx/nginx.conf 2>/dev/null; then
        warn "APP_URL uses HTTPS but nginx SSL is not enabled!"
        detail "Either enable SSL in nginx/nginx.conf (uncomment listen 443 + certs)"
        detail "or change APP_URL to http:// if using an external SSL proxy (Cloudflare, etc.)"
        detail "OAuth redirects will fail if HTTPS is not reachable."
      fi
    fi
    # Also validate that SSL cert files exist if using self-managed SSL
    if [ -f nginx/nginx.conf ] && grep -q 'ssl_certificate' nginx/nginx.conf 2>/dev/null; then
      if [ ! -f nginx/ssl/fullchain.pem ] || [ ! -f nginx/ssl/privkey.pem ]; then
        warn "SSL certificate files not found in nginx/ssl/"
        detail "Expected: nginx/ssl/fullchain.pem and nginx/ssl/privkey.pem"
      fi
    fi
  fi
else
  CALLBACK_BASE="${BASE_URL}:${BE_PORT_EARLY}"
  RESOLVED_APP_URL="${BASE_URL}:${FE_PORT_EARLY}"
fi

# Construct OAuth redirect URLs
GOOGLE_REDIRECT="${CALLBACK_BASE}/api/auth/google/callback"
DISCORD_REDIRECT="${CALLBACK_BASE}/api/auth/discord/callback"

# Detect if callback base is an IP address (no domain)
# Google Cloud Console REJECTS IP-based redirect URIs (must be a real domain)
# Discord allows IPs, so only Google is affected
CALLBACK_HOST=$(echo "$CALLBACK_BASE" | sed -E 's|^https?://||' | cut -d: -f1)
IS_IP_BASED=false
if [[ "$CALLBACK_HOST" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  IS_IP_BASED=true
fi

GOOGLE_OAUTH_BLOCKED=false
if $IS_IP_BASED; then
  GOOGLE_OAUTH_BLOCKED=true
  echo -e "${GRAY}   │${NC}"
  warn "${RED}${BOLD}Google OAuth will NOT work with IP-based redirect URLs!${NC}"
  detail "Google Cloud Console requires a real domain (e.g. https://gamehost.example.com)"
  detail "Detected callback host: ${CALLBACK_HOST} (raw IP address)"
  detail ""
  detail "${WHITE}${BOLD}To fix this:${NC}"
  detail "  1. Point a domain to this VPS IP (${CALLBACK_HOST})"
  detail "     e.g. A record: gamehost.example.com → ${CALLBACK_HOST}"
  detail "  2. Set APP_URL in .env to your domain:"
  detail "     APP_URL=https://gamehost.example.com"
  detail "  3. Re-run: ${BOLD}bash install.sh${NC} ${DIM}or${NC} ${BOLD}bash restart.sh${NC}"
  detail ""
  detail "${CYAN}Discord OAuth works fine with IP addresses — only Google is affected.${NC}"
fi

# --- APP_URL ---
CURRENT_APP_URL=$(env_get .env APP_URL)
if [[ -z "$CURRENT_APP_URL" || "$CURRENT_APP_URL" == "http://localhost"* ]]; then
  env_set .env APP_URL "$RESOLVED_APP_URL"
  ok "APP_URL                ${GREEN}${BOLD}synced${NC} → ${RESOLVED_APP_URL}"
else
  ok "APP_URL                ${DIM}preserved${NC} → ${CURRENT_APP_URL}"
fi

# --- BACKEND_URL ---
if $IS_DOMAIN; then
  # Domain mode: backend is behind nginx, so BACKEND_URL = domain (no port)
  env_set .env BACKEND_URL "$CALLBACK_BASE"
  ok "BACKEND_URL            ${GREEN}${BOLD}synced${NC} → ${CALLBACK_BASE} ${DIM}(nginx proxied)${NC}"
else
  env_set .env BACKEND_URL "$CALLBACK_BASE"
  ok "BACKEND_URL            ${GREEN}${BOLD}synced${NC} → ${CALLBACK_BASE}"
fi

# --- NEXT_PUBLIC_API_URL ---
if $IS_DOMAIN; then
  env_set .env NEXT_PUBLIC_API_URL ""
  ok "NEXT_PUBLIC_API_URL    ${DIM}empty (nginx proxied)${NC}"
else
  env_set .env NEXT_PUBLIC_API_URL "${CALLBACK_BASE}"
  ok "NEXT_PUBLIC_API_URL    ${GREEN}${BOLD}synced${NC} → ${CALLBACK_BASE}"
fi

# --- GOOGLE_CALLBACK_URL ---
CURRENT_GOOGLE_CB=$(env_get .env GOOGLE_CALLBACK_URL)
if [[ "$CURRENT_GOOGLE_CB" != "$GOOGLE_REDIRECT" ]]; then
  env_set .env GOOGLE_CALLBACK_URL "$GOOGLE_REDIRECT"
  if [[ -n "$CURRENT_GOOGLE_CB" && "$CURRENT_GOOGLE_CB" != "http://localhost:4000/api/auth/google/callback" ]]; then
    ENV_UPDATED+=("GOOGLE_CALLBACK_URL")
  else
    ENV_GENERATED+=("GOOGLE_CALLBACK_URL")
  fi
  ok "GOOGLE_CALLBACK_URL    ${GREEN}${BOLD}synced${NC}"
else
  ENV_PRESERVED+=("GOOGLE_CALLBACK_URL")
  ok "GOOGLE_CALLBACK_URL    ${DIM}preserved${NC}"
fi

# --- DISCORD_CALLBACK_URL ---
CURRENT_DISCORD_CB=$(env_get .env DISCORD_CALLBACK_URL)
if [[ "$CURRENT_DISCORD_CB" != "$DISCORD_REDIRECT" ]]; then
  env_set .env DISCORD_CALLBACK_URL "$DISCORD_REDIRECT"
  if [[ -n "$CURRENT_DISCORD_CB" && "$CURRENT_DISCORD_CB" != "http://localhost:4000/api/auth/discord/callback" ]]; then
    ENV_UPDATED+=("DISCORD_CALLBACK_URL")
  else
    ENV_GENERATED+=("DISCORD_CALLBACK_URL")
  fi
  ok "DISCORD_CALLBACK_URL   ${GREEN}${BOLD}synced${NC}"
else
  ENV_PRESERVED+=("DISCORD_CALLBACK_URL")
  ok "DISCORD_CALLBACK_URL   ${DIM}preserved${NC}"
fi

# --- Display OAuth Redirect URLs prominently ---
echo -e "${GRAY}   │${NC}"
echo -e "${GRAY}   │${NC}  ${MAGENTA}${BOLD}── OAuth Redirect URLs ──${NC}"
echo -e "${GRAY}   │${NC}  ${DIM}Configure these in your OAuth provider dashboards:${NC}"
echo -e "${GRAY}   │${NC}"
if $GOOGLE_OAUTH_BLOCKED; then
  echo -e "${GRAY}   │${NC}  ${RED}Google${NC}   ${RED}${BOLD}✘ BLOCKED — ${GOOGLE_REDIRECT}${NC}"
  echo -e "${GRAY}   │${NC}  ${RED}         ⚠ Google rejects IP-based redirect URIs${NC}"
  echo -e "${GRAY}   │${NC}  ${RED}         → You MUST point a domain to this server first${NC}"
  echo -e "${GRAY}   │${NC}  ${DIM}         → Then set APP_URL=https://yourdomain.com in .env${NC}"
else
  echo -e "${GRAY}   │${NC}  ${CYAN}Google${NC}   ${WHITE}${BOLD}${GOOGLE_REDIRECT}${NC}"
  echo -e "${GRAY}   │${NC}  ${DIM}         → https://console.cloud.google.com/apis/credentials${NC}"
  echo -e "${GRAY}   │${NC}  ${DIM}         → Authorized redirect URIs → Add URI → paste above URL${NC}"
fi
echo -e "${GRAY}   │${NC}"
echo -e "${GRAY}   │${NC}  ${CYAN}Discord${NC}  ${WHITE}${BOLD}${DISCORD_REDIRECT}${NC}"
echo -e "${GRAY}   │${NC}  ${DIM}         → https://discord.com/developers/applications${NC}"
echo -e "${GRAY}   │${NC}  ${DIM}         → OAuth2 → Redirects → Add Redirect → paste above URL${NC}"
echo -e "${GRAY}   │${NC}"

# --- SMTP / Email Login Info ---
SMTP_HOST_VAL=$(env_get .env "SMTP_HOST")
if [[ -n "$SMTP_HOST_VAL" ]]; then
  echo -e "${GRAY}   │${NC}  ${MAGENTA}${BOLD}── Email / SMTP ──${NC}"
  echo -e "${GRAY}   │${NC}  ${GREEN}SMTP configured${NC}  ${DIM}(host: ${SMTP_HOST_VAL})${NC}"
  echo -e "${GRAY}   │${NC}  ${DIM}Email login/signup with verification enabled${NC}"
  echo -e "${GRAY}   │${NC}"
else
  echo -e "${GRAY}   │${NC}  ${MAGENTA}${BOLD}── Email / SMTP ──${NC}"
  echo -e "${GRAY}   │${NC}  ${YELLOW}SMTP not configured${NC}  ${DIM}(email login will log to console)${NC}"
  echo -e "${GRAY}   │${NC}  ${DIM}To enable email verification, set in .env:${NC}"
  echo -e "${GRAY}   │${NC}  ${DIM}  SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM${NC}"
  echo -e "${GRAY}   │${NC}"
fi

# ── Pterodactyl Panel Auto-Detection ───────────────────────
echo -e "${GRAY}   │${NC}"
echo -e "${GRAY}   │${NC}  ${MAGENTA}${BOLD}── Pterodactyl Panel ──${NC}"

detect_pterodactyl || true

CURRENT_PTERO_URL=$(env_get .env PTERODACTYL_URL)
CURRENT_PTERO_APP_KEY=$(env_get .env PTERODACTYL_APP_KEY)
CURRENT_PTERO_CLIENT_KEY=$(env_get .env PTERODACTYL_CLIENT_KEY)

if $PTERO_DETECTED; then
  echo -e "${GRAY}   │${NC}  ${GREEN}${BOLD}✔ Pterodactyl panel detected!${NC}"
  echo -e "${GRAY}   │${NC}  ${DIM}Found via: ${PTERO_DETECT_METHOD}${NC}"

  # Auto-fill PTERODACTYL_URL if empty/default
  if [[ -z "$CURRENT_PTERO_URL" || "$CURRENT_PTERO_URL" == "http://localhost"* || "$CURRENT_PTERO_URL" == "https://panel.example.com" ]] && [ -n "$PTERO_PANEL_URL" ]; then
    env_set .env PTERODACTYL_URL "$PTERO_PANEL_URL"
    CURRENT_PTERO_URL="$PTERO_PANEL_URL"
    ok "PTERODACTYL_URL        ${GREEN}${BOLD}auto-filled${NC} → ${PTERO_PANEL_URL}"
    ENV_UPDATED+=("PTERODACTYL_URL")
  elif [ -n "$CURRENT_PTERO_URL" ]; then
    ok "PTERODACTYL_URL        ${DIM}preserved${NC} → ${CURRENT_PTERO_URL}"
  fi
else
  echo -e "${GRAY}   │${NC}  ${DIM}No local Pterodactyl panel detected${NC}"
  echo -e "${GRAY}   │${NC}  ${DIM}(Checked: /var/www/pterodactyl, /opt/pterodactyl, /srv/pterodactyl, Docker)${NC}"
  if [ -n "$CURRENT_PTERO_URL" ]; then
    ok "PTERODACTYL_URL        ${DIM}preserved${NC} → ${CURRENT_PTERO_URL}"
  else
    echo -e "${GRAY}   │${NC}  ${YELLOW}Set PTERODACTYL_URL in .env to your panel URL${NC}"
  fi
fi

# Show direct links to create API keys
if [ -n "$CURRENT_PTERO_URL" ]; then
  PTERO_URL_CLEAN="${CURRENT_PTERO_URL%/}"
  echo -e "${GRAY}   │${NC}"
  echo -e "${GRAY}   │${NC}  ${DIM}Create API keys here (2 clicks each):${NC}"
  echo -e "${GRAY}   │${NC}  ${CYAN}Application Key${NC}  ${WHITE}${BOLD}${PTERO_URL_CLEAN}/admin/api${NC}"
  echo -e "${GRAY}   │${NC}  ${DIM}                 → New Application API Key → Permissions: all Read & Write → Create${NC}"
  echo -e "${GRAY}   │${NC}  ${CYAN}Client Key${NC}       ${WHITE}${BOLD}${PTERO_URL_CLEAN}/account/api${NC}"
  echo -e "${GRAY}   │${NC}  ${DIM}                 → Create API Key → any description → Create${NC}"
fi

# Validate existing API keys
if $HAS_CURL && [ -n "$CURRENT_PTERO_URL" ]; then
  echo -e "${GRAY}   │${NC}"

  if [ -n "$CURRENT_PTERO_APP_KEY" ]; then
    echo -en "${GRAY}   │${NC}  ${DIM}Validating Application Key...${NC}\r"
    if validate_ptero_key "$CURRENT_PTERO_URL" "$CURRENT_PTERO_APP_KEY" "app"; then
      echo -e "${GRAY}   │${NC}  ${GREEN}✔ Application Key     ${GREEN}${BOLD}${PTERO_KEY_STATUS}${NC}          "
    else
      echo -e "${GRAY}   │${NC}  ${RED}✘ Application Key     ${RED}${BOLD}${PTERO_KEY_STATUS}${NC}          "
      echo -e "${GRAY}   │${NC}  ${DIM}  Fix: ${PTERO_URL_CLEAN}/admin/api → Create new key → paste into .env${NC}"
    fi
  else
    echo -e "${GRAY}   │${NC}  ${YELLOW}⚠ Application Key     ${YELLOW}not set${NC}"
    echo -e "${GRAY}   │${NC}  ${DIM}  Set PTERODACTYL_APP_KEY in .env${NC}"
  fi

  if [ -n "$CURRENT_PTERO_CLIENT_KEY" ]; then
    echo -en "${GRAY}   │${NC}  ${DIM}Validating Client Key...${NC}\r"
    if validate_ptero_key "$CURRENT_PTERO_URL" "$CURRENT_PTERO_CLIENT_KEY" "client"; then
      echo -e "${GRAY}   │${NC}  ${GREEN}✔ Client Key          ${GREEN}${BOLD}${PTERO_KEY_STATUS}${NC}          "
    else
      echo -e "${GRAY}   │${NC}  ${RED}✘ Client Key          ${RED}${BOLD}${PTERO_KEY_STATUS}${NC}          "
      echo -e "${GRAY}   │${NC}  ${DIM}  Fix: ${PTERO_URL_CLEAN}/account/api → Create new key → paste into .env${NC}"
    fi
  else
    echo -e "${GRAY}   │${NC}  ${YELLOW}⚠ Client Key          ${YELLOW}not set${NC}"
    echo -e "${GRAY}   │${NC}  ${DIM}  Set PTERODACTYL_CLIENT_KEY in .env${NC}"
  fi
fi

echo -e "${GRAY}   │${NC}"

# ── Audit Summary ──────────────────────────────────────────
echo -e "${GRAY}   │${NC}"
echo -e "${GRAY}   │${NC}  ${MAGENTA}${BOLD}── Secret Audit Summary ──${NC}"

if [ ${#ENV_GENERATED[@]} -gt 0 ]; then
  echo -e "${GRAY}   │${NC}  ${GREEN}⬤${NC}  Generated:  ${WHITE}${ENV_GENERATED[*]}${NC}"
fi
if [ ${#ENV_UPDATED[@]} -gt 0 ]; then
  echo -e "${GRAY}   │${NC}  ${YELLOW}⬤${NC}  Updated:    ${WHITE}${ENV_UPDATED[*]}${NC}"
fi
if [ ${#ENV_PRESERVED[@]} -gt 0 ]; then
  echo -e "${GRAY}   │${NC}  ${BLUE}⬤${NC}  Preserved:  ${WHITE}${ENV_PRESERVED[*]}${NC}"
fi

section_end

# ═══════════════════════════════════════════════════════════
#                   BUILD & DEPLOY
# ═══════════════════════════════════════════════════════════

# ─── Build ────────────────────────────────────────────────
section "Building Containers"
info "Building all Docker images (this may take a few minutes)..."
detail "Build log: ${BUILD_LOG}"

BUILD_START=$(date +%s)

$COMPOSE build --no-cache >> "$BUILD_LOG" 2>&1 &
BUILD_PID=$!
spinner $BUILD_PID "Building images"

if ! wait $BUILD_PID; then
  echo ""
  fail "Docker build failed! Last 25 lines of output:

$(tail -25 "$BUILD_LOG" | sed 's/^/         /')

   Full log: ${BUILD_LOG}
   Re-run with:  docker compose build --no-cache 2>&1 | tee build.log"
fi

step_time $BUILD_START "All images built successfully"

section_end

# ─── Start Services ──────────────────────────────────────
section "Starting Services"

SERVICE_START=$(date +%s)

if ! $COMPOSE up -d >> "$BUILD_LOG" 2>&1; then
  fail "docker compose up -d failed! Check: docker compose logs --tail=50

   Full log: ${BUILD_LOG}"
fi
ok "PostgreSQL 16           ${DIM}(gamehost-db)${NC}"
ok "Redis 7                 ${DIM}(gamehost-redis)${NC}"
ok "Backend — NestJS        ${DIM}(gamehost-backend)${NC}"
ok "Frontend — Next.js      ${DIM}(gamehost-frontend)${NC}"
ok "Nginx — Reverse Proxy   ${DIM}(gamehost-nginx)${NC}"

step_time $SERVICE_START "All services started"

section_end

# ─── Database ─────────────────────────────────────────────
section "Database Initialization"

info "Waiting for PostgreSQL to accept connections..."

DB_WAIT_START=$(date +%s)
for i in $(seq 1 30); do
  if $COMPOSE exec -T postgres pg_isready -U "${DB_USER_VAL}" >/dev/null 2>&1; then
    step_time $DB_WAIT_START "PostgreSQL is ready"
    break
  fi
  [ "$i" -eq 30 ] && fail "PostgreSQL did not start within 60 seconds"
  sleep 2
done

# Migrations
MIGRATE_START=$(date +%s)
info "Running Prisma migrations..."
if ! $COMPOSE exec -T backend npx prisma migrate deploy >> "$BUILD_LOG" 2>&1; then
  warn "Prisma migration failed — this may be OK on first run"
  detail "The backend entrypoint also runs migrations on start."
  detail "Check: docker compose logs backend | grep -i 'prisma\\|migrate'"
  detail "Full log: ${BUILD_LOG}"
else
  step_time $MIGRATE_START "Migrations applied"
fi

section_end

# ═══════════════════════════════════════════════════════════
#                   URL RESOLUTION
# ═══════════════════════════════════════════════════════════

section "Resolving Access URL"

FE_PORT=$(env_get .env FRONTEND_PORT)
BE_PORT=$(env_get .env BACKEND_PORT)
FE_PORT=${FE_PORT:-3000}
BE_PORT=${BE_PORT:-4000}

resolve_base_url "$FE_PORT" "$BE_PORT"
ok "Resolved via ${BOLD}${URL_SOURCE}${NC}"
detail "Base URL: ${BASE_URL}"

# Build access URLs
# If domain (nginx proxied), use clean URLs without ports
# If IP/localhost, append ports
if [[ "$URL_SOURCE" == "domain"* ]]; then
  FRONTEND_URL="${BASE_URL}"
  BACKEND_URL="${BASE_URL}/api"
  HEALTH_URL="${BASE_URL}/api/health"
  HEALTH_INTERNAL="http://localhost:${BE_PORT}/api/health"
else
  FRONTEND_URL="${BASE_URL}:${FE_PORT}"
  BACKEND_URL="${BASE_URL}:${BE_PORT}"
  HEALTH_URL="${BASE_URL}:${BE_PORT}/api/health"
  HEALTH_INTERNAL="http://localhost:${BE_PORT}/api/health"
fi

detail "Frontend:  ${FRONTEND_URL}"
detail "Backend:   ${BACKEND_URL}"
detail "Health:    ${HEALTH_URL}"

section_end

# ═══════════════════════════════════════════════════════════
#                   HEALTH CHECK
# ═══════════════════════════════════════════════════════════

if $HAS_CURL; then

section "Service Health Check"

info "Waiting for backend API to become ready..."

HEALTH_OK=false
HEALTH_BODY=""

# Try internal (localhost) first — always reachable from the server itself
# Then fall back to external URL if internal fails
HEALTH_ENDPOINTS=("$HEALTH_INTERNAL")
if [ "$HEALTH_INTERNAL" != "$HEALTH_URL" ]; then
  HEALTH_ENDPOINTS+=("$HEALTH_URL")
fi

for attempt in $(seq 1 15); do
  for endpoint in "${HEALTH_ENDPOINTS[@]}"; do
    HEALTH_BODY=$(curl -s --max-time 5 "$endpoint" 2>/dev/null || true)
    if [ -n "$HEALTH_BODY" ]; then
      STATUS=$(echo "$HEALTH_BODY" | grep -oP '"status"\s*:\s*"[^"]*"' | head -1 | grep -oP '"[^"]*"$' | tr -d '"' || true)
      if [ -n "$STATUS" ]; then
        HEALTH_OK=true
        HEALTH_HIT_URL="$endpoint"
        break 2
      fi
    fi
  done

  if (( attempt % 3 == 0 )); then
    detail "Attempt ${attempt}/15 — backend still starting up..."
  fi
  sleep 2
done

echo -e "${GRAY}   │${NC}"

if $HEALTH_OK; then
  if [[ "$STATUS" == "ok" || "$STATUS" == "healthy" ]]; then
    ok "API Health            ${GREEN}${BOLD}HEALTHY${NC}"
  else
    warn "API Health            ${YELLOW}${BOLD}${STATUS}${NC}"
  fi
  detail "Checked via: ${HEALTH_HIT_URL}"

  # Parse database status
  DB_STATUS=$(echo "$HEALTH_BODY" | grep -oP '"database"\s*:\s*\{[^}]*"status"\s*:\s*"([^"]*)"' | grep -oP '"[^"]*"$' | tr -d '"' 2>/dev/null || true)
  if [ -z "$DB_STATUS" ]; then
    DB_STATUS=$(echo "$HEALTH_BODY" | grep -oP '"db"\s*:\s*\{[^}]*"status"\s*:\s*"([^"]*)"' | grep -oP '"[^"]*"$' | tr -d '"' 2>/dev/null || true)
  fi
  if [ -n "$DB_STATUS" ]; then
    if [[ "$DB_STATUS" == "up" || "$DB_STATUS" == "ok" || "$DB_STATUS" == "healthy" ]]; then
      ok "  └─ Database         ${GREEN}UP${NC}"
    else
      warn "  └─ Database         ${RED}${DB_STATUS}${NC}"
    fi
  fi

  # Parse redis status
  REDIS_STATUS=$(echo "$HEALTH_BODY" | grep -oP '"redis"\s*:\s*\{[^}]*"status"\s*:\s*"([^"]*)"' | grep -oP '"[^"]*"$' | tr -d '"' 2>/dev/null || true)
  if [ -z "$REDIS_STATUS" ]; then
    REDIS_STATUS=$(echo "$HEALTH_BODY" | grep -oP '"memory"\s*:\s*\{[^}]*"status"\s*:\s*"([^"]*)"' | grep -oP '"[^"]*"$' | tr -d '"' 2>/dev/null || true)
  fi
  if [ -n "$REDIS_STATUS" ]; then
    if [[ "$REDIS_STATUS" == "up" || "$REDIS_STATUS" == "ok" || "$REDIS_STATUS" == "healthy" ]]; then
      ok "  └─ Redis            ${GREEN}UP${NC}"
    else
      warn "  └─ Redis            ${RED}${REDIS_STATUS}${NC}"
    fi
  fi

  # Response time
  RESP_TIME=$(curl -s -o /dev/null -w "%{time_total}" --max-time 5 "$HEALTH_HIT_URL" 2>/dev/null || echo "N/A")
  if [ "$RESP_TIME" != "N/A" ]; then
    RESP_MS=$(echo "$RESP_TIME" | awk '{printf "%.0f", $1 * 1000}')
    ok "  └─ Response Time    ${DIM}${RESP_MS}ms${NC}"
  fi

else
  warn "Backend did not respond within 30 seconds"
  detail "This may be normal on first boot — the backend needs time to compile."
  detail "Check logs with: docker compose logs -f backend"
  detail "Health endpoint: ${HEALTH_URL}"
fi

section_end

fi  # end HAS_CURL

# ═══════════════════════════════════════════════════════════
#                 CONFIGURATION REPORT
# ═══════════════════════════════════════════════════════════

section "Configuration Report"

info "Ports"
detail "Frontend:   ${FE_PORT}"
detail "Backend:    ${BE_PORT}"
detail "Nginx:      80 / 443"
detail "PostgreSQL: ${DB_PORT_VAL}"
detail "Redis:      ${REDIS_PORT_VAL}"

echo -e "${GRAY}   │${NC}"

# Check enabled integrations
info "Integrations"
check_enabled() {
  local key=$1 label=$2
  local val=$(env_get .env "$key")
  if [[ "$val" == "true" ]]; then
    ok "${label}  ${GREEN}enabled${NC}"
  else
    detail "${label}  ${DIM}disabled${NC}"
  fi
}
check_enabled "RAZORPAY_ENABLED"   "Razorpay        "
check_enabled "CASHFREE_ENABLED"   "Cashfree        "
check_enabled "UPI_ENABLED"        "UPI Manual      "
check_enabled "DATALIX_ENABLED"    "Datalix VPS     "
check_enabled "CLOUDFLARE_ENABLED" "Cloudflare DNS  "
check_enabled "PAYMENTER_ENABLED"  "Paymenter       "

echo -e "${GRAY}   │${NC}"

# Check for missing important config
info "Attention Required"
ATTENTION_COUNT=0

warn_if_empty() {
  local key=$1 label=$2
  local val=$(env_get .env "$key")
  if [[ -z "$val" ]]; then
    warn "${label} not configured"
    ATTENTION_COUNT=$((ATTENTION_COUNT + 1))
  fi
}

warn_if_empty "GOOGLE_CLIENT_ID"      "Google OAuth"
warn_if_empty "DISCORD_CLIENT_ID"     "Discord OAuth"
warn_if_empty "PTERODACTYL_URL"       "Pterodactyl Panel URL"
warn_if_empty "PTERODACTYL_APP_KEY"   "Pterodactyl App Key"
warn_if_empty "PTERODACTYL_CLIENT_KEY" "Pterodactyl Client Key"
warn_if_empty "DISCORD_BOT_TOKEN"     "Discord Bot Token"
warn_if_empty "SMTP_HOST"             "SMTP Email (email login)"

if [ "$ATTENTION_COUNT" -eq 0 ]; then
  ok "All important keys are configured"
fi

section_end

# ═══════════════════════════════════════════════════════════
#                    INSTALL COMPLETE
# ═══════════════════════════════════════════════════════════

INSTALL_END=$(date +%s)
TOTAL_ELAPSED=$(( INSTALL_END - INSTALL_START ))

# Format elapsed time
if [ "$TOTAL_ELAPSED" -ge 60 ]; then
  ELAPSED_FMT="$(( TOTAL_ELAPSED / 60 ))m $(( TOTAL_ELAPSED % 60 ))s"
else
  ELAPSED_FMT="${TOTAL_ELAPSED}s"
fi

echo ""
echo -e "${GRAY}   ╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GRAY}   ║${NC}                                                              ${GRAY}║${NC}"
echo -e "${GRAY}   ║${NC}   ${GREEN}${BOLD}✔  GameHost Platform is running!${NC}                            ${GRAY}║${NC}"
echo -e "${GRAY}   ║${NC}   ${DIM}Installed in ${ELAPSED_FMT} · via ${URL_SOURCE}${NC}${GRAY}║${NC}"
echo -e "${GRAY}   ║${NC}                                                              ${GRAY}║${NC}"
echo -e "${GRAY}   ╠══════════════════════════════════════════════════════════════╣${NC}"
echo -e "${GRAY}   ║${NC}                                                              ${GRAY}║${NC}"
echo -e "${GRAY}   ║${NC}   ${WHITE}${BOLD}Access Points${NC}                                               ${GRAY}║${NC}"
echo -e "${GRAY}   ║${NC}   ${CYAN}Frontend${NC}     ${FRONTEND_URL}${GRAY}║${NC}"
echo -e "${GRAY}   ║${NC}   ${CYAN}Backend${NC}      ${BACKEND_URL}${GRAY}║${NC}"
echo -e "${GRAY}   ║${NC}   ${CYAN}Health${NC}       ${HEALTH_URL}${GRAY}║${NC}"
echo -e "${GRAY}   ║${NC}                                                              ${GRAY}║${NC}"
echo -e "${GRAY}   ╠══════════════════════════════════════════════════════════════╣${NC}"
echo -e "${GRAY}   ║${NC}                                                              ${GRAY}║${NC}"
echo -e "${GRAY}   ║${NC}   ${WHITE}${BOLD}Next Steps${NC}                                                  ${GRAY}║${NC}"
echo -e "${GRAY}   ║${NC}   ${DIM}1. Configure OAuth secrets in .env (client IDs/secrets)${NC}    ${GRAY}║${NC}"
if [ -n "$CURRENT_PTERO_URL" ] && [ -n "$CURRENT_PTERO_APP_KEY" ] && [ -n "$CURRENT_PTERO_CLIENT_KEY" ]; then
echo -e "${GRAY}   ║${NC}   ${GREEN}2. Pterodactyl keys — configured ✔${NC}                        ${GRAY}║${NC}"
else
  PTERO_URL_HINT="${CURRENT_PTERO_URL:-your-panel-url}"
echo -e "${GRAY}   ║${NC}   ${YELLOW}2. Create Pterodactyl API keys:${NC}                            ${GRAY}║${NC}"
echo -e "${GRAY}   ║${NC}   ${DIM}   App key:    ${PTERO_URL_HINT}/admin/api${NC}${GRAY}║${NC}"
echo -e "${GRAY}   ║${NC}   ${DIM}   Client key: ${PTERO_URL_HINT}/account/api${NC}${GRAY}║${NC}"
fi
echo -e "${GRAY}   ║${NC}   ${DIM}3. Configure SMTP in .env for email login (optional)${NC}       ${GRAY}║${NC}"
echo -e "${GRAY}   ║${NC}   ${DIM}4. If VPS reselling: sync plans in Admin → VPS Plans${NC}       ${GRAY}║${NC}"
echo -e "${GRAY}   ║${NC}   ${DIM}5. Restart: bash restart.sh${NC}                                ${GRAY}║${NC}"
echo -e "${GRAY}   ║${NC}   ${DIM}6. View logs: docker compose logs -f backend${NC}               ${GRAY}║${NC}"
echo -e "${GRAY}   ║${NC}                                                              ${GRAY}║${NC}"
echo -e "${GRAY}   ╚══════════════════════════════════════════════════════════════╝${NC}"

# ── OAuth URLs Quick Reference (outside box for readability) ─
echo ""
echo -e "${GRAY}   ┌─────────────────────────────────────────────────────────────${NC}"
echo -e "${GRAY}   │${NC}  ${MAGENTA}${BOLD}⚡ OAuth Redirect URLs — Add these to your provider dashboards${NC}"
echo -e "${GRAY}   ├─────────────────────────────────────────────────────────────${NC}"
echo -e "${GRAY}   │${NC}"
if $GOOGLE_OAUTH_BLOCKED; then
  echo -e "${GRAY}   │${NC}  ${RED}${BOLD}⚠ Google OAuth — DOMAIN REQUIRED${NC}"
  echo -e "${GRAY}   │${NC}  ${RED}  Cannot use IP address (${CALLBACK_HOST}) as redirect URI${NC}"
  echo -e "${GRAY}   │${NC}  ${WHITE}  Fix: Point a domain → ${CALLBACK_HOST}, set APP_URL, re-install${NC}"
else
  echo -e "${GRAY}   │${NC}  ${CYAN}Google Console${NC}  ${DIM}(https://console.cloud.google.com/apis/credentials)${NC}"
  echo -e "${GRAY}   │${NC}  ${WHITE}${BOLD}→ ${GOOGLE_REDIRECT}${NC}"
fi
echo -e "${GRAY}   │${NC}"
echo -e "${GRAY}   │${NC}  ${CYAN}Discord Portal${NC}  ${DIM}(https://discord.com/developers/applications)${NC}"
echo -e "${GRAY}   │${NC}  ${WHITE}${BOLD}→ ${DISCORD_REDIRECT}${NC}"
echo -e "${GRAY}   │${NC}"
echo -e "${GRAY}   └─────────────────────────────────────────────────────────────${NC}"

# ── Pterodactyl Quick Reference ──────────────────────────
if [ -n "$CURRENT_PTERO_URL" ]; then
  PTERO_URL_CLEAN="${CURRENT_PTERO_URL%/}"
  echo ""
  echo -e "${GRAY}   ┌─────────────────────────────────────────────────────────────${NC}"
  echo -e "${GRAY}   │${NC}  ${MAGENTA}${BOLD}🎮 Pterodactyl Panel — API Key Setup${NC}"
  echo -e "${GRAY}   ├─────────────────────────────────────────────────────────────${NC}"
  echo -e "${GRAY}   │${NC}"
  echo -e "${GRAY}   │${NC}  ${CYAN}Panel URL${NC}        ${WHITE}${BOLD}${PTERO_URL_CLEAN}${NC}"
  if $PTERO_DETECTED; then
    echo -e "${GRAY}   │${NC}  ${GREEN}Detected via${NC}     ${DIM}${PTERO_DETECT_METHOD}${NC}"
  fi
  echo -e "${GRAY}   │${NC}"
  echo -e "${GRAY}   │${NC}  ${CYAN}Application Key${NC}  ${WHITE}${BOLD}${PTERO_URL_CLEAN}/admin/api${NC}"
  echo -e "${GRAY}   │${NC}  ${DIM}  → Click \"New Application API Key\"${NC}"
  echo -e "${GRAY}   │${NC}  ${DIM}  → Set all permissions to Read & Write → Create${NC}"
  echo -e "${GRAY}   │${NC}  ${DIM}  → Copy the key → paste as PTERODACTYL_APP_KEY in .env${NC}"
  echo -e "${GRAY}   │${NC}"
  echo -e "${GRAY}   │${NC}  ${CYAN}Client API Key${NC}   ${WHITE}${BOLD}${PTERO_URL_CLEAN}/account/api${NC}"
  echo -e "${GRAY}   │${NC}  ${DIM}  → Click \"Create API Key\"${NC}"
  echo -e "${GRAY}   │${NC}  ${DIM}  → Description: anything → Create${NC}"
  echo -e "${GRAY}   │${NC}  ${DIM}  → Copy the key → paste as PTERODACTYL_CLIENT_KEY in .env${NC}"
  echo -e "${GRAY}   │${NC}"
  echo -e "${GRAY}   │${NC}  ${DIM}After adding keys, run: ${BOLD}bash restart.sh${NC}"
  echo -e "${GRAY}   │${NC}"
  echo -e "${GRAY}   └─────────────────────────────────────────────────────────────${NC}"
fi

echo ""
