# Video promo: "Belajar FK, satu bab dulu" (Reels/TikTok 1080 x 1920, 30 fps, 40,0 dtk)

Promo animasi MEDCOEL untuk mahasiswa FK yang merasa jadwal kuliahnya menumpuk. Bagian awal **tanpa narator**: cerita lewat aksi, musik, efek kecil, dan teks layar (Raka rencana "nyicil satu bab" malam ini → empat agenda FK berganti mengikuti ketukan musik → pulang, laptop dibuka, pengingat kuis anatomi, catatan menumpuk → Nilo menunjuk satu catatan). Lalu kamera masuk ke laptop, gaya piksel berubah jadi **rekaman web MEDCOEL asli**, dan audio dari pemesan (`audio/narator.wav`, 9,28 dtk) mulai **tepat di 20,0 dtk**. Penutup: tampilan web penuh + "BELAJAR FK, SATU BAB DULU" → "GRATIS DI MEDCOEL.COM" (ditahan 4,1 dtk).

Suara dari pemesan **tidak dibuat ulang, dipotong, atau dipercepat** (hanya di-resample 24 -> 48 kHz). Tidak ada narator buatan sendiri. Hasil terukur: -14,0 LUFS terintegrasi, puncak -1,4 dBFS.

## Hasil
| Berkas | Isi |
|---|---|
| `medcoel-satu-bab-dulu.mp4` | Video jadi (H.264 + AAC, 40,0 dtk) |
| `cover/cover.png` | Cover vertikal 1080 x 1920 (judul, Raka paham, Nilo, cuplikan UI asli "Langkah 1-3", "GRATIS DI MEDCOEL.COM") |
| `cover/cover-panduan-area-aman.png`, `cover/cover-potong-3x4.png` | Cover dengan area aman (atas 250 px, bawah 480 px, kanan 140 px) dan potongan 3:4 (y 240 - 1680): judul, Raka, dan alamat tetap utuh |
| `cover/cover-bersama-awal-video-360px.png` | Cover berdampingan dengan bingkai pertama pada lebar layar 360 px |
| `still/` | 20 still adegan, `lembar-360px.png` (12 bingkai), `awal-tengah-akhir-360px.png` |
| `rekam/rekaman-web.mp4` | Arsip rekaman web asli yang dipakai (5 klip berurutan, 1080 x 1920) |
| `stage/`, `rekam/web.cjs`, `rekam/siapkan.sh`, `audio/`, `render.mjs`, `shot.cjs`, `cover/render-cover.cjs` | Proyek yang bisa diedit (kode animasi, perekam web deterministik, audio, render) |

## Urutan adegan
| Waktu | Adegan | Aksi nyata di layar / bunyi |
|---|---|---|
| 0,0 - 3,0 | Kamar pagi: Raka menulis rencana | Pena sudah bergerak di bingkai pertama; teks tulisan tangan "Nanti malam aku nyicil satu bab." muncul huruf demi huruf mengikuti pena. Bunyi goresan pena |
| 3,0 - 5,0 | **07.00 Kuliah** | Ruang kuliah, slide proyektor berganti tiap ketukan, Raka mencatat cepat. Blip agenda |
| 5,0 - 7,0 | **10.00 Skill lab** | Raka berjas dokter memompa manset tensimeter pada lengan latihan; jarum alat naik per pompaan. Blip + bunyi pompa |
| 7,0 - 9,0 | **13.00 Diskusi kasus** | Papan "KASUS 3"; kartu "Diagnosis banding?", "Pemeriksaan penunjang?", "Tatalaksana?" menempel satu per satu, Raka menunjuk dan mulai berkeringat |
| 9,0 - 11,0 | **18.00 Tugas kelompok** | Raka mengetik slide; notifikasi grup "Revisi PPT kelompok", "Daftar pustaka belum ada", "Kumpul 20.00" masuk, ponsel bergetar |
| 11,0 - 12,3 | **21.00 Pulang** | Raka membuka pintu dan masuk kamar malam, lelah (kantung mata) |
| 12,3 - 16,0 | Laptop dibuka | Pengingat "Besok: kuis anatomi"; catatan tugas jatuh satu per satu memenuhi meja; teks "Baru mau mulai… kok sudah penuh?" |
| 16,0 - 20,0 | Nilo + "Satu bab dulu." | Nilo (maskot asli) masuk dan menunjuk satu catatan "Anatomi: Ekstremitas Atas" (BAB yang sama dengan rekaman web); catatan lain menyingkir; musik melambat dan jadi tertata; Raka mengerti. 19,3 - 20,0 kamera masuk ke layar laptop, mosaik piksel menjadi web asli |
| 20,0 - 32,0 | **Rekaman web MEDCOEL asli** + audio pemesan | Lihat tabel sinkron di bawah |
| 32,0 - 40,0 | Penutup: beranda web penuh | Mosaik ke beranda asli (logo MEDCOEL, "semua fitur gratis"), "BELAJAR FK, SATU BAB DULU" (32,5 - 35,7) lalu "GRATIS DI MEDCOEL.COM" (35,9 - 40,0) |

