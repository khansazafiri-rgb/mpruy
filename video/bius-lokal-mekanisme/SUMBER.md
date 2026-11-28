# Sumber dan asal-usul
## Audio
| Berkas | Asal | Lisensi / catatan |
|---|---|---|
| `audio/narasi-edukasi.wav` | Narasi Google AI Studio dari pemesan (`Generated_Audio_November_28_2026_-_7_10PM.wav`), 24 kHz mono, 59,52 dtk. Tempo dan nada tidak diubah; di-resample ke 48 kHz stereo dan dinormalkan statis. Isi cocok dengan naskah pemesan (ASR hanya salah dengar "bius"->"bis", "kebas"->"ke bas", "membran"->"memberan", "menghambat"->"menghabat", "memblok"->"memblock"). | Dari pemesan. |
| `brand/video/outro/medcoel-outro-master.mp4` | Master outro baku MEDCOEL di repo (16,20 dtk), ditempel utuh dengan re-encode sesuai README master. | Aset MEDCOEL. |
| `audio/stem-*.wav` (tidak di-commit; dibuat ulang `audio/audio_mix.py`) | Musik (pad + pluck) dan efek halus (kanal membuka, Na+ masuk, sinyal berjalan, molekul obat, kanal terhambat, sinyal berhenti, peralihan) disintesis dari kode (numpy/scipy). Daftar efek + waktu: `audio/events.json`. | **CC0 1.0**, tanpa sampel pihak ketiga; aman untuk promosi Instagram/TikTok. |
## Gambar
Semua dari kode (`stage/*.js`). Raka hanya lewat `rakaSvg()` (`brand/characters/raka/raka.js`) termasuk varian berbaring; tangan dan lengan memakai rig asli (tidak dibesarkan; saraf diperbesar lewat kamera dan inset). Saraf, kanal, ion, molekul obat, otak, kolom sumsum tulang belakang, alat suntik, tabung krim, monitor, dan ikon tenaga anestesi digambar skematis. Logo `apps/web/src/assets/logo-full.webp`. Font `video/kopi-kafein-adenosin/stage/fonts`. Gaya diacu dari video `cegukan-hik`, `bawang-mata-berair`, `refleks-lutut`, dan `kenapa-memar-berubah-warna` (frame sepanjang video dilihat).
## Sumber isi (dibuka 2026-11-28)
- **OpenAnesthesia, Local anesthetic: mechanism of action and prolongation**: anestesi lokal memblok kanal natrium sehingga mencegah inisiasi dan perambatan potensial aksi; tempat kerja intraseluler: setelah masuk, bentuk terion berikatan dengan kanal natrium yang terbuka (dari sisi dalam); pH intraseluler memengaruhi efektivitas.
- **NHS, Local anaesthesia**: obat yang diberikan untuk membuat area tubuh kebas sehingga pasien sadar tetapi tidak merasakan nyeri; digunakan untuk berbagai tindakan minor; regional anaesthetic disebut sebagai jenis lain.
- **NHS, General anaesthesia**: obat diberikan sehingga pasien tertidur (tidak sadar) dan tidak merasakan apa pun selama prosedur; tim anestesi memantau pasien dan menyesuaikan obat.
