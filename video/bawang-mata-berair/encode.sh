#!/usr/bin/env bash
# Bagian edukasi -> out/edu.mp4, lalu tempel master outro UTUH dengan re-encode (README master). Tanpa loudnorm pada file gabungan.
set -euo pipefail
cd "$(dirname "$0")"; ROOT=../..
ffmpeg -y -hide_banner -loglevel error -framerate 30 -i out/fr/f%05d.jpg -i audio/mix.wav -map 0:v -map 1:a \
  -c:v libx264 -crf 17 -preset medium -pix_fmt yuv420p -r 30 -c:a aac -b:a 192k -ar 48000 -t 25.4 -movflags +faststart out/edu.mp4
ffmpeg -y -hide_banner -loglevel error -i out/edu.mp4 -i $ROOT/brand/video/outro/medcoel-outro-master.mp4 -filter_complex \
 "[0:v]fps=30,scale=1080:1920,setsar=1,format=yuv420p[v0];[1:v]fps=30,setsar=1,format=yuv420p[v1];[0:a]aresample=48000,aformat=channel_layouts=stereo[a0];[1:a]aresample=48000,aformat=channel_layouts=stereo[a1];[v0][a0][v1][a1]concat=n=2:v=1:a=1[v][a]" \
 -map "[v]" -map "[a]" -frames:v 1248 -c:v libx264 -crf 18 -preset medium -pix_fmt yuv420p -r 30 -c:a aac -b:a 192k -ar 48000 -movflags +faststart out/bawang-mata-berair.mp4
