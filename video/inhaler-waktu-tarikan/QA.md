# QA — "Kenapa waktu menekan inhaler penting?"
MP4 1080x1920, 30 fps, 68,40 dtk (edukasi 0-52,20 dtk dari audio asli + master outro 16,20 dtk), H.264 + AAC 48 kHz stereo.

## Yang diperiksa dan hasilnya
- **Timestamp**: 2052 frame video, PTS seragam 0,0333 dtk (diurutkan), tidak ada frame hilang. Frame pertama master outro cocok dengan sambungan (selisih piksel rata-rata 0,23 terhadap frame pertama master); potongan keras dari frame terakhir edukasi.
- **Pacing (selisih frame, 1566 frame edukasi)**: satu-satunya jeda diam >0,5 dtk ada di 7,87-8,40 dtk (shot dekat jari menahan tekan sebelum tabung bergerak). Kartu jenis inhaler diberi gerak mengambang halus agar 4 dtk terakhir tidak statis.
- **Audio** (ebur128): edukasi -14,5 LUFS (puncak sampel -1,6 dBFS pada mix; -1,1 dBFS setelah AAC), outro -14,4 LUFS, master -14,4 LUFS. File gabungan TIDAK dinormalkan ulang; hanya bagian edukasi disetel sebelum ditempel. Tidak ada suara/musik tambahan di atas outro.
- **Proporsi tangan/inhaler**: jari menekan kaleng hanya muncul di shot dekat tersendiri (potongan keras 6,7 dan 8,55 dtk); pada Raka kecil inhaler ~2x diameter tangan, posisi di mulut diperiksa pada lembar kontak berbagai detik (hook, ringkasan, penutup).
- **Isi**: hanya MDI tanpa spacer; partikel mengikuti aliran udara (bukan uap/oksigen); saluran napas (bukan pembuluh darah) diberi label; reseptor beta-2 di otot polos; pelebaran saluran napas digambar bertahap dan kecil (garis putus "sebelum").

## Putaran koreksi
1. Tata letak adegan penutup (kartu menutupi judul, teks kartu spacer meluber), posisi inhaler di hook digeser agar tabung tidak menutup mata, gerak halus kartu, batas puncak audio (limiter), kesalahan jumlah frame (1560 -> 1566) diperbaiki sebelum final.
(Putaran kedua tidak diperlukan.)

## Keterbatasan yang jujur
- **Saya tidak dapat mendengar audio atau menonton video pada kecepatan normal.** Gerak diperiksa lewat selisih frame dan lembar kontak; sinkron suara-visual berdasar waktu kata ASR (faster-whisper) dan takarir memakai ejaan naskah (ASR salah dengar "beta dua", "selurna napas").
- Saluran napas, otot, reseptor, dan jumlah/gerak partikel skematis dan ilustrasi (bukan skala atau fisika aliran sungguhan); sebagian besar partikel pada "terlalu awal" digambar menempel di lidah sebagai ilustrasi.
- Jari yang menekan inhaler dan tabung pada hook tampil dari depan sehingga tabung berada di depan wajah (konvensi gambar). Beberapa label berukuran 28-34 px agak kecil di ponsel; mini-diagram ringkasan (45 dtk) relatif kecil.
- Puncak sesudah AAC -1,1 dBFS (sedikit di atas target -1,4); kelantangan edukasi 0,1 LU di bawah master.
