# QA — "Kenapa tubuh berkeringat saat kepanasan?"
MP4 1080x1920, 30 fps, 83,20 dtk (edukasi 0-67,00 dtk dari audio asli + master outro 16,20 dtk), H.264 + AAC 48 kHz stereo. Catatan: audio asli 67,00 dtk, sedikit di atas target 55-65 dtk; tempo tidak diubah.

## Yang diperiksa dan hasilnya
- **Timestamp**: 2496 frame, PTS seragam 0,0333 dtk (diurutkan). Frame pertama outro cocok dengan frame pertama master (selisih piksel rata-rata 0,23); potongan keras dari frame terakhir edukasi.
- **Frame pertama**: aktif (termometer, tetes di dahi, judul "KENAPA TUBUH BERKERINGAT?" sudah tampil).
- **Pacing (selisih frame, 2010 frame edukasi)**: tidak ada jeda diam >0,4 dtk. Jendela 1 dtk paling sepi (selisih rata-rata <0,3): 8-9 dtk (hipotalamus berdenyut), 11 dtk, 18 dtk, 47, 50, 52-55, 58, 61 dtk (Raka relatif diam sambil tetes/panas bergerak). Peralihan adegan (4,7; 13,8; 30,8; 38,7; 43,8; 59,5 dtk) adalah crossfade 0,15-0,25 dtk atau potongan makro.
- **Audio** (ebur128): edukasi -14,5 LUFS (puncak -1,2 dBFS setelah AAC; -1,6 dBFS pada mix), outro -14,4 LUFS, master -14,4 LUFS. File gabungan TIDAK dinormalkan ulang. Tidak ada suara/musik tambahan di atas outro.
- **Mekanisme**: orientasi satu potongan kulit (permukaan atas, gulungan di dermis bawah, saluran ke pori, saraf masuk dari kanan) dipertahankan dari lensa kulit di peta tubuh sampai penampang. Sinyal/asetilkolin emas, cairan biru muda, garam teal, panas koral konsisten. Garam keluar menyamping dari saluran ke jaringan; tetes yang sampai ke kulit hanya membawa sebagian titik garam.
- **Penguapan** digambar sebagai peristiwa: molekul air meninggalkan tetes (halo koral = membawa panas), kulit dan termometer mendingin; pada udara lembap udara dipenuhi uap air, hanya sedikit molekul pergi dan sebagian kembali.
- **Dua gangguan** tidak tertukar: kiri = hiperhidrosis (banyak tetes, suhu normal), kanan = hipohidrosis/anhidrosis (tetes sedikit/tidak ada, panas menumpuk); Raka berukuran sama (skala 0,98) dan hanya jumlah tetes/panas yang berubah. Tidak ada klaim diagnosis dari jumlah tetes.
- **Proporsi Raka**: seluruh Raka pakai `rakaSvg()`; tangan/lengan mengikuti aset; pori dan kulit TIDAK ditempel pada Raka besar, melainkan lensa kecil di peta tubuh lalu potongan penampang makro tersendiri.

## Putaran koreksi
1. Tata letak peta tubuh (label menimpa Raka/caption), saluran dan gulungan dibuat lebih tebal/terbaca, panah panas di tepi layar digeser, zoom panel udara kering/lembap diperbesar, gerak tambahan pada adegan statis (titik sinyal koral, panah panas, gelombang di otak, lap dahi/kipas pada Raka, gelombang panas pada penutup), tata letak penutup heat stroke (tag tidak menimpa lengan).
2. Frame pertama dibuat aktif (judul dan tetes ada di frame 0), ekspresi hook diganti agar terlihat kepanasan, cover disusun ulang agar judul tidak menutupi jambul Raka.

## Keterbatasan yang jujur
- **Saya tidak dapat mendengar audio atau menonton video pada kecepatan normal.** Gerak diperiksa lewat selisih frame dan lembar kontak; sinkron suara-visual berdasar waktu kata ASR (faster-whisper). ASR salah dengar "saraf", "asetilkolin", "hipohidrosis" (jadi "hiperhidrosis"), dan "heat"; takarir memakai ejaan naskah pemesan.
- **Halaman CDC tidak dapat dibuka** (lihat `SUMBER.md`): klaim heat stroke belum diverifikasi ke sumbernya.
- Otak, kelenjar, saluran, molekul, jumlah partikel dan kecepatan alirnya skematis dan ilustratif (ada label "ilustrasi, tidak sesuai skala" di adegan penampang dan makro); ukuran pori/tetes dibesarkan.
- Puncak sesudah AAC -1,2 dBFS (sedikit di atas target -1,4); beberapa label kecil (24-30 px) mungkin agak kecil di ponsel; adegan F/G memakai Raka yang cukup diam dengan tetes dan panas bergerak.
- Ruang kosong di bawah (di bawah takarir) mengikuti tata letak video MEDCOEL lain agar aman dari UI platform.
