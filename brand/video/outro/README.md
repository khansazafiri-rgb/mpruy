# Outro MEDCOEL untuk video edukasi

**Pakai file master ini:** [`medcoel-outro-master.mp4`](medcoel-outro-master.mp4). Satu MP4 yang berdiri sendiri (gambar, suara narator, musik, logo, URL), siap ditempel di akhir video edukasi MEDCOEL. Ini menggantikan panduan outro lama yang hanya menyebut materi, soal, dan Simulasi Dokter. Daftar mesin: [`assets.json`](assets.json).

| | |
|---|---|
| Format | 1080 × 1920, 30 fps, H.264 High (yuv420p, GOP 30), AAC-LC 192 kbps 48 kHz stereo; kompatibel Instagram/TikTok |
| Durasi | **16,20 detik** (486 bingkai; audio dan video sama panjang) |
| Kenyaringan | -14,4 LUFS terintegrasi, puncak sejati -1,4 dBFS (sudah dinormalkan, jangan dinormalkan ulang) |
| Awal / akhir | Mulai langsung dengan gambar Atlas 3D (bingkai pertama = bingkai kunci; tanpa sisa gambar atau suara video lain). Suara masuk halus 0,12 dtk; musik keluar halus 1,2 dtk; sampel terakhir senyap. |

## Yang tampil
| Detik | Tampil | Isi (semua rekaman produk ASLI, kecepatan 1,0x) |
|---|---|---|
| 0,0 - 2,7 | **ATLAS 3D** | Atlas 3D MEDCOEL: otot tampil, lapisan dibuka satu per satu sampai tulang rusuk terlihat |
| 2,7 - 5,2 | **LIVE 4D LAB** + label "Simulasi edukatif, bukan alat diagnosis" | Live 4D Lab: probe digeser, citra USG simulasi berubah |
| 5,2 - 6,9 | Materi per bab | Daftar bab, memilih bab, pilihan belajar |
| 6,9 - 8,4 | Latihan soal + pembahasan | Memilih jawaban, Cek jawaban, pembahasan |
| 8,4 - 10,1 | Simulasi Dokter | Memilih poli, Mulai, pasien muncul |
| 10,15 - 16,2 | Logo MEDCOEL asli, **BELAJAR FK GRATIS**, **medcoel.com**, Raka | Ditahan 6 detik agar terbaca |

Narasi (Google AI Studio, tanpa ubah kecepatan, mulai di 0,7 dtk, selesai 11,06 dtk): "Di MEDCOEL, jelajahi Atlas 3D dan Live 4D Lab. Lanjut belajar lewat materi, latihan soal, dan Simulasi Dokter. Gratis di medcoel.com." Takarir ada di layar (teks yang sama). Musik dan efek peralihan disintesis sendiri (CC0), jauh di bawah suara.
Layar ponsel: UI web diperbesar 1,1 - 1,3x dan diperiksa pada lebar 390 px; teks daftar bab, soal, dan pilihan poli masih terbaca. Teks penting (logo, URL) ada di bagian atas layar, di luar area tertutup tombol platform.

## Cara menempelkan di akhir video
1. Akhiri video utama dengan bersih: kalimat terakhir selesai, tanpa musik/efek yang terpotong. Video utama sebaiknya sudah dinormalkan ke sekitar -14 LUFS (sama dengan master).
2. Gabungkan dengan **encode ulang** (aman untuk semua kombinasi bingkai kunci dan AAC):
```bash
ffmpeg -i video-utama.mp4 -i brand/video/outro/medcoel-outro-master.mp4 -filter_complex \
"[0:v]fps=30,scale=1080:1920,setsar=1,format=yuv420p[v0];[1:v]fps=30,setsar=1,format=yuv420p[v1];\
[0:a]aresample=48000,aformat=channel_layouts=stereo[a0];[1:a]aresample=48000,aformat=channel_layouts=stereo[a1];\
[v0][a0][v1][a1]concat=n=2:v=1:a=1[v][a]" -map "[v]" -map "[a]" \
-c:v libx264 -crf 18 -preset medium -pix_fmt yuv420p -r 30 -c:a aac -b:a 192k -ar 48000 -movflags +faststart hasil.mp4
```
3. Jangan memakai `loudnorm` pada file gabungan (akan mengubah level master). Normalkan audio video utama SEBELUM digabung.
4. Jangan menambah logo, URL, atau ajakan lain sesudah master, dan jangan menaruh outro lain di depannya.
5. Periksa sambungan: bingkai terakhir video utama -> bingkai Atlas 3D (potongan keras, tidak ada transisi bawaan); tidak ada sisa suara video utama di dalam master.
Sambungan yang diuji: 8 detik terakhir video USG + master -> 24,2 detik, 726 bingkai, audio 24,21 dtk, -14,1 LUFS, puncak -1,1 dBFS.

## Dari mana master dibuat (dapat dibuat ulang)
Proyek: [`video/outro-master/`](../../../video/outro-master/) (komposisi `stage/scene.js`, `render.mjs`, `encode.sh`, `audio/build_audio.py`, `rekam/siapkan.sh`, [QA.md](../../../video/outro-master/QA.md)). Bahan: Atlas 3D dari `video/human-anatomy-3d/medcoel-3d-anatomy.mp4` (hanya gambar, 13,9-16,6 dtk, dipotong ke panel model); materi dan latihan soal dari `video/masih-dua-minggu/rekam/rekaman-web.mp4`; Simulasi Dokter dari `video/dok-saya-kenapa/rekam/rekaman-web.mp4`; Live 4D Lab = rekaman kanvas aplikasi asli (`video/usg-gema-gambar/rekam/lab.cjs`, take `hook`, bingkai 100-174); audio `video/outro-master/audio/outro-baru.wav`; logo `apps/web/src/assets/logo-full.webp`; Raka dari `brand/characters/raka/raka.js`. Tidak ada UI tiruan atau gambar generatif.
Rekaman memakai data uji lokal; Live 4D Lab adalah **simulasi edukatif**, bukan data pasien dan bukan diagnosis. Jangan menyajikan angka atau kemajuan akun sebagai data produksi. Jika UI web berubah, rekam ulang footage dan bangun ulang master (`assets.json` -> `master.build`).

## Aset merek dan sumber mentah
[Logo lengkap](../../../apps/web/src/assets/logo-full.webp), [logo simbol](../../../apps/web/src/assets/logo-mark.webp), [Kori](../../mascots/kori.svg), [Kila](../../mascots/kila.svg), [Nilo](../../mascots/nilo.svg), dan [Raka](../../characters/raka/README.md). Raka harus dirender dari `brand/characters/raka/raka.js`, bukan dibuat ulang. Footage sumber lain (`masih-dua-minggu`, `dok-saya-kenapa`) belum dipotong per shot di folder ini; untuk outro biasa, pakai master di atas.
