# Video: "Kok dia sekali dengar langsung paham?" (Reels/TikTok 1080 x 1920, 30 fps, 77,92 detik)

Video edukasi sekaligus promosi MEDCOEL berdasarkan narasi yang diberikan (`audio/narator.wav`, 77,92 dtk; tidak dipotong, dipercepat, atau diubah nadanya). Durasi, takarir, dan perpindahan visual mengikuti kata yang diucapkan (waktu kata dari ASR `audio/asr.json`).

## Hasil
- `medcoel-kok-dia-paham.mp4` (H.264 + AAC, sekitar -14 LUFS, true peak sekitar -1,4 dB)
- `cover.jpg` / `cover/cover.png` (cover 9:16 terpisah; judul, wajah Raka, bola lampu Tala, dan logo berada di area tengah yang aman untuk crop profil 3:4: `cover/cover-profil-3x4.png`, `cover/cover-pratinjau-grid-profil.png`, `cover/cover-panduan-area-aman.png`)

## Isi (mengikuti narasi)
| Waktu | Adegan |
|---|---|
| 0,0 - 5,3 | Hook di kelas FK: pertanyaan besar "Emang orang jenius itu beneran ada?"; dosen menjelaskan materi rumit di papan, Tala (teman) "ting!" paham, Raka melongo menatap catatan |
| 5,3 - 11,9 | Raka membaca halaman yang sama tiga kali (penghitung 1x 2x 3x), lalu bengong; Kori datang: "tenang" |
| 11,9 - 15,0 | Lelucon tombol "UPGRADE" di atas kepala Tala, lalu dihilangkan ("cuma bercanda!"); bukan penjelasan ilmiah |
| 15,0 - 24,1 | Metafora kepingan puzzle: Tala punya bekal konsep dasar, informasi baru ("INFO BARU") tersambung dengan yang sudah ada |
| 24,1 - 31,1 | Raka menyusun kepingan dasar satu per satu (wajar, perlu waktu); keduanya sama-sama bisa lanjut belajar |
| 31,1 - 36,3 | Perhatian dan tidur: Raka mengantuk dan terganggu notifikasi, beristirahat, lalu kembali belajar segar |
| 36,3 - 42,5 | Cepat paham saat kuliah belum tentu diingat terus (kalender membalik halaman) |
| 42,5 - 56,3 | Latihan: tutup catatan, uji diri, jawaban belum tepat ("nggak apa-apa", Kori menyemangati), lihat pembahasan dan sorot bagian yang perlu dipelajari |
| 56,3 - 61,1 | "Bingung mulai dari mana?", Kori dan logo MEDCOEL |
| 61,1 - 69,6 | Fitur asli (rekaman layar, panel penuh): catatan materi, flashcard, latihan soal, Anatomi 3D, Simulasi jadi dokter |
| 69,6 - 74,9 | Pilih cara belajar sesuai kebutuhan, lalu kembali latihan (kelima fitur sebagai panel rekaman asli) |
| 74,9 - 77,9 | Penutup: "Belajar kedokteran gratis", logo, medcoel.com |

## Sumber visual produk (semua rekaman asli, tidak digambar ulang)
Panel MEDCOEL (halaman beranda Anatomi Manusia/atlas 3D, catatan materi, flashcard, latihan soal, Simulasi jadi dokter) memakai bingkai hasil ekstrak dari rekaman yang sama dengan `video/promo-medcoel` (rekaman layar asli dari Drive dan rekaman web lokal dengan akun demo + data uji). Bingkai (sekitar 1 GB) tidak dicommit; `stage/media` adalah symlink ke `../../promo-medcoel/stage/media` (lihat `video/promo-medcoel/README.md` dan `rekam/extract-klip.sh` untuk membuatnya ulang). Ilustrasi di luar panel (kelas, kamar, kepingan puzzle, tombol "upgrade", kalender) adalah gambar buatan dan bukan tampilan produk.

## Karakter
Raka (`brand/characters/raka`), Tala (`brand/characters/teman`), Kori (maskot asli `apps/web/src/mascots/kori.svg`), dosen = rig Raka dengan `PALETTE_DOSEN`. Aset baru di repo: ekspresi `melongo`, `mengerti`, pose `pegang_buku`, palet dosen (lihat README Raka).

## Catatan isi
Tidak ada visual/teks yang membagi orang menjadi "otak jenius" dan "otak biasa", yang menyebut satu gaya belajar tetap, yang menyiratkan cepat paham = lebih pintar, atau yang menjanjikan hasil ujian. "UPGRADE" hanya lelucon singkat.

## Membuat ulang
```bash
cd video/kok-dia-paham
(cd audio && python3 asr.py narator) ; python3 audio/gen_data.py      # asr.json + stage/data.json + dialog.wav
python3 audio/audio_mix.py                                            # musik + SFX di bawah narasi -> audio/mix.wav
(cd ../.. && python3 -m http.server 8128 --bind 127.0.0.1 &)          # server statis dari akar repo
node render.mjs frames 0 2337 4                                       # butuh Playwright
# audio akhir:
ffmpeg -i audio/mix.wav -af "acompressor=threshold=-30dB:ratio=6:attack=3:release=80:makeup=8,alimiter=limit=0.8:level=false:attack=2:release=40,volume=2.6dB,alimiter=limit=0.8:level=false:attack=2:release=40,loudnorm=I=-14:TP=-1.5:LRA=9" -ar 44100 final.wav
ffmpeg -framerate 30 -i frames/f%05d.jpg -i final.wav -c:v libx264 -crf 17 -pix_fmt yuv420p -c:a aac -b:a 192k -shortest medcoel-kok-dia-paham.mp4
node cover/render-cover.cjs
```
