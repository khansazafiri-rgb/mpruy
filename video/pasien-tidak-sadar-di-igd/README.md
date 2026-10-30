# Video "Pasien Tidak Sadar di IGD: Dokter Harus Menunggu Keluarga?"

Reels/TikTok 1080×1920, 30 fps, 93,29 detik (narasi 89,89 detik + jeda awal 0,6 dan akhir 2,8). Narasi dari MP3 ElevenLabs final, dipakai apa adanya (tidak dipercepat, tidak diubah nadanya, tidak dipotong).

- `pasien-tidak-sadar-di-igd_final.mp4`: video final. `..._pratinjau.mp4`: 540×960. `..._thumbnail.jpg`: sampul.
- `NASKAH.md`: narasi per waktu, adegan, catatan akurasi hukum.
- `stage/`: panggung HTML/SVG per frame (sumber). `audio/`: linimasa, takarir, desain suara, mix.
- Membuat ulang: `bash build.sh` (ffmpeg, numpy, node + playwright; server statis melayani akar repo).

## Status
Final: memakai MP3 narator final dan seluruh enam adegan. Gerak mulut tokoh utama (perawat dan anak) mengikuti energi suara narator. Dua hal yang perlu diketahui: (1) titik potong takarir pada kalimat panjang dari pengenalan suara Whisper (sebagian) dan analisis jeda audio (tiga potong terakhir pada 66–83 detik); (2) desain suara adalah sintesis sendiri, bukan rekaman ruang IGD sungguhan.

## Aset karakter yang dipakai dan lokasinya
- **Raka** (kanonik): `brand/characters/raka/raka.js`, panduan `brand/characters/raka/README.md`. Ditambah di PR ini: varian berbaring (`rakaSvg(state, { rebah: true })`, kanvas `LYING`), keadaan `blood` (bercak darah, 0..1), ekspresi `pingsan` dan `bingung`, pose `berbaring` dan `pov_perut`, plus SVG siap pakai `brand/characters/raka/svg/raka-berbaring-*.svg`, `raka-darurat.svg`, `raka-pov-perut.svg`. Tes: `node --test brand/characters/raka/raka.test.mjs`.
- **Tokoh pendukung baru** (dokter pria, dokter perempuan, perawat berhijab, anak, Ibu berhijab): `video/pasien-tidak-sadar-di-igd/stage/orang.js` (`orang()`, `orangSvg()`, `LOOKS`). Konstruksi sama dengan Raka. Pakai ulang dengan mengimpor file itu; tokoh baru cukup menambah entri `LOOKS`.
- **Pasien "Bu"** (adegan persetujuan umum): `video/dok-saya-kenapa/stage/pasien.js` (sudah ada, dipakai ulang tanpa diubah).
- **Latar dan ikon**: `stage/world.js` (bilik IGD, monitor, tiang infus, ruang konsultasi, ikon), `stage/scenes.js` (meja perawat, kartu penjelasan, ikon syarat), `stage/pov.js` (pandangan orang pertama).
- **Maskot Kori**: `brand/mascots/kori.svg` (salinan `stage/kori.svg`). Logo: `stage/logo-full.webp`.
