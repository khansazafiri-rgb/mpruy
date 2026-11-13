#!/bin/bash
# Menyiapkan PocketBase lokal (data uji, bukan produksi) + Vite untuk merekam web MEDCOEL asli.
# Pemakaian (dari akar repo): bash video/satu-kasus/rekam/siapkan.sh [folder-data-pb]
ROOT=$(cd "$(dirname "$0")/../../.." && pwd); DATA=${1:-/tmp/medcoel_promo_pb}
cd "$ROOT/apps/pocketbase" || exit 1
pkill -x pocketbase; sleep 1; rm -rf "$DATA"
./pocketbase migrate up --dir="$DATA" --migrationsDir=./pb_migrations --hooksDir=./pb_hooks >/dev/null 2>&1
./pocketbase superuser upsert dev@medcoel.local devpassword123 --dir="$DATA" --migrationsDir=./pb_migrations >/dev/null 2>&1
(MEDCOEL_DEV_MODE=1 nohup ./pocketbase serve --http=127.0.0.1:8090 --dir="$DATA" --migrationsDir=./pb_migrations --hooksDir=./pb_hooks > "$DATA.log" 2>&1 &)
for i in $(seq 1 30); do curl -s localhost:8090/api/health >/dev/null && break; sleep 1; done
cd "$ROOT/video/tab-dua-puluh/seed" && node seed.mjs 2>&1 | tail -2
cd "$ROOT/video/satu-kasus/seed" && node seed-paru.mjs 2>&1 | tail -2
