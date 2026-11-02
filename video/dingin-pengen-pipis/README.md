# Video "Kenapa Kalau Dingin Jadi Lebih Sering Ingin Pipis?"

Reels/TikTok 1080×1920, 30 fps, 87,67 detik (narasi 84,27 detik + jeda awal 0,6 dan akhir 2,8). Narasi dari MP3 ElevenLabs terlampir, dipakai apa adanya (tidak dipercepat, nada tidak diubah, tidak dipotong).

- `dingin-pengen-pipis_final.mp4`: video final. `..._pratinjau.mp4`: 540×960. `..._cover.jpg`: cover 1080×1920 (judul, wajah, dan logo berada di area tengah yang aman untuk crop grid profil Instagram 1:1 dan 3:4).
- `NASKAH.md`: narasi per waktu, adegan, **sumber**, dan catatan akurasi (baca bagian itu).
- `stage/`: panggung HTML/SVG per frame (sumber). `audio/`: linimasa, takarir, desain suara, mix. `stage/cover.html` + `stage/cover.mjs`: sumber cover.
- Membuat ulang: `bash build.sh` (ffmpeg, numpy, node + playwright; server statis melayani akar repo).

## Status
Final: memakai MP3 terlampir dan seluruh adegan pada brief. Perlu diketahui: (1) titik potong takarir pada kalimat panjang dari pengenalan suara Whisper, satu di antaranya (pada 82,1 detik) dikoreksi tangan; (2) musik dan efek sintesis sendiri (bebas hak cipta, aman untuk promosi), volume di bawah narator; (3) catatan akurasi tentang hasil penelitian Atterhög dkk. (1975) di `NASKAH.md`.

## Aset karakter dan lokasinya
- **Raka** (kanonik): `brand/characters/raka/raka.js`. Varian baru di PR ini: **outfit `jaket`** (jaket puffer oranye, kerah tinggi, resleting; `rakaSvg(state, { outfit: 'jaket' })`, SVG statis `brand/characters/raka/svg/raka-jaket-*.svg`, README Raka dan tes diperbarui). Pose pakai ulang: `HUG` (memeluk jaket) dan `shiver()` (menggigil) di `stage/world.js`.
- **Kori** (maskot MEDCOEL, peran "rasa ingin tahu"): `brand/mascots/kori.svg` (salinan `stage/kori.svg`), dikendalikan lewat kelas lapisan `.mc-float`, `.mc-arm-right`, `.mc-eyes-*`, `.mc-mouth-*` (lihat `docs/MASKOT.md`). Tidak ada desain maskot baru.
- **Dosen**: `stage/orang.js` (`LOOKS.dosen`, bangun dari konstruksi yang sama dengan Raka).
- **Dunia luar** (`stage/world.js`: kelas ber-AC, tanda toilet, lorong) dan **dunia dalam tubuh** (`stage/body.js`: penampang kulit, peta tubuh, ginjal, kandung kemih, ikon faktor). Logo: `stage/logo-full.webp`.
