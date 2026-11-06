# Video: "Cara kerja GCU" (1080 x 1920, 30 fps, 50,53 dtk)

Video edukasi MEDCOEL tentang cara kerja alat GCU (glukosa, kolesterol total, asam urat) dengan animasi dari kode (SVG di Chromium + ffmpeg). Narasi memakai **audio asli** `audio/narator.wav` (50,52 dtk; tidak dipercepat, dipotong, atau diubah). Raka dirender dari `rakaSvg()` (`brand/characters/raka/raka.js`) tanpa mengubah desain, pakaian, atau proporsi tangannya; lengan dipasang ulang tiap bingkai lewat pemecah lengan (`stage/raka.js`) agar tangan tepat berada di titik tujuan dengan panjang lengan konstan.

## Hasil
- `medcoel-cara-kerja-gcu.mp4` (H.264 + AAC, -14 LUFS), `still/` (17 still 1080 x 1920 + `lima-adegan-penting-360px.png` dan `lembar-360px.png` pada lebar 360 px), `catatan-model-dan-sumber.md`.

## Linimasa (disinkronkan ke ASR kata, `audio/asr.json`)
| Waktu | Narasi | Visual |
|---|---|---|
| 0,0 - 1,0 | "Jari Raka baru ditusuk" | Bingkai pertama: close-up tangan Raka bergerak; jari terangkat, lancet mendekat dari kanan, strip sudah terpasang di alat |
| 1,06 | "ditusuk" | Lancet menusuk sisi ujung jari sebentar; Raka perih (alis menukik, mata menyipit, air mata tipis); kamera mundur ke wajah |
| 1,94 - 3,1 | "Setetes darah menyentuh strip" | Tetes tumbuh di sisi jari; alat didekatkan; ujung strip menyentuh tetes pada 3,0 dtk (posisi dihitung dari geometri yang sama tiap bingkai) |
| 3,1 - 6,4 | "...beberapa detik kemudian, angka muncul di layar" | Kamera mengikuti darah naik di saluran strip (kapiler); alat ditarik; layar "- - -" lalu angka contoh 92 pada 5,66 |
| 6,84 - 9,4 | "Kok alat sekecil ini ...?" | Raka penasaran memegang alat di tangan, mengangkatnya (tidak ditahan lama) |
| 10,1 - 12,4 | "Lihat ke dalam stripnya" | Kamera menyelam ke strip; permukaan strip menjadi potongan bening; latar beralih ke hijau-hutan MEDCOEL |
| 12,4 - 15,4 | "Darah tertarik masuk ke ruang reaksi" | Diputar ulang pelan; darah mengisi saluran sempit lalu ruang reaksi (label: Saluran sempit, Ruang reaksi) |
| 15,4 - 18,8 | "bertemu reagen ... glukosa" | Ruang reaksi diperbesar: glukosa (skema) bertemu reagen; kilatan dan elektron = kode infografis (Lapisan reagen, Glukosa) |
| 18,8 - 21,0 | "Reaksi itu menghasilkan sinyal listrik" | Denyut sinyal pada dua elektroda (label: Sinyal listrik) |
| 21,1 - 25,7 | "Elektroda menangkap sinyal, alat mengolahnya menjadi angka" | Kamera mengikuti sinyal di dua jalur ke kontak, pin kontak meter, chip pembaca, layar menampilkan hasil contoh (label: Dua elektroda, Kontak strip, Rangkaian pembaca, Contoh hasil (ilustrasi)) |
| 25,7 - 31,5 | "darahnya tidak mengalir ke dalam mesin ... Mesin membaca sinyalnya" | Tarik mundur: darah tetap di strip (tanda "tidak masuk" dicoret), reaksi di strip, mesin membaca sinyal |
| 32,1 - 35,2 | "kolesterol total atau asam urat?" | Raka berpikir; tiga strip berlabel GLUKOSA, KOLESTEROL TOTAL, ASAM URAT; strip di alat diganti pada 33,6 dan 34,7 |
| 35,3 - 42,4 | "Stripnya harus diganti ... satu strip tidak membaca ketiganya" | Tiga strip berdampingan (reagen berbeda), tiap strip dengan tetes dan hasil contoh sendiri ("1 strip = 1 pemeriksaan") |
| 42,9 - 48,0 | "Tetes darah masuk. Reaksi terjadi. Sinyal terbaca. Angka muncul." | TETES DARAH, REAKSI DI STRIP, SINYAL LISTRIK, HASIL DI LAYAR menyala sesuai kata; Raka menunjuk strip dan alat |
| 48,0 - 50,5 | "Sekarang, kamu tahu cara kerja GCU." | Raka mengerti, senang; logo MEDCOEL masuk singkat (49,0) |

