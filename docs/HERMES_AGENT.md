# Kontrak Hermes Agent

Hermes Agent adalah peran manajer di server AI milik admin (bisa Hermes,
OpenClaw, atau agen lain). Pekerjaan menyiapkan soal dilakukan di luar web;
web hanya menyediakan tiga hal untuk agen: mengubah status pengajuan, mengimpor
JSON untuk sebuah pengajuan, dan mengimpor soal tambahan dari admin.

## Cara masuk (tanpa token API terpisah)

Gabungan dua pilihan di PRD:

1. **Akun khusus berperan `agent`.** Dibuat admin di `/_/` (lihat DEPLOY.md).
   Hermes masuk seperti pengguna biasa:

   ```http
   POST /api/collections/users/auth-with-password
   { "identity": "hermes", "password": "..." }
   ```

   Respons berisi `token`; kirim sebagai header `Authorization: <token>`.
   Token berlaku sesuai pengaturan PocketBase (bawaan 7 hari); minta ulang bila
   mendapat 401. Akun agen hanya bisa memakai endpoint `/api/medcoel/agent/*`
   (ditambah endpoint biasa milik akunnya sendiri), tidak bisa membuka dashboard
   admin.
2. **Daftar IP.** Isi `MEDCOEL_AGENT_IPS=<ip server AI>` di medcoel.env.
   Permintaan akun agen dari alamat lain ditolak 403.

Password agen disimpan di file lingkungan server AI, bukan di repositori.

## Data satu pengajuan

`GET /api/medcoel/agent/submissions?status=antre` (bisa juga `diproses`,
`perlu_perbaikan`; tambahkan `since=2026-10-21T00:00:00Z` untuk yang berubah sejak waktu itu)

```json
{
  "items": [
    {
      "id": "abc123",
      "code": "MC261021-TXZX",
      "status": "antre",
      "submittedAt": "2026-10-21 04:10:00.000Z",
      "confirmedAt": "2026-10-21 05:00:00.000Z",
      "user": { "id": "u1", "name": "Sari Uji Coba", "loginId": "sari.uji" },
      "campus": { "id": "c1", "name": "FK Universitas Andalas" },
      "subject": { "id": "s1", "name": "Parasitologi" },
      "hasKeyAndExplanation": true,
      "language": "id",
      "restriction": "campus",
      "pdfCount": 2,
      "files": [{ "id": "f1", "name": "UTB 2025.pdf", "size": 812345, "driveFileId": "1AbC...", "link": "https://drive.google.com/file/d/1AbC.../view" }]
    }
  ],
  "queue": { "totalQueuedPdf": 12, "dailyCapacity": 40, "estimateDays": 1 }
}
```

`GET /api/medcoel/agent/submissions/{id atau kode}` mengembalikan satu objek yang sama.

## Mengubah status

`POST /api/medcoel/agent/submissions/{id atau kode}/status`

```json
{ "status": "diproses", "note": "opsional" }
```

Status yang boleh: `antre`, `diproses`, `perlu_perbaikan` (wajib `note`,
ditampilkan ke pengguna). Status `selesai` hanya lewat impor. Setiap perubahan
memberi notifikasi ke pengaju.

## Mengimpor soal untuk pengajuan

`POST /api/medcoel/agent/submissions/{id atau kode}/import`

```json
{
  "chapter": "Helminthologi",
  "questions": [ ...format di FORMAT_SOAL.md... ],
  "skipInvalid": false,
  "dryRun": false
}
```

- `questions` boleh array, `{ questions: [...] }`, `{ chapters: [...] }`, atau
  string berisi array JavaScript (dipakai apa adanya dari konverter). Pakai
  `text` sebagai ganti `questions` bila mengirim string.
- `chapter`: id BAB (semua soal masuk ke BAB itu) atau judul BAB (dipakai untuk
  soal yang tidak menulis BAB sendiri; BAB baru dibuat otomatis).
- Kampus **selalu** diambil dari pengajuan. Kampus yang tertulis di JSON diabaikan.
- `dryRun: true` hanya memeriksa, tidak menyimpan.
- Bila ada soal bermasalah dan `skipInvalid` false: respons 400 dengan
  `blocked: true` dan daftar `items[].errors` per nomor soal; tidak ada yang tersimpan.
- Berhasil: soal tayang, status pengajuan menjadi `selesai`, pengaju mendapat
  notifikasi dengan tautan ke mata kuliahnya.

Respons:

```json
{ "created": 25, "chaptersCreated": 1, "valid": 25, "invalid": 0, "duplicates": 0, "items": [...peringatan saja...] }
```

## Soal tambahan dari admin (tanpa pengajuan)

`POST /api/medcoel/agent/import`

```json
{
  "subject": "anatomi",
  "chapter": "Osteologi",
  "scope": "campus",
  "campuses": ["FK Universitas Andalas"],
  "questions": [ ... ]
}
```

`subject` boleh id, slug, atau nama. `scope` `all` (bawaan) atau `campus`;
`campuses` boleh id atau nama persis.

## Pemberitahuan ke Hermes (opsional)

Bila `HERMES_WEBHOOK_URL` diisi, web mengirim `POST` ke alamat itu setiap ada
pengajuan masuk antrean:

```json
{ "event": "submission.queued", "sentAt": "...", "data": { ...data satu pengajuan... } }
```

Bila `HERMES_WEBHOOK_SECRET` diisi, header `X-Medcoel-Signature` berisi
HMAC-SHA256 (hex) dari body dengan secret itu. Tanpa webhook, Hermes cukup
memanggil `GET /agent/submissions?status=antre` secara berkala.

## Kode galat

| Status | Arti |
|---|---|
| 400 | Isian salah atau impor diblokir; baca `message` dan `items[].errors` |
| 401 | Token tidak ada atau kedaluwarsa; masuk ulang |
| 403 | Bukan akun agen, atau IP tidak diizinkan |
| 404 | Pengajuan tidak ditemukan |
| 429 | Terlalu banyak permintaan (batas 120/menit) |
