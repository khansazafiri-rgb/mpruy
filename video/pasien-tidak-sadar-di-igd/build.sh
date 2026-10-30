#!/usr/bin/env bash
# Membuat ulang MP4 final dan pratinjau. Prasyarat: ffmpeg, python3 + numpy, node + playwright (Chromium).
# Server statis harus melayani akar repo (panggung mengimpor brand/characters/raka dan video/dok-saya-kenapa/stage/pasien.js).
set -e
cd "$(dirname "$0")"
ROOT=$(cd ../.. && pwd)
W=${WORK:-/tmp/pasien-igd}; mkdir -p "$W/frames"
python3 audio/gen_data.py audio/source/NARATOR-ElevenLabs.mp3 stage/data.json "$W/voice.wav"   # linimasa + takarir; narator utuh, hanya diberi jeda awal
python3 audio/music.py stage/data.json "$W/music.wav" "$W/sfx.wav"                              # ambien, roda ranjang, detak jantung (pembuka), musik, efek (sintesis)
python3 audio/check_mix.py "$W/voice.wav" "$W/music.wav" "$W/sfx.wav"                            # kejernihan narator di speaker ponsel
bash audio/mix.sh "$W/voice.wav" "$W/music.wav" "$W/sfx.wav" "$W/audio.wav"                      # sekitar -14 LUFS
(cd "$ROOT" && python3 -m http.server 8140 --bind 127.0.0.1 >/dev/null 2>&1 & echo $! > "$W/srv.pid"); sleep 1
N=$(python3 -c "import json;print(int(json.load(open('stage/data.json'))['total']*30))")
(cd stage && node render.mjs "$W/frames" 0 "$N" 4)                                               # 1080x1920, 30 fps
kill "$(cat "$W/srv.pid")" 2>/dev/null || true
D=$(python3 -c "import json;print(json.load(open('stage/data.json'))['total'])")
ffmpeg -y -framerate 30 -i "$W/frames/f%05d.jpg" -i "$W/audio.wav" -c:v libx264 -preset slow -crf 17 -pix_fmt yuv420p -r 30 -c:a aac -b:a 192k -movflags +faststart -t "$D" pasien-tidak-sadar-di-igd_final.mp4
ffmpeg -y -i pasien-tidak-sadar-di-igd_final.mp4 -vf scale=540:960 -c:v libx264 -preset medium -crf 27 -pix_fmt yuv420p -r 30 -c:a aac -b:a 96k -movflags +faststart pasien-tidak-sadar-di-igd_pratinjau.mp4
ffmpeg -y -ss 3.9 -i pasien-tidak-sadar-di-igd_final.mp4 -frames:v 1 -q:v 2 pasien-tidak-sadar-di-igd_thumbnail.jpg   # thumbnail dibuat ulang dari bingkai terpilih (lihat README)
