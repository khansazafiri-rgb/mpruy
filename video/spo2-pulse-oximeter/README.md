# Video edukasi "Bagaimana penjepit jari bisa membaca SpO₂?" (Reels/TikTok 1080 x 1920, 30 fps, 99,80 dtk)

Video edukasi MEDCOEL tentang cara pulse oximeter (penjepit jari) **memperkirakan** SpO₂ dan denyut nadi: dua lampu (merah dan inframerah) di satu sisi jari, fotodetektor di seberangnya, cahaya melewati jaringan (oksigen tidak ditembakkan), darah arteri berdenyut sehingga sinyal berubah, hemoglobin beroksigen dan tanpa oksigen menyerap kedua cahaya secara berbeda, prosesor membandingkan sinyal. Lalu keterbatasan (angka bukan diagnosis, gerakan, dingin, aliran lemah, cat kuku, warna kulit, bukan CO₂, keracunan CO), cara membaca yang benar, dan outro web MEDCOEL asli.

Suara: `audio/narasi-edukasi.wav` (Google AI Studio, dari pemesan; **tidak dipercepat atau diubah nadanya**, hanya dipotong di jeda alami 83,9 dtk dan di-resample 24 -> 48 kHz) dan `audio/medcoel-outro-master.wav` (**master outro yang sama persis**, SHA-256 di `audio/SHA256SUMS.txt`, hanya di-resample). Tidak ada narator buatan sendiri.

## Hasil
| Berkas | Isi |
|---|---|
| `spo2-pulse-oximeter_final.mp4` | Video jadi (H.264 + AAC, -14,1 LUFS, puncak -1,1 dBFS) |
| `cover/cover.png` | Cover 1080 x 1920; `cover-panduan-area-aman.png`, `cover-potong-3x4.png`, `cover-bersama-awal-video-360px.png` |
| `takarir.srt`, `takarir.vtt` | Takarir (teks narasi + kalimat master outro) |
| `still/` | 25 still, `lembar-270px.png`, `awal-tengah-akhir-360px.png` |
| `NASKAH.md` | Narasi per waktu, adegan, aksi layar, catatan akurasi |
| `SUMBER.md` | Sumber medis yang benar-benar dibuka, bahan repo, lisensi audio |
| `QA.md` | Laporan QA dua putaran dan masalah yang tersisa |
| `stage/`, `audio/`, `rekam/`, `render.mjs`, `shot.cjs`, `buat_takarir.py`, `cover/render-cover.cjs` | Proyek yang bisa diedit |

## Peta ruang alat (satu orientasi di seluruh video)
Ujung jari menunjuk ke **kanan**, kuku di **atas**. Rahang atas penjepit berisi lampu merah dan inframerah (di bawah papan sirkuit), prosesor, dan layar; rahang bawah berisi fotodetektor; engsel di kanan. Cahaya selalu merambat **dari atas ke bawah**: lampu -> kuku -> jaringan -> tulang -> pembuluh arteri -> jaringan bawah -> detektor. Pembuluh arteri horizontal di bawah tulang, darah mengalir dari **kiri** (pangkal jari) ke **kanan** (ujung jari). Kamera pada dunia penampang hanya bergerak (zoom/geser) pada satu ruang ini; potongan keluar ke alat luar dan kembali memakai ruang yang sama.

