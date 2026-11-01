# Video "Kenapa Kopi Bikin Kita Nggak Ngantuk?"

Reels/TikTok 1080×1920, 30 fps, 91,93 detik (narasi 88,53 detik + jeda awal 0,6 dan akhir 2,8). Narasi dari MP3 ElevenLabs terlampir, dipakai apa adanya (tidak dipercepat, nada tidak diubah, tidak dipotong).

- `kopi-kafein-adenosin_final.mp4`: video final. `..._pratinjau.mp4`: 540×960. `..._thumbnail.jpg`: sampul.
- `NASKAH.md`: narasi per waktu, adegan, **sumber penelitian**, dan catatan akurasi.
- `stage/`: panggung HTML/SVG per frame (sumber). `audio/`: linimasa dan takarir, desain suara, mix.
- Membuat ulang: `bash build.sh` (ffmpeg, numpy, node + playwright; server statis melayani akar repo).

## Status
Final: memakai MP3 narator terlampir dan seluruh adegan pada brief. Dua hal yang perlu diketahui: (1) titik potong takarir pada kalimat panjang dari pengenalan suara Whisper, tiga di antaranya dikoreksi tangan karena batas kata tidak memiliki jeda (pada 12,09; 28,27; dan 42,14 detik); (2) musik dan efek adalah sintesis sendiri (bebas hak cipta, aman untuk promosi), volumenya di bawah narator (selisih rata-rata sekitar 24 dB di pita speaker ponsel, terburuk sekitar 7 dB pada 32 detik).

## Sumber penelitian
Stepan ME, Altmann EM, Fenn KM. *Caffeine selectively mitigates cognitive deficits caused by sleep deprivation.* J Exp Psychol Learn Mem Cogn. 2021;47(9):1371-1382. DOI 10.1037/xlm0001023. https://pubmed.ncbi.nlm.nih.gov/34014758/ (ditampilkan di layar pada 70 dan 85 detik).

## Aset karakter dan lokasinya
- **Raka** (kanonik): `brand/characters/raka/raka.js`. Ditambah di PR ini: **memegang cangkir** (`armR.hold` 0..1 dan `holdRot`, gambar di belakang telapak; README Raka dan tes diperbarui). Duduk di balik meja: `rakaDesk()` di `stage/world.js`.
- **Dunia dalam tubuh**: `stage/bio.js` (adenosin ungu, kafein oranye, reseptor biru, neuron, indikator dorongan tidur, dunia pencernaan dan pembuluh darah, peta tubuh). Warna dan bentuk konsisten (`COL`, `adenosine()`, `caffeine()`, `receptor()`).
- **Kamar belajar dan ikon**: `stage/world.js`. Maskot Kori: `brand/mascots/kori.svg` (salinan `stage/kori.svg`). Logo: `stage/logo-full.webp`.
