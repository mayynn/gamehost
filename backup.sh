#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# GameHost Platform — Production Backup Script
# Usage: bash backup.sh [--full] [--verify] [--encrypt] [--remote]
#
# Features:
#   - Database dump with credentials from .env (not hardcoded)
#   - .env configuration backup
#   - Optional full backup (includes Docker volumes)
#   - Backup integrity verification (checksum + test decompress)
#   - Optional GPG encryption for sensitive data
#   - Optional remote copy (SCP/rsync)
#   - Lock file to prevent concurrent backups
#   - Automatic rotation with configurable retention
#   - Cron-safe exit codes and logging
#
# Cron example (daily at 3am):
#   0 3 * * * cd /opt/gamehost && bash backup.sh --verify >> /var/log/gamehost-backup.log 2>&1
#
# Full weekly backup with encryption (Sundays at 2am):
#   0 2 * * 0 cd /opt/gamehost && bash backup.sh --full --verify --encrypt >> /var/log/gamehost-backup.log 2>&1
# ============================================================

# ─── Global error trap — ensures set -e never dies silently ─
on_error() {
  local exit_code=$? lineno=${BASH_LINENO[0]:-0}
  echo "" >&2
  echo -e "\033[31m\033[1m   ✘  Backup failed unexpectedly  (line ${lineno}, exit ${exit_code})\033[0m" >&2
  echo -e "\033[33m   Check output above for details.\033[0m" >&2
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

# Detect if running in cron (no TTY)
if [ -t 1 ]; then
  IS_INTERACTIVE=true
else
  IS_INTERACTIVE=false
  # Strip colors for log files
  BOLD='' DIM='' CYAN='' GREEN='' YELLOW='' RED='' BLUE='' MAGENTA='' GRAY='' WHITE='' NC=''
fi

# ─── Logging ──────────────────────────────────────────────
LOG_PREFIX="[GameHost Backup]"
TIMESTAMP_FMT='%Y-%m-%d %H:%M:%S'

log()  { echo -e "${CYAN}${LOG_PREFIX}${NC} $1"; }
ok()   { echo -e "${GREEN}[✔]${NC} $1"; }
warn() { echo -e "${YELLOW}[⚠]${NC} $1"; }
fail() {
  echo -e "${RED}[✘]${NC} $1"
  cleanup_lock
  exit 1
}
detail() { echo -e "    ${DIM}$1${NC}"; }

# ─── Parse Arguments ──────────────────────────────────────
DO_FULL=false
DO_VERIFY=false
DO_ENCRYPT=false
DO_REMOTE=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --full)    DO_FULL=true; shift ;;
    --verify)  DO_VERIFY=true; shift ;;
    --encrypt) DO_ENCRYPT=true; shift ;;
    --remote)  DO_REMOTE=true; shift ;;
    --help|-h)
      echo "Usage: bash backup.sh [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --full       Include Docker volumes (pgdata, redisdata) in backup"
      echo "  --verify     Verify backup integrity (checksum + test decompress)"
      echo "  --encrypt    Encrypt backup with GPG (requires GPG_PASSPHRASE in .env)"
      echo "  --remote     Copy backup to remote server (requires BACKUP_REMOTE_* in .env)"
      echo "  --help, -h   Show this help"
      exit 0
      ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

# ─── Configuration ────────────────────────────────────────
BACKUP_DIR="./backups"
LOCK_FILE="/tmp/gamehost-backup.lock"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
KEEP_DAYS=30          # Retain daily backups for 30 days
KEEP_FULL_DAYS=90     # Retain full backups for 90 days

env_get() {
  local file=$1 key=$2
  grep -E "^${key}=" "$file" 2>/dev/null | head -1 | cut -d'=' -f2- | tr -d '"' | tr -d "'"
}

# ─── Lock File (prevent concurrent backups) ───────────────
acquire_lock() {
  if [ -f "$LOCK_FILE" ]; then
    LOCK_PID=$(cat "$LOCK_FILE" 2>/dev/null || echo "")
    if [ -n "$LOCK_PID" ] && kill -0 "$LOCK_PID" 2>/dev/null; then
      fail "Another backup is running (PID: ${LOCK_PID}). Remove ${LOCK_FILE} if stale."
    else
      warn "Stale lock file found — removing"
      rm -f "$LOCK_FILE"
    fi
  fi
  echo $$ > "$LOCK_FILE"
}

