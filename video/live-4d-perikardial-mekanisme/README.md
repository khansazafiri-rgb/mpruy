# Kenapa ada cairan di sekitar jantung? — mekanisme + skenario Live 4D Lab (38,8 dtk, 1080×1920, 30 fps)

Video edukasi vertikal: **ilustrasi mekanisme** efusi perikardial (kode SVG, skematik) lalu **skenario "Efusi perikardial (sedang)" di Live 4D Lab** dari rekaman produk asli (`src/`: `00_rekaman_konteks_4d_lab`, `01_skenario_efusi_perikardial`, `04_citra_jantung_closeup`). Rekaman produk hanya dipotong, diperbesar, diperlambat, diberi sorotan dan teks. **Tidak ada UI atau hasil scan buatan.** Ilustrasi mekanisme tidak pernah disajikan sebagai rekaman pasien.

Hasil: `mekanisme-efusi-perikardial-live-4d-lab.mp4` (H.264 + AAC, ≈ −15,7 LUFS, puncak −1,4 dBFS). Cover: `cover/cover.png` (+ `cover-panduan-area-aman.png`, `cover-360px.png`). Bingkai kunci 360 px: `still/`.

## Voice-over
Voice-over Google AI Studio dari pemesan (`audio/voiceover.wav`, 38,4 dtk) dipakai apa adanya; tidak ada TTS buatan saya. ASR kata-per-kata: `audio/voiceover-asr.json`; visual disinkronkan lewat `cues.json`. Di audio "MEDCOEL" terdengar sebagai "metcoil" (dua kali) dan ASR meragukan beberapa kata lain; teks layar memakai ejaan benar. Cek ulang pelafalan saat memutar.

## Alur, sinkron dengan voice-over
| Detik | Voice-over | Visual | Teks / label |
|---|---|---|---|
| 0–2,8 | "Kenapa ada cairan di sekitar jantung ini?" | Close-up citra CT sintetis jantung bergerak dari frame pertama (04) | KENAPA ADA CAIRAN DI SEKITAR JANTUNG? · Simulasi edukatif • CT sintetis • bukan alat diagnosis |
| 2,8–8,9 | "Di Live 4D Lab MEDCOEL, kita sedang melihat skenario efusi perikardial." | Panel Patologi, kartu "Efusi perikardial (sedang)" dipilih (01); klik kecil di 3,9; lalu pan ke teks deskripsi asli di aplikasi | EFUSI PERIKARDIAL · label produk |
| 8,9–14,4 | "Jantung dibungkus dua lapis perikardium, di antaranya memang ada sedikit cairan." | Ilustrasi: jantung ukuran tetap, lapisan dalam & luar, cincin cairan tipis | JANTUNG · LAPISAN DALAM · LAPISAN LUAR · SEDIKIT CAIRAN · **Ilustrasi mekanisme** |
| 14,4–20,1 | "Salah satu alasan cairan bisa bertambah adalah peradangan, misalnya akibat infeksi." | Lapisan memerah, bintik radang, contoh kuman kecil di luar lapisan | PERADANGAN, misalnya infeksi |
| 20,1–25,6 | "Jika cairan terkumpul lebih cepat daripada diserap, ruang di sekitar jantung semakin melebar." | Panah produksi (besar) vs penyerapan (kecil); hanya lapisan luar meregang, jantung tetap | CAIRAN TERKUMPUL LEBIH CEPAT DARIPADA DISERAP · LAPISAN LUAR MEREGANG |
| 25,6–29,1 | "Kalau tekanannya meningkat, jantung bisa lebih sulit terisi." | Panah tekanan ke dalam; rongga jantung sedikit menyempit | RUANG ISI TERBATAS · pil: "Mekanisme umum, bukan kasus simulasi MEDCOEL" |
| 29,1–30,5 | "Sekarang lihat lagi posisi cairannya pada tampilan CT sintetis." | Ilustrasi memudar di atas CT; penanda mengambil alih | Bentuk ilustrasi dicocokkan dengan area di sekitar jantung |
| 30,5–31,9 | (lanjutan) | Model tubuh + probe (cincin emas) dan citra CT sintetis (00) | POSISI PROBE |
| 31,9–33,3 | | Close-up CT dengan penanda lapisan abu-abu di sekitar jantung (04) | Penanda mengikuti lapisan abu-abu di sekitar jantung |
| 33,3–36,1 | "Ini simulasi edukatif, bukan alat diagnosis." | CT diredupkan, label besar | Simulasi edukatif • CT sintetis • bukan alat diagnosis |
| 36,1–38,8 | "Eksplorasi gratis di MEDCOEL.com." | Antarmuka Live 4D Lab asli penuh yang masih bergerak (00), logo | **Eksplorasi gratis di medcoel.com** |

