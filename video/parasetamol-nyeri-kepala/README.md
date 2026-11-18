# MEDCOEL — Farmakodinamik parasetamol untuk nyeri kepala

Video vertikal 1080 × 1920, 30 fps, 79,067 detik. Proyek animasi 2D berbasis kode, dapat diedit dan dirender ulang. Karakter Raka dirender langsung dari `brand/characters/raka/raka.js`; seluruh tulisan edukasi dan takarir dibuat sebagai teks pada panggung render, bukan digambar ke aset karakter.

## Hasil

- `out/MEDCOEL-parasetamol-FINAL.mp4`: H.264 + AAC, takarir tertanam.
- `out/medcoel-parasetamol-cover.png`: cover vertikal 1080 × 1920.
- `out/medcoel-parasetamol.srt` dan `.vtt`: takarir terpisah, bahasa Indonesia, maksimal dua baris.
- `audio/narasi-google-ai-studio.wav`: audio final asli yang diberikan pengguna, 72,68 detik.
- `audio/narasi-timeline.wav`: narasi yang digunakan pada MP4, dengan tambahan jeda hening di outro.
- `out/lembar-shot-1.jpg` sampai `lembar-shot-4.jpg`: awal, tengah, akhir semua 14 shot.
- `QA.md`, `SOURCES.json`, `audio-edits.json`: catatan pemeriksaan, sumber aset, dan edit audio.

## Render ulang

Kebutuhan: Node 22+, Python 3, FFmpeg dengan libx264, dan dependensi Node dari `package.json`. Tidak memerlukan layanan AI atau API berbayar untuk merender ulang.

```sh
npm install
npm run render
```

Jika FFmpeg di luar PATH: `FFMPEG=/path/to/ffmpeg npm run render`. `npm run stills` merender frame pemeriksaan; `npm run cover` merender cover saja. Untuk lembar kontak: pasang Pillow pada Python, lalu jalankan `python3 make-contact-sheets.py` setelah stills dibuat.

`npm run preview` membuka server lokal. Buka `http://localhost:8765/preview.html`, lalu putar penuh atau putar outro pada ukuran 360 × 640.

## Mengedit

- `render.mjs`: visual tiap shot, lapisan teks, diagram anatomi, kamera, pose Raka, crop dan komposisi web. Karakter memakai satu sweater dan proporsi kanonik; tidak digambar ulang.
- `prepare.py`: sumber linimasa, teks naskah/takarir, dan keputusan jeda audio. Edit berkas ini untuk perubahan permanen, kemudian jalankan `npm run render`. Berkas JSON keluaran dibuat ulang oleh langkah prepare.
- `timeline.json`: waktu 14 shot dan penanda istilah. `sentence-timing.json`: waktu asli dan waktu pada video untuk setiap kalimat/frasa. `captions.json`: lapisan teks takarir; `naskah-final.txt`: transkripsi narasi dengan ejaan istilah dan merek dinormalkan.
- `STYLE.md` dan `room-map.svg`: palet, font, ruang, karakter, anatomi, dan area aman yang dikunci sebelum shot dibuat.
- `assets/`: rekaman web asli dan logo, tanpa filter pixel. Rekaman tidak dipercepat dan suaranya tidak dipakai.

## Penyesuaian durasi

Edukasi 0–59,067 detik; outro 59,067–79,067 detik. Materi 7,067 detik, soal/pembahasan 6,5 detik, Simulasi Dokter 6,433 detik. CTA menumpang 3,5 detik terakhir. Halaman pembahasan terlihat sekitar empat detik.

Audio asli tidak diubah laju, nada, atau volumenya. Ditambahkan jeda 4,833 detik pada waktu sumber 67,90 detik dan 0,60 detik pada 70,00 detik, serta hening akhir 0,953 detik. Semua sampel PCM sumber dipertahankan berurutan dan identik. Jeda berada di antara frasa; tidak ada kata diulang atau diganti. Audio sumber yang keliru pada draf awal tidak digunakan dan tidak disertakan.

Tidak ada musik, SFX, audio rekaman web, atau audio iklan lama. Sumber audio tunggal: file Google AI Studio yang diberikan pengguna pada 18 November 2026, pukul 13.50.
