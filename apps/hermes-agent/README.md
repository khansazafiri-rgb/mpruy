# MEDCOEL Hermes Agent

Worker admin terpisah dari server web MEDCOEL. Tahap fondasi ini menangani:

- login memakai akun PocketBase ber-role `agent`;
- polling pengajuan `menunggu_konfirmasi` dan `antre`, lalu langsung lapor ke Telegram (PDF ikut dikirim bila Drive dikonfigurasi);
- setiap notifikasi memuat perintah pengumpulan hasil dengan kode pengajuan sudah terisi;
- allowlist Telegram admin;
- `/terima`, `/claim`, `/fix`, `/show`, `/queue`;
- menerima JSON pengajuan dari admin lewat Telegram, sebagai file atau ditempel langsung sebagai teks;
- dry-run wajib dengan `skipInvalid: false`;
- persetujuan Telegram terikat SHA-256 dari ID pengajuan + chapter ID + isi JSON;
- dry-run kedua tepat sebelum impor nyata;
- state kerja berada di server Hermes, bukan server web.

Tahap berikutnya baru menambahkan jalur PDF langsung Telegram -> Drive/temporary workspace -> konversi AI -> pemilihan subject/chapter dari katalog aktual.

## 1. Buat akun agent MEDCOEL

Di `https://medcoel.com/_/` -> Collections -> `users` -> New record:

- `loginId`: misalnya `hermes`
- nama/email sesuai akun operasional
- password acak kuat
- `verified`: aktif
- `role`: `agent`

Jangan commit password. Simpan hanya di environment server Hermes.

Opsional setelah server Hermes mempunyai IP publik tetap, isi `MEDCOEL_AGENT_IPS=<IP_SERVER_HERMES>` pada `/opt/medcoel/medcoel.env` di server web dan restart MEDCOEL.

## 2. Buat bot Telegram

1. Chat `@BotFather`, jalankan `/newbot`, lalu simpan bot token.
2. Chat bot baru tersebut dan kirim `/start` sekali.
3. Dari terminal aman, ambil numeric Telegram user ID:

```bash
curl -s 'https://api.telegram.org/bot<BOT_TOKEN>/getUpdates'
```

Cari `message.from.id`. Nilai itulah yang dimasukkan ke `TELEGRAM_ADMIN_IDS`. Jangan memasukkan username Telegram sebagai pengganti ID.

## 3. Pasang di server Hermes

Contoh layout:

```bash
sudo useradd --system --create-home --home-dir /opt/medcoel-hermes --shell /usr/sbin/nologin medcoel-hermes || true
sudo mkdir -p /opt/medcoel-hermes/app /opt/medcoel-hermes/data
sudo chown -R medcoel-hermes:medcoel-hermes /opt/medcoel-hermes
```

Clone/copy branch ini ke `/opt/medcoel-hermes/app`, lalu buat file secret `/opt/medcoel-hermes/hermes.env` berdasarkan `.env.example`:

```env
MEDCOEL_API_BASE_URL=https://medcoel.com
MEDCOEL_AGENT_IDENTITY=hermes
MEDCOEL_AGENT_PASSWORD=...
TELEGRAM_BOT_TOKEN=...
TELEGRAM_ADMIN_IDS=123456789
HERMES_QUEUE_POLL_MS=15000
HERMES_TELEGRAM_LONG_POLL_SECONDS=25
HERMES_STATE_DIR=/opt/medcoel-hermes/data
HERMES_MAX_JSON_BYTES=5242880
```

Lindungi file secret:

```bash
sudo chown root:medcoel-hermes /opt/medcoel-hermes/hermes.env
sudo chmod 640 /opt/medcoel-hermes/hermes.env
```

## 4. Uji foreground dahulu

```bash
cd /opt/medcoel-hermes/app/apps/hermes-agent
set -a
source /opt/medcoel-hermes/hermes.env
set +a
npm run check
node src/index.mjs
```

Output awal yang benar:

```text
[Hermes] starting
[Hermes] MEDCOEL agent login OK
```

Kemudian kirim `/start` dan `/queue` ke bot.

