# Sumber dan lisensi — Belum makan, kok perut perih?

## Narasi, musik dan efek

- `audio/narasi-google-ai-studio.wav`: ekspor Google AI Studio pengguna, nama sumber `Generated Audio November 18, 2026 - 9_14PM.wav`,70,28detik/24kHz/mono/PCM16. Digunakan atas permintaan pemilik untuk video ini. Tidak mengambil suara dari video lama.
- `audio/narasi-timeline.wav`: seluruh PCM sumber berurutan dan identik, ditambah hening dalam jeda pada2,80;28,85;40,40;44,10;65,08;66,20;67,80detik serta ekor. Tidak mempercepat, mengganti nada, membuang kata atau mengubah urutan. Detail `audio-edits.json`.
- `audio/musik-orisinal.wav` dan `audio/sfx-orisinal.wav`: komposisi/sintesis baru oleh kode `audio.py`, **CC0 1.0**, boleh dipakai dan diubah untuk promosi Instagram/TikTok. Tidak memakai rekaman, sampel, melodi, atau audio dari referensi. Lisensi: https://creativecommons.org/publicdomain/zero/1.0/ . Lima aksen hanya untuk jam, perpindahan penampang, sinyal, netralisasi, dan pompa.
- `audio/master-video.wav`: campuran dengan ducking musik di bawah narasi. Stem narasi asli tetap terpisah; resampling48kHz hanya untuk master/distribusi. AAC pada MP4 adalah encode distribusi, bukan narasi baru.

## Aset MEDCOEL

Repo https://github.com/khansazafiri-rgb/mpruy , ref diperiksa `claude/focused-wozniak-1ayrxa`, commit `11368ec2368cd7c60a966fae0c53b7d0bf7f26f1`.

- Raka: `brand/characters/raka/raka.js` dan README, dipakai langsung melalui rakaSvg/raka/idle/lerpState. Sweater harian dan patch asli; tidak dimodifikasi pada repo sumber.
- Helper SVG asli: `video/malam-lapar/stage/art.js` → `reference/malam-art.js` (termasuk ilustrasi otak), `video/kopi-kafein-adenosin/stage/lib.js` → `reference/medcoel-lib.js` (easing). Source dunia kopi disertakan sebagai referensi, tidak mengganti aset karakter.
- `assets/materi-soal.mp4`: sumber asli `video/masih-dua-minggu/rekam/rekaman-web.mp4`; materi/bab0,00–6,50detik; soal/jawaban/pembahasan7,50–13,26detik. Laju1×; tanpa audio sumber.
- `assets/simulasi-dokter.mp4`: sumber asli `video/dok-saya-kenapa/rekam/rekaman-web.mp4`, cuplikan0,00–7,54detik: memilih poli, memasuki kasus dan interaksi pada Simulasi Dokter. Laju1×; tanpa audio sumber.
- `assets/logo-full.webp`: logo asli `apps/web/src/assets/logo-full.webp`, tetap tajam/tanpa filter pixel.
- Semua rekaman memakai fixture lokal; tidak ada data pasien nyata, klaim angka akun, atau UI buatan. Aset merek milik MEDCOEL digunakan sesuai permintaan pemilik; hak merek tidak dialihkan kepada pihak lain.
- Plus Jakarta Sans berasal dari font repo, Copyright2020 The Plus Jakarta Sans Project Authors. **SIL Open Font License1.1** disertakan dalam `fonts/OFL.txt`.
- Ilustrasi baru lambung, mukosa, bakteri konseptual, ion, pompa, ikon obat, ruang belajar dan animasi adalah kode proyek ini, CC0; hak aset merek/font asli tetap mengikuti ketentuannya.

## Sumber medis yang dibaca

- [NIDDK: dispepsia](https://www.niddk.nih.gov/health-information/digestive-diseases/indigestion-dyspepsia/) dan [gejala/penyebab](https://www.niddk.nih.gov/health-information/digestive-diseases/indigestion-dyspepsia/symptoms-causes), ditinjauMaret2025: dispepsia adalah kelompok keluhan; gangguan interaksi usus–otak dan kepekaan sensasi dapat terlibat. Keluhan tidak otomatis berarti luka.
- [NIDDK: gejala dan penyebab tukak](https://www.niddk.nih.gov/health-information/digestive-diseases/peptic-ulcers-stomach-ulcers/symptoms-causes): H. pylori dan NSAID penyebab umum; nyeri saat lambung kosong dapat terjadi pada sebagian orang. Gejala perdarahan memerlukan pemeriksaan segera.
- [NIDDK: terapi tukak](https://www.niddk.nih.gov/health-information/digestive-diseases/peptic-ulcers-stomach-ulcers/treatment): terapi menangani luka dan penyebab; infeksi H. pylori ditangani dengan kombinasi obat. Video tidak memberi regimen/dosis.
- [MSD Manual: sekresi asam dan perlindungan](https://www.msdmanuals.com/professional/gastrointestinal-disorders/gastritis-and-peptic-ulcer-disease/overview-of-acid-secretion), tinjauanJanuari2025: sel parietal, mukus–bikarbonat, dan pengaruh H. pylori/NSAID pada pertahanan mukosa.
- [MSD Manual: obat untuk keasaman lambung](https://www.msdmanuals.com/professional/gastrointestinal-disorders/gastritis-and-peptic-ulcer-disease/medications-for-the-treatment-of-gastric-acidity), tinjauanJanuari2025: antasida menetralkan asam; PPI menghambat H+,K+-ATPase pada membran sekretori sel parietal.

Diperiksa18November2026. Fakta diparafrasekan sebagai diagram baru; ilustrasi situs tidak disalin. Bakteri diperbesar sebagai simbol dan perubahan dipadatkan sebagai diagram, bukan proses real-time atau kepastian setiap infeksi/pemakaian NSAID menjadi tukak.
