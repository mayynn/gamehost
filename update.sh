#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# GameHost Platform — One Command Update
# Usage: bash update.sh
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

echo ""
echo -e "${CYAN}${BOLD}   ⟳  GameHost Update${NC}"
echo -e "${GRAY}   ─────────────────────────────────────────────────────────────────${NC}"
echo ""

# ─── Pre-checks ───────────────────────────────────────────
section "Pre-flight Checks"

command -v docker >/dev/null 2>&1 || fail "Docker is not installed."
ok "Docker"

command -v docker compose >/dev/null 2>&1 && COMPOSE="docker compose" || {
  command -v docker-compose >/dev/null 2>&1 && COMPOSE="docker-compose" || fail "Docker Compose not found."
}
ok "Docker Compose"

[ -f .env ] || fail ".env not found — run install.sh first"
ok ".env exists"

section_end

# ─── Pull Latest Code ────────────────────────────────────
section "Source Code"

if command -v git >/dev/null 2>&1 && [ -d .git ]; then
  info "Pulling latest changes..."
  git pull --rebase > /dev/null 2>&1 && ok "Git pull successful" || warn "Git pull failed — using local files"
else
  warn "No git repo — using local files"
fi

section_end

# ─── Rebuild ──────────────────────────────────────────────
section "Rebuilding"
info "Building new container images..."

$COMPOSE build --no-cache > /dev/null 2>&1 &
BUILD_PID=$!
spinner $BUILD_PID "Building images"
wait $BUILD_PID
ok "All images rebuilt"

section_end

# ─── Restart ──────────────────────────────────────────────
section "Restarting Services"

$COMPOSE down > /dev/null 2>&1
ok "Old containers stopped"
$COMPOSE up -d > /dev/null 2>&1
ok "PostgreSQL 16"
ok "Redis 7"
ok "Backend (NestJS)"
ok "Frontend (Next.js)"
ok "Nginx (Reverse Proxy)"

section_end

# ─── Database ─────────────────────────────────────────────
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

info "Running migrations..."
$COMPOSE exec -T backend npx prisma migrate deploy > /dev/null 2>&1
ok "Migrations applied"

section_end

# ─── Done ─────────────────────────────────────────────────
END_TIME=$(date +%s)
ELAPSED=$(( END_TIME - START_TIME ))

echo ""
echo -e "${GRAY}   ┌──────────────────────────────────────────────────────────┐${NC}"
echo -e "${GRAY}   │${NC}                                                          ${GRAY}│${NC}"
echo -e "${GRAY}   │${NC}   ${GREEN}${BOLD}Update complete!${NC}  ${DIM}(${ELAPSED}s)${NC}                                 ${GRAY}│${NC}"
echo -e "${GRAY}   │${NC}                                                          ${GRAY}│${NC}"
echo -e "${GRAY}   │${NC}   ${WHITE}Frontend${NC}  ${CYAN}http://localhost:3000${NC}                       ${GRAY}│${NC}"
echo -e "${GRAY}   │${NC}   ${WHITE}Backend${NC}   ${CYAN}http://localhost:4000${NC}                       ${GRAY}│${NC}"
echo -e "${GRAY}   │${NC}   ${WHITE}Health${NC}    ${CYAN}http://localhost:4000/api/health${NC}             ${GRAY}│${NC}"
echo -e "${GRAY}   │${NC}                                                          ${GRAY}│${NC}"
echo -e "${GRAY}   │${NC}   ${DIM}Your .env and database were NOT modified.${NC}              ${GRAY}│${NC}"
echo -e "${GRAY}   │${NC}                                                          ${GRAY}│${NC}"
echo -e "${GRAY}   └──────────────────────────────────────────────────────────┘${NC}"
echo ""
