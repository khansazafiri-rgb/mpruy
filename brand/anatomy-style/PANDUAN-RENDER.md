# Panduan render: anatomi MEDCOEL (gigi, kulit, jantung)

Semua gambar dibuat **dari kode** (SVG + filter), dirender oleh Chromium (Playwright). Tiga organ memakai satu sistem: `medcoel.js` (latar, label, gerak) + `anatomi.js` (filter cahaya, pembuluh, tema).

## Menyiapkan
```bash
cd <akar repo>
python3 -m http.server 8128 --bind 127.0.0.1 &        # server statis; render.html memuat font dan logo dari repo
export NODE_PATH=$(npm root -g):$PWD/node_modules       # butuh paket playwright (Chromium)
```

## Still (1080 x 1920)
```bash
node brand/anatomy-style/render.cjs gigi kulit jantung   # render/<organ>.png, <organ>-label.png, <organ>-polos.png (+ gigi-siluet*.png)
```
Parameter URL `render.html?obj=<organ>`: `&labels` (chip label), `&plain` (warna datar, tanpa efek), `&konteks` (gigi: layer opsional kanal mandibula), `&tema=lama` (gaya lama ungu-magenta, hanya untuk pembanding), `&anim&t=<detik>` (bingkai animasi).

## Klip gerak 5,0 dtk + tahan 0,8 dtk (30 fps, 174 bingkai)
```bash
node brand/anatomy-style/frames.cjs gigi --klip          # render/frames/gigi/f0001.png ...
ffmpeg -y -framerate 30 -i render/frames/gigi/f%04d.png -c:v libx264 -pix_fmt yuv420p -crf 18 -movflags +faststart render/klip/gigi-reveal-layer.mp4
```
Hal yang sama untuk `kulit` (`kulit-penelusuran-kedalaman.mp4`) dan `jantung` (`jantung-deformasi-lokal.mp4`). Satu bingkai saja: `node brand/anatomy-style/frames.cjs gigi 1.5 3.3 --label`.

## Panel dan pemeriksaan
```bash
python3 brand/anatomy-style/panel.py                     # panel jantung-gigi-kulit, cek 360/390 px, lembar kontak frame
node brand/anatomy-style/periksa-jantung.mjs             # sambungan pembuluh-badan saat kontraksi maksimum (harus OK)
```

## Aturan bersama (agar organ terasa satu seri)
| Aspek | Aturan | Di kode |
|---|---|---|
| Latar | hijau hutan merek (`#0A3830`) berlapis: dasar + kolam cahaya teal kiri-atas, kisi garis merek, busur "C" dari logo, kilau bintang emas, grain; id `bg-dasar`, `bg-grid`, `bg-busur`, `bg-kilau`, `bg-grain` | `medcoel.js: latar()` |
| Cahaya | kunci dari kiri-atas (azimut 225, elevasi 50) di semua filter volume; bayangan jatuh ke kanan-bawah berwarna navy-hijau tinta (bukan hitam); pantul mint di tepi kanan-bawah; kilau tajam hanya di beberapa titik | `anatomi.js: TEMA_MEDCOEL, vol/volS/volV`, `medcoel.js: rim()` |
| Kontras dan kontur | tepi jaringan diberi kontur tinta 2,5 px (opasitas .55); warna jaringan hangat menonjol di atas latar hijau gelap | `medcoel.js: KONTUR` |
| Tipografi | Plus Jakarta Sans 800 (judul), 700 (label), 600 (subjudul); Caveat tersedia untuk catatan tangan | `medcoel.js: FONT`, `video/darah-tinggi/stage/fonts` |
| Label | chip krem + titik dan garis penuntun emas; huruf 28-30 px (terbaca di 360 px); maksimum 9-12 chip; tersusun otomatis | `medcoel.js: labels()` |
| Merek | pil krem berlogo asli (`apps/web/src/assets/logo-full.webp`), judul organ + garis emas | `medcoel.js: merek()` |
| Kamera | dorong pelan (push-in) 4,5% dengan easing `soft`, sama di semua organ | `medcoel.js: kam()` |
| Easing | `E.out` untuk masuk, `E.soft` untuk gerak kamera/pemindai, `E.inout` untuk pemindai kedalaman | `medcoel.js: E, seg()` |
| Tempo | klip 5,0 dtk, 30 fps; tahan 0,8 dtk; label masuk 0,35 dtk, dimulai ≥ 3,9 dtk | `medcoel.js: KLIP` |
| Gerak | **berbeda per organ**: gigi = reveal lapisan bertahap; kulit = pita pemindai kedalaman dengan lapisan di bawahnya diredupkan; jantung = deformasi lokal 60 dpm | `gigi.js: JADWAL`, `kulit.js: JADWAL`, `jantung.js: cV/cA` |

## Layer yang dapat dipakai ulang
Tiap organ mengekspor `LAYERS` (id grup + deskripsi) dan menaruh tiap jaringan di grup berid sendiri:
- **Gigi**: `g-tulang`, `g-lig-periodontal`, `g-dentin`, `g-sementum`, `g-pulpa`, `g-saraf-pembuluh`, `g-email`, `g-gusi`, `g-kontur`; **opsional (mati)**: `g-konteks-ian`.
- **Kulit**: `k-hipodermis`, `k-dermis`, `k-epidermis`, `k-pembuluh`, `k-saraf`, `k-keringat`, `k-otot`, `k-sebasea`, `k-folikel`, `k-kontur`.
- **Jantung**: `h-vena-besar`, `h-vena-pulmonalis`, `h-ventrikel`, `h-atrium`, `h-lemak`, `h-koroner`, `h-vena-jantung`, `h-aorta`, `h-atrium-aurikel`, `h-pulmonal`; deformasi: `h-deform` (ventrikel + koroner + lemak), `h-atrium` dan `h-atrium-aurikel` (atrium).
- **Latar dan label**: `bg-*`, `mc-merek`, `mc-judul`, `mc-label`, `mc-adegan` (isi organ yang terkena kamera).
Fungsi bersama yang bisa dipakai organ baru: `latar()`, `merek()`, `labels()`, `kam()`, `E`, `seg()`, `selVoronoi()` + `halus()` (sel Voronoi bertepi bundar: rongga sumsum tulang, lobulus lemak, sel epidermis).

## Menambah organ baru
1. Salin pola `kulit.js` (ekspor `P`, `TEMA = TEMA_MEDCOEL`, `FLAT`, `LAYERS`, fungsi `<organ>({labels, t, anim})`).
2. Panggil `latar(p, { fokus })` di awal, bungkus isi organ dengan `<g id="mc-adegan" transform="${kam(t).tf}">`, tutup dengan `vignette(p)`, `merek({judul, sub})`, lalu `labels(items, { fs: 28 })`.
3. Bungkus efek-saja dengan `fx(...)` supaya versi `-polos` bekerja; pakai `class="nos"` untuk bentuk yang tidak perlu garis tepi di versi polos.
4. Pilih gerak yang menjelaskan organ itu (jangan menyalin gerak organ lain), dengan tempo dan easing dari `KLIP` dan `E`.
