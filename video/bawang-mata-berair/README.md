# Kenapa bawang bikin mata berair?
Video edukasi vertikal MEDCOEL (1080x1920, 30 fps, **41,60 dtk**): Raka resmi memotong bawang dan matanya berair, lalu rantai sebab-akibat dijawab secara visual: **sel bawang terpotong → isi sel bertemu (enzim + bahan reaksi) → terbentuk senyawa iritan yang mudah menguap → iritan naik dari bawang dan mencapai permukaan mata → kelenjar air mata (atas, sisi luar mata) menghasilkan lebih banyak air mata yang membilas iritan**. Ditutup ringkasan empat tahap dan **master outro MEDCOEL utuh (16,20 dtk)**. Kerangka kerja sama dengan `video/dunia-tanpa-oralit`, `video/mekanisme-varises`, dan `video/cegukan-hik`.

**Hasil**: `bawang-mata-berair_final.mp4` · cover `cover/cover.png` · takarir `takarir.srt/.vtt` · `NASKAH.md` · `SUMBER.md` · `QA.md` · cuplikan `still/`.

| Bagian | Detik | Isi |
|---|---|---|
| Edukasi | 0 - 25,4 | Narasi Google AI Studio asli 0 - 23,1 dtk (dipotong di jeda alami sesudah "respons perlindungan tubuh.", paragraf promosi lama dibuang) + ekor ringkasan 2,3 dtk |
| Master outro | 25,4 - 41,6 | `brand/video/outro/medcoel-outro-master.mp4`, ditempel utuh satu kali (potongan keras ke frame Atlas 3D) |

**Catatan durasi**: bagian edukasi pada audio yang diberikan hanya 23,1 dtk (sisa 33,95 dtk adalah paragraf promosi lama), jadi total 41,6 dtk, di bawah perkiraan 46 - 52 dtk di brief. Audio tidak dipanjangkan, dijeda ulang, atau diganti; bila perlu ~46 dtk, berikan audio edukasi yang lebih panjang.

## Peta ruang (satu orientasi di seluruh video)
Dapur: Raka di sisi **kiri** layar menghadap kanan, bawang di talenan sisi **kanan**; "naik" di layar = arah menuju mata Raka. Penampang sel: permukaan potongan di atas, iritan keluar ke atas. Penampang mata: sudut dalam (hidung) di kiri, sisi luar di kanan; iritan datang dari kanan-bawah (arah bawang). Iritan selalu berawal dari irisan bawang, tidak pernah dari tangan atau mata.

## Struktur (dapat diedit)
- `stage/` panggung HTML/SVG deterministik: `sKitchen.js` (dapur, pisau, bawang, rute partikel, Raka, hook + perjalanan partikel), `sCell.js` (penampang sel bawang), `sEye.js` (penampang mata, kelenjar, aliran air mata), `sEnd.js` (wajah Raka + empat tahap), `scenes.js` (urutan + peralihan lensa), `common.js`/`lib.js`/`core.js` (pembantu). Raka **hanya** lewat `rakaSvg()` dari `brand/characters/raka/raka.js` (ekspresi `netral`, `perih`, `khawatir`, `lega`; pose `usap_mata`, `menunjuk`; air mata lewat `tears`/`tearsT`; transisi dengan `lerpState`).
- `tools/build_cues.py` → `cues.json` (waktu kata, takarir) + `takarir.srt/.vtt`.
- `audio/audio_mix.py` → narasi (dipotong) + musik + efek → `audio/mix.wav` (25,4 dtk, -14,5 LUFS). `audio/sumber-asli.wav` = audio asli dari pemesan (tidak diubah). `audio/asr.json` = waktu kata hasil ASR.
- `render.mjs` (frame JPEG lewat Chromium), `encode.sh` (edukasi + tempel master), `shot.cjs` (frame uji), `cover/make_cover.cjs`.

## Membuat ulang
```bash
python3 -m http.server 8135            # dari akar repo
python3 video/bawang-mata-berair/tools/build_cues.py && python3 video/bawang-mata-berair/audio/audio_mix.py
node video/bawang-mata-berair/render.mjs video/bawang-mata-berair/out/fr 0 761 4 && video/bawang-mata-berair/encode.sh
node video/bawang-mata-berair/cover/make_cover.cjs
```
Butuh Node + Playwright (Chromium), ffmpeg, Python 3 dengan numpy dan scipy (`faster-whisper` hanya untuk `audio/asr.py`).