cleanup_lock() {
  rm -f "$LOCK_FILE" 2>/dev/null || true
}

# Cleanup lock on exit (normal or error)
trap cleanup_lock EXIT

# ═══════════════════════════════════════════════════════════
#                       BEGIN BACKUP
# ═══════════════════════════════════════════════════════════
BACKUP_START=$(date +%s)

echo ""
if $IS_INTERACTIVE; then
  echo -e "${GRAY}   ══════════════════════════════════════════════════════════════════${NC}"
  echo -e "${CYAN}${BOLD}   📦 GameHost Platform — Backup${NC}"
  echo -e "${DIM}${GRAY}      $(date '+%Y-%m-%d %H:%M:%S %Z')${NC}"
  echo -e "${GRAY}   ══════════════════════════════════════════════════════════════════${NC}"
else
  log "Starting backup at $(date "+$TIMESTAMP_FMT")"
fi

# ─── Pre-checks ──────────────────────────────────────────
acquire_lock

command -v docker >/dev/null 2>&1 || fail "Docker is not installed."
command -v docker compose >/dev/null 2>&1 && COMPOSE="docker compose" || {
  command -v docker-compose >/dev/null 2>&1 && COMPOSE="docker-compose" || fail "Docker Compose is not installed."
}

[ -f .env ] || fail ".env file not found."

# Read DB credentials from .env (not hardcoded)
DB_USER=$(env_get .env DB_USER)
DB_NAME=$(env_get .env DB_NAME)
DB_USER=${DB_USER:-gamehost}
DB_NAME=${DB_NAME:-gamehost}

ok "Configuration loaded from .env"
detail "DB User: ${DB_USER}, DB Name: ${DB_NAME}"

# Verify PostgreSQL is running
if ! $COMPOSE exec -T postgres pg_isready -U "${DB_USER}" >/dev/null 2>&1; then
  fail "PostgreSQL is not running. Start services first: bash restart.sh"
fi
ok "PostgreSQL is running"

# Check disk space (need at least 500MB)
DISK_AVAIL_KB=$(df -k "$BACKUP_DIR" 2>/dev/null | awk 'NR==2{print $4}' || echo "0")
if [ "$DISK_AVAIL_KB" -lt 524288 ] 2>/dev/null; then
  warn "Low disk space: $(df -h "$BACKUP_DIR" | awk 'NR==2{print $4}') free"
fi

# ─── Create Backup Directory ─────────────────────────────
mkdir -p "$BACKUP_DIR"

# ─── Database Backup ─────────────────────────────────────
DB_BACKUP_FILE="${BACKUP_DIR}/gamehost_db_${TIMESTAMP}.sql.gz"

log "Dumping PostgreSQL database..."

DB_DUMP_START=$(date +%s)

# Use custom format for better restore options, then compress
$COMPOSE exec -T postgres pg_dump \
    -U "${DB_USER}" \
    -d "${DB_NAME}" \
    --clean \
    --if-exists \
    --no-owner \
    --no-privileges \
    --serializable-deferrable \
    --quote-all-identifiers \
    2>/dev/null | gzip -9 > "$DB_BACKUP_FILE"

DB_DUMP_ELAPSED=$(( $(date +%s) - DB_DUMP_START ))

if [ -s "$DB_BACKUP_FILE" ]; then
    DB_SIZE=$(du -h "$DB_BACKUP_FILE" | cut -f1)
    ok "Database backup: ${DB_BACKUP_FILE} (${DB_SIZE}) [${DB_DUMP_ELAPSED}s]"
else
    rm -f "$DB_BACKUP_FILE"
    fail "Database backup file is empty — dump failed"
fi

# ─── .env Configuration Backup ───────────────────────────
ENV_BACKUP_FILE="${BACKUP_DIR}/gamehost_env_${TIMESTAMP}.enc"

log "Backing up .env configuration..."

