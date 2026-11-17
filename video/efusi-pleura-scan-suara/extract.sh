#!/bin/sh
# Ekstrak bingkai 30 fps dari tiga klip sumber ke <dir>/<nn>/f####.jpg dan tautkan rekam/frames (di-gitignore). Jalankan dari video/efusi-pleura-scan-suara.
set -e
D=${1:-/tmp/pleura-frames}; mkdir -p "$D" rekam
for f in src/0*.mp4; do n=$(basename "$f" | cut -c1-2); mkdir -p "$D/$n"; ffmpeg -v error -y -i "$f" -vf fps=30 -q:v 3 "$D/$n/f%04d.jpg"; done
ln -sfn "$D" rekam/frames; echo ok
