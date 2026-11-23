# Laporan pemeriksaan (QA)

## Batas yang jujur
Lingkungan pembuat tidak bisa memutar video bersuara pada kecepatan normal. **Saya tidak menonton video ini dengan suara dari awal sampai akhir.** Dilakukan: kontak sheet dari MP4 akhir (tiap 0,5 dtk untuk seluruh bagian edukasi), bingkai kunci 540 px dan 270 px untuk keterbacaan ponsel, ASR audio akhir, kenyaringan, deteksi hitam/beku, dan perbandingan master. Kelancaran gerak, ritme, keseimbangan musik-narasi, dan rasa sinkron kata-visual harus dinilai orang. Pratinjau di ponsel nyata tidak dilakukan.

## Hasil terukur
| Pemeriksaan | Hasil |
|---|---|
| Format | H.264 1080 x 1920, 30 fps, 1314 bingkai (43,800 dtk); AAC 48 kHz stereo |
| Kenyaringan | -14,3 LUFS, LRA 4,5 LU, puncak sejati -0,9 dBFS (edukasi dinormalkan ke -14 LUFS; master tidak dinormalkan ulang) |
| Master outro utuh | Audio 27,6 - 43,8 dtk vs master: gain 0,995, korelasi 0,9993, rasio sisa 28,8 dB; tidak ada teks/CTA tambahan |
| Hitam / beku | Tidak ada bingkai hitam. Beku >= 0,7 dtk hanya di logo/URL master (sengaja). Bagian edukasi tidak ada |
| ASR audio akhir | Seluruh kalimat naskah terbaca berurutan ("glombang", "KRS", "terkordinasi" adalah kesalahan ASR; audio sumber tidak diubah) |
| Frame pertama | Garis EKG sudah terbentuk (P sedang selesai), penunjuk bergerak, impuls di jantung, Raka dan teks hook terlihat sejak bingkai 0 |

## Pemeriksaan visual (bingkai)
- **P / segmen PR / QRS terlihat jelas** (label P, SEGMEN PR berpita emas, QRS) pada lebar 270 - 540 px; panel jantung dan grafik besar; tidak ada ikon sosial, pop-up, atau grafik kecil tambahan.
- **Impuls tidak "mati":** di segmen PR titik impuls berdenyut di nodus AV (lingkaran halus), penunjuk EKG terus bergerak, ada catatan "impuls masih bergerak, hanya tertahan sejenak"; tidak ada layar padam atau bilik berhenti.
- **Listrik mendahului kontraksi:** aktivasi jingga bilik dan QRS mulai bersamaan di tn 19,6; bilik mulai mengecil (kontraksi) setelah QRS selesai (tn 21,5+), diberi catatan "listrik lebih dulu, kontraksi menyusul".
- **Orientasi jantung tetap** (serambi atas, bilik bawah); kamera hanya mendekat/menjauh, tidak memutar.
- **Raka:** muncul di hook (di depan monitor, menunjuk garis) dan kembali di penutup (menunjuk ruas datar, tersenyum) sebelum outro; patch logo, rambut navy, sweater teal, proporsi lengan dan tangan konsisten dengan aset (periksa bingkai 0,35 dan 25,0 dtk).
- **GERAK DIPERLAMBAT** tampil sepanjang bagian mekanisme agar tidak dikira jeda berlangsung beberapa detik di tubuh.

## Putaran perbaikan terarah (maks. dua)
**Putaran 1** (dari pemeriksaan draf pertama):
1. Jantung di hook terlalu kecil -> kartu dan jantung diperbesar (skala 0,5 -> 0,62).
2. Raka di penutup menyentuh tepi kanan layar -> digeser dan ditarik ke dalam bingkai.
3. Cover: Raka menutup label SEGMEN PR dan sebagian grafik -> tata letak cover dibuat ulang (Raka di atas grafik, QRS terlihat).
**Putaran 2:** tidak diperlukan perbaikan lanjutan pada draf kedua dari pemeriksaan bingkai; satu-satunya yang saya catat tetapi tidak ubah ada di bawah.

## Yang perlu dinilai manusia / catatan
- Putar penuh dengan suara pada ponsel: sinkron kata dengan visual (ruang visual setelah "nodus AV", "segmen PR"), keseimbangan musik-narasi, sambungan keras ke master outro, kelancaran gerak jantung/EKG.
- Di penutup, lengan Raka yang menunjuk menutupi sebagian sisi kanan panel EKG (tepi pita PR dan awal QRS agak tertutup pada beberapa bingkai). Bila terganggu, Raka dapat digeser ke kiri.
- Garis P pada hook dimulai pada waktu ~0,3 dtk, jadi P tampak sedang selesai, bukan sudah selesai sebelum bingkai pertama.
- Satu sumber medis (NCBI NBK555952) tidak dapat dibuka dan tidak dipakai; lihat `SUMBER.md`.
- Entri katalog video (`docs/VIDEO_KATALOG.md`) belum ditambahkan di PR ini karena `scripts/video/update_catalog.py` di base berisi baris konflik sisa yang diperbaiki di PR lain (#260); setelah itu masuk, jalankan skrip untuk menambahkan entri.
