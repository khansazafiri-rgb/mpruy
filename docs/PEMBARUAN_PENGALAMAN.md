# Pembaruan pengalaman MEDCOEL

## Desain

Arah visual: **buku catatan klinis**, sengaja berbeda dari PCV (maroon, serif, panel kaca). Bahannya ada di `apps/web/src/styles/foundation.css`:

- kertas ivory berbutir (`.tex-grain`, `.paper-sheet`, `.paper-stack`), garis kotak buku lab (`.tex-grid`), kertas bergaris (`.tex-ruled`);
- papan hijau gelap (`.surface-forest`), stabilo emas (`.hl`), selotip (`.tape`), ilustrasi sebagai stiker (`.sticker`), garis EKG (`.ecg`, komponen `Ecg.jsx`);
- catatan tulisan tangan dengan font Caveat (`.hand`, `font-hand`), hanya untuk aksen, bukan isi penting.

Gaya per area: `styles/landing.css` (landing, kelas `lp-`), `styles/app.css` (halaman setelah masuk dan halaman masuk/daftar), `styles/chat.css` (Chat Admin). Ukuran teks minimal 12px untuk keterangan; isi 15–18px. Bidang baca soal (Runner) tetap polos.

Landing memuat contoh soal yang bisa dijawab (diberi label *Contoh soal*, ditulis di `Landing.jsx`), dinding stiker 32 mata kuliah, cara kerja, fitur, angka dari `/api/medcoel/stats`, tanya jawab, dan ajakan daftar.

## Soal kampusmu

Di Mata kuliah, satu kartu **Soal kampusmu** hanya muncul bila ada soal yang:

- sudah berstatus `published`;
- memiliki `scope=campus` dan mencakup kampus akun yang sedang masuk;
- berada di BAB dan mata kuliah yang tidak tersembunyi.

Di dalamnya hanya terdapat mata kuliah dan BAB yang mempunyai soal tersedia. Daftar materi tidak mengulang ilustrasi. URL `?kampus=1` mempertahankan kumpulan soal kampus sampai pengaturan latihan/simulasi dan pemilihan soal di server. Paket umum tidak ditawarkan di tampilan khusus kampus.

PDF mentah, draf, dan unggahan yang masih antre tidak dibagikan melalui pustaka ini. Proses konfirmasi, pemeriksaan, dan impor pengajuan tetap berlaku. Mengganti kampus langsung mengubah hak akses berdasarkan kampus baru; parameter dari browser tidak bisa memilih kampus lain.

## Chat Admin

Chat Admin adalah satu utas obrolan, tanpa tab. Asisten menyapa dengan nama depan lalu menawarkan pilihan sebagai tombol balasan cepat di dalam obrolan: Upload soal PDF, Tanya admin, Laporkan kendala, Kasih saran, Cek status pengajuanku, Chat WhatsApp admin. Pilihan pengguna tampil sebagai gelembung pengguna, lalu asisten membalas dan alurnya berlanjut di utas yang sama. Setelah satu alur selesai, pilihan ditawarkan lagi. Kotak pesan di bawah selalu bisa dipakai untuk menulis ke admin.

Asisten hanya mengarahkan; tidak ada balasan AI. Pesan ke admin adalah percakapan dengan admin manusia dan disimpan di koleksi privat `support_messages`. Admin membaca dan membalas dari **Dashboard Admin > Pesan pengguna** (`/admin/pesan`). Bila sudah ada riwayat, riwayat itu tampil di awal utas. Percakapan diperbarui setiap 10 detik saat halaman aktif dan saat jendela kembali mendapat fokus. Kunci pesan mencegah duplikasi saat pengguna mengulang permintaan setelah koneksi gagal.

Akses baca/tulis API koleksi langsung ditutup. Semua endpoint memeriksa akun aktif dan kepemilikan, atau peran admin. Pesan ditampilkan sebagai teks, bukan HTML. Migrasi `1800000600_support_messages.js` menambah koleksi tanpa mengubah data lama.

## Pemasangan

Perubahan web memerlukan build baru. Perubahan backend memerlukan migrasi dan restart proses PocketBase yang benar, karena produksi memakai `--hooksWatch=false`.

Pemasangan VPS pengguna memakai `/opt/medcoel` sebagai direktori repositori dan Caddy melayani `/opt/medcoel/apps/web/dist`. Ini berbeda dengan lokasi bawaan `/opt/medcoel/app` pada skrip deploy lama. Jangan memakai skrip lama tanpa menyesuaikan lokasi dan nama layanan. Unit `medcoel` dilaporkan tidak aktif; nama proses/layanan backend produksi masih perlu dikonfirmasi sebelum restart.

Dependensi yang diuji memakai Tailwind 3.4.19. Konfigurasi PostCSS ini tidak sesuai Tailwind 4. Bila paket server berbeda, cadangkan perubahan lokal sebelum menyamakan manifest dan lockfile dengan cabang yang akan dipasang. Tidak perlu migrasi Tailwind untuk pembaruan desain ini.

## Validasi

- Lint dan build produksi.
- Tes web, format impor, dan katalog.
- 33 skenario API pada database uji terpisah: termasuk pustaka kampus kosong, pembatasan kampus, soal draf/tersembunyi, pengerjaan khusus kampus, privasi chat, balasan admin, kirim ulang, paginasi, dan penonaktifan akun.
- Browser desktop dan HP: contoh latihan, popup, materi kampus, pengiriman masukan, penyimpanan percakapan, serta balasan dari kotak masuk admin.

Perubahan Chat Admin yang sudah masuk saat pengerjaan (widget persisten, navigasi Jadwal di HP, normalisasi nomor WhatsApp, dan migrasi nomor admin) dipertahankan. Widget memakai ChatAdminBody yang sama dengan halaman penuh; keadaan unggah tidak direset hanya karena berpindah halaman atau menutup panel.

Pembaruan berikutnya: seluruh keadaan percakapan (pesan, alur unggah, file yang sudah diunggah, tulisan yang belum terkirim) disimpan di `lib/chatStore.js`, bukan di komponen, sehingga memperbesar panel pojok ke `/chat-admin` (atau kembali) melanjutkan percakapan yang sama; panel pojok dilepas selama halaman penuh terbuka supaya tidak ada dua salinan. Di alur unggah, setiap jawaban punya tombol **Ubah** untuk memilih ulang (mata kuliah, kunci jawaban, bahasa, siapa yang boleh melihat, jumlah PDF) tanpa kehilangan file yang sudah terunggah (server memakai ulang draf yang sama), ringkasan punya **Ubah pilihan**, dan setiap galat punya tombol coba lagi (muat mata kuliah, siapkan unggahan, unggah per file, hapus file, kirim pengajuan).
