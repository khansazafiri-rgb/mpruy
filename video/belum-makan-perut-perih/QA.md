# Pemeriksaan LOOP video perut perih

## Sebelum render

Audio asli70,28detik didengarkan sampai selesai melalui pemutar lokal; waktu kalimat/kata ditandai melalui transkripsi lalu ejaan istilah dikoreksi. Narasi dan tiga referensi diputar penuh dengan suara aktif: malam-lapar99,3detik, kopi-kafein91,93detik, iklan web75detik. Frame pembuka0/1,5/3detik serta perpindahan lambung/sinyal juga diperiksa; source scenes.js/scenes2.js/art.js dan helper kopi dibaca.

Semua aset wajib diunduh/diverifikasi terhadap hash blob Git commit11368ec2368cd7c60a966fae0c53b7d0bf7f26f1. README Raka, manifest outro, rekaman sumber dan sumber medis diperiksa. Tidak ada aset wajib yang hilang.

## Observasi frame awal

54frame awal/tengah/akhir18shot dan tujuh frame0–3detik dibuat sebelum render penuh. Perbaikan: jalur sinyal di awal shot tidak boleh memakai indeks negatif; asam dan antasida dibuat berinteraksi pada posisi yang sama; H. pylori ditempatkan di mukus; obat antibakteri memakai simbol emas yang berbeda dari antasida biru; label pompa dibuat kontras; kontinuitas lumen kerongkongan/pilorus diperbaiki; kotak makan tetap terlihat saat digeser.

## Putaran video

- Render awal diputar penuh0–87,5detik dengan audio. Perbaikan terarah1: kartu PPI dijauhkan dari takarir dan detail terapi PPI dipisahkan dari epitel permukaan.
- Render perbaikan1 diputar penuh dengan audio. Pemeriksaan cover menemukan simbol "tidak sama dengan" berpotensi terbaca keliru; perbaikan terarah2 menggantinya menjadi "Perih belum tentu luka" dan mengganti simbol lain dengan kata lengkap.
- Render perbaikan2/final diputar dari0s sampai87,5s, audio tidak dimute dan laju1×. Status selesai teramati. Tidak ada perubahan visual video sesudah pemeriksaan ini.
- Segmen37,86–54,48s diputar lagi tanpa suara untuk membandingkan antasida, PPI, dan terapi penyebab. Pemutar berhenti setelah segmen dan mencatat selesai.
- Outro65,48–87,5s diputar terpisah sampai akhir dengan audio pada layar ponsel390×844, videoCSS360×640; ukuran aktual360×640 diperiksa. Kartu materi, pembahasan, tindakan simulasi dan URL terbaca. Override viewport dikembalikan sesudah QA.
- 54frame awal/tengah/akhir18shot dibuat ulang dan diperiksa, ditambah tujuh frame0–3s dalam lembar pembuka. Cover final diperiksa tersendiri. Seluruh2.625frame final didekode FFmpeg tanpa error;1080×1920,30fps,H.264 progressive,AAC48kHzmono.

## Batas visual yang dijaga

- Sekresi asam tetap berlangsung; lambung kosong tidak digambar otomatis luka. Mukus–bikarbonat jelas berada di antara lumen dan epitel.
- Perih tanpa luka: sinyal bergerak menuju pemrosesan di otak dan reaksi Raka, sementara pelindung utuh.
- Penyebab tukak: H. pylori/NSAID menurunkan pertahanan secara bersyarat dan seiring waktu. Luka lokal hanya muncul sesudah "jika". Tidak ada kepastian semua orang terkena tukak atau diagnosis dari pola nyeri saja.
- Antasida: simbol biru mendekati H+ yang sudah ada, sebagian netral menjadi abu muda, pelindung tidak diperbaiki secara ajaib. PPI: simbol ungu dari sisi sel menghambat pompa; keluaran baru berkurang dan asam lama tetap tampak.
- Terapi H. pylori dibedakan dari antasida dan diberi konteks penanganan sesuai diagnosis. Tidak ada dosis/regimen atau pilihan swamedikasi.
- Raka dari satu sumber, pakaian/patch/rambut konsisten. Ruang, posisi laptop/kotak makan, orientasi lambung dan penanda dinding konsisten.
- Web asli1× dan selebar92,6%, menunjukkan bab, soal/jawaban/pembahasan, dan Simulasi Dokter. Pembahasan>3detik; logo/URL CTA3,1detik terakhir.

## Audio dan keterbatasan

Stem narasi mempertahankan seluruh PCM sumber dan urutannya; hanya hening ditambahkan. Musik/SFX adalah sintesis baru CC0, ducked; sumber iklan/web tidak ikut mix. Diagram menyederhanakan geometri kelenjar dan farmakokinetik serta memadatkan waktu. Tidak memakai citra pasien atau klaim hasil klinis tertentu.

## Verifikasi dan integrasi

`verification.json` mengonfirmasi seluruh PCM narasi sumber dipertahankan berurutan dan identik, hanya hening ditambahkan, serta34cue SRT/VTT maksimal2baris cocok dengan naskah. Musik/SFX rata-rata33,8dB di bawah narasi pada bagian ucapan aktif; puncak mix0,886, tanpa clipping. Ini angka pemeriksaan mix, bukan klaim hasil klinis.

Katalog23video diperiksa dengan generator repo terhadap fixture inventaris Git terbaru (README asli dan marker nama MP4 di lokasi QA terpisah). Marker dan file draf/cache tidak dimasukkan ke checkout atau ZIP. Perubahan repo selain folder proyek baru hanya indeks katalog dan klasifikasi edukasi yang dibutuhkan CI.
