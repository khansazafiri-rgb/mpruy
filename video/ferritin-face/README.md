# Mata panda = kurang zat besi? — tren "ferritin face" (44,8 dtk, 1080×1920, 30 fps, suara pixel 8-bit)

Video edukasi vertikal bergaya pixel art modern. Versi 2: ditambah **suara pixel** (efek 8-bit dan musik chiptune ringan, tanpa narasi), shot wajah miring/rambut dari belakang diganti, dan pembuka dibuat lebih bertenaga. Cerita tetap bisa dipahami hanya dari visual dan teks layar; suara hanya menguatkan. Teks digambar sebagai lapisan teks tajam.

Hasil: `mata-panda-ferritin-face.mp4` (H.264 + AAC, ≈ −16,4 LUFS, puncak −1,1 dBFS). Cover: `cover/cover.png` (+ `cover-panduan-area-aman.png`, `cover-360px.png`). Bingkai kunci 360 px: `still/`.

## Alur dan teks layar
| Detik | Shot | Teks layar |
|---|---|---|
| 0–5 | Close-up wajah Raka dari depan (±65% lebar kepala). **Frame pertama** sudah menunjukkan lingkaran gelap besar di bawah mata; zoom hentak + getar kecil di 0,0–0,4 dtk, lingkaran "memantul" (pop), teks menghantam masuk. Berkedip (1,0), tanda seru piksel di sisi kepala dan telunjuk menyentuh bawah mata (1,8), tiga ketukan (2,5; 3,1; 3,7) | MATA PANDA = / KURANG ZAT BESI? |
| 5–9 | **Raka dari depan, wajah utuh**, memegang ponsel dan menatap layar (alis penasaran, "?" di samping kepala); ponsel bergetar dan berbunyi (6,0–6,3). Potong ke **POV layar ponsel**: satu kartu "FERRITIN FACE", ibu jari menekan kartu, zoom lurus ke kartu (match cut) | Lagi ramai disebut / 'ferritin face'. |
| 9–17 | Papan top-down: kartu menjadi kotak **FERRITIN**; butiran zat besi masuk (9,6–13,3), lalu butiran dari kotak bergerak ke pembentukan sel darah merah, slot hemoglobin (Hb) terisi (13,5–17) | Ferritin menyimpan / cadangan zat besi. → Zat besi dibutuhkan / untuk membuat hemoglobin. |
| 17–24 | Close-up sel darah merah dengan Hb merah jelas; cadangan menipis (18,2–22,5), aliran butiran makin jarang, slot Hb terakhir tidak terisi; kiri → kanan; "ILUSTRASI MEKANISME" | Jika cadangannya rendah, / pembentukan Hb bisa terganggu. |
| 24–32 | Wajah dari depan, ukuran sama dengan shot 1 → tanda tanya besar (24,8) → gambar pemeriksaan darah (tabung sampel, tetes, lembar hasil **tanpa angka**) (28,4) | Tapi mata panda / bukan diagnosis. → Penyebabnya perlu dinilai / dengan pemeriksaan yang tepat. |
| 32–35,4 | **Raka dari depan** membuka laptop (penutup terangkat, tangan di sisi penutup) lalu **POV layar laptop** dengan dolly-in lurus ke layar | Penasaran cara / kerja tubuh? |
| 35,4–41,2 | **Rekaman web MEDCOEL asli**: materi FK, latihan soal (jawaban dan pembahasan), flashcard interaktif; diperbesar bertahap agar terbaca di ponsel | Belajar FK di MEDCOEL → Materi • latihan soal • fitur interaktif |
| 41,2–44,8 | Logo MEDCOEL dan alamat (terbaca ≥3 dtk) | Gratis di medcoel.com |

Setiap kalimat tampil 2,5–6,6 dtk dan berganti satu per satu (maksimal dua baris), di bidang gelap area aman tengah-bawah, jauh dari tepi kanan; tidak menutupi mata, diagram, sel darah merah, atau tindakan pada web. Tiap potongan shot diberi kilatan putih 0,1 dtk.

## Suara pixel (baru)
`audio/audio_mix.py` menyintesis semuanya dari kode (numpy), waktu dibaca dari `cues.json` (sama dengan yang dipakai stage):
- **Efek 8-bit** (gelombang kotak/pulsa/segitiga/noise): hantaman + "pop" di 0,0–0,1 dtk, tick kedip, whoosh dan ding saat tanda seru, **tiga boop pitch naik** pada ketukan jari, "ketik" tiga nada tiap teks muncul, tick + whoosh tiap potongan, nada tanya naik, ponsel bergetar lalu ping, sapuan naik saat zoom, boop match cut, **plink butiran zat besi dengan pitch naik tangga pentatonik** tiap butir masuk kotak, **ding Hb makin tinggi** tiap slot terisi, nada turun pelan saat cadangan menipis, bonk tanda tanya, denting tabung darah, "kreak" naik saat laptop dibuka, sapuan dolly-in, klik web, jingle naik di penutup.
- **Musik chiptune ringan** "MEDCOEL Pixel Pulse": bass segitiga + arpeggio pulsa 25% (Am–F–C–G, 120 BPM); arpeggio menipis mengikuti cadangan zat besi di shot 17–24 dtk, hi-hat dan kick pelan di bagian web dan penutup.
- **Lisensi:** CC0 1.0 (dibuat sendiri tanpa sampel/musik pihak ketiga), boleh untuk promosi Instagram/TikTok tanpa atribusi. Tidak ada narasi dan tidak ada musik berhak cipta.

