# Audit dependensi npm (21 Oktober 2026)

`npm audit` awal: **16 kerentanan (2 low, 4 moderate, 10 high)**. Tidak memakai
`npm audit fix --force`, karena itu akan memasang tailwindcss 4 dan
react-router 7 (keduanya major, dengan perubahan yang merusak). Setiap temuan
dipilah menurut ke mana kodenya pergi:

- **Runtime**: ikut terbundel ke `apps/web/dist` dan berjalan di browser pengguna.
- **Build/dev**: hanya berjalan di laptop atau saat `npm run build` di VPS. Tidak
  ada di `dist` (sudah diperiksa: tidak satu pun paket di bawah ini muncul di
  bundle, dan `npm ls --omit=dev` tidak memuatnya). Server produksi hanya
  menyajikan file statis lewat Caddy, jadi server dev Vite tidak pernah jalan di VPS.

## Yang diperbaiki (tanpa major upgrade)

| Paket | Sebelum | Sesudah | Tingkat | Jenis | Catatan |
|---|---|---|---|---|---|
| react-router-dom / react-router / @remix-run/router | 6.28.0 / 1.21.0 | 6.30.6 / 1.23.4 | high | **runtime** | Menutup open redirect `//` (CVE-2025-68470) dan advisory lain di jalur 6.x |
| dompurify | 3.2.3 | 3.4.17 | moderate | **runtime** | Penyaring HTML konten soal; 21 advisory XSS ditutup |
| vite | 6.0.7 | 6.4.4 | high | build/dev | Bypass `server.fs.deny` di server dev |
| esbuild (lewat vite) | 0.24.2 | 0.25.12 | moderate | build/dev | Server dev bisa dibaca situs lain |
| postcss | 8.4.49 | 8.5.31 | high | build/dev | XSS di keluaran stringify, baca file lewat sourceMappingURL |
| eslint / @eslint/plugin-kit | 9.17.0 | 9.39.5 | low | dev | ReDoS |
| @vitejs/plugin-react, autoprefixer, tailwindcss, eslint plugins | | versi terbaru di major yang sama | | build/dev | Ikut dinaikkan supaya serasi |

Hasil `npm audit` setelahnya: **9 (4 moderate, 5 high)**. Khusus dependensi yang
ikut ke browser (`npm audit --omit=dev`): **2 moderate**, keduanya react-router
(lihat di bawah). Tidak ada lagi temuan high di runtime.

## Yang tersisa dan alasannya

### Rantai Tailwind CSS 3 (5 high, 2 moderate), build/dev saja

`tailwindcss@3.4.19` (terbaru di v3) → `chokidar@3`, `fast-glob`,
`micromatch` → `braces` (GHSA-vfj7-8cjw-p6xm, stack exhaustion pada pola glob
bersarang); `postcss-nested` → `postcss-selector-parser` (GHSA-rj75-hqrm-r3gf,
kompleksitas kuadratik).

- `braces` belum punya versi yang diperbaiki (semua versi terdampak), jadi
  satu-satunya jalan adalah Tailwind 4, yang mengganti konfigurasi
  `tailwind.config.js` menjadi konfigurasi di CSS. Itu migrasi besar.
- Kerentanannya butuh **pola glob atau CSS yang dikendalikan penyerang**. Di
  sini polanya tetap (`./index.html`, `./src/**/*.{js,jsx}` di
  `tailwind.config.js`) dan CSS-nya milik repo sendiri. Tidak ada masukan
  pengguna yang sampai ke Tailwind.
- Tidak ikut ke browser dan tidak berjalan di server produksi.

Kesimpulan: aman diterima untuk sekarang. Rekomendasi: migrasi ke Tailwind 4
sebagai pekerjaan terpisah, dengan pengecekan tampilan di semua halaman.

### React Router 6.x (2 moderate), runtime, celah ditutup di kode

- **GHSA-wrjc-x8rr-h8h6**: open redirect lewat garis miring terbalik (`/\evil.com`)
  di `<Link>`/`useNavigate`. Perbaikannya hanya ada di react-router 7.18.
  Celah ini **memang bisa dipicu** di kode lama: halaman Masuk meneruskan
  `?lanjut=` ke `navigate()` hanya dengan cek `startsWith('/')`. Sekarang
  semua jalur dinamis (`?lanjut=` dan tautan notifikasi) lewat
  `src/lib/safePath.js`, yang hanya menerima jalur internal biasa dan menolak
  `//`, `/\`, karakter kontrol, spasi, serta bentuk ter-encode
  (`/%5C`, `/%2F%2F`). Ada tesnya di `src/lib/safePath.test.mjs`.
  Aturan untuk kode baru: jangan memberi `navigate()`/`<Link to>` nilai dari URL
  atau data pengguna tanpa `safeInternalPath()`.
- **GHSA-337j-9hxr-rhxg**: injeksi constructor lewat `deserializeErrors()` saat
  hidrasi SSR. MEDCOEL tidak memakai SSR maupun data router
  (`createBrowserRouter`); hanya `<BrowserRouter>` biasa. Tidak terdampak.

Rekomendasi: naik ke react-router 7 saat ada waktu untuk menguji ulang semua
halaman (API yang dipakai, seperti `BrowserRouter`, `Routes`, `Link`,
`useNavigate`, dan `useSearchParams`, tetap ada di v7).

## Cara mengulang audit

```bash
npm audit                       # ringkasan
npm audit --omit=dev            # hanya dependensi yang ikut ke browser
npm ls --omit=dev --all -w apps/web
```
