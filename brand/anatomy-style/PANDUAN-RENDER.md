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

## Klip gerak 5,0 dtk (30 fps, 150 bingkai) dan video gabungan 15 dtk
```bash
node brand/anatomy-style/frames.cjs gigi --klip          # render/frames/gigi/f0001.png ...
ffmpeg -y -framerate 30 -i render/frames/gigi/f%04d.png -c:v libx264 -pix_fmt yuv420p -crf 18 -movflags +faststart render/klip/gigi-reveal-layer.mp4
```
Hal yang sama untuk `kulit` (`kulit-penelusuran-kedalaman.mp4`) dan `jantung` (`jantung-deformasi-lokal.mp4`). Satu bingkai saja: `node brand/anatomy-style/frames.cjs gigi 1.5 3.3 --label`.
Video gabungan 15 dtk (jantung → gigi → kulit; antarorgan = transisi "selam pembuluh" 0,36 + 0,36 dtk di dalam klip; awal jantung dan akhir kulit = fade hijau 0,3 dtk):
```bash
ffmpeg -y -framerate 30 -i 'concat:...' ...   # praktis: ffmpeg -f concat -safe 0 -i daftar.txt -c:v libx264 -pix_fmt yuv420p -crf 18 -movflags +faststart render/klip/medcoel-anatomi-15dtk.mp4  (daftar.txt = tiga mp4 klip)
```

## Panel dan pemeriksaan
```bash
python3 brand/anatomy-style/panel.py                     # panel jantung-gigi-kulit, cek 360/390 px, lembar kontak frame
# pemeriksaan sambungan pembuluh-badan jantung: lihat README (bagian jantung v7); periksa-jantung.mjs lama tidak berlaku untuk v7
```

## Aturan bersama (agar organ terasa satu seri)
| Aspek | Aturan | Di kode |
|---|---|---|
| Latar | hijau hutan merek (`#0A3830`) berlapis: dasar + kolam cahaya teal kiri-atas, kisi garis merek, busur "C" dari logo, kilau bintang emas, grain; id `bg-dasar`, `bg-grid`, `bg-busur`, `bg-kilau`, `bg-grain` | `medcoel.js: latar()` |
| Cahaya | kunci dari kiri-atas (azimut 225, elevasi 50) di semua filter volume; bayangan jatuh ke kanan-bawah berwarna navy-hijau tinta (bukan hitam); pantul mint di tepi kanan-bawah; kilau tajam hanya di beberapa titik | `anatomi.js: TEMA_MEDCOEL, vol/volS/volV`, `medcoel.js: rim()` |
| Kontras dan kontur | tepi jaringan diberi kontur tinta 2,5 px (opasitas .55); warna jaringan hangat menonjol di atas latar hijau gelap | `medcoel.js: KONTUR` |
| Tipografi | Plus Jakarta Sans 800 (judul), 700 (label), 600 (subjudul); Caveat tersedia untuk catatan tangan | `medcoel.js: FONT`, `video/darah-tinggi/stage/fonts` |
| Label | chip krem + titik dan garis penuntun emas; huruf 32 px (terbaca di 360 px); klip: maksimum 3 chip sekaligus (jadwal masuk/keluar); still berlabel boleh lebih; tersusun otomatis | `medcoel.js: labels()` |
| Merek | pil krem berlogo asli (`apps/web/src/assets/logo-full.webp`), judul organ + garis emas | `medcoel.js: merek()` |
| Kamera | dorong pelan (push-in) 4,5% dengan easing `soft`, sama di semua organ | `medcoel.js: kam()` |
| Easing | `E.out` untuk masuk, `E.soft` untuk gerak kamera/pemindai, `E.inout` untuk pemindai kedalaman | `medcoel.js: E, seg()` |
| Tempo | klip 5,0 dtk, 30 fps; selam antarorgan 0,36 dtk keluar + 0,36 dtk masuk (`selam()`); label masuk/keluar 0,3 dtk dengan jadwal per label (`LABEL_T`, 1,25-1,6 dtk, selesai <= 4,6 dtk), maksimum 3 sekaligus | `medcoel.js: KLIP, labelsT()` |
| Gerak | **berbeda per organ**: gigi = reveal lapisan bertahap; kulit = pita pemindai kedalaman dengan lapisan di bawahnya diredupkan; jantung = kontraksi lokal (periode 1,25 dtk) dengan pembuluh besar tetap diam | `gigi.js: JADWAL`, `kulit.js: JADWAL`, `jantung.js: PARAM, amplop()` |

## Layer yang dapat dipakai ulang
Tiap organ mengekspor `LAYERS` (id grup + deskripsi) dan menaruh tiap jaringan di grup berid sendiri:
- **Gigi**: `g-tulang`, `g-lig-periodontal`, `g-dentin`, `g-sementum`, `g-pulpa`, `g-saraf-pembuluh`, `g-email`, `g-gusi`, `g-kontur`; **opsional (mati)**: `g-konteks-ian`.
- **Kulit**: `k-hipodermis`, `k-dermis`, `k-epidermis`, `k-pembuluh`, `k-saraf`, `k-keringat`, `k-otot`, `k-sebasea`, `k-folikel`, `k-kontur`.
- **Jantung** (aset v7 dari `claude/anatomi-visual-kalibrasi@9c7ff84`): `h-pembuluh-belakang` (vena kava, a. pulmonalis kanan, aorta + arkus), `h-massa` (badan, aurikula, lemak, koroner; berkontraksi), `h-batang-pulmonal`, `h-sorotan`, `h-kontur`.
- **Latar dan label**: `bg-*`, `mc-merek`, `mc-judul`, `mc-label`, `mc-adegan` (isi organ yang terkena kamera).
Fungsi bersama yang bisa dipakai organ baru: `latar()`, `merek()`, `labels()`, `kam()`, `E`, `seg()`, `selVoronoi()` + `halus()` (sel Voronoi bertepi bundar: rongga sumsum tulang, lobulus lemak, sel epidermis).

## Menambah organ baru
1. Salin pola `kulit.js` (ekspor `P`, `TEMA = TEMA_MEDCOEL`, `FLAT`, `LAYERS`, fungsi `<organ>({labels, t, anim})`).
2. Panggil `latar(p, { fokus })` di awal, bungkus isi organ dengan `<g id="mc-adegan" transform="${kam(t).tf}">`, tutup dengan `vignette(p)`, `merek({judul, sub})`, lalu `labels(items, { fs: 28 })`.
3. Bungkus efek-saja dengan `fx(...)` supaya versi `-polos` bekerja; pakai `class="nos"` untuk bentuk yang tidak perlu garis tepi di versi polos.
4. Pilih gerak yang menjelaskan organ itu (jangan menyalin gerak organ lain), dengan tempo dan easing dari `KLIP` dan `E`.

## Transisi dan penempatan label (revisi 10)
- `medcoel.js: selam(t, {masuk:{x,y,r}, keluar:{x,y,r}}, id)` mengembalikan `{zoom, ov, aJudul}`: bungkus adegan dengan `<g transform="${zoom}">`, taruh `ov` di atasnya (di bawah vignette/merek), dan teruskan `aJudul` ke `merek()`. Titik fokus = lumen pembuluh (kanvas setelah kamera).
- `labels()`/`labelsT()`: item `[x, y, sisi, teks, t0, t1, ty, cx]`; `cx` = 'L' | 'R' | angka (pusat chip), `ty` = tinggi chip. Letakkan chip hanya di jalur bebas di luar tepi organ.
