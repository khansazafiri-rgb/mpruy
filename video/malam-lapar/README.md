# Kenapa malam-malam lapar? (Reels/TikTok 1080 x 1920, 30 fps, 99,3 detik)

Video animasi Raka + Grelin (hormon lapar) + Jambi (jam biologis). Suara satu-satunya adalah MP3 narator yang diberikan (`audio/narator.mp3`), tidak diubah isi, kecepatan, atau nadanya;
musik ringan dan SFX jarang ditambahkan di bawahnya (disintesis numpy, ducking di bawah suara). Hasil: `medcoel-malam-lapar.mp4`, sampul `cover.jpg` (juga `cover/cover.png`). WAV hasil sintesis tidak dicommit (dibuat ulang dengan skrip).

## Karakter (semua dari `brand/characters/`)
- **Raka** (`raka/raka.js`): varian baru `lapar`, `ngantuk`, pose `pegang_perut` ditambahkan untuk video ini; baju `harian`.
- **Grelin** (`grelin/`): tokoh baru, hormon lapar (ghrelin). **Jambi** (`jambi/`): tokoh baru, jam biologis. Lihat `brand/characters/README.md`.
- **Kori**: maskot MEDCOEL asli (`stage/kori.svg`) di penutup.
Kaki dan lengan semua tokoh satu bentuk dengan badan (tidak ada bagian lepas); diuji di `brand/characters/body-characters.test.mjs`.

## Urutan adegan (sesuai narasi)
| Waktu | Adegan |
|---|---|
| 0 - 8,3 | Raka di depan kulkas, 23.47; "sore tadi sudah makan"; perut berbunyi, Grelin muncul |
| 8,3 - 13,9 | Jendela lambung: Grelin (ghrelin) mengirim sinyal lapar ke otak |
| 13,9 - 19,0 | Grafik ilustrasi: ghrelin naik menjelang waktu makan, turun setelahnya |
| 19,0 - 25,2 | Jambi muncul: lapar juga dipengaruhi jam biologis |
| 25,2 - 35,7 | "Penelitian kecil, 12 orang dewasa sehat": lapar mengikuti jam biologis, lebih tinggi sekitar pukul 20.00 (malam biologis) |
| 35,7 - 39,5 | Tidak semua orang lapar di jam yang sama |
| 39,5 - 54,5 | Begadang (lebih banyak kesempatan makan) dan kurang tidur (nafsu makan, pilihan makanan, pada sebagian orang) |
| 54,5 - 66,3 | "Nggak harus!" lalu cek: cukup makan seharian? kapan terakhir makan? |
| 66,3 - 73,0 | Camilan mengenyangkan: buah + yogurt, roti + telur |
| 73,0 - 77,8 | Makan cukup dan teratur; tidur cukup |
| 77,8 - 84,8 | Asam lambung naik; makan besar dekat waktu tidur bisa memperburuk keluhan |
| 84,8 - 93,2 | Rekap: waktu makan, jam biologis, pola tidur |
| 93,2 - 99,3 | Penutup: logo, "BELAJAR KEDOKTERAN GRATIS", medcoel.com |

## Catatan jujur
- Semua gambar adalah ilustrasi buatan; **tidak ada rekaman web atau data pengguna**. Grafik ghrelin dan grafik rasa lapar diberi label "ILUSTRASI", bukan data hasil studi.
- Narasi menyebut "penelitian kecil terhadap 12 orang dewasa sehat" tanpa sitasi. **Tambahkan sumber studinya di caption/komentar sebelum tayang**; saya tidak mengarang sitasi.
- Narator mengucapkan "MEDCOEL" mirip "MedQL"; di layar selalu tertulis MEDCOEL / medcoel.com. Takarir diperbaiki dari hasil ASR.

## Membuat ulang
```bash
cd video/malam-lapar
python3 audio/asr.py narator                    # (opsional) audio/asr.json dari audio/narator.mp3
python3 audio/gen_data.py                       # stage/data.json (takarir per kata) + dialog.wav
python3 audio/audio_mix.py                      # audio/mix.wav: narasi + musik + SFX
(cd ../.. && python3 -m http.server 8128 --bind 127.0.0.1 &)
node render.mjs frames 0 2979 4                 # JPG per bingkai (butuh playwright)
# loudnorm dua langkah -> final.wav (sekitar -14 LUFS), lalu:
ffmpeg -framerate 30 -i frames/f%05d.jpg -i final.wav -c:v libx264 -crf 18 -pix_fmt yuv420p -c:a aac -b:a 192k -shortest medcoel-malam-lapar.mp4
node cover/render-cover.cjs                     # cover 1080 x 1920
```
Pratinjau satu bingkai: buka `stage/index.html` lewat server di atas dan jalankan `renderFrame(t)` di konsol; tambahkan `?clean` untuk menyembunyikan takarir.
