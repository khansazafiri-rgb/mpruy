# Laporan pemeriksaan (draf; dua putaran terarah)

**Batas pemeriksaan yang jujur:** lingkungan ini tidak dapat memutar video dengan layar dan speaker. "Putar seluruh video pada kecepatan normal" dilakukan secara **terprogram**: render seluruh 2883 bingkai, enkode, cek stempel waktu paket, ukur perubahan piksel di area animasi pada setiap pasangan bingkai, kontak sheet seluruh durasi, dan bingkai penuh pada momen penting. Gerak yang tampak mulus oleh mata, kenyamanan tempo, dan bunyi di speaker ponsel/headphone **belum dinilai manusia**.

## Putaran 1 (setelah draf pertama)
| Temuan | Perbaikan |
|---|---|
| Hook: tangan memegang termometer tertutup area kontak; termometer kecil dan jauh dari kepala Raka | Pose, ukuran kontak, dan kamera hook disetel; termometer diangkat dekat wajah, penanda emas "angka tetap" di ujung kolom |
| Penampang: kaca ikut memerah saat dipanaskan sehingga garis perak sulit dibedakan | Kaca tetap biru muda; hanya wadah dan sinar di sekitarnya yang menghangat |
| Pemanasan: kamera diam, ujung kolom keluar dari bingkai | Kamera mengikuti ujung kolom dan kembali ke tampilan utuh saat suhu naik |
| Tidak ada penegasan "merkuri masih terdorong lewat penyempitan saat hangat" | Tetes merkuri bergerak melewati penyempitan + label |
| Adegan pecah: termometer dan tetesan terlalu kecil, tetesan keluar dari lantai | Skala dan lantai disetel, fisika jatuh/pantul diperbaiki |
| Ringkasan: termometer kecil, kartu menutup | Zoom dan posisi disetel; tiga kartu bergerak dari bagian termometer masing-masing |
| Musik-saja di bagian edukasi terlalu keras dibanding master | Gain musik diturunkan |

## Putaran 2 (verifikasi)
- **Stempel waktu:** 2883 bingkai, semua selang 0,0333 dtk (30 fps konstan, tanpa bingkai terjatuh).
- **Gerak:** metrik pertama (rata-rata selisih piksel seluruh bingkai) menandai beberapa rentang "statis" di 51 - 77 dtk karena yang bergerak hanya garis perak tipis; metrik kedua (jumlah piksel yang berubah nyata pada area animasi, di luar takarir) tidak menemukan rentang >= 8 bingkai tanpa gerak kecuali dua hold sengaja di akhir outro (92,9 - 94,1 dan 94,8 - 96,1 dtk; logo/URL ditahan).
- **Audio:** campuran -13,6 LUFS, LRA 1,6 LU, puncak -1,3 dBFS; RMS bagian edukasi -12,5 dBFS dan outro -13,3 dBFS; lonjakan 1 dtk maksimum -11,0 (edukasi) dan -10,8 dBFS (master): tidak ada lonjakan promo yang mencolok. Master outro byte-identik dengan berkas pada proyek SpO₂ dan jamu.
- Orientasi: wadah kiri, saluran kanan, skala atas, penyempitan tepat di kanan wadah pada semua potongan.

## Masalah yang tersisa
1. **Narasi edukasi yang benar belum ada** -> waktu adegan estimasi dan tanpa suara narasi (lihat README). Setelah narasi tersedia, perlu satu putaran sinkron (jangkar kata) dan satu tontonan penuh.
2. Tontonan dan dengar oleh manusia (kelancaran, tempo, speaker ponsel/headphone) belum dilakukan.
3. Estimasi waktu bisa meleset beberapa detik; sinkron "tepat saat disebut" **belum terpenuhi** selama narasi belum ada.
4. Konstriksi tidak tercantum langsung di sumber EPA/Purdue/WHO yang terbaca (lihat SUMBER.md).
5. Footage outro berasal dari rekaman data uji lokal; UI produksi terbaru belum direkam ulang.
6. Proporsi termometer disederhanakan (wadah dan celah diperbesar agar terbaca); angka dan kecepatan ilustratif.
