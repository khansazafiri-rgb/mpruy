# MEDCOEL promo: "Bingung belajar anatomi?" (Reels/TikTok 1080 x 1920, 30 fps, 20,35 detik)

Iklan cepat MEDCOEL: masalah, solusi, dan bukti tampilan fitur dalam 15 detik pertama; fokus 3D Anatomy dan kuis interaktif, lalu materi, flashcard, latihan soal, dan simulasi dokter.
Suara satu-satunya adalah MP3 narator yang diberikan (`audio/narator.mp3`, 20,35 dtk), tidak diubah isi, kecepatan, atau nadanya. **Durasi akhir mengikuti MP3 (20,35 dtk), lebih pendek dari target "sekitar 30 detik".**
Hasil: `medcoel-promo-bingung-anatomi.mp4`, sampul `cover.jpg` (juga `cover/cover.png`). Musik dan SFX disintesis numpy (125 BPM, bebas hak cipta, boleh komersial); musik sekitar -14 dB di bawah narasi saat narasi berbicara; loudness akhir sekitar -14,1 LUFS.

## Sumber rekaman (semua visual produk = rekaman MEDCOEL asli)
| Sumber | Dipakai untuk |
|---|---|
| **Rekaman 1** (Drive `1_d8TDvaW9_RmZPgrMzOHvoAqiCLkUGdo`, "Perekaman Layar 2026-11-03 pukul 08.34.04.mov", 184 dtk, 2816x1582) | Beranda "Anatomi Manusia" (2,0-4,6 dtk), atlas 3D: otot wajah/dada (8,0-9,6), pilih region lalu struktur disorot (15-18), rusuk berputar (21-24,6), ganti sistem pembuluh ke otot (62-65,6), torso otot (66,4-67,6); kuis: pilih bagian tubuh dan sistem (77,8-83,4), struktur disorot di model 3D (103-107), pilih jawaban dan respons (111,2-114,8) |
| **Rekaman 2** (Drive `1b5iIPgAnz2WKO5yDVJNBFAx98d8ShzU_`, "Perekaman Layar 2026-11-03 pukul 08.43.10.mov", 117 dtk, 2816x1582) | Diperiksa isinya (mode "Temukan di 3D", "Tebak sistem", "Tebak region"); **potongan dari rekaman 2 tidak dipakai** karena rekaman 1 sudah menampilkan alur kuis "Kenali struktur" lengkap dan ketajamannya cukup |
| **Rekaman web lokal** (`rekam/web.cjs`, akun demo "Nadia Putri", data uji `video/tab-dua-puluh/seed`) | Catatan materi, flashcard, latihan soal, dan Simulasi jadi dokter (BAB "Osteologi & Artrologi", pasien "Bu Ratna" dari data simulasi bawaan). Ketiga fitur ini **tidak ada di dua rekaman Drive**, jadi direkam dari halaman web asli (`apps/web` lokal + PocketBase lokal), bukan tampilan buatan |

Bagian yang sengaja **tidak dipakai**: 1,7 detik pertama rekaman 1 (dasbor "Halo, Admin." dari akun admin) dan sekitar 4 detik terakhir rekaman 2 (bilah menu/dock komputer dengan ikon aplikasi lain). Tidak ada token, data pribadi, atau data admin di video. Bagian web lokal memakai akun demo dan soal uji, bukan data produksi.

## Urutan adegan (selaras ketukan 125 BPM = 0,48 dtk)
| Waktu | Isi |
|---|---|
| 0,0 - 2,4 | Hook: teks besar "BINGUNG BELAJAR ANATOMI?" di atas potongan cepat atlas 3D asli |
| 2,4 - 4,8 | Logo MEDCOEL + stempel "GRATIS!" (Kori sebagai aksen), lalu halaman web asli langsung naik dari bawah |
| 4,8 - 7,2 | "Anatomi 3D": tiga potongan cepat model asli (pilih region/struktur, putar, ganti sistem) |
| 7,2 - 9,6 | "Kuis interaktif": tiga panel (1 pilih area dan sistem, 2 lihat di 3D, 3 jawab) lalu panel jawaban diperbesar penuh agar pilihan dan responsnya terbaca |
| 9,6 - 13,4 | "Materi, flashcard, latihan soal": tiga panel; panel yang sedang disebut membesar bergantian |
| 13,4 - 16,8 | "Simulasi jadi dokter": panel pasien + panel pilihan pertanyaan/pemeriksaan (panel pertanyaan diperbesar) |
| 16,8 - 20,35 | Montase 3D / kuis / materi dan soal / simulasi, "BELAJAR KEDOKTERAN GRATIS", logo asli, medcoel.com, Kori |

Area aman: teks/chip di y 250-330 dan 1440+, panel di y 340-1496 (di atas bilah bawah Reels/TikTok); elemen penting di dalam 24-1056 px (x). Panel sumber tidak pernah dikecilkan ke bingkai HP: crop 1:1 sampai diperbesar 2,5x.

## Catatan jujur
- Narasi mengucapkan "MEDCOEL" mirip "Med-koel" dan "kuis" mirip "quiz"; di layar hanya tertulis MEDCOEL, "KUIS", dan medcoel.com.
- Contoh kuis di rekaman menampilkan respons "Belum tepat" (jawaban salah beserta pembahasan); ini apa adanya dari rekaman, bukan diubah.
- Gambar referensi cover seri sebelumnya (kopi) tidak sampai ke sesi ini; cover mengikuti gaya cover MEDCOEL lain di repo (hijau tua, judul tebal beraksen kuning, logo asli, Kori).
- Kori adalah maskot asli (`apps/web/src/mascots/kori.svg`); tidak ada karakter baru untuk video ini.

## Membuat ulang
```bash
cd video/promo-medcoel
# 1. unduh dua rekaman Drive ke scratchpad/promo/raw/rec1.mov dan rec2.mov, lalu ekstrak potongan (lihat rekam/extract-klip.sh)
# 2. PocketBase + Vite lokal dengan data uji (video/tab-dua-puluh/reset.sh), lalu: node rekam/web.cjs <folder>/web      (materi flash soal sim)
# 3. python3 audio/asr.py narator; ffmpeg -i audio/narator.mp3 -ac 1 -ar 44100 dialog.wav; python3 audio/audio_mix.py
# 4. (cd ../.. && python3 -m http.server 8128 --bind 127.0.0.1 &) ; ln -s <scratchpad/promo> stage/media
node render.mjs frames 0 610 4        # loudnorm dua langkah -> final.wav (sekitar -14 LUFS), lalu:
ffmpeg -framerate 30 -i frames/f%05d.jpg -i final.wav -c:v libx264 -crf 17 -pix_fmt yuv420p -c:a aac -b:a 192k -shortest medcoel-promo-bingung-anatomi.mp4
node cover/render-cover.cjs           # cover 1080 x 1920 + panduan area aman
```
Rekaman mentah dan bingkai hasil ekstrak (ratusan MB) tidak dicommit.
