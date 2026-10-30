# Kena gas air mata saat demo? (Reels/TikTok 1080 x 1920, 30 fps, 115,57 detik)

Video edukasi MEDCOEL. Suara satu-satunya adalah narasi MP3 yang diberikan (`audio/narator.mp3`), tanpa ubah kecepatan, nada, atau potongan.
Tokoh utama: **Raka** dari `brand/characters/raka/raka.js` (pakaian `demo` di jalan, `harian` di rumah dan penutup), dipakai langsung lewat import tanpa salinan.
Maskot penutup: Kori (SVG asli dari `apps/web/src/mascots`). Raka hanya untuk seri video, tidak dipasang di web.

Hasil: `medcoel-gas-air-mata.mp4`, `thumbnail.jpg`.

## Isi kerja

| Berkas | Fungsi |
| --- | --- |
| `audio/narator.mp3` | narasi final |
| `audio/asr.py`, `audio/gen_data.py` | batas kalimat dan bobot kata dari energi suara, menghasilkan `stage/data.json` dan `dialog.wav` |
| `audio/audio_mix.py` | musik tipis (tegang lalu tenang) dan SFX jarang, disintesis numpy, di bawah narasi dengan ducking |
| `stage/index.html`, `stage.js` | kerangka render per bingkai `renderFrame(t)`, transisi, takarir per kata |
| `stage/scenes.js`, `overlay.js` | 13 adegan dan judul |
| `stage/world3.js` | jalan kota, kerumunan, asap, tabung gas, taman, pos medis, ikon tubuh, tabung odol, peta |
| `stage/teman.js`, `mascot.js`, `kori.svg` | teman Raka dan Kori |
| `render.mjs` | tangkap bingkai dengan Playwright |

## Membuat ulang

```bash
cd video/gas-air-mata
python3 audio/gen_data.py          # data.json + dialog.wav
python3 audio/audio_mix.py         # audio/mix.wav
(cd ../.. && python3 -m http.server 8128 --bind 127.0.0.1 &)
node render.mjs frames 0 3466 5 1  # JPG per bingkai (folder frames/ tidak dicommit)
ffmpeg -framerate 30 -i frames/f%05d.jpg -i final.wav -c:v libx264 -crf 17 -pix_fmt yuv420p -c:a aac -b:a 192k -shortest medcoel-gas-air-mata.mp4
```
`final.wav` = `audio/mix.wav` setelah `loudnorm` dua langkah (target -14 LUFS, hasil -14,5 LUFS).

## Alur cerita (mengikuti narasi)
1 Demo di jalan kota (judul, kerumunan, satu bunyi pelepasan gas, asap) → 2 wajah perih, kabur, batuk → 3 teman menyodorkan odol, Raka berhenti sebelum mengoles (bingkai beku, `?`) → 4 "BELUM TERBUKTI MELINDUNGI", odol menambah iritasi → 5 tubuh: butiran ke mata, hidung, saluran napas, kartu gejala → 6 Raka menjauh dan membaik → 7 keesokan harinya → 8 peta Indonesia ke Portland, 2.257 responden → 9 kartu 47% dengan catatan "laporan peserta", bukan untuk semua orang yang terkena → 10 pertolongan pertama: menjauh, bilas mata 10–15 menit, tanda perlu bantuan medis → 11 penutup MEDCOEL (logo dan medcoel.com, tanpa UI web rekaan).

## Sumber isi
- Survei: Torgrimson-Ojerio dkk., *BMC Public Health*, 2021, https://doi.org/10.1186/s12889-021-10859-w. Angka 47% hanya untuk responden survei yang melaporkan paparan (laporan peserta), tidak untuk semua orang yang terkena.
- Penanganan: CDC, Riot Control Agents, https://www.cdc.gov/chemical-emergencies/chemical-fact-sheets/riot-control-agents.html
- Odol tidak ditampilkan sebagai cara yang berhasil, obat, pelindung, atau penetral; Raka berhenti sebelum mengoles dan adegan berikutnya menegaskan belum terbukti melindungi.

## Catatan jujur
- Kerumunan, asap, dan tabung gas adalah gambar datar prosedural, bukan rekaman. Peta Indonesia dan AS disederhanakan (hanya letak).
- Tidak ada rekaman web; penutup hanya logo dan URL.
- Jalan Raka memakai rig kaki baru (kaki menyatu dengan badan, diuji di `brand/characters/raka/raka.test.mjs`).
- Pelatuk satu-satunya bunyi gas: satu "pok" dan desis di detik 7,76. Gumam kerumunan hanya 4,3–7,7 dt. Tidak ada batuk, sirene, atau teriakan.
