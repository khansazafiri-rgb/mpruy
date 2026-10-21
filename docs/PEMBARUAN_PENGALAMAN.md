# Pembaruan pengalaman MEDCOEL

## Desain

Landing page mengambil arah visual dari `khansazafiri-rgb/kons`, terutama komposisi bidang gelap, tekstur halus, lapisan kartu, serta interaksi yang terasa saat dipilih. Identitas hijau/ivory dan ilustrasi 2D MEDCOEL tetap dipakai. Hero berisi contoh latihan interaktif yang diberi label sebagai contoh, bukan statistik atau percobaan pengguna.

Pilihan mata kuliah di pendaftaran/profil mempunyai penanda terpilih, animasi cek, dan hitungan pilihan. Popup latihan mempunyai penambah/pengurang, preset jumlah soal, serta pilihan mode dengan ikon. Gerakan dikurangi mengikuti preferensi perangkat. Tekstur ditaruh pada latar dan permukaan dekoratif; soal tetap memakai bidang baca yang bersih.

## Soal kampusmu

Di Mata kuliah, satu kartu **Soal kampusmu** hanya muncul bila ada soal yang:

- sudah berstatus `published`;
- memiliki `scope=campus` dan mencakup kampus akun yang sedang masuk;
- berada di BAB dan mata kuliah yang tidak tersembunyi.

Di dalamnya hanya terdapat mata kuliah dan BAB yang mempunyai soal tersedia. Daftar materi tidak mengulang ilustrasi. URL `?kampus=1` mempertahankan kumpulan soal kampus sampai pengaturan latihan/simulasi dan pemilihan soal di server. Paket umum tidak ditawarkan di tampilan khusus kampus.

PDF mentah, draf, dan unggahan yang masih antre tidak dibagikan melalui pustaka ini. Proses konfirmasi, pemeriksaan, dan impor pengajuan tetap berlaku. Mengganti kampus langsung mengubah hak akses berdasarkan kampus baru; parameter dari browser tidak bisa memilih kampus lain.

## Chat Admin

Halaman Chat Admin memiliki tiga pilihan: pesan, unggah PDF, dan pengajuan. Pesan bisa dikategorikan sebagai pertanyaan, kendala, atau masukan. Percakapan disimpan di koleksi privat baru `support_messages`. Admin membaca dan membalas dari **Dashboard Admin > Pesan pengguna** (`/admin/pesan`). Tombol bantuan di pojok membuka percakapan yang sama.

Pesan adalah percakapan dengan admin manusia. Tidak ada klaim admin sedang online atau balasan otomatis dari AI. Percakapan diperbarui setiap 10 detik saat halaman aktif dan saat jendela kembali mendapat fokus. Riwayat yang lebih lama dapat dimuat bertahap. Kunci pesan mencegah duplikasi saat pengguna mengulang permintaan setelah koneksi gagal.

Akses baca/tulis API koleksi langsung ditutup. Semua endpoint memeriksa akun aktif dan kepemilikan, atau peran admin. Peran pengirim berasal dari sesi server. Pesan ditampilkan sebagai teks, bukan HTML.

Migrasi `1800000500_support_messages.js` menambah koleksi tanpa mengubah data lama. Rollback sengaja mempertahankan percakapan agar tidak menghapus pesan pengguna.

## Pemasangan

Perubahan web memerlukan build baru. Perubahan backend memerlukan migrasi dan restart proses PocketBase yang benar, karena produksi memakai `--hooksWatch=false`.

Pemasangan VPS pengguna memakai `/opt/medcoel` sebagai direktori repositori dan Caddy melayani `/opt/medcoel/apps/web/dist`. Ini berbeda dengan lokasi bawaan `/opt/medcoel/app` pada skrip deploy lama. Jangan memakai skrip lama tanpa menyesuaikan lokasi dan nama layanan. Unit `medcoel` dilaporkan tidak aktif; nama proses/layanan backend produksi masih perlu dikonfirmasi sebelum restart.

Dependensi yang diuji memakai Tailwind 3.4.19. Konfigurasi PostCSS ini tidak sesuai Tailwind 4. Bila paket server berbeda, cadangkan perubahan lokal sebelum menyamakan manifest dan lockfile dengan cabang yang akan dipasang. Tidak perlu migrasi Tailwind untuk pembaruan desain ini.

## Validasi

- Lint dan build produksi.
- Tes web, format impor, dan katalog.
- 33 skenario API pada database uji terpisah: termasuk pustaka kampus kosong, pembatasan kampus, soal draf/tersembunyi, pengerjaan khusus kampus, privasi chat, balasan admin, kirim ulang, paginasi, dan penonaktifan akun.
- Browser desktop dan HP: contoh latihan, popup, materi kampus, pengiriman masukan, penyimpanan percakapan, serta balasan dari kotak masuk admin.
