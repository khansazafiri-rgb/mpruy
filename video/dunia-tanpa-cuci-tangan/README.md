# Video edukasi "Dunia tanpa cuci tangan di layanan kesehatan"

`medcoel-dunia-tanpa-cuci-tangan.mp4`: 1080x1920, 30 fps, 72,0 detik. Cerita 2D: petugas (cowok) menyentuh pagar ranjang pasien A, titik simbolis ikut ke pasien B, lalu cerita diputar balik dengan kebersihan tangan di antara dua pasien. Visualnya menggambarkan risiko, bukan kepastian infeksi.

## Isi
- `audio/`: dua audio ElevenLabs asli (`dakocan.mp3` = narator, `pratama.mp3` = petugas). `asr.py` mentranskripsi per kata, `cut.py` memotong di jeda menjadi N01–N14 dan P01–P03 (`clips.json`), `verify.py` mencocokkan tiap klip dengan naskah. `audio_mix.py` membuat musik dan SFX sintesis dan me-mix di bawah dialog.
- `stage/`: panggung HTML/SVG yang dirender per frame. `chars2.js` (petugas: lengan dan kaki satu bentuk meruncing, tanpa sendi terlihat), `scene.js` (bangsal, pasien, titik, kamera, linimasa), `stage.js` (label, infografik, takarir per kata, kartu akhir), `mascot.js` (Kori dari SVG asli), `render.mjs` (render paralel), `data.json` (waktu kata dan lipsync).

## Cara render ulang (singkat)
1. Sajikan folder `stage/` lewat server statis (mis. `python3 -m http.server 8124`).
2. `node stage/render.mjs <folder_frame> 0 2160 4` lalu encode dengan ffmpeg bersama `mix.wav` (`loudnorm` ke sekitar -14 LUFS).

Path di skrip masih memakai folder kerja sesi pembuatan, jadi sesuaikan sebelum dijalankan.

## Catatan
- Isi medis belum dicek langsung ke halaman WHO (domain tidak terjangkau dari sesi pembuatan). Mohon dicocokkan: momen kebersihan tangan, handrub alkohol vs sabun-air, dan "sarung tangan tidak menggantikan kebersihan tangan".
- Narator mengucapkan "MEDCOEL" sebagai "Medcoil".
- Musik dan SFX berupa placeholder sintesis.
