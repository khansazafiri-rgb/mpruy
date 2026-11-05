# Gaya visual anatomi MEDCOEL (kode: SVG + filter pencahayaan)

Sistem gaya, jantung, dan potongan gigi yang digambar **murni dari kode** (tanpa gambar acuan yang ditempel). Dikalibrasi terhadap gambar acuan jantung dan gigi dari pemesan (kualitas, warna, volume, pencahayaan). Ini **konsep visual yang masih perlu pemeriksaan anatomi** oleh orang yang berwenang (lihat "Validasi anatomi" di bawah).

## Isi folder
| Berkas | Fungsi |
|---|---|
| `anatomi.js` | **Sistem gaya**: palet (`PAL`), filter pencahayaan (`vol`, `volS`, `tex`, `shadow`), latar gelap berlapis + partikel + sel darah kabur (`background`), pembuluh bervolume (`tube`), pita meruncing (`ribbon`), kurva kubik (`sampleCubic`, `cubicD`), label pemeriksaan (`label`). |
| `jantung.js` | Jantung tampak depan + pembuluh besar + koroner. `jantung({labels, t})` mengembalikan isi SVG. |
| `gigi.js` | Potongan mesiodistal gigi molar bawah + jaringan penyangga. `gigi({labels, t})`. |
| `render.html`, `render.cjs` | Merender `?obj=jantung|gigi` (`&labels` = dengan label pemeriksaan, `&t=detik` = fase animasi) ke PNG 1080 x 1920. |
| `bandingkan.py` | Preview perbandingan acuan vs hasil (butuh berkas gambar acuan dari Anda). |
| `render/` | `jantung.png`, `gigi.png` (bersih), `*-label.png` (dengan label untuk memeriksa anatomi). |
| `prompt-gaya-anatomi.md` | Prompt cadangan untuk pembuat gambar (GPT) bila diperlukan, berisi sumber dan daftar periksa. |

## Merender ulang
```bash
cd <akar repo>
python3 -m http.server 8128 --bind 127.0.0.1 &          # server statis
node brand/anatomy-style/render.cjs jantung gigi         # butuh Playwright (Chromium); hasil di brand/anatomy-style/render/
python3 brand/anatomy-style/bandingkan.py <acuan.jpg>    # preview perbandingan -> render/perbandingan.png
```
Dalam video: `import { jantung } from '.../brand/anatomy-style/jantung.js'` lalu `svgDoc(jantung({ t }), 'h')` (lihat `render.html`); `t` (detik) menggerakkan denyut dan partikel aliran.

## Prinsip gaya (agar organ lain terasa satu seri)
- **Kanvas** 1080 x 1920. Subjek besar, di dalam area aman; sisakan ruang atas dan bawah untuk judul/label.
- **Latar**: gradien aubergine (`PAL.bg`), cahaya magenta di belakang subjek, bentuk besar sangat kabur, siluet pembuluh kabur, sel darah merah/biru kabur, partikel halus bercahaya (`background()`).
- **Cahaya**: satu sumber dari **kiri atas** (azimuth 225) di semua filter; rim light dingin merah muda di tepi kanan-bawah; bayangan jatuh ke kanan-bawah.
- **Volume**: (1) gradien radial per organ; (2) filter `vol`/`volS` mengubah alpha yang diburamkan menjadi relief (diffuse x specular); (3) goresan sorotan lebar berburam; (4) tekstur turbulensi halus; (5) `tube()` berlapis untuk pembuluh (sorotan digeser ke arah cahaya); (6) ujung potong pembuluh digambar sebagai cincin lumen.
- **Warna** boleh berbeda per organ (palet di `PAL`: merah otot jantung, biru vena, jingga lemak, krem dentin, lavender enamel, jingga trabekula, merah muda gusi), tetapi semua lewat filter, gradien, dan latar yang sama.
- **Gradien yang dipakai lintas bentuk** harus `gradientUnits="userSpaceOnUse"` (kalau tidak, warna antar-bentuk yang bersambung berbeda dan muncul garis sambungan; pelajaran dari dentin).
- **Jalur terbuka untuk goresan tepi**: jangan menggoreskan path tertutup yang sisi penutupnya melintasi gambar (muncul garis di dalam objek).

## Bagian yang dapat dianimasikan (id grup di SVG)
- Jantung: `#h-denyut` (skala berdenyut kecil mengikuti `t`), `#h-aliran` (partikel di aorta), `#h-koroner`, `#h-koroner-halus`, `#h-lemak`, `#h-label`.
- Gigi: `#g-pulpa-aliran` (partikel di kanal), `#g-gusi`, `#g-tulang`, `#g-label`.
Untuk animasi video: render per frame dengan `t`, atau ambil grup sebagai elemen terpisah dan beri transformasi/opacity.

