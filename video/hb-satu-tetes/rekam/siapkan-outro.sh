#!/usr/bin/env bash
# Menyiapkan bingkai web ASLI untuk outro: SAMA dengan outro baku video SpO2 (potongan rekaman web asli masih-dua-minggu + dok-saya-kenapa, 960x1180, 30 fps, 15,14 dtk, 455 bingkai).
# Sumber yang dipakai: ../spo2-pulse-oximeter/rekam/outro-web.mp4 (dibuat oleh ../spo2-pulse-oximeter/rekam/siapkan-outro.sh dari rekaman di repo). Bingkai JPEG ke rekam/web/ (tidak di-commit).
set -e
cd "$(dirname "$0")"
SRC=../../spo2-pulse-oximeter/rekam/outro-web.mp4
[ -f "$SRC" ] || bash ../../spo2-pulse-oximeter/rekam/siapkan-outro.sh
D=${1:-/tmp/termometer-web}; rm -rf "$D"; mkdir -p "$D"
ffmpeg -y -v error -i "$SRC" -q:v 2 "$D/f%04d.jpg"
ln -sfn "$D" web
echo "bingkai: $(ls "$D" | wc -l)"
