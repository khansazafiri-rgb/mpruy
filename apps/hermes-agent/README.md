# MEDCOEL Hermes Agent

Worker admin terpisah dari server web MEDCOEL. Tahap fondasi ini menangani:

- login memakai akun PocketBase ber-role `agent`;
- polling pengajuan `menunggu_konfirmasi` dan `antre`, lalu langsung lapor ke Telegram (PDF ikut dikirim bila Drive dikonfigurasi);
- setiap notifikasi memuat perintah pengumpulan hasil dengan kode pengajuan sudah terisi;
- allowlist Telegram admin;
- `/terima`, `/claim`, `/fix`, `/show`, `/queue`;
- `/jenis`, `/matkul`, `/pindah` (ubah jenis isi soal/materi dan/atau mata kuliah pengajuan);
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

### Mengubah tujuan pengajuan (jenis isi / mata kuliah)

Pengaju kadang salah memilih: PDF PPT materi tercatat sebagai soal (pengajuan lama dibuat sebelum ada pilihan isi PDF, jadi otomatis soal), atau mata kuliahnya keliru. Admin bisa membetulkannya langsung di Telegram. **Yang tidak disebut tidak berubah**; kampus, cakupan, bahasa, berkas PDF, dan status tetap.

| Perintah | Yang berubah | Yang tetap |
| --- | --- | --- |
| `/jenis KODE materi` atau `/jenis KODE soal` | jenis isi PDF | mata kuliah |
| `/matkul KODE NAMA MATA KULIAH` | mata kuliah | jenis isi |
| `/pindah KODE materi NAMA MATA KULIAH` (atau `soal`) | jenis isi dan mata kuliah | - |
| `/matkul` atau `/matkul kata` | tidak mengubah apa pun, hanya menampilkan daftar mata kuliah (disaring kata) | - |

```text
/jenis MC261023-ABCD materi
/matkul MC261023-ABCD Ilmu Penyakit Dalam
/pindah MC261023-ABCD soal Anatomi
/jenis MC261023-ABCD MC261024-EFGH materi      (beberapa kode sekaligus)
```

- Nama mata kuliah tidak peka huruf besar-kecil, boleh slug, dan boleh sebagian asal cocok ke **satu** mata kuliah. Kalau cocok ke beberapa, server menolak dan menyebut kandidatnya; tidak ada yang diubah. Mata kuliah yang disembunyikan tidak bisa dipakai.
- Hanya untuk pengajuan yang belum diimpor: Menunggu konfirmasi, Antre, Diproses, Perlu perbaikan. Yang Selesai atau dibatalkan ditolak.
- Setelah diubah, rencana impor lama untuk pengajuan itu (dari `/put`) dibatalkan, dan `/confirm` juga menolak rencana yang jenis atau mata kuliahnya sudah berbeda dari kondisi server. Kirim JSON lagi dengan `/put KODE` sesuai jenis baru (JSON slide untuk materi, JSON soal untuk soal).
- Salah ubah? Kirim perintah yang sama dengan nilai semula.
- `/change` berbeda: hanya mengatur ke mana soal masuk (Drilling atau BAB) pada rencana impor yang sedang aktif.
- Memanggil endpoint agen `POST /api/medcoel/agent/submissions/{id atau kode}/retarget` (lihat `docs/HERMES_AGENT.md`). **Server PocketBase harus dijalankan ulang** setelah pembaruan supaya endpoint ini aktif (`--hooksWatch=false`).

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

## 5b. Mengirim PDF pengajuan

```text
/files MC261029-SGV2        antrekan PDF belum terkirim; ulangi kegagalan yang pasti
/files MC261029-SGV2 3      ulangi kegagalan pasti pada PDF nomor 3
/retryfiles MC261029-SGV2 3 ulangi PDF 3 setelah memeriksa chat (termasuk konfirmasi tidak pasti)
```

