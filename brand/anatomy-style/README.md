# Gaya visual anatomi MEDCOEL (kode: SVG + filter pencahayaan), revisi 2

Sistem gaya, jantung, dan potongan gigi yang digambar **murni dari kode** (tanpa gambar acuan yang ditempel). Gambar acuan dari pemesan (dibuat AI, belum divalidasi) hanya dipakai untuk **gaya**: latar, warna, kilau, volume. **Bentuk dan hubungan struktur mengikuti sumber anatomi** (lihat "Sumber yang diperiksa"), bukan acuan. Hasil tetap **konsep visual yang perlu pemeriksaan oleh orang yang berwenang**.

## Isi folder
| Berkas | Fungsi |
|---|---|
| `anatomi.js` | **Sistem gaya**: palet (`PAL`), filter pencahayaan (`vol`, `volS`, `volV`, `tex`, `shadow`), latar gelap berlapis + partikel + sel darah kabur (`background`), pembuluh bertaper bervolume (`vessel`, `endCap`), tabung (`tube`), pita meruncing (`ribbon`), kurva kubik (`sampleCubic`, `cubicD`), label pemeriksaan (`label`). |
| `jantung.js` | Jantung tampak depan + pembuluh besar + koroner utama. `jantung({labels, t})` mengembalikan isi SVG. |
| `gigi.js` | Potongan mesiodistal **molar pertama rahang bawah** + jaringan penyangga. `gigi({labels, t})`. |
| `render.html`, `render.cjs` | Merender `?obj=jantung|gigi` (`&labels` = dengan label pemeriksaan, `&t=detik` = fase animasi) ke PNG 1080 x 1920. |
| `bandingkan.py` | Preview perbandingan (acuan, hasil sebelumnya, hasil revisi) dari berkas acuan Anda. |
| `render/` | `jantung.png`, `gigi.png` (bersih), `*-label.png` (berlabel, untuk memeriksa anatomi), `v1/` (hasil revisi pertama untuk pembanding). |
| `prompt-gaya-anatomi.md` | Prompt cadangan untuk pembuat gambar. |

## Merender ulang
```bash
cd <akar repo>
python3 -m http.server 8128 --bind 127.0.0.1 &          # server statis
node brand/anatomy-style/render.cjs jantung gigi         # butuh Playwright (Chromium); hasil di brand/anatomy-style/render/
python3 brand/anatomy-style/bandingkan.py <acuan.jpg> [render/v1/jantung.png render/v1/gigi.png]
```
Dalam video: `import { jantung, P } from '.../brand/anatomy-style/jantung.js'` lalu `svgDoc(jantung({ t }), P)` (lihat `render.html`).

## Keputusan anatomi (jenis gigi, arah potongan)
- **Gigi: molar pertama permanen rahang bawah**, potongan **mesiodistal** (sagital) melalui celah sentral. **Mesial di kiri layar, distal di kanan.**
- **Jumlah akar dan kanal** mengikuti studi CBCT: ±95-97% punya dua akar; akar mesial hampir selalu dua kanal (MB dan ML; tipe Vertucci II paling sering, lalu IV); akar distal paling sering satu kanal (tipe I). Pada bidang ini kanal MB dan ML saling bertumpuk, jadi **MB digambar jelas dan ML samar di belakang bidang potong, menyatu dengan MB di sepertiga apikal (tipe II)**. Akar distal satu kanal lebih lebar.
- Akar mesial lebih lebar dan apeksnya lebih tumpul; kedua akar sedikit melengkung ke distal; empat tanduk pulpa (dua terlihat di bidang ini).

## Layer animasi (id grup SVG)
- **Jantung:** `#h-denyut` (seluruh jantung, skala berdenyut mengikuti `t`), `#h-ventrikel`, `#h-atrium` (+ `#h-atrium-aurikel`), `#h-aorta`, `#h-pulmonal`, `#h-vena-besar`, `#h-vena-pulmonalis`, `#h-koroner`, `#h-vena-jantung`, `#h-lemak`, `#h-aliran`, `#h-label`.
- **Gigi:** `#g-tulang`, `#g-lig-periodontal`, `#g-dentin`, `#g-sementum`, `#g-email`, `#g-pulpa`, `#g-saraf-pembuluh`, `#g-pulpa-aliran` (partikel di kanal, mengikuti `t`), `#g-gusi`, `#g-label`.
Cara pakai: render per frame dengan `t`, atau ambil grup sebagai elemen terpisah dan beri transformasi/opacity.

