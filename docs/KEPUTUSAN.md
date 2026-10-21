# Keputusan sementara untuk pertanyaan terbuka PRD

PRD Draf 2 masih punya bagian **[ISI]**. Supaya web bisa jalan dan dicoba,
setiap bagian diberi jawaban sementara di bawah ini. Hampir semuanya bisa
diubah tanpa menyentuh kode, lewat Dashboard Admin > Pengaturan.

| Pertanyaan PRD | Jawaban sementara | Cara mengubah |
|---|---|---|
| Tautan komunitas WhatsApp, akun Instagram, nomor WA admin | Nomor WA admin **085144902681** (diisi migrasi bila masih kosong). Tautan komunitas WA dan Instagram masih kosong | Pengaturan > Umum |
| Daftar mata kuliah awal dan ilustrasinya | Anatomi, Histologi, Fisiologi, Biokimia, Parasitologi, Mikrobiologi (usulan PRD), dengan ilustrasi sederhana sementara sesuai palet | Mata kuliah & BAB: unggah ilustrasi buatan GPT per mata kuliah |
| Bukti komunitas harus disetujui admin dulu? | Tidak. Akun langsung aktif, admin memeriksa belakangan dan bisa menonaktifkan | Pengaturan > "Akun baru menunggu admin memeriksa bukti" |
| Cara Hermes masuk | Gabungan: akun berperan `agent` + daftar IP opsional (`MEDCOEL_AGENT_IPS`). Hermes mengambil berkala; webhook opsional | docs/HERMES_AGENT.md |
| Sumber daftar kampus | 105 nama dari web lama, **belum lengkap** (PRD: sekitar 155). Ada pilihan Lainnya, dan usulan dari isian Lainnya yang sering muncul | Pengaturan > Daftar kampus (tambah, ganti nama, gabungkan, nonaktifkan). Perlu dicocokkan dengan PDDikti/KKI |
| Batas ganti kampus | Sekali per 30 hari, dicatat di riwayat | Pengaturan > Batas ganti kampus |
| Batas ukuran PDF | 20 MB per file | Pengaturan |
| Batas waktu konfirmasi pengajuan | 3 hari, lalu kedaluwarsa | Pengaturan |
| Kuota unggahan harian | 10 PDF per pengguna per hari | Pengaturan |
| File pengajuan kedaluwarsa/dibatalkan | Dipindah ke folder arsip di Drive | Pengaturan (arsip atau hapus) |
| Rumus poin leaderboard | Benar di percobaan pertama: easy 1, medium 2, hard 3. Ulangan tidak menambah poin. Percobaan dengan rata-rata < 3 detik per soal (minimal 5 soal) tidak diberi poin | Pengaturan (poin per tingkat) |
| Leaderboard per mata kuliah? | Ya, sebagai filter tambahan (selain mingguan/sepanjang waktu dan semua/per kampus) | - |
| Isian dan esai masuk simulasi? | Tidak. Simulasi dan paket hanya tipe A dan K; isian dan esai tetap ada di latihan per topik | Pengaturan > Tipe soal di simulasi |
| Impor dengan soal bermasalah | Diblokir seluruhnya, kecuali admin mencentang "Lewati soal bermasalah" (soal valid tetap masuk) | Pilihan per impor |
| Layanan email | SMTP apa pun lewat PocketBase. Usulan: Brevo (300/hari gratis) atau Gmail sandi aplikasi | `/_/` > Settings > Mail |
| Rencana cadangan penyimpanan | Belum dipasang. Usulan: Cloudflare R2 tier gratis; kode penyimpanan terpusat di dua file | docs/GOOGLE_DRIVE.md |
| Isi dan kuota Paket 100/150/200 | Tombol "Buat Paket 100/150/200" membuat paket per mata kuliah dengan soal per BAB = total ÷ jumlah BAB dan waktu 1,2 menit per soal | Paket simulasi |
| Angka di landing page | Jumlah soal, mata kuliah, dan pengguna | Pengaturan (dua centang landing page) |
| Kebijakan privasi dan hak cipta | Teks bawaan singkat di /kebijakan-privasi; pernyataan hak membagikan wajib dicentang sebelum mengirim PDF | Pengaturan > Kebijakan |
| LaTeX untuk rumus | Belum. Blok `formula` memakai subskrip/superskrip dan simbol Unicode | - |
| Stack | Sama dengan web lama: React (Vite), PocketBase, Caddy di satu VPS | - |
| Simulasi Jadi Dokter, Latihan UKMPPD, Baca PPT | Belum dibuat (fitur berikutnya). Skema `attempts`/`answers` sudah umum sehingga bisa dipakai ulang | - |

## Keputusan teknis lain

- **Kunci jawaban tidak dikirim ke browser** sebelum soal dicek (mode Learning)
  atau percobaan selesai (mode ujian). Soal hanya bisa dibaca lewat endpoint
  server yang menegakkan aturan kampus, supaya skor dan leaderboard tidak bisa
  diakali dari respons API.
- **Sumber soal simulasi** punya pilihan ketiga selain dua di PRD: "Semua soal
  (yang belum didahulukan)", untuk saat soal baru sudah habis.
- **BAB tuntas** di Progres Saya: minimal 80% soal yang bisa dilihat pengguna
  di BAB itu sudah pernah dikerjakan.
- **Pengingat ujian** dikirim sekali sehari sekitar pukul 07.00 WIB (08.00 WITA,
  09.00 WIT); pilihan H-14, H-7, H-3, H-1, dan hari H.
- **Lupa password** tidak memberi tahu apakah email terdaftar (jawaban selalu
  sama), supaya daftar email pengguna tidak bisa ditebak.
- **Chat Admin** ada di dua tempat: tombol mengambang di pojok kanan bawah setiap
  halaman (setelah masuk) dan halaman penuh `/chat-admin`. Isinya sama;
  percakapan yang sedang berjalan tidak hilang saat pindah halaman. Tombol
  tidak muncul di halaman mengerjakan soal supaya tidak menutupi navigasi soal.
- **Pengajuan lebih dari 5 PDF** tidak membuat catatan otomatis (sesuai PRD);
  admin membuatnya lewat "Pengajuan manual".

## Perbedaan dengan web lama yang perlu diketahui

- Tidak ada ACC akun, batas perangkat, Reset Device, Web Olimp, Event/Lomba,
  peminjaman, gateway WhatsApp, kelas reguler, atau jadwal dari Google Calendar.
- Data soal web lama tidak ikut dipindah. Soal lama bisa dimasukkan lewat
  Impor massal: bentuk Edit Soal PCV (`options: [{ text, correct, explanation }]`
  dan amplop `options: { qtype, choices, subQuestions }`), Web Olimp, dan
  Event/Lomba sudah diterima. Ekspor dari web lama lalu impor per BAB; tingkat
  kesulitan yang tidak ada di data lama otomatis `medium` dengan peringatan.
