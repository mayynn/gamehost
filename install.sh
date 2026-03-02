#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# GameHost Platform — One Command Install
# Usage: bash install.sh
# ============================================================

# ─── Colors ────────────────────────────────────────────────
BOLD='\033[1m'
DIM='\033[2m'
CYAN='\033[36m'
GREEN='\033[32m'
YELLOW='\033[33m'
RED='\033[31m'
BLUE='\033[34m'
GRAY='\033[90m'
WHITE='\033[37m'
NC='\033[0m'

# ─── Helpers ───────────────────────────────────────────────
banner() {
  echo ""
  echo -e "${CYAN}${BOLD}"
  echo "    ██████╗  █████╗ ███╗   ███╗███████╗██╗  ██╗ ██████╗ ███████╗████████╗"
  echo "   ██╔════╝ ██╔══██╗████╗ ████║██╔════╝██║  ██║██╔═══██╗██╔════╝╚══██╔══╝"
  echo "   ██║  ███╗███████║██╔████╔██║█████╗  ███████║██║   ██║███████╗   ██║   "
  echo "   ██║   ██║██╔══██║██║╚██╔╝██║██╔══╝  ██╔══██║██║   ██║╚════██║   ██║   "
  echo "   ╚██████╔╝██║  ██║██║ ╚═╝ ██║███████╗██║  ██║╚██████╔╝███████║   ██║   "
  echo "    ╚═════╝ ╚═╝  ╚═╝╚═╝     ╚═╝╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚══════╝   ╚═╝   "
  echo -e "${NC}"
  echo -e "${GRAY}   ─────────────────────────────────────────────────────────────────${NC}"
  echo -e "${WHITE}${BOLD}                       Installation Script${NC}"
  echo -e "${GRAY}   ─────────────────────────────────────────────────────────────────${NC}"
  echo ""
}

section() {
  echo -e "\n${GRAY}   ┌─${NC} ${BLUE}${BOLD}$1${NC}"
}

ok() {
  echo -e "${GRAY}   │${NC}  ${GREEN}✔${NC} ${WHITE}$1${NC}"
}

info() {
  echo -e "${GRAY}   │${NC}  ${CYAN}→${NC} ${WHITE}$1${NC}"
}

warn() {
  echo -e "${GRAY}   │${NC}  ${YELLOW}⚠${NC} ${WHITE}$1${NC}"
}

fail() {
  echo -e "${GRAY}   │${NC}  ${RED}✘${NC} ${WHITE}$1${NC}"
  section_end
  exit 1
}

section_end() {
  echo -e "${GRAY}   └──────────────────────────────────────────${NC}"
}

