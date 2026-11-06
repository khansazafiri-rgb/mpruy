# Uji gaya visual anatomi MEDCOEL: prompt siap pakai untuk GPT / pembuat gambar

> **Catatan:** berkas ini adalah prompt cadangan untuk pembuat gambar (GPT). Visual anatomi MEDCOEL yang dikerjakan lewat **kode** ada di `README.md` folder ini (`jantung.js`, `gigi.js`). Blok "GAYA BERSAMA" di bawah disusun dari deskripsi sebelum gambar acuan diterima; sesuaikan dengan ciri acuan: latar aubergine-magenta berhaze, warna sangat jenuh, kilau tinggi, sel darah merah/biru kabur, lemak jingga berbutir pada koroner.

## Cara pakai
1. Lampirkan gambar referensi jantung ke GPT (sebagai acuan gaya saja), lalu tempel **GAYA BERSAMA** + prompt gambar yang dituju + **LARANGAN**.
2. Minta ukuran portrait. GPT Image mendukung 1024x1536 (2:3), bukan 9:16 persis: minta komposisi dengan margin besar lalu perpanjang latar/crop ke 1080x1920. Bila tersedia 9:16 langsung, pakai itu.
3. Pakai **seed/instruksi yang sama** di tiap gambar dan jangan mengubah blok GAYA BERSAMA, supaya satu seri.
4. Periksa tiap hasil dengan **daftar periksa anatomi** di bawah sebelum dipakai; revisi lewat prompt perbaikan ("perbaiki hanya X, pertahankan sisanya").

## GAYA BERSAMA (tempel di awal setiap prompt)
```
Premium medical-education illustration, 2.5D semi-realistic digital render in the style of the attached reference
(use the reference only for lighting, color richness and rendering quality; do NOT copy its composition, text, numbers, logos or exact design).
Single hero structure, dominant and instantly recognizable, centered in a vertical 9:16 frame.
Rich but comfortable color, soft gradients, glossy subsurface-scattering look on organic tissue, soft specular highlights and rim light that give clear volume and depth.
Dark layered background (deep teal-to-navy gradient with subtle blurred depth layers), dramatic key light from upper left, cool rim light from behind,
a few fine soft glowing particles that fit the context (kept sparse, never covering the structure).
Clean, uncluttered, readable at phone-screen size. Anatomical structures clearly visible and spatially plausible, not simplified blobs.
Leave generous empty dark space: top 15% and bottom 25% of the frame free for a title and labels. Keep the subject inside the central safe area.
Consistent rendering across the whole series: same lighting direction, same depth of field, same level of detail, same background treatment.
```

## LARANGAN (tempel di akhir setiap prompt)
```
No text, no letters, no numbers, no labels, no arrows, no captions, no watermark, no logo, no signature, no border, no UI elements,
no hands, no people, no cartoon faces, no gore, no exaggerated glow. Do not invent anatomical structures that are not listed.
```

## 1. Jantung manusia (tampak depan / anterior)
```
[GAYA BERSAMA]
SUBJECT: an adult human heart in anterior (front) view, three-quarter angle slightly from the patient's right, apex pointing down and to the viewer's right.
Show accurate external anatomy:
- right atrium with its auricle (viewer's left), right ventricle forming most of the anterior surface, left ventricle along the viewer's right edge down to the apex;
- the aorta rising from the left ventricle behind and to the right of the pulmonary trunk, arching up and toward the viewer's right, with its three arch branches (brachiocephalic trunk, left common carotid, left subclavian) as short stumps;
- the pulmonary trunk emerging from the right ventricle, in FRONT of the aorta, dividing into right and left pulmonary arteries (colored blue-violet because they carry deoxygenated blood);
- superior vena cava entering the top of the right atrium (viewer's left, blue), inferior vena cava stump below;
- left auricle visible beside the pulmonary trunk;
- coronary arteries on the surface in bright red: right coronary artery in the right atrioventricular groove (viewer's left), left anterior descending artery running down the anterior interventricular groove to the apex, circumflex branch curving into the left atrioventricular groove; thin great cardiac vein in blue beside the LAD;
- thin yellowish epicardial fat along the grooves, glossy myocardium in warm red-pink.
Artistic colors: arteries red, veins blue, myocardium warm rose; keep vessel connections anatomically logical.
[LARANGAN]
```

