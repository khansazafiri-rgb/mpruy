# Pemeriksaan revisi animasi CT–MRI

## Acuan dan perubahan

Revisi dimulai dengan studi kode dan video animasi MEDCOEL yang sudah ada, dirangkum di STYLE-REVIEW.md. Raka, helper easing video kopi, dan font diambil langsung dari repo; hash blob Git dibandingkan dan cocok dengan source-manifest.json. Raka tidak digambar ulang dan memakai sweater harian yang sama.

Perubahan visual: pembuka dengan reaksi dan arah pandang Raka, gestur bergantian serta sorotan tengkorak/cairan; kartu berbayang dan Plus Jakarta Sans; sumber-detektor dan data CT yang bergerak; model konseptual magnet/RF/sinyal MRI; penanda anatomi; dua jalur akuisisi gambar dalam rekap. Citra tetap grayscale asli dan rekaman web asli tetap tajam.

## LOOP revisi

- Sebelum render penuh: 39 frame awal/tengah/akhir diperiksa. Diperbaiki tabrakan label CT, pembobotan font, cincin sorot, dan teks yang terlalu teknis untuk penonton. Sumber Raka/font/helper diverifikasi terhadap blob Git.
- Putaran 1: seluruh video 76,3 detik diputar dari awal sampai status selesai, audio tidak dimute dan playbackRate=1. Ditemukan tangan Raka kurang jelas karena berdekatan dengan telinga; pose diperbaiki melalui parameter kanonik agar menunjuk ke atas, bergantian kiri/kanan. Kalimat judul perbandingan juga dirapikan.
- Putaran 2: render ulang setelah perbaikan gestur. Video diputar penuh 0–76,3 detik dengan audio aktif, rate=1 dan status selesai teramati. Seluruh 2.289 frame didekode tanpa error. Lembar kontak awal/tengah/akhir 13 shot dibuat ulang; cover diperiksa terpisah dan kredit dipindah agar tidak menabrak karakter. Outro kemudian diputar terpisah dari 55,167–76,3 detik pada ukuran 360×640; status pemutaran outro sampai akhir selesai teramati. Tidak ada revisi visual video sesudah pemutaran ini; perbaikan cover hanya memindahkan kredit dan merapikan footer.

## Ketentuan yang dipertahankan

1080×1920, 30 fps, 76,3 detik/2.289 frame. Narasi Google AI Studio asli tetap pada laju 1×; master audio identik dengan versi sebelumnya. Tidak ada narasi pengganti, audio iklan/web, musik atau SFX pihak ketiga. Takarir 32 cue, maksimal dua baris, mengikuti naskah final yang sama.

CT: Mikael Häggström, CC0, aksial kepala tanpa kontras IV. MRI T2: Sean Novak, CC BY-SA4.0. Citra berbeda orang pada tingkat ventrikel lateral yang kira-kira sebanding; label contoh tidak mengklaim satu pasien. Tidak ada morph, pewarnaan, rotasi citra medis atau perubahan window/kontras. Tulang CT disorot saat istilahnya diucapkan pada 17,70 s; cairan T2 pada 34,72 s; tulang MRI pada 36,26 s. Citra perbandingan ditahan agar dapat dilihat, sementara sorotan/label memandu perhatian.

CT/MRI memakai pasien dan geometri scanner yang sama pada sudut tiga perempat. Pasien tetap; CT menggunakan garis sinar-X lurus dan sumber/detektor berputar. Inset aksial adalah model konseptual terpisah. MRI memakai model proton/RF/sinyal dalam panel yang jelas, bukan atom fisik raksasa di kepala. Citra T2 tidak ditampilkan sebagai T1/FLAIR. Kartu klinis tidak menyatakan satu modalitas selalu unggul.

Outro 55,167–76,3 s = 21,133 s. Materi 5,8 s, soal/pembahasan 6 s (pembahasan >3 s), lab CT/USG 6,033 s diikuti CTA 3,3 s pada klip yang sama. Web 1000 px/92,6% lebar, laju 1×; data uji tidak menjadi klaim publik. Live 4D Lab menampilkan tindakan CT→USG, disclaimer simulasi edukatif/bukan diagnosis dan atribusi atlas. Tidak ada klaim fitur MRI pada MEDCOEL. Logo/medcoel.com bertahan sampai akhir.

Sumber ilmiah, izin citra, metode perekaman dan lisensi tetap disertakan. Aplikasi, atlas, video parasetamol dan aset video lain tidak diubah.

## Integrasi repo

PR awal #211 telah digabung ke branch utama saat revisi selesai. Revisi disiapkan pada branch baru dari commit 11368ec2368cd7c60a966fae0c53b7d0bf7f26f1. Folder CT–MRI pada dasar terbaru identik dengan versi sebelum revisi; tidak ada perubahan pengguna pada proyek ini yang tertimpa. Katalog video dan klasifikasi dua proyek edukasi yang sebelumnya belum tercatat diperbarui mengikuti generator repo. Pemeriksaan generator menggunakan inventaris path/README Git terbaru dalam fixture terpisah; marker nama MP4 tidak masuk checkout atau hasil video.