Tiap PDF dikirim dengan **kode, nomor, dan jumlah di nama berkas**, misalnya
`MC261029-SGV2_PDF-03-dari-10_Tissue Bahas Pena B15 UB.pdf` (nama asli siswa dipertahankan di
belakangnya), dan keterangan yang sama. Jadi urutan dan asal PDF tetap jelas setelah diteruskan,
dan tiap JSON kembali ke pengajuannya lewat `/put KODE`. Satu pengajuan lewat web maksimal 10 PDF.

## 6. Systemd

Salin `deploy/medcoel-hermes.service` ke `/etc/systemd/system/medcoel-hermes.service`, lalu:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now medcoel-hermes
sudo systemctl status medcoel-hermes --no-pager
sudo journalctl -u medcoel-hermes -n 100 --no-pager
```

Jangan mencetak token, password, atau isi PDF ke log.

## Pengiriman PDF otomatis dan recovery

Worker PDF berjalan terpisah dari pengumuman antrean. Pengajuan `antre`/`diproses`
diambil tanpa bergantung pada `announced`, kapasitas pengerjaan harian, atau estimasi
hari. `Drive tersedia` berarti tautannya ada; bukan bukti PDF sudah dikirim.

Setiap pasangan pengajuan/admin menyimpan `pdfJobs` di `HERMES_STATE_DIR/state.json`.
Satu file dianggap terkirim hanya setelah Telegram mengembalikan `message_id` dan
konfirmasi tersimpan secara atomik. Satu proses memegang `agent.lock`; proses kedua
ditolak. Semua penulisan state diserialkan dan disinkronkan ke disk.

Retry otomatis memakai backoff 15 detik sampai satu jam (maksimum 8 percobaan),
menghormati Telegram `retry_after`, memperbarui token Drive saat 401, serta memeriksa
izin, tipe PDF dan ukuran maksimum 50 MiB. Pengaturan ada di `.env.example`.
File yang sukses dilewati saat polling/restart/retry. Kegagalan satu PDF tidak
menghapus sukses PDF lain. `/show KODE` menampilkan jumlah terkirim/retry/perlu diperiksa.

Jika service mati saat mengunggah, atau Telegram menerima unggahan tetapi balasannya
hilang, status menjadi `uncertain`. Telegram sendDocument tidak menyediakan kunci
idempotensi: jangan menjanjikan exactly-once pada kondisi ini. Periksa chat, lalu
gunakan `/retryfiles KODE nomor` hanya bila PDF belum ada. `/files` tidak mengulang
status uncertain. Jangan menghapus ledger atau memulihkan snapshot lama setelah
pengiriman baru: itu akan menghilangkan riwayat konfirmasi dan berisiko duplikat.

Saat pertama memasang versi ini, ledger lama belum memiliki konfirmasi PDF. Semua
pengajuan aktif dapat diproses, termasuk yang pernah dikirim manual oleh versi lama.
Review backlog dan chat sebelum menyalakan worker. Jangan menandai delivered dari
`announced` karena pengumuman bukan konfirmasi sendDocument.

Simulasi tanpa jaringan/token/pesan sungguhan:

```sh
node scripts/pdf-queue-dry-run.mjs
npm run check
npm test
```

Mengirim PDF tidak mengubah status pengerjaan/import, `/confirm`, `/change`, atau
alur DRILLING. Offset Telegram lama tetap ditulis sebelum handler; gangguan tepat
di antara dua langkah itu dapat menghilangkan satu command, yang harus dikirim ulang.
Perubahan ini tidak merombak transaksi import yang sudah ada.

## Belum termasuk

- menerima PDF langsung dari Telegram;
- konversi PDF -> JSON oleh model AI;
- shortcut Subject -> Chapter -> scope dari katalog aktual;
- webhook HMAC (polling sudah menjadi jalur recovery utama).

Semua itu ditambahkan setelah bot fondasi berhasil login, membatasi admin, membaca antrean, dan menyelesaikan satu dry-run JSON secara aman.
