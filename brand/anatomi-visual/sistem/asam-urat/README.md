# Video "Kenapa asam urat bisa bikin sendi sakit banget?" (51,77 dtk, 1080 x 1920, 30 fps)

Animasi dari kode (SVG per bingkai, Chromium, ffmpeg). Narasi = WAV Google AI Studio dari pemesan (51,16 dtk), **tidak dibuat ulang, tidak diubah, tidak dipercepat** (hanya laju sampel ke 48 kHz saat dicampur); durasi video = narasi + ekor 0,6 dtk, sehingga kartu logo tampil 2,8 dtk (48,97-51,77 dtk). Tokoh: **Raka** (`brand/characters/raka/raka.js`, apa adanya) **tampil tegak (duduk di tempat tidur, tampak depan)**; varian berbaring/miring tidak dipakai. Tidak ada web palsu; penutup hanya logo dan teks.

## Alur dan sinkron dengan narasi
Batas kalimat dari jeda senyap audio (ffmpeg silencedetect, -38 dB, kira-kira 0,05 dtk) dan, bila jeda tak terdeteksi, dari penanda waktu kata pengenalan suara (faster-whisper small; mentah di `transkrip-whisper.json`; ejaan dibetulkan di `waktu.mjs`). Posisi kata di dalam kalimat kira-kira +-0,3 dtk.

| Waktu (dtk) | Narasi | Gambar | Bunyi |
|---|---|---|---|
| 0,0-3,4 | "Kenapa asam urat bisa bikin sendi sakit banget?" | Sudah bergerak sejak bingkai pertama: Raka terbangun (mata terbuka, meringis, keringat), kaki kanan keluar dari selimut dengan sendi pangkal ibu jari merah dan bengkak (tampak dari ujung tempat tidur); kamera menyerbu ke sendi; teks **KENAPA BISA SESAKIT INI?** | desau naik, bloom hangat saat menembus kulit |
| 3,6-7,0 | "Saat tubuh mengurai purin yang berasal dari sel tubuh dan makanan," | Alat penguraian; molekul **purin** muncul (4,54); sel tubuh (5,94) dan makanan (6,60; ikan, daging, kacang, roti, tanpa menonjolkan satu jenis) muncul seimbang dan mengalirkan purin dengan laju sama ke alat | pip tiap muncul |
| 7,44-9,18 | "terbentuk zat bernama urat." | Urat (butir emas) keluar dari alat dan larut dalam plasma darah; label **URAT** (8,60) | tetes kecil |
| 9,62-12,11 | "Biasanya, ginjal membuangnya lewat urin." | Kamera mengikuti darah ke ginjal (**GINJAL**, 10,50); sebagian besar urat keluar lewat ureter ke kandung kemih (**URIN**, 11,40), sebagian tetap di vena | whoosh, aliran |
| 12,45-14,44 | "Kalau kadar urat dalam darah terlalu tinggi," | Grafik sederhana tanpa angka dan tanpa garis ambang: garis kadar naik terus; pembuluh makin ramai butir urat | nada naik pelan |
| 14,98-16,85 | "kristal urat bisa terbentuk di sendi." | Kamera masuk ke penampang sendi MTP pertama: **URAT LARUT** (butir emas dalam cairan sendi) berbeda jelas dari **KRISTAL URAT** (jarum kecil putih-biru yang tumbuh dan mengendap di tulang rawan, membran sinovium, dan dasar kantung sendi) | desau, dentingan kaca kecil |
| 17,48-19,25 | "Tubuh bereaksi terhadap kristal itu." | **SEL PERTAHANAN** keluar dari kapiler dan mendekati kristal | pop lembut |
| 19,53-21,64 | "Akibatnya, sendi bisa tiba-tiba nyeri," | Radang mulai: kapiler melebar dan memerah, sel aktif melepas sinyal; saraf menyala dengan ikon kilat; lencana **NYERI** (21,08) | denyut hangat pelan (naik sampai 24,4), zap |
| 21,91-24,41 | "bengkak, merah, dan terasa hangat." | **BENGKAK** (21,94: kulit dan jaringan menggembung, cairan bertambah), **MERAH** (22,76: jaringan memerah), **HANGAT** (23,94: cahaya jingga dan gelombang panas), tiap lencana tepat pada katanya | pop, swell hangat |
| 25,03-29,64 | "Serangan peradangan ini disebut gout, atau yang sering kita sebut penyakit asam urat." | Kamera keluar ke kaki yang bengkak dan merah, keempat lencana gejala menempel; **GOUT** (26,40) lalu **ASAM URAT** (28,60) | pip |
| 30,07-33,32 | "Pangkal ibu jari kaki sering terkena, tapi sendi lain juga bisa." | Kerangka kaki dengan sendi MTP pertama menyala (**PANGKAL IBU JARI KAKI**); lalu sendi lain menyala (pergelangan kaki, MTP jari lain) dengan ikon lutut dan tangan (**SENDI LAIN**) | pip |
| 34,06-38,92 | "Tapi ingat, hasil tes asam urat yang tinggi tidak otomatis berarti seseorang mengalami gout." | Layar terbagi dua: kartu hasil lab (tabung dan batang, tanpa angka) naik **tinggi di keduanya** (35,2-36,5); teks **URAT TINGGI ≠ OTOMATIS GOUT** (36,50); hanya panel bawah menjadi **SERANGAN RADANG SENDI**, panel atas **TANPA SERANGAN** | naik pendek, pip |
| 39,44-42,95 | "Jadi, yang membuat sendi meradang bukan sekadar angka di hasil lab," | Kartu angka meredup | |
| 43,32-45,98 | "melainkan reaksi tubuh terhadap kristal yang terbentuk." | Panel yang sehat meredup; panel radang disorot pada kristal dan sel | ping |
| 46,74-48,97 | "Belajar cara kerja tubuh lebih seru di MEDCOEL." | Kembali ke Raka pagi hari, tersenyum paham, kaki normal | whoosh |
| 48,97-51,77 | "Gratis di medcoel.com." | Kartu logo MEDCOEL, **Belajar cara kerja tubuh gratis di medcoel.com** | lonceng |

