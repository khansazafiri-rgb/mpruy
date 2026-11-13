# Video "Bunyi tensi dari mana?" (bunyi Korotkoff), 45,96 dtk, 1080 x 1920, 30 fps

Animasi dari kode (SVG per bingkai, dirender Chromium, dienkode ffmpeg). Narasi = berkas WAV Google AI Studio dari pemesan (43,16 dtk), **tidak dibuat ulang, tidak dipercepat, tidak diubah** (hanya laju sampel diubah ke 48 kHz saat dicampur). Durasi = narasi + kartu penutup 2,8 dtk. Tokoh: **Raka** dari `brand/characters/raka/raka.js` (apa adanya; tidak digambar ulang). Jantung: v7 (tidak diubah, dipakai kecil).

Bunyi yang didengar disebut **bunyi Korotkoff**. Teks di layar hanya tiga: pertanyaan pembuka, dan dua momen pembacaan ("BUNYI PERTAMA → SISTOLIK", "BUNYI HILANG → DIASTOLIK"), ditambah kartu penutup. Tidak ada angka tekanan darah di layar (jarum pengukur tanpa angka skala).

## Alur dan sinkron dengan narasi
Batas kalimat diukur dari jeda senyap audio (ffmpeg silencedetect, -38 dB, ketelitian kira-kira 0,05 dtk). Teks kalimat dari pengenalan suara (faster-whisper small, bahasa Indonesia; hasil mentah `transkrip-whisper.json`, ejaan dibetulkan di `waktu.mjs`).

| Waktu (dtk) | Kalimat narasi | Gambar | Bunyi |
|---|---|---|---|
| 0,0-1,3 | (sebelum narasi mulai; narator menarik napas) | Sudah bergerak sejak bingkai pertama: kamera menarik mundur, Raka menempelkan stetoskop ke lipatan siku, pengukur besar di bawah dengan jarum turun | |
| 1,40 dan 2,28 | "…bunyi **duk**… **duk**…" | Dua ketukan: kepala stetoskop memantul + riak emas, jarum bergetar, alis Raka naik | Dentum lembut tepat pada awal tiap "duk" yang diucapkan narator |
| 2,9-4,7 | "…saat mengukur tensi manual?" | Kamera mendekat ke lengan | |
| 4,74-6,9 | "Sebenarnya itu bunyi apa?" | Teks **BUNYI INI DARI MANA?**; Raka bingung | pip kecil |
| 6,96-9,7 | "Saat manset dipompa, arteri di lengan tertekan." | Raka memompa bola (tiga remasan, 7,30/7,72/8,14), jarum naik, manset menggembung; kamera masuk ke lengan dan penampang memanjang terbuka dengan sapuan emas (8,36-9,30); arteri terjepit di bawah manset | tiga desis pompa, whoosh halus |
| 10,28-13,19 | "Ketika tekanannya masih tinggi, belum ada ketukan yang terdengar." | Gelombang denyut tiba dari jantung (kiri), berhenti di manset; kantong arteri di hulu menggembung; jejak bunyi stetoskop datar | tidak ada ketukan |
| 13,99-15,77 | "Lalu, manset dikempiskan perlahan." | Tekanan manset turun (jarum turun, kantung mengempis) | desis katup sangat pelan |
| 16,35-19,76 | "Setiap denyut jantung mulai menggerakkan bagian arteri yang masih tertekan." | Dinding arteri yang terjepit bergetar halus tiap denyut (16,8 dan seterusnya); lupa (kaca pembesar) menunjukkan tepi distal manset | |
| 20,46-24,48 | "Getarannya merambat melalui jaringan, lalu terdengar lewat stetoskop sebagai ketukan." | Riak getaran merambat dari tepi manset melalui jaringan ke diafragma; getaran awal mereda sebelum sampai | **24,00: ketukan pertama** pada kata "ketukan" |
| 24,05-25,95 | (jeda antarkalimat) | **Momen pertama dibeku** 1,9 dtk: diafragma memantul, arteri terbuka di tepi manset, jarum disorot cincin emas, sekitar meredup | gema kecil, musik mengecil |
| 25,63-29,7 | "Ketukan pertama menjadi patokan angka atas, tekanan sistolik." | Label **BUNYI PERTAMA → SISTOLIK**; penanda emas pada jarum | pip; lalu ketukan mengikuti denyut (26,7; 27,5; 28,3; …) |
| 29,73-32,11 | "Saat manset makin longgar, ketukannya menghilang." | Arteri makin lama terbuka tiap siklus; ketukan melemah; ketukan terakhir hampir tak terdengar (31,5); setelah itu arteri terbuka sepanjang siklus, aliran kontinu | ketukan melemah, lalu hening |
| 32,70-35,69 | "Di titik itulah angka bawah, tekanan diastolik, dibaca." | Label **BUNYI HILANG → DIASTOLIK**; penanda hijau pada jarum; kedua penanda dan busur penghubung tampil pada satu pengukur | pip |
| 36,69-39,68 | "Jadi, saat mengukur tensi manual, perhatikan dua momen." | Kedua penanda berdenyut bergantian pada "dua momen" | |
| 40,13-42,84 | "Bunyi pertama muncul, lalu bunyinya hilang." | Kembali ke Raka yang mengerti (mata tersenyum); penanda emas berdenyut pada "bunyi pertama muncul", penanda hijau pada "bunyinya hilang" | satu "duk" kecil |
| 43,16-45,96 | (penutup, 2,8 dtk) | Logo MEDCOEL, "Belajar FK gratis di medcoel.com" | lonceng lembut |

