# Video promo: "Besok ujian blok. Belajar dari mana?" (Reels/TikTok 1080 x 1920, 30 fps, 42,07 dtk)

Promo MEDCOEL untuk mahasiswa FK yang bingung memulai belajar sehari sebelum ujian blok. Cerita animasi (Raka di kamar belajar) langsung berpindah ke **rekaman web MEDCOEL asli** (tampilan ponsel) setelah kalimat "Buka MEDCOEL", lalu kembali ke cerita untuk pesan jujur ("semalam tidak menggantikan belajar satu blok penuh, tapi mulai dari satu langkah yang jelas") dan ditutup dengan memilih satu BAB dan mulai belajar di medcoel.com.

Suara: `audio/narator.wav` (Gemini TTS dari pemesan, 42,04 dtk; **tidak dipotong, dipercepat, atau diubah**). Tag `<sigh>`, `<breath>`, `<short pause>` tidak diucapkan dan tidak tampil. Musik pelan beat santai (72 BPM, sintesis) tanpa crowd, diturunkan saat narasi bicara; SFX tipis mengikuti ketukan nyata di UI. Terukur sekitar -15,3 LUFS terintegrasi, puncak -0,8 dBFS.

## Hasil
| Berkas | Isi |
|---|---|
| `medcoel-promo-ujian-blok.mp4` | Video jadi |
| `cover/cover.png` | Cover 1080 x 1920 khusus: judul "BESOK UJIAN BLOK. BELAJAR DARI MANA?", Raka bingung, tumpukan PPT, cuplikan UI MEDCOEL asli |
| `cover/cover-panduan-area-aman.png` | Cover dengan garis area aman TikTok/Reels (atas 250 px, bawah 480 px, kanan 140 px) |
| `cover/cover-bersama-awal-video-360px.png` | Cover dan bingkai pertama pada lebar layar 360 px |
| `still/` | 18 still adegan, `awal-tengah-akhir-360px.png`, `lembar-360px.png` |
| `rekam/rekaman-web.mp4` | Rekaman web asli yang dipakai (9 klip berurutan, 810 x 1350) |
| `stage/`, `rekam/`, `audio/`, `render.mjs`, `cover/` | Kode sumber animasi, perekam web, audio, render, cover |

## Alur aplikasi yang direkam (dicek dari kode web terbaru sebelum merekam)
Kode yang dibaca: `apps/web/src/pages/SubjectDetail.jsx` (daftar BAB `ChapterRow`, `ChapterChoice`, `PracticeDialog`, `ModeChoice`), `pages/Runner.jsx` (pembahasan per soal dan hasil sesi), `pages/History.jsx` + `components/WrongBank.jsx` (tab "Soal salah", "Latih ulang"), rute di `App.jsx`.

| Narasi | Yang benar-benar ada di aplikasi | Klip |
|---|---|---|
| "pilih mata kuliahnya" | `/mata-kuliah` lalu kartu Anatomi | `mk` |
| "baca materi per bab yang tersedia" | Halaman BAB: tiap BAB menandai Materi, Flashcard, jumlah soal; ketuk BAB, "Belajar materi", halaman materi | `bab`, `materi` |
| "lalu coba latihan soal dari bab yang sama" | Ketuk BAB yang sama, "Latihan soal", dialog "Siapkan sesi belajarmu" | `latihan` |
| "Mode Learning ... cek jawaban dan pembahasan per soal" | Mode Learning (default): jawab, "Cek jawaban", "Belum tepat. Kuncinya C." beserta pembahasan tiap opsi | `learning` |
| "Mode Ujian ... pembahasan setelah sesi selesai" | Mode ujian ("Pembahasan setelah sesi selesai."): jawab 10 soal, "Selesai", "Selesaikan pengerjaan?", skor, "Review pembahasan" | `ujian` |
| "kembali ke soal yang sebelumnya salah ... bagian mana yang perlu diulang" | Riwayat, tab "Soal salah", "Latih ulang N soal"; BAB menampilkan "N pernah salah" | `salah`, `bab2` |
| "Pilih satu bab, lalu mulai belajar" | BAB, "Latihan soal", "Mulai 10 soal" | `akhir` |

Pengecekan klaim: BAB yang dipakai ("Anatomi Ekstremitas Atas") **punya materi, flashcard, dan 20 soal** di data contoh. BAB lain tidak dipakai untuk klaim "ada soal" (di UI mereka tertulis "Soal segera hadir"; itu apa adanya terlihat di daftar BAB). Video tidak menjanjikan MEDCOEL menggantikan persiapan satu blok; adegan "Satu blok penuh ≠ Semalam" menyatakannya.

