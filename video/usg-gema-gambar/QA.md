# Laporan pemeriksaan (QA)

## Batas yang jujur
- Lingkungan pembuat tidak bisa memutar video bersuara pada kecepatan normal. **Saya tidak menonton video ini dari awal sampai akhir dengan suara.** Yang saya lakukan: melihat bingkai-bingkai (still) yang diambil dari MP4 akhir (rapat: tiap 0,5 dtk untuk 5,5 dtk pertama; tiap ±0,7 - 1,5 dtk untuk seluruh video termasuk outro; plus bingkai kunci penuh-resolusi), ASR pada audio akhir, ukuran kenyaringan, dan deteksi hitam/beku. Kelancaran gerak, ritme, dan rasa audio-visual harus dinilai oleh orang.
- Pengambilan gambar Live 4D Lab menggunakan WebGL perangkat lunak (bukan GPU); tampilan dan warna bisa sedikit berbeda dari peramban dengan GPU. Pengaturan peramban ponsel nyata tidak diuji.

## Pemeriksaan terprogram pada `usg-gema-gambar_final.mp4`
| Pemeriksaan | Hasil |
|---|---|
| Format | H.264 1080 x 1920, 30 fps, 67,20 dtk (2016 bingkai); AAC 48 kHz |
| Kenyaringan | -14,2 LUFS terintegrasi, LRA 3,3 LU, puncak sejati -1,3 dBFS |
| Deteksi hitam | Tidak ada bingkai hitam |
| Deteksi beku (>=1 dtk, ambang -60 dB) | 28,9 - 30,4 dtk (gelombang dalam bergerak halus; saya periksa bingkai 28,9/29,6/30,3: gelombang naik, batang waktu terisi, jadi bukan beku sungguhan); 62,6 - 66,9 dtk (layar logo/URL, ditahan sengaja; Raka bergerak halus) |
| ASR audio akhir (faster-whisper small) | Semua kalimat naskah terbaca urut. Selisih ASR: "USG" terbaca **"USB"** (ASR keliru; pengucapan "u-es-ge" dari berkas pengguna; kata dipertahankan di takarir sebagai USG), "MEDCOEL" terbaca "MedColl" (ejaan nama merek dipertahankan di takarir). Waktu segmen ASR cocok dengan jangkar (mis. "Pertama" 8,72 dtk vs jangkar 8,36 + 0,3 = 8,66) |
| Suara tidak diubah | `audio/cek_audio.py`: korelasi mix-vs-sumber 0,993 (narasi) dan 0,998 (outro baru) dengan penguatan skalar; rasio suara/sisa 18,7 dan 23,5 dB; di pita ponsel (300 - 3400 Hz) median 30 dB, minimum 7,1 dB pada satu jendela 200 ms (efek bertepatan dengan akhir kata; lihat catatan di bawah) |
| Hash audio sumber | `audio/SHA256SUMS.txt` |

## Pemeriksaan visual: apa yang terlihat jelas
- 0 - 7,5 dtk: rekaman Live 4D Lab asli; probe bergerak (dari bingkai pertama) dan citra monitor berubah; label simulasi terbaca.
- 8,7 - 36 dtk: gel, SATU pulsa dan SATU gema, gema dekat vs dalam -> titik dangkal vs dalam, garis pindai menyusun sektor. Arah selalu sama (probe di atas, pulsa emas ke bawah, gema sian ke atas).
- 36,8 - 46,8 dtk: probe bergeser + miring; bidang kuning di penampang dan gambar di layar berubah bersamaan (vena/kista bulat berpindah posisi di gambar).
- 46,8 - 51,5 dtk: kembali ke Live 4D Lab asli dengan label simulasi.
- Outro: Atlas 3D, Live 4D Lab, materi, latihan soal, Simulasi Dokter (UI asli diperbesar untuk ponsel), logo + "BELAJAR FK GRATIS" + "medcoel.com" terbaca dan ditahan >5 dtk.

## Putaran perbaikan terarah (LOOP, maks. dua)
**Putaran 1** (dari kontak sheet seluruh video):
1. Bingkai pertama kosong (indeks rekaman negatif pada t < 0,3 dtk) -> indeks dijepit dan label judul tampil sejak bingkai 0; rekaman maju mengikuti waktu video.
2. Perubahan gambar saat geser/miring terlalu halus -> rentang geser diperbesar (+-260 px) dan "BUKAN KAMERA" ditambahkan pada kalimat tentang kamera.
3. Peralihan web -> logo di outro berupa pencampuran keruh dan ada jeda kosong 0,3 dtk -> jeda dihapus, peralihan dipercepat (0,3 dtk), logo muncul setelahnya.
**Putaran 2**:
4. Di adegan waktu-gema, label "Ilustrasi cara kerja USG" menimpa judul -> judul dinaikkan.
5. Bingkai 44,5 - 46,6 dtk hampir beku -> probe terus bergeser pelan sampai peralihan.
Perbaikan awal sebelum putaran (saat pembuatan): monitor Live 4D Lab tergambar di x salah (stage.js), label dan legenda saling tindih di hasil USG, tabel waktu dibangun dari ASR.

## Catatan yang masih perlu perhatian manusia
- SFX terkuat bertepatan dengan akhir kata pada satu jendela (minimum 7,1 dB di pita ponsel); musik jauh lebih pelan, tetapi mix bisa dipoles.
- Bagian outro mempercepat rekaman web 1,9x - 2,5x (labelnya "tampilan dipercepat"); karena audio outro hanya 10,36 dtk, tiga fitur belajar muncul masing-masing ±1,1 - 1,5 dtk.
- Brief menggambarkan outro ±15 dtk dan edukasi ±55 dtk; durasi di sini mengikuti audio yang diberikan (edukasi ±51,5 dtk, outro 15,7 dtk), sesuai arahan "durasi mengikuti audio akhir".
