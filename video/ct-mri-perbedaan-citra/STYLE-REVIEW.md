# Revisi berdasarkan animasi MEDCOEL yang sudah ada

Referensi repo dibaca sebelum mengganti shot, commit `36f2d0a78d8497515e567c1b8be12ce5db4273ae`.

- `brand/video/README.md`, `brand/video/ad/stage-ad.css`, `brand/video/ad/stage-ad.html`, dan `CATATAN-REVISI-V2.md`: palet krem/mint/navy/emas, Plus Jakarta Sans, tag berbingkai dan bayangan tegas, sorotan cincin yang mengikuti tindakan.
- `brand/video/ad/out/medcoel-iklan-75s-v2-FINAL.mp4`: frame referensi memperlihatkan web besar dan overlay kecil; dipakai sebagai identitas visual, bukan sumber suara.
- `video/kopi-kafein-adenosin/README.md`, `stage/lib.js`, `world.js`, `bio.js`, `stage.js`, dan video final: Raka bereaksi di dalam ruang, lalu cut ke dunia mekanisme; molekul, reseptor, dan indikator menunjukkan sebab-akibat, bukan gambar diam dengan zoom.
- `video/malam-lapar/README.md`, `stage/art.js`, `scenes.js`, `stage.js`: karakter kanonik, kartu berbayang, easing, rangkaian aksi dan reaksi.
- Video parasetamol sebelumnya: Raka dari aset kanonik, palet hangat, ruang konsisten dan pembahasan visual selaras dengan narasi.
- `brand/characters/raka/README.md`: karakter tidak digambar ulang. Revisi memakai `rakaSvg()`, `raka()`, `idle()`, dan `lerpState()` dengan sweater harian yang sama.

## Diagnosis versi pertama CT–MRI

Pembuka berhenti bergerak setelah pull-back singkat dan tidak memiliki aksi perhatian berikutnya. Terlalu banyak shot mengulang bingkai scan dengan judul. Arial, kartu navy seragam, dan scanner diagram terpisah tidak mengikuti bahasa animasi seri. Keberhasilan encode dan keterbacaan belum cukup untuk menyatakan animasinya berhasil.

## Keputusan revisi

1. Gunakan font Plus Jakarta Sans asli dari repo, kartu berbayang, navy sebagai warna garis/ruang alat, serta mint/krem sebagai latar pendukung. Cyan dan ungu tetap menjadi penanda kategori CT/MRI.
2. Hook tetap membuka dengan dua citra asli. Raka bereaksi, memandang bergantian, dan menunjuk; cincin/garis sorot menuntun perbandingan tengkorak lalu cairan. Anatomi di citra tidak dianimasikan atau dimorf.
3. Aksi menjelaskan proses: sumber-detektor CT bergerak mengelilingi irisan diam, garis sinar-X berganti arah, hasil data bertambah lalu menjadi citra; MRI menunjukkan penyelarasan model proton, pulsa RF, sinyal ke penerima dan citra.
4. Penanda struktur muncul tepat pada istilah narasi. Diagram sinyal terpisah dari citra medis. T1/FLAIR hanya label pengaturan, tidak diberi citra T2 yang menyamar.
5. Outro memakai rekaman web asli besar pada 1×, sekitar 21 detik; tidak mengklaim fitur MRI di Live 4D Lab. Narasi dan jeda tetap identik dengan linimasa yang sudah disetujui.

`reference/medcoel-lib.js` adalah salinan asli helper easing/properti dari video kopi. Raka dan font disertakan dari sumber repo; sumber dan atribusi dicatat dalam SOURCES.json.
