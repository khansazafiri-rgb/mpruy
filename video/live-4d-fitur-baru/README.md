# Video 4: "NEW FEATURE: Live 4D Lab" (Reels/TikTok 1080 x 1920, 30 fps, 17,42 detik, tanpa voice-over)

Video pengumuman fitur baru Live 4D Lab, bergaya momen "feature unlocked" tetapi tetap visual MEDCOEL modern (tidak diubah menjadi pixel art; unsur pixel hanya rasa pada efek bunyi). Hanya membahas fitur 4D (tidak ada Atlas 3D). Semua gambar produk = **rekaman layar asli**.

## Hasil
| Berkas | Isi |
|---|---|
| `medcoel-live-4d-fitur-baru.mp4` | Video jadi (H.264 + AAC, sekitar -14 s.d. -16 LUFS) |
| `cover/cover.png` | Cover 1080 x 1920 khusus: "NEW FEATURE: LIVE 4D LAB", USG dan CT jantung, model 3D, "SUDAH BISA DICOBA GRATIS" |
| `cover/cover-panduan-area-aman.png`, `cover/cover-profil-3x4.png` | Cover dengan garis area aman (zona merah = 240 px atas/bawah) dan crop tengah 3:4 |
| `still/` | Still dan pratinjau 360 px |
| `edl.json`, `build.py`, `overlay/`, `audio/audio_mix.py`, `cover/` | File proyek yang dapat diedit dan dirender ulang (di bawah) |

## Alur (124 BPM; 1 bar = 4 ketukan = 1,935 dtk; semua potongan jatuh pada ketukan)
| Waktu | Shot | Teks layar | Bunyi |
|---|---|---|---|
| 0,0 - 1,94 | Probe sudah bergerak di model 3D dan citra USG + CT jantung berubah sejak bingkai pertama (rekaman 6,6-8,5 dtk); gembok emas terbuka + cincin cahaya + kilau menyapu pil | FITUR BARU TERBUKA | **"unlock"** (tiga nada naik + "ting" panjang) masuk bersamaan dengan teks (0,05 dtk), kick di ketukan pertama |
| 1,94 - 3,87 | Zoom gerak jantung pada citra CT + model 3D | LIVE 4D LAB | "blip" |
| 3,87 - 5,81 | Tampilan Live 4D Lab: bilah skenario, USG | CT, model 3D | LIVE 4D LAB | "blip" |
| 5,81 - 9,68 | Empat potongan (tiap dua ketukan) saat probe digerakkan dan citra berubah | GERAKKAN PROBE | "blip" tiap potongan |
| 9,68 - 13,55 | Perpindahan skenario: menu "Skenario" asli, CT Efusi perikardial, kartu skenario dengan klik kursor, CT Fungsi sistolik LV menurun (bilah skenario berubah sesuai rekaman) | JELAJAHI SKENARIONYA | "blip" tiap potongan |
| 13,55 - 15,48 | Antarmuka Live 4D Lab **utuh** dengan zoom pelan | | "blip" |
| 15,48 - 17,42 | Logo MEDCOEL | SUDAH BISA DICOBA GRATIS / MEDCOEL.COM | "sparkle", lalu "chime" |

Label kecil "Simulasi edukatif, bukan alat diagnosis" tampil pada semua adegan klinis (kecuali antarmuka utuh dan penutup). Di UI asli juga ada lencana "Simulasi edukatif · bukan alat diagnosis" dan keterangan "CT sintetis dari Atlas MEDCOEL · bukan citra pasien"; keduanya tidak diubah.

## Sumber rekaman (Drive, folder `1-3hv4o99SrJBq9g9uGpTcWNqFNj9GhNW` "atlas video"; 2816 x 1582, 60 fps)
| Berkas (nama pendek di `edl.json`) | Dipakai untuk |
|---|---|
| `Perekaman Layar 2026-11-10 pukul 23.55.23.mov` (`live`) | Probe, USG+CT, model 3D, menu skenario, antarmuka utuh |
| `... pukul 23.58.43.mov` (`aus`) | Citra CT skenario Efusi perikardial yang bersih |
| `... pukul 23.59.44.mov` (`mode`) | Panel skenario dengan kartu dan klik, CT skenario Fungsi sistolik LV menurun |
| `... pukul 23.53.24.mov` | Atlas 3D otot dan kuis: **tidak dipakai** (video ini hanya fitur 4D) |
Rekaman mentah (sekitar 700 MB) **tidak di-commit**; unduh dari Drive lalu beri nama `rec_23.55.23.mov`, `rec_23.58.43.mov`, `rec_23.59.44.mov`. Kode web tidak dibuka, tidak ada shot yang diambil ulang, UI tidak digambar ulang, tidak ada tombol atau fitur baru yang digambar. **Privasi:** rekaman `23.55.23` pada kira-kira 172-185 dtk menampilkan aplikasi chat pribadi; bagian itu tidak dipakai. Halaman beranda rekaman (yang juga memuat kartu Atlas 3D) tidak dipakai.