## Anatomi yang digambar (skematis)
- **Kaki (hook dan penutup):** kaki kanan tampak punggung kaki dari ujung tempat tidur; jari mengecil dari ibu jari (medial) ke kelingking (lateral); benjolan merah di pangkal ibu jari = sendi metatarsofalangeal (MTP) pertama.
- **Penampang sagital sendi MTP pertama** (`sendi.mjs`; punggung kaki di atas, telapak di bawah): kepala metatarsal I (bulat) dan dasar falang proksimal ibu jari (cekung), tulang rawan sendi, rongga sendi berisi cairan, kapsul dan membran sinovium berkapiler, tendon ekstensor di punggung, tulang sesamoid pada plantar plate di sisi telapak dengan tendon fleksor di bawahnya, bantalan lemak telapak, kulit. Rongga sendi dan kantung digambar lebih lebar daripada aslinya supaya kristal dan sel terbaca.
- Anatomi dasar sendi MTP pertama (tulang yang bersendi, sesamoid di sisi telapak, kapsul, ligamen, plantar plate) diperiksa lewat ringkasan hasil pencarian web (antara lain Kenhub dan tinjauan RadioGraphics tentang kompleks kapsuloligamen sendi MTP pertama); **halaman lengkapnya tidak dibuka** (host tidak diizinkan di sesi ini). Mekanisme (purin -> urat, ginjal membuang lewat urin, kristal di sendi, reaksi tubuh, nyeri-bengkak-merah-hangat, gout vs urat tinggi) mengikuti narasi; tidak ada sumber literatur yang dibuka.

## Warna dan bahasa visual
Purin = biru-teal (cincin ganda), urat larut = butir emas, kristal urat = jarum kecil putih-biru (panjang tipis, bukan pecahan besar), sel pertahanan = bulat pucat berinti ungu, radang = koral dan jingga hangat. Label berbentuk pil gading bergaya seri; aksen MEDCOEL (hijau, emas).

## Berkas
| Berkas | Fungsi |
|---|---|
| `../scenes/asam-urat.mjs` | Adegan lengkap (kamera, peralihan, label, lencana gejala, kartu logo); `frame(t)` -> SVG |
| `../scenes/asam-urat-cover.mjs` | Cover vertikal |
| `waktu.mjs`, `transkrip-whisper.json` | Waktu kalimat, kata kunci, pembagian adegan; transkrip mentah |
| `bentuk.mjs` | Purin, urat, kristal jarum, sel, makanan, label |
| `kamar.mjs` | Kamar: Raka duduk tegak, selimut, kaki tampak atas dengan sendi meradang |
| `sendi.mjs` | Penampang sendi MTP pertama dengan keadaan: urat larut, kristal, sel, radang, bengkak, merah, hangat, nyeri |
| `tubuh.mjs` | Purin dua sumber -> penguraian -> urat larut; ginjal; grafik kadar |
| `lokasi.mjs`, `bagi.mjs` | Peta sendi; layar terbagi |
| `bunyi.mjs`, `bunyi.json`, `audio.py` | Daftar efek dari waktu kata; campuran audio |
| `render.mjs`, `cover/` | Render bingkai; `cover.png`, `cover-profil-3x4.png`, `cover-panduan-area-aman.png` |

