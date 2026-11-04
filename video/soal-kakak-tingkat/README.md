# Video: "Soal kakak tingkat" (Reels/TikTok 1080 x 1920, 30 fps, 55,56 detik)

Video promosi animasi MEDCOEL: PDF soal kakak tingkat yang tersimpan di galeri bisa diajukan lewat Chat Admin, diperiksa dan diproses tim, lalu menjadi bahan latihan untuk teman satu angkatan dan adik tingkat tahun depan. Narasi: `audio/narator.wav` (55,56 dtk; tidak dipotong, dipercepat, atau diubah). Takarir kata-per-kata dari ASR (`audio/asr.json`) dengan ejaan merek diperbaiki: pelafalan "Med-koel" ditulis **MEDCOEL**, alamat **medcoel.com**.

## Hasil
- `medcoel-soal-kakak-tingkat.mp4` (H.264 + AAC, sekitar -14 LUFS, true peak sekitar -2 dB)
- `cover.jpg` / `cover/cover.png` ("Punya soal kakak tingkat?" + "Jangan cuma disimpan!"; juga `cover/cover-profil-3x4.png`, `cover/cover-pratinjau-grid-profil.png`, `cover/cover-panduan-area-aman.png`)

## Urutan adegan (mengikuti narasi)
| Waktu | Adegan |
|---|---|
| 0,0 - 2,95 | Hook: Raka membuka galeri penuh PDF soal lama; zoom ke "UTS Anatomi 2025" (teks "SOAL KAKAK TINGKAT", "Masih tersimpan di HP?") |
| 2,95 - 6,4 | Tahun depan: adik tingkat bingung mencari bahan latihan (folder kosong, tanda tanya) |
| 6,4 - 8,9 | "Yuk, kirim ke MEDCOEL!": Kori, logo, halaman **Chat Admin asli** (rekaman layar) |
| 8,9 - 20,7 | Kilas balik: kakak tingkat memberi PDF, Raka senang, membuka PDF, bingung ("jawabannya mana?"), kecewa ("pembahasannya?") |
| 20,7 - 25,5 | Soal hilang saat ganti HP atau tenggelam di chat angkatan |
| 25,5 - 29,5 | Ajukan lewat Chat Admin: **rekaman asli** alur "Upload soal atau PPT materi (PDF)" (mata kuliah, jenis, kunci/pembahasan, bahasa, hak lihat, jumlah, unggah, ringkasan, centang hak membagikan, kirim) |
| 29,5 - 31,9 | "Diperiksa & diproses tim": admin (Tala varian peneliti) memeriksa; langkah "Kirim PDF > Diperiksa & diproses > Bahan latihan" (+ "lalu konfirmasi ke admin") |
| 31,9 - 35,2 | **Rekaman asli** latihan soal dan pembahasan (laptop) |
| 35,2 - 42,1 | Berbagi hari ini: teman seangkatan belajar; tahun berganti 2026 ke 2027, adik tingkat menemukan bahan latihan |
| 42,1 - 45,9 | Soal khusus kampus: **rekaman asli** pesan ke admin lewat "Tanya admin" |
| 45,9 - 49,7 | Satu angkatan berbagi, angkatan berikutnya belajar |
| 49,7 - 55,6 | Penutup: Raka, adik tingkat, Kori, logo, "BELAJAR KEDOKTERAN GRATIS", medcoel.com |

## Rekaman web asli (tidak digambar ulang)
`rekam/web.cjs` merekam `apps/web` lokal (Vite + PocketBase lokal dengan data uji `video/tab-dua-puluh/seed`, akun demo "Nadia Putri") dalam tampilan HP 430 x 932, skala 2,4, deterministik 30 fps (cincin kuning = ketukan jari). Klip: `alur` (Chat Admin > Upload soal atau PPT materi (PDF) > semua pilihan > unggah "Soal UTS Anatomi 2025.pdf" > ringkasan > kirim > status) dan `tanya` (Chat Admin > Tanya admin > pesan "Halo admin, soal UTS ini khusus kampus saya." > terkirim). Berkas contoh `rekam/Soal UTS Anatomi 2025.pdf` adalah soal buatan untuk demo (bukan soal ujian sungguhan). Nama kampus pada data uji diganti menjadi "FK Kampus Contoh" di basis data lokal sebelum merekam. Latihan soal dan pembahasan memakai rekaman web desktop dari `video/promo-medcoel` (data uji yang sama). Tidak ada kredensial, token, atau data pengguna asli.

`stage/media` (bingkai hasil rekaman, sekitar 150 MB) tidak dicommit: `web/alur` dan `web/tanya` dibuat ulang dengan `rekam/web.cjs`, `web/soal` adalah symlink ke `../../../../promo-medcoel/stage/media/web/soal`.

## Catatan tentang alur nyata
- Setelah "Kirim pengajuan", layar nyata menyatakan status **Menunggu konfirmasi** dan meminta pengguna **mengonfirmasi ke admin lewat WhatsApp** supaya masuk antrean; video menyebut ini sebagai "lalu konfirmasi ke admin" dan tidak menjanjikan soal langsung terbit atau tersedia pada waktu tertentu (layar nyata juga menyebut perkiraan hari sebagai "bukan janji").
- Alur pengajuan nyata memiliki pilihan hak lihat ("Hanya prodi dan kampus saya" atau "General"); narasi hanya meminta soal khusus kampus disampaikan ke admin, dan video tidak menjanjikan pembatasan akses otomatis.

## Karakter
Raka (`brand/characters/raka`), Tala (`brand/characters/teman`, varian peneliti sebagai admin), Kori (maskot asli `apps/web/src/mascots/kori.svg`). Aset baru: `PALETTE_KAKAK` dan `PALETTE_ADIK` (rig Raka, warna lain) untuk kakak tingkat dan adik tingkat (lihat README Raka).

## Membuat ulang
```bash
cd video/soal-kakak-tingkat
(cd audio && python3 asr.py narator); python3 audio/gen_data.py     # asr.json + stage/data.json + dialog.wav
python3 audio/audio_mix.py                                           # musik + SFX di bawah narasi -> audio/mix.wav
# rekaman web (butuh PocketBase di 8090 dengan seed video/tab-dua-puluh/seed, dan Vite di 3000):
node rekam/web.cjs stage/media/web alur tanya
ln -s ../../../../promo-medcoel/stage/media/web/soal stage/media/web/soal
(cd ../.. && python3 -m http.server 8128 --bind 127.0.0.1 &)
node render.mjs frames 0 1666 4
ffmpeg -i audio/mix.wav -af "acompressor=threshold=-30dB:ratio=6:attack=3:release=80:makeup=8,alimiter=limit=0.8:level=false:attack=2:release=40,volume=2.6dB,alimiter=limit=0.8:level=false:attack=2:release=40,loudnorm=I=-14:TP=-1.5:LRA=9" -ar 44100 final.wav
ffmpeg -framerate 30 -i frames/f%05d.jpg -i final.wav -c:v libx264 -crf 17 -pix_fmt yuv420p -c:a aac -b:a 192k -shortest medcoel-soal-kakak-tingkat.mp4
node cover/render-cover.cjs
```
