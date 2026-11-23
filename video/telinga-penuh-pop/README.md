# Telinga penuh lalu "pop" saat pesawat turun
Video edukasi vertikal MEDCOEL (1080x1920, 30 fps, 49,7 dtk): Raka di pesawat yang turun -> masuk ke penampang telinga -> tekanan luar naik, gendang terdorong ke telinga tengah -> menelan/menguap membuka tuba Eustachius, udara masuk, tekanan seimbang, "pop" -> saat pilek tuba membengkak sehingga lebih sulit seimbang -> perbandingan dan master outro (16,2 dtk).

**Hasil**: `telinga-penuh-pop_final.mp4` · cover `cover/cover.png` · takarir `takarir.srt/.vtt` · `NASKAH.md` · `SUMBER.md` · `QA.md` · cuplikan `still/`.

## Struktur (dapat diedit)
- `stage/scenes.js` menyusun adegan; `stage/sA.js` (kabin + Raka: hook, menelan, lega), `sB.js` (penampang: tekanan, tuba terbuka + pop, pilek, perbandingan), `ear.js` (penampang telinga, partikel udara, batang tekanan), `common.js` (label, Raka). Warna: jingga = tekanan/udara luar, biru = telinga tengah.
- `tools/build_cues.py` -> `cues.json` + takarir. `audio/audio_mix.py` — suara/musik/efek tiga jalur. `encode.sh` — encode edukasi lalu tempel master outro.
## Membuat ulang
```
python3 -m http.server 8135   # dari akar repo
python3 video/telinga-penuh-pop/tools/build_cues.py && python3 video/telinga-penuh-pop/audio/audio_mix.py
cd video/telinga-penuh-pop && node render.mjs out/fr 0 1004 4 && ./encode.sh
node cover/make_cover.cjs
```
