# Video promo: "Live 4D Lab" (Reels/TikTok 1080 x 1920, 30 fps, 19,83 detik, tanpa voice-over)

"Anatomi yang bisa kamu lihat bergerak, dan bisa dicoba gratis." Video produk (bukan tutorial) dari **rekaman layar asli** fitur Live 4D Lab MEDCOEL: citra CT/USG jantung yang bergerak, probe digerakkan di pasien virtual, tampilan CT tri-planar, struktur anatomi yang tersorot, antarmuka utuh, lalu ajakan "COBA GRATIS DI MEDCOEL.COM". Tidak ada narasi; gerak fitur, musik, teks singkat, dan efek bunyi antarmuka yang membawa cerita.

## Hasil
| Berkas | Isi |
|---|---|
| `medcoel-live-4d-lab.mp4` | Video jadi (H.264 + AAC, terukur sekitar -14,7 LUFS, puncak -1,4 dBFS) |
| `cover/cover.png` | Cover 1080 x 1920 khusus (bukan bingkai pertama): "ANATOMI YANG BISA KAMU LIHAT BERGERAK", LIVE 4D LAB, citra jantung dan pasien 3D asli, "COBA GRATIS DI MEDCOEL.COM" |
| `cover/cover-panduan-area-aman.png` | Cover dengan garis area aman TikTok/Reels |
| `cover/cover-bersama-awal-video-360px.png` | Cover dan bingkai pertama pada lebar 360 px |
| `still/` | 12 still, `awal-tengah-akhir-360px.png`, `lembar-360px.png` |
| `edl.json`, `build.py`, `overlay/`, `audio/audio_mix.py`, `cover/` | File proyek yang dapat diedit dan dirender ulang (di bawah) |

## Alur (4 ketukan = 1 bar = 2,2 dtk pada 109 BPM; potongan jatuh pada batas bar)
| Waktu | Shot | Teks | Bunyi |
|---|---|---|---|
| 0,0 - 2,2 | Citra CT jantung (zoom) + pasien 3D: jantung langsung terlihat, probe menyapu, citra berubah | LIHAT JANTUNGNYA BERGERAK | "ting" tiap citra berubah (0,5; 1,0; 1,8) |
| 2,2 - 4,4 | Citra USG + CT ganda, probe digerakkan di dada | GERAKKAN PROBENYA | "ting" saat probe pindah (3,55) |
| 4,4 - 6,6 | Citra CT jantung diperbesar penuh, struktur muncul | | "ting" (5,7) saat citra berganti |
| 6,6 - 8,8 | Tri-planar CT (aksial, koronal, sagital) + bidang CT di tubuh 3D bergerak | | "blip", "ting" |
| 8,8 - 11,0 | CT sagital dengan segmentasi struktur (Trunkus & a. pulmonalis) diperbesar | | "blip" |
| 11,0 - 13,2 | Efusi perikardial: struktur dan label diperbesar | | kilau digital, "blip" |
| 13,2 - 15,4 | **Antarmuka Live 4D Lab utuh** (zoom pelan) | LIVE 4D LAB | kilau, "blip" |
| 15,4 - 17,6 | Probe bergerak lagi, citra jantung berubah | | "ting" |
| 17,6 - 19,8 | Logo MEDCOEL, medcoel.com | COBA GRATIS DI MEDCOEL.COM | "chime" |

Label kecil **"Simulasi edukatif"** tampil pada semua adegan klinis (selain UI utuh dan penutup). Di UI asli juga ada lencana "Simulasi edukatif · bukan alat diagnosis" dan keterangan "CT sintetis dari Atlas MEDCOEL · bukan citra pasien"; keduanya tidak diubah.

## Sumber rekaman (Drive, folder `1-3hv4o99SrJBq9g9uGpTcWNqFNj9GhNW`; 2816 x 1582, 60 fps)
| Berkas (nama pendek di `build.py`) | Isi | Dipakai |
|---|---|---|
| `Perekaman Layar 2026-11-10 pukul 23.55.23.mov` (`r5523`, 185,7 dtk) | Landing, Live 4D Lab: probe, USG+CT, CT bebas, segmentasi, efusi perikardial | Hampir seluruh shot (potongan 6-8, 111-113, 144-155) |
| `... pukul 23.59.44.mov` (`r5944`, 94,2 dtk) | Mode belajar/skenario, tri-planar CT dengan bidang di 3D | Shot tri-planar (84-86) |
| `... pukul 23.58.43.mov` (`r5843`, 45,8 dtk) | Auskultasi virtual | Diperiksa, tidak dipakai |
| `... pukul 23.53.24.mov` (`r5323`, 108,5 dtk) | Atlas 3D dan kuis | Diperiksa, tidak dipakai (bukan Live 4D Lab) |