if $DO_ENCRYPT && command -v gpg >/dev/null 2>&1; then
  GPG_PASS=$(env_get .env GPG_PASSPHRASE 2>/dev/null || echo "")
  if [ -n "$GPG_PASS" ]; then
    gpg --batch --yes --passphrase "$GPG_PASS" --symmetric --cipher-algo AES256 \
        -o "$ENV_BACKUP_FILE" .env 2>/dev/null
    ok ".env encrypted backup: ${ENV_BACKUP_FILE}"
  else
    cp .env "${BACKUP_DIR}/gamehost_env_${TIMESTAMP}.bak"
    ENV_BACKUP_FILE="${BACKUP_DIR}/gamehost_env_${TIMESTAMP}.bak"
    warn ".env backup (unencrypted) — set GPG_PASSPHRASE in .env for encryption"
  fi
else
  cp .env "${BACKUP_DIR}/gamehost_env_${TIMESTAMP}.bak"
  ENV_BACKUP_FILE="${BACKUP_DIR}/gamehost_env_${TIMESTAMP}.bak"
  ok ".env backup: ${ENV_BACKUP_FILE}"
fi

# ─── Full Backup (Docker Volumes) ─────────────────────────
FULL_BACKUP_FILE=""

if $DO_FULL; then
  log "Creating full volume backup (this may take a while)..."

  FULL_BACKUP_FILE="${BACKUP_DIR}/gamehost_full_${TIMESTAMP}.tar.gz"
  FULL_START=$(date +%s)

  # Get volume names from docker compose
  PG_VOLUME=$($COMPOSE config --volumes 2>/dev/null | grep pgdata || echo "pgdata")
  REDIS_VOLUME=$($COMPOSE config --volumes 2>/dev/null | grep redisdata || echo "redisdata")
  PROJECT_NAME=$(basename "$(pwd)" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]//g')

  # Create temp directory for volume exports
  TEMP_DIR=$(mktemp -d)

  # Export PostgreSQL volume
  docker run --rm \
    -v "${PROJECT_NAME}_pgdata:/data:ro" \
    -v "${TEMP_DIR}:/backup" \
    alpine:3.18 \
    tar czf /backup/pgdata.tar.gz -C /data . 2>/dev/null || warn "Could not export pgdata volume"

  # Export Redis volume
  docker run --rm \
    -v "${PROJECT_NAME}_redisdata:/data:ro" \
    -v "${TEMP_DIR}:/backup" \
    alpine:3.18 \
    tar czf /backup/redisdata.tar.gz -C /data . 2>/dev/null || warn "Could not export redisdata volume"

  # Copy DB dump and .env into temp dir so everything is in one archive
  cp "$DB_BACKUP_FILE" "$TEMP_DIR/db_dump.sql.gz" 2>/dev/null || true
  cp "$ENV_BACKUP_FILE" "$TEMP_DIR/env_backup" 2>/dev/null || true

  # Also backup SSL certificates if they exist
  if [ -d "$(pwd)/nginx/ssl" ] && [ "$(ls -A "$(pwd)/nginx/ssl" 2>/dev/null)" ]; then
    tar czf "$TEMP_DIR/ssl_certs.tar.gz" -C "$(pwd)/nginx/ssl" . 2>/dev/null || warn "Could not backup SSL certs"
  fi

  # Bundle everything together in one compressed archive
  tar czf "$FULL_BACKUP_FILE" \
    -C "$TEMP_DIR" . \
    2>/dev/null

  rm -rf "$TEMP_DIR"

  FULL_ELAPSED=$(( $(date +%s) - FULL_START ))
  if [ -s "$FULL_BACKUP_FILE" ]; then
    FULL_SIZE=$(du -h "$FULL_BACKUP_FILE" | cut -f1)
    ok "Full backup: ${FULL_BACKUP_FILE} (${FULL_SIZE}) [${FULL_ELAPSED}s]"
  else
    warn "Full volume backup may be incomplete"
  fi
fi

