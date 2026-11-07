# Atlas MEDCOEL: paket animasi anatomi (jantung, gigi, kulit)

Satu paket klip 9:16 (1080x1920, 30 fps, tiap organ 5,4 dtk = 5,0 dtk gerak + 0,4 dtk tahan) dari kode (SVG + Chromium + ffmpeg), ditambah satu video gabungan 15 dtk. Anatomi tetap berstatus **konsep visual, belum divalidasi menyeluruh**.

## Asal tiap organ
| Organ | Sumber bentuk dan tekstur | Yang dilakukan sistem ini |
|---|---|---|
| Jantung | Cabang ini (`../v6/heart7.mjs`, ditetapkan sebagai patokan visual jantung MEDCOEL) | Siluet, volume, dan tampilan dipertahankan; gerak lokal dan latar baru (lihat di bawah) |
| Gigi | `claude/eloquent-darwin-ewtwtu`, commit `b3af953`, `brand/anatomy-style/gigi.js` | Disalin ke `darwin/gigi.mjs` (hanya berkas yang dibutuhkan, tanpa riwayat), diberi mode `bare` + memo, dipasang di kerangka bersama. Isi gambar tidak diubah |
| Kulit | Cabang yang sama, `kulit.js` | Sama: `darwin/kulit.mjs` |
`darwin/anatomi.mjs` dan `darwin/medcoel.mjs` adalah dua berkas pendukung dari cabang itu (filter pencahayaan, helper kurva, sel Voronoi). Satu perubahan isi: `KONTUR.opasitas` diturunkan 0,55 -> 0,4 agar kontur tinta gigi/kulit tidak lebih tegas daripada jantung (jantung tidak punya garis tinta). Versi gigi dan kulit buatanku yang lebih sederhana dipindah ke `lama/` hanya sebagai pembanding; tidak dipakai di hasil akhir.

## Aturan visual bersama (`tokens.mjs`, `latar.mjs`, `kerangka.mjs`)
| Aspek | Aturan |
|---|---|
| Cahaya | Satu arah: kiri atas (jantung: vektor `[-0.55,-0.83]`; gigi/kulit: `feDistantLight` azimut 225). Bayangan jatuh ke kanan-bawah |
| Latar | Gradien tinta/hijau gelap per organ (jantung tinta-teal, gigi tinta-biru, kulit hijau gelap), tiga siku "C" bersarang dari logo (paralaks 0,35), penggaris atlas, bintang emas, cahaya terarah dari kiri atas, vinyet. Struktur lapisan sama di semua organ |
| Header, kaki | Logo + "ATLAS ANATOMI" + judul 62 px + subjudul 34 px; kaki halaman dengan catatan "belum diverifikasi atlas" |
| Label | Pil gading, huruf 32 px (sekitar 10,7 px di lebar 360), penunjuk emas, satu kolom di kanan (x=776), maksimal dua baris. **Per fase**: pada satu waktu hanya 2-3 label yang berhubungan dengan struktur yang disorot; label lama keluar (0,3 dtk) sebelum fase berikut masuk (`labelFase` di `kerangka.mjs`); pil disusun dekat y jangkar sehingga garis penunjuk hampir mendatar, jangkar dipilih di sisi kanan struktur supaya garis tidak melintasi struktur utama; semua label sudah keluar sebelum transisi antarorgan (detik lokal 4,8) |
| Kamera | Satu dolly masuk 4,5% + geser kecil ke atas, easing `inOut`, sama di semua organ (`KAMERA` di `tokens.mjs`) |
| Easing dan tempo | `inOut` kamera/gerak, `out` penyingkapan/label; label masuk 0,5 dtk dengan jeda 0,28 dtk; tahan 0,4 dtk di akhir |
| Kontur | Jantung tanpa garis tinta (tepi dibentuk bayangan); gigi/kulit memakai kontur tinta tipis opasitas 0,4 |
| Gerak per organ | Mengikuti struktur: jantung berkontraksi lokal, gigi membuka lapisan tanpa berdenyut, kulit ditelusuri menurut kedalaman |

