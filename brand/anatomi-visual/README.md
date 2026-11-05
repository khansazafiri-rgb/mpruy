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

## Riwayat revisi
- v1: sistem gaya awal, jantung dan gigi dasar.
- v2: latar ungu-magenta, kilau, gradien tabung, gigi dengan dua akar, koroner dan lemak diatur ulang.
- v3 (saat ini): jantung dengan siluet membulat, lemak kuning di alur (dibuat terlihat di bawah koroner), koroner kiri (LM -> LAD + sirkumfleks) dan kanan (RCA) sesuai sumber di bawah, cabang acak dihapus; gigi molar bawah dua akar dengan dua saluran di akar mesial dan satu di distal, tulang berlubang tidak seragam, gusi dengan tepi bebas.

## Sumber anatomi yang diperiksa
Hanya ringkasan hasil pencarian web (bukan halaman lengkap yang saya buka):
- Jalur arteri koroner: asal LM dari sinus aorta kiri, bercabang ke LAD dan sirkumfleks; RCA dari sinus aorta kanan. Ringkasan dari Frontiers in Cardiovascular Medicine (https://www.frontiersin.org/articles/10.3389/fcvm.2021.649855/full), Radiology Assistant (https://radiologyassistant.nl/cardiovascular/anatomy/coronary-anatomy-and-anomalies), dan StatPearls (https://ncbi.nlm.nih.gov/books/NBK482375).
- Gigi molar bawah: dua akar (mesial dan distal), umumnya tiga saluran utama. Ringkasan dari beberapa tinjauan endodontik (mis. https://pmc.ncbi.nlm.nih.gov/articles/PMC3731107).
- Wikipedia dan OpenStax tidak bisa diakses dari lingkungan ini (jaringan memblokir en.wikipedia.org; OpenStax tidak muncul di hasil pencarian).

## Status visual (dibandingkan dengan acuan)
Acuan yang kamu lampirkan (jantung merah mengilap dengan lemak kuning dan pembuluh bercabang; gigi dengan enamel putih, dentin bergaris, pulpa merah dengan pembuluh, tulang berongga) sudah saya lihat. Hasil saat ini:
- Mendekati: latar ungu-magenta dengan cahaya, warna merah dan biru, lemak kuning di alur, lubang trabekula di tulang.
- **Masih jauh dari acuan:** pembuluh besar masih tampak seperti tabung terpisah, lemak di alur masih berupa garis, bukan lobulus. Lengkung aorta dan cabangnya belum sehalus acuan. Permukaan jantung kurang berkilau. Gusi dan tulang gigi masih lebih datar daripada acuan. Kilau pada pembuluh masih kaku.
- Belum ada perbandingan piksel-demi-piksel dengan acuan, karena pengukuran itu butuh gambar acuan dalam berkas.

## Verifikasi anatomi
**Sebagian.** Jalur koroner dan jumlah akar/saluran dicek terhadap ringkasan sumber di atas, belum terhadap atlas lengkap. Hubungan antarstruktur di jantung (aorta, batang pulmonalis, vena kava) dan detail kamar pulpa belum diverifikasi. Jangan dipakai sebagai referensi anatomi sebelum diperiksa dengan atlas atau buku teks.

## Keterbatasan
- Ini penyederhanaan, bukan gambar berskala.
- Lengkung aorta dan percabangannya belum diperiksa terhadap atlas.
- Gigi yang digambar adalah molar bawah; belum ada varian lain.
