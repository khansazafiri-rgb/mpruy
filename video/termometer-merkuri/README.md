# Kenapa angka termometer air raksa tidak langsung turun?
Video edukasi vertikal MEDCOEL (1080x1920, 30 fps, 87,87 dtk): panas -> merkuri di wadah memuai -> kolom naik di saluran sempit -> penyempitan menahan hasil saat termometer dilepas. Narasi Google AI Studio asli (72,28 dtk), outro baku SpO2 (web asli + master suara yang sama persis).

**Hasil**: `termometer-merkuri_final.mp4` · cover `cover/cover.png` (+ `cover-360px.png`) · takarir `takarir.srt/.vtt` · naskah `NASKAH.md` · sumber/lisensi `SUMBER.md` · QA `QA.md` · cuplikan `still/`.

## Struktur proyek (dapat diedit)
- `stage/art.js` — termometer (SATU geometri: wadah, saluran sempit, penyempitan, skala kanan), kamera model->layar, alat digital, ikon.
- `stage/scenes.js` — adegan A hook (Raka kanonik via `rakaSvg`), B penampang, C pemanasan, D penyempitan, E diatur ulang (ilustrasi), F digital/kaca retak/Raka memilih, G rangkuman MEMUAI -> NAIK -> TERTAHAN, outro.
- `tools/build_cues.py` -> `cues.json` (waktu kalimat/kata dari ASR, kunci suhu kolom `colKeys`, waktu putus) dipakai bersama stage dan audio.
- `audio/audio_mix.py` — suara + musik + SFX sebagai tiga jalur terpisah (`stem-*.wav`) lalu `mix.wav`.
- `rekam/siapkan-outro.sh` — bingkai web asli outro dari `../spo2-pulse-oximeter/rekam/outro-web.mp4`.

## Membuat ulang
```
python3 -m http.server 8135            # dari akar repo
bash video/termometer-merkuri/rekam/siapkan-outro.sh
python3 video/termometer-merkuri/tools/build_cues.py
python3 video/termometer-merkuri/audio/audio_mix.py
node video/termometer-merkuri/render.mjs video/termometer-merkuri/out/fr 0 2635 4
ffmpeg -framerate 30 -i out/fr/f%05d.jpg -i audio/mix.wav -c:v libx264 -crf 17 -pix_fmt yuv420p -c:a aac -b:a 192k -shortest termometer-merkuri_final.mp4
```