## Mekanisme yang digambar (skema, bukan simulasi)
`fisika.mjs` adalah satu sumber untuk gambar dan bunyi:
- Tekanan arteri di dekat manset berdenyut antara dua nilai (diastolik dan sistolik); manset menekan paling kuat di tengah dan meruncing di tepi distal.
- Arteri terbuka di suatu titik hanya bila tekanan arteri melebihi tekanan manset di titik itu. **Tekanan manset di atas sistolik**: arteri terjepit, gelombang denyut tiba lalu berhenti, tidak ada bunyi. **Di antara sistolik dan diastolik**: arteri terbuka sebentar tiap puncak denyut, dinding dan jaringan sekitarnya bergetar dan getarannya merambat ke diafragma (ketukan), kuat di tengah rentang lalu melemah. **Di bawah diastolik**: arteri terbuka sepanjang siklus, aliran kontinu, tidak ada ketukan.
- Bunyi **tidak** digambarkan sebagai darah yang menabrak stetoskop; yang digambar adalah gerak dinding arteri dan getaran jaringan.
- Kepala stetoskop di atas arteri dekat lipatan siku, tepat di bawah (distal) tepi manset; manset melingkari lengan atas (penampang menunjukkan kantung udara atas dan bawah yang menekan jaringan).

## Berkas
| Berkas | Fungsi |
|---|---|
| `../scenes/korotkoff.mjs` | Adegan: kamera, Raka, penampang, pengukur besar, jejak bunyi, lupa, label, penutup. `frame(t)` -> SVG |
| `../scenes/korotkoff-cover.mjs` | Cover vertikal |
| `waktu.mjs`, `transkrip-whisper.json` | Waktu kalimat dan peristiwa kunci; transkrip mentah |
| `fisika.mjs`, `ketukan.json` | Model tekanan/denyut/bukaan; daftar ketukan terdengar (dibaca `audio.py`; buat ulang: `node fisika.mjs > ketukan.json`) |
| `lengan.mjs` | Tampak luar dan penampang memanjang lengan, manset, riak getaran |
| `alat.mjs` | Pengukur tekanan (tanpa angka) dengan dua penanda, jejak bunyi, label, jantung mini v7 |
| `audio.py` | Narasi + musik + efek -> WAV |
| `render.mjs` | Render bingkai (`still`, `bingkai`); `--organ=korotkoff-cover` untuk cover |
| `cover/` | `cover.png`, `cover-profil-3x4.png`, `cover-panduan-area-aman.png` |