## 2. Gigi dan jaringan sekitarnya (potongan longitudinal)
Saran uji pertama: **gigi satu akar** (gigi seri/premolar bawah) agar lapisannya lebih mudah benar; molar dua akar bisa jadi uji kedua.
```
[GAYA BERSAMA]
SUBJECT: a longitudinal (vertical) cross-section of one mandibular single-rooted human tooth in its socket, shown in a clean cutaway cut through the jaw bone, 3D with depth.
Layers must be clearly distinguishable:
- crown: outer enamel as a thin, translucent bluish-white cap (hardest layer), beneath it dentin in warm ivory-yellow forming the bulk of crown and root;
- pulp chamber and root canal in the center, soft pink-red pulp tissue with a thin neurovascular bundle entering through the apical foramen at the root tip;
- root surface covered by a very thin cementum layer; periodontal ligament as a thin fibrous gap between cementum and bone;
- alveolar bone surrounding the root: dense cortical bone on the outside, spongy (trabecular) bone inside, in cream-beige;
- gingiva (pink) hugging the neck of the tooth with a small gingival sulcus, free gingival margin and attached gingiva over the bone;
- the cemento-enamel junction visible at the neck.
Natural tooth shape, correct proportions (root longer than crown), no cavity, no fillings.
[LARANGAN]
```

## 3. Pembuluh darah (penampang arteri muskular)
```
[GAYA BERSAMA]
SUBJECT: a cutaway segment of a muscular artery: a short length of vessel with one transverse cross-section face toward the viewer and a longitudinal cut revealing the wall, 3D with depth.
Wall must read as distinct concentric layers from inside to outside:
- lumen filled with blood: many biconcave red blood cells (no nucleus), a few white blood cells and tiny platelets drifting;
- tunica intima: a continuous single layer of flat endothelial cells (pink-cream) on a thin subendothelial layer, bounded by a wavy internal elastic lamina (thin bright wavy line);
- tunica media: the thickest layer, circumferentially arranged smooth muscle cells (deep rose-red) interleaved with elastic lamellae, ending at a thin external elastic lamina;
- tunica adventitia: outer loose connective tissue, cream-beige, with collagen fibers and a tiny vasa vasorum vessel.
Wall thickness roughly one-fifth of the vessel diameter; lumen round. Blood flow direction implied, not arrows.
[LARANGAN]
```

## 4. Jaringan darah (apusan / tampilan mikroskopis stilisasi)
```
[GAYA BERSAMA]
SUBJECT: a stylized 3D microscopic view of human blood inside a plasma environment (plasma as warm translucent straw-yellow medium with soft depth-of-field blur at the edges).
Cells, clearly distinguishable by shape:
- many red blood cells: biconcave discs, no nucleus, bright red with paler center, the most numerous cell;
- 4 leukocytes of different types, each recognizable: neutrophil (multi-lobed purple nucleus, pale granular cytoplasm), lymphocyte (large round dark nucleus, thin rim of blue cytoplasm), monocyte (largest, kidney/horseshoe-shaped nucleus), eosinophil (bilobed nucleus with orange-red granules);
- platelets: small irregular purple granular fragments, much smaller than red cells, a few single and one small cluster;
- sizes in plausible relative proportion (red cell about 7-8 micrometers, platelets about 2-3, leukocytes larger than red cells), white cells far fewer than red cells (the count is simplified for readability).
One focal cluster centered in the frame, background cells softly out of focus.
[LARANGAN]
```

## 5. Kulit manusia (potongan melintang, kulit berambut)
```
[GAYA BERSAMA]
SUBJECT: a block cross-section of human hairy skin showing depth, 3D cutaway, from surface to hypodermis, in natural skin-tone and tissue colors.
Layers and structures in correct positions:
- epidermis: thin top layer with a thin keratinized surface (stratum corneum), layered keratinocytes, basal layer with a few melanocytes; wavy boundary with the dermis forming dermal papillae;
- dermis: papillary dermis (loose, with capillary loops in the papillae) above reticular dermis (dense collagen fibers, pale pink-cream);
- hair follicle slanting through the dermis, hair shaft emerging above the surface, hair bulb deep near the dermis-hypodermis border; a sebaceous gland attached to the follicle's upper part; arrector pili muscle running from the follicle to the papillary dermis;
- eccrine sweat gland: coiled secretory part deep in the lower dermis, a thin spiral duct rising to a pore on the surface;
- hypodermis (subcutaneous tissue): yellow adipose lobules separated by fibrous septa;
- blood vessels: a superficial plexus beneath the papillae and a deeper plexus at the dermis-hypodermis border, with small arteries (red) and veins (blue) connecting; optionally one small lamellar (Pacinian) corpuscle in the hypodermis and a thin nerve.
[LARANGAN]
```

## Prompt perbaikan (contoh)
```
Keep the composition, lighting, background and style exactly as in the previous image. Fix only: [mis. "the pulmonary trunk must be in front of the aorta and colored blue-violet"].
Do not add any text or new structures.
```

