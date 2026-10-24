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

Skrip memasang Node 22, Caddy, mengunduh PocketBase sesuai
`apps/pocketbase/.pocketbase-version` (sekarang 0.40.5, checksum diverifikasi), build web, membuat
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

Migrasi baru berjalan otomatis saat service restart. Untuk memeriksa apakah server sudah memuat pembaruan, jalankan `bash deploy/cek-server.sh` (hanya membaca): ia menampilkan proses/layanan PocketBase, migrasi terbaru di kode versus di database, dan jumlah kasus Simulasi. Admin juga melihat pita peringatan "Server belum memuat pembaruan terbaru" di web bila tertinggal. **Hook dan migrasi baru tidak
terpasang selama PocketBase belum di-restart** (produksi memakai
`--hooksWatch=false`). Tanda server tertinggal: Drilling tampil "tidak ditemukan",
jumlah kasus Simulasi per poli masih lama, dan dashboard admin menampilkan
peringatan "Server belum memuat pembaruan terbaru". Cari layanannya dengan
`systemctl list-units --type=service | grep -i -E 'medcoel|pocketbase'` atau
`ps aux | grep pocketbase`, lalu `sudo systemctl restart <nama layanan>` (nama
layanan di server ini masih perlu dipastikan). `update.sh` juga
menyamakan binary PocketBase dengan `apps/pocketbase/.pocketbase-version`
(tidak mengunduh ulang bila versinya sudah sama).

## Versi PocketBase

Produksi dan repositori memakai **PocketBase 0.40.5**. Versinya ditulis di satu
tempat: `apps/pocketbase/.pocketbase-version`. Skrip unduh, CI, dan `update.sh`
membaca file itu, dan unduhan ditolak bila checksum SHA-256-nya tidak cocok
dengan `checksums.txt` rilis resmi.

Untuk naik versi:

1. Baca CHANGELOG rilis yang dilewati, cari tanda ⚠️ (breaking change).
2. Ganti isi `.pocketbase-version`, lalu `bash apps/pocketbase/scripts/download-pocketbase.sh`.
3. Jalankan `npm run lint`, `npm test`, `npm run build`, dan `npm run test:api`
   (di `apps/pocketbase`, dengan database kosong).
4. Uji jalur upgrade: buka salinan `pb_data` produksi dengan binary baru di
   laptop sebelum `update.sh` dijalankan di VPS.

Catatan 0.38 ke 0.40.5 yang sudah diperiksa untuk repo ini:

- `encoding/json/v2` (0.40.0): field JSON (opsi soal, pengaturan, jawaban)
  dan respons endpoint diuji ulang lewat tes API; tidak ada perubahan perilaku.
- Regex goja diperbarui (0.39.x, 0.40.2): parser impor, penilaian isian, dan
  perbaikan teks menghasilkan keluaran yang sama persis di Node dan di goja 0.40.5.
- Perintah CLI yang gagal kini keluar dengan kode non-zero (0.40.0). Skrip
  deploy tidak bergantung pada kode keluar 0; CI justru jadi lebih ketat.
- Header `Cross-Origin-Opener-Policy: same-origin` bawaan (0.40.0) tidak
  memengaruhi web karena tidak ada alur yang memakai jendela popup.
- Database yang dibuat di 0.38.0 terbuka normal di 0.40.5 (migrasi sistem
  berjalan otomatis).

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
