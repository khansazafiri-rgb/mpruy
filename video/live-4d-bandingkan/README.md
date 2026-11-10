# Video promo kedua: "Live 4D Lab: Normal atau ada perubahan?" (Reels/TikTok 1080 x 1920, 30 fps, 19,82 detik, tanpa voice-over)

"Normal atau ada perubahan? Coba bandingkan sendiri, gratis." Video produk (bukan tutorial) dari **rekaman layar asli** Live 4D Lab MEDCOEL. Detik pertama langsung memperlihatkan pergantian skenario dari **Normal** ke **Efusi perikardial** tepat pada ketukan musik dengan bunyi digital "ting" khas; lalu perbandingan, zoom area jantung (model 3D dan citra CT/USG), pilihan skenario di web, dan penutup "BANDINGKAN SENDIRI, GRATIS DI MEDCOEL.COM". Hanya empat teks layar utama (NORMAL, EFUSI PERIKARDIAL, LIHAT PERBEDAANNYA, BANDINGKAN SENDIRI, GRATIS) ditambah label kecil "Simulasi edukatif, bukan alat diagnosis".

## Hasil
| Berkas | Isi |
|---|---|
| `medcoel-live-4d-bandingkan.mp4` | Video jadi (H.264 + AAC, sekitar -14 LUFS) |
| `cover/cover.png` | Cover 1080 x 1920 khusus (bukan bingkai pertama): "NORMAL ATAU ADA PERUBAHAN?", citra CT Normal vs Efusi perikardial berdampingan dengan sorotan pada cairan perikardium, model 3D, CTA |
| `cover/cover-panduan-area-aman.png`, `cover/cover-profil-3x4.png` | Cover dengan garis area aman TikTok/Reels (zona merah = atas/bawah 240 px) dan crop tengah 3:4 untuk grid profil |
| `still/` | Still dan pratinjau 360 px |
| `edl.json`, `build.py`, `overlay/`, `audio/audio_mix.py`, `cover/` | File proyek yang dapat diedit dan dirender ulang (di bawah) |

## Alur (1 bar = 4 ketukan = 2,2 dtk pada 109 BPM; peralihan jatuh pada ketukan)
| Waktu | Shot | Teks | Bunyi |
|---|---|---|---|
| 0,0 - 1,10 | **Normal**: bilah skenario "Normal (pembanding)", citra CT sektor jantung bergerak, model 3D pasien + probe (sudah bergerak di bingkai pertama) | NORMAL | musik: denyut elektronik |
| **1,10** | **Peralihan ke Efusi perikardial** (potongan pada ketukan 3; garis emas menyapu panel + kilat halus) | EFUSI PERIKARDIAL | **"swap"**: tiga nada naik digital, musik memberi ruang sesaat sebelum dan sesudahnya |
| 2,2 - 4,4 | **Penggeser** Normal <-> Efusi pada pembingkaian yang sama (garis emas dengan pegangan bergerak ke kanan lalu ke kiri) | NORMAL (kiri), EFUSI PERIKARDIAL (kanan) | "blip" di ujung gerak |
| 4,4 - 6,6 | **Zoom area jantung** pada citra CT: Normal lalu Efusi, sorotan emas putus-putus mengelilingi jantung dan lapisan cairan (tidak menutupi citra) | LIHAT PERBEDAANNYA | "blip" saat sorotan muncul, "swap" saat berganti |
| 6,6 - 8,8 | **Zoom model 3D** di sekitar jantung (Normal lalu Efusi; pada Efusi area jantung berwarna biru) + citra CT kecil di bawah | LIHAT PERBEDAANNYA | "blip", "swap" |
| 8,8 - 11,0 | **USG dan CT berdampingan** (Normal), diperbesar pada area jantung | LIHAT PERBEDAANNYA | "blip" |
| 11,0 - 13,2 | **Pilihan skenario di web**: menu "Skenario" terbuka dengan daftar (Normal, Fungsi sistolik LV menurun, Efusi pleura kanan, Efusi perikardial, Cairan bebas perihepatik, Kandung kemih penuh, Motilitas antrum menurun) | BANDINGKAN SENDIRI, GRATIS | "blip" |
| 13,2 - 15,4 | **Panel Patologi** dengan kartu skenario, kursor memilih kartu | BANDINGKAN SENDIRI, GRATIS | "blip" |
| 15,4 - 17,6 | **Bergantian tiap ketukan** Normal / Efusi / Normal / Efusi (ajakan membuka sendiri) | NORMAL / EFUSI PERIKARDIAL, BANDINGKAN SENDIRI, GRATIS | "sparkle", lalu "swap" tiap pergantian |
| 17,6 - 19,8 | Logo MEDCOEL, "BANDINGKAN SENDIRI, GRATIS DI MEDCOEL.COM" | | "chime" |

