# Simulasi Dokter

Fitur "visual novel" di `/simulasi-dokter`: pemain berperan sebagai dokter, menanyai pasien, memeriksa, meminta penunjang, menetapkan diagnosis kerja, lalu mendapat laporan penilaian. Diporting dari prototipe v3 (isi medis disalin apa adanya).

## Aturan pemain

- Di layar awal pemain **memilih poli** (umum, bedah, kandungan, anak, penyakit dalam) atau "Acak" untuk semua poli. Penyakit pasien **diundi dari poli yang dipilih** saat "Mulai pasien baru" (tidak mengulang kasus sebelumnya); "Pasien berikutnya" tetap di poli yang sama. Pilihan poli disimpan di perangkat. Kasus menentukan sprite pasien, latar, dan jas dokter; pemain tidak bisa memilih karakter atau ekspresi.
- Pemain juga memilih mode (Santai / Berwaktu) dan penampilan dokternya sendiri (disimpan di perangkat).
- Untuk pengujian lokal saja: `?kasus=spog` memaksa kasus tertentu. Tidak aktif di build produksi.

## Isi kasus

Ada **50 kasus, 10 per poli, masing-masing dengan diagnosis berbeda**, dan sekitar 100 diagnosis (termasuk diagnosis banding). 5 kasus pertama berasal dari prototipe; 45 lainnya ditambahkan lewat migrasi `1800001300_sim_cases_50.js`.

- Sumber kasus tambahan ada di `apps/web/scripts/sim-cases/*.mjs` (satu berkas per poli, plus `dx.mjs` untuk diagnosis baru). Jalankan `node scripts/export-sim-cases.mjs` di `apps/web` untuk memeriksa semuanya terhadap katalog dan membuat ulang migrasinya. Migrasi hanya menambah kunci yang belum ada, jadi kasus yang sudah diubah admin tidak tertimpa.
- `npm test` memeriksa: 10 kasus per poli, tidak ada tindakan khusus poli lain di K/U/B, setiap id ada di katalog, bentuk jawaban lengkap, dan bermain sempurna menghasilkan skor di atas 90 di tiap kasus.
- Katalog bertambah beberapa tindakan yang dibutuhkan kasus baru (mis. OAT, antiplatelet, insulin, antitoksin difteri, zink, vitamin A, tablet zat besi, tokolitik, kuretase, induksi, seksio, TSH).
- **Isi medis kasus tambahan disusun dari pedoman umum dan belum ditinjau dokter penguji.** Setiap kasus memuat catatan "Acuan" di akhir laporan. Sebelum dipakai luas, sebaiknya ditinjau dan diedit lewat Admin > Simulasi Dokter (atau dinonaktifkan sementara).

## Alur layar

Panggung (latar, pasien, suster, dokter, kotak dialog) di kiri, catatan dokter SOAP terisi otomatis di bawahnya. Panel kanan berisi 5 tahap: Anamnesis, Fisik, Penunjang, Rencana (tatalaksana), Diagnosis. Di tiap tahap pemain memilih bagian dulu ("Mau tanya bagian apa?"), baru daftar pertanyaannya.

Tindakan spesifik (tanpa flag `g`) memunculkan pertanyaan **"Kenapa kamu menanyakan/memeriksa ini?"**: pemain memilih diagnosis banding yang ingin dinilai. Setelah menetapkan diagnosis kerja, pemain juga ditanya diagnosis banding mana yang masih perlu disingkirkan (dinilai terhadap `ddx` kasus, tidak mengubah skor).

Skor (0-100) = diagnosis 30 + hal penting 40 + alasan 20 + efisiensi 10, sama dengan prototipe. Hasil tersimpan di koleksi `doctor_sims` dan tampil di Riwayat, tab "Simulasi dokter". Sesi tutorial tidak disimpan.

Skor juga masuk **leaderboard gabungan**: skor terbaik tiap kasus dalam periode × `pointsSimulation` / 100 (bawaan 10 poin untuk skor 100; diatur di Admin > Pengaturan > Umum). Mengulang kasus yang sama hanya menaikkan poin bila skornya lebih tinggi.

## Mengelola kasus (dashboard admin)

Kasus dan daftar diagnosis disimpan di database (koleksi `sim_cases` dan `sim_diagnoses`) dan dikelola di **Admin > Simulasi Dokter**:

- **Daftar kasus**: aktif/nonaktif (nonaktif tidak diundi), urutan, statistik (berapa kali dimainkan, rata-rata skor, persentase diagnosis tepat), Ubah, Duplikat, Hapus, dan **Coba** (membuka `/simulasi-dokter?kasus=kode`; admin bisa mencoba kasus nonaktif).
- **Editor kasus**: kode, poli (menentukan latar, jas dokter, tindakan khusus poli), gambar dan ekspresi pasien, nama-usia, dialog pembuka, diagnosis tepat, diagnosis banding, acuan klinis, **penilaian tindakan** (Penting / Bermanfaat / Berisiko untuk setiap tindakan di katalog, bisa dicari), dan **jawaban khusus** (ucapan pasien, temuan, kartu hasil lab, catatan) yang menggantikan jawaban bawaan katalog. Tombol JSON untuk menyalin atau menempel kasus utuh.
- **Daftar diagnosis**: nama dan kelompok (resp, kardio, infeksi, dst.) yang dipakai mencocokkan alasan pemain dengan tag tindakan. Diagnosis yang masih dipakai kasus tidak bisa dihapus.

Server memvalidasi semua isian (gambar pasien harus yang tersedia, diagnosis harus ada di daftar, id tindakan aman). Kasus `umum` dipakai tutorial: bisa dinonaktifkan (tetap dipakai tutorial, tidak diundi) tetapi tidak bisa dihapus. Pemain memuat kasus terbaru dari `GET /api/medcoel/doctor-sim/content` saat membuka simulasi; bila server tidak menjawab, web memakai kasus bawaan.

### Isi bawaan dan katalog

- `apps/web/src/features/simulasi/data/cases.js` adalah isi awal (dan cadangan). Migrasi `1800000900_sim_content.js` dibuat dari file ini oleh `node apps/web/scripts/export-sim-seed.mjs`; tes memastikan keduanya sama. Setelah dipakai produksi, ubah kasus lewat dashboard, bukan file ini.
- `apps/web/src/features/simulasi/data/catalog.js` adalah katalog tindakan (anamnesis, fisik, penunjang, tatalaksana); masih di kode. Flag katalog: `g` = tidak perlu alasan; `inv` = mahal/invasif (dinilai tidak tepat tanpa indikasi); `only:spog` / `only:anak` = hanya untuk poli itu.

Penilaian tindakan: `K` penting, `U` bermanfaat, `B` berisiko; sisanya "kurang perlu".

Acuan klinis tiap kasus ditulis di `ref`. Sebagian masih bertanda "belum diverifikasi ke SKDI atau PNPK"; perbarui setelah diperiksa.

## Tutorial

`/simulasi-dokter?tutorial=1`: kasus tetap (poli umum, pneumonia), mode santai, 10 langkah dipandu Nilo. Selesai atau "Lewati" menyimpan status `users.tutorials.dokter`. Tutorial latihan soal ada di `/tutorial/latihan-soal` (dipandu Kila). Pemilih tutorial muncul sekali setelah daftar; selama ada tutorial yang belum selesai, pengingat muncul sekali per login.