## Daftar periksa anatomi (cek tiap hasil terhadap atlas)
| Gambar | Yang harus dicek | Kesalahan yang sering muncul pada generator gambar |
|---|---|---|
| Jantung | apeks ke kiri-bawah pasien; aorta keluar dari ventrikel kiri dan melengkung ke kiri pasien; batang pulmonal di **depan** aorta; VCS masuk atrium kanan; RCA di alur AV kanan, LAD di alur interventrikular anterior, sirkumfleks di alur AV kiri | jantung terbalik kiri-kanan; aorta dan arteri pulmonalis tertukar/bertumpuk tanpa logika; pembuluh koroner muncul dari tempat acak; terlalu banyak pembuluh |
| Gigi | enamel hanya di mahkota; dentin membentuk badan gigi; pulpa di tengah dengan foramen apikal; sementum di akar; ligamen periodontal; tulang alveolar kortikal + trabekular; gusi dengan sulkus | lapisan tebal sama rata; pulpa tidak menyambung ke apeks; akar lebih pendek dari mahkota; gigi tidak tertanam di soket |
| Arteri | tiga tunika berurutan: intima (endotel + lamina elastika interna), media (otot polos + lamela elastik, paling tebal), adventisia (kolagen + vasa vasorum) | dinding hanya satu warna; endotel tidak terlihat; media tipis; eritrosit berbentuk bola atau punya inti |
| Darah | eritrosit bikonkaf tanpa inti, paling banyak; neutrofil berinti berlobus, limfosit inti bulat besar, monosit inti ginjal, eosinofil bilobus bergranula oranye; trombosit kecil | leukosit semua sama; trombosit sebesar eritrosit; eritrosit berinti |
| Kulit | epidermis tipis di atas, papila dermis, dermis lebih tebal, hipodermis lemak; folikel + kelenjar sebasea + otot arektor pili; kelenjar keringat ekrin di dermis dalam dengan duktus spiral; dua pleksus pembuluh | lapisan hanya tiga garis; folikel tidak menembus dermis; kelenjar keringat melayang; hipodermis tidak ada |

## Daftar periksa konsistensi gaya (ulangi setelah 5 gambar jadi)
1. Arah cahaya utama sama (kiri atas) dan rim light dingin sama.
2. Latar gelap berlapis teal-navy serupa, partikel jarang dan seragam.
3. Tingkat detail dan kilap jaringan setara; tidak ada gambar yang tampak "kartun" sementara yang lain realistis.
4. Subjek terbaca di ukuran 360 px lebar (tampilan HP); area atas 15% dan bawah 25% kosong.
5. Tidak ada teks, angka, atau logo yang dihasilkan AI (bila ada, buang atau minta regenerasi).

## Sumber anatomi untuk pemeriksaan (rujukan pembanding, belum dibuka ulang di sesi ini)
- Netter FH. *Atlas of Human Anatomy* (jantung, pembuluh koroner, aorta dan percabangannya, kulit).
- Standring S (ed). *Gray's Anatomy: The Anatomical Basis of Clinical Practice* dan Drake RL, et al. *Gray's Anatomy for Students* (jantung, kepala-leher/gigi).
- Moore KL, Dalley AF, Agur AMR. *Clinically Oriented Anatomy* (jantung, hubungan pembuluh besar, alur koroner).
- Ross MH, Pawlina W. *Histology: A Text and Atlas* dan Junqueira LC, Carneiro J. *Basic Histology* (dinding arteri, darah, kulit dan adneksa).
- Nanci A. *Ten Cate's Oral Histology* (enamel, dentin, pulpa, sementum, ligamen periodontal, tulang alveolar, gusi).
- Hoffbrand AV, Moss PAH. *Essential Haematology* atau Hoffman R, et al. *Hematology: Basic Principles and Practice* (morfologi sel darah dan ukuran relatif).
- Pembanding visual 3D untuk gaya: Visible Body, Kenhub, Complete Anatomy (hanya sebagai pembanding bentuk, jangan disalin).

## Penyederhanaan yang perlu dicatat saat evaluasi
- Warna merah/biru adalah konvensi, bukan warna asli jaringan; arteri pulmonalis biru karena membawa darah rendah oksigen.
- Jumlah relatif sel darah disederhanakan (di sediaan nyata eritrosit jauh lebih banyak daripada leukosit dan lebih rapat).
- Ketebalan lapisan kulit dan dinding arteri bervariasi antar-lokasi; gambar hanya mewakili kulit berambut tipis/arteri muskular sedang.
- Gigi: satu tipe gigi satu akar sebagai contoh; gigi lain (molar) punya lebih dari satu akar.
