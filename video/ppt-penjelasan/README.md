# Video: "PPT kuliah bikin bingung?" (Reels/TikTok 1080 x 1920, 30 fps, 43,32 detik)

Video promosi animasi MEDCOEL: PPT kuliah yang membingungkan, lalu pengajuan materi PPT ke MEDCOEL supaya dibantu penjelasannya per slide. Narasi: `audio/narator.wav` (43,32 dtk; tidak dipotong, dipercepat, atau diubah). Takarir kata-per-kata dari ASR (`audio/asr.json`); pelafalan "Med-koel" ditulis **MEDCOEL**, alamat **medcoel.com**.

## Hasil
- `medcoel-ppt-penjelasan.mp4` (master kecepatan normal; H.264 + AAC, sekitar -14 LUFS, true peak sekitar -2 dB)
- `cover.jpg` / `cover/cover.png` ("PPT kuliah bikin bingung?" + "Yuk, pahami per slide!"; juga `cover/cover-profil-3x4.png`, `cover/cover-pratinjau-grid-profil.png`, `cover/cover-panduan-area-aman.png`)

## Hasil pengecekan fitur (kode dan dokumentasi: `docs/MATERI_SLIDE.md`, `docs/DRILLING.md`, `apps/web/src/pages/{ChatAdmin,Drilling,DrillingSubject,DrillingDeck}.jsx`, `apps/pocketbase/pb_hooks/{submissions,materi,decks}.pb.js`)
Fitur **sudah ada di `main`** (bukan dalam pengembangan) dan dijalankan lokal dari kode itu:
1. **Mengajukan**: Chat Admin > "Upload soal atau PPT materi (PDF)" > pilih mata kuliah > **"PPT materi (slide kuliah)"** > hak lihat (kampus atau General) > jumlah PDF > unggah > ringkasan > centang hak membagikan > kirim. **Yang diterima hanya PDF**: layar nyata menyuruh mengekspor PPT ke PDF dulu (satu PDF per PPT; ada batas jumlah dan ukuran berkas, mis. 20 MB per berkas pada data uji). File .pptx tidak bisa langsung diunggah.
2. **Prosesnya tidak otomatis**: pengajuan berstatus "Menunggu konfirmasi" sampai pengaju mengonfirmasi ke admin lewat WhatsApp (kedaluwarsa bila tidak dikonfirmasi), lalu masuk antrean (layar menyebut perkiraan hari "bukan janji"). Hermes (Telegram) memberi tahu admin; **admin** mengubah tiap slide jadi gambar, meminta GPT/Claude menulis penjelasan tiap slide dalam satu JSON (skill `medcoel-materi-slide-json`), lalu mengimpornya (Hermes `/put KODE`, `/plan`, `/confirm`, atau Admin > Drilling > Materi > Impor materi). Penjelasan ditulis admin/AI, bukan dihasilkan sistem saat PDF diunggah. Judul di web = judul PDF.
3. **Hasil ditampilkan** di **Drilling > mata kuliah > Materi** (menu Drilling muncul bila sakelar admin menyala dan ada materi/soal yang boleh dilihat pengguna): slide di kiri dan penjelasan di kanan (di bawah pada layar sempit), tombol Sebelumnya/Berikutnya, deretan slide, gambar bisa diperbesar. Penjelasan berformat (paragraf, daftar, kotak klinis/high-yield, tabel).
4. **Apakah gambar dalam slide dibahas?** Gambar slide ikut tampil sebagai gambar (satu slide = satu gambar; sampai 4 gambar per slide) bersama penjelasan di sampingnya. Isi penjelasan (termasuk apakah gambar/bagian gambar diuraikan) bergantung pada teks yang ditulis admin/AI; kode tidak memastikan setiap gambar dibahas. Video menampilkan penjelasan yang membahas konsep dan bagian gambar pada contoh.

