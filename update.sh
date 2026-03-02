#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# GameHost Platform - One Command Update
# Usage: bash update.sh
# ============================================================

GREEN='\033[0;32m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

log()  { echo -e "${CYAN}[GameHost]${NC} $1"; }
ok()   { echo -e "${GREEN}[✓]${NC} $1"; }
fail() { echo -e "${RED}[✗]${NC} $1"; exit 1; }

# ---------- Pre-checks ----------
command -v docker >/dev/null 2>&1 || fail "Docker is not installed."
command -v docker compose >/dev/null 2>&1 && COMPOSE="docker compose" || {
  command -v docker-compose >/dev/null 2>&1 && COMPOSE="docker-compose" || fail "Docker Compose is not installed."
}

[ -f .env ] || fail ".env file not found. Run install.sh first."

log "Starting GameHost update..."

# ---------- Pull latest if git is available ----------
if command -v git >/dev/null 2>&1 && [ -d .git ]; then
    log "Pulling latest changes..."
    git pull --rebase || log "Git pull failed, continuing with local files..."
    ok "Code updated"
else
    log "No git repo found, updating with local files..."
fi

# ---------- Rebuild containers ----------
log "Rebuilding containers..."
$COMPOSE build --no-cache
ok "Containers rebuilt"

# ---------- Restart services ----------
log "Restarting services..."
$COMPOSE down
$COMPOSE up -d
ok "Services restarted"

# ---------- Wait for database ----------
log "Waiting for PostgreSQL..."
for i in $(seq 1 30); do
  if $COMPOSE exec -T postgres pg_isready -U gamehost >/dev/null 2>&1; then
    ok "PostgreSQL is ready"
    break
  fi
  [ "$i" -eq 30 ] && fail "PostgreSQL did not start in time"
  sleep 2
done

# ---------- Run migrations ----------
log "Running database migrations..."
$COMPOSE exec -T backend npx prisma migrate deploy
ok "Migrations completed"

# ---------- Done ----------
echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN} GameHost updated successfully!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo -e " Frontend: ${CYAN}http://localhost:3000${NC}"
echo -e " Backend:  ${CYAN}http://localhost:4000${NC}"
echo ""
