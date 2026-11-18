#!/bin/sh
# Ekstrak bingkai 30 fps rekaman web asli (src/rekaman-web-satu-bab.mp4, 1080x1920) ke rekam/web/f####.jpg (di-gitignore). Jalankan dari video/ferritin-face.
set -e
D=${1:-/tmp/ferritin-web}; mkdir -p "$D" rekam
ffmpeg -v error -y -i src/rekaman-web-satu-bab.mp4 -vf fps=30 -q:v 2 "$D/f%04d.jpg"
ln -sfn "$D" rekam/web; echo ok
