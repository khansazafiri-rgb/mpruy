# Laporan pemeriksaan (final; dua putaran terarah)

**Batas pemeriksaan yang jujur:** lingkungan ini tidak dapat memutar video dengan layar dan speaker. "Putar seluruh video pada kecepatan normal" dilakukan secara **terprogram**: render seluruh 2651 bingkai, enkode, cek stempel waktu paket, ukur perubahan piksel di area animasi pada setiap pasangan bingkai, kontak sheet seluruh durasi, bingkai penuh pada momen penting, ASR pada audio akhir, serta pengukuran level. Kelancaran menurut mata, kenyamanan tempo, dan bunyi di speaker ponsel/headphone **belum dinilai manusia**.

## Putaran 1 (draf dengan waktu estimasi, lalu narasi sungguhan)
| Temuan | Perbaikan |
|---|---|
| Audio lampiran pertama (9:45AM) ternyata narasi video SpO2/Hb | Tidak dipakai; draf dibuat dengan waktu estimasi, lalu narasi yang benar (9:43AM, 72,28 dtk) dipasang |
| Hook: tangan menutup area kontak; termometer kecil dan jauh dari kepala Raka | Pose, ukuran kontak, dan kamera hook disetel; penanda emas "angka tetap" di ujung kolom |
| Penampang: kaca ikut memerah saat dipanaskan | Kaca tetap biru muda; hanya wadah yang menghangat |
| Pemanasan: ujung kolom keluar dari bingkai | Kamera mengikuti ujung kolom |
| Tidak ada penegasan "merkuri masih terdorong lewat penyempitan saat hangat" | Tetes merkuri melewati penyempitan + label |
| Adegan pecah dan ringkasan terlalu kecil | Skala dan posisi disetel; fisika jatuh/pantul diperbaiki |
| Setelah narasi nyata: kata-kata kunci di bagian perbandingan/ringkasan bergeser | Semua jangkar dihitung ulang dari kata ASR; bagian waktu dipadatkan otomatis |
| Musik muncul di antara kata (suara/sisa minimum 1,0 dB) | Ducking diperpanjang (filter maksimum 0,7 dtk): minimum 13,3 dB (narasi) dan 20,4 dB (master) di pita 300 - 3400 Hz |

## Putaran 2 (verifikasi pada video akhir)
- **Stempel waktu:** 2651 bingkai, semua selang 0,0333 dtk (30 fps konstan, tanpa bingkai terjatuh).
- **Gerak:** pada area animasi (di luar takarir) tidak ada rentang >= 8 bingkai tanpa perubahan piksel kecuali hold sengaja di akhir outro (85,2 - 86,3 dan 87,1 - 88,3 dtk; logo/URL ditahan).
- **Sinkron:** jangkar waktu diambil dari kata ASR (kemiripan 0,95); label "wadah merkuri" muncul pada kata "wadah" (13,0), "saluran sempit" pada "saluran" (15,3), "PANAS" pada "panas" (18,5), "merkuri memuai" pada "merkuri memuai" (19,6), penyempitan pada "penyempitan" (35,2), pelepasan pada "dilepas" (38,9), "Perlu diatur ulang" pada "diatur" (49,4), termometer digital pada "digital" (54,2), kaca retak pada "pecah" (57,0), ringkasan "MEMUAI/NAIK/TERTAHAN" pada "pemuaian/saluran sempit/penyempitan kecil" (68,6 / 69,1 / 70,3).
- **Audio:** campuran -14,3 LUFS, LRA 2,8 LU, puncak -1,2 dBFS; RMS narasi -14,5 dBFS dan outro -15,0 dBFS; lonjakan 1 dtk maksimum -11,1 (narasi) dan -11,6 dBFS (master): suara promo tidak melonjak. Level mentah sebelum campur: narasi -17,1 LUFS, master -16,9 LUFS (selisih 0,2 LU); keduanya mendapat penguatan skalar yang sama (0,96) sehingga timbre tidak berubah. Master byte-identik dengan berkas pada proyek SpO2 dan jamu.
- Orientasi: wadah kiri, saluran kanan, skala atas, penyempitan tepat di kanan wadah pada semua potongan.

## Masalah yang tersisa
1. Tontonan dan dengar oleh manusia (kelancaran, tempo, speaker ponsel/headphone) belum dilakukan.
2. Konstriksi tidak tercantum langsung di sumber EPA/Purdue/WHO yang terbaca (lihat SUMBER.md).
3. Footage outro berasal dari rekaman data uji lokal; UI produksi terbaru belum direkam ulang.
4. Proporsi termometer disederhanakan (wadah dan celah diperbesar agar terbaca); angka (37,6 °C), skala, dan kecepatan ilustratif.
5. Kartu ringkasan "MEMUAI -> NAIK -> TERTAHAN" tampil sekitar 1,5 dtk sebelum outro karena narasi berakhir (72,1 dtk) hampir bersamaan dengan kalimat ringkasan.