## Prinsip gaya (agar organ lain terasa satu seri)
- **Kanvas** 1080 x 1920; subjek besar di area aman (x 60-1020, y 250-1450).
- **Latar**: gradien aubergine (`PAL.bg`), cahaya magenta di belakang subjek, bentuk besar sangat kabur, siluet pembuluh kabur, sel darah merah/biru kabur, partikel halus bercahaya (`background()`).
- **Cahaya**: satu sumber dari **kiri atas** (azimuth 225) di semua filter; rim light merah muda di tepi kanan-bawah; bayangan jatuh ke kanan-bawah.
- **Volume**: gradien per organ (`userSpaceOnUse`); filter `vol`/`volS`/`volV` mengubah alpha yang diburamkan menjadi relief (diffuse x specular); sorotan lebar berburam; `vessel()` membuat pembuluh bertaper dengan sisi gelap dan sorotan searah cahaya; ujung potong pembuluh dengan `endCap()`.
- **Warna** boleh berbeda per organ (`PAL`), tetapi semua lewat filter, gradien, dan latar yang sama.
- **Gradien lintas bentuk** harus `gradientUnits="userSpaceOnUse"`; **jangan** menggoreskan path tertutup yang sisi penutupnya melintasi gambar (muncul garis di dalam objek).

## Membuat organ lain dengan gaya yang sama
1. Salin `jantung.js` sebagai kerangka (`import` dari `anatomi.js`, `export const P`, fungsi `organ({labels, t})`).
2. Mulai dari `background(P, {...})`; siluet organ dengan `<g filter="url(#${P}vol)">` + gradien; sorotan dan rim light; pembuluh dengan `vessel()`; tutup dengan `vignette(P)`.
3. Tambah warna organ di `PAL`; jangan ubah arah cahaya atau latar.
4. Tambah `label()` dan render `&labels` untuk memeriksa struktur sebelum dipakai.

