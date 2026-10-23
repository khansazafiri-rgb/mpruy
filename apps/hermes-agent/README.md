# MEDCOEL Hermes Agent

Worker admin terpisah dari server web MEDCOEL. Tahap fondasi ini menangani:

- login memakai akun PocketBase ber-role `agent`;
- polling pengajuan `antre` dan laporan ke Telegram;
- allowlist Telegram admin;
- `/claim`, `/fix`, `/show`, `/queue`;
- menerima JSON pengajuan dari admin lewat Telegram;
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

Claim dahulu bila ingin menandai sedang dikerjakan:

```text
/claim MC261023-ABCD
```

Kirim file JSON sebagai **document** dengan caption:

```text
/dryrun MC261023-ABCD ID_BAB_DARI_KATALOG
```

Hermes tidak menebak BAB dari filename. Jika dry-run valid, bot menampilkan jumlah valid/invalid/duplikat, hash JSON, dan tombol `Setujui impor` / `Tolak`. Tombol approval hanya berlaku 2 jam dan hanya untuk admin Telegram yang menjalankan dry-run tersebut.

Saat `Setujui impor` ditekan, Hermes:

1. memverifikasi hash;
2. menjalankan dry-run yang sama sekali lagi;
3. hanya jika masih valid menjalankan `dryRun: false`;
4. menghapus approval lokal setelah sukses.

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
