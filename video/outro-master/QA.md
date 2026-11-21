# QA outro master (`brand/video/outro/medcoel-outro-master.mp4`)

## Batas yang jujur
Lingkungan pembuat tidak bisa memutar video bersuara pada kecepatan normal. **Saya tidak menonton master (atau video USG 49 - 67,2 dtk) dengan suara.** Yang dilakukan: bingkai demi bingkai dan kontak sheet dari MP4 (tiap 0,45 dtk untuk seluruh 16,2 dtk; bingkai penuh-resolusi dan versi 390 px untuk uji keterbacaan ponsel), ASR pada audio master, pengukuran kenyaringan/puncak/lompatan sampel/RMS per 0,6 dtk, deteksi hitam/beku, dan uji tempel setelah video lain. Gerak yang mulus, ritme, dan rasa audio-visual harus dinilai orang saat memutar dengan suara.

## Temuan audit awal (outro pada video USG, mulai 51,50 dtk)
- Gambar: bingkai 1545 (51,50 dtk) adalah awal bersih; tidak ada sisa adegan edukasi. Bingkai pertamanya hanya label + latar yang memudar masuk 0,35 dtk (bingkai awal hampir kosong).
- Suara: TIDAK bersih. Efek peralihan ("masuk-outro") mulai 51,2 dtk dan ekor musik video edukasi masih terdengar di 51,4 - 52,2 dtk (RMS -17 dB), sebelum suara outro masuk (52,6 dtk). Jika dipotong dari file final, sisa itu terbawa.
- Kecepatan: materi/latihan/Simulasi Dokter dipercepat 1,9 - 2,5x (1,1 - 1,5 dtk per fitur); Live 4D Lab hanya 2,1 dtk dengan citra monitor gelap; UI web diperbesar hanya ~1:1 (teks kecil di ponsel). Simulasi Dokter tidak sempat menampilkan "Mulai" -> pasien.
Karena itu outro dibangun ulang dari proyek sumber (bukan dipotong dari MP4 final).

## Perbaikan pada master
| Masalah | Perbaikan |
|---|---|
| Sisa suara edukasi di awal | Audio dibuat BARU dan mandiri: `audio/outro-baru.wav` (apa adanya, 24 -> 48 kHz) + musik/efek sintesis; masuk 0,12 dtk, tanpa sisa suara lain |
| Awal hampir kosong | Gambar Atlas 3D penuh dan label ATLAS 3D sudah ada di bingkai pertama (bingkai kunci) |
| Fitur terlalu cepat | Semua klip 1,0x: materi 1,7 dtk, latihan 1,5 dtk, Simulasi Dokter 1,7 dtk (potongan dipilih agar satu tindakan jelas terlihat) |
| 3D / 4D terlalu pendek | Atlas 3D 2,7 dtk (otot tampil, lapisan dibuka satu per satu); Live 4D Lab 2,5 dtk dengan citra terang dan berubah jelas (take `hook` bingkai 100-174, dipilih dari pengukuran kecerahan/perubahan citra) |
| Teks UI kecil | UI diperbesar 1,1 - 1,3x dan bingkai dilebarkan (1020 px); diuji pada lebar 390 px |
| Logo ditahan | 6,0 dtk (10,15 - 16,2) |
Tinjauan sendiri setelah render pertama: klip Atlas awal hampir diam di 0,7 dtk pertama -> dipotong ulang (13,9 dtk); musik setelah suara naik terlalu keras (selisih ducking 12 dB) -> level dasar diturunkan, ducking 0,85; klip Simulasi Dokter berhenti sebelum pasien muncul -> diganti 2,0 - 3,7 dtk.

## Hasil terukur
| Pemeriksaan | Hasil |
|---|---|
| Format | H.264 High 1080 x 1920, 30 fps, 486 bingkai, 16,200 dtk; AAC-LC 48 kHz stereo 16,200 dtk; bingkai pertama = I-frame di pts 0; GOP 30 |
| Kenyaringan | -14,4 LUFS terintegrasi, LRA 5,8 LU, puncak sejati -1,4 dBFS |
| Awal / akhir audio | 20 ms pertama RMS 0,002 (naik halus), 20 ms terakhir RMS 0,0004, sampel terakhir 0 |
| Lompatan sampel | Lompatan besar hanya di dalam suara narator (konsonan; identik di berkas sumber `outro-baru.wav`), bukan klik hasil campuran |
| ASR audio master | "Di MedCoal, jelajahi Atlas 3D dan Live 4D Lab. Lanjut belajar lewat materi, latihan soal, dan simulasi doktor. Gratis di MedCoal.com" (kesalahan ASR pada ejaan merek; audio sumber tidak diubah) |
| Deteksi hitam | Tidak ada bingkai hitam |
| Deteksi beku (>=0,5 dtk, -60 dB) | 1,5 - 2,0 dtk (Atlas, gerak lambat); 7,27 - 8,0 dtk (soal, membaca pilihan); 10,6 - 11,2 dtk (masuk logo); 11,5 - 16,2 dtk (logo/URL ditahan sengaja, hanya Raka bergerak halus) |
| Keterbacaan ponsel | Pada lebar 390 px: judul bab, teks soal, opsi jawaban, chip poli, "BELAJAR FK GRATIS", "medcoel.com", label simulasi terbaca |
| Uji tempel | 8 dtk terakhir bagian edukasi video USG + master -> 24,2 dtk (726 bingkai), audio 24,213 dtk, -14,1 LUFS, puncak -1,1 dBFS; sambungan = potongan keras ke bingkai Atlas 3D; level audio kontinu (musik awal master lebih pelan dari akhir video utama, lalu suara masuk di 0,7 dtk) |

## Yang perlu dinilai manusia (belum dilakukan)
- Putar master penuh dengan suara pada ponsel: ritme tiga fitur belajar (1,5 - 1,7 dtk masing-masing) dan sinkron suara-gambar. Selisih kata-gambar (kata diucapkan vs gambar muncul): klip materi mulai 0,6 dtk SEBELUM kata "materi" (5,84 dtk); klip latihan mulai 0,3 dtk SESUDAH "latihan soal" (6,56 dtk); klip Simulasi Dokter mulai 0,8 dtk SESUDAH "Simulasi Dokter" (7,58 dtk); logo muncul 0,4 dtk SESUDAH "medcoel.com" mulai diucapkan (9,76 dtk). Semua di bawah 1 dtk, tetapi perlu dinilai saat diputar.
- Atlas 3D diambil dari MP4 video Atlas yang sudah jadi (rekaman mentah tidak ada di repo), dipotong ke panel model tanpa judul/takarir; resolusi 724 x 890 diperbesar 1,41x. Jika ada rekaman Atlas mentah beresolusi lebih tinggi, ganti klip `atlas`.
