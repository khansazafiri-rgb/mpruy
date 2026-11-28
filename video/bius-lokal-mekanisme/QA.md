# QA — "Bagaimana obat bius lokal bekerja?"
MP4 1080x1920, 30 fps, 75,73 dtk (edukasi 0-59,52 dtk dari audio asli + master outro 16,20 dtk), H.264 + AAC 48 kHz stereo. Audio asli 59,52 dtk (di bawah perkiraan 60-75 dtk); tempo tidak diubah.

## Yang diperiksa dan hasilnya
- **Timestamp**: 2272 frame (1786 edukasi + 486 outro), PTS seragam 0,0333 dtk. Frame pertama dan terakhir outro cocok dengan master (selisih piksel 0,23 dan 0,28); potongan keras dari frame terakhir edukasi; master muncul tepat sekali.
- **Frame pertama**: aktif (Raka bereaksi, alat menyentuh kulit, denyut mulai berjalan, judul tampil).
- **Pacing (selisih frame, 1786 frame)**: tidak ada jeda diam >0,33 dtk setelah putaran koreksi. Jendela 1 dtk paling sepi (<0,4): 0, 16, 23, 34, 36-37, 41, 44, 47, 49, 51, 53, dan 58 dtk; yang paling sepi 51 dtk (bius total: hanya EKG, napas halus, dan molekul di otak yang bergerak, rata-rata selisih 0,14).
- **Audio** (ebur128): edukasi -14,4 LUFS (puncak -1,0 dBFS setelah AAC; -2,1 dBFS pada mix), outro -14,4 LUFS, gabungan -14,4 LUFS / -1,0 dBFS. File gabungan TIDAK dinormalkan ulang. Efek hanya pada kejadian (tidak tiap detik).
- **Mekanisme**: Na+ masuk (kanal terbuka) SEBELUM dan selama gelombang berjalan; gelombang digambar berurutan (pita teal dengan tanda +), bukan satu kilat. Model saraf, sudut, dan zoom (1,25) sama pada keadaan normal dan setelah obat; hanya segmen yang diberi obat yang berubah. Obat tidak digambar sebagai tembok pemotong saraf: hanya sebagian molekul menembus membran, mengikat kanal dari sisi dalam (plug magenta di mulut dalam kanal); Na+ tidak bisa masuk; gelombang melemah bertahap dan berhenti di segmen itu, sedangkan segmen lain tetap normal. Obat bekerja pada kanal, bukan "mematikan otak"; otak digambar hanya sebagai tujuan sinyal normal.
- **Bukti pada Raka**: kembali ke sudut awal; area kecil diberi batas ungu halus; alat menyentuh tanpa reaksi; Raka tetap bergerak, berbicara ("Aku sadar kok."), dan melihat.
- **Jenis**: tiga panel besar bergantian (lokal, regional, total), lalu tiga baris ringkasan. Regional tidak disebut "bius lokal dengan dosis lebih banyak": ada label bahwa lokasi pemberian dan cakupan blok berbeda. Total digambarkan bekerja pada sistem saraf pusat dengan pemantauan tenaga anestesi, tanpa ikon tidur biasa.
- **Raka**: seluruh Raka dari `rakaSvg()` (varian berbaring `pingsan` untuk bius total); lengan dan tangan memakai rig asli, tidak dibesarkan.

## Putaran koreksi
1. Posisi dan ukuran Raka/lengan (awalnya lengan tidak terjulur dan alat seperti dipegang Raka; alat dipindah ke sarung tangan pemeriksa), kanal/akson dan kolom sumsum tulang belakang digabung agar sinyal terlihat berbelok ke atas, zoom model saraf diperbesar, latar otak diperpanjang, caption dipecah agar tidak terpotong, tata letak adegan bius total dan ringkasan, gerak tambahan di semua adegan Raka/panel (goyangan, plunger suntikan, titik obat berjalan, garis berjalan, EKG, baris berdenyut).
2. Peredaman puncak audio (limiter) dan normalisasi ulang; jumlah frame di encode disesuaikan; cover dibuat dari adegan pembuka.

## Keterbatasan yang jujur
- **Saya tidak dapat mendengar audio atau menonton video pada kecepatan normal.** Gerak diperiksa lewat selisih frame dan lembar kontak; sinkron suara-visual berdasar waktu kata ASR (faster-whisper).
- **Area kulit yang disentuh adalah tangan/pergelangan**: lengan baju Raka tidak boleh diubah, jadi kulit yang terlihat hanyalah tangan; denyut tetap berjalan sepanjang lengan menuju bahu. Panel regional memberi warna pada seluruh lengan dan tangan.
- Saraf, kanal, ion, molekul, otak, dan sumsum tulang belakang skematis dan ilustratif (bukan skala): jumlah partikel, kecepatan gelombang, dan bentuk ujung saraf adalah gaya animasi. Molekul obat digambar sebagai satu bentuk (kapsul) tanpa membedakan bentuk terion/tak terion.
- Puncak setelah AAC -1,0 dBFS (sedikit di atas target -1,4).
- Ikon tenaga anestesi, monitor, tabung krim, dan alat suntik adalah ikon sederhana, bukan karakter atau foto.