## Musik dan efek bunyi (lisensi)
Semua **disintesis dari kode** (`audio.py`, numpy/scipy); tanpa sampel, rekaman, atau musik pihak ketiga; tanpa alarm rumah sakit.
| Judul | Isi | Pembuat | Lisensi |
|---|---|---|---|
| **MEDCOEL Pembuluh Tenang** | Instrumental 75 BPM: pad bersih, pluck kaca tenang, nada bas lembut per bar; progresi C maj9 / Am9 / F maj7 / G6; masuk setelah dua "duk" pembuka, mengecil saat momen beku, mekar sesudah bunyi hilang, akor penutup | Dibuat untuk MEDCOEL pada sesi pembuatan video ini | CC0 1.0 (domain publik): boleh dipakai komersial dan di Instagram tanpa atribusi |
| **MEDCOEL Ketukan Korotkoff** | "duk" (dentum rendah lembut + resonansi diafragma), desis pompa, pip label, lonceng penutup, whoosh halus, desis katup sangat pelan | idem | CC0 1.0 |
Catatan: sintesis sederhana (bukan produksi studio). Narasi dominan (sekitar -19 LUFS mentah; musik sekitar 12 dB di bawahnya, mengecil lagi di bawah suara narator).

## Membuat ulang
```bash
cd <akar repo>
node brand/anatomi-visual/sistem/korotkoff/fisika.mjs > brand/anatomi-visual/sistem/korotkoff/ketukan.json
for r in "0 345" "345 690" "690 1035" "1035 1380"; do set -- $r; node brand/anatomi-visual/sistem/korotkoff/render.mjs bingkai <dir> $1 $2 & done; wait   # 1380 bingkai, 4 proses
python3 brand/anatomi-visual/sistem/korotkoff/audio.py <narasi.wav> <campur.wav>
ffmpeg -framerate 30 -i <dir>/f%05d.png -i <campur.wav> -af "alimiter=limit=0.95:attack=2:release=50,loudnorm=I=-14:TP=-1.5:LRA=11" -c:v libx264 -pix_fmt yuv420p -crf 18 -c:a aac -b:a 192k -ar 48000 -t 45.96 -movflags +faststart korotkoff-bunyi-tensi.mp4
node brand/anatomi-visual/sistem/korotkoff/render.mjs still <dir> 24.05 --organ=korotkoff     # satu bingkai uji
```
Untuk sinkron memakai narasi lain: ganti waktu di `waktu.mjs` (KALIMAT, EV) lalu ulangi langkah di atas.

## Hasil pemeriksaan (`../out/korotkoff-bunyi-tensi.mp4`)
- ffprobe: H.264 1080 x 1920, 30 fps, 45,97 dtk, AAC stereo 48 kHz; -14,9 LUFS terintegrasi, puncak sampel -1,3 dBFS.
- Bergerak sejak bingkai pertama: kamera menarik mundur, stetoskop dipasang oleh Raka, jarum turun (selisih bingkai 0 ke 10 = 2,2 dari 255 pada skala abu-abu; 0,4 sebelum perbaikan).
- Sinkron diperiksa per bingkai: kepala stetoskop mulai memantul pada bingkai 43 (1,43 dtk; "duk" pertama narator 1,403 dtk) dan pada bingkai 720 (24,00 dtk; ketukan pertama terdengar 24,00 dtk); label sistolik muncul pada 25,63 dtk ("Ketukan pertama"), label diastolik pada 32,70 dtk ("Di titik itulah angka bawah"); bunyi pertama dan terakhir pada jejak bunyi sama dengan daftar ketukan audio (satu sumber `ketukan.json`).
- Hasil gambar diperiksa lewat lembar kontak 2 bingkai per dtk dan tampilan 360 px (`../out/korotkoff-kontak-360px.png`, `../out/korotkoff-still-*.png`, `../out/korotkoff-cover-vs-awal-360px.png`). Lompatan antarbingkai terbesar: 12,8 dari 255 pada sapuan kembali ke Raka (40,0 dtk), 11,2 pada kartu penutup, 9,9 saat momen beku dilepas (25,83 dtk); tanpa lonjakan lain.
- Teks layar: hanya tiga (pertanyaan, label sistolik, label diastolik) + kartu penutup; label kecil "SISTOLIK" dan "DIASTOLIK" pada pengukur adalah penanda dari dua momen itu.

