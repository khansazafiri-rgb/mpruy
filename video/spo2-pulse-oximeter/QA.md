# Laporan QA (dua putaran terarah)

Alat: render penuh 2994 bingkai, kontak sheet seluruh video (tiap 1,25 dtk), bingkai penuh pada adegan penting, ASR + selubung energi audio untuk waktu kata, pengukuran LUFS, analisis rasio suara/musik/efek pada pita 300 - 3400 Hz (pendekatan speaker ponsel). **Tidak ada pemutaran dengan telinga manusia, speaker ponsel, atau headphone** (lingkungan tanpa perangkat audio).

## Putaran 1 (setelah render penuh pertama) - temuan dan perbaikan
| Temuan | Perbaikan |
|---|---|
| Lampu merah/inframerah menyala ~40 ms setelah kata; denyut pertama ~40 ms terlambat | Waktu kata disetel ulang dari selubung energi audio: "merah" 8,30, "inframerah" 8,72, "sensor" 10,42, "denyut" 25,62; terverifikasi pada piksel LED: merah menyala di bingkai 259 (8,63 dtk), inframerah di bingkai 271 (9,03 dtk), dalam 1 bingkai dari kata |
| Bingkai pertama: lampu belum menyala, layar `--` | Lampu menyala sejak bingkai 0, angka sudah berubah (86 -> 97, PR 58 -> 72) |
| Hook: Raka dan alat terlalu kecil saat Raka "melihat dua angka" | Kamera hook disetel (zoom 2,3 menjaga wajah Raka dan alat dalam satu bingkai) |
| Pengukur "Cahaya di sensor" menimpa engsel penjepit | Dipindah ke kiri |
| Grafik gerakan keluar dari panel; label tumpang tindih judul panel | Grafik dipotong (clip) dan diredam; label digeser |
| Tata letak CO: kamera memotong rahang atas, label bertumpuk | Kamera zoom 1,4; legenda disembunyikan saat Raka muncul |
| Potongan "kegunaan" memiliki bingkai kosong 0,3 dtk di antara dua adegan | Jendela adegan dibuat tumpang tindih |
| Raka batuk tampak menangis (air mata) | `tears: 0` |
| Ikon ringkasan gangguan terpotong di tepi kanan | Ikon dipusatkan, teks ke baris sendiri |
| Efek (chime) lebih keras dari suara pada beberapa jendela 200 ms (minimum -18 dB) | Efek diturunkan dan di-duck dari selubung suara; minimum kini 8,2 dB (narasi) dan 14,4 dB (master), median 26,8 dB |

## Putaran 2 (verifikasi)
- Bingkai pertama, hook, layar hasil (angka SpO₂ dan PR terbaca, lingkar benar), "keluhan pernapasan", ringkasan gangguan, dan pengukur cahaya diperiksa ulang pada bingkai penuh: perbaikan terlihat dan tidak ada regresi baru.
- Audio: suara di mix identik dengan sumber (korelasi 0,984 narasi dan 0,970 master, penguatan skalar 0,964 di kedua bagian; sisa korelasi adalah musik/efek); SHA-256 master dan narasi cocok dengan berkas lampiran.
- Takarir: 26 baris sinkron dengan kata (±0,15 dtk); outro memakai teks master.
- Loudness: -14,1 LUFS, LRA 3,5 LU, puncak -1,1 dBFS.
- Orientasi ruang alat: pada semua potongan penampang ujung jari di kanan, kuku di atas, cahaya turun, darah ke kanan (diperiksa pada kontak sheet).

## Pemeriksaan butir brief
| Butir | Status |
|---|---|
| Frame pertama = penjepit menutup, lampu menyala, angka berubah | Ya |
| Dua lampu merah/inframerah di satu sisi, detektor di seberang; cahaya melewati jaringan, oksigen tidak ditembakkan | Ya (foton dari LED ke detektor) |
| Darah arteri berdenyut: pembuluh mengembang, cahaya di sensor berubah | Ya (panah pembengkakan + grafik) |
| Hb beroksigen vs tidak, tanda konsisten, dua grafik, rasio tanpa rumus rumit | Ya (titik O₂, ungu tua; batang ÷ + kurva kalibrasi tanpa angka rumus) |
| Kamera mengikuti cahaya lalu kembali ke alat | Ya (A -> penampang -> pembuluh -> keluar ke alat luar) |
| Lingkari SpO₂ (estimasi) dan PR (denyut per menit) | Ya |
| Gangguan: jari bergerak, dingin/aliran lemah, cat kuku, pigmentasi + contoh CO | Ya (narasi menyebut lima faktor; semua digambar) |
| Raka: hangatkan tangan, lepas cat kuku, diam, tunggu stabil, lihat gejala | Ya |
| Outro 14 - 17 dtk, web asli, master mulai setelah web terlihat, logo + medcoel.com ≥ 3 dtk | Outro 15,15 dtk; master mulai 1,2 dtk setelah web; logo/URL 5,9 dtk |
| Lampu menyala tepat pada kata "merah"/"inframerah"; pembuluh dan grafik berdenyut pada "denyut" | Ya (≤ 1 bingkai) |

## Masalah yang tersisa / perlu keputusan
1. **Naskah teks tidak diterima**; takarir dan NASKAH.md berasal dari ASR. Periksa kalimat "Tapi bagaimana ia tahu?" (ASR "ya tahu") dan ejaan lain terhadap naskah asli.
2. **Tiga kalimat promo di akhir audio Google AI Studio (84,14 - 93,90 dtk) tidak dipakai** karena digantikan master outro (instruksi). Bila pemesan ingin kalimat itu tetap ada, outro menjadi dua promo berurutan.
3. **Video jamu tidak ditemukan** di repo/branch yang terlihat; kesamaan master hanya dibuktikan lewat SHA-256 berkas lampiran.
4. **Tidak diuji dengan telinga manusia** (speaker ponsel/headphone); hanya analisis spektral/level. Diperlukan satu putaran mendengar sebelum tayang.
5. Footage outro berasal dari rekaman fixture lokal sebelumnya; UI produksi terbaru belum direkam ulang. Dialog "Belajar materi" sempat memperlihatkan kartu Flashcard; video tidak menyebut atau menjanjikan flashcard.
6. Proporsi gambar disederhanakan (alat luar di jari Raka lebih besar dari jari kartun; potongan jari bukan skala anatomi). Warna inframerah (ungu) ilustratif. Pernyataan CO bersandar pada prinsip dan brief, bukan kutipan langsung sumber (lihat SUMBER.md).
7. CI `test` di repo ini merah sejak PR #113 (api.test.mjs); tidak terkait video.
