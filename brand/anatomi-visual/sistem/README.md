# Atlas MEDCOEL: sistem visual anatomi (jantung, gigi, kulit)

Satu sistem visual untuk klip anatomi 9:16 (1080x1920, 5 detik, 30 fps), dibuat sepenuhnya dari kode (SVG + Chromium + ffmpeg). Baseline jantung: v7 (`../v6/heart7.mjs`). Anatomi tetap berstatus **konsep visual, belum divalidasi menyeluruh**.

## Yang diperiksa dari merek sebelum memilih palet
- Logo `video/kuis-anatomi-3d/stage/logo-mark.webp`: siku "C" hijau (#007060) yang bersarang dan terbuka ke kanan, dengan bintang empat sudut emas (#F8C038). Kata merek: Plus Jakarta Sans 800.
- Token web `apps/web/src/index.css`: hijau #007060 / gelap #00584E, emas #F8C038, tinta #172B38, gading #F8F7F3, biru akademik #255F85, koral #B0444F. `docs/DESIGN_SYSTEM.md` (register tenang vs ilustratif, tipografi) dan `docs/ILLUSTRATIONS.md` (ilustrasi web: datar, gading, tanpa gradien, jadi bukan acuan bentuk jaringan).
- Video kuis anatomi 3D memakai latar tinta-teal gelap dengan emas dan hijau mint; Atlas melanjutkan arah itu.
Keputusan: bahasa bentuk latar diambil dari logo (siku C bersarang + bintang emas), bukan dari acuan jantung pihak lain (tanpa ungu-magenta, bokeh, atau tata letaknya). **Warna jaringan tidak mengikuti merek**: otot merah, vena biru, lemak kuning, tulang krem, gusi merah muda, dll.

## Aturan visual bersama (`tokens.mjs`, `latar.mjs`, `kerangka.mjs`)
| Aspek | Aturan |
|---|---|
| Cahaya | Satu arah: kiri atas (vektor ke sumber `[-0.55, -0.83]`) untuk bayangan organ, cahaya latar, dan sisi terang pembuluh |
| Permukaan | Tumpukan bentuk bergeser/menyusut ke arah cahaya, dipotong siluet (clip), blur lokal per bentuk; 3-5 kilau kecil; bayangan kontak di lipatan. Tanpa glow merata |
| Latar (L0-L5) | Gradien tinta/hijau gelap per organ, tiga siku C bersarang (paralaks 0,35), penggaris atlas dan tanda registrasi, cahaya terarah + bayangan lantai, bintang emas berkelip pelan, vinyet. Organ mengganti `LATAR[organ]` (jantung: tinta-teal + cahaya koral; gigi: tinta-biru + cahaya biru; kulit: hijau gelap + cahaya emas); struktur lapisan sama |
| Kontras | Latar luminans rendah (#0A1822..#154238), organ terang; teks gading #F8F7F3 di atas latar, label gading dengan teks tinta |
| Detail di 360-390 px | Judul 62 px, label 29 px (sekitar 10 px di lebar 360), tidak ada garis lebih tipis dari 3 px pada kanvas penuh kecuali tekstur halus |
| Label | Pil gading dengan penanda warna jaringan, penunjuk emas dengan titik jangkar, satu kolom di kanan, maksimal dua baris, urut menurut posisi y jangkar (`susunLabel`) |
| Kamera | Satu dolly/pan per klip, easing `inOut`; label dan penunjuk ikut proyeksi kamera |
| Easing & tempo | Dua easing saja (`inOut` kamera/gerak struktur, `out` penyingkapan/label). Reveal 0,7 s, label masuk 0,5 s dengan jeda 0,28 s, durasi 5 s |
| Gerak | Mengikuti struktur: jantung berkontraksi lokal (tidak mengubah ukuran gambar), gigi tidak berdenyut (lapisan dibuka), kulit disingkap bertahap |

## Render ulang
Prasyarat: Node, Chromium lewat Playwright (`/opt/node-tools/node_modules/playwright`), ffmpeg.
```
node brand/anatomi-visual/sistem/render.mjs jantung|gigi|kulit still <detik> keluaran.png [--scale=1]
node brand/anatomi-visual/sistem/render.mjs jantung|gigi|kulit klip keluaran.mp4 [--scale=0.6667] [--frames=dir]
python3 brand/anatomi-visual/sistem/periksa.py panel jantung.png gigi.png kulit.png panel.png
python3 brand/anatomi-visual/sistem/periksa.py kontak <dir bingkai> kontak.png      # bingkai awal/tengah/akhir + lompatan antar-bingkai
node brand/anatomi-visual/sistem/ekspor-aset.mjs                                      # parameter JSON + layer SVG
```
Klip penuh 1080x1920: `--scale=1` (sekitar 2x lebih lama). Satu klip 720x1280 sekitar 40-70 detik di CPU.

## Aset kode yang dapat dipakai ulang
- `scenes/<organ>.mjs`: `meta`, `PARAM` (parameter animasi: periode, titik tambat, jarak pembukaan lapisan, jadwal tahap, kunci kamera), `frame(t)` (SVG satu bingkai).
- `aset/parameter-animasi.json`: token + parameter semua organ.
- `aset/layer/<organ>/*.svg`: layer mandiri (jantung: back/body/trunk/hi; gigi: bone/pdl/dentin/pulp/enamel/gusiL/gusiR; kulit: epidermis, dermis, hipodermis, folikel, batang, sebasea, otot, keringat, pembuluh, saraf, tepi; latar: L0-L5 per organ).

## Gerak per organ
- **Jantung**: massa jantung (badan, aurikula, alur, lemak, koroner) berkontraksi terhadap titik tambat di dasar (350, 600): sumbu panjang menyusut 4,5%, sumbu pendek 2%, putar 0,8 derajat, dengan sentakan atrium kecil sebelum sistol; pembuluh besar tidak bergerak sehingga sambungan utuh. Segmen terang di koroner = penanda infografis, bukan rekaman aliran darah. Periode 1,25 s.
- **Gigi**: 0,7-2,0 s gusi bergeser ke samping, tulang turun 30 unit, email terangkat 30 unit; 3,0-4,0 s menutup kembali; kamera dari mahkota ke akar; buram fokus ringan pada tulang/gusi di awal.
- **Kulit**: epidermis, dermis (wipe atas-bawah), hipodermis, folikel (wipe), kelenjar (skala+opasitas), pembuluh dan saraf (digambar sepanjang jalur); kamera turun mengikuti kedalaman.

## Yang disederhanakan
- Jantung: tanpa katup, vena pulmonalis, dan cabang koroner kecil; proporsi pembuluh terhadap badan digambar tangan dari acuan gaya; vena kardiak besar disederhanakan.
- Gigi: satu potongan mesiodistal, tanpa gigi tetangga (papila interdental dipotong di tepi blok); tubulus dentin, serat ligamen, dan trabekula tulang adalah tekstur skematis (bukan arah dan kepadatan nyata); lebar ligamen periodontal dan tebal email/sementum tidak berskala; kanal digambar tiga (dua di akar mesial, satu di distal).
- Kulit: tebal epidermis dibuat jauh melebihi aslinya agar terbaca; satu tipe kulit berambut; tanpa pembuluh limfe, sel Merkel, korpuskel Meissner; lekuk papila dermis, jalur pleksus, dan letak kelenjar adalah penyederhanaan.

## Sumber anatomi yang benar-benar dibuka (abstrak lewat PubMed; halaman penuh tidak dapat dibuka)
- Jantung: lengkung aorta tiga cabang ([doi](https://doi.org/10.7860/JCDR/2015/14219.6253), [doi](https://doi.org/10.1016/j.acra.2018.08.023)); aurikula kiri dan sirkumfleks ([doi](https://doi.org/10.5152/akd.2013.181), [doi](https://doi.org/10.1007/s12565-024-00805-2)); cabang koroner kiri dan vena kardiak besar ([doi](https://doi.org/10.5115/acb.22.240), [doi](https://doi.org/10.7759/cureus.112440)).
- Gigi: periodonsium terdiri dari tulang alveolar, ligamen periodontal, sementum, dan gusi ([Santos 2024](https://doi.org/10.3390/ijms25168562); [Xiong 2013](https://doi.org/10.1111/prd.12023)); akar mesial molar bawah punya kanal mesiobukal dan mesiolingual ([Careaga 2026](https://doi.org/10.65717/eej.2026.25104)).
- Kulit: tiga lapisan (epidermis, dermis, lemak subkutan) dengan matriks ekstraseluler kaya kolagen ([Takagaki 2026](https://doi.org/10.3791/69972)); papila rambut lazimnya di lemak subkutan pada kulit kepala ([Khajeh Pour 2026](https://doi.org/10.1111/cts.70710)); korpuskel Pacini dan ujung saraf bebas pada fasia superfisial (studi anjing, bukan manusia) ([Al-Juhaishi 2025](https://doi.org/10.1002/jmor.70033)).

## Belum tervalidasi
- Gigi: bentuk mahkota dan tonjol, tebal email, bentuk ruang pulpa dan tanduknya, panjang/divergensi akar, konfigurasi kanal (tiga kanal adalah pola umum, bukan semua kasus), lebar ligamen periodontal, kontur gusi dan perlekatan epitel, struktur tulang.
- Kulit: ketebalan relatif lapisan, sudut folikel, letak dan bentuk kelenjar sebasea dan ekrin, otot penegak rambut, pleksus pembuluh dan lengkung kapiler papila, ujung saraf bebas di epidermis, korpuskel Pacini manusia.
- Jantung: sama seperti `../README.md` (v5-v7).
Kecocokan siluet dengan gambar acuan bukan validasi anatomi.

## Catatan teknis penting
Pada v7 sebelumnya, sebagian filter blur tidak terdaftar (nilai seperti 9, 14, 18, 20, 22 tidak punya `<filter>`), sehingga lapisan itu tidak terblur dan menimbulkan bidang bertepi keras. Sekarang semua nilai blur terdaftar otomatis (`usedB`), jadi jantung tampak lebih lembut daripada render v7 yang lama. Itu perbaikan bug, bukan perubahan siluet atau struktur.
