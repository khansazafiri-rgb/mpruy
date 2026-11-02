# Apa bedanya introvert & ekstrovert? (Reels/TikTok 1080 x 1920, 30 fps, 108,7 detik)

Video animasi Raka + Tala (teman Raka) + Kori (maskot MEDCOEL sebagai pemandu) tentang kecenderungan introversi/ekstroversi di spektrum, lalu penelitian tentang sistem pemrosesan imbalan dan dopamin.
Suara satu-satunya adalah MP3 narator yang diberikan (`audio/narator.mp3`), tidak diubah isi, kecepatan, atau nadanya; musik ringan dan SFX jarang ditambahkan di bawahnya (disintesis numpy, ducking di bawah suara, musik sekitar -15,6 dB di bawah narasi; hasil sekitar -14,5 LUFS).
Hasil: `medcoel-introvert-ekstrovert.mp4`, sampul `cover.jpg` (juga `cover/cover.png`). WAV hasil sintesis tidak dicommit (dibuat ulang dengan skrip).

## Karakter
- **Raka** (`brand/characters/raka`): baju `harian`, ekspresi senang/lega/bingung/berpikir/kaget, pose berbaring. **Tala** (`brand/characters/teman`): teman Raka versi berdiri, ekspresi semangat/tertawa/senang/lelah/fokus, dan **varian peneliti** (jas lab + kacamata).
- **Kori**: maskot MEDCOEL asli (`stage/kori.svg`, dari `apps/web/src/mascots`), sebagai pemandu "Yuk, kita intip apa yang terjadi di dalam otakmu!" dan di penutup. Orang-orang kecil di keramaian/spektrum adalah ikon sederhana tanpa wajah.
- Kaki dan lengan semua tokoh satu bentuk dengan badan (diuji di `brand/characters/teman/teman.test.mjs` dan `raka.test.mjs`).

## Urutan adegan
| Waktu | Adegan |
|---|---|
| 0 - 6,0 | Hook: acara kampus ramai (Tala melompat senang), kamera bergeser ke sudut tenang tempat Raka |
| 6,0 - 12,4 | Acara selesai: Tala mengajak nongkrong; Raka tersenyum membayangkan kasur |
| 12,4 - 19,0 | "Apa bedanya di otak?" (satu otak, tanda tanya); Kori muncul dan mengajak masuk ke otak |
| 19,0 - 28,5 | Spektrum: banyak individu di sepanjang garis; dua kotak (introvert/ekstrovert) dicoret |
| 28,5 - 39,8 | Ekstrovert cenderung menikmati banyak interaksi; introvert lebih nyaman dengan suasana tenang atau kelompok kecil |
| 39,8 - 45,7 | "Tapi tunggu": introvert tetap bisa menikmati interaksi; ekstrovert tetap butuh waktu sendiri |
| 45,7 - 64,3 | Lab: peneliti mempelajari respons otak terhadap imbalan; label "Sistem pemrosesan imbalan"; dopamin sebagai salah satu zat yang terlibat (motivasi, pemrosesan imbalan) |
| 64,3 - 71,2 | Ilustrasi hubungan tingkat ekstroversi dan respons otak terhadap imbalan (titik tersebar, bukan sebab-akibat) |
| 71,2 - 81,3 | "Sering disalahpahami": dua klaim keliru ditandai silang |
| 81,3 - 88,2 | Kepribadian: faktor biologis, pengalaman, lingkungan, situasi |
| 88,2 - 95,7 | Raka beristirahat di kamar: menikmati waktu sendiri bukan berarti antisosial |
| 95,7 - 102,3 | Tala masih nongkrong di kafe; baterai sosial ada batasnya (tanpa menghakimi) |
| 102,3 - 108,7 | Penutup: logo MEDCOEL, "BELAJAR KEDOKTERAN GRATIS", medcoel.com |

## Akurasi dan batasan (jujur)
- Spektrum, bukan dua kotak; introvert tidak digambarkan antisosial/pemalu, ekstrovert tidak selalu percaya diri atau tidak pernah lelah; tidak ada "otak introvert" vs "otak ekstrovert" (hanya satu otak).
- Grafik hubungan ekstroversi dan respons imbalan adalah **ilustrasi** (diberi label "ILUSTRASI HUBUNGAN, BUKAN DATA ASLI"); dopamin digambarkan sebagai salah satu zat yang terlibat, bukan penentu kepribadian.
- Sumber yang diberikan: https://pubmed.ncbi.nlm.nih.gov/16289773/ dan https://pubmed.ncbi.nlm.nih.gov/31352030/. **Isi kedua makalah tidak dapat dibuka dari sesi pembuatan video ini** (host pubmed.ncbi.nlm.nih.gov tidak ada dalam jaringan yang diizinkan), jadi klaim di video hanya mengikuti narasi; tidak ada angka atau detail studi yang ditambahkan. Cocokkan narasi dengan abstrak kedua makalah sebelum tayang dan cantumkan sumbernya di caption.
- Takarir diperbaiki dari hasil ASR (mis. "Medcoil" menjadi MEDCOEL); di layar selalu tertulis MEDCOEL / medcoel.com.
- Area aman: judul/chip di y 290-370, takarir di y 1380-1550 dan x 110-970 (di atas bilah bawah Reels/TikTok dan ikon kanan); gambar penting di y 250-1550.

## Membuat ulang
```bash
cd video/introvert-ekstrovert
python3 audio/asr.py narator                    # (opsional) audio/asr.json dari audio/narator.mp3
python3 audio/gen_data.py                       # stage/data.json (takarir per kata) + dialog.wav
python3 audio/audio_mix.py                      # audio/mix.wav: narasi + musik + SFX
(cd ../.. && python3 -m http.server 8128 --bind 127.0.0.1 &)
node render.mjs frames 0 3259 4                 # JPG per bingkai (butuh playwright)
# loudnorm dua langkah -> final.wav (sekitar -14 LUFS), lalu:
ffmpeg -framerate 30 -i frames/f%05d.jpg -i final.wav -c:v libx264 -crf 18 -pix_fmt yuv420p -c:a aac -b:a 192k -shortest medcoel-introvert-ekstrovert.mp4
node cover/render-cover.cjs                     # cover 1080 x 1920 + panduan area aman
```
`?clean` pada `stage/index.html` menyembunyikan takarir; `renderFrame(t)` di konsol menampilkan satu bingkai.
