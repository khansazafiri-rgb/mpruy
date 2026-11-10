# Video promo: "Atlas 3D + Live 4D Lab" (Reels/TikTok 1080 x 1920, 30 fps, 38,3 detik, dengan narasi)

Video produk MEDCOEL: Atlas 3D (putar tubuh, buka lapisan, pilih struktur, nama dan keterangan) dilanjutkan Live 4D Lab (probe, simulasi USG dan CT, skenario), lalu montage singkat materi per bab, latihan soal, dan Simulasi Dokter, ditutup "Eksplorasi gratis di medcoel.com". Narasi mengikuti naskah final **kata demi kata dan urutannya** (tidak diubah).

## Hasil
| Berkas | Isi |
|---|---|
| `medcoel-atlas-4d.mp4` | Video jadi (H.264 + AAC, sekitar -14,2 LUFS, puncak -1,5 dBFS) |
| `cover/cover.png` | Cover 1080 x 1920 khusus: "LIHAT BENTUKNYA. SAKSIKAN GERAKNYA.", kartu Atlas 3D dan Live 4D Lab (tangkapan asli), "COBA GRATIS DI MEDCOEL.COM" |
| `cover/cover-panduan-area-aman.png`, `cover/cover-bersama-awal-video-360px.png` | Garis area aman TikTok/Reels; cover + bingkai awal pada 360 px |
| `still/` | 15 still, `awal-tengah-akhir-360px.png`, `lembar-360px.png` |
| `edl.json`, `build.py`, `overlay/`, `audio/`, `rekam/`, `cover/` | File proyek yang dapat diedit dan dirender ulang |

## Porsi durasi
Atlas 3D 0 - 14,3 dtk (37%) + Live 4D Lab 14,3 - 28,1 dtk (36%, termasuk satu sisipan Atlas 1,8 dtk) = **sekitar 73-74%**; montage fitur lain 28,1 - 34,4 dtk (16%); penutup 34,4 - 38,3 dtk (10%). Targetnya "sekitar 80%": kalimat narasi tentang fitur lain (6,1 dtk) dan penutup tidak bisa diperpendek tanpa mengubah naskah, jadi porsi Atlas + 4D berhenti di angka itu.

## Alur (waktu keluaran; narasi mulai: k1 0,3 / k2 6,4 / k3 14,5 / k4 23,5 / k5 28,1 / k6 34,6)
| Waktu | Visual (rekaman asli) | Bunyi |
|---|---|---|
| 0 - 6,4 | Atlas 3D: model berputar dan lapisan (fasia) dibuka sejak bingkai pertama | "ting" saat lapisan terbuka |
| 6,4 - 9,6 | Memutar tubuh, struktur tersorot/terpilih | "ting" struktur ditemukan |
| 9,6 - 12,0 | Lapisan dibuat transparan, otot di bawahnya terlihat | "blip" |
| 12,0 - 13,9 | Kartu struktur diperbesar: nama, nama Latin, tombol Isolasi/Sembunyikan/Pudarkan | "ting" |
| 13,9 - 15,4 | Beranda web: kartu "Live 4D Lab" dan tombol "Buka Live 4D Lab" (transisi mode) | kilau digital |
| 15,4 - 21,0 | Live 4D Lab: probe digerakkan, citra USG dan CT berubah (susunan citra besar di atas, pasien 3D di bawah) | "blip", "ting" saat probe pindah |
| 21,0 - 23,9 | Pilihan skenario (Normal, Fungsi sistolik LV menurun, Efusi perikardial) | "blip", "ting" |
| 23,9 - 25,7 | Kembali ke Atlas: "bentuknya" | |
| 25,7 - 28,1 | CT jantung bergerak: "geraknya" | kilau |
| 28,1 - 34,4 | Montage web asli: materi per bab, latihan soal ("Siapkan sesi belajarmu"), Simulasi Dokter | "blip" tiap pindah |
| 34,4 - 38,3 | Logo MEDCOEL, "EKSPLORASI GRATIS DI MEDCOEL.COM", medcoel.com | "chime" |

Label **"Simulasi edukatif, bukan alat diagnosis"** tampil pada semua shot Live 4D Lab (kecuali beranda dan sisipan Atlas); di UI asli lencana yang sama juga ada di bilah atas.

