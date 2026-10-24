# Drilling

Kumpulan soal **General** (untuk semua pengguna) per mata kuliah, **tanpa BAB**. Cocok untuk soal yang tidak punya BAB jelas atau yang sengaja dilatih lintas BAB.

## Untuk pengguna

- Menu **Drilling** muncul di sebelah Simulasi hanya bila admin menyalakannya **dan** sudah ada soal Drilling yang tayang. Selain itu menunya tersembunyi dan `/drilling` kosong.
- Di `/drilling` pengguna memilih jumlah soal (10, 20, 50, atau semua) dan mode (Learning atau ujian), lalu menekan satu mata kuliah: sesinya **langsung dimulai**. Hanya mata kuliah yang punya soal Drilling yang tampil.
- Sesi memakai mesin latihan yang sama (jawaban, pembahasan, riwayat, poin leaderboard). Soal Drilling tidak ikut hitungan BAB, Coba Simulasi, dan paket soal.
- Akun tanpa kampus tetap bisa memakainya, karena semua soal Drilling General.

## Untuk admin

Halaman **Admin > Drilling** tidak membatasi apa yang bisa dilakukan admin, juga saat Hermes Agent belum mengirim soal:

- Sakelar *Tampilkan/Sembunyikan Drilling* (bawaan mati), kartu ringkas (soal tayang, draf, mata kuliah berisi), dan status beserta alasannya bila menu tersembunyi.
- **Semua** mata kuliah tampil (juga yang belum punya soal), dengan cari dan filter "hanya yang berisi".
- Per mata kuliah: **Impor** (kotak impor massal yang sudah terarah ke Drilling mata kuliah itu), **Satu soal** (editor soal langsung ke Drilling), **Kelola soal** (Edit Soal terfilter ke BAB Drilling: ubah, hapus, aksi massal), sembunyikan/tampilkan.
- Aksi massal per mata kuliah: tayangkan semua draf, jadikan semua draf, pindahkan semua ke BAB biasa, hapus semua.
- **Coba sebagai pengguna**: admin selalu melihat menu Drilling (pratinjau) dan bisa memulai sesi walau belum dibuka untuk pengguna.
- Soal juga bisa masuk lewat **Edit Soal > Impor** (BAB `Drilling (General, tanpa BAB)`, tersedia untuk setiap mata kuliah) atau **Hermes Agent** dengan `"drilling": true` (lihat `docs/HERMES_AGENT.md`).
- Soal Drilling selalu General: impor atau penyimpanan dengan pembatasan kampus ditolak, dan memindahkan soal ke Drilling mengubahnya menjadi General.

### Bila Drilling atau fitur baru lain tampil "tidak ditemukan"

Artinya server PocketBase belum dijalankan ulang setelah pembaruan. Produksi memakai `--hooksWatch=false`, jadi hook dan migrasi baru baru terpasang setelah **restart**. Di dashboard admin muncul peringatan "Server belum memuat pembaruan terbaru" bila migrasi server tertinggal. Setelah pembaruan, jalankan ulang PocketBase (lihat `docs/DEPLOY.md`); migrasi `1800001300` (50 kasus Simulasi), `1800001400`, dan `1800001500` (BAB Drilling untuk tiap mata kuliah) berjalan otomatis saat itu.

## Cara kerja di database

Setiap mata kuliah punya paling banyak satu BAB khusus (`chapters.drilling = true`, judul "Drilling"), dibuat otomatis untuk semua mata kuliah (migrasi `1800001500`) dan untuk setiap mata kuliah baru. Dengan begitu soal, jawaban, laporan, dan riwayat memakai tabel yang sama. BAB khusus ini disaring dari daftar BAB, ketersediaan simulasi, paket soal, dan hitungan per BAB; kumpulan soal (`learn.pool`) mengecualikannya kecuali diminta `drilling: "only"`. Sakelar ada di `app_settings.drillingEnabled`.

Endpoint: `GET /api/medcoel/drilling`, `POST /api/medcoel/attempts/drilling` (`{ subject, count?, mode? }`), `GET /api/medcoel/admin/drilling`, `POST /api/medcoel/admin/drilling/bulk` (`{ subject, action: publish|draft|move|delete, status?, chapter? }`), `GET /api/medcoel/admin/server-version`. `GET /api/medcoel/me` memuat `drillingAvailable` (selalu true untuk admin) dan `drillingPreview`.
