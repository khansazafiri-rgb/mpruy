# Belum makan, kok perut malah perih?

Video edukasi MEDCOEL 1080×1920,30fps,87,5 detik. Proyek baru ini memakai narasi Google AI Studio yang diberikan pengguna, Raka kanonik, animasi mekanisme SVG/JS deterministik, dan rekaman web asli. Tidak menggambar UI pengganti atau mengambil suara dari video referensi.

## Berkas

- `out/MEDCOEL-perut-perih-FINAL.mp4`, cover PNG, SRT/VTT, serta `lembar-shot-*.jpg`.
- `render.mjs`: komposisi panggung, Raka, lapisan teks, takarir per kata, kamera/iris, mekanisme dan crop rekaman web.
- `stage/anatomy.js`: bentuk lambung yang dipakai di semua skala dan H. pylori konseptual. `reference/malam-art.js`/`medcoel-lib.js` adalah helper asli repo.
- `brand/characters/raka/raka.js`: kode karakter asli; outfit harian, ekspresi dan pose melalui parameter yang sama. Tidak ada Raka hasil gambar ulang.
- `prepare.py`: transkrip final dari audio, koreksi ejaan istilah, waktu kalimat/kata, takarir dan hening antarfrasa. Seluruh sampel PCM sumber dipertahankan berurutan dalam stem narasi.
- `audio.py`: komposisi instrumental dan lima SFX sintetis baru, tanpa sampel luar, berlisensi CC0. Stem terpisah memudahkan pengaturan volume.
- `audio/`: sumber asli70,28detik, narasi linimasa87,5detik, musik/SFX, dan master video.
- `timeline.json`, `sentence-timing.json`, `word-timing.json`, `captions.json`, `audio-edits.json`, `audio-mix.json`: waktu dan keputusan audio yang dapat diedit.
- `STYLE.md`, `STORYBOARD.md`, `SOURCES.json`, `SUMBER-DAN-LISENSI.md`, `QA.md`: gaya, orientasi anatomi, sumber, lisensi, dan pemeriksaan LOOP.

## Render ulang

Node22+,Python3,FFmpeg/libx264. Buat virtualenv Python dan jalankan `pip install -r requirements.txt`, lalu `npm install`.

```
npm run render
npm run stills
python3 make-contact-sheets.py
npm run preview
```

FFmpeg di luar PATH dapat diberikan sebagai `FFMPEG=/path/to/ffmpeg`. Jalankan perintah dalam shell yang sudah mengaktifkan virtualenv. `npm run cover` membuat cover saja; `node render.mjs --at 0,1,2,3,42,47` membuat frame terpilih. Preview pada `http://localhost:8785/preview.html` berukuran360×640, dengan tombol pemeriksaan penuh, outro, dan mekanisme tanpa audio.

Edit `prepare.py` untuk waktu/cue, `render.mjs` dan `stage/anatomy.js` untuk gerak/geometri, `audio.py` untuk musik/SFX. Menjalankan prepare mengembalikan status menjadi IN_PRODUCTION; render ulang harus diikuti pemeriksaan penuh.

## Ringkasan editorial

Asam tetap diproduksi pada lambung kosong; pelindung mukus–bikarbonat tetap tampak. Sinyal sensasi dan reaksi Raka tidak disertai luka. Jalur H. pylori/NSAID melemahkan pertahanan secara bersyarat; tukak baru digambarkan setelah "jika terbentuk luka". Antasida bereaksi dengan sebagian H+ dalam lumen, sedangkan PPI menghambat pompa pada detail sel parietal dan mempertahankan asam yang sudah ada. Terapi penyebab dibedakan dari antasida, tanpa regimen/dosis atau ajakan memilih obat sendiri.

Penutup belajar dimulai65,48detik, web67,70detik. Materi6,50detik, soal/pembahasan5,76detik (pembahasan>3detik), Simulasi Dokter7,54detik dengan CTA3,10detik terakhir. Rekaman1×, lebar1000px/92,6% kanvas; angka fixture tidak dijadikan klaim publik.

Seluruh anatomi, ion dan obat adalah diagram edukatif yang disederhanakan; bukan rekonstruksi klinis atau gambaran lengkap kelenjar/farmakokinetik. Tidak mengubah aplikasi, aset karakter sumber, atau video lama.
