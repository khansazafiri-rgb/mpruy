# Video: "Nyeri dada mendadak. Ada hubungannya dengan LDL?" (1080 x 1920, 30 fps, 72,24 dtk)

Video edukasi MEDCOEL: Raka naik tangga, dadanya tertekan, berkeringat dingin, lalu jatuh terduduk; kamera masuk ke jantung dan arteri koroner; kemudian visual diputar ke masa sebelumnya untuk memperlihatkan bagaimana LDL masuk dan tertahan di dinding arteri, sel imun merespons, plak terbentuk, menyempitkan lumen, dan kemungkinan pecah sehingga terbentuk bekuan. Ditutup dengan respons klinis (IGD) dan pencegahan.

Narasi: `audio/narator.wav` (rekaman Gemini TTS dari pemesan, 72,24 dtk; **tidak dipotong, dipercepat, atau diubah**). Tag `<breath>` dan `<short pause>` tidak diucapkan dan tidak tampil sebagai teks. Musik: pad lembut + beat lambat sangat tipis (72 BPM), tanpa crowd, diturunkan saat narasi bicara (`audio/audio_mix.py`).

## Hasil
| Berkas | Isi |
|---|---|
| `medcoel-nyeri-dada-ldl.mp4` | Video jadi (H.264 + AAC, sekitar -14 LUFS) |
| `cover/cover.png` | Cover 1080 x 1920 khusus (bukan bingkai pertama): judul "NYERI DADA MENDADAK. ADA HUBUNGANNYA DENGAN LDL?", Raka menekan dada, penampang arteri dengan plak dan bekuan |
| `cover/cover-panduan-area-aman.png` | Cover dengan garis area aman TikTok/Reels (atas 250 px, bawah 480 px, kanan 140 px) |
| `cover/cover-profil-3x4.png` | Cover dengan potongan 3:4 (kisi profil) ditandai |
| `cover/cover-bersama-awal-video-360px.png` | Cover dan bingkai pertama pada lebar layar 360 px |
| `still/` | 17 still adegan penting (1080 x 1920), `awal-tengah-akhir-360px.png`, `lembar-360px.png` |
| `aset/*.svg` | Aset berlapis yang dapat diedit (SVG mandiri) |
| `stage/`, `render.mjs`, `audio/`, `cover/` | Kode sumber animasi dan alat render |

## Urutan adegan (mengikuti narasi; waktu dari ASR `audio/asr.json`)
| Waktu | Adegan |
|---|---|
| 0,0 - 8,0 | Raka sudah bergerak menaiki tangga sejak bingkai pertama; dada terasa tertindih (tangan menekan dada, melambat), keringat dingin, lalu lutut menekuk dan jatuh terduduk di anak tangga |
| 7,9 - 12,6 | Kamera masuk ke dada: jantung (aset jantung MEDCOEL v7) berdenyut, "Bisa jadi serangan jantung", arteri koroner (LAD); area otot di hilir penyumbatan saja yang ditandai kekurangan darah |
| 11,6 - 17,0 | Menyelam ke dalam arteri koroner: plak dan bekuan menghambat aliran di satu cabang; chip "Kolesterol LDL tinggi" |
| 17,0 - 19,9 | "Bagaimana angka kolesterol di hasil lab bisa berakhir seperti ini?": lembar profil lipid (LDL ditandai naik), jam putar balik; bekuan, ruptur, dan plak surut mundur ke arteri sehat ("Bertahun-tahun sebelumnya") |
| 21,0 - 23,8 | "Kolesterol sebenarnya dibutuhkan tubuh": kamera mengikuti satu partikel LDL (cangkang fosfolipid, inti kolesterol, apoB); kartu membran sel, hormon, vitamin D |
| 23,8 - 27,6 | LDL masuk lewat celah endotel dan tertahan DI DINDING (intima); LDL teroksidasi |
| 27,6 - 33,0 | Monosit menempel, menembus endotel, menjadi makrofag, memakan LDL menjadi sel busa; peradangan; plak mulai terbentuk |
| 33,0 - 36,5 | "Bertahun-tahun tanpa gejala": pita waktu, plak tumbuh pelan, Raka sehat berjalan (tanpa gejala) |
| 36,5 - 40,2 | Plak menyempitkan lumen; panel otot jantung di hilir menerima lebih sedikit aliran (oksigen berkurang, otot meredup) |
| 40,2 - 44,4 | Penanda "Kejadian akut: menit sampai jam": tudung plak pecah, trombosit menempel, bekuan membesar sampai menutup lumen |
| 44,4 - 51,9 | Kembali ke Raka duduk: nyeri dada menekan, keringat dingin atau sesak; Tala datang, menelepon, papan IGD |
| 51,3 - 55,0 | "Jangan menunggu hasil tes kolesterol": lembar lab dan jam pasir dicoret; ambulans menuju IGD |
| 54,6 - 62,9 | Pencegahan: periksa profil lipid, batasi lemak jenuh (porsi, bukan penyebab tunggal), aktif bergerak, hindari rokok |
| 62,4 - 66,0 | Dokter menilai apakah perlu obat |
| 65,6 - 69,0 | "Kolesterol tinggi sering tidak terasa": Raka berjalan santai, jendela memperlihatkan plak yang diam-diam ada |
| 68,4 - 72,2 | Penutup: kenali risikonya sebelum keadaan darurat; logo MEDCOEL |

