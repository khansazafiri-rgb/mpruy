#!/usr/bin/env bash
# Membuat ulang video final, pratinjau (1x, 1,2x, 1,3x), dan cover. Prasyarat: ffmpeg, python3 + numpy + Pillow, node + playwright (Chromium),
# PocketBase lokal (8090) berisi data uji video/tab-dua-puluh/seed dan Vite (3000) dari apps/web untuk rekaman web.
set -e
cd "$(dirname "$0")"
ROOT=$(cd ../.. && pwd)
W=${WORK:-/tmp/uj}; mkdir -p "$W/frames" "$W/media"
# 0. rekaman web asli (sekali saja): bash apps/pocketbase/scripts/download-pocketbase.sh; reset + seed PocketBase; npm run dev --prefix apps/web
[ -d "$W/media/web/soal" ] || PLAYWRIGHT_PATH=${PLAYWRIGHT_PATH:-playwright} node rekam/web.cjs "$W/media/web"
ln -sfn "$W/media" stage/media
python3 audio/gen_data.py audio/narator.wav stage/data.json "$W/voice.wav" > "$W/gen.log"   # linimasa + takarir; narator utuh, hanya diberi jeda awal dan akhir
python3 audio/music.py stage/data.json "$W/music.wav" "$W/sfx.wav"
python3 audio/check_mix.py "$W/voice.wav" "$W/music.wav" "$W/sfx.wav"
bash audio/mix.sh "$W/voice.wav" "$W/music.wav" "$W/sfx.wav" "$W/audio.wav"                   # sekitar -14 LUFS
(cd "$ROOT" && python3 -m http.server 8140 --bind 127.0.0.1 >/dev/null 2>&1 & echo $! > "$W/srv.pid"); sleep 1
N=$(python3 -c "import json;print(int(json.load(open('stage/data.json'))['total']*30))")
(cd stage && node render.mjs "$W/frames" 0 "$N" 4)
D=$(python3 -c "import json;print(json.load(open('stage/data.json'))['total'])")
ffmpeg -y -framerate 30 -i "$W/frames/f%05d.jpg" -i "$W/audio.wav" -c:v libx264 -preset slow -crf 17 -pix_fmt yuv420p -r 30 -c:a aac -b:a 192k -movflags +faststart -t "$D" soal-kakak-ujian_final.mp4
ffmpeg -y -i soal-kakak-ujian_final.mp4 -vf scale=540:960 -c:v libx264 -crf 24 -c:a aac -b:a 128k soal-kakak-ujian_pratinjau.mp4
for sp in 1.2 1.3; do ffmpeg -y -i soal-kakak-ujian_final.mp4 -vf "setpts=PTS/$sp,scale=540:960" -af "atempo=$sp" -c:v libx264 -crf 24 -c:a aac -b:a 128k soal-kakak-ujian_pratinjau_${sp}x.mp4; done
(cd stage && node cover.mjs ../soal-kakak-ujian_cover.jpg)
kill "$(cat "$W/srv.pid")" 2>/dev/null || true
