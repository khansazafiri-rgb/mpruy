# QA — "Kenapa telinga terasa penuh, lalu 'pop', saat pesawat turun?"
MP4 1080x1920, 30 fps, 49,67 dtk (edukasi 0-33,48 dtk dari audio asli + master outro 16,20 dtk), H.264 + AAC 48 kHz stereo. Audio asli 33,48 dtk (di bawah perkiraan 35-45 dtk); tempo tidak diubah.

## Yang diperiksa dan hasilnya
- **Timestamp**: 1490 frame (1004 edukasi + 486 outro), PTS seragam 0,0333 dtk. Frame pertama dan terakhir outro cocok dengan master (selisih piksel 0,23 dan 0,29); potongan keras dari frame terakhir edukasi.
- **Frame pertama**: aktif (kabin turun, awan bergerak, Raka resmi sudah menyentuh telinga, judul tampil).
- **Pacing (selisih frame, 1005 frame)**: tidak ada jeda diam >0,33 dtk. Jendela 1 dtk paling sepi (<0,4): 0, 1, 4, 8, 11, 19 dtk dan 32 dtk (perbandingan penutup: hanya titik udara, panah, dan sorot bingkai yang bergerak).
- **Audio** (ebur128): edukasi -14,4 LUFS (puncak -1,2 dBFS setelah AAC), outro -14,4 LUFS, master -14,4 LUFS, gabungan -14,4 LUFS / -1,1 dBFS. File gabungan TIDAK dinormalkan ulang. Satu pop lembut jatuh tepat saat gendang kembali dan tekanan seimbang (26,98 dtk); tidak ada pop sebelumnya (kata "pop" yang diucapkan narator di 4,0 dtk hanya diberi letusan visual kecil tanpa efek bunyi).
- **Arah tekanan dan gerak**: orientasi penampang tidak pernah dibalik (kiri luar, kanan dalam). Saat pesawat turun hanya tekanan luar (titik jingga di liang telinga, panah dan batang jingga) naik, telinga tengah (biru) tetap; gendang melengkung KE ARAH telinga tengah. Saat tuba terbuka titik udara dari belakang hidung masuk lewat tuba (jingga -> biru), batang biru naik sampai sama, gendang kembali; "pop" digambar sebagai cincin lembut, bukan gendang pecah. Saat pilek tuba membengkak dan menyempit, hanya sedikit udara lewat, beda tekanan bertahan. Dua warna tekanan diberi label (batang LUAR/TENGAH, tag "TEKANAN LUAR ↑", "TEKANAN TELINGA TENGAH").
- **Raka**: seluruh Raka dari `rakaSvg()`; hadir di pembuka, saat menelan/menguap, lega setelah pop, dan menunjuk di perbandingan penutup; patch logo terlihat; tangan memegang telinga berukuran wajar (lengan rig asli).
- **Label "Ilustrasi edukatif"** ada pada semua penampang. Mekanisme pilek digambar sebagai contoh kemungkinan, bukan kepastian bagi setiap orang yang pilek.

## Putaran koreksi
1. Batang tekanan dipindah agar tidak menimpa liang telinga saat kamera mendekat; tag yang bertumpuk dengan judul (11-13 dtk) dipisah; panel perbandingan diperbesar dan diposisikan ulang; gerak tambahan pada bagian yang statis (kamera mengambang pelan, panah tekanan berdenyut, Raka bergoyang, bingkai panel berdenyut).
2. Perbaikan galat render pada adegan penutup, frame awal diberi tangan yang sudah naik, cover dibuat dari adegan pembuka.

## Keterbatasan yang jujur
- **Saya tidak dapat mendengar audio atau menonton video pada kecepatan normal.** Gerak diperiksa lewat selisih frame dan lembar kontak; sinkron suara-visual berdasar waktu kata ASR (faster-whisper).
- Penampang telinga, tulang pendengaran, koklea, tuba, dan titik udara skematis (bukan skala dan bukan citra pemeriksaan); jumlah titik dan kecepatannya adalah gaya animasi. Raka duduk hanya sebagai ilusi (kursi menutupi kaki).
- Perbandingan penutup (30-33,5 dtk) relatif kecil dan paling sedikit geraknya; beberapa label 24-30 px agak kecil di ponsel.
- Dengung kabin dan efek disintesis, bukan rekaman pesawat/telinga sungguhan.
