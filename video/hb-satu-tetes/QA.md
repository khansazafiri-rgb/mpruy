# QA — "Bagaimana satu tetes darah bisa menghasilkan angka Hb?"
MP4 1080x1920, 30 fps, 101,10 dtk (edukasi 0-85,97 dtk dari narasi asli 85,52 dtk + outro baku SpO₂ 15,1 dtk), AAC 48 kHz stereo.

## Yang diperiksa dan hasilnya
- **Timestamp**: 3033 paket video, selisih PTS seragam 0,0333 dtk. Tidak ada frame hilang.
- **Bingkai pertama**: sudah berisi aksi (kartu SpO₂ berdenyut 92->96, tangan Raka naik dengan penjepit di ujung jari). Draf awal sempat kosong di frame 0 (fade-in); diperbaiki.
- **Pacing (selisih piksel antar-frame, 3033 frame)**: bagian edukasi tidak memiliki jeda diam lebih dari 25 frame (0,83 dtk; tetes darah sudah terbentuk sebelum mikrokuvet datang). Selama pengisian kapiler (26,4-30,4 dtk), pelepasan Hb (35-38), cahaya (46-50), dan penghitungan hasil (56,9-58,3) tidak ada frame beku (satu frame identik di awal pengisian 26,43 saat easing mulai). Bagian web outro 95,9-99,1 dtk diam karena rekaman asli diam (sama dengan video SpO₂). Gerak halus kamera/objek ditambahkan ke semua adegan agar tidak ada tahanan yang betul-betul statis.
- **Audio** (ebur128): edukasi -15,7 LUFS, outro -16,0 LUFS, total -15,8 LUFS, puncak -0,9 dBFS: suara promo tidak melonjak. Narasi diberi penguatan statis +1,9 dB (selisih LUFS terukur terhadap master) tanpa ubah tempo/nada; master outro tidak diubah (SHA-256 cocok).
- **Isi**: nilai/label yang diperiksa terhadap lembar produk HemoCue Hb 201+ (570 dan 880 nm, ~10 µL, g/dL, azidemethemoglobin termodifikasi), MedlinePlus, WHO (lihat `SUMBER.md`).
- **Pembeda dari video SpO₂**: kartu pembuka menunjukkan penjepit di jari; pada bagian pembacaan ada label "lewat sampel di mikrokuvet, bukan lewat jari" dan cahaya hanya digambar menembus mikrokuvet SETELAH masuk alat.

## Putaran koreksi
1. Frame pertama kosong -> aksi sejak frame 0; sebaran molekul Hb di pembuluh tidak bergerombol; label yang bertabrakan dipisah; blok perhitungan, kuvet bermasalah, dan label alur diperbesar/dipindah; kontras darah di penampang.
2. Gerak halus semua adegan + foton bergerak di jalur cahaya + ikon penutup bergerak; level narasi disamakan dengan master outro.

## Keterbatasan yang jujur
- **Saya tidak dapat mendengar audio atau menonton video pada kecepatan normal.** Gerak diperiksa lewat analisis selisih frame penuh dan lembar kontak 2 dtk; kesesuaian suara-visual berdasar waktu kata hasil ASR. Mohon tonton dan dengarkan penuh sebelum diunggah.
- Mikrokuvet, saluran, dan rongga sampel digambar skematis dan diperbesar; bukan skala atau bentuk persis kuvet HemoCue. Ketebalan lapisan sampel di jalur cahaya dilebihkan.
- Peran tiap panjang gelombang sengaja tidak ditentukan (lembar produk tidak merinci); "koreksi kekeruhan" digambar di blok perhitungan.
- Angka pada layar saat penghitungan naik bertahap (mis. 7,9 -> 8,2) sebagai animasi, bukan sinyal alat sungguhan.
- Nama reagen kimia tidak ditampilkan; urutan "reagen 1 memecah sel, reagen 2 mengubah Hb" mengikuti naskah.
- Adegan kegunaan/batas (61-77 dtk) memakai kartu dan ikon sederhana; adegan "pengambilan bermasalah" berupa kuvet berisi sebagian dengan gelembung udara (tidak ada langkah prosedur).
- Hook: ukuran penjepit jari relatif kecil; label sekunder 28-34 px agak kecil di ponsel; beberapa label saling dekat di adegan dua panjang gelombang.
- Rekaman web outro lebih lama daripada tampilan web terkini; musik/SFX sintetis (resep mirip video SpO₂/termometer).
