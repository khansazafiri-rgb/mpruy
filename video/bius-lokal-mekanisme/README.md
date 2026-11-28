# Bagaimana obat bius lokal bekerja?
Video edukasi vertikal MEDCOEL (1080x1920, 30 fps, 75,7 dtk): rangsangan nyeri -> kanal natrium membuka -> Na+ masuk -> sinyal merambat ke sumsum tulang belakang dan otak; lalu pada jalur saraf YANG SAMA obat bius lokal menembus membran, menghambat kanal natrium dari dalam, sinyal berhenti di area itu sementara Raka tetap sadar; kemudian lokal / regional / total dan master outro (16,2 dtk).

**Hasil**: `bius-lokal-mekanisme_final.mp4` · cover `cover/cover.png` · takarir `takarir.srt/.vtt` · `NASKAH.md` · `SUMBER.md` · `QA.md` · cuplikan `still/`.

## Struktur (dapat diedit)
- `stage/scenes.js` menyusun adegan; `stage/nerve.js` (satu model saraf: akson, membran, kanal, Na+, gelombang, obat, sumsum tulang belakang, otak), `sB.js` (proses normal dan setelah obat, kamera dan label), `sA.js` (adegan Raka: hook, berpikir, bukti, lokal, regional, total, ringkasan), `common.js` (label, Raka).
- `tools/build_cues.py` -> `cues.json` + takarir. `audio/audio_mix.py` — suara/musik/efek tiga jalur. `encode.sh` — encode edukasi lalu tempel master outro.
## Membuat ulang
```
python3 -m http.server 8135   # dari akar repo
python3 video/bius-lokal-mekanisme/tools/build_cues.py && python3 video/bius-lokal-mekanisme/audio/audio_mix.py
cd video/bius-lokal-mekanisme && node render.mjs out/fr 0 1785 4 && ./encode.sh
node cover/make_cover.cjs
```