Label kecil "Simulasi edukatif, bukan alat diagnosis" tampil di semua adegan. Di UI asli juga ada lencana "Simulasi edukatif · bukan alat diagnosis" dan keterangan "CT sintetis dari Atlas MEDCOEL · bukan citra pasien"; keduanya tidak diubah.

## Sumber rekaman (Drive, folder `1-3hv4o99SrJBq9g9uGpTcWNqFNj9GhNW` "atlas video"; 2816 x 1582, 60 fps)
| Berkas (nama pendek di `edl.json`) | Dipakai untuk |
|---|---|
| `Perekaman Layar 2026-11-10 pukul 23.55.23.mov` (`live`, 185,7 dtk) | Landing dan Live 4D Lab: Normal (USG+CT) dengan probe dan model 3D (3-7 dtk), model 3D skenario Efusi (142-143 dtk), menu pilihan skenario (133,5 dtk) |
| `... pukul 23.58.43.mov` (`aus`, 45,8 dtk) | Citra CT sektor skenario Efusi perikardial yang bersih (tanpa tooltip), bilah skenario "Efusi perikardial (sedang)" |
| `... pukul 23.59.44.mov` (`mode`, 94,2 dtk) | Panel Patologi dengan kartu skenario (0,9-3,1 dtk) |
| `... pukul 23.53.24.mov` (108,5 dtk) | Atlas 3D otot dan kuis: diperiksa, tidak dipakai (bukan Live 4D Lab) |

Rekaman mentah (sekitar 700 MB) **tidak di-commit**; unduh dari Drive lalu beri nama `rec_23.55.23.mov`, `rec_23.58.43.mov`, `rec_23.59.44.mov`. Kode web tidak dibuka dan tidak ada shot yang diambil ulang dari web; semua gambar produk = rekaman asli yang hanya di-crop, diperbesar, dan disusun. UI tidak digambar ulang dan tidak ada fitur yang ditambahkan.
**Privasi:** rekaman `23.55.23` pada kira-kira 172-185 dtk menampilkan aplikasi chat pribadi; bagian itu **tidak dipakai**. Potongan hanya memuat halaman web MEDCOEL.

## Soal "layar terbagi" dan kejujuran perbandingan
- Rekaman **tidak** memuat Normal dan Efusi pada waktu yang sama; keduanya direkam pada saat berbeda. Sudut probe sama (putar -45,0 deg, miring depan-belakang -35,8 deg, miring samping 24,0 deg, epigastrium S -5,0 / L 20,0 / P -129,1 mm; terbaca di panel UI pada kedua rekaman), tetapi **fase siklus jantung tidak sinkron** (Normal 72/menit, Efusi 104/menit menurut keterangan skenario). Karena itu perbandingan memakai **potongan tepat pada ketukan** dan **penggeser** antara dua cuplikan asli, bukan layar terbagi dengan dua jantung yang berdenyut berbeda di sisi-sisinya (penggeser pada 2,2-4,4 dtk menampilkan dua rekaman bersamaan hanya sebagai tirai).
- **Tidak ada rekaman yang memperlihatkan pergantian Normal -> Efusi perikardial langsung** (di rekaman ada Normal -> Fungsi sistolik LV menurun pada 134,7 dtk, dan Fungsi sistolik -> Efusi perikardial pada 140,2 dtk di rekaman `live`). Pergantian di detik 1,10 adalah **sambungan dua potongan asli** (bilah "Skenario" asli memperlihatkan nama skenario masing-masing), bukan satu klik yang direkam; menu skenario asli diperlihatkan terpisah pada 11,0-13,2 dtk. Sambungan ini dimaksudkan sebagai hook; jangan dibaca sebagai rekaman satu klik.
- Skala citra CT Normal (di dalam mode USG+CT) dibesarkan 1,246x agar sektor sebanding dengan Efusi (mode CT saja). Perbedaan bentuk jantung yang tampak mencakup efek lapisan cairan perikardium (cincin abu-abu di sekeliling jantung pada Efusi) dan kemungkinan perbedaan fase/irisan; video tidak menyimpulkan apa pun secara klinis.
- Citra **USG** hanya tersedia untuk Normal pada rekaman; tidak ada USG Efusi, jadi shot USG+CT (8,8-11,0 dtk) hanya Normal dan tidak diberi sorotan perbandingan.
- Citra yang terlihat adalah **simulasi edukatif** (CT sintetis dari Atlas MEDCOEL, USG simulasi), bukan citra pasien dan bukan alat diagnosis.

