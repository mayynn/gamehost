#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# GameHost Platform - One Command Install
# Usage: bash install.sh
# ============================================================

GREEN='\033[0;32m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

log()  { echo -e "${CYAN}[GameHost]${NC} $1"; }
ok()   { echo -e "${GREEN}[✓]${NC} $1"; }
fail() { echo -e "${RED}[✗]${NC} $1"; exit 1; }

# ---------- Pre-checks ----------
command -v docker >/dev/null 2>&1 || fail "Docker is not installed. Please install Docker first."
command -v docker compose >/dev/null 2>&1 && COMPOSE="docker compose" || {
  command -v docker-compose >/dev/null 2>&1 && COMPOSE="docker-compose" || fail "Docker Compose is not installed."
}

log "Starting GameHost installation..."

# ---------- Create required directories ----------
mkdir -p nginx/ssl backups

# ---------- Generate .env if missing ----------
if [ ! -f .env ]; then
  log "Generating .env from .env.example..."
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

  # Fix DATABASE_URL with the generated password
  sed -i "s|postgresql://gamehost:CHANGE_ME_DB_PASSWORD@|postgresql://gamehost:${DB_PASSWORD}@|g" .env
  sed -i "s|redis://:CHANGE_ME_REDIS_PASSWORD@|redis://:${REDIS_PASSWORD}@|g" .env

  ok "Generated .env with random secrets"
else
  ok ".env already exists, skipping generation"
fi

# ---------- Build and start ----------
log "Building containers..."
$COMPOSE build --no-cache

log "Starting services..."
$COMPOSE up -d

# ---------- Wait for database ----------
log "Waiting for PostgreSQL to be ready..."
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
echo -e "${GREEN} GameHost installed successfully!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo -e " Frontend: ${CYAN}http://localhost:3000${NC}"
echo -e " Backend:  ${CYAN}http://localhost:4000${NC}"
echo ""
echo -e " Edit ${CYAN}.env${NC} to configure OAuth, Pterodactyl, and payment gateways."
echo ""
