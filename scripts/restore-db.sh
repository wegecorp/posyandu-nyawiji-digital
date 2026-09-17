#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="${PROJECT_DIR:-$(dirname "$SCRIPT_DIR")}"
BACKUP_ROOT="${BACKUP_ROOT:-/var/backups/posyandu}"
PM2_NAME="${PM2_NAME:-posyandu-nyawiji}"
RCLONE_REMOTE="${RCLONE_REMOTE:-gdrive:posyandu-backup}"

# Ambil DATABASE_URL dari .env bila tidak diekspor di environment.
ENV_FILE="${ENV_FILE:-$PROJECT_DIR/.env}"
if [ -z "${DATABASE_URL:-}" ] && [ -f "$ENV_FILE" ]; then
  DATABASE_URL="$(grep -E '^DATABASE_URL=' "$ENV_FILE" | head -n1 | cut -d= -f2-)"
  DATABASE_URL="${DATABASE_URL%\"}"; DATABASE_URL="${DATABASE_URL#\"}"
fi

# libpq tidak mengenal parameter Prisma (?schema=, ?connection_limit=) — buang.
PG_URL="${DATABASE_URL%%\?*}"

ASSUME_YES=0
FROM_DRIVE=0
SOURCE=""

usage() {
  cat <<'EOF'
Pemulihan database Posyandu dari file backup PostgreSQL.

Pakai:
  restore-db.sh <sumber> [--from-drive] [--yes]

Sumber:
  /path/posyandu-2026-09-10.dump.gz  file backup lokal
  daily:2026-09-10                   dari folder backup harian
  monthly:2026-09-01                 dari folder backup bulanan

Opsi:
  --from-drive   unduh dulu dari Google Drive
  --yes          lewati konfirmasi (untuk pemulihan darurat)

Contoh:
  restore-db.sh daily:2026-09-10
  restore-db.sh monthly:2026-09-01 --from-drive --yes
EOF
  exit 1
}

while [ $# -gt 0 ]; do
  case "$1" in
    --yes) ASSUME_YES=1 ;;
    --from-drive) FROM_DRIVE=1 ;;
    -h|--help) usage ;;
    *) SOURCE="$1" ;;
  esac
  shift
done

[ -n "$SOURCE" ] || usage
[ -n "${DATABASE_URL:-}" ] || { echo "ERROR: DATABASE_URL tidak ditemukan (set di .env atau environment)" >&2; exit 1; }
command -v pg_restore >/dev/null 2>&1 || { echo "ERROR: pg_restore tidak terpasang (paket postgresql-client)" >&2; exit 1; }
command -v pg_dump >/dev/null 2>&1 || { echo "ERROR: pg_dump tidak terpasang (paket postgresql-client)" >&2; exit 1; }

REMOTE_SUB=""
case "$SOURCE" in
  daily:*)
    STAMP="${SOURCE#daily:}"
    REMOTE_SUB="daily"
    SOURCE="$BACKUP_ROOT/daily/posyandu-$STAMP.dump.gz"
    ;;
  monthly:*)
    STAMP="${SOURCE#monthly:}"
    REMOTE_SUB="monthly"
    SOURCE="$BACKUP_ROOT/monthly/posyandu-$STAMP.dump.gz"
    ;;
esac

if [ "$FROM_DRIVE" = "1" ]; then
  [ -n "$REMOTE_SUB" ] || { echo "ERROR: --from-drive butuh sumber daily: / monthly:" >&2; exit 1; }
  command -v rclone >/dev/null 2>&1 || { echo "ERROR: rclone tidak terpasang" >&2; exit 1; }
  mkdir -p "$(dirname "$SOURCE")"
  rclone copyto "$RCLONE_REMOTE/$REMOTE_SUB/$(basename "$SOURCE")" "$SOURCE" \
    || { echo "ERROR: gagal mengunduh dari Google Drive" >&2; exit 1; }
fi

[ -f "$SOURCE" ] || { echo "ERROR: file backup tidak ditemukan: $SOURCE" >&2; exit 1; }
gzip -t "$SOURCE" || { echo "ERROR: file backup rusak (gzip test gagal)" >&2; exit 1; }

WORK_DIR="$(mktemp -d)"
trap 'rm -rf "$WORK_DIR"' EXIT
TMP_DUMP="$WORK_DIR/posyandu.dump"
gunzip -c "$SOURCE" > "$TMP_DUMP"
pg_restore --list "$TMP_DUMP" >/dev/null || { echo "ERROR: arsip dump tidak valid" >&2; exit 1; }

echo "Akan memulihkan database dari:"
echo "  $SOURCE"
echo "Target: ${PG_URL%%\?*} (schema dari DATABASE_URL)"
echo "Aplikasi PM2 '$PM2_NAME' akan dihentikan sementara."

if [ "$ASSUME_YES" != "1" ]; then
  read -r -p "Lanjutkan? (ketik 'ya' untuk melanjutkan) " answer
  [ "$answer" = "ya" ] || { echo "Dibatalkan."; exit 1; }
fi

if command -v pm2 >/dev/null 2>&1; then
  pm2 stop "$PM2_NAME" >/dev/null 2>&1 || true
fi

# Simpan database saat ini dulu sebagai jaring pengaman.
SAFETY="$BACKUP_ROOT/posyandu-sebelum-restore-$(date +%Y%m%d-%H%M%S).dump"
mkdir -p "$BACKUP_ROOT"
if pg_dump "$PG_URL" -Fc --no-owner --no-privileges -f "$SAFETY" 2>/dev/null; then
  echo "Database lama disimpan: $SAFETY"
else
  echo "PERINGATAN: gagal membuat dump pengaman (database mungkin kosong) — lanjut." >&2
fi

pg_restore --clean --if-exists --no-owner --no-privileges -d "$PG_URL" "$TMP_DUMP" \
  || echo "PERINGATAN: pg_restore melaporkan peringatan (umumnya objek drop yang belum ada) — cek log." >&2

RESTORED="$(psql "$PG_URL" -tAc 'SELECT count(*) FROM "Patient";')" \
  || { echo "ERROR: verifikasi hasil restore gagal" >&2; exit 1; }
echo "Restore selesai. Baris Patient: ${RESTORED// /}"

if command -v pm2 >/dev/null 2>&1; then
  pm2 start "$PM2_NAME" >/dev/null 2>&1 || pm2 restart "$PM2_NAME" >/dev/null 2>&1 || true
fi

echo "Restore selesai. Cek: pm2 logs $PM2_NAME"
