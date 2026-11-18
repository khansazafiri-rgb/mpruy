# MEDCOEL — Mengapa gambar CT dan MRI berbeda?

Proyek animasi vertikal yang dapat diedit dan dirender ulang: 1080×1920, 30 fps, 76,3 detik. Outro web asli berlangsung 21,133 detik. Tidak mengubah proyek video lain atau kode aplikasi MEDCOEL.

## Isi

- `out/MEDCOEL-CT-MRI-FINAL.mp4`, cover PNG, takarir SRT/VTT.
- `audio/`: narasi Google AI Studio asli dan master linimasa; `audio-edits.json` mencatat jeda tambahan tanpa percepatan ucapan.
- `assets/`: CT dan MRI T2 asli/crop yang berlisensi jelas, rekaman materi/soal, rekaman baru Live 4D Lab, dan logo.
- `render.mjs`: scanner/pasien dan diagram konseptual, kamera, panah, penanda anatomi, lapisan teks, takarir, dan crop web. Tidak memakai gambar scan buatan AI.
- `prepare.py`: naskah, takarir dan keputusan waktu/jeda. `timeline.json`, `sentence-timing.json`, `captions.json` adalah hasil olah yang bisa diperiksa.
- `STYLE.md`: palet, font, anatomi, kamera, dan area aman yang dikunci.
- `SOURCES.json`, `SUMBER-DAN-LISENSI.md`, `lab-recording.json`, `QA.md`: asal aset, hak pemakaian, bukti rekaman, dan pemeriksaan.
- `out/lembar-shot-*.jpg`: awal, tengah, akhir setiap shot.

## Render ulang

Node 22+, Python 3, FFmpeg dengan libx264, lalu `npm install` dan `npm run render`. Jika FFmpeg di luar PATH: `FFMPEG=/path/to/ffmpeg npm run render`. `npm run stills` membuat frame pemeriksaan; `npm run cover` cover saja. Pillow diperlukan hanya untuk `python3 make-contact-sheets.py`.

`npm run preview` membuka server lokal dengan dukungan byte-range MP4 di `http://localhost:8767/preview.html`. Video ditampilkan 360×640; tersedia tombol putar penuh dan putar outro.

Untuk perubahan permanen: edit `prepare.py` untuk naskah/cue/jeda, `render.mjs` untuk lapisan visual, lalu render ulang dan lakukan QA kembali. Menjalankan prepare akan mengembalikan status linimasa ke IN_PRODUCTION sampai diperiksa ulang. Cache footage otomatis dibatalkan bila sumber atau waktu crop berubah.

## Keputusan editorial

CT tanpa kontras dan MRI T2 adalah contoh dari orang berbeda pada tingkat ventrikel lateral yang kira-kira sebanding. Citra tetap grayscale; tidak dimorf atau dianggap satu pasien. CT tidak diputar, MRI tidak diganti gambar T1/FLAIR. Medan magnet/RF dan proton adalah diagram konseptual. Tidak ada klaim salah satu pemeriksaan selalu lebih baik.

Edukasi sampai 55,167 detik. Materi 5,8 detik, soal/pembahasan 6 detik (pembahasan >3 detik), lalu lab CT/USG 6,033 detik dengan CTA menumpang 3,3 detik terakhir. Lab tidak menyediakan MRI; ia adalah simulasi edukatif, bukan alat diagnosis. Semua rekaman web 1×.

Narasi sumber 66,76 detik diperpanjang hanya lewat jeda hening yang memberi waktu membaca perbandingan dan tindakan web, menjadi 76,3 detik. Kata dan laju ucapan tidak diubah. Asal dan syarat lisensi citra/rekaman wajib ikut saat hasil dibagikan; lihat SUMBER-DAN-LISENSI.md.
