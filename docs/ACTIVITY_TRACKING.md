# Pelacakan aktivitas siswa (dashboard admin)

Admin membuka **Admin → Aktivitas siswa** (`/admin/aktivitas`) untuk melihat bagian web yang paling sering dibuka siswa.

## Yang dicatat
Per siswa, per hari (WIB), per **jenis halaman** (30 pola yang diizinkan, mis. `/kerjakan/:id`): jumlah dibuka dan detik aktif.
Tidak pernah dicatat: URL asli, id soal/BAB, query, isi jawaban, IP, perangkat. Aktivitas admin dan agent tidak dicatat.

## Aturan waktu aktif
Hanya saat tab terlihat dan ada interaksi dalam 5 menit terakhir; laporan tiap 60 detik (maks 300 dtk per laporan).

## Privasi dan retensi
- Halaman admin hanya menampilkan agregat (tanpa nama siswa).
- Data dihapus otomatis setelah 180 hari (pembersihan per jam) dan saat akun siswa dihapus (cascade).
- `Privacy.jsx` sudah memuat kalimat pemberitahuan. Bila admin pernah menyimpan teks kebijakan privasi sendiri di Pengaturan, tambahkan kalimat itu secara manual.

## Pasang di server
Restart PocketBase agar migrasi `1800003100_activity_daily.js` dan hook `activity.pb.js` termuat (produksi memakai `--hooksWatch=false`). Sebelum itu admin melihat banner "server belum memuat pembaruan".

## Mematikan
Hapus `<ActivityTracker />` dari `apps/web/src/App.jsx` (berhenti mencatat) dan/atau hapus koleksi `activity_daily`.

## Tes
`npm test --prefix apps/web` (152), `npm test --prefix apps/pocketbase`, `PB_URL=… npm run test:activity --prefix apps/pocketbase` (10 langkah, PocketBase 0.40.5 asli), serta uji browser Chromium: bukti di `docs/evidence/activity/`.
