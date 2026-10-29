# Video "Bayangin kamu jadi anak FK"

`bayangin_jadi_anak_fk.mp4`: satu video MEDCOEL, 1080x1920, 30 fps tetap (3526 frame), 117,5 detik, H.264 + AAC, sekitar -15,5 LUFS.
Pratinjau 540x960 ada di `preview/` (awal 0-20 dtk, tengah 36-60 dtk, bagian MEDCOEL 86-117,5 dtk).
Video ini tidak diunggah ke media sosial dan bukan fitur website.

## Sumber
- Audio: satu berkas ElevenLabs berisi dua suara (`audio/sumber-narator-dan-raka.mp3`: narator 0-94,7 dtk, Raka 95,2-111,5 dtk). `audio/cut.py` memotongnya di jeda antar-ujaran menjadi 14 klip (N01-N08, R01-R06) dan `audio/verify.py` mencocokkan tiap klip dengan naskah lewat ASR. Klip dipakai apa adanya: tidak diganti suara dan tidak dipercepat. `audio/compose.py` menyusun urutan N01, R01, N02, R02, N03, R03, N04, R04, N05, R05, N06, N07, R06, N08, menyejajarkan kata naskah dengan hasil ASR (takarir memakai tulisan "MEDCOEL" walau suara membaca "Med koel"), dan menulis `stage/data.json`.
- Raka: kanonik dari `brand/characters/raka/raka.js` (tidak ada desain baru, tanpa PNG referensi). Ekspresi: netral/sapa di hari pertama, kaget saat materi menumpuk, berpikir dan sedih saat blank, menunjuk dan senang di akhir.
- Footage web: rekaman nyata dari kode repo ini (`rekam/rec.mjs` dengan Playwright, kursor dan ketukan disisipkan), tiga take: `p1` (soal, jawaban salah, pembahasan), `a` (beranda), `p2` (daftar mata kuliah, sesi, Simulasi Dokter, kembali ke soal). Datanya data uji lokal (`seed/`), bukan data produksi: 26 soal Anatomi, akun `raka.fk`.
- Musik dan SFX: disintesis di `audio/mix.py` (numpy), tidak ada lisensi pihak ketiga. Musik menipis lalu berhenti sebelum Raka blank (sekitar 47,8-55,7 dtk), kembali pelan di akhir tahun pertama, dan menjadi lebih terang sejak lega/MEDCOEL. Ducking dengan `sidechaincompress` di bawah suara.

## Menjalankan ulang
```bash
bash reset.sh                                   # PocketBase lokal + data uji + vite :3000
node rekam/rec.mjs                              # rekam p1/a/p2, lalu: python3 rekam/assemble.py
python3 audio/cut.py && python3 audio/compose.py
python3 audio/mix.py                            # hasil audio/mix.wav
python3 -m http.server 8124 --directory <akar-repo> &
node stage/render.mjs <folder_frame> 0 3525 4   # frame f00000.jpg ...
ffmpeg -framerate 30 -i <folder_frame>/f%05d.jpg -i audio/mix.wav -c:v libx264 -crf 18 -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart bayangin_jadi_anak_fk.mp4
```
Skrip merekam memakai path scratchpad sesi pembuatan; sesuaikan `S=`/`OUT` dan buat symlink `stage/web/{p1,a,p2}` ke frame hasil rekaman.

## Pemeriksaan klaim (saat produksi)
- "Gratis": sesuai kode (`Landing.jsx`: "semua fitur gratis", tombol "Daftar gratis"; juga di `Signup.jsx`).
- Naskah final tidak menyebut jumlah soal, jadi angka "puluhan ribu" tidak dipakai dan tidak perlu dilaporkan ulang. Layar web yang tampak (mis. "32 mata kuliah", "1/26 soal") berasal dari data uji lokal.
- Biaya Raka (uang jajan, buku, fotokopi, perjalanan, kopi) hanya ilustrasi tanpa harga, dengan catatan di layar "Ilustrasi cerita Raka. Kondisi tiap mahasiswa berbeda."
- Simulasi Dokter dan fitur pilih mata kuliah, bab, soal, pembahasan tampil dari aplikasi yang berjalan.
