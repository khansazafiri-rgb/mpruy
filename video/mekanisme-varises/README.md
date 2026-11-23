# Mekanisme varises
Video edukasi vertikal MEDCOEL (1080x1920, 30 fps, 45,6 dtk): satu pertanyaan visual ("kok darah di kaki turun lagi?") yang perlahan terjawab: darah sebagian berbalik di katup vena yang lemah -> berkumpul -> vena melebar dan berkelok seiring waktu -> varises; ditutup perbandingan katup menutup rapat vs tidak rapat dan master outro (16,2 dtk).

**Hasil**: `mekanisme-varises_final.mp4` · cover `cover/cover.png` · takarir `takarir.srt/.vtt` · `NASKAH.md` · `SUMBER.md` · `QA.md` · cuplikan `still/`.

## Struktur (dapat diedit)
- `stage/scenes.js` menyusun adegan; `stage/sA.js` (hook + model kaki), `sB.js` (mekanisme katup, perbandingan), `sC.js` (pelebaran + letak varises), `vein.js` (vena, katup, sel darah, aliran), `common.js` (label, Raka). Kode warna: panah teal = naik ke jantung, jingga = berbalik, sel darah merah satu bentuk, daun katup emas.
- `tools/build_cues.py` -> `cues.json` + takarir. `audio/audio_mix.py` — suara/musik/efek tiga jalur. `encode.sh` — encode edukasi lalu tempel master outro.
## Membuat ulang
```
python3 -m http.server 8135   # dari akar repo
python3 video/mekanisme-varises/tools/build_cues.py && python3 video/mekanisme-varises/audio/audio_mix.py
cd video/mekanisme-varises && node render.mjs out/fr 0 881 4 && ./encode.sh
node cover/make_cover.cjs
```
