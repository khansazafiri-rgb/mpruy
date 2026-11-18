# Pemeriksaan draf

Status belum final, 18 November 2026.

## Pemeriksaan yang sudah dilakukan

- Kedua rekaman dan logo dibandingkan lewat Git blob SHA dengan cabang default repo pada commit `eac0862c4021b8bda25505b448c4151845ffff8d`; semuanya cocok.
- Panduan outro, manifest aset, README Raka, struktur video terdahulu, serta referensi visual iklan telah diperiksa. Tidak mengambil audio iklan.
- Audio lampiran diperiksa durasinya (42,64 s, mono, PCM 24 kHz) dan ditranskripsi lokal. Isi membahas kandung kemih/retensi urin. Hasil ASR memiliki kesalahan ejaan nama merek, sehingga bukan naskah final untuk ditayangkan.
- Render outro terdekode penuh tanpa error: H.264, 1080×1920, progressive, 30 fps, 20,00 s, tanpa stream audio.
- Awal, tengah, dan akhir masing-masing shot diekspor sebagai `out/qa-*.png` dan diperiksa bersama lembar 360×640. Satu masalah cover (SVG terpotong) diperbaiki dengan dimensi viewport SVG eksplisit; cover diperiksa ulang.
- Outro diputar dari awal hingga indikator selesai pada pratinjau video 360×640. Pilihan bab, jawaban salah dan pembahasan, serta pertanyaan anamnesis terlihat. URL/CTA berada di bawah rekaman web; teks utama tidak menutup tindakan.
- Tidak ada percepatan sumber, audio sumber, flash transition, klaim jumlah soal/kemajuan akun, dosis angka, atau visual anatomi dalam draf outro.

## Belum dapat dinilai

- Sinkronisasi dengan narasi parasetamol, waktu istilah SSP/prostaglandin/hati, takarir final, dan keseluruhan video edukasi dengan audio: **menunggu audio dan naskah yang benar**.
- Narasi promosi yang tepat belum ditemukan sebagai berkas terpisah pada paket `brand/video/outro`. Paket tersebut menunjuk footage dan contoh naskah, bukan menyediakan audio final.
- Durasi total belum dikunci. Tidak menahan gambar kosong atau memperlambat suara untuk mengejar target 75–90 detik.
- Draf ini tidak boleh dianggap memenuhi pemeriksaan video edukasi final yang ditonton penuh dengan audio. PR tetap draft.
