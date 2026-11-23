# Laporan pemeriksaan (QA)

## Batas yang jujur
Lingkungan pembuat tidak bisa memutar video bersuara pada kecepatan normal. **Saya tidak menonton video ini dengan suara dari awal sampai akhir.** Dilakukan: kontak sheet dari MP4 akhir (tiap 0,75 dtk, 4 dtk pertama lebih rapat), bingkai kunci beresolusi penuh dan 270-360 px untuk keterbacaan ponsel, ASR audio akhir, kenyaringan, deteksi hitam/beku, dan perbandingan master di file gabungan. Kelancaran gerak, ritme, keseimbangan musik-narasi, dan sinkron kata-visual harus dinilai orang. Pratinjau pada ponsel nyata tidak dilakukan.

## Hasil terukur
| Pemeriksaan | Hasil |
|---|---|
| Format | H.264 1080 x 1920, 30 fps, 2286 bingkai (76,200 dtk); AAC 48 kHz stereo |
| Kenyaringan | -14,2 LUFS, LRA 3,1 LU, puncak sejati -1,0 dBFS (edukasi dinormalkan ke -14 LUFS; master tidak dinormalkan ulang) |
| Master outro utuh | Audio 60,0 - 76,2 dtk vs master: gain 0,995, korelasi 0,9994, rasio sisa 28,8 dB; tidak ada teks/CTA tambahan di atasnya |
| Hitam / beku | Tidak ada bingkai hitam. Satu-satunya bagian beku >= 1 dtk: 71,5 - 76,2 dtk (logo/URL master, ditahan sengaja) |
| ASR audio akhir | Seluruh kalimat naskah terbaca berurutan. Selisih ASR: "anafilaksis" -> "anafilaxis", "pembuluh" -> "pembunuh" (!), "paha" -> "paham", "reseptor" -> "receptor", "alfa" -> "alpha" (kesalahan ASR; audio sumber tidak diubah; takarir memakai naskah). **Perlu didengar manusia** untuk memastikan "pembuluh" dan "paha" terdengar benar. |
| Frame pertama | Tokoh sedang makan (garpu bergerak) dan teks "REAKSI ALERGI BERAT?" terbaca sejak bingkai 0 |

## Pemeriksaan visual
- **Urutan gejala (0 - 7,5 dtk):** bentol (3,0) -> suara melemah (3,9 - 5,5) -> tangan ke leher dan napas cepat (5,0 - 5,9) -> kepala terkulai (6,3+). Tidak serentak.
- **Peta warna** konsisten di semua adegan (lihat `SUMBER.md`); legenda histamin (bulat) vs mediator lain (belah ketupat) ada di adegan sel imun.
- **Pembuluh/saluran napas:** pelebaran, celah dinding, cairan keluar, batang tekanan turun; dinding saluran napas menebal, otot menyempit, rongga mengecil, batang aliran turun (potongan di 19,0 / 23,0 / 25,5 dtk).
- **Pena di paha:** pena di sisi luar paha kanan layar, tangan, lengan, pena, dan paha pada skala yang sama (9 px = 1 cm); makro dipotong terpisah setelah relasi dengan paha jelas (32,9 dtk) dengan peta mini; tidak ada tangan yang diperbesar menempel pada badan kecil.
- **Panel alfa/beta:** satu panel menyala per efek (38,9 / 42,5 / 45,5 dtk), lalu ketiganya bersama (47,6 dtk); keadaan awal sama dengan akibat di adegan 16 - 26 dtk.
- **Pemulihan:** gejala berkurang bertahap pada 53,4 - 60 dtk (bentol 0,9 -> 0,35, napas 1,4 -> 0,75 Hz), tidak seperti sakelar.

## Putaran perbaikan terarah (maks. dua)
**Putaran 1** (dari pemeriksaan draf pertama):
1. Badan tokoh tidak tergambar (skala-x salah) -> diperbaiki; kaki terlalu ramping dan ada celah di panggul -> celana digambar ulang.
2. Pelebaran pembuluh sulit terbaca dan chip judul panel meluap -> rentang pelebaran diperbesar, ruang tetesan cairan, lebar chip diperbaiki.
3. Pill judul menimpa kepala tokoh di adegan paha -> pill dinaikkan, kamera diturunkan.
**Putaran 2:**
4. Teks kecil (28 px) di panel -> 32 px; label batang 27 px.
5. Adegan perbandingan (49 - 51 dtk) terdeteksi beku -> garis tepi berjalan, ikon pena berdenyut, napas tokoh lebih jelas.
6. Atas masukan pemesan (Raka kurang tampil): Raka asli ditambahkan sebagai pengamat di pita bawah layar pada semua adegan edukasi.

## Perlu dinilai manusia / catatan
- Putar penuh dengan suara pada ponsel: sinkron kata dengan visual (jeda setelah "pembuluh darah", "saluran napas", alfa/beta 2/beta 1), keseimbangan musik-narasi, dan sambungan keras ke master outro.
- Raka berada di pita bawah (area yang bisa tertutup tombol platform); hanya dekorasi, bukan informasi.
- Tokoh pasien dan petugas medis berproporsi stilistik (lengan relatif tipis, tangan bulat); bila perlu diperhalus.
- Sorotan: AAAAI menyebut dalam keadaan tertentu tidak selalu perlu ke IGD setelah epinefrin; video mengikuti naskah ("segera cari bantuan medis"), lihat `SUMBER.md`.
- Tidak ada dosis, pilihan produk, atau langkah aktivasi produk tertentu di video.