### Sinkron audio dengan rekaman web (kata-kata dari ASR `audio/asr.json`, detik = waktu video)
| Kalimat audio | Waktu | Yang terlihat di web asli |
|---|---|---|
| "Kalau belajar FK terasa menumpuk, mulai dari satu bab dulu." | 20,0 - 23,2 | `/mata-kuliah` → ketuk Anatomi → daftar BAB → ketuk "Anatomi Ekstremitas Atas" (ketukan BAB di 22,6) → dialog "Langkah 1/2/3" |
| "Baca materi," | 23,7 - 24,6 | "Belajar materi": halaman materi + Tujuan Belajar, gulir |
| "coba flashcard," | 24,9 - 25,7 | Flashcard: kartu, "Lihat jawaban", jawaban terbuka, "Belum hafal / Hafal" |
| "lalu latihan soal di MEDCOEL." | 26,0 - 27,3 | "Latihan soal": dialog "Siapkan sesi belajarmu" (Mode Learning), "Mulai 10 soal" |
| "Gratis di medcoel.com." | 27,7 - 29,0 | Soal tampil, jawaban dipilih, "Cek jawaban"; label "Gratis di medcoel.com" |
| (musik saja) | 29,0 - 32,0 | Pembahasan per opsi dan pesan "Belum tepat. Kuncinya …" terlihat; Raka kecil dan Kila (maskot asli) mengintip saat paham satu pembahasan |

Kunci jawaban dipilih salah dengan sengaja di rekaman supaya UI pembahasan tampak; video **tidak** menggambarkan Raka menguasai semuanya, hanya bahwa ia berhasil memulai dengan arah yang lebih jelas.

## Aturan yang diikuti
- **Raka, Nilo, Kila memakai aset kanonik repo** (`brand/characters/raka/raka.js`, `apps/web/src/mascots/*.svg`), tidak digambar ulang sebagai bentuk piksel. Raka selalu tegak/duduk; pakaian memakai varian resmi repo (harian, kuliah, jas, santai). Nilo/Kila hanya digerakkan lewat lapisan resminya (badan, lengan, mata, mulut).
- **Gaya game piksel hanya di latar, meja, plat agenda, jam piksel, dan transisi mosaik 90 px.** Latar digambar vektor lalu dirasterisasi ke kanvas 180 x 320 (blok 6 px), diposterisasi + dither, dan diperbesar tanpa penghalusan; karakter vektor digambar di atas lapisan ini. Jam agenda memakai huruf piksel 5 x 7 buatan sendiri.
- **Tanpa level, dinding, musuh, atau rintangan game.** Semua tekanan datang dari aktivitas FK yang terlihat: slide kuliah, alat tensimeter skill lab, kartu diskusi kasus, notifikasi tugas kelompok, pengingat kuis dan catatan tugas.
- **Hanya UI yang benar-benar ada** pada bagian web: kartu mata kuliah, daftar BAB, dialog "Langkah 1-3", materi, flashcard, dialog sesi, soal + pembahasan, beranda. Tombol, soal, dan angka tidak digambar ulang; yang ditambahkan hanya kursor/ketukan, label langkah, dan sorotan teks. Layar laptop di adegan animasi hanya ilustrasi (bukan UI MEDCOEL).

## Audio
Musik dan semua efek disintesis dengan numpy/scipy dari nol (CC0, tanpa sampel pihak ketiga). Musik: chiptune hangat 120 BPM yang makin padat sampai 16,0 dtk, melambat ke sekitar 80 BPM dan tertata (pluck rata, akor C - G - Am - F) di 16 - 20 dtk, tenang di bawah audio pemesan, lalu cerah di penutup dan berakhir di akor C. Efek: blip agenda naik tiap pergantian (3, 5, 7, 9, 11 dtk), goresan pena, pompa tensimeter, kartu menempel, getar ponsel + ping, langkah, pintu, laptop dibuka, pengingat, catatan jatuh, Nilo, riser masuk layar, ketukan UI sesuai rekaman (dari `rekam/cues.json`), Kila, teks penutup. Daftar efek bertanda waktu ada di `audio/events.json`. Musik diturunkan otomatis (ducking dari selubung audio pemesan, sekitar -13 dB di bawah narasi) dan efek diturunkan saat narasi bicara.

