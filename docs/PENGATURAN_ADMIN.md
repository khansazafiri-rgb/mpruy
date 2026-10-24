# Pengaturan admin yang bisa diubah tanpa kode

Ringkasan hal yang bisa diatur admin di dashboard (`/admin`).

## Pengaturan > Umum
- Komunitas dan kontak: tautan WhatsApp, nomor WhatsApp admin, Instagram.
- Pengajuan soal dan unggahan: begitu pengguna menekan Kirim pengajuan, semua admin menerima notifikasi (lonceng) dan menu Pengajuan soal menampilkan angka pengajuan yang menunggu konfirmasi; pengaju juga mendapat notifikasi bahwa pengajuannya terkirim. Pengaturan: kapasitas antrean, batas konfirmasi, ukuran PDF, kuota unggah, nasib file kedaluwarsa, buka/tutup pengajuan.
- Poin: soal easy/medium/hard dan **poin Simulasi Dokter** (untuk skor 100 per kasus) yang masuk leaderboard gabungan.
- Tampilkan maskot Kori, Kila, dan Nilo di halaman pengguna.
- Batas ganti kampus, pengingat ujian bawaan, tipe soal paket, persetujuan bukti komunitas, angka di halaman depan, teks kebijakan.

## Pengaturan > Pendaftaran & profil
- **Kolom bawaan**: Nomor WhatsApp dan Semester bisa *wajib*, *opsional*, atau *disembunyikan*. Login ID, nama, email, password, dan asal kampus selalu wajib.
- **Kolom data tambahan** (disimpan di `users.extra`): teks, nama akun (@username, misalnya TikTok), tautan, nomor telepon, angka, pilihan, centang, tanggal, teks panjang. Tiap kolom bisa wajib atau opsional, tampil saat daftar, hanya di Profil, atau hanya untuk admin (misalnya catatan admin), serta boleh atau tidak diubah pengguna. Ada contoh cepat (Akun TikTok, NIM, Angkatan, Tahu MEDCOEL dari mana?, Catatan admin).
- **Langkah bukti komunitas**: bawaan WhatsApp dan Instagram; admin bisa menambah langkah baru (misalnya "Ikuti TikTok MEDCOEL"), mengatur judul, penjelasan, tautan, tulisan tombol, pertanyaan, wajib/opsional (opsional bisa dilewati), urutan, dan aktif. Bila semua dinonaktifkan, akun dibuat langsung setelah memilih mata kuliah. File bukti tersimpan di folder `bukti-komunitas/<kunci>/`.

Server selalu membersihkan konfigurasi ini sebelum dipakai (kunci tidak sah, bentrok dengan kolom bawaan, atau tautan bukan http(s) diabaikan) dan memvalidasi setiap isian pengguna. Pengguna hanya bisa mengubah data tambahan lewat `POST /api/medcoel/me/extra`, bukan langsung ke koleksi.

## Pengguna
- Cari berdasarkan nama, Login ID, email, WhatsApp, atau isi kolom tambahan; saring status dan peran.
- **Ubah data**: nama, Login ID, email, WhatsApp, semester, peran (pengguna/agen), anonim di leaderboard, dan semua kolom tambahan (wajib tidak ditegakkan untuk admin).
- **Ekspor CSV** sesuai saringan, termasuk kolom tambahan (aman dibuka di Excel/Sheets: isian yang diawali `=`, `+`, `-`, `@` dinetralkan).
- Nonaktifkan/aktifkan, ganti kampus (tercatat), hapus lunak/pulihkan, lihat bukti komunitas per langkah.

## Simulasi Dokter
Lihat `docs/SIMULASI_DOKTER.md` bagian "Mengelola kasus".
