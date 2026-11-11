# Siklus Anak FK — video promosi MEDCOEL (40 dtk, 1080×1920, 30 fps)

Video vertikal tanpa narator/dialog/TTS. Referensi Drive `1JMttOuXyPYOfomllCbbGypL1G9_-3ojI` hanya dipakai untuk ritme (loop → berhenti → cerah); karakter, adegan, dan komposisinya tidak disalin.

Hasil: `medcoel-siklus-anak-fk.mp4` (H.264 + AAC, loudnorm ≈ −14 LUFS). Cover: `cover/cover.png` (1080×1920; `cover-panduan-area-aman.png` memuat garis area aman; `cover-bersama-awal-video-360px.png` membandingkan cover dan bingkai awal pada 360 px). Pratinjau ponsel: `still/*-360px.png`.

## Alur dan waktu
| Detik | Isi | Teks layar |
|---|---|---|
| 0–3 | Kori berlari di lorong; kalender dan jam berputar | POV: SIKLUS ANAK FK |
| 3–9 | Loop kuliah → pulang → belajar; HUD (hari, energi, status, tugas) makin parah; tumpukan materi tumbuh | KULIAH → PULANG → BELAJAR / MASIH BINGUNG. / BESOK ULANG LAGI… |
| 9–14 | Musik berhenti sesaat; Kori tertindih tumpukan | MULAI DARI MANA? |
| 14–18 | Kori menemukan MEDCOEL di laptop; kamera zoom ke layar, transisi blok pixel | COBA MEDCOEL |
| 18–29 | Rekaman web ASLI: pilih satu BAB → materi → flashcard → latihan soal → pembahasan saat belum tepat (Nilo "Coba lagi, yuk!", lalu Kila "Mulai nyambung!") | PILIH SATU BAB. / MATERI → FLASHCARD → LATIHAN / SALAH? LIHAT PEMBAHASANNYA. |
| 29–33 | Montage Atlas 3D dan Live 4D Lab (label "Simulasi edukatif") | ANATOMI? JELAJAHI 3D & LIVE 4D LAB. |
| 33–40 | Kembali ke meja: tumpukan masih ada, Kori tahu mulai dari BAB mana | SATU BAB DULU. / MEDCOEL GRATIS DI medcoel.com |

## Sumber
- **Maskot:** `apps/web/src/mascots/{kori,kila,nilo}.svg` dimuat apa adanya; hanya lapisan resminya (`mc-float`, `mc-arm-right`, `mc-eyes-*`, `mc-mouth-*`) yang digerakkan. Keringat, tanda tanya, dan kelopak lelah adalah overlay di atas maskot.
- **Web (18–29 dtk):** direkam dari web MEDCOEL asli di repo (`apps/web`) yang berjalan lokal + PocketBase lokal dengan **data uji** (`rekam/siapkan.sh`, `rekam/web.cjs`, akun demo `nadia.putri`). BAB "Anatomi Ekstremitas Atas" punya materi, flashcard, dan 20 soal. Kursor dan ring ketukan digambar; UI tidak digambar ulang. Tidak ada skor sempurna atau klaim lulus.
- **Atlas 3D dan Live 4D Lab (29–33 dtk):** potongan dari dua rekaman layar produk yang ada di Drive (bukan data produksi), diberi label "Simulasi edukatif".
- **Animasi:** SVG dari kode (`stage/`), deterministik per bingkai (`window.renderFrame(t)`).

## Audio dan lisensi
- Musik **"MEDCOEL Loop to Light"** — sintesis kode (`audio/audio_mix.py`), lisensi **CC0 1.0**. Bagian A: loop 126 BPM, makin padat; B: hening dengan drone dan detak jam; C: cerah 110 BPM.
- Efek **"MEDCOEL UI Pings"** — sintesis kode, **CC0 1.0**.
- Tidak ada sampel pihak ketiga. Boleh dipakai untuk promosi tanpa atribusi.

## Render ulang
```bash
# dari akar repo
python3 -m http.server 8128 &                                   # server statis
bash video/siklus-anak-fk/rekam/siapkan.sh                       # (opsional) PocketBase + data uji untuk rekam ulang web
node video/siklus-anak-fk/rekam/web.cjs                          # (opsional) rekam ulang → rekam/web/ (di-gitignore)
python3 video/siklus-anak-fk/audio/audio_mix.py                  # musik + efek → audio/mix.wav
node video/siklus-anak-fk/render.mjs video/siklus-anak-fk/frames 0 1199 4   # bingkai JPEG (folder frames/ di-gitignore)
node video/siklus-anak-fk/cover/render-cover.cjs                 # cover
ffmpeg -framerate 30 -i video/siklus-anak-fk/frames/f%05d.jpg -i video/siklus-anak-fk/audio/mix.wav \
  -c:v libx264 -crf 19 -preset slow -pix_fmt yuv420p -c:a aac -b:a 192k \
  -af loudnorm=I=-14:TP=-1.5:LRA=9 -shortest -movflags +faststart video/siklus-anak-fk/medcoel-siklus-anak-fk.mp4
```
Rekaman web mentah (`rekam/web/`) tidak ikut di repo; render ulang bingkai membutuhkannya, jadi jalankan dua langkah rekam di atas terlebih dulu.

## Batasan jujur
- Pratinjau dan pemeriksaan visual dilakukan dari bingkai/lembar kontak; saya belum mendengarkan campuran audio secara penuh sebagai pendengar — periksa level dan keselarasan efek dengan telinga sebelum publikasi.
- Efek bunyi mengikuti jadwal rekaman (daftar `E_` di `audio_mix.py`), bukan deteksi klik sebenarnya.
- Data di web adalah data uji lokal; Atlas/4D berasal dari rekaman Drive.