## Musik dan efek bunyi (lisensi)
Semua audio **disintesis dari kode** (`audio/audio_mix.py`, numpy); tidak ada sampel, rekaman, atau musik pihak ketiga, sehingga tidak ada lisensi pihak lain yang perlu dipenuhi.
| Judul | Isi | Pembuat | Lisensi |
|---|---|---|---|
| **MEDCOEL Live 4D Compare** | Instrumental 109 BPM yang satu keluarga dengan video pertama ("MEDCOEL Live 4D Pulse") tetapi lebih misterius: denyut elektronik rapi (thump + klik tipis), pad synth ringan Am9 / Fmaj7(#11) / Dm9 / E7sus4, arpeggio jarang; tanpa alarm, monitor gawat darurat, atau nuansa horor; musik sengaja diturunkan sesaat sebelum dan sesudah momen peralihan agar bunyi pergantian terdengar | Dibuat untuk MEDCOEL pada sesi pembuatan video ini | CC0 1.0 (domain publik): boleh dipakai komersial dan di Instagram tanpa atribusi |
| **MEDCOEL UI Swap Pings** | "swap" (tiga nada naik G6-C7-E7, gelombang persegi lembut + kilau: bunyi khas pergantian skenario), "blip" (dua nada pendek bergaya game pixel, hanya rasa pada bunyi; gambar tidak dipikselkan), "sparkle", "chime"; maksimum satu efek per 0,25 dtk | idem | CC0 1.0 |
Catatan: ini sintesis sederhana (bukan produksi studio). Untuk trek komersial berlisensi, ganti `audio/mix.wav` lalu jalankan `build.py` lagi dan cantumkan judul serta sumber lisensinya.

## Merender ulang
```bash
cd <akar repo>
python3 -m http.server 8128 --bind 127.0.0.1 &                         # untuk overlay dan cover
node video/live-4d-bandingkan/overlay/render-overlay.cjs               # teks layar (PNG transparan)
python3 video/live-4d-bandingkan/audio/audio_mix.py                    # musik + efek (membaca edl.json)
python3 video/live-4d-bandingkan/build.py <folder-rekaman>             # potong, crop, susun, penggeser, sorotan, overlay, audio -> medcoel-live-4d-bandingkan.mp4
python3 video/live-4d-bandingkan/build.py <folder-rekaman> --still 1.6 # satu bingkai uji ke still/uji-1.60.png
node video/live-4d-bandingkan/cover/render-cover.cjs                   # cover.png (bingkai sumber: cover/*.jpg)
```
Mengubah isi video: edit `edl.json` (tiap shot: `type`, `at`/`dur`, detik awal rekaman, kunci penggeser `pos`, jendela teks `teks`) dan daftar `sfx` (waktu keluaran, jenis). Crop dan ukuran panel ada di bagian atas `build.py`. Merender penuh memakan waktu sekitar 10-15 menit.

## Hasil pemeriksaan (`medcoel-live-4d-bandingkan.mp4`, H.264 + AAC, 19,82 dtk, 30 fps)
- Bingkai pertama sudah berisi tampilan Normal yang bergerak (jantung berdenyut di citra CT, model 3D); peralihan ke Efusi pada 1,10 dtk jatuh persis pada ketukan ke-3 (109 BPM) bersama bunyi "swap".
- Loudness terukur sekitar -14,1 LUFS, puncak sampel -1,3 dBTP. Musik diturunkan sebentar sebelum/sesudah tiap peralihan.
- Lompatan antar-bingkai tertinggi terjadi pada potongan terencana (1,07; 4,37; 6,57; 8,77; 13,17; 15,37 dtk), tidak ada lonjakan di luar potongan.
- Still: `still/01..10-*.png`, `still/lembar-360px.png`, `still/awal-tengah-akhir-360px.png`, `cover/cover-bersama-awal-video-360px.png`.

## Kekurangan yang diketahui
- Video belum diputar di ponsel sungguhan dan belum didengarkan manusia; yang diperiksa: bingkai tiap 0,4 dtk, still 360 px, selisih antar-bingkai, level audio.
- Gerak di bingkai pertama halus (denyut jantung pada citra CT); gerak besar baru terjadi saat peralihan di 1,10 dtk.
- Resolusi sumber citra CT kasar (berpiksel) dan tampak berbutir saat diperbesar; itu bawaan aplikasi. Citra USG simulasi gelap dan kurang kontras.
- Teks kecil di dalam UI asli (menu skenario, kartu) terbaca di 360 px hanya pada shot yang diperbesar.
- Nada "swap" dan musik adalah sintesis sederhana, bukan produksi studio.
