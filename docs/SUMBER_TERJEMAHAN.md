# Mengambil materi asli untuk terjemahan lengkap

Pilihan EN menyimpan bahasa tampilan. Pilihan ini tidak membuat versi Inggris
untuk materi bank soal yang hanya tersedia dalam bahasa Indonesia. Kode situs
di GitHub juga tidak memuat bank soal yang disimpan di database produksi.

Untuk menerjemahkan bank soal melalui chat tanpa mengaktifkan penyedia API:

1. Masuk sebagai admin, buka **Edit Soal → Terjemahan Inggris**.
2. Klik **Unduh materi untuk diterjemahkan** dan tunggu unduhan JSON selesai.
3. Berikan berkas `medcoel-english-source-YYYY-MM-DD.json` kepada penerjemah.

Berkas memuat semua soal, termasuk draf, seluruh pilihan, kunci dan pembahasan,
kasus simulasi, nama/deskripsi mata kuliah, dan judul BAB. Konteks lengkap ini
diperlukan untuk menjaga makna, negasi, angka, dan istilah ilmiah. Terjemahan
harus mempertahankan label opsi, kunci, jawaban yang diterima, rumus, dan istilah
ilmiah yang ditandai. Soal anatomi dapat memiliki pilihan Latin yang memang
identik dalam kedua bahasa.

Ekspor hanya membaca materi. Tidak ada perubahan soal, penyimpanan draf,
penerbitan, panggilan AI, atau migrasi data. Akun peserta, riwayat pengerjaan,
pengaturan/rahasia server, dan berkas PDF tidak diambil. Endpoint mewajibkan
admin aktif, termasuk ketika katalog atau kasus diminta secara langsung.

Pembacaan dibagi per 50 record, berurutan menurut ID dan memakai cursor agar
jumlah soal tidak terpotong pada halaman pertama. Jika ada kegagalan, unduhan
tidak dibuat dari hasil parsial. Ekspor sebaiknya dilakukan ketika admin lain
tidak sedang menyunting materi; ulangi ekspor bila materi berubah.

Setiap soal/kasus menyertakan `sourceHash`, `revision`, sumber lengkap, istilah
yang dilindungi, serta segmen asli dan draf terjemahan yang sudah ada. Nilai ini
diperlukan untuk mencocokkan hasil terjemahan dengan sumber yang tepat dan
mencegah penimpaan materi yang sudah berubah. Pemasangan dan pemeriksaan
terjemahan tetap mengikuti `PEMBAHASAN_INGGRIS.md`. Fitur ekspor sendiri belum
menerjemahkan atau memasang materi Inggris.
