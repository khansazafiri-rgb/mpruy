# QA — "Kenapa varises bisa terjadi?"
MP4 1080x1920, 30 fps, 45,60 dtk (edukasi 0-29,40 dtk dari audio asli + master outro 16,20 dtk), H.264 + AAC 48 kHz stereo. Audio asli 29,40 dtk dimulai tepat di detik 0, jadi hook visual berjalan bersama kalimat pertama ("Perhatikan aliran darah di pembuluh kaki ini").

## Yang diperiksa dan hasilnya
- **Timestamp**: 1368 frame video (882 edukasi + 486 outro), PTS seragam 0,0333 dtk. Frame pertama outro cocok dengan frame pertama master (selisih piksel 0,23) dan frame terakhir dengan frame terakhir master (0,26); potongan keras dari frame terakhir edukasi.
- **Frame pertama**: aktif (Raka resmi kaget, sel darah bergerak, sebagian berbalik, judul sudah tampil).
- **Pacing (selisih frame, 882 frame)**: tidak ada jeda diam >0,33 dtk. Jendela 1 dtk paling sepi: 0 dtk dan 19 dtk (model kaki + Raka; sel dan cincin penanda tetap bergerak).
- **Audio** (ebur128): edukasi -14,5 LUFS (puncak -1,5 dBFS), outro -14,4 LUFS, gabungan -14,5 LUFS / -1,3 dBFS; master -14,4 LUFS. File gabungan TIDAK dinormalkan ulang. Tidak ada suara tambahan di atas outro.
- **Mekanisme**: atas layar = menuju jantung di seluruh video (kamera hanya bergeser/zoom, tidak memutar). Katup normal: daun membuka saat darah naik, bertemu rapat saat aliran mencoba kembali, sel tetap tertahan di atasnya. Katup lemah: daun setengah menutup dan tidak bertemu; hanya sebagian sel melewati celah ke bawah dan berkumpul di bawah katup, sebagian lain tetap naik; dinding segmen bawah melebar bertahap. Pelebaran/berkelok pada vena dekat kulit bertahap (tidak seketika). Perbandingan memakai kamera dan lebar vena yang sama.
- **Warna panah** = arah aliran (teal naik, jingga berbalik), bukan kadar oksigen; ada label "KE JANTUNG ↑" / "ke jantung" dan "berbalik". Sel darah satu bentuk dan satu warna.
- **Raka**: seluruh Raka dari `rakaSvg()`; hadir sejak frame 0, di model kaki (16,8-20,4 dtk) dan di perbandingan; patch logo terlihat; kamera zoom hook memotong Raka hanya selama zoom ke vena.
- **Tidak ada**: sumbatan/bekuan darah, gejala/pengobatan, angka atau grafik kecil.

## Putaran koreksi
1. Model kaki dan vena diperbesar (sel dan katup awalnya terlalu kecil), legenda panah dipindah dari tumpang tindih, tag "KE JANTUNG" di perbandingan tidak terpotong, katup lemah dibuat setengah menutup sehingga celahnya terlihat sepanjang waktu (bukan hanya saat fase tutup), gerak tambahan pada model kaki 17-20 dtk (sel dan cincin penanda), label di model kaki dipindah dari badan Raka.
2. Frame terakhir hasil gabung (1 frame lebih) dirapikan, cover disusun ulang.

## Keterbatasan yang jujur
- **Saya tidak dapat mendengar audio atau menonton video pada kecepatan normal.** Gerak diperiksa lewat selisih frame dan lembar kontak; sinkron suara-visual berdasar waktu kata ASR (faster-whisper) dan posisi kata dalam audio.
- Vena, katup, sel, dan model kaki skematis dan ilustratif (bukan skala atau fisiologi aliran sungguhan); daun katup digambar sebagai dua kapsul kuning; jumlah/kecepatan sel dan "denyut" aliran (periode 1,2 dtk) adalah gaya animasi.
- Target "sekitar 30-32 dtk termasuk hook": edukasi 29,4 dtk (mengikuti WAV, tanpa jeda tambahan di depan).
- Beberapa label kecil (24-30 px) agak kecil di ponsel; Raka di perbandingan relatif kecil dibanding vena demi menjaga skala vena tetap besar.