## Aturan isi yang dijaga
- Jatuh terduduk **bukan** digambarkan sebagai gejala khas kolesterol tinggi; narasi dan label menyebutnya "bisa jadi serangan jantung" (kemungkinan), bukan diagnosis. Kolesterol tinggi sendiri digambarkan sering tanpa gejala (adegan 33 dan 65 dtk).
- LDL tidak digambar sebagai gumpalan yang menyumbat pembuluh. LDL selalu partikel kecil; yang menutup lumen adalah **bekuan** (trombosit, fibrin, sel darah) setelah tudung plak pecah.
- Penyumbatan hanya di SATU cabang koroner; pembuluh lain dan aliran normal tetap digambar mengalir. Hanya area otot di hilir yang diberi tanda kekurangan darah.
- Proses bertahun-tahun (pita waktu, jam putar balik) dibedakan dari kejadian akut (penanda "menit sampai jam", peralihan cepat).
- Makanan berlemak tidak dijadikan penyebab tunggal: kartu "batasi lemak jenuh" menampilkan porsi (gorengan dibatasi, ikan dan sayur di piring).
- Label maksimum 3 sekaligus; teks chip 40 px (setara sekitar 13 px pada lebar 360 px).

## Penyederhanaan (disengaja) dan batasan
- **Skala:** LDL, sel darah merah, sel imun, plak, dan bekuan digambar dalam ukuran yang tidak sesuai skala nyata agar terbaca di ponsel.
- Penampang arteri adalah **potongan memanjang skematis**, bukan histologi; lapisan dinding (endotel, intima, media, adventitia) dan tudung fibrosa/inti lemak disederhanakan.
- Jantung memakai aset anatomi MEDCOEL (`brand/anatomy-style/jantung7-aset.mjs`) apa adanya; letak penyumbatan LAD dan area otot hilir adalah penanda ilustratif.
- Isi **belum ditinjau tenaga medis**.
- **Rujukan medis yang diminta** (American Heart Association: tanda serangan jantung; NHLBI: penyebab serangan jantung; NHLBI: gejala kolesterol darah) **tidak dapat dibuka dari sesi pembuatan** (host tidak diizinkan oleh jaringan sesi), sehingga isi belum dicocokkan langsung dengan halamannya. Isi mengikuti pengetahuan umum yang sejalan dengan naskah final; tolong diverifikasi terhadap ketiga rujukan sebelum dipublikasikan.
- Raka duduk di tangga memakai kaki berengsel lutut (IK) buatan video ini karena rig kaki bawaan tidak mendukung lutut ditekuk; kaki dikunci pada permukaan anak tangga (telapak = posisi dunia).

## Merender ulang
```bash
cd <akar repo>
python3 -m http.server 8128 --bind 127.0.0.1 &                                   # server statis
python3 video/nyeri-dada-ldl/audio/asr.py narator                                 # (opsional) ASR baru; jalankan dari audio/
ffmpeg -y -i video/nyeri-dada-ldl/audio/narator.wav -ar 44100 -ac 1 video/nyeri-dada-ldl/audio/nar44.wav
python3 video/nyeri-dada-ldl/audio/audio_mix.py                                   # musik + SFX + mix
node video/nyeri-dada-ldl/render.mjs video/nyeri-dada-ldl/frames 0 2167 4         # 2168 bingkai JPEG (4 pekerja)
ffmpeg -y -framerate 30 -i video/nyeri-dada-ldl/frames/f%05d.jpg -i video/nyeri-dada-ldl/audio/mix.wav \
  -c:v libx264 -crf 20 -pix_fmt yuv420p -c:a aac -b:a 192k -af loudnorm=I=-14:TP=-1.5:LRA=11 -shortest video/nyeri-dada-ldl/medcoel-nyeri-dada-ldl.mp4
node video/nyeri-dada-ldl/cover/render-cover.cjs                                  # cover.png dan variasinya
node video/nyeri-dada-ldl/aset/ekspor.cjs                                         # aset SVG yang dapat diedit
node video/nyeri-dada-ldl/shot.cjs "t=36.1" satu.png                              # satu bingkai; ?V=1&t=..&S=..&cx=..&cy=.. untuk dunia pembuluh
```

## Struktur kode (`stage/`)
- `stage.js` - `master(t)`: jadwal adegan + crossfade; `renderFrame(t)` deterministik (tanpa keadaan); `window.asetSvg(nama)` untuk ekspor aset.
- `stairs.js` - tangga, Raka naik (`climb`), nyeri dada, jatuh terduduk (`rakaS1`), kaki berengsel lutut (`legsSvg`).
- `heart.js` - jantung dari aset MEDCOEL, denyut, penanda penyumbatan LAD, area otot hilir.
- `vessel.js` - dunia pembuluh: dinding berlapis, plak, endotel, aliran darah, LDL, makrofag, sel busa, tudung pecah, bekuan, patogenesis (agen berjadwal).
- `scenes.js` - kamera dunia pembuluh, label, lembar lab, jam putar balik, kartu fungsi kolesterol, pita tahun, otot jantung.
- `scenes2.js` - Raka duduk dan Tala menelepon, IGD, ambulans, kartu pencegahan, dokter, berjalan, penutup.
- `art.js` (gradien, filter, chip/tag), `core.js` (easing, `pchip`), `bg.js` (latar MEDCOEL), `raka.js` (pembungkus Raka asli).
