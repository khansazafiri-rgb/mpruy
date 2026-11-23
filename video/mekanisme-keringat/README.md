# Mekanisme tubuh berkeringat
Video edukasi vertikal MEDCOEL (1080x1920, 30 fps, 83,2 dtk): suhu naik -> hipotalamus -> saraf simpatis -> asetilkolin -> kelenjar ekrin -> cairan dibuat di gulungan -> garam diserap kembali -> pori -> penguapan membawa panas (dan udara lembap menghambatnya) -> hiperhidrosis vs hipohidrosis/anhidrosis -> heat stroke bisa tetap berkeringat -> master outro (16,2 dtk).

**Hasil**: `mekanisme-keringat_final.mp4` · cover `cover/cover.png` · takarir `takarir.srt/.vtt` · `NASKAH.md` · `SUMBER.md` · `QA.md` · cuplikan `still/`.

## Struktur (dapat diedit)
- `stage/scenes.js` menyusun adegan; `stage/sA.js` (hook), `sB.js` (peta tubuh), `sC.js` (penampang kulit), `sD.js` (penguapan + udara lembap), `sF.js` (dua gangguan + heat stroke), `common.js` (palet, label, termometer, tetes). Kode warna tetap: sinyal/asetilkolin emas, cairan biru muda, garam teal, panas koral.
- `tools/build_cues.py` -> `cues.json` + takarir. `audio/audio_mix.py` — suara/musik/efek tiga jalur. `encode.sh` — encode edukasi lalu tempel master outro.
## Membuat ulang
```
python3 -m http.server 8135   # dari akar repo
python3 video/mekanisme-keringat/tools/build_cues.py && python3 video/mekanisme-keringat/audio/audio_mix.py
cd video/mekanisme-keringat && node render.mjs out/fr 0 2009 4 && ./encode.sh
node cover/make_cover.cjs
```