## Musik dan efek (lisensi)
Semua **disintesis dari kode** (`audio.py`), tanpa sampel atau musik pihak ketiga, tanpa suara seram.
| Judul | Isi | Pembuat | Lisensi |
|---|---|---|---|
| **MEDCOEL Sendi Hangat** | Instrumental 84 BPM: pad hangat, pluck lembut; Fmaj7 / Dm7 / Bbmaj7 / C6; pelan di bawah narasi dan menyusut saat narator bicara | Dibuat untuk MEDCOEL pada sesi pembuatan video ini | CC0 1.0 (domain publik): boleh dipakai komersial dan di Instagram tanpa atribusi |
| **MEDCOEL Kristal dan Radang** | desau kamera, pip label, tetes urat, dentingan kristal, pop sel, denyut hangat peradangan, zap saraf, lonceng penutup | idem | CC0 1.0 |

## Membuat ulang
```bash
cd <akar repo>
node brand/anatomi-visual/sistem/asam-urat/bunyi.mjs > brand/anatomi-visual/sistem/asam-urat/bunyi.json
for r in "0 390" "390 780" "780 1170" "1170 1553"; do set -- $r; node brand/anatomi-visual/sistem/asam-urat/render.mjs bingkai <dir> $1 $2 & done; wait   # 1553 bingkai
python3 brand/anatomi-visual/sistem/asam-urat/audio.py <narasi.wav> <campur.wav>
ffmpeg -framerate 30 -i <dir>/f%05d.png -i <campur.wav> -af "alimiter=limit=0.95:attack=2:release=50,loudnorm=I=-14:TP=-1.5:LRA=11" -c:v libx264 -pix_fmt yuv420p -crf 18 -c:a aac -b:a 192k -ar 48000 -t 51.76 -movflags +faststart asam-urat-kenapa-sakit.mp4
node brand/anatomi-visual/sistem/asam-urat/render.mjs still <dir> 0 --organ=asam-urat-cover    # cover
```

## Hasil pemeriksaan (`../out/asam-urat-kenapa-sakit.mp4`)
- ffprobe: H.264 1080 x 1920, 30 fps, 51,77 dtk, AAC stereo 48 kHz; -14,3 LUFS terintegrasi, puncak sampel -1,3 dBFS.
- Bergerak sejak bingkai pertama (selisih bingkai 0 ke 10 = 12,7 dari 255). Lompatan terbesar pada bloom hangat saat kamera menembus kulit (3,5-3,8 dtk) dan peralihan ke sendi (14,7 dtk); tanpa lonjakan lain.
- Setiap visual kunci dipicu dari waktu kata narasi yang sama dengan daftar efek bunyi; seluruh video ditonton lewat lembar kontak 1,5 bingkai per dtk dan tampilan 360 px (`../out/asam-urat-kontak-360px.png`, `../out/asam-urat-still-*.png`, `../out/asam-urat-cover-vs-awal-360px.png`).

## Kekurangan yang diketahui
- **Bunyi belum didengarkan** oleh saya; level dan waktu efek diperiksa dari angka, bukan dengan telinga.
- **Posisi kata** dari pengenalan suara kira-kira +-0,3 dtk; visual yang dipicu kata tertentu (mis. "nyeri", "bengkak", "merah", "hangat") bisa terlambat atau mendahului sekitar sepertiga detik. Kristal mulai tumbuh 0,27 dtk setelah kata "kristal".
- **Anatomi skematis dan belum divalidasi atlas atau tenaga medis**: rongga dan kantung sendi diperlebar; jumlah kristal, sel, dan butir urat tidak mewakili jumlah sebenarnya; rincian ligamen dan plantar plate disederhanakan; reaksi sel pertahanan digambar sebagai sel bulat yang mendekat dan melepas sinyal (tanpa mekanisme molekuler). Tulang tangan, lutut, dan kerangka kaki di peta sendi sangat disederhanakan.
- **Kaki dan Raka**: kaki dilihat dari ujung tempat tidur dengan perspektif datar; jari-jari berbentuk kapsul; Raka hanya diberi ekspresi bangun dari tidur (mata terbuka, alis dan keringat), bukan gerak badan penuh.
- **Layar terbagi**: panel "tanpa serangan" menampilkan sendi dengan urat larut tanpa kristal; hasil urat tinggi juga bisa disertai kristal tanpa gejala, tetapi itu tidak digambarkan. Kartu hasil lab tidak berisi angka dan tidak menyiratkan diagnosis.
- **Grafik kadar urat** tanpa angka, tanpa garis ambang, dan tanpa sumbu berlabel selain panah arah.
- Lencana gejala di sendi dan di kaki memakai ikon kecil (kilat, panah keluar, tetes, gelombang panas) yang kurang terbaca di lebar 360 px.
- Tidak ada rekaman situs MEDCOEL di penutup; hanya logo dan teks.
