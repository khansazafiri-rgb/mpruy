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

- v4 (jantung saja, saat ini): pembuluh dibuat sebagai pita meruncing (`ribbon` di `style.mjs`) dengan tiga lapis volume dan ujung membulat; aorta, arteri paru, vena kava disatukan dengan pangkal di badan; jantung diperbesar di frame; lemak sebagai pita dengan lobulus; koroner tetap hanya jalur utama. Evaluasi: pembuluh sudah lebih berdimensi, tetapi siluet badan masih terlalu kaku dan lobus atrium kanan belum seperti acuan. Keterbatasan utama ada di pendekatan path tulis tangan: sulit mencapai bentuk organik seperti acuan.

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

## Jantung hibrida SDF + rantai kapsul (v5, konsep visual, bukan atlas)
Kode di `sdf/`: `paths.mjs` (jalur koroner, lemak, dan titik kontrol pembuluh), `heart-sdf.mjs` (pembangun shader GLSL), `render-sdf.mjs` (perender), `post-views.py` (garis tinta dari peta kedalaman), `bandingkan.py` (lembar perbandingan).

Teknik per bagian (tidak satu teknik untuk semuanya):
- **Badan** (ventrikel, basis, atrium kanan): gabungan halus (smooth-min) elipsoid; ventrikel kiri meruncing ke apeks.
- **Aurikula**: dua elipsoid bergabung halus untuk tiap sisi, menonjol di depan akar pembuluh dan menyatu dengan badan; warnanya sedikit lebih gelap. Koroner disembunyikan di bawahnya.
- **Pembuluh besar**: rantai kapsul 3D meruncing yang disatukan ke badan. Aorta asenden, lengkung, dan aorta desenden satu rantai; tiga cabang (brakiosefalika, karotis komunis kiri, subklavia kiri) keluar dari puncak lengkung. Batang pulmonalis keluar dari jalur keluar ventrikel kanan di depan aorta, bercabang ke LPA (kanan gambar, terpotong) dan RPA (ke belakang aorta, di atas atrium kanan, terpotong). SVC dan IVC dengan ujung terpotong.
- **Ujung terpotong dengan lumen**: bidang potong miring ke arah penonton, lumen dilubangi, dinding terpotong diwarnai krem dan lumen gelap.
- **Koroner (LM, LAD, sirkumfleks, RCA), vena kardiak besar, lemak di alur**: decal bidang tinggi yang mengubah normal permukaan. Hanya jalur utama, tanpa cabang dekoratif.

Render ulang (butuh Chromium + Playwright; WebGL2 lewat SwiftShader):
```
node brand/anatomi-visual/sdf/render-sdf.mjs keluaran.png --zoom=1.1 [--scale=0.5] [--mode=0|1|2] [--view=0|1|2|3] [--beat=0..1] [--flow=0..1]
```
`--view` 0 akhir, 1 siluet polos, 2 warna datar tanpa cahaya/latar/partikel, 3 peta kedalaman. `python3 sdf/post-views.py kedalaman.png warna.png siluet.png keluaran.png` menambah garis tinta pada versi warna. `--mode` 0 penuh, 1 badan+decal (transparan), 2 pembuluh besar saja. Satu frame 1080x1920 sekitar 8 detik di CPU.

Animasi: `--beat` mengembang-mengempiskan badan dan aurikula; `--flow` menggerakkan denyut cahaya di koroner; layer badan dan pembuluh besar bisa dirender terpisah untuk digerakkan sendiri-sendiri (lembar contoh `out/sdf-animasi-layer.png`). Pembuluh besar belum berdenyut.

Hasil: `out/heart-sdf.png` (akhir), `out/heart-sdf-warna.png`, `out/heart-sdf-siluet.png`, `out/perbandingan-bentuk-v4-sdf.png` (tiga pemeriksaan v4 vs SDF). Lembar yang memuat gambar acuan (`out/perbandingan-bentuk-acuan-v4-sdf.png`) hanya lokal dan tidak di-commit.

