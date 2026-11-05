# Video promosi "Udah hafal soal kakak tingkat, kok yang keluar beda?"

Reels/TikTok 1080×1920, 30 fps, 58,97 detik (narasi 55,56 detik + jeda awal 0,6 dan akhir 2,8). Narasi dari WAV terlampir (`audio/narator.wav`), dipakai apa adanya.

- `soal-kakak-ujian_final.mp4`: master 1× (jangan dipercepat otomatis). `..._pratinjau.mp4` (540×960, 1×), `..._pratinjau_1.2x.mp4`, `..._pratinjau_1.3x.mp4`: pratinjau kecepatan unggah.
- `soal-kakak-ujian_cover.jpg`: cover terpisah 1080×1920 ("Udah hafal soal kakak tingkat…" + "KOK YANG KELUAR BEDA?!"); judul, wajah, dan logo di area tengah aman untuk crop profil Instagram 1:1 dan 3:4.
- `NASKAH.md`: narasi per waktu, adegan, teks layar. `stage/`: panggung HTML/SVG per frame. `audio/`: linimasa, takarir, musik/SFX sintesis, mix. `rekam/web.cjs`: perekam web asli. `evidence/`: empat tangkapan rekaman web asli. Membuat ulang: `bash build.sh`.

## Rekaman web asli (jujur soal sumbernya)
Seluruh layar produk di video adalah **aplikasi MEDCOEL yang benar-benar dijalankan dan direkam** (kode `apps/web` dan `apps/pocketbase` di repo ini, cabang `main`), dalam viewport laptop 1100×680 skala 2, ditaruh di bingkai laptop dengan zoom kamera ke bagian penting. Tidak ada antarmuka yang digambar ulang. Data uji lokal (akun demo "Nadia Putri", 26 soal Anatomi dari `video/tab-dua-puluh/seed`), tanpa token, akun admin, atau data pribadi. Situs produksi tidak diubah dan tidak diakses.

| Halaman | Yang direkam |
|---|---|
| Beranda mata kuliah Anatomi | Hero, statistik, daftar BAB, ketuk BAB Osteologi → langkah Belajar materi → Flashcard → Latihan soal (dengan tip Kori) |
| Catatan materi | BAB Osteologi & Artrologi: halaman BAB, Mulai membaca, Tujuan Belajar, "01 Konsep Dasar Osteologi" beserta teks bacaan dan daftar isi |
| Latihan soal + pembahasan | Latihan soal BAB ini, pengaturan sesi (jumlah soal, Mode Learning), soal, pilih jawaban benar, Cek jawaban, "Jawabanmu benar", pembahasan tiap pilihan |
| Flashcard | Kartu istilah, ketuk untuk melihat jawaban (kartu dibalik), Hafal, kartu berikutnya |

Batasan yang harus diketahui:
1. **Gambar pada catatan materi tidak bisa dimuat di lingkungan perekaman** (host gambar eksternal diblokir; layar menampilkan "Gambar belum bisa dimuat"). Bagian bergambar sengaja tidak ditampilkan; yang disorot judul dan penjelasan. **Kalau ingin gambar materi asli muncul, kirim rekaman layar atau screenshot halaman catatan materi yang gambarnya termuat.**
2. Soal latihan di rekaman berasal dari data uji (acak tiap sesi; soal "Sendi bahu (glenohumeral)…" yang direkam), bukan bank soal produksi.
3. Versi web lokal berasal dari `main` saat dibuat; belum dibandingkan dengan produksi. Mohon cocokkan sekilas sebelum diposting.
4. Rekaman bingkai mentah (±450 JPEG) tidak dicommit; dibuat ulang dengan `rekam/web.cjs`.

## Aset karakter
Tidak ada aset karakter baru yang perlu dipisahkan. Dipakai ulang tanpa mengubah gambar lama: **Raka** (`brand/characters/raka`, outfit `kuliah` dengan `ransel: false`, outfit `rumah`, ekspresi kaget/khawatir/bingung/berpikir/lega/senang, efek `sweat` dan `dizzy`), tokoh pendukung `LOOKS.perawat`, `dokterPria`, `ibu`, `dosen` di `stage/orang.js` (peserta ujian lain), dan **Kori** (`brand/mascots/kori.svg`, salinan `stage/kori.svg`). Properti baru (ruang ujian, lembar soal, jam perpindahan waktu, bingkai laptop) ada di `stage/stage.js`.