Rekaman mentah (sekitar 700 MB) **tidak di-commit**; unduh dari Drive lalu beri nama seperti kolom pertama (`rec_23.53.24.mov`, `rec_23.55.23.mov`, `rec_23.58.43.mov`, `rec_23.59.44.mov`).
**Privasi:** rekaman `23.55.23` pada kira-kira 172-185 dtk menampilkan aplikasi chat pribadi (daftar percakapan dan jendela video). Bagian itu **sengaja tidak dipakai** dan tidak boleh dipotong ke video. Potongan yang dipakai hanya memuat halaman web MEDCOEL.
Kode web tidak dibuka dan tidak ada shot yang diambil ulang; tampilan fitur apa adanya dari rekaman (hanya di-crop, diperbesar, dan disusun ulang).

## Musik dan efek bunyi (lisensi)
Semua audio **disintesis dari kode** (`audio/audio_mix.py`, numpy); tidak ada sampel, rekaman, atau musik pihak ketiga, sehingga tidak ada lisensi pihak lain yang perlu dipenuhi.
| Judul | Isi | Pembuat | Lisensi |
|---|---|---|---|
| **MEDCOEL Live 4D Pulse** | Instrumental 109 BPM: denyut bass halus bergaya detak jantung (lub-dub tiap ketukan), pad synth bersih (Am9, Fmaj7, Cmaj7(9), G6), arpeggio pluck, hat tipis; tanpa alarm, monitor gawat darurat, atau suara horor | Dibuat untuk MEDCOEL pada sesi pembuatan video ini | CC0 1.0 (domain publik): boleh dipakai komersial, termasuk iklan Instagram, tanpa atribusi |
| **MEDCOEL UI Pings** | "ting", "blip" (gelombang persegi pendek, terinspirasi bunyi game pixel), kilau digital, "chime"; maksimum satu efek per 0,25 dtk; musik diturunkan sebentar di bawah efek | idem | CC0 1.0 |
Catatan: ini sintesis sederhana (bukan produksi studio). Kalau Anda lebih suka trek komersial berlisensi, ganti `audio/mix.wav` dan jalankan `build.py` lagi; sertakan judul dan sumber lisensinya.

## Merender ulang
```bash
cd <akar repo>
python3 -m http.server 8128 --bind 127.0.0.1 &                          # untuk overlay dan cover
node video/live-4d-lab/overlay/render-overlay.cjs                       # teks layar (PNG transparan)
python3 video/live-4d-lab/audio/audio_mix.py                            # musik + efek (membaca edl.json)
python3 video/live-4d-lab/build.py <folder-rekaman>                     # potong, crop, susun, overlay, audio -> medcoel-live-4d-lab.mp4
node video/live-4d-lab/cover/render-cover.cjs                           # cover.png (bingkai sumber: cover/heart.jpg, cover/probe.jpg)
```
Mengubah isi video: edit `edl.json` (tiap shot: rekaman `src`, detik awal `t`, `layout` = `stack` | `full` | `ui`, crop dalam piksel sumber 2816 x 1582, `teks`, `klinis`) dan daftar `sfx` (waktu keluaran, jenis). Teks layar ada di `overlay/overlay.html`.

## Batasan jujur
- Citra yang terlihat adalah **simulasi edukatif** (CT sintetis dari Atlas MEDCOEL), bukan citra pasien nyata dan bukan alat diagnosis; video tidak menyiratkan sebaliknya.
- Satu shot (4,4 - 6,6 dan 11,0 - 13,2) dimulai dengan citra berpindah sekitar 0,3 dtk (transisi bawaan aplikasi saat probe berpindah); saya biarkan karena justru memperlihatkan citra berubah.
- Hook (detik 0) memperlihatkan sektor jantung yang masih kecil lalu melompat ke zoom besar saat probe digerakkan di rekaman; bukan gerak yang dibuat-buat.
- Pada shot yang diperbesar, resolusi sumber (CT berpiksel kasar) tampak berbutir; itu bawaan citra aplikasi.
- Teks pada antarmuka utuh (13,2 - 15,4) kecil di layar ponsel; shot itu hanya untuk memperlihatkan bahwa ini fitur web. Detail dibaca pada shot yang diperbesar.
- Pratinjau 360 px dibuat dari still; video belum diputar di ponsel sungguhan.
- Efek bunyi mengikuti waktu perubahan citra yang saya ukur dari rekaman (selisih bingkai), bukan dari log aplikasi; selisih sekitar satu-dua bingkai mungkin ada.