Label "Ilustrasi mekanisme" tampil sepanjang adegan animasi; "Simulasi edukatif • CT sintetis • bukan alat diagnosis" tampil di setiap bagian rekaman produk.

## Pemeriksaan fakta dan batas klaim
- **Bukan kasus tamponade:** video tidak menyebut skenario MEDCOEL ini tamponade. Bagian tekanan ditandai eksplisit sebagai mekanisme umum. Teks deskripsi asli aplikasi (efusi sedang ±9 mm, efek hemodinamik/tamponade tidak dimodelkan) ditampilkan di bagian Patologi.
- **Ilustrasi skematik:** penampang sederhana, bukan anatomi akurat/skala. Jantung ukuran tetap (tidak membesar); cairan hanya di ruang antara dua lapis, tidak pernah di dalam ruang jantung. Penyempitan rongga pada adegan tekanan sangat dilebihkan secara pedagogis. Peradangan ditampilkan sebagai satu contoh penyebab, bukan satu-satunya.
- **Penanda "ruang sekitar jantung":** dibaca dari piksel bingkai klip 04 (`tools/masks.py`, per bingkai di `data/masks/`), bukan digambar tangan. Mask sedikit tidak lengkap di sisi kanan atas (dekat tulang dada); bagian itu sengaja tidak ditebak.
- **Bukan CT pasien:** aplikasi menandai citra sebagai CT sintetis dari Atlas MEDCOEL; video tidak menyebutnya CT pasien.
- **Posisi probe:** diambil dari awal klip 00 (panel "Gerakkan probe"). Pada klip 02/03 yang tampak di model adalah stetoskop, bukan transduser, sehingga tidak dipakai.
- Tidak ada angka (mL/mm) ditampilkan selain yang ada di teks asli aplikasi.

## Audio dan lisensi
Musik instrumental **"MEDCOEL Soft Pulse (varian mekanisme)"** (pad hangat, bel lembut 84 BPM, denyut sub pelan, menipis saat animasi), klik kecil saat skenario dipilih (3,9), "ting" naik pada tiap tahap animasi dan sapuan naik saat kembali ke produk (momen "oh, jadi begitu"): sintesis kode (`audio/audio_mix.py`), lisensi **CC0 1.0** (dibuat sendiri, tanpa sampel/musik pihak ketiga), boleh untuk promosi Instagram/TikTok tanpa atribusi. Musik turun otomatis di bawah voice-over. Font Plus Jakarta Sans (SIL OFL 1.1); logo `apps/web/src/assets/logo-full.webp`.

## Batasan jujur
- Audio belum didengarkan manusia; hanya diukur (loudness/puncak) dan dicocokkan dengan ASR.
- Sumber 1920×1078 diperbesar ±1,4–2,3×; teks panel sedikit lembut.
- Klip 01 hanya 1,5 dtk: layar Patologi diperlambat lalu bingkai terakhir ditahan dan di-pan. Klip 00 menampilkan probe ±0,75 dtk, diperlambat/ditahan.
- Slow-motion = pengulangan bingkai 30 fps (tanpa interpolasi).
- Bagian bawah layar (±25%) sengaja dikosongkan untuk area UI Reels/TikTok.

## Proyek yang bisa diedit / render ulang
`cues.json` (batas shot, fase animasi, teks, VO), `stage/` (`anim.js` ilustrasi, `stage.js` komposisi), `tools/masks.py`, `data/masks/`, `audio/`, `cover/`, `render.mjs`, `shot.cjs`, `extract.sh`, `src/`.
```bash
cd video/live-4d-perikardial-mekanisme && ./extract.sh /tmp/mek-frames            # bingkai 30 fps dari src/ (symlink rekam/frames)
python3 tools/masks.py rekam/frames/04 data/masks                                  # butuh scipy (opsional, mask sudah disertakan)
cd ../.. && python3 -m http.server 8135 --bind 127.0.0.1 &
python3 video/live-4d-perikardial-mekanisme/audio/audio_mix.py                    # musik + klik + voiceover.wav -> audio/mix.wav
NODE_PATH=/opt/node-tools/node_modules node video/live-4d-perikardial-mekanisme/render.mjs /tmp/mek-out 0 1163 4
ffmpeg -framerate 30 -i /tmp/mek-out/f%05d.jpg -i video/live-4d-perikardial-mekanisme/audio/mix.wav -c:v libx264 -crf 18 -preset slow -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart -t 38.8 video/live-4d-perikardial-mekanisme/mekanisme-efusi-perikardial-live-4d-lab.mp4
```
