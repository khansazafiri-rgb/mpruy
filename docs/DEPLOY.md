# Deploy MEDCOEL ke VPS

Polanya sama dengan PCV Classroom: Caddy (HTTPS otomatis) di depan, PocketBase
di `127.0.0.1:8090`, web hasil build disajikan statis. Bedanya folder dan nama
service: `/opt/medcoel` dan `medcoel`, supaya bisa berdampingan dengan web lama
di VPS yang sama bila perlu.

## 1. Domain

Arahkan A record `medcoel.com` dan `www.medcoel.com` ke IP VPS.

## 2. Pasang

```bash
sudo bash deploy/setup-vps.sh
```

Skrip memasang Node 22, Caddy, mengunduh PocketBase 0.38, build web, membuat
user `medcoel`, file `/opt/medcoel/medcoel.env` (dengan `MEDCOEL_SECRET` acak),
dan menyalakan service `medcoel`.

Bila VPS sudah menjalankan Caddy untuk web lama, jangan timpa
`/etc/caddy/Caddyfile`: tambahkan blok `medcoel.com` dari `deploy/Caddyfile`
ke file yang ada.

## 3. Superuser PocketBase

```bash
sudo -u medcoel /opt/medcoel/app/apps/pocketbase/pocketbase superuser upsert EMAIL PASSWORD --dir=/opt/medcoel/pb_data
```

Masuk ke `https://medcoel.com/_/` dengan akun itu. Tidak ada password di
repositori maupun migrasi.

## 4. Email (SMTP)

Di `/_/` > Settings > Mail settings: isi alamat pengirim dan SMTP. Layanan
gratis yang cocok, misalnya Brevo (300 email/hari) atau Gmail dengan sandi
aplikasi (sekitar 500/hari). Pengingat ujian sudah digabung satu email per
pengguna per hari supaya hemat kuota. Tanpa SMTP, pendaftaran tidak bisa
mengirim kode.

## 5. Akun admin dan agen

Admin dibuat langsung di database (PRD), bukan lewat pendaftaran publik. Di
`/_/` > Collections > users > New record: isi `loginId`, `name`, `email`,
`password`, centang `verified`, lalu pilih `role`:

- `admin` untuk pengelola dashboard;
- `agent` untuk Hermes Agent (lihat HERMES_AGENT.md).

Akun yang dibuat tanpa role otomatis menjadi `user`.

## 6. Variabel lingkungan

Isi `/opt/medcoel/medcoel.env` (Google Drive, Turnstile, Hermes), lalu
`sudo systemctl restart medcoel`. Status tiap layanan terlihat di Dashboard
Admin > Ringkasan dan Pengaturan > Sistem.

## 7. Update

```bash
sudo bash /opt/medcoel/app/deploy/update.sh
```

Migrasi baru berjalan otomatis saat service restart.

## 8. Backup dan uji pulih

```bash
sudo apt-get install -y rclone && sudo rclone config   # remote "gdrive"
sudo crontab -e
30 2 * * * /opt/medcoel/app/deploy/backup.sh >> /var/log/medcoel-backup.log 2>&1
```

PRD meminta uji pemulihan sebelum ada data pengguna sungguhan: unduh satu
`data-*.db.gz`, ekstrak ke folder kosong sebagai `data.db`, jalankan
`pocketbase serve --dir=<folder>` di laptop, dan pastikan soal serta akun
terbaca.

## Daftar periksa sebelum rilis (PRD bagian Keamanan)

- [ ] SMTP aktif dan email kode sampai (cek folder Spam)
- [ ] Turnstile aktif (`TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET`)
- [ ] Google Drive tersambung dan satu unggahan PDF berhasil dari HP
- [ ] `MEDCOEL_DEV_MODE` tidak ada di medcoel.env
- [ ] Daftar kampus dicocokkan dengan PDDikti/KKI
- [ ] Tautan komunitas WA, Instagram, dan nomor WA admin diisi di Pengaturan
- [ ] `npm run test:api` dijalankan ke salinan server (bukan produksi)
- [ ] Backup harian berjalan dan uji pulih berhasil
