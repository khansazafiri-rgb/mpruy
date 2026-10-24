# Drilling

Kumpulan soal **General** (untuk semua pengguna) per mata kuliah, **tanpa BAB**. Cocok untuk soal yang tidak punya BAB jelas atau yang sengaja dilatih lintas BAB.

## Untuk pengguna

- Menu **Drilling** muncul di sebelah Simulasi hanya bila admin menyalakannya **dan** sudah ada soal Drilling yang tayang. Selain itu menunya tersembunyi dan `/drilling` kosong.
- Di `/drilling` pengguna memilih jumlah soal (10, 20, 50, atau semua) dan mode (Learning atau ujian), lalu menekan satu mata kuliah: sesinya **langsung dimulai**. Hanya mata kuliah yang punya soal Drilling yang tampil.
- Sesi memakai mesin latihan yang sama (jawaban, pembahasan, riwayat, poin leaderboard). Soal Drilling tidak ikut hitungan BAB, Coba Simulasi, dan paket soal.
- Akun tanpa kampus tetap bisa memakainya, karena semua soal Drilling General.

## Untuk admin

- **Admin > Drilling**: sakelar *Tampilkan/Sembunyikan Drilling* (bawaan mati), jumlah soal tayang dan draf per mata kuliah, dan tombol sembunyikan/tampilkan per mata kuliah. Status menunjukkan alasannya bila menu tersembunyi.
- Soal masuk lewat **Edit Soal > Impor** dengan memilih BAB `Drilling (General, tanpa BAB)`, atau lewat **Hermes Agent** dengan `"drilling": true` (lihat `docs/HERMES_AGENT.md`). Editor soal dan aksi massal "Pindahkan ke BAB" juga menawarkan Drilling.
- Soal Drilling selalu General: impor atau penyimpanan dengan pembatasan kampus ditolak, dan memindahkan soal ke Drilling mengubahnya menjadi General.

## Cara kerja di database

Setiap mata kuliah punya paling banyak satu BAB khusus (`chapters.drilling = true`, judul "Drilling"), dibuat otomatis saat impor Drilling pertama. Dengan begitu soal, jawaban, laporan, dan riwayat memakai tabel yang sama. BAB khusus ini disaring dari daftar BAB, ketersediaan simulasi, paket soal, dan hitungan per BAB; kumpulan soal (`learn.pool`) mengecualikannya kecuali diminta `drilling: "only"`. Sakelar ada di `app_settings.drillingEnabled`.

Endpoint: `GET /api/medcoel/drilling`, `POST /api/medcoel/attempts/drilling` (`{ subject, count?, mode? }`), `GET /api/medcoel/admin/drilling`. `GET /api/medcoel/me` memuat `drillingAvailable`.