## Sumber yang diperiksa (benar-benar dibuka di sesi ini)
Diambil lewat HTTP pada sesi pembuatan (Wikipedia en dan PubMed E-utilities). Ini sumber sekunder/abstrak, **bukan atlas anatomi**; atlas (Netter, Gray's, Moore, Ten Cate) tidak dapat dibuka. Pemeriksaan akhir terhadap atlas tetap diperlukan.

Jantung:
1. Wikipedia, *Heart*: apeks ke kiri; permukaan sternokostal; aurikel kanan dan kiri; sulkus koronarius dan sulkus interventrikular anterior; vena jantung (magna, media, parva, anterior); sinus koronarius; vena kardiaka anterior mengalir langsung ke atrium kanan; batang pulmonal keluar dari ventrikel kanan.
2. Wikipedia, *Aorta*: aorta asenden mulai posterior terhadap batang pulmonal lalu berputar ke kanan-depannya; arkus melengkung di atas arteri pulmonalis kiri dan bifurkasi batang pulmonal; urutan cabang arkus: trunkus brakiosefalika, karotis komunis kiri, subklavia kiri.
3. Wikipedia, *Pulmonary artery*: batang pulmonal naik ke atas dan ke kiri dari ventrikel kanan, bercabang **di bawah** arkus aorta; panjang sekitar 5 cm, diameter 2-3 cm; arteri pulmonalis kiri lebih pendek; kanan melintasi garis tengah.
4. Wikipedia, *Coronary arteries* dan *Right coronary artery*: RCA dari sinus aorta kanan, turun di sulkus koronarius kanan menuju krux; cabang marginal kanan, arteri konus, arteri nodus SA; LCA dari sinus kiri bercabang LAD dan sirkumfleksa.
5. Wikipedia, *Left anterior descending artery*: turun di sulkus interventrikular anterior sampai takik apeks (varian wraparound); menyuplai dinding anterolateral ventrikel kiri dan septum. *Circumflex branch*: melingkar di sulkus AV kiri (sulkus koronarius), cabang marginal kiri. *Great cardiac vein*: mulai di apeks, naik di sulkus interventrikular anterior lalu bergabung membentuk sinus koronarius di permukaan posterior.

Gigi dan jaringan penyangga:
6. Wikipedia, *Mandibular first molar*: dua akar (mesial dan distal), akar distal lebih lurus, keduanya sedikit melengkung ke distal; akar mesial lebih lebar dengan apeks tumpul dan lebih beralur; lima tonjol; empat tanduk pulpa.
7. PubMed: Greek population CBCT (PMID 32161889, 2019): 96,4% molar pertama bawah dua akar, 3,3% tiga akar; pola kanal tipe II terbanyak di akar mesial (69,8%) dan tipe I di distal (81,7%). Yemeni population CBCT (PMID 32342032, 2020): 96,8% dua akar; kanal mesial dua di 95,8%, distal satu di 96,4%; mesial tipe II 57%, tipe IV 35,6%. Jordanian CBCT (PMID 41028125, 2025): dua akar 96,2%; mesial dua kanal 100%; distal satu kanal 77,9%; mesial tipe II 68%. Brazilian CT (PMID 36287490, 2022): 94,9% dua akar; mesial tipe IV paling sering di molar pertama pada studi itu, distal tipe I. (Varian antar-populasi: tipe II dan IV sama-sama umum di akar mesial.)
8. Wikipedia, *Pulp (tooth)*: berkas saraf-pembuluh masuk lewat foramen apikal; ruang pulpa, tanduk pulpa, kanal radikular; pleksus Raschkow; serabut A-delta di perifer dekat odontoblas.
9. Wikipedia, *Gums*: gusi marginal mengikuti kontur bergerigi CEJ, setajam pisau pada margin bebas; sulkus gingiva; gusi cekat dengan stippling dan batas mukogingiva; papila interdental piramid atau col.
10. Wikipedia, *Alveolar process*: puncak alveolar sekitar 1-2 mm dari leher gigi; lamina dura (tulang alveolar propria/bundle bone, tempat serat Sharpey masuk); lempeng kortikal 1,5-3 mm di gigi posterior; tulang trabekular di antaranya. *Periodontal ligament*: serat utama kolagen, serat Sharpey, melekat dari sementum ke tulang.
11. PubMed, BMC Oral Health 2025 (PMID 41430227): jarak apeks ke kanal alveolaris inferior rata-rata 6,32 mm pada molar pertama bawah, sehingga berkas saraf-pembuluh alveolaris inferior **jauh di bawah apeks** dan tidak digambar penuh (hanya berkas apikal yang keluar dari foramen dan memudar ke tulang).

## Struktur yang cocok dengan sumber vs yang disederhanakan
Jantung, **cocok dengan sumber di atas:** apeks ke kiri-bawah pasien; aorta asenden keluar di belakang batang pulmonal lalu di kanan-depannya; arkus di atas bifurkasi pulmonal dengan tiga cabang berurutan; batang pulmonal naik ke kiri dan bercabang di bawah arkus (cabang kanan lewat di belakang aorta); VKS masuk ke atrium kanan, VKI di bawahnya; aurikel kanan di depan akar aorta, aurikel kiri di sisi batang pulmonal; RCA di sulkus koronarius kanan menuju tepi akut dengan cabang marginal kanan; LAD di sulkus interventrikular anterior sampai takik apeks dengan cabang diagonal; sirkumfleksa di sulkus AV kiri dengan cabang marginal kiri; vena jantung magna naik di samping LAD; vena kardiaka anterior ke atrium kanan; lemak epikardium di alur.
**Disederhanakan atau belum yakin:** asal RCA/LCA di sinus aorta dan batang utama LCA tersembunyi di belakang pembuluh besar (tidak digambar); jumlah, sudut, dan panjang cabang diagonal/marginal adalah contoh representatif (bervariasi antar-individu); cabang distal pendek hanya penanda; proporsi atrium kanan, aurikel, dan ukuran relatif ventrikel kanan-kiri perlu dicek ke atlas; vena jantung kecil dan media tidak lengkap; vena pulmonalis kiri (dua) digambar sebagai gagang ke samping (sebenarnya muncul dari belakang atrium kiri); pembuluh digambar halus tanpa kalsifikasi dan lengkung alami; warna merah/biru adalah konvensi (batang pulmonal biru karena darah rendah oksigen).

Gigi, **cocok dengan sumber di atas:** molar pertama bawah dua akar (mesial lebih lebar dan apeks tumpul, distal lebih lurus, keduanya melengkung ke distal); akar mesial dua kanal yang menyatu apikal (tipe II) dan distal satu kanal; email tebal di tonjol dan menipis ke leher; dentin dengan tubulus; ruang pulpa dengan dua tanduk terlihat; sementum tipis; ligamen periodontal tipis dengan serat Sharpey; lamina dura dan tulang trabekular; puncak alveolar sekitar 1-2 mm di bawah CEJ; margin gusi bergerigi setajam pisau dengan sulkus dan epitel penyatu; furkasi; berkas saraf-pembuluh masuk lewat foramen apikal.
**Disederhanakan atau belum yakin:** gigi tetangga dan septum interdental tidak digambar (papila digambar sebagai gundukan skematik); tulang trabekular memakai pori elips bergerombol (sebenarnya batang trabekula tak beraturan); lamina dura dan sementum dilebihkan tipis/tebalnya agar terlihat; batas email-dentin diberi gelombang halus tetapi bukan pola nyata; ketebalan email dan rasio mahkota-akar adalah perkiraan; kanal ML hanya penanda samar; pola pembuluh dan saraf di pulpa dekoratif (jumlah cabang tidak mengikuti data); kanal alveolaris inferior tidak digambar.

## Keterbatasan
Hasil ini belum divalidasi terhadap atlas atau oleh ahli anatomi; kilau dan kehalusan permukaan masih di bawah acuan; belum ada versi animasi video (hanya struktur layer dan parameter `t`).

## Evaluasi revisi 2 (terhadap acuan dan hasil sebelumnya)
Yang membaik dibanding v1: jantung jauh lebih besar dan menjadi fokus (±70% lebar bingkai), siluet lebih bulat dan organik, permukaan jauh lebih halus (tekstur berbintik dan serat dibuang) dengan sorotan kaca yang mengikuti lengkung; pembuluh besar bertaper dengan akar aorta, bifurkasi, dan ujung potong yang menyambung; koroner hanya jalur utama dan cabang bernama (bukan pohon acak); gigi berjenis jelas (molar pertama bawah, dua akar, kanal MB+ML samar dan distal tunggal), gusi bergerigi dengan sulkus, tulang berbentuk awan memudar dengan pori tak seragam, enamel lebih tebal dan tembus cahaya.
Yang masih jauh dari acuan: kilau dan kedalaman "kulit organ" acuan lebih kaya; jantung acuan lebih padat dengan percabangan koroner halus yang natural, sedangkan di sini permukaan ventrikel kanan masih agak polos; pembuluh besar masih terlihat seperti tabung walau sudah bertaper; gusi acuan membungkus leher gigi lebih tebal dan bergelombang; ruang pulpa acuan lebih sempit dengan arborisasi lebih rapat; label pemeriksaan masih saling silang (hanya untuk pemeriksaan, bukan untuk video).

## Revisi 3 (v3): apa yang berubah dan hasil evaluasinya
Perubahan jantung: (1) permukaan ventrikel kini berlapis cahaya yang lembut: rona RV lebih hangat dan LV lebih dalam dengan batas kabur di sepanjang LAD, gundukan konus keluaran RV di bawah batang pulmonal, sorotan lebar soft-light per gundukan, kilau sempit mengikuti lengkung, bayangan inti, cahaya pantul hangat di tepi kanan-bawah, oklusi ambien di dasar pembuluh besar (tanpa tekstur acak); (2) lemak epikardium digambar sebagai gugusan lobulus yang saling menyatu (efek "goo" lalu relief) di kedua sisi alur, menipis ke apeks, dengan jarak dari arteri supaya tidak menutupinya; (3) cabang dekoratif (ranting acak) **dihapus**, tersisa hanya jalur bernama; RCA kini membelok mulus menjadi a. marginalis kanan; (4) pembuluh besar memakai taper dengan pangkal melebar (`ease`) dan bayangan lebih kuat pada yang berada di depan (batang pulmonal, aorta); aurikel punya tepi bergelombang organik (displacement) dan warna burgundi yang sama dengan atrium.
Perubahan gigi: ruang pulpa dan kanal akar kini menyatu lewat corong halus (tanpa garis pemisah di lantai ruang), dengan bayangan dalam di dinding; untai saraf-pembuluh lebih tebal dan jelas; bayangan oklusi dan cahaya di dentin; gusi menjadi baji lengkung yang mengerucut ke margin setajam pisau di leher gigi (papila lebih rendah, tanpa titik stippling yang salah posisi); pori tulang lebih lembut dan kontras lebih rendah.
**Yang dicoba lalu dibuang:** relief dari peta tinggi (`reliefFilter`/`mound` di `anatomi.js`) menghasilkan garis kontur berundak (kuantisasi 8-bit) pada permukaan besar walau diberi dithering, sehingga tidak dipakai untuk jantung; fungsinya dibiarkan di `anatomi.js` untuk objek kecil bila perlu.
Yang masih di bawah acuan: kilau "plastik basah" dan kedalaman warna acuan masih lebih kaya; pembuluh besar masih terasa agak seperti tabung; percabangan koroner halus acuan lebih natural (sengaja tidak ditiru karena tidak punya dasar sumber); pulpa acuan lebih sempit dengan arborisasi lebih rapat; gusi acuan membungkus leher gigi lebih tebal.
Pemeriksaan ukuran HP (lebar 360 px): struktur utama (lapisan gigi, pembuluh besar, alur koroner dan lemaknya) masih terbaca; label tidak dipakai di versi bersih.
