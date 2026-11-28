# QA — "Kenapa kulit merinding saat dingin?"
MP4 1080x1920, 30 fps, 69,13 dtk (edukasi 0-52,94 dtk dari audio asli + master outro 16,20 dtk), H.264 + AAC 48 kHz stereo.

## Yang diperiksa dan hasilnya
- **Timestamp**: 2074 frame (1588 edukasi + 486 outro), PTS seragam (0 selisih tidak teratur). Frame pertama dan terakhir outro cocok dengan master (selisih piksel 0,23 dan 0,28); master muncul tepat sekali; potongan keras dari frame terakhir edukasi.
- **Frame pertama**: aktif (angin dingin menerpa Raka, bahu terangkat, judul "KOK BISA MERINDING?" tampil; lensa pada lengan muncul 0,7 dtk).
- **Sinkron kunci**: otot arrector pili memendek tepat pada kata "berkontraksi" (21,6 dtk menurut ASR, gerak 21,6-22,3 dtk); folikel/rambut baru bergerak SETELAH itu (22,4-25,2 dtk), lalu kulit menonjol (26,4-27,8 dtk). Sebelum/sesudah dan garis putus posisi awal ditampilkan.
- **Pacing (selisih frame, 1588 frame)**: tanpa jeda diam; rentang "hampir diam" terpanjang 8 frame (0,27 dtk, saat peralihan adegan). Jendela 1 dtk paling sepi (rata-rata selisih): 25 dtk (0,10; saat folikel menahan posisi tegak), 20 dtk (0,17), 7 dtk (0,19). Panel hewan/manusia diberi goyangan rambut halus setelah putaran koreksi.
- **Audio** (ebur128): edukasi -14,4 LUFS (puncak -1,7 dBFS), gabungan -14,5 LUFS / -1,2 dBFS (setelah AAC). File gabungan TIDAK dinormalkan ulang. Efek hanya pada kejadian; angin kecil di awal.
- **Mekanisme/akurasi**: tidak ada rambut panjang tumbuh, tidak ada folikel baru, tidak ada salju/es di bawah kulit, tidak ada penghangatan instan. Dikatakan eksplisit bahwa pada manusia merinding bukan cara utama menjaga kehangatan; tidak diklaim tak berfungsi sama sekali. Rambut/tonjolan digambar kecil dan tidak serempak pada lengan.
- **Raka**: seluruh Raka dari `rakaSvg()`; lengan dan tangan memakai rig asli, tidak dibesarkan.

## Putaran koreksi
1. Penampang dibesarkan dan diturunkan (zoom 1,0) agar tidak separuh kosong, label "sebelum/sesudah" dipindah agar tidak menimpa chip, tag pembuluh dipindah dari caption, panel hewan/manusia ditata ulang (tinggi panel, latar krem, ekor kucing tidak bocor saat peralihan).
2. Goyangan rambut halus agar tidak ada jeda diam >0,3 dtk; limiter audio.

## Keterbatasan yang jujur
- **Saya tidak dapat mendengar audio atau menonton video pada kecepatan normal.** Gerak diperiksa lewat selisih frame dan lembar kontak; sinkron suara-visual berdasar waktu kata ASR (faster-whisper).
- **Sumber NIH dan NCBI TIDAK dapat dibuka** (lihat `SUMBER.md`): isi belum diverifikasi terhadap kedua halaman. Perlu verifikasi manusia.
- **Kulit lengan Raka ditampilkan lewat lensa/inset** karena lengan baju Raka tidak boleh diubah; tidak ada kulit telanjang di lengan Raka sendiri.
- Penampang kulit, saraf, otot, kucing, bulu, dan pembuluh adalah ilustrasi skematis (bukan skala): jumlah rambut, jalur saraf, dan waktu animasi adalah gaya animasi; reseptor dingin digambar sebagai satu titik.
- Kata pembicara "Apa ya menariknya?" berbeda sedikit dari naskah ("Apa yang menariknya?"); takarir memakai ejaan naskah.
- Respons "menggigil" hanya goyangan kecil Raka (tidak ada mini-Raka kedua); inset pembuluh menyempit digambar skematis.
- Puncak setelah AAC -1,2 dBFS (sedikit di atas target -1,4).
