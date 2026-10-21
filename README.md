# MEDCOEL

Web belajar gratis berbasis komunitas untuk mahasiswa kedokteran (medcoel.com).
Dibangun dari PRD MEDCOEL Draf 2 (21 Oktober 2026), dengan web lama
PCV Classroom (repo `kons`) sebagai rujukan teknis.

Stack sama dengan web lama supaya panduan VPS-nya tetap berlaku:
**React (Vite) + Tailwind**, **PocketBase 0.38** (database, aturan akses, hook
server), dan **Caddy** di satu VPS.

## Isi repositori

```
apps/web/          tampilan (React)
apps/pocketbase/
  pb_migrations/   skema, aturan akses, data awal (kampus, mata kuliah)
  pb_hooks/        endpoint /api/medcoel/*, tugas terjadwal, logika server
  pb_hooks/lib/    format soal, penilaian (port dari web lama), Google Drive, dll
  test/            tes format impor dan tes API per peran
  scripts/         unduh PocketBase, data contoh pengembangan
deploy/            Caddyfile, systemd, skrip pasang/update/backup
docs/              panduan dan kontrak (lihat daftar di bawah)
```

## Menjalankan di laptop

Butuh Node.js 22.

```bash
npm run setup                          # npm install + unduh PocketBase
cd apps/pocketbase
./pocketbase migrate up --dir=./pb_data --migrationsDir=./pb_migrations --hooksDir=./pb_hooks
./pocketbase superuser upsert kamu@contoh.test passwordpanjang --dir=./pb_data
cd ../..
npm run dev                            # web :3000, PocketBase :8090 (mode pengembangan)
```

Isi data contoh (akun admin + pengguna dengan password acak, dan 37 soal Anatomi):

```bash
cd apps/pocketbase
PB_SU_EMAIL=kamu@contoh.test PB_SU_PASSWORD=passwordpanjang node scripts/seed-dev.mjs
```

Di mode pengembangan (`MEDCOEL_DEV_MODE=1`, otomatis lewat `npm run dev`):
email belum perlu diatur (kode verifikasi tampil di layar dan di log),
captcha dilewati, dan file tersimpan lokal bila Google Drive belum diatur.

## Tes

```bash
npm test                               # tes konten kaya (web) + format impor (server)
cd apps/pocketbase && npm run test:api # tes API per peran, butuh server dev berjalan dengan data kosong
```

Tes API memeriksa dengan akun pengunjung, pengguna kampus A, pengguna kampus B,
admin, dan agen: naik peran ditolak, data orang lain tidak terbaca, soal
terbatas kampus ditegakkan di server, kunci jawaban tidak terkirim sebelum
waktunya, alur pengajuan sampai impor Hermes, pengumuman, jadwal, dan
penonaktifan akun.

## Dokumen

| Dokumen | Isi |
|---|---|
| [docs/KEPUTUSAN.md](docs/KEPUTUSAN.md) | Jawaban sementara untuk semua bagian **[ISI]** di PRD, dan cara mengubahnya |
| [docs/DEPLOY.md](docs/DEPLOY.md) | Pasang di VPS, SMTP, akun admin dan agen, backup |
| [docs/GOOGLE_DRIVE.md](docs/GOOGLE_DRIVE.md) | Menyambungkan Google Drive admin untuk PDF dan foto bukti |
| [docs/HERMES_AGENT.md](docs/HERMES_AGENT.md) | Kontrak API untuk Hermes Agent |
| [docs/FORMAT_SOAL.md](docs/FORMAT_SOAL.md) | Format JSON soal dan blok konten kaya (untuk skill konverter) |
