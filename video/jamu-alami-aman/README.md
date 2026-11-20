# Jamu bekerja bagaimana, dan apakah alami berarti aman? (92,04 dtk, 1080×1920, 30 fps)

**STATUS: DRAF SIAP TINJAU, bukan final.** Syarat brief untuk final adalah audio (terutama outro) *didengarkan* dengan headphone. Saya tidak bisa mendengarkan audio; audio hanya diukur dan dicocokkan dengan transkrip otomatis. Karena itu berkas diberi nama `jamu-alami-aman_draf.mp4`. Setelah Anda mendengarkan dan setuju, ganti namanya menjadi final.

Video animasi flat-vector MEDCOEL: Raka kanonik (`brand/characters/raka/raka.js` lewat `rakaSvg()`, tidak digambar ulang), objek dari kode SVG, narasi edukasi dan outro master dari Google AI Studio (tidak ada TTS lain, tidak ada audio dari iklan lama), rekaman web MEDCOEL asli untuk outro.

Berkas: `jamu-alami-aman_draf.mp4`, `cover/cover.png` (+ `cover-panduan-area-aman.png`, `cover-360px.png`), `takarir.srt` / `takarir.vtt`, `still/`, proyek yang bisa diedit (`stage/`, `cues.json`, `tools/`, `audio/audio_mix.py`).

