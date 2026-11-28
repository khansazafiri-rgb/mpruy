# Kenapa masih terasa berputar setelah berhenti?
Video edukasi vertikal MEDCOEL (1080x1920, 30 fps, **67,80 dtk**): Raka berputar lalu berhenti dengan latar yang masih bergeser → lensa masuk ke **model saluran setengah lingkaran di telinga dalam** (tampak atas, orientasi tetap) → **dinding berputar searah jarum jam, cairan tertinggal (inersia) → kupula dan sel rambut membengkok → saraf mengirim sinyal ke otak** → putaran berlanjut: sinyal melemah → **berhenti mendadak: dinding berhenti, cairan masih bergerak, kupula membengkok ke arah sebaliknya (dua gambar kecil sebelum/sesudah berhenti)** → otak mengira kepala masih berputar → cairan tenang, sensasi mereda → **master outro MEDCOEL utuh (16,20 dtk)**.

**Hasil**: `masih-berputar-setelah-berhenti_final.mp4` · cover `cover/cover.png` · takarir `takarir.srt/.vtt` · `NASKAH.md` · `SUMBER.md` · `QA.md` · cuplikan `still/`.

| Bagian | Detik | Isi |
|---|---|---|
| Edukasi | 0 - 51,6 | Narasi Google AI Studio asli utuh (50,21 dtk; seluruhnya naskah edukasi) + ekor penutup bersih 1,39 dtk |
| Master outro | 51,6 - 67,8 | `brand/video/outro/medcoel-outro-master.mp4`, ditempel utuh satu kali (potongan keras) |

## Konvensi tetap
Arah putar: **searah jarum jam dilihat dari atas** (Raka: muka menoleh ke kiri layar dulu; model: dinding bergerak searah jarum jam pada cincin tampak atas). Warna: koral = gerak kepala/dinding, biru = gerak cairan, emas = kupula, merah muda = sel rambut, teal = sinyal saraf, ungu = rasa berputar. Satu model saluran di seluruh video; panel pembesaran (ampula) memakai arah yang sama (kanan = searah jarum jam). Tanpa BPPV/kristal telinga, tanpa angka detik.

## Struktur (dapat diedit)
- `stage/` panggung HTML/SVG deterministik: `model.js` (kinematika dinding, cairan, kupula, denyut sinyal; sumber tunggal), `canal.js` (cincin saluran, panel kupula/sel rambut, saraf, otak, kartu sebelum/sesudah), `hook.js` (Raka berputar, ruang yang bergeser), `spin.js` (putaran 2D Raka), `scenes.js` (urutan, label, kamera, lensa), `common.js`/`lib.js`/`core.js`. Raka **hanya** lewat `rakaSvg()` dari `brand/characters/raka/raka.js` (tidak diubah).
- `tools/build_cues.py` → `cues.json` (waktu kata, takarir) + `takarir.srt/.vtt`.
- `audio/audio_mix.py` → narasi + musik + efek → `audio/mix.wav` (51,6 dtk, ≈ -14,6 LUFS). `audio/sumber-asli.wav` = audio asli dari pemesan (tidak diubah). `audio/asr.json` = waktu kata hasil ASR.
- `render.mjs`, `encode.sh`, `shot.cjs`, `cover/make_cover.cjs`.

## Membuat ulang
```bash
python3 -m http.server 8135            # dari akar repo
python3 video/masih-berputar-setelah-berhenti/tools/build_cues.py && python3 video/masih-berputar-setelah-berhenti/audio/audio_mix.py
node video/masih-berputar-setelah-berhenti/render.mjs video/masih-berputar-setelah-berhenti/out/fr 0 1547 4 && video/masih-berputar-setelah-berhenti/encode.sh
node video/masih-berputar-setelah-berhenti/cover/make_cover.cjs
```
Butuh Node + Playwright (Chromium), ffmpeg, Python 3 dengan numpy dan scipy (`faster-whisper` hanya untuk `audio/asr.py`).
