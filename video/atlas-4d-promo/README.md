# Video promo: "Atlas 3D + Live 4D Lab" (Reels/TikTok 1080 x 1920, 30 fps, 38,3 detik, dengan narasi)

Video produk MEDCOEL: Atlas 3D (putar tubuh, buka lapisan, pilih struktur, nama dan keterangan) dilanjutkan Live 4D Lab (probe, simulasi USG dan CT, skenario), lalu montage singkat materi per bab, latihan soal, dan Simulasi Dokter, ditutup "Eksplorasi gratis di medcoel.com". Narasi memakai rekaman suara dari pemesan (`audio/narator.wav`, 33,92 dtk, Gemini TTS) **tanpa diubah kecepatan atau isinya**; durasi video mengikuti narasi.

## Hasil
| Berkas | Isi |
|---|---|
| `medcoel-atlas-4d.mp4` | Video jadi (H.264 + AAC, sekitar -14,1 LUFS, puncak -1,5 dBFS) |
| `cover/cover.png` | Cover 1080 x 1920 khusus: "LIHAT BENTUKNYA. SAKSIKAN GERAKNYA.", kartu Atlas 3D dan Live 4D Lab (tangkapan asli), "COBA GRATIS DI MEDCOEL.COM" |
| `cover/cover-panduan-area-aman.png`, `cover/cover-bersama-awal-video-360px.png` | Garis area aman TikTok/Reels; cover + bingkai awal pada 360 px |
| `still/` | 15 still, `awal-tengah-akhir-360px.png`, `lembar-360px.png` |
| `edl.json`, `build.py`, `overlay/`, `audio/`, `rekam/`, `cover/` | File proyek yang dapat diedit dan dirender ulang |

## Porsi durasi dan alur (waktu keluaran; narasi dari ASR `audio/asr.json`)
Atlas 3D 0 - 12,0 dtk (35%) + Live 4D Lab 12,0 - 25,7 dtk (40%, termasuk sisipan Atlas 1,9 dtk) = **sekitar 75%**; montage fitur lain 25,7 - 31,5 dtk (17%); penutup 31,5 - 34,3 dtk (8%). Targetnya "sekitar 80%": kalimat narasi tentang fitur lain (5,3 dtk) dan penutup tidak bisa diperpendek tanpa mengubah naskah.
| Waktu | Narasi | Visual (rekaman asli) | Bunyi |
|---|---|---|---|
| 0 - 5,2 | "Pernah lihat anatomi di gambar..." | Atlas 3D: model berputar dan lapisan (fasia) dibuka sejak bingkai pertama | "ting" saat lapisan terbuka |
| 5,2 - 8,4 | "Di Atlas 3D MEDCOEL, kamu bisa memutar tubuh" | Model diputar, struktur terpilih | "ting", "blip" |
| 8,4 - 10,1 | "membuka lapisan" | Lapisan transparan, otot di bawahnya terlihat | "ting" |
| 10,1 - 12,0 | "mencari struktur dan melihat keterangannya" | Kartu struktur diperbesar: nama, nama Latin, tombol Isolasi/Sembunyikan/Pudarkan | "ting" |
| 12,0 - 13,5 | "Lalu masuk ke Live 4D Lab" | Beranda web: kartu "Live 4D Lab" dan tombol "Buka Live 4D Lab" (transisi mode) | kilau |
| 13,5 - 19,0 | "Gerakkan probe, amati simulasi USG dan CT" | Probe digerakkan, citra USG dan CT berubah (citra besar atas, pasien 3D bawah) | "blip", "ting" |
| 19,0 - 21,6 | "serta bandingkan skenario yang tersedia" | Pilihan skenario (Normal, Fungsi sistolik LV menurun, Efusi perikardial), dipercepat 1,5x | "blip", "ting" |
| 21,6 - 25,7 | "Jadi, kamu bisa melihat bentuknya, lalu menyaksikan geraknya" | Atlas (bentuk), lalu CT jantung bergerak (gerak) | kilau |
| 25,7 - 31,5 | "materi per bab, latihan soal, dan Simulasi Dokter" | Montage web asli: materi per bab, latihan soal, Simulasi Dokter | "blip" tiap pindah |
| 31,5 - 34,3 | "Eksplorasi gratis di medcoel.com" | Logo MEDCOEL, "EKSPLORASI GRATIS DI MEDCOEL.COM", medcoel.com | "chime" |

