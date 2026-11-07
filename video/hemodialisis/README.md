# Video: "Hemodialisis (cuci darah): apa yang dilakukan mesin itu?" (1080 x 1920, 30 fps, 78,87 dtk)

Video edukasi MEDCOEL tentang cara kerja hemodialisis, dibuat dari kode (SVG per bingkai, Chromium, ffmpeg). Narasi: berkas WAV Gemini TTS dari pemesan (`audio/narator.wav`, 78,84 dtk), **tidak dipercepat atau diubah**; naskah tidak diubah dan tidak ada teks naskah di layar (tag `<breath>` dan `<short pause>` hanya arahan suara). Durasi video mengikuti narasi.

## Hasil
- `medcoel-hemodialisis.mp4` (H.264 + AAC, -14 LUFS).
- **Cover** (dirancang khusus, bukan bingkai pertama video): `cover/cover.png` (1080 x 1920) "DARAH MASUK MESIN. LALU APA?"; aliran darah dari lengan ke dialiser yang diperbesar (potongan bening, serat berongga) dengan bentuk ginjal sebagai konteks. `cover/cover-panduan-area-aman.png` (area aman TikTok/Reels: hijau = crop 3:4, y 240-1680; kuning putus-putus = margin 60 px) dan `cover/cover-bersama-awal-video-360px.png`.
- `still/`: awal (`01`), tengah (`02`), akhir (`03`) dan 13 still adegan penting; `still/awal-tengah-akhir-360px.png` dan `still/lembar-360px.png` (semua still pada lebar layar 360 px).
- `aset/*.svg`: aset berlapis yang dapat diedit (ginjal normal dan fungsi turun, dialiser cangkang dan bening, latar MEDCOEL, sirkuit lengkap, penampang memanjang dan melintang serat).

## Alur dan sinkron narasi (waktu dari pengenalan suara kata per kata, `audio/asr.json`)
| Waktu | Narasi | Visual |
|---|---|---|
| 0,0-6,0 | Darah mengalir keluar dari lengan, masuk ke mesin, lalu kembali ke tubuh | Bingkai pertama sudah bergerak: darah di selang dari jarum akses di lengan Raka; kamera mengikuti selang ke pompa, dialiser, ruang tetes, lalu kembali ke lengan; pandangan melebar ke seluruh sirkuit |
| 6,06-8,2 | Apa yang sebenarnya dilakukan mesin itu? | Mesin dan dialiser diperbesar, tanda tanya |
| 9,1-12,0 | Ginjal menyaring zat sisa | Ginjal dominan; zat sisa (belah ketupat ambar) keluar dari darah menjadi urin |
| 12,2-16,3 | Menjaga mineral, membuang kelebihan cairan lewat urine | Ion (ungu), tetes cairan menuju ureter dan kandung kemih terisi |
| 16,9-21,1 | Fungsi sangat menurun, zat sisa dan cairan menumpuk | Ginjal meredup bertahap; indikator fungsi turun, zat sisa dan cairan naik; partikel menumpuk di pembuluh (diagram; warna darah tidak berubah) |
| 21,6-24,4 | Penyakit ginjal yang berkembang lama | Grafik fungsi menurun perlahan |
| 24,7-27,5 | Diabetes atau tekanan darah tinggi | Dua lensa kapiler: glukosa menumpuk di dinding; tekanan mendorong dinding |
| 27,5-33,0 | Gangguan mendadak juga bisa membutuhkan dialisis | Grafik penurunan mendadak |
| 33,7-38,0 | Hemodialisis, cuci darah, membantu | Kembali ke pasien dan mesin, kamera menyusuri akses ke mesin |
| 38,7-41,5 | Darah dialirkan ke dialiser | Kamera mengikuti selang ke dialiser |
| 42,0-46,0 | Serat halus; darah di dalam serat | Cangkang menjadi bening: bundel serat; lalu potongan melintang |
| 46,3-50,5 | Cairan dialisis di luar, berlawanan arah | Penampang memanjang satu serat: darah NAIK di dalam, cairan dialisis TURUN di luar; panah dan aliran berlawanan |
| 50,7-55,3 | Urea berpindah melintasi membran | Urea melintasi pori membran ke cairan dialisis |
| 55,3-58,2 | Kelebihan cairan dikeluarkan terkontrol | Tetes air menyeberang secara bertahap; dial "terkontrol" |
| 58,7-60,7 | Sel darah tetap di jalur darah | Sel darah merah tetap di lumen (tidak melewati pori) |
| 61,0-64,0 | Darah yang sudah disaring kembali ke tubuh | Kamera mengikuti darah keluar dialiser kembali ke lengan Raka |
| 64,5-70,0 | Dialisis tidak menggantikan seluruh pekerjaan ginjal atau menyembuhkan penyebabnya | Bilah "pekerjaan ginjal": dialisis menggantikan sebagian, sisanya tidak; penyebab (diabetes, tekanan darah tinggi) tidak disembuhkan |
| 70,2-78,5 | Kendalikan gula darah dan tekanan darah, periksa fungsi ginjal bila berisiko | Tiga kartu bergantian sesuai kata; Raka mengerti |

## Tentang gambar (kunci agar tidak menyesatkan)
Darah selalu merah (zat sisa digambar sebagai partikel ambar, bukan "darah kotor"); cairan dialisis cyan; **darah di dalam serat, cairan dialisis di luar, bergerak berlawanan** (darah naik, cairan dialisis turun; juga di dialiser: darah masuk dari bawah, cairan dialisis masuk dari atas); membran lavender berpori kecil; sel darah merah lebih besar dari pori dan tidak pernah menyeberang. Semuanya **skema**: satu serat mewakili ratusan, ukuran tidak sesuai skala, jumlah partikel ilustratif.