### Dibanding v4 dan acuan
- Lebih baik dari v4: lengkung aorta dengan tiga cabang dan aorta desenden (v4 hanya satu pipa melengkung), batang pulmonalis di depan aorta dengan LPA dan RPA, SVC/IVC dan ujung potong berlumen, aurikula menyatu dengan badan, jalur koroner mengikuti alur dan menghilang di bawah aurikula.
- Masih lebih lemah dari acuan: batang pulmonalis terlalu tipis dan akarnya masih tampak seperti pipa menempel; aurikula kiri seperti telur; siluet badan lebih sempit daripada acuan dan ujung apeks agak runcing; tidak ada cabang koroner kecil (sengaja), serat otot, katup, dan vena pulmonalis; pembuluh relatif terlalu besar terhadap badan.
- Bagian v4 yang tetap lebih jelas: bentuk apeks dan sudut kiri-kanan v4 (siluet "hati" yang rapi) dan lobus bulat atrium yang terbaca langsung. Pada v5 siluet badan lebih organik tetapi lebih berombak, jadi kalau dipakai di video kecil, bentuk v4 masih lebih bersih. Struktur pembuluh besar sebaiknya diambil dari v5.

### Sumber yang benar-benar dibuka (v5)
Hanya abstrak lewat PubMed (halaman penuh Radiology Assistant, StatPearls/NCBI, OpenStax, dan Wikipedia tidak bisa diakses: host tidak ada dalam jaringan yang diizinkan sesi ini):
- Lengkung aorta normal bercabang tiga: brakiosefalika, karotis komunis kiri, subklavia kiri; pola klasik 63,5%-89,4% (Babu & Sharma 2015, https://doi.org/10.7860/JCDR/2015/14219.6253; Tawfik dkk. 2018, https://doi.org/10.1016/j.acra.2018.08.023).
- Aurikula kiri: umumnya seperti jari melengkung (73,2%), dua atau tiga lobus; arteri sirkumfleks adalah struktur terdekat dengan ostium aurikula kiri (Üçerler dkk. 2013, https://doi.org/10.5152/akd.2013.181; Kapoor dkk. 2024, https://doi.org/10.1007/s12565-024-00805-2; Anselmino dkk. 2017, https://doi.org/10.2459/JCM.0000000000000484). Dipakai agar sirkumfleks lewat di bawah aurikula kiri.
- RCA berdekatan dengan sinus pulmonal kanan/jalur keluar ventrikel kanan (82%); LM dan LAD berdekatan dengan sinus pulmonal kiri; LM tidak berhubungan dengan sinus anterior (Dong dkk. 2018, https://doi.org/10.1111/jce.13685). Dipakai agar koroner muncul dari bawah batang pulmonalis.
- Panjang batang pulmonalis dan jarak percabangannya (Latrémouille dkk. 2000, https://doi.org/10.1007/s00276-000-0129-9).

### Yang belum terverifikasi
Letak alur AV dan interventrikular, jalur RCA hingga tepi inferior, vena kardiak besar, sebaran lemak epikardium, dan proporsi/ukuran relatif semua struktur hanya berasal dari ringkasan pencarian sebelumnya dan gambar yang digambar tangan, bukan dari halaman yang dibuka. Pelengkap seperti vena pulmonalis tidak digambar. Anggap seluruhnya konsep visual sampai dicocokkan dengan atlas.

## v6: jantung vektor buatan tangan (menggantikan arah SDF v5)
v5 (SDF + rantai kapsul) ditolak sebagai arah akhir karena bentuk badan dan pangkal pembuluh jauh dari acuan. v6 dibangun ulang tanpa SDF dan tanpa rantai kapsul; kode v5 tetap ada di `sdf/` hanya sebagai pembanding.

Kode di `v6/`: `heart6.mjs` (bentuk dan gaya), `geom.mjs` (kurva dan tabung), `render6.mjs` (render PNG/SVG), `evaluasi.py` (siluet/warna datar/akhir, overlay, selisih, ukuran HP).
```
node brand/anatomi-visual/v6/render6.mjs final|flat|sil keluaran.png [--scale=2]
python3 brand/anatomi-visual/v6/evaluasi.py acuan.jpg out/heart.png sil.png flat.png final.png direktori [--tanpa-acuan]
```
Cara kerja:
- Koordinat = piksel potongan kiri gambar acuan, jadi overlay tanpa pergeseran. Gambar acuan tidak ditempel: hanya dipakai mengukur posisi (puncak, titik terlebar, pangkal pembuluh, lebar batang pulmonalis, ujung cabang) lalu titik jangkar ditempatkan satu per satu.
- Badan: satu kurva Bezier (dari titik jangkar) untuk siluet lebar yang asimetris, lalu tiga massa terpisah yang menyatu di alur: atrium kanan + aurikula kanan (gelap), ventrikel kanan (terang), ventrikel kiri (lebih gelap). Apeks membulat lebar.
- Aorta: satu kontur untuk lengkung, aorta desenden, dan tiga cabang dengan lekuk bulat; ujung cabang dihitung dari sumbu supaya tepi potong sama dengan elips lumen. Batang pulmonalis: tabung yang melebar dari pangkal bundar lalu melengkung di depan aorta ke ujung LPA berlumen; RPA lewat di belakang aorta dan terlihat di lubang lengkung.
- Volume: tumpukan bentuk yang digeser/disusutkan ke arah cahaya lalu dipotong siluetnya (clip), dengan blur lokal per bentuk, bukan satu blur untuk organ; pada tabung, pita pembayang mengikuti sumbu. Kilau tajam hanya beberapa titik. Serat otot halus diinterpolasi antara alur AV, alur interventrikular, dan tepi.
- Koroner dan lemak: arteri meruncing mengikuti alur, vena kardiak besar menyertai LAD lalu sirkumfleks, lemak = gugus lobulus mengecil ke ujung. Tanpa cabang kecil.
- Tiga mode: `sil` (siluet), `flat` (warna datar + garis tinta), `final`.

Hasil: `out/v6-akhir.png`, `v6-warna-datar.png`, `v6-siluet.png` (beserta `.svg`), `v6-tiga-pemeriksaan-v4-v6.png`, `v6-ukuran-hp-v4-v6.png`, `v6-metrik.json`. Berkas yang memuat gambar acuan (`v6-tiga-pemeriksaan-acuan-v4-v6.png`, `v6-overlay-acuan-50.png`, `v6-selisih-siluet.png`, `v6-ukuran-hp-acuan-v4-v6.png`) hanya lokal dan tidak di-commit.

### Evaluasi terhadap acuan (kanvas dan posisi sama)
IoU siluet 0,945 total (badan 0,956; pembuluh 0,917). Angka ini tinggi sebagian karena kontur diukur dari acuan, jadi bukan bukti kualitas; yang dinilai adalah isi yang meleset:
- Vena pulmonalis (dua tabung merah di kanan batang pulmonalis, x 440-545, y 500-620) sengaja tidak digambar karena belum didukung sumber yang saya buka; ini selisih siluet terbesar.
- Ujung potong tabung (puncak SVC, tiga cabang, RPA kiri, IVC) di acuan kira-kira 6-10 px lebih panjang karena elips bukaannya lebih besar.
- Permukaan: acuan punya serat otot jelas, kilau basah di banyak titik, dan percabangan halus yang sengaja tidak dibuat; v6 hanya bidang gradasi lebar dan tiga kilau, sehingga permukaan masih terasa seperti ilustrasi vektor, bukan render basah.
- Lemak: di acuan lobulus lebih besar dan padat di pangkal batang pulmonalis dan sepanjang LAD; di v6 lobulus kecil, warna kuning seragam.
- Aurikula: aurikula kanan menyatu dengan massa atrium kanan sehingga tidak terbaca sebagai lipatan sendiri; aurikula kiri hanya lobus bertakik, belum berbentuk jari.
- Batang pulmonalis: lebar dan lengkung sudah sesuai, tetapi pangkalnya masih tampak seperti tabung tegak yang diberi dasar bulat.
- SVC, IVC, RPA masih tabung lurus dengan gradasi yang sama (pipa).
Bagian v4 yang tetap lebih bersih: siluet "hati" v4 lebih rapi untuk ukuran kecil; struktur pembuluh besar dan badan sebaiknya memakai v6.

### Sumber (tambahan untuk v6)
Hanya abstrak PubMed (halaman penuh tidak bisa dibuka dari sesi ini):
- Arteri koroner kiri bercabang menjadi cabang interventrikular anterior dan sirkumfleks yang masing-masing berjalan di alurnya; segitiga arteriovena antara konus arteriosus dan aurikula kiri dengan dasar vena kardiak besar; vena kardiak besar umumnya di dalam (dalam) LAD (59%) dan di atas sirkumfleks (72%) ([Bansal dkk. 2023](https://doi.org/10.5115/acb.22.240); [Aarthi & Ramachandran 2026](https://doi.org/10.7759/cureus.112440)). Dipakai untuk vena yang menyertai LAD lalu sirkumfleks.
- Vena kardiak besar bertemu vena interventrikular anterior di ujung distalnya ([Mi dkk. 2023](https://doi.org/10.1111/jce.16064)).
- Sumber lain tetap sama seperti bagian v5 di atas (lengkung aorta tiga cabang, aurikula kiri, hubungan koroner dengan sinus pulmonal).

Belum terverifikasi: jalur persis RCA hingga tepi inferior, letak dan lebar alur, sebaran/ukuran lemak, bentuk aurikula kanan, proporsi semua struktur, dan arah tampak (diambil dari gambar acuan yang dibuat AI). Anggap konsep visual sampai dicocokkan dengan atlas.

## v7: revisi permukaan dan sambungan dari v6 (v6 dipertahankan)
Siluet dan posisi pembuluh besar tidak diubah. Kode: `v6/heart7.mjs`, `v6/render7.mjs`, `v6/bandingkan7.py`; hasil `out/v7-akhir.png/.svg`. Perbandingan v6 | v7 | acuan dan crop (ukuran penuh dan lebar HP) hanya lokal karena memuat gambar acuan.

Perubahan dan hasil jujur dari perbandingan crop:
- **Batas massa badan:** tiga massa kini bertepi berbulu (dipotong hanya oleh badan) dan saling menimpa di alur, jadi bidang tegak di alur interventrikular hilang; alur tetap terbaca lewat bayangan alur, arteri, dan lemak. Berkurang jelas. Tersisa kerudung gelap tembus pandang di kiri bawah dan pita terang di tepi kanan ventrikel kiri.
- **Aurikula kiri:** bentuk tepi bertakik dengan lipatan, warna diturunkan dari ventrikel, bayangan kontak di bawah tepi bawah dan bayangan batang pulmonalis. Gumpalan burgundi berkurang, tetapi hasilnya masih lobus halus tanpa struktur lipatan yang jelas; perbaikan kecil.
- **Pangkal batang pulmonalis:** bayangan kontak di badan dan gradasi gelap di dasar; sambungan lebih lembut, tetapi tepi bawah dan tepi kiri masih lurus seperti pipa terpotong dan lebar tidak berubah bertahap. Berkurang sebagian.
- **Koroner dan lemak:** arteri punya sisi terang, sisi gelap, dan bayangan jatuh; lobulus bervariasi ukuran dan lebih padat dekat pangkal. Berkurang jelas, meski pita lemak kiri kini agak terlalu tebal dan bergelombang.
- **Detail ventrikel:** serat halus yang diinterpolasi antar alur (berpudar di tepi), pantulan lebar lembut, dan beberapa kilau kecil. Serat hampir tidak terbaca; permukaan tetap jauh dari kekayaan acuan (kilau basah, serat jelas, cabang halus).

Anatomi tetap belum tervalidasi menyeluruh: sumber hanya abstrak PubMed dan ringkasan pencarian; kecocokan siluet dengan acuan bukan validasi anatomi.