## Gerak dan label per segmen (video gabungan 15 dtk; waktu = detik lokal organ)
- **Jantung** (`scenes/jantung.mjs`): massa jantung (badan, aurikula, alur, lemak, koroner) berkontraksi terhadap titik tambat di dasar (350, 600): sumbu panjang menyusut 4,5%, sumbu pendek 2%, putar 0,8 derajat, sentakan atrium kecil sebelum sistol, periode 1,25 dtk; pembuluh besar diam sehingga sambungan utuh. Segmen koroner terang = penanda infografis, bukan aliran darah. Label: 0,9-2,3 lengkung aorta + batang pulmonalis; 2,5-3,7 aurikula kiri + arteri koroner; 3,9-4,75 ventrikel kiri.
- **Gigi** (`scenes/gigi.mjs`): 0-1,1 gigi UTUH dengan semua lapisan; 1,1-1,8 lapisan dibuka (gusi kiri/kanan bergeser ke samping, email terangkat, ligamen dan tulang turun); fase sorot dengan lapisan non-fokus diredupkan: A 1,5-2,6 email + gusi, B 2,7-3,7 dentin + pulpa + kanal akar, C 3,8-4,8 ligamen periodontal + tulang alveolar; 4,4-5,1 lapisan menutup kembali sehingga segmen berakhir dengan gigi utuh. Tidak ada denyut. Partikel kecil di kanal pulpa hanya penanda.
- **Kulit** (`scenes/kulit.mjs`): 0-1,1 potongan kulit utuh dan terang; pemindai kedalaman lalu berhenti di tiap lapisan dengan peredupan ringan di bawah pita (opasitas 0,4): epidermis (label 1,3-2,2), dermis (2,3-3,2), hipodermis/lemak (3,3-4,2); peredupan hilang 4,1-4,5; lalu rambut dan folikel + kelenjar keringat disorot sampai akhir.
- **Gabungan** (`scenes/gabungan.mjs`): jantung -> gigi -> kulit; tiap organ 5,4 dtk, tumpang tindih 0,6 dtk (3 x 5,4 - 2 x 0,6 = 15,0 dtk). Transisi: latar silang-pudar; organ + label memudar keluar (0,3 dtk), organ berikut memudar masuk (0,3 dtk); logo, "ATLAS ANATOMI", dan kaki halaman diam; judul diganti berurutan.

## Render ulang
Prasyarat: Node, Chromium lewat Playwright (`/opt/node-tools/node_modules/playwright`), ffmpeg.
```
node brand/anatomi-visual/sistem/render.mjs jantung|gigi|kulit still <detik> keluaran.png
node brand/anatomi-visual/sistem/render.mjs jantung|gigi|kulit klip keluaran.mp4 --scale=1      # 1080x1920, 162 bingkai
node brand/anatomi-visual/sistem/render.mjs gabungan klip keluaran.mp4 --scale=1 --dua          # 15 dtk, 450 bingkai; --dua juga menulis versi tanpa label (-tanpa-label.mp4)
node brand/anatomi-visual/sistem/periksa-label.mjs                                              # jumlah label per bingkai (maks 3) dan uji garis penunjuk tidak memotong pil/garis lain
python3 brand/anatomi-visual/sistem/periksa.py panel jantung.png gigi.png kulit.png panel.png     # tiga still berdampingan ukuran ponsel
python3 brand/anatomi-visual/sistem/periksa.py kontak <dir bingkai> kontak.png 360               # bingkai awal/tengah/akhir lebar 360 px + angka lompatan antar-bingkai
node brand/anatomi-visual/sistem/ekspor-aset.mjs                                                  # parameter JSON + layer SVG
```
Satu klip 1080x1920 memerlukan sekitar 2,5-3 menit bila tiga klip dirender paralel di 4 inti CPU; gabungan sekitar 7 menit.

## Aset kode yang dapat dipakai ulang
- `scenes/<organ>.mjs`: `meta`, `PARAM` (penempatan, jadwal, kunci kamera, label), `frame(t)`.
- `aset/parameter-animasi.json`: token + parameter semua organ.
- `aset/layer/`: jantung (`back/body/trunk/hi`), gigi (`g-tulang`, `g-lig-periodontal`, `g-dentin`, `g-sementum`, `g-pulpa`, `g-saraf-pembuluh`, `g-email`, `g-gusi`, `g-kontur`), kulit (`k-adegan`, satu layer gabungan), dan latar `L0-L5` per organ. Aliran kanal pulpa, pemindai kulit, dan kontraksi jantung dihitung dari `t` di kode, bukan layer SVG.

## Pemeriksaan hasil bergerak
- `periksa-label.mjs` memeriksa 450 bingkai: jumlah label tampak (maks 3) dan garis penunjuk tidak memotong pil atau garis lain.
- Hasil terakhir: maksimum 3 label tampak (18 dari 450 bingkai), tidak ada garis penunjuk yang memotong pil atau garis lain; selisih rata-rata antar-bingkai tertinggi terjadi pada pembukaan lapisan gigi (bingkai 45) dan awal peredupan kulit (bingkai 34), bukan sambungan putus.
- Pemutaran normal: video gabungan didekode dan diambil tiap 0,2 dtk pada lebar 270 px (setara layar ponsel) lalu dibaca berurutan untuk urutan label, jeda antarfase, keterbacaan awal gigi dan kulit, dan transisi.
- Bingkai awal, tengah, dan akhir tiap klip pada lebar 360 px (`out/kontak-awal-tengah-akhir.png`), selisih rata-rata antar-bingkai berurutan, dan sambungan jantung pada sistol maksimum vs relaks (pembuluh tidak terlepas dari badan).
- Hasil dan kekurangan spesifik tercatat di bagian berikut dan di laporan.

