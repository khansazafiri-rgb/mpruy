#!/usr/bin/env bash
# Membuat ulang MP4 final, pratinjau, dan cover. Prasyarat: ffmpeg, python3 + numpy + Pillow, node + playwright (Chromium), dan kuis anatomi asli berjalan lokal
# (lihat README bagian "Rekaman kuis asli"). Server statis harus melayani akar repo (panggung mengimpor brand/characters/raka/raka.js).
set -e
cd "$(dirname "$0")"
ROOT=$(cd ../.. && pwd)
W=${WORK:-/tmp/kuis}; mkdir -p "$W/frames"
# 1. Rekaman kuis asli per bingkai (butuh server 4188 menyala; hasil + cursor.json + marks.json di $W/quiz). Lewati bila sudah ada.
[ -f "$W/quiz/marks.json" ] || node record/record.cjs "$W/quiz" 19
ln -sfn "$W/quiz" stage/media/quiz
python3 audio/gen_data.py audio/source/NARATOR-ElevenLabs.mp3 stage/data.json "$W/voice.wav" > "$W/gen.log"   # linimasa + takarir; narator utuh, hanya diberi jeda awal
python3 audio/music.py stage/data.json "$W/music.wav" "$W/sfx.wav"
python3 audio/check_mix.py "$W/voice.wav" "$W/music.wav" "$W/sfx.wav"
bash audio/mix.sh "$W/voice.wav" "$W/music.wav" "$W/sfx.wav" "$W/audio.wav"                      # sekitar -14 LUFS
(cd "$ROOT" && python3 -m http.server 8140 --bind 127.0.0.1 >/dev/null 2>&1 & echo $! > "$W/srv.pid"); sleep 1
N=$(python3 -c "import json;print(int(json.load(open('stage/data.json'))['total']*30))")
(cd stage && node render.mjs "$W/frames" 0 "$N" 4)                                               # 1080x1920, 30 fps
D=$(python3 -c "import json;print(json.load(open('stage/data.json'))['total'])")
ffmpeg -y -framerate 30 -i "$W/frames/f%05d.jpg" -i "$W/audio.wav" -c:v libx264 -preset slow -crf 17 -pix_fmt yuv420p -r 30 -c:a aac -b:a 192k -movflags +faststart -t "$D" kuis-anatomi-3d_final.mp4
ffmpeg -y -i kuis-anatomi-3d_final.mp4 -vf scale=540:960 -c:v libx264 -preset medium -crf 24 -pix_fmt yuv420p -r 30 -c:a aac -b:a 128k -movflags +faststart kuis-anatomi-3d_pratinjau.mp4
(cd stage && node cover.mjs ../kuis-anatomi-3d_cover.jpg)
kill "$(cat "$W/srv.pid")" 2>/dev/null || true
