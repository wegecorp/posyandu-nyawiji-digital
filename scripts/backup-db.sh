#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-/opt/posyandu_digital}"
DB_PATH="${DB_PATH:-$PROJECT_DIR/prisma/dev.db}"
BACKUP_ROOT="${BACKUP_ROOT:-/var/backups/posyandu}"
DAILY_DIR="$BACKUP_ROOT/daily"
MONTHLY_DIR="$BACKUP_ROOT/monthly"
DAILY_KEEP="${DAILY_KEEP:-7}"
MONTHLY_KEEP="${MONTHLY_KEEP:-6}"
RCLONE_REMOTE="${RCLONE_REMOTE:-gdrive:posyandu-backup}"
TELEGRAM_BOT_TOKEN="${TELEGRAM_BOT_TOKEN:-}"
TELEGRAM_CHAT_ID="${TELEGRAM_CHAT_ID:-}"

notify() {
  local message="$1"
  if [ -n "$TELEGRAM_BOT_TOKEN" ] && [ -n "$TELEGRAM_CHAT_ID" ]; then
    curl -fsS -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
      -d "chat_id=${TELEGRAM_CHAT_ID}" \
      -d "text=[backup posyandu] ${message}" >/dev/null 2>&1 || true
  fi
}

fail() {
  echo "ERROR: $1" >&2
  notify "GAGAL: $1"
  exit 1
}

trap 'fail "gagal di baris $LINENO"' ERR

command -v sqlite3 >/dev/null 2>&1 || fail "sqlite3 tidak terpasang"
[ -f "$DB_PATH" ] || fail "database tidak ditemukan: $DB_PATH"

mkdir -p "$DAILY_DIR" "$MONTHLY_DIR"
WORK_DIR="$(mktemp -d)"
trap 'rm -rf "$WORK_DIR"' EXIT

SNAPSHOT="$WORK_DIR/posyandu.db"
sqlite3 "$DB_PATH" ".backup '$SNAPSHOT'"

INTEGRITY="$(sqlite3 "$SNAPSHOT" 'PRAGMA integrity_check;')"
[ "$INTEGRITY" = "ok" ] || fail "integritas database rusak: $INTEGRITY"

gzip -c "$SNAPSHOT" > "$WORK_DIR/posyandu.db.gz"

STAMP="$(date +%F)"
DAILY_FILE="$DAILY_DIR/posyandu-$STAMP.db.gz"
cp "$WORK_DIR/posyandu.db.gz" "$DAILY_FILE"

IS_FIRST_DAY=0
[ "$(date +%d)" = "01" ] && IS_FIRST_DAY=1
if [ "$IS_FIRST_DAY" = "1" ]; then
  cp "$WORK_DIR/posyandu.db.gz" "$MONTHLY_DIR/posyandu-$STAMP.db.gz"
fi

find "$DAILY_DIR" -type f -name 'posyandu-*.db.gz' -mtime +"$DAILY_KEEP" -delete
find "$MONTHLY_DIR" -type f -name 'posyandu-*.db.gz' 2>/dev/null | sort | head -n -"$MONTHLY_KEEP" | xargs -r rm -f

if command -v rclone >/dev/null 2>&1; then
  rclone copy "$DAILY_DIR" "$RCLONE_REMOTE/daily" --include 'posyandu-*.db.gz' --no-traverse
  if [ "$IS_FIRST_DAY" = "1" ]; then
    rclone copy "$MONTHLY_DIR" "$RCLONE_REMOTE/monthly" --include 'posyandu-*.db.gz' --no-traverse
  fi
  rclone delete "$RCLONE_REMOTE/daily" --min-age "${DAILY_KEEP}d" --include 'posyandu-*.db.gz'
  { rclone lsf --files-only "$RCLONE_REMOTE/monthly" 2>/dev/null || true; } | sort | head -n -"$MONTHLY_KEEP" | while read -r old; do
    [ -n "$old" ] && rclone deletefile "$RCLONE_REMOTE/monthly/$old"
  done
else
  notify "rclone tidak ditemukan, backup hanya tersimpan lokal"
fi

FREE="$(df -h "$BACKUP_ROOT" | awk 'NR==2 {print $4}')"
echo "[$(date '+%F %T')] backup sukses: $DAILY_FILE (sisa disk $FREE)"
