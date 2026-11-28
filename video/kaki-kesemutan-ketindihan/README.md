# Kenapa kaki kesemutan setelah ketindihan?
Video edukasi vertikal MEDCOEL (1080x1920, 30 fps, **65,40 dtk**): Raka berdiri setelah duduk menyilang → kamera masuk ke **titik tekanan di tungkai bawah kaki R** → penampang betis: **saraf (pulsa ke otak) dan pembuluh darah (sel darah merah) sebagai dua struktur terpisah** → normal → **tertekan** (kulit melesak, aliran berkurang, sinyal terganggu, tidak ada saraf putus atau pembuluh tertutup) → kebas → **tekanan hilang, suplai dan saraf pulih, sinyal tidak teratur ("kesemutan") lalu stabil** → Raka menapak nyaman, "MENETAP ATAU BERULANG? PERLU DINILAI" → **master outro MEDCOEL utuh (16,20 dtk)**.

**Hasil**: `kaki-kesemutan-ketindihan_final.mp4` · cover `cover/cover.png` · takarir `takarir.srt/.vtt` · `NASKAH.md` · `SUMBER.md` · `QA.md` · cuplikan `still/`.

| Bagian | Detik | Isi |
|---|---|---|
| Edukasi | 0 - 49,2 | Narasi Google AI Studio asli utuh (47,74 dtk; seluruhnya naskah edukasi) + ekor penutup bersih 1,46 dtk |
| Master outro | 49,2 - 65,4 | `brand/video/outro/medcoel-outro-master.mp4`, ditempel utuh satu kali (potongan keras) |

## Konvensi tetap
Kaki yang terkena = **kaki R (dekat kamera)**; sinyal saraf = teal, selalu ke **kiri** (kaki → otak); darah = merah, di pembuluh terpisah (ke kanan); tekanan = koral; kesemutan = amber. Penampang memakai skala dan sudut yang sama di semua keadaan; kartu NORMAL kecil dan kartu lokasi (kaki R + titik tekanan) mendampinginya.

## Struktur (dapat diedit)
- `stage/` panggung HTML/SVG deterministik: `tissue.js` (penampang, tekanan/aliran/fungsi sebagai fungsi waktu, sel darah, pulsa, percikan), `sTissue.js` (adegan penampang + label + kartu), `outer.js` (hook, kebas/tekanan hilang, penutup), `seat.js` (peta ruang, silangan kaki, titik tekan), `scenes.js`, `common.js`/`lib.js`/`core.js`. Raka **hanya** lewat `rakaSvg()` dari `brand/characters/raka/raka.js` (tidak diubah).
- `tools/build_cues.py` → `cues.json` + `takarir.srt/.vtt`.
- `audio/audio_mix.py` → narasi + musik + efek → `audio/mix.wav` (49,2 dtk, -14,4 LUFS). `audio/sumber-asli.wav` = audio asli dari pemesan (tidak diubah). `audio/asr.json` = waktu kata hasil ASR.
- `render.mjs`, `encode.sh`, `shot.cjs`, `cover/make_cover.cjs`.

## Membuat ulang
```bash
python3 -m http.server 8135            # dari akar repo
python3 video/kaki-kesemutan-ketindihan/tools/build_cues.py && python3 video/kaki-kesemutan-ketindihan/audio/audio_mix.py
node video/kaki-kesemutan-ketindihan/render.mjs video/kaki-kesemutan-ketindihan/out/fr 0 1475 4 && video/kaki-kesemutan-ketindihan/encode.sh
node video/kaki-kesemutan-ketindihan/cover/make_cover.cjs
```
Butuh Node + Playwright (Chromium), ffmpeg, Python 3 dengan numpy dan scipy (`faster-whisper` hanya untuk `audio/asr.py`).
