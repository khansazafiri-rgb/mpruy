#!/usr/bin/env bash
# Perbarui MEDCOEL ke kode terbaru:  sudo bash /opt/medcoel/app/deploy/update.sh
set -euo pipefail
cd /opt/medcoel/app
git config --global --add safe.directory /opt/medcoel/app 2>/dev/null || true
echo "==> [1/5] Ambil kode terbaru"; git pull --ff-only
echo "==> [2/5] Pasang library"; npm ci
echo "==> [3/5] Pastikan versi PocketBase"; bash apps/pocketbase/scripts/download-pocketbase.sh
echo "==> [4/5] Build web"; npm run build --prefix apps/web
chown -R medcoel:medcoel /opt/medcoel/app
echo "==> [5/5] Restart (migrasi baru jalan otomatis)"; systemctl restart medcoel
echo "Selesai. Buka web dengan hard refresh (Ctrl+Shift+R)."
