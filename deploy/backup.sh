#!/usr/bin/env bash
# Backup database MEDCOEL ke Google Drive lewat rclone (remote bernama "gdrive").
# File PDF dan foto bukti sudah ada di Drive, jadi yang dibackup cukup database.
#   sudo apt-get install -y rclone && rclone config
#   cron: 30 2 * * * /opt/medcoel/app/deploy/backup.sh >> /var/log/medcoel-backup.log 2>&1
# Uji pemulihan secara berkala: salin data-*.db ke folder kosong lalu jalankan
# pocketbase serve --dir=<folder> dan pastikan data terbaca.
set -uo pipefail
PB_DATA=${PB_DATA:-/opt/medcoel/pb_data}
DIR=${BACKUP_DIR:-/opt/medcoel/backups}
REMOTE=${REMOTE:-gdrive:medcoel-backups}
STAMP=$(date +%Y%m%d-%H%M%S)
mkdir -p "$DIR"
find "$DIR" -type f -mtime +3 -delete
sqlite3 "$PB_DATA/data.db" ".backup '$DIR/data-$STAMP.db'" || { echo "GAGAL backup data.db"; exit 1; }
[ -f "$PB_DATA/auxiliary.db" ] && sqlite3 "$PB_DATA/auxiliary.db" ".backup '$DIR/auxiliary-$STAMP.db'"
gzip -f "$DIR/"*"-$STAMP.db"
# File lokal (ilustrasi mata kuliah, unggahan mode lokal) kecil, ikut dibackup.
[ -d "$PB_DATA/storage" ] && tar -czf "$DIR/storage-$STAMP.tar.gz" -C "$PB_DATA" storage
if command -v rclone >/dev/null && rclone listremotes | grep -q "^${REMOTE%%:*}:"; then
  rclone copy "$DIR" "$REMOTE" --include "*-$STAMP*" && rclone delete "$REMOTE" --min-age 30d
else
  echo "peringatan: rclone belum diatur, backup hanya tersimpan lokal"
fi
echo "backup $STAMP selesai"
