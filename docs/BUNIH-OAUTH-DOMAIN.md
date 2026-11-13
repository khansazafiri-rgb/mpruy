# BUnih Finance — domain MEDCOEL untuk Google OAuth

## Tujuan dan batas keamanan

- Halaman **publik**: `https://medcoel.com/bunih/`, `/bunih/privacy/`, `/bunih/terms/`.
- Halaman publik disajikan dari **website MEDCOEL** yang menggunakan Caddy + Vite static build.
- Aplikasi keuangan BUnih dan Gmail OAuth tetap di **server Tencent + Tailscale**, bukan di website publik MEDCOEL.
- **Jangan** mengganti A record `medcoel.com` ke server Tencent, jangan memasukkan token BUnih ke repo MEDCOEL, dan jangan meneruskan `/api/*` MEDCOEL ke BUnih.

## File yang ditambahkan

Semua ini adalah HTML statis, tanpa Javascript dan tanpa API:

- `apps/web/public/bunih/index.html`
- `apps/web/public/bunih/privacy/index.html`
- `apps/web/public/bunih/terms/index.html`
- `apps/web/public/bunih/styles.css`

Vite menyalin semua isi `public/` ke `dist/` saat `npm run build --prefix apps/web`.
Caddy MEDCOEL punya `root /opt/medcoel/app/apps/web/dist` dan `file_server`. 
Halaman ini tidak bergantung pada React, login MEDCOEL, ataupun PocketBase.

## Pemasangan aman di server MEDCOEL (bukan Tencent)

Lakukan setelah PR ditinjau dan **branch sumber yang benar** sudah tersedia.
Jangan jalankan `deploy/update.sh` untuk keperluan halaman ini—skrip itu
juga menarik dependency, membangun seluruh web, dan me-restart PocketBase.

1. Periksa dulu server tujuan dan root Caddy:

```bash
sudo grep -nE 'medcoel.com|root \*|try_files' /etc/caddy/Caddyfile
sudo test -d /opt/medcoel/app/apps/web/dist && echo "Dist MEDCOEL tersedia"
```

2. Untuk menerbitkan **hanya** halaman BUnih dari branch PR tanpa build dan tanpa restart,
dijalankan di server MEDCOEL di mana `/opt/medcoel/app` merupakan git checkout:

```bash
cd /opt/medcoel/app
git fetch origin feature/bunih-oauth-public-pages
sudo install -d -m 0755 /opt/medcoel/app/apps/web/dist/bunih/privacy
sudo install -d -m 0755 /opt/medcoel/app/apps/web/dist/bunih/terms

for path in index.html privacy/index.html terms/index.html styles.css; do
  git show "origin/feature/bunih-oauth-public-pages:apps/web/public/bunih/${path}" \
    | sudo tee "/opt/medcoel/app/apps/web/dist/bunih/${path}" >/dev/null
done
sudo find /opt/medcoel/app/apps/web/dist/bunih -type f -exec chmod 0644 {} +
```

Jika konfigurasi Caddy aktual berbeda, **jangan jalankan langkah 2** sampai root
web terkonfirmasi. Prosedur ini membuat hanya file baru di folder `dist/bunih`:
tidak menimpa route lain dan tidak me-restart Hermes/PocketBase/Caddy.

3. Verifikasi dari browser jaringan publik dan shell server:

```bash
for uri in /bunih/ /bunih/privacy/ /bunih/terms/ /bunih/styles.css; do
  curl -IL --max-time 15 "https://medcoel.com${uri}" | grep -Ei '^HTTP/|^location:|^content-type:'
done
```

Buka setiap halaman: harus tampil konten BUnih yang sesuai, **bukan SPA MEDCOEL**
atau halaman kosong. Jika /bunih/ terjatuh ke SPA fallback, cek konfigurasi
Caddy `try_files` dan routing direktori sebelum mengubah Caddy.

**Catatan**: salinan di `dist/` bisa hilang pada build MEDCOEL berikutnya jika
branch deploy belum mengandung file sumber ini. Merge ke branch deploy yang
benar dan pastikan file masuk ke alur build reguler sebelum menganggapnya permanen.

## Google Search Console + Hostinger

1. Buka https://search.google.com/search-console dengan akun pemilik proyek Google Cloud.
2. Tambah **Domain property** `medcoel.com`.
3. Copy nilai TXT unik yang **diberikan langsung oleh Search Console**.
4. Di Hostinger, buka DNS Zone untuk `medcoel.com` dan **tambahkan** TXT tersebut
   pada host `@` (atau nilai host yang ditunjukkan Hostinger). Jangan ganti
   catatan A, MX, SPF, DKIM, DMARC, atau CNAME lain.
5. Tekan **Verify** di Search Console; cek kembali bila DNS propagasi belum selesai.

## Google Auth Platform — Branding

Setelah tiga URL di atas benar-benar bisa dibuka publik, isi:
- Application home page: `https://medcoel.com/bunih/`
- Application privacy policy link: `https://medcoel.com/bunih/privacy/`
- Application terms of service link: `https://medcoel.com/bunih/terms/`
- Authorized domain: `medcoel.com`

Gunakan email dukungan yang benar-benar aktif dan pastikan isi kebijakan privasi
sesuai pengoperasian BUnih. Tinjau syarat Google Limited Use.

## Catatan khusus OAuth callback

OAuth BUnih saat ini menggunakan:
`https://vm-0-16-ubuntu.taile67764.ts.net:10000/api/gmail/callback`

Alur ini **sudah berfungsi** untuk penggunaan privat dan **tidak boleh diganti**
hanya karena halaman branding sudah tersedia.

Domain publik MEDCOEL tidak otomatis memindahkan callback. Google dapat meminta
verifikasi kepemilikan domain redirect URI, termasuk domain Tailscale yang bukan
milik pengguna. Jika dibutuhkan alamat callback di domain sendiri, desain
terpisah dulu: endpoint callback yang aman, akses pengguna, cookie/sesi OAuth,
keamanan jaringan, HTTPS, dan pembatasan route. Jangan langsung mengarahkan
subdomain ke VPS Tencent tanpa rancangan tersebut.

## Pemeriksaan terakhir

- [ ] MEDCOEL tetap online, tidak ada perubahan DNS utama
- [ ] Tiga halaman BUnih bisa diakses publik (HTTP 200)
- [ ] Kebijakan privasi menaut dari homepage dan sesuai implementasi sebenarnya
- [ ] `medcoel.com` terverifikasi di Search Console
- [ ] Branding Google tersimpan
- [ ] Dashboard BUnih hanya dapat diakses lewat Tailscale
- [ ] Gmail dan Telegram BUnih tetap sehat setelah perubahan
- [ ] Status OAuth (Testing/Production, pembatasan refresh token, scope restricted)
      ditangani terpisah sebelum bergantung pada sinkronisasi jangka panjang
