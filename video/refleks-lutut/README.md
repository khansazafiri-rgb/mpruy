# Kenapa lutut diketuk, kaki bergerak?
Video edukasi vertikal MEDCOEL (1080x1920, 30 fps, **45,60 dtk**): Raka resmi duduk di tepi kursi, dokter mengetuk tendon patela, dan rantai refleks lutut dijawab secara visual: **ketukan pada tendon patela → otot paha depan teregang sesaat → sensor regang mengirim sinyal lewat saraf sensorik (teal) ke sumsum tulang belakang → sinyal motorik (jingga) kembali → otot paha depan berkontraksi → tungkai bawah terangkat**. Ditutup "REFLEKS LUTUT" (rangkaian empat langkah), perbandingan kedua lutut yang diperiksa (tanpa hasil), dan **master outro MEDCOEL utuh (16,20 dtk)**. Kerangka kerja sama dengan `video/mekanisme-varises`, `video/cegukan-hik`, dan `video/bawang-mata-berair`.

**Hasil**: `refleks-lutut_final.mp4` · cover `cover/cover.png` · takarir `takarir.srt/.vtt` · `NASKAH.md` · `SUMBER.md` · `QA.md` · cuplikan `still/`.

| Bagian | Detik | Isi |
|---|---|---|
| Edukasi | 0 - 29,4 | Narasi Google AI Studio asli utuh (27,85 dtk; seluruhnya naskah edukasi, narator selesai 27,4 dtk) + ekor penutup bersih 1,55 dtk |
| Master outro | 29,4 - 45,6 | `brand/video/outro/medcoel-outro-master.mp4`, ditempel utuh satu kali (potongan keras ke frame Atlas 3D) |

## Peta ruang (satu orientasi di seluruh video)
Raka duduk tampak samping tiga perempat, **menghadap kanan layar**; paha mendatar di kiri lutut, tungkai bawah menggantung ke bawah dan terayun maju (kanan) saat refleks; lutut yang diperiksa selalu lutut dekat-kamera. Karena duduk, "paha di atas, tungkai di bawah" pada anatomi muncul sebagai **paha mendatar di kiri lutut dan tungkai ke bawah** (orientasi tidak diputar saat kamera masuk). Punggung/tulang belakang di kiri badan; saraf sensorik masuk ke sumsum dari kanan-bawah dan saraf motorik kembali lewat jalur yang sama. Dokter hanya tampak sebagai lengan jas, tangan, dan palu dari kanan layar.

## Struktur (dapat diedit)
- `stage/` panggung HTML/SVG deterministik: `seat.js` (kursi, ruang, kinematika ayunan tungkai dari lutut, palu + lengan dokter), `anat.js` (otot paha depan, tendon patela, tulang, jalur saraf, tulang belakang), `insets.js` (inset besar: sensor regang di dalam otot, penampang sumsum tulang belakang), `sHook.js` (hook), `sBody.js` (ketukan → ... → tungkai terangkat), `sEnd.js` (REFLEKS LUTUT + perbandingan kedua lutut), `scenes.js`, `common.js`/`lib.js`/`core.js`.
- **Raka**: hanya lewat `rakaSvg()` dari `brand/characters/raka/raka.js`. Untuk duduk, `raka.js` diperluas (kompatibel ke belakang, SVG lama tidak berubah): parameter kaki `sit`/`kneeX`/`kneeY`/`foot` (kurva kaki melewati lutut, seperti siku pada lengan) dan pose baru `duduk`; tes baru di `raka.test.mjs`, SVG statis `raka-duduk.svg`, README Raka diperbarui.
- `tools/build_cues.py` → `cues.json` (waktu kata, takarir) + `takarir.srt/.vtt`.
- `audio/audio_mix.py` → narasi + musik + efek → `audio/mix.wav` (29,4 dtk, -14,3 LUFS). `audio/sumber-asli.wav` = audio asli dari pemesan (tidak diubah). `audio/asr.json` = waktu kata hasil ASR.
- `render.mjs`, `encode.sh`, `shot.cjs`, `cover/make_cover.cjs`.

## Membuat ulang
```bash
python3 -m http.server 8135            # dari akar repo
python3 video/refleks-lutut/tools/build_cues.py && python3 video/refleks-lutut/audio/audio_mix.py
node video/refleks-lutut/render.mjs video/refleks-lutut/out/fr 0 881 4 && video/refleks-lutut/encode.sh
node video/refleks-lutut/cover/make_cover.cjs
```
Butuh Node + Playwright (Chromium), ffmpeg, Python 3 dengan numpy dan scipy (`faster-whisper` hanya untuk `audio/asr.py`).
