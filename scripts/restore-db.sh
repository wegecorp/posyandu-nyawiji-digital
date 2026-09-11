#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="${PROJECT_DIR:-$(dirname "$SCRIPT_DIR")}"
DB_PATH="${DB_PATH:-$PROJECT_DIR/prisma/dev.db}"
BACKUP_ROOT="${BACKUP_ROOT:-/var/backups/posyandu}"
PM2_NAME="${PM2_NAME:-posyandu-nyawiji}"
RCLONE_REMOTE="${RCLONE_REMOTE:-gdrive:posyandu-backup}"

ASSUME_YES=0
FROM_DRIVE=0
SOURCE=""

usage() {
  cat <<'EOF'
Pemulihan database Posyandu dari file backup.

Pakai:
  restore-db.sh <sumber> [--from-drive] [--yes]

Sumber:
  /path/posyandu-2026-09-10.db.gz   file backup lokal
  daily:2026-09-10                  dari folder backup harian
  monthly:2026-09-10                dari folder backup bulanan

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

REMOTE_SUB=""
case "$SOURCE" in
  daily:*)
    STAMP="${SOURCE#daily:}"
    REMOTE_SUB="daily"
    SOURCE="$BACKUP_ROOT/daily/posyandu-$STAMP.db.gz"
    ;;
  monthly:*)
    STAMP="${SOURCE#monthly:}"
    REMOTE_SUB="monthly"
    SOURCE="$BACKUP_ROOT/monthly/posyandu-$STAMP.db.gz"
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

TMP_DB="$(mktemp)"
trap 'rm -f "$TMP_DB"' EXIT
gunzip -c "$SOURCE" > "$TMP_DB"
INTEGRITY="$(sqlite3 "$TMP_DB" 'PRAGMA integrity_check;')"
[ "$INTEGRITY" = "ok" ] || { echo "ERROR: integritas backup rusak: $INTEGRITY" >&2; exit 1; }

echo "Akan memulihkan database dari:"
echo "  $SOURCE"
echo "Target: $DB_PATH"
echo "Aplikasi PM2 '$PM2_NAME' akan dihentikan sementara."

if [ "$ASSUME_YES" != "1" ]; then
  read -r -p "Lanjutkan? (ketik 'ya' untuk melanjutkan) " answer
  [ "$answer" = "ya" ] || { echo "Dibatalkan."; exit 1; }
fi

if command -v pm2 >/dev/null 2>&1; then
  pm2 stop "$PM2_NAME" >/dev/null 2>&1 || true
fi

if [ -f "$DB_PATH" ]; then
  BAK="$DB_PATH.bak-$(date +%Y%m%d-%H%M%S)"
  cp "$DB_PATH" "$BAK"
  echo "Database lama disimpan: $BAK"
fi

rm -f "$DB_PATH-wal" "$DB_PATH-shm"
cat "$TMP_DB" > "$DB_PATH"

RESTORED="$(sqlite3 "$DB_PATH" 'PRAGMA integrity_check;')"
[ "$RESTORED" = "ok" ] || { echo "ERROR: database hasil restore rusak" >&2; exit 1; }

if command -v pm2 >/dev/null 2>&1; then
  pm2 start "$PM2_NAME" >/dev/null 2>&1 || pm2 restart "$PM2_NAME" >/dev/null 2>&1 || true
fi

echo "Restore selesai. Cek: pm2 logs $PM2_NAME"
