# Video "Dok, saya kenapa?"

`dok-saya-kenapa.mp4`: 1080x1920, 30 fps, 100,0 detik, untuk Instagram Reels dan TikTok. Raka (kode di `brand/characters/raka`) memakai jas dokter putih di lorong dan ruang periksa, dan sweater mahasiswa di kilas balik dan saat belajar. Cerita: Raka kehabisan kata di depan pasien pertama (bayangan masa depan jika terus menunda latihan), kilas balik kebiasaan menunda latihan kasus, lalu Simulasi Dokter MEDCOEL (rekaman layar asli), dan adegan pasien diputar ulang.

## Isi
- `audio/`: `bian2.mp3` adalah satu file ElevenLabs berisi tiga suara berurutan (Narator, Pasien, Raka). `asr.py` mentranskripsi, `cut.py` memotong per kalimat di jeda (`clips.json`), `verify.py` mencocokkan tiap klip dengan naskah. `gen_data.py` memasang klip di linimasa (`dialog.wav`; klip pasien dipakai dua kali, di adegan awal dan ulang) dan menulis `stage/data.json`. `audio_mix.py` membuat musik dan SFX sintesis dan me-mix di bawah dialog yang tidak diubah. SFX pingsan hanya satu kali.
- `stage/`: panggung HTML/SVG dirender per frame. `raka.js` adalah salinan Raka dari `brand/characters/raka` dengan tambahan khusus video (jas dokter putih `coat`/`coatLong`, mata berputar `dizzy`, serta keadaan `sweat`/`sparkle`/`shades`); aset asli tidak diubah. `pasien.js` (pasien perempuan dewasa) dan `teman.js` (teman Raka) adalah tokoh 2D baru. `world.js` dan `world2.js` berisi latar (lorong, ruang periksa, tempat bermain, kampus, kamar). `stage.js` berisi linimasa, kamera, putar mundur, label, panel web, dan kartu akhir. `freeze.jpg` dibuat dengan `mkfreeze.cjs` (bingkai beku untuk gelembung pikiran).
- `rekam/`: skrip perekam web asli (Playwright, CDP screencast) dan hasilnya `rekaman-web.mp4`. Frame panel diambil dari rekaman ini: `ffmpeg -i rekam/rekaman-web.mp4 -q:v 3 stage/web/w%05d.jpg`. Perekaman butuh PocketBase dan Vite lokal dengan data uji (lihat `video/tab-dua-puluh/seed` dan `reset.sh`).

## Cara render ulang (singkat)
1. `python3 audio/gen_data.py` lalu `python3 audio/audio_mix.py` dari folder ini.
2. Ekstrak frame web (lihat di atas), sajikan `stage/` lewat server statis (mis. `python3 -m http.server 8126`).
3. `node stage/render.mjs frames 0 2999 4`, lalu encode dengan ffmpeg bersama `mix.wav` (`loudnorm` ke sekitar -14 LUFS).

Beberapa path di skrip masih memakai folder kerja sesi pembuatan; sesuaikan sebelum dijalankan.

## Catatan alur Simulasi Dokter (rekaman asli)
Rekaman memakai kode repo dan data uji (pasien "Pak Anwar, 45 tahun", poli umum, diundi oleh aplikasi). Kecocokan dengan narasi:
- "Dia belajar memulai pertanyaan": pilih poli, mulai pasien, Anamnesis, Keluhan utama, pilih pertanyaan. Sesuai.
- "Mencari informasi, lalu melihat bagian mana dari keputusannya yang perlu diperbaiki": Penunjang/Fisik, lalu Laporan konsultasi (skor, diagnosis, tindakan berurutan, "Hal penting yang belum kamu lakukan"). Sesuai.
- "Awalnya salah, iya, tapi di sini dia bisa mencoba lagi": lembar alasan menolak alasan yang belum tepat ("tindakannya belum dilakukan dan kamu diminta memilih lagi") dan laporan punya tombol "Ulangi kasus ini". Sesuai.

Perbedaan yang perlu diketahui:
- Judul halaman di aplikasi "Simulasi jadi dokter", sedangkan narator dan kartu akhir menyebut "Simulasi Dokter".
- Pasien dan dokter di aplikasi digambar semi-realistis (aset aplikasi), berbeda dari gaya 2D flat video. Ini memang tampilan asli.
- Pasien di aplikasi acak per poli, jadi bukan pasien perempuan di animasi.
- Kata "gratis" ada di naskah, tidak diverifikasi dari kode aplikasi.

## Catatan audio
- Kata pertama klip pasien terdengar oleh ASR sebagai "Duh" (naskah: "Dok"); takarir mengikuti naskah.
- "Eee..." Raka ada di audio sebagai "Ehh..." di antara kalimat narator (`N10`), dan dipakai untuk gerak bibir Raka. Klip Raka "Eh, nanti aja. Masih lama." memuat "Eh," di depan.
- Narator mengucapkan "MEDCOEL" mirip "Med-koel"; di layar selalu tertulis MEDCOEL.