## Data uji dan batasan (jujur)
- Web direkam dari **PocketBase dan Vite lokal dengan data uji** repo (`video/tab-dua-puluh/seed`: 26 soal Anatomi, akun demo "Nadia Putri"), bukan situs produksi dan bukan data pribadi. Akibatnya tidak ada bilah alamat peramban; alamat "medcoel.com" hanya tampil sebagai teks penutup. Urutan soal/kartu acak, jadi isi kartu dan soal yang tampil adalah contoh dari data uji. Cuplikan UI di cover menampilkan "1/20 soal dikerjakan", hasil sesi rekaman itu, bukan klaim statistik.
- Teks tulisan tangan "Nanti malam aku nyicil satu bab." tampil di papan atas dan muncul selaras gerak pena; buku kecil di meja hanya menampilkan coretan, karena jangkauan lengan Raka tidak sampai ke halaman lebar tanpa memanjangkan lengan.
- Pena dan tangan Raka digambar ulang di atas meja (lengan yang sama, dipotong dari render Raka); bagian itu bukan karakter baru.
- Panah emas dan label langkah di web adalah tambahan visual; ukuran lengan Nilo kecil sehingga panah membantu memperjelas catatan yang ditunjuk.
- Narator mengucapkan "MEDCOEL" mirip "MedCall" (ASR membacanya begitu); di layar selalu tertulis MEDCOEL dan medcoel.com.
- Label langkah di atas rekaman web (y 262 px) menutup sebagian judul halaman asli selama 1 - 2 dtk.
- Belum diputar di ponsel sungguhan; pratinjau 360 px dibuat dari still. Audio diperiksa lewat pengukuran dan ASR, tidak didengarkan telinga manusia.
- Frame mentah (`rekam/web/`, `frames/`) dan `audio/mix.wav` tidak di-commit; `rekam/rekaman-web.mp4` dan skrip pembuatnya adalah arsipnya.

## Merender ulang
```bash
cd <akar repo>
bash video/promo-satu-bab/rekam/siapkan.sh                          # PocketBase lokal + data uji (port 8090)
(cd apps/web && npx vite --host 127.0.0.1 --port 3000 &)            # web asli
python3 -m http.server 8128 --bind 127.0.0.1 &                       # server statis untuk panggung
node video/promo-satu-bab/rekam/web.cjs video/promo-satu-bab/rekam/web   # merekam klip web asli + rekam/cues.json
(cd video/promo-satu-bab/audio && python3 asr.py narator && python3 audio_mix.py)   # ASR (opsional) + musik/SFX + mix.wav
node video/promo-satu-bab/render.mjs video/promo-satu-bab/frames 0 1199 4
ffmpeg -y -framerate 30 -i video/promo-satu-bab/frames/f%05d.jpg -i video/promo-satu-bab/audio/mix.wav -c:v libx264 -crf 18 -pix_fmt yuv420p -c:a aac -b:a 192k -ar 48000 \
  -af "alimiter=limit=0.95:attack=2:release=50,loudnorm=I=-14:TP=-1.5:LRA=11" -shortest -movflags +faststart video/promo-satu-bab/medcoel-satu-bab-dulu.mp4
node video/promo-satu-bab/cover/render-cover.cjs
```
Memeriksa satu bingkai: `node video/promo-satu-bab/shot.cjs "2.5,17.8" <folder>`.

## Struktur kode (`stage/`)
- `timeline.mjs`: durasi, agenda, `SEG` (peta rekaman web ke waktu video, sinkron dengan kata audio).
- `scenes.js`: semua adegan (`sceneDesk`, `sceneKuliah`, `sceneLab`, `sceneKasus`, `sceneKelompok`, `scenePulang`, `sceneLaptop`, `overlay` untuk web/penutup, `sceneCover`), tiap adegan = lapisan `back/mid/front/top`.
- `pix.js`: rasterisasi piksel (blok 6 px, posterisasi + dither), mosaik 90 px, font piksel 5 x 7, plat bertangga.
- `common.js`, `raka.js`, `mascot.js`, `core.js`: penempatan Raka asli (pembungkus `solveArm`), maskot asli, easing/token MEDCOEL.
- `stage.js`: komposisi per bingkai, transisi mosaik, kamera masuk laptop, lapisan web.