## Kekurangan yang diketahui
- **Bunyi belum didengarkan oleh saya**; ketepatan waktu bunyi diperiksa dari daftar ketukan, bentuk gelombang, dan bingkai, bukan dengan telinga. Dentum "duk" bersifat sintetis; pada bunyi "duk" pembuka, dentum efek jatuh bersamaan dengan "duk" yang diucapkan narator sehingga terdengar menebal.
- **Penyelarasan narasi**: batas kalimat dari jeda senyap (kira-kira 0,05 dtk); kata di dalam kalimat dari pengenalan suara (faster-whisper small) yang salah mengeja beberapa kata ("artery", "dengut", "statuskop", "moment"), sehingga posisi kata di dalam kalimat kira-kira +-0,3 dtk. Ketukan pertama ditempatkan pada kata "ketukan" di akhir kalimat ke-7 (24,00 dtk).
- **Momen beku 1,9 dtk** memperpanjang adegan di atas narasi yang terus berjalan; selama itu hanya sorotan, redup, dan riak pada diafragma yang tampak diam.
- **Anatomi skematis dan belum divalidasi atlas**: lapisan jaringan (kulit, lemak, otot, tulang lengan atas), ketebalan, jalur arteri yang naik ke dekat kulit di lipatan siku, ukuran arteri (digambar sekitar 2-3 kali lebih besar agar terbaca), dan vena kecil hanya digambar menyerupai; letak persis kepala stetoskop dan tepi manset sesuai prinsip pemasangan, bukan ukuran. Tidak ada sumber literatur yang dibuka untuk video ini; isi mengikuti narasi dan deskripsi pemesan. Belum ditinjau tenaga medis.
- **Model fisika disederhanakan**: satu gelombang denyut, tekanan manset dianggap menurun linear, ketukan lemah-keras-lemah mengikuti satu fungsi; fase bunyi Korotkoff I-V tidak dipisahkan. Getaran dinding sebelum ketukan pertama (16,8-23,9 dtk) adalah penyederhanaan visual: dinding yang terjepit bergetar halus dan riaknya mereda sebelum mencapai diafragma, belum terdengar.
- Posisi jarum pada ketukan pertama dan bunyi hilang adalah posisi skematis, bukan hasil pengukuran; skala jarum tanpa angka.
- Tangan Raka: lengan kiri meregang melengkung ke stetoskop dan selang telinga digambar sederhana; tangan kanan hanya diletakkan di dekat bola pompa.
- Lupa (kaca pembesar) menyalin lapisan penampang yang sama; garis tepinya kadang tampak bergerigi di bidang kecil.
- Bagian atas layar pada adegan penampang lebih kosong (zona antarmuka aplikasi); jantung mini dan lupa mengisinya.
- Kartu penutup hanya logo dan teks (tidak ada cuplikan web).
- Model pengenalan suara diunduh dari Hugging Face sehingga jaringan sesi harus membuka beberapa host (`huggingface.co`, `us.aws.cdn.hf.co`, dll.); model tidak ikut di-commit.