## Sumber rekaman
- Drive (folder `1-3hv4o99SrJBq9g9uGpTcWNqFNj9GhNW`, 2816 x 1582): `Perekaman Layar 2026-11-10 pukul 23.53.24.mov` (Atlas 3D; potongan 10-17, 26-31, 36-38, 44-50 dtk) dan `... pukul 23.55.23.mov` (Live 4D Lab; potongan 0-3, 3-5, 6-9, 135-139, 146-150 dtk). Rekaman mentah tidak di-commit; beri nama `rec_23.53.24.mov` dan `rec_23.55.23.mov` di satu folder untuk merender ulang.
- **Privasi:** `23.55.23` pada kira-kira 172-185 dtk memuat aplikasi chat pribadi; bagian itu tidak dipakai.
- **Fitur lain (montage):** materi per bab, latihan soal, dan Simulasi Dokter **tidak ada di bahan Drive**, jadi direkam dari **web MEDCOEL asli** yang dijalankan lokal (`rekam/web.cjs`; data uji: akun demo, 26 soal Anatomi; bukan data produksi). Ketiga fitur ada di web saat ini (halaman `/mata-kuliah/:slug/materi/:bab`, dialog latihan soal, `/simulasi-dokter`), sehingga naskah **tidak perlu diubah**. Tidak ada UI buatan; hanya dipotong, dibingkai, dan diberi kursor.
- Transisi Atlas ke Live 4D Lab memakai alur nyata di aplikasi (beranda memiliki dua kartu: Atlas 3D dan Live 4D Lab) dan **hanya transisi visual**; tidak dinyatakan bahwa kedua model tersambung secara klinis.

## Suara (narasi) dan lisensi audio
- Narasi: **Piper TTS** (jaringan saraf lokal), suara **id_ID-news_tts-medium** (rhasspy/piper-voices di Hugging Face). Lisensi model suara tercantum pada kartu modelnya di sana (piper-voices memuat lisensi per suara; **tolong periksa kartu `id_ID/news_tts` sebelum publikasi komersial**; saya tidak dapat memverifikasinya dari sesi ini). Ejaan pengucapan disesuaikan secara fonetik di `audio/tts.py` ("Med koel", "Medkoel dot com", "tiga de", "Laif empat de"); teks naskah tidak berubah.
- Musik **"MEDCOEL Atlas Pulse"** (104 BPM: denyut bass halus, pad synth bersih, arpeggio pluck) dan efek **"MEDCOEL UI Pings"** (ting, blip bergaya pixel, kilau, chime) **disintesis dari kode** (`audio/audio_mix.py`), dibuat untuk MEDCOEL, **CC0 1.0** (domain publik); tidak ada sampel pihak ketiga. Musik diturunkan otomatis di bawah suara; maksimum satu efek per 0,25 dtk.

## Batasan jujur
- **Suara TTS terdengar sintetis.** Piper adalah satu-satunya mesin TTS Indonesia yang bisa dijalankan di sesi ini; hasilnya jelas dan intonasinya wajar, tetapi belum sehangat penutur manusia. Untuk hasil terbaik, ganti `audio/kalimat/k1..k6.wav` dengan rekaman suara asli atau TTS lain (panjang tiap kalimat boleh berbeda, sesuaikan `narasi` dan durasi shot di `edl.json`). Kata "MEDCOEL" diucapkan "Med-koel".
- Video belum diputar dengan telinga/ponsel sungguhan; sinkron kata-gerakan diatur dari perkiraan waktu per kalimat (kata kunci di tengah kalimat bisa meleset sekitar 0,5-1 dtk).
- Sorotan dada yang menjadi tampilan tubuh dan probe tidak digambar; transisi memakai halaman beranda asli.
- Satu shot kartu (12,0 - 13,9) berasal dari rekaman yang sering menyilih struktur; saya memilih potongan tanpa keadaan kosong. Antarmuka Live 4D Lab tidak ditampilkan utuh pada video ini (sudah ada di video promo Live 4D Lab).
- Cuplikan web montage berukuran sekitar 960 x 1600 px; teks kecil di UI asli tidak terbaca pada lebar 360 px.

## Merender ulang
```bash
cd <akar repo>
python3 -m http.server 8128 --bind 127.0.0.1 &
node video/atlas-4d-promo/overlay/render-overlay.cjs
python3 video/atlas-4d-promo/audio/tts.py <folder-model-piper>         # narasi (model: id_ID-news_tts-medium.onnx + .json)
python3 video/atlas-4d-promo/audio/audio_mix.py                         # musik + efek + mix (membaca edl.json)
# klip web (butuh PocketBase + Vite lokal): bash video/atlas-4d-promo/rekam/siapkan.sh ; (cd apps/web && npx vite --host 127.0.0.1 --port 3000)
node video/atlas-4d-promo/rekam/web.cjs video/atlas-4d-promo/rekam/web materi latihan sim
python3 video/atlas-4d-promo/build.py <folder-rekaman-drive>            # -> medcoel-atlas-4d.mp4
node video/atlas-4d-promo/cover/render-cover.cjs
```
