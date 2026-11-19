#!/bin/sh
# Ekstrak bingkai 30 fps dari dua rekaman web asli di repo ke /tmp lalu tautkan rekam/web1 dan rekam/web2 (di-gitignore). Jalankan dari video/jamu-alami-aman.
set -e
D=${1:-/tmp/jamu-web}; mkdir -p "$D/web1" "$D/web2" rekam
ffmpeg -v error -y -i ../masih-dua-minggu/rekam/rekaman-web.mp4 -vf fps=30 -q:v 2 "$D/web1/f%04d.jpg"
ffmpeg -v error -y -i ../dok-saya-kenapa/rekam/rekaman-web.mp4 -vf fps=30 -q:v 2 "$D/web2/f%04d.jpg"
ln -sfn "$D/web1" rekam/web1; ln -sfn "$D/web2" rekam/web2; echo ok
