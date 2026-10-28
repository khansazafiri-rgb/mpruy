#!/usr/bin/env bash
# Membuat ulang medcoel-dunia-tanpa-oralit.mp4. Prasyarat: ffmpeg, python3 + numpy, node + playwright (Chromium).
set -e
cd "$(dirname "$0")"
W=${WORK:-/tmp/dunia-tanpa-oralit}; mkdir -p "$W/clips" "$W/frames"
python3 audio/split.py audio/source/ORALIT-NARATOR.mp3 audio/source/ORALIT-ORANGTUA.mp3 "$W/clips"   # potong per ID (audio asli, tanpa ubah kecepatan)
python3 audio/gen_data.py "$W/clips" stage/data.json "$W/voice.wav"                                  # linimasa, takarir, envelope bibir
python3 audio/music.py stage/data.json "$W/music.wav" "$W/sfx.wav"                                    # musik dan efek (sintesis)
bash audio/mix.sh "$W/voice.wav" "$W/music.wav" "$W/sfx.wav" "$W/audio.wav"                           # musik di bawah dialog, sekitar -16 LUFS
(cd stage && python3 -m http.server 8123 --bind 127.0.0.1 >/dev/null 2>&1 & echo $! > "$W/srv.pid"); sleep 1
(cd stage && node render.mjs "$W/frames" 0 2609 4)                                                    # 2610 frame, 1080x1920, 30 fps
kill "$(cat "$W/srv.pid")" 2>/dev/null || true
ffmpeg -y -framerate 30 -i "$W/frames/f%05d.jpg" -i "$W/audio.wav" -c:v libx264 -preset slow -crf 17 -pix_fmt yuv420p -r 30 -c:a aac -b:a 192k -movflags +faststart -t 87.0 medcoel-dunia-tanpa-oralit.mp4