## Urutan adegan (waktu mengikuti ASR `audio/asr.json`)
| Waktu | Adegan |
|---|---|
| 0,0 - 6,2 | Hook: pita kalender sudah bergeser menuju SENIN sejak bingkai pertama, notifikasi "Ujian blok besok", slide PPT jatuh dan menumpuk, buku SOAL masih utuh, Raka bingung ("? ? ?") |
| 6,2 - 7,4 | Ponsel di meja menyala (logo MEDCOEL); layarnya membesar menjadi panel dan berisi web asli |
| 7,2 - 32,3 | Rekaman web asli di panel ponsel (tabel di atas), label langkah emas di atas panel, Raka kecil bereaksi di sudut |
| 32,3 - 38,0 | Kembali ke cerita: "Satu blok penuh" (grid BAB) ≠ "Semalam", lalu satu BAB (13) menyala: "1 BAB. Mulai dari sini." |
| 38,0 - 42,04 | Panel ponsel membesar lagi: "Buka medcoel.com", pilih BAB, Latihan soal, Mulai 10 soal; logo MEDCOEL |

Cuplikan UI diperbesar sekitar 1,08x dan dibingkai ulang (panel 1040 px); tombol, isi soal, dan angka **tidak digambar ulang**; yang ditambahkan hanya kursor/ketukan, sorotan emas pada tag "N pernah salah", dan label langkah.

## Data uji dan batasan
- Rekaman memakai PocketBase dan web lokal dengan **data uji** (`video/tab-dua-puluh/seed`: 26 soal Anatomi, akun demo "Nadia Putri"), bukan data produksi dan tanpa informasi pribadi. Angka di layar (mis. "11/20 soal", "70 skor", "4 pernah salah") adalah hasil sesi rekaman itu, bukan klaim statistik.
- Jawaban di Mode ujian sengaja dibuat 7 benar dan 3 salah (kunci dari bank soal contoh); satu jawaban salah di Mode Learning untuk memperlihatkan pembahasan.
- Beberapa bagian UI asli tampak sempit di lebar ponsel 540 px: kartu hasil "soal salah di percobaan ini" membungkus kata (bagian itu dilewati di video), dan kartu "4 soal terakhir kamu jawab salah" di Riwayat tetap terlihat sempit sebentar. Itu tampilan aplikasi apa adanya, tidak diubah.
- Narator mengucapkan "MEDCOEL" mirip "Medcoil"; di layar selalu tertulis MEDCOEL dan medcoel.com.
- Cuplikan UI di panel berukuran sekitar 9 px pada lebar 360 px; kartu mode dan pembahasan masih terbaca, teks kecil di UI asli (mis. keterangan "20 tersedia") tidak.
- Raka, logo, warna, dan huruf memakai aset repo (`brand/characters/raka`, `logo-full.webp`, token MEDCOEL); kamar dan benda digambar dari kode. Belum diputar di ponsel sungguhan; pratinjau 360 px dibuat dari still.

## Merender ulang
```bash
cd <akar repo>
bash video/promo-ujian-blok/rekam/siapkan.sh                      # PocketBase lokal + data uji (port 8090); Vite: (cd apps/web && npx vite --host 127.0.0.1 --port 3000)
python3 -m http.server 8128 --bind 127.0.0.1 &                     # server statis
node video/promo-ujian-blok/rekam/web.cjs video/promo-ujian-blok/rekam/web   # merekam klip web asli (urutan: ujian sebelum salah)
python3 video/promo-ujian-blok/audio/asr.py narator                # (opsional; jalankan dari audio/)
ffmpeg -y -i video/promo-ujian-blok/audio/narator.wav -ar 44100 -ac 1 video/promo-ujian-blok/audio/nar44.wav
python3 video/promo-ujian-blok/audio/audio_mix.py
node video/promo-ujian-blok/render.mjs video/promo-ujian-blok/frames 0 1261 4
ffmpeg -y -framerate 30 -i video/promo-ujian-blok/frames/f%05d.jpg -i video/promo-ujian-blok/audio/mix.wav -c:v libx264 -crf 20 -pix_fmt yuv420p -c:a aac -b:a 192k -af loudnorm=I=-14:TP=-1.5:LRA=11 -shortest video/promo-ujian-blok/medcoel-promo-ujian-blok.mp4
node video/promo-ujian-blok/cover/ambil-ui.cjs && node video/promo-ujian-blok/cover/render-cover.cjs
```
Mengatur potongan rekaman per kalimat: array `SEG` di `stage/stage.js` (`[t0, t1, klip, bingkai0, bingkai1, tampilan0, tampilan1]`; tampilan = `[cx, cy, zoom]` dalam piksel sumber 1080 x 1800). Frame mentah rekaman (`rekam/web/`, `frames/`) tidak di-commit; `rekam/rekaman-web.mp4` adalah arsipnya.

## Struktur kode (`stage/`)
- `stage.js`: `master(t)` (jadwal adegan, panel ponsel, reaksi Raka, label langkah, adegan "satu langkah"), `renderFrame(t)` deterministik.
- `room.js`: kamar belajar (kalender, notifikasi, jendela malam, jam, tumpukan PPT, catatan, buku SOAL, ponsel, Raka duduk di meja).
- `art.js` (gradien, label), `core.js` (easing, `pchip`), `bg.js` (latar MEDCOEL), `raka.js` (pembungkus Raka asli).
