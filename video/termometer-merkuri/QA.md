# QA — "Kenapa angka termometer air raksa tidak langsung turun?"
MP4 1080x1920, 30 fps, 87,87 dtk (edukasi 0-72,7 dtk dari narasi asli 72,28 dtk + outro baku SpO2 15,1 dtk), AAC 48 kHz stereo.

## Yang diperiksa dan hasilnya
- **Timestamp dan frame**: 2636 paket video, selisih PTS seragam 0,0333 dtk (1 nilai unik). Tidak ada frame hilang.
- **Pacing gerak (selisih piksel antar-frame, seluruh 2636 frame)**: 0 frame beku selama kolom naik (18,5-24,8 dtk; selisih rata-rata 0,65, minimum 0,23). Sesudah putaran 1 koreksi, jeda diam terpanjang di bagian edukasi ~1,1 dtk (adegan kaca retak sebelum retakan muncul) dan ~0,6 dtk (perbandingan dua alat); sisanya bergerak halus (kamera melayang kecil, kilau perak meluncur, atom di wadah bergetar). Bagian web outro 82,7-85,9 dtk diam ~1,6 dtk karena rekaman asli memang diam (sama dengan video SpO2).
- **Fisika**: ujung kolom atas tidak bergerak sama sekali sejak 25 dtk sampai diatur ulang (kode: `thState`, `dUp` konstan); pada pendinginan hanya merkuri bawah menyusut dan celah muncul tepat di penyempitan (cocok dengan Purdue). Tidak ada gambar merkuri jatuh bebas bersamaan dengan "hasil tertahan". Penyempitan, wadah, saluran, skala (kanan) berada di posisi model yang sama di semua adegan.
- **Audio** (ebur128 pada MP4 akhir): -15,8 LUFS terintegrasi, puncak -0,9 dBFS. Bagian edukasi -14,9 LUFS dan outro -15,1 LUFS sebelum penskalaan akhir: suara promo tidak melonjak. Narasi dan master outro hanya diskalakan satu skalar yang sama; master SHA-256 cocok.
- **Sumber**: EPA, Purdue, WHO terbuka dan dibaca (lihat SUMBER.md).

## Putaran koreksi
1. Kontras kolom perak di tampak luar (rongga gelap membuat perak tak terbaca) -> rongga terang + kontur kolom di mode terang; atom di wadah dari pola kisi menjadi acak; transisi hook->penampang dibersihkan; adegan rangkuman diberi ulangan gerak (naik lalu tertahan) agar tidak statis 3 dtk; adegan kaca retak diperbesar; titik putus dipindah ke dalam penyempitan (sesuai Purdue); label tambahan lebih besar.
2. Kontras mode terang untuk sampul dan bagian hook.

## Keterbatasan yang jujur (belum selesai / tidak bisa diverifikasi)
- **Saya tidak dapat mendengarkan audio atau menonton video secara langsung pada kecepatan normal.** Pemeriksaan gerak memakai analisis selisih frame penuh, lembar kontak 1 fps seluruh bagian edukasi, dan potongan beresolusi penuh; kecocokan suara-visual didasarkan pada waktu kata hasil ASR, bukan pendengaran manusia. Mohon tonton penuh sebelum diunggah.
- ASR salah dengar "air raksa" dan "di angka tadi"; takarir memakai ejaan naskah.
- Hook (0-2 dtk): termometer masih relatif kecil dan sebagian tertutup lengan saat ditarik; adegan perbandingan/kaca retak (52-60 dtk) komposisinya sederhana dan banyak ruang kosong; transisi hook ke penampang (6,5-7,1 dtk) berupa dissolve sederhana; teks label sekunder 34 px agak kecil di ponsel; tubuh digambar abstrak (lingkaran kulit), bukan anatomi.
- Penampang: saluran dan penyempitan digambar jauh lebih besar dari aslinya (diberi tanda "penampang"); kolom awal 34,5 dan contoh bacaan 37,5 °C adalah contoh ilustrasi; di penampang awal diberi label "contoh: sebelum dipakai" karena kondisi termometer di adegan hook (37,5 °C) berbeda dengan awal demonstrasi.
- Musik dan SFX hasil sintesis yang resepnya mirip video SpO2 (tempo 72 BPM); bukan musik baru yang digubah khusus.
- Rekaman web outro lebih lama daripada tampilan web terkini (sama dengan outro SpO2).
- Tidak ada sistem verifikasi otomatis untuk "kualitas visual"; penilaian visual saya berdasar tangkapan layar.
