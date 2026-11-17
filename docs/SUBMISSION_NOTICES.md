# Kabar otomatis pengajuan (Chat Admin + email)

Saat status pengajuan soal atau PPT materi berubah, pengaju langsung dikabari lewat tiga jalur: lonceng (sudah ada), **pesan di Chat Admin**, dan **email**.

| Status baru | Pesan |
|---|---|
| Antre (dikonfirmasi) | "Pengajuan {kode} sudah dikonfirmasi … perkiraan selesai ±N hari" |
| Selesai | "Soal/PPT materi dari pengajuan {kode} sudah terupload dan tayang: N soal di {mata kuliah}". Bila sebelumnya sudah tayang lalu diproses ulang: "sudah diperbarui" |
| Perlu perbaikan | Catatan admin disertakan |
| Dibatalkan (oleh admin) | Alasan disertakan |
| Kedaluwarsa | Penjelasan dan ajakan ajukan ulang |

"Diproses" tidak dikirim lewat chat dan email (tetap lewat lonceng) supaya tidak berisik.

- Pesan chat ditulis atas nama admin pertama yang aktif, dengan kunci `auto-…`; web menampilkannya sebagai "Admin MEDCOEL · Otomatis". Tanpa migrasi skema.
- Email dikirim ke alamat akun pengaju bila ada. Bila SMTP belum diatur, isinya dicetak ke log server (seperti kode verifikasi). Kegagalan chat atau email tidak pernah menggagalkan perubahan status.
- Kode pengajuan (mis. `MC261117-AB23`) selalu ada di pesan.
- Semua jalur status memakai `setStatus` (admin, Hermes/agen, impor, kedaluwarsa otomatis), jadi semuanya ikut.

Tes: `test/submission-notice.test.mjs` (teks pesan), `test/api.test.mjs` (pesan chat nyata di PocketBase 0.40.5: antre, tayang, tidak bocor ke pengguna lain).
Belum ada pengaturan "matikan email" per pengguna.
