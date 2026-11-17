#!/bin/sh
# Ekstrak bingkai 30 fps dari empat klip sumber ke rekam/frames/<nn>/f####.jpg (tidak ikut di repo). Jalankan dari video/live-4d-hfref.
set -e
D=${1:-/tmp/live4d-frames}; mkdir -p "$D"
for f in src/0*.mp4; do n=$(basename "$f" | cut -c1-2); mkdir -p "$D/$n"; ffmpeg -v error -y -i "$f" -vf fps=30 -q:v 2 "$D/$n/f%04d.jpg"; done
ln -sfn "$D" rekam/frames; echo ok
