#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="${PROJECT_DIR:-$(dirname "$SCRIPT_DIR")}"
BACKUP_ROOT="${BACKUP_ROOT:-/var/backups/posyandu}"
DAILY_DIR="$BACKUP_ROOT/daily"
MONTHLY_DIR="$BACKUP_ROOT/monthly"
DAILY_KEEP="${DAILY_KEEP:-7}"
MONTHLY_KEEP="${MONTHLY_KEEP:-6}"
RCLONE_REMOTE="${RCLONE_REMOTE:-gdrive:posyandu-backup}"
TELEGRAM_BOT_TOKEN="${TELEGRAM_BOT_TOKEN:-}"
TELEGRAM_CHAT_ID="${TELEGRAM_CHAT_ID:-}"

# Ambil DATABASE_URL dari .env bila tidak diekspor di environment.
ENV_FILE="${ENV_FILE:-$PROJECT_DIR/.env}"
if [ -z "${DATABASE_URL:-}" ] && [ -f "$ENV_FILE" ]; then
  DATABASE_URL="$(grep -E '^DATABASE_URL=' "$ENV_FILE" | head -n1 | cut -d= -f2-)"
  DATABASE_URL="${DATABASE_URL%\"}"; DATABASE_URL="${DATABASE_URL#\"}"
fi

# libpq tidak mengenal parameter Prisma (?schema=, ?connection_limit=) — buang.
PG_URL="${DATABASE_URL%%\?*}"

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

[ -n "${DATABASE_URL:-}" ] || fail "DATABASE_URL tidak ditemukan (set di .env atau environment)"
command -v pg_dump >/dev/null 2>&1 || fail "pg_dump tidak terpasang (paket postgresql-client)"
command -v pg_restore >/dev/null 2>&1 || fail "pg_restore tidak terpasang (paket postgresql-client)"

mkdir -p "$DAILY_DIR" "$MONTHLY_DIR"
WORK_DIR="$(mktemp -d)"
trap 'rm -rf "$WORK_DIR"' EXIT

SNAPSHOT="$WORK_DIR/posyandu.dump"
# -Fc: format custom (portable, bisa dibaca pg_restore -l untuk verifikasi).
# --no-owner/--no-privileges: agar dump bisa di-restore ke role user lain
# (mis. pindah server kabupaten dengan nama user berbeda).
pg_dump "$PG_URL" -Fc --no-owner --no-privileges -f "$SNAPSHOT"

pg_restore --list "$SNAPSHOT" >/dev/null || fail "arsip dump tidak valid"

gzip -c "$SNAPSHOT" > "$WORK_DIR/posyandu.dump.gz"

STAMP="$(date +%F)"
DAILY_FILE="$DAILY_DIR/posyandu-$STAMP.dump.gz"
cp "$WORK_DIR/posyandu.dump.gz" "$DAILY_FILE"

IS_FIRST_DAY=0
[ "$(date +%d)" = "01" ] && IS_FIRST_DAY=1
if [ "$IS_FIRST_DAY" = "1" ]; then
  cp "$WORK_DIR/posyandu.dump.gz" "$MONTHLY_DIR/posyandu-$STAMP.dump.gz"
fi

find "$DAILY_DIR" -type f -name 'posyandu-*.dump.gz' -mtime +"$DAILY_KEEP" -delete
find "$MONTHLY_DIR" -type f -name 'posyandu-*.dump.gz' 2>/dev/null | sort | head -n -"$MONTHLY_KEEP" | xargs -r rm -f

RCLONE_REMOTE_NAME="${RCLONE_REMOTE%%:*}"
if command -v rclone >/dev/null 2>&1 && rclone listremotes 2>/dev/null | grep -qx "${RCLONE_REMOTE_NAME}:"; then
  rclone copy "$DAILY_DIR" "$RCLONE_REMOTE/daily" --include 'posyandu-*.dump.gz' --no-traverse
  if [ "$IS_FIRST_DAY" = "1" ]; then
    rclone copy "$MONTHLY_DIR" "$RCLONE_REMOTE/monthly" --include 'posyandu-*.dump.gz' --no-traverse
  fi
  rclone delete "$RCLONE_REMOTE/daily" --min-age "${DAILY_KEEP}d" --include 'posyandu-*.dump.gz'
  { rclone lsf --files-only "$RCLONE_REMOTE/monthly" 2>/dev/null || true; } | sort | head -n -"$MONTHLY_KEEP" | while read -r old; do
    [ -n "$old" ] && rclone deletefile "$RCLONE_REMOTE/monthly/$old"
  done
else
  notify "rclone belum dikonfigurasi, backup hanya tersimpan lokal"
fi

FREE="$(df -h "$BACKUP_ROOT" | awk 'NR==2 {print $4}')"
echo "[$(date '+%F %T')] backup sukses: $DAILY_FILE (sisa disk $FREE)"
