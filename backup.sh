#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# GameHost Platform - Database Backup Script
# Usage: bash backup.sh
# Cron example: 0 3 * * * cd /opt/gamehost && bash backup.sh
# ============================================================

GREEN='\033[0;32m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

log()  { echo -e "${CYAN}[Backup]${NC} $1"; }
ok()   { echo -e "${GREEN}[✓]${NC} $1"; }
fail() { echo -e "${RED}[✗]${NC} $1"; exit 1; }

# ---------- Config ----------
BACKUP_DIR="./backups"
KEEP_DAYS=7
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/gamehost_${TIMESTAMP}.sql.gz"

# ---------- Pre-checks ----------
command -v docker >/dev/null 2>&1 || fail "Docker is not installed."
command -v docker compose >/dev/null 2>&1 && COMPOSE="docker compose" || {
  command -v docker-compose >/dev/null 2>&1 && COMPOSE="docker-compose" || fail "Docker Compose is not installed."
}

[ -f .env ] || fail ".env file not found."

# ---------- Create backup directory ----------
mkdir -p "$BACKUP_DIR"

# ---------- Dump database ----------
log "Starting database backup..."

$COMPOSE exec -T postgres pg_dump \
    -U gamehost \
    -d gamehost \
    --clean \
    --if-exists \
    --no-owner \
    | gzip > "$BACKUP_FILE"

if [ -s "$BACKUP_FILE" ]; then
    SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    ok "Backup created: ${BACKUP_FILE} (${SIZE})"
else
    rm -f "$BACKUP_FILE"
    fail "Backup file is empty, something went wrong"
fi

# ---------- Rotate old backups ----------
log "Cleaning backups older than ${KEEP_DAYS} days..."
DELETED=$(find "$BACKUP_DIR" -name "gamehost_*.sql.gz" -mtime +${KEEP_DAYS} -print -delete | wc -l)
ok "Removed ${DELETED} old backup(s)"

# ---------- Summary ----------
TOTAL=$(find "$BACKUP_DIR" -name "gamehost_*.sql.gz" | wc -l)
TOTAL_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)
echo ""
echo -e "${GREEN}Backup complete!${NC}"
echo -e "  Total backups: ${CYAN}${TOTAL}${NC}"
echo -e "  Total size:    ${CYAN}${TOTAL_SIZE}${NC}"
echo ""
