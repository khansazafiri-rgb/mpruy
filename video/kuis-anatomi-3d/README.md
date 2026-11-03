# Video promosi "Kuis Anatomi 3D MEDCOEL"

Reels/TikTok 1080×1920, 30 fps, 53,03 detik (narasi 49,63 detik + jeda awal 0,6 dan akhir 2,8). Narasi dari MP3 ElevenLabs terlampir, dipakai apa adanya.

- `kuis-anatomi-3d_final.mp4`: video final. `..._pratinjau.mp4`: 540×960.
- `kuis-anatomi-3d_cover.jpg`: cover terpisah 1080×1920 (judul "Hafal anatomi… tapi langsung lupa?", Raka di praktikum membawa atlas dan bingung, potongan model 3D nyata sebagai petunjuk solusi; judul, wajah, dan logo berada di area tengah aman untuk crop profil Instagram 1:1 dan 3:4).
- `NASKAH.md`: narasi per waktu, adegan, dan sumber visual.
- `stage/`: panggung HTML/SVG per frame (sumber). `audio/`: linimasa, takarir, desain suara, mix. `record/`: perekam kuis asli. `evidence/`: empat tangkapan dari rekaman asli. Membuat ulang: `bash build.sh`.

## Rekaman kuis asli (jujur soal sumbernya)
Seluruh layar kuis di video adalah **aplikasi MEDCOEL yang benar-benar dijalankan dan direkam**, bukan tiruan: halaman `/anatomy/study` dari `apps/web` (kode di repo ini, cabang `claude/cool-brown-nvhgnm`, commit dasar `3d32ed2`) dan viewer 3D dari proyek Anatomy (commit `2e4fb05`, build dengan basis `/anatomy/viewer/`). Pemilihan regio, sistem, mode, soal, pilihan jawaban, umpan balik, kartu mode, zoom/geser/klik pada model 3D semuanya keluaran aplikasi asli (halaman dan model tidak diubah atau digambar ulang; kursor dan cincin klik digambar di panggung dari posisi yang direkam).
Cara merekam: build `apps/web` dengan `vite.anatomy-preview.config.js` (akun contoh/fixture, tanpa backend, tanpa token, tanpa akun admin atau data pribadi), jalankan `PORT=4188 ANATOMY_DIST=<dist viewer> npm run preview:anatomy`, lalu `node record/record.cjs OUT 19`. Chromium dengan WebGL perangkat lunak; waktu viewer dibuat virtual agar tiap bingkai deterministik 30 fps; urutan soal dikunci lewat benih acak (19) dan jawaban/area di `record/config.json`. `record/data/` menyimpan posisi kursor, klik, dan penanda waktu.
Batasan yang harus diketahui:
1. **medcoel.com tidak bisa dijangkau dari lingkungan ini** (proxy 403), jadi saya tidak bisa membandingkan versi produksi dengan build lokal. Kesamaan versi dengan yang dilihat pengguna **belum terverifikasi**: mohon cocokkan beberapa layar (`evidence/`) dengan produksi.
2. Lencana akun khusus pratinjau disembunyikan (`[role=note]`); tidak ada elemen lain yang diubah. Situs produksi tidak diubah.
3. Soal dan area (Toraks, Rangka; Manubrium of sternum; soal Tebak sistem) dipilih dari rekaman seed tetap, data contoh. Tidak ada klaim fitur yang tidak terlihat di rekaman.
4. Rekaman bingkai (±930 JPEG) tidak dicommit karena besar; bisa dibuat ulang dengan perintah di atas.

**Tidak diperlukan rekaman layar dari pengguna** untuk versi ini. Bila ingin tampilan persis produksi (mis. UI terbaru atau soal lain), kirim rekaman layar (area dan soal yang sama) dan saya pasang di panggung menggantikan `stage/media/quiz`.

## Aset karakter
- **Raka**: kanonik `brand/characters/raka/raka.js`, tidak diubah (outfit `harian` di kos, `jas` di praktikum; ekspresi percaya diri → bingung → penasaran → senang dibuat dari state `raka(expr, pose, override)` yang sudah ada, kombinasinya tersimpan di `stage/stage.js` dan `stage/cover.html`). Tidak ada aset Raka baru yang perlu dipisahkan, aset lama tidak terpengaruh.
- **Kori**: maskot MEDCOEL existing, `brand/mascots/kori.svg` (salinan `stage/kori.svg`); dipilih dari Kori/Kila/Nilo. Tidak ada maskot baru.
- Adegan baru (kamar kos siang/malam, ruang praktikum, laptop kuis, buku atlas, tag nama): `stage/world.js` (dapat dipakai ulang).