## Alur adegan (detik video = detik narasi + 0,3)
| Waktu | Adegan |
|---|---|
| 0,0 - 7,0 | Hook: bingkai pertama = penjepit menutup pada jari Raka, lampu menyala, angka berubah (86 -> 97, PR 58 -> 72) sebelum stabil; kamera dari close-up alat mundur ke Raka yang melihat dua angka dan bertanya; "KOK BISA TAHU OKSIGEN?" |
| 7,0 - 11,7 | Alat dipotong: lampu merah menyala **tepat pada kata "merah"** (8,60), inframerah **tepat pada "inframerah"** (9,02), sensor disorot pada "sensor"; label "Merah + inframerah"; inframerah diberi warna ungu ilustratif dan tertulis "warna ilustratif, tak terlihat mata" |
| 11,7 - 16,3 | Berkas merambat ke bawah melewati ujung jari; foton yang selamat tiba di detektor; pengukur "Cahaya di sensor"; kamera mengikuti berkas ke bawah |
| 16,3 - 22,8 | Kamera masuk ke pembuluh; eritrosit mengalir ke kanan; sel beroksigen (merah terang + titik O₂) lewat pada "membawa oksigen", sel tanpa oksigen (ungu tua) pada "tidak membawanya"; berkas merah/inframerah meredup berbeda pada tiap sel; grafik batang serapan; "Dua cahaya, dua pola serapan" |
| 23,7 - 26,8 | Pembuluh membengkak tiap denyut (satu siklus diperlambat, denyut pertama tepat pada "denyut" 25,92); cahaya di sensor turun saat pembuluh menebal; "Sinyal berubah tiap denyut" |
| 26,8 - 34,7 | Dua grafik (merah, inframerah) dari denyut yang sama -> tinggi denyut diukur -> dibagi -> titik pada kurva kalibrasi -> "SpO₂ ≈ 97%" (pada "SpO₂") -> batang Hb: 97% membawa O₂; "SpO₂: estimasi saturasi" |
| 34,7 - 39,9 | Kamera keluar ke alat luar: lingkar "SpO₂: estimasi saturasi" dan "PR: denyut nadi per menit" (jantung berdenyut) |
| 39,9 - 49,3 | Potongan singkat: pemantauan operasi (monitor), keluhan pernapasan (Raka batuk), penyakit paru dan terapi oksigen |
| 49,9 - 52,1 | "Angka bukan diagnosis" (angka ≠ diagnosis) |
| 52,0 - 59,6 | Gangguan nyata pada sinyal: jari dingin (pembuluh menyempit, denyut kecil), gerakan (sinyal berantakan), aliran lemah (denyut nyaris datar), cat kuku (lapisan meredam), warna kulit (lapisan pigmen); angka di layar bergoyang dengan tanda "?"; "Angka bisa keliru" |
| 59,6 - 61,9 | Bukan CO₂ ("Tidak mengukur CO₂") |
| 62,3 - 68,9 | Keracunan CO: sel Hb–CO tampak seperti sel beroksigen, layar menampilkan angka bagus (98) tetapi "kondisinya berbahaya" (Raka pusing) |
| 69,3 - 77,4 | Cara membaca: hangatkan tangan, lepas cat kuku, diam sejenak, tunggu angka stabil |
| 77,3 - 79,5 | "Lihat angka + gejala" (gejala dan perubahan angka) |
| 79,4 - 84,6 | Sesak atau kondisi memburuk -> jangan menunggu satu angka -> cari pertolongan |
| 84,65 - 99,8 | Outro: rekaman web asli (materi per bab, latihan soal + pembahasan, Simulasi Dokter) mengisi layar; `medcoel-outro-master.wav` mulai 1,2 dtk setelah web terlihat (85,85); logo + "Belajar FK gratis di MEDCOEL" + "medcoel.com" ditahan 5,9 dtk (93,95 - 99,8) di atas panel web yang masih bergerak |

## Aturan isi yang dijaga
- SpO₂ diperlakukan sebagai **perkiraan** (tertulis "estimasi", "≈", "kurva kalibrasi alat"); bukan ukuran total oksigen yang tiba di organ, bukan pembaca karbon dioksida, bukan penentu penyebab sesak.
- Oksigen tidak ditembakkan dari alat: yang digambar hanya foton dari lampu yang melewati jaringan.
- Pulse oximeter biasa dapat gagal mengenali keracunan CO; satu nilai SpO₂ tidak dipakai sebagai jaminan aman.
- Semua angka di layar (97, 72, 98, 92, dst.) adalah **contoh ilustratif**; koefisien serap, kurva kalibrasi, dan rasio pada animasi adalah model sederhana (bukan data produsen).

## Merender ulang
```bash
cd <akar repo>
bash video/spo2-pulse-oximeter/rekam/siapkan-outro.sh                    # potongan web asli -> rekam/web/ + outro-web.mp4
python3 -m http.server 8140 --bind 127.0.0.1 &                            # server statis akar repo
python3 video/spo2-pulse-oximeter/audio/asr.py narasi-edukasi medcoel-outro-master   # (opsional) ASR kata -> asr.json (jalankan dari audio/)
(cd video/spo2-pulse-oximeter/audio && python3 build_audio.py && python3 cek_audio.py)
node video/spo2-pulse-oximeter/render.mjs video/spo2-pulse-oximeter/frames 0 2993 4
ffmpeg -y -framerate 30 -i video/spo2-pulse-oximeter/frames/f%05d.jpg -i video/spo2-pulse-oximeter/audio/mix.wav -c:v libx264 -crf 18 -pix_fmt yuv420p -c:a aac -b:a 192k -ar 48000 \
  -af "alimiter=limit=0.95:attack=2:release=50,loudnorm=I=-14:TP=-1.5:LRA=11" -shortest -movflags +faststart video/spo2-pulse-oximeter/spo2-pulse-oximeter_final.mp4
python3 video/spo2-pulse-oximeter/buat_takarir.py; node video/spo2-pulse-oximeter/cover/render-cover.cjs
```
Memeriksa bingkai: `node video/spo2-pulse-oximeter/shot.cjs "2.2,18.2" <folder>`. Frame mentah (`frames/`, `rekam/web/`) dan `audio/mix.wav` tidak di-commit.

## Struktur kode (`stage/`)
`timeline.js` (waktu bersama, kata kunci ASR, takarir) · `physics.js` (model sinyal ilustratif: fase denyut, serap, kurva kalibrasi) · `anatomy.js` (penampang jari, penjepit, pembuluh, sel darah, berkas dan foton) · `scenes.js` (hook, dunia penampang, grafik, komposisi `frame(t)`, sampul) · `scenes2.js` (hasil di layar, kegunaan, gangguan sinyal, CO₂/CO, cara membaca, outro) · `stage.js` (rendering per bingkai, panel web). Raka dirender dari `brand/characters/raka/raka.js` dengan `rakaSvg()` (tidak digambar ulang).
