# Pemeriksaan akhir video CT–MRI

Hasil: 1080×1920, 30 fps, 76,3 detik / 2.289 frame, H.264 progressive + AAC mono 48 kHz. Render final didekode penuh tanpa error. Narasi asli 66,76 detik; seluruh PCM ucapan dipertahankan berurutan dan identik, hanya hening antarfrasa ditambah. 32 cue SRT/VTT, maksimal dua baris; semua kata cocok dengan naskah yang dinormalkan ejaannya.

## LOOP yang dilakukan

- Sebelum animasi: baca RadiologyInfo sinar-X/MRI, ACR High Yield Guide bagian MRI basics dan T1/T2/FLAIR, serta README/manifest MEDCOEL. Tandai waktu kalimat pada audio. Verifikasi lisensi dan modalitas citra pada halaman sumber masing-masing.
- Ambil awal/tengah/akhir 13 shot, menjadi 39 frame dalam empat lembar kontak. Periksa label CT tanpa kontras/MRI T2, anatomi ventrikel, penanda tulang/cairan, font, garis, scanner/pasien, serta crop web.
- Putaran 1: render penuh, diputar dari awal sampai indikator selesai dengan audio aktif. Revisi utama: rekaman lab diperbaiki dari capture yang terlalu jarang menjadi video browser native; padding recorder dibuang dan crop ponsel diperbesar. Kartu CT/MRI dan batas frame transisi juga diperiksa.
- Putaran 2: render ulang penuh, didekode tanpa error, lalu diputar dari awal sampai indikator selesai dengan audio tidak dimute. Pemeriksaan outro terpisah dimulai pada 55,167 detik pada ukuran video 360×640. Tidak ada UI buatan atau narasi pengganti.

## Citra dan mekanisme

- CT: Mikael Häggström, CC0 1.0; sumber secara eksplisit CT kepala aksial tanpa kontras IV, irisan 4 mm. Panel aksial dipisahkan dari inset sagital. Parenkim tetap terlihat; window/level tidak diubah untuk memperbesar kontras dramatis.
- MRI: Sean Novak, Brain-T2-axial.png, CC BY-SA 4.0; sumber menegaskan T2. CSF ventrikel tampak terang, tulang rendah sinyal/gelap. Bukan T1 atau FLAIR. Kredit dan lisensi dicantumkan di video/cover serta dokumen sumber.
- Kedua contoh pada tingkat ventrikel lateral yang kira-kira sebanding, berasal dari orang berbeda. Label contoh bertahan saat dibandingkan; tidak mengklaim satu pasien, melakukan registrasi pixel, atau morph CT menjadi MRI.
- Scanner CT/MRI memakai satu geometri pasien/sudut tiga perempat yang sama. Pasien diam; sumber/detektor CT berputar dengan garis sinar-X lurus tipis. MRI memperlihatkan medan magnet, satu pulsa radio, inset konseptual proton hidrogen dan sinyal; tidak ada atom raksasa di dalam kepala.
- Penanda CT tulang muncul pada 17,70 s; MRI cairan 34,72 s; tulang gelap 36,26 s. Perbandingan tengkorak 4,5 s dan cairan sekitar 4,53 s. Label sekuens dan kartu T1/T2/FLAIR menjelaskan bahwa tampilan MRI bergantung pada sekuens.
- Perbandingan ditahan tegak/statis. Hook pull-back singkat; CT satu zoom lambat. Tidak ada rotasi medis atau pewarnaan citra. Kartu kebutuhan klinis tidak mengunggulkan salah satu modalitas.

## Outro

- 55,167–76,3 s = 21,133 s. Materi 5,8 s; soal/pembahasan 6 s; lab sekitar 6,033 s, diteruskan CTA 3,3 s pada rekaman lab yang sama.
- Web selebar 1.000 px / 92,6% kanvas. Pilihan mata kuliah/bab, pemilihan jawaban, dan pembahasan terlihat. Pembahasan ditampilkan lebih dari tiga detik. Data fixture tidak dijadikan klaim publik.
- Rekaman lab dibuat baru dari build repo pada commit 36f2d0a78d8497515e567c1b8be12ce5db4273ae. Build produksi menggunakan server preview pengujian repo karena dev-server mengalami masalah lifecycle middleware; source aplikasi tidak diubah atau dideploy.
- UI asli mode ponsel memperlihatkan perubahan CT ke USG. Kecepatan waktu nyata 1×; crop hanya membuang padding recorder. Video sumber 25 fps diubah menjadi 30 fps tanpa mempercepat atau membuat citra medis baru. Sumber, metode dan lisensi dataset atlas tercatat.
- “Simulasi edukatif, bukan alat diagnosis” tampil sepanjang bagian lab. Live 4D Lab hanya dijelaskan mempunyai simulasi CT dan USG; tidak ada klaim fitur MRI. Logo, “Belajar FK gratis” dan medcoel.com tampak sampai akhir.

## Audio dan berkas

Tidak ada musik/SFX/audio scanner pihak ketiga, audio rekaman web, atau suara iklan lama. Narasi sumber dan master disertakan. Jeda ditambahkan pada waktu sumber 42,85 s (4,3067 s), 56,15 s (0,4 s), 58,14 s (4,08 s), serta hening ekor 0,7533 s; batas berada di jeda ucapan. Puncak/nada/laju ucapan tidak diproses. AAC hanya format distribusi pada MP4.

Proyek memuat kode animasi/lapisan teks, waktu kalimat, takarir, aset sumber/crop, rekaman web, daftar sumber/lisensi, dan instruksi render ulang. Tidak mengubah aplikasi, atlas, video parasetamol, atau aset produksi lama.