## Membuat organ lain dengan gaya yang sama
1. Salin `jantung.js` sebagai kerangka: `import` dari `anatomi.js`, `export const P = '<awalan id>'`, fungsi `organ({labels, t})`.
2. Mulai dengan `background(P, {seed, glow, tint, vesselColor})`; gambar siluet organ dengan `<g filter="url(#${P}vol)">` + gradien radial organ; tambah sorotan dan rim light; pembuluh dengan `tube()`; tutup dengan `vignette(P)`.
3. Tambah entri `PAL` untuk warna organ; jangan mengubah arah cahaya atau latar.
4. Tambahkan label pemeriksaan (`label()`) dan render dengan `&labels` untuk memeriksa struktur sebelum dipakai di video.
Rencana berikutnya (setelah gaya jantung dan gigi disetujui): pembuluh darah (penampang arteri), sel darah, dan kulit dengan sistem yang sama.

## Validasi anatomi
**Sumber yang benar-benar diperiksa: tidak ada.** Sesi pembuatan tidak punya akses web, dan atlas yang saya acu (Netter *Atlas of Human Anatomy*; Gray's *Anatomy for Students*; Moore *Clinically Oriented Anatomy*; Ten Cate *Oral Histology*; Ross & Pawlina *Histology*) **tidak dibuka**: pemeriksaan di bawah adalah penilaian dari pengetahuan penulis dan harus diverifikasi terhadap atlas tersebut oleh orang yang berwenang.

Jantung (tampak depan), menurut penilaian penulis:
- Cocok dengan deskripsi atlas: apeks mengarah ke kiri-bawah pasien; aorta asenden keluar dari ventrikel kiri dan melengkung ke kiri pasien dengan tiga cabang arkus (brakiosefalika, karotis komunis kiri, subklavia kiri); batang pulmonal di depan aorta, keluar dari ventrikel kanan, bercabang (arteri pulmonalis kiri terlihat, kanan lewat di belakang aorta dan vena kava superior); VKS masuk ke atrium kanan dan VKI di bawahnya; aurikel kanan menutupi pangkal aorta, aurikel kiri di sisi batang pulmonal; RCA di alur AV kanan, LAD di alur interventrikular anterior, sirkumfleks di alur AV kiri; vena jantung magna di samping LAD; lemak epikardium di alur; dua vena pulmonalis kiri terlihat di sisi lateral kiri.
- Disederhanakan atau belum yakin: pola cabang koroner halus dibuat acak berpola (dekoratif, **bukan** pola cabang diagonal/marginal yang sebenarnya); asal RCA dan LCA di sinus aorta tidak digambar; proporsi dan sudut aorta-batang pulmonal-aurikel perlu dicek ke atlas; bentuk atrium kanan dan aurikel kanan disederhanakan; ukuran relatif ventrikel kanan vs kiri; pembuluh berupa tabung seragam (tanpa lengkungan alami dan kalsifikasi); vena jantung kecil dan vena anterior hanya skematik.

Gigi (molar bawah, potongan mesiodistal), menurut penilaian penulis:
- Cocok: enamel hanya di mahkota (tebal di puncak tonjol, tipis di leher); dentin di mahkota dan akar dengan tubulus radial; ruang pulpa dengan tanduk pulpa dan dua kanal akar yang meruncing ke foramen apikal; sementum tipis di akar; ligamen periodontal; tulang alveolar (trabekular) di sekitar akar dengan puncak sedikit di bawah batas sementum-enamel; gusi dengan margin, sulkus, dan epitel penyatu; furkasi di antara dua akar; berkas saraf-pembuluh alveolaris inferior (saraf, arteri, vena) di bawah akar dengan cabang dental ke apeks.
- Disederhanakan atau belum yakin: gigi tetangga dan septum interdental tidak digambar (gusi di sisi kiri-kanan hanya sebagai papila skematik); tulang trabekular digambar sebagai pori bulat seperti sarang (sebenarnya batang-batang trabekula tak beraturan), lamina dura/kortikal tidak dibedakan; kanal mandibula digambar tanpa dinding kortikal; molar bawah umumnya punya dua kanal di akar mesial (di sini satu per akar); sementum dan email diberi ketebalan estetis; pola pembuluh dan saraf di pulpa dekoratif.

## Evaluasi terhadap acuan (ringkas; rincian di bagian bawah laporan sesi)
Kemiripan gaya (latar ungu-magenta, warna jenuh, volume, partikel) sudah ada, tetapi **kilau dan kehalusan permukaan acuan lebih tinggi**, bentuk jantung acuan lebih bulat-gemuk dengan pencahayaan lebih lembut, dan cabang koroner acuan lebih halus dan natural; gigi acuan memakai gusi bergelombang yang membungkus leher gigi dan tulang berbentuk awan yang memudar (di sini masih blok persegi dengan tepi kiri-kanan lurus). Revisi lanjutan yang disarankan: tekstur kulit organ lebih halus + sorotan kaca (specular map), kurva koroner dibuat tangan per cabang, gusi bergelombang, bentuk tulang awan.
