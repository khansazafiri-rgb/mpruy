# Laporan pemeriksaan (QA)

## Batas yang jujur
Lingkungan pembuat tidak bisa memutar video bersuara pada kecepatan normal. **Saya tidak menonton video ini dengan suara dari awal sampai akhir.** Dilakukan: kontak sheet dari MP4 akhir (rapat: tiap 0,25 dtk untuk 4 dtk pertama; tiap 0,7 dtk untuk seluruh bagian edukasi; bingkai kunci beresolusi penuh dan 360-432 px untuk keterbacaan ponsel), ASR audio akhir, kenyaringan, deteksi hitam/beku, dan perbandingan master outro di dalam file gabungan. Kelancaran gerak, ritme, dan sinkron suara-gambar harus dinilai orang saat diputar dengan suara. Pratinjau di ponsel nyata tidak dilakukan.

## Hasil terukur pada `test-pack-dua-garis_final.mp4`
| Pemeriksaan | Hasil |
|---|---|
| Format | H.264 1080 x 1920, 30 fps, 2136 bingkai (71,200 dtk); AAC 48 kHz stereo |
| Kenyaringan | -14,2 LUFS terintegrasi, LRA 2,7 LU, puncak sejati -1,2 dBFS (edukasi dinormalkan ke -14 LUFS sebelum digabung; master tidak dinormalkan ulang) |
| Master outro utuh | Audio 55,0 - 71,2 dtk vs master: gain 0,995, korelasi 0,9994, rasio sisa 29 dB; gambar pada 55,0 / 60,0 / 66,0 / 70,5 dtk identik dengan master (selisih rata-rata < 0,1 dari 255); tidak ada teks/CTA tambahan di atas master |
| Deteksi hitam | Tidak ada bingkai hitam |
| Deteksi beku (>=1 dtk) | 2,2 - 3,2 dtk (hook, garis sudah terbentuk; kata-kata masih diucapkan); 35,1 - 36,6, 38,2 - 39,9, 41,1 - 44,1 dtk (kartu hasil; hanya cincin sorot dan kotak putus-putus yang bergerak); 51,2 - 53,5 dtk (kartu petunjuk; hanya jarum jam dan Raka bergerak); 66,5 - 69,9 dtk dan 69,9 - akhir (logo/URL master, ditahan sengaja). Gerak yang ada pada bagian ini halus, bukan gambar yang benar-benar beku, tetapi tetap berpotensi terasa statis |
| ASR audio akhir | Semua kalimat naskah terbaca berurutan. Selisih ASR: "test pack" -> "tespek", "hCG" -> "HCG/hcg", "antibodi" -> "anti-body", "MEDCOEL" -> "MedColl" (kesalahan ASR; audio sumber tidak diubah). Kalimat berakhir sesuai jangkar waktu (mis. "area T" 20,0 dtk vs jangkar 20,66 + 0,3) |
| Frame pertama | Strip dengan cairan sudah bergerak, satu garis (C) mulai tampak; judul "DUA GARIS INI DARI MANA?" terbaca sejak bingkai 0 |

## Pemeriksaan visual (bingkai)
- Arah aliran kiri -> kanan di seluruh video (hook, penampang, mikro, strip utuh); label T dan C tidak berpindah (T di x 1330, C di x 1590 pada semua tampak atas).
- Urutan sebab-akibat mikroskopis: partikel + antibodi -> hCG datang dan menempel pada ujung antibodi (13,7 - 21 dtk) -> kompleks masuk zona T -> berputar menghadap dinding -> tertangkap antibodi penangkap teal -> menumpuk -> zona memerah -> kembali ke strip utuh, garis T muncul. Zona C: partikel kontrol (penanda kotak) tertangkap antibodi biru -> garis C.
- Tiga hasil terbaca pada lebar 360 px: C + T, hanya C, tanpa C; label berwarna; sorotan berpindah mengikuti kalimat.
- Proporsi: tidak ada tangan memegang strip; Raka hanya tampil sebagai pemandu kecil di tepi bawah (adegan alir), di sebelah kartu petunjuk (adegan akhir), dan di cover; skala Raka konsisten dengan kartu.

## Putaran perbaikan terarah (maks. dua)
**Putaran 1** (dari draf pertama):
1. Test pack di tampak atas dan penampang tidak terbaca jelas (casing terlalu tipis, label T/C kecil, penampang tidak menyatu) -> casing diperbesar, label T/C 96 px, penampang dibangun ulang (pelat atas-bawah dan ujung).
2. Mikroskopis: partikel penanda berkumpul menggumpal dan kompleks bergerak dengan kecepatan sama, jadi tampak tidak natural -> tiap kompleks diberi kecepatan sendiri sehingga tiba berurutan; partikel pengisi dibatasi agar zona T tidak penuh sebelum waktunya; huruf "T" besar berdenyut tepat setelah "area T".
3. Transisi antar adegan tiba-tiba -> pencampuran 0,4 dtk antar adegan.
**Putaran 2**:
4. Bagian kartu hasil dan valid/tidak valid terasa statis (deteksi beku 2 - 4 dtk) -> cincin sorot putus-putus berjalan dan berdenyut pada garis yang dibahas, termasuk kotak merah di C yang kosong.
5. Catatan akurasi ditambahkan pada layar: "negatif yang terlalu dini belum menyingkirkan kehamilan" dan "ilustrasi prinsip: desain dan waktu baca tiap produk bisa berbeda".

## Yang perlu dinilai manusia (belum dilakukan)
- Putar penuh dengan suara pada ponsel: ritme tiap adegan, sinkron kata "area T"/"area C"/"tidak valid" dengan visual (ruang visual 0,7 - 1,1 dtk setelah kata), kenyamanan sambungan ke master (potongan keras ke Atlas 3D).
- Bagian 51 - 55 dtk (kartu petunjuk) dan kartu hasil cukup statis; boleh diberi gerak tambahan.
- Hook: garis C tampak lebih dulu daripada T; ini hanya ilustrasi (urutan bervariasi), narasi tidak menyebut urutan.
- Pandangan mikroskopis adalah ilustrasi; jumlah dan ukuran molekul tidak mewakili skala sebenarnya.
