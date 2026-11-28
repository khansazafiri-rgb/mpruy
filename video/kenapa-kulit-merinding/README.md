# Kenapa kulit merinding saat dingin?
Video edukasi vertikal MEDCOEL (1080x1920, 30 fps, 69,1 dtk): angin dingin menerpa Raka -> kulit mendeteksi dingin -> saraf simpatik mencapai folikel -> otot arrector pili (di samping folikel) berkontraksi -> pangkal rambut tertarik, batang lebih tegak, kulit sedikit terangkat = merinding; bandingan dengan hewan berbulu tebal (lapisan udara) dan manusia (rambut sedikit, bukan cara utama menghangatkan); respons lain (aliran darah ke kulit berkurang, menggigil); master outro (16,2 dtk) tepat sekali.

**Hasil**: `kenapa-kulit-merinding_final.mp4` · cover `cover/cover.png` · takarir `takarir.srt/.vtt` · `NASKAH.md` · `SUMBER.md` · `QA.md` · cuplikan `still/`.

## Struktur (dapat diedit)
- `stage/scenes.js` menyusun adegan; `stage/skin.js` (satu penampang kulit: epidermis, folikel, otot, saraf sensorik/simpatik, pusat kontrol, tonjolan), `sB.js` (deteksi dingin, jalur simpatik, satu unit folikel, label dan kamera), `sA.js` (adegan Raka: hook, kulit luar, respons lain), `sC.js` (hewan vs manusia), `common.js` (label, Raka).
- `tools/build_cues.py` -> `cues.json` + takarir (`tools/asr.py` -> `audio/asr.json`). `audio/audio_mix.py` — suara/musik/efek tiga jalur. `encode.sh` — encode edukasi lalu tempel master outro.
## Membuat ulang
```
python3 -m http.server 8135   # dari akar repo
python3 video/kenapa-kulit-merinding/tools/build_cues.py && python3 video/kenapa-kulit-merinding/audio/audio_mix.py
cd video/kenapa-kulit-merinding && node render.mjs out/fr 0 1587 4 && ./encode.sh
node cover/make_cover.cjs
```
