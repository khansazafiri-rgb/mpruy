# Kenapa jari keriput habis berenang? — video edukasi promosi MEDCOEL (46,4 dtk, 1080×1920, 30 fps)

Video animasi vertikal. **Narasi memakai audio Google AI Studio dari pemesan (`audio/narasi.wav`, 40,36 dtk) apa adanya**: tidak ada narator baru, kata-kata dan suara tidak diubah (hanya diberi musik/efek di bawahnya dan penguatan seragam). Durasi dan potongan gambar mengikuti kata narasi (ASR kata-per-kata: `audio/narasi-asr.json`). Video 6 dtk lebih panjang dari narasi supaya overview web dan kartu penutup 2,7 dtk muat setelah kalimat terakhir.

Hasil: `kenapa-jari-keriput-habis-berenang.mp4` (H.264 + AAC, ≈ −15,3 LUFS, puncak −1,1 dBFS). Cover: `cover/cover.png` (1080×1920; `cover-panduan-area-aman.png` memuat garis area aman Reels/TikTok; `cover-360px.png` pratinjau). Bingkai kunci 360 px: `still/`.

## Alur, sinkron dengan kata narasi
| Detik | Narasi | Visual |
|---|---|---|
| 0–4,7 | "Abis berenang agak lama, pernah liat ujung jari mau jadi keriput." | Dibuka langsung bergerak: tangan berukuran manusia (panjang ±19 cm) bergerak di dalam air kolam (garis tali jalur 25 cm dan ubin sebagai acuan skala). Ujung jari bertahap berkerut (1,3–3,7 dtk). Kamera **mendekat** ke ujung jari telunjuk (tangan tidak membesar; hanya kamera) dan muncul pertanyaan "Kenapa jari keriput habis berenang?". |
| 4,4–7,3 | "Kita sering mengira itu cuma karena kulit menyerap air." | Masuk ke penampang bantalan ujung jari (ilustrasi): air, epidermis, dermis, jaringan di bawah kulit, tulang. Butir air di permukaan dengan tanda tanya "kulit menyerap air?" (diberi sebagai dugaan umum, bukan klaim). |
| 7,96–10,5 | "Padahal, tubuh juga ikut memberi respons." | Saraf dan pembuluh darah kecil muncul (label SARAF, PEMBULUH DARAH KECIL, JARINGAN DI BAWAH KULIT). |
| 11,8–14,0 | "Saat ujung jari lama terendam," | "ujung jari lama terendam"; penanda urutan mekanisme 1–4 muncul. |
| 14,0–17,4 | "…saraf simpatik memicu pembuluh darah kecil di bawah kulit untuk menyempit." | Saraf simpatik menyala (14,0); denyut sinyal menjalar ke ujung-ujung saraf di dinding pembuluh (14,76); pembuluh disorot (15,2); **pembuluh menyempit bertahap** (16,9–19,8; garis putus-putus menunjukkan ukuran awal; aliran sel darah melambat). |
| 18,3–22,9 | "Volumen jaringan di bawah permukaan berkurang, sehingga kulit membentuk lipatan-lipatan kecil." | Sel jaringan di bawah kulit sedikit menyusut dan permukaan sedikit turun (18,3–21), lalu permukaan membentuk lipatan-lipatan kecil bertahap (20,8–23,6). |
| 23,7–24,9 | "Itulah kerutan yang kamu lihat." | Kamera menarik mundur dari ujung jari yang berkerut ke seluruh tangan (ukuran tangan tetap). |
| 25,5–29,1 | "Biasanya paling jelas di ujung jari tangan dan kaki." | Lingkaran pada ujung jari tangan; sekilas ujung jari kaki berkerut (telapak kaki, skala sama). Hanya ujung yang berkerut; tangan/tubuh tidak menyusut. |
| 29,0–35,9 | "Jadi, jari keriput setelah berenang bukan sekadar kulit yang basah. Saraf dan pembuluh darahmu ikut bekerja." | Tangan dengan ujung jari berkerut ("BUKAN SEKADAR KULIT BASAH"); lalu jendela penampang kecil dengan denyut saraf ke pembuluh ("SARAF + PEMBULUH DARAH IKUT BEKERJA"). |
| 35,9–43,7 | "Penasaran dengan cara kerja tubuh yang lain? Jelajahi MEDCOEL gratis di MEDCOEL.com" | Peralihan dari animasi ke **rekaman web MEDCOEL asli**: daftar mata kuliah → ① materi per bab (pilih BAB, buka materi, gambar) → ② flashcard (balik kartu, "Hafal") → ③ latihan soal + pembahasan → ④ anatomi interaktif (3D). Penanda 4 langkah dan label fitur tampil di bawah ponsel. |
| 43,7–46,4 | (tanpa narasi) | Tampilan web yang jelas, logo MEDCOEL, "BELAJAR FK GRATIS · MEDCOEL.COM" selama 2,7 dtk. |

