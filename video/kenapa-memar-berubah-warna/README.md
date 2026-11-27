# Kenapa memar berubah warna?
Video edukasi vertikal MEDCOEL (1080x1920, 30 fps, **46,20 dtk**): satu memar yang sama dari benturan sampai memudar. Raka resmi berjalan dan tulang keringnya membentur sudut meja → kamera masuk ke titik benturan → **pembuluh darah kecil di bawah kulit cedera → darah merembes ke jaringan sementara kulit tetap utuh → darah terperangkap → sel pembersih menguraikan komponen darah termasuk hemoglobin → pigmen dan warna permukaan berubah** (kemerahan/keunguan → kehijauan → kekuningan → memudar) → kamera keluar ke Raka dan perbandingan dua warna kulit ("TIDAK SELALU SAMA") → **master outro MEDCOEL utuh (16,20 dtk)**. Kerangka kerja sama dengan `video/mekanisme-varises`, `video/cegukan-hik`, `video/bawang-mata-berair`.

**Hasil**: `kenapa-memar-berubah-warna_final.mp4` · cover `cover/cover.png` · takarir `takarir.srt/.vtt` · `NASKAH.md` · `SUMBER.md` · `QA.md` · cuplikan `still/`.

| Bagian | Detik | Isi |
|---|---|---|
| Edukasi | 0 - 30,0 | Narasi Google AI Studio asli utuh (28,46 dtk; seluruhnya naskah edukasi, narator selesai 28,0 dtk) + ekor penutup bersih 1,54 dtk |
| Master outro | 30,0 - 46,2 | `brand/video/outro/medcoel-outro-master.mp4`, ditempel utuh satu kali (potongan keras ke frame Atlas 3D) |

## Peta ruang (satu area memar di seluruh video)
Area memar = **sisi luar tungkai bawah kaki dekat-kamera** (kaki R di `raka.js`), pada u = 0,72 sepanjang kurva kaki dari pinggul ke pergelangan; Raka berjalan ke kanan dan sudut meja membentur tulang keringnya. Penampang kulit di bawah titik itu: **permukaan kulit di atas, jaringan di bawah, pembuluh kecil di dalam jaringan**; tampak luar (kartu kulit) dan potongan sejajar pada x yang sama, dihubungkan garis putus-putus. Peralihan lensa selalu berpusat di bercak itu. Warna permukaan (kaki Raka, kartu kulit) dan warna pigmen di jaringan memakai satu tabel (`stage/bruise.js`), sehingga selalu cocok. Warna dan perubahannya **ilustratif, tanpa hari, jam, atau angka**.

## Struktur (dapat diedit)
- `stage/` panggung HTML/SVG deterministik: `room.js` (ruang tamu, meja, Raka berjalan, benturan, lipatan celana + bercak pada kaki, hook), `tissue.js` (lapisan kulit, pembuluh, sel darah merah, cedera, perembesan, sel pembersih, pigmen, kartu tampak luar), `sTissue.js` (adegan penampang + label + garis waktu), `sEnd.js` (Raka keluar, perbandingan dua warna kulit), `bruise.js` (tabel warna), `scenes.js`, `common.js`/`lib.js`/`core.js`. Raka **hanya** lewat `rakaSvg()` dari `brand/characters/raka/raka.js` (tidak diubah): `walkCycle`, `legShape` (letak bercak mengikuti kurva kaki), ekspresi `kaget`, `khawatir`, `berpikir`, `lega`.
- `tools/build_cues.py` → `cues.json` (waktu kata, takarir) + `takarir.srt/.vtt`.
- `audio/audio_mix.py` → narasi + musik + efek → `audio/mix.wav` (30,0 dtk, -14,4 LUFS). `audio/sumber-asli.wav` = audio asli dari pemesan (tidak diubah). `audio/asr.json` = waktu kata hasil ASR.
- `render.mjs`, `encode.sh`, `shot.cjs`, `cover/make_cover.cjs`.

## Membuat ulang
```bash
python3 -m http.server 8135            # dari akar repo
python3 video/kenapa-memar-berubah-warna/tools/build_cues.py && python3 video/kenapa-memar-berubah-warna/audio/audio_mix.py
node video/kenapa-memar-berubah-warna/render.mjs video/kenapa-memar-berubah-warna/out/fr 0 899 4 && video/kenapa-memar-berubah-warna/encode.sh
node video/kenapa-memar-berubah-warna/cover/make_cover.cjs
```
Butuh Node + Playwright (Chromium), ffmpeg, Python 3 dengan numpy dan scipy (`faster-whisper` hanya untuk `audio/asr.py`).