## Bahan yang diperiksa (LOOP tahap 1)
- Repo `khansazafiri-rgb/mpruy`, ref `claude/focused-wozniak-1ayrxa` @ `11368ec` (Merge PR #211, 18 Nov 2026); `docs/VIDEO_KATALOG.md`, `brand/video/outro/README.md` + `assets.json`, `brand/characters/raka/raka.js`, dan semua path pada brief ada. Cabang kerja `claude/video-jamu-alami` dibuat dari ref itu; PR menarget cabang itu.
- Video gaya yang ditonton (lembar kontak dari awal, tengah, akhir): `kopi-kafein-adenosin/..._final.mp4` (dunia dalam tubuh, partikel konsisten, takarir) dan `malam-lapar/medcoel-malam-lapar.mp4` (Raka, label, kartu). Panggung `kopi-kafein-adenosin/stage` dan `malam-lapar/stage` dipelajari untuk pola takarir, kamera, dan objek.
- Rekaman web: `video/masih-dua-minggu/rekam/rekaman-web.mp4` (20,4 s; pilih mata kuliah, daftar BAB, dialog langkah belajar, siapkan sesi, soal, jawaban + pembahasan) dan `video/dok-saya-kenapa/rekam/rekaman-web.mp4` (69,2 s; Simulasi Dokter: pilih poli, pasien, anamnesis). Hanya bagian yang tampil nyata dipakai; tidak ada UI buatan.
- Naskah: file naskah teks tidak ikut pesan; yang tersedia adalah audionya (`narasi-edukasi.wav`, 84,24 s). Kata-kata video diambil dari audio itu lewat ASR (`audio/narasi-asr.json`) dan dipertahankan urutannya.

## Alur (waktu video)
| Detik | Aksi yang terlihat | Teks layar |
|---|---|---|
| 0–4,96 | Raka meraih kemasan jamu generik berpita "ALAMI" (tanpa merek); tangan lain membawa strip obat rutin; keduanya mendekat, Raka berhenti dan ragu; kamera maju ke kedua benda | ALAMI = PASTI AMAN? |
| 4,96–9,06 | "Tunggu dulu": tiga ramuan berbeda (sachet, dua botol) muncul satu per satu dengan campuran senyawa berbeda | Bukan satu obat, satu cara kerja |
| 9,06–11,94 | Tiga bahan masuk wadah, ditumbuk, lalu terurai menjadi beragam partikel | Satu ramuan, banyak senyawa |
| 11,94–19,9 | Kamera mengikuti kelompok partikel melewati saluran cerna: sebagian diserap ke pembuluh darah lalu ke hati ("diproses") lalu ke sel generik berlabel "mungkin memengaruhi proses biologis tertentu"; kelompok lain tidak diserap dan keluar. Label "ILUSTRASI PERJALANAN UMUM" | Satu ramuan, banyak senyawa |
| 19,9–23,14 | Tiga bahan dengan komposisi senyawa berbeda dan tanda "≠" | Senyawa dan efek berbeda tiap bahan |
| 23,14–33,0 | Jahe; kartu studi "jahe & mual pada kehamilan" masuk ke "MUNGKIN MEMBANTU"; klaim lain ("setiap jamu jahe?", "semua jenis mual?") tetap putus-putus "belum otomatis terbukti"; Raka membandingkan klaim kemasan dengan bukti | Bukti untuk satu keluhan ≠ semua keluhan |
| 34,06–47,5 | Tangga bukti: kartu Jamu (penggunaan empiris), Obat Herbal Terstandar (standardisasi + uji praklinik), Fitofarmaka (uji klinik pada manusia) naik satu per satu pada kata yang sesuai; tanda silang pada panah "naik otomatis" | Tingkat pembuktian; Kategori mengikuti bukti dan izin tiap produk |
| 47,5–54,48 | Senyawa herbal di "ruang tubuh"; tanda efek samping; tablet obat rutin mendekat, muncul tanda peringatan lembut "interaksi mungkin terjadi" (tanpa tabrakan dramatis) | Alami ≠ bebas risiko → Cek interaksi |
| 54,48–60,26 | Kemasan gelap "TANPA IZIN EDAR" dibuka, tablet bahan kimia obat (BKO) tersembunyi terlihat, cap "PRODUK ILEGAL"; jamu berizin kecil di sisi dengan tanda cek "bukan semua jamu" | Waspadai produk ilegal |
| 60,26–74,95 | Cek kemasan: izin edar, komposisi, aturan pakai, klaim diberi centang satu per satu tepat pada kata; Raka dan tenaga kesehatan (rig Raka dengan jas) untuk kondisi hamil / penyakit tertentu / rutin minum obat; Raka menutup kemasan dengan ekspresi lega, jamu dan obat sama-sama dipegang (tidak dibuang) | Cek izin • komposisi • aturan pakai; Tanyakan dulu ke tenaga kesehatan; Jamu tidak menggantikan pengobatan yang kamu perlukan |
| 74,95–92,04 | Catatan Raka (4 centang) membesar menjadi rekaman web asli: mata kuliah, daftar BAB, dialog materi, soal, jawaban + pembahasan, Simulasi Dokter (pilih poli, pasien); `medcoel-outro-master.wav` mulai di 78,2 s (web sudah terlihat 2,6 s); logo, "Belajar FK gratis di MEDCOEL" dan `medcoel.com` tampil dari 87,6 s (≥3,6 s sampai akhir) | Belajar FK gratis di MEDCOEL / medcoel.com |

## Audio dan sinkronisasi (tiga jalur terpisah)
- **Suara:** `audio/narasi-edukasi.wav` dipakai sampai akhir kalimat "…yang memang kamu perlukan." (74,95 s). **Sisa berkas (75,3–84,2 s) memuat outro lama dengan lafal "med school/medschool.com" dan sengaja TIDAK dipakai**; outro memakai `audio/medcoel-outro-master.wav` apa adanya (10,84 s). Suara tidak dipercepat/diubah nadanya; level outro diturunkan −1,5 dB (statis) agar sama dengan narasi (LUFS terukur −18,4 vs −16,9).
- **Musik:** `stem-musik.wav`, pluck/pad pentatonik "ingin tahu" ringan (96 BPM), turun ±−13 dB di bawah suara. **SFX:** `stem-sfx.wav`: plop bahan, tok alu, kilau senyawa, blip penyerapan, tok + nada naik per tingkat bukti, ting centang, klik web. Tanpa bunyi "obat ajaib" dan tanpa efek dramatis pada bagian risiko (hanya tick halus).
- Hasil campuran: −15,1 LUFS, puncak −1,1 dBFS (limiter), tidak ada clipping; outro tidak lebih keras dari narasi.
- **Lisensi audio:** musik dan SFX disintesis dari kode (`audio/audio_mix.py`, numpy), **CC0 1.0**, tanpa sampel/musik pihak ketiga, boleh untuk promosi Instagram/TikTok tanpa atribusi. Narasi dan outro master: Google AI Studio dari pemesan (hak pakai mengikuti kebijakan akun pemesan).

## Verifikasi klaim ke sumber (belum dapat dilakukan)
Brief meminta verifikasi ke BPOM (`bbpomsurabaya.pom.go.id/faqotsk`, `intelijen.pom.go.id/...jamu-efek-instan...`) dan NCCIH (`nccih.nih.gov/health/ginger/`). **Ketiga host itu tidak dapat diakses dari sesi ini (DNS gagal, di luar domain yang diizinkan jaringan sesi), jadi klaim BELUM saya cocokkan langsung dengan halaman tersebut.** Klaim dalam video mengikuti narasi pemesan dan sengaja konservatif: "mungkin membantu mual pada kehamilan" (bukan semua mual/semua racikan jahe), jamu = penggunaan empiris, OHT = standardisasi + uji praklinik, fitofarmaka = uji klinik pada manusia, bahan kimia obat tersembunyi = produk ilegal (bukan semua jamu), interaksi "mungkin terjadi". Mohon cek tiga halaman itu sebelum tayang; jika tidak cocok, kata di audio dan teks layar perlu disesuaikan.

## Laporan QA
- Diperiksa: lembar kontak tiap 1 dtk seluruh video (ukuran ±216×384) dan potongan khusus tiap adegan; ya = lolos.
  - Detik 0–3: aksi sudah terjadi dari frame pertama (tangan membawa dua benda, kamera maju) ✔
  - Gerak senyawa: bentuk/warna konsisten (A lingkaran teal, B segi enam emas, C segitiga koral, D belah ketupat ungu); kelompok diserap vs tidak diserap berbeda jelas ✔
  - Tiga kategori: tiap kartu tinggal 3–8 dtk, nama + satu frasa bukti terbaca ✔; kesan "tidak otomatis naik" lewat tanda silang dan catatan ✔
  - Risiko mungkin vs produk ilegal: dua adegan terpisah dengan warna dan label berbeda ("interaksi mungkin terjadi" vs "PRODUK ILEGAL… bukan semua jamu") ✔
  - Sinkron suara–visual: ditentukan dari waktu kata ASR (`cues.json`); centang pada "izin edar/komposisi/aturan pakai/klaim", kartu tangga pada "Jamu/Obat herbal terstandar/Fitofarmaka" ✔
  - Rekaman web terbaca di ponsel: tiap layar 1,5–3,8 dtk dengan zoom ke area aksi; teks kecil dari sumber tetap kecil ⚠
- **Putaran koreksi 1 (dari maks 2):** burst senyawa terlalu pendek (dimajukan), ginjal/jahe terlalu kecil (diperbesar), ruang interaksi terlalu kosong (diperbesar), label tumpang tindih di adegan tenaga kesehatan, urutan rekaman web tidak sesuai kata ("materi per bab" menampilkan soal) dan transisi catatan→web berantakan (diperbaiki). Putaran 2 tidak dipakai.
- **Belum dapat diperiksa / hambatan:**
  1. Audio belum didengarkan (tidak bisa). Dari transkrip otomatis, kata "fitofarmaka" terbaca salah ("Vitovarmaka"), "jahe" terbaca "jahi", "MEDCOEL" terbaca "Medcoil" (outro master) dan "kelimnya"; ini bisa kesalahan transkripsi atau lafal yang benar-benar meleset. **Mohon dengarkan "jamu", "fitofarmaka", "MEDCOEL" dan "medcoel.com" sebelum final.** Teks layar memakai ejaan benar.
  2. Kalimat "Jamu didasarkan pada [?] penggunaan empiris" (36,9–39,4 s): transkrip otomatis menangkap kata ragu ("padari wide"); takarir saya tulis "pada penggunaan empiris". Cek ke naskah asli.
  3. UI web: rekaman sumber berumur 30 Okt (masih-dua-minggu) dan sebelum; di cabang ini ada perubahan UI web sesudahnya (mis. Kampusmu 4–9 Nov, penyederhanaan kuis anatomi). Saya tidak bisa menjalankan web terbaru untuk membandingkan, jadi tampilan mungkin sedikit berbeda dari produksi. Dialog "langkah belajar" pada rekaman memperlihatkan baris Flashcard apa adanya (README outro menyebut flashcard tidak dijamin pada sumber ini); tidak disebut di narasi.
  4. Verifikasi BPOM/NCCIH (lihat di atas).
- Catatan isi: "tenaga kesehatan" digambar dengan rig dan wajah Raka berpalet kulit/rambut berbeda dan jas (bukan karakter baru). Kemasan jamu, obat, dan produk ilegal sepenuhnya generik (tanpa merek, tanpa nomor izin; kotak nomor izin hanya placeholder).

## Membuat ulang
```bash
cd video/jamu-alami-aman
./extract.sh /tmp/jamu-web                      # bingkai rekaman web asli -> rekam/web1, rekam/web2
python3 tools/build_cues.py                     # cues.json + takarir.srt/.vtt dari kalimat bertanda waktu ASR
python3 audio/audio_mix.py                      # stem suara/musik/sfx -> audio/mix.wav
cd ../.. && python3 -m http.server 8135 --bind 127.0.0.1 &
NODE_PATH=/opt/node-tools/node_modules node video/jamu-alami-aman/render.mjs /tmp/jamu-out 0 2760 4
ffmpeg -framerate 30 -i /tmp/jamu-out/f%05d.jpg -i video/jamu-alami-aman/audio/mix.wav -c:v libx264 -crf 18 -preset slow -pix_fmt yuv420p -c:a aac -b:a 192k -t 92.04 -movflags +faststart video/jamu-alami-aman/jamu-alami-aman_draf.mp4
```
Font Plus Jakarta Sans (SIL OFL 1.1); logo `apps/web/src/assets/logo-full.webp`.
