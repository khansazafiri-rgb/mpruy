# Program studi dan kampus

Siapa boleh melihat soal khusus kampus ditentukan oleh **program studi dan kampus sekaligus**.
Mahasiswa Kedokteran UNAIR melihat soal yang diunggah Kedokteran UNAIR. Mahasiswa Keperawatan
UNAIR tidak melihatnya, walau kampusnya sama.

## Model data

Satu record `campuses` berarti **satu penyelenggaraan**: pasangan (program studi, institusi).
"Kedokteran Universitas Airlangga" dan "Keperawatan Universitas Airlangga" adalah dua record.
Karena semua pembatasan soal, pengumuman, papan peringkat, dan pengajuan sudah memakai id kampus,
aturan hak lihat tidak berubah sama sekali. Yang baru hanya cara memilihnya.

| Koleksi / kolom | Isi |
|---|---|
| `programs` | Program studi: `name`, `order`, `active`, `unverified` |
| `campuses.program` | Program studi penyelenggara |
| `campuses.institution` | Nama institusi tanpa nama prodi (untuk tampilan) |
| `campuses.unverified` | `true` bila ditulis sendiri oleh pengguna dan belum diperiksa admin |
| `campuses.name` | Tetap unik. Record Kedokteran lama tetap "FK ..."; yang baru "<Prodi> <Institusi>" |

Migrasi `1800002800_programs_campus_offerings.js`: 27 prodi kesehatan, 105 kampus lama otomatis
menjadi Kedokteran, dan contoh kampus untuk beberapa prodi lain. Daftar selain Kedokteran **belum
lengkap** (data resmi PDDikti tidak bisa diambil otomatis); lengkapi lewat admin.

## Alur pengguna

Pendaftaran (langkah 1), Profil, dan ganti kampus oleh admin memakai pemilih yang sama:

1. Centang **Saya belum punya kampus** (mis. siswa SMA): tanpa prodi dan kampus, semester opsional.
2. **Program studi / fakultas**: pilih dari daftar, atau **Prodi lainnya, tulis sendiri**.
3. **Asal kampus**: daftar kampus yang menyelenggarakan prodi itu, atau **Kampusku belum ada di
   daftar, tulis sendiri**.

Pilihan "tulis sendiri" tidak membatasi siapa pun:

- Record baru dibuat saat akun jadi (setelah email terverifikasi), bukan saat mengisi formulir.
- Nama dicocokkan tanpa memedulikan huruf besar/kecil dan spasi, jadi teman dengan tulisan sedikit
  berbeda otomatis bergabung ke record yang sama.
- Record baru `unverified`: tidak tampil di daftar pilihan umum sampai admin menjadikannya resmi.
- Nama ditolak bila memuat tautan, tag, atau tidak berupa huruf.

Batas ganti kampus (`campusChangeDays`) tetap berlaku. Akun lama yang dulu menulis kampus sendiri
(`campusOther`) tidak diubah; mereka bisa memilih ulang di Profil.

## Admin: Pengaturan > Prodi & kampus

- Daftar menunggu pemeriksaan: **Jadikan resmi** atau **Gabungkan ke...**.
- **Tempel daftar kampus** untuk satu prodi, satu baris `Institusi | Kota | ptn/pts`. Cara tercepat
  melengkapi daftar dari PDDikti. Nama yang sama dengan kampus buatan pengguna menjadikannya resmi.
- **Gabungkan dua kampus**: hanya untuk prodi yang sama (menggabung lintas prodi akan mencampur hak
  lihat soal, jadi ditolak server).
- **Gabungkan dua program studi** (mis. "Ilmu Keperawatan" ke "Keperawatan"): kampus kembar ikut
  tergabung, sisanya dipindah dan namanya disesuaikan.
- Tambah, ganti nama, dan nonaktifkan prodi dan kampus.

## Kode

- `pb_hooks/lib/campusSelect.js`: validasi pilihan, pembuatan/penggabungan record, gabung kampus dan prodi, tempel massal.
- Dipakai oleh `lib/signup.js` (pendaftaran), `me.pb.js` (ganti kampus), `admin.pb.js` (admin).
- Web: `components/CampusPicker.jsx`, `lib/campus.js`, `pages/admin/CampusSettings.jsx`.
- Tes: `npm run test:program-campus` (di `apps/pocketbase`, server lokal kosong dengan `MEDCOEL_DEV_MODE=1`).