## Membuat ulang
```bash
python3 -m http.server 8128 --bind 127.0.0.1 &            # dari akar repo
export NODE_PATH=$(npm root -g):$PWD/node_modules          # butuh playwright (Chromium)
ffmpeg -i video/hemodialisis/audio/narator.wav -ar 44100 -ac 1 video/hemodialisis/audio/nar44.wav
python3 video/hemodialisis/audio/audio_mix.py              # mix.wav = narasi asli + musik pelan 72 BPM + SFX tipis
node video/hemodialisis/render.mjs video/hemodialisis/frames 0 2365 4     # 2366 bingkai, ±150 dtk dengan 4 pekerja
ffmpeg -framerate 30 -i video/hemodialisis/frames/f%05d.jpg -i video/hemodialisis/audio/mix.wav -c:v libx264 -pix_fmt yuv420p -crf 20 -c:a aac -b:a 192k -af loudnorm=I=-14:TP=-1.5:LRA=11 -shortest -movflags +faststart video/hemodialisis/medcoel-hemodialisis.mp4
node video/hemodialisis/cover/render-cover.cjs             # cover.png + panduan area aman
node video/hemodialisis/aset/ekspor.cjs                    # ekspor SVG aset
node video/hemodialisis/shot.cjs "t=52.4" keluaran.png     # satu bingkai pada detik tertentu
```
Berkas: `stage/art.js` (ginjal, dialiser, selang, partikel, label), `stage/circuit.js` + `scene1.js` (mesin, Raka, sirkuit, kamera 0-8,4 dtk), `scene2.js` (ginjal, penyebab), `scene3.js` (dialiser, penampang serat), `scene4.js` (batasan dan pencegahan), `bg.js` (latar), `raka.js` (pemecah lengan; Raka dari `brand/characters/raka/raka.js`, desain tidak diubah), `stage.js` (penyusun dan transisi).

## Pemeriksaan yang dilakukan
- Bingkai pertama sudah bergerak (selisih bingkai 0 ke 3 = 11 dari 255; 0 ke 10 = 27) dan aliran bergerak di selang sejak itu; arah aliran DIUKUR dari dua bingkai berurutan (`stage/uji-arah.html`, pergeseran pola per 0,1 dtk): penampang serat, darah di lumen -12 px (naik) dan kolom cairan dialisis +15 px (turun); di dialiser, serat berisi darah -13 px (naik) dan celah cairan dialisis +14 px (turun); selang dari lengan menuju mesin dan kembali mengikuti arah jalur.
- Lembar bingkai tiap 0,65 dtk seluruh video, enam belas still dan pratinjau 360 px dibaca satu per satu; tidak ada kesalahan halaman saat render (0 `pageerror`).
- Darah dan cairan dialisis tidak bercampur (warna dan jalur terpisah, dipisah membran); sel darah dibatasi di dalam lumen (jarak dinding > jari-jari sel); label maksimum 3 serentak.
- Lonjakan antar-bingkai terbesar adalah gerak kamera yang disengaja (3,8-4,0 dtk dari pompa ke dialiser; 62,7 dtk transisi kembali ke pasien).

## Kekurangan dan hal yang belum terverifikasi
1. **Rujukan NIDDK yang Anda berikan tidak dapat dibuka dari sesi ini** (www.niddk.nih.gov di luar daftar domain yang diizinkan). Isi video mengikuti naskah final dan pengetahuan umum tentang mekanisme (aliran darah, dialiser serat berongga, aliran berlawanan, difusi urea, ultrafiltrasi); **belum dicocokkan dengan halaman rujukan dan belum ditinjau tenaga medis**. Domain itu perlu diizinkan bila ingin dicek ulang.
2. Penyederhanaan: hanya urea yang digambar sebagai zat sisa (zat terlarut lain tidak); elektrolit dalam cairan dialisis tidak digambar; jenis akses (fistula, graft, kateter) tidak dibedakan (digambar jarum di lengan bawah); antikoagulan, sensor gelembung, pemantauan tekanan, dan prosedur sesi (lama, frekuensi) tidak digambar.
3. Ginjal dan kapiler adalah skema, bukan atlas; lensa diabetes/tekanan hanya ilustrasi konsep (tidak memperlihatkan mekanisme kerusakan sebenarnya).
4. Dialisis tidak digambarkan sebagai penyembuhan atau satu-satunya terapi (hanya bilah "sebagian"), tetapi pilihan terapi lain (mis. dialisis peritoneal, transplantasi) tidak disebut karena tidak ada di naskah.
5. Raka duduk di kursi dan terlihat sedang menjalani dialisis; ini penokohan skematis, bukan penggambaran pasien nyata.
6. Dial "terkontrol" di tahap cairan berlebih hanya ikon; pergantian adegan memakai pemudaran sehingga ada bingkai bertumpuk singkat (±0,8 dtk) pada 7,9-8,8; 32,9-33,7; 62,0-62,8; 64,0-64,9 dtk.
7. Teks kecil pada indikator (mis. "terkontrol", judul bilah) sekitar 10 px pada lebar 360 px.
8. Belum diputar utuh dengan kecepatan normal oleh manusia dan belum diuji di ponsel nyata.
