# Bahasa Indonesia dan Inggris di seluruh situs

Sakelar **ID / EN** mengatur bahasa tampilan seluruh situs: halaman publik,
pendaftaran, dashboard, navigasi, bantuan, biodata maskot, ruang latihan/ujian,
dan simulasi dokter. Sakelar tersedia juga saat sesi sedang berlangsung.
Pilihan tersimpan di perangkat melalui `medcoel-language`, mengikuti perpindahan
halaman dan tab, serta memperbarui atribut `lang` dokumen untuk pembaca layar.
Ini belum merupakan preferensi akun yang disinkronkan antarperangkat.

Pergantian bahasa tidak memuat ulang halaman atau membuat ulang sesi. Identitas
soal/kasus, pilihan jawaban, jawaban isian yang sudah diketik, tindakan, diagnosis,
catatan, batas waktu, dan penilaian tetap memakai data sumber.

## Bahasa antarmuka

`apps/web/src/i18n/en.js` memuat terjemahan pesan utuh dengan parameter bernomor,
bukan penggantian kata per kata. Kompilasi JSX membungkus teks tampilan dan label
aksesibilitas; nilai formulir, tautan, ID, pengendali tindakan, dan konten kaya
sumber tidak ditulis ulang. Komponen berlangganan preferensi bahasa tanpa remount.
Gunakan `translate="no"` untuk konten pengguna bebas. Tambahkan pesan lengkap ke
kamus saat menambahkan UI baru; pesan yang belum terdaftar kembali ke sumber.
Teks maskot diterjemahkan sebelum animasi mengetik. Pencarian mata kuliah dan
tindakan dokter menerima nama sumber serta nama Inggris.

## Soal dan kasus: Inggris yang diperiksa

Kamus antarmuka berbeda dari terjemahan materi yang ditulis admin. Tidak ada
penerjemahan AI otomatis ketika peserta membuka halaman. Isi materi lama belum
semuanya memiliki versi Inggris. Jika versi Inggris materi belum diperiksa atau
sudah kedaluwarsa, soal/narasi pasien tetap tampil dalam bahasa sumber dengan
keterangan. Nama ilmiah, istilah anatomi/Latin, obat, singkatan dan satuan perlu
dipertahankan sesuai sumber, walaupun kalimat penjelasnya berbahasa Inggris.

Alur admin:

1. Simpan materi sumber seperti biasa. Pada daftar **Edit Soal** atau daftar
   **Simulasi Dokter > Kasus**, buka **Versi Inggris**.
2. Bandingkan sumber dan Inggris per bagian. Soal mencakup teks soal, petunjuk,
   pernyataan, teks opsi/subsoal, seluruh pembahasan dan poin kunci. Kasus mencakup
   judul, identitas pasien untuk tampilan, dialog pembuka, respons tindakan,
   catatan, judul/subjudul/baris kartu hasil, dan rujukan. ID internal kasus,
   tindakan, diagnosis, ekspresi, serta aturan K/U/B tidak menjadi target.
3. Tambahkan istilah khusus yang harus tetap persis, satu per baris. Kamus
   bersama ada di **Pengaturan > Umum > Istilah ilmiah pembahasan Inggris**.
   Pengenalan otomatis mencakup beberapa nama Latin, singkatan dan satuan;
   ini bukan kamus medis lengkap. Gunakan kamus untuk istilah tambahan.
4. Tulis Inggris manual atau gunakan **Buat draf Inggris** jika layanan sudah
   dikonfigurasi. Persetujuan pengiriman wajib untuk bantuan AI: konteks soal
   (termasuk kunci) atau kasus, pembahasan dan kamus dikirim ke OpenAI. Fitur ini
   tidak membaca/mengirim PDF peserta atau data akun peserta.
5. **Simpan draf** boleh dilakukan sebelum semua bagian lengkap. Draf tidak
   diterima peserta. Menyimpan draf menggantikan versi tayang sebelumnya.
