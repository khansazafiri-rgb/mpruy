# Mata panda = kurang zat besi? — tren "ferritin face" (44,8 dtk, 1080×1920, 30 fps, TANPA AUDIO)

Video edukasi vertikal bergaya pixel art modern, **sepenuhnya tanpa audio** (berkas MP4 hanya berisi aliran video; tidak ada narasi, musik, atau efek suara). Cerita dipahami dari visual dan teks layar. Teks digambar sebagai lapisan teks tajam (bukan oleh generator gambar).

Hasil: `mata-panda-ferritin-face.mp4` (H.264, tanpa trek audio). Cover: `cover/cover.png` (+ `cover-panduan-area-aman.png`, `cover-360px.png`). Bingkai kunci 360 px: `still/`.

## Alur dan teks layar
| Detik | Shot | Teks layar |
|---|---|---|
| 0–5 | Close-up wajah Raka dari depan (±65% lebar kepala), lingkaran gelap besar di bawah mata; berkedip (1,0 dtk) lalu menunjuk area bawah mata (1,8–2,5 dtk); kamera tetap, sedikit mendekat | MATA PANDA = / KURANG ZAT BESI? |
| 5–9 | Over-the-shoulder: Raka melihat ponsel; layar hanya satu kartu "FERRITIN FACE"; "?" di atas kepala; kamera tetap lalu zoom lurus ke kartu (match cut) | Lagi ramai disebut / 'ferritin face'. |
| 9–17 | Papan belajar top-down: kartu menjadi kotak **FERRITIN**; butiran zat besi masuk ke kotak (9,6–13,3), lalu butiran dari kotak bergerak ke pembentukan sel darah merah, slot hemoglobin (Hb) terisi (13,5–17) | Ferritin menyimpan / cadangan zat besi. → Zat besi dibutuhkan / untuk membuat hemoglobin. |
| 17–24 | Close-up sel darah merah dengan Hb merah jelas; cadangan menipis (18,2–22,5), aliran butiran makin jarang, slot Hb terakhir tidak terisi; kiri → kanan; label "ILUSTRASI MEKANISME" | Jika cadangannya rendah, / pembentukan Hb bisa terganggu. |
| 24–32 | Wajah dari depan, ukuran sama dengan shot 1: wajah → tanda tanya besar (24,8) → gambar pemeriksaan darah (tabung sampel, tetes, lembar hasil **tanpa angka**) (28,4) | Tapi mata panda / bukan diagnosis. → Penyebabnya perlu dinilai / dengan pemeriksaan yang tepat. |
| 32–35,4 | Raka membuka laptop (tampak dari belakang bahu); dolly-in lurus ke layar | Penasaran cara / kerja tubuh? |
| 35,4–41,2 | **Rekaman web MEDCOEL asli**: materi FK, latihan soal (jawaban dan pembahasan), flashcard interaktif; diperbesar bertahap agar terbaca di ponsel | Belajar FK di MEDCOEL → Materi • latihan soal • fitur interaktif |
| 41,2–44,8 | Logo MEDCOEL dan alamat (terbaca ≥3 dtk) | Gratis di medcoel.com |

Setiap kalimat tampil 2,5–6,6 dtk dan berganti satu per satu (maksimal dua baris), di bidang gelap area aman tengah-bawah (y 1196–1412), jauh dari tepi kanan; tidak menutupi mata, diagram, sel darah merah, atau tindakan pada web.