## Musik dan efek bunyi (lisensi)
Semua audio **disintesis dari kode** (`audio/audio_mix.py`, numpy); tidak ada sampel, rekaman, atau musik pihak ketiga, sehingga tidak ada lisensi pihak lain yang perlu dipenuhi. Tidak ada alarm rumah sakit dan tidak ada lagu populer.
| Judul | Isi | Pembuat | Lisensi |
|---|---|---|---|
| **MEDCOEL Feature Unlocked** | Instrumental 124 BPM, yang paling energik di antara empat video: kick tegas di tiap ketukan, clap, hat, bass bergerak, pad synth bersih dengan "denyut" halus (sidechain dari kick), arpeggio jernih, riser menuju penutup; progresi Am9 / Fmaj7 / Cmaj9 / G6 | Dibuat untuk MEDCOEL pada sesi pembuatan video ini | CC0 1.0 (domain publik): boleh dipakai komersial dan di Instagram tanpa atribusi |
| **MEDCOEL Unlock Pings** | "unlock" (tiga nada naik + "ting" panjang), "blip" (dua nada pendek bergaya game pixel, hanya rasa pada bunyi), "sparkle", "chime"; maksimum satu efek per 0,25 dtk | idem | CC0 1.0 |
Catatan: ini sintesis sederhana (bukan produksi studio). Untuk trek komersial berlisensi, ganti `audio/mix.wav`, jalankan `build.py` lagi, dan cantumkan judul serta sumber lisensinya.

## Merender ulang
```bash
cd <akar repo>
python3 -m http.server 8128 --bind 127.0.0.1 &                         # untuk overlay dan cover
node video/live-4d-fitur-baru/overlay/render-overlay.cjs               # teks layar (PNG transparan)
python3 video/live-4d-fitur-baru/audio/audio_mix.py                    # musik + efek (membaca edl.json)
python3 video/live-4d-fitur-baru/build.py <folder-rekaman>             # potong, crop, susun, gembok, overlay, audio -> medcoel-live-4d-fitur-baru.mp4
python3 video/live-4d-fitur-baru/build.py <folder-rekaman> --still 0.4 # satu bingkai uji ke still/uji-0.40.png
node video/live-4d-fitur-baru/cover/render-cover.cjs                   # cover.png dan panduan area aman (bingkai sumber: cover/*.jpg)
```
Mengubah isi video: edit `edl.json` (shot, klip dengan `kind`/`t`/`crop`, jendela teks `teks`, dan daftar `sfx`). Crop dan ukuran panel ada di bagian atas `build.py`; teks layar di `overlay/overlay.html`.

## Hasil pemeriksaan (MP4 akhir)
- ffprobe: H.264 1080 x 1920, 30 fps, 17,42 dtk, AAC; sekitar -16 LUFS terintegrasi, puncak sampel -0,7 dBTP (alimiter + loudnorm).
- Bingkai pertama sudah bergerak: probe dan citra USG/CT tampil sejak bingkai 0; teks "FITUR BARU TERBUKA" sudah penuh di bingkai 0; bunyi "unlock" jatuh di 0,05 dtk bersama kick dan sapuan emas gembok.
- Seluruh rekaman diperiksa dengan lembar kontak 3 bingkai per detik dan lembar 360 px (`still/lembar-360px.png`, `still/awal-tengah-akhir-360px.png`, `still/cover-vs-bingkai-awal-360px.png`). Klip yang mulanya menampilkan "Citra belum tersedia" (probe di luar jangkauan data) sudah diganti klip yang berisi citra USG dan CT.
- Lompatan antarbingkai terbesar jatuh tepat pada potongan ketukan (1,9; 3,87; 5,8; 6,77; 7,74; 8,7; 9,68; 10,64; 11,6; 12,57; 13,5; 15,4 dtk), sesuai rencana.
- Hanya fitur 4D yang tampil; tidak ada Atlas 3D. "SUDAH BISA DICOBA GRATIS" dan "MEDCOEL.COM" terbaca pada ukuran 360 px.

## Kekurangan yang diketahui
- Video belum ditonton dengan suara menyala di ponsel; pemeriksaan visual lewat bingkai dan lembar kontak, pemeriksaan bunyi lewat pengukuran level.
- Gambar USG pada rekaman asli gelap dan kasar, dan di beberapa klip probe citra CT hanya sebagian (probe berada di tepi data). Itu perilaku asli simulator, tidak dipercantik.
- Adegan antarmuka utuh (13,5-15,4 dtk) tetap kecil di layar ponsel karena memang menampilkan halaman penuh; teksnya tidak dimaksudkan untuk dibaca, hanya menunjukkan bahwa semuanya ada dalam satu halaman.
- Potongan berasal dari beberapa pengambilan rekaman terpisah (Normal, Efusi perikardial, Fungsi sistolik); tidak ada klik langsung Normal ke Efusi yang terekam, jadi perpindahan skenario disusun sebagai potongan, bukan satu rekaman utuh.
- Musik dan efek disintesis sederhana (lihat bagian lisensi); trek berlisensi dari studio dapat menggantikannya.
