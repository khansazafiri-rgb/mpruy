# Simulasi Dokter

Fitur "visual novel" di `/simulasi-dokter`: pemain berperan sebagai dokter, menanyai pasien, memeriksa, meminta penunjang, menetapkan diagnosis kerja, lalu mendapat laporan penilaian. Diporting dari prototipe v3 (isi medis disalin apa adanya).

## Aturan pemain

- Pasien dipilih **acak oleh sistem** saat "Mulai pasien baru" (tidak mengulang kasus sebelumnya). Kasus menentukan sprite pasien, latar, dan jas dokter. Pemain tidak bisa memilih karakter, poli, atau ekspresi.
- Pemain hanya memilih mode (Santai / Berwaktu) dan penampilan dokternya sendiri (disimpan di perangkat).
- Untuk pengujian lokal saja: `?kasus=spog` memaksa kasus tertentu. Tidak aktif di build produksi.

## Alur layar

Panggung (latar, pasien, suster, dokter, kotak dialog) di kiri, catatan dokter SOAP terisi otomatis di bawahnya. Panel kanan berisi 5 tahap: Anamnesis, Fisik, Penunjang, Rencana (tatalaksana), Diagnosis. Di tiap tahap pemain memilih bagian dulu ("Mau tanya bagian apa?"), baru daftar pertanyaannya.

Tindakan spesifik (tanpa flag `g`) memunculkan pertanyaan **"Kenapa kamu menanyakan/memeriksa ini?"**: pemain memilih diagnosis banding yang ingin dinilai. Setelah menetapkan diagnosis kerja, pemain juga ditanya diagnosis banding mana yang masih perlu disingkirkan (dinilai terhadap `ddx` kasus, tidak mengubah skor).

Skor (0-100) = diagnosis 30 + hal penting 40 + alasan 20 + efisiensi 10, sama dengan prototipe. Hasil tersimpan di koleksi `doctor_sims` dan tampil di Riwayat, tab "Simulasi dokter". Sesi tutorial tidak disimpan.

## Menambah atau mengubah kasus

Semua data ada di `apps/web/src/features/simulasi/data/`:

| File | Isi |
|---|---|
| `catalog.js` | Katalog tindakan (anamnesis, fisik, penunjang, tatalaksana). Format per baris dijelaskan di komentar tiap blok. |
| `cases.js` | Daftar diagnosis `DX` dan kasus `CASES` (pasien, ekspresi, intro, `dxOk`, `ddx`, `K`/`U`/`B`, jawaban khusus `A`, acuan). |

Flag katalog: `g` = tidak perlu alasan; `inv` = mahal/invasif (dinilai tidak tepat tanpa indikasi); `only:spog` / `only:anak` = hanya untuk poli itu (di poli lain disembunyikan).

Penilaian tindakan: `K` penting, `U` bermanfaat, `B` berisiko; sisanya "kurang perlu".

Bila menambah kasus baru:

1. Tambahkan kasus di `cases.js` (kunci = poli, pakai sprite pasien yang ada di `apps/web/public/simulasi/`).
2. Tambahkan judul dan `dxOk` yang sama di `apps/pocketbase/pb_hooks/lib/doctorSim.js` supaya server mau menyimpan hasilnya.
3. Jalankan `npm test`: tes memastikan semua id di K/U/B dan jawaban ada di katalog, dan tabel kasus server sama dengan web.

Acuan klinis tiap kasus ditulis di `ref`. Sebagian masih bertanda "belum diverifikasi ke SKDI atau PNPK"; perbarui setelah diperiksa.

## Tutorial

`/simulasi-dokter?tutorial=1`: kasus tetap (poli umum, pneumonia), mode santai, 10 langkah dipandu Nilo. Selesai atau "Lewati" menyimpan status `users.tutorials.dokter`. Tutorial latihan soal ada di `/tutorial/latihan-soal` (dipandu Kila). Pemilih tutorial muncul sekali setelah daftar; selama ada tutorial yang belum selesai, pengingat muncul sekali per login.