# ─── Verify Backup Integrity ─────────────────────────────
if $DO_VERIFY; then
  log "Verifying backup integrity..."

  VERIFY_PASS=true

  # 1. Generate and store checksum
  sha256sum "$DB_BACKUP_FILE" > "${DB_BACKUP_FILE}.sha256"
  ok "Checksum generated: ${DB_BACKUP_FILE}.sha256"

  # 2. Test decompress (ensure gzip is valid)
  if gzip -t "$DB_BACKUP_FILE" 2>/dev/null; then
    ok "Gzip integrity: PASS"
  else
    warn "Gzip integrity: FAIL — backup may be corrupt"
    VERIFY_PASS=false
  fi

  # 3. Count SQL statements in dump (sanity check)
  TABLE_COUNT=$(gunzip -c "$DB_BACKUP_FILE" 2>/dev/null | grep -c "CREATE TABLE" || echo "0")
  if [ "$TABLE_COUNT" -gt 0 ]; then
    ok "SQL content: ${TABLE_COUNT} CREATE TABLE statements found"
  else
    warn "SQL content: No CREATE TABLE found — backup may be incomplete"
    VERIFY_PASS=false
  fi

  # 4. Verify file size is reasonable (> 1KB for a non-empty DB)
  FILE_SIZE_BYTES=$(stat --printf="%s" "$DB_BACKUP_FILE" 2>/dev/null || stat -f "%z" "$DB_BACKUP_FILE" 2>/dev/null || echo "0")
  if [ "$FILE_SIZE_BYTES" -gt 1024 ]; then
    ok "File size: ${FILE_SIZE_BYTES} bytes (reasonable)"
  else
    warn "File size: ${FILE_SIZE_BYTES} bytes (suspiciously small)"
    VERIFY_PASS=false
  fi

  # 5. Verify full backup if applicable
  if $DO_FULL && [ -n "$FULL_BACKUP_FILE" ] && [ -f "$FULL_BACKUP_FILE" ]; then
    sha256sum "$FULL_BACKUP_FILE" > "${FULL_BACKUP_FILE}.sha256"
    if tar tzf "$FULL_BACKUP_FILE" >/dev/null 2>&1; then
      ok "Full backup archive: PASS"
    else
      warn "Full backup archive: integrity check failed"
      VERIFY_PASS=false
    fi
  fi

  if $VERIFY_PASS; then
    ok "All integrity checks PASSED ✓"
  else
    warn "Some integrity checks failed — review warnings above"
  fi
fi

# ─── Encrypt Database Backup ─────────────────────────────
if $DO_ENCRYPT && command -v gpg >/dev/null 2>&1; then
  GPG_PASS=$(env_get .env GPG_PASSPHRASE 2>/dev/null || echo "")
  if [ -n "$GPG_PASS" ]; then
    log "Encrypting database backup..."
    gpg --batch --yes --passphrase "$GPG_PASS" --symmetric --cipher-algo AES256 \
        -o "${DB_BACKUP_FILE}.gpg" "$DB_BACKUP_FILE" 2>/dev/null
    # Keep original for verify, but note encrypted version exists
    ok "Encrypted: ${DB_BACKUP_FILE}.gpg"
    detail "Decrypt: gpg --decrypt ${DB_BACKUP_FILE}.gpg > restored.sql.gz"
  fi
fi

# ─── Remote Copy ──────────────────────────────────────────
if $DO_REMOTE; then
  REMOTE_HOST=$(env_get .env BACKUP_REMOTE_HOST 2>/dev/null || echo "")
  REMOTE_PATH=$(env_get .env BACKUP_REMOTE_PATH 2>/dev/null || echo "")
  REMOTE_USER=$(env_get .env BACKUP_REMOTE_USER 2>/dev/null || echo "root")

  if [ -n "$REMOTE_HOST" ] && [ -n "$REMOTE_PATH" ]; then
    log "Copying backup to remote: ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_PATH}"

    REMOTE_START=$(date +%s)

    if command -v rsync >/dev/null 2>&1; then
      rsync -az --progress \
        "$DB_BACKUP_FILE" \
        "$ENV_BACKUP_FILE" \
        ${FULL_BACKUP_FILE:+"$FULL_BACKUP_FILE"} \
        "${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_PATH}/" 2>/dev/null && \
        ok "Remote copy via rsync: SUCCESS [$(( $(date +%s) - REMOTE_START ))s]" || \
        warn "Remote copy via rsync: FAILED"
    elif command -v scp >/dev/null 2>&1; then
      scp -q \
        "$DB_BACKUP_FILE" \
        "$ENV_BACKUP_FILE" \
        ${FULL_BACKUP_FILE:+"$FULL_BACKUP_FILE"} \
        "${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_PATH}/" 2>/dev/null && \
        ok "Remote copy via scp: SUCCESS [$(( $(date +%s) - REMOTE_START ))s]" || \
        warn "Remote copy via scp: FAILED"
    else
      warn "Neither rsync nor scp found — skipping remote copy"
    fi
  else
    warn "Remote backup skipped — set BACKUP_REMOTE_HOST and BACKUP_REMOTE_PATH in .env"
  fi