## Yang sengaja dijaga (permintaan)
- **Proporsi:** tangan dan kaki digambar dari kode dalam satuan sentimeter (`stage/hand.js`: telapak 10,4 cm, jari tengah 8,7 cm, lebar telapak 8,4 cm, panjang kaki ±26 cm). Semua zoom adalah gerak kamera (`stage/stage.js`: skala tetap `ZB` px/cm × faktor kamera); tidak ada tangan/jari yang diperbesar sebagai objek. Lima jari, urutan jari, arah sendi (lentur ke arah kamera) dan gerak dibangun dari model yang sama di semua shot.
- **Tidak menyatakan** kerutan pasti meningkatkan cengkeraman, dan **tidak menggambarkan** air menarik darah keluar dari jari. Kerutan hanya pada ujung jari; tidak ada gambaran tangan/tubuh menyusut.
- **Bukan citra medis pasien:** penampang berupa ilustrasi datar berwarna (label "Ilustrasi sederhana (penampang), bukan citra pasien").
- **Overview MEDCOEL bukan sekadar logo:** empat fitur ditunjukkan berurutan dari rekaman web asli; tidak ada UI tiruan.

## Sumber
- **Rekaman web (36,4–43,7 dtk):** dipakai ulang dari rekaman web MEDCOEL asli proyek `video/level-up/rekam/web*` (web lokal repo ini + data uji; materi "Anatomi Ekstremitas Atas", flashcard, latihan soal Learning, atlas 3D anatomi). Hanya bingkai yang dipakai disalin ke `rekam/web/` (diperkecil 864×1440 / atlas 900×900, JPEG q82). Rekaman mentah asli ada di `video/level-up/rekam/` dan dapat dibuat ulang dengan skrip di sana. Soal dan pembahasan adalah data uji lokal, bukan soal resmi.
- **Animasi:** semuanya dari kode SVG di `stage/` (`hand.js` tangan/kaki + kerutan, `section.js` penampang, `stage.js` adegan/kamera/web/penutup). Logo: `apps/web/src/assets/logo-full.webp`. Font: Plus Jakarta Sans (SIL OFL 1.1, `stage/fonts/`).

## Audio dan lisensi
- **Narasi:** `audio/narasi.wav` (Google AI Studio dari pemesan), tidak diubah.
- Musik **"MEDCOEL Pool Day"** (marimba/pluck ringan + bantalan hangat, 96 BPM) dan efek air (dengung air bawah, kecipak, gelembung, tetes) serta efek tipis sinyal saraf/penyempitan/lipatan dan tik UI lembut pada klik rekaman web: sintesis kode (`audio/audio_mix.py`), lisensi **CC0 1.0**, boleh untuk promosi Instagram/TikTok tanpa atribusi. Musik dan efek turun otomatis di bawah narasi (≈ −12 dB di bawah suara saat narator bicara).
- Jadwal animasi dan bunyi sama-sama dibaca dari `cues.json`.

## Proyek yang bisa diedit / render ulang
- `cues.json` jadwal; `stage/` kode adegan; `rekam/web/` bingkai web yang dipakai; `audio/`; `cover/`; `render.mjs`; `shot.cjs`/`shot-page.cjs` (tangkapan uji).
```bash
# dari akar repo (playwright harus tersedia, mis. NODE_PATH=/opt/node-tools/node_modules)
python3 -m http.server 8131 --bind 127.0.0.1 &                             # server statis
python3 video/jari-keriput/audio/audio_mix.py                              # musik + efek + campur dengan narasi -> audio/mix.wav
node video/jari-keriput/render.mjs /tmp/jari-out 0 1391 4                  # bingkai JPEG 1080x1920 (30 fps)
node video/jari-keriput/shot-page.cjs http://127.0.0.1:8131/video/jari-keriput/cover/cover.html video/jari-keriput/cover/cover.png 1080 1920
ffmpeg -framerate 30 -i /tmp/jari-out/f%05d.jpg -i video/jari-keriput/audio/mix.wav \
  -c:v libx264 -crf 17 -preset slow -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart -t 46.4 video/jari-keriput/kenapa-jari-keriput-habis-berenang.mp4
```

## Batasan jujur
- Pemeriksaan visual dilakukan dari lembar kontak tiap 1 detik, bingkai kunci, dan pratinjau 360 px; **audio belum saya dengarkan sebagai pendengar**, hanya diukur (loudness, puncak, selisih level narasi–musik). Sinkron kata-gambar diatur dari waktu kata ASR.
- Narator (audio dari pemesan, tidak diubah) mengucapkan "sarap" untuk saraf, "pembulu" untuk pembuluh, dan "MedCol" untuk MEDCOEL; teks layar memakai ejaan yang benar dan "MEDCOEL.COM".
- Narasi baru menyebut MEDCOEL di 38,3 dtk; peralihan ke web dimulai sejak "Penasaran dengan cara kerja tubuh yang lain?" (36,4 dtk) dan fitur pertama tampil saat kata MEDCOEL diucapkan. Keempat fitur ditunjukkan cepat (±1,3–2,2 dtk) dan sebagian dipercepat 2–4× agar muat; teks halaman tidak dimaksudkan dibaca penuh.
- Gaya tangan/kaki adalah ilustrasi datar (bukan fotorealistik); pose kaki hanya sekilas (1,8 dtk).
- Bingkai JPEG render dan WAV hasil sintesis tidak ikut di repo (dibuat ulang lewat perintah di atas).
