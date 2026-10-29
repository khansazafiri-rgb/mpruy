# Video "Masih Dua Minggu"

`medcoel-masih-dua-minggu.mp4`: 1080x1920, 30 fps, 83,0 detik, untuk Instagram Reels dan TikTok. Raka (kode di `brand/characters/raka`) duduk di tempat yang sama saat latar berganti: kantin, pantai khayalan, ruang praktikum, meja tugas kelompok, ruang kuliah, perjalanan pulang, kamar. Kantung mata bertambah bertahap dari H-14 sampai H-3 dan tidak hilang setelah ia membuka MEDCOEL. Bagian tengah memakai rekaman web MEDCOEL asli (pilih mata kuliah, pilih bab, latihan soal, jawaban salah, pembahasan) dengan data uji.

## Isi
- `audio/`: `bian.mp3` adalah satu file ElevenLabs yang berisi tiga suara berurutan (Narator, Teman, Raka). `asr.py` mentranskripsi, `cut.py` memotong per kalimat di jeda (`clips.json`), `verify.py` mencocokkan tiap klip dengan naskah. `gen_data.py` memasang klip di linimasa (`dialog.wav`) dan menulis `stage/data.json` (waktu kata dan envelope bibir). `audio_mix.py` membuat musik dan SFX sintesis dan me-mix di bawah dialog yang tidak diubah.
- `stage/`: panggung HTML/SVG dirender per frame. `raka.js` adalah salinan Raka dari `brand/characters/raka` dengan tambahan keadaan khusus video (`bags`, `sparkle`, `shades`, `sweat`, `slump`); aset aslinya tidak diubah. `teman.js` adalah teman perempuan baru (mahasiswi FK seumuran Raka). `world.js` berisi latar dan benda genggam. `stage.js` berisi linimasa, kamera, label, kalender hari, takarir per kata, panel web, dan kartu akhir.
- `rekam/`: skrip perekam web asli (Playwright, CDP screencast) dan hasilnya `rekaman-web.mp4`. Frame panel diambil dari rekaman ini: `ffmpeg -i rekam/rekaman-web.mp4 -q:v 3 stage/web/w%05d.jpg`. Perekaman butuh PocketBase dan Vite lokal dengan data uji, lihat `video/tab-dua-puluh/seed` dan `video/tab-dua-puluh/reset.sh`.

## Cara render ulang (singkat)
1. `python3 audio/gen_data.py` lalu `python3 audio/audio_mix.py` dari folder ini.
2. Ekstrak frame web (lihat di atas), sajikan `stage/` lewat server statis (`python3 -m http.server 8125`).
3. `node stage/render.mjs frames 0 2489 4`, lalu encode dengan ffmpeg bersama `mix.wav` (`loudnorm` ke sekitar -14 LUFS).

Beberapa path di skrip masih memakai folder kerja sesi pembuatan; sesuaikan sebelum dijalankan.

## Catatan
- Narator mengucapkan "MEDCOEL" mirip "Med-koel"; di layar selalu tertulis MEDCOEL.
- Angka 38.400 di layar hanya teks yang cocok dengan narasi; database uji lokal berisi 26 soal.
- Musik dan SFX berupa sintesis sederhana.
