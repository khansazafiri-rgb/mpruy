# Visual anatomi MEDCOEL dari kode (kalibrasi)

Status: **versi kerja, belum disetujui.** Jantung dan gigi dibuat dengan SVG dari kode, lalu dirender ke PNG. Ini bukan gambar tempel.

## Isi folder
- `style.mjs`: sistem gaya. Palet dasar dan palet per organ (`ORGAN`), gradien radial untuk permukaan padat, gradien tabung untuk pembuluh, kilau (`sheen`, `specular`), ujung pipa terpotong (`cap`), cabang pohon deterministik (`branches`), latar berlapis dan partikel (`background`). Ukuran kanvas 1080 × 1920.
- `heart.mjs`: jantung tampak depan (RA, RV, LV, aorta, arteri paru, vena kava, arteri koroner, lemak di alur). Koordinat lokal, `HEART_BOX` untuk penempatan.
- `tooth.mjs`: potongan memanjang molar (mahkota, enamel, dentin, pulpa, akar, sementum, gingiva, tulang alveolar berlubang, berkas saraf-pembuluh di apeks). `TOOTH_BOX` untuk penempatan.
- `render.mjs`: membuat SVG dan PNG. Jalankan `node render.mjs [folder]`. Butuh Playwright dengan Chromium (`/opt/node-tools/node_modules/playwright`).
- `out/`: hasil render (`heart.svg`, `tooth.svg`, `heart.png`, `tooth.png`, `perbandingan-layar-hp.png`, `kalibrasi-skala-hp.png`).

## Cara memakai gaya ini untuk organ lain
1. Ambil `defs(uid)` dan `background(uid)` sekali per gambar.
2. Gambar bentuk tertutup dengan `solid(d, key, uid)` dan tabung dengan `tube(d, key, lebar, uid)`. `key` adalah entri di `ORGAN`. Organ baru cukup menambah satu entri di `ORGAN`.
3. Tambahkan kilau dengan `sheen` atau `specular`, dan ujung pipa dengan `cap`.
4. Tempatkan dengan `transform` dari `*_BOX`.

Warna tidak dipaksa sama antarorgan. Setiap organ punya `base`, `light`, `dark` sendiri.

## Yang bisa dianimasikan
- Aliran di dalam pembuluh: ubah `stroke-dashoffset` pada jalur `tube`.
- Denyut jantung: skala grup badan (`muscle`) dan vena/arteri secara serempak.
- Alur lemak dan cabang koroner: muncul bertahap lewat `stroke-dasharray`.
- Pulpa dan saluran akar: kedalaman mengikuti kamera zoom.

## Status visual (dibandingkan dengan acuan)
Acuan yang kamu lampirkan (jantung merah mengilap dengan lemak kuning dan pembuluh bercabang; gigi dengan enamel putih, dentin bergaris, pulpa merah dengan pembuluh, tulang berongga) sudah saya lihat. Hasil saat ini:
- Mendekati: latar ungu-magenta dengan cahaya, warna merah dan biru, lemak kuning di alur, lubang trabekula di tulang.
- **Masih jauh:** bentuk jantung masih kaku dan terlalu bersudut (aorta dan batang pulmonalis berbentuk pipa lurus). Kilau dan volume kurang dibanding acuan. Cabang koroner masih tipis dan jarang. Mahkota gigi masih kotak, pulpa masih berbentuk blob tanpa cabang yang jelas.
- Belum ada perbandingan piksel-demi-piksel dengan acuan, karena pengukuran itu butuh gambar acuan dalam berkas.

## Verifikasi anatomi
**Belum dilakukan.** Tidak ada sumber medis yang sudah saya buka dan cocokkan. Susunan jantung tampak depan dan potongan molar di sini adalah konsep visual. Jangan dipakai sebagai referensi anatomi sebelum diperiksa dengan atlas atau buku teks.

## Keterbatasan
- Ini penyederhanaan, bukan gambar berskala.
- Lengkung aorta dan percabangannya belum diperiksa terhadap atlas.
- Gigi yang digambar adalah molar bawah; belum ada varian lain.
