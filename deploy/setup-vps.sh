#!/usr/bin/env bash
# Pemasangan pertama MEDCOEL di VPS Ubuntu 22.04/24.04 (jalankan sebagai root).
#   curl -fsSL https://raw.githubusercontent.com/khansazafiri-rgb/mpruy/main/deploy/setup-vps.sh -o setup.sh
#   sudo bash setup.sh
set -euo pipefail
REPO=${REPO:-https://github.com/khansazafiri-rgb/mpruy.git}
BASE=/opt/medcoel

echo "==> Paket dasar"
apt-get update -y
apt-get install -y git curl unzip sqlite3 debian-keyring debian-archive-keyring apt-transport-https ca-certificates gnupg

if ! command -v node >/dev/null || ! node -v | grep -q '^v22'; then
  echo "==> Node.js 22"
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi

if ! command -v caddy >/dev/null; then
  echo "==> Caddy"
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -y && apt-get install -y caddy
fi

echo "==> User dan folder"
id medcoel >/dev/null 2>&1 || useradd --system --create-home --home-dir "$BASE" --shell /usr/sbin/nologin medcoel
mkdir -p "$BASE/pb_data" "$BASE/backups"
[ -d "$BASE/app/.git" ] || git clone "$REPO" "$BASE/app"
git config --global --add safe.directory "$BASE/app"

echo "==> Build"
cd "$BASE/app"
npm ci
bash apps/pocketbase/scripts/download-pocketbase.sh
npm run build --prefix apps/web

[ -f "$BASE/medcoel.env" ] || { cp deploy/medcoel.env.example "$BASE/medcoel.env"; sed -i "s/^MEDCOEL_SECRET=$/MEDCOEL_SECRET=$(openssl rand -hex 16)/" "$BASE/medcoel.env"; }
chmod 600 "$BASE/medcoel.env"
chown -R medcoel:medcoel "$BASE"

echo "==> Service"
cp deploy/medcoel.service /etc/systemd/system/medcoel.service
cp deploy/Caddyfile /etc/caddy/Caddyfile
systemctl daemon-reload
systemctl enable --now medcoel
systemctl reload caddy

echo ""
echo "Selesai. Langkah berikutnya (lihat docs/DEPLOY.md):"
echo "  1. Buat superuser: sudo -u medcoel $BASE/app/apps/pocketbase/pocketbase superuser upsert EMAIL PASSWORD --dir=$BASE/pb_data"
echo "  2. Isi $BASE/medcoel.env (Drive, Turnstile) lalu: sudo systemctl restart medcoel"
echo "  3. Atur SMTP di https://medcoel.com/_/ > Settings > Mail settings"
echo "  4. Buat akun admin dan agen (docs/DEPLOY.md bagian Akun admin)"