6. Periksa makna, negasi, lateralisasi, ketidakpastian, sebab-akibat, angka,
   satuan, istilah, dan alasan setiap opsi. Centang konfirmasi pemeriksaan,
   lalu **Tayangkan hasil pemeriksaan**. Semua bagian harus lengkap. Pemeriksaan
   struktur menolak perubahan angka, istilah terlindungi, HTML, tautan, rumus,
   dan susunan `label=nilai;label=nilai` pada kartu hasil. Pemeriksaan makna tetap
   memerlukan penelaah; pemeriksaan otomatis tidak menjamin akurasi medis.

Satu pilihan EN menampilkan seluruh versi Inggris yang tersedia. Pembahasan,
kunci, dan jawaban isian yang diterima tetap ditahan sampai mode belajar/ujian
mengizinkannya. Payload sebelum kunci hanya memuat teks soal dan opsi/subsoal
Inggris yang aman ditampilkan. Aturan penilaian tidak menerjemahkan jawaban isian
peserta; daftar jawaban yang diterima tetap dikelola pada soal sumber.

Dialog pasien diterjemahkan berdasarkan tindakan atau posisi dialog pembuka,
sehingga dua kalimat sumber yang sama dapat memiliki Inggris berbeda sesuai
konteks. Teks lengkap dilokalkan sebelum dipotong untuk animasi. Pergantian bahasa
tidak menjalankan ulang tindakan, pencatatan atau penghitung waktu.

## Revisi sumber dan kompatibilitas

`questions.explanationEnglish` dan `sim_cases.english` menyimpan kontrak versi 2,
status, sidik sumber/kamus, segmen, catatan draf dan identitas/waktu penelaah.
Perubahan sumber atau kamus menyembunyikan Inggris lama pada respons berikutnya
sampai ditinjau ulang. Halaman yang sudah terbuka harus mengambil data terbaru.
Dokumen versi 1 dari fitur pembahasan saja juga harus diperiksa ulang untuk
mencakup teks soal. Tidak ada perubahan/penghapusan sumber lama.

Editor membandingkan sidik sumber dan revisi dalam transaksi. Perubahan admin
lain selama penyuntingan atau panggilan AI ditolak agar tidak tertimpa. Hanya
endpoint admin khusus yang dapat menayangkan versi Inggris; impor tidak dapat
menyisipkan status tayang untuk melewati pemeriksaan.

## Bantuan draf AI opsional

Konfigurasi lingkungan server:

```dotenv
OPENAI_API_KEY=...
MEDCOEL_TRANSLATION_MODEL=...
```

Pilih model yang mendukung Responses API dan Structured Outputs, lalu restart
PocketBase. Tanpa keduanya, editor manual tetap tersedia. Permintaan memakai
`store: false`, konteks lengkap, skema JSON ketat, dan instruksi mempertahankan
istilah ilmiah. Ini bukan jaminan retensi nol pada penyedia. Admin dibatasi 10
panggilan per jam per proses, termasuk kegagalan; restart mengosongkan batas.
Biaya mengikuti akun API yang dikonfigurasi.

Kegagalan koneksi, penolakan model, respons belum selesai, JSON rusak atau konflik
revisi tidak menimpa draf lama. Hasil yang valid tetap **draf**, memerlukan review.

## Pemasangan dan verifikasi

Deploy kode, jalankan migrasi `1800001600_explanation_english.js` dan
`1800001700_global_language.js`, build web dan restart PocketBase mengikuti
`docs/DEPLOY.md`. Pembaruan melalui `deploy/update.sh` menjalankan tahapan biasa.
Tidak ada terjemahan massal otomatis atas materi yang sudah ada.

Jalankan `npm run lint`, `npm test`, `npm run build`, lalu tes API per peran dengan
`npm run test:api` di `apps/pocketbase` pada server lokal MEDCOEL_DEV_MODE=1 dan
**database pengujian baru**. Tes mencakup akses admin, versi Inggris sebelum kunci,
draf, review, istilah/angka, perubahan sumber/kamus, konflik revisi, struktur
kasus, konteks dialog, serta larangan mengubah data penilaian. Pengujian model
menggunakan respons tiruan; panggilan berbayar perlu diuji setelah konfigurasi.