## Aset dan batas klaim
- **Karakter:** Raka kanonik dari `brand/characters/raka/raka.js` (desain tidak diubah: wajah, rambut, sweater, patch logo, proporsi; palet `PALETTE_ON_DARK` untuk latar gelap). Maskot Kori/Kila/Nilo tidak dipakai. Raka diperlihatkan dari depan (shot 1, 5) dan dari belakang bahu (shot 2, 6) memakai opsi `back` bawaan.
- **Mata panda:** efek `bags` bawaan Raka terlalu tipis untuk close-up, jadi di stage ditambah elips ungu gelap (`#5B2F63`) di bawah mata (`circles()` di `stage/stage.js`) dan warna `bags` bawaan digelapkan. Hanya efek warna/bentuk di bawah mata; desain karakter lain tidak berubah.
- **Pixel art:** dunia (SVG: Raka, diagram, ponsel, laptop) digambar ke kanvas beresolusi rendah (216×384 atau 270×480 atau 360×640), **dikuantisasi ke palet tetap** (navy gelap, krem, cyan, merah darah, kuning), lalu diperbesar tanpa pelicin (`image-rendering: pixelated`). Teks, label, dan rekaman web digambar tajam di lapisan UI (tanpa filter piksel).
- **Rekaman web:** diambil dari `src/rekaman-web-satu-bab.mp4` (salinan `video/promo-satu-bab/rekam/rekaman-web.mp4`: rekaman web MEDCOEL lokal repo ini dengan akun demo dan data uji, BAB "Anatomi Ekstremitas Atas"; materi detik 3,0–4,6; latihan soal 9,6–11,6; flashcard 6,5–8,1 pada rekaman sumber). Tidak ada tombol, halaman, angka, atau fitur yang dibuat; hanya dipotong dan diperbesar. Tampilan situs publik sekarang bisa sedikit berbeda dari rekaman. "Fitur belajar interaktif" = flashcard (balik kartu, Belum hafal / Hafal); atlas 3D tidak ditampilkan karena rekaman sumber tidak memuatnya pada resolusi yang layak.
- **Isi medis (sesuai naskah pemesan):** ferritin = cadangan zat besi; zat besi dibutuhkan untuk membentuk hemoglobin; cadangan rendah bisa mengganggu pembentukan Hb. Diagram bersifat skematik/mekanisme (bukan hitungan atau sel yang berubah seketika), tanpa angka lab. Video tidak menyatakan foto wajah dapat memastikan ferritin rendah, tidak menganjurkan suplemen, dan menegaskan mata panda bukan diagnosis.
- Slot Hb: urutan isi 1 Hb per 3 butir hanya untuk irama visual.

## Proses LOOP (tiga putaran perbaikan)
1. **Draf 1:** semua shot jadi; temuan: rekaman web terlalu kecil untuk ponsel, over-the-shoulder lemah (tangan tidak terlihat), RBC close-up kurang besar, pemeriksaan darah kecil, laptop tertutup teks.
2. **Putaran 1:** tangan memegang ponsel, RBC diperbesar, pemeriksaan darah diperbesar dengan bidang gelap, ulang susunan laptop, zoom bertahap pada rekaman web.
3. **Putaran 2–3:** wajah tampak belakang disesuaikan, laptop dinaikkan di atas teks, area potong rekaman web disesuaikan agar tidak memotong tombol.
Pemeriksaan dilakukan dari lembar kontak tiap 1 dtk pada ukuran ±270–360 px dan potongan resolusi penuh; **video belum ditonton dalam kecepatan nyata oleh manusia**.

## Batasan jujur
- Wajah Raka pada shot 2 dan 6 (tampak belakang) hanya terlihat sebagian di tepi kepala; rasa penasaran ditunjukkan lewat "?" dan sikap kepala.
- Laptop "dibuka" memakai animasi tinggi layar sederhana (bukan engsel 3D). Layar laptop sebelum rekaman hanya krem polos dengan logo MEDCOEL asli yang memudar.
- Teks pada rekaman web sumber memang kecil (rekaman layar ponsel); zoom terbatas oleh lebar konten agar kalimat tidak terpotong.
- Font Plus Jakarta Sans dan Press Start 2P (SIL OFL 1.1); logo `apps/web/src/assets/logo-full.webp`.

## Proyek yang bisa diedit / render ulang
`stage/` (`stage.js` komposisi dan jadwal `CUE`, `art.js` objek pixel art, `core.js`), `src/`, `cover/`, `render.mjs`, `shot.cjs`, `extract.sh`.
```bash
cd video/ferritin-face && ./extract.sh /tmp/ferritin-web                        # bingkai 30 fps rekaman web -> rekam/web (di-gitignore)
cd ../.. && python3 -m http.server 8135 --bind 127.0.0.1 &
NODE_PATH=/opt/node-tools/node_modules node video/ferritin-face/render.mjs /tmp/ff-out 0 1343 4
ffmpeg -framerate 30 -i /tmp/ff-out/f%05d.jpg -an -c:v libx264 -crf 17 -preset slow -pix_fmt yuv420p -movflags +faststart video/ferritin-face/mata-panda-ferritin-face.mp4   # -an = tanpa audio
NOCAP=1 node video/ferritin-face/shot.cjs cover/face-nocap.png 3.2                  # bingkai tanpa teks untuk cover
```