## Yang masih skematis atau berbeda antarorgan (jujur)
- **Kesatuan gaya belum penuh.** Jantung digambar dengan tumpukan bentuk bergradasi lembut; gigi dan kulit memakai filter pencahayaan SVG + sel Voronoi + tekstur halus. Akibatnya gigi/kulit lebih bertekstur dan berkilap dibanding jantung yang lebih halus; kontur tinta ada di gigi/kulit (tipis) tetapi tidak di jantung.
- **Gigi:** pola rongga tulang diubah dari cincin sejajar soket menjadi sebaran acak dengan jarak minimum yang membesar menjauhi akar (`darwin/gigi.mjs`, `marrowSpaces`); bentuk gigi tidak berubah. Gusi tampak seperti baji merah muda tanpa papila interdental dan tanpa gigi tetangga; rongga tulang Voronoi tampak terlalu rapi dan berpola cincin; warna email kehijauan; ruang pulpa lebar dan seragam; kanal mandibula tidak digambar.
- **Kulit:** tebal epidermis dibesarkan sekitar 4x; korneum hanya enam lapis; kolagen berupa goresan; rambut kaku tanpa kutikula; kelenjar sebasea seperti kumpulan lingkaran ("anggur"); kelenjar keringat kecil dan sulit terbaca di lebar ponsel; peredupan ringan di bawah pita pemindai membuat lapisan bawah tampak lebih kusam selama pemindaian.
- **Semua organ:** penunjuk label sering menyilang struktur lain; label pada lebar 360 px sekitar 10,7 px; belum ada narasi/audio; hanya satu arah pandang per organ.

## Sumber anatomi
**Yang saya buka sendiri** (abstrak lewat PubMed; halaman penuh tidak bisa dibuka dari sesi ini):
- Jantung: lengkung aorta tiga cabang ([doi](https://doi.org/10.7860/JCDR/2015/14219.6253), [doi](https://doi.org/10.1016/j.acra.2018.08.023)); aurikula kiri dan sirkumfleks ([doi](https://doi.org/10.5152/akd.2013.181), [doi](https://doi.org/10.1007/s12565-024-00805-2)); cabang koroner kiri dan vena kardiak besar ([doi](https://doi.org/10.5115/acb.22.240), [doi](https://doi.org/10.7759/cureus.112440)).
- Gigi: periodonsium = tulang alveolar, ligamen periodontal, sementum, gusi ([Santos 2024](https://doi.org/10.3390/ijms25168562); [Xiong 2013](https://doi.org/10.1111/prd.12023)); akar mesial molar bawah punya kanal mesiobukal dan mesiolingual ([Careaga 2026](https://doi.org/10.65717/eej.2026.25104)).
- Kulit: tiga lapisan, epidermis, dermis, lemak subkutan ([Takagaki 2026](https://doi.org/10.3791/69972)); papila rambut lazimnya di lemak subkutan pada kulit kepala ([Khajeh Pour 2026](https://doi.org/10.1111/cts.70710)); korpuskel Pacini di fasia superfisial, studi anjing ([Al-Juhaishi 2025](https://doi.org/10.1002/jmor.70033)).

**Yang dilaporkan pembuat aset gigi/kulit** di README cabang `claude/eloquent-darwin-ewtwtu` (**tidak saya periksa ulang**): halaman Wikipedia *Mandibular first molar*, *Pulp (tooth)*, *Gums*, *Alveolar process*, *Periodontal ligament*, *Skin*, *Epidermis*, *Dermis*, *Subcutaneous tissue*, *Hair follicle*, *Sebaceous gland*, *Sweat gland*, *Arrector pili muscle*, *Pacinian corpuscle*, *Free nerve ending*; PubMed (abstrak) PMID 32161889, 32342032, 41028125, 36287490 (jumlah akar dan kanal molar bawah), 41430227 (jarak apeks-kanal mandibula), 29026699, 23461747, 9436343 (sulkus, lebar biologis, furkasi).

## Belum tervalidasi
- **Gigi:** bentuk mahkota dan tonjol, tebal email, bentuk ruang pulpa, divergensi akar, konfigurasi kanal (pola dua kanal mesial + satu distal adalah pola umum, bukan semua kasus), lebar ligamen, kontur gusi, perlekatan epitel, struktur trabekula; angka milimeter di aset tidak terverifikasi (dinyatakan pembuatnya).
- **Kulit:** ketebalan relatif lapisan, sudut folikel, bentuk dan letak kelenjar, otot penegak rambut, pleksus pembuluh dan lengkung kapiler papila, ujung saraf bebas, posisi korpuskel Pacini manusia.
- **Jantung:** proporsi atrium, aurikula, dan pembuluh besar terhadap badan; jalur persis koroner; sebaran lemak; deformasi kontraksi hanyalah gerak ilustratif.
Kecocokan siluet jantung dengan gambar acuan bukan validasi anatomi.

## Catatan teknis
Pada v7 yang lama sebagian filter blur tidak terdaftar sehingga lapisan itu tidak terblur dan menimbulkan bidang bertepi keras. Sekarang semua nilai blur terdaftar otomatis (`usedB`), jadi jantung tampak lebih lembut daripada render v7 lama. Itu perbaikan bug (siluet dan struktur tidak berubah) dan sudah ada sejak commit `9c7ff84`.
