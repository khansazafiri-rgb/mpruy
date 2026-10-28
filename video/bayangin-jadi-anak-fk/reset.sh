#!/bin/bash
# Menyalakan PocketBase LOKAL (database kosong) dari kode repo, mengisi data uji, lalu menyalakan web dev (Vite) di :3000.
#   bash video/bayangin-jadi-anak-fk/reset.sh [folder-data, bawaan /tmp/medcoel-video-pb]
set -e
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
DATA="${1:-/tmp/medcoel-video-pb}"
cd "$ROOT/apps/pocketbase"
bash scripts/download-pocketbase.sh >/dev/null
pkill -x pocketbase 2>/dev/null || true; (command -v fuser >/dev/null && fuser -k 3000/tcp 2>/dev/null) || true; sleep 1
rm -rf "$DATA"
./pocketbase migrate up --dir="$DATA" --migrationsDir=./pb_migrations --hooksDir=./pb_hooks >/dev/null 2>&1
./pocketbase superuser upsert dev@medcoel.local devpassword123 --dir="$DATA" --migrationsDir=./pb_migrations >/dev/null 2>&1
(MEDCOEL_DEV_MODE=1 nohup ./pocketbase serve --http=127.0.0.1:8090 --dir="$DATA" --migrationsDir=./pb_migrations --hooksDir=./pb_hooks > "$DATA.log" 2>&1 &)
for i in $(seq 1 30); do curl -s localhost:8090/api/health >/dev/null && break; sleep 1; done
node "$ROOT/video/bayangin-jadi-anak-fk/seed/seed.mjs" 2>&1 | tail -2
cd "$ROOT/apps/web" && (nohup npm run dev > "$DATA-web.log" 2>&1 &)
for i in $(seq 1 40); do curl -s localhost:3000 >/dev/null && break; sleep 1; done
echo "web: http://127.0.0.1:3000  pocketbase: http://127.0.0.1:8090"