fi

# ─── Rotate Old Backups ──────────────────────────────────
log "Rotating old backups..."

# Daily backups: keep for KEEP_DAYS
DELETED_DAILY=$(find "$BACKUP_DIR" -name "gamehost_db_*.sql.gz" -mtime +${KEEP_DAYS} -print -delete 2>/dev/null | wc -l || echo "0")
DELETED_ENV=$(find "$BACKUP_DIR" -name "gamehost_env_*" -mtime +${KEEP_DAYS} -print -delete 2>/dev/null | wc -l || echo "0")
DELETED_CHECKSUMS=$(find "$BACKUP_DIR" -name "*.sha256" -mtime +${KEEP_DAYS} -print -delete 2>/dev/null | wc -l || echo "0")
DELETED_GPG=$(find "$BACKUP_DIR" -name "*.gpg" -mtime +${KEEP_DAYS} -print -delete 2>/dev/null | wc -l || echo "0")

# Full backups: keep for KEEP_FULL_DAYS
DELETED_FULL=$(find "$BACKUP_DIR" -name "gamehost_full_*" -mtime +${KEEP_FULL_DAYS} -print -delete 2>/dev/null | wc -l || echo "0")

# Pre-update backups: keep for KEEP_DAYS
DELETED_PRE=$(find "$BACKUP_DIR" -name "pre_update_*" -mtime +${KEEP_DAYS} -print -delete 2>/dev/null | wc -l || echo "0")

TOTAL_DELETED=$(( DELETED_DAILY + DELETED_ENV + DELETED_CHECKSUMS + DELETED_GPG + DELETED_FULL + DELETED_PRE ))
ok "Rotated ${TOTAL_DELETED} old file(s)"
detail "Retention: daily=${KEEP_DAYS}d, full=${KEEP_FULL_DAYS}d"

# ─── Summary ─────────────────────────────────────────────
BACKUP_END=$(date +%s)
TOTAL_ELAPSED=$(( BACKUP_END - BACKUP_START ))

TOTAL_BACKUPS=$(find "$BACKUP_DIR" -name "gamehost_*" | wc -l)
TOTAL_SIZE=$(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1)

echo ""
echo -e "${GREEN}${BOLD}   ══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}${BOLD}    Backup Complete!${NC} ${DIM}(${TOTAL_ELAPSED}s)${NC}"
echo -e "${GREEN}${BOLD}   ══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "   ${WHITE}${BOLD}Files Created:${NC}"
echo -e "   ${CYAN}Database${NC}  ${DB_BACKUP_FILE} ${DIM}(${DB_SIZE})${NC}"
echo -e "   ${CYAN}.env${NC}      ${ENV_BACKUP_FILE}"
if [ -n "$FULL_BACKUP_FILE" ] && [ -f "$FULL_BACKUP_FILE" ]; then
  echo -e "   ${CYAN}Full${NC}      ${FULL_BACKUP_FILE} ${DIM}(${FULL_SIZE})${NC}"
fi
if [ -f "${DB_BACKUP_FILE}.gpg" ]; then
  echo -e "   ${CYAN}Encrypted${NC} ${DB_BACKUP_FILE}.gpg"
fi
echo ""
echo -e "   ${WHITE}${BOLD}Backup Directory:${NC}"
echo -e "   Total backups: ${CYAN}${TOTAL_BACKUPS}${NC}"
echo -e "   Total size:    ${CYAN}${TOTAL_SIZE}${NC}"
echo ""
echo -e "   ${WHITE}${BOLD}Restore Commands:${NC}"
echo -e "   ${DIM}# Database restore:${NC}"
echo -e "   ${DIM}gunzip -c ${DB_BACKUP_FILE} | docker compose exec -T postgres psql -U ${DB_USER} -d ${DB_NAME}${NC}"
echo ""
echo -e "   ${DIM}# .env restore:${NC}"
echo -e "   ${DIM}cp ${ENV_BACKUP_FILE} .env${NC}"
echo ""

cleanup_lock
