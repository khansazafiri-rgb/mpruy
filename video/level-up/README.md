# Level Up — video promosi MEDCOEL bergaya pixel (40 dtk, 1080×1920, 30 fps)

Video vertikal tanpa narator/dialog/TTS. Kori (maskot MEDCOEL asli) berada di dunia pixel: 13 blok BAB jatuh membentuk tembok, tiga lompatan gagal, lalu menemukan MEDCOEL, memilih satu BAB di web asli, dan "LEVEL UP". Di akhir tembok berubah menjadi tangga dan Kori mulai dari BAB 1.

Hasil: `medcoel-level-up.mp4` (H.264 + AAC, loudnorm ≈ −14 LUFS). Cover: `cover/cover.png` (1080×1920; `cover-panduan-area-aman.png` memuat garis area aman; `cover-bersama-awal-video-360px.png` membandingkan cover dan bingkai awal pada 360 px). Pratinjau ponsel: `still/*-360px.png`.

## Alur dan waktu
| Detik | Isi | Teks layar |
|---|---|---|
| 0–3 | Kori berlari di dunia pixel; 13 blok BAB jatuh membentuk tembok | POV: KAMU LAGI LEVEL 1 |
| 3–9 | Tiga lompatan gagal (BONK!); ENERGI turun; musik tersendat | 13 BAB. LOMPAT SEKALIGUS? / NYANGKUT. / ULANG LAGI... |
| 9–14 | Layar meredup, Kori lemas; sebuah "save point" berisi laptop MEDCOEL muncul lewat disolve pixel | MULAI DARI MANA? |
| 14–18 | Kori bangkit; kamera zoom ke layar, transisi blok pixel ke web | (tombol) COBA MEDCOEL |
| 18–29 | Rekaman web ASLI: pilih satu BAB → materi → flashcard → latihan soal → pembahasan saat belum tepat (Nilo "Coba lagi, yuk!", lalu Kila "Mulai nyambung!"); bilah PAHAM terisi | PILIH SATU BAB. / MATERI → FLASHCARD → LATIHAN / SALAH? LIHAT PEMBAHASANNYA. |
| 28,8 | LEVEL UP: LV 1 → LV 2, BAB 1/13, ENERGI penuh | LEVEL UP! |
| 29–33 | Bonus stage: Atlas 3D dan Live 4D Lab (label "Simulasi edukatif") | ANATOMI? JELAJAHI 3D & LIVE 4D LAB. |
| 33–40 | Kembali ke dunia pixel: tembok menjadi tangga, BAB 1 emas, Kori melompat ke anak tangga pertama | SATU BAB DULU. / MEDCOEL GRATIS DI medcoel.com |

## Penting: HUD adalah perangkat cerita
LV, PAHAM, ENERGI, "BAB x/13", blok BAB, dan LEVEL UP **bukan fitur produk MEDCOEL**; itu hanya metafora game di dalam video. Hanya isi panel laptop (18–33 dtk) yang menunjukkan produk. Tidak ada skor sempurna atau klaim lulus ujian.

## Sumber
- **Maskot:** `apps/web/src/mascots/{kori,kila,nilo}.svg` dimuat apa adanya; hanya lapisan resminya (`mc-float`, `mc-arm-right`, `mc-eyes-*`, `mc-mouth-*`) yang digerakkan. Keringat, tanda tanya, dan kelopak lelah adalah overlay di atas maskot.
- **Web (18–29 dtk):** direkam dari web MEDCOEL asli di repo (`apps/web`) yang berjalan lokal + PocketBase lokal dengan **data uji** (`rekam/siapkan.sh`, `rekam/web.cjs`, akun demo). BAB "Anatomi Ekstremitas Atas" punya materi, flashcard, dan 20 soal. Kursor dan ring ketukan digambar; UI tidak digambar ulang.
- **Atlas 3D dan Live 4D Lab (29–33 dtk):** potongan dari dua rekaman layar produk di Drive (bukan data produksi), diberi label "Simulasi edukatif". Bingkai hasil ekstraksinya (`rekam/web/atlas|probe|ct`) tidak ikut di repo dan perintah ekstraksinya tidak tersimpan sebagai skrip.
- **Animasi:** SVG dari kode (`stage/`), deterministik per bingkai (`window.renderFrame(t)`).
- **Font pixel:** Press Start 2P (c) The Press Start 2P Project Authors, SIL Open Font License 1.1, disertakan di `stage/fonts/`.

## Audio dan lisensi
- Musik **"MEDCOEL 8-Bit Climb"** — sintesis kode (`audio/audio_mix.py`), lisensi **CC0 1.0**. A minor 150 BPM tegang dan tersendat tiap benturan; 9–14 dtk hening dengan drone dan detak jam; setelah MEDCOEL ditemukan C mayor 120 BPM cerah; fanfare di 28,8 dtk.
- Efek **"MEDCOEL Pixel Pings"** — sintesis kode, **CC0 1.0**.
- Tidak ada sampel pihak ketiga. Boleh dipakai untuk promosi tanpa atribusi.

## Render ulang
```bash
# dari akar repo (playwright harus tersedia, mis. NODE_PATH=/opt/node-tools/node_modules)
python3 -m http.server 8128 &                                   # server statis
bash video/level-up/rekam/siapkan.sh                             # PocketBase + data uji untuk rekam ulang web
node video/level-up/rekam/web.cjs                                # rekam ulang -> rekam/web/ (di-gitignore)
python3 video/level-up/audio/audio_mix.py                        # musik + efek -> audio/mix.wav
node video/level-up/render.mjs video/level-up/frames 0 1199 4    # bingkai JPEG (frames/ di-gitignore)
node video/level-up/cover/render-cover.cjs                       # cover
ffmpeg -framerate 30 -i video/level-up/frames/f%05d.jpg -i video/level-up/audio/mix.wav \
  -c:v libx264 -crf 19 -preset slow -pix_fmt yuv420p -c:a aac -b:a 192k \
  -af loudnorm=I=-14:TP=-1.5:LRA=9 -shortest -movflags +faststart video/level-up/medcoel-level-up.mp4
```
Render bingkai butuh `rekam/web/` lengkap, termasuk potongan Atlas/4D dari Drive (lihat catatan Sumber).

## Batasan jujur
- Pemeriksaan visual dari lembar kontak dan bingkai kunci; audio belum didengarkan penuh sebagai pendengar — periksa level dan keselarasan efek sebelum publikasi.
- Efek bunyi mengikuti jadwal (daftar `E_` di `audio_mix.py`), bukan deteksi klik sebenarnya.
- Di 360 px teks pixel kecil di HUD sulit dibaca; pesan utama ada di kotak teks besar.
- Data di web adalah data uji lokal; Atlas/4D berasal dari rekaman Drive.