## Rekaman web asli (tidak digambar ulang)
`rekam/siapkan.cjs` menyiapkan data uji LOKAL lewat endpoint admin asli (PDF contoh dari tiga slide skema buatan, sakelar Drilling, satu materi 3 slide dengan penjelasan). `rekam/web.cjs` merekam `apps/web` lokal (akun demo "Nadia Putri", PocketBase seed `video/tab-dua-puluh/seed`) deterministik 30 fps (kursor/jari digambar di halaman): klip `alur` (iPad 820 x 1100: Chat Admin > Upload > Anatomi > PPT materi > General > 1 PDF > unggah "Anatomi Sendi Bahu Kuliah 1.pdf" > ringkasan > kirim > status) dan `baca` (laptop 1280 x 800: Drilling > Anatomi > kartu materi > pembaca slide dan penjelasan > slide berikutnya). Permintaan gambar `lh3.googleusercontent.com` dijawab dari `rekam/slide/*.png` (skema sendi bahu buatan sendiri, bukan gambar dari buku/atlas; `rekam/bikin-slide.cjs`). Nama kampus data uji dibuat generik ("FK Kampus Contoh"). Tidak ada kredensial, token, atau data pengguna asli. Tahap admin (Telegram/Hermes) tidak direkam karena bukan tampilan pengguna; di video tahap itu digambarkan sebagai langkah ("Admin menyiapkan penjelasan tiap slide").

`stage/media` (bingkai rekaman, sekitar 150 MB, dan salinan `rekam/slide/*.png` sebagai `media/slide-N.png`) tidak dicommit; buat ulang dengan `rekam/web.cjs`.

## Urutan adegan
| Waktu | Adegan |
|---|---|
| 0,0 - 4,0 | Hook: Raka membuka PPT setelah kuliah, slide bergambar dan istilah ("PPT-nya ada…", "Tapi ini maksudnya apa?"), zoom ke wajah lalu ke gambar |
| 4,0 - 7,2 | "Coba ajukan PPT-mu ke MEDCOEL!": Kori, logo, halaman Chat Admin asli (iPad) |
| 7,2 - 9,8 | Flashback kuliah: dosen menjelaskan satu slide cuma sebentar, Raka kewalahan mencatat |
| 9,8 - 16,3 | Di rumah: slide yang sama, gambar dan istilah (disorot), bingung |
| 16,3 - 20,5 | Punchline: kursor ragu di tombol "slide berikutnya", kembali ke slide 1 |
| 20,5 - 23,5 | Pengajuan: rekaman Chat Admin asli (pilih PPT materi, "PPT diekspor ke PDF dulu", unggah, kirim) |
| 23,5 - 25,4 | Tahapan: kirim PDF, konfirmasi ke admin, admin menyiapkan penjelasan tiap slide, tayang di Drilling > Materi |
| 25,4 - 32,9 | Contoh penjelasan: rekaman Drilling > Materi asli (laptop), sorotan hubungan konsep, gambar, dan penjelasan |
| 32,9 - 37,7 | Slide + penjelasan mendampingi belajar (rekaman asli), Raka mulai paham |
| 37,7 - 43,3 | Penutup: logo, "BELAJAR KEDOKTERAN GRATIS", medcoel.com |

## Musik dan efek suara
Musik tenang (72 BPM, pad hangat, denting lembut, bass pelan; tanpa drum, tanpa keramaian), sekitar -21 dB di bawah narasi saat narator berbicara; efek hanya pop kecil (tanda tanya), ketukan di rekaman, dan beberapa chime. Master tidak dipercepat. Untuk pengunggahan 1,2x-1,3x tempo musik setara sekitar 86-94 BPM, tetap santai.

## Karakter
Raka (`brand/characters/raka`), Kori (maskot asli), Tala varian peneliti sebagai admin, dosen = palet dosen Raka. Tidak ada aset karakter baru di video ini.

## Membuat ulang
```bash
cd video/ppt-penjelasan
(cd audio && python3 asr.py narator); python3 audio/gen_data.py
python3 audio/audio_mix.py
node rekam/bikin-slide.cjs                       # slide contoh -> rekam/slide/*.png
# PocketBase (8090) dengan seed video/tab-dua-puluh/seed dan Vite (3000); lalu:
node rekam/siapkan.cjs && node rekam/web.cjs stage/media/web alur baca && cp rekam/slide/*.png stage/media/
(cd ../.. && python3 -m http.server 8128 --bind 127.0.0.1 &)
node render.mjs frames 0 1298 4
ffmpeg -i audio/mix.wav -af "acompressor=threshold=-30dB:ratio=6:attack=3:release=80:makeup=8,alimiter=limit=0.8:level=false:attack=2:release=40,volume=2.6dB,alimiter=limit=0.8:level=false:attack=2:release=40,loudnorm=I=-14:TP=-1.5:LRA=9" -ar 44100 final.wav
ffmpeg -framerate 30 -i frames/f%05d.jpg -i final.wav -c:v libx264 -crf 17 -pix_fmt yuv420p -c:a aac -b:a 192k -shortest medcoel-ppt-penjelasan.mp4
node cover/render-cover.cjs
```
