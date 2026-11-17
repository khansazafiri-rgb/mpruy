# Ada cairan di sekitar jantung? — promosi MEDCOEL Live 4D Lab, skenario Efusi perikardial (29,6 dtk, 1080×1920, 30 fps)

Video edukasi vertikal dari **lima rekaman asli Live 4D Lab** (`src/`): `00_rekaman_konteks_4d_lab` (tampilan utuh), `01_skenario_efusi_perikardial`, `02_probe_di_area_jantung`, `03_probe_dan_citra_bergerak`, `04_citra_jantung_closeup`. Yang dilakukan hanya: memotong, memperbesar, memperlambat (0,58–0,8×), menumpuk dua tampilan, sorotan, dan teks. **Tidak ada UI, organ, cairan, atau hasil scan buatan.**

Hasil: `efusi-perikardial-live-4d-lab.mp4` (H.264 + AAC, ≈ −15,0 LUFS, puncak −1,4 dBFS). Cover: `cover/cover.png` (+ `cover-panduan-area-aman.png`, `cover-360px.png`). Bingkai kunci 360 px: `still/`.

## Voice-over
Voice-over Google AI Studio dari pemesan (`audio/voiceover.wav`, 29,08 dtk) dipakai apa adanya; tidak ada TTS buatan saya. ASR kata-per-kata: `audio/voiceover-asr.json`; visual disinkronkan lewat `cues.json`. Pelafalan di audio: "Metcoil" untuk MEDCOEL (dua kali, termasuk "metcoil.com"), "effusi", "ban belajar" (kemungkinan "bahan belajar"), dan transkripsi mendengar "tampon ada" untuk "tamponade". Teks layar memakai ejaan benar ("MEDCOEL", "tamponade", "bahan belajar"); cek ulang pelafalan saat memutar.

## Alur, sinkron dengan kata voice-over
| Detik | Voice-over | Visual (sumber) | Teks layar |
|---|---|---|---|
| 0–6,6 | "Jantung punya selaput pembungkus bernama perikardium. Apa yang terjadi kalau cairan terkumpul di ruang ini?" | Citra CT sintetis jantung bergerak sejak frame pertama (04, 0,8×) | ADA CAIRAN DI SEKITAR JANTUNG? · PERIKARDIUM = selaput pembungkus jantung (0,9–3,3) |
| 6,6–10,9 | "Di Live 4D Lab MEDCOEL, pilih skenario efusi perikardial." | Panel Patologi dengan skenario "Efusi perikardial (sedang)" terpilih, kursor menyentuh kartu (01, 0,58×; lalu bingkai terakhir ditahan dengan zoom halus); klik kecil di 7,6 | EFUSI PERIKARDIAL |
| 10,9–13,4 | "Lihat posisi jantung pada model tubuh…" | Atas: model 3D dengan probe (cincin emas); bawah: citra CT sintetis dari bingkai yang sama (00, awal klip, diperlambat lalu bingkai terakhir ditahan) | CAIRAN DI RUANG SEKITAR JANTUNG · POSISI PROBE |
| 13,4–17,0 | "…lalu amati ruang di sekitarnya pada tampilan CT sintetis." | Close-up citra CT sintetis (04); **penanda tipis** mengikuti lapisan abu-abu yang mengelilingi jantung, bergerak per bingkai | CAIRAN DI RUANG SEKITAR JANTUNG · Penanda mengikuti lapisan abu-abu di sekitar jantung |
| 17,0–20,9 | "Cairan yang banyak atau terbentuk cepat bisa mengganggu pengisian jantung." | Close-up CT yang sama dengan penanda (04) | Cairan banyak atau terbentuk cepat bisa mengganggu pengisian jantung |
| 20,9–23,8 | "Tapi simulasi ini tidak menilai tamponade." | Teks asli panel Patologi di aplikasi diperbesar dan disorot: "Haemodynamic effects (tamponade physiology) are NOT modelled." (01, bingkai terakhir) | Dampak hemodinamik tidak dimodelkan · Tidak menilai tamponade |
| 23,8–26,2 | "Ini bahan belajar, bukan alat diagnosis." | Citra CT diredupkan dengan label besar | Simulasi edukatif • CT sintetis • bukan alat diagnosis |
| 26,2–29,6 | "Eksplorasi gratis di MEDCOEL.com." | Tampilan asli Live 4D Lab penuh, masih bergerak (00, 13,4–16,6), logo MEDCOEL | COBA LIVE 4D LAB GRATIS · Eksplorasi patologi gratis di medcoel.com |