## 5. Cara kerja JSON pengajuan

### Notifikasi

Begitu pengguna menekan kirim di Chat Admin (status **Menunggu konfirmasi**), Hermes mengirim kartu pengajuan ke semua admin Telegram, sebelum pengajuan dikonfirmasi. Kartu itu juga memuat perintah yang tinggal disalin, dengan kode pengajuan sudah terisi. Saat status berubah menjadi **Antre**, kartu dikirim lagi. Pengajuan yang berubah dalam `HERMES_WAITING_LOOKBACK_HOURS` jam terakhir (bawaan 72) diumumkan saat Hermes pertama kali menyala.

Menu `/` di Telegram berisi semua perintah (diatur otomatis lewat `setMyCommands`).

### Menerima pengajuan

Soal baru bisa diimpor setelah status **Antre**. Dari Telegram:

```text
/terima MC261023-ABCD
```

Untuk menandai sedang dikerjakan: `/claim MC261023-ABCD`.

### Mengirim JSON lewat teks (tanpa file)

```text
/put MC261023-ABCD
[ {"text": "Soal 1 ...", ... }, { ... } ]
```

- JSON boleh ditulis di baris yang sama atau berikutnya, dan boleh dibungkus pagar kode markdown (```` ```json ````).
- Telegram membatasi satu pesan 4096 karakter. JSON yang lebih panjang boleh dikirim sebagai beberapa pesan berurutan; Hermes menyambungnya dan memprosesnya otomatis begitu JSON lengkap. Bila perlu, kirim `/selesai`. `/cancelplan` membatalkan.
- `/put` saja (tanpa kode) memakai pengajuan yang terakhir diumumkan atau diterima.
- Tempelan ditunda di memori Hermes selama `HERMES_PASTE_TTL_MINUTES` (bawaan 30). Batas ukuran total mengikuti `HERMES_MAX_JSON_BYTES`.
- JSON harus murni (bukan string array JavaScript). Bila rusak, Hermes menyebut baris dan kolom galatnya.

### Mengirim JSON lewat file (tetap didukung)

Kirim file JSON sebagai **document** dengan caption:

```text
/put MC261023-ABCD
```

Perintah lama `/dryrun KODE ID_BAB_DARI_KATALOG` (dengan document) juga masih diterima.

### Rencana impor dan persetujuan

Kedua cara membuat **Import Plan** yang belum menulis apa pun ke database. Lihat dengan `/plan`, ubah tujuan dengan `/change drilling` atau `/change chapter ID_BAB`, lalu `/confirm`. Hermes tidak menebak BAB dari isi JSON.

Saat `/confirm`, Hermes:

1. memeriksa pengajuan sudah Antre (kalau masih Menunggu konfirmasi, ia meminta `/terima` dulu dan rencana tetap tersimpan);
2. memverifikasi hash JSON;
3. menjalankan dry-run (`skipInvalid: false`);
4. hanya jika valid, menjalankan impor sungguhan;
5. menghapus rencana dan berkas tempelan lokal setelah sukses.

Rencana kedaluwarsa dalam 2 jam. JSON hasil tempel disimpan sementara di `HERMES_STATE_DIR/plans/` dengan izin 0600.

## 6. Systemd

Salin `deploy/medcoel-hermes.service` ke `/etc/systemd/system/medcoel-hermes.service`, lalu:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now medcoel-hermes
sudo systemctl status medcoel-hermes --no-pager
sudo journalctl -u medcoel-hermes -n 100 --no-pager
```

Jangan mencetak token, password, atau isi PDF ke log.

## Belum termasuk pada fondasi ini

- menerima PDF langsung dari Telegram;
- akses Google Drive oleh Hermes;
- konversi PDF -> JSON oleh model AI;
- shortcut Subject -> Chapter -> scope dari katalog aktual;
- webhook HMAC (polling sudah menjadi jalur recovery utama).

Semua itu ditambahkan setelah bot fondasi berhasil login, membatasi admin, membaca antrean, dan menyelesaikan satu dry-run JSON secara aman.
