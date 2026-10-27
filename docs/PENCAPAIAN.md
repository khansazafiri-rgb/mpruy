# Pencapaian dan julukan

Pencapaian dihitung langsung dari data yang sudah ada, tanpa tabel baru, sehingga aktivitas lama ikut terhitung
dan angkanya tidak bisa tidak sinkron. Pencapaian **tidak** mengubah poin atau peringkat leaderboard.
Kode: `apps/pocketbase/pb_hooks/lib/achievements.js` (aturan) dan `features/achievements/Achievements.jsx` (tampilan di Progres).

## Tangga pencapaian

| Tangga | Dihitung dari | Tingkatan |
|---|---|---|
| Soal dikerjakan | soal berbeda yang pernah dijawab | 10 Langkah pertama · 100 Rajin latihan · 500 Pejuang soal · 1.000 Seribu soal · 5.000 Penghuni bank soal |
| Benar di percobaan pertama | jawaban benar pada percobaan pertama | 50 Mulai tepat · 250 Tajam · 1.000 Seribu benar |
| Hari aktif berturut-turut | rantai terpanjang di `daily_activity` | 3 Konsisten · 7 Seminggu penuh · 30 Sebulan tanpa absen |
| Kasus Simulasi Dokter | kasus berbeda yang pernah diselesaikan | 1 Pasien pertama · 10 Dokter jaga · 50 Dokter IGD |
| Diagnosis tepat | kasus berbeda dengan diagnosis benar | 5 Diagnostik · 25 Ahli diagnosis |
| Simulasi CBT dan paket | percobaan simulasi/paket yang selesai | 1 Uji coba pertama · 10 Siap ujian · 50 Veteran CBT |
| Pengajuan soal diterima | pengajuan berstatus selesai | 1 Kontributor · 5 Kontributor setia |

## Julukan per mata kuliah

Cakupan = soal berbeda yang dikerjakan ÷ soal tayang di mata kuliah itu. Akurasi = benar ÷ dinilai, pada percobaan pertama.

| Julukan | Syarat |
|---|---|
| Penjelajah {mata kuliah} | cakupan ≥ 25% (mata kuliah minimal 20 soal) |
| Ahli {mata kuliah} | cakupan ≥ 50% dan akurasi ≥ 70% (minimal 30 soal) |
| Master of {mata kuliah} | cakupan ≥ 80% dan akurasi ≥ 80% (minimal 30 soal) |

## Julukan utama

Julukan dengan prioritas tertinggi tampil di Progres dan di samping nama pada Leaderboard. Master dan Ahli selalu di atas
tangga umum; di antara tangga umum, tingkatan yang lebih tinggi (relatif terhadap panjang tangganya) menang.
Untuk mengubah angka atau nama, ubah `LADDERS` / `MASTERY` di `achievements.js` lalu jalankan `npm test` di `apps/pocketbase`.