Label **"Simulasi edukatif, bukan alat diagnosis"** tampil pada semua shot Live 4D Lab (kecuali beranda dan sisipan Atlas); di UI asli lencana yang sama juga ada di bilah atas.

## Sumber rekaman
- Drive (folder `1-3hv4o99SrJBq9g9uGpTcWNqFNj9GhNW`, 2816 x 1582): `Perekaman Layar 2026-11-10 pukul 23.53.24.mov` (Atlas 3D; potongan 10-17, 26-31, 36-38, 44-50 dtk) dan `... pukul 23.55.23.mov` (Live 4D Lab; potongan 0-3, 3-5, 6-9, 135-139, 146-150 dtk). Rekaman mentah tidak di-commit; beri nama `rec_23.53.24.mov` dan `rec_23.55.23.mov` di satu folder untuk merender ulang.
- **Privasi:** `23.55.23` pada kira-kira 172-185 dtk memuat aplikasi chat pribadi; bagian itu tidak dipakai.
- **Fitur lain (montage):** materi per bab, latihan soal, dan Simulasi Dokter **tidak ada di bahan Drive**, jadi direkam dari **web MEDCOEL asli** yang dijalankan lokal (`rekam/web.cjs`; data uji: akun demo, 26 soal Anatomi; bukan data produksi). Ketiga fitur ada di web saat ini (halaman `/mata-kuliah/:slug/materi/:bab`, dialog latihan soal, `/simulasi-dokter`), sehingga naskah **tidak perlu diubah**. Tidak ada UI buatan; hanya dipotong, dibingkai, dan diberi kursor.
- Transisi Atlas ke Live 4D Lab memakai alur nyata di aplikasi (beranda memiliki dua kartu: Atlas 3D dan Live 4D Lab) dan **hanya transisi visual**; tidak dinyatakan bahwa kedua model tersambung secara klinis.

## Suara dan lisensi audio
- **Narasi:** rekaman dari pemesan (Gemini TTS, `audio/narator.wav`); hak pakainya mengikuti ketentuan layanan pembuatnya. Pengucapan "MEDCOEL" di rekaman terdengar seperti "Med-kol"; di layar selalu tertulis MEDCOEL. (Versi sebelumnya memakai Piper TTS; sudah diganti dan kodenya dihapus.)
- Musik **"MEDCOEL Atlas Pulse"** (104 BPM: denyut bass halus, pad synth bersih, arpeggio pluck) dan efek **"MEDCOEL UI Pings"** (ting, blip bergaya pixel, kilau, chime) **disintesis dari kode** (`audio/audio_mix.py`), dibuat untuk MEDCOEL, **CC0 1.0** (domain publik); tidak ada sampel pihak ketiga. Musik diturunkan otomatis di bawah suara; maksimum satu efek per 0,25 dtk.

## Batasan jujur
- Video belum diputar dengan telinga/ponsel sungguhan; sinkron kata-gerakan mengikuti waktu kata dari ASR, tetapi isi rekaman sumber tidak bisa diatur per kata (aksi bisa meleset sekitar 0,5 dtk).
- Sorotan dada yang menjadi tampilan tubuh dan probe tidak digambar; transisi memakai halaman beranda asli.
- Satu shot kartu (12,0 - 13,9) berasal dari rekaman yang sering menyilih struktur; saya memilih potongan tanpa keadaan kosong. Antarmuka Live 4D Lab tidak ditampilkan utuh pada video ini (sudah ada di video promo Live 4D Lab).
- Cuplikan web montage berukuran sekitar 960 x 1600 px; teks kecil di UI asli tidak terbaca pada lebar 360 px.

## Merender ulang
```bash
cd <akar repo>
python3 -m http.server 8128 --bind 127.0.0.1 &
node video/atlas-4d-promo/overlay/render-overlay.cjs
python3 video/atlas-4d-promo/audio/asr.py narator                       # (opsional; dari folder audio/) waktu kata
python3 video/atlas-4d-promo/audio/audio_mix.py                         # musik + efek + mix (membaca edl.json)
# klip web (butuh PocketBase + Vite lokal): bash video/atlas-4d-promo/rekam/siapkan.sh ; (cd apps/web && npx vite --host 127.0.0.1 --port 3000)
node video/atlas-4d-promo/rekam/web.cjs video/atlas-4d-promo/rekam/web materi latihan sim
python3 video/atlas-4d-promo/build.py <folder-rekaman-drive>            # -> medcoel-atlas-4d.mp4
node video/atlas-4d-promo/cover/render-cover.cjs
```