Label kecil "Simulasi edukatif • CT sintetis • bukan alat diagnosis" tampil di setiap bagian sepanjang video.

## Pemeriksaan fakta dan batas klaim
- **Bukan CT pasien:** panel di aplikasi berjudul "CT REFORMAT" dan "CT SINTETIS dari Atlas MEDCOEL · bukan citra pasien"; video tidak menyebut citra ini CT pasien, USG, atau hasil pemeriksaan.
- **Tidak menyimpulkan tamponade:** video hanya menyebut kalimat umum dari voice-over ("cairan banyak/cepat bisa mengganggu pengisian jantung") dan menegaskan dari teks aplikasi sendiri bahwa fisiologi tamponade **tidak dimodelkan**.
- **Penanda "ruang sekitar jantung":** bukan digambar tangan. `tools/masks.py` membaca piksel bingkai klip 04 dan memilih lapisan abu-abu (nilai ≈95) yang mengelilingi jantung (ketebalan model ±9 mm menurut deskripsi aplikasi), per bingkai (`data/masks/`), sehingga mengikuti gambar. Mask sedikit tidak lengkap di sisi kanan atas (dekat tulang dada) karena piksel di situ bergaris-garis; bagian itu sengaja tidak ditebak.
- **Posisi probe:** pada klip 02 dan 03 yang terlihat di model 3D adalah **stetoskop** (panel Auskultasi terbuka), bukan transduser. Posisi probe diambil dari awal klip 00 (panel "Gerakkan probe", epigastrium) sebelum panel Auskultasi muncul. Klip 02/03 tidak dipakai untuk menampilkan probe.
- Label antarmuka bahasa campuran dibiarkan; teks Indonesia ditambahkan terpisah.
- Pertanyaan "ada cairan?" dan "perikardium = selaput pembungkus jantung" mengikuti voice-over; tidak ada angka (mis. mL) ditampilkan.

## Audio dan lisensi
Musik instrumental **"MEDCOEL Soft Pulse"** (pad hangat, bel lembut 84 BPM, denyut sub pelan) dan klik/ting kecil saat skenario dipilih: sintesis kode (`audio/audio_mix.py`), lisensi **CC0 1.0** (dibuat sendiri, tanpa sampel/musik pihak ketiga), boleh untuk promosi Instagram/TikTok tanpa atribusi. Musik turun otomatis di bawah voice-over (≈ −12 dB di bawah suara saat bicara). Font Plus Jakarta Sans (SIL OFL 1.1); logo `apps/web/src/assets/logo-full.webp`.

## Batasan jujur
- Audio belum didengarkan manusia; hanya diukur.
- Sumber 1920×1078 diperbesar ±2,3× untuk panel dan ±1,4× untuk CT; teks panel sedikit lembut, label penting diulang sebagai teks tajam.
- Klip 01 hanya 1,5 dtk, jadi layar Patologi diperlambat lalu bingkai terakhir ditahan dengan zoom; klip 00 hanya menampilkan probe ±0,75 dtk sebelum panel lain muncul, jadi diperlambat dan ditahan.
- Slow-motion memakai pengulangan bingkai 30 fps (tanpa interpolasi).

## Proyek yang bisa diedit / render ulang
`cues.json` (batas shot, teks, posisi VO), `stage/`, `tools/masks.py`, `data/masks/`, `audio/`, `cover/`, `render.mjs`, `shot.cjs`, `extract.sh`, `src/`.
```bash
cd video/live-4d-perikardial && ./extract.sh /tmp/perikardial-frames         # bingkai 30 fps dari src/ (symlink rekam/frames)
python3 tools/masks.py rekam/frames/04 data/masks                              # topeng penanda per bingkai (butuh scipy)
cd ../.. && python3 -m http.server 8134 --bind 127.0.0.1 &
python3 video/live-4d-perikardial/audio/audio_mix.py                          # musik + klik + voiceover.wav -> audio/mix.wav
NODE_PATH=/opt/node-tools/node_modules node video/live-4d-perikardial/render.mjs /tmp/pk-out 0 887 4
ffmpeg -framerate 30 -i /tmp/pk-out/f%05d.jpg -i video/live-4d-perikardial/audio/mix.wav -c:v libx264 -crf 17 -preset slow -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart -t 29.6 video/live-4d-perikardial/efusi-perikardial-live-4d-lab.mp4
```