## Bahasa visual
Latar merek (krem berkisi untuk Raka, hijau-hutan berlapis + busur "C" + bintang emas untuk potongan), cahaya kiri-atas dengan bayangan kanan-bawah, volume 2.5D (gradasi + bayangan), label gading dengan penunjuk emas (huruf 32 px, maksimum 2-3 serentak; tertinggi 2-3 pada adegan potongan), kamera yang bergerak terus, easing halus. Dari `brand/anatomi-visual/sistem` (cabang `claude/anatomi-visual-kalibrasi`) dan `brand/anatomy-style` saya ambil prinsipnya (bukan aset organ); tidak ada gambar organ.

## Render ulang
```bash
python3 -m http.server 8128 --bind 127.0.0.1 &            # dari akar repo
export NODE_PATH=$(npm root -g):$PWD/node_modules
ffmpeg -i video/cara-kerja-gcu/audio/narator.wav -ar 44100 -ac 1 video/cara-kerja-gcu/audio/nar44.wav
python3 video/cara-kerja-gcu/audio/audio_mix.py             # mix.wav = narasi asli + musik pelan + SFX tipis
node video/cara-kerja-gcu/render.mjs video/cara-kerja-gcu/frames 0 1515 4     # 1516 bingkai, ±85 dtk dengan 4 pekerja
ffmpeg -framerate 30 -i video/cara-kerja-gcu/frames/f%05d.jpg -i video/cara-kerja-gcu/audio/mix.wav -c:v libx264 -pix_fmt yuv420p -crf 17 -c:a aac -b:a 192k -af loudnorm=I=-14:TP=-1.5:LRA=11 -shortest -movflags +faststart video/cara-kerja-gcu/medcoel-cara-kerja-gcu.mp4
node video/cara-kerja-gcu/shot.cjs "t=3.1" keluaran.png      # satu bingkai pada detik tertentu
```
Berkas: `stage/art.js` (strip, meter, lancet, tetes, label), `stage/raka.js` (pemecah lengan), `stage/shotA.js` + `camA.js` (adegan Raka 0-11,4 dtk), `stage/shotB.js` (potongan strip), `stage/shotC.js` (ganti strip, tiga strip, rangkuman, logo), `stage/stage.js` (penyusun dan transisi).

## Pemeriksaan
- Kontak jari-tetes-strip dihitung dari satu geometri (ujung jari -> tetes -> ujung strip) pada tiap bingkai, lalu dilihat pada still 3,1 dan 3,9 dtk (ujung strip menyentuh tetes; darah mengisi saluran strip).
- Lembar bingkai tiap 0,5 dtk, lima still utama pada lebar 360 px, dan selisih antar-bingkai pada 1516 bingkai (tidak ada bingkai kosong/putus; lonjakan terbesar adalah gerak kamera yang disengaja pada 4,6-4,9 dan 6,6-6,8 dtk).
- Label serentak maksimum 3 (potongan strip maksimum 2 label + 1 tag "diputar ulang pelan"/footnote kecil).
- Kontak jari/tetes/strip, panjang lengan, dan perubahan bentuk dilihat pada bingkai-bingkai di atas; belum diputar sebagai video kecepatan normal oleh manusia.

## Kekurangan yang saya ketahui (spesifik)
1. **Sumber produsen tidak terbuka dari sesi ini** (lihat `catatan-model-dan-sumber.md`): mekanisme didasarkan pada deskripsi umum strip amperometrik dan hasil pencarian, bukan dokumen model GCU tertentu. Apakah strip kolesterol/asam urat pada model pilihan benar elektrokimia belum diverifikasi.
2. Lancet "menusuk" dari tepi bingkai tanpa tangan penusuknya (bentuk disederhanakan); jari yang ditusuk tetap diam kecuali sentakan kecil.
3. Raka bergerak sejak bingkai pertama tetapi wajahnya baru terlihat penuh pada ±1,3 dtk (bingkai pertama = close-up tangan, sesuai permintaan).
4. Kamera menyelam ke strip (9,9-11,4 dtk) dan tarik-menarik pada 4,6-5,3 dtk cukup cepat; belum diuji di ponsel nyata.
5. Pada adegan potongan, label di dekat meter tidak dapat sepenuhnya di luar tepi perangkat karena tepi meter memenuhi lebar layar saat zoom; label tidak menutupi jalur, chip, atau layar.
6. Gerak Raka di adegan 32-35 dan 43-50 relatif kecil (menunjuk, ekspresi); Raka tidak digambar dalam adegan potongan 11-32 dtk (pemandu hanya muncul di awal dan akhir).
7. Tidak ada takarir yang dibakar ke video (tidak diminta); hanya label.
8. Musik dan SFX disintesis sederhana (pad, denting, kick sangat tipis); efek lancet, tetes, dan sinyal tipis di bawah suara.
