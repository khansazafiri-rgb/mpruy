# Soal salah (review kesalahan)

Siswa bisa melihat soal mana yang salah di tiga tempat, semuanya lengkap dengan jawabanmu, kunci, dan pembahasan:

1. **Hasil setelah selesai** (`/kerjakan/{id}`): kotak "N soal salah di percobaan ini" dengan tombol **Lihat soal yang salah** (langsung menggulung ke review dan memilih tab Salah), tab review berisi jumlah (`Semua (10)`, `Salah (3)`, `Benar (7)`), dan tombol **Semua soal salahku**. Tautan `?tampil=salah` membuka hasil langsung di tab Salah.
2. **Riwayat** (`/riwayat`): tiap percobaan yang selesai dan punya soal salah memuat tombol **N salah · Lihat** (membuka hasil di tab Salah). Percobaan tanpa soal salah diberi tanda "Semua benar".
3. **Riwayat > Soal salah** (`/riwayat?tab=salah`): semua soal yang **jawaban terakhirnya salah**, dari semua latihan topik, paket, simulasi, dan Drilling. Bisa disaring per mata kuliah dan BAB (alamat menyimpan saringannya), tiap soal memuat mata kuliah, BAB, berapa kali sudah salah (`salah 3×`), dan tautan ke percobaan asalnya. Tombol **Latih ulang N soal** (mode Learning) dan **Mode ujian** membuat latihan baru berisi soal-soal itu (maksimal 100). Menjawab benar sekali, di percobaan mana pun, mengeluarkan soal dari daftar.

Aturan daftar:

- Hanya jawaban yang sudah **terkunci** yang dihitung: mode Learning setelah *Cek jawaban*, atau percobaan yang sudah selesai. Jawaban mode ujian yang belum diselesaikan belum masuk, jadi kunci tidak bocor.
- Esai (tidak dinilai) tidak masuk.
- Soal draf, BAB atau mata kuliah yang disembunyikan, dan soal khusus kampus lain tidak muncul (aturan yang sama dengan kumpulan soal biasa).
- Daftar hanya milik pemilik akun.

## Endpoint

- `GET /api/medcoel/wrong?subject=ID&chapter=ID&page=1&perPage=10` memuat `total` (semua soal salah, tidak tersaring), `count` (setelah disaring), `page`, `totalPages`, `subjects[{ id, name, slug, count, chapters[{ id, title, count }] }]`, dan `items[{ id, question (dengan kunci dan pembahasan), response, detail, times, answeredAt, attempt, subject, chapter }]`.
- `POST /api/medcoel/attempts/wrong` `{ subject?, chapter?, count?, mode? }` membuat percobaan latihan (`settings.wrongRetry: true`). "Ulangi dengan pengaturan sama" di halaman hasilnya mengulang soal salah yang sama jenisnya (juga sudah menangani latihan Drilling).

Kode: `apps/pocketbase/pb_hooks/lib/wrong.js`, `wrong.pb.js`; web: `components/WrongBank.jsx`, `pages/History.jsx`, `pages/Runner.jsx`. Tes: `apps/pocketbase/test/wrong-api.test.mjs` (`npm run test:wrong`).
