#!/usr/bin/env bash
# Memasang semua yang dibutuhkan kit video di Ubuntu 22.04/24.04 (Debian/Ubuntu).
# Jalankan dari folder brand/video:   bash scripts/setup.sh
# Butuh: sudo (untuk paket sistem), koneksi internet sekali untuk mengunduh.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> Paket sistem: ffmpeg, python3-venv"
if ! command -v ffmpeg >/dev/null || ! python3 -m venv --help >/dev/null 2>&1; then
  sudo apt-get update -y
  sudo apt-get install -y ffmpeg python3-venv python3-pip curl
fi

echo "==> Node.js 20+ diperlukan"
node -e 'process.exit(parseInt(process.versions.node)>=20?0:1)' || { echo "Pasang Node.js 22 dulu (lihat panduan)."; exit 1; }

echo "==> Piper (mesin suara lokal)"
[ -d .venv ] || python3 -m venv .venv
.venv/bin/pip install --quiet --upgrade pip
.venv/bin/pip install --quiet piper-tts

echo "==> Suara Indonesia (id_ID news_tts, medium, ±63 MB)"
mkdir -p voices
BASE=https://huggingface.co/rhasspy/piper-voices/resolve/main/id/id_ID/news_tts/medium
[ -f voices/id_ID-news_tts-medium.onnx ] || curl -fL -o voices/id_ID-news_tts-medium.onnx "$BASE/id_ID-news_tts-medium.onnx"
[ -f voices/id_ID-news_tts-medium.onnx.json ] || curl -fL -o voices/id_ID-news_tts-medium.onnx.json "$BASE/id_ID-news_tts-medium.onnx.json"

echo "==> Node: Playwright + Chromium"
npm install --no-audit --no-fund
# --with-deps memasang pustaka sistem yang dibutuhkan Chromium (perlu sudo).
npx playwright install --with-deps chromium

echo ""
echo "Selesai. Coba:  npm run say -- \"Halo, aku Kori.\"   lalu   npm run video -- scenes/kenalan-kori.json --draft"
