# Besok Praktikum Anatomi, Tapi Masih Bingung? (Reels/TikTok 1080 x 1920, 30 fps, 67,16 detik)

Video animasi Raka untuk memperkenalkan 3D Anatomy MEDCOEL, lalu catatan materi dan latihan soal. Suara satu-satunya adalah MP3 narator yang diberikan
(`audio/narator.mp3`), tanpa ubah isi, kecepatan, atau nada. Hasil: `medcoel-besok-praktikum-anatomi.mp4`, sampul `cover.jpg`.

## Karakter
Raka dari `brand/characters/raka/raka.js` (fungsi `rakaSvg`), dipakai langsung tanpa desain ulang: jas lab putih (`outfit: 'jas'`) di ruang praktikum, sweater santai
(`outfit: 'harian'`) di kamar kos dan penutup. Kaki memakai rig kaki Raka (menyatu dengan badan); di kamar kos kaki tertutup meja. Mata berputar memakai efek `dizzy` bawaan Raka.
Raka hanya muncul di video, tidak di web.

## Sumber rekaman web (jujur)
- **3D Anatomy**: atlas MEDCOEL asli (model dan kontrol), dijalankan lokal di Chromium dari salinan statis aset publik `medcoel.com/anatomy/viewer/` (lihat `../human-anatomy-3d/record/fetch_atlas.py`).
  Setiap klik adalah klik mouse sungguhan (preset Muscles, `−` pada Muscles & fascia, kotak centang Muscles / Arteries / Veins / Lymphatic system); rotasi dan zoom dengan seret dan roda mouse.
  Take: `intro` (putar depan ke samping + perbesar), `hero_layers` (kurangi layer otot), `skeleton` (otot dimatikan), `vessels` (Arteries + Veins, putar), `lymph` (Lymphatic system).
  Take direkam ulang untuk video ini (`intro`); lainnya dipakai ulang dari video "FEATURE UNLOCKED: 3D ANATOMY".
  Penyesuaian pada salinan atlas hanya untuk perekaman: inersia kamera dimatikan dan antialias dimatikan. Kursor, cincin penanda, judul, dan takarir digambar di atas rekaman.
- **Catatan materi dan latihan soal**: aplikasi web MEDCOEL asli (`apps/web`, Vite lokal + PocketBase lokal dengan data uji dari `video/tab-dua-puluh/seed`), akun demo "Nadia Putri".
  Halaman Mata Kuliah Anatomi, pilih BAB "Osteologi & Artrologi" lalu "Belajar materi" (halaman catatan) dan "Latihan soal" (Siapkan sesi belajarmu, soal, jawaban). Skrip: `record/web.cjs`.
  Tidak ada data pribadi; yang terlihat hanya akun demo dan soal uji. Tidak ada akses ke produksi, token, atau akun admin.
- **Bukan rekaman**: ruang praktikum, model tulang di atas meja, kamar kos, buku atlas, lampu "pemahaman", dan bayangan lapisan tubuh adalah ilustrasi datar buatan. Model tulang di praktikum hanya properti,
  bukan model 3D MEDCOEL. Tidak ada klaim bahwa model MEDCOEL punya detail halus (tubercle, groove, sulcus); video hanya menunjukkan sistem dan layer yang tersedia.

## Yang ditunjukkan di viewer (nama kontrol asli)
Preset **Muscles** → tombol `−` ("Remove outer layer of Muscles & fascia") tiga kali → kotak centang Muscles & fascia dimatikan (kerangka) → **Arteries** dan **Veins** (bersama kerangka) →
putar → **Lymphatic system** secara singkat. Kerangka dan limfatik hanya punya satu layer, jadi tidak ada langkah "kurangi layer" untuk keduanya.

## Membuat ulang
```bash
cd video/besok-praktikum-anatomi
python3 audio/gen_data.py                       # stage/data.json + dialog.wav (waktu kata dari MP3)
node audio/sfx_times.mjs > audio/sfx_times.json && python3 audio/audio_mix.py   # audio/mix.wav (musik + SFX di bawah narasi)
# media atlas: ln -s <folder take atlas> stage/media ; media web: ln -s <folder web> stage/web
(cd ../.. && python3 -m http.server 8128 --bind 127.0.0.1 &)
node render.mjs frames 0 2014 4                 # JPG per bingkai
ffmpeg -framerate 30 -i frames/f%05d.jpg -i final.wav -c:v libx264 -crf 18 -pix_fmt yuv420p -c:a aac -b:a 192k -shortest medcoel-besok-praktikum-anatomi.mp4
```
`final.wav` = `audio/mix.wav` setelah `loudnorm` dua langkah (hasil sekitar -14,3 LUFS). Media rekaman (PNG/JPG per bingkai) tidak dicommit karena besar.

## Catatan
- Narator mengucapkan "MEDCOEL" mirip "Med-koel"; di layar selalu tertulis MEDCOEL.
- Musik dan efek disintesis numpy (bebas hak cipta); musik rata-rata sekitar 19 dB di bawah suara, efek hanya untuk momen lucu dan klik asli.
- Takarir: bawah layar untuk adegan Raka dan panel web; di kolom kiri (area kosong sidebar) saat atlas 3D tampil supaya tidak menutupi model.
