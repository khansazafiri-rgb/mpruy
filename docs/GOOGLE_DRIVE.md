# Menyambungkan Google Drive admin

PDF soal dan foto bukti komunitas disimpan di Google Drive admin, bukan di
server web (PRD: Penyimpanan file). Database hanya menyimpan id file Drive.

## Cara kerjanya

1. Browser meminta izin unggah ke `/api/medcoel/upload/init`.
2. Server membuka sesi unggah (resumable upload) di Drive atas nama akun admin,
   dengan nama file dan folder yang ditentukan server, lalu memberikan alamat
   sesinya ke browser.
3. Browser mengirim isi file langsung ke Drive. File tidak lewat server web.
4. Browser melapor selesai. Server memeriksa file di Drive: kunci unggah cocok,
   ukuran dalam batas, dan byte awal file memang PDF/JPG/PNG/WebP. Yang tidak
   lolos langsung dihapus dari Drive.

Folder yang dibuat otomatis di bawah folder induk:

```
MEDCOEL/
  pengajuan/<Mata kuliah>/<Kode pengajuan>/...pdf
  bukti-komunitas/whatsapp/<YYYY-MM>/...jpg
  bukti-komunitas/instagram/<YYYY-MM>/...jpg
  arsip/pengajuan/<Kode>/...       (pengajuan kedaluwarsa/dibatalkan bila kebijakan "arsip")
```

## Kenapa OAuth akun admin, bukan akun layanan

Akun layanan (service account) biasa tidak punya kuota penyimpanan sendiri,
jadi unggahan ke My Drive gagal. Pakai OAuth akun admin (atau Shared Drive bila
memakai Google Workspace).

## Langkah (sekali saja, sekitar 15 menit)

Pengalaman dari web lama: buat OAuth client sendiri, jangan pakai client
bersama.

1. Buka https://console.cloud.google.com, buat project (misalnya `medcoel-drive`).
2. APIs & Services > Library > aktifkan **Google Drive API**.
3. OAuth consent screen: External, isi nama aplikasi, tambahkan email admin
   sebagai test user. Lalu **Publish app** ke mode Production supaya refresh
   token tidak kedaluwarsa tiap 7 hari.
4. Credentials > Create credentials > OAuth client ID > **Web application**.
   Authorized redirect URI: `https://developers.google.com/oauthplayground`.
   Catat Client ID dan Client secret saat popup muncul (secret hanya tampil sekali).
5. Buka https://developers.google.com/oauthplayground, klik ikon gerigi,
   centang "Use your own OAuth credentials", isi Client ID dan secret.
6. Di Step 1 pilih scope `https://www.googleapis.com/auth/drive`, Authorize,
   masuk dengan akun Google admin. Di Step 2 klik "Exchange authorization code
   for tokens" dan salin **Refresh token**.
7. Di Google Drive admin buat folder `MEDCOEL`. Buka foldernya, salin id dari
   alamat `https://drive.google.com/drive/folders/<ID_INI>`.
8. Isi `/opt/medcoel/medcoel.env`:

   ```
   GDRIVE_CLIENT_ID=...
   GDRIVE_CLIENT_SECRET=...
   GDRIVE_REFRESH_TOKEN=...
   GDRIVE_ROOT_FOLDER_ID=...
   ```

9. `sudo systemctl restart medcoel`. Dashboard Admin > Ringkasan tidak lagi
   menampilkan peringatan Drive.

## Uji

Daftar akun uji dari HP sampai langkah 4, unggah foto bukti, lalu cek file
muncul di `MEDCOEL/bukti-komunitas/whatsapp/`. Bila unggahan gagal dengan pesan
koneksi, periksa bahwa `appURL` di `/_/` > Settings sama dengan alamat web
(Google mengizinkan unggahan dari browser berdasarkan Origin yang dikirim
server saat membuka sesi).

## Bila kuota Drive hampir penuh

PRD mencatat dua pilihan: tambah kuota Google One, atau pindah ke penyimpanan
objek ber-tier gratis (misalnya Cloudflare R2, 10 GB gratis). Kode penyimpanan
terpusat di `apps/pocketbase/pb_hooks/lib/storage.js` dan `drive.js`, jadi
penggantinya cukup di dua file itu.
