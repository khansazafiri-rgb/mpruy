# Sumber, bahan, dan lisensi

## Dasar medis (dibaca saat pembuatan)
- **FDA, label EpiPen/EpiPen Jr** (https://www.accessdata.fda.gov/drugsatfda_docs/label/2026/019430s120lbl.pdf), bagian 1, 2, 5, 12.1: obat untuk pengobatan darurat reaksi alergi tipe I termasuk anafilaksis; agonis reseptor alfa dan beta adrenergik; suntikan ke sisi anterolateral paha; **jangan** disuntik intravena, ke bokong, jari, tangan, atau kaki; pasien perlu diingatkan mencari bantuan medis darurat untuk pemantauan ketat episode anafilaksis; epinefrin adalah terapi lini pertama anafilaksis. Mekanisme (12.1): aksi pada reseptor alfa mengurangi vasodilatasi dan peningkatan permeabilitas vaskular yang dapat menyebabkan hilangnya volume cairan intravaskular dan hipotensi; aksi pada reseptor beta menyebabkan relaksasi otot polos bronkus dan membantu meredakan bronkospasme, mengi, dan sesak. (Efek beta 1 pada jantung disebut di naskah pemesan; label menyebut efek kardiostimulasi epinefrin pada bagian interaksi obat.)
- **AAAAI, Anaphylaxis** (https://www.aaaai.org/tools-for-the-public/conditions-library/allergies/anaphylaxis): reaksi alergi serius yang biasanya cepat dan dapat fatal; urtikaria, bengkak, gejala napas, tekanan darah rendah/pingsan; segera cari pertolongan medis.
- **AAAAI, Epinephrine Myths vs Facts** (https://www.aaaai.org/tools-for-the-public/conditions-library/allergies/epinephrine): antihistamin tidak pernah menggantikan epinefrin; epinefrin satu-satunya obat yang mengatasi gejala serius (napas, tekanan darah, tenggorokan, suara). **Catatan:** AAAAI juga menyebut bahwa pada keadaan tertentu tidak selalu perlu ke IGD setelah epinefrin (mis. gejala hilang sepenuhnya dan ada syarat lain). Video mengikuti naskah pemesan dan label FDA ("segera cari bantuan medis; perlu dinilai dan dipantau") tanpa merinci pengecualian; pemesan boleh menambahkan nuansa ini.
- Tidak ada dosis, merek, atau teknik aktivasi spesifik produk di video. Pena digambar generik (tanpa merek), dengan label "desain pena berbeda antarproduk" dan "ilustrasi mekanisme autoinjektor"; ukuran ±15 cm hanya sebagai ukuran ilustrasi.

## Bahan
| Bahan | Hasil |
|---|---|
| Audio narasi | `audio/narasi-edukasi.wav` dari pemesan (Google AI Studio, 24 kHz mono, 59,08 dtk), SHA-256 `529e4fe86e43f5acbb1116a2c6cb686ff8e28c27ec59a86298a3d10c244f993e`. Dipakai apa adanya (hanya di-resample ke 48 kHz); tidak ada narator pengganti. ASR menulis "anafilaxis", "Pembunuh darah" (untuk "pembuluh"), "paham" (untuk "paha"), "alpha/receptor" (kesalahan ASR; takarir memakai naskah). |
| Outro | `brand/video/outro/medcoel-outro-master.mp4` ditempel utuh (README outro dibaca): korelasi audio 0,9994 dan gambar identik pada bagian akhir. Tidak ada teks/musik/CTA tambahan di atasnya. |
| Raka | `brand/characters/raka/raka.js` lewat `stage/raka.js` (README karakter dibaca): tegak, tidak digambar ulang, ekspresi khawatir/berpikir/menunjuk/senang/lega. Tampil sebagai **pengamat** di pita bawah layar pada hampir semua adegan, di adegan bantuan medis, dan di cover. Raka bukan pasien. |
| Tokoh lain | "Orang yang mengalami reaksi" dan "petugas medis" digambar dari kode (`stage/orang.js`), proporsi dewasa (kepala ± 22 cm, bahu 40 cm, paha 17 cm, pena 15 cm pada skala 9 px = 1 cm di adegan paha). Bukan Raka dan bukan pasien web MEDCOEL. |
| Acuan gaya | `video/spo2-pulse-oximeter/spo2-pulse-oximeter_final.mp4` ditinjau (alat -> bagian dalam -> akibat); tidak ada objek/adegan/audio yang disalin. |
| Logo | `apps/web/src/assets/logo-full.webp` (salinan `stage/logo-full.webp`), hanya di cover. |
| Gambar lain | Semua ilustrasi digambar dari kode (SVG): kulit, sel imun, pembuluh, saluran napas, jantung, pena. Tanpa foto, merek, atau aset pihak ketiga. |

## Peta warna tetap
alergen hijau (#7BC043) | mediator imun ungu (#8E6BFF; bulat = histamin, belah ketupat = mediator lain) | pembuluh darah koral (#F2685B) | jalan napas biru tua (#1D4E89) | adrenalin emas (#FFC93C) | alfa oranye (#FF8A3D) | beta 2 sian (#2EC4B6) | beta 1 magenta (#E0408F). Warna selalu disertai label teks.

## Musik dan efek (lisensi)
Musik (pad + pluck lembut, 90 BPM, Am-F-C-G) dan semua aksen (pop bentol, snap alergen menempel, tetes mediator, whoosh pembuluh/saluran napas, nada rendah lembut untuk tekanan turun dan bronkus menyempit, klik halus + whoosh saat pena bekerja, chime untuk alfa/beta 2/beta 1) **disintesis sendiri** dengan numpy/scipy di `audio/build_audio.py`: tanpa sampel pihak ketiga, **CC0 / domain publik**, aman untuk promosi Instagram/TikTok. Tidak ada alarm keras dan bunyi suntikan dibuat lembut; aksen turun otomatis di bawah suara.

_Salinan mentah halaman/PDF sumber yang saya baca saat pembuatan disimpan lokal di `sumber/` dan **tidak di-commit** (hak cipta pihak ketiga dan ukuran); tautan dan kutipan ringkas ada di atas._
