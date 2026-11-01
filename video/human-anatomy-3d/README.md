# FEATURE UNLOCKED: 3D ANATOMY (Reels/TikTok 1080 x 1920, 30 fps, 52,83 detik)

Memperkenalkan Human Anatomy MEDCOEL (`/human-anatomy`, atlas 3D di `/anatomy/viewer/`). Suara satu-satunya adalah MP3 narator yang diberikan
(`audio/narator.mp3`), tanpa ubah kecepatan, nada, atau potongan. Hasil: `medcoel-3d-anatomy.mp4`, sampul `cover.jpg`.

## Sumber rekaman (jujur)
- Model 3D dan kontrol berasal dari **atlas MEDCOEL asli** yang dijalankan lokal di Chromium (WebGL perangkat lunak), memakai salinan statis aset publik
  `medcoel.com/anatomy/viewer/` (HTML, JS, CSS, font, data, tujuh model GLB). Tidak ada data pengguna, API, akun, database, atau server yang diakses atau diubah.
- Tidak ada model atau UI palsu. Setiap klik di video (preset Muscles, tombol Front, `−` pada Muscles & fascia, kotak centang sistem) adalah klik mouse sungguhan pada kontrol aslinya,
  dan tampilan sesudahnya adalah bingkai yang benar-benar dirender atlas.
- Satu-satunya perubahan pada salinan atlas: `enableDamping` pada kontrol kamera dimatikan agar putaran kamera tepat per bingkai (tanpa inersia setelah mouse dilepas). Antialias dimatikan karena
  render tanpa GPU terlalu lambat; model dirender satu bingkai demi satu bingkai pada 1080 x 1920.
- Kursor, cincin penanda emas, judul pendek, dan takarir digambar di atas rekaman. Posisi kursor mengikuti kotak kontrol yang sebenarnya.
- Takarir diletakkan di area kosong sidebar kiri agar tidak menutupi model.

## Fitur yang benar-benar diuji dan tampil di video
| Narasi | Yang ditunjukkan (nama kontrol asli) |
| --- | --- |
| "tampilan otot, atur layer" | preset **Muscles** (menyalakan Muscles & fascia + Skeleton), baris "Muscles & fascia" dengan tombol `−` / `+` / `⋯` |
| "kurangi layer ototnya" | tombol `−` ("Remove outer layer of Muscles & fascia") tiga kali: Fascia & connective covering, Superficial muscles, Intermediate muscles, Deep muscles; struktur di bawahnya terlihat |
| "fokus ke kerangka" | kotak centang Muscles & fascia dimatikan, **Skeleton** tetap; model diputar 360 derajat dengan seret mouse |
| "pembuluh darah" | kotak centang **Arteries** dan **Veins**, tampil bersama kerangka (beberapa sistem sekaligus) |
| "sistem limfatik" | Arteries dan Veins dimatikan, **Lymphatic system** dinyalakan bersama kerangka |
| "putar, perbesar" | seret mouse (putar), roda mouse (zoom), Shift + roda (geser), tombol **Front** |
| "kamu yang pilih" | kombinasi acak: Veins, Skeleton off, Lymphatic, Muscles on lalu `−` dua kali |

## Ketidakcocokan kecil dengan naskah (dan cara menanganinya)
- Sistem **kerangka dan limfatik hanya punya satu layer**, jadi tombol `−` tidak berlaku untuk keduanya. "Tampilkan sistem rangka" dan "pilih layer-nya" ditunjukkan sebagai kotak centang sistem, bukan pengurangan layer.
- Pada tampilan awal otot dan kerangka sama-sama aktif, tetapi lapisan terluar (fascia) menutupi seluruh otot. "Kurangi layer ototnya" karenanya ditunjukkan dengan `−` pada baris Muscles & fascia, bukan dengan menyembunyikan satu sistem.
- Urutan otot → rangka → pembuluh → limfatik hanya contoh; bagian akhir menunjukkan kombinasi lain.
- Tombol Front/Side/Back/Top/Reset dan zoom berada di bagian bawah halaman; kamera video di-zoom ke sana saat dipakai supaya tidak tertutup tombol IG/TikTok.

## Membuat ulang
```bash
cd video/human-anatomy-3d
python3 audio/gen_data.py                       # stage/data.json + dialog.wav (waktu kata dari MP3)
node audio/sfx_times.mjs > audio/sfx_times.json && python3 audio/audio_mix.py   # audio/mix.wav
python3 record/fetch_atlas.py atlas-site        # salinan atlas + damping off
(cd atlas-site && python3 -m http.server 8130 --bind 127.0.0.1 &)
cp record/rec.cjs record/takes.cjs . && node takes.cjs hero_layers skeleton vessels lymph explore free   # -> rec2/<take>/ (butuh playwright)
ln -s "$PWD/rec2" stage/media; (cd ../.. && python3 -m http.server 8128 --bind 127.0.0.1 &)
node render.mjs frames 0 1584 4                 # JPG per bingkai
ffmpeg -framerate 30 -i frames/f%05d.jpg -i final.wav -c:v libx264 -crf 18 -pix_fmt yuv420p -c:a aac -b:a 192k -shortest medcoel-3d-anatomy.mp4
```
`final.wav` = `audio/mix.wav` setelah `loudnorm` dua langkah (hasil -14,4 LUFS). Manifes rekaman (urutan klik/gerak per take) ada di `record/manifests/`; PNG bingkai dan tangkapan layar tidak dicommit (besar).

## Catatan teknis
- Rekaman penuh butuh sekitar 30 menit di mesin tanpa GPU (sekitar 3 detik per bingkai 3D); bingkai 3D unik per langkah: 100 + 40 (otot), 100 (kerangka), 60 (pembuluh), 50 (limfatik), 194 (jelajah), 36 (bebas).
- Musik dan efek klik disintesis numpy; musik rata-rata sekitar 17 dB di bawah suara, efek klik jauh di bawahnya.
