# Cegukan: kenapa bunyinya "hik"?
Video edukasi vertikal MEDCOEL (1080x1920, 30 fps, **46,20 dtk**): satu pertanyaan visual ("kenapa bunyinya 'hik'?") yang dijawab lewat urutan **diafragma berkontraksi mendadak → pita suara menutup cepat → bunyi "hik"**, lalu pemicu (makan terlalu cepat, perut terlalu penuh, atau tanpa sebab jelas), ringkasan tiga ikon, dan **master outro MEDCOEL utuh (16,20 dtk)**. Kerangka kerja sama dengan `video/dunia-tanpa-oralit` dan `video/mekanisme-varises`.

**Hasil**: `cegukan-hik_final.mp4` · cover `cover/cover.png` · takarir `takarir.srt/.vtt` · `NASKAH.md` · `SUMBER.md` · `QA.md` · cuplikan `still/`.

| Bagian | Detik | Isi |
|---|---|---|
| Edukasi | 0 - 30,0 | Narasi Google AI Studio asli 0 - 27,8 dtk (dipotong di jeda alami sesudah "penyebab yang jelas.") + ekor ringkasan tanpa suara 2,2 dtk |
| Master outro | 30,0 - 46,2 | `brand/video/outro/medcoel-outro-master.mp4`, ditempel utuh satu kali (potongan keras dari frame terakhir edukasi ke frame Atlas 3D) |

## Struktur (dapat diedit)
- `stage/` panggung HTML/SVG deterministik: `anat.js` (penampang dada-perut, diafragma, laring + pita suara, peta mini), `sHook.js` (Raka belajar, cegukan, pensil terlempar), `sBody.js` (diafragma → kamera mengikuti jalur udara → pita suara, label, gelembung "HIK!"), `sEnd.js` (dua kartu pemicu, cegukan tanpa sebab, tiga ikon), `scenes.js` (urutan adegan + peralihan lensa), `common.js`/`lib.js`/`core.js` (pembantu). Raka **hanya** lewat `rakaSvg()` dari `brand/characters/raka/raka.js` (ekspresi dan pose: netral, kaget, berpikir, menunjuk, lapar, khawatir, lega; transisi dengan `lerpState`).
- `tools/build_cues.py` → `cues.json` (waktu kata, takarir) + `takarir.srt/.vtt`.
- `audio/audio_mix.py` → narasi (dipotong) + musik + efek → `audio/mix.wav` (30,0 dtk, -14,6 LUFS). `audio/sumber-asli.wav` = audio asli dari pemesan (tidak diubah). `audio/asr.json` = waktu kata hasil ASR.
- `render.mjs` (frame JPEG lewat Chromium), `encode.sh` (edukasi + tempel master), `shot.cjs` (satu/ beberapa frame uji), `cover/make_cover.cjs`.

## Membuat ulang
```bash
python3 -m http.server 8135            # dari akar repo
python3 video/cegukan-hik/tools/build_cues.py && python3 video/cegukan-hik/audio/audio_mix.py
node video/cegukan-hik/render.mjs video/cegukan-hik/out/fr 0 899 4 && video/cegukan-hik/encode.sh
node video/cegukan-hik/cover/make_cover.cjs
```
Butuh Node + Playwright (Chromium), ffmpeg, Python 3 dengan numpy dan scipy (`faster-whisper` hanya untuk `audio/asr.py`).
