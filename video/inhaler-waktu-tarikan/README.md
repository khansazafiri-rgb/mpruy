# Kenapa waktu menekan inhaler penting?
Video edukasi vertikal MEDCOEL (1080x1920, 30 fps, 68,4 dtk): inhaler dosis terukur — semprot terlalu awal vs bersamaan dengan awal tarikan napas, partikel mengikuti aliran udara ke saluran napas, contoh salbutamol pada reseptor beta-2 otot saluran napas, lalu master outro baku (16,2 dtk).

**Hasil**: `inhaler-waktu-tarikan_final.mp4` · cover `cover/cover.png` · takarir `takarir.srt/.vtt` · `NASKAH.md` · `SUMBER.md` · `QA.md` · cuplikan `still/`.

## Struktur (dapat diedit)
- `stage/scenes.js` — semua adegan (hook, shot dekat jari, penampang inhaler, saluran napas, penampang aksial, ringkasan, jenis inhaler). Kode warna tetap: obat kuning-oranye, aliran udara biru muda, otot merah muda tua, reseptor ungu.
- `tools/build_cues.py` -> `cues.json` (waktu kalimat/kata, takarir). `audio/audio_mix.py` — suara/musik/SFX tiga jalur. `encode.sh` — encode edukasi lalu tempel master outro.
## Membuat ulang
```
python3 -m http.server 8135   # dari akar repo
python3 video/inhaler-waktu-tarikan/tools/build_cues.py && python3 video/inhaler-waktu-tarikan/audio/audio_mix.py
cd video/inhaler-waktu-tarikan && node render.mjs out/fr 0 1565 4 && ./encode.sh
node cover/make_cover.cjs
```
