# Video "Kerokan bisa menyembuhkan masuk angin? Kenapa bekasnya merah?"

Reels/TikTok 1080×1920, 30 fps, 78,87 detik (narasi 75,47 detik + jeda awal 0,6 dan akhir 2,8). Narasi dari MP3 ElevenLabs terlampir, dipakai apa adanya.

- `kerokan-masuk-angin_final.mp4`: video final. `..._pratinjau.mp4`: 540×960. `..._cover.jpg`: cover 1080×1920 satu seri dengan cover kopi dan dingin (judul besar dengan kata kuning, ilustrasi di tengah, takarir pendek, logo MEDCOEL di kiri bawah); judul, wajah, dan logo berada di area tengah yang aman untuk crop grid profil Instagram 1:1 dan 3:4.
- `NASKAH.md`: narasi per waktu, adegan, teks layar, catatan akurasi (baca bagian itu). `stage/`: panggung HTML/SVG per frame (sumber, termasuk `cover.html`). `audio/`: linimasa, takarir, desain suara, mix.
- Membuat ulang: `bash build.sh` (ffmpeg, numpy, Pillow, node + playwright; server statis melayani akar repo).

## Aset karakter baru dan lokasinya
Semua disimpan sebagai sumber yang bisa diedit di `brand/characters/raka/` tanpa mengubah gambar lama (tes memastikan gambar tanpa opsi baru identik):
- **Outfit `rumah`**: kaus oblong kuning mustard + celana training abu (`OUTFITS.rumah` di `raka.js`; `rakaSvg(state, { outfit: 'rumah' })`; SVG statis `svg/raka-rumah-*.svg`).
- **Tampak belakang (opsi `back`)**: punggung, kaus digulung (`lift`), bekas kerokan (`marks`, `drawn`, `drawnL`, `drawnR`, `oil`), menoleh lewat bahu (`turn`), wajah lurus ke kamera (`face`). Rambut selalu menempel pada kepala. SVG statis `svg/raka-punggung-*.svg`. Cara pakai dan tabel opsi ada di README Raka bagian "Tampak belakang dan bekas kerokan"; tes di akhir `raka.test.mjs` (23 tes lulus).
- Tokoh pendukung memakai `stage/orang.js` yang sudah ada: `LOOKS.ibu` (Ibu berhijab yang mengerok) dan `LOOKS.dokterPria` (tenaga kesehatan). Maskot: **Kori** dari `brand/mascots/kori.svg` (salinan `stage/kori.svg`), tanpa desain baru.
- Properti dan latar baru (ruang keluarga malam, bangku, koin, botol minyak kerokan, sofa dan selimut, cangkir, cermin, kaca pembesar, klinik): `stage/world.js`. Penampang kulit dan adegan penjelasan: `stage/stage.js`.

## Hal yang perlu diperiksa
1. Ejaan beberapa kata narasi (lihat `NASKAH.md`), karena teks berasal dari pengenalan suara.
2. Referensi Kemenkes dan BPPK tidak bisa dibuka dari lingkungan ini; lihat catatan akurasi.
3. Ilustrasi kulit adalah skema sederhana untuk edukasi, bukan gambar anatomi berskala.