## Aset dan batas klaim
- **Karakter:** Raka kanonik dari `brand/characters/raka/raka.js` (desain tidak diubah; palet `PALETTE_ON_DARK` untuk latar gelap). Maskot Kori/Kila/Nilo tidak dipakai. Semua shot Raka kini dari depan dengan wajah utuh (tidak ada lagi tampak belakang/kepala menoleh).
- **Mata panda:** efek `bags` bawaan Raka terlalu tipis untuk close-up, jadi di stage ditambah elips ungu gelap (`#5B2F63`) di bawah mata (`circles()` di `stage/stage.js`) dan warna `bags` bawaan digelapkan. Desain karakter lain tidak berubah.
- **Pixel art:** dunia (SVG: Raka, diagram, ponsel, laptop) digambar ke kanvas beresolusi rendah (216×384 / 270×480 / 360×640), **dikuantisasi ke palet tetap** (navy gelap, krem, cyan, merah darah, kuning), lalu diperbesar tanpa pelicin. Teks, label, dan rekaman web digambar tajam di lapisan UI.
- **Rekaman web:** `src/rekaman-web-satu-bab.mp4` (salinan `video/promo-satu-bab/rekam/rekaman-web.mp4`: web lokal repo ini dengan akun demo dan data uji, BAB "Anatomi Ekstremitas Atas"). Tidak ada tombol, halaman, angka, atau fitur yang dibuat; hanya dipotong dan diperbesar. Tampilan situs publik sekarang bisa sedikit berbeda. "Fitur interaktif" = flashcard; atlas 3D tidak ditampilkan (tidak ada di rekaman sumber).
- **Isi medis (sesuai naskah pemesan):** ferritin = cadangan zat besi; zat besi dibutuhkan untuk membentuk hemoglobin; cadangan rendah bisa mengganggu pembentukan Hb. Diagram skematik (bukan hitungan, bukan sel yang berubah seketika), tanpa angka lab. Video tidak menyatakan foto wajah dapat memastikan ferritin rendah, tidak menganjurkan suplemen, dan menegaskan mata panda bukan diagnosis.

## Batasan jujur
- **Audio belum didengarkan manusia**; hanya diukur (−16,4 LUFS, puncak −1,1 dBFS) dan dicocokkan dengan jadwal peristiwa. Pitch dan balance efek/musik mungkin perlu disetel setelah didengar.
- Pemeriksaan visual dari lembar kontak ±270–360 px dan potongan resolusi penuh; video belum ditonton real-time oleh manusia.
- Laptop "dibuka" memakai animasi tinggi penutup sederhana (bukan engsel 3D); layar laptop sebelum rekaman hanya krem polos dengan logo MEDCOEL asli yang memudar.
- Teks pada rekaman web sumber memang kecil; zoom dibatasi lebar konten agar kalimat tidak terpotong.
- Pada shot ponsel Raka berdiri penuh (kaki terlihat) agar wajah dan ponsel utuh; bagian bawah tertutup bidang teks.
- Font Plus Jakarta Sans dan Press Start 2P (SIL OFL 1.1); logo `apps/web/src/assets/logo-full.webp`.

## Proyek yang bisa diedit / render ulang
`cues.json` (jadwal bersama stage dan audio), `stage/` (`stage.js` komposisi, `art.js` objek pixel art, `core.js`), `audio/audio_mix.py`, `src/`, `cover/`, `render.mjs`, `shot.cjs`, `extract.sh`.
```bash
cd video/ferritin-face && ./extract.sh /tmp/ferritin-web                        # bingkai 30 fps rekaman web -> rekam/web (di-gitignore)
python3 audio/audio_mix.py                                                     # musik + efek -> audio/mix.wav
cd ../.. && python3 -m http.server 8135 --bind 127.0.0.1 &
NODE_PATH=/opt/node-tools/node_modules node video/ferritin-face/render.mjs /tmp/ff-out 0 1343 4
ffmpeg -framerate 30 -i /tmp/ff-out/f%05d.jpg -i video/ferritin-face/audio/mix.wav -c:v libx264 -crf 17 -preset slow -pix_fmt yuv420p -c:a aac -b:a 192k -t 44.8 -movflags +faststart video/ferritin-face/mata-panda-ferritin-face.mp4
NOCAP=1 node video/ferritin-face/shot.cjs cover/face-nocap.png 3.2                  # bingkai tanpa teks untuk cover
```