spinner() {
  local pid=$1 label=$2
  local frames=("⠋" "⠙" "⠹" "⠸" "⠼" "⠴" "⠦" "⠧" "⠇" "⠏")
  local i=0
  while kill -0 "$pid" 2>/dev/null; do
    printf "\r${GRAY}   │${NC}  ${CYAN}${frames[$i]}${NC} ${WHITE}${label}${NC}  "
    i=$(( (i+1) % ${#frames[@]} ))
    sleep 0.1
  done
  printf "\r"
}

# ─── Start ─────────────────────────────────────────────────
START_TIME=$(date +%s)
banner

# ─── Pre-checks ───────────────────────────────────────────
section "Pre-flight Checks"

command -v docker >/dev/null 2>&1 || fail "Docker is not installed. Run: curl -fsSL https://get.docker.com | sh"
ok "Docker found"

command -v docker compose >/dev/null 2>&1 && COMPOSE="docker compose" || {
  command -v docker-compose >/dev/null 2>&1 && COMPOSE="docker-compose" || fail "Docker Compose is not installed."
}
ok "Docker Compose found"

command -v openssl >/dev/null 2>&1 && ok "OpenSSL found" || warn "OpenSSL not found — secrets will use fallback"

section_end

# ─── Directories ──────────────────────────────────────────
section "Setup"
mkdir -p nginx/ssl backups
ok "Created directories (nginx/ssl, backups)"

# ─── Environment ──────────────────────────────────────────
if [ ! -f .env ]; then
  info "No .env found — generating from .env.example"
  cp .env.example .env

  # Auto-generate secrets
  JWT_SECRET=$(openssl rand -base64 48 | tr -d '\n/+=' | head -c 64)
  SESSION_SECRET=$(openssl rand -base64 48 | tr -d '\n/+=' | head -c 64)
  DB_PASSWORD=$(openssl rand -base64 32 | tr -d '\n/+=' | head -c 32)
  REDIS_PASSWORD=$(openssl rand -base64 32 | tr -d '\n/+=' | head -c 32)

  sed -i "s|CHANGE_ME_JWT_SECRET|${JWT_SECRET}|g" .env
  sed -i "s|CHANGE_ME_SESSION_SECRET|${SESSION_SECRET}|g" .env
  sed -i "s|CHANGE_ME_DB_PASSWORD|${DB_PASSWORD}|g" .env
  sed -i "s|CHANGE_ME_REDIS_PASSWORD|${REDIS_PASSWORD}|g" .env

  # Fix connection URLs with generated passwords
  sed -i "s|postgresql://gamehost:CHANGE_ME_DB_PASSWORD@|postgresql://gamehost:${DB_PASSWORD}@|g" .env
  sed -i "s|redis://:CHANGE_ME_REDIS_PASSWORD@|redis://:${REDIS_PASSWORD}@|g" .env

  ok "Generated .env with random secrets"
else
  ok ".env exists — keeping your config"
fi

section_end

# ─── Build ────────────────────────────────────────────────
section "Building Containers"
info "This may take a few minutes on first run..."

$COMPOSE build --no-cache > /dev/null 2>&1 &
BUILD_PID=$!
spinner $BUILD_PID "Building images"
wait $BUILD_PID
ok "All images built"

section_end

# ─── Start ────────────────────────────────────────────────
section "Starting Services"

$COMPOSE up -d > /dev/null 2>&1
ok "PostgreSQL 16"
ok "Redis 7"
ok "Backend (NestJS)"
ok "Frontend (Next.js)"
ok "Nginx (Reverse Proxy)"

section_end

# ─── Wait for DB ──────────────────────────────────────────
section "Database"
info "Waiting for PostgreSQL..."

for i in $(seq 1 30); do
  if $COMPOSE exec -T postgres pg_isready -U gamehost >/dev/null 2>&1; then
    ok "PostgreSQL is ready"
    break
  fi
  [ "$i" -eq 30 ] && fail "PostgreSQL did not start in time"
  sleep 2
done

# ─── Migrations ───────────────────────────────────────────
info "Running migrations..."
$COMPOSE exec -T backend npx prisma migrate deploy > /dev/null 2>&1
ok "Migrations applied"

section_end

# ─── Done ─────────────────────────────────────────────────
END_TIME=$(date +%s)
ELAPSED=$(( END_TIME - START_TIME ))

section "Installation Complete"
ok "Total time: ${ELAPSED}s"
section_end

echo ""
echo -e "${GRAY}   ┌──────────────────────────────────────────────────────────┐${NC}"
echo -e "${GRAY}   │${NC}                                                          ${GRAY}│${NC}"
echo -e "${GRAY}   │${NC}   ${GREEN}${BOLD}GameHost is running!${NC}                                   ${GRAY}│${NC}"
echo -e "${GRAY}   │${NC}                                                          ${GRAY}│${NC}"
echo -e "${GRAY}   │${NC}   ${WHITE}Frontend${NC}  ${CYAN}http://localhost:3000${NC}                       ${GRAY}│${NC}"
echo -e "${GRAY}   │${NC}   ${WHITE}Backend${NC}   ${CYAN}http://localhost:4000${NC}                       ${GRAY}│${NC}"
echo -e "${GRAY}   │${NC}   ${WHITE}Health${NC}    ${CYAN}http://localhost:4000/api/health${NC}             ${GRAY}│${NC}"
echo -e "${GRAY}   │${NC}                                                          ${GRAY}│${NC}"
echo -e "${GRAY}   │${NC}   ${DIM}Edit .env to configure OAuth & Pterodactyl${NC}             ${GRAY}│${NC}"
echo -e "${GRAY}   │${NC}   ${DIM}Then run: docker compose down && docker compose up -d${NC}  ${GRAY}│${NC}"
echo -e "${GRAY}   │${NC}                                                          ${GRAY}│${NC}"
echo -e "${GRAY}   └──────────────────────────────────────────────────────────┘${NC}"
echo ""
